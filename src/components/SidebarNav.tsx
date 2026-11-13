import React, { useState } from 'react';
import {
  ShoppingCart,
  Package,
  Radio,
  Users,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Clock,
  FileText,
  Truck,
  Settings,
  ShieldAlert,
  Share2,
} from 'lucide-react';
import { AnalyticsIcon } from './icons/AnalyticsIcon';
import { usePos } from '../context/PosContext';

interface SidebarNavProps {
  currentTab: 'register' | 'inventory' | 'suppliers' | 'analytics' | 'reports' | 'cloud-sync' | 'staff' | 'shifts' | 'customers' | 'settings' | 'super-admin';
  setCurrentTab: (tab: 'register' | 'inventory' | 'suppliers' | 'analytics' | 'reports' | 'cloud-sync' | 'staff' | 'shifts' | 'customers' | 'settings' | 'super-admin') => void;
  openBarcodeScanner?: () => void;
  openSuperAdminModal?: (tab?: 'tenants' | 'subscriptions' | 'pricing' | 'audit' | 'provision' | 'branding') => void;
}

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
    t,
  } = usePos();

  const [isCollapsed, setIsCollapsed] = useState(false);

  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const isOwnerOrAdmin = currentUser?.role === 'business_owner' || isSuperAdmin;

  const rawNavItems = [
    {
      id: 'register',
      tab: 'register' as const,
      label: t('nav_sell', 'Sell'),
      icon: ShoppingCart,
      badge: cartItemCount > 0 ? `${cartItemCount}` : null,
      badgeTone: 'neutral' as const,
      allowed: can('sell'),
    },
    {
      id: 'customers',
      tab: 'customers' as const,
      label: t('nav_customers', 'Customers'),
      icon: Users,
      badge: null,
      badgeTone: 'neutral' as const,
      allowed: can('viewCustomers') || can('manageCustomers'),
    },
    {
      id: 'inventory',
      tab: 'inventory' as const,
      label: t('nav_inventory', 'Inventory'),
      icon: Package,
      badge: null,
      badgeTone: 'neutral' as const,
      allowed: can('viewInventory'),
    },
    {
      id: 'suppliers',
      tab: 'suppliers' as const,
      label: t('nav_suppliers', 'Suppliers'),
      icon: Truck,
      badge: null,
      badgeTone: 'neutral' as const,
      allowed: can('manageSuppliers'),
    },
    {
      id: 'shifts',
      tab: 'shifts' as const,
      label: t('nav_shifts', 'Shifts & Till'),
      icon: Clock,
      badge: null,
      badgeTone: 'neutral' as const,
      allowed: can('openShift') || can('viewShiftTotals'),
    },
    {
      id: 'analytics',
      tab: 'analytics' as const,
      label: t('nav_analytics', 'Analytics'),
      icon: AnalyticsIcon,
      badge: null,
      badgeTone: 'neutral' as const,
      allowed: can('viewAnalytics'),
    },
    {
      id: 'reports',
      tab: 'reports' as const,
      label: t('nav_reports', 'Reports'),
      icon: FileText,
      badge: null,
      badgeTone: 'neutral' as const,
      allowed: can('viewReports'),
    },
    {
      id: 'cloud-sync',
      tab: 'cloud-sync' as const,
      label: t('nav_cloud_sync', 'Cloud Sync'),
      icon: Radio,
      badge: pendingOfflineCount > 0 ? `${pendingOfflineCount}` : null,
      badgeTone: 'warning' as const,
      allowed: true,
    },
  ];

  const mainNavItems = rawNavItems.filter((it) => it.allowed);

  return (
    <aside
      id="left-vertical-sidebar-nav"
      className={`hidden lg:flex flex-col h-full bg-white border-r border-slate-200 transition-all duration-200 ease-in-out select-none shrink-0 z-20 ${
        isCollapsed ? 'w-16' : 'w-56 xl:w-60'
      }`}
      aria-label="Vertical Navigation"
    >
      {/* Navigation Items Area */}
      <div className="flex-1 py-3.5 px-2.5 space-y-5 overflow-y-auto">
        {/* Main Operations Section */}
        <div>
          {!isCollapsed && (
            <div className="px-3 pb-1.5 text-[11px] font-semibold text-slate-400">
              Operations
            </div>
          )}
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.tab;
              return (
                <button
                  key={item.id}
                  type="button"
                  id={`sidebar-nav-${item.id}`}
                  onClick={() => setCurrentTab(item.tab)}
                  className={`w-full min-h-[40px] flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors duration-150 cursor-pointer group whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-1 ${
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
                  {!isCollapsed && item.badge && (
                    <span
                      className={`text-[11px] font-mono tabular-nums font-bold px-1.5 py-0.5 rounded-md leading-none shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : item.badgeTone === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Returns & Refunds Operation Action */}
            <button
              type="button"
              id="sidebar-nav-returns"
              onClick={() => openReturnsModal(null)}
              className={`w-full min-h-[40px] flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors duration-150 cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100 group whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-1 ${
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
            </button>
          </nav>
        </div>

        {/* Administration Section (Owner / Super-Admin) */}
        {isOwnerOrAdmin && (
          <div className="pt-3 border-t border-slate-100">
            {!isCollapsed && (
              <div className="px-3 pb-1.5 text-[11px] font-semibold text-slate-400">
                Administration
              </div>
            )}
            <nav className="space-y-1">
              {/* Staff Users Tab */}
              <button
                type="button"
                id="sidebar-nav-staff"
                onClick={() => setCurrentTab('staff')}
                className={`w-full min-h-[40px] flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors duration-150 cursor-pointer group whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-1 ${
                  currentTab === 'staff'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
                title="Staff Users"
              >
                <Users
                  className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                    currentTab === 'staff' ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                  }`}
                />
                {!isCollapsed && (
                  <span className="flex-1 text-left truncate">{t('auth_staff_tab', 'Staff Users')}</span>
                )}
              </button>

              {/* Store Settings Tab */}
              <button
                type="button"
                id="sidebar-nav-settings"
                onClick={() => setCurrentTab('settings')}
                className={`w-full min-h-[40px] flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors duration-150 cursor-pointer group whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-1 ${
                  currentTab === 'settings'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
                title="Store Settings"
              >
                <Settings
                  className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                    currentTab === 'settings' ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                  }`}
                />
                {!isCollapsed && (
                  <span className="flex-1 text-left truncate">{t('nav_settings', 'Store Settings')}</span>
                )}
              </button>

              {/* Refer & Earn (Affiliate Partner Portal) */}
              <button
                type="button"
                id="sidebar-nav-affiliates"
                onClick={() => setIsAffiliateModalOpen(true)}
                className={`w-full min-h-[40px] flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors duration-150 cursor-pointer group text-slate-600 hover:text-slate-900 hover:bg-slate-100 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-1 ${
                  isCollapsed ? 'justify-center px-2' : ''
                }`}
                title="Refer & Earn (20% Recurring)"
              >
                <Share2 className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-slate-700 transition-colors duration-150" />
                {!isCollapsed && (
                  <span className="flex-1 text-left truncate">Refer & Earn</span>
                )}
              </button>

              {/* Super-Admin Console Tab (Super Admin Only) */}
              {isSuperAdmin && (
                <button
                  type="button"
                  id="sidebar-nav-superadmin"
                  onClick={() => setCurrentTab('super-admin')}
                  className={`w-full min-h-[40px] flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors duration-150 cursor-pointer group whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-1 ${
                    currentTab === 'super-admin'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  } ${isCollapsed ? 'justify-center px-2' : ''}`}
                  title="Super-Admin Console"
                >
                  <ShieldAlert
                    className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                      currentTab === 'super-admin' ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="flex-1 text-left truncate">{t('nav_super_admin', 'Super-Admin')}</span>
                  )}
                </button>
              )}
            </nav>
          </div>
        )}
      </div>

      {/* Sidebar Footer Controls */}
      <div className="p-2 border-t border-slate-200 bg-slate-50/60">
        {/* Collapse / Expand Toggle Button */}
        <button
          type="button"
          id="sidebar-collapse-toggle-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full min-h-[36px] flex items-center justify-center gap-1.5 py-1.5 px-2 text-slate-500 hover:text-slate-800 text-xs font-medium transition-colors duration-150 rounded-lg hover:bg-slate-100 cursor-pointer whitespace-nowrap"
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
