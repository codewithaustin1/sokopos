import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  X,
} from 'lucide-react';
import { usePos } from '../../context/PosContext';
import { verifyServerPayment } from '../../lib/paymentService';
import { auth } from '../../lib/firebase';
import { formatTierDisplayName, normalizePlanTier } from '../../utils/subscriptionEntitlements';

export const PendingSubscriptionBanner: React.FC = () => {
  const {
    currentUser,
    currentBusiness,
    pendingSubscriptionCheckout,
    clearPendingSubscription,
    livePaymentRecordSnapshot,
    setIsSubscriptionModalOpen,
    isSubscriptionModalOpen,
    activateBusinessSubscription,
    showToast,
  } = usePos();

  const [isChecking, setIsChecking] = useState(false);

  if (
    !currentUser ||
    !pendingSubscriptionCheckout ||
    isSubscriptionModalOpen ||
    (currentBusiness?.id && pendingSubscriptionCheckout.businessId !== currentBusiness.id)
  ) {
    return null;
  }

  const subRef = pendingSubscriptionCheckout.reference;
  const subMatchesBiz =
    currentBusiness?.subscription?.lastPaymentReference === subRef &&
    currentBusiness?.subscription?.status === 'active';
  const liveStatus = livePaymentRecordSnapshot?.status;

  const isConfirmed = liveStatus === 'success' || subMatchesBiz;
  const isFailed = !isConfirmed && (liveStatus === 'failed' || liveStatus === 'abandoned');
  const receiptCode =
    livePaymentRecordSnapshot?.mpesaReceiptNumber ||
    currentBusiness?.subscription?.lastMpesaReceipt ||
    currentBusiness?.subscription?.mpesaReceiptNumber ||
    '';
  const planName = formatTierDisplayName(
    normalizePlanTier(
      livePaymentRecordSnapshot?.planId || pendingSubscriptionCheckout.planId
    )
  );

  const handleQuickVerify = async () => {
    setIsChecking(true);
    try {
      const idToken = await auth.currentUser?.getIdToken().catch(() => undefined);
      const res = await verifyServerPayment(subRef, idToken);
      if (res.verified && res.status === 'success') {
        await activateBusinessSubscription(
          res.businessId || pendingSubscriptionCheckout.businessId,
          normalizePlanTier(res.planId || pendingSubscriptionCheckout.planId) as any,
          res.reference || subRef
        );
        setIsSubscriptionModalOpen(true);
      } else if (res.status === 'failed' || res.status === 'abandoned') {
        showToast(res.error || res.gatewayResponse || 'Payment was not completed.', 'error');
      } else {
        showToast('Still awaiting M-Pesa PIN confirmation on your phone.', 'info');
      }
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div
      id="pending-subscription-banner"
      role="status"
      aria-live="polite"
      className={`px-4 py-2 text-xs border-b shrink-0 z-20 flex flex-wrap items-center justify-between gap-2 ${
        isConfirmed
          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-100'
          : isFailed
          ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/70 text-rose-900 dark:text-rose-100'
          : 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/70 text-amber-950 dark:text-amber-100'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {isConfirmed ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        ) : isFailed ? (
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
        ) : (
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        )}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
          <span className="font-semibold">
            {isConfirmed
              ? 'Payment Verified'
              : isFailed
              ? 'Payment Failed'
              : 'Awaiting Payment Verification'}
          </span>
          <span aria-hidden="true" className="opacity-40">·</span>
          <span>
            {planName} ({pendingSubscriptionCheckout.billingCycle === 'annual' ? 'Annual' : 'Monthly'})
          </span>
          <span aria-hidden="true" className="opacity-40">·</span>
          <span className="font-mono tabular-nums font-medium">
            KES {Number(pendingSubscriptionCheckout.amountKes || 0).toLocaleString()}
          </span>
          <span aria-hidden="true" className="opacity-40">·</span>
          <span className="font-mono tabular-nums text-[11px] opacity-80 truncate max-w-[200px]">
            {receiptCode ? `Receipt ${receiptCode}` : subRef}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!isConfirmed && !isFailed && (
          <button
            type="button"
            id="btn-banner-recheck-payment"
            onClick={handleQuickVerify}
            disabled={isChecking}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100/70 dark:hover:bg-amber-900/40 font-semibold transition cursor-pointer disabled:opacity-60 whitespace-nowrap"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking...' : 'Check Now'}</span>
          </button>
        )}

        <button
          type="button"
          id="btn-banner-resume-payment"
          onClick={() => setIsSubscriptionModalOpen(true)}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition cursor-pointer whitespace-nowrap ${
            isConfirmed
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : isFailed
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : 'bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white'
          }`}
        >
          <span>{isConfirmed ? 'View Receipt' : isFailed ? 'Retry' : 'Resume Status'}</span>
          <ArrowRight className="w-3 h-3" />
        </button>

        <button
          type="button"
          id="btn-banner-dismiss-payment"
          onClick={clearPendingSubscription}
          aria-label="Dismiss payment notice"
          className="p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
