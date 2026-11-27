import React, { useEffect } from 'react';
import { Lock, ArrowUpRight, Check, X, ShieldCheck } from 'lucide-react';
import { usePos } from '../../context/PosContext';
import { DEFAULT_PRICING_TIERS } from '../../types/pricing';
import { formatTierDisplayName } from '../../utils/subscriptionEntitlements';
import { PricingFeatureText } from '../pricing/PricingFeatureText';

export const UpgradePromptModal: React.FC = () => {
  const {
    upgradePrompt,
    closeUpgradePrompt,
    entitlements,
    pricingTiers,
    refreshPricingTiers,
    selectCheckoutPackage,
    setIsSubscriptionModalOpen,
    openPricingPage,
    currentBusiness,
    isSuperAdmin,
    updateBusinessPlan,
  } = usePos();

  useEffect(() => {
    if (upgradePrompt) {
      refreshPricingTiers(false).catch(() => {});
    }
  }, [upgradePrompt, refreshPricingTiers]);

  if (!upgradePrompt) return null;

  const targetTier =
    pricingTiers.find((t) => t.id === upgradePrompt.requiredTier) ||
    DEFAULT_PRICING_TIERS.find((t) => t.id === upgradePrompt.requiredTier) ||
    DEFAULT_PRICING_TIERS[2];

  const handleProceedToUpgrade = () => {
    selectCheckoutPackage(upgradePrompt.requiredTier, 'monthly');
    closeUpgradePrompt();
    setIsSubscriptionModalOpen(true);
  };

  const handleViewAllPlans = () => {
    closeUpgradePrompt();
    openPricingPage();
  };

  const handleSuperAdminOverridePlan = async () => {
    if (!currentBusiness?.id) return;
    await updateBusinessPlan(currentBusiness.id, upgradePrompt.requiredTier);
    closeUpgradePrompt();
  };

  const quotaUsed = upgradePrompt.quotaMetric?.used ?? 0;
  const quotaLimit = upgradePrompt.quotaMetric?.limit ?? 0;
  const quotaPercent =
    quotaLimit > 0 ? Math.min(100, Math.round((quotaUsed / quotaLimit) * 100)) : 100;

  return (
    <div
      id="subscription-upgrade-prompt-modal"
      className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-prompt-title"
    >
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Current Plan: {formatTierDisplayName(entitlements.tierId)}</span>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  Requires {formatTierDisplayName(upgradePrompt.requiredTier)}
                </span>
              </div>
              <h3
                id="upgrade-prompt-title"
                className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1"
              >
                {upgradePrompt.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            id="upgrade-prompt-close-btn"
            onClick={closeUpgradePrompt}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            aria-label="Close upgrade prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {upgradePrompt.description}
          </p>

          {/* Optional Quota Bar */}
          {upgradePrompt.quotaMetric && upgradePrompt.quotaMetric.limit > 0 && (
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {upgradePrompt.quotaMetric.label}
                </span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {quotaUsed} / {quotaLimit} used
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-600 transition-all duration-200"
                  style={{ width: `${quotaPercent}%` }}
                />
              </div>
              {quotaUsed > quotaLimit && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Existing records remain accessible, but adding new items requires upgrading your plan.
                </p>
              )}
            </div>
          )}

          {/* Target Tier Summary */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {targetTier.name} ({targetTier.alias})
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {targetTier.maxBranches === -1
                    ? 'Unlimited branches'
                    : `${targetTier.maxBranches} store ${targetTier.maxBranches === 1 ? 'branch' : 'branches'}`}{' '}
                  ·{' '}
                  {targetTier.maxStaffUsers === -1
                    ? 'Unlimited staff'
                    : `Up to ${targetTier.maxStaffUsers} staff users`}
                </div>
              </div>
              <div className="text-right font-mono tabular-nums shrink-0">
                <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                  KES {targetTier.monthlyPrice.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">per month</div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              {targetTier.bundleLabel && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200 text-[11px] font-semibold">
                  <span aria-hidden="true">+</span>
                  <span>{targetTier.bundleLabel}</span>
                </div>
              )}

              <ul className="space-y-1.5">
                {targetTier.features.slice(0, 5).map((feat, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <PricingFeatureText
                      text={feat}
                      metricClassName="font-semibold text-slate-900 dark:text-slate-100 tabular-nums"
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="upgrade-prompt-compare-btn"
              onClick={handleViewAllPlans}
              className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition cursor-pointer whitespace-nowrap"
            >
              Compare All Plans
            </button>
            {isSuperAdmin && currentBusiness?.id && (
              <button
                type="button"
                id="upgrade-prompt-superadmin-switch-btn"
                onClick={handleSuperAdminOverridePlan}
                className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline cursor-pointer whitespace-nowrap"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Set Tenant to {targetTier.alias}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={closeUpgradePrompt}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer whitespace-nowrap"
            >
              Not Now
            </button>
            <button
              type="button"
              id="upgrade-prompt-cta-btn"
              onClick={handleProceedToUpgrade}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap"
            >
              <span>Upgrade to {targetTier.alias}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
