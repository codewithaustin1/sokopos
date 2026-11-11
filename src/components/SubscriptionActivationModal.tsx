import React, { useState } from 'react';
import {
  Check,
  Zap,
  ShieldCheck,
  AlertCircle,
  Store,
  Phone,
  ArrowRight,
  Clock,
  Sparkles,
  Loader2,
  X,
  Lock,
  Tag,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { DEFAULT_PRICING_TIERS } from '../types/pricing';
import {
  initiateServerPayment,
  verifyServerPayment,
  ClientPaymentChannel,
} from '../lib/paymentService';

interface SubscriptionActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SubscriptionActivationModal: React.FC<SubscriptionActivationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const {
    currentBusiness,
    updateBusinessPlan,
    activateBusinessSubscription,
    currentUser,
    isSuperAdmin,
    currentLocation,
  } = usePos();

  const [selectedPlanId, setSelectedPlanId] = useState<'free' | 'starter' | 'business' | 'premium'>(() => {
    const curr = currentBusiness?.plan;
    if (curr === 'starter') return 'starter';
    if (curr === 'business' || curr === 'professional') return 'business';
    if (curr === 'premium' || curr === 'enterprise') return 'premium';
    return 'business';
  });

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [paymentChannel, setPaymentChannel] = useState<ClientPaymentChannel>('mpesa_stk');
  const [phoneNumber, setPhoneNumber] = useState(() => currentLocation?.phone || '0740463021');
  const [payerEmail, setPayerEmail] = useState(() => currentUser?.email || currentBusiness?.ownerEmail || '');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'select' | 'pending' | 'success'>('select');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [cardAuthUrl, setCardAuthUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  if (!isOpen) return null;

  const selectedTier = DEFAULT_PRICING_TIERS.find((t) => t.id === selectedPlanId) || DEFAULT_PRICING_TIERS[2];
  const isFree = selectedPlanId === 'free';

  const payableAmount = isFree
    ? 1999
    : billingCycle === 'annual'
    ? selectedTier.annualPrice
    : selectedTier.monthlyPrice;

  const durationDays = isFree ? 3650 : billingCycle === 'annual' ? 365 : 30;
  const durationLabel = isFree ? 'Lifetime Free Software' : billingCycle === 'annual' ? '365 Days (1 Year)' : '30 Days';

  const completeActivation = async (verifiedRef: string) => {
    if (activateBusinessSubscription) {
      await activateBusinessSubscription(
        currentBusiness?.id || 'biz-default',
        selectedPlanId as any,
        paymentChannel === 'mpesa_stk' ? phoneNumber : payerEmail
      );
    } else {
      await updateBusinessPlan(currentBusiness?.id || 'biz-default', selectedPlanId as any);
    }
    setPaymentRef(verifiedRef);
    setPaymentStep('success');

    setTimeout(() => {
      setIsProcessingPayment(false);
      setPaymentStep('select');
      setCardAuthUrl(null);
      onClose();
      onSuccess?.();
    }, 1600);
  };

  const pollUntilVerified = async (ref: string) => {
    const maxAttempts = 40; // ~120s at 3s intervals
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const check = await verifyServerPayment(ref);
      if (check.verified && check.status === 'success') {
        await completeActivation(check.reference || ref);
        return;
      }
      if (check.status === 'failed' || check.status === 'abandoned') {
        setPaymentError(check.error || check.gatewayResponse || 'Payment was declined or cancelled.');
        setIsProcessingPayment(false);
        setPaymentStep('select');
        return;
      }
    }
    setStatusMessage('Still awaiting confirmation. Click "Verify Payment Status" once completed.');
  };

  const handleManualVerify = async () => {
    if (!paymentRef) return;
    setIsCheckingStatus(true);
    setPaymentError(null);
    try {
      const check = await verifyServerPayment(paymentRef);
      if (check.verified && check.status === 'success') {
        await completeActivation(check.reference || paymentRef);
      } else if (check.status === 'failed' || check.status === 'abandoned') {
        setPaymentError(check.error || check.gatewayResponse || 'Payment was not completed.');
        setIsProcessingPayment(false);
        setPaymentStep('select');
      } else {
        setStatusMessage('Payment is still pending authorization. Please complete it and retry.');
      }
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleStartPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    setCardAuthUrl(null);

    if (paymentChannel === 'mpesa_stk' && phoneNumber.replace(/\D/g, '').length < 9) {
      setPaymentError('Please enter a valid Safaricom M-Pesa phone number.');
      return;
    }
    if (paymentChannel === 'card' && (!payerEmail.trim() || !payerEmail.includes('@'))) {
      setPaymentError('Please enter a valid email address for card receipt & 3DS verification.');
      return;
    }

    setIsProcessingPayment(true);
    setPaymentStep('pending');
    setStatusMessage(
      paymentChannel === 'mpesa_stk'
        ? `Sending M-Pesa STK Push to ${phoneNumber}...`
        : 'Initializing secure Paystack Card checkout...'
    );

    try {
      const initRes = await initiateServerPayment({
        flowType: 'subscription',
        channel: paymentChannel,
        amountKes: payableAmount,
        phone: paymentChannel === 'mpesa_stk' ? phoneNumber : undefined,
        email: payerEmail || currentBusiness?.ownerEmail || 'billing@sokopos.co.ke',
        businessId: currentBusiness?.id,
        planId: selectedPlanId,
        metadata: {
          billingCycle,
          durationDays,
          businessName: currentBusiness?.name,
        },
      });

      if (!initRes.success || !initRes.reference) {
        setPaymentError(initRes.error || 'Could not initiate Paystack payment.');
        setIsProcessingPayment(false);
        setPaymentStep('select');
        return;
      }

      setPaymentRef(initRes.reference);

      if (initRes.status === 'success') {
        await completeActivation(initRes.reference);
        return;
      }

      if (paymentChannel === 'card' && initRes.authorizationUrl) {
        setCardAuthUrl(initRes.authorizationUrl);
        setStatusMessage('Complete your card payment in the Paystack checkout tab, then click Verify below.');
      } else {
        setStatusMessage(
          initRes.displayText ||
            `M-Pesa STK prompt sent to ${phoneNumber}. Enter your M-Pesa PIN to authorize Ksh ${payableAmount.toLocaleString()}.`
        );
      }

      pollUntilVerified(initRes.reference);
    } catch (err: any) {
      console.error('Subscription payment error:', err);
      setPaymentError(err?.message || 'Unexpected payment error.');
      setIsProcessingPayment(false);
      setPaymentStep('select');
    }
  };

  return (
    <div
      id="subscription-activation-modal"
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fade-in text-slate-800"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-500/30">
              <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Activate {currentBusiness?.name || 'Store'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950 tracking-wider">
                  Required to Ring Sales
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Setup is complete! Select a package to tender live sales, print KRA receipts, and sync registers.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            title="Dismiss (Sales tendering will remain locked)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {paymentStep === 'pending' ? (
            <div className="py-10 px-4 text-center space-y-4">
              <div className="relative inline-flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center">
                  {paymentChannel === 'card' ? (
                    <CreditCard className="w-8 h-8 text-blue-600" />
                  ) : (
                    <Phone className="w-8 h-8 text-emerald-600" />
                  )}
                </div>
                <div className="absolute -top-1 -right-1">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-black text-slate-900">
                  {paymentChannel === 'card' ? 'Complete Card Checkout' : 'Awaiting M-Pesa PIN Authorization'}
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  {statusMessage}
                </p>
                {paymentRef && (
                  <p className="text-[11px] font-mono text-slate-500">
                    Reference: <span className="font-bold text-slate-800">{paymentRef}</span>
                  </p>
                )}
              </div>

              {cardAuthUrl && (
                <div className="pt-1">
                  <a
                    href={cardAuthUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition"
                  >
                    <span>Open Paystack Card Checkout</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {paymentError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium max-w-md mx-auto">
                  {paymentError}
                </div>
              )}

              <div className="flex items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleManualVerify}
                  disabled={isCheckingStatus}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                  <span>{isCheckingStatus ? 'Verifying...' : 'Verify Payment Status'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsProcessingPayment(false);
                    setPaymentStep('select');
                    setCardAuthUrl(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : paymentStep === 'success' ? (
            <div className="py-12 px-4 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">
                  Payment Verified & Store Activated!
                </h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Reference: <span className="font-mono font-bold text-slate-800">{paymentRef}</span>. Active for{' '}
                  <strong className="text-emerald-700">{durationLabel}</strong>.
                </p>
              </div>

              <div className="text-xs font-bold text-emerald-700">
                Opening POS checkout register...
              </div>
            </div>
          ) : (
            <form onSubmit={handleStartPayment} className="space-y-5">
              {/* Context Notice */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <strong>Option 2 Live Sales Safeguard:</strong> SokoPoS allows free store registration and product setup. To prevent orphan entries and tender live cash/M-Pesa customer receipts, choose your store package below.
                </div>
              </div>

              {/* Package Tier Selection Cards */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Select Your Store Package
                  </label>
                  {!isFree && (
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px]">
                      <button
                        type="button"
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                          billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                        }`}
                      >
                        Monthly (30 Days)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle('annual')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                          billingCycle === 'annual' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500'
                        }`}
                      >
                        <span>Annual (365 Days)</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black px-1 rounded">Save 17%</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DEFAULT_PRICING_TIERS.map((tier) => {
                    const isSelected = selectedPlanId === tier.id;
                    const tierIsFree = tier.id === 'free';
                    const price = tierIsFree
                      ? 'Ksh 0/mo'
                      : billingCycle === 'annual'
                      ? `Ksh ${tier.annualPrice.toLocaleString()}/yr`
                      : `Ksh ${tier.monthlyPrice.toLocaleString()}/mo`;

                    return (
                      <div
                        key={tier.id}
                        onClick={() => setSelectedPlanId(tier.id as any)}
                        className={`p-3.5 rounded-2xl border-2 transition cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        {tier.isPopular && (
                          <span className="absolute -top-2.5 right-3 text-[9px] font-black uppercase tracking-wider bg-indigo-600 text-white px-2 py-0.5 rounded-full shadow-xs">
                            Recommended
                          </span>
                        )}
                        {tierIsFree && (
                          <span className="absolute -top-2.5 right-3 text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-full shadow-xs">
                            Ksh 1,999 Setup
                          </span>
                        )}

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-slate-900 text-sm">{tier.name}</span>
                            <span className="font-extrabold text-blue-700 text-xs">{price}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug">{tier.tagline}</p>
                        </div>

                        <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-600 font-medium">
                            {tierIsFree
                              ? '1 Branch • Up to 250 SKUs'
                              : `${tier.maxBranches === -1 ? 'Unlimited' : tier.maxBranches} Branches • ${tier.maxStaffUsers === -1 ? 'Unlimited' : tier.maxStaffUsers} Staff`}
                          </span>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Paystack Payment Form (M-Pesa STK Push or Card) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentChannel('mpesa_stk');
                        setPaymentError(null);
                      }}
                      className={`px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        paymentChannel === 'mpesa_stk'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>M-Pesa STK Push</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentChannel('card');
                        setPaymentError(null);
                      }}
                      className={`px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        paymentChannel === 'card'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Debit / Credit Card</span>
                    </button>
                  </div>

                  <span className="text-[11px] font-semibold text-slate-500">
                    Secured by Paystack KES
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  {paymentChannel === 'mpesa_stk' ? (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        M-Pesa Phone Number
                      </label>
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="e.g. 0740 463 021"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Billing Receipt Email
                      </label>
                      <input
                        type="email"
                        required
                        value={payerEmail}
                        onChange={(e) => setPayerEmail(e.target.value)}
                        placeholder="owner@business.co.ke"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col justify-center">
                    <div className="text-[10px] text-slate-500 font-medium">Activation Amount:</div>
                    <div className="text-base font-black text-slate-900 tabular-nums">
                      Ksh {payableAmount.toLocaleString()}
                      <span className="text-[11px] font-semibold text-slate-500 ml-1">
                        ({durationLabel})
                      </span>
                    </div>
                  </div>
                </div>

                {paymentError && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{paymentError}</span>
                  </div>
                )}
              </div>

              {/* Submit CTA */}
              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-sm transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    Pay Ksh {payableAmount.toLocaleString()} & Activate Store ({durationDays} Days)
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-[10px] text-center text-slate-500 flex items-center justify-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Instant Database Activation · Zero Downtime · Continuous Cloud Sync</span>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
