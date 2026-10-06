import React, { useState } from 'react';
import {
  Star,
  Coins,
  Check,
  Save,
  HelpCircle,
  TrendingUp,
  Receipt,
  Sparkles,
  Calculator,
  Percent,
  CheckCircle2,
} from 'lucide-react';
import { usePos } from '../context/PosContext';

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
      await updateLoyaltySettings({
        enabled,
        spendPerPoint: safeSpendPerPoint,
        pointsPerCurrencyUnit: safePointsPerCurrency,
      });
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
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-200">
      {/* Top Banner & Status */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-amber-500/20">
            <Star className="w-5 h-5 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Loyalty Points Valuation & Rules
              </h2>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  enabled
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {enabled ? 'Program Active' : 'Program Paused'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Set what each point is worth and how customers earn rewards. Customer receipts will automatically display their previous and current points balance.
            </p>
          </div>
        </div>

        {/* Master Program Toggle */}
        <div className="flex items-center gap-3 shrink-0 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold text-slate-700">Enable Rewards:</span>
          <button
            type="button"
            id="toggle-loyalty-program-btn"
            onClick={() => setEnabled(!enabled)}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
              enabled ? 'bg-amber-500' : 'bg-slate-300'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main Configuration Grid: Earning & Redemption Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Rule 1: Sales Amount to Earn 1 Point */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                1. Cash Sales Required to Earn 1 Point
              </h3>
              <p className="text-[11px] text-slate-500">
                How much a client must spend to be awarded 1 point
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Spend per 1 Loyalty Point:</span>
              <span className="text-[11px] font-mono font-bold text-blue-600">
                {currency} {safeSpendPerPoint} = 1 pt
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                {currency}
              </span>
              <input
                type="number"
                id="input-spend-per-point"
                min="1"
                step="1"
                value={spendPerPoint}
                onChange={(e) => setSpendPerPoint(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Example: If set to <span className="font-bold text-slate-700">100</span>, a sale of KES 500 earns 5 points.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="pt-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Quick Earning Presets:
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[50, 100, 200, 500].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSpendPerPoint(preset)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center border ${
                    spendPerPoint === preset
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {currency} {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Rule 2: Points Worth 1 Shilling / Currency Unit */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Star className="w-4 h-4 fill-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                2. Points Redemption Value (Per 1 {currency})
              </h3>
              <p className="text-[11px] text-slate-500">
                Number of points equal to 1 shilling / currency unit
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Points equal to 1 {currency}:</span>
              <span className="text-[11px] font-mono font-bold text-amber-700">
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition"
              />
              <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                Points
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Each point is worth{' '}
              <strong className="text-amber-800">
                {currency} {singlePointValue.toFixed(2)}
              </strong>{' '}
              (e.g., 10 points = 1 shilling).
            </p>
          </div>

          {/* Quick Presets */}
          <div className="pt-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Quick Value Presets:
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { pts: 1, label: '1 pt = 1/-' },
                { pts: 5, label: '5 pts = 1/-' },
                { pts: 10, label: '10 pts = 1/-' },
                { pts: 20, label: '20 pts = 1/-' },
              ].map(({ pts, label }) => (
                <button
                  key={pts}
                  type="button"
                  onClick={() => setPointsPerCurrencyUnit(pts)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center border ${
                    pointsPerCurrencyUnit === pts
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                  title={`${pts} points = 1 ${currency}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Program Economics & Cashback Return Meter */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Program Economics & Customer Reward Rate
            </h4>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
            {effectiveCashbackRate.toFixed(2)}% Effective Rebate
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Spend for 1 Point</span>
            <span className="font-black text-slate-900 text-sm mt-0.5 block">
              {currency} {safeSpendPerPoint.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500">Sales amount to earn 1 pt</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">1 Point Cash Worth</span>
            <span className="font-black text-amber-700 text-sm mt-0.5 block">
              {currency} {singlePointValue.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500">100 pts = {currency} {(100 * singlePointValue).toFixed(2)}</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Spend for 1 {currency} Reward</span>
            <span className="font-black text-emerald-700 text-sm mt-0.5 block">
              {currency} {spendForOneCurrencyReward.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500">Net customer payback margin</span>
          </div>
        </div>
      </div>

      {/* Live Interactive Sale & Receipt Simulator */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Live Sale & Receipt Preview Simulator
            </h4>
          </div>
          <span className="text-[10px] text-slate-400">Verifies receipt point calculations</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* Test Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Simulate Customer Cash Sale Amount:
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">{currency}</span>
              <input
                type="number"
                value={testSaleAmount}
                onChange={(e) => setTestSaleAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-32 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              />
              <span className="text-xs text-slate-500">sale</span>
            </div>

            <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/80 text-xs text-blue-900 space-y-1">
              <div className="flex justify-between">
                <span>Points Earned on this sale:</span>
                <strong className="font-mono text-blue-800">+{simulatedEarnedPoints} pts</strong>
              </div>
              <div className="flex justify-between">
                <span>Value of points earned:</span>
                <strong className="font-mono text-emerald-700">
                  {currency} {simulatedRedeemValue.toFixed(2)}
                </strong>
              </div>
            </div>
          </div>

          {/* Simulated Printed Receipt Viewport */}
          <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-3 text-[11px] font-mono space-y-1 text-slate-800">
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-900 border-b border-amber-200 pb-1 flex items-center justify-between">
              <span>Receipt Balance Printout</span>
              <Receipt className="w-3.5 h-3.5 text-amber-700" />
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Customer:</span>
              <span className="font-bold text-slate-900">David Mwangi</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Previous Points Balance:</span>
              <span className="font-bold text-slate-900">520 pts</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>+ Earned This Sale:</span>
              <span className="font-bold">+{simulatedEarnedPoints} pts</span>
            </div>
            <div className="flex justify-between text-amber-900 font-black pt-1 border-t border-amber-200">
              <span>Current Points Balance:</span>
              <span className="text-xs font-black">{520 + simulatedEarnedPoints} pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button & Timestamp */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="text-[11px] text-slate-500">
          {loyaltySettings.updatedAt ? (
            <span>
              Last updated: {new Date(loyaltySettings.updatedAt).toLocaleString()}
              {loyaltySettings.updatedBy && ` by ${loyaltySettings.updatedBy}`}
            </span>
          ) : (
            <span>Using default standard retail reward rules</span>
          )}
        </div>

        <button
          type="button"
          id="save-loyalty-settings-btn"
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white transition shadow-sm cursor-pointer ${
            hasSaved
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          {hasSaved ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Saved Successfully</span>
            </>
          ) : isSaving ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Saving Rules...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Loyalty Rules</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
