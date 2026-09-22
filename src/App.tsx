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
import { CloudSyncView } from './components/CloudSyncView';
import { StaffManagementView } from './components/StaffManagementView';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { PaymentModal } from './components/PaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { RefundReceiptModal } from './components/RefundReceiptModal';
import { ReturnsModal } from './components/ReturnsModal';
import { PinLockModal } from './components/PinLockModal';
import { SuperAdminDashboardModal } from './components/SuperAdminDashboardModal';
import { DestructiveConfirmModal } from './components/DestructiveConfirmModal';
import { AuthModal } from './components/AuthModal';
import { SignInView } from './components/SignInView';
import { SignOutConfirmModal } from './components/SignOutConfirmModal';
import { BusinessProfileSettingsModal } from './components/BusinessProfileSettingsModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SidebarNav } from './components/SidebarNav';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { PaymentMethod } from './types';
import { useBackgroundScanner } from './hooks/useBackgroundScanner';
import { ScannerInterceptHUD } from './components/ScannerInterceptHUD';

function PosAppContent() {
  const {
    toastMessage,
    currentUser,
    isSuperAdmin,
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
  } = usePos();

  const [currentTab, setCurrentTab] = useState<'register' | 'inventory' | 'analytics' | 'cloud-sync' | 'staff'>('register');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentInitialMethod, setPaymentInitialMethod] = useState<PaymentMethod>('mpesa');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);
  const [superAdminModalDefaultTab, setSuperAdminModalDefaultTab] = useState<'tenants' | 'audit' | 'provision' | 'branding'>('tenants');

  const handleOpenPayment = (method: PaymentMethod = 'mpesa') => {
    setPaymentInitialMethod(method);
    setIsPaymentOpen(true);
  };

  // Persistent Background Barcode Scanner Listener:
  // Operates in the capture phase to capture high-speed keyboard wedge barcode bursts (< 55ms inter-key latency)
  // regardless of which input or modal element is currently focused, with automatic input restoration.
  useBackgroundScanner({
    onBarcodeScanned: (barcode) => {
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
      const target = e.target as HTMLElement | null;
      const isInputActive =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // 1. Esc: Global Close / Cancel
      if (e.key === 'Escape') {
        if (isInputActive) {
          (target as HTMLElement).blur();
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
        if (isAuthModalOpen) {
          e.preventDefault();
          setIsAuthModalOpen(false);
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
        activeReceipt !== null ||
        activeRefundReceipt !== null ||
        isReturnsModalOpen ||
        isAuthModalOpen ||
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
          handleOpenPayment('mpesa');
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
        handleOpenPayment('mpesa');
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
    isAuthModalOpen,
    isSignOutModalOpen,
    isSuperAdminModalOpen,
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
        openAuthModal={() => setIsAuthModalOpen(true)}
        openSignOutModal={() => setIsSignOutModalOpen(true)}
        openSuperAdminModal={(tab) => {
          setSuperAdminModalDefaultTab(tab || 'tenants');
          setIsSuperAdminModalOpen(true);
        }}
      />

      {/* Main Workspace: Left Vertical Navigation Tabs + Primary Viewport */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Vertical Navigation */}
        <SidebarNav
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          openBarcodeScanner={() => setIsScannerOpen(true)}
        />

        {/* Primary Tab Viewport */}
        <main className="flex-1 flex overflow-hidden relative pb-14 lg:pb-0 min-w-0">
          {currentTab === 'register' && (
            <RegisterView
              onProceedToPayment={() => handleOpenPayment('mpesa')}
              openBarcodeScanner={() => setIsScannerOpen(true)}
            />
          )}
          {currentTab === 'inventory' && <InventoryView />}
          {currentTab === 'analytics' && <AnalyticsView />}
          {currentTab === 'cloud-sync' && <CloudSyncView />}
          {currentTab === 'staff' && <StaffManagementView />}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (< lg screens) */}
      <MobileBottomNav
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openBarcodeScanner={() => setIsScannerOpen(true)}
        onRequestSignOut={() => setIsSignOutModalOpen(true)}
      />

      {/* Global Modals & Safeguards */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
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

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

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
