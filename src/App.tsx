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

function PosAppContent() {
  const { toastMessage, currentUser, isSuperAdmin, handleBarcodeScanned } = usePos();

  const [currentTab, setCurrentTab] = useState<'register' | 'inventory' | 'analytics' | 'cloud-sync' | 'staff'>('register');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);
  const [superAdminModalDefaultTab, setSuperAdminModalDefaultTab] = useState<'tenants' | 'audit' | 'provision'>('tenants');

  // Global hardware barcode scanner listener (USB / Bluetooth HID wedge) & F2 hotkey
  useEffect(() => {
    let charBuffer = '';
    let lastKeyTime = 0;
    const SCANNER_BURST_MAX_GAP_MS = 65; // Barcode scanners type with < 50ms intervals

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const target = e.target as HTMLElement | null;
      const isInputActive =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // F2 hotkey toggles optical camera scanner modal
      if (e.key === 'F2') {
        e.preventDefault();
        setIsScannerOpen((prev) => !prev);
        return;
      }

      // Enter key: finalize barcode scan
      if (e.key === 'Enter') {
        const timeElapsed = now - lastKeyTime;
        const bufferLen = charBuffer.length;
        // If rapid burst occurred (scanner) OR if user pressed enter without an active input field
        const isScannerBurst = bufferLen >= 4 && timeElapsed < 350;

        if (bufferLen >= 3 && (!isInputActive || isScannerBurst)) {
          const codeToScan = charBuffer.trim();
          charBuffer = '';
          if (isScannerBurst) {
            e.preventDefault();
          }
          handleBarcodeScanned(codeToScan);
          return;
        }
        charBuffer = '';
        return;
      }

      // Buffer printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (now - lastKeyTime > SCANNER_BURST_MAX_GAP_MS) {
          // Slow human typing or gap: reset buffer
          charBuffer = e.key;
        } else {
          // Fast keystroke stream from laser gun: append
          charBuffer += e.key;
        }
        lastKeyTime = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleBarcodeScanned]);

  // Dedicated full-screen authentication gate when signed out
  if (!currentUser) {
    return (
      <div className="h-screen w-screen overflow-y-auto dark-scrollbar font-sans bg-slate-950">
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
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-100 font-sans select-none">
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
      />

      {/* Main Top Header */}
      <Header
        openBarcodeScanner={() => setIsScannerOpen(true)}
        openAuthModal={() => setIsAuthModalOpen(true)}
        openSignOutModal={() => setIsSignOutModalOpen(true)}
        openSuperAdminModal={() => {
          setSuperAdminModalDefaultTab('tenants');
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
              onProceedToPayment={() => setIsPaymentOpen(true)}
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
