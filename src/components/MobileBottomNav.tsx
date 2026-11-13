import React from 'react';
import {
  ShoppingCart,
  Package,
  BarChart3,
  RefreshCw,
  Menu,
} from 'lucide-react';
import { usePos } from '../context/PosContext';

interface MobileBottomNavProps {
  currentTab: 'register' | 'inventory' | 'suppliers' | 'analytics' | 'reports' | 'cloud-sync' | 'staff' | 'shifts' | 'customers' | 'settings' | 'super-admin';
  setCurrentTab: (tab: 'register' | 'inventory' | 'suppliers' | 'analytics' | 'reports' | 'cloud-sync' | 'staff' | 'shifts' | 'customers' | 'settings' | 'super-admin') => void;
  openBarcodeScanner: () => void;
  onRequestSignOut: () => void;
  openHelpModal?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  setCurrentTab,
}) => {
  const {
    cart,
    pendingOfflineCount,
    isOnline,
    syncStatus,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    toggleMobileMenu,
    t,
  } = usePos();

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleNavClick = (
    tab: 'register' | 'inventory' | 'suppliers' | 'analytics' | 'reports' | 'cloud-sync' | 'staff' | 'shifts' | 'customers' | 'settings' | 'super-admin'
  ) => {
    setCurrentTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav
      id="mobile-bottom-navigation"
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 lg:hidden flex items-center justify-around px-2 py-1 safe-bottom"
    >
      {/* Register Tab */}
      <button
        type="button"
        onClick={() => handleNavClick('register')}
        className={`flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors duration-150 cursor-pointer relative ${
          currentTab === 'register'
            ? 'text-blue-600 font-bold'
            : 'text-slate-500 hover:text-slate-800 font-medium'
        }`}
      >
        <div className="relative">
          <ShoppingCart className={`w-5 h-5 ${currentTab === 'register' ? 'stroke-[2.25]' : 'stroke-[1.75]'}`} />
          {totalCartItems > 0 && (
            <span className="absolute -top-1.5 -right-2.5 bg-blue-600 text-white text-[10px] font-mono font-bold tabular-nums rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
              {totalCartItems}
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-tight mt-0.5">{t('nav_sell', 'Sell')}</span>
      </button>

      {/* Inventory Tab */}
      <button
        type="button"
        onClick={() => handleNavClick('inventory')}
        className={`flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors duration-150 cursor-pointer ${
          currentTab === 'inventory'
            ? 'text-blue-600 font-bold'
            : 'text-slate-500 hover:text-slate-800 font-medium'
        }`}
      >
        <Package className={`w-5 h-5 ${currentTab === 'inventory' ? 'stroke-[2.25]' : 'stroke-[1.75]'}`} />
        <span className="text-[10px] tracking-tight mt-0.5">{t('nav_inventory', 'Inventory')}</span>
      </button>

      {/* Analytics Tab */}
      <button
        type="button"
        onClick={() => handleNavClick('analytics')}
        className={`flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors duration-150 cursor-pointer ${
          currentTab === 'analytics'
            ? 'text-blue-600 font-bold'
            : 'text-slate-500 hover:text-slate-800 font-medium'
        }`}
      >
        <BarChart3 className={`w-5 h-5 ${currentTab === 'analytics' ? 'stroke-[2.25]' : 'stroke-[1.75]'}`} />
        <span className="text-[10px] tracking-tight mt-0.5">{t('nav_analytics', 'Analytics')}</span>
      </button>

      {/* Cloud Sync Tab */}
      <button
        type="button"
        onClick={() => handleNavClick('cloud-sync')}
        className={`flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors duration-150 cursor-pointer relative ${
          currentTab === 'cloud-sync'
            ? 'text-blue-600 font-bold'
            : 'text-slate-500 hover:text-slate-800 font-medium'
        }`}
      >
        <div className="relative">
          <RefreshCw
            className={`w-5 h-5 ${syncStatus === 'syncing' ? 'animate-spin text-blue-600' : ''} ${
              currentTab === 'cloud-sync' ? 'stroke-[2.25]' : 'stroke-[1.75]'
            }`}
          />
          {pendingOfflineCount > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-amber-500 text-white text-[9px] font-mono font-bold tabular-nums rounded-full h-3.5 min-w-[14px] px-0.5 flex items-center justify-center">
              {pendingOfflineCount}
            </span>
          )}
          {!isOnline && (
            <span
              className="absolute -bottom-0.5 -right-1 w-2 h-2 rounded-full bg-red-500 border border-white"
              aria-label="Offline"
            />
          )}
        </div>
        <span className="text-[10px] tracking-tight mt-0.5">{t('action_sync', 'Sync')}</span>
      </button>

      {/* More Menu Drawer Trigger */}
      <button
        type="button"
        onClick={toggleMobileMenu}
        className={`flex-1 min-h-[44px] flex flex-col items-center justify-center py-1 px-1 rounded-lg transition-colors duration-150 cursor-pointer ${
          isMobileMenuOpen
            ? 'text-blue-600 font-bold'
            : 'text-slate-500 hover:text-slate-800 font-medium'
        }`}
      >
        <Menu className="w-5 h-5 stroke-[1.75]" />
        <span className="text-[10px] tracking-tight mt-0.5">{t('nav_settings', 'Menu')}</span>
      </button>
    </nav>
  );
};
