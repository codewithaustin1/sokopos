import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { usePos } from '../../context/PosContext';

export const ForeignOutboxWarningBanner: React.FC = () => {
  const {
    currentUser,
    isDemoSession,
    foreignOutboxSummary,
    dismissForeignOutboxWarning,
  } = usePos();

  if (
    !currentUser ||
    isDemoSession ||
    !foreignOutboxSummary ||
    foreignOutboxSummary.dismissed ||
    foreignOutboxSummary.count <= 0
  ) {
    return null;
  }

  const storeCount = foreignOutboxSummary.businessIds.length;
  const itemLabel = foreignOutboxSummary.count === 1 ? 'record' : 'records';
  const storeLabel = storeCount === 1 ? 'another store' : `${storeCount} other stores`;

  return (
    <div
      id="foreign-outbox-warning-banner"
      role="status"
      aria-live="polite"
      className="px-4 py-2 text-xs border-b border-amber-200 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-950/50 text-amber-950 dark:text-amber-100 shrink-0 z-20 flex flex-wrap items-center justify-between gap-2"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
          <span className="font-semibold">Offline Outbox Isolated</span>
          <span aria-hidden="true" className="opacity-40">
            ·
          </span>
          <span>
            <span className="font-mono tabular-nums font-semibold">
              {foreignOutboxSummary.count}
            </span>{' '}
            unsynced {itemLabel} from {storeLabel} safely preserved locally and paused until that
            account signs back in.
          </span>
        </div>
      </div>

      <button
        type="button"
        id="btn-dismiss-foreign-outbox-warning"
        onClick={dismissForeignOutboxWarning}
        aria-label="Dismiss offline outbox notice"
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 font-medium transition cursor-pointer shrink-0"
      >
        <span>Dismiss</span>
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
