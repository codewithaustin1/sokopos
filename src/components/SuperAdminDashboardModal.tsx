import React, { useState, useEffect, useRef } from 'react';
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
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
  Link as LinkIcon,
  Lock,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { Business } from '../types';
import { processAndOptimizeImage } from '../utils/imageOptimizer';

interface SuperAdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'tenants' | 'audit' | 'provision' | 'branding';
}

const BRANDING_PRESETS = [
  {
    id: 'preset-hypermarket',
    name: 'Modern Hypermarket',
    tag: 'Retail Flagship',
    url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=1920&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=300&auto=format&fit=crop',
  },
  {
    id: 'preset-night-market',
    name: 'Evening City Market',
    tag: 'Warm & Vibrant',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1920&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=300&auto=format&fit=crop',
  },
  {
    id: 'preset-minimal-store',
    name: 'Minimal Luxury Store',
    tag: 'Crisp Architectural',
    url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1920&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=300&auto=format&fit=crop',
  },
  {
    id: 'preset-tech-carbon',
    name: 'Digital High-Tech Hub',
    tag: 'Geometric Dark',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1920&auto=format&fit=crop',
    thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=300&auto=format&fit=crop',
  },
];

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
    loginBgGraphic,
    loginBgGraphicName,
    setLoginBgGraphic,
    removeLoginBgGraphic,
  } = usePos();

  const [activeTab, setActiveTab] = useState<'tenants' | 'audit' | 'provision' | 'branding'>(defaultTab);

  useEffect(() => {
    if (isOpen && defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  // Branding upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [isApplyingUrl, setIsApplyingUrl] = useState(false);

  // Search filter for audit log
  const [auditFilter, setAuditFilter] = useState('');
  const [selectedAuditEntry, setSelectedAuditEntry] = useState<string | null>(null);

  // Provisioning Form State
  const [newBizName, setNewBizName] = useState('');
  const [newBizOwnerEmail, setNewBizOwnerEmail] = useState('');
  const [newBizOwnerName, setNewBizOwnerName] = useState('');
  const [newBizPlan, setNewBizPlan] = useState<'starter' | 'professional' | 'enterprise'>('professional');

  const handleProcessFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP, SVG).');
      return;
    }
    setUploadError(null);
    setIsProcessingImage(true);
    try {
      const optimized = await processAndOptimizeImage(file, 1920, 1080, 0.85);
      await setLoginBgGraphic(optimized, file.name);
    } catch (err: any) {
      console.error('Failed to process image:', err);
      setUploadError(err.message || 'Failed to process and optimize image. Please try another file.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleApplyCustomUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = customUrlInput.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:image/')) {
      setUploadError('Please enter a valid HTTP or HTTPS image URL.');
      return;
    }
    setUploadError(null);
    setIsApplyingUrl(true);
    try {
      await setLoginBgGraphic(url, 'Web Image URL');
      setCustomUrlInput('');
    } catch (err: any) {
      setUploadError('Could not apply image URL.');
    } finally {
      setIsApplyingUrl(false);
    }
  };

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

          <button
            id="superadmin-tab-branding-btn"
            onClick={() => setActiveTab('branding')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeTab === 'branding'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Login Page Graphic</span>
            {loginBgGraphic && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Custom Graphic Active" />
            )}
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

          {/* TAB 4: LOGIN PAGE FULL-BLEED BACKGROUND GRAPHIC */}
          {activeTab === 'branding' && (
            <div className="space-y-6">
              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">
                      POS Terminal Login Page Background Graphic
                    </h3>
                    {loginBgGraphic ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                        Custom Graphic Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        Default Dark Style (No Graphic)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                    Upload a custom background graphic to render full-bleed on the POS terminal sign-in page, replacing the default solid dark slate style. Removing the graphic instantly restores the original default design.
                  </p>
                </div>

                {loginBgGraphic && (
                  <button
                    id="remove-login-bg-top-btn"
                    type="button"
                    onClick={() => removeLoginBgGraphic()}
                    className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition cursor-pointer shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Revert to Default Appearance</span>
                  </button>
                )}
              </div>

              {/* Error Alert */}
              {uploadError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-red-800">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{uploadError}</div>
                  <button
                    onClick={() => setUploadError(null)}
                    className="text-red-600 hover:text-red-800 font-bold ml-2 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Main Grid: Upload & Presets (Left) + Interactive Live Preview (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Upload Control, URL Form & Presets (7 cols) */}
                <div className="lg:col-span-7 space-y-5">
                  {/* The Upload Control (Drag & Drop + File Selector) */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <UploadCloud className="w-4 h-4 text-blue-600" />
                        <span>Upload Custom Background Graphic</span>
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium">
                        PNG, JPG, WebP, SVG (1080p recommended)
                      </span>
                    </div>

                    <input
                      id="login-bg-file-input"
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />

                    <div
                      id="login-bg-dropzone"
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer flex flex-col items-center justify-center gap-3 ${
                        isDragging
                          ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
                          : isProcessingImage
                          ? 'border-slate-300 bg-slate-50 pointer-events-none'
                          : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50/80 bg-slate-50/40'
                      }`}
                    >
                      {isProcessingImage ? (
                        <>
                          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">
                              Optimizing & Compressing Graphic...
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Generating high-performance full-bleed asset for cloud & local cache
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-inner">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">
                              Click to browse or drag and drop image here
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Renders full-bleed across the entire sign-in viewport
                            </p>
                          </div>
                          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition">
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>Select Image File</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Direct Image URL input */}
                    <div className="pt-2 border-t border-slate-100">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                        Or enter an external Image / Asset URL:
                      </label>
                      <form onSubmit={handleApplyCustomUrl} className="flex gap-2">
                        <div className="relative flex-1">
                          <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="url"
                            value={customUrlInput}
                            onChange={(e) => setCustomUrlInput(e.target.value)}
                            placeholder="https://images.unsplash.com/... or brand asset URL"
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-medium bg-white"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isApplyingUrl || !customUrlInput.trim()}
                          className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          {isApplyingUrl ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Apply URL</span>
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Current Active Graphic Status / Controls */}
                  {loginBgGraphic ? (
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-14 h-10 rounded-lg overflow-hidden border border-emerald-300 bg-slate-900 shrink-0 shadow-xs">
                          <img
                            src={loginBgGraphic}
                            alt="Current Login Background"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-emerald-900 truncate">
                              {loginBgGraphicName || 'Custom Login Background Graphic'}
                            </span>
                            <span className="bg-emerald-200/60 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                              Active
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            Rendering as full-bleed background on POS sign-in terminal
                          </p>
                        </div>
                      </div>

                      <button
                        id="remove-login-bg-card-btn"
                        type="button"
                        onClick={() => removeLoginBgGraphic()}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-red-700 bg-white hover:bg-red-50 border border-red-200 transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove & Revert</span>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex items-center justify-between text-xs text-slate-600">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs border border-slate-800 font-bold">
                          #02
                        </div>
                        <div>
                          <span className="font-bold text-slate-800">Default Dark Style Active</span>
                          <p className="text-[11px] text-slate-500">Solid dark slate background (#020617)</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">No graphic applied</span>
                    </div>
                  )}

                  {/* Curated Enterprise Retail Graphic Presets */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Or Select a Curated Retail Preset</span>
                      </h4>
                      <span className="text-[11px] text-slate-400 font-medium">1-click instant preview</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {BRANDING_PRESETS.map((preset) => {
                        const isSelected = loginBgGraphic === preset.url;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setLoginBgGraphic(preset.url, preset.name)}
                            className={`group relative rounded-xl overflow-hidden border text-left transition cursor-pointer p-2 flex items-center gap-3 ${
                              isSelected
                                ? 'border-blue-600 ring-2 ring-blue-600/20 bg-blue-50/50'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white'
                            }`}
                          >
                            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-200/80 bg-slate-900">
                              <img
                                src={preset.thumbnail}
                                alt={preset.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-xs text-slate-800 truncate">
                                  {preset.name}
                                </span>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                )}
                              </div>
                              <span className="text-[10px] font-medium text-slate-400 block truncate">
                                {preset.tag}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Interactive Mockup (5 cols) */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-blue-600" />
                      <span>Live Sign-In View Simulation</span>
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      16:9 Kiosk View
                    </span>
                  </div>

                  {/* Scaled Kiosk Frame */}
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl aspect-[16/10] flex flex-col justify-between select-none">
                    {/* Background Layer */}
                    <div
                      className={`absolute inset-0 transition-all duration-300 ${
                        loginBgGraphic ? '' : 'bg-slate-950'
                      }`}
                      style={
                        loginBgGraphic
                          ? {
                              backgroundImage: `url(${loginBgGraphic})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }
                          : undefined
                      }
                    />

                    {/* Dimming overlay if graphic is set */}
                    {loginBgGraphic && (
                      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]" />
                    )}

                    {/* Simulated Top Bar */}
                    <div className="relative z-10 px-3 py-2 border-b border-white/10 bg-slate-950/60 backdrop-blur-md flex items-center justify-between text-white">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center font-black text-[10px]">
                          S
                        </div>
                        <span className="text-[11px] font-bold tracking-tight">SokoPoS</span>
                        <span className="text-[8px] font-bold px-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          PRO
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Terminal Ready</span>
                      </div>
                    </div>

                    {/* Simulated Centered Login Card */}
                    <div className="relative z-10 flex items-center justify-center p-3 my-auto">
                      <div className="w-52 rounded-xl p-3 border shadow-2xl text-center bg-slate-900/90 border-slate-700/60 backdrop-blur-xl">
                        <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 mb-1.5">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-[11px] font-black text-white leading-tight">
                          Log In to POS Terminal
                        </div>
                        <div className="text-[8px] text-slate-400 mb-2">
                          Smart Retail & Business Management
                        </div>

                        <div className="w-full py-1.5 px-2 rounded-lg bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center gap-1 shadow-xs">
                          <span>Continue with Google</span>
                        </div>
                      </div>
                    </div>

                    {/* Simulated Bottom Bar */}
                    <div className="relative z-10 px-3 py-1.5 border-t border-white/10 bg-slate-950/60 text-center text-[8px] text-slate-400">
                      © 2026 SokoPoS Enterprise Platform
                    </div>
                  </div>

                  {/* Legend / Status explanation */}
                  <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Full-Bleed Responsive Layout</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Custom graphic scales automatically across all display resolutions. Automatically optimized and synced to Firestore for persistent platform-wide branding.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
