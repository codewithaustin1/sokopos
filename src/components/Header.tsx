import React, { useState } from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Scan,
  Lock,
  ChevronDown,
  Building2,
  Check,
  Shield,
  LogOut,
  Store,
  Settings,
  Moon,
  Sun,
  Clock,
  CreditCard,
  Keyboard,
  Globe,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { ScannerStatusBadge } from './ScannerStatusBadge';
import { AppLogo } from './common/AppLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentTab?: 'register' | 'inventory' | 'suppliers' | 'analytics' | 'reports' | 'cloud-sync' | 'staff' | 'shifts' | 'customers' | 'settings' | 'super-admin';
  setCurrentTab?: (tab: 'register' | 'inventory' | 'suppliers' | 'analytics' | 'reports' | 'cloud-sync' | 'staff' | 'shifts' | 'customers' | 'settings' | 'super-admin') => void;
  openBarcodeScanner: () => void;
  openSuperAdminModal: (tab?: 'tenants' | 'subscriptions' | 'pricing' | 'audit' | 'provision' | 'branding') => void;
  openSignOutModal?: () => void;
  openHelpModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  openBarcodeScanner,
  openSuperAdminModal,
  openSignOutModal,
  openHelpModal,
}) => {
  const {
    locations,
    currentLocation,
    setCurrentLocationId,
    setIsPinLocked,
    isOnline,
    setIsOnline,
    syncStatus,
    triggerCloudSync,
    pendingOfflineCount,
    currentUser,
    currentBusiness,
    activeShift,
    openShiftManagement,
    isSuperAdmin,
    logout,
    openBusinessSettings,
    isDarkMode,
    toggleDarkMode,
    showToast,
    isSubscriptionActive,
    openPricingPage,
    language,
    setLanguage,
    t,
    isMobileMenuOpen,
    toggleMobileMenu,
  } = usePos();

  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScannerDiagOpen, setIsScannerDiagOpen] = useState(false);

  const handleOpenScanner = () => {
    setIsUserMenuOpen(false);
    if (!activeShift || activeShift.status !== 'open') {
      showToast(
        'Scan Blocked: An active shift session is required before scanning items. Please open a shift first.',
        'error'
      );
      openShiftManagement();
      return;
    }
    openBarcodeScanner();
  };

  const handleSyncClick = () => {
    if (!isOnline) {
      showToast(
        'Offline simulator is active. Switch Network Mode to Online in your account menu to sync.',
        'info'
      );
      return;
    }
    triggerCloudSync();
  };

  return (
    <header
      id="main-pos-header"
      className="bg-white border-b border-slate-200 h-14 sm:h-16 px-3 sm:px-4 md:px-6 flex items-center justify-between gap-3 shrink-0 z-30 relative"
    >
      {/* Zone 1: Brand & Active Branch Switcher */}
      <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
        <button
          type="button"
          id="header-mobile-hamburger-btn"
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls="slide-menu"
          className="lg:hidden relative inline-flex items-center justify-center min-w-[40px] min-h-[40px] p-2 rounded-lg text-slate-700 hover:text-blue-600 hover:bg-slate-100 border border-slate-200 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 shrink-0"
        >
          <div className="w-5 h-4 flex flex-col justify-between items-center pointer-events-none">
            <span className="bar-top w-full h-0.5 bg-current rounded-full" />
            <span className="bar-middle w-full h-0.5 bg-current rounded-full" />
            <span className="bar-bottom w-full h-0.5 bg-current rounded-full" />
          </div>
        </button>

        <AppLogo
          theme="light"
          size="md"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.history.pushState(null, '', '/');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
          }}
          className="cursor-pointer hover:opacity-85 transition-opacity shrink-0"
        />

        {/* Branch Switcher (Desktop) */}
        <div className="hidden lg:block relative min-w-0">
          <button
            id="header-location-picker-btn"
            type="button"
            onClick={() => setIsLocationMenuOpen(!isLocationMenuOpen)}
            aria-expanded={isLocationMenuOpen}
            className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 px-3 min-h-[40px] rounded-lg border border-slate-200 transition-colors duration-150 text-xs font-semibold text-slate-800 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600"
            title={`Active Branch: ${currentLocation.name}`}
          >
            <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="font-semibold truncate max-w-[150px]">
              {currentLocation.name}
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="text-[11px] text-slate-500 font-normal truncate max-w-[90px]">
              {currentLocation.terminalName.split(' ')[0]}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>

          {isLocationMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsLocationMenuOpen(false)}
              />
              <div className="absolute top-full left-0 mt-1.5 w-72 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-50">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Store Branches · {currentBusiness.name}
                </div>
                <div className="space-y-0.5">
                  {locations.map((loc) => {
                    const isSelected = loc.id === currentLocation.id;
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => {
                          setCurrentLocationId(loc.id);
                          setIsLocationMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors duration-150 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 text-blue-700 font-semibold'
                            : 'hover:bg-slate-50 text-slate-700 font-medium'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate">{loc.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                          </div>
                          <div className="text-[11px] text-slate-400 font-normal">
                            {loc.city} · {loc.code}
                          </div>
                        </div>
                        <span
                          className={`text-[11px] font-medium whitespace-nowrap shrink-0 ${
                            loc.isOnline ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {loc.isOnline ? 'Online' : 'Offline'}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="pt-1.5 mt-1 border-t border-slate-100">
                  <button
                    id="header-manage-branches-btn"
                    type="button"
                    onClick={() => {
                      setIsLocationMenuOpen(false);
                      openBusinessSettings('branches');
                    }}
                    className="w-full flex items-center gap-2 py-2 px-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-150 cursor-pointer"
                  >
                    <Store className="w-3.5 h-3.5 shrink-0" />
                    <span>Manage Branches &amp; Terminals</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Zone 2 & 3: Live Shift + Sync State + Consolidated Account & Utilities Menu */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Active Shift Status */}
        <button
          id="header-shift-management-btn"
          type="button"
          onClick={openShiftManagement}
          className={`hidden md:inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-lg text-xs font-semibold border transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600 ${
            activeShift
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
          title="Cash Drawer & Shift Session Status"
        >
          <Clock className={`w-3.5 h-3.5 shrink-0 ${activeShift ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span className="tabular-nums">
            {activeShift
              ? `${t('action_shift_number', 'Shift')} #${activeShift.shiftNumber}`
              : t('action_open_shift', 'Open Shift')}
          </span>
        </button>

        {/* Live Cloud Sync State */}
        <button
          id="header-cloud-sync-btn"
          type="button"
          onClick={handleSyncClick}
          disabled={syncStatus === 'syncing'}
          className={`hidden sm:inline-flex items-center gap-1.5 px-3 min-h-[40px] rounded-lg text-xs font-semibold border transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-blue-600 ${
            isOnline
              ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100/70'
          }`}
          title={isOnline ? 'Sync Data to Cloud Now' : 'Offline Mode Active'}
        >
          {syncStatus === 'syncing' ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
          ) : isOnline ? (
            <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <CloudOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          )}
          <span className="tabular-nums">
            {syncStatus === 'syncing'
              ? 'Syncing'
              : isOnline
              ? t('action_synced', 'Synced')
              : `${t('action_offline', 'Offline')}${pendingOfflineCount > 0 ? ` · ${pendingOfflineCount}` : ''}`}
          </span>
        </button>

        {/* Consolidated User & Terminal Utilities Menu */}
        <div className="relative pl-1.5 sm:pl-2 border-l border-slate-200">
          <button
            id="header-user-menu-btn"
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            aria-expanded={isUserMenuOpen}
            className="flex items-center gap-2 min-h-[40px] px-1.5 py-1 rounded-lg hover:bg-slate-50 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
            title="Account & Terminal Utilities"
          >
            <div className="hidden md:block text-right min-w-0">
              <div className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[140px]">
                {currentUser?.name || 'Authorized User'}
              </div>
              <div className="text-[11px] text-slate-400 font-normal truncate max-w-[140px]">
                {isSuperAdmin ? 'Super Admin' : currentBusiness?.name || 'Authorized Staff'}
              </div>
            </div>
            <div
              className={`w-8 h-8 ${
                isSuperAdmin ? 'bg-slate-900 text-white' : 'bg-blue-600 text-white'
              } rounded-full flex items-center justify-center text-xs font-bold shrink-0`}
            >
              {currentUser?.initials || 'U'}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block shrink-0" />
          </button>

          {isUserMenuOpen && currentUser && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsUserMenuOpen(false)}
              />
              <div className="absolute top-full right-0 mt-1.5 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 text-xs max-h-[min(560px,calc(100vh-4.5rem))] overflow-y-auto modal-scrollbar overscroll-contain">
                {/* User Summary */}
                <div className="px-3 py-2.5 bg-slate-50 rounded-lg mb-1.5 border border-slate-100">
                  <div className="font-bold text-slate-900 truncate">{currentUser.name}</div>
                  <div className="text-[11px] text-slate-500 break-all">{currentUser.email}</div>
                  <div className="mt-1 text-[11px] text-slate-500 capitalize">
                    {currentUser.role.replace('_', ' ')} · {currentBusiness?.name}
                    {currentUser.firebaseUid ? ' · Verified' : ''}
                  </div>
                </div>

                {/* Store & Subscription */}
                <div className="space-y-0.5 mb-1.5 pb-1.5 border-b border-slate-100">
                  <button
                    id="user-menu-business-settings-btn"
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      openBusinessSettings('profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left font-semibold text-slate-800 hover:bg-slate-100 transition-colors duration-150 cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-slate-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="leading-tight">Store Settings</div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        Profile, Taxes, Hardware &amp; PINs
                      </div>
                    </div>
                  </button>

                  <button
                    id="user-menu-pricing-plans-btn"
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      openPricingPage();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left font-medium text-slate-700 hover:bg-slate-100 transition-colors duration-150 cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <CreditCard className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="truncate">POS Packages &amp; Plan</span>
                    </span>
                    <span
                      className={`text-[11px] font-semibold capitalize whitespace-nowrap shrink-0 ${
                        !isSubscriptionActive && !isSuperAdmin ? 'text-amber-600' : 'text-slate-500'
                      }`}
                    >
                      {!isSubscriptionActive && !isSuperAdmin
                        ? 'Activation Required'
                        : currentBusiness?.plan || 'Plans'}
                    </span>
                  </button>

                  {isSuperAdmin && (
                    <button
                      id="user-menu-superadmin-console-btn"
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        openSuperAdminModal('tenants');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left font-medium text-slate-700 hover:bg-slate-100 transition-colors duration-150 cursor-pointer"
                    >
                      <Shield className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Super-Admin Console</span>
                    </button>
                  )}
                </div>

                {/* Consolidated Terminal Utilities */}
                <div className="space-y-0.5 mb-1.5 pb-1.5 border-b border-slate-100">
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Terminal Utilities
                  </div>

                  <button
                    id="header-barcode-scanner-btn"
                    type="button"
                    onClick={handleOpenScanner}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left font-medium text-slate-700 hover:bg-slate-100 transition-colors duration-150 cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Scan className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>{t('action_scan', 'Optical Barcode Scanner')}</span>
                    </span>
                    <kbd className="text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                      F2
                    </kbd>
                  </button>

                  <button
                    id="header-scanner-status-pill"
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsScannerDiagOpen(true);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left font-medium text-slate-700 hover:bg-slate-100 transition-colors duration-150 cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Scan className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Hardware Scanner Diagnostics</span>
                    </span>
                    <span className="text-[11px] font-medium text-emerald-700">Ready</span>
                  </button>

                  <button
                    id="header-theme-toggle-btn"
                    type="button"
                    onClick={toggleDarkMode}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left font-medium text-slate-700 hover:bg-slate-100 transition-colors duration-150 cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      {isDarkMode ? (
                        <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : (
                        <Moon className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                      <span>Appearance</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {isDarkMode ? 'Dim Dark' : 'Light'}
                    </span>
                  </button>

                  <button
                    id="header-toggle-offline-btn"
                    type="button"
                    onClick={() => setIsOnline(!isOnline)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left font-medium text-slate-700 hover:bg-slate-100 transition-colors duration-150 cursor-pointer"
                    title="Toggle Network Simulation (Online/Offline Mode)"
                  >
                    <span className="flex items-center gap-2.5">
                      {isOnline ? (
                        <Wifi className="w-4 h-4 text-slate-500 shrink-0" />
                      ) : (
                        <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                      <span>Network Mode</span>
                    </span>
                    <span
                      className={`text-[11px] font-medium ${
                        isOnline ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {isOnline ? 'Online' : 'Simulated Offline'}
                    </span>
                  </button>

                  <PWAInstallButton variant="menu-item" />

                  <button
                    id="user-menu-hotkeys-btn"
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      openHelpModal?.();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left font-medium text-slate-700 hover:bg-slate-100 transition-colors duration-150 cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Keyboard className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Keyboard Shortcuts</span>
                    </span>
                    <kbd className="text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                      F10
                    </kbd>
                  </button>

                  <button
                    id="user-menu-lock-register-btn"
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsPinLocked(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left font-medium text-slate-700 hover:bg-slate-100 transition-colors duration-150 cursor-pointer"
                  >
                    <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>{t('action_lock_terminal', 'Lock Register (Enter PIN)')}</span>
                  </button>

                  <button
                    id="user-menu-landing-page-btn"
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      if (typeof window !== 'undefined') {
                        window.history.pushState(null, '', '/');
                        window.dispatchEvent(new PopStateEvent('popstate'));
                      }
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left font-medium text-slate-700 hover:bg-slate-100 transition-colors duration-150 cursor-pointer"
                  >
                    <Globe className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>View Landing Page</span>
                  </button>

                  <div className="flex items-center justify-between px-3 py-2 rounded-lg">
                    <span className="flex items-center gap-2.5 text-slate-700 font-medium">
                      <Globe className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>{t('footer_select_language', 'Language')}</span>
                    </span>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as 'en' | 'fr' | 'sw')}
                      className="text-xs font-medium border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-800 cursor-pointer focus:outline-none focus:border-blue-600"
                    >
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                      <option value="sw">Kiswahili</option>
                    </select>
                  </div>
                </div>

                {/* Sign Out */}
                <button
                  id="user-menu-signout-btn"
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    if (openSignOutModal) {
                      openSignOutModal();
                    } else {
                      logout();
                    }
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left font-semibold text-red-600 hover:bg-red-50 transition-colors duration-150 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <LogOut className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{t('action_logout', 'Sign Out of POS')}</span>
                  </span>
                  {activeShift && (
                    <span className="text-[11px] font-medium text-red-600">
                      Shift Open
                    </span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Scanner Diagnostics Modal (Controlled so closing dropdown never unmounts modal) */}
      <ScannerStatusBadge
        hideTrigger
        open={isScannerDiagOpen}
        onOpenChange={setIsScannerDiagOpen}
      />
    </header>
  );
};
