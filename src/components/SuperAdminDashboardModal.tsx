import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Building2,
  FileText,
  PlusCircle,
  X,
  CheckCircle2,
  Search,
  Database,
  Trash2,
  Check,
  Loader2,
  Lock,
  RotateCcw,
  RefreshCw,
  Palette,
  CreditCard,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Tag,
  Sliders,
  Landmark,
  Activity,
  ShieldCheck,
  Receipt,
  Download,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { triggerCsvDownload } from '../utils/inventoryCsv';
import { PaystackSubaccountPanel } from './common/PaystackSubaccountPanel';
import { SettingsSectionHeader } from './common/SettingsSectionHeader';
import { isSuperAdminEmail } from '../data/initialData';
import { PricingSlider } from './pricing/PricingSlider';
import { SuperAdminAffiliatesTab } from './SuperAdminAffiliatesTab';
import { SuperAdminTrafficTab } from './superadmin/SuperAdminTrafficTab';
import { SuperAdminBrandingTab } from './superadmin/SuperAdminBrandingTab';
import { SuperAdminReconciliationTab } from './superadmin/SuperAdminReconciliationTab';
import { SuperAdminEtimsOutboxTab } from './superadmin/SuperAdminEtimsOutboxTab';
import { PackageTierId } from '../types/pricing';
import { normalizePlanTier } from '../utils/subscriptionEntitlements';

export type SuperAdminTabId =
  | 'tenants'
  | 'subscriptions'
  | 'reconciliation'
  | 'etims'
  | 'pricing'
  | 'audit'
  | 'provision'
  | 'branding'
  | 'affiliates'
  | 'traffic';

interface SuperAdminDashboardModalProps {
  isOpen?: boolean;
  onClose: () => void;
  defaultTab?: SuperAdminTabId;
}

interface AdminNavItemConfig {
  id: SuperAdminTabId;
  domId: string;
  label: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
  restricted?: boolean;
}

const ADMIN_NAV_GROUPS: Array<{
  label: string;
  items: AdminNavItemConfig[];
}> = [
  {
    label: 'Tenants & Access',
    items: [
      { id: 'tenants', domId: 'superadmin-tab-tenants-btn', label: 'Business Tenants', group: 'Tenants & Access', icon: Building2 },
      { id: 'subscriptions', domId: 'superadmin-tab-subscriptions-btn', label: 'Subscriptions & Access', group: 'Tenants & Access', icon: CreditCard, restricted: true },
      { id: 'reconciliation', domId: 'superadmin-tab-reconciliation-btn', label: 'Payment Reconciliation', group: 'Tenants & Access', icon: Receipt, restricted: true },
      { id: 'provision', domId: 'superadmin-tab-provision-btn', label: 'Provision Tenant', group: 'Tenants & Access', icon: PlusCircle },
    ],
  },
  {
    label: 'Commercial & Growth',
    items: [
      { id: 'pricing', domId: 'superadmin-tab-pricing-btn', label: 'Pricing Tiers', group: 'Commercial & Growth', icon: Tag },
      { id: 'affiliates', domId: 'superadmin-tab-affiliates-btn', label: 'Affiliates & Payouts', group: 'Commercial & Growth', icon: TrendingUp, restricted: true },
      { id: 'traffic', domId: 'superadmin-tab-traffic-btn', label: 'Traffic & Telemetry', group: 'Commercial & Growth', icon: Activity, restricted: true },
    ],
  },
  {
    label: 'Platform & Governance',
    items: [
      { id: 'etims', domId: 'superadmin-tab-etims-btn', label: 'eTIMS Outbox', group: 'Platform & Governance', icon: ShieldCheck, restricted: true },
      { id: 'branding', domId: 'superadmin-tab-branding-btn', label: 'Platform Branding', group: 'Platform & Governance', icon: Palette },
      { id: 'audit', domId: 'superadmin-tab-audit-btn', label: 'Write Audit Log', group: 'Platform & Governance', icon: FileText },
    ],
  },
];

const ALL_ADMIN_NAV_ITEMS = ADMIN_NAV_GROUPS.flatMap((g) => g.items);

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
    platformLogo,
    platformFavicon,
    performSystemCleanup,
    isRealGoogleAccount,
    isValidBusinessOwnerEmail,
    isGoogleEmailAccount,
    updateBusinessStatus,
    updateBusinessPlan,
    pricingTiers,
    pricingSyncStatus,
    pricingSyncError,
    refreshPricingTiers,
    updatePricingTier,
    resetPricingTiersToDefault,
    refreshAllBusinessesForSuperAdmin,
    isTenantsLoading,
    tenantsLoadError,
    showToast,
    isDemoSession,
  } = usePos();

  const isSuperAdminUser = isSuperAdminEmail(currentUser?.email);
  const isRestrictedTab = (tab: SuperAdminTabId) =>
    tab === 'subscriptions' ||
    tab === 'reconciliation' ||
    tab === 'etims' ||
    tab === 'affiliates' ||
    tab === 'traffic';

  const [activeTab, setActiveTab] = useState<SuperAdminTabId>(
    isRestrictedTab(defaultTab) && !isSuperAdminUser ? 'tenants' : defaultTab || 'tenants'
  );
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [etimsBacklogCount, setEtimsBacklogCount] = useState<number | null>(null);

  // Pricing Tiers Config State
  const [selectedPricingTierId, setSelectedPricingTierId] = useState<string>('business');
  const [newFeatureText, setNewFeatureText] = useState<{ [tierId: string]: string }>({});
  const [confirmResetPricing, setConfirmResetPricing] = useState(false);

  // Business Tenants Search State
  const [tenantSearchQuery, setTenantSearchQuery] = useState('');

  // Subscriptions & Plan Override State
  const [subSearchQuery, setSubSearchQuery] = useState('');
  const [subStatusFilter, setSubStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [subPlanFilter, setSubPlanFilter] = useState<'all' | 'free' | 'starter' | 'business' | 'premium'>('all');
  const [togglingBizId, setTogglingBizId] = useState<string | null>(null);
  const [overrideBizId, setOverrideBizId] = useState<string | null>(null);
  const [overrideTargetPlan, setOverrideTargetPlan] = useState<PackageTierId>('business');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [isSavingOverride, setIsSavingOverride] = useState(false);
  const [selectedSubaccountBizId, setSelectedSubaccountBizId] = useState<string | null>(null);
  const selectedSubaccountBiz = selectedSubaccountBizId
    ? businesses.find((b) => b.id === selectedSubaccountBizId) || null
    : null;

  useEffect(() => {
    if (isOpen !== false && isSuperAdminUser) {
      refreshAllBusinessesForSuperAdmin(true).catch(() => {});
    }
  }, [isOpen, isSuperAdminUser, refreshAllBusinessesForSuperAdmin]);

  useEffect(() => {
    if (isOpen !== false && activeTab === 'pricing') {
      refreshPricingTiers(false).catch(() => {});
    }
  }, [isOpen, activeTab, refreshPricingTiers]);

  useEffect(() => {
    if (isOpen !== false && defaultTab) {
      if (isRestrictedTab(defaultTab) && !isSuperAdminUser) {
        setActiveTab('tenants');
      } else {
        setActiveTab(defaultTab);
      }
    }
  }, [isOpen, defaultTab, isSuperAdminUser]);

  // Audit Log filter
  const [auditFilter, setAuditFilter] = useState('');
  const [selectedAuditEntry, setSelectedAuditEntry] = useState<string | null>(null);

  // Provisioning Form State
  const [newBizName, setNewBizName] = useState('');
  const [newBizOwnerEmail, setNewBizOwnerEmail] = useState('');
  const [newBizOwnerName, setNewBizOwnerName] = useState('');
  const [newBizPlan, setNewBizPlan] = useState<'free' | 'starter' | 'business' | 'premium'>('business');

  if (isOpen === false || isDemoSession) return null;

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

  const getTierMonthlyFee = (plan: string): number => {
    const clean = String(plan || '').toLowerCase();
    if (clean === 'free' || clean === 'free_advisory') return 0;
    const normalized =
      clean === 'enterprise' || clean === 'premium'
        ? 'premium'
        : clean === 'professional' || clean === 'business' || clean === 'pro'
        ? 'business'
        : 'starter';
    const found = pricingTiers.find((t) => t.id === normalized);
    if (found) return found.monthlyPrice;
    return normalized === 'premium' ? 2999 : normalized === 'business' ? 1299 : 599;
  };

  const totalEstMrr = businesses.reduce((sum, b) => {
    if (b.status === 'suspended') return sum;
    return sum + getTierMonthlyFee(b.plan);
  }, 0);

  const activeNavMeta = ALL_ADMIN_NAV_ITEMS.find((item) => item.id === activeTab) || ALL_ADMIN_NAV_ITEMS[0];
  const activeScopeBiz = businesses.find((b) => b.id === activeBusinessId);
  const hasCustomBranding = Boolean(loginBgGraphic || platformLogo || platformFavicon);

  const visibleGroups = ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.restricted || isSuperAdminUser),
  })).filter((g) => g.items.length > 0);

  const getSidebarTrailingMeta = (itemId: SuperAdminTabId): React.ReactNode => {
    switch (itemId) {
      case 'tenants':
        return (
          <span className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
            {businesses.length}
          </span>
        );
      case 'subscriptions':
        return (
          <span className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
            {businesses.filter((b) => b.status === 'active').length}/{businesses.length}
          </span>
        );
      case 'pricing':
        return (
          <span className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
            {pricingTiers.length}
          </span>
        );
      case 'branding':
        return hasCustomBranding ? (
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Custom</span>
        ) : null;
      case 'etims':
        return etimsBacklogCount !== null && etimsBacklogCount > 0 ? (
          <span className="text-[11px] font-mono tabular-nums font-semibold text-rose-600 dark:text-rose-400">
            {etimsBacklogCount}
          </span>
        ) : null;
      case 'audit':
        return (
          <span className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
            {superAdminAuditLogs.length}
          </span>
        );
      default:
        return null;
    }
  };

  const filteredSubscriptionBusinesses = businesses.filter((biz) => {
    const q = subSearchQuery.trim().toLowerCase();
    const matchQuery =
      !q ||
      biz.name.toLowerCase().includes(q) ||
      biz.code.toLowerCase().includes(q) ||
      biz.ownerEmail.toLowerCase().includes(q) ||
      biz.ownerName.toLowerCase().includes(q) ||
      biz.taxNumber.toLowerCase().includes(q);

    const matchStatus =
      subStatusFilter === 'all' ||
      (subStatusFilter === 'active' && biz.status === 'active') ||
      (subStatusFilter === 'suspended' && biz.status === 'suspended');

    const cleanPlan = String(biz.plan || '').toLowerCase();
    const normalizedBizPlan =
      cleanPlan === 'enterprise' || cleanPlan === 'premium'
        ? 'premium'
        : cleanPlan === 'professional' || cleanPlan === 'business' || cleanPlan === 'pro'
        ? 'business'
        : cleanPlan === 'starter' || cleanPlan === 'basic'
        ? 'starter'
        : 'free';

    const matchPlan = subPlanFilter === 'all' || normalizedBizPlan === subPlanFilter;

    return matchQuery && matchStatus && matchPlan;
  });

  const cleanTenantQuery = tenantSearchQuery.trim().toLowerCase();
  const filteredTenants = businesses.filter((biz) => {
    if (!cleanTenantQuery) return true;
    return (
      (biz.name || '').toLowerCase().includes(cleanTenantQuery) ||
      (biz.code || '').toLowerCase().includes(cleanTenantQuery) ||
      (biz.ownerEmail || '').toLowerCase().includes(cleanTenantQuery)
    );
  });

  const escapeAuditCsvCell = (val: unknown): string => {
    const raw = val === null || val === undefined ? '' : String(val);
    const trimmedStart = raw.replace(/^[\u0000-\u0020]+/, '');
    const safe = /^[=+\-@\t\r]/.test(trimmedStart) ? `'${raw}` : raw;
    if (/[",\n\r]/.test(safe)) {
      return `"${safe.replace(/"/g, '""')}"`;
    }
    return safe;
  };

  const exportTenantsAuditCsv = (rowsToExport: typeof businesses, scopeLabel: 'filtered' | 'all') => {
    if (rowsToExport.length === 0) return;
    const headers = [
      'Tenant ID',
      'Business Code',
      'Store Name',
      'Owner Email',
      'Owner Name',
      'Account Type',
      'Plan',
      'Status',
      'Tax PIN (KRA)',
      'Phone',
      'Currency',
      'Paystack Subaccount',
      'Paystack Status',
      'Subscription Status',
      'Subscription Expires At',
      'Created At',
      'Last Login At',
    ];
    const rows = rowsToExport.map((biz) => {
      const accountType = isGoogleEmailAccount(biz.ownerEmail)
        ? 'Google Account'
        : isValidBusinessOwnerEmail(biz.ownerEmail) || isRealGoogleAccount(biz.ownerEmail)
          ? 'Email Account'
          : 'Invalid Email';
      return [
        biz.id,
        biz.code,
        biz.name,
        biz.ownerEmail,
        biz.ownerName,
        accountType,
        biz.plan,
        biz.status,
        biz.taxNumber,
        biz.phone || '',
        biz.currency || 'KES',
        biz.paystackSubaccountCode || '',
        biz.paystackSubaccountStatus || 'unconfigured',
        biz.subscription?.status || '',
        biz.subscription?.expiresAt || '',
        biz.createdAt || '',
        biz.lastLoginAt || '',
      ];
    });
    const csv = [headers, ...rows].map((row) => row.map(escapeAuditCsvCell).join(',')).join('\r\n');
    const dateTag = new Date().toISOString().slice(0, 10);
    triggerCsvDownload(csv, `sokopos-tenants-audit-${scopeLabel}-${dateTag}.csv`);
    showToast(
      `Exported ${rowsToExport.length} ${rowsToExport.length === 1 ? 'tenant' : 'tenants'} to CSV`,
      'success'
    );
  };

  return (
    <div
      id="pos-superadmin-view"
      className="flex-1 h-full w-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-w-0 font-sans"
    >
      {/* Unified Top Workspace Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span>Platform</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span>{activeNavMeta.group}</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{activeNavMeta.label}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-0.5">
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                Platform Support Console
              </h2>
              {activeScopeBiz && (
                <>
                  <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">·</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                    Scope: <strong className="font-medium text-slate-700 dark:text-slate-300">{activeScopeBiz.name}</strong>
                  </span>
                </>
              )}
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">·</span>
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Platform Controls</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer text-xs font-medium whitespace-nowrap"
              title="Return to Register"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Register</span>
            </button>
          </div>
        </div>
      </header>

      {/* Split Workspace: Grouped Left Sidebar + Main Canvas */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Desktop Grouped Left Sidebar */}
        <aside
          aria-label="Platform console sections"
          className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-y-auto modal-scrollbar p-4 space-y-5"
        >
          {visibleGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.label}
              </div>
              <nav className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={item.domId}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs transition cursor-pointer ${
                        isActive
                          ? 'bg-blue-50/80 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 font-semibold border border-blue-200/80 dark:border-blue-800/60'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border border-transparent font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      <span className="shrink-0">{getSidebarTrailingMeta(item.id)}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </aside>

        {/* Mobile / Tablet Compact Switcher */}
        <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-2.5 shrink-0">
          <label htmlFor="mobile-superadmin-section-select" className="sr-only">
            Select platform console section
          </label>
          <select
            id="mobile-superadmin-section-select"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as SuperAdminTabId)}
            className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {visibleGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Scrollable Main Content Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 modal-scrollbar overscroll-contain">
          <div className="max-w-6xl mx-auto">
            {/* ============================================================== */}
            {/* TAB 1: BUSINESS TENANTS                                        */}
            {/* ============================================================== */}
            {activeTab === 'tenants' && (
              <div className="space-y-5">
                <SettingsSectionHeader
                  title="Managed Business Tenants"
                  description="Each tenant is strictly isolated with independent product catalogs, locations, sales, and system users."
                  meta={
                    <>
                      <span className="tabular-nums">
                        {cleanTenantQuery ? `${filteredTenants.length} of ${businesses.length}` : businesses.length}{' '}
                        tenants
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{businesses.filter((b) => b.status === 'active').length} active</span>
                    </>
                  }
                  actions={
                    <>
                      <button
                        id="btn-refresh-tenants"
                        type="button"
                        onClick={() => {
                          refreshAllBusinessesForSuperAdmin(true).catch(() => {});
                        }}
                        disabled={isTenantsLoading}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 text-slate-700 dark:text-slate-200 text-xs font-medium transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                        title="Reload all registered tenants from cloud database"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTenantsLoading ? 'animate-spin' : ''}`} />
                        <span>{isTenantsLoading ? 'Refreshing...' : 'Refresh'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          setIsCleaningUp(true);
                          try {
                            await performSystemCleanup();
                          } finally {
                            setIsCleaningUp(false);
                          }
                        }}
                        disabled={isCleaningUp}
                        className="px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/60 disabled:opacity-50 text-amber-800 dark:text-amber-300 text-xs font-medium transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                        title="Remove mock, invalid, or duplicate tenant accounts"
                      >
                        {isCleaningUp ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        <span>{isCleaningUp ? 'Cleaning System...' : 'Run System Cleanup'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('provision')}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Provision New Tenant</span>
                      </button>
                    </>
                  }
                />

                {tenantsLoadError && (
                  <div
                    role="alert"
                    className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-semibold">Unable to refresh full tenant directory</p>
                        <p className="text-rose-700 dark:text-rose-300 mt-0.5 break-words">{tenantsLoadError}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        refreshAllBusinessesForSuperAdmin(true).catch(() => {});
                      }}
                      disabled={isTenantsLoading}
                      className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 hover:bg-rose-100 dark:hover:bg-rose-950/60 disabled:opacity-50 text-rose-700 dark:text-rose-300 text-xs font-medium transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-center"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTenantsLoading ? 'animate-spin' : ''}`} />
                      <span>Retry</span>
                    </button>
                  </div>
                )}

                {isTenantsLoading && businesses.length <= 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-label="Loading registered tenants">
                    {[0, 1, 2, 3].map((slot) => (
                      <div
                        key={slot}
                        className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 animate-pulse space-y-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-2 flex-1">
                            <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                            <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
                          </div>
                          <div className="h-7 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                        </div>
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800/80 rounded" />
                          <div className="h-3 w-3/4 bg-slate-100 dark:bg-slate-800/80 rounded" />
                          <div className="h-3 w-2/3 bg-slate-100 dark:bg-slate-800/80 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search Toolbar */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                    <input
                      id="tenant-search-input"
                      type="text"
                      value={tenantSearchQuery}
                      onChange={(e) => setTenantSearchQuery(e.target.value)}
                      placeholder="Search tenants by store name, business code, or owner email..."
                      aria-label="Search tenants by store name, business code, or owner email"
                      className="pl-8 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                    />
                    {tenantSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setTenantSearchQuery('')}
                        aria-label="Clear tenant search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    {cleanTenantQuery && (
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 px-1 shrink-0 whitespace-nowrap">
                        <span className="font-mono tabular-nums">
                          {filteredTenants.length} {filteredTenants.length === 1 ? 'match' : 'matches'}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                        <button
                          type="button"
                          onClick={() => setTenantSearchQuery('')}
                          className="font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                    <button
                      id="btn-export-tenants-csv"
                      type="button"
                      onClick={() => exportTenantsAuditCsv(filteredTenants, cleanTenantQuery ? 'filtered' : 'all')}
                      disabled={filteredTenants.length === 0}
                      className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 text-xs font-medium transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                      title={
                        cleanTenantQuery
                          ? `Download CSV of ${filteredTenants.length} filtered tenant(s) for auditing`
                          : `Download CSV of all ${filteredTenants.length} tenant(s) for auditing`
                      }
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                      <span>Export CSV</span>
                      <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        ({filteredTenants.length})
                      </span>
                    </button>
                  </div>
                </div>

                {!(isTenantsLoading && businesses.length <= 1) && filteredTenants.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center">
                    <Search className="w-6 h-6 text-slate-400 dark:text-slate-500 mx-auto mb-2.5" />
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {cleanTenantQuery
                        ? `No tenants match "${tenantSearchQuery.trim()}"`
                        : 'No registered tenants found'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                      {cleanTenantQuery
                        ? 'Try searching by a different store name, business code, or owner email address.'
                        : 'Provision a new business tenant to manage it from this console.'}
                    </p>
                    <div className="mt-4">
                      {cleanTenantQuery ? (
                        <button
                          type="button"
                          onClick={() => setTenantSearchQuery('')}
                          className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition cursor-pointer whitespace-nowrap shrink-0"
                        >
                          Clear Search
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveTab('provision')}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Provision New Tenant</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTenants.map((biz) => {
                    const isActive = biz.id === activeBusinessId;
                    const isGoogleAccount = isGoogleEmailAccount(biz.ownerEmail);
                    const isValidOwner = isValidBusinessOwnerEmail(biz.ownerEmail) || isRealGoogleAccount(biz.ownerEmail);
                    return (
                      <div
                        key={biz.id}
                        className={`bg-white dark:bg-slate-900 rounded-xl p-5 border transition ${
                          isActive
                            ? 'border-blue-600 dark:border-blue-500 ring-1 ring-blue-600/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                                {biz.code}
                              </span>
                              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                              <span className="capitalize font-medium text-emerald-700 dark:text-emerald-400">
                                {biz.plan} Plan
                              </span>
                              {biz.status === 'suspended' && (
                                <>
                                  <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                                  <span className="font-medium text-rose-600 dark:text-rose-400">Suspended</span>
                                </>
                              )}
                            </div>
                            <h4 className="font-semibold text-base text-slate-900 dark:text-slate-100 mt-1 truncate">
                              {biz.name}
                            </h4>
                          </div>

                          {isActive ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 shrink-0 whitespace-nowrap">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Active Scope</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveBusinessId(biz.id);
                                onClose();
                              }}
                              className="text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition cursor-pointer shrink-0 whitespace-nowrap"
                            >
                              Switch to Tenant
                            </button>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500 dark:text-slate-400 shrink-0">Owner Account</span>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                {biz.ownerEmail}
                              </span>
                              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                              <span
                                className={`shrink-0 font-medium ${
                                  isGoogleAccount
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : isValidOwner
                                      ? 'text-blue-600 dark:text-blue-400'
                                      : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {isGoogleAccount ? 'Google Account' : isValidOwner ? 'Email Account' : 'Invalid Email'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500 dark:text-slate-400">Owner Name</span>
                            <span className="font-medium text-slate-700 dark:text-slate-300">{biz.ownerName}</span>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500 dark:text-slate-400">Tax PIN (KRA)</span>
                            <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                              {biz.taxNumber}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-500 dark:text-slate-400">Tenant ID</span>
                            <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">{biz.id}</span>
                          </div>

                          <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-slate-100 dark:border-slate-800 gap-2">
                            <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 min-w-0">
                              <Landmark className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                              {biz.paystackSubaccountCode?.startsWith('ACCT_') ? (
                                <span className="truncate">
                                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                                    {biz.paystackSubaccountCode}
                                  </span>
                                  <span className="text-slate-300 dark:text-slate-700 mx-1">·</span>
                                  <span
                                    className={
                                      biz.paystackSubaccountStatus === 'verified'
                                        ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                                        : 'text-amber-600 dark:text-amber-400 font-medium'
                                    }
                                  >
                                    {biz.paystackSubaccountStatus === 'verified' ? 'Verified' : 'Inactive'}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-500">
                                  Paystack settlement not configured
                                </span>
                              )}
                            </div>

                            {biz.id !== 'biz-demo' && (
                              <button
                                type="button"
                                onClick={() => setSelectedSubaccountBizId(biz.id)}
                                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0 cursor-pointer whitespace-nowrap"
                              >
                                Manage Subaccount
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: SUBSCRIPTIONS & TERMINAL ACCESS (Restricted)            */}
            {/* ============================================================== */}
            {activeTab === 'subscriptions' &&
              (isSuperAdminUser ? (
                <div className="space-y-6">
                  <SettingsSectionHeader
                    title="POS Subscriptions & Terminal Access"
                    description="Monitor subscriber billing tiers and manually toggle terminal access on or off for missed payments or administrative holds."
                    meta={<span>Manual oversight controls</span>}
                    actions={
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            refreshAllBusinessesForSuperAdmin(true).catch(() => {});
                          }}
                          disabled={isTenantsLoading}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 text-slate-700 dark:text-slate-200 text-xs font-medium transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isTenantsLoading ? 'animate-spin' : ''}`} />
                          <span>{isTenantsLoading ? 'Refreshing...' : 'Refresh'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            exportTenantsAuditCsv(
                              filteredSubscriptionBusinesses,
                              subSearchQuery.trim() || subStatusFilter !== 'all' || subPlanFilter !== 'all'
                                ? 'filtered'
                                : 'all'
                            )
                          }
                          disabled={filteredSubscriptionBusinesses.length === 0}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 text-xs font-medium transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                          title="Download filtered subscriber list as CSV for auditing"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                          <span>Export CSV</span>
                          <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            ({filteredSubscriptionBusinesses.length})
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('provision')}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Add New Subscriber</span>
                        </button>
                      </>
                    }
                  />

                  {tenantsLoadError && (
                    <div
                      role="alert"
                      className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/70 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200 min-w-0">
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="font-semibold">Unable to refresh full subscriber list</p>
                          <p className="text-rose-700 dark:text-rose-300 mt-0.5 break-words">{tenantsLoadError}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          refreshAllBusinessesForSuperAdmin(true).catch(() => {});
                        }}
                        disabled={isTenantsLoading}
                        className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 hover:bg-rose-100 dark:hover:bg-rose-950/60 disabled:opacity-50 text-rose-700 dark:text-rose-300 text-xs font-medium transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-center"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTenantsLoading ? 'animate-spin' : ''}`} />
                        <span>Retry</span>
                      </button>
                    </div>
                  )}

                  {/* Hairline KPI Strip */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
                    <div className="p-4">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium">Total Subscribed</span>
                        <Building2 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      </div>
                      <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1.5">
                        {businesses.length}
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">Registered POS tenants</span>
                    </div>

                    <div className="p-4">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium">Access Active</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="text-xl font-semibold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1.5">
                        {businesses.filter((b) => b.status === 'active').length}
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">Terminals trading online</span>
                    </div>

                    <div className="p-4">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium">Access Suspended</span>
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      </div>
                      <div className="text-xl font-semibold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-1.5">
                        {businesses.filter((b) => b.status === 'suspended').length}
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">Missed payment or hold</span>
                    </div>

                    <div className="p-4">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium">Est. MRR (KES)</span>
                        <TrendingUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      </div>
                      <div className="text-xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1.5">
                        KES {totalEstMrr.toLocaleString()}
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">Monthly recurring revenue</span>
                    </div>
                  </div>

                  {/* Search & Filter Toolbar */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                      <input
                        type="text"
                        value={subSearchQuery}
                        onChange={(e) => setSubSearchQuery(e.target.value)}
                        placeholder="Search by business name, code, owner email, or PIN..."
                        className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-lg text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => setSubStatusFilter('all')}
                          className={`px-2.5 py-1 rounded-md transition cursor-pointer whitespace-nowrap ${
                            subStatusFilter === 'all'
                              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                          }`}
                        >
                          All ({businesses.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubStatusFilter('active')}
                          className={`px-2.5 py-1 rounded-md transition cursor-pointer whitespace-nowrap ${
                            subStatusFilter === 'active'
                              ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs font-semibold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                          }`}
                        >
                          Active ({businesses.filter((b) => b.status === 'active').length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubStatusFilter('suspended')}
                          className={`px-2.5 py-1 rounded-md transition cursor-pointer whitespace-nowrap ${
                            subStatusFilter === 'suspended'
                              ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-2xs font-semibold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                          }`}
                        >
                          Suspended ({businesses.filter((b) => b.status === 'suspended').length})
                        </button>
                      </div>

                      <select
                        value={subPlanFilter}
                        onChange={(e) => setSubPlanFilter(e.target.value as any)}
                        className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      >
                        <option value="all">All Plan Tiers</option>
                        <option value="free">Free Advisory</option>
                        <option value="starter">Starter</option>
                        <option value="business">Business / Pro</option>
                        <option value="premium">Premium / Enterprise</option>
                      </select>
                    </div>
                  </div>

                  {/* Subscribed Businesses List */}
                  <div className="space-y-3">
                    {filteredSubscriptionBusinesses.map((biz) => {
                      const isBizActive = biz.status === 'active';
                      const planFee = `KES ${getTierMonthlyFee(biz.plan).toLocaleString()} / month`;

                      return (
                        <div
                          key={biz.id}
                          className={`bg-white dark:bg-slate-900 rounded-xl border overflow-hidden transition ${
                            isBizActive
                              ? 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                              : 'border-rose-300 dark:border-rose-800/70'
                          }`}
                        >
                          <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            <div className="space-y-1.5 min-w-0">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                                  {biz.code}
                                </span>
                                <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                                <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                                  {biz.plan} Plan
                                </span>
                                <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                                  {planFee}
                                </span>
                                <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                                <span
                                  className={`font-medium ${
                                    isBizActive
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  {isBizActive ? 'POS Access Enabled' : 'POS Access Suspended'}
                                </span>
                              </div>

                              <h4 className="font-semibold text-base text-slate-900 dark:text-slate-100">
                                {biz.name}
                              </h4>

                              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 dark:text-slate-400">
                                <span>
                                  Owner:{' '}
                                  <strong className="font-medium text-slate-700 dark:text-slate-300">
                                    {biz.ownerName}
                                  </strong>{' '}
                                  <span className="font-mono">({biz.ownerEmail})</span>
                                </span>
                                <span className="font-mono tabular-nums">PIN: {biz.taxNumber}</span>
                                <span className="font-mono tabular-nums">
                                  Subscribed: {new Date(biz.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 shrink-0">
                              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-3.5 py-2 flex items-center gap-3">
                                <div className="text-right">
                                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                    {isBizActive ? 'POS Access: ON' : 'POS Access: OFF'}
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {isBizActive ? 'Terminals authorized' : 'Access blocked'}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={isBizActive}
                                  aria-label={`Toggle POS access for ${biz.name}`}
                                  disabled={togglingBizId === biz.id}
                                  onClick={async () => {
                                    const newStatus = isBizActive ? 'suspended' : 'active';
                                    setTogglingBizId(biz.id);
                                    try {
                                      await updateBusinessStatus(biz.id, newStatus);
                                    } finally {
                                      setTogglingBizId(null);
                                    }
                                  }}
                                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                                    isBizActive
                                      ? 'bg-emerald-600 hover:bg-emerald-700'
                                      : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                      isBizActive ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  if (overrideBizId === biz.id) {
                                    setOverrideBizId(null);
                                    setOverrideError(null);
                                  } else {
                                    const currentCanonical = normalizePlanTier(
                                      biz.plan,
                                      biz.subscription?.planId
                                    );
                                    setOverrideBizId(biz.id);
                                    setOverrideTargetPlan(currentCanonical);
                                    setOverrideReason('');
                                    setOverrideError(null);
                                  }
                                }}
                                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition cursor-pointer whitespace-nowrap ${
                                  overrideBizId === biz.id
                                    ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                              >
                                <Sliders className="w-3.5 h-3.5" />
                                <span>{overrideBizId === biz.id ? 'Close Override' : 'Override Plan'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveBusinessId(biz.id);
                                  onClose();
                                }}
                                className="text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-2 rounded-lg transition cursor-pointer whitespace-nowrap"
                              >
                                Switch to Store
                              </button>
                            </div>
                          </div>

                          {/* Inline Plan Tier Override Panel */}
                          {overrideBizId === biz.id && (() => {
                            const currentCanonical = normalizePlanTier(
                              biz.plan,
                              biz.subscription?.planId
                            );
                            const currentFee = getTierMonthlyFee(currentCanonical);
                            const nextFee = getTierMonthlyFee(overrideTargetPlan);
                            const nextTierMeta = pricingTiers.find((t) => t.id === overrideTargetPlan);
                            const isUnchanged = overrideTargetPlan === currentCanonical;
                            const cleanReason = overrideReason.trim();
                            return (
                              <div className="px-5 py-4 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
                                    <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    <span>Manual Subscription Tier Override</span>
                                  </div>
                                  <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                                    {currentCanonical.toUpperCase()} (KES {currentFee.toLocaleString()}/mo) →{' '}
                                    <strong className="text-blue-600 dark:text-blue-400">
                                      {overrideTargetPlan.toUpperCase()} (KES {nextFee.toLocaleString()}/mo)
                                    </strong>
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                      Target Subscription Tier *
                                    </label>
                                    <select
                                      value={overrideTargetPlan}
                                      onChange={(e) => {
                                        setOverrideTargetPlan(e.target.value as PackageTierId);
                                        if (overrideError) setOverrideError(null);
                                      }}
                                      className="w-full px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 cursor-pointer"
                                    >
                                      <option value="free">Free Advisory (KES 0/mo · 1 Branch, 1 Staff)</option>
                                      <option value="starter">Starter (KES {getTierMonthlyFee('starter').toLocaleString()}/mo · 1 Branch, 2 Staff)</option>
                                      <option value="business">Business / Pro (KES {getTierMonthlyFee('business').toLocaleString()}/mo · 3 Branches, 10 Staff)</option>
                                      <option value="premium">Premium / Enterprise (KES {getTierMonthlyFee('premium').toLocaleString()}/mo · Unlimited)</option>
                                    </select>
                                    {nextTierMeta && (
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                                        Limits:{' '}
                                        {nextTierMeta.maxBranches === -1
                                          ? 'Unlimited branches'
                                          : `${nextTierMeta.maxBranches} branch${nextTierMeta.maxBranches === 1 ? '' : 'es'}`}{' '}
                                        ·{' '}
                                        {nextTierMeta.maxStaffUsers === -1
                                          ? 'Unlimited staff'
                                          : `${nextTierMeta.maxStaffUsers} staff`}
                                      </p>
                                    )}
                                  </div>

                                  <div className="md:col-span-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                        Mandatory Audit Reason Note *
                                      </label>
                                      <span className="text-[11px] font-mono tabular-nums text-slate-400">
                                        {cleanReason.length}/250
                                      </span>
                                    </div>
                                    <input
                                      type="text"
                                      maxLength={250}
                                      value={overrideReason}
                                      onChange={(e) => {
                                        setOverrideReason(e.target.value);
                                        if (overrideError) setOverrideError(null);
                                      }}
                                      placeholder="e.g. Verified bank/M-Pesa deposit or 14-day onboarding upgrade per support ticket..."
                                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100"
                                    />
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                                      Minimum 5 characters. Records before/after snapshot to Write Audit Log.
                                    </p>
                                  </div>
                                </div>

                                {overrideError && (
                                  <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg px-3 py-2">
                                    {overrideError}
                                  </div>
                                )}

                                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                                  <button
                                    type="button"
                                    disabled={isSavingOverride}
                                    onClick={() => {
                                      setOverrideBizId(null);
                                      setOverrideError(null);
                                    }}
                                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isSavingOverride || isUnchanged || cleanReason.length < 5}
                                    onClick={async () => {
                                      if (isUnchanged) {
                                        setOverrideError('Select a different plan tier than the current plan.');
                                        return;
                                      }
                                      if (cleanReason.length < 5) {
                                        setOverrideError('Please enter an audit reason note (minimum 5 characters).');
                                        return;
                                      }
                                      setIsSavingOverride(true);
                                      setOverrideError(null);
                                      try {
                                        await updateBusinessPlan(biz.id, overrideTargetPlan, cleanReason);
                                        setOverrideBizId(null);
                                        setOverrideReason('');
                                      } catch (err: any) {
                                        setOverrideError(err?.message || 'Failed to apply plan override.');
                                      } finally {
                                        setIsSavingOverride(false);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
                                  >
                                    {isSavingOverride && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    <span>Confirm Plan Override</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })()}

                          <div
                            className={`px-5 py-2.5 border-t text-xs flex flex-wrap items-center justify-between gap-2 ${
                              isBizActive
                                ? 'border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                                : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              {isBizActive ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span>
                                    Subscription current. All branch terminals, registers, and staff logins are enabled.
                                  </span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                                  <span>
                                    Subscription suspended manually. Cashiers and store owners see a Subscription Inactive notice on login.
                                  </span>
                                </>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setAuditFilter(biz.code);
                                setActiveTab('audit');
                              }}
                              className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 underline cursor-pointer shrink-0 font-medium whitespace-nowrap"
                            >
                              View Audit Log
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {filteredSubscriptionBusinesses.length === 0 && (
                      <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <CreditCard className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          No matching subscriptions
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          No business accounts match the current filter or search criteria.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <Lock className="w-10 h-10 text-rose-500 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Restricted Access Panel
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    The Subscriptions panel is restricted exclusively to authorized Platform Support.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tenants')}
                    className="mt-4 px-4 py-2 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition cursor-pointer"
                  >
                    Return to Business Tenants
                  </button>
                </div>
              ))}

            {/* ============================================================== */}
            {/* TAB 3: PRICING TIERS ARCHITECTURE                              */}
            {/* ============================================================== */}
            {activeTab === 'pricing' && (
              <div className="space-y-6">
                <SettingsSectionHeader
                  title="POS Packages & Pricing Tiers"
                  description="Configure live subscription pricing, billing cycles, capacity limits, and feature entitlements across Free, Starter, Business, and Premium plans."
                  actions={
                    <div className="flex flex-wrap items-center gap-2">
                      {pricingSyncStatus === 'saving' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Syncing prices...</span>
                        </span>
                      )}
                      {pricingSyncStatus === 'synced' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Live Cloud Synced</span>
                        </span>
                      )}
                      {pricingSyncStatus === 'error' && (
                        <span
                          title={pricingSyncError || 'Cloud sync failed'}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>Local Only (Sync Error)</span>
                        </span>
                      )}
                      {confirmResetPricing ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              resetPricingTiersToDefault();
                              setConfirmResetPricing(false);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white cursor-pointer whitespace-nowrap transition"
                          >
                            Confirm Reset
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmResetPricing(false)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap transition"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmResetPricing(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer whitespace-nowrap"
                          title="Restore default packages"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                          <span>Reset to Default Packages</span>
                        </button>
                      )}
                    </div>
                  }
                />

                {pricingSyncStatus === 'error' && pricingSyncError && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{pricingSyncError}</span>
                  </div>
                )}

                {/* Connected Tier & MRR Summary Strip */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
                  {pricingTiers.map((tier) => {
                    const subscriberCount = businesses.filter((b) => {
                      if (tier.id === 'starter') return b.plan === 'starter';
                      if (tier.id === 'business') return b.plan === 'business' || b.plan === 'professional';
                      if (tier.id === 'premium') return b.plan === 'premium' || b.plan === 'enterprise';
                      return b.plan === tier.id;
                    }).length;
                    const isSelected = selectedPricingTierId === tier.id;

                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setSelectedPricingTierId(tier.id)}
                        className={`p-4 text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/60 dark:bg-blue-950/30'
                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-slate-500 dark:text-slate-400">
                            {tier.name} · <span className="text-blue-600 dark:text-blue-400">{tier.alias}</span>
                          </span>
                          {tier.badge && (
                            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                              {tier.badge}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex items-baseline gap-1 font-mono tabular-nums">
                          <span className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                            {tier.currency} {tier.monthlyPrice.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">/ mo</span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums flex items-center justify-between">
                          <span>Annual: {tier.annualPrice.toLocaleString()}</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {subscriberCount} stores
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  <div className="p-4 flex flex-col justify-between bg-slate-50/70 dark:bg-slate-800/40">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium">Est. Platform MRR</span>
                        <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="mt-1.5 text-xl font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        KES {totalEstMrr.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {businesses.filter((b) => b.status === 'active').length} active paying stores
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Interactive Package & Scale Slider */}
                <PricingSlider
                  tiers={pricingTiers}
                  selectedTierId={selectedPricingTierId as PackageTierId}
                  onSelectTier={(tId) => setSelectedPricingTierId(tId)}
                  billingCycle="monthly"
                  isSuperAdminView={true}
                />

                {/* Segmented Package Selector + Selected Tier Editor */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Configure Package Entitlements
                    </span>
                    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium">
                      {pricingTiers.map((tier) => {
                        const isSelected = selectedPricingTierId === tier.id;
                        return (
                          <button
                            key={tier.id}
                            type="button"
                            onClick={() => setSelectedPricingTierId(tier.id)}
                            className={`px-3 py-1 rounded-md transition cursor-pointer whitespace-nowrap ${
                              isSelected
                                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs font-semibold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                            }`}
                          >
                            {tier.name} ({tier.alias})
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {(() => {
                    const currentTier = pricingTiers.find((t) => t.id === selectedPricingTierId) || pricingTiers[0];
                    if (!currentTier) return null;

                    const annualSavingsPercent =
                      currentTier.monthlyPrice > 0
                        ? Math.round(
                            ((currentTier.monthlyPrice * 12 - currentTier.annualPrice) /
                              (currentTier.monthlyPrice * 12)) *
                              100
                          )
                        : 0;

                    return (
                      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        {/* Tier Editor Header */}
                        <div className="px-5 py-4 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                {currentTier.name} POS Package
                              </h4>
                              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                              <span className="font-medium text-blue-600 dark:text-blue-400">
                                {currentTier.alias} Tier
                              </span>
                              {currentTier.badge && (
                                <>
                                  <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                                  <span className="font-medium text-amber-600 dark:text-amber-400">
                                    {currentTier.badge}
                                  </span>
                                </>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{currentTier.tagline}</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(currentTier.isPopular)}
                                onChange={(e) => {
                                  updatePricingTier(currentTier.id, {
                                    isPopular: e.target.checked,
                                    badge: e.target.checked
                                      ? 'Best Value'
                                      : currentTier.badge === 'Best Value'
                                      ? ''
                                      : currentTier.badge,
                                  });
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                              <span>Highlight as Best Value</span>
                            </label>

                            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(currentTier.isActive)}
                                onChange={(e) => updatePricingTier(currentTier.id, { isActive: e.target.checked })}
                                className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <span>{currentTier.isActive ? 'Active for Tenants' : 'Archived'}</span>
                            </label>
                          </div>
                        </div>

                        <div className="p-5 sm:p-6 space-y-6">
                          {/* Price Points & Billing Rates */}
                          <div>
                            <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                              <DollarSign className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              <span>Subscription Price Points &amp; Billing</span>
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  Monthly Fee ({currentTier.currency})
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 dark:text-slate-500">
                                    {currentTier.currency}
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={currentTier.monthlyPrice}
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      updatePricingTier(currentTier.id, { monthlyPrice: val });
                                    }}
                                    className="w-full pl-12 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                                  Billed monthly per tenant
                                </span>
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  Annual Fee ({currentTier.currency})
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 dark:text-slate-500">
                                    {currentTier.currency}
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={currentTier.annualPrice}
                                    onChange={(e) => {
                                      const val = Number(e.target.value) || 0;
                                      updatePricingTier(currentTier.id, { annualPrice: val });
                                    }}
                                    className="w-full pl-12 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 block">
                                  Saves {annualSavingsPercent > 0 ? `${annualSavingsPercent}%` : '0%'} compared to monthly
                                </span>
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  Highlight Label
                                </label>
                                <input
                                  type="text"
                                  value={currentTier.badge || ''}
                                  placeholder="e.g. Best Value, Starter, Flagship"
                                  onChange={(e) => updatePricingTier(currentTier.id, { badge: e.target.value })}
                                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                                  Displayed beside tier title
                                </span>
                              </div>
                            </div>

                            {currentTier.id === 'free' && (
                              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    One-Time Onboarding Fee ({currentTier.currency})
                                  </label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 dark:text-slate-500">
                                      {currentTier.currency}
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={currentTier.consultationFee ?? 1999}
                                      onChange={(e) => {
                                        const val = Number(e.target.value) || 0;
                                        updatePricingTier(currentTier.id, { consultationFee: val });
                                      }}
                                      className="w-full pl-12 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                  <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                                    Charged once for 1-on-1 store setup &amp; hardware onboarding
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Tenant Architecture & Limits */}
                          <div className="pt-5 border-t border-slate-100 dark:border-slate-800">
                            <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                              <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              <span>Tenant Architecture &amp; Resource Limits</span>
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  Max Branch Locations (-1 for Unlimited)
                                </label>
                                <input
                                  type="number"
                                  min="-1"
                                  value={currentTier.maxBranches}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    updatePricingTier(currentTier.id, { maxBranches: isNaN(val) ? 1 : val });
                                  }}
                                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                                  {currentTier.maxBranches === -1
                                    ? 'Unlimited branches allowed'
                                    : `Max ${currentTier.maxBranches} store branches`}
                                </span>
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  Max Staff / Cashier Logins (-1 Unlimited)
                                </label>
                                <input
                                  type="number"
                                  min="-1"
                                  value={currentTier.maxStaffUsers}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    updatePricingTier(currentTier.id, { maxStaffUsers: isNaN(val) ? 2 : val });
                                  }}
                                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                                  {currentTier.maxStaffUsers === -1
                                    ? 'Unlimited staff accounts'
                                    : `Max ${currentTier.maxStaffUsers} staff user logins`}
                                </span>
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  Support Level
                                </label>
                                <input
                                  type="text"
                                  value={currentTier.supportLevel}
                                  onChange={(e) => updatePricingTier(currentTier.id, { supportLevel: e.target.value })}
                                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                                  Displayed in feature comparison
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  Tagline / Marketing Subtitle
                                </label>
                                <input
                                  type="text"
                                  value={currentTier.tagline}
                                  onChange={(e) => updatePricingTier(currentTier.id, { tagline: e.target.value })}
                                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  Bundle Inheritance Label
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Everything in Starter, plus:"
                                  value={currentTier.bundleLabel || ''}
                                  onChange={(e) => updatePricingTier(currentTier.id, { bundleLabel: e.target.value })}
                                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                  Package Alias Tag
                                </label>
                                <input
                                  type="text"
                                  value={currentTier.alias}
                                  onChange={(e) => updatePricingTier(currentTier.id, { alias: e.target.value })}
                                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                                  e.g. Basic, Pro, or Enterprise
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Feature Entitlements Checklist */}
                          <div className="pt-5 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                              <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                <span>Feature Entitlements Checklist ({currentTier.features.length})</span>
                              </h5>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                Shown on store owner pricing dashboard
                              </span>
                            </div>

                            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg max-h-60 overflow-y-auto modal-scrollbar">
                              {currentTier.features.map((feature, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <span className="font-medium text-slate-800 dark:text-slate-200">{feature}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = currentTier.features.filter((_, i) => i !== idx);
                                      updatePricingTier(currentTier.id, { features: updated });
                                    }}
                                    className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded-md transition cursor-pointer shrink-0"
                                    title="Remove feature"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>

                            <div className="mt-3 flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Enter a new capability to include in this package..."
                                value={newFeatureText[currentTier.id] || ''}
                                onChange={(e) =>
                                  setNewFeatureText((prev) => ({ ...prev, [currentTier.id]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const text = (newFeatureText[currentTier.id] || '').trim();
                                    if (text) {
                                      updatePricingTier(currentTier.id, {
                                        features: [...currentTier.features, text],
                                      });
                                      setNewFeatureText((prev) => ({ ...prev, [currentTier.id]: '' }));
                                    }
                                  }
                                }}
                                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const text = (newFeatureText[currentTier.id] || '').trim();
                                  if (text) {
                                    updatePricingTier(currentTier.id, {
                                      features: [...currentTier.features, text],
                                    });
                                    setNewFeatureText((prev) => ({ ...prev, [currentTier.id]: '' }));
                                  }
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition cursor-pointer shrink-0 whitespace-nowrap"
                              >
                                + Add Feature
                              </button>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
                              <span className="text-slate-500 dark:text-slate-400 font-medium">Quick suggestions:</span>
                              {[
                                '15+ profit, stock & KRA VAT reports',
                                'Unlimited SKUs & barcode scan',
                                'Cross-branch transfers & live stock sync',
                                'Purchase orders, loyalty & store credit',
                                'M-Pesa STK Push direct integration',
                                'Custom branded receipts & audit logs',
                                'Batch numbering & expiry alerts',
                                'Dedicated 24/7 account manager',
                              ].map((suggestion, sIdx) => {
                                if (currentTier.features.includes(suggestion)) return null;
                                return (
                                  <button
                                    key={sIdx}
                                    type="button"
                                    onClick={() => {
                                      updatePricingTier(currentTier.id, {
                                        features: [...currentTier.features, suggestion],
                                      });
                                    }}
                                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-medium transition cursor-pointer"
                                  >
                                    + {suggestion}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 4: WRITE AUDIT LOG                                         */}
            {/* ============================================================== */}
            {activeTab === 'audit' && (
              <div className="space-y-5">
                <SettingsSectionHeader
                  title="Platform Write Audit Ledger"
                  description="Every platform-level write across any tenant is logged with before and after snapshots."
                  meta={
                    <span className="font-mono tabular-nums">{filteredAuditLogs.length} events</span>
                  }
                  actions={
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                      <input
                        type="text"
                        value={auditFilter}
                        onChange={(e) => setAuditFilter(e.target.value)}
                        placeholder="Filter audit events..."
                        className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                      />
                    </div>
                  }
                />

                {filteredAuditLogs.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-12 text-center text-xs text-slate-500 dark:text-slate-400">
                    No matching platform audit events found.
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden">
                    {filteredAuditLogs.map((entry) => {
                      const isExpanded = selectedAuditEntry === entry.id;
                      return (
                        <div key={entry.id} className="text-xs">
                          <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                            <div className="flex items-start gap-3 min-w-0">
                              <Database className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                                    {entry.description}
                                  </span>
                                  <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                                  <span className="font-mono text-[11px] font-medium uppercase text-slate-600 dark:text-slate-300">
                                    {entry.action}
                                  </span>
                                  <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                                  <span className="font-medium text-blue-600 dark:text-blue-400">
                                    {entry.recordType}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                  <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {entry.businessName}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span>Admin: {entry.adminEmail}</span>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono tabular-nums">
                                    {new Date(entry.timestamp).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedAuditEntry(isExpanded ? null : entry.id)}
                              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0 cursor-pointer whitespace-nowrap"
                            >
                              {isExpanded ? 'Hide Diff' : 'View Before/After Snapshot'}
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="bg-slate-950 text-slate-200 p-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[11px]">
                              <div>
                                <span className="text-amber-400 font-semibold block mb-1.5">
                                  Before Value Snapshot
                                </span>
                                <pre className="bg-slate-900 border border-slate-800 p-3 rounded-lg overflow-x-auto max-h-48">
                                  {entry.beforeValue
                                    ? JSON.stringify(entry.beforeValue, null, 2)
                                    : '(null - record created)'}
                                </pre>
                              </div>
                              <div>
                                <span className="text-emerald-400 font-semibold block mb-1.5">
                                  After Value Snapshot
                                </span>
                                <pre className="bg-slate-900 border border-slate-800 p-3 rounded-lg overflow-x-auto max-h-48">
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
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 5: PROVISION NEW BUSINESS ACCOUNT                          */}
            {/* ============================================================== */}
            {activeTab === 'provision' && (
              <div className="max-w-2xl mx-auto space-y-5">
                <SettingsSectionHeader
                  title="Provision New Business Tenant"
                  description="Associates a new isolated enterprise tenant with a designated Google or Email Account. The owner receives administrative ownership upon signing in."
                />

                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800">
                  <form onSubmit={handleProvisionSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Business / Store Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={newBizName}
                        onChange={(e) => setNewBizName(e.target.value)}
                        placeholder="e.g. Coastline Supermarkets Ltd"
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Business Owner Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={newBizOwnerEmail}
                          onChange={(e) => setNewBizOwnerEmail(e.target.value)}
                          placeholder="e.g. owner@coastlinesuper.com"
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                          Must match their Google or Email login
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Owner Full Name
                        </label>
                        <input
                          type="text"
                          value={newBizOwnerName}
                          onChange={(e) => setNewBizOwnerName(e.target.value)}
                          placeholder="e.g. Hassan Mohamed"
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Subscription Tier Plan
                      </label>
                      <select
                        value={newBizPlan}
                        onChange={(e) => setNewBizPlan(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 cursor-pointer"
                      >
                        <option value="free">Free Advisory (1 Branch, 1 Staff, 250 SKUs)</option>
                        <option value="starter">Starter (1 Branch, 2 Staff, Unlimited SKUs)</option>
                        <option value="business">Business / Pro (3 Branches, 10 Staff)</option>
                        <option value="premium">Premium / Enterprise (Unlimited Branches & Staff)</option>
                      </select>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveTab('tenants')}
                        className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Provision Tenant &amp; Assign Owner</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* TAB 6: PAYMENT RECONCILIATION (Restricted)                     */}
            {/* ============================================================== */}
            {activeTab === 'reconciliation' &&
              (isSuperAdminUser ? (
                <SuperAdminReconciliationTab />
              ) : (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <Lock className="w-10 h-10 text-rose-500 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Restricted Access Panel
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    Payment Reconciliation is restricted exclusively to authorized Platform Support.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tenants')}
                    className="mt-4 px-4 py-2 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition cursor-pointer"
                  >
                    Return to Business Tenants
                  </button>
                </div>
              ))}

            {/* ============================================================== */}
            {/* TAB 6B: GLOBAL eTIMS OUTBOX (Restricted)                       */}
            {/* ============================================================== */}
            {activeTab === 'etims' &&
              (isSuperAdminUser ? (
                <SuperAdminEtimsOutboxTab onBacklogCountChange={setEtimsBacklogCount} />
              ) : (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <Lock className="w-10 h-10 text-rose-500 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Restricted Access Panel
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    Global eTIMS Outbox is restricted exclusively to authorized Platform Support.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tenants')}
                    className="mt-4 px-4 py-2 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition cursor-pointer"
                  >
                    Return to Business Tenants
                  </button>
                </div>
              ))}

            {/* ============================================================== */}
            {/* TAB 7: AFFILIATES & PAYOUTS (Restricted)                       */}
            {/* ============================================================== */}
            {activeTab === 'affiliates' && isSuperAdminUser && <SuperAdminAffiliatesTab />}

            {/* ============================================================== */}
            {/* TAB 8: TRAFFIC & TELEMETRY (Restricted)                        */}
            {/* ============================================================== */}
            {activeTab === 'traffic' && isSuperAdminUser && <SuperAdminTrafficTab />}

            {/* ============================================================== */}
            {/* TAB 9: PLATFORM BRANDING & ASSETS                              */}
            {/* ============================================================== */}
            {activeTab === 'branding' && <SuperAdminBrandingTab />}
          </div>
        </div>
      </div>

      {/* Paystack Settlement Modal */}
      {selectedSubaccountBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Paystack Settlement · {selectedSubaccountBiz.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{selectedSubaccountBiz.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubaccountBizId(null)}
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto modal-scrollbar">
              <PaystackSubaccountPanel targetBusiness={selectedSubaccountBiz} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { SuperAdminDashboardModal as SuperAdminDashboardView };
