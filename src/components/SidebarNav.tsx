import React, { useState } from 'react';
import {
  ShoppingCart,
  Package,
  BarChart3,
  Radio,
  Users,
  Building2,
  Scan,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Store,
  Sparkles,
  RotateCcw,
  Moon,
  Sun,
  Palette,
} from 'lucide-react';
import { usePos } from '../context/PosContext';

interface SidebarNavProps {
  currentTab: 'register' | 'inventory' | 'analytics' | 'cloud-sync' | 'staff';
  setCurrentTab: (tab: 'register' | 'inventory' | 'analytics' | 'cloud-sync' | 'staff') => void;
  openBarcodeScanner: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  currentTab,
  setCurrentTab,
  openBarcodeScanner,
}) => {
  const {
    cart,
    pendingOfflineCount,
    currentUser,
    currentLocation,
    currentBusiness,
    isSuperAdmin,
    openBusinessSettings,
    openReturnsModal,
    isDarkMode,
    toggleDarkMode,
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
      id: 'inventory',
      tab: 'inventory' as const,
      label: 'Inventory',
      icon: Package,
      badge: null,
      badgeColor: '',
      activeBadgeColor: '',
    },
    {
      id: 'analytics',
      tab: 'analytics' as const,
      label: 'Analytics',
      icon: BarChart3,
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
                  {item.badge && (
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

              {/* Business Settings Action */}
              <button
                id="sidebar-nav-business-settings"
                onClick={() => openBusinessSettings('profile')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-slate-600 hover:text-blue-600 hover:bg-blue-50/60 cursor-pointer group ${
                  isCollapsed ? 'justify-center px-2' : ''
                }`}
                title="Business Settings & Store Branches"
              >
                <Building2 className="w-4 h-4 text-blue-600 shrink-0 group-hover:scale-105 transition-transform" />
                {!isCollapsed && (
                  <span className="flex-1 text-left truncate">Business Settings</span>
                )}
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Sidebar Footer Controls */}
      <div className="p-2.5 border-t border-slate-200 bg-slate-50/60 space-y-2">
        {/* Quick Optical Scanner Launcher */}
        <button
          type="button"
          id="sidebar-quick-scan-btn"
          onClick={openBarcodeScanner}
          className={`w-full flex items-center gap-2.5 px-3 py-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 hover:border-blue-300 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${
            isCollapsed ? 'justify-center px-2' : ''
          }`}
          title="Open Barcode Scanner (F2)"
        >
          <Scan className="w-4 h-4 text-blue-600 shrink-0" />
          {!isCollapsed && (
            <div className="flex-1 flex items-center justify-between text-left">
              <span>Quick Scan</span>
              <kbd className="bg-slate-100 border border-slate-200 text-slate-500 font-mono text-[9px] px-1 py-0.5 rounded">
                F2
              </kbd>
            </div>
          )}
        </button>

        {/* Quick Dark Mode Theme Toggle in Sidebar */}
        <button
          type="button"
          id="sidebar-theme-toggle-btn"
          onClick={toggleDarkMode}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
            isDarkMode
              ? 'bg-blue-950/70 text-blue-300 border-blue-500/40 hover:bg-blue-900/80 shadow-2xs'
              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
          } ${isCollapsed ? 'justify-center px-2' : ''}`}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dim Retail Dark Mode'}
        >
          {isDarkMode ? (
            <Sun className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600 shrink-0" />
          )}
          {!isCollapsed && (
            <div className="flex-1 flex items-center justify-between text-left">
              <span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
              <span className="text-[10px] font-bold opacity-70">
                {isDarkMode ? 'Dim Retail' : 'Daytime'}
              </span>
            </div>
          )}
        </button>

        {/* Store & Terminal Active Status Card */}
        {!isCollapsed && (
          <div className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px]">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 truncate">
              <Store className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">{currentLocation.name}</span>
            </div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5">
              {currentLocation.terminalName} • {currentLocation.code}
            </div>
          </div>
        )}

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
