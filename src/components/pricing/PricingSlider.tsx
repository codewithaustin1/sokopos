import React from 'react';
import {
  Sparkles,
  Store,
  Users,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sliders,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
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
  onBillingCycleChange,
  onUpgradeClick,
  currentPlanTierId,
  isSuperAdminView = false,
}) => {
  const [sliderMode, setSliderMode] = React.useState<'tier' | 'branches'>('tier');
  const [branchCount, setBranchCount] = React.useState<number>(1);

  // Map tier ID to slider index 0, 1, 2
  const activeStepIndex = React.useMemo(() => {
    const idx = SLIDER_TIER_STEPS.findIndex((s) => s.tierId === selectedTierId);
    return idx >= 0 ? idx : 1;
  }, [selectedTierId]);

  // Current tier object
  const currentTier = React.useMemo(() => {
    return tiers.find((t) => t.id === selectedTierId) || tiers[0] || {
      id: 'business',
      name: 'BUSINESS',
      alias: 'Pro',
      monthlyPrice: 899,
      annualPrice: 8990,
      currency: 'KES',
      badge: 'Best Value',
      tagline: 'Growing stores',
      description: '',
      maxBranches: 3,
      maxStaffUsers: 10,
      features: [],
      supportLevel: 'Priority',
      isActive: true,
      colorTheme: 'indigo',
    };
  }, [tiers, selectedTierId]);

  // Handle tier slider change
  const handleTierSliderChange = (newIndex: number) => {
    const targetStep = SLIDER_TIER_STEPS[newIndex];
    if (targetStep) {
      onSelectTier(targetStep.tierId);
      // Synchronize branch count accordingly
      if (targetStep.tierId === 'starter') setBranchCount(1);
      else if (targetStep.tierId === 'business') setBranchCount(2);
      else setBranchCount(5);
    }
  };

  // Handle branch scale slider change
  const handleBranchSliderChange = (count: number) => {
    setBranchCount(count);
    const recommendedTierId = getRecommendedTierIdByBranches(count);
    onSelectTier(recommendedTierId);
  };

  // Calculate pricing values
  const currentPrice = billingCycle === 'annual' ? currentTier.annualPrice : currentTier.monthlyPrice;
  const billingPeriodLabel = billingCycle === 'annual' ? '/ year' : '/ month';
  const monthlyEquivalent = billingCycle === 'annual' ? Math.round(currentTier.annualPrice / 12) : currentTier.monthlyPrice;
  const isCurrentPlan = currentPlanTierId === currentTier.id;

  // Percentage for the slider track progress fill
  const progressPercentage = (activeStepIndex / (SLIDER_TIER_STEPS.length - 1)) * 100;
  const branchProgressPercentage = ((branchCount - 1) / (10 - 1)) * 100;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md p-5 sm:p-6 space-y-6">
      {/* Slider Header: Title & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
              <Sliders className="w-4 h-4" />
            </span>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Interactive POS Package Slider
            </h3>
            <span className="text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
              Scale Calculator
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Slide to explore packages or estimate requirements based on your store's branch locations.
          </p>
        </div>

        {/* Mode Selector Pill */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSliderMode('tier')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              sliderMode === 'tier'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            By Package Tier
          </button>
          <button
            type="button"
            onClick={() => setSliderMode('branches')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              sliderMode === 'branches'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span>By Store Branches</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          </button>
        </div>
      </div>

      {/* Main Interactive Slider Track */}
      {sliderMode === 'tier' ? (
        <div className="space-y-4 pt-2">
          {/* Top Label & Quick Navigation Arrows */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
              Slide To Select Package:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleTierSliderChange(Math.max(0, activeStepIndex - 1))}
                disabled={activeStepIndex === 0}
                className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Previous tier"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-black text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 text-xs">
                {currentTier.name} ({currentTier.alias})
              </span>
              <button
                type="button"
                onClick={() => handleTierSliderChange(Math.min(SLIDER_TIER_STEPS.length - 1, activeStepIndex + 1))}
                disabled={activeStepIndex === SLIDER_TIER_STEPS.length - 1}
                className="p-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                title="Next tier"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Custom Styled Slider Bar with Gradient Fill & Tick Nodes */}
          <div className="relative py-6 px-1">
            {/* Floating Value Tooltip on Thumb */}
            <div
              className="absolute top-0 -translate-x-1/2 transition-all duration-150 pointer-events-none z-20"
              style={{ left: `${progressPercentage}%` }}
            >
              <div className="bg-slate-900 text-white text-[11px] font-black px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap flex items-center gap-1.5 border border-slate-700">
                <span>{currentTier.name}</span>
                <span className="text-purple-300 font-bold">({currentTier.alias})</span>
                <span className="text-amber-400 font-mono">KES {currentPrice.toLocaleString()}</span>
              </div>
              <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1 border-r border-b border-slate-700" />
            </div>

            {/* Visual Track Background */}
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden relative shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 transition-all duration-200 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            {/* Stepped Snap Nodes on Track */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-1 pointer-events-none">
              {SLIDER_TIER_STEPS.map((step, idx) => {
                const isPassed = activeStepIndex >= idx;
                const isCurrent = activeStepIndex === idx;
                return (
                  <div
                    key={step.tierId}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isCurrent
                        ? 'bg-purple-600 border-white ring-4 ring-purple-500/30 scale-110 shadow-md'
                        : isPassed
                        ? 'bg-indigo-600 border-white shadow-xs'
                        : 'bg-white border-slate-300 shadow-2xs'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isCurrent ? 'bg-white' : isPassed ? 'bg-white' : 'bg-slate-300'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* Glowing Draggable Thumb Handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white border-2 border-purple-600 shadow-xl ring-4 ring-purple-500/30 flex items-center justify-center transition-all duration-150 pointer-events-none z-10"
              style={{ left: `${progressPercentage}%` }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-purple-600 shadow-xs" />
            </div>

            {/* Native Accessible Range Slider Input on Top */}
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

          {/* Stepped Interactive Buttons Below Slider */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {SLIDER_TIER_STEPS.map((step, idx) => {
              const tierObj = tiers.find((t) => t.id === step.tierId);
              const isSelected = activeStepIndex === idx;
              const price = billingCycle === 'annual' ? tierObj?.annualPrice : tierObj?.monthlyPrice;

              return (
                <button
                  key={step.tierId}
                  type="button"
                  onClick={() => handleTierSliderChange(idx)}
                  className={`p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-500/20 shadow-xs'
                      : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/80'
                  }`}
                >
                  {step.tierId === 'business' && (
                    <span className="absolute -top-2 right-2 text-[9px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full shadow-2xs">
                      Best Value
                    </span>
                  )}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black uppercase ${
                        isSelected ? 'text-purple-900' : 'text-slate-800'
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{step.subLabel.split('•')[0]}</span>
                  </div>
                  <div className="mt-1 font-mono font-bold text-xs text-slate-900">
                    KES {(price || 0).toLocaleString()}
                    <span className="text-[10px] font-normal text-slate-500">
                      {billingCycle === 'annual' ? '/yr' : '/mo'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 truncate">
                    <Store className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{step.branchLabel}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* Branch Scale Capacity Slider */
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
              How many store locations / branches do you operate?
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-900 bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200">
                {branchCount === 10 ? '10+ Locations' : `${branchCount} Store Branch${branchCount > 1 ? 'es' : ''}`}
              </span>
            </div>
          </div>

          {/* Scale Slider Track */}
          <div className="relative py-6 px-1">
            {/* Floating Value Tooltip on Thumb */}
            <div
              className="absolute top-0 -translate-x-1/2 transition-all duration-150 pointer-events-none z-20"
              style={{ left: `${branchProgressPercentage}%` }}
            >
              <div className="bg-purple-950 text-white text-[11px] font-black px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap flex items-center gap-1.5 border border-purple-800">
                <span>{branchCount === 10 ? '10+ Branches' : `${branchCount} Branch${branchCount > 1 ? 'es' : ''}`}</span>
                <span className="text-amber-400 font-mono">→ {currentTier.name}</span>
              </div>
              <div className="w-2 h-2 bg-purple-950 rotate-45 mx-auto -mt-1 border-r border-b border-purple-800" />
            </div>

            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden relative shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 transition-all duration-200 rounded-full"
                style={{ width: `${branchProgressPercentage}%` }}
              />
            </div>

            {/* Step markers for branches: 1, 3, 5, 10 */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-2 pointer-events-none">
              {[1, 3, 5, 10].map((bNum) => {
                const isPassed = branchCount >= bNum;
                return (
                  <span
                    key={bNum}
                    className={`w-3.5 h-3.5 rounded-full border-2 ${
                      isPassed ? 'bg-purple-600 border-white' : 'bg-white border-slate-300'
                    }`}
                  />
                );
              })}
            </div>

            {/* Glowing Draggable Thumb Handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white border-2 border-purple-600 shadow-xl ring-4 ring-purple-500/30 flex items-center justify-center transition-all duration-150 pointer-events-none z-10"
              style={{ left: `${branchProgressPercentage}%` }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-purple-600 shadow-xs" />
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

          <div className="flex justify-between text-[11px] font-bold text-slate-400 px-1">
            <span>1 Branch (Solo)</span>
            <span>3 Branches (Multi)</span>
            <span>5 Branches (Growing)</span>
            <span>10+ Branches (Enterprise)</span>
          </div>

          <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-slate-700">
                Recommended for <strong>{branchCount} Branch{branchCount > 1 ? 'es' : ''}</strong>:
              </span>
              <span className="font-black text-purple-900 bg-white px-2 py-0.5 rounded-md border border-purple-200">
                {currentTier.name} ({currentTier.alias}) Package
              </span>
            </div>
            <span className="text-[11px] font-bold text-purple-700">
              KES {currentPrice.toLocaleString()} {billingPeriodLabel}
            </span>
          </div>
        </div>
      )}

      {/* Focused Spotlight Card of the Selected Package */}
      <div className="bg-linear-to-br from-slate-900 via-slate-850 to-indigo-950 text-white rounded-2xl p-5 border border-slate-800 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-white">{currentTier.name} PACKAGE</span>
              <span className="text-xs font-bold text-purple-300 bg-purple-900/60 px-2 py-0.5 rounded-md border border-purple-700/50">
                {currentTier.alias} Tier
              </span>
              {currentTier.badge && (
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full shadow-2xs">
                  ⭐ {currentTier.badge}
                </span>
              )}
              {isCurrentPlan && (
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Current Plan
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 max-w-xl">{currentTier.tagline}</p>

            <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-200 border border-white/10">
                🏬 {currentTier.maxBranches === -1 ? 'Unlimited Branches' : `${currentTier.maxBranches} Branch Location${currentTier.maxBranches > 1 ? 's' : ''}`}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-200 border border-white/10">
                👥 {currentTier.maxStaffUsers === -1 ? 'Unlimited Staff' : `Up to ${currentTier.maxStaffUsers} Staff Logins`}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-200 border border-white/10">
                💬 {currentTier.supportLevel}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 text-left sm:text-right">
              <div className="text-[11px] text-slate-300 font-medium">Selected Rate</div>
              <div className="text-xl font-black text-white">
                {currentTier.currency} {currentPrice.toLocaleString()}
                <span className="text-xs font-normal text-slate-400 ml-1">{billingPeriodLabel}</span>
              </div>
              {billingCycle === 'annual' && (
                <div className="text-[10px] text-emerald-400 font-bold mt-0.5">
                  Equivalent to {currentTier.currency} {monthlyEquivalent.toLocaleString()} / mo
                </div>
              )}
            </div>

            {onUpgradeClick && !isSuperAdminView && (
              <div>
                {isCurrentPlan ? (
                  <button
                    type="button"
                    disabled
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/20 text-slate-300 cursor-not-allowed flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Active Current Plan</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onUpgradeClick(currentTier)}
                    className="px-4 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-md transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Switch to {currentTier.name}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Top 3 Core Feature Highlights for this Slider Tier */}
        <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {currentTier.features.slice(0, 3).map((feat, fIdx) => (
            <div key={fIdx} className="flex items-center gap-2 text-slate-300">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{feat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
