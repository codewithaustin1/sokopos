import React, { useState } from 'react';
import {
  Save,
  CheckCircle2,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { SettingsSectionHeader } from './common/SettingsSectionHeader';

export const LoyaltySettingsPanel: React.FC = () => {
  const {
    currentBusiness,
    currentLocation,
    loyaltySettings,
    updateLoyaltySettings,
    showToast,
  } = usePos();

  const [enabled, setEnabled] = useState<boolean>(loyaltySettings.enabled ?? true);
  const [spendPerPoint, setSpendPerPoint] = useState<number>(
    loyaltySettings.spendPerPoint > 0 ? loyaltySettings.spendPerPoint : 100
  );
  const [pointsPerCurrencyUnit, setPointsPerCurrencyUnit] = useState<number>(
    loyaltySettings.pointsPerCurrencyUnit > 0 ? loyaltySettings.pointsPerCurrencyUnit : 10
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [testSaleAmount, setTestSaleAmount] = useState<number>(1000);

  const currency = currentLocation.currency || currentBusiness?.currency || 'KES';

  // Calculations
  const safeSpendPerPoint = Math.max(1, Number(spendPerPoint) || 100);
  const safePointsPerCurrency = Math.max(1, Number(pointsPerCurrencyUnit) || 10);

  // 1 point is worth how much in currency?
  const singlePointValue = 1 / safePointsPerCurrency;
  // Total spend to get 1 currency unit reward
  const spendForOneCurrencyReward = safeSpendPerPoint * safePointsPerCurrency;
  // Effective cashback percentage
  const effectiveCashbackRate = (1 / spendForOneCurrencyReward) * 100;

  // Simulator values
  const simulatedEarnedPoints = Math.floor(Math.max(0, testSaleAmount) / safeSpendPerPoint);
  const simulatedRedeemValue = simulatedEarnedPoints / safePointsPerCurrency;

  const handleSave = async () => {
    if (safeSpendPerPoint <= 0 || safePointsPerCurrency <= 0) {
      showToast('Please enter positive values for point rules', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const ok = await updateLoyaltySettings({
        enabled,
        spendPerPoint: safeSpendPerPoint,
        pointsPerCurrencyUnit: safePointsPerCurrency,
      });
      if (!ok) return;
      setHasSaved(true);
      showToast('Loyalty point values and earning rules saved successfully', 'success');
      setTimeout(() => setHasSaved(false), 3000);
    } catch (err) {
      console.error('Failed to update loyalty settings:', err);
      showToast('Failed to save loyalty settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 space-y-6">
      <SettingsSectionHeader
        title="Loyalty Program & Point Valuation"
        description="Configure how customers earn and redeem loyalty points. Printed and digital receipts display previous and updated balances automatically."
        meta={
          <span className={enabled ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-slate-500'}>
            {enabled ? 'Program Active' : 'Program Paused'} · {effectiveCashbackRate.toFixed(2)}% Rebate
          </span>
        }
        actions={
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Enable Rewards
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              id="toggle-loyalty-program-btn"
              onClick={() => setEnabled(!enabled)}
              className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-5 h-5 rounded-full shadow-xs transform transition-transform ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        }
      />

      {/* Earning & Redemption Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Rule 1: Sales Amount to Earn 1 Point */}
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Earning Rate
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customer spend required to earn 1 loyalty point.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Spend per 1 Point</span>
              <span className="font-mono tabular-nums text-blue-600 dark:text-blue-400 font-medium">
                {currency} {safeSpendPerPoint} = 1 pt
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-medium text-slate-400">
                {currency}
              </span>
              <input
                type="number"
                id="input-spend-per-point"
                min="1"
                step="1"
                value={spendPerPoint}
                onChange={(e) => setSpendPerPoint(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full pl-12 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              At {currency} {safeSpendPerPoint}, a {currency} 500 sale awards{' '}
              <span className="font-mono tabular-nums font-medium text-slate-700 dark:text-slate-200">
                {Math.floor(500 / safeSpendPerPoint)}
              </span>{' '}
              pts.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {[50, 100, 200, 500].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setSpendPerPoint(preset)}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium tabular-nums transition cursor-pointer text-center border whitespace-nowrap ${
                  spendPerPoint === preset
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {currency} {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Rule 2: Points Redemption Value */}
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Redemption Rate
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Number of points required to equal 1 {currency} in checkout value.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Points equal to 1 {currency}</span>
              <span className="font-mono tabular-nums text-blue-600 dark:text-blue-400 font-medium">
                {safePointsPerCurrency} pts = 1 {currency}
              </span>
            </label>
            <div className="relative">
              <input
                type="number"
                id="input-points-per-currency"
                min="1"
                step="1"
                value={pointsPerCurrencyUnit}
                onChange={(e) =>
                  setPointsPerCurrencyUnit(Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-3 top-2.5 text-xs font-medium text-slate-400">
                Points
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Each point equals{' '}
              <span className="font-mono tabular-nums font-medium text-slate-700 dark:text-slate-200">
                {currency} {singlePointValue.toFixed(2)}
              </span>{' '}
              in redeemable store credit.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {[
              { pts: 1, label: '1 = 1/-' },
              { pts: 5, label: '5 = 1/-' },
              { pts: 10, label: '10 = 1/-' },
              { pts: 20, label: '20 = 1/-' },
            ].map(({ pts, label }) => (
              <button
                key={pts}
                type="button"
                onClick={() => setPointsPerCurrencyUnit(pts)}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium tabular-nums transition cursor-pointer text-center border whitespace-nowrap ${
                  pointsPerCurrencyUnit === pts
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
                title={`${pts} points = 1 ${currency}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Program Economics Summary Strip */}
      <div className="pt-5 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Program Economics Summary
          </h4>
          <span className="text-xs font-mono tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
            {effectiveCashbackRate.toFixed(2)}% Effective Customer Rebate
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/70 dark:bg-slate-950/50">
          <div className="p-3.5">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Spend for 1 Point</span>
            <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 text-sm mt-0.5 block">
              {currency} {safeSpendPerPoint.toLocaleString()}
            </span>
          </div>

          <div className="p-3.5">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">1 Point Cash Value</span>
            <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 text-sm mt-0.5 block">
              {currency} {singlePointValue.toFixed(2)}
            </span>
          </div>

          <div className="p-3.5">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Spend per 1 {currency} Reward</span>
            <span className="font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 text-sm mt-0.5 block">
              {currency} {spendForOneCurrencyReward.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Live Sale & Receipt Simulator */}
      <div className="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Receipt Points Preview
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Test how a sample purchase updates a customer&apos;s receipt balance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          <div className="space-y-3">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
              Sample Sale Amount ({currency})
            </label>
            <input
              type="number"
              value={testSaleAmount}
              onChange={(e) => setTestSaleAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-44 px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 pt-1">
              <div className="flex justify-between max-w-xs">
                <span>Points Earned:</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  +{simulatedEarnedPoints} pts
                </span>
              </div>
              <div className="flex justify-between max-w-xs">
                <span>Redeemable Value:</span>
                <span className="font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                  {currency} {simulatedRedeemValue.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 text-xs font-mono tabular-nums space-y-1.5 bg-slate-50/70 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1.5">
              Receipt Loyalty Slip
            </div>
            <div className="flex justify-between">
              <span>Customer</span>
              <span className="font-sans font-medium text-slate-900 dark:text-slate-100">David Mwangi</span>
            </div>
            <div className="flex justify-between">
              <span>Previous Balance</span>
              <span>520 pts</span>
            </div>
            <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
              <span>Earned This Sale</span>
              <span>+{simulatedEarnedPoints} pts</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-900 dark:text-slate-100 pt-1.5 border-t border-slate-200 dark:border-slate-800">
              <span>New Balance</span>
              <span>{520 + simulatedEarnedPoints} pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Action Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
          {loyaltySettings.updatedAt ? (
            <span>
              Last updated {new Date(loyaltySettings.updatedAt).toLocaleString()}
              {loyaltySettings.updatedBy ? ` · ${loyaltySettings.updatedBy}` : ''}
            </span>
          ) : (
            <span>Using default retail reward rules</span>
          )}
        </div>

        <button
          type="button"
          id="save-loyalty-settings-btn"
          onClick={handleSave}
          disabled={isSaving}
          className={`inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-medium text-xs text-white transition cursor-pointer whitespace-nowrap ${
            hasSaved
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {hasSaved ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Saved</span>
            </>
          ) : isSaving ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save Loyalty Rules</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

