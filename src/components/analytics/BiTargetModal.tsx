import React, { useState, useEffect, useMemo } from 'react';
import { X, Target, Check, Lock } from 'lucide-react';
import { Location } from '../../types';
import { AnalyticsTarget } from '../../types/reporting';
import { getDaysInPeriodMonth, getPeriodKey } from '../../utils/biEngine';

interface BiTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: Location[];
  selectedLocationId: string;
  initialPeriodKey?: string;
  canEdit?: boolean;
  currency: string;
  existingTargets: AnalyticsTarget[];
  onSave: (params: {
    locationId: string;
    periodKey: string;
    revenueTarget: number;
    grossMarginTargetPct: number;
    maxDiscountPct: number;
  }) => Promise<unknown>;
}

export const BiTargetModal: React.FC<BiTargetModalProps> = ({
  isOpen,
  onClose,
  locations,
  selectedLocationId,
  initialPeriodKey,
  canEdit = true,
  currency,
  existingTargets,
  onSave,
}) => {
  const [locationId, setLocationId] = useState(selectedLocationId || 'all');
  const [periodKey, setPeriodKey] = useState(() => initialPeriodKey || getPeriodKey());
  const [revenueTarget, setRevenueTarget] = useState('');
  const [grossMarginTargetPct, setGrossMarginTargetPct] = useState('25');
  const [maxDiscountPct, setMaxDiscountPct] = useState('5');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLocationId(selectedLocationId || 'all');
    if (initialPeriodKey) {
      setPeriodKey(initialPeriodKey);
    }
    setSaveError(null);
  }, [isOpen, selectedLocationId, initialPeriodKey]);

  useEffect(() => {
    if (!isOpen) return;
    const match = existingTargets.find(
      (t) => t.locationId === locationId && t.periodKey === periodKey
    );
    if (match) {
      setRevenueTarget(String(match.revenueTarget));
      setGrossMarginTargetPct(String(match.grossMarginTargetPct));
      setMaxDiscountPct(String(match.maxDiscountPct));
    } else {
      setRevenueTarget('');
      setGrossMarginTargetPct('25');
      setMaxDiscountPct('5');
    }
  }, [isOpen, locationId, periodKey, existingTargets]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const dailyBaselinePreview = useMemo(() => {
    const rev = Math.max(0, parseFloat(revenueTarget) || 0);
    const { daysInMonth } = getDaysInPeriodMonth(periodKey);
    if (rev <= 0 || daysInMonth <= 0) return null;
    return {
      perDay: rev / daysInMonth,
      daysInMonth,
    };
  }, [revenueTarget, periodKey]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave({
        locationId,
        periodKey,
        revenueTarget: Math.max(0, parseFloat(revenueTarget) || 0),
        grossMarginTargetPct: Math.min(100, Math.max(0, parseFloat(grossMarginTargetPct) || 0)),
        maxDiscountPct: Math.min(100, Math.max(0, parseFloat(maxDiscountPct) || 0)),
      });
      onClose();
    } catch (err: any) {
      setSaveError(err?.message || 'Unable to save branch target.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Configure Branch Monthly Targets"
        className="relative z-10 w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Branch Monthly Targets</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!canEdit && (
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Only store owners can create or modify branch monthly targets.</span>
            </div>
          )}

          {saveError && (
            <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-700">
              {saveError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Store Scope</label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="all">All Branches Combined</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Target Month</label>
              <input
                type="month"
                value={periodKey}
                onChange={(e) => setPeriodKey(e.target.value)}
                required
                disabled={!canEdit}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Net Revenue Goal ({currency})
            </label>
            <input
              type="number"
              min="0"
              step="100"
              required
              disabled={!canEdit}
              placeholder="e.g. 500000"
              value={revenueTarget}
              onChange={(e) => setRevenueTarget(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
            {dailyBaselinePreview && (
              <p className="mt-1.5 text-[11px] text-slate-500 font-mono tabular-nums">
                Baseline pace: {currency}{' '}
                {dailyBaselinePreview.perDay.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
                /day across {dailyBaselinePreview.daysInMonth} days in {periodKey}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Gross Margin Floor (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                required
                disabled={!canEdit}
                value={grossMarginTargetPct}
                onChange={(e) => setGrossMarginTargetPct(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Max Discount Ceiling (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                required
                disabled={!canEdit}
                value={maxDiscountPct}
                onChange={(e) => setMaxDiscountPct(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer whitespace-nowrap"
            >
              {canEdit ? 'Cancel' : 'Close'}
            </button>
            {canEdit && (
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5" />
                {isSaving ? 'Saving...' : 'Save Target'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
