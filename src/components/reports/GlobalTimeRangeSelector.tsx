import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, Clock, ChevronDown, Check, ArrowRight } from 'lucide-react';
import { DateRange, TimeRangePreset } from '../../types/reporting';
import {
  calculateDateRange,
  formatShortDateRange,
  getInclusiveDayCount,
  parseDateInput,
  toInputDateFormat,
} from '../../utils/dateRangeUtils';

interface GlobalTimeRangeSelectorProps {
  currentRange: DateRange;
  onChange: (newRange: DateRange) => void;
  align?: 'left' | 'right';
}

interface PresetOption {
  preset: TimeRangePreset;
  label: string;
  isRolling?: boolean;
}

const PRESET_OPTIONS: PresetOption[] = [
  { preset: 'today', label: 'Today' },
  { preset: 'last_24h', label: 'Last 24 Hours', isRolling: true },
  { preset: 'last_7d', label: 'Last 7 Days' },
  { preset: 'last_30d', label: 'Last 30 Days' },
  { preset: 'last_90d', label: 'Last 90 Days' },
  { preset: 'last_180d', label: 'Last 180 Days' },
  { preset: 'last_1y', label: 'Last 1 Year' },
  { preset: 'all', label: 'All Time' },
];

export const GlobalTimeRangeSelector: React.FC<GlobalTimeRangeSelectorProps> = ({
  currentRange,
  onChange,
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string>(() =>
    toInputDateFormat(currentRange.start)
  );
  const [customEndDate, setCustomEndDate] = useState<string>(() =>
    toInputDateFormat(currentRange.end)
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep draft custom inputs synchronized when range changes externally (Saved View, Reset, quick tabs)
  useEffect(() => {
    setCustomStartDate(toInputDateFormat(currentRange.start));
    setCustomEndDate(toInputDateFormat(currentRange.end));
  }, [currentRange.start, currentRange.end]);

  // Close popover on Escape key or outside click
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [isOpen]);

  const calendarShortcuts = useMemo(() => {
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayStr = toInputDateFormat(yesterday);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStr = toInputDateFormat(now);

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    return [
      {
        id: 'yesterday',
        label: 'Yesterday',
        startStr: yesterdayStr,
        endStr: yesterdayStr,
      },
      {
        id: 'this_month',
        label: 'This Month',
        startStr: toInputDateFormat(monthStart),
        endStr: todayStr,
      },
      {
        id: 'last_month',
        label: 'Last Month',
        startStr: toInputDateFormat(lastMonthStart),
        endStr: toInputDateFormat(lastMonthEnd),
      },
    ];
  }, [isOpen]);

  const handleSelectPreset = (preset: TimeRangePreset) => {
    setIsOpen(false);
    const newRange = calculateDateRange(preset);
    onChange(newRange);
  };

  const handleSelectCustomShortcut = (startStr: string, endStr: string) => {
    setCustomStartDate(startStr);
    setCustomEndDate(endStr);
    setIsOpen(false);
    onChange(calculateDateRange('custom', startStr, endStr));
  };

  const handleApplyCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customStartDate || !customEndDate) return;
    const newRange = calculateDateRange('custom', customStartDate, customEndDate);
    onChange(newRange);
    setIsOpen(false);
  };

  const draftPreview = useMemo(() => {
    const s = parseDateInput(customStartDate);
    const e = parseDateInput(customEndDate);
    if (!s || !e) return null;
    const isInverted = s.getTime() > e.getTime();
    const previewRange = calculateDateRange('custom', customStartDate, customEndDate);
    return {
      isInverted,
      days: getInclusiveDayCount(previewRange),
      span: formatShortDateRange(previewRange),
    };
  }, [customStartDate, customEndDate]);

  const activePresetOption = PRESET_OPTIONS.find((p) => p.preset === currentRange.preset);
  const triggerText =
    currentRange.preset === 'custom'
      ? formatShortDateRange(currentRange)
      : activePresetOption?.label || currentRange.label;

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        id="global-time-range-dropdown-btn"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`min-h-[40px] inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0 ${
          currentRange.preset === 'custom'
            ? 'bg-blue-50/80 border-blue-300 text-blue-800 hover:bg-blue-50'
            : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50 hover:border-slate-300'
        }`}
        title="Filter analytics and charts by date range"
      >
        {currentRange.isRolling ? (
          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        ) : (
          <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        )}
        <span className="font-semibold tabular-nums">{triggerText}</span>
        {currentRange.preset !== 'custom' && currentRange.preset !== 'all' && (
          <span className="hidden xl:inline text-[11px] font-mono tabular-nums text-slate-500">
            · {formatShortDateRange(currentRange)}
          </span>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Select Date Range"
          className={`absolute ${
            align === 'right' ? 'left-0 sm:left-auto sm:right-0' : 'left-0'
          } mt-2 w-[min(92vw,410px)] rounded-xl bg-white border border-slate-200 shadow-xl z-40 overflow-hidden`}
        >
          {/* Quick Presets */}
          <div className="p-3 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500">Quick Timeframes</span>
              <span className="text-[11px] font-mono tabular-nums text-slate-400">
                {getInclusiveDayCount(currentRange)}d active
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESET_OPTIONS.map((opt) => {
                const isSelected = currentRange.preset === opt.preset;
                return (
                  <button
                    key={opt.preset}
                    type="button"
                    id={`time-preset-${opt.preset}-btn`}
                    onClick={() => handleSelectPreset(opt.preset)}
                    className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition cursor-pointer text-left border ${
                      isSelected
                        ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                        : 'bg-white border-slate-200/80 text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      {opt.isRolling ? (
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      ) : (
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className="truncate">{opt.label}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Calendar Shortcuts (mapped safely to custom range dates) */}
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 mr-1">Calendar:</span>
              {calendarShortcuts.map((sc) => {
                const isActive =
                  currentRange.preset === 'custom' &&
                  toInputDateFormat(currentRange.start) === sc.startStr &&
                  toInputDateFormat(currentRange.end) === sc.endStr;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => handleSelectCustomShortcut(sc.startStr, sc.endStr)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {sc.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Date Range Form */}
          <form onSubmit={handleApplyCustom} className="p-3 bg-slate-50/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700">Custom Date Range</span>
              {draftPreview && (
                <span className="text-[11px] font-mono tabular-nums text-slate-500">
                  {draftPreview.days} {draftPreview.days === 1 ? 'day' : 'days'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div>
                <label
                  htmlFor="custom-range-start-input"
                  className="block text-[11px] text-slate-500 mb-1"
                >
                  Start date
                </label>
                <input
                  type="date"
                  id="custom-range-start-input"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full min-h-[40px] px-2.5 py-1.5 text-base sm:text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden sm:block mt-5 shrink-0" />

              <div>
                <label
                  htmlFor="custom-range-end-input"
                  className="block text-[11px] text-slate-500 mb-1"
                >
                  End date
                </label>
                <input
                  type="date"
                  id="custom-range-end-input"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full min-h-[40px] px-2.5 py-1.5 text-base sm:text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {draftPreview?.isInverted && (
              <p className="text-[11px] text-amber-700">
                Start date is after end date — dates will swap automatically on apply.
              </p>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="custom-range-apply-btn"
                disabled={!customStartDate || !customEndDate}
                className="min-h-[38px] px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap"
              >
                Apply Custom Range
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
