import { DarajaAdapter, PaymentVerificationResult } from './paymentAdapter';

export interface PendingDarajaSubscriptionTask {
  reference: string;
  checkoutRequestId: string;
  businessId?: string;
  planId?: string;
  billingCycle?: 'monthly' | 'annual';
  durationDays?: number;
  amountKes: number;
  phone?: string;
  createdAtMs: number;
  lastPolledAtMs?: number;
  pollAttempts: number;
  status: 'pending' | 'pay_offline';
}

export interface DarajaPollerCallbacks {
  getIntentStatus: (
    reference: string
  ) => 'pending' | 'pay_offline' | 'success' | 'failed' | 'abandoned' | undefined;
  fetchPendingFromStore: () => Promise<PendingDarajaSubscriptionTask[]>;
  onResolvedSuccess: (
    task: PendingDarajaSubscriptionTask,
    verification: PaymentVerificationResult
  ) => Promise<void>;
  onResolvedFailed: (
    task: PendingDarajaSubscriptionTask,
    status: 'failed' | 'abandoned',
    reason: string,
    verification?: PaymentVerificationResult
  ) => Promise<void>;
  onPollAttempt?: (
    task: PendingDarajaSubscriptionTask,
    verification: PaymentVerificationResult
  ) => Promise<void>;
}

export interface DarajaPollerOptions {
  tickIntervalMs?: number;
  minItemPollIntervalMs?: number;
  initialGraceMs?: number;
  maxPendingAgeMs?: number;
  firestoreSweepIntervalMs?: number;
  idleSweepIntervalMs?: number;
  maxAttemptsPerTxn?: number;
}

export interface DarajaPollerStatus {
  running: boolean;
  darajaConfigured: boolean;
  darajaEnv: 'sandbox' | 'production';
  pendingCount: number;
  inFlightCount: number;
  lastTickAt?: string;
  lastSweepAt?: string;
  totalPollsExecuted: number;
  totalResolvedSuccess: number;
  totalResolvedFailed: number;
  pendingReferences: string[];
}

export class DarajaSubscriptionPoller {
  private readonly adapter: DarajaAdapter;
  private readonly callbacks: DarajaPollerCallbacks;
  private readonly tickIntervalMs: number;
  private readonly minItemPollIntervalMs: number;
  private readonly initialGraceMs: number;
  private readonly maxPendingAgeMs: number;
  private readonly firestoreSweepIntervalMs: number;
  private readonly idleSweepIntervalMs: number;
  private readonly maxAttemptsPerTxn: number;

  private readonly activeTasks = new Map<string, PendingDarajaSubscriptionTask>();
  private readonly inFlightRefs = new Set<string>();
  private timer: NodeJS.Timeout | null = null;
  private isTickRunning = false;
  private lastSweepAtMs = 0;
  private lastTickAtIso: string | undefined;
  private lastSweepAtIso: string | undefined;
  private totalPollsExecuted = 0;
  private totalResolvedSuccess = 0;
  private totalResolvedFailed = 0;

  constructor(
    adapter: DarajaAdapter,
    callbacks: DarajaPollerCallbacks,
    options: DarajaPollerOptions = {}
  ) {
    this.adapter = adapter;
    this.callbacks = callbacks;
    this.tickIntervalMs = Math.max(2_000, options.tickIntervalMs ?? 5_000);
    this.minItemPollIntervalMs = Math.max(2_000, options.minItemPollIntervalMs ?? 5_000);
    this.initialGraceMs = Math.max(0, options.initialGraceMs ?? 6_000);
    this.maxPendingAgeMs = Math.max(30_000, options.maxPendingAgeMs ?? 5 * 60_000);
    this.firestoreSweepIntervalMs = Math.max(5_000, options.firestoreSweepIntervalMs ?? 30_000);
    this.idleSweepIntervalMs = Math.max(60_000, options.idleSweepIntervalMs ?? 10 * 60_000);
    this.maxAttemptsPerTxn = Math.max(1, options.maxAttemptsPerTxn ?? 45);
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.tickIntervalMs);
    // Allow Node process shutdown cleanly even if timer is active
    if (typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
    // Schedule an initial background sweep shortly after startup
    const bootstrapTimer = setTimeout(() => {
      void this.tick(true);
    }, 3_000);
    if (typeof bootstrapTimer.unref === 'function') {
      bootstrapTimer.unref();
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.activeTasks.clear();
    this.inFlightRefs.clear();
  }

  enlistPendingTransaction(
    task: Omit<PendingDarajaSubscriptionTask, 'pollAttempts' | 'createdAtMs'> & {
      createdAtMs?: number;
      pollAttempts?: number;
    }
  ): void {
    if (!task.reference || !task.checkoutRequestId) return;
    const existing = this.activeTasks.get(task.reference);
    if (existing) return;

    this.activeTasks.set(task.reference, {
      ...task,
      createdAtMs: task.createdAtMs ?? Date.now(),
      pollAttempts: task.pollAttempts ?? 0,
    });
  }

  markResolved(reference: string): void {
    this.activeTasks.delete(reference);
    this.inFlightRefs.delete(reference);
  }

  getStatus(): DarajaPollerStatus {
    return {
      running: Boolean(this.timer),
      darajaConfigured: this.adapter.isConfigured(),
      darajaEnv: this.adapter.getEnvironment(),
      pendingCount: this.activeTasks.size,
      inFlightCount: this.inFlightRefs.size,
      lastTickAt: this.lastTickAtIso,
      lastSweepAt: this.lastSweepAtIso,
      totalPollsExecuted: this.totalPollsExecuted,
      totalResolvedSuccess: this.totalResolvedSuccess,
      totalResolvedFailed: this.totalResolvedFailed,
      pendingReferences: Array.from(this.activeTasks.keys()),
    };
  }

  async tick(forceSweep = false): Promise<{ checked: number; swept: boolean }> {
    if (this.isTickRunning) {
      return { checked: 0, swept: false };
    }
    if (!this.adapter.isConfigured()) {
      return { checked: 0, swept: false };
    }

    this.isTickRunning = true;
    this.lastTickAtIso = new Date().toISOString();
    let swept = false;
    let checked = 0;

    try {
      const now = Date.now();
      const effectiveSweepInterval =
        this.activeTasks.size > 0 ? this.firestoreSweepIntervalMs : this.idleSweepIntervalMs;
      if (forceSweep || now - this.lastSweepAtMs >= effectiveSweepInterval) {
        this.lastSweepAtMs = now;
        this.lastSweepAtIso = new Date(now).toISOString();
        swept = true;
        const storeTasks = await this.callbacks.fetchPendingFromStore().catch(() => []);
        for (const task of storeTasks) {
          if (!task.reference || !task.checkoutRequestId) continue;
          const memStatus = this.callbacks.getIntentStatus(task.reference);
          if (memStatus && memStatus !== 'pending' && memStatus !== 'pay_offline') {
            this.markResolved(task.reference);
            continue;
          }
          if (!this.activeTasks.has(task.reference)) {
            this.activeTasks.set(task.reference, task);
          }
        }
      }

      if (this.activeTasks.size === 0) {
        return { checked: 0, swept };
      }

      const tasks = Array.from(this.activeTasks.values());
      for (const task of tasks) {
        if (this.inFlightRefs.has(task.reference)) continue;

        const currentStatus = this.callbacks.getIntentStatus(task.reference);
        if (currentStatus && currentStatus !== 'pending' && currentStatus !== 'pay_offline') {
          this.markResolved(task.reference);
          continue;
        }

        const nowMs = Date.now();
        const ageMs = nowMs - task.createdAtMs;

        // Enforce timeout ceiling if transaction stayed pending past Daraja STK validity window
        if (ageMs >= this.maxPendingAgeMs || task.pollAttempts >= this.maxAttemptsPerTxn) {
          this.inFlightRefs.add(task.reference);
          try {
            const timeoutReason =
              'M-Pesa STK Push verification timed out awaiting PIN authorization.';
            await this.callbacks.onResolvedFailed(task, 'failed', timeoutReason);
            this.totalResolvedFailed += 1;
            this.markResolved(task.reference);
          } finally {
            this.inFlightRefs.delete(task.reference);
          }
          checked += 1;
          continue;
        }

        // Wait initial grace period before first STK query
        if (ageMs < this.initialGraceMs) {
          continue;
        }

        // Respect per-transaction query spacing
        if (task.lastPolledAtMs && nowMs - task.lastPolledAtMs < this.minItemPollIntervalMs) {
          continue;
        }

        this.inFlightRefs.add(task.reference);
        try {
          task.lastPolledAtMs = nowMs;
          task.pollAttempts += 1;
          this.totalPollsExecuted += 1;
          checked += 1;

          const verification = await this.adapter.verifyTransaction(task.checkoutRequestId);

          if (verification.verified && verification.status === 'success') {
            await this.callbacks.onResolvedSuccess(task, verification);
            this.totalResolvedSuccess += 1;
            this.markResolved(task.reference);
          } else if (verification.status === 'failed' || verification.status === 'abandoned') {
            const terminalStatus: 'failed' | 'abandoned' =
              verification.status === 'abandoned' ? 'abandoned' : 'failed';
            const reason =
              verification.error ||
              verification.gatewayResponse ||
              (terminalStatus === 'abandoned'
                ? 'M-Pesa prompt was cancelled by the user.'
                : 'M-Pesa STK Push transaction failed.');
            await this.callbacks.onResolvedFailed(task, terminalStatus, reason, verification);
            this.totalResolvedFailed += 1;
            this.markResolved(task.reference);
          } else if (this.callbacks.onPollAttempt) {
            await this.callbacks.onPollAttempt(task, verification).catch(() => {});
          }
        } catch (err) {
          console.warn(
            `Daraja poller tick notice for ${task.reference} (${task.checkoutRequestId}):`,
            err
          );
        } finally {
          this.inFlightRefs.delete(task.reference);
        }
      }

      return { checked, swept };
    } finally {
      this.isTickRunning = false;
    }
  }
}
