import React from 'react';
import {
  Store,
  Users,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sliders,
  ArrowRight,
  MessageSquare,
  Check,
} from 'lucide-react';
import { PricingTier, PackageTierId, SLIDER_TIER_STEPS, getRecommendedTierIdByBranches } from '../../types/pricing';

interface PricingSliderProps {
  tiers: PricingTier[];
  selectedTierId: PackageTierId;
  onSelectTier: (tierId: PackageTierId) => void;
  billingCycle: 'monthly' | 'annual';
  onBillingCycleChange?: (cycle: 'monthly' | 'annual') => void;
  onUpgradeClick?: (tier: PricingTier) => void;
  currentPlanTierId?: string;
  isSuperAdminView?: boolean;
}

export const PricingSlider: React.FC<PricingSliderProps> = ({
  tiers,
  selectedTierId,
  onSelectTier,
  billingCycle,
  onUpgradeClick,
  currentPlanTierId,
  isSuperAdminView = false,
}) => {
  const [sliderMode, setSliderMode] = React.useState<'tier' | 'branches'>('tier');
  const [branchCount, setBranchCount] = React.useState<number>(1);

  const activeStepIndex = React.useMemo(() => {
    const idx = SLIDER_TIER_STEPS.findIndex((s) => s.tierId === selectedTierId);
    return idx >= 0 ? idx : 1;
  }, [selectedTierId]);

  const currentTier = React.useMemo(() => {
    return (
      tiers.find((t) => t.id === selectedTierId) ||
      tiers[0] || {
        id: 'business',
        tierKey: 'business' as const,
        name: 'BUSINESS',
        alias: 'Pro',
        monthlyPrice: 1299,
        annualPrice: 12990,
        currency: 'KES',
        badge: 'Best Value',
        tagline: 'Growing stores',
        description: '',
        maxBranches: 3,
        maxStaffUsers: 10,
        features: [],
        supportLevel: 'Priority',
        isActive: true,
        colorTheme: 'indigo' as const,
      }
    );
  }, [tiers, selectedTierId]);

  const handleTierSliderChange = (newIndex: number) => {
    const targetStep = SLIDER_TIER_STEPS[newIndex];
    if (targetStep) {
      onSelectTier(targetStep.tierId);
      if (targetStep.tierId === 'starter') setBranchCount(1);
      else if (targetStep.tierId === 'business') setBranchCount(2);
      else setBranchCount(5);
    }
  };

  const handleBranchSliderChange = (count: number) => {
    setBranchCount(count);
    const recommendedTierId = getRecommendedTierIdByBranches(count);
    onSelectTier(recommendedTierId);
  };

  const currentPrice = billingCycle === 'annual' ? currentTier.annualPrice : currentTier.monthlyPrice;
  const billingPeriodLabel = billingCycle === 'annual' ? '/ year' : '/ month';
  const monthlyEquivalent =
    billingCycle === 'annual' ? Math.round(currentTier.annualPrice / 12) : currentTier.monthlyPrice;
  const isCurrentPlan = currentPlanTierId === currentTier.id;

  const progressPercentage = (activeStepIndex / (SLIDER_TIER_STEPS.length - 1)) * 100;
  const branchProgressPercentage = ((branchCount - 1) / (10 - 1)) * 100;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-6">
      {/* Header & Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Interactive Package &amp; Capacity Simulator
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Slide across package tiers or estimate capacity requirements by branch count.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSliderMode('tier')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
              sliderMode === 'tier'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            By Package Tier
          </button>
          <button
            type="button"
            onClick={() => setSliderMode('branches')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
              sliderMode === 'branches'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            By Store Branches
          </button>
        </div>
      </div>

      {/* Main Interactive Slider Track */}
      {sliderMode === 'tier' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-500 dark:text-slate-400">Select Package Tier</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTierSliderChange(Math.max(0, activeStepIndex - 1))}
                disabled={activeStepIndex === 0}
                className="p-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Previous tier"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs tabular-nums">
                {currentTier.name} · {currentTier.alias}
              </span>
              <button
                type="button"
                onClick={() => handleTierSliderChange(Math.min(SLIDER_TIER_STEPS.length - 1, activeStepIndex + 1))}
                disabled={activeStepIndex === SLIDER_TIER_STEPS.length - 1}
                className="p-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Next tier"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="relative py-6 px-1">
            <div
              className="absolute top-0 -translate-x-1/2 transition-all duration-150 pointer-events-none z-20"
              style={{ left: `${progressPercentage}%` }}
            >
              <div className="bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-medium px-2.5 py-1 rounded-md border border-slate-700 whitespace-nowrap flex items-center gap-1.5">
                <span className="font-semibold">{currentTier.name}</span>
                <span className="text-slate-400">·</span>
                <span className="font-mono tabular-nums text-blue-300">KES {currentPrice.toLocaleString()}</span>
              </div>
              <div className="w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45 mx-auto -mt-1 border-r border-b border-slate-700" />
            </div>

            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-blue-600 transition-all duration-200 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-1 pointer-events-none">
              {SLIDER_TIER_STEPS.map((step, idx) => {
                const isPassed = activeStepIndex >= idx;
                const isCurrent = activeStepIndex === idx;
                return (
                  <div
                    key={step.tierId}
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                      isCurrent
                        ? 'bg-blue-600 border-white dark:border-slate-900 ring-2 ring-blue-500/30 scale-110'
                        : isPassed
                        ? 'bg-blue-600 border-white dark:border-slate-900'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600'
                    }`}
                  />
                );
              })}
            </div>

            <input
              type="range"
              min="0"
              max={SLIDER_TIER_STEPS.length - 1}
              step="1"
              value={activeStepIndex}
              onChange={(e) => handleTierSliderChange(Number(e.target.value))}
              aria-label="POS Package Tier Slider"
              aria-valuemin={0}
              aria-valuemax={2}
              aria-valuenow={activeStepIndex}
              aria-valuetext={`${currentTier.name} package at ${currentTier.currency} ${currentTier.monthlyPrice} per month`}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {SLIDER_TIER_STEPS.map((step, idx) => {
              const tierObj = tiers.find((t) => t.id === step.tierId);
              const isSelected = activeStepIndex === idx;
              const price = billingCycle === 'annual' ? tierObj?.annualPrice : tierObj?.monthlyPrice;

              return (
                <button
                  key={step.tierId}
                  type="button"
                  onClick={() => handleTierSliderChange(idx)}
                  className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-500 dark:border-blue-500'
                      : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {step.subLabel.split('•')[0]}
                      {step.tierId === 'business' ? ' · Best Value' : ''}
                    </span>
                  </div>
                  <div className="mt-1 font-mono tabular-nums font-semibold text-xs text-slate-900 dark:text-slate-100">
                    KES {(price || 0).toLocaleString()}
                    <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                      {billingCycle === 'annual' ? '/yr' : '/mo'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 truncate">
                    <Store className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>{step.branchLabel}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-500 dark:text-slate-400">
              Store locations / branches operated
            </span>
            <span className="font-mono tabular-nums font-semibold text-blue-700 dark:text-blue-400">
              {branchCount === 10 ? '10+ Locations' : `${branchCount} Store Branch${branchCount > 1 ? 'es' : ''}`}
            </span>
          </div>

          <div className="relative py-6 px-1">
            <div
              className="absolute top-0 -translate-x-1/2 transition-all duration-150 pointer-events-none z-20"
              style={{ left: `${branchProgressPercentage}%` }}
            >
              <div className="bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-medium px-2.5 py-1 rounded-md border border-slate-700 whitespace-nowrap flex items-center gap-1.5">
                <span className="font-mono tabular-nums">
                  {branchCount === 10 ? '10+ Branches' : `${branchCount} Branch${branchCount > 1 ? 'es' : ''}`}
                </span>
                <span className="text-slate-400">→</span>
                <span className="font-semibold text-blue-300">{currentTier.name}</span>
              </div>
              <div className="w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45 mx-auto -mt-1 border-r border-b border-slate-700" />
            </div>

            <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-blue-600 transition-all duration-200 rounded-full"
                style={{ width: `${branchProgressPercentage}%` }}
              />
            </div>

            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-2 pointer-events-none">
              {[1, 3, 5, 10].map((bNum) => {
                const isPassed = branchCount >= bNum;
                return (
                  <span
                    key={bNum}
                    className={`w-3.5 h-3.5 rounded-full border-2 ${
                      isPassed
                        ? 'bg-blue-600 border-white dark:border-slate-900'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600'
                    }`}
                  />
                );
              })}
            </div>

            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={branchCount}
              onChange={(e) => handleBranchSliderChange(Number(e.target.value))}
              aria-label="Store Locations Slider"
              aria-valuemin={1}
              aria-valuemax={10}
              aria-valuenow={branchCount}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30"
            />
          </div>

          <div className="flex justify-between text-[11px] font-medium text-slate-400 dark:text-slate-500 px-1">
            <span>1 Branch (Solo)</span>
            <span>3 Branches (Multi)</span>
            <span>5 Branches (Growing)</span>
            <span>10+ Branches (Enterprise)</span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="text-slate-700 dark:text-slate-300">
              Recommended for{' '}
              <strong className="font-semibold text-slate-900 dark:text-slate-100">
                {branchCount} Branch{branchCount > 1 ? 'es' : ''}
              </strong>
              :{' '}
              <span className="font-semibold text-blue-700 dark:text-blue-400">
                {currentTier.name} ({currentTier.alias})
              </span>
            </div>
            <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
              KES {currentPrice.toLocaleString()} {billingPeriodLabel}
            </span>
          </div>
        </div>
      )}

      {/* Selected Package Summary */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {currentTier.name} Package
              </span>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">{currentTier.alias} Tier</span>
              {currentTier.badge && (
                <>
                  <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">{currentTier.badge}</span>
                </>
              )}
              {isCurrentPlan && (
                <>
                  <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">Current Plan</span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">{currentTier.tagline}</p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>
                  {currentTier.maxBranches === -1
                    ? 'Unlimited branches'
                    : `${currentTier.maxBranches} branch location${currentTier.maxBranches > 1 ? 's' : ''}`}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>
                  {currentTier.maxStaffUsers === -1
                    ? 'Unlimited staff logins'
                    : `Up to ${currentTier.maxStaffUsers} staff logins`}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <span>{currentTier.supportLevel}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            <div className="text-left sm:text-right">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Selected Rate</div>
              <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {currentTier.currency} {currentPrice.toLocaleString()}
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">
                  {billingPeriodLabel}
                </span>
              </div>
              {billingCycle === 'annual' && (
                <div className="text-[11px] font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {currentTier.currency} {monthlyEquivalent.toLocaleString()} / mo equivalent
                </div>
              )}
            </div>

            {onUpgradeClick && !isSuperAdminView && (
              <div>
                {isCurrentPlan ? (
                  <button
                    type="button"
                    disabled
                    className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Active Current Plan</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onUpgradeClick(currentTier)}
                    className="px-4 py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <span>Switch to {currentTier.name}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {currentTier.features.length > 0 && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            {currentTier.features.slice(0, 3).map((feat, fIdx) => (
              <div key={fIdx} className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">{feat}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
