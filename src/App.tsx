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
import { PinLockModal } from './components/PinLockModal';
import { SuperAdminDashboardModal } from './components/SuperAdminDashboardModal';
import { DestructiveConfirmModal } from './components/DestructiveConfirmModal';
import { AuthModal } from './components/AuthModal';
import { SignInView } from './components/SignInView';
import { SignOutConfirmModal } from './components/SignOutConfirmModal';
import { BusinessProfileSettingsModal } from './components/BusinessProfileSettingsModal';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

function PosAppContent() {
  const { toastMessage, currentUser, isSuperAdmin } = usePos();

  const [currentTab, setCurrentTab] = useState<'register' | 'inventory' | 'analytics' | 'cloud-sync' | 'staff'>('register');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);
  const [superAdminModalDefaultTab, setSuperAdminModalDefaultTab] = useState<'tenants' | 'audit' | 'provision'>('tenants');

  // Global F2 shortcut for optical scanner
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setIsScannerOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Dedicated full-screen authentication gate when signed out
  if (!currentUser) {
    return (
      <div className="h-screen w-screen overflow-hidden font-sans">
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
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openBarcodeScanner={() => setIsScannerOpen(true)}
        openAuthModal={() => setIsAuthModalOpen(true)}
        openSignOutModal={() => setIsSignOutModalOpen(true)}
        openSuperAdminModal={() => {
          setSuperAdminModalDefaultTab('tenants');
          setIsSuperAdminModalOpen(true);
        }}
      />

      {/* Primary Tab Viewport */}
      <main className="flex-1 flex overflow-hidden relative">
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
