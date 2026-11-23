import { auth } from './firebase';
import {
  flushOutboxMutationToFirestore,
  isDemoBusinessId,
  isFirestoreQuotaCooldownActive,
  OutboxDispatchResult,
} from './firestoreService';
import {
  getAllOutboxEntries,
  removeOutboxEntries,
  updateOutboxEntries,
} from './localTerminalDb';
import { OutboxCollectionName, OutboxMutationEntry } from '../types/storage';

// Exponential backoff ladder: 5s -> 15s -> 45s -> 2m -> 5m
const BACKOFF_SCHEDULE_MS = [5_000, 15_000, 45_000, 120_000, 300_000];

export function computeNextRetryDelayMs(attempts: number): number {
  const idx = Math.max(0, Math.min(attempts - 1, BACKOFF_SCHEDULE_MS.length - 1));
  const base = BACKOFF_SCHEDULE_MS[idx];
  const jitter = Math.floor(Math.random() * 1000);
  return base + jitter;
}

export function isEtimsOutboxCollection(collectionName: OutboxCollectionName): boolean {
  return collectionName === 'etims_sales' || collectionName === 'etims_credit_notes';
}

function getOutboxPriorityRank(collectionName: OutboxCollectionName): number {
  if (collectionName === 'etims_sales') return 1;
  if (collectionName === 'etims_credit_notes') return 2;
  return 0;
}

export interface OutboxFlushReport {
  ackedCount: number;
  retriedCount: number;
  deadLetteredCount: number;
  skippedQuotaOrOffline: boolean;
  remainingQueue: OutboxMutationEntry[];
}

/**
 * Processes due `pending` and `retry_scheduled` entries from IndexedDB `sync_outbox`
 * for the active tenant. Orders Firestore mutations first, followed by `etims_sales`,
 * and finally `etims_credit_notes` so KRA Credit Notes always link to fiscalized sales.
 */
export async function flushSyncOutbox(params: {
  businessId: string;
  isOnline: boolean;
  includeScheduledOrDeadLetter?: boolean;
  dispatchEtimsOutboxEntry?: (entry: OutboxMutationEntry) => Promise<OutboxDispatchResult>;
}): Promise<OutboxFlushReport> {
  const allEntries = await getAllOutboxEntries();

  if (
    !params.isOnline ||
    !auth.currentUser ||
    !params.businessId ||
    isDemoBusinessId(params.businessId)
  ) {
    return {
      ackedCount: 0,
      retriedCount: 0,
      deadLetteredCount: 0,
      skippedQuotaOrOffline: true,
      remainingQueue: allEntries,
    };
  }

  const now = Date.now();
  const dueEntries = allEntries
    .filter((entry) => {
      if (entry.businessId !== params.businessId) return false;
      if (isEtimsOutboxCollection(entry.collectionName) && !params.dispatchEtimsOutboxEntry) {
        return false;
      }
      if (params.includeScheduledOrDeadLetter) {
        return entry.status !== 'dead_letter' || params.includeScheduledOrDeadLetter;
      }
      if (entry.status === 'pending') return true;
      if (entry.status === 'retry_scheduled') return entry.nextRetryAt <= now;
      return false;
    })
    .sort((a, b) => {
      const rankDiff = getOutboxPriorityRank(a.collectionName) - getOutboxPriorityRank(b.collectionName);
      if (rankDiff !== 0) return rankDiff;
      return a.createdAt.localeCompare(b.createdAt);
    });

  if (dueEntries.length === 0) {
    return {
      ackedCount: 0,
      retriedCount: 0,
      deadLetteredCount: 0,
      skippedQuotaOrOffline: false,
      remainingQueue: allEntries,
    };
  }

  const ackedIds: string[] = [];
  const updatedEntries: OutboxMutationEntry[] = [];
  let retriedCount = 0;
  let deadLetteredCount = 0;
  let firestoreQuotaHit = isFirestoreQuotaCooldownActive();

  for (const entry of dueEntries) {
    const isEtims = isEtimsOutboxCollection(entry.collectionName);

    if (!isEtims && (firestoreQuotaHit || isFirestoreQuotaCooldownActive())) {
      updatedEntries.push({
        ...entry,
        status: 'retry_scheduled',
        nextRetryAt: Date.now() + 5 * 60 * 1000,
        updatedAt: new Date().toISOString(),
        lastError: 'Paused during Firestore daily quota cooldown (auto-resumes)',
        errorCode: 'resource-exhausted',
      });
      firestoreQuotaHit = true;
      continue;
    }

    const res: OutboxDispatchResult = isEtims
      ? await params.dispatchEtimsOutboxEntry!(entry)
      : await flushOutboxMutationToFirestore(entry);

    if (res.status === 'acked') {
      ackedIds.push(entry.id);
    } else if (res.status === 'skipped_offline_or_quota') {
      if (!isEtims) {
        firestoreQuotaHit = true;
      }
      updatedEntries.push({
        ...entry,
        status: 'retry_scheduled',
        nextRetryAt: Date.now() + (isEtims ? 60_000 : 5 * 60 * 1000),
        updatedAt: new Date().toISOString(),
        lastError: res.reason,
        errorCode: isEtims ? 'etims-deferred' : 'quota-cooldown',
      });
    } else {
      const nextAttempts = entry.attempts + 1;
      const shouldDeadLetter = !res.retryable || nextAttempts >= entry.maxAttempts;
      const nowIso = new Date().toISOString();

      if (shouldDeadLetter) {
        deadLetteredCount += 1;
        updatedEntries.push({
          ...entry,
          attempts: nextAttempts,
          status: 'dead_letter',
          updatedAt: nowIso,
          lastError: res.error,
          errorCode: res.errorCode,
        });
      } else {
        retriedCount += 1;
        updatedEntries.push({
          ...entry,
          attempts: nextAttempts,
          status: 'retry_scheduled',
          nextRetryAt: Date.now() + computeNextRetryDelayMs(nextAttempts),
          updatedAt: nowIso,
          lastError: res.error,
          errorCode: res.errorCode,
        });
      }
    }
  }

  if (ackedIds.length > 0) {
    await removeOutboxEntries(ackedIds);
  }
  if (updatedEntries.length > 0) {
    await updateOutboxEntries(updatedEntries);
  }

  const remainingQueue = await getAllOutboxEntries();
  return {
    ackedCount: ackedIds.length,
    retriedCount,
    deadLetteredCount,
    skippedQuotaOrOffline: firestoreQuotaHit,
    remainingQueue,
  };
}

export async function resetOutboxEntriesForImmediateRetry(
  entryIds: string[]
): Promise<OutboxMutationEntry[]> {
  if (entryIds.length === 0) return getAllOutboxEntries();
  const idSet = new Set(entryIds);
  const all = await getAllOutboxEntries();
  const toReset = all
    .filter((e) => idSet.has(e.id))
    .map<OutboxMutationEntry>((e) => ({
      ...e,
      status: 'pending',
      attempts: 0,
      nextRetryAt: Date.now(),
      updatedAt: new Date().toISOString(),
    }));
  if (toReset.length > 0) {
    await updateOutboxEntries(toReset);
  }
  return getAllOutboxEntries();
}
