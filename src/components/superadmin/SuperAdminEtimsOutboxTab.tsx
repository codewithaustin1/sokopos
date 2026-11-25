import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  FileWarning,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  X,
  XCircle,
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { usePos } from '../../context/PosContext';
import {
  AdminEtimsOutboxItem,
  AdminEtimsOutboxSummary,
  AdminEtimsTenantSummary,
  EtimsErrorCategory,
  EtimsOutboxKind,
  EtimsOutboxStatus,
  bulkReplayAdminEtims,
  fetchAdminEtimsOutbox,
  overrideAdminEtimsItem,
  pollAdminEtimsItem,
  retryAdminEtimsItem,
} from '../../lib/etimsAdminService';
import { SettingsSectionHeader } from '../common/SettingsSectionHeader';

type StatusFilter =
  | 'attention'
  | 'all'
  | 'FAILED'
  | 'WAITING_SALE'
  | 'PENDING'
  | 'MISSING'
  | 'COMPLETED';

type KindFilter = 'all' | EtimsOutboxKind;
type EnvFilter = 'all' | 'sandbox' | 'production';

interface SuperAdminEtimsOutboxTabProps {
  onBacklogCountChange?: (count: number) => void;
}

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

function getErrorCategoryLabel(cat: EtimsErrorCategory): string {
  switch (cat) {
    case 'PARENT_SALE_UNFISCALIZED':
      return 'Parent Sale Unfiscalized';
    case 'TAX_PIN_MISMATCH':
      return 'KRA PIN Mismatch';
    case 'SKU_UNREGISTERED':
      return 'SKU Registration Needed';
    case 'GATEWAY_UNCONFIGURED':
      return 'Gateway Key Missing';
    case 'FISCAL_VALIDATION':
      return 'Fiscal Payload Validation';
    case 'GATEWAY_TIMEOUT':
      return 'Gateway / Network Timeout';
    case 'CU_REJECTED':
      return 'Control Unit Rejected';
    case 'AWAITING_SIGNATURE':
      return 'Awaiting CU Signature';
    case 'NEVER_SUBMITTED':
      return 'Never Transmitted';
    default:
      return 'Compliant';
  }
}

function getStatusDisplay(status: EtimsOutboxStatus): {
  label: string;
  textClass: string;
  bgClass: string;
} {
  switch (status) {
    case 'COMPLETED':
      return {
        label: 'COMPLETED',
        textClass: 'text-emerald-700 dark:text-emerald-400',
        bgClass: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/70',
      };
    case 'FAILED':
      return {
        label: 'FAILED',
        textClass: 'text-rose-700 dark:text-rose-400',
        bgClass: 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/70',
      };
    case 'WAITING_SALE':
      return {
        label: 'BLOCKED (SALE)',
        textClass: 'text-amber-700 dark:text-amber-400',
        bgClass: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/70',
      };
    case 'PENDING':
      return {
        label: 'PENDING CU',
        textClass: 'text-blue-700 dark:text-blue-400',
        bgClass: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800/70',
      };
    case 'MISSING':
    default:
      return {
        label: 'UNSUBMITTED',
        textClass: 'text-slate-700 dark:text-slate-300',
        bgClass: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
      };
  }
}

export const SuperAdminEtimsOutboxTab: React.FC<SuperAdminEtimsOutboxTabProps> = ({
  onBacklogCountChange,
}) => {
  const { logSuperAdminAction, showToast } = usePos();

  const [items, setItems] = useState<AdminEtimsOutboxItem[]>([]);
  const [tenants, setTenants] = useState<AdminEtimsTenantSummary[]>([]);
  const [summary, setSummary] = useState<AdminEtimsOutboxSummary | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('attention');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [envFilter, setEnvFilter] = useState<EnvFilter>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('all');

  // Row / Action state
  const [expandedOutboxId, setExpandedOutboxId] = useState<string | null>(null);
  const [activeItemBusyId, setActiveItemBusyId] = useState<string | null>(null);

  // Bulk replay state
  const [isBulkReplaying, setIsBulkReplaying] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    total: number;
    processed: number;
    completedCount: number;
    pendingCount: number;
    failedCount: number;
    scopeLabel: string;
  } | null>(null);

  // Manual override modal state
  const [overrideTarget, setOverrideTarget] = useState<AdminEtimsOutboxItem | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<'COMPLETED' | 'FAILED'>('COMPLETED');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideCuInvoice, setOverrideCuInvoice] = useState('');
  const [overrideCuSerial, setOverrideCuSerial] = useState('');
  const [overrideSignature, setOverrideSignature] = useState('');
  const [overrideEtimsUrl, setOverrideEtimsUrl] = useState('');
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  const loadOutbox = useCallback(
    async (silent = false) => {
      if (silent) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);
      try {
        const idToken = await getFreshSuperAdminToken();
        const res = await fetchAdminEtimsOutbox(idToken);
        if (!res.success) {
          throw new Error(res.error || 'Failed to load Global eTIMS Outbox.');
        }
        setItems(res.items);
        setTenants(res.tenants);
        setSummary(res.summary || null);
        if (onBacklogCountChange && res.summary) {
          onBacklogCountChange(res.summary.attentionCount);
        }
      } catch (err: any) {
        setError(err?.message || 'Unable to load cross-tenant eTIMS compliance queue.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [onBacklogCountChange]
  );

  useEffect(() => {
    void loadOutbox(false);
  }, [loadOutbox]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter === 'attention' && item.status === 'COMPLETED') return false;
      if (statusFilter !== 'attention' && statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }
      if (kindFilter !== 'all' && item.kind !== kindFilter) return false;
      if (envFilter !== 'all' && item.environment !== envFilter) return false;
      if (tenantFilter !== 'all' && item.businessId !== tenantFilter) return false;

      if (!q) return true;
      return (
        item.receiptNumber.toLowerCase().includes(q) ||
        (item.refundNumber || '').toLowerCase().includes(q) ||
        item.traderInvoiceNumber.toLowerCase().includes(q) ||
        (item.digitaxId || '').toLowerCase().includes(q) ||
        item.businessName.toLowerCase().includes(q) ||
        item.businessCode.toLowerCase().includes(q) ||
        item.configuredTaxPin.toLowerCase().includes(q) ||
        (item.lastError || '').toLowerCase().includes(q) ||
        getErrorCategoryLabel(item.errorCategory).toLowerCase().includes(q)
      );
    });
  }, [items, searchQuery, statusFilter, kindFilter, envFilter, tenantFilter]);

  const eligibleReplayItems = useMemo(
    () => filteredItems.filter((item) => item.status !== 'COMPLETED'),
    [filteredItems]
  );

  const attentionTenants = useMemo(
    () => tenants.filter((t) => t.attentionCount > 0),
    [tenants]
  );

  const handlePollItem = async (item: AdminEtimsOutboxItem) => {
    setActiveItemBusyId(item.outboxId);
    try {
      const idToken = await getFreshSuperAdminToken();
      const res = await pollAdminEtimsItem(idToken, {
        transactionId: item.transactionId,
        refundId: item.refundId,
      });

      if (!res.success) {
        showToast(res.error || 'DigiTax poll failed.', 'error');
        return;
      }

      logSuperAdminAction(
        item.businessId,
        'etims',
        item.refundId ? `${item.transactionId}:${item.refundId}` : item.transactionId,
        'update',
        `Polled DigiTax eTIMS ${item.kind === 'credit_note' ? 'Credit Note' : 'Invoice'} ${
          item.refundNumber || item.receiptNumber
        } → ${res.status || 'PENDING'}`,
        res.beforeValue ?? null,
        res.afterValue ?? null
      );

      showToast(res.message || 'DigiTax status refreshed.', res.status === 'COMPLETED' ? 'success' : 'info');
      await loadOutbox(true);
    } catch (err: any) {
      showToast(err?.message || 'Failed to poll DigiTax status.', 'error');
    } finally {
      setActiveItemBusyId(null);
    }
  };

  const handleRetryItem = async (item: AdminEtimsOutboxItem) => {
    setActiveItemBusyId(item.outboxId);
    try {
      const idToken = await getFreshSuperAdminToken();
      const res = await retryAdminEtimsItem(idToken, {
        transactionId: item.transactionId,
        refundId: item.refundId,
      });

      const docLabel = item.kind === 'credit_note' ? `Credit Note ${item.refundNumber}` : `Invoice ${item.receiptNumber}`;
      logSuperAdminAction(
        item.businessId,
        'etims',
        item.refundId ? `${item.transactionId}:${item.refundId}` : item.transactionId,
        'retry',
        `Retried eTIMS ${docLabel} (${item.traderInvoiceNumber}) → ${res.status || (res.success ? 'COMPLETED' : 'FAILED')}${
          res.newlyRegisteredSkus ? ` · registered ${res.newlyRegisteredSkus} SKU(s)` : ''
        }`,
        res.beforeValue ?? null,
        res.afterValue ?? { status: res.status || 'FAILED', error: res.error }
      );

      if (res.success) {
        showToast(
          res.message || `${docLabel} submitted cleanly.`,
          res.status === 'COMPLETED' ? 'success' : 'info'
        );
      } else {
        showToast(res.error || `Retry failed for ${docLabel}.`, 'error');
      }

      await loadOutbox(true);
    } catch (err: any) {
      showToast(err?.message || 'Retry submission failed.', 'error');
    } finally {
      setActiveItemBusyId(null);
    }
  };

  const runBulkReplay = async (
    targetItems: AdminEtimsOutboxItem[],
    scopeLabel: string
  ) => {
    if (isBulkReplaying || targetItems.length === 0) return;
    setIsBulkReplaying(true);
    setBulkProgress({
      total: targetItems.length,
      processed: 0,
      completedCount: 0,
      pendingCount: 0,
      failedCount: 0,
      scopeLabel,
    });

    try {
      const idToken = await getFreshSuperAdminToken();
      // Dependency-sort before chunking: parent sales first, then credit notes
      const sales = targetItems.filter((i) => i.kind === 'sale');
      const creditNotes = targetItems.filter((i) => i.kind === 'credit_note');
      const ordered = [...sales, ...creditNotes];

      const CHUNK_SIZE = 25;
      let processed = 0;
      let completedCount = 0;
      let pendingCount = 0;
      let failedCount = 0;

      for (let i = 0; i < ordered.length; i += CHUNK_SIZE) {
        const chunk = ordered.slice(i, i + CHUNK_SIZE);
        const res = await bulkReplayAdminEtims(
          idToken,
          chunk.map((c) => ({ transactionId: c.transactionId, refundId: c.refundId }))
        );

        if (!res.success) {
          throw new Error(res.error || 'Bulk replay batch interrupted.');
        }

        for (const r of res.results) {
          processed += 1;
          if (r.status === 'COMPLETED') completedCount += 1;
          else if (r.status === 'PENDING' && r.ok) pendingCount += 1;
          else failedCount += 1;

          if (r.businessId) {
            logSuperAdminAction(
              r.businessId,
              'etims',
              r.refundId ? `${r.transactionId}:${r.refundId}` : r.transactionId,
              'retry',
              `Bulk Replay (${scopeLabel}) ${
                r.kind === 'credit_note' ? 'Credit Note' : 'Invoice'
              } ${r.receiptNumber || r.transactionId} → ${r.status}`,
              r.beforeValue ?? null,
              r.afterValue ?? { status: r.status, message: r.message }
            );
          }
        }

        setBulkProgress({
          total: ordered.length,
          processed,
          completedCount,
          pendingCount,
          failedCount,
          scopeLabel,
        });
      }

      showToast(
        `Bulk replay finished (${scopeLabel}): ${completedCount} signed, ${pendingCount} pending CU, ${failedCount} failed.`,
        failedCount > 0 ? 'info' : 'success'
      );
      await loadOutbox(true);
    } catch (err: any) {
      showToast(err?.message || 'Bulk replay encountered an error.', 'error');
    } finally {
      setIsBulkReplaying(false);
    }
  };

  const openOverrideModal = (item: AdminEtimsOutboxItem) => {
    setOverrideTarget(item);
    setOverrideStatus('COMPLETED');
    setOverrideReason('');
    setOverrideCuInvoice(item.cuInvoiceNumber ? String(item.cuInvoiceNumber) : '');
    setOverrideCuSerial(item.cuSerialNumber || '');
    setOverrideSignature(item.receiptSignature || '');
    setOverrideEtimsUrl(item.etimsUrl || '');
    setOverrideError(null);
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideTarget) return;

    const cleanReason = overrideReason.trim();
    if (cleanReason.length < 5) {
      setOverrideError('Please enter an audit reason note (at least 5 characters).');
      return;
    }

    setIsSubmittingOverride(true);
    setOverrideError(null);
    try {
      const idToken = await getFreshSuperAdminToken();
      const res = await overrideAdminEtimsItem(idToken, {
        transactionId: overrideTarget.transactionId,
        refundId: overrideTarget.refundId,
        targetStatus: overrideStatus,
        reason: cleanReason,
        cuInvoiceNumber: overrideCuInvoice.trim() || undefined,
        cuSerialNumber: overrideCuSerial.trim() || undefined,
        receiptSignature: overrideSignature.trim() || undefined,
        etimsUrl: overrideEtimsUrl.trim() || undefined,
      });

      if (!res.success) {
        setOverrideError(res.error || 'Failed to apply manual override.');
        return;
      }

      const refLabel = overrideTarget.refundNumber || overrideTarget.receiptNumber;
      logSuperAdminAction(
        overrideTarget.businessId,
        'etims',
        overrideTarget.refundId
          ? `${overrideTarget.transactionId}:${overrideTarget.refundId}`
          : overrideTarget.transactionId,
        'override',
        `Manual eTIMS override on ${
          overrideTarget.kind === 'credit_note' ? 'Credit Note' : 'Invoice'
        } ${refLabel} → ${overrideStatus} (Reason: ${cleanReason})`,
        res.beforeValue ?? null,
        res.afterValue ?? { status: overrideStatus, reason: cleanReason }
      );

      showToast(res.message || `Updated ${refLabel} to ${overrideStatus}.`, 'success');
      setOverrideTarget(null);
      await loadOutbox(true);
    } catch (err: any) {
      setOverrideError(err?.message || 'Unexpected error applying override.');
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('attention');
    setKindFilter('all');
    setEnvFilter('all');
    setTenantFilter('all');
  };

  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        title="Global eTIMS Outbox"
        description="Cross-tenant KRA eTIMS compliance monitor aggregating failed, pending, and unsubmitted sales invoices and refund credit notes."
        meta={
          summary ? (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono tabular-nums text-[11px]">
              <span>
                Sandbox:{' '}
                <strong
                  className={
                    summary.digitaxConfigured.sandbox
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }
                >
                  {summary.digitaxConfigured.sandbox ? 'Ready' : 'Unset'}
                </strong>
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span>
                Prod:{' '}
                <strong
                  className={
                    summary.digitaxConfigured.production
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }
                >
                  {summary.digitaxConfigured.production ? 'Ready' : 'Unset'}
                </strong>
              </span>
            </span>
          ) : undefined
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void loadOutbox(true)}
              disabled={isLoading || isRefreshing || isBulkReplaying}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Queue</span>
            </button>

            <button
              type="button"
              onClick={() =>
                void runBulkReplay(
                  eligibleReplayItems,
                  tenantFilter === 'all'
                    ? 'Filtered Queue'
                    : tenants.find((t) => t.businessId === tenantFilter)?.businessName || 'Tenant Queue'
                )
              }
              disabled={isLoading || isBulkReplaying || eligibleReplayItems.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition cursor-pointer disabled:opacity-50"
            >
              {isBulkReplaying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>
                Bulk Replay ({eligibleReplayItems.length})
              </span>
            </button>
          </div>
        }
      />

      {/* 4-Column Compliance KPI Strip */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 h-24 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Platform Compliance Rate</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {summary?.complianceRatePct ?? 100}%
            </div>
            <div className="mt-1 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {summary?.completedCount ?? 0} signed / {summary?.totalRecords ?? 0} total fiscal docs
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Failed / Rejected</span>
              <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-rose-600 dark:text-rose-400">
              {summary?.failedCount ?? 0}
            </div>
            <div className="mt-1 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {summary?.failedSalesCount ?? 0} sales · {summary?.failedCreditNotesCount ?? 0} credit notes/blocked
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Pending CU &amp; Queue</span>
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {(summary?.pendingCount ?? 0) + (summary?.waitingSaleCount ?? 0) + (summary?.missingCount ?? 0)}
            </div>
            <div className="mt-1 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {summary?.pendingCount ?? 0} polling · {summary?.waitingSaleCount ?? 0} blocked ·{' '}
              {summary?.missingCount ?? 0} unsubmitted
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium">Affected Tenants &amp; Exposure</span>
              <FileWarning className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              KES {(summary?.exposedKes ?? 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-1 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
              Across {summary?.affectedTenantCount ?? 0} live tenant(s)
            </div>
          </div>
        </div>
      )}

      {/* Tenant Bottleneck Strip */}
      {!isLoading && attentionTenants.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Tenants with Active eTIMS Backlog ({attentionTenants.length})
            </div>
            {tenantFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setTenantFilter('all')}
                className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Show All Tenants
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {attentionTenants.slice(0, 6).map((t) => {
              const isSelected = tenantFilter === t.businessId;
              const storeItems = items.filter(
                (it) => it.businessId === t.businessId && it.status !== 'COMPLETED'
              );
              return (
                <div
                  key={t.businessId}
                  className={`rounded-lg border p-3 flex items-center justify-between gap-3 transition-colors ${
                    isSelected
                      ? 'border-blue-400 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setTenantFilter(isSelected ? 'all' : t.businessId)}
                    className="min-w-0 text-left flex-1 cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {t.businessName}
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {t.businessCode || t.businessId} · {t.taxPin || 'No PIN'} · {t.environment}
                    </div>
                    <div className="text-[11px] font-mono tabular-nums mt-1 text-slate-600 dark:text-slate-300">
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">
                        {t.attentionCount} stuck
                      </span>{' '}
                      · KES {t.exposedKes.toLocaleString()}
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={isBulkReplaying || storeItems.length === 0}
                    onClick={() => void runBulkReplay(storeItems, t.businessName)}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-50"
                    title={`Replay all stuck records for ${t.businessName}`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Replay</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bulk Replay Progress Banner */}
      {bulkProgress && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
              {isBulkReplaying ? (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
              <span>
                {isBulkReplaying ? 'Replaying' : 'Replay Complete'}: {bulkProgress.scopeLabel}
              </span>
            </div>
            <div className="font-mono tabular-nums text-[11px] text-slate-600 dark:text-slate-300">
              {bulkProgress.processed}/{bulkProgress.total} processed ·{' '}
              <span className="text-emerald-600 dark:text-emerald-400">
                {bulkProgress.completedCount} signed
              </span>{' '}
              ·{' '}
              <span className="text-blue-600 dark:text-blue-400">
                {bulkProgress.pendingCount} pending CU
              </span>{' '}
              ·{' '}
              <span className="text-rose-600 dark:text-rose-400">
                {bulkProgress.failedCount} failed
              </span>
            </div>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{
                width: `${
                  bulkProgress.total > 0
                    ? Math.round((bulkProgress.processed / bulkProgress.total) * 100)
                    : 100
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Unable to synchronize Global eTIMS Outbox</div>
              <div className="mt-0.5 opacity-90">{error}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadOutbox(false)}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium cursor-pointer"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
          <div className="lg:col-span-4 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search receipt, refund, SOKO-#, store, PIN, or error..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Filter by document kind"
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as KindFilter)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Documents</option>
              <option value="sale">Sales Invoices</option>
              <option value="credit_note">Refund Credit Notes</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Filter by outbox status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="attention">Attention Required</option>
              <option value="FAILED">Failed / Rejected</option>
              <option value="WAITING_SALE">Blocked (Parent Sale)</option>
              <option value="PENDING">Pending CU Signature</option>
              <option value="MISSING">Never Transmitted</option>
              <option value="COMPLETED">Completed (Signed)</option>
              <option value="all">All Records</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Filter by environment"
              value={envFilter}
              onChange={(e) => setEnvFilter(e.target.value as EnvFilter)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Environments</option>
              <option value="production">Production</option>
              <option value="sandbox">Sandbox</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Filter by tenant"
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">All Tenants ({tenants.length})</option>
              {tenants.map((t) => (
                <option key={t.businessId} value={t.businessId}>
                  {t.businessName} ({t.attentionCount} stuck)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Outbox Queue List */}
      {isLoading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden">
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx} className="p-4 h-20 animate-pulse bg-slate-50/40 dark:bg-slate-950/30" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-12 px-6 text-center">
          {items.length === 0 || (statusFilter === 'attention' && (summary?.attentionCount ?? 0) === 0) ? (
            <>
              <ShieldCheck className="w-9 h-9 text-emerald-600 dark:text-emerald-400 mx-auto mb-2.5" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                All live tenants are eTIMS-compliant
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Zero failed, pending, or unsubmitted invoices or refund credit notes were detected across active tenant ledgers.
              </p>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('COMPLETED')}
                  className="mt-4 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Inspect Signed History ({summary?.completedCount ?? 0})
                </button>
              )}
            </>
          ) : (
            <>
              <SlidersHorizontal className="w-8 h-8 text-slate-400 mx-auto mb-2.5" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                No matching eTIMS outbox entries
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Adjust your search query or filters to inspect other documents.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Reset Filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden">
          {filteredItems.map((item) => {
            const statusMeta = getStatusDisplay(item.status);
            const isExpanded = expandedOutboxId === item.outboxId;
            const isBusy = activeItemBusyId === item.outboxId || isBulkReplaying;
            const canPoll = Boolean(item.digitaxId) && item.status !== 'COMPLETED';
            const canRetry = item.status !== 'COMPLETED';

            return (
              <div key={item.outboxId} className="text-xs">
                <div className="p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                  {/* Left: Document & Tenant Metadata */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded border text-[10px] font-semibold tracking-wide ${
                          item.kind === 'credit_note'
                            ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800/70 text-purple-700 dark:text-purple-300'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {item.kind === 'credit_note' ? 'CREDIT NOTE' : 'SALE INVOICE'}
                      </span>

                      <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        {item.refundNumber || item.receiptNumber}
                      </span>

                      <span className="text-slate-300 dark:text-slate-700">·</span>
                      <span className="font-mono tabular-nums text-[11px] text-slate-600 dark:text-slate-300">
                        {item.traderInvoiceNumber}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded border text-[10px] font-semibold font-mono ${statusMeta.bgClass} ${statusMeta.textClass}`}
                      >
                        {statusMeta.label}
                      </span>

                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {getErrorCategoryLabel(item.errorCategory)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {item.businessName}
                      </span>
                      <span className="font-mono">{item.businessCode || item.businessId}</span>
                      <span>·</span>
                      <span className="font-mono">PIN: {item.configuredTaxPin || 'Unset'}</span>
                      <span>·</span>
                      <span className="uppercase font-mono">{item.environment}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">
                        {item.timestamp ? new Date(item.timestamp).toLocaleString() : '—'}
                      </span>
                      {item.attemptCount > 0 && (
                        <>
                          <span>·</span>
                          <span className="font-mono tabular-nums">
                            {item.attemptCount} attempt{item.attemptCount === 1 ? '' : 's'}
                          </span>
                        </>
                      )}
                    </div>

                    {item.lastError && item.status !== 'COMPLETED' && (
                      <div className="text-[11px] text-rose-700 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50 rounded-md px-2.5 py-1.5">
                        {item.lastError}
                      </div>
                    )}

                    {item.status === 'COMPLETED' && item.overrideReason && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md px-2.5 py-1">
                        Manual override by {item.overriddenByEmail}: {item.overrideReason}
                      </div>
                    )}
                  </div>

                  {/* Right: Financial Amount & Operator Controls */}
                  <div className="flex flex-wrap items-center justify-between xl:justify-end gap-3 shrink-0">
                    <div className="text-left xl:text-right">
                      <div className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        KES {item.amountKes.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
                        Tax: KES {item.taxAmountKes.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · {item.itemCount} item{item.itemCount === 1 ? '' : 's'}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {canPoll && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handlePollItem(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium cursor-pointer disabled:opacity-50"
                          title="Poll DigiTax for asynchronous Control Unit signature"
                        >
                          {activeItemBusyId === item.outboxId ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                          <span>Poll DigiTax</span>
                        </button>
                      )}

                      {canRetry && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleRetryItem(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium cursor-pointer disabled:opacity-50"
                          title="Register missing SKUs if needed and re-transmit to DigiTax"
                        >
                          {activeItemBusyId === item.outboxId ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          <span>Retry Submit</span>
                        </button>
                      )}

                      {item.status !== 'COMPLETED' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => openOverrideModal(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium cursor-pointer disabled:opacity-50"
                          title="Manually resolve or dismiss with required audit reason"
                        >
                          <ShieldAlert className="w-3 h-3" />
                          <span>Override</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setExpandedOutboxId(isExpanded ? null : item.outboxId)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-medium cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Log' : 'Inspect'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable Error Diagnostics & Fiscal Payload Panel */}
                {isExpanded && (
                  <div className="bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-[11px]">
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-1">
                        <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-slate-400">
                          Control Unit Identifiers
                        </div>
                        <div>Doc ID: {item.transactionId}</div>
                        {item.refundId && <div>Refund ID: {item.refundId}</div>}
                        <div>DigiTax ID: {item.digitaxId || 'Not created'}</div>
                        <div>CU Serial: {item.cuSerialNumber || '—'}</div>
                        <div>CU Invoice #: {item.cuInvoiceNumber ?? '—'}</div>
                        <div>Last Attempt: {item.lastAttemptAt ? new Date(item.lastAttemptAt).toLocaleString() : '—'}</div>
                      </div>

                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-1">
                        <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-slate-400">
                          {item.kind === 'credit_note' ? 'Parent Sale Dependency' : 'Fiscal Signature & QR'}
                        </div>
                        {item.kind === 'credit_note' ? (
                          <>
                            <div>Original Invoice: {item.originalTraderInvoiceNumber}</div>
                            <div>Parent Status: {item.parentSaleStatus || 'MISSING'}</div>
                            <div>Parent DigiTax ID: {item.parentSaleId || '—'}</div>
                            <div>Parent CU #: {item.parentCuInvoiceNumber ?? '—'}</div>
                          </>
                        ) : (
                          <>
                            <div>Signature: {item.receiptSignature || 'Awaiting CU signature'}</div>
                            <div>Receipt #: {item.fiscalReceiptNumber ?? '—'}</div>
                            <div>Payment Method: {item.paymentMethod}</div>
                          </>
                        )}
                        {item.etimsUrl && /^https?:\/\//i.test(item.etimsUrl) && (
                          <a
                            href={item.etimsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline pt-1 font-sans font-medium"
                          >
                            <span>Open KRA Verification URL</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-1">
                        <div className="text-[10px] font-sans font-semibold uppercase tracking-wider text-slate-400">
                          Error Log Details
                        </div>
                        <div className="text-slate-700 dark:text-slate-300 font-sans">
                          Category: <strong>{getErrorCategoryLabel(item.errorCategory)}</strong>
                        </div>
                        <div className="text-rose-600 dark:text-rose-400 break-words font-sans">
                          {item.lastError || 'No error recorded.'}
                        </div>
                      </div>
                    </div>

                    {item.itemsSummary.length > 0 && (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                        <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Fiscal Line Items ({item.itemCount})
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {item.itemsSummary.map((line, lIdx) => (
                            <div
                              key={`${line.productId}-${lIdx}`}
                              className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]"
                            >
                              <div className="min-w-0">
                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                  {line.productName}
                                </span>
                                {line.sku && (
                                  <span className="ml-2 font-mono text-slate-400">{line.sku}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                                <span>Qty {line.quantity}</span>
                                <span>KES {line.unitPrice.toLocaleString()}</span>
                                <span>Tax {line.taxTypeCode || 'Auto'}</span>
                                <span
                                  className={
                                    line.hasDigitaxItemId
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-amber-600 dark:text-amber-400'
                                  }
                                >
                                  {line.hasDigitaxItemId ? 'SKU Linked' : 'Needs Sync'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Resolution / Override Modal */}
      {overrideTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Manual eTIMS Resolution Override
                </h3>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  {overrideTarget.businessName} ·{' '}
                  {overrideTarget.refundNumber || overrideTarget.receiptNumber} ·{' '}
                  {overrideTarget.traderInvoiceNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOverrideTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleOverrideSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Target Compliance Status
                </label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value as 'COMPLETED' | 'FAILED')}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="COMPLETED">
                    COMPLETED — Verified / Settled Externally on KRA Portal
                  </option>
                  <option value="FAILED">
                    FAILED — Mark Exception / Non-Fiscal Test Record
                  </option>
                </select>
              </div>

              {overrideStatus === 'COMPLETED' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      CU Invoice # (Optional)
                    </label>
                    <input
                      type="text"
                      value={overrideCuInvoice}
                      onChange={(e) => setOverrideCuInvoice(e.target.value)}
                      placeholder="e.g. 1181464"
                      className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      CU Serial # (Optional)
                    </label>
                    <input
                      type="text"
                      value={overrideCuSerial}
                      onChange={(e) => setOverrideCuSerial(e.target.value)}
                      placeholder="e.g. KRARVS000000005"
                      className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      KRA Receipt Signature (Optional)
                    </label>
                    <input
                      type="text"
                      value={overrideSignature}
                      onChange={(e) => setOverrideSignature(e.target.value)}
                      placeholder="Verified CU cryptographic signature"
                      className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      KRA QR Verification URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={overrideEtimsUrl}
                      onChange={(e) => setOverrideEtimsUrl(e.target.value)}
                      placeholder="https://etims.kra.go.ke/..."
                      className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Mandatory Audit Reason Note *
                </label>
                <textarea
                  required
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Document why this fiscal record is being manually overridden (recorded permanently to Write Audit Log)..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                  Before and after fiscal snapshots will be written to Platform Write Audit Log.
                </span>
              </div>

              {overrideError && (
                <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px]">
                  {overrideError}
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOverrideTarget(null)}
                  className="px-3.5 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOverride}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-medium cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingOverride && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Override &amp; Audit Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
