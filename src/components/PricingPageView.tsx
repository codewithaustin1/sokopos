import React, { useState } from 'react';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Store,
  Phone,
  Sparkles,
} from 'lucide-react';
import { AppLogo } from './common/AppLogo';
import { DEFAULT_PRICING_TIERS, PricingTier } from '../types/pricing';

interface PricingPageViewProps {
  onBackToLogin: () => void;
  onSelectPlan?: (planId: string) => void;
  loginBgGraphic?: string | null;
}

export const PricingPageView: React.FC<PricingPageViewProps> = ({
  onBackToLogin,
  onSelectPlan,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const handleSelect = (tier: PricingTier) => {
    if (onSelectPlan) {
      onSelectPlan(tier.id);
    } else {
      // Return to login with register mode
      onBackToLogin();
    }
  };

  const handleScheduleConsultation = () => {
    const text = encodeURIComponent(
      'Hello SokoPoS! I would like to register for the Free Account and schedule the 1-on-1 Store Setup & Advisory Consultation (Ksh 1,999).'
    );
    window.open(`https://wa.me/254740463021?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      id="pricing-page"
      className="min-h-full w-full bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white flex flex-col justify-between"
    >
      {/* Header Navigation */}
      <header className="px-5 sm:px-8 py-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <AppLogo theme="dark" size="md" onClick={onBackToLogin} />
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Kenya Retail Pricing & Advisory
          </span>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onBackToLogin}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Login</span>
          </button>

          <button
            type="button"
            onClick={onBackToLogin}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Store className="w-4 h-4" />
            <span>Add New Shop</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Transparent, Merchant-First Pricing</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Plans Tailored for Kenyan Retailers
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl mx-auto">
            From single kiosks seeking lifetime free software with expert 1-on-1 setup, to high-volume supermarkets and expanding multi-branch chains.
          </p>

          {/* Billing Toggle: Monthly vs Annual */}
          <div className="pt-2 flex items-center justify-center">
            <div className="bg-slate-900/90 p-1 rounded-2xl border border-slate-800 flex items-center gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  billingCycle === 'annual'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Annual Billing</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-black px-1.5 py-0.5 rounded-full">
                  Save 17%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {DEFAULT_PRICING_TIERS.map((tier) => {
            const isFree = tier.id === 'free';
            const isPopular = tier.isPopular;
            const price = billingCycle === 'annual' ? tier.annualPrice : tier.monthlyPrice;
            const billingPeriodText = isFree
              ? 'Free Forever'
              : billingCycle === 'annual'
              ? 'Ksh / year (billed annually)'
              : 'Ksh / month';

            return (
              <div
                key={tier.id}
                className={`rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 relative ${
                  isPopular
                    ? 'bg-gradient-to-b from-slate-900 to-indigo-950/70 border-2 border-indigo-500 shadow-xl shadow-indigo-500/20 lg:-translate-y-2'
                    : isFree
                    ? 'bg-gradient-to-b from-slate-900 to-emerald-950/40 border border-emerald-500/40 shadow-lg'
                    : 'bg-slate-900/80 border border-slate-800 shadow-lg hover:border-slate-700'
                }`}
              >
                {/* Popular or Feature Badge */}
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md ${
                        isPopular
                          ? 'bg-indigo-600 text-white'
                          : isFree
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {tier.badge}
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Tier Title & Alias */}
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black text-white tracking-tight">{tier.name}</h3>
                      <span className="text-xs text-slate-400 font-medium">{tier.alias}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-snug">{tier.tagline}</p>
                  </div>

                  {/* Price Display */}
                  <div className="pt-2 pb-1 border-y border-slate-800/80">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                        {isFree ? 'Ksh 0' : `Ksh ${price.toLocaleString()}`}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {isFree ? '/ month' : billingCycle === 'annual' ? '/ yr' : '/ mo'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{billingPeriodText}</div>

                    {/* Consultation Fee Callout for Free Tier */}
                    {isFree && tier.consultationFee && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-between">
                        <span>One-time Setup Fee:</span>
                        <span className="text-sm font-black text-white bg-emerald-600 px-2 py-0.5 rounded-lg">
                          Ksh {tier.consultationFee.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Limits summary */}
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                      <div className="font-black text-white">
                        {tier.maxBranches === -1 ? 'Unlimited' : `${tier.maxBranches} Branch`}
                      </div>
                      <div className="text-[10px] text-slate-400">Locations</div>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                      <div className="font-black text-white">
                        {tier.maxStaffUsers === -1 ? 'Unlimited' : `${tier.maxStaffUsers} Staff`}
                      </div>
                      <div className="text-[10px] text-slate-400">Logins</div>
                    </div>
                  </div>

                  {/* Key Features List */}
                  <div className="space-y-2 pt-2">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Included Highlights
                    </div>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {tier.features.slice(0, 6).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 leading-tight">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card CTA Action */}
                <div className="pt-6 mt-4 border-t border-slate-800/80 space-y-2">
                  <button
                    type="button"
                    onClick={() => (isFree ? handleScheduleConsultation() : handleSelect(tier))}
                    className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                      isPopular
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                        : isFree
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                  >
                    <span>
                      {isFree
                        ? 'Start Free + Book Setup'
                        : `Choose ${tier.alias}`}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="text-[10px] text-center text-slate-500 font-medium">
                    {isFree
                      ? 'No recurring subscription • 1-on-1 onboarding'
                      : 'Instant access • Upgrade or cancel anytime'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-slate-900/90 rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl space-y-6">
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="text-2xl font-black text-white tracking-tight">Full Plan Feature Comparison</h2>
            <p className="text-xs text-slate-400">
              Detailed breakdown of features, limits, and technical capabilities across all 4 tiers.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-3 px-4 font-bold uppercase tracking-wider text-[11px]">Feature</th>
                  <th className="py-3 px-4 font-bold text-emerald-400 text-center">FREE (Ksh 1,999 Setup)</th>
                  <th className="py-3 px-4 font-bold text-blue-400 text-center">STARTER (Ksh 399/mo)</th>
                  <th className="py-3 px-4 font-bold text-indigo-400 text-center">BUSINESS (Ksh 899/mo)</th>
                  <th className="py-3 px-4 font-bold text-purple-400 text-center">PREMIUM (Ksh 1,499/mo)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Monthly Software Subscription</td>
                  <td className="py-3 px-4 text-center font-black text-emerald-400">Ksh 0 / mo</td>
                  <td className="py-3 px-4 text-center font-bold text-white">Ksh 399 / mo</td>
                  <td className="py-3 px-4 text-center font-bold text-white">Ksh 899 / mo</td>
                  <td className="py-3 px-4 text-center font-bold text-white">Ksh 1,499 / mo</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-white">Onboarding & Consultation</td>
                  <td className="py-3 px-4 text-center font-bold text-emerald-300">Ksh 1,999 One-Time</td>
                  <td className="py-3 px-4 text-center text-slate-400">Self-Serve (Optional)</td>
                  <td className="py-3 px-4 text-center text-indigo-300">Quarterly Included</td>
                  <td className="py-3 px-4 text-center text-purple-300">Dedicated Account Mgr</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Store Branches & Registers</td>
                  <td className="py-3 px-4 text-center">1 Branch</td>
                  <td className="py-3 px-4 text-center">1 Branch</td>
                  <td className="py-3 px-4 text-center font-bold text-white">Up to 3 Branches</td>
                  <td className="py-3 px-4 text-center font-black text-purple-400">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Staff & Cashier User Logins</td>
                  <td className="py-3 px-4 text-center">1 User</td>
                  <td className="py-3 px-4 text-center">2 Users</td>
                  <td className="py-3 px-4 text-center font-bold text-white">10 Users</td>
                  <td className="py-3 px-4 text-center font-black text-purple-400">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Catalog / Inventory SKU Limit</td>
                  <td className="py-3 px-4 text-center">Up to 250 SKUs</td>
                  <td className="py-3 px-4 text-center font-bold text-white">Unlimited</td>
                  <td className="py-3 px-4 text-center font-bold text-white">Unlimited</td>
                  <td className="py-3 px-4 text-center font-bold text-white">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Offline Mode with Cloud Reconnection</td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4">M-Pesa STK & Split Payments</td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Official PDF & WhatsApp Receipt Sharing</td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Inter-Store Stock Transfers</td>
                  <td className="py-3 px-4 text-center text-slate-500">—</td>
                  <td className="py-3 px-4 text-center text-slate-500">—</td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Customer Loyalty Points & Credit Ledgers</td>
                  <td className="py-3 px-4 text-center text-slate-500">—</td>
                  <td className="py-3 px-4 text-center text-slate-500">—</td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Supplier Orders & Debt Tracking</td>
                  <td className="py-3 px-4 text-center text-slate-500">—</td>
                  <td className="py-3 px-4 text-center text-slate-500">—</td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-emerald-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Custom White-Label Receipt Branding</td>
                  <td className="py-3 px-4 text-center text-slate-500">—</td>
                  <td className="py-3 px-4 text-center text-slate-500">—</td>
                  <td className="py-3 px-4 text-center text-slate-500">—</td>
                  <td className="py-3 px-4 text-center"><Check className="w-4 h-4 text-purple-400 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="px-6 py-6 border-t border-slate-800/80 bg-slate-950 text-center text-xs text-slate-400 shrink-0">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <div className="flex items-center gap-2.5 flex-wrap justify-center text-slate-400">
            <AppLogo theme="dark" size="sm" onClick={onBackToLogin} />
            <span className="hidden sm:inline text-slate-600">•</span>
            <span>© 2026 SokoPoS Enterprise Platform • Sokoplus Horizon</span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center font-medium">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-slate-400 hover:text-white transition cursor-pointer"
            >
              Return to Login
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={handleScheduleConsultation}
              className="text-emerald-400 hover:text-emerald-300 transition cursor-pointer flex items-center gap-1"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>WhatsApp Advisory</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
