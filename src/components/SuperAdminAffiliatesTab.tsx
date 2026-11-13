import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Users,
  Wallet,
  Percent,
} from 'lucide-react';
import {
  fetchAdminAffiliateOverview,
  reviewAffiliatePayout,
  updateAffiliateRateOrStatus,
} from '../lib/affiliateService';
import { AffiliateCommission, AffiliatePayout, AffiliateProfile } from '../types';
import { usePos } from '../context/PosContext';

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
      reviewedBy: currentUser?.email || 'Super Admin',
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900">Affiliates & M-Pesa Payout Approvals</h3>
          <p className="text-xs text-slate-500">
            Manage recurring partner commission rates and approve M-Pesa withdrawal requests.
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Active Partners</div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">{affiliates.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Open Payouts</div>
          <div className="text-xl font-bold font-mono tabular-nums text-amber-700 mt-1">{pendingPayouts.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Unpaid Balances</div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            KES {totalLiability.toLocaleString()}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Total Paid Out</div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
            KES {totalPaid.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Pending Payouts Queue */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span>M-Pesa Payout Requests ({payouts.length})</span>
          </div>
        </div>

        {payouts.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">No M-Pesa payout requests yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Partner</th>
                  <th className="py-2.5 px-4 font-semibold">M-Pesa Phone</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Amount</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold">Notes & M-Pesa Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payouts.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {p.affiliateName} <span className="text-slate-400 font-mono">· {p.affiliateCode}</span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700">{p.mpesaPhone}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                      KES {Number(p.amountKes).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-semibold capitalize">
                      <span
                        className={
                          p.status === 'paid'
                            ? 'text-emerald-700'
                            : p.status === 'approved'
                            ? 'text-blue-700'
                            : p.status === 'rejected'
                            ? 'text-red-600'
                            : 'text-amber-700'
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
                            className="px-2.5 py-1 text-[11px] border border-slate-300 rounded-md w-44"
                          />
                          <input
                            type="text"
                            placeholder="M-Pesa Code (e.g. SLK8...)"
                            value={receiptInputs[p.id] || ''}
                            onChange={(e) =>
                              setReceiptInputs((prev) => ({ ...prev, [p.id]: e.target.value.toUpperCase() }))
                            }
                            className="px-2.5 py-1 text-[11px] font-mono border border-slate-300 rounded-md w-36"
                          />
                          {p.status === 'pending' && (
                            <button
                              type="button"
                              disabled={busyId === p.id}
                              onClick={() => handleReviewPayout(p.id, 'approved')}
                              className="px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              {busyId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              <span>Approve</span>
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => handleReviewPayout(p.id, 'paid')}
                            className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {busyId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            <span>Mark Paid</span>
                          </button>
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => handleReviewPayout(p.id, 'rejected')}
                            className="px-2.5 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="font-mono text-slate-600">{p.mpesaReceiptNumber || '—'}</div>
                          {p.notes && <div className="text-[11px] text-slate-500">{p.notes}</div>}
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
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Registered Affiliates ({affiliates.length}) · {commissions.length} Commissions</span>
          </div>
        </div>

        {affiliates.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">No affiliates enrolled yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Partner</th>
                  <th className="py-2.5 px-4 font-semibold">Code</th>
                  <th className="py-2.5 px-4 font-semibold">Rate</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Earned</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Available</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {affiliates.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900">{a.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {a.email} · {a.accountType === 'owner' ? 'Store Owner' : 'Public Partner'}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{a.code}</td>
                    <td className="py-2.5 px-4">
                      <select
                        value={String(a.commissionRate || 0.2)}
                        disabled={busyId === a.id}
                        onChange={(e) => handleToggleRate(a, Number(e.target.value))}
                        className="px-2 py-1 text-[11px] font-mono border border-slate-300 rounded-md bg-white"
                      >
                        <option value="0.1">10%</option>
                        <option value="0.15">15%</option>
                        <option value="0.2">20%</option>
                        <option value="0.25">25%</option>
                        <option value="0.3">30%</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                      KES {Number(a.totalEarnedKes || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-emerald-700">
                      KES {Number(a.availableBalanceKes || 0).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4">
                      <button
                        type="button"
                        disabled={busyId === a.id}
                        onClick={() => handleToggleStatus(a)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                          a.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
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
