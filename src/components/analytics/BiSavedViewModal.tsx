import React, { useState, useEffect } from 'react';
import { X, Bookmark, Pin } from 'lucide-react';
import { BiChartMetric, BiFocusTab, DateRange } from '../../types/reporting';

interface BiSavedViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLocationName: string;
  dateRange: DateRange;
  focusTab: BiFocusTab;
  chartMetric: BiChartMetric;
  onSave: (name: string, isPinned: boolean) => Promise<void>;
}

export const BiSavedViewModal: React.FC<BiSavedViewModalProps> = ({
  isOpen,
  onClose,
  selectedLocationName,
  dateRange,
  focusTab,
  chartMetric,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [isPinned, setIsPinned] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(`${selectedLocationName} · ${dateRange.label.split(' (')[0]}`);
    setIsPinned(true);
  }, [isOpen, selectedLocationName, dateRange.label]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const focusLabel =
    focusTab === 'sku_margin'
      ? 'SKU Profitability'
      : focusTab === 'category_pl'
      ? 'Category P&L'
      : 'Sales Ledger';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onSave(name.trim(), isPinned);
      onClose();
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
        aria-label="Save BI Workspace View"
        className="relative z-10 w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Save BI Workspace View</h3>
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
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">View Name</label>
            <input
              type="text"
              maxLength={80}
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monthly Flagship Margin Check"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs bg-slate-50/60">
            <div className="flex justify-between px-3 py-2">
              <span className="text-slate-500">Branch Scope</span>
              <span className="font-medium text-slate-800">{selectedLocationName}</span>
            </div>
            <div className="flex justify-between px-3 py-2">
              <span className="text-slate-500">Time Horizon</span>
              <span className="font-medium text-slate-800">{dateRange.label}</span>
            </div>
            <div className="flex justify-between px-3 py-2">
              <span className="text-slate-500">Ledger & Chart Focus</span>
              <span className="font-medium text-slate-800">
                {focusLabel} · {chartMetric.replace('_', ' ')}
              </span>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <Pin className="w-3.5 h-3.5 text-slate-500" />
            Pin to quick-access strip above KPIs
          </label>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition cursor-pointer disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save View'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
