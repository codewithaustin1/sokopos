import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Check,
  Zap,
  ShieldCheck,
  AlertCircle,
  Phone,
  ArrowRight,
  Loader2,
  X,
  Lock,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  RefreshCw,
  Copy,
  Printer,
  Receipt,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { DEFAULT_PRICING_TIERS } from '../types/pricing';
import {
  getPaymentGatewayConfig,
  initiateServerPayment,
  pollSubscriptionPaymentStatus,
  validateKenyanMpesaPhone,
  verifyServerPayment,
  ClientPaymentChannel,
  PaymentConfigResponse,
  PendingSubscriptionCheckout,
} from '../lib/paymentService';
import { trackPlatformEvent } from '../lib/telemetryService';
import { auth } from '../lib/firebase';
import { formatTierDisplayName, normalizePlanTier } from '../utils/subscriptionEntitlements';
import { printSubscriptionReceipt } from '../utils/subscriptionReceiptPrint';
import { HardenedKenyanPhoneInput } from './common/HardenedKenyanPhoneInput';

interface SubscriptionActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function formatReadableDate(iso?: string): string {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
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
    ensureBusinessSyncedForCheckout,
    loginWithFirebaseGoogle,
    currentUser,
    currentLocation,
    pricingTiers,
    refreshPricingTiers,
    selectedCheckoutPlan,
    selectedCheckoutBilling,
    openPricingPage,
    pendingSubscriptionCheckout,
    trackPendingSubscription,
    clearPendingSubscription,
    livePaymentRecordSnapshot,
    openBusinessSettings,
  } = usePos();

  useEffect(() => {
    if (isOpen) {
      refreshPricingTiers(false).catch(() => {});
    }
  }, [isOpen, refreshPricingTiers]);

  const [selectedPlanId, setSelectedPlanId] = useState<'free' | 'starter' | 'business' | 'premium'>(
    selectedCheckoutPlan || 'business'
  );
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>(
    selectedCheckoutBilling || 'monthly'
  );

  const [gatewayConfig, setGatewayConfig] = useState<PaymentConfigResponse | null>(null);
  const pollAbortControllerRef = useRef<AbortController | null>(null);

  const [paymentChannel, setPaymentChannel] = useState<ClientPaymentChannel>('mpesa_stk');
  const [phoneNumber, setPhoneNumber] = useState(() => currentLocation?.phone || '');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [payerEmail, setPayerEmail] = useState(() => currentUser?.email || currentBusiness?.ownerEmail || '');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'select' | 'pending' | 'success'>('select');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [mpesaReceiptNumber, setMpesaReceiptNumber] = useState<string>('');
  const [paidAtIso, setPaidAtIso] = useState<string>('');
  const [expiresAtIso, setExpiresAtIso] = useState<string>('');
  const [paidAmountKes, setPaidAmountKes] = useState<number | null>(null);
  const [cardAuthUrl, setCardAuthUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [resumeNotice, setResumeNotice] = useState<string | null>(null);
  const [authRecoveryCode, setAuthRecoveryCode] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  const phoneValidation = validateKenyanMpesaPhone(phoneNumber);

  const activeTierList = pricingTiers && pricingTiers.length > 0 ? pricingTiers : DEFAULT_PRICING_TIERS;
  const selectedTier =
    activeTierList.find((t) => t.id === selectedPlanId) ||
    DEFAULT_PRICING_TIERS.find((t) => t.id === selectedPlanId) ||
    DEFAULT_PRICING_TIERS[2];
  const isFree = selectedPlanId === 'free';

  const payableAmount = isFree
    ? (selectedTier.consultationFee ?? 1999)
    : billingCycle === 'annual'
    ? selectedTier.annualPrice
    : selectedTier.monthlyPrice;

  const durationDays = isFree ? 3650 : billingCycle === 'annual' ? 365 : 30;
  const durationLabel = isFree
    ? 'Lifetime Free Software'
    : billingCycle === 'annual'
    ? '365 Days (1 Year)'
    : '30 Days';

  const completeActivation = useCallback(
    async (
      verifiedRef: string,
      receiptNo?: string,
      options?: {
        planOverride?: 'free' | 'starter' | 'business' | 'premium';
        expiresAtOverride?: string;
        paidAtOverride?: string;
        amountOverride?: number;
      }
    ) => {
      pollAbortControllerRef.current?.abort();
      pollAbortControllerRef.current = null;

      const resolvedPlan = options?.planOverride || selectedPlanId;
      if (receiptNo) {
        setMpesaReceiptNumber(receiptNo);
      }
      if (options?.paidAtOverride) {
        setPaidAtIso(options.paidAtOverride);
      } else {
        setPaidAtIso((prev) => prev || new Date().toISOString());
      }
      if (options?.amountOverride) {
        setPaidAmountKes(options.amountOverride);
      }
      if (options?.expiresAtOverride) {
        setExpiresAtIso(options.expiresAtOverride);
      }

      if (activateBusinessSubscription) {
        await activateBusinessSubscription(
          currentBusiness?.id || 'biz-default',
          resolvedPlan as any,
          verifiedRef
        );
      } else {
        await updateBusinessPlan(currentBusiness?.id || 'biz-default', resolvedPlan as any);
      }

      setPaymentRef(verifiedRef);
      setIsProcessingPayment(false);
      setPaymentError(null);
      setResumeNotice(null);
      setPaymentStep('success');
    },
    [activateBusinessSubscription, updateBusinessPlan, currentBusiness?.id, selectedPlanId]
  );

  const pollUntilVerified = useCallback(
    async (ref: string) => {
      pollAbortControllerRef.current?.abort();
      const controller = new AbortController();
      pollAbortControllerRef.current = controller;

      const finalCheck = await pollSubscriptionPaymentStatus(ref, {
        getIdToken: () => auth.currentUser?.getIdToken().catch(() => undefined) ?? Promise.resolve(undefined),
        intervalMs: 3000,
        maxAttempts: 45,
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      if (finalCheck.verified && finalCheck.status === 'success') {
        await completeActivation(finalCheck.reference || ref, finalCheck.mpesaReceiptNumber, {
          planOverride: normalizePlanTier(finalCheck.planId || selectedPlanId) as any,
          expiresAtOverride: finalCheck.activatedSubscription?.expiresAt,
          paidAtOverride: finalCheck.paidAt,
          amountOverride: finalCheck.amountKes,
        });
        return;
      }
      if (finalCheck.status === 'failed' || finalCheck.status === 'abandoned') {
        clearPendingSubscription();
        setPaymentError(
          finalCheck.error || finalCheck.gatewayResponse || 'Payment was declined or cancelled.'
        );
        setIsProcessingPayment(false);
        setPaymentStep('select');
        return;
      }
      setStatusMessage(
        'Still awaiting M-Pesa PIN confirmation. Click "Verify Payment Status" once you have entered your PIN.'
      );
    },
    [completeActivation, clearPendingSubscription, selectedPlanId]
  );

  // Initialize modal state on open, restoring any active pending/confirmed checkout for this store
  useEffect(() => {
    if (isOpen) {
      setPhoneTouched(false);
      setPaymentError(null);
      setAuthRecoveryCode(null);
      setCopiedReceipt(false);
      if (currentLocation?.phone) {
        setPhoneNumber((prev) => prev || currentLocation.phone || '');
      }
      getPaymentGatewayConfig().then(setGatewayConfig).catch(() => {});
      trackPlatformEvent('subscription_modal_open', {
        businessId: currentBusiness?.id,
        businessName: currentBusiness?.name,
        planId: selectedCheckoutPlan || 'business',
        dedupeKey: `sub-modal-${currentBusiness?.id || 'anon'}`,
        dedupeTtlMs: 30_000,
      });

      const matchingPending =
        pendingSubscriptionCheckout &&
        (!currentBusiness?.id || pendingSubscriptionCheckout.businessId === currentBusiness.id)
          ? pendingSubscriptionCheckout
          : null;

      if (matchingPending) {
        const restoredPlan = normalizePlanTier(matchingPending.planId) as 'free' | 'starter' | 'business' | 'premium';
        const restoredBilling = matchingPending.billingCycle === 'annual' ? 'annual' : 'monthly';
        setSelectedPlanId(restoredPlan);
        setBillingCycle(restoredBilling);
        setPaymentChannel(matchingPending.channel || 'mpesa_stk');
        if (matchingPending.phone) setPhoneNumber(matchingPending.phone);
        if (matchingPending.authorizationUrl) setCardAuthUrl(matchingPending.authorizationUrl);
        setPaymentRef(matchingPending.reference);
        setPaidAmountKes(matchingPending.amountKes);

        const bizConfirmed =
          currentBusiness?.subscription?.lastPaymentReference === matchingPending.reference &&
          currentBusiness?.subscription?.status === 'active';
        const liveConfirmed =
          livePaymentRecordSnapshot?.reference === matchingPending.reference &&
          livePaymentRecordSnapshot.status === 'success';
        const liveFailed =
          livePaymentRecordSnapshot?.reference === matchingPending.reference &&
          (livePaymentRecordSnapshot.status === 'failed' ||
            livePaymentRecordSnapshot.status === 'abandoned');

        if (liveConfirmed || bizConfirmed) {
          const receipt =
            livePaymentRecordSnapshot?.mpesaReceiptNumber ||
            currentBusiness?.subscription?.lastMpesaReceipt ||
            currentBusiness?.subscription?.mpesaReceiptNumber ||
            '';
          if (receipt) setMpesaReceiptNumber(receipt);
          setPaidAtIso(
            livePaymentRecordSnapshot?.paidAt ||
              currentBusiness?.subscription?.activatedAt ||
              new Date().toISOString()
          );
          if (currentBusiness?.subscription?.expiresAt) {
            setExpiresAtIso(currentBusiness.subscription.expiresAt);
          }
          setPaymentStep('success');
          setIsProcessingPayment(false);
        } else if (liveFailed) {
          clearPendingSubscription();
          setPaymentStep('select');
          setIsProcessingPayment(false);
          setPaymentError(
            livePaymentRecordSnapshot?.gatewayResponse ||
              'Your previous checkout attempt was declined or cancelled. You can retry below.'
          );
        } else {
          setResumeNotice(
            `Resumed pending checkout (${matchingPending.reference}) from your active session.`
          );
          setStatusMessage(
            matchingPending.channel === 'card'
              ? 'Waiting for Paystack card confirmation. Complete checkout or click Verify Payment Status.'
              : `M-Pesa prompt was sent${
                  matchingPending.phone ? ` to ${matchingPending.phone}` : ''
                }. Enter your M-Pesa PIN or verify status below.`
          );
          setPaymentStep('pending');
          setIsProcessingPayment(true);
          pollUntilVerified(matchingPending.reference);
        }
      } else {
        setSelectedPlanId(selectedCheckoutPlan || 'business');
        setBillingCycle(selectedCheckoutBilling || 'monthly');
        setPaymentStep('select');
        setPaymentRef('');
        setMpesaReceiptNumber('');
        setCardAuthUrl(null);
        setResumeNotice(null);
        setPaidAtIso('');
        setExpiresAtIso('');
        setPaidAmountKes(null);
        setIsProcessingPayment(false);
      }
    } else {
      pollAbortControllerRef.current?.abort();
      pollAbortControllerRef.current = null;
    }
    return () => {
      pollAbortControllerRef.current?.abort();
      pollAbortControllerRef.current = null;
    };
    // Only re-initialize when modal visibility changes or active store changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentBusiness?.id]);

  // Real-time Firestore reaction while awaiting PIN or viewing confirmation receipt
  useEffect(() => {
    if (!isOpen || !paymentRef) return;

    const bizSub = currentBusiness?.subscription;
    const bizMatchesRef =
      bizSub?.lastPaymentReference === paymentRef && bizSub?.status === 'active';
    const recordMatchesRef = livePaymentRecordSnapshot?.reference === paymentRef;

    const liveReceipt =
      (recordMatchesRef ? livePaymentRecordSnapshot?.mpesaReceiptNumber : '') ||
      (bizMatchesRef ? bizSub?.lastMpesaReceipt || bizSub?.mpesaReceiptNumber : '') ||
      '';

    if (liveReceipt && liveReceipt !== mpesaReceiptNumber) {
      setMpesaReceiptNumber(liveReceipt);
    }
    if (bizMatchesRef && bizSub?.expiresAt && bizSub.expiresAt !== expiresAtIso) {
      setExpiresAtIso(bizSub.expiresAt);
    }

    if (paymentStep === 'pending') {
      if (
        (recordMatchesRef && livePaymentRecordSnapshot?.status === 'success') ||
        bizMatchesRef
      ) {
        completeActivation(paymentRef, liveReceipt || undefined, {
          planOverride: normalizePlanTier(
            livePaymentRecordSnapshot?.planId || bizSub?.planId || selectedPlanId
          ) as any,
          expiresAtOverride: bizSub?.expiresAt,
          paidAtOverride: livePaymentRecordSnapshot?.paidAt || bizSub?.activatedAt,
          amountOverride: livePaymentRecordSnapshot?.amountKes || bizSub?.amountKes,
        });
      } else if (
        recordMatchesRef &&
        (livePaymentRecordSnapshot?.status === 'failed' ||
          livePaymentRecordSnapshot?.status === 'abandoned')
      ) {
        pollAbortControllerRef.current?.abort();
        clearPendingSubscription();
        setPaymentError(
          livePaymentRecordSnapshot.gatewayResponse || 'Payment was declined or cancelled.'
        );
        setIsProcessingPayment(false);
        setPaymentStep('select');
      }
    }
  }, [
    isOpen,
    paymentStep,
    paymentRef,
    livePaymentRecordSnapshot,
    currentBusiness?.subscription,
    mpesaReceiptNumber,
    expiresAtIso,
    selectedPlanId,
    completeActivation,
    clearPendingSubscription,
  ]);

  if (!isOpen) return null;

  const handleCloseModal = () => {
    if (paymentStep === 'success') {
      clearPendingSubscription();
      setPaymentStep('select');
      setPaymentRef('');
      setMpesaReceiptNumber('');
      setCardAuthUrl(null);
    }
    onClose();
  };

  const handleContinueToPos = () => {
    clearPendingSubscription();
    setPaymentStep('select');
    setPaymentRef('');
    setMpesaReceiptNumber('');
    setCardAuthUrl(null);
    setIsProcessingPayment(false);
    onClose();
    onSuccess?.();
  };

  const handleManualVerify = async () => {
    if (!paymentRef) return;
    setIsCheckingStatus(true);
    setPaymentError(null);
    try {
      const idToken = await auth.currentUser?.getIdToken().catch(() => undefined);
      const check = await verifyServerPayment(paymentRef, idToken);
      if (check.verified && check.status === 'success') {
        await completeActivation(check.reference || paymentRef, check.mpesaReceiptNumber, {
          planOverride: normalizePlanTier(check.planId || selectedPlanId) as any,
          expiresAtOverride: check.activatedSubscription?.expiresAt,
          paidAtOverride: check.paidAt,
          amountOverride: check.amountKes,
        });
      } else if (check.status === 'failed' || check.status === 'abandoned') {
        pollAbortControllerRef.current?.abort();
        clearPendingSubscription();
        setPaymentError(check.error || check.gatewayResponse || 'Payment was not completed.');
        setIsProcessingPayment(false);
        setPaymentStep('select');
      } else {
        setStatusMessage(
          'Payment is still pending PIN authorization on your phone. Please complete it and retry.'
        );
      }
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleStartPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessingPayment) return;
    setPaymentError(null);
    setResumeNotice(null);
    setAuthRecoveryCode(null);
    setCardAuthUrl(null);
    setMpesaReceiptNumber('');

    if (paymentChannel === 'mpesa_stk') {
      setPhoneTouched(true);
      if (!phoneValidation.valid) {
        setPaymentError(
          phoneValidation.error ||
            'Enter a valid Kenyan M-Pesa number (07XXXXXXXX, 01XXXXXXXX, or +2547XXXXXXXX).'
        );
        return;
      }
    }
    if (paymentChannel === 'card' && (!payerEmail.trim() || !payerEmail.includes('@'))) {
      setPaymentError('Please enter a valid email address for card receipt & 3DS verification.');
      return;
    }

    const normalizedMpesaPhone =
      paymentChannel === 'mpesa_stk' ? phoneValidation.msisdn : undefined;
    const displayMpesaPhone =
      paymentChannel === 'mpesa_stk' ? phoneValidation.formattedDisplay : phoneNumber;

    pollAbortControllerRef.current?.abort();
    setIsProcessingPayment(true);

    const isDarajaActive =
      paymentChannel === 'mpesa_stk' &&
      gatewayConfig?.subscriptionMpesaProvider === 'daraja';

    try {
      const syncResult = await ensureBusinessSyncedForCheckout();
      if (!syncResult.ok || !syncResult.idToken) {
        setPaymentError(
          syncResult.error || 'Please verify your Business Owner sign-in before initiating checkout.'
        );
        setAuthRecoveryCode(syncResult.code || null);
        setIsProcessingPayment(false);
        return;
      }

      setPaymentStep('pending');
      setStatusMessage(
        paymentChannel === 'mpesa_stk'
          ? isDarajaActive
            ? `Sending Safaricom M-Pesa Express STK prompt to ${displayMpesaPhone}...`
            : `Sending M-Pesa STK Push to ${displayMpesaPhone}...`
          : 'Initializing secure Paystack Card checkout...'
      );

      trackPlatformEvent('subscription_checkout_start', {
        businessId: currentBusiness?.id,
        businessName: currentBusiness?.name,
        planId: selectedPlanId,
        channel: paymentChannel,
        amountKes: payableAmount,
        dedupeKey: `sub-checkout-${currentBusiness?.id || 'anon'}-${selectedPlanId}`,
        dedupeTtlMs: 10_000,
      });

      const initRes = await initiateServerPayment(
        {
          flowType: 'subscription',
          channel: paymentChannel,
          amountKes: payableAmount,
          phone: normalizedMpesaPhone,
          email: payerEmail || currentBusiness?.ownerEmail || 'billing@sokopos.co.ke',
          businessId: currentBusiness?.id,
          planId: selectedPlanId,
          metadata: {
            billingCycle,
            durationDays,
            businessName: currentBusiness?.name,
          },
        },
        syncResult.idToken
      );

      if (!initRes.success || !initRes.reference) {
        // Duplicate pending payment guard: seamlessly resume existing checkout
        if (initRes.code === 'DUPLICATE_PENDING_PAYMENT' && initRes.existingIntent?.reference) {
          const existing = initRes.existingIntent;
          const resumedCheckout: PendingSubscriptionCheckout = {
            reference: existing.reference,
            businessId: currentBusiness?.id || 'biz-default',
            businessName: currentBusiness?.name,
            planId: normalizePlanTier(existing.planId || selectedPlanId) as any,
            billingCycle: existing.billingCycle === 'annual' ? 'annual' : 'monthly',
            amountKes: existing.amountKes || payableAmount,
            provider: existing.provider,
            channel: existing.channel || paymentChannel,
            phone: existing.phone || displayMpesaPhone,
            payerEmail,
            authorizationUrl: existing.authorizationUrl,
            initiatedAt: existing.createdAt || new Date().toISOString(),
          };
          trackPendingSubscription(resumedCheckout);
          setPaymentRef(existing.reference);
          setPaidAmountKes(existing.amountKes || payableAmount);
          if (existing.authorizationUrl) setCardAuthUrl(existing.authorizationUrl);
          setResumeNotice(
            `Active payment (${existing.reference}) already awaiting confirmation. Resumed live tracking to prevent duplicate payment.`
          );
          setStatusMessage(
            existing.channel === 'card'
              ? 'Complete the active Paystack Card checkout or verify payment status below.'
              : `Awaiting M-Pesa PIN authorization${
                  existing.phone ? ` on ${existing.phone}` : ''
                }. Enter your M-Pesa PIN or click Verify Payment Status.`
          );
          pollUntilVerified(existing.reference);
          return;
        }

        setPaymentError(
          initRes.error ||
            (isDarajaActive
              ? 'Could not send Safaricom M-Pesa STK prompt.'
              : 'Could not initiate Paystack payment.')
        );
        if (
          initRes.code === 'TENANT_ACCESS_DENIED' ||
          initRes.code === 'AUTH_REQUIRED' ||
          initRes.code === 'INVALID_SESSION'
        ) {
          setAuthRecoveryCode(initRes.code);
        }
        setIsProcessingPayment(false);
        setPaymentStep('select');
        return;
      }

      const pendingPayload: PendingSubscriptionCheckout = {
        reference: initRes.reference,
        businessId: currentBusiness?.id || 'biz-default',
        businessName: currentBusiness?.name,
        planId: selectedPlanId,
        billingCycle,
        amountKes: payableAmount,
        provider: initRes.provider,
        channel: paymentChannel,
        phone: paymentChannel === 'mpesa_stk' ? normalizedMpesaPhone || phoneNumber : undefined,
        payerEmail,
        authorizationUrl: initRes.authorizationUrl,
        initiatedAt: new Date().toISOString(),
      };
      trackPendingSubscription(pendingPayload);
      setPaymentRef(initRes.reference);
      setPaidAmountKes(payableAmount);

      if (initRes.status === 'success') {
        await completeActivation(initRes.reference);
        return;
      }

      if (initRes.authorizationUrl) {
        setCardAuthUrl(initRes.authorizationUrl);
        setStatusMessage('Redirecting to secure Paystack Checkout...');
        window.location.href = initRes.authorizationUrl;
        return;
      }

      setStatusMessage(
        initRes.displayText ||
          `M-Pesa STK prompt sent to ${displayMpesaPhone}. Enter your M-Pesa PIN to authorize Ksh ${payableAmount.toLocaleString()}.`
      );
      pollUntilVerified(initRes.reference);
    } catch (err: any) {
      console.error('Subscription payment error:', err);
      setPaymentError(err?.message || 'Unexpected payment error.');
      setIsProcessingPayment(false);
      setPaymentStep('select');
    }
  };

  const handleCopyReceiptCode = async () => {
    const code = mpesaReceiptNumber || paymentRef;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedReceipt(true);
      setTimeout(() => setCopiedReceipt(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handlePrintConfirmation = () => {
    printSubscriptionReceipt({
      businessName: currentBusiness?.name || 'Store',
      businessCode: currentBusiness?.code,
      ownerEmail: currentBusiness?.ownerEmail || currentUser?.email,
      planName: `${selectedTier.name} Plan`,
      billingCycle,
      durationLabel,
      amountKes: paidAmountKes ?? payableAmount,
      channel: paymentChannel,
      provider:
        paymentChannel === 'mpesa_stk' && gatewayConfig?.subscriptionMpesaProvider === 'daraja'
          ? 'daraja'
          : 'paystack',
      reference: paymentRef,
      mpesaReceiptNumber: mpesaReceiptNumber || undefined,
      phoneOrEmail: paymentChannel === 'mpesa_stk' ? phoneNumber : payerEmail,
      paidAt: paidAtIso || new Date().toISOString(),
      expiresAt: expiresAtIso || currentBusiness?.subscription?.expiresAt,
      status: 'Paid & Verified',
    });
  };

  const effectiveExpiry = expiresAtIso || currentBusiness?.subscription?.expiresAt;
  const effectiveAmount = paidAmountKes ?? payableAmount;

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
              {paymentStep === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Zap className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {paymentStep === 'success'
                    ? `${currentBusiness?.name || 'Store'} Activated`
                    : `Activate ${currentBusiness?.name || 'Store'}`}
                </h2>
                {paymentStep !== 'success' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950 tracking-wider">
                    Required to Ring Sales
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                {paymentStep === 'success'
                  ? 'Your subscription payment has been verified and synced across registers.'
                  : 'Setup is complete! Select a package to tender live sales, print KRA receipts, and sync registers.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseModal}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            title={
              paymentStep === 'pending'
                ? 'Minimize to banner (payment verification continues live)'
                : 'Close modal'
            }
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {paymentStep === 'pending' ? (
            <div className="py-8 px-4 text-center space-y-4">
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
                  {paymentChannel === 'card'
                    ? 'Complete Card Checkout'
                    : 'Awaiting M-Pesa PIN Authorization'}
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  {statusMessage}
                </p>
                {paymentRef && (
                  <p className="text-[11px] font-mono tabular-nums text-slate-500">
                    Reference: <span className="font-bold text-slate-800">{paymentRef}</span>
                  </p>
                )}
              </div>

              {resumeNotice && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium max-w-md mx-auto">
                  {resumeNotice}
                </div>
              )}

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

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  id="btn-modal-manual-verify"
                  onClick={handleManualVerify}
                  disabled={isCheckingStatus}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                  <span>{isCheckingStatus ? 'Verifying...' : 'Verify Payment Status'}</span>
                </button>
                <button
                  type="button"
                  id="btn-modal-cancel-pending"
                  onClick={() => {
                    pollAbortControllerRef.current?.abort();
                    clearPendingSubscription();
                    setIsProcessingPayment(false);
                    setPaymentStep('select');
                    setCardAuthUrl(null);
                    setResumeNotice(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                >
                  Start Different Payment
                </button>
              </div>
            </div>
          ) : paymentStep === 'success' ? (
            <div id="subscription-confirmation-summary" className="space-y-5 py-2">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Payment Verified &amp; Subscription Active
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {currentBusiness?.name || 'Your store'} · {formatTierDisplayName(normalizePlanTier(selectedPlanId))} Plan ({billingCycle === 'annual' ? 'Annual' : 'Monthly'})
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[11px] text-slate-500">Amount Paid</div>
                  <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                    KES {Number(effectiveAmount || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Clean Receipt Summary Grid */}
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                <div className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <span className="text-slate-500">Transaction Reference</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {paymentRef}
                  </span>
                </div>

                <div className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <span className="text-slate-500">
                    {paymentChannel === 'mpesa_stk' ? 'M-Pesa Receipt Code' : 'Payment Channel'}
                  </span>
                  {mpesaReceiptNumber ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono tabular-nums font-bold text-emerald-700">
                        {mpesaReceiptNumber}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyReceiptCode}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50 text-[11px] font-medium text-slate-700 cursor-pointer"
                      >
                        {copiedReceipt ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : paymentChannel === 'mpesa_stk' ? (
                    <span className="text-slate-500 inline-flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                      <span>Syncing M-Pesa receipt code...</span>
                    </span>
                  ) : (
                    <span className="font-semibold text-slate-800">Paystack Card Checkout</span>
                  )}
                </div>

                <div className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <span className="text-slate-500">Plan Validity</span>
                  <span className="font-semibold text-slate-900 font-mono tabular-nums">
                    {durationLabel}
                    {effectiveExpiry ? ` · Active until ${formatReadableDate(effectiveExpiry)}` : ''}
                  </span>
                </div>

                {(phoneNumber || payerEmail) && (
                  <div className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <span className="text-slate-500">Payer Contact</span>
                    <span className="font-mono tabular-nums text-slate-800">
                      {paymentChannel === 'mpesa_stk' ? phoneNumber : payerEmail}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    id="btn-receipt-copy-ref"
                    onClick={handleCopyReceiptCode}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer whitespace-nowrap"
                  >
                    {copiedReceipt ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedReceipt ? 'Copied' : 'Copy Code'}</span>
                  </button>
                  <button
                    type="button"
                    id="btn-receipt-print"
                    onClick={handlePrintConfirmation}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer whitespace-nowrap"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    type="button"
                    id="btn-receipt-billing-history"
                    onClick={() => {
                      clearPendingSubscription();
                      setPaymentStep('select');
                      onClose();
                      openBusinessSettings('billing');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer whitespace-nowrap"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Billing History</span>
                  </button>
                </div>

                <button
                  type="button"
                  id="btn-receipt-continue-pos"
                  onClick={handleContinueToPos}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition cursor-pointer whitespace-nowrap"
                >
                  <span>Continue to POS</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleStartPayment} className="space-y-4">
              {/* Compact Selected Package Summary */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                      Selected Package
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-600 text-white">
                      {selectedTier.name}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 tabular-nums">
                    Ksh {payableAmount.toLocaleString()}{' '}
                    <span className="text-slate-500 font-medium">({durationLabel})</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openPricingPage();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-indigo-200 text-indigo-700 font-bold text-[11px] shrink-0 transition cursor-pointer"
                >
                  Change Plan
                </button>
              </div>

              {/* Payment Method Selector */}
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
                    {paymentChannel === 'mpesa_stk' &&
                    gatewayConfig?.subscriptionMpesaProvider === 'daraja'
                      ? `Safaricom M-Pesa Express${
                          gatewayConfig.darajaEnv === 'sandbox' ? ' (Sandbox)' : ''
                        }`
                      : 'Secured by Paystack KES'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  {paymentChannel === 'mpesa_stk' ? (
                    <div>
                      <label
                        htmlFor="sub-mpesa-phone-input"
                        className="block text-[10px] font-bold text-slate-600 uppercase mb-1"
                      >
                        M-Pesa Phone Number
                      </label>
                      <HardenedKenyanPhoneInput
                        id="sub-mpesa-phone-input"
                        value={phoneNumber}
                        onChange={(formatted, msisdn, isValid) => {
                          setPhoneNumber(formatted);
                          if (paymentError) setPaymentError(null);
                        }}
                        showValidationBanner={true}
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
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <span>{paymentError}</span>
                    </div>
                    {(authRecoveryCode === 'FIREBASE_AUTH_REQUIRED' ||
                      authRecoveryCode === 'OWNER_MISMATCH' ||
                      authRecoveryCode === 'TENANT_ACCESS_DENIED' ||
                      authRecoveryCode === 'AUTH_REQUIRED' ||
                      authRecoveryCode === 'INVALID_SESSION') && (
                      <div className="pl-6">
                        <button
                          type="button"
                          onClick={async () => {
                            setPaymentError(null);
                            setAuthRecoveryCode(null);
                            await loginWithFirebaseGoogle(currentBusiness?.name);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white border border-red-300 text-red-700 hover:bg-red-100 font-bold text-[11px] transition cursor-pointer"
                        >
                          Sign in with Business Owner Google Account
                        </button>
                      </div>
                    )}
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
                    Pay Ksh {payableAmount.toLocaleString()} &amp; Activate Store ({durationDays} Days)
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
