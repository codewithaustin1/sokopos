import React from 'react';
import { RefreshCw, X } from 'lucide-react';
import {
  applyPwaUpdate,
  dismissPwaUpdate,
  usePwaUpdateState,
} from '../../lib/pwaUpdateStore';

export const PwaUpdateBanner: React.FC = () => {
  const { needsRefresh, isUpdating } = usePwaUpdateState();

  if (!needsRefresh) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 sm:bottom-5 left-4 z-[125] w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-blue-200 dark:border-blue-800 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 shadow-xl backdrop-blur-md p-3.5 flex items-start gap-3"
    >
      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/70 border border-blue-200/80 dark:border-blue-800/70 flex items-center justify-center shrink-0 mt-0.5">
        <RefreshCw className={`w-4 h-4 text-blue-600 dark:text-blue-400 ${isUpdating ? 'animate-spin' : ''}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
          App update available
        </p>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
          A new version is ready. Finish any active sale before refreshing.
        </p>
        <div className="flex items-center gap-2 mt-2.5">
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => {
              void applyPwaUpdate();
            }}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            {isUpdating ? 'Updating...' : 'Update Now'}
          </button>
          <button
            type="button"
            disabled={isUpdating}
            onClick={dismissPwaUpdate}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Later
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismissPwaUpdate}
        aria-label="Dismiss update notification"
        className="p-1 -mr-1 -mt-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
