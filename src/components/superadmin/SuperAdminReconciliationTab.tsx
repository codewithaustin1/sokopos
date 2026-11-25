import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  X,
  XCircle,
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { usePos } from '../../context/PosContext';
import {
  AdminPaymentRecord,
  AdminPaymentSummary,
  DarajaPollerStatusResponse,
  PaymentConfigResponse,
  fetchAdminPaymentRecords,
  fetchDarajaPollerStatus,
  getPaymentGatewayConfig,
  reconcileAdminPayment,
  triggerDarajaPollerSweep,
  verifyServerPayment,
} from '../../lib/paymentService';
import { SettingsSectionHeader } from '../common/SettingsSectionHeader';

type StatusFilter = 'all' | 'pending' | 'success' | 'failed';
type ProviderFilter = 'all' | 'daraja' | 'paystack';

async function getFreshSuperAdminToken(): Promise<string> {
  if (typeof (auth as any).authStateReady === 'function') {
    await (auth as any).authStateReady().catch(() => undefined);
  }
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No active authenticated session found. Please sign in again.');
  }
  return user.getIdToken(true);
}

export const SuperAdminReconciliationTab: React.FC = () => {
  const {
    businesses,
    refreshAllBusinessesForSuperAdmin,
    logSuperAdminAction,
    showToast,
  } = usePos();

  const [records, setRecords] = useState<AdminPaymentRecord[]>([]);
  const [summary, setSummary] = useState<AdminPaymentSummary | null>(null);
  const [gatewayConfig, setGatewayConfig] = useState<PaymentConfigResponse | null>(null);
  const [pollerStatus, setPollerStatus] = useState<DarajaPollerStatusResponse | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSweeping, setIsSweeping] = useState(false);
  const [verifyingRef, setVerifyingRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sweepBanner, setSweepBanner] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>('all');

  // Manual Reconciliation Modal State
  const [reconcileTarget, setReconcileTarget] = useState<AdminPaymentRecord | null>(null);
  const [targetStatus, setTargetStatus] = useState<'success' | 'failed' | 'abandoned'>('success');
  const [mpesaReceiptInput, setMpesaReceiptInput] = useState('');
  const [reasonInput, setReasonInput] = useState('');
  const [activateSubOnSettle, setActivateSubOnSettle] = useState(true);
  const [isSubmittingReconcile, setIsSubmittingReconcile] = useState(false);
  const [reconcileError, setReconcileError] = useState<string | null>(null);

  const loadReconciliationState = useCallback(async (silent = false) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const idToken = await getFreshSuperAdminToken();
      const [configRes, pollerRes, recordsRes] = await Promise.all([
        getPaymentGatewayConfig(),
        fetchDarajaPollerStatus(idToken),
        fetchAdminPaymentRecords(idToken, 250),
      ]);

      setGatewayConfig(configRes);
      if (pollerRes.success && pollerRes.status) {
        setPollerStatus(pollerRes.status);
      }
      if (!recordsRes.success) {
        throw new Error(recordsRes.error || 'Failed to load payment records.');
      }
      setRecords(recordsRes.records);
      setSummary(recordsRes.summary || null);
    } catch (err: any) {
      setError(err?.message || 'Unable to load payment reconciliation state.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReconciliationState(false);
  }, [loadReconciliationState]);

  const enrichedRecords = useMemo(() => {
    const bizLookup = new Map(businesses.map((b) => [b.id, b]));
    return records.map((rec) => {
      const localBiz = rec.businessId ? bizLookup.get(rec.businessId) : undefined;
      return {
        ...rec,
        businessName: rec.businessName || localBiz?.name,
        businessCode: rec.businessCode || localBiz?.code,
        businessOwnerEmail: rec.businessOwnerEmail || localBiz?.ownerEmail || rec.ownerEmail,
        currentBusinessPlan: rec.currentBusinessPlan || localBiz?.plan,
        currentBusinessStatus: rec.currentBusinessStatus || localBiz?.status,
      };
    });
  }, [records, businesses]);

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedRecords.filter((rec) => {
      if (providerFilter !== 'all' && rec.provider !== providerFilter) return false;
      if (statusFilter === 'pending' && rec.status !== 'pending' && rec.status !== 'pay_offline') {
        return false;
      }
      if (statusFilter === 'success' && rec.status !== 'success') return false;
      if (statusFilter === 'failed' && rec.status !== 'failed' && rec.status !== 'abandoned') {
        return false;
      }
      if (!q) return true;
      return (
        rec.reference.toLowerCase().includes(q) ||
        (rec.mpesaReceiptNumber || '').toLowerCase().includes(q) ||
        (rec.phone || '').toLowerCase().includes(q) ||
        (rec.businessName || '').toLowerCase().includes(q) ||
        (rec.businessCode || '').toLowerCase().includes(q) ||
        (rec.businessId || '').toLowerCase().includes(q) ||
        (rec.businessOwnerEmail || '').toLowerCase().includes(q) ||
        (rec.checkoutRequestId || '').toLowerCase().includes(q)
      );
    });
  }, [enrichedRecords, providerFilter, statusFilter, searchQuery]);

  const computedSummary = useMemo(() => {
    if (summary) return summary;
    return {
      total: enrichedRecords.length,
      pendingCount: enrichedRecords.filter(
        (r) => r.status === 'pending' || r.status === 'pay_offline'
      ).length,
      successCount: enrichedRecords.filter((r) => r.status === 'success').length,
      failedCount: enrichedRecords.filter(
        (r) => r.status === 'failed' || r.status === 'abandoned'
      ).length,
      darajaCount: enrichedRecords.filter((r) => r.provider === 'daraja').length,
      paystackCount: enrichedRecords.filter((r) => r.provider === 'paystack').length,
      settledSubscriptionKes: enrichedRecords
        .filter((r) => r.status === 'success' && r.flowType === 'subscription')
        .reduce((sum, r) => sum + (Number(r.amountKes) || 0), 0),
    };
  }, [summary, enrichedRecords]);

  const handleRunPollerSweep = async () => {
    if (isSweeping) return;
    setIsSweeping(true);
    setSweepBanner(null);
    setError(null);
    try {
      const idToken = await getFreshSuperAdminToken();
      const res = await triggerDarajaPollerSweep(idToken);
      if (!res.success) {
        throw new Error(res.error || 'Daraja poller sweep failed.');
      }
      if (res.status) setPollerStatus(res.status);
      const checked = res.checked ?? 0;
      const settled = res.settled ?? 0;
      const failed = res.failed ?? 0;
      const stillPending = res.stillPending ?? 0;
      setSweepBanner(
        `Daraja STK sweep completed: checked ${checked}, settled ${settled}, failed ${failed}, still pending ${stillPending}.`
      );
      if (settled > 0) {
        refreshAllBusinessesForSuperAdmin(true).catch(() => {});
      }
      await loadReconciliationState(true);
      showToast(
        settled > 0
          ? `Daraja sweep settled ${settled} payment${settled === 1 ? '' : 's'}.`
          : `Daraja sweep checked ${checked} pending transaction${checked === 1 ? '' : 's'}.`,
        settled > 0 ? 'success' : 'info'
      );
    } catch (err: any) {
      setError(err?.message || 'Unable to execute Daraja poller sweep.');
    } finally {
      setIsSweeping(false);
    }
  };

  const handleVerifyLive = async (rec: AdminPaymentRecord) => {
    if (verifyingRef) return;
    setVerifyingRef(rec.reference);
    setError(null);
    try {
      const idToken = await getFreshSuperAdminToken();
      const beforeStatus = rec.status;
      const res = await verifyServerPayment(rec.reference, idToken);

      if (res.status && res.status !== beforeStatus) {
        logSuperAdminAction(
          rec.businessId || 'platform',
          'payment',
          rec.reference,
          'reconcile',
          `Live gateway check updated payment ${rec.reference} from ${beforeStatus} to ${res.status}`,
          {
            status: beforeStatus,
            mpesaReceiptNumber: rec.mpesaReceiptNumber || null,
            resolvedBy: rec.resolvedBy || null,
          },
          {
            status: res.status,
            mpesaReceiptNumber: res.mpesaReceiptNumber || rec.mpesaReceiptNumber || null,
            resolvedBy: res.resolvedBy || 'live_gateway_verify',
            gatewayResponse: res.gatewayResponse || null,
            subscriptionActivated: Boolean(res.activatedSubscription),
          }
        );
      }

      if (res.verified && res.status === 'success') {
        showToast(
          `Verified ${rec.reference} as PAID${
            res.mpesaReceiptNumber ? ` (${res.mpesaReceiptNumber})` : ''
          }.`,
          'success'
        );
        refreshAllBusinessesForSuperAdmin(true).catch(() => {});
      } else if (res.status === 'failed' || res.status === 'abandoned') {
        showToast(
          `Gateway reports ${rec.reference} as ${res.status.toUpperCase()}: ${
            res.gatewayResponse || res.error || 'Not completed'
          }`,
          'warning'
        );
      } else {
        showToast(
          `Gateway check for ${rec.reference}: still ${res.status || 'pending'}.`,
          'info'
        );
      }

      await loadReconciliationState(true);
    } catch (err: any) {
      setError(err?.message || `Live verification failed for ${rec.reference}.`);
    } finally {
      setVerifyingRef(null);
    }
  };

  const openReconcileModal = (rec: AdminPaymentRecord) => {
    setReconcileTarget(rec);
    setTargetStatus(rec.status === 'failed' || rec.status === 'abandoned' ? rec.status : 'success');
    setMpesaReceiptInput(rec.mpesaReceiptNumber || '');
    setReasonInput('');
    setActivateSubOnSettle(rec.flowType === 'subscription');
    setReconcileError(null);
  };

  const closeReconcileModal = () => {
    if (isSubmittingReconcile) return;
    setReconcileTarget(null);
    setReconcileError(null);
  };

  const handleSubmitReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileTarget || isSubmittingReconcile) return;

    const cleanReason = reasonInput.trim();
    if (cleanReason.length < 5) {
      setReconcileError('Please enter a reason note of at least 5 characters for the audit log.');
      return;
    }

    setIsSubmittingReconcile(true);
    setReconcileError(null);
    try {
      const idToken = await getFreshSuperAdminToken();
      const res = await reconcileAdminPayment(
        {
          reference: reconcileTarget.reference,
          targetStatus,
          mpesaReceiptNumber: mpesaReceiptInput.trim().toUpperCase() || undefined,
          reason: cleanReason,
          activateSubscription: targetStatus === 'success' ? activateSubOnSettle : false,
        },
        idToken
      );

      if (!res.success) {
        throw new Error(res.error || 'Manual payment reconciliation failed.');
      }

      logSuperAdminAction(
        reconcileTarget.businessId || 'platform',
        'payment',
        reconcileTarget.reference,
        'reconcile',
        `Manually reconciled ${reconcileTarget.provider.toUpperCase()} payment ${
          reconcileTarget.reference
        } (${reconcileTarget.status} -> ${targetStatus}) — Reason: ${cleanReason}`,
        res.beforeSnapshot || {
          status: reconcileTarget.status,
          mpesaReceiptNumber: reconcileTarget.mpesaReceiptNumber || null,
          resolvedBy: reconcileTarget.resolvedBy || null,
        },
        res.afterSnapshot || {
          status: targetStatus,
          mpesaReceiptNumber: mpesaReceiptInput.trim().toUpperCase() || reconcileTarget.mpesaReceiptNumber || null,
          resolvedBy: 'super_admin_manual',
          adminNote: cleanReason,
          subscriptionActivated: Boolean(res.activatedSubscription),
        }
      );

      if (res.activatedSubscription) {
        refreshAllBusinessesForSuperAdmin(true).catch(() => {});
      }

      showToast(
        `Reconciled ${reconcileTarget.reference} as ${targetStatus.toUpperCase()}${
          res.activatedSubscription ? ' & activated subscription' : ''
        }.`,
        targetStatus === 'success' ? 'success' : 'warning'
      );

      setReconcileTarget(null);
      await loadReconciliationState(true);
    } catch (err: any) {
      setReconcileError(err?.message || 'Could not complete manual reconciliation.');
    } finally {
      setIsSubmittingReconcile(false);
    }
  };

  const renderStatusLabel = (status: AdminPaymentRecord['status']) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80">
            <CheckCircle2 className="w-3 h-3" />
            <span>Settled</span>
          </span>
        );
      case 'pending':
      case 'pay_offline':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80">
            <Clock className="w-3 h-3" />
            <span>{status === 'pay_offline' ? 'Pay Offline' : 'Pending'}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80">
            <XCircle className="w-3 h-3" />
            <span className="capitalize">{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title="Daraja & Paystack Payment Reconciliation"
        description="Inspect cross-tenant M-Pesa STK Push and Paystack card transactions, run manual Daraja STK Query sweeps, and settle verified orphan payments with full audit notes."
        meta={
          <span className="font-mono tabular-nums">
            {pollerStatus?.lastSweepAt
              ? `Last sweep: ${new Date(pollerStatus.lastSweepAt).toLocaleTimeString()}`
              : 'Poller standby'}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => loadReconciliationState(true)}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleRunPollerSweep}
              disabled={isSweeping || isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              {isSweeping ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>{isSweeping ? 'Sweeping Daraja...' : 'Run Daraja Poller Sweep'}</span>
            </button>
          </div>
        }
      />

      {/* Error & Sweep Notices */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-300">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadReconciliationState(false)}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium shrink-0 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {sweepBanner && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">{sweepBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSweepBanner(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4-Column Hairline KPI Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
        <div className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Gateway Posture</span>
            <ShieldCheck className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-1.5 flex items-center gap-1.5">
            <span>
              Daraja {gatewayConfig?.darajaConfigured ? (gatewayConfig.darajaEnv || 'sandbox').toUpperCase() : 'Off'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            Paystack: {gatewayConfig?.paystackConfigured ? 'READY' : 'UNCONFIGURED'}
          </span>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Pending / Unresolved</span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-xl font-semibold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1.5">
            {computedSummary.pendingCount}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">
            {computedSummary.total} total logged intents
          </span>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Settled Subscriptions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-semibold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1.5">
            KES {computedSummary.settledSubscriptionKes.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">
            {computedSummary.successCount} settled · {computedSummary.failedCount} failed
          </span>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Daraja Poller Queue</span>
            <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1.5">
            {pollerStatus ? pollerStatus.activeTrackedCount : 0} active
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono tabular-nums">
            {pollerStatus
              ? `${pollerStatus.totalSweeps} sweeps · ${pollerStatus.totalResolvedSuccess} auto-settled`
              : 'Loading poller telemetry...'}
          </span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reference, M-Pesa receipt (SHK...), phone, store name, or email..."
            className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              All ({computedSummary.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'pending'
                  ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Pending ({computedSummary.pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('success')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'success'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Settled ({computedSummary.successCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('failed')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'failed'
                  ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              Failed ({computedSummary.failedCount})
            </button>
          </div>

          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value as ProviderFilter)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">All Gateways ({computedSummary.total})</option>
            <option value="daraja">Daraja M-Pesa STK ({computedSummary.darajaCount})</option>
            <option value="paystack">Paystack ({computedSummary.paystackCount})</option>
          </select>
        </div>
      </div>

      {/* Ledger Body */}
      {isLoading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-14 text-center text-xs text-slate-500 dark:text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
          <span>Loading cross-tenant Daraja & Paystack payment ledger...</span>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-12 text-center">
          <CreditCard className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            No matching payment records
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            {enrichedRecords.length === 0
              ? 'No Daraja STK Push or Paystack checkout intents have been recorded yet.'
              : 'Adjust the gateway, status filter, or search query to locate a transaction.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((rec) => {
            const isVerifying = verifyingRef === rec.reference;
            const createdLabel = rec.createdAt
              ? new Date(rec.createdAt).toLocaleString()
              : 'Timestamp unavailable';
            return (
              <div
                key={rec.reference}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 transition hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {rec.reference}
                      </span>
                      {renderStatusLabel(rec.status)}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                          rec.provider === 'daraja'
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70'
                            : 'bg-blue-50/70 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/70'
                        }`}
                      >
                        {rec.provider === 'daraja' ? 'Daraja STK' : 'Paystack'} ·{' '}
                        {rec.channel === 'card' ? 'Card' : 'M-Pesa'}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {rec.flowType === 'subscription' ? 'Subscription' : 'POS Sale'}
                        {rec.planId ? ` · ${rec.planId.toUpperCase()}` : ''}
                        {rec.billingCycle ? ` (${rec.billingCycle})` : ''}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <span className="text-lg font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        KES {Number(rec.amountKes || 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        {rec.businessName || rec.businessId || 'Unassigned Tenant'}
                        {rec.businessCode ? (
                          <span className="ml-1.5 font-mono text-blue-600 dark:text-blue-400">
                            ({rec.businessCode})
                          </span>
                        ) : null}
                      </span>
                      {rec.businessOwnerEmail && (
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          {rec.businessOwnerEmail}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      <span>Initiated: {createdLabel}</span>
                      {rec.phone && <span>MSISDN: {rec.phone}</span>}
                      {rec.mpesaReceiptNumber && (
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          M-Pesa Receipt: {rec.mpesaReceiptNumber}
                        </span>
                      )}
                      {rec.checkoutRequestId && (
                        <span className="truncate max-w-[260px]" title={rec.checkoutRequestId}>
                          CheckoutID: {rec.checkoutRequestId}
                        </span>
                      )}
                      {rec.resolvedBy && (
                        <span className="text-slate-600 dark:text-slate-300">
                          Resolved by: {rec.resolvedBy}
                        </span>
                      )}
                    </div>

                    {(rec.adminNote || rec.gatewayResponse) && (
                      <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg px-3 py-2">
                        {rec.adminNote ? (
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                              Admin Note
                              {rec.reconciledByEmail ? ` (${rec.reconciledByEmail})` : ''}:
                            </span>{' '}
                            {rec.adminNote}
                          </div>
                        ) : (
                          <div>
                            <span className="font-medium text-slate-500 dark:text-slate-400">
                              Gateway Response:
                            </span>{' '}
                            {rec.gatewayResponse}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleVerifyLive(rec)}
                      disabled={Boolean(verifyingRef)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer whitespace-nowrap disabled:opacity-50"
                    >
                      {isVerifying ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>{isVerifying ? 'Checking...' : 'Verify Live'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openReconcileModal(rec)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white transition cursor-pointer whitespace-nowrap"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Manual Reconcile</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Reconciliation Dialog */}
      {reconcileTarget && (
        <div
          className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="manual-reconcile-title"
        >
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h3 id="manual-reconcile-title" className="text-sm font-semibold">
                  Manual Payment Reconciliation
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  {reconcileTarget.reference} · KES {Number(reconcileTarget.amountKes || 0).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={closeReconcileModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReconcile} className="p-5 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Tenant</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {reconcileTarget.businessName || reconcileTarget.businessId || 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 dark:text-slate-400">Current Status</span>
                  <span className="font-mono font-semibold uppercase">{reconcileTarget.status}</span>
                </div>
                {reconcileTarget.planId && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 dark:text-slate-400">Target Tier</span>
                    <span className="font-semibold uppercase">
                      {reconcileTarget.planId} ({reconcileTarget.billingCycle || 'monthly'})
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Reconcile Resolution Status *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'success', label: 'Mark Settled', tone: 'emerald' },
                      { id: 'failed', label: 'Mark Failed', tone: 'rose' },
                      { id: 'abandoned', label: 'Mark Abandoned', tone: 'slate' },
                    ] as const
                  ).map((opt) => {
                    const active = targetStatus === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTargetStatus(opt.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition cursor-pointer ${
                          active
                            ? opt.tone === 'emerald'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : opt.tone === 'rose'
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-600'
                            : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  M-Pesa Receipt / Gateway Confirmation Code (optional)
                </label>
                <input
                  type="text"
                  value={mpesaReceiptInput}
                  onChange={(e) => setMpesaReceiptInput(e.target.value.toUpperCase())}
                  placeholder="e.g. SHK892X4LP"
                  maxLength={64}
                  className="w-full px-3 py-2 text-xs font-mono uppercase bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {targetStatus === 'success' && reconcileTarget.flowType === 'subscription' && (
                <label className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activateSubOnSettle}
                    onChange={(e) => setActivateSubOnSettle(e.target.checked)}
                    className="mt-0.5 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    <strong className="block text-emerald-900 dark:text-emerald-200">
                      Activate / extend tenant subscription immediately
                    </strong>
                    <span className="text-emerald-700 dark:text-emerald-400 text-[11px]">
                      Updates tenant plan to {(reconcileTarget.planId || 'business').toUpperCase()} and sets POS access active.
                    </span>
                  </span>
                </label>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Audit Reason Note *
                  </label>
                  <span className="text-[11px] font-mono tabular-nums text-slate-400">
                    {reasonInput.trim().length}/300
                  </span>
                </div>
                <textarea
                  rows={3}
                  required
                  maxLength={300}
                  value={reasonInput}
                  onChange={(e) => {
                    setReasonInput(e.target.value);
                    if (reconcileError) setReconcileError(null);
                  }}
                  placeholder="e.g. Confirmed M-Pesa statement code SHK892X4LP via merchant WhatsApp support ticket..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  Required. Logged with before/after snapshot to Write Audit Log.
                </p>
              </div>

              {reconcileError && (
                <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg px-3 py-2">
                  {reconcileError}
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeReconcileModal}
                  disabled={isSubmittingReconcile}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReconcile || reasonInput.trim().length < 5}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
                >
                  {isSubmittingReconcile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Reconciliation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
