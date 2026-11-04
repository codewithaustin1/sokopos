import React, { useState } from 'react';
import {
  ShoppingCart,
  Package,
  BarChart3,
  RefreshCw,
  Menu,
  X,
  Scan,
  Lock,
  Building2,
  Users,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  CloudOff,
  Cloud,
  CheckCircle2,
  Store,
  Clock,
  FileText,
  Truck,
  Keyboard,
  Settings,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { MobileBentoMenuOverlay } from './common/MobileBentoMenuOverlay';


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
  openBarcodeScanner,
  onRequestSignOut,
  openHelpModal,
}) => {
  const {
    cart,
    pendingOfflineCount,
    isOnline,
    setIsOnline,
    currentUser,
    currentBusiness,
    locations,
    currentLocation,
    setCurrentLocationId,
    activeShift,
    openBusinessSettings,
    setIsPinLocked,
    isSuperAdmin,
    syncStatus,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    toggleMobileMenu,
  } = usePos();

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const isOwnerOrAdmin = currentUser.role === 'business_owner' || isSuperAdmin;

  const handleNavClick = (tab: 'register' | 'inventory' | 'suppliers' | 'analytics' | 'reports' | 'cloud-sync' | 'staff' | 'shifts' | 'customers' | 'settings' | 'super-admin') => {
    setCurrentTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Fixed Bottom Navigation Bar */}
      <nav
        id="mobile-bottom-navigation"
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] lg:hidden flex items-center justify-around px-2 py-1.5 safe-bottom"
      >
        {/* Register Tab */}
        <button
          type="button"
          onClick={() => handleNavClick('register')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition cursor-pointer relative ${
            currentTab === 'register' ? 'text-blue-600 font-black' : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="relative">
            <ShoppingCart className={`w-5 h-5 ${currentTab === 'register' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            {totalCartItems > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-blue-600 text-white text-[10px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center shadow-xs animate-scale-in">
                {totalCartItems}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Sell</span>
        </button>

        {/* Inventory Tab */}
        <button
          type="button"
          onClick={() => handleNavClick('inventory')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition cursor-pointer ${
            currentTab === 'inventory' ? 'text-blue-600 font-black' : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <Package className={`w-5 h-5 ${currentTab === 'inventory' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] tracking-tight mt-0.5">Inventory</span>
        </button>

        {/* Analytics Tab */}
        <button
          type="button"
          onClick={() => handleNavClick('analytics')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition cursor-pointer ${
            currentTab === 'analytics' ? 'text-blue-600 font-black' : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <BarChart3 className={`w-5 h-5 ${currentTab === 'analytics' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] tracking-tight mt-0.5">Analytics</span>
        </button>

        {/* Cloud Sync Tab */}
        <button
          type="button"
          onClick={() => handleNavClick('cloud-sync')}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition cursor-pointer relative ${
            currentTab === 'cloud-sync' ? 'text-blue-600 font-black' : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="relative">
            <RefreshCw
              className={`w-5 h-5 ${syncStatus === 'syncing' ? 'animate-spin text-blue-600' : ''} ${
                currentTab === 'cloud-sync' ? 'stroke-[2.5]' : 'stroke-2'
              }`}
            />
            {pendingOfflineCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-amber-500 text-white text-[9px] font-black rounded-full h-3.5 min-w-[14px] px-0.5 flex items-center justify-center">
                {pendingOfflineCount}
              </span>
            )}
            {!isOnline && (
              <span className="absolute -bottom-0.5 -right-1 w-2 h-2 rounded-full bg-red-500 border border-white" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Sync</span>
        </button>

        {/* More Menu Drawer Trigger */}
        <button
          type="button"
          onClick={toggleMobileMenu}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition cursor-pointer ${
            isMobileMenuOpen ? 'text-blue-600 font-black' : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <Menu className="w-5 h-5 stroke-2" />
          <span className="text-[10px] tracking-tight mt-0.5">More</span>
        </button>
      </nav>
    </>
  );
};
