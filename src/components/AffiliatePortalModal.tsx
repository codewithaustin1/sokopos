import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Copy,
  Check,
  Wallet,
  ArrowUpRight,
  RefreshCw,
  Loader2,
  Phone,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Share2,
  History,
  FileText,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import {
  enrollAffiliate,
  fetchAffiliateDashboard,
  requestAffiliatePayout,
} from '../lib/affiliateService';
import { AffiliateCommission, AffiliatePayout, AffiliateProfile } from '../types';
import { auth } from '../lib/firebase';

interface AffiliatePortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestAuth?: (targetTab?: 'owner' | 'partner' | 'staff' | 'register') => void;
  onSwitchToPos?: () => void;
  onOpenStoreRegistration?: () => void;
}

export const AffiliatePortalModal: React.FC<AffiliatePortalModalProps> = ({
  isOpen,
  onClose,
  onRequestAuth,
  onSwitchToPos,
  onOpenStoreRegistration,
}) => {
  const { currentUser, currentBusiness, currentLocation, showToast } = usePos();

  const uid = auth.currentUser?.uid || currentUser?.id || '';
  const email = auth.currentUser?.email || currentUser?.email || currentBusiness?.ownerEmail || '';
  const defaultName = auth.currentUser?.displayName || currentUser?.name || currentBusiness?.ownerName || '';
  const isOwner = Boolean(currentBusiness?.id && currentUser?.role === 'business_owner');

  const [isLoading, setIsLoading] = useState(false);
  const [affiliate, setAffiliate] = useState<AffiliateProfile | null>(null);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Enrollment form
  const [enrollName, setEnrollName] = useState(defaultName);
  const [enrollPhone, setEnrollPhone] = useState(currentLocation?.phone || '07');
  const [preferredCode, setPreferredCode] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Dashboard state
  const [copied, setCopied] = useState(false);
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<'all' | 'pending' | 'approved' | 'paid' | 'rejected'>('all');
  const [commissionFilter, setCommissionFilter] = useState<'all' | 'initial' | 'renewal'>('all');

  // Payout request form
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutPhone, setPayoutPhone] = useState('');
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!uid && !email) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAffiliateDashboard(uid, email);
      setAffiliate(data.affiliate);
      setCommissions(data.commissions || []);
      setPayouts(data.payouts || []);
      if (data.affiliate?.mpesaPhone) {
        setPayoutPhone(data.affiliate.mpesaPhone);
      }
      if (data.affiliate?.availableBalanceKes && data.affiliate.availableBalanceKes >= 500) {
        setPayoutAmount(String(data.affiliate.availableBalanceKes));
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Unable to load partner dashboard.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  }, [uid, email]);

  useEffect(() => {
    if (isOpen && (uid || email)) {
      loadDashboard();
    }
  }, [isOpen, uid, email, loadDashboard]);

  useEffect(() => {
    if (defaultName && !enrollName) setEnrollName(defaultName);
  }, [defaultName, enrollName]);

  if (!isOpen) return null;

  const referralUrl =
    affiliate?.code && typeof window !== 'undefined'
      ? `${window.location.origin}/?ref=${encodeURIComponent(affiliate.code)}`
      : '';

  const handleCopyLink = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      showToast('Referral link copied to clipboard.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Copy failed. Please copy the link manually.', 'error');
    }
  };

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !email) {
      onRequestAuth?.();
      return;
    }
    if (enrollPhone.replace(/\D/g, '').length < 9) {
      setError('Enter a valid Safaricom M-Pesa phone number for commission payouts.');
      return;
    }

    setIsEnrolling(true);
    setError(null);

    try {
      const res = await enrollAffiliate({
        uid,
        email,
        name: enrollName.trim() || email.split('@')[0],
        mpesaPhone: enrollPhone.trim(),
        accountType: isOwner ? 'owner' : 'public_partner',
        preferredCode: preferredCode.trim() || undefined,
      });
      setIsEnrolling(false);

      if (!res.success || !res.affiliate) {
        const errStr = res.error || 'Could not activate partner account.';
        setError(errStr);
        return;
      }

      setAffiliate(res.affiliate);
      setPayoutPhone(res.affiliate.mpesaPhone);
      showToast(`Partner code ${res.affiliate.code} activated!`, 'success');
    } catch (enrollErr: any) {
      setIsEnrolling(false);
      const errMsg = enrollErr?.message || 'Enrollment network error.';
      setError(errMsg);
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !affiliate) return;

    const amount = Math.round(Number(payoutAmount));
    if (!Number.isFinite(amount) || amount < 500) {
      setError('Minimum M-Pesa payout is KES 500.');
      return;
    }
    if (amount > affiliate.availableBalanceKes) {
      setError(`Amount exceeds your available balance (KES ${affiliate.availableBalanceKes.toLocaleString()}).`);
      return;
    }

    setIsRequestingPayout(true);
    setError(null);
    const res = await requestAffiliatePayout({
      uid,
      amountKes: amount,
      mpesaPhone: payoutPhone || affiliate.mpesaPhone,
    });
    setIsRequestingPayout(false);

    if (!res.success) {
      setError(res.error || 'Failed to submit payout request.');
      return;
    }

    showToast(`M-Pesa payout request of KES ${amount.toLocaleString()} submitted for approval.`, 'success');
    setPayoutAmount('');
    loadDashboard();
  };

  const filteredCommissions = commissions.filter((c) => {
    if (commissionFilter === 'initial') return !c.isRenewal;
    if (commissionFilter === 'renewal') return c.isRenewal;
    return true;
  });

  const filteredPayouts = payouts.filter((p) => {
    if (payoutStatusFilter === 'all') return true;
    return p.status === payoutStatusFilter;
  });

  return (
    <div
      id="affiliate-portal-modal"
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-sm text-slate-900"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl w-full max-w-4xl border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0 bg-white">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
              SokoPoS Partner & Affiliate Program
            </h2>
            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span>{affiliate ? `${Math.round((affiliate.commissionRate || 0.2) * 100)}% recurring commission` : '20% recurring commission'}</span>
              <span aria-hidden="true">·</span>
              <span>Every subscription & renewal</span>
              <span aria-hidden="true">·</span>
              <span>M-Pesa payouts</span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {affiliate && (
              <button
                type="button"
                onClick={loadDashboard}
                disabled={isLoading}
                className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                title="Refresh stats"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
          {!uid ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
                <Share2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">Sign in to Access Your Partner Link</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Both SokoPoS store owners and public partners can earn 20% recurring commission on every referred store's monthly and annual renewals.
                </p>
              </div>
              <button
                type="button"
                id="partner-auth-cta-btn"
                onClick={() => {
                  onClose();
                  onRequestAuth?.('partner');
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs transition cursor-pointer shadow-xs"
              >
                Sign In or Register as Partner
              </button>
            </div>
          ) : isLoading && !affiliate ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs font-medium">Loading your partner ledger...</span>
            </div>
          ) : !affiliate ? (
            /* Enrollment View */
            <form onSubmit={handleEnroll} className="bg-white border border-slate-200 rounded-xl p-6 max-w-xl mx-auto space-y-5">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Activate Your Partner Account</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Get a unique referral link and earn <strong className="text-emerald-700">20% recurring commission</strong> every time a store you refer pays or renews their SokoPoS plan.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name / Partner Name</label>
                  <input
                    type="text"
                    required
                    value={enrollName}
                    onChange={(e) => setEnrollName(e.target.value)}
                    placeholder="e.g. Wanjiku Kamau"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">M-Pesa Payout Number</label>
                  <input
                    type="tel"
                    required
                    value={enrollPhone}
                    onChange={(e) => setEnrollPhone(e.target.value)}
                    placeholder="e.g. 0712 345 678"
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preferred Code Prefix <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={preferredCode}
                  onChange={(e) => setPreferredCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="e.g. NAIROBI"
                  className="w-full px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isEnrolling}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
              >
                {isEnrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{isEnrolling ? 'Activating...' : 'Generate My Referral Link'}</span>
              </button>
            </form>
          ) : (
            /* Partner Dashboard View */
            <>
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Account Role Status & Store POS Switcher */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isOwner || affiliate.hasBusiness || affiliate.accountType === 'hybrid'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {isOwner || affiliate.hasBusiness || affiliate.accountType === 'hybrid' ? 'HYB' : 'PRT'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {isOwner || affiliate.hasBusiness || affiliate.accountType === 'hybrid'
                          ? 'Store Owner & SokoPoS Partner'
                          : 'Public SokoPoS Partner'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isOwner || affiliate.hasBusiness || affiliate.accountType === 'hybrid'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isOwner || affiliate.hasBusiness || affiliate.accountType === 'hybrid'
                          ? 'Hybrid Account'
                          : 'Partner Only'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isOwner || affiliate.hasBusiness || affiliate.accountType === 'hybrid'
                        ? `Linked Retail Store: ${currentBusiness?.name || affiliate.businessName || 'Active Shop'}`
                        : 'Partner account active · Add a physical store anytime to operate in-store POS.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {(isOwner || affiliate.hasBusiness || affiliate.accountType === 'hybrid') && onSwitchToPos && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSwitchToPos();
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Switch to Store POS</span>
                    </button>
                  )}
                  {!isOwner && !affiliate.hasBusiness && affiliate.accountType !== 'hybrid' && onOpenStoreRegistration && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenStoreRegistration();
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span>+ Open Retail Shop</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Shareable Referral Link */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-700">
                    Your Referral Link · Code <span className="font-mono font-bold text-slate-900">{affiliate.code}</span>
                  </div>
                  <div className="text-xs font-mono text-slate-500 truncate mt-0.5">{referralUrl}</div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0 transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>

              {/* 4 KPI Summary Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500">Referred Stores</div>
                  <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                    {affiliate.referralCount || 0}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500">Active Paid Stores</div>
                  <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                    {affiliate.activeStoreCount || 0}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500">Available Balance</div>
                  <div className="text-xl font-bold text-emerald-700 font-mono tabular-nums mt-1">
                    KES {Number(affiliate.availableBalanceKes || 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500">Total Paid Out</div>
                  <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                    KES {Number(affiliate.paidOutKes || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* M-Pesa Payout Request Bar */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                    <span>Request M-Pesa Commission Payout</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Minimum threshold: <strong className="text-slate-800 font-mono">KES 500</strong>
                  </div>
                </div>

                <form onSubmit={handleRequestPayout} className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Withdraw Amount (KES)</label>
                      <button
                        type="button"
                        onClick={() => setPayoutAmount(String(affiliate.availableBalanceKes || 0))}
                        className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                      >
                        Max (KES {Number(affiliate.availableBalanceKes || 0).toLocaleString()})
                      </button>
                    </div>
                    <input
                      type="number"
                      min={500}
                      max={Math.max(500, affiliate.availableBalanceKes || 0)}
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      placeholder="e.g. 1500"
                      className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">M-Pesa Phone Number</label>
                    <input
                      type="tel"
                      required
                      value={payoutPhone}
                      onChange={(e) => setPayoutPhone(e.target.value)}
                      placeholder="07XXXXXXXX"
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isRequestingPayout || (affiliate.availableBalanceKes || 0) < 500}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                  >
                    {isRequestingPayout ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}
                    <span>Request Payout</span>
                  </button>
                </form>

                {(affiliate.availableBalanceKes || 0) < 500 && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                    Your available balance (KES {Number(affiliate.availableBalanceKes || 0).toLocaleString()}) is below the KES 500 minimum threshold. Share your referral link to earn more commissions!
                  </p>
                )}
              </div>

              {/* Payout History Section */}
              <div id="affiliate-payout-history" className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-bold text-slate-900">
                      Payout History ({payouts.length})
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    {(['all', 'pending', 'approved', 'paid', 'rejected'] as const).map((statusKey) => (
                      <button
                        key={statusKey}
                        type="button"
                        onClick={() => setPayoutStatusFilter(statusKey)}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-md capitalize transition cursor-pointer ${
                          payoutStatusFilter === statusKey ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        {statusKey === 'all' ? 'All' : statusKey}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredPayouts.length === 0 ? (
                  <div className="py-10 px-4 text-center text-xs text-slate-500">
                    {payouts.length === 0
                      ? 'No payout requests yet. Once your available balance reaches KES 500, you can request an M-Pesa withdrawal above.'
                      : `No ${payoutStatusFilter} payout requests found.`}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">Date</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Amount</th>
                          <th className="py-2.5 px-4 font-semibold">M-Pesa Number</th>
                          <th className="py-2.5 px-4 font-semibold">Status</th>
                          <th className="py-2.5 px-4 font-semibold">Super Admin Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPayouts.map((p) => {
                          const statusBadge =
                            p.status === 'paid'
                              ? {
                                  label: 'Paid',
                                  classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                  icon: <Check className="w-3 h-3" />,
                                }
                              : p.status === 'approved'
                              ? {
                                  label: 'Approved',
                                  classes: 'bg-blue-50 text-blue-700 border-blue-200',
                                  icon: <CheckCircle2 className="w-3 h-3" />,
                                }
                              : p.status === 'rejected'
                              ? {
                                  label: 'Rejected',
                                  classes: 'bg-red-50 text-red-700 border-red-200',
                                  icon: <XCircle className="w-3 h-3" />,
                                }
                              : {
                                  label: 'Pending',
                                  classes: 'bg-amber-50 text-amber-700 border-amber-200',
                                  icon: <Clock className="w-3 h-3" />,
                                };

                          return (
                            <tr key={p.id} className="hover:bg-slate-50/70 align-top">
                              <td className="py-3 px-4 text-slate-600 font-mono tabular-nums whitespace-nowrap">
                                <div>{new Date(p.requestedAt).toLocaleDateString()}</div>
                                <div className="text-[10px] text-slate-400">
                                  {new Date(p.requestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                                KES {Number(p.amountKes).toLocaleString()}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                                {p.mpesaPhone || '—'}
                              </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadge.classes}`}
                                >
                                  {statusBadge.icon}
                                  <span>{statusBadge.label}</span>
                                </span>
                                {p.reviewedAt && (
                                  <div className="text-[10px] text-slate-400 font-mono mt-1">
                                    Updated {new Date(p.reviewedAt).toLocaleDateString()}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-slate-600 max-w-xs">
                                {p.notes ? (
                                  <p className="text-xs text-slate-700 leading-relaxed">{p.notes}</p>
                                ) : (
                                  <span className="text-slate-400 italic">
                                    {p.status === 'pending'
                                      ? 'Awaiting Super Admin review'
                                      : p.status === 'approved'
                                      ? 'Approved for M-Pesa disbursement'
                                      : 'No notes provided'}
                                  </span>
                                )}
                                {p.mpesaReceiptNumber && (
                                  <div className="mt-1 text-[11px] font-mono text-emerald-700">
                                    M-Pesa Ref: {p.mpesaReceiptNumber}
                                  </div>
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

              {/* Commissions Ledger Section */}
              <div id="affiliate-commissions-ledger" className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-600" />
                    <h3 className="text-xs font-bold text-slate-900">
                      Commissions Ledger ({commissions.length})
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                    {(['all', 'initial', 'renewal'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setCommissionFilter(f)}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-md capitalize transition cursor-pointer ${
                          commissionFilter === f ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        {f === 'all' ? 'All' : f === 'initial' ? 'First Payment' : 'Renewals'}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredCommissions.length === 0 ? (
                  <div className="py-10 px-4 text-center text-xs text-slate-500">
                    No commissions recorded yet. Share your referral link to start earning 20% recurring commissions.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">Date</th>
                          <th className="py-2.5 px-4 font-semibold">Store</th>
                          <th className="py-2.5 px-4 font-semibold">Type</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Subscription</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Commission</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCommissions.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-4 text-slate-500 font-mono tabular-nums">
                              {new Date(c.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-2.5 px-4 font-medium text-slate-900">
                              {c.businessName} <span className="text-slate-400">· {c.planId}</span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-600">
                              {c.isRenewal ? 'Renewal' : 'Initial Activation'}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600">
                              KES {Number(c.grossAmountKes).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-emerald-700">
                              +KES {Number(c.commissionAmountKes).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
