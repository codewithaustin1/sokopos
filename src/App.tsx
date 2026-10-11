/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PosProvider, usePos } from './context/PosContext';
import { Header } from './components/Header';
import { SuperAdminBanner } from './components/SuperAdminBanner';
import { RegisterView } from './components/RegisterView';
import { InventoryView } from './components/InventoryView';
import { AnalyticsView } from './components/AnalyticsView';
import { ReportsView } from './components/ReportsView';
import { CloudSyncView } from './components/CloudSyncView';
import { StaffManagementView } from './components/StaffManagementView';
import { ShiftManagementView } from './components/ShiftManagementView';
import { CustomerManagementView } from './components/CustomerManagementView';
import { SupplierManagementView } from './components/SupplierManagementView';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { PaymentModal } from './components/PaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { RefundReceiptModal } from './components/RefundReceiptModal';
import { ReturnsModal } from './components/ReturnsModal';
import { PinLockModal } from './components/PinLockModal';
import { SuperAdminDashboardModal } from './components/SuperAdminDashboardModal';
import { DestructiveConfirmModal } from './components/DestructiveConfirmModal';
import { PosHotkeysHelpModal } from './components/PosHotkeysHelpModal';
import { SignInView } from './components/SignInView';
import { SignOutConfirmModal } from './components/SignOutConfirmModal';
import { BusinessProfileSettingsModal } from './components/BusinessProfileSettingsModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SidebarNav } from './components/SidebarNav';
import { CheckCircle, AlertCircle, Info, Lock, AlertTriangle } from 'lucide-react';
import { PaymentMethod } from './types';
import { useBackgroundScanner } from './hooks/useBackgroundScanner';
import { ScannerInterceptHUD } from './components/ScannerInterceptHUD';
import { isSuperAdminEmail } from './data/initialData';

function PosAppContent() {
  const {
    toastMessage,
    currentUser,
    isSuperAdmin,
    currentBusiness,
    updateBusinessStatus,
    handleBarcodeScanned,
    isDarkMode,
    loginBgGraphic,
    cart,
    cartTotal,
    settleExactCash,
    updateCartQuantity,
    activeReceipt,
    setActiveReceipt,
    activeRefundReceipt,
    setActiveRefundReceipt,
    isReturnsModalOpen,
    closeReturnsModal,
    soundFx,
    isShiftModalOpen,
    setIsShiftModalOpen,
    activeShift,
    showToast,
    setSelectedCustomer,
  } = usePos();

  const [currentTab, setCurrentTab] = useState<'register' | 'inventory' | 'suppliers' | 'analytics' | 'reports' | 'cloud-sync' | 'staff' | 'shifts' | 'customers'>('register');

  useEffect(() => {
    if (isShiftModalOpen) {
      setCurrentTab('shifts');
      setIsShiftModalOpen(false);
    }
  }, [isShiftModalOpen, setIsShiftModalOpen]);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentInitialMethod, setPaymentInitialMethod] = useState<PaymentMethod>('mpesa');
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [superAdminModalDefaultTab, setSuperAdminModalDefaultTab] = useState<'tenants' | 'subscriptions' | 'pricing' | 'audit' | 'provision' | 'branding'>('tenants');

  const handleOpenPayment = (method: PaymentMethod = 'cash') => {
    // Strict Guardrail: No transaction may be tendered or completed without an open session
    if (!activeShift || activeShift.status !== 'open') {
      soundFx.playErrorTone();
      showToast(
        'Tendering Blocked: An active shift session is required before initiating or tendering payment.',
        'error'
      );
      setCurrentTab('shifts');
      return;
    }
    setPaymentInitialMethod(method);
    setIsPaymentOpen(true);
  };

  // Persistent Background Barcode Scanner Listener:
  // Operates in the capture phase to capture high-speed keyboard wedge barcode bursts (< 55ms inter-key latency)
  // regardless of which input or modal element is currently focused, with automatic input restoration.
  useBackgroundScanner({
    onBarcodeScanned: (barcode) => {
      // Strict Guardrail: No barcode transaction may be initiated without an active session
      if (!activeShift || activeShift.status !== 'open') {
        soundFx.playErrorTone();
        showToast(
          'Scan Blocked: An active shift session is required before scanning items or initiating transactions.',
          'error'
        );
        setCurrentTab('shifts');
        return;
      }
      // If currently in another view, switch to register so the scanned item is visible in the cart
      if (currentTab !== 'register') {
        setCurrentTab('register');
      }
      handleBarcodeScanned(barcode);
    },
    enabled: true,
    maxInterKeyLatencyMs: 55,
    enableInputRestoration: true,
  });

  // Global POS Hotkeys:
  // Space/Enter: Settle
  // F1: Cash
  // F2: M-Pesa
  // F3: Card
  // Esc: Close/Cancel
  // +/-: Item quantities
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 0. F10: Global Hotkeys Help Guide Modal
      if (e.key === 'F10') {
        e.preventDefault();
        setIsHelpModalOpen((prev) => !prev);
        return;
      }

      // Ctrl+F / Cmd+F: Fast jump to Product Search on Register tab
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        if (currentTab === 'register') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('focus-register-search'));
          const searchInput = document.getElementById('register-search-input') as HTMLInputElement | null;
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
          return;
        }
      }

      const target = e.target as HTMLElement | null;
      const isInputActive =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // 1. Esc: Global Close / Cancel
      if (e.key === 'Escape') {
        if (isInputActive) {
          (target as HTMLElement).blur();
        }
        if (isHelpModalOpen) {
          e.preventDefault();
          setIsHelpModalOpen(false);
          return;
        }
        if (activeReceipt) {
          e.preventDefault();
          setActiveReceipt(null);
          return;
        }
        if (activeRefundReceipt) {
          e.preventDefault();
          setActiveRefundReceipt(null);
          return;
        }
        if (isPaymentOpen) {
          e.preventDefault();
          setIsPaymentOpen(false);
          return;
        }
        if (isScannerOpen) {
          e.preventDefault();
          setIsScannerOpen(false);
          return;
        }
        if (isReturnsModalOpen) {
          e.preventDefault();
          closeReturnsModal();
          return;
        }
        if (isSignOutModalOpen) {
          e.preventDefault();
          setIsSignOutModalOpen(false);
          return;
        }
        if (isSuperAdminModalOpen) {
          e.preventDefault();
          setIsSuperAdminModalOpen(false);
          return;
        }
        return;
      }

      // 2. F1: Cash
      if (e.key === 'F1') {
        e.preventDefault();
        if (isPaymentOpen) {
          setPaymentInitialMethod('cash');
        } else if (currentTab === 'register' && cart.length > 0 && !activeReceipt && !activeRefundReceipt && !isReturnsModalOpen) {
          // Direct 1-tap Exact Cash settlement
          settleExactCash();
        }
        return;
      }

      // 3. F2: M-Pesa
      if (e.key === 'F2') {
        e.preventDefault();
        if (isPaymentOpen) {
          setPaymentInitialMethod('mpesa');
        } else if (currentTab === 'register' && cart.length > 0 && !activeReceipt && !activeRefundReceipt && !isReturnsModalOpen) {
          handleOpenPayment('mpesa');
        }
        return;
      }

      // 4. F3: Card
      if (e.key === 'F3') {
        e.preventDefault();
        if (isPaymentOpen) {
          setPaymentInitialMethod('card');
        } else if (currentTab === 'register' && cart.length > 0 && !activeReceipt && !activeRefundReceipt && !isReturnsModalOpen) {
          handleOpenPayment('card');
        }
        return;
      }

      // 5. +/- for Item Quantities
      // Active when not in an active text input, register view is active, cart has items, and no modal is blocking
      const isModalActive =
        isPaymentOpen ||
        isScannerOpen ||
        isHelpModalOpen ||
        activeReceipt !== null ||
        activeRefundReceipt !== null ||
        isReturnsModalOpen ||
        isSignOutModalOpen ||
        isSuperAdminModalOpen;

      if (!isInputActive && !isModalActive && currentTab === 'register' && cart.length > 0) {
        if (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd') {
          e.preventDefault();
          const lastItem = cart[cart.length - 1];
          updateCartQuantity(lastItem.productId, lastItem.quantity + 1);
          soundFx.playBeep(520, 0.04);
          return;
        }
        if (e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract') {
          e.preventDefault();
          const lastItem = cart[cart.length - 1];
          updateCartQuantity(lastItem.productId, lastItem.quantity - 1);
          soundFx.playBeep(420, 0.04);
          return;
        }
      }

      // 6. Enter Key Handling for POS Settlement
      if (e.key === 'Enter') {
        // If not typing in an input and on register tab with items in cart:
        if (!isInputActive && !isModalActive && currentTab === 'register' && cart.length > 0) {
          e.preventDefault();
          handleOpenPayment('cash');
          return;
        }

        // If active receipt is open and Enter is pressed, dismiss receipt
        if (activeReceipt && !isInputActive) {
          e.preventDefault();
          setActiveReceipt(null);
          return;
        }

        return;
      }

      // 7. Space to Settle
      if (e.key === ' ' && !isInputActive && !isModalActive && currentTab === 'register' && cart.length > 0) {
        e.preventDefault();
        handleOpenPayment('cash');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    currentTab,
    cart,
    isPaymentOpen,
    isScannerOpen,
    activeReceipt,
    activeRefundReceipt,
    isReturnsModalOpen,
    isSignOutModalOpen,
    isSuperAdminModalOpen,
    isHelpModalOpen,
    settleExactCash,
    updateCartQuantity,
    setActiveReceipt,
    setActiveRefundReceipt,
    closeReturnsModal,
    soundFx,
  ]);

  // Dedicated full-screen authentication gate when signed out
  if (!currentUser) {
    return (
      <div
        className="h-screen w-screen overflow-y-auto dark-scrollbar font-sans bg-slate-950"
        style={
          loginBgGraphic
            ? {
                backgroundImage: `url(${loginBgGraphic})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
                backgroundRepeat: 'no-repeat',
              }
            : undefined
        }
      >
        {/* Toast Notification Alert */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-[120] animate-in slide-in-from-top-3 fade-in duration-200">
            <div
              className={`px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold border ${
                toastMessage.type === 'error'
                  ? 'bg-red-50 text-red-800 border-red-200'
                  : toastMessage.type === 'info'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-200'
              }`}
            >
              {toastMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              ) : toastMessage.type === 'info' ? (
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
          </div>
        )}
        <SignInView />
      </div>
    );
  }

  return (
    <div
      id="pos-app-root"
      className={`h-screen w-screen flex flex-col overflow-hidden font-sans select-none transition-colors duration-200 ${
        isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 animate-in slide-in-from-top-3 fade-in duration-200">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-bold border ${
              toastMessage.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : toastMessage.type === 'info'
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            ) : toastMessage.type === 'info' ? (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Persistent Super-Admin Safeguard Warning Banner (Required Safeguard) */}
      <SuperAdminBanner
        onOpenAuditLog={() => {
          setSuperAdminModalDefaultTab('audit');
          setIsSuperAdminModalOpen(true);
        }}
        onOpenProvisionModal={() => {
          setSuperAdminModalDefaultTab('provision');
          setIsSuperAdminModalOpen(true);
        }}
        onOpenBrandingModal={() => {
          setSuperAdminModalDefaultTab('branding');
          setIsSuperAdminModalOpen(true);
        }}
      />

      {/* Main Top Header */}
      <Header
        openBarcodeScanner={() => setIsScannerOpen(true)}
        openSignOutModal={() => setIsSignOutModalOpen(true)}
        openHelpModal={() => setIsHelpModalOpen(true)}
        openSuperAdminModal={(tab) => {
          const targetTab = tab === 'subscriptions' && !isSuperAdminEmail(currentUser?.email) ? 'tenants' : (tab || 'tenants');
          setSuperAdminModalDefaultTab(targetTab);
          setIsSuperAdminModalOpen(true);
        }}
      />

      {/* Super Admin Alert Banner if current tenant is suspended */}
      {currentBusiness?.status === 'suspended' && isSuperAdmin && (
        <div className="bg-rose-900 text-white px-4 py-2 text-xs flex items-center justify-between border-b border-rose-800 shrink-0 z-30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
            <span>
              <strong>TENANT POS ACCESS IS SUSPENDED:</strong> Access is toggled OFF for <em>{currentBusiness.name}</em> ({currentBusiness.code}) due to missed subscription payment. Store cashiers & staff cannot trade.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateBusinessStatus(currentBusiness.id, 'active')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded-lg text-xs transition cursor-pointer shadow-xs"
            >
              Toggle Access ON
            </button>
            {isSuperAdminEmail(currentUser?.email) && (
              <button
                onClick={() => {
                  setSuperAdminModalDefaultTab('subscriptions');
                  setIsSuperAdminModalOpen(true);
                }}
                className="bg-rose-950 hover:bg-black/40 text-rose-200 font-semibold px-2.5 py-1 rounded-lg text-xs transition border border-rose-700 cursor-pointer"
              >
                Subscriptions Tab
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Workspace: Left Vertical Navigation Tabs + Primary Viewport */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Vertical Navigation */}
        <SidebarNav
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          openBarcodeScanner={() => setIsScannerOpen(true)}
          openSuperAdminModal={(tab) => {
            const targetTab = tab === 'subscriptions' && !isSuperAdminEmail(currentUser?.email) ? 'tenants' : (tab || 'tenants');
            setSuperAdminModalDefaultTab(targetTab);
            setIsSuperAdminModalOpen(true);
          }}
        />

        {/* Primary Tab Viewport OR Suspended Subscription Screen for Non-Super-Admin */}
        {currentBusiness?.status === 'suspended' && !isSuperAdmin ? (
          <main className="flex-1 flex items-center justify-center p-6 bg-slate-900 text-white min-w-0">
            <div className="max-w-md w-full bg-slate-850 border border-slate-700 rounded-2xl p-6 sm:p-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8" />
              </div>
              <span className="bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-rose-500/30">
                POS Access Suspended
              </span>
              <h2 className="text-xl font-black text-white mt-3">
                Subscription Payment Required
              </h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Terminal and trading access for <strong className="text-white font-bold">{currentBusiness.name}</strong> ({currentBusiness.code}) has been temporarily deactivated due to a missed subscription payment or administrative hold.
              </p>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 mt-5 text-left text-xs space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Business:</span>
                  <span className="text-slate-200 font-bold">{currentBusiness.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Plan Tier:</span>
                  <span className="text-amber-400 font-bold uppercase">{currentBusiness.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Google Account:</span>
                  <span className="text-slate-300 truncate max-w-[180px]">{currentBusiness.ownerEmail}</span>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2.5">
                <p className="text-[11px] text-slate-400">
                  Please complete your subscription payment or contact the platform administrator to reactivate your store POS terminal access.
                </p>
                <button
                  onClick={() => setIsSignOutModalOpen(true)}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
                >
                  Sign Out / Switch Account
                </button>
              </div>
            </div>
          </main>
        ) : (
          <main className="flex-1 flex overflow-hidden relative pb-14 lg:pb-0 min-w-0">
            {currentTab === 'register' && (
              <RegisterView
                onProceedToPayment={() => handleOpenPayment('cash')}
                openBarcodeScanner={() => setIsScannerOpen(true)}
              />
            )}
            {currentTab === 'inventory' && <InventoryView />}
            {currentTab === 'suppliers' && <SupplierManagementView />}
            {currentTab === 'analytics' && <AnalyticsView onNavigateToReports={() => setCurrentTab('reports')} />}
            {currentTab === 'reports' && <ReportsView />}
            {currentTab === 'cloud-sync' && <CloudSyncView />}
            {currentTab === 'staff' && <StaffManagementView />}
            {currentTab === 'shifts' && <ShiftManagementView />}
            {currentTab === 'customers' && (
              <CustomerManagementView
                onAssignCustomerToCart={(cust) => {
                  setSelectedCustomer(cust);
                  setCurrentTab('register');
                }}
              />
            )}
          </main>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar (< lg screens) */}
      <MobileBottomNav
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openBarcodeScanner={() => setIsScannerOpen(true)}
        onRequestSignOut={() => setIsSignOutModalOpen(true)}
        openHelpModal={() => setIsHelpModalOpen(true)}
      />

      {/* Global Modals & Safeguards */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />

      <PosHotkeysHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        initialMethod={paymentInitialMethod}
      />

      <ReceiptModal />
      <RefundReceiptModal />
      <ReturnsModal />

      <PinLockModal />

      <SignOutConfirmModal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
      />

      <SuperAdminDashboardModal
        isOpen={isSuperAdminModalOpen}
        onClose={() => setIsSuperAdminModalOpen(false)}
        defaultTab={superAdminModalDefaultTab}
      />

      {/* Business Profile, Branch & RBAC Settings Modal */}
      <BusinessProfileSettingsModal />

      {/* Destructive Action Confirmation Safeguard Modal */}
      <DestructiveConfirmModal />

      {/* Persistent Background Hardware Scanner Interception Telemetry HUD */}
      <ScannerInterceptHUD />
    </div>
  );
}

export default function App() {
  return (
    <PosProvider>
      <PosAppContent />
    </PosProvider>
  );
}
