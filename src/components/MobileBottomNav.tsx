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
  Moon,
  Sun,
  Palette,
  Printer,
} from 'lucide-react';
import { usePos } from '../context/PosContext';

interface MobileBottomNavProps {
  currentTab: 'register' | 'inventory' | 'analytics' | 'cloud-sync' | 'staff';
  setCurrentTab: (tab: 'register' | 'inventory' | 'analytics' | 'cloud-sync' | 'staff') => void;
  openBarcodeScanner: () => void;
  onRequestSignOut: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  setCurrentTab,
  openBarcodeScanner,
  onRequestSignOut,
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
    openBusinessSettings,
    setIsPinLocked,
    isSuperAdmin,
    setIsSuperAdminDashboardOpen,
    syncStatus,
    isDarkMode,
    toggleDarkMode,
    autoPrintReceipt,
  } = usePos();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const isOwnerOrAdmin = currentUser.role === 'business_owner' || isSuperAdmin;

  const handleNavClick = (tab: 'register' | 'inventory' | 'analytics' | 'cloud-sync' | 'staff') => {
    setCurrentTab(tab);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Drawer / Slide-up Sheet */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end lg:hidden animate-fade-in"
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl border-t border-slate-200 shadow-2xl max-h-[85vh] overflow-y-auto p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full ${currentUser.avatarColor} text-white font-black text-sm flex items-center justify-center shadow-xs`}
                >
                  {currentUser.initials}
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                    <span>{currentUser.name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 uppercase">
                      {currentUser.role.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">{currentBusiness.name}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Branch Quick Selector */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-blue-600" />
                  Active Branch Location
                </span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                  {locations.length} branches
                </span>
              </div>
              <select
                value={currentLocation.id}
                onChange={(e) => setCurrentLocationId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.city}) - {loc.terminalName}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  openBarcodeScanner();
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold text-xs transition cursor-pointer"
              >
                <Scan className="w-4 h-4 text-blue-600" />
                <span>Barcode Scanner</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsPinLocked(true);
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs transition cursor-pointer"
              >
                <Lock className="w-4 h-4 text-amber-600" />
                <span>Lock Keypad PIN</span>
              </button>
            </div>

            {/* Management & Administration Section */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                Store Management
              </div>

              {isOwnerOrAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleNavClick('staff');
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer border border-slate-200/80"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Staff Accounts & Roles</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  openBusinessSettings('profile');
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer border border-slate-200/80"
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Business Profile & Branches</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  openBusinessSettings('credentials');
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer border border-slate-200/80"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Security & Terminal PIN</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  openBusinessSettings('appearance');
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer border border-slate-200/80"
              >
                <div className="flex items-center gap-2.5">
                  <Palette className="w-4 h-4 text-blue-600" />
                  <span>Appearance & Dark Mode</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                    {isDarkMode ? 'Dark' : 'Light'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  openBusinessSettings('hardware');
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer border border-slate-200/80"
              >
                <div className="flex items-center gap-2.5">
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>Printing & Hardware</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      autoPrintReceipt
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {autoPrintReceipt ? 'Auto Print ON' : 'Manual'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>

              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsSuperAdminDashboardOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs transition cursor-pointer border border-amber-300"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Platform Super-Admin Portal</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-600" />
                </button>
              )}
            </div>

            {/* Offline Mode Toggle & Sign Out */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <button
                type="button"
                onClick={() => setIsOnline(!isOnline)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  isOnline
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isOnline ? (
                    <CloudOff className="w-4 h-4 text-slate-600" />
                  ) : (
                    <Cloud className="w-4 h-4 text-white" />
                  )}
                  <span>{isOnline ? 'Simulate Offline Mode' : 'Reconnect to Cloud Online'}</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onRequestSignOut();
                }}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs transition cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-red-600" />
                <span>Sign Out of Terminal Shift</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
          onClick={() => setIsMenuOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition cursor-pointer ${
            isMenuOpen ? 'text-blue-600 font-black' : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <Menu className="w-5 h-5 stroke-2" />
          <span className="text-[10px] tracking-tight mt-0.5">More</span>
        </button>
      </nav>
    </>
  );
};
