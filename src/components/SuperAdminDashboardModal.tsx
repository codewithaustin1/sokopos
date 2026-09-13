import React, { useState } from 'react';
import {
  ShieldAlert,
  Building2,
  FileText,
  PlusCircle,
  X,
  CheckCircle2,
  ExternalLink,
  Search,
  Database,
  Calendar,
  User,
  ArrowRight,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { Business } from '../types';

interface SuperAdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'tenants' | 'audit' | 'provision';
}

export const SuperAdminDashboardModal: React.FC<SuperAdminDashboardModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'tenants',
}) => {
  const {
    businesses,
    activeBusinessId,
    setActiveBusinessId,
    superAdminAuditLogs,
    provisionBusiness,
    currentUser,
  } = usePos();

  const [activeTab, setActiveTab] = useState<'tenants' | 'audit' | 'provision'>(defaultTab);

  // Search filter for audit log
  const [auditFilter, setAuditFilter] = useState('');
  const [selectedAuditEntry, setSelectedAuditEntry] = useState<string | null>(null);

  // Provisioning Form State
  const [newBizName, setNewBizName] = useState('');
  const [newBizOwnerEmail, setNewBizOwnerEmail] = useState('');
  const [newBizOwnerName, setNewBizOwnerName] = useState('');
  const [newBizPlan, setNewBizPlan] = useState<'starter' | 'professional' | 'enterprise'>('professional');

  if (!isOpen) return null;

  const handleProvisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBizName.trim() || !newBizOwnerEmail.trim()) return;

    provisionBusiness(
      newBizName.trim(),
      newBizOwnerEmail.trim(),
      newBizOwnerName.trim() || 'Business Owner',
      newBizPlan
    );

    setNewBizName('');
    setNewBizOwnerEmail('');
    setNewBizOwnerName('');
    setActiveTab('tenants');
  };

  const filteredAuditLogs = superAdminAuditLogs.filter((entry) => {
    if (!auditFilter) return true;
    const q = auditFilter.toLowerCase();
    return (
      entry.businessName.toLowerCase().includes(q) ||
      entry.businessId.toLowerCase().includes(q) ||
      entry.action.toLowerCase().includes(q) ||
      entry.description.toLowerCase().includes(q) ||
      entry.recordType.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-5xl h-[88vh] rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 text-slate-950 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">Platform Super-Admin Oversight</h2>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                  ROOT PRIVILEGES
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-tenant provisioning, cross-business isolation control & write audit ledger
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 flex items-center gap-4 text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab('tenants')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'tenants'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Business Tenants ({businesses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'audit'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Super-Admin Write Audit Log ({superAdminAuditLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('provision')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition ${
              activeTab === 'provision'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Provision Business Account</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {/* TAB 1: ALL BUSINESS TENANTS */}
          {activeTab === 'tenants' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800">Managed Business Tenants</h3>
                  <p className="text-xs text-slate-400">
                    Each tenant is strictly isolated with independent product catalogs, locations, sales, and system users.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('provision')}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Provision New Tenant</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {businesses.map((biz) => {
                  const isActive = biz.id === activeBusinessId;
                  return (
                    <div
                      key={biz.id}
                      className={`bg-white rounded-2xl p-5 border transition shadow-2xs ${
                        isActive
                          ? 'border-blue-600 ring-2 ring-blue-600/10'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              {biz.code}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                              {biz.plan}
                            </span>
                          </div>
                          <h4 className="font-black text-base text-slate-900 mt-1.5">{biz.name}</h4>
                        </div>
                        {isActive ? (
                          <span className="flex items-center gap-1 bg-blue-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active Scope
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setActiveBusinessId(biz.id);
                              onClose();
                            }}
                            className="text-xs font-bold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-xl transition cursor-pointer"
                          >
                            Switch to Tenant
                          </button>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Google Account Owner:</span>
                          <span className="font-bold text-slate-800">{biz.ownerEmail}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Owner Name:</span>
                          <span className="font-medium text-slate-700">{biz.ownerName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Tax PIN (KRA):</span>
                          <span className="font-mono text-slate-700">{biz.taxNumber}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Tenant ID:</span>
                          <span className="font-mono text-[11px] text-slate-400">{biz.id}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: SUPER-ADMIN WRITE AUDIT LOG */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-800">
                    Super-Admin Write Audit Ledger
                  </h3>
                  <p className="text-xs text-slate-400">
                    Mandatory audit trail: Every super-admin write across any business is cryptographically logged with before/after snapshots.
                  </p>
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={auditFilter}
                    onChange={(e) => setAuditFilter(e.target.value)}
                    placeholder="Filter audit events..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 font-medium w-full sm:w-64"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredAuditLogs.map((entry) => {
                  const isExpanded = selectedAuditEntry === entry.id;
                  return (
                    <div
                      key={entry.id}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs text-xs"
                    >
                      <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-amber-50 text-amber-700 rounded-lg mt-0.5 shrink-0">
                            <Database className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-900">{entry.description}</span>
                              <span className="bg-slate-100 text-slate-700 font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                {entry.action}
                              </span>
                              <span className="bg-blue-50 text-blue-700 font-bold text-[10px] px-2 py-0.5 rounded">
                                {entry.recordType}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                              <span className="font-bold text-slate-700">{entry.businessName}</span>
                              <span>•</span>
                              <span>Admin: {entry.adminEmail}</span>
                              <span>•</span>
                              <span>{new Date(entry.timestamp).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedAuditEntry(isExpanded ? null : entry.id)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 transition underline shrink-0 cursor-pointer"
                        >
                          {isExpanded ? 'Hide Values Diff' : 'View Before/After Snapshot'}
                        </button>
                      </div>

                      {/* Expandable JSON Before / After Diff */}
                      {isExpanded && (
                        <div className="bg-slate-900 text-slate-200 p-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[11px]">
                          <div>
                            <span className="text-amber-400 font-bold block mb-1">
                              BEFORE VALUE (Snapshot):
                            </span>
                            <pre className="bg-slate-950 p-2.5 rounded-lg overflow-x-auto max-h-48">
                              {entry.beforeValue
                                ? JSON.stringify(entry.beforeValue, null, 2)
                                : '(null - record created)'}
                            </pre>
                          </div>
                          <div>
                            <span className="text-emerald-400 font-bold block mb-1">
                              AFTER VALUE (Snapshot):
                            </span>
                            <pre className="bg-slate-950 p-2.5 rounded-lg overflow-x-auto max-h-48">
                              {entry.afterValue
                                ? JSON.stringify(entry.afterValue, null, 2)
                                : '(null - record deleted)'}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: PROVISION BUSINESS FORM */}
          {activeTab === 'provision' && (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs">
              <div className="mb-5">
                <h3 className="text-base font-black text-slate-800">
                  Provision New Business Tenant
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Associates a new enterprise tenant with a designated Google Account. The owner will gain administrative ownership upon signing in with Google.
                </p>
              </div>

              <form onSubmit={handleProvisionSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Business / Store Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newBizName}
                    onChange={(e) => setNewBizName(e.target.value)}
                    placeholder="e.g. Coastline Supermarkets Ltd"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Business Owner Google Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={newBizOwnerEmail}
                      onChange={(e) => setNewBizOwnerEmail(e.target.value)}
                      placeholder="e.g. owner@coastlinesuper.com"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-medium"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Must match their Google Account login
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Owner Full Name
                    </label>
                    <input
                      type="text"
                      value={newBizOwnerName}
                      onChange={(e) => setNewBizOwnerName(e.target.value)}
                      placeholder="e.g. Hassan Mohamed"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subscription Tier Plan
                  </label>
                  <select
                    value={newBizPlan}
                    onChange={(e) => setNewBizPlan(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-bold bg-white"
                  >
                    <option value="starter">Starter (Single Store, 2 Terminals)</option>
                    <option value="professional">Professional (Multi-Branch, Unlimited Cloud Sync)</option>
                    <option value="enterprise">Enterprise (Cross-Region, Dedicated SLA)</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('tenants')}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Provision Tenant & Assign Google Owner</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
