import React, { useEffect, useState } from 'react';
import {
  X,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Clock,
  Database,
} from 'lucide-react';
import { OutboxMutationEntry } from '../../types/storage';

interface OutboxPayloadDrawerProps {
  entry: OutboxMutationEntry | null;
  onClose: () => void;
  onRetry: (entryId: string) => Promise<void>;
  onDiscard: (entryId: string) => Promise<void>;
}

export const OutboxPayloadDrawer: React.FC<OutboxPayloadDrawerProps> = ({
  entry,
  onClose,
  onRetry,
  onDiscard,
}) => {
  const [copied, setCopied] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => {
    setCopied(false);
    setConfirmDiscard(false);
    setIsRetrying(false);
  }, [entry?.id]);

  useEffect(() => {
    if (!entry) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [entry, onClose]);

  if (!entry) return null;

  const formattedJson = JSON.stringify(entry.payload ?? {}, null, 2);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(formattedJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignored silently
    }
  };

  const handleRetryClick = async () => {
    setIsRetrying(true);
    try {
      await onRetry(entry.id);
      onClose();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDiscardClick = async () => {
    if (!confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    await onDiscard(entry.id);
    onClose();
  };

  const statusColorClass =
    entry.status === 'dead_letter'
      ? 'text-rose-700 dark:text-rose-400'
      : entry.status === 'retry_scheduled'
      ? 'text-amber-700 dark:text-amber-400'
      : 'text-blue-700 dark:text-blue-400';

  const statusLabel =
    entry.status === 'dead_letter'
      ? 'Dead-Letter Blocked'
      : entry.status === 'retry_scheduled'
      ? 'Retry Scheduled'
      : entry.status === 'in_flight'
      ? 'In Flight'
      : 'Pending Queue';

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="fixed inset-0 bg-slate-900/35 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        aria-label="Outbox Mutation Payload Inspector"
        className="relative z-10 w-full max-w-[460px] bg-white dark:bg-slate-900 h-full border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-150"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 uppercase">
                {entry.operation}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{entry.collectionName}</span>
              <span aria-hidden="true">·</span>
              <span className={`font-semibold ${statusColorClass}`}>{statusLabel}</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 leading-snug break-words">
              {entry.label || entry.docId}
            </h3>
            <p className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              docId: {entry.docId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer shrink-0"
            aria-label="Close mutation inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Flat 3-column metrics strip */}
          <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/70 dark:bg-slate-950/60">
            <div className="p-3">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Attempts</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white font-mono tabular-nums mt-0.5">
                {entry.attempts} / {entry.maxAttempts}
              </p>
            </div>
            <div className="p-3">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Error Code</p>
              <p className="text-xs font-bold text-slate-900 dark:text-white font-mono truncate mt-1">
                {entry.errorCode || '—'}
              </p>
            </div>
            <div className="p-3">
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Next Retry</p>
              <p className="text-xs font-bold text-slate-900 dark:text-white font-mono tabular-nums mt-1">
                {entry.status === 'dead_letter'
                  ? 'Halted'
                  : entry.nextRetryAt > Date.now()
                  ? `${Math.ceil((entry.nextRetryAt - Date.now()) / 1000)}s`
                  : 'Due now'}
              </p>
            </div>
          </div>

          {entry.lastError && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-rose-200 dark:border-rose-900/70 bg-rose-50/70 dark:bg-rose-950/30 text-xs text-rose-800 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <div className="min-w-0">
                <p className="font-semibold">Last Replication Diagnostic</p>
                <p className="font-mono text-[11px] mt-1 break-words leading-relaxed">
                  {entry.lastError}
                </p>
              </div>
            </div>
          )}

          {/* Timestamps & Scope */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            <div className="flex justify-between px-3 py-2 gap-3">
              <span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> Business Scope
              </span>
              <span className="font-mono text-slate-800 dark:text-slate-200 truncate">
                {entry.businessId}
              </span>
            </div>
            <div className="flex justify-between px-3 py-2 gap-3">
              <span className="text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Queued At
              </span>
              <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                {new Date(entry.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between px-3 py-2 gap-3">
              <span className="text-slate-500 dark:text-slate-400">Updated At</span>
              <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                {new Date(entry.updatedAt).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Payload JSON */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Serialized Mutation Payload
              </h4>
              <button
                type="button"
                onClick={handleCopyJson}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    Copied JSON
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy JSON
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-80 leading-relaxed">
              {formattedJson}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDiscardClick}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              confirmDiscard
                ? 'border-rose-600 bg-rose-600 text-white hover:bg-rose-700'
                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-700 dark:text-rose-400'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {confirmDiscard ? 'Confirm Discard Entry' : 'Discard Entry'}
          </button>

          <button
            type="button"
            onClick={handleRetryClick}
            disabled={isRetrying}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying...' : 'Retry Mutation Now'}
          </button>
        </div>
      </aside>
    </div>
  );
};
