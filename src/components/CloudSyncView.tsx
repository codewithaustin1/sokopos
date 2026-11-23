import React, { useMemo, useState } from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  ShieldCheck,
  Building2,
  Database,
  CheckCircle2,
  KeyRound,
  HardDrive,
  Archive,
  Download,
  AlertTriangle,
  Search,
  Eye,
  Trash2,
  Lock,
  ShieldAlert,
  Plus,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { OutboxMutationEntry } from '../types/storage';
import { OutboxPayloadDrawer } from './cloud-sync/OutboxPayloadDrawer';
import { isSuperAdminEmail } from '../data/initialData';

type OutboxFilterTab = 'all' | 'pending' | 'dead_letter';

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const val = bytes / Math.pow(1024, idx);
  return `${val >= 100 || idx === 0 ? val.toFixed(0) : val.toFixed(1)} ${units[idx]}`;
}

function deterministicNodeLatency(code: string): number {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 31 + code.charCodeAt(i)) % 35;
  }
  return 22 + hash;
}

export const CloudSyncView: React.FC = () => {
  const {
    locations,
    currentLocation,
    isOnline,
    setIsOnline,
    syncStatus,
    lastSyncTime,
    syncLogs,
    triggerCloudSync,
    firestoreDbId,
    seedTenantDataToFirestoreAction,
    currentBusiness,
    isSuperAdmin,
    isDemoSession,
    currentUser,
    outboxItems,
    pendingOutboxCount,
    deadLetterCount,
    storageTelemetry,
    opfsSnapshots,
    retryOutboxItem,
    retryAllDeadLetterItems,
    discardOutboxItem,
    createManualOpfsSnapshot,
    verifyOpfsSnapshotIntegrity,
    downloadOpfsArchive,
    exportFullLocalStore,
  } = usePos();

  const [isSeeding, setIsSeeding] = useState(false);
  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const [isExportingStore, setIsExportingStore] = useState(false);
  const [outboxFilter, setOutboxFilter] = useState<OutboxFilterTab>('all');
  const [outboxSearch, setOutboxSearch] = useState('');
  const [inspectedEntry, setInspectedEntry] = useState<OutboxMutationEntry | null>(null);
  const [confirmDiscardId, setConfirmDiscardId] = useState<string | null>(null);
  const [verifiedSnapshots, setVerifiedSnapshots] = useState<
    Record<string, { ok: boolean; checkedAt: string; message: string }>
  >({});

  const filteredOutbox = useMemo(() => {
    const q = outboxSearch.trim().toLowerCase();
    return outboxItems.filter((item) => {
      if (outboxFilter === 'dead_letter' && item.status !== 'dead_letter') return false;
      if (outboxFilter === 'pending' && item.status === 'dead_letter') return false;
      if (!q) return true;
      return (
        (item.label || '').toLowerCase().includes(q) ||
        item.docId.toLowerCase().includes(q) ||
        item.collectionName.toLowerCase().includes(q) ||
        (item.errorCode || '').toLowerCase().includes(q) ||
        (item.lastError || '').toLowerCase().includes(q)
      );
    });
  }, [outboxItems, outboxFilter, outboxSearch]);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedTenantDataToFirestoreAction();
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCreateSnapshot = async () => {
    setIsSnapshotting(true);
    try {
      await createManualOpfsSnapshot();
    } finally {
      setIsSnapshotting(false);
    }
  };

  const handleExportStore = async () => {
    setIsExportingStore(true);
    try {
      await exportFullLocalStore();
    } finally {
      setIsExportingStore(false);
    }
  };

  const handleVerifySnapshot = async (fileName: string) => {
    const result = await verifyOpfsSnapshotIntegrity(fileName);
    setVerifiedSnapshots((prev) => ({
      ...prev,
      [fileName]: {
        ok: result.ok,
        checkedAt: new Date().toLocaleTimeString(),
        message: result.ok
          ? `SHA-256 verified (${formatBytes(result.byteSize)})`
          : `Checksum mismatch (${result.computedSha256.slice(0, 8)})`,
      },
    }));
  };

  const handleDiscardRow = async (entryId: string) => {
    if (confirmDiscardId !== entryId) {
      setConfirmDiscardId(entryId);
      return;
    }
    setConfirmDiscardId(null);
    await discardOutboxItem(entryId);
  };

  const quotaPct = Math.min(100, Math.max(0, storageTelemetry.usagePct || 0));
  const latestSnap = storageTelemetry.lastSnapshot || opfsSnapshots[0] || null;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Cloud Sync & Local Vault
          </h2>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <span>{storageTelemetry.engine}</span>
            <span aria-hidden="true">·</span>
            <span className={isOnline ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-amber-700 dark:text-amber-400 font-medium'}>
              {isOnline ? 'Cloud Pipeline Online' : 'Offline Failover Mode'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Last Sync {new Date(lastSyncTime).toLocaleTimeString()}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportStore}
            disabled={isExportingStore}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExportingStore ? 'Exporting...' : 'Export Store (.json)'}</span>
          </button>

          <button
            type="button"
            onClick={handleCreateSnapshot}
            disabled={isSnapshotting}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isSnapshotting ? 'Archiving...' : 'Create Snapshot'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsOnline(!isOnline)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border cursor-pointer whitespace-nowrap ${
              isOnline
                ? 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                : 'bg-amber-600 text-white border-amber-700 hover:bg-amber-700'
            }`}
          >
            {isOnline ? (
              <>
                <CloudOff className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Go Offline</span>
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5 text-white" />
                <span>Go Online</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => triggerCloudSync(false)}
            disabled={!isOnline || syncStatus === 'syncing'}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            <span>Flush Outbox</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6 space-y-6 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
        {/* 4-Column Storage & Outbox Telemetry Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Browser Storage Quota */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Local Terminal Quota</span>
              <HardDrive className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-1.5 text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              {formatBytes(storageTelemetry.usageBytes)}{' '}
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                / {storageTelemetry.quotaBytes > 0 ? formatBytes(storageTelemetry.quotaBytes) : '∞'}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  quotaPct > 80 ? 'bg-rose-600' : quotaPct > 55 ? 'bg-amber-500' : 'bg-blue-600'
                }`}
                style={{ width: `${Math.max(2, quotaPct)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-mono tabular-nums">
              {storageTelemetry.migratedFromLocalStorageAt
                ? `Migrated ${storageTelemetry.migratedKeysCount} legacy keys`
                : 'IndexedDB primary store active'}
            </p>
          </div>

          {/* Card 2: Pending / Retrying Outbox */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Sync Outbox Queue</span>
              <Database className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-1.5 text-lg font-bold text-slate-900 dark:text-white font-mono tabular-nums">
              {pendingOutboxCount} Queued
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              {pendingOutboxCount === 0
                ? 'All register & catalog writes replicated'
                : 'Exponential backoff retry worker active'}
            </p>
          </div>

          {/* Card 3: Dead-Letter Queue */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Dead-Letter Queue</span>
              <ShieldAlert
                className={`w-4 h-4 ${deadLetterCount > 0 ? 'text-rose-600' : 'text-slate-400'}`}
              />
            </div>
            <div
              className={`mt-1.5 text-lg font-bold font-mono tabular-nums ${
                deadLetterCount > 0
                  ? 'text-rose-700 dark:text-rose-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {deadLetterCount} Blocked
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              {deadLetterCount === 0
                ? 'Zero rejected or poisoned mutations'
                : 'Requires inspection & manual retry below'}
            </p>
          </div>

          {/* Card 4: Latest OPFS Binary Snapshot */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Latest OPFS Archive</span>
              <Archive className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-1.5 text-sm font-bold text-slate-900 dark:text-white font-mono tabular-nums truncate">
              {latestSnap ? `SHA ${latestSnap.sha256.slice(0, 12)}` : 'No Snapshot Yet'}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-mono tabular-nums truncate">
              {latestSnap
                ? `${latestSnap.trigger.replace('_', ' ')} · ${formatBytes(latestSnap.byteSize)}`
                : 'Auto-created on Shift Close or Migration'}
            </p>
          </div>
        </div>

        {/* Section 1: Outbox & Dead-Letter Queue Inspector */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Transactional Sync Outbox & Dead-Letter Inspector
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Every sale, inventory change, customer update, and BI view persists in IndexedDB until acknowledged by Firestore
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {deadLetterCount > 0 && (
                <button
                  type="button"
                  onClick={retryAllDeadLetterItems}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry All Dead-Letter ({deadLetterCount})
                </button>
              )}
            </div>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 self-start">
              {(
                [
                  { id: 'all', label: `All (${outboxItems.length})` },
                  { id: 'pending', label: `Pending & Retrying (${pendingOutboxCount})` },
                  { id: 'dead_letter', label: `Dead-Letter (${deadLetterCount})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setOutboxFilter(tab.id)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                    outboxFilter === tab.id
                      ? 'bg-slate-900 dark:bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={outboxSearch}
                onChange={(e) => setOutboxSearch(e.target.value)}
                placeholder="Filter by doc ID, collection, error..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {filteredOutbox.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {outboxItems.length === 0
                  ? 'Outbox Queue Empty'
                  : 'No outbox entries match your current filter'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {outboxItems.length === 0
                  ? 'All local IndexedDB mutations have been confirmed by Firestore.'
                  : 'Switch filter tabs or clear the search query to inspect other entries.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/30">
                      <th className="py-2.5 px-4">Mutation</th>
                      <th className="py-2.5 px-4">Operation</th>
                      <th className="py-2.5 px-4">Queue State</th>
                      <th className="py-2.5 px-4">Last Diagnostic</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {filteredOutbox.map((item) => {
                      const isDead = item.status === 'dead_letter';
                      const retryDueInSec = Math.max(
                        0,
                        Math.ceil((item.nextRetryAt - Date.now()) / 1000)
                      );
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                        >
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {item.label || item.docId}
                            </div>
                            <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              {item.collectionName}/{item.docId}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono uppercase text-[11px] text-slate-700 dark:text-slate-300">
                            {item.operation}
                          </td>
                          <td className="py-3 px-4">
                            <div
                              className={`font-semibold ${
                                isDead
                                  ? 'text-rose-700 dark:text-rose-400'
                                  : item.status === 'retry_scheduled'
                                  ? 'text-amber-700 dark:text-amber-400'
                                  : 'text-blue-700 dark:text-blue-400'
                              }`}
                            >
                              {isDead
                                ? 'Dead-Letter'
                                : item.status === 'retry_scheduled'
                                ? retryDueInSec > 0
                                  ? `Retry in ${retryDueInSec}s`
                                  : 'Retry Due'
                                : 'Pending'}
                            </div>
                            <div className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
                              Attempt {item.attempts}/{item.maxAttempts} ·{' '}
                              {new Date(item.updatedAt).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            {item.lastError ? (
                              <div className="text-[11px] text-rose-700 dark:text-rose-400 truncate font-mono">
                                {item.errorCode ? `[${item.errorCode}] ` : ''}
                                {item.lastError}
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">Awaiting flush</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setInspectedEntry(item)}
                                className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                Inspect
                              </button>
                              <button
                                type="button"
                                onClick={() => retryOutboxItem(item.id)}
                                className="px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-[11px] font-semibold text-blue-700 dark:text-blue-300 inline-flex items-center gap-1 cursor-pointer"
                              >
                                <RefreshCw className="w-3 h-3" />
                                Retry
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDiscardRow(item.id)}
                                className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ${
                                  confirmDiscardId === item.id
                                    ? 'border-rose-600 bg-rose-600 text-white'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                }`}
                              >
                                <Trash2 className="w-3 h-3" />
                                {confirmDiscardId === item.id ? 'Confirm?' : 'Discard'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Cards */}
              <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
                {filteredOutbox.map((item) => {
                  const isDead = item.status === 'dead_letter';
                  return (
                    <div key={item.id} className="p-4 space-y-2.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {item.label || item.docId}
                          </p>
                          <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {item.operation.toUpperCase()} · {item.collectionName}/{item.docId}
                          </p>
                        </div>
                        <span
                          className={`font-semibold shrink-0 ${
                            isDead
                              ? 'text-rose-700 dark:text-rose-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {isDead ? 'Dead-Letter' : 'Retrying'}
                        </span>
                      </div>

                      {item.lastError && (
                        <p className="text-[11px] font-mono text-rose-700 dark:text-rose-400 break-words">
                          {item.lastError}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <span className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
                          Attempt {item.attempts}/{item.maxAttempts}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectedEntry(item)}
                            className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            Inspect
                          </button>
                          <button
                            type="button"
                            onClick={() => retryOutboxItem(item.id)}
                            className="px-2.5 py-1 rounded-md bg-blue-600 text-white text-[11px] font-semibold cursor-pointer"
                          >
                            Retry
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDiscardRow(item.id)}
                            className="px-2.5 py-1 rounded-md border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-[11px] font-semibold cursor-pointer"
                          >
                            {confirmDiscardId === item.id ? 'Confirm?' : 'Discard'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* Section 2: OPFS Binary Snapshot Vault */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                OPFS Binary Snapshot Vault
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Compressed SHA-256 verified store archives stored locally in Origin Private File System (opfs:/sokopos-snapshots/)
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              <span>{opfsSnapshots.length} / 12 Retained</span>
            </div>
          </div>

          {!storageTelemetry.opfsSupported && (
            <div className="px-4 sm:px-5 py-3 border-b border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Origin Private File System (OPFS) is unavailable in this browser context; IndexedDB remains active and one-click JSON store export works normally.
              </span>
            </div>
          )}

          {opfsSnapshots.length === 0 ? (
            <div className="p-8 text-center">
              <Archive className="w-7 h-7 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No OPFS Binary Snapshots Recorded Yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Snapshots generate automatically on Shift Close and legacy migration, or click Create Snapshot above.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {opfsSnapshots.map((snap) => {
                const verifyState = verifiedSnapshots[snap.fileName];
                return (
                  <div
                    key={snap.fileName}
                    className="px-4 sm:px-5 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white break-all">
                          {snap.fileName}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 capitalize">
                          · {snap.trigger.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        <span>{new Date(snap.createdAt).toLocaleString()}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {formatBytes(snap.byteSize)} ({snap.compression === 'gzip' ? 'gzip' : 'json'} from{' '}
                          {formatBytes(snap.uncompressedSize)})
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {snap.recordCounts.products} SKUs / {snap.recordCounts.transactions} sales /{' '}
                          {snap.recordCounts.shifts} shifts
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>SHA-256: {snap.sha256.slice(0, 14)}…</span>
                      </div>
                      {verifyState && (
                        <p
                          className={`text-[11px] font-mono ${
                            verifyState.ok
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {verifyState.message} · checked {verifyState.checkedAt}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleVerifySnapshot(snap.fileName)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Verify Integrity
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadOpfsArchive(snap.fileName)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 3: Multi-Location Node Status Mesh */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Store Node Synchronization Mesh
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Branch heartbeat, terminal status, and catalog synchronization across active locations
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {locations.length} Branch Node{locations.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {locations.map((loc) => {
              const isCurrent = loc.id === currentLocation.id;
              return (
                <div
                  key={loc.id}
                  className={`p-4 rounded-xl border transition ${
                    isCurrent
                      ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <h4 className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                        {loc.name}
                      </h4>
                    </div>
                    <span
                      className={`text-[11px] font-semibold shrink-0 ${
                        loc.isOnline && isOnline
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {loc.isOnline && isOnline ? 'Online' : 'Buffered'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <div className="flex justify-between">
                      <span>Node Code</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {loc.code}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Terminal</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {loc.terminalName.split(' ')[0]}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Latency</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                        {loc.isOnline && isOnline
                          ? `${deterministicNodeLatency(loc.code || loc.id)} ms`
                          : 'Offline'}
                      </span>
                    </div>
                  </div>

                  {isCurrent && (
                    <div className="mt-3 pt-2 border-t border-blue-200/70 dark:border-blue-900/60 text-[11px] text-blue-700 dark:text-blue-400 font-semibold flex items-center justify-between">
                      <span>Active Terminal</span>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 4: Firestore Multi-Tenant RLS Hub */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Firestore Multi-Tenant Row-Level Security (RLS)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tenant isolation enforced at database level · Signed-in mutations scoped by authenticated businessId
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSeed}
              disabled={isSeeding}
              className="bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
              <span>{isSeeding ? 'Verifying...' : 'Seed / Re-verify Firestore'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
            <div className="p-3.5">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                Database Target
              </span>
              <div className="font-mono text-xs font-semibold text-slate-900 dark:text-white mt-1 break-all">
                {firestoreDbId}
              </div>
            </div>

            <div className="p-3.5">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                Active Tenant Scope
              </span>
              <div className="text-xs font-semibold text-slate-900 dark:text-white mt-1">
                {currentBusiness?.name || 'Unknown Tenant'}
              </div>
              <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {currentBusiness?.id}
              </div>
            </div>

            <div className="p-3.5">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                Session Authority
              </span>
              <div className="text-xs font-semibold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">
                  {currentUser
                    ? isSuperAdminEmail(currentUser.email)
                      ? 'support@sokopos.co.ke'
                      : currentUser.email
                    : 'Local Staff Terminal'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Role:{' '}
                {currentUser?.role === 'super_admin' || isSuperAdmin
                  ? isDemoSession
                    ? 'Store Manager'
                    : 'Platform Support'
                  : currentUser?.role || 'cashier'}
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Sync Audit Event Log */}
        <section className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Cloud Replication Audit Stream
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Recent sales replications, stock adjustments, and branch transfers
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {syncLogs.length} Events
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {syncLogs.slice(0, 20).map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                <div className="min-w-0">
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    {log.details}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
                    <span className="font-sans font-medium text-slate-600 dark:text-slate-300">
                      {log.locationName}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize font-sans">{log.type.replace('_', ' ')}</span>
                    <span aria-hidden="true">·</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>

                <span className="shrink-0 font-mono text-[11px] font-semibold uppercase text-emerald-700 dark:text-emerald-400">
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Outbox Mutation Payload Inspector Drawer */}
      <OutboxPayloadDrawer
        entry={inspectedEntry}
        onClose={() => setInspectedEntry(null)}
        onRetry={retryOutboxItem}
        onDiscard={discardOutboxItem}
      />
    </div>
  );
};
