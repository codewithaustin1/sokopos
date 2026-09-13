import React, { useState } from 'react';
import {
  ShoppingCart,
  Package,
  BarChart3,
  Cloud,
  CloudOff,
  RefreshCw,
  Scan,
  Lock,
  ChevronDown,
  Building2,
  CheckCircle2,
  Radio,
  Users,
  Shield,
  LogOut,
  User,
  Sparkles,
  Store,
  KeyRound,
  Settings,
} from 'lucide-react';
import { usePos } from '../context/PosContext';

interface HeaderProps {
  currentTab: 'register' | 'inventory' | 'analytics' | 'cloud-sync' | 'staff';
  setCurrentTab: (tab: 'register' | 'inventory' | 'analytics' | 'cloud-sync' | 'staff') => void;
  openBarcodeScanner: () => void;
  openAuthModal: () => void;
  openSuperAdminModal: () => void;
  openSignOutModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  openBarcodeScanner,
  openAuthModal,
  openSuperAdminModal,
  openSignOutModal,
}) => {
  const {
    locations,
    currentLocation,
    setCurrentLocationId,
    currentCashier,
    setIsPinLocked,
    isOnline,
    setIsOnline,
    syncStatus,
    triggerCloudSync,
    pendingOfflineCount,
    cart,
    currentUser,
    currentBusiness,
    isSuperAdmin,
    logout,
    openBusinessSettings,
  } = usePos();

  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const isOwnerOrAdmin = currentUser.role === 'business_owner' || isSuperAdmin;

  return (
    <header className="bg-white border-b border-slate-200 h-16 px-4 md:px-6 flex items-center justify-between shrink-0 shadow-xs z-30 relative">
      {/* Brand & Business / Location Selector */}
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-black text-blue-600 tracking-tight leading-none">
              SokoPoS
            </span>
            <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-1.5 py-0.5 rounded">
              PRO
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate max-w-[140px]">
            {currentBusiness?.name || 'Sokoplus Horizon'}
          </span>
        </div>

        {/* Multi-Location Switcher Dropdown (scoped to current business) */}
        <div className="relative">
          <button
            onClick={() => setIsLocationMenuOpen(!isLocationMenuOpen)}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-lg border border-slate-200 transition text-xs font-semibold text-slate-800 cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <div className="text-left hidden sm:block">
              <div className="leading-tight font-bold truncate max-w-[140px]">
                {currentLocation.name}
              </div>
              <div className="text-[10px] text-slate-500 font-normal">
                {currentLocation.terminalName.split(' ')[0]}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {isLocationMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsLocationMenuOpen(false)}
              />
              <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in-50">
                <div className="px-3 py-2 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  Store Branches ({currentBusiness.name})
                </div>
                <div className="space-y-1">
                  {locations.map((loc) => {
                    const isSelected = loc.id === currentLocation.id;
                    return (
                      <button
                        key={loc.id}
                        onClick={() => {
                          setCurrentLocationId(loc.id);
                          setIsLocationMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 text-blue-800 font-bold border border-blue-200'
                            : 'hover:bg-slate-50 text-slate-700 font-medium'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">{loc.name}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                          </div>
                          <div className="text-[10px] text-slate-400">{loc.city} • {loc.code}</div>
                        </div>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            loc.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <div className="pt-2 mt-1.5 border-t border-slate-100">
                  <button
                    id="header-manage-branches-btn"
                    onClick={() => {
                      setIsLocationMenuOpen(false);
                      openBusinessSettings('branches');
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Manage Branches & Terminals</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Tab Navigation */}
      <nav className="hidden lg:flex items-center h-full space-x-1">
        <button
          onClick={() => setCurrentTab('register')}
          className={`flex items-center gap-2 px-4 h-full text-xs font-bold transition border-b-2 cursor-pointer ${
            currentTab === 'register'
              ? 'text-blue-600 border-blue-600 bg-blue-50/40'
              : 'text-slate-600 border-transparent hover:bg-slate-50'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Register</span>
          {cartItemCount > 0 && (
            <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
              {cartItemCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setCurrentTab('inventory')}
          className={`flex items-center gap-2 px-4 h-full text-xs font-bold transition border-b-2 cursor-pointer ${
            currentTab === 'inventory'
              ? 'text-blue-600 border-blue-600 bg-blue-50/40'
              : 'text-slate-600 border-transparent hover:bg-slate-50'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Inventory</span>
        </button>

        <button
          onClick={() => setCurrentTab('analytics')}
          className={`flex items-center gap-2 px-4 h-full text-xs font-bold transition border-b-2 cursor-pointer ${
            currentTab === 'analytics'
              ? 'text-blue-600 border-blue-600 bg-blue-50/40'
              : 'text-slate-600 border-transparent hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analytics</span>
        </button>

        <button
          onClick={() => setCurrentTab('cloud-sync')}
          className={`flex items-center gap-2 px-4 h-full text-xs font-bold transition border-b-2 cursor-pointer ${
            currentTab === 'cloud-sync'
              ? 'text-blue-600 border-blue-600 bg-blue-50/40'
              : 'text-slate-600 border-transparent hover:bg-slate-50'
          }`}
        >
          <Radio className="w-4 h-4 text-emerald-600" />
          <span>Cloud Sync</span>
          {pendingOfflineCount > 0 && (
            <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {pendingOfflineCount}
            </span>
          )}
        </button>

        {/* Staff & System Users tab (visible to Owner & Super-Admin) */}
        {isOwnerOrAdmin && (
          <button
            onClick={() => setCurrentTab('staff')}
            className={`flex items-center gap-2 px-4 h-full text-xs font-bold transition border-b-2 cursor-pointer ${
              currentTab === 'staff'
                ? 'text-blue-600 border-blue-600 bg-blue-50/40'
                : 'text-slate-600 border-transparent hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4 text-purple-600" />
            <span>Staff Users</span>
          </button>
        )}

        {/* Business Profile Settings tab (visible to Owner & Super-Admin) */}
        {isOwnerOrAdmin && (
          <button
            id="nav-business-settings-btn"
            onClick={() => openBusinessSettings('profile')}
            className="flex items-center gap-2 px-4 h-full text-xs font-bold transition border-b-2 text-slate-600 border-transparent hover:bg-slate-50 hover:text-blue-600 cursor-pointer"
            title="Business Profile, Branches, Roles & Credentials"
          >
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Business Settings</span>
          </button>
        )}
      </nav>

      {/* Actions: Barcode Scanner + Sync + User Profile Dropdown */}
      <div className="flex items-center gap-2.5">
        {/* Quick Optical Scanner Trigger */}
        <button
          onClick={openBarcodeScanner}
          className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-xs font-bold border border-blue-200 transition cursor-pointer"
          title="Open Barcode Scanner (F2)"
        >
          <Scan className="w-4 h-4 text-blue-600" />
          <span className="hidden sm:inline">Scan Barcode</span>
        </button>

        {/* Cloud Sync & Online/Offline Pill */}
        <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
          <button
            onClick={triggerCloudSync}
            disabled={!isOnline || syncStatus === 'syncing'}
            className="p-1.5 text-slate-600 hover:text-blue-600 rounded transition disabled:opacity-40 cursor-pointer"
            title="Sync Data to Cloud Now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
              isOnline
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
            title="Toggle Network Simulation (Online/Offline Mode)"
          >
            {isOnline ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden md:inline">Cloud Synced</span>
              </>
            ) : (
              <>
                <CloudOff className="w-3.5 h-3.5 text-amber-600" />
                <span>Offline ({pendingOfflineCount})</span>
              </>
            )}
          </button>
        </div>

        {/* Authenticated User & Google OAuth Profile */}
        <div className="relative pl-2 border-l border-slate-200">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 text-right hover:opacity-90 transition group cursor-pointer"
          >
            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold text-slate-800 leading-tight flex items-center justify-end gap-1">
                <span>{currentUser?.name || 'Authorized User'}</span>
                {isSuperAdmin && (
                  <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-1.5 py-0.2 rounded">
                    SUPER-ADMIN
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {currentUser?.authProvider === 'google' ? 'Google OAuth' : 'System Credential'}
              </div>
            </div>
            <div
              className={`w-8 h-8 ${
                isSuperAdmin ? 'bg-amber-500 text-slate-950 font-black' : 'bg-blue-600 text-white font-bold'
              } rounded-full flex items-center justify-center text-xs shadow-xs`}
            >
              {currentUser?.initials || 'U'}
            </div>
          </button>

          {/* User Profile Menu */}
          {isUserMenuOpen && currentUser && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsUserMenuOpen(false)}
              />
              <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in-50 text-xs">
                {/* User card */}
                <div className="p-3 bg-slate-50 rounded-xl mb-1 border border-slate-100">
                  <div className="font-black text-slate-800">{currentUser.name}</div>
                  <div className="text-[11px] text-slate-500 break-all">{currentUser.email}</div>
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {currentUser.role.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {currentBusiness?.name}
                    </span>
                    {currentUser.firebaseUid && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Firebase ID Verified
                      </span>
                    )}
                  </div>
                </div>

                {/* Prominent Business Profile Settings Entry */}
                <button
                  id="user-menu-business-settings-btn"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    openBusinessSettings('profile');
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left font-bold text-blue-800 bg-blue-50/80 hover:bg-blue-100 transition cursor-pointer border border-blue-100 mb-1"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>Business Profile & Settings</span>
                  </div>
                  <span className="text-[10px] bg-blue-600 text-white font-extrabold px-1.5 py-0.5 rounded uppercase">
                    Config
                  </span>
                </button>

                <div className="space-y-0.5">
                  {/* Super-admin console */}
                  {isSuperAdmin && (
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        openSuperAdminModal();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 transition cursor-pointer"
                    >
                      <Shield className="w-4 h-4 text-amber-600" />
                      <span>Super-Admin Console & Audit</span>
                    </button>
                  )}

                  {/* Credential & PIN Settings */}
                  <button
                    id="user-menu-credentials-btn"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      openBusinessSettings('credentials');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-slate-500" />
                    <span>Credential & PIN Settings</span>
                  </button>

                  {/* Register PIN Lock */}
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsPinLocked(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <Lock className="w-4 h-4 text-slate-500" />
                    <span>Lock Register (Enter PIN)</span>
                  </button>

                  {/* Switch Account */}
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      openAuthModal();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    <span>Switch User / Google Account</span>
                  </button>

                  {/* Sign out */}
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      if (openSignOutModal) {
                        openSignOutModal();
                      } else {
                        logout();
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left font-bold text-red-600 hover:bg-red-50 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>Sign Out of POS</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
