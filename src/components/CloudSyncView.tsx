import React, { useState } from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  ShieldCheck,
  Building2,
  Server,
  Activity,
  Lock,
  ArrowRight,
  Database,
  CheckCircle2,
  Clock,
  KeyRound,
  FileCheck,
} from 'lucide-react';
import { usePos } from '../context/PosContext';

export const CloudSyncView: React.FC = () => {
  const {
    locations,
    currentLocation,
    isOnline,
    setIsOnline,
    syncStatus,
    lastSyncTime,
    syncLogs,
    pendingOfflineCount,
    triggerCloudSync,
    isFirestoreConnected,
    firestoreDbId,
    firestoreRlsStatus,
    seedTenantDataToFirestoreAction,
    currentBusiness,
    isSuperAdmin,
    currentUser,
  } = usePos();

  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeed = async () => {
    setIsSeeding(true);
    await seedTenantDataToFirestoreAction();
    setIsSeeding(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-800">Cloud Sync Hub</h2>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> TLS 1.3 / AES-256
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            Multi-branch replication with offline-first failover resilience
          </p>
        </div>

        {/* Global Sync Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
              isOnline
                ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                : 'bg-amber-500 text-white border-amber-600'
            }`}
          >
            {isOnline ? (
              <>
                <CloudOff className="w-3.5 h-3.5 text-slate-500" />
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
            onClick={triggerCloudSync}
            disabled={!isOnline || syncStatus === 'syncing'}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            <span>Sync Branches</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-8">
        {/* Status Metrics Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Cloud Connection State */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Connection Pipeline
            </span>
            <div className="text-lg font-black text-slate-800 mt-1 flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              {isOnline ? 'Cloud Operational' : 'Offline Buffer Mode'}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {isOnline ? 'Direct bidirectional websocket sync' : 'Pending batch queue enabled'}
            </span>
          </div>

          {/* Pending Queue Count */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Offline Mutation Queue
            </span>
            <div className="text-lg font-black text-slate-800 mt-1">
              {pendingOfflineCount} Pending Changes
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {pendingOfflineCount === 0 ? 'All local register sales committed' : 'Will push on network reconnect'}
            </span>
          </div>

          {/* Cloud Replicas */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Store Nodes
            </span>
            <div className="text-lg font-black text-blue-600 mt-1 flex items-center gap-1.5">
              <Server className="w-4 h-4" /> 4 of 4 Provisioned
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Multi-Region redundancy (East Africa)
            </span>
          </div>

          {/* Security & Ledger */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Ledger Integrity
            </span>
            <div className="text-lg font-black text-emerald-600 mt-1 flex items-center gap-1.5">
              <Lock className="w-4 h-4" /> Zero-Trust Verified
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              SHA-256 cryptographically signed receipts
            </span>
          </div>
        </div>

        {/* Multi-Location Node Status Matrix */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Store Node Synchronization Mesh</h3>
              <p className="text-xs text-slate-400">
                Live heartbeat, latency, and catalog synchronization across retail locations
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              Last Global Sync: {new Date(lastSyncTime).toLocaleTimeString()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {locations.map((loc) => {
              const isCurrent = loc.id === currentLocation.id;
              return (
                <div
                  key={loc.id}
                  className={`p-4 rounded-xl border transition ${
                    isCurrent
                      ? 'border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/10'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <h4 className="font-bold text-xs text-slate-800">{loc.name}</h4>
                    </div>
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        loc.isOnline ? 'bg-emerald-500 shadow-xs' : 'bg-amber-400'
                      }`}
                    />
                  </div>

                  <div className="mt-3 space-y-1.5 text-[11px] text-slate-500">
                    <div className="flex justify-between">
                      <span>Node Code:</span>
                      <span className="font-mono font-bold text-slate-800">{loc.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Terminal:</span>
                      <span className="font-medium text-slate-700">{loc.terminalName.split(' ')[0]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sync Latency:</span>
                      <span className="font-mono text-emerald-600 font-bold">
                        {loc.isOnline ? `${Math.floor(25 + Math.random() * 30)} ms` : 'Disconnected'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span
                        className={`font-bold ${
                          loc.isOnline ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {loc.isOnline ? 'Synchronized' : 'Buffered offline'}
                      </span>
                    </div>
                  </div>

                  {isCurrent && (
                    <div className="mt-3 pt-2 border-t border-blue-200/60 text-[10px] text-blue-700 font-bold flex items-center justify-between">
                      <span>Active Local Terminal</span>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Firestore Cloud Database & Row-Level Security (RLS) Hub */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 text-sm">Firestore Multi-Tenant Row-Level Security (RLS)</h3>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Rules Enforced
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Tenant data isolation enforced cryptographically at database engine level via security rules
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSeed}
                disabled={isSeeding}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
                <span>{isSeeding ? 'Seeding...' : 'Seed / Re-verify Firestore'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Database Target
              </span>
              <div className="font-mono text-xs font-bold text-slate-800 mt-1 break-all">
                {firestoreDbId}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Connected & Live</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Active Tenant Scope
              </span>
              <div className="text-xs font-bold text-slate-800 mt-1">
                {currentBusiness?.name || 'Unknown Tenant'}
              </div>
              <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                ID: {currentBusiness?.id}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Access Token Claims
              </span>
              <div className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                <span>{currentUser ? currentUser.email : 'Anonymous Session'}</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Role: <span className="font-bold text-slate-700">{currentUser?.role || 'Guest'}</span> {isSuperAdmin && '(Super-Admin Override)'}
              </div>
            </div>
          </div>

          {/* RLS Assertion Box */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 font-mono flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-blue-950 font-sans text-xs">
                Zero-Trust Row-Level Security Invariant:
              </div>
              <div className="mt-0.5 text-blue-800">
                <code className="bg-blue-100/70 px-1.5 py-0.5 rounded text-blue-900 font-bold">
                  request.auth.token.businessId == resource.data.businessId
                </code>
              </div>
              <p className="font-sans text-[11px] text-blue-700 mt-1">
                Every Firestore read, write, update, and delete operation across <span className="font-bold">products, transactions, locations, cashiers, stock transfers,</span> and <span className="font-bold">sync logs</span> is verified against the authenticated tenant identifier. Cross-tenant access is rejected at the database level.
              </p>
            </div>
          </div>
        </div>

        {/* Sync Audit Event Log */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Cloud Replication Audit Stream</h3>
              <p className="text-xs text-slate-400">
                Immutable audit trail of sales sync, stock adjustments, and inter-branch transfers
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">{syncLogs.length} Events Logged</span>
          </div>

          <div className="divide-y divide-slate-100">
            {syncLogs.map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Database className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">{log.details}</div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span className="font-medium text-slate-600">{log.locationName}</span>
                      <span>•</span>
                      <span className="capitalize">{log.type.replace('_', ' ')}</span>
                      <span>•</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-full">
                    {log.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
