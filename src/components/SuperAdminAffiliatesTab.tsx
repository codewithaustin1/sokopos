import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Users,
  Wallet,
} from 'lucide-react';
import {
  fetchAdminAffiliateOverview,
  reviewAffiliatePayout,
  updateAffiliateRateOrStatus,
} from '../lib/affiliateService';
import { AffiliateCommission, AffiliatePayout, AffiliateProfile } from '../types';
import { usePos } from '../context/PosContext';
import { SettingsSectionHeader } from './common/SettingsSectionHeader';

export const SuperAdminAffiliatesTab: React.FC = () => {
  const { currentUser, showToast } = usePos();
  const [isLoading, setIsLoading] = useState(false);
  const [affiliates, setAffiliates] = useState<AffiliateProfile[]>([]);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [receiptInputs, setReceiptInputs] = useState<Record<string, string>>({});
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchAdminAffiliateOverview();
      setAffiliates(data.affiliates || []);
      setCommissions(data.commissions || []);
      setPayouts(data.payouts || []);
    } catch (err: any) {
      showToast(err?.message || 'Failed to load affiliate data.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReviewPayout = async (payoutId: string, action: 'approved' | 'paid' | 'rejected') => {
    const receipt = (receiptInputs[payoutId] || '').trim();
    const notes = (noteInputs[payoutId] || '').trim();
    if (action === 'paid' && !receipt) {
      showToast('Enter the M-Pesa transaction receipt code before marking Paid.', 'error');
      return;
    }

    setBusyId(payoutId);
    const res = await reviewAffiliatePayout({
      payoutId,
      action,
      mpesaReceiptNumber: receipt,
      notes: notes || undefined,
      reviewedBy: currentUser?.email || 'Platform Support',
    });
    setBusyId(null);

    if (!res.success) {
      showToast(res.error || 'Failed to update payout.', 'error');
      return;
    }
    showToast(
      action === 'approved'
        ? 'Payout approved and queued for disbursement.'
        : action === 'paid'
        ? 'Payout marked Paid.'
        : 'Payout rejected and balance refunded.',
      'success'
    );
    loadData();
  };

  const handleToggleRate = async (aff: AffiliateProfile, newRate: number) => {
    setBusyId(aff.id);
    const res = await updateAffiliateRateOrStatus({
      affiliateId: aff.id,
      commissionRate: newRate,
    });
    setBusyId(null);
    if (res.success) {
      showToast(`Updated ${aff.code} rate to ${Math.round(newRate * 100)}%.`, 'success');
      loadData();
    } else {
      showToast(res.error || 'Failed to update rate.', 'error');
    }
  };

  const handleToggleStatus = async (aff: AffiliateProfile) => {
    const nextStatus = aff.status === 'active' ? 'suspended' : 'active';
    setBusyId(aff.id);
    const res = await updateAffiliateRateOrStatus({
      affiliateId: aff.id,
      status: nextStatus,
    });
    setBusyId(null);
    if (res.success) {
      showToast(`${aff.code} is now ${nextStatus}.`, 'success');
      loadData();
    } else {
      showToast(res.error || 'Failed to update status.', 'error');
    }
  };

  const pendingPayouts = payouts.filter((p) => p.status === 'pending' || p.status === 'approved');
  const totalLiability = affiliates.reduce((sum, a) => sum + Number(a.availableBalanceKes || 0), 0);
  const totalPaid = affiliates.reduce((sum, a) => sum + Number(a.paidOutKes || 0), 0);

  return (
    <div className="space-y-6">
      <SettingsSectionHeader
        title="Affiliates & M-Pesa Payouts"
        description="Manage recurring partner commission rates and review M-Pesa withdrawal requests."
        meta={
          <>
            <span>{affiliates.length} partners</span>
            <span aria-hidden="true">·</span>
            <span>{commissions.length} commissions</span>
          </>
        }
        actions={
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Hairline Summary Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Active Partners</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {affiliates.length}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Open Payouts</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
            {pendingPayouts.length}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Unpaid Balances</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            KES {totalLiability.toLocaleString()}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Total Paid Out</div>
          <div className="text-xl font-semibold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            KES {totalPaid.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Pending Payouts Queue */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>M-Pesa Payout Requests</span>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {payouts.length} total
          </span>
        </div>

        {payouts.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
            No M-Pesa payout requests yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Partner</th>
                  <th className="py-2.5 px-4 font-medium">M-Pesa Phone</th>
                  <th className="py-2.5 px-4 font-medium text-right">Amount</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium">Notes &amp; M-Pesa Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                      {p.affiliateName}{' '}
                      <span className="text-slate-400 dark:text-slate-500 font-mono">· {p.affiliateCode}</span>
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      {p.mpesaPhone}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      KES {Number(p.amountKes).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-medium capitalize">
                      <span
                        className={
                          p.status === 'paid'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : p.status === 'approved'
                            ? 'text-blue-600 dark:text-blue-400'
                            : p.status === 'rejected'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      {p.status === 'pending' || p.status === 'approved' ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            placeholder="Admin note (optional)"
                            value={noteInputs[p.id] ?? p.notes ?? ''}
                            onChange={(e) =>
                              setNoteInputs((prev) => ({ ...prev, [p.id]: e.target.value }))
                            }
                            className="px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-md w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="M-Pesa Code (e.g. SLK8...)"
                            value={receiptInputs[p.id] || ''}
                            onChange={(e) =>
                              setReceiptInputs((prev) => ({ ...prev, [p.id]: e.target.value.toUpperCase() }))
                            }
                            className="px-2.5 py-1 text-xs font-mono border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-md w-36 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {p.status === 'pending' && (
                            <button
                              type="button"
                              disabled={busyId === p.id}
                              onClick={() => handleReviewPayout(p.id, 'approved')}
                              className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                            >
                              {busyId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              <span>Approve</span>
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => handleReviewPayout(p.id, 'paid')}
                            className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                          >
                            {busyId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            <span>Mark Paid</span>
                          </button>
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => handleReviewPayout(p.id, 'rejected')}
                            className="px-2.5 py-1 rounded-md border border-rose-200 dark:border-rose-800/70 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium text-xs inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="font-mono text-slate-600 dark:text-slate-300">
                            {p.mpesaReceiptNumber || '—'}
                          </div>
                          {p.notes && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{p.notes}</div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Partners Directory */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Registered Affiliates</span>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {affiliates.length} affiliates · {commissions.length} commissions
          </span>
        </div>

        {affiliates.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
            No affiliates enrolled yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Partner</th>
                  <th className="py-2.5 px-4 font-medium">Code</th>
                  <th className="py-2.5 px-4 font-medium">Rate</th>
                  <th className="py-2.5 px-4 font-medium text-right">Earned</th>
                  <th className="py-2.5 px-4 font-medium text-right">Available</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {affiliates.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{a.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {a.email} · {a.accountType === 'owner' ? 'Store Owner' : 'Public Partner'}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {a.code}
                    </td>
                    <td className="py-2.5 px-4">
                      <select
                        value={String(a.commissionRate || 0.2)}
                        disabled={busyId === a.id}
                        onChange={(e) => handleToggleRate(a, Number(e.target.value))}
                        className="px-2 py-1 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="0.1">10%</option>
                        <option value="0.15">15%</option>
                        <option value="0.2">20%</option>
                        <option value="0.25">25%</option>
                        <option value="0.3">30%</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      KES {Number(a.totalEarnedKes || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      KES {Number(a.availableBalanceKes || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4">
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={() => handleToggleStatus(a)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap transition ${
                          a.status === 'active'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-950/60'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-950/60'
                        }`}
                      >
                        {a.status === 'active' ? 'Active' : 'Suspended'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
