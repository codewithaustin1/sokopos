import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Package,
  Radio,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Clock,
  FileText,
  Truck,
  Settings,
  ShieldAlert,
  Share2,
  Lock,
} from 'lucide-react';
import { AnalyticsIcon } from './icons/AnalyticsIcon';
import { usePos } from '../context/PosContext';

interface SidebarNavProps {
  currentTab: 'register' | 'inventory' | 'suppliers' | 'analytics' | 'reports' | 'cloud-sync' | 'staff' | 'shifts' | 'customers' | 'settings' | 'super-admin';
  setCurrentTab: (tab: 'register' | 'inventory' | 'suppliers' | 'analytics' | 'reports' | 'cloud-sync' | 'staff' | 'shifts' | 'customers' | 'settings' | 'super-admin') => void;
  openBarcodeScanner?: () => void;
  openSuperAdminModal?: (tab?: 'tenants' | 'subscriptions' | 'pricing' | 'audit' | 'provision' | 'branding') => void;
}

const BACK_OFFICE_STORAGE_KEY = 'sokopos_sidebar_backoffice_expanded';
const BACK_OFFICE_TABS = new Set(['suppliers', 'reports', 'cloud-sync', 'staff', 'settings', 'super-admin']);

export const SidebarNav: React.FC<SidebarNavProps> = ({
  currentTab,
  setCurrentTab,
}) => {
  const {
    cart,
    pendingOfflineCount,
    currentUser,
    isSuperAdmin,
    openReturnsModal,
    setIsAffiliateModalOpen,
    can,
    entitlements,
    t,
  } = usePos();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isBackOfficeExpanded, setIsBackOfficeExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(BACK_OFFICE_STORAGE_KEY);
      if (saved === 'true') return true;
      if (saved === 'false') return false;
    } catch {}
    return false;
  });

  useEffect(() => {
    if (BACK_OFFICE_TABS.has(currentTab) && !isBackOfficeExpanded) {
      setIsBackOfficeExpanded(true);
    }
  }, [currentTab, isBackOfficeExpanded]);

  const toggleBackOffice = () => {
    setIsBackOfficeExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(BACK_OFFICE_STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const isOwnerOrAdmin = currentUser?.role === 'business_owner' || isSuperAdmin;

  const primaryNavItems = [
    {
      id: 'register',
      tab: 'register' as const,
      label: t('nav_sell', 'Sell'),
      icon: ShoppingCart,
      badge: cartItemCount > 0 ? `${cartItemCount}` : null,
      allowed: can('sell'),
      tierLocked: false,
    },
    {
      id: 'customers',
      tab: 'customers' as const,
      label: t('nav_customers', 'Customers'),
      icon: Users,
      badge: null,
      allowed: can('viewCustomers') || can('manageCustomers'),
      tierLocked: false,
    },
    {
      id: 'inventory',
      tab: 'inventory' as const,
      label: t('nav_inventory', 'Inventory'),
      icon: Package,
      badge: null,
      allowed: can('viewInventory'),
      tierLocked: false,
    },
    {
      id: 'shifts',
      tab: 'shifts' as const,
      label: t('nav_shifts', 'Shifts & Till'),
      icon: Clock,
      badge: null,
      allowed: can('openShift') || can('viewShiftTotals'),
      tierLocked: false,
    },
    {
      id: 'analytics',
      tab: 'analytics' as const,
      label: t('nav_analytics', 'Analytics'),
      icon: AnalyticsIcon,
      badge: null,
      allowed: can('viewAnalytics'),
      tierLocked: !isSuperAdmin && !entitlements.capabilities.analytics,
    },
  ].filter((it) => it.allowed);

  const backOfficeTabItems = [
    {
      id: 'suppliers',
      tab: 'suppliers' as const,
      label: t('nav_suppliers', 'Suppliers'),
      icon: Truck,
      badge: null,
      badgeTone: 'neutral' as const,
      allowed: can('manageSuppliers'),
      tierLocked: !isSuperAdmin && !entitlements.capabilities.suppliers,
    },
    {
      id: 'reports',
      tab: 'reports' as const,
      label: t('nav_reports', 'Reports'),
      icon: FileText,
      badge: null,
      badgeTone: 'neutral' as const,
      allowed: can('viewReports'),
      tierLocked: false,
    },
    {
      id: 'cloud-sync',
      tab: 'cloud-sync' as const,
      label: t('nav_cloud_sync', 'Cloud Sync'),
      icon: Radio,
      badge: pendingOfflineCount > 0 ? `${pendingOfflineCount}` : null,
      badgeTone: 'warning' as const,
      allowed: true,
      tierLocked: false,
    },
    {
      id: 'staff',
      tab: 'staff' as const,
      label: t('auth_staff_tab', 'Staff Users'),
      icon: Users,
      badge: null,
      badgeTone: 'neutral' as const,
      allowed: isOwnerOrAdmin,
      tierLocked: false,
    },
    {
      id: 'settings',
      tab: 'settings' as const,
      label: t('nav_settings', 'Store Settings'),
      icon: Settings,
      badge: null,
      badgeTone: 'neutral' as const,
      allowed: isOwnerOrAdmin,
      tierLocked: false,
    },
    {
      id: 'superadmin',
      tab: 'super-admin' as const,
      label: t('nav_super_admin', 'Super-Admin'),
      icon: ShieldAlert,
      badge: null,
      badgeTone: 'neutral' as const,
      allowed: isSuperAdmin,
      tierLocked: false,
    },
  ].filter((it) => it.allowed);

  const hasBackOfficeActive = BACK_OFFICE_TABS.has(currentTab);

  return (
    <aside
      id="left-vertical-sidebar-nav"
      className={`hidden lg:flex flex-col h-full bg-white border-r border-slate-200 transition-all duration-200 ease-in-out select-none shrink-0 z-20 ${
        isCollapsed ? 'w-16' : 'w-56 xl:w-60'
      }`}
      aria-label="Vertical Navigation"
    >
      {/* Navigation Items Area */}
      <div className="flex-1 py-3.5 px-2.5 space-y-4 overflow-y-auto">
        {/* Core Daily Operations */}
        <nav className="space-y-1">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.tab;
            return (
              <button
                key={item.id}
                type="button"
                id={`sidebar-nav-${item.id}`}
                onClick={() => setCurrentTab(item.tab)}
                className={`w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors duration-150 cursor-pointer group whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-1 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
                title={item.label}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                  }`}
                />
                {!isCollapsed && (
                  <span className="flex-1 text-left truncate">{item.label}</span>
                )}
                {!isCollapsed && item.tierLocked && (
                  <Lock
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-white/80' : 'text-slate-400'
                    }`}
                    aria-label="Requires plan upgrade"
                  />
                )}
                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[11px] font-mono tabular-nums font-bold leading-none shrink-0 ${
                      isActive ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Progressive Back Office & Tools Group */}
        <div className="pt-3 border-t border-slate-100">
          {!isCollapsed && (
            <button
              id="sidebar-backoffice-toggle-btn"
              type="button"
              aria-expanded={isBackOfficeExpanded}
              onClick={toggleBackOffice}
              className={`w-full min-h-[36px] flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors duration-150 cursor-pointer ${
                hasBackOfficeActive && !isBackOfficeExpanded
                  ? 'text-blue-700 bg-blue-50/70'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                <span>Back Office</span>
                {!isBackOfficeExpanded && pendingOfflineCount > 0 && (
                  <span className="font-mono tabular-nums text-[10px] font-bold text-amber-700">
                    · {pendingOfflineCount} pending
                  </span>
                )}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${
                  isBackOfficeExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}

          {(isBackOfficeExpanded || isCollapsed) && (
            <nav className="space-y-1 mt-1">
              {/* Returns & Refunds Modal Action */}
              <button
                type="button"
                id="sidebar-nav-returns"
                onClick={() => openReturnsModal(null)}
                className={`w-full min-h-[40px] flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100 group whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-1 ${
                  isCollapsed ? 'justify-center px-2' : ''
                }`}
                title="Returns & Refunds"
              >
                <RotateCcw className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-slate-700 transition-colors duration-150" />
                {!isCollapsed && (
                  <span className="flex-1 text-left truncate">
                    {t('nav_returns', 'Returns & Refunds')}
                  </span>
                )}
                {!isCollapsed && !isSuperAdmin && !entitlements.capabilities.returnsAndRefunds && (
                  <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-label="Requires plan upgrade" />
                )}
              </button>

              {backOfficeTabItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.tab;
                return (
                  <button
                    key={item.id}
                    type="button"
                    id={`sidebar-nav-${item.id}`}
                    onClick={() => setCurrentTab(item.tab)}
                    className={`w-full min-h-[40px] flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer group whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-1 ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    } ${isCollapsed ? 'justify-center px-2' : ''}`}
                    title={item.label}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="flex-1 text-left truncate">{item.label}</span>
                    )}
                    {!isCollapsed && item.tierLocked && (
                      <Lock
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? 'text-white/80' : 'text-slate-400'
                        }`}
                        aria-label="Requires plan upgrade"
                      />
                    )}
                    {!isCollapsed && item.badge && (
                      <span
                        className={`text-[11px] font-mono tabular-nums font-bold leading-none shrink-0 ${
                          isActive
                            ? 'text-blue-100'
                            : item.badgeTone === 'warning'
                            ? 'text-amber-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {isOwnerOrAdmin && (
                <button
                  type="button"
                  id="sidebar-nav-affiliates"
                  onClick={() => setIsAffiliateModalOpen(true)}
                  className={`w-full min-h-[40px] flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer group text-slate-600 hover:text-slate-900 hover:bg-slate-100 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-1 ${
                    isCollapsed ? 'justify-center px-2' : ''
                  }`}
                  title="Refer & Earn (20% Recurring)"
                >
                  <Share2 className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-slate-700 transition-colors duration-150" />
                  {!isCollapsed && (
                    <span className="flex-1 text-left truncate">Refer &amp; Earn</span>
                  )}
                </button>
              )}
            </nav>
          )}
        </div>
      </div>

      {/* Sidebar Footer Controls */}
      <div className="p-2 border-t border-slate-200 bg-slate-50/60">
        {/* Collapse / Expand Toggle Button */}
        <button
          type="button"
          id="sidebar-collapse-toggle-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full min-h-[44px] flex items-center justify-center gap-1.5 py-1.5 px-2 text-slate-500 hover:text-slate-800 text-xs font-medium transition-colors duration-150 rounded-lg hover:bg-slate-100 cursor-pointer whitespace-nowrap"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse Menu</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
