import React, { useState } from 'react';
import { Calendar, Clock, ChevronDown, Check } from 'lucide-react';
import { DateRange, TimeRangePreset } from '../../types/reporting';
import { calculateDateRange, toInputDateFormat } from '../../utils/dateRangeUtils';

interface GlobalTimeRangeSelectorProps {
  currentRange: DateRange;
  onChange: (newRange: DateRange) => void;
}

interface PresetOption {
  preset: TimeRangePreset;
  label: string;
  isRolling?: boolean;
}

const PRESET_OPTIONS: PresetOption[] = [
  { preset: 'today', label: 'Today (Calendar)' },
  { preset: 'last_24h', label: 'Last 24 Hours (Rolling)', isRolling: true },
  { preset: 'last_7d', label: 'Last 7 Days' },
  { preset: 'last_30d', label: 'Last 30 Days' },
  { preset: 'last_90d', label: 'Last 90 Days' },
  { preset: 'last_180d', label: 'Last 180 Days' },
  { preset: 'last_1y', label: 'Last 1 Year' },
  { preset: 'custom', label: 'Custom Date Range...' },
  { preset: 'all', label: 'All Time' },
];

export const GlobalTimeRangeSelector: React.FC<GlobalTimeRangeSelectorProps> = ({
  currentRange,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomInputs, setShowCustomInputs] = useState(currentRange.preset === 'custom');
  const [customStartDate, setCustomStartDate] = useState<string>(
    toInputDateFormat(currentRange.start)
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    toInputDateFormat(currentRange.end)
  );

  const handleSelectPreset = (preset: TimeRangePreset) => {
    if (preset === 'custom') {
      setShowCustomInputs(true);
      setIsOpen(false);
      const newRange = calculateDateRange('custom', customStartDate, customEndDate);
      onChange(newRange);
    } else {
      setShowCustomInputs(false);
      setIsOpen(false);
      const newRange = calculateDateRange(preset);
      onChange(newRange);
    }
  };

  const handleApplyCustom = () => {
    if (!customStartDate || !customEndDate) return;
    const newRange = calculateDateRange('custom', customStartDate, customEndDate);
    onChange(newRange);
  };

  const activeLabel =
    PRESET_OPTIONS.find((p) => p.preset === currentRange.preset)?.label || currentRange.label;

  return (
    <div className="relative inline-block text-left">
      <div className="flex flex-wrap items-center gap-2">
        {/* Main Dropdown Button */}
        <button
          type="button"
          id="global-time-range-dropdown-btn"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 bg-slate-50 hover:bg-white text-slate-800 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold transition shadow-2xs cursor-pointer"
          title="Change reporting time range"
        >
          {currentRange.isRolling ? (
            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          ) : (
            <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          )}
          <span className="whitespace-nowrap">{activeLabel}</span>
          <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
        </button>

        {/* Custom Range Date Pickers (Shown when custom is selected) */}
        {showCustomInputs && (
          <div className="flex items-center gap-1.5 bg-white border border-blue-300 rounded-xl p-1 shadow-2xs animate-scale-in">
            <input
              type="date"
              id="custom-range-start-input"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-200 rounded-lg text-slate-800 font-mono font-bold focus:outline-none focus:border-blue-600"
            />
            <span className="text-slate-400 text-xs font-bold">to</span>
            <input
              type="date"
              id="custom-range-end-input"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2 py-1 text-xs border border-slate-200 rounded-lg text-slate-800 font-mono font-bold focus:outline-none focus:border-blue-600"
            />
            <button
              type="button"
              id="custom-range-apply-btn"
              onClick={handleApplyCustom}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Preset Options Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-30 animate-scale-in">
            <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Time Range Presets
            </div>
            <div className="py-1">
              {PRESET_OPTIONS.map((opt) => {
                const isSelected = currentRange.preset === opt.preset;
                return (
                  <button
                    key={opt.preset}
                    type="button"
                    id={`time-preset-${opt.preset}-btn`}
                    onClick={() => handleSelectPreset(opt.preset)}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {opt.isRolling ? (
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>{opt.label}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
