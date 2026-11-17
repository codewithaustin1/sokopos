import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Printer,
  Copy,
  Check,
  Search,
  CreditCard,
  Phone,
  ArrowUpRight,
  Receipt,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import {
  fetchBusinessPaymentHistory,
  verifyServerPayment,
  SubscriptionPaymentRecord,
} from '../lib/paymentService';
import { auth } from '../lib/firebase';
import {
  normalizePlanTier,
  formatTierDisplayName,
} from '../utils/subscriptionEntitlements';
import { printSubscriptionReceipt } from '../utils/subscriptionReceiptPrint';
import { SettingsSectionHeader } from './common/SettingsSectionHeader';

type StatusFilter = 'all' | 'success' | 'pending' | 'failed';

function formatShortDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatExpiryDate(iso?: string): string {
  if (!iso) return 'Not set';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export const BillingHistoryPanel: React.FC = () => {
  const {
    currentBusiness,
    currentUser,
    activateBusinessSubscription,
    setIsSubscriptionModalOpen,
    openPricingPage,
    showToast,
  } = usePos();

  const [records, setRecords] = useState<SubscriptionPaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [verifyingRef, setVerifyingRef] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!currentBusiness?.id || currentBusiness.id === 'biz-demo') {
      setRecords([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const idToken = await auth.currentUser?.getIdToken().catch(() => undefined);
      const res = await fetchBusinessPaymentHistory(currentBusiness.id, idToken);
      if (!res.success) {
        setLoadError(res.error || 'Could not load billing history.');
      } else {
        setRecords(res.records);
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Unable to load billing history.');
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness?.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, currentBusiness?.subscription?.lastPaymentReference, currentBusiness?.subscription?.lastMpesaReceipt]);

  const handleReverifyRow = async (record: SubscriptionPaymentRecord) => {
    if (!record.reference) return;
    setVerifyingRef(record.reference);
    try {
      const idToken = await auth.currentUser?.getIdToken().catch(() => undefined);
      const res = await verifyServerPayment(record.reference, idToken);
      if (res.verified && res.status === 'success') {
        const tier = normalizePlanTier(res.planId || record.planId || currentBusiness?.plan);
        await activateBusinessSubscription(
          res.businessId || record.businessId || currentBusiness?.id || 'biz-default',
          tier as any,
          res.reference || record.reference
        );
        await loadHistory();
      } else if (res.status === 'failed' || res.status === 'abandoned') {
        showToast(res.error || res.gatewayResponse || 'Transaction was declined or cancelled.', 'error');
        await loadHistory();
      } else {
        showToast('Transaction is still pending confirmation at the payment gateway.', 'info');
      }
    } finally {
      setVerifyingRef(null);
    }
  };

  const handleCopyCode = async (code: string, rowId: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedRef(rowId);
      setTimeout(() => setCopiedRef((prev) => (prev === rowId ? null : prev)), 2000);
    } catch {
      showToast('Copy unavailable in this browser context.', 'error');
    }
  };

  const handlePrintRow = (record: SubscriptionPaymentRecord) => {
    const tierName = formatTierDisplayName(normalizePlanTier(record.planId || currentBusiness?.plan));
    const billingCycle = record.billingCycle === 'annual' ? 'annual' : 'monthly';
    printSubscriptionReceipt({
      businessName: currentBusiness?.name || 'Store',
      businessCode: currentBusiness?.code,
      ownerEmail: currentBusiness?.ownerEmail || currentUser?.email,
      planName: `${tierName} Plan`,
      billingCycle,
      amountKes: record.amountKes,
      channel: record.channel,
      provider: record.provider,
      reference: record.reference,
      mpesaReceiptNumber: record.mpesaReceiptNumber,
      phoneOrEmail: record.phone || record.customerEmail,
      paidAt: record.paidAt || record.createdAt,
      expiresAt: currentBusiness?.subscription?.expiresAt,
      status: 'Paid & Verified',
    });
  };

  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return records.filter((rec) => {
      if (statusFilter === 'success' && rec.status !== 'success') return false;
      if (statusFilter === 'pending' && rec.status !== 'pending' && rec.status !== 'pay_offline') return false;
      if (statusFilter === 'failed' && rec.status !== 'failed' && rec.status !== 'abandoned') return false;
      if (!q) return true;
      const haystack = [
        rec.reference,
        rec.mpesaReceiptNumber,
        rec.planId,
        rec.phone,
        rec.customerEmail,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [records, statusFilter, searchQuery]);

  const activeTierName = formatTierDisplayName(
    normalizePlanTier(currentBusiness?.plan, currentBusiness?.subscription?.planId)
  );
  const subStatus = currentBusiness?.subscription?.status || 'active';
  const lastReceipt =
    currentBusiness?.subscription?.lastMpesaReceipt ||
    currentBusiness?.subscription?.mpesaReceiptNumber ||
    currentBusiness?.subscription?.lastPaymentReference;

  return (
    <div id="billing-history-panel" className="space-y-5">
      {/* Active Subscription Plan Summary Strip */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <SettingsSectionHeader
          title="Subscription & Billing Status"
          description="Monitor your active store plan, renewal expiry date, and payment confirmation history."
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-billing-browse-plans"
                onClick={openPricingPage}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium transition cursor-pointer whitespace-nowrap"
              >
                <span>Compare Plans</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                id="btn-billing-renew-upgrade"
                onClick={() => setIsSubscriptionModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap"
              >
                <span>Renew / Upgrade</span>
              </button>
            </div>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-slate-200 dark:border-slate-800 rounded-lg divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
          <div className="p-3.5">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Active Plan</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
              {activeTierName}
            </div>
          </div>

          <div className="p-3.5">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Subscription State</div>
            <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
              {subStatus === 'active' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="text-emerald-700 dark:text-emerald-400">Active</span>
                </>
              ) : subStatus === 'expired' ? (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span className="text-rose-700 dark:text-rose-400">Expired</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="text-amber-700 dark:text-amber-400 capitalize">{subStatus.replace('_', ' ')}</span>
                </>
              )}
            </div>
          </div>

          <div className="p-3.5">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Valid Until</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1 font-mono tabular-nums">
              {formatExpiryDate(currentBusiness?.subscription?.expiresAt)}
            </div>
          </div>

          <div className="p-3.5">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Last Receipt / Ref</div>
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1.5 font-mono tabular-nums truncate">
              {lastReceipt || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Billing Transactions Ledger */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <SettingsSectionHeader
          title="Payment Ledger & Receipts"
          description="Re-verify pending M-Pesa prompts, check late Daraja receipts, or print tax-ready confirmation slips."
          meta={<span>{records.length} transactions</span>}
          actions={
            <button
              type="button"
              id="btn-refresh-billing-history"
              onClick={loadHistory}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          }
        />

        {/* Filter & Search Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'success', label: 'Paid' },
                { id: 'pending', label: 'Pending' },
                { id: 'failed', label: 'Failed' },
              ] as Array<{ id: StatusFilter; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[210px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference or M-Pesa receipt..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Ledger Content: Loading / Error / Empty / Table */}
        {isLoading ? (
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {[0, 1, 2, 3].map((idx) => (
              <div key={idx} className="h-11 px-4 flex items-center justify-between gap-4">
                <div className="h-3 w-28 rounded skeleton-shimmer" />
                <div className="h-3 w-24 rounded skeleton-shimmer" />
                <div className="h-3 w-36 rounded skeleton-shimmer" />
                <div className="h-3 w-20 rounded skeleton-shimmer" />
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="p-5 rounded-lg border border-rose-200 dark:border-rose-800/70 bg-rose-50 dark:bg-rose-950/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loadError}</span>
            </div>
            <button
              type="button"
              onClick={loadHistory}
              className="px-3 py-1.5 rounded-md bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-200 font-semibold cursor-pointer whitespace-nowrap"
            >
              Retry
            </button>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-10 px-4 text-center border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
            <Receipt className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {records.length === 0
                  ? 'No subscription payments yet'
                  : 'No transactions match this filter'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {records.length === 0
                  ? 'Completed M-Pesa Express and Paystack card payments will appear here with verification codes.'
                  : 'Try switching status tabs or clearing your search query.'}
              </p>
            </div>
            {records.length === 0 && (
              <button
                type="button"
                onClick={() => setIsSubscriptionModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer"
              >
                <span>Activate or Upgrade Plan</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Plan</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Reference &amp; Receipt</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredRecords.map((rec) => {
                  const isSuccess = rec.status === 'success';
                  const isPending = rec.status === 'pending' || rec.status === 'pay_offline';
                  const tierLabel = rec.planId
                    ? formatTierDisplayName(normalizePlanTier(rec.planId))
                    : 'Plan';
                  const cycleLabel = rec.billingCycle === 'annual' ? 'Annual' : 'Monthly';
                  const copyTarget = rec.mpesaReceiptNumber || rec.reference;
                  const isVerifying = verifyingRef === rec.reference;

                  return (
                    <tr
                      key={rec.reference}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono tabular-nums text-[11px] whitespace-nowrap">
                        {formatShortDateTime(rec.paidAt || rec.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {tierLabel}
                        </span>
                        <span className="text-slate-400 mx-1">·</span>
                        <span className="text-slate-500 dark:text-slate-400">{cycleLabel}</span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {rec.channel === 'card' ? (
                            <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          ) : (
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          <span>
                            {rec.channel === 'card' ? 'Card' : 'M-Pesa'}
                          </span>
                          {(rec.phone || rec.customerEmail) && (
                            <>
                              <span className="text-slate-400">·</span>
                              <span className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                                {rec.phone || rec.customerEmail}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 font-mono tabular-nums text-[11px]">
                          <span className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-[175px]">
                            {rec.mpesaReceiptNumber || rec.reference}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(copyTarget, rec.reference)}
                            title={`Copy ${rec.mpesaReceiptNumber ? 'M-Pesa receipt' : 'reference'}`}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                          >
                            {copiedRef === rec.reference ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        {rec.mpesaReceiptNumber && (
                          <div className="text-[10px] font-mono text-slate-400 truncate max-w-[190px]">
                            {rec.reference}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        KES {Number(rec.amountKes || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isSuccess ? (
                          <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Paid</span>
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>Pending</span>
                          </span>
                        ) : (
                          <span
                            title={rec.gatewayResponse || 'Not completed'}
                            className="inline-flex items-center gap-1 font-medium text-rose-700 dark:text-rose-400"
                          >
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span className="capitalize">{rec.status}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {isSuccess ? (
                          <button
                            type="button"
                            onClick={() => handlePrintRow(rec)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition cursor-pointer"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Receipt</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleReverifyRow(rec)}
                            disabled={isVerifying}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold transition cursor-pointer disabled:opacity-60"
                          >
                            <RefreshCw className={`w-3 h-3 ${isVerifying ? 'animate-spin' : ''}`} />
                            <span>{isVerifying ? 'Checking...' : 'Re-verify'}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
