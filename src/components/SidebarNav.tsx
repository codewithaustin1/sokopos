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
  } = usePos();

  const [isCollapsed, setIsCollapsed] = useState(false);

  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const isOwnerOrAdmin = currentUser?.role === 'business_owner' || isSuperAdmin;

  const mainNavItems = [
    {
      id: 'register',
      tab: 'register' as const,
      label: 'Sell',
      icon: ShoppingCart,
      badge: cartItemCount > 0 ? `${cartItemCount}` : null,
      badgeColor: 'bg-blue-500 text-white',
      activeBadgeColor: 'bg-white text-blue-600',
    },
    {
      id: 'customers',
      tab: 'customers' as const,
      label: 'Customers',
      icon: Users,
      badge: null,
      badgeColor: '',
      activeBadgeColor: '',
    },
    {
      id: 'inventory',
      tab: 'inventory' as const,
      label: 'Inventory',
      icon: Package,
      badge: null,
      badgeColor: '',
      activeBadgeColor: '',
    },
    {
      id: 'suppliers',
      tab: 'suppliers' as const,
      label: 'Suppliers',
      icon: Truck,
      badge: null,
      badgeColor: '',
      activeBadgeColor: '',
    },
    {
      id: 'shifts',
      tab: 'shifts' as const,
      label: 'Shifts & Till',
      icon: Clock,
      badge: null,
      badgeColor: '',
      activeBadgeColor: '',
    },
    {
      id: 'analytics',
      tab: 'analytics' as const,
      label: 'Analytics',
      icon: AnalyticsIcon,
      badge: null,
      badgeColor: '',
      activeBadgeColor: '',
    },
    {
      id: 'reports',
      tab: 'reports' as const,
      label: 'Reports',
      icon: FileText,
      badge: null,
      badgeColor: '',
      activeBadgeColor: '',
    },
    {
      id: 'cloud-sync',
      tab: 'cloud-sync' as const,
      label: 'Cloud Sync',
      icon: Radio,
      badge: pendingOfflineCount > 0 ? `${pendingOfflineCount}` : null,
      badgeColor: 'bg-amber-500 text-white',
      activeBadgeColor: 'bg-amber-400 text-slate-950 font-black',
    },
  ];

  return (
    <aside
      id="left-vertical-sidebar-nav"
      className={`hidden lg:flex flex-col h-full bg-white border-r border-slate-200 transition-all duration-200 ease-in-out select-none shrink-0 z-20 ${
        isCollapsed ? 'w-18' : 'w-56 xl:w-60'
      }`}
      aria-label="Vertical Navigation"
    >
      {/* Navigation Items Area */}
      <div className="flex-1 py-3.5 px-2.5 space-y-4 overflow-y-auto">
        {/* Main Operations Section */}
        <div>
          {!isCollapsed && (
            <div className="px-2.5 pb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
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
                  id={`sidebar-nav-${item.id}`}
                  onClick={() => setCurrentTab(item.tab)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer group ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  } ${isCollapsed ? 'justify-center px-2' : ''}`}
                  title={item.label}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition ${
                      isActive
                        ? 'text-white'
                        : item.id === 'cloud-sync'
                        ? 'text-emerald-600'
                        : 'text-slate-500 group-hover:text-slate-800'
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  )}
                  {!isCollapsed && item.badge && (
                    <span
                      className={`text-[10px] font-black px-1.5 py-0.2 rounded-full leading-none shrink-0 ${
                        isActive ? item.activeBadgeColor : item.badgeColor
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
              id="sidebar-nav-returns"
              onClick={() => openReturnsModal(null)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-slate-600 hover:text-amber-900 hover:bg-amber-50 group ${
                isCollapsed ? 'justify-center px-2' : ''
              }`}
              title="Returns & Refunds"
            >
              <RotateCcw className="w-4 h-4 shrink-0 text-amber-600 group-hover:text-amber-700 transition" />
              {!isCollapsed && (
                <span className="flex-1 text-left truncate text-slate-700 group-hover:text-amber-900">
                  Returns & Refunds
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Administration Section (Owner / Super-Admin) */}
        {isOwnerOrAdmin && (
          <div className="pt-2 border-t border-slate-100">
            {!isCollapsed && (
              <div className="px-2.5 pb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Administration
              </div>
            )}
            <nav className="space-y-1">
              {/* Staff Users Tab */}
              <button
                id="sidebar-nav-staff"
                onClick={() => setCurrentTab('staff')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer group ${
                  currentTab === 'staff'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
                title="Staff Users"
              >
                <Users
                  className={`w-4 h-4 shrink-0 transition ${
                    currentTab === 'staff'
                      ? 'text-white'
                      : 'text-purple-600 group-hover:text-purple-700'
                  }`}
                />
                {!isCollapsed && (
                  <span className="flex-1 text-left truncate">Staff Users</span>
                )}
              </button>

              {/* Store Settings Tab */}
              <button
                id="sidebar-nav-settings"
                onClick={() => setCurrentTab('settings')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer group ${
                  currentTab === 'settings'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
                title="Store Settings"
              >
                <Settings
                  className={`w-4 h-4 shrink-0 transition ${
                    currentTab === 'settings'
                      ? 'text-white'
                      : 'text-blue-600 group-hover:text-blue-700'
                  }`}
                />
                {!isCollapsed && (
                  <span className="flex-1 text-left truncate">Store Settings</span>
                )}
              </button>

              {/* Super-Admin Console Tab (Super Admin Only) */}
              {isSuperAdmin && (
                <button
                  id="sidebar-nav-superadmin"
                  onClick={() => setCurrentTab('super-admin')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer group ${
                    currentTab === 'super-admin'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-amber-900 hover:bg-amber-50'
                  } ${isCollapsed ? 'justify-center px-2' : ''}`}
                  title="Super-Admin Console"
                >
                  <ShieldAlert
                    className={`w-4 h-4 shrink-0 transition ${
                      currentTab === 'super-admin'
                        ? 'text-white'
                        : 'text-amber-600 group-hover:text-amber-700'
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="flex-1 text-left truncate">Super-Admin</span>
                  )}
                  {!isCollapsed && (
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                        currentTab === 'super-admin'
                          ? 'bg-white text-blue-600'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      Root
                    </span>
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
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-slate-400 hover:text-slate-700 text-[11px] font-semibold transition rounded-lg hover:bg-slate-100 cursor-pointer"
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
