/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
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
import { SignInView } from './components/SignInView';
import { SignOutConfirmModal } from './components/SignOutConfirmModal';
import { BusinessProfileSettingsModal } from './components/BusinessProfileSettingsModal';
import { SubscriptionActivationModal } from './components/SubscriptionActivationModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SidebarNav } from './components/SidebarNav';
import { Lock, AlertTriangle } from 'lucide-react';
import { PaymentMethod, BusinessPlanTier } from './types';
import { useBackgroundScanner } from './hooks/useBackgroundScanner';
import { ScannerInterceptHUD } from './components/ScannerInterceptHUD';
import { InventoryQuickCheckHUD } from './components/InventoryQuickCheckHUD';
import { DynamicSitemapModal } from './components/DynamicSitemapModal';
import { PricingPageView } from './components/PricingPageView';
import { getSystemPaths, generateSitemapJson } from './utils/sitemapManifest';
import {
  isPublicSeoPath,
  normalizePathname,
  resolveLegacyHashToPath,
  syncDocumentHeadSeo,
} from './utils/seoConfig';
import { isSuperAdminEmail } from './data/initialData';
import { MobileBentoMenuOverlay } from './components/common/MobileBentoMenuOverlay';
import { ToastContainer } from './components/common/ToastContainer';
import { PendingSubscriptionBanner } from './components/common/PendingSubscriptionBanner';
import {
  verifyServerPayment,
  loadPendingSubscriptionCheckout,
  clearPendingSubscriptionCheckout,
} from './lib/paymentService';
import { AffiliatePortalModal } from './components/AffiliatePortalModal';
import { trackPlatformEvent } from './lib/telemetryService';
import { UpgradePromptModal } from './components/common/UpgradePromptModal';
import { LegalConsentModal } from './components/LegalConsentModal';
import { auth } from './lib/firebase';

function PosAppContent() {
  const {
    toasts,
    dismissToast,
    currentUser,
    isSuperAdmin,
    currentBusiness,
    updateBusinessStatus,
    handleBarcodeScanned,
    unknownBarcodePrompt,
    openUnknownBarcodeModal,
    closeUnknownBarcodeModal,
    isDarkMode,
    products,
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
    isBusinessSettingsOpen,
    setIsBusinessSettingsOpen,
    businessSettingsDefaultTab,
    isSubscriptionActive,
    isSubscriptionModalOpen,
    setIsSubscriptionModalOpen,
    selectCheckoutPackage,
    pendingCheckoutIntent,
    clearPendingCheckoutIntent,
    isDemoSession,
    activateBusinessSubscription,
    trackPendingSubscription,
    isPricingPageOpen,
    closePricingPage,
    isAffiliateModalOpen,
    setIsAffiliateModalOpen,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    requireCapability,
    requiresLegalConsent,
    isSellingMode,
  } = usePos();

  // URL Path Routing: Keep clean public paths indexable while protecting private /pos routes
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const legacyTarget = resolveLegacyHashToPath(window.location.hash);
      if (legacyTarget) {
        window.history.replaceState(null, '', legacyTarget);
        return legacyTarget;
      }
      return normalizePathname(window.location.pathname || '/');
    }
    return '/';
  });

  // Path-based routing: Public SEO routes render public views; authenticated sessions open /pos
  const isAtLandingPage = isPublicSeoPath(currentPath) || !currentUser;

  useEffect(() => {
    const syncPath = () => {
      const legacyTarget = resolveLegacyHashToPath(window.location.hash);
      if (legacyTarget) {
        window.history.replaceState(null, '', legacyTarget);
        setCurrentPath(legacyTarget);
        return;
      }
      setCurrentPath(normalizePathname(window.location.pathname || '/'));
    };
    window.addEventListener('popstate', syncPath);
    window.addEventListener('hashchange', syncPath);
    window.addEventListener('sokopos-route-change', syncPath);
    return () => {
      window.removeEventListener('popstate', syncPath);
      window.removeEventListener('hashchange', syncPath);
      window.removeEventListener('sokopos-route-change', syncPath);
    };
  }, []);

  // When unauthenticated, allow public SEO paths (/pricing, /faq, /terms, etc.) and redirect private /pos routes to '/'
  useEffect(() => {
    if (!currentUser && !isPublicSeoPath(currentPath)) {
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/');
      }
      setCurrentPath('/');
    }
  }, [currentUser, currentPath]);

  // Synchronize <title>, <meta description>, canonical, robots, and JSON-LD on route transitions
  useEffect(() => {
    if (isPricingPageOpen) {
      syncDocumentHeadSeo('/pricing');
    } else if (!isAtLandingPage) {
      syncDocumentHeadSeo('/pos');
    } else {
      syncDocumentHeadSeo(currentPath);
    }
  }, [currentPath, isPricingPageOpen, isAtLandingPage]);

  // Automatic transition to terminal upon returning from Google OAuth redirect
  useEffect(() => {
    if (currentUser && typeof window !== 'undefined') {
      const wasRedirectLogin = sessionStorage.getItem('sokopos_redirect_in_progress') === 'true';
      if (wasRedirectLogin) {
        sessionStorage.removeItem('sokopos_redirect_in_progress');
        window.history.pushState(null, '', '/pos');
        setCurrentPath('/pos');
      }
    }
  }, [currentUser]);

  // Auto-resume pending paid checkout immediately once owner signs in or registers a shop (after legal consent)
  useEffect(() => {
    if (!currentUser || isAtLandingPage || isDemoSession || requiresLegalConsent || !pendingCheckoutIntent) return;
    if (pendingCheckoutIntent.planId === 'free') {
      clearPendingCheckoutIntent();
      return;
    }

    const intent = pendingCheckoutIntent;
    selectCheckoutPackage(intent.planId, intent.billingCycle);
    closePricingPage();
    setIsSubscriptionModalOpen(true);
    clearPendingCheckoutIntent();

    showToast(
      `${intent.planName} Plan (${intent.billingCycle === 'annual' ? 'Annual' : 'Monthly'}) ready — complete M-Pesa activation below.`,
      'success'
    );
  }, [
    currentUser,
    isAtLandingPage,
    isDemoSession,
    requiresLegalConsent,
    pendingCheckoutIntent,
    currentBusiness?.id,
    currentBusiness?.name,
    selectCheckoutPackage,
    closePricingPage,
    setIsSubscriptionModalOpen,
    clearPendingCheckoutIntent,
    showToast,
  ]);

  // Verify subscription payment when returning from Paystack Hosted Checkout (?payment_ref=SOKO-SUB-...)
  useEffect(() => {
    if (!currentUser || typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const paymentRef = urlParams.get('payment_ref') || urlParams.get('reference') || urlParams.get('trxref');
    if (!paymentRef || !paymentRef.startsWith('SOKO-SUB-')) return;

    const handledKey = `sokopos_handled_${paymentRef}`;
    if (sessionStorage.getItem(handledKey)) return;
    sessionStorage.setItem(handledKey, '1');

    // Clean query params from URL immediately
    urlParams.delete('payment_ref');
    urlParams.delete('reference');
    urlParams.delete('trxref');
    const remainingQuery = urlParams.toString();
    const cleanUrl = `${window.location.pathname}${remainingQuery ? `?${remainingQuery}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', cleanUrl);

    const pendingMeta = loadPendingSubscriptionCheckout();

    let cancelled = false;
    const verifyAndProvision = async (attempt = 1) => {
      if (attempt === 1) {
        showToast('Verifying your subscription payment...', 'info');
      }
      const idToken = await auth.currentUser?.getIdToken().catch(() => undefined);
      const result = await verifyServerPayment(paymentRef, idToken);
      if (cancelled) return;

      if (result.verified && result.status === 'success') {
        const targetBusinessId =
          result.businessId ||
          (result.metadata?.businessId as string | undefined) ||
          pendingMeta?.businessId ||
          currentBusiness?.id ||
          'biz-default';
        const targetPlanId = (result.planId ||
          (result.metadata?.planId as string | undefined) ||
          pendingMeta?.planId ||
          'business') as BusinessPlanTier;

        trackPendingSubscription({
          reference: paymentRef,
          businessId: targetBusinessId,
          businessName: currentBusiness?.name,
          planId: (targetPlanId as any) || 'business',
          billingCycle: result.billingCycle || pendingMeta?.billingCycle || 'monthly',
          amountKes: Number(result.amountKes || pendingMeta?.amountKes || 0),
          provider: result.provider || 'paystack',
          channel: result.channel === 'mpesa_stk' ? 'mpesa_stk' : 'card',
          initiatedAt: pendingMeta?.initiatedAt || new Date().toISOString(),
        });

        const activation = await activateBusinessSubscription(targetBusinessId, targetPlanId, paymentRef);
        if (activation.success) {
          setIsSubscriptionModalOpen(true);
        } else {
          showToast(
            activation.message || 'Payment verified, but plan activation failed. Please contact support.',
            'error'
          );
        }
        return;
      }

      if (result.status === 'pending' && attempt < 4) {
        setTimeout(() => {
          if (!cancelled) verifyAndProvision(attempt + 1);
        }, 3000);
        return;
      }

      if (result.status === 'failed' || result.status === 'abandoned') {
        clearPendingSubscriptionCheckout();
        showToast(result.error || result.gatewayResponse || 'Subscription payment was not completed.', 'error');
      } else {
        showToast('Payment is still confirming. Use the banner above to resume status anytime.', 'info');
      }
    };

    verifyAndProvision(1);
    return () => {
      cancelled = true;
    };
  }, [
    currentUser,
    currentBusiness?.id,
    currentBusiness?.name,
    activateBusinessSubscription,
    trackPendingSubscription,
    setIsSubscriptionModalOpen,
    showToast,
  ]);

  // Hidden Dynamic Sitemap View Triggered by Console Command (sitemap() / window.sitemap())
  const [isSitemapOpen, setIsSitemapOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname === '/sitemap';
    }
    return false;
  });

  useEffect(() => {
    const triggerSitemap = () => {
      setIsSitemapOpen(true);
      const manifest = generateSitemapJson();
      const entries = getSystemPaths();

      console.group('%c🗺️ SokoPoS Search Engine Sitemap & Crawler Pathways', 'color: #0284c7; font-weight: bold; font-size: 13px;');
      console.log(`Active Domain: ${window.location.origin}`);
      console.log(`Total System Routes: ${entries.length} (${entries.filter(e => !e.authRequired).length} public crawlable, ${entries.filter(e => e.authRequired).length} operational session routes)`);
      console.table(
        entries.map((e) => ({
          Path: e.path,
          Title: e.title,
          Category: e.category,
          Priority: e.priority,
          Frequency: e.changeFreq,
          Robots: e.robotsDirective,
          Protected: e.authRequired ? 'Yes (Auth)' : 'No (Public)',
        }))
      );
      console.log('%c💡 Tip: The Dynamic Sitemap HUD is now open on your screen with instant XML/JSON export and direct path inspection.', 'color: #10b981; font-style: italic;');
      console.groupEnd();

      return manifest;
    };

    // Attach to global window scope so developers/crawlers can invoke it anytime in console
    (window as any).sitemap = triggerSitemap;
    (window as any).showSitemap = triggerSitemap;
    (window as any).__SOKOPOS_SITEMAP__ = triggerSitemap;

    // Log helpful discovery hint in DevTools console
    if (!(window as any).__sitemap_hint_shown__) {
      (window as any).__sitemap_hint_shown__ = true;
      console.info(
        '%c🗺️ SokoPoS SEO Engine:%c Type %csitemap()%c or %cwindow.sitemap()%c in this console to inspect the dynamic search crawler sitemap.',
        'color: #0284c7; font-weight: bold;',
        'color: inherit;',
        'background: #0f172a; color: #38bdf8; font-family: monospace; padding: 2px 4px; border-radius: 4px;',
        'color: inherit;',
        'background: #0f172a; color: #38bdf8; font-family: monospace; padding: 2px 4px; border-radius: 4px;',
        'color: inherit;'
      );
    }

    const handleEvent = () => setIsSitemapOpen(true);
    window.addEventListener('sokopos-open-sitemap', handleEvent);
    return () => {
      window.removeEventListener('sokopos-open-sitemap', handleEvent);
    };
  }, []);

  const navigateToTerminal = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/pos');
    }
    setCurrentPath('/pos');
  };

  type AppTab = 'register' | 'inventory' | 'suppliers' | 'analytics' | 'reports' | 'cloud-sync' | 'staff' | 'shifts' | 'customers' | 'settings' | 'super-admin';
  const [currentTab, setCurrentTab] = useState<AppTab>('register');

  const handleSetCurrentTab = (tab: AppTab) => {
    if (requiresLegalConsent) return;
    if (isSellingMode && tab !== 'register') return;
    if (tab === 'super-admin' && (!isSuperAdmin || isDemoSession)) return;
    if (tab === 'suppliers' && !requireCapability('suppliers')) return;
    if (tab === 'analytics' && !requireCapability('analytics')) return;
    setCurrentTab(tab);
  };

  const handleCloseSettings = useCallback(() => {
    setCurrentTab('register');
  }, []);

  useEffect(() => {
    if (isDemoSession && currentTab === 'super-admin') {
      setCurrentTab('register');
    }
  }, [isDemoSession, currentTab]);

  useEffect(() => {
    if (isSellingMode) {
      if (currentTab !== 'register') {
        setCurrentTab('register');
      }
      if (isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    }
  }, [isSellingMode, currentTab, isMobileMenuOpen, setIsMobileMenuOpen]);

  useEffect(() => {
    if (isShiftModalOpen) {
      if (!isSellingMode) {
        setCurrentTab('shifts');
      }
      setIsShiftModalOpen(false);
    }
  }, [isShiftModalOpen, isSellingMode, setIsShiftModalOpen]);

  useEffect(() => {
    if (isBusinessSettingsOpen) {
      if (!isSellingMode) {
        setCurrentTab('settings');
      }
      setIsBusinessSettingsOpen(false);
    }
  }, [isBusinessSettingsOpen, isSellingMode, setIsBusinessSettingsOpen]);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentInitialMethod, setPaymentInitialMethod] = useState<PaymentMethod>('mpesa');
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [superAdminModalDefaultTab, setSuperAdminModalDefaultTab] = useState<'tenants' | 'subscriptions' | 'pricing' | 'audit' | 'provision' | 'branding' | 'traffic'>('tenants');

  const handleOpenSuperAdmin = (tab?: 'tenants' | 'subscriptions' | 'pricing' | 'audit' | 'provision' | 'branding' | 'traffic') => {
    if (isSellingMode || isDemoSession || !isSuperAdmin) return;
    const targetTab = (tab === 'subscriptions' || tab === 'traffic') && !isSuperAdminEmail(currentUser?.email) ? 'tenants' : (tab || 'tenants');
    setSuperAdminModalDefaultTab(targetTab);
    setCurrentTab('super-admin');
  };

  // First-party cookie-free traffic & POS session telemetry
  useEffect(() => {
    if (isAtLandingPage && !isPricingPageOpen) {
      trackPlatformEvent('page_view', {
        path: '/',
        pageName: 'landing',
        dedupeKey: 'landing-view',
        dedupeTtlMs: 60_000,
      });
    }
  }, [isAtLandingPage, isPricingPageOpen]);

  useEffect(() => {
    if (currentUser && !isAtLandingPage && currentBusiness?.id) {
      trackPlatformEvent('pos_session_start', {
        path: '/pos',
        businessId: currentBusiness.id,
        businessName: currentBusiness.name,
        planId: currentBusiness.plan,
        isDemo: currentBusiness.id === 'biz-demo',
        dedupeKey: `pos-sess-${currentBusiness.id}`,
        dedupeTtlMs: 30 * 60_000,
      });
    }
  }, [currentUser?.id, isAtLandingPage, currentBusiness?.id, currentBusiness?.name, currentBusiness?.plan]);

  useEffect(() => {
    if (currentUser && !isAtLandingPage && currentBusiness?.id) {
      trackPlatformEvent('pos_tab_view', {
        path: `/pos/${currentTab}`,
        tabName: currentTab,
        businessId: currentBusiness.id,
        businessName: currentBusiness.name,
        isDemo: currentBusiness.id === 'biz-demo',
        dedupeKey: `pos-tab-${currentBusiness.id}-${currentTab}`,
        dedupeTtlMs: 30_000,
      });
    }
  }, [currentTab, currentUser?.id, isAtLandingPage, currentBusiness?.id, currentBusiness?.name]);

  const handleOpenPayment = (method: PaymentMethod = 'cash') => {
    if (requiresLegalConsent) return;
    // Strict Guardrail: No transaction may be tendered or completed without an open session
    if (!activeShift || activeShift.status !== 'open') {
      soundFx.playErrorTone();
      showToast(
        'Tendering Blocked: An active shift session is required before initiating or tendering payment.',
        'error'
      );
      if (!isSellingMode) {
        setCurrentTab('shifts');
      }
      return;
    }

    // Option 2 Guardrail: Setup and inventory remain unblocked, but tendering sales requires active subscription
    if (!isSubscriptionActive) {
      soundFx.playErrorTone();
      showToast(
        'Subscription Required: Activate your package to process and tender live customer sales.',
        'info'
      );
      setIsSubscriptionModalOpen(true);
      return;
    }

    setPaymentInitialMethod(method);
    setIsPaymentOpen(true);
  };

  // Persistent Background Barcode Scanner Listener:
  // Operates in the capture phase to capture high-speed keyboard wedge barcode bursts (< 55ms inter-key latency)
  // regardless of which input or modal element is currently focused, with automatic input restoration.
  // Optionally triggers an 'Inventory Quick-Check' HUD when an unrecognized barcode is scanned.
  const {
    isQuickCheckOpen,
    quickCheckBarcode,
    quickCheckMetadata,
    closeQuickCheck,
  } = useBackgroundScanner({
    onBarcodeScanned: (barcode, meta) => {
      // Strict Guardrail: No barcode transaction may be initiated without an active session
      if (!activeShift || activeShift.status !== 'open') {
        soundFx.playErrorTone();
        showToast(
          'Scan Blocked: An active shift session is required before scanning items or initiating transactions.',
          'error'
        );
        if (!isSellingMode) {
          setCurrentTab('shifts');
        }
        return;
      }
      // If currently in another view, switch to register so the scanned item is visible in the cart
      if (currentTab !== 'register') {
        setCurrentTab('register');
      }
      const res = handleBarcodeScanned(barcode);
      if (!res.success && res.reason === 'not_found') {
        openUnknownBarcodeModal(barcode, { metadata: meta, source: 'hardware' });
      }
    },
    // Only enable background scanner listener when logged into POS terminal and initial legal consent is recorded
    enabled: Boolean(currentUser) && !isAtLandingPage && !requiresLegalConsent,
    enableQuickCheckHUD: !isSellingMode,
    products,
    onUnrecognizedBarcode: (barcode, meta) => {
      openUnknownBarcodeModal(barcode, { metadata: meta, source: 'hardware' });
    },
    maxInterKeyLatencyMs: 55,
    enableInputRestoration: true,
  });

  // Global Esc Handler for Modals & Overlays
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputActive =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

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
        if (isSignOutModalOpen) {
          e.preventDefault();
          setIsSignOutModalOpen(false);
          return;
        }
        if (currentTab === 'settings' || currentTab === 'super-admin') {
          e.preventDefault();
          setCurrentTab('register');
          return;
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    currentTab,
    isPaymentOpen,
    isScannerOpen,
    activeReceipt,
    activeRefundReceipt,
    isReturnsModalOpen,
    isSignOutModalOpen,
    setActiveReceipt,
    setActiveRefundReceipt,
    closeReturnsModal,
  ]);

  // Dedicated Full-Page Pricing View:
  // Directly accessible in both logged-in and public state (seamless return back to active POS session)
  if (isPricingPageOpen) {
    return (
      <div
        id="pos-pricing-page-container"
        className="h-screen w-screen overflow-y-auto scroll-smooth font-sans relative"
      >
        {/* Framer Motion Toast Notification Stack */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} topOffsetClass="top-6" />

        <PricingPageView
          onBackToLogin={() => {
            closePricingPage();
          }}
          onSelectPlan={(planId) => {
            if (currentUser) {
              if (planId !== 'free') {
                setIsSubscriptionModalOpen(true);
              }
            } else if (planId !== 'free') {
              closePricingPage();
            }
          }}
        />

        {/* Global Subscription Activation Modal */}
        <SubscriptionActivationModal
          isOpen={isSubscriptionModalOpen}
          onClose={() => setIsSubscriptionModalOpen(false)}
          onSuccess={() => {
            setIsSubscriptionModalOpen(false);
            closePricingPage();
          }}
        />

        {/* Hidden Dynamic Sitemap View triggered by console command */}
        <DynamicSitemapModal
          isOpen={isSitemapOpen}
          onClose={() => setIsSitemapOpen(false)}
        />

        <UpgradePromptModal />
      </div>
    );
  }

  if (isAtLandingPage) {
    return (
      <div
        id="pos-landing-viewport"
        className="h-screen w-screen overflow-y-auto scroll-smooth dark-scrollbar font-sans bg-[#f8fafc] relative"
      >
        {/* Framer Motion Toast Notification Stack */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} topOffsetClass="top-6" />
        <SignInView onLoginSuccess={navigateToTerminal} />

        {/* Hidden Dynamic Sitemap View triggered by console command */}
        <DynamicSitemapModal
          isOpen={isSitemapOpen}
          onClose={() => setIsSitemapOpen(false)}
        />
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
      {/* Framer Motion Toast Notification Stack */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} topOffsetClass="top-20" />

      {/* Persistent Platform Support Banner (Hidden in Demo Sessions) */}
      {!isDemoSession && (
        <SuperAdminBanner
          onOpenAuditLog={() => handleOpenSuperAdmin('audit')}
          onOpenProvisionModal={() => handleOpenSuperAdmin('provision')}
          onOpenBrandingModal={() => handleOpenSuperAdmin('branding')}
        />
      )}

      {/* Main Top Header */}
      <Header
        openBarcodeScanner={() => setIsScannerOpen(true)}
        openSignOutModal={() => setIsSignOutModalOpen(true)}
        openSuperAdminModal={handleOpenSuperAdmin}
      />

      {/* Recoverable Pending / Verified Subscription Banner */}
      <PendingSubscriptionBanner />

      {/* Alert Banner if current tenant is suspended (Authenticated Sessions Only) */}
      {!isDemoSession && currentBusiness?.status === 'suspended' && isSuperAdmin && (
        <div className="bg-rose-900 text-white px-4 py-2 text-xs flex items-center justify-between border-b border-rose-800 shrink-0 z-30">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
            <span>
              <strong>TENANT POS ACCESS IS SUSPENDED:</strong> Access is toggled OFF for <em>{currentBusiness.name}</em> ({currentBusiness.code}) due to missed subscription payment. Store cashiers &amp; staff cannot trade.
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
                onClick={() => handleOpenSuperAdmin('subscriptions')}
                className="bg-rose-950 hover:bg-black/40 text-rose-200 font-semibold px-2.5 py-1 rounded-lg text-xs transition border border-rose-700 cursor-pointer"
              >
                Subscriptions Tab
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Workspace: Left Vertical Navigation Tabs (hidden in Selling Mode) + Primary Viewport */}
      <div className="flex-1 flex overflow-hidden relative min-h-0 min-w-0">
        {/* Left Vertical Navigation (Hidden across all roles when Selling Mode is ON) */}
        {!isSellingMode && (
          <SidebarNav
            currentTab={currentTab}
            setCurrentTab={handleSetCurrentTab}
            openBarcodeScanner={() => setIsScannerOpen(true)}
            openSuperAdminModal={handleOpenSuperAdmin}
          />
        )}

        {/* Primary Tab Viewport OR Initial Legal Consent Gate OR Suspended Subscription Screen */}
        {requiresLegalConsent ? (
          <main className="flex-1 flex items-center justify-center p-6 bg-slate-900 text-white min-w-0">
            <div className="max-w-md w-full bg-slate-850 border border-slate-700 rounded-2xl p-6 text-center shadow-xl">
              <div className="w-12 h-12 rounded-xl bg-[#28a745]/15 border border-[#28a745]/30 text-[#28a745] flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white">POS Setup Pending Legal Acknowledgement</h2>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                Complete the Sokoplus Horizon merchant terms &amp; operational risk consent dialog to activate register and inventory access for{' '}
                <strong className="text-white">{currentBusiness?.name}</strong>.
              </p>
            </div>
          </main>
        ) : currentBusiness?.status === 'suspended' && !isSuperAdmin ? (
          <main className="flex-1 flex items-center justify-center p-6 bg-slate-900 text-white min-w-0">
            <div className="max-w-md w-full bg-slate-850 border border-slate-700 rounded-2xl p-6 sm:p-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8" />
              </div>
              <div className="text-[11px] font-mono font-semibold text-rose-400 tracking-wide">
                POS Access Suspended · Account Hold
              </div>
              <h2 className="text-xl font-bold text-white mt-2 font-display">
                Subscription Payment Required
              </h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Terminal and trading access for <strong className="text-white font-semibold">{currentBusiness.name}</strong> ({currentBusiness.code}) has been temporarily deactivated due to a missed subscription payment or administrative hold.
              </p>

              <div className="border-t border-b border-slate-800 py-3.5 mt-5 text-left text-xs space-y-2 font-mono tabular-nums">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Business:</span>
                  <span className="text-slate-200 font-semibold">{currentBusiness.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Plan Tier:</span>
                  <span className="text-amber-400 font-semibold capitalize">{currentBusiness.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Account Email:</span>
                  <span className="text-slate-300 truncate max-w-[180px]">{currentBusiness.ownerEmail}</span>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2.5">
                <p className="text-[11px] text-slate-400">
                  Please complete your subscription payment or contact Platform Support to reactivate your store POS terminal access.
                </p>
                <button
                  onClick={() => setIsSignOutModalOpen(true)}
                  className="w-full min-h-[44px] bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs py-2.5 rounded-xl transition cursor-pointer"
                >
                  Sign Out / Switch Account
                </button>
              </div>
            </div>
          </main>
        ) : (
          <main
            className={`flex-1 flex overflow-hidden relative ${
              isSellingMode ? 'pb-0' : 'pb-14 lg:pb-0'
            } min-w-0 min-h-0`}
          >
            {(isSellingMode || currentTab === 'register') && (
              <RegisterView
                onProceedToPayment={() => handleOpenPayment('cash')}
                openBarcodeScanner={() => setIsScannerOpen(true)}
              />
            )}
            {!isSellingMode && currentTab === 'inventory' && <InventoryView />}
            {!isSellingMode && currentTab === 'suppliers' && <SupplierManagementView />}
            {!isSellingMode && currentTab === 'analytics' && (
              <AnalyticsView
                onNavigateToReports={() => handleSetCurrentTab('reports')}
                onNavigateToInventory={() => handleSetCurrentTab('inventory')}
                onNavigateToRegister={() => handleSetCurrentTab('register')}
              />
            )}
            {!isSellingMode && currentTab === 'reports' && <ReportsView />}
            {!isSellingMode && currentTab === 'cloud-sync' && <CloudSyncView />}
            {!isSellingMode && currentTab === 'staff' && <StaffManagementView />}
            {!isSellingMode && currentTab === 'shifts' && <ShiftManagementView />}
            {!isSellingMode && currentTab === 'customers' && (
              <CustomerManagementView
                onAssignCustomerToCart={(cust) => {
                  setSelectedCustomer(cust);
                  setCurrentTab('register');
                }}
              />
            )}
            {!isSellingMode && currentTab === 'settings' && (
              <BusinessProfileSettingsModal
                initialTab={businessSettingsDefaultTab}
                onClose={handleCloseSettings}
              />
            )}
            {!isSellingMode && !isDemoSession && currentTab === 'super-admin' && isSuperAdmin && (
              <SuperAdminDashboardModal
                defaultTab={superAdminModalDefaultTab}
                onClose={() => setCurrentTab('register')}
              />
            )}
          </main>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar (< lg screens, hidden across all roles in Selling Mode) */}
      {!isSellingMode && (
        <MobileBottomNav
          currentTab={currentTab}
          setCurrentTab={handleSetCurrentTab}
          openBarcodeScanner={() => setIsScannerOpen(true)}
          onRequestSignOut={() => setIsSignOutModalOpen(true)}
        />
      )}

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

      <SubscriptionActivationModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        onSuccess={() => {
          setIsSubscriptionModalOpen(false);
        }}
      />

      <ReceiptModal />
      <RefundReceiptModal />
      <ReturnsModal />

      <PinLockModal />

      <SignOutConfirmModal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
      />

      {/* Destructive Action Confirmation Safeguard Modal */}
      <DestructiveConfirmModal />

      {/* Inventory Quick-Check / Quick-Add Modal for Unified Unrecognized Barcode Onboarding */}
      <InventoryQuickCheckHUD
        isOpen={(unknownBarcodePrompt.isOpen || isQuickCheckOpen) && !isSellingMode}
        barcode={unknownBarcodePrompt.barcode || quickCheckBarcode}
        metadata={unknownBarcodePrompt.metadata || quickCheckMetadata}
        source={unknownBarcodePrompt.source || 'hardware'}
        onClose={() => {
          closeQuickCheck();
          closeUnknownBarcodeModal();
        }}
      />

      {/* Persistent Background Hardware Scanner Interception Telemetry HUD */}
      <ScannerInterceptHUD />

      {/* Hidden Dynamic Sitemap View triggered by console command */}
      <DynamicSitemapModal
        isOpen={isSitemapOpen}
        onClose={() => setIsSitemapOpen(false)}
      />

      {/* Single Immersive Bento Overlay (Managed globally, hidden in Selling Mode) */}
      <MobileBentoMenuOverlay
        isOpen={isMobileMenuOpen && !isSellingMode}
        onClose={() => setIsMobileMenuOpen(false)}
        onNavigateTab={(tab) => {
          handleSetCurrentTab(tab);
          setIsMobileMenuOpen(false);
        }}
        isLoggedIn={true}
      />

      <AffiliatePortalModal
        isOpen={isAffiliateModalOpen}
        onClose={() => setIsAffiliateModalOpen(false)}
        onSwitchToPos={() => setIsAffiliateModalOpen(false)}
      />

      <UpgradePromptModal />

      {/* Mandatory Initial Merchant Legal Consent Gate (Blocks POS until recorded in Firestore) */}
      <LegalConsentModal
        isOpen={requiresLegalConsent}
        onRequestSignOut={() => setIsSignOutModalOpen(true)}
      />
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
