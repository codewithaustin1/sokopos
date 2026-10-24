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
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { DEFAULT_PRICING_TIERS, PricingTier } from '../types/pricing';

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
  const [phoneNumber, setPhoneNumber] = useState(() => currentLocation?.phone || '0740463021');
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'select' | 'simulating' | 'success'>('select');
  const [simulatedRef, setSimulatedRef] = useState<string>('');

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

  const handleSimulatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulatingPayment(true);
    setPaymentStep('simulating');

    try {
      // Simulate Safaricom Daraja STK Push prompt & user PIN authorization delay
      await new Promise((resolve) => setTimeout(resolve, 1800));

      const result = await activateBusinessSubscription(
        selectedPlanId,
        billingCycle,
        phoneNumber
      );

      setSimulatedRef(result.subscription.lastPaymentReference || 'SIM-MPESA-OK');
      setPaymentStep('success');

      // Allow owner to see celebratory success state briefly, then resume tender flow
      setTimeout(() => {
        setIsSimulatingPayment(false);
        setPaymentStep('select');
        onClose();
        onSuccess?.();
      }, 1600);
    } catch (err) {
      console.error('Subscription activation simulation error:', err);
      setIsSimulatingPayment(false);
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
          {paymentStep === 'simulating' ? (
            <div className="py-12 px-4 text-center space-y-4">
              <div className="relative inline-flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center animate-pulse">
                  <Phone className="w-8 h-8 text-emerald-600 animate-bounce" />
                </div>
                <div className="absolute -top-1 -right-1">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">
                  Simulating M-Pesa STK Push...
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Prompting phone <strong className="text-slate-800">{phoneNumber}</strong> for{' '}
                  <strong className="text-emerald-700">Ksh {payableAmount.toLocaleString()}</strong>. Authorizing activation...
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulating instant payment confirmation</span>
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
                  Reference: <span className="font-mono font-bold text-slate-800">{simulatedRef}</span>. Active for{' '}
                  <strong className="text-emerald-700">{durationLabel}</strong>.
                </p>
              </div>

              <div className="text-xs font-bold text-emerald-700">
                Opening POS checkout register...
              </div>
            </div>
          ) : (
            <form onSubmit={handleSimulatePayment} className="space-y-5">
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

              {/* M-Pesa Simulated Payment Form */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span>M-Pesa STK Push Express Payment</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Safaricom Daraja
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
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

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col justify-center">
                    <div className="text-[10px] text-slate-500 font-medium">Activation Amount:</div>
                    <div className="text-base font-black text-slate-900">
                      Ksh {payableAmount.toLocaleString()}
                      <span className="text-[11px] font-semibold text-slate-500 ml-1">
                        ({durationLabel})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Simulation Notice Banner */}
                <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-[11px] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    <strong>Sandbox Payment Simulation:</strong> Because the production M-Pesa gateway is staging, clicking below will simulate an instant verified payment and activate your store for <strong>{durationDays} days</strong>.
                  </span>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={isSimulatingPayment}
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
                  <span>Instant Database Activation • Zero Downtime • Continuous Cloud Sync</span>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
