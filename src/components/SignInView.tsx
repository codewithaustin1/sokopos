import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Monitor,
  ArrowRight,
  Zap,
  Check,
  X,
  User,
  Delete,
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  Gift,
  Phone,
  Share2,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { Cashier } from '../types';
import { soundFx } from '../utils/audio';
import { LegalTab } from './LegalAndFaqModal';
import { LegalPageView } from './LegalPageView';
import { PricingPageView } from './PricingPageView';
import { WhatsAppFloatingButton } from './landing/WhatsAppFloatingButton';
import { AppLogo } from './common/AppLogo';
import { AppFooter } from './common/AppFooter';
import { MobileHeaderNav } from './common/MobileHeaderNav';
import { scrollToTop } from '../utils/scrollUtils';
import { SUPER_ADMIN_EMAIL } from '../data/initialData';
import { PWAInstallButton } from './PWAInstallButton';
import { AffiliatePortalModal } from './AffiliatePortalModal';
import { enrollAffiliate, fetchAffiliateDashboard } from '../lib/affiliateService';
import { auth } from '../lib/firebase';

// Isolated Animated Counter Subcomponent: Keeps main-thread 60fps by updating the DOM ref directly without React state churn
const AnimatedMetricCounter: React.FC<{ target?: number; duration?: number }> = React.memo(
  ({ target = 25, duration = 1800 }) => {
    const spanRef = React.useRef<HTMLSpanElement>(null);

    useEffect(() => {
      let animationFrameId: number;
      const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

      const animate = (timestamp?: number) => {
        const now =
          typeof timestamp === 'number' && !isNaN(timestamp)
            ? timestamp
            : typeof performance !== 'undefined'
            ? performance.now()
            : Date.now();
        const elapsed = Math.max(0, now - startTime);
        const progress = Math.max(0, Math.min(elapsed / duration, 1));
        const easedProgress = Math.pow(progress, 2.5);
        const calculatedVal = Math.round(1 + (target - 1) * easedProgress);
        const currentVal = isNaN(calculatedVal) ? target : Math.max(1, Math.min(target, calculatedVal));

        if (spanRef.current) {
          spanRef.current.textContent = String(currentVal);
        }

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animate);
        }
      };

      animationFrameId = requestAnimationFrame(animate);
      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    }, [target, duration]);

    return <span ref={spanRef} className="tabular-nums font-mono">{target}</span>;
  }
);

interface SignInViewProps {
  onLoginSuccess?: () => void;
}

const INDUSTRY_DATA: Record<string, [string, string, string, string]> = {
  'Retail shops': [
    'Fast counters for everyday stock',
    'Scan, weigh or search items in seconds.',
    'Low-stock alerts before shelves run empty',
    'Price changes apply across every till',
  ],
  'Bars & restaurants': [
    'Tabs, tables and rounds without the chaos',
    'Open and split tabs per table or customer.',
    'Send orders to the bar or kitchen',
    'Track pours and stock by the bottle',
  ],
  'Supermarkets': [
    'Many tills, one view of the business',
    'Handle long baskets and barcode-heavy sales.',
    'Manage staff shifts and cashier PINs',
    'Compare branches from one dashboard',
  ],
  'Pharmacies': [
    'Stock you can trust, batch by batch',
    'Track expiry dates and batch numbers.',
    'Flag items that need extra care',
    'Issue clear receipts for every sale',
  ],
};

export const SignInView: React.FC<SignInViewProps> = ({ onLoginSuccess }) => {
  const {
    currentUser,
    currentBusiness,
    loginWithGoogle,
    loginWithFirebaseGoogle,
    loginWithFirebaseEmailPassword,
    sendPasswordResetEmailAction,
    pendingVerificationEmail,
    resendVerificationEmail,
    checkEmailVerificationStatus,
    cancelEmailVerification,
    loginWithCredentials,
    systemUsers,
    allSystemUsers,
    businesses,
    showToast,
    openPricingPage,
    closePricingPage,
    appointedDemoCashier,
    appointedDemoCashierId,
    isAffiliateModalOpen,
    setIsAffiliateModalOpen,
  } = usePos();

  const [activeTab, setActiveTab] = useState<'owner' | 'partner' | 'staff' | 'register'>('owner');
  const [activeLegalPage, setActiveLegalPage] = useState<LegalTab | null>(null);
  const [isPricingPageOpen, setIsPricingPageOpen] = useState(false);
  const [isDemoModeActive, setIsDemoModeActive] = useState<boolean>(false);

  // Industry solutions tab state
  const [selectedIndustry, setSelectedIndustry] = useState<string>('Retail shops');

  // Staff credentials / ID and PIN login state
  const [staffCredentialInput, setStaffCredentialInput] = useState<string>('');
  const [isEditingStaffId, setIsEditingStaffId] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isSubmittingTerminal, setIsSubmittingTerminal] = useState<boolean>(false);
  const pinInputRef = useRef<HTMLInputElement>(null);
  const staffInputRef = useRef<HTMLInputElement>(null);

  // Active staff user resolved from credentials / ID
  const matchedStaff = useMemo<(Cashier & { businessName?: string }) | null>(() => {
    const raw = (staffCredentialInput || '').trim();
    if (!raw) {
      if (isDemoModeActive && appointedDemoCashier) {
        return {
          ...appointedDemoCashier,
          businessName: 'SokoPoS Demo Mart (Sandbox)',
        };
      }
      return null;
    }
    const clean = raw.toLowerCase();
    const withoutHash = clean.replace(/^#/, '');

    const found = allSystemUsers.find(
      (u) =>
        u.id.toLowerCase() === clean ||
        u.code.toLowerCase() === clean ||
        u.code.toLowerCase().replace(/^#/, '') === withoutHash ||
        u.username?.toLowerCase() === clean ||
        u.name.toLowerCase() === clean
    );
    if (found) {
      const biz = businesses.find((b) => b.id === found.businessId);
      return {
        ...found,
        businessName: isDemoModeActive ? 'SokoPoS Demo Mart (Sandbox)' : (biz?.name || 'Upfront Retail Solutions'),
      };
    }

    // Default to appointed demo cashier if matched and in demo mode
    if (isDemoModeActive && appointedDemoCashier && (withoutHash === appointedDemoCashier.code.replace(/^#/, '').toLowerCase() || clean === appointedDemoCashier.name.toLowerCase())) {
      return {
        ...appointedDemoCashier,
        businessName: 'SokoPoS Demo Mart (Sandbox)',
      };
    }

    // Default seeded fallback for Cashier A (#7000) only in demo mode
    if (isDemoModeActive && (withoutHash === '7000' || clean === 'cashier a')) {
      return {
        id: 'user-cashier-7000',
        businessId: 'biz-upfront',
        name: 'Cashier A',
        initials: 'CA',
        code: '#7000',
        username: 'cashier.a',
        pin: '1234',
        role: 'cashier' as const,
        avatarColor: 'bg-blue-600',
        shiftStartedAt: new Date().toISOString(),
        businessName: 'SokoPoS Demo Mart (Sandbox)',
        isAppointedDemo: true,
      };
    }

    return null;
  }, [staffCredentialInput, allSystemUsers, businesses, appointedDemoCashier, isDemoModeActive]);

  // Direct email & password login state
  const [ownerEmailInput, setOwnerEmailInput] = useState<string>('');
  const [ownerPasswordInput, setOwnerPasswordInput] = useState<string>('');
  const [showOwnerPassword, setShowOwnerPassword] = useState<boolean>(false);
  const [emailAuthError, setEmailAuthError] = useState<string | null>(null);
  const [isAuthenticatingEmail, setIsAuthenticatingEmail] = useState<boolean>(false);

  // Password reset state
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState<boolean>(false);
  const [resetEmailSuccessMessage, setResetEmailSuccessMessage] = useState<string | null>(null);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState<boolean>(false);

  // Partner tab authentication state
  const [partnerMode, setPartnerMode] = useState<'signin' | 'register'>('signin');
  const [partnerNameInput, setPartnerNameInput] = useState<string>('');
  const [partnerEmailInput, setPartnerEmailInput] = useState<string>('');
  const [partnerPhoneInput, setPartnerPhoneInput] = useState<string>('07');
  const [partnerPasswordInput, setPartnerPasswordInput] = useState<string>('');
  const [showPartnerPassword, setShowPartnerPassword] = useState<boolean>(false);
  const [partnerCodeInput, setPartnerCodeInput] = useState<string>('');
  const [partnerAuthError, setPartnerAuthError] = useState<string | null>(null);
  const [isAuthenticatingPartner, setIsAuthenticatingPartner] = useState<boolean>(false);
  const partnerEmailInputRef = useRef<HTMLInputElement>(null);

  // Email Verification Gate state
  const [isCheckingVerification, setIsCheckingVerification] = useState<boolean>(false);
  const [isResendingVerification, setIsResendingVerification] = useState<boolean>(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationContext, setVerificationContext] = useState<'owner' | 'partner'>('owner');

  useEffect(() => {
    if (pendingVerificationEmail) {
      setIsAuthModalOpen(true);
    }
  }, [pendingVerificationEmail]);

  const handleCheckVerification = async () => {
    setVerificationError(null);
    setVerificationFeedback(null);
    setIsCheckingVerification(true);
    try {
      const res = await checkEmailVerificationStatus();
      if (res.verified) {
        setIsAuthModalOpen(false);

        // Check if there was a pending partner registration waiting for email verification
        const rawPendingPartner = sessionStorage.getItem('sokopos_pending_partner_registration');
        if (rawPendingPartner) {
          try {
            const pendingPartner = JSON.parse(rawPendingPartner);
            sessionStorage.removeItem('sokopos_pending_partner_registration');
            const verifiedEmail = auth.currentUser?.email || pendingPartner.email;
            const uid = auth.currentUser?.uid || `partner-${Date.now()}`;
            const enrollRes = await enrollAffiliate({
              uid,
              email: verifiedEmail.toLowerCase(),
              name: pendingPartner.name || 'Partner',
              mpesaPhone: pendingPartner.phone || '0700000000',
              accountType: 'public_partner',
              preferredCode: pendingPartner.preferredCode || undefined,
            });

            setIsAffiliateModalOpen(true);
            soundFx.playSuccess();
            showToast(
              enrollRes.success && enrollRes.affiliate?.code
                ? `Email verified! Welcome ${pendingPartner.name}! Referral code: ${enrollRes.affiliate.code}`
                : 'Email verified! Partner account successfully activated.',
              'success'
            );
            return;
          } catch (enrollErr) {
            console.error('Error auto-enrolling verified partner:', enrollErr);
          }
        }

        // If user was verifying in partner tab mode or is marked partner context, open affiliate portal
        if (verificationContext === 'partner') {
          setIsAffiliateModalOpen(true);
          soundFx.playSuccess();
          showToast('Email verified! Welcome to the SokoPoS Partner Portal.', 'success');
          return;
        }

        onLoginSuccess?.();
      } else {
        setVerificationError(res.error || 'Email is not verified yet. Please check your inbox.');
        soundFx.playError();
      }
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const handleResendVerification = async () => {
    setVerificationError(null);
    setVerificationFeedback(null);
    setIsResendingVerification(true);
    try {
      const res = await resendVerificationEmail();
      if (res.success) {
        setVerificationFeedback(res.message || 'Verification email sent.');
        soundFx.playSuccess();
      } else {
        setVerificationError(res.error || 'Failed to resend verification email.');
        soundFx.playError();
      }
    } finally {
      setIsResendingVerification(false);
    }
  };

  const handleCancelVerification = async () => {
    setVerificationError(null);
    setVerificationFeedback(null);
    sessionStorage.removeItem('sokopos_pending_partner_registration');
    await cancelEmailVerification();
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = ownerEmailInput.trim();
    setEmailAuthError(null);
    setResetEmailSuccessMessage(null);

    if (!email) {
      setEmailAuthError('Please enter your account email address.');
      return;
    }

    setIsSendingResetEmail(true);
    try {
      const res = await sendPasswordResetEmailAction(email);
      if (res.success) {
        setResetEmailSuccessMessage(res.message || `Password reset link sent to ${email}.`);
        soundFx.playSuccess();
      } else {
        setEmailAuthError(res.error || 'Failed to send password reset email.');
        soundFx.playError();
      }
    } catch (err: any) {
      setEmailAuthError(err?.message || 'Failed to send password reset email.');
      soundFx.playError();
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  // Register state
  const [shopNameInput, setShopNameInput] = useState<string>('');
  const [shopEmailInput, setShopEmailInput] = useState<string>('');
  const [shopPasswordInput, setShopPasswordInput] = useState<string>('');
  const [showShopPassword, setShowShopPassword] = useState<boolean>(false);

  // Synchronize URL hash with active legal or pricing page for browser history & direct links
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (hash === 'pricing' || hash === 'plans' || hash === 'price') {
        setIsPricingPageOpen(true);
        setActiveLegalPage(null);
      } else if (hash === 'terms' || hash === 'tos') {
        setIsPricingPageOpen(false);
        setActiveLegalPage('terms');
      } else if (hash === 'privacy') {
        setIsPricingPageOpen(false);
        setActiveLegalPage('privacy');
      } else if (hash === 'faq') {
        setIsPricingPageOpen(false);
        setActiveLegalPage('faq');
      } else if (hash === 'ownership' || hash === 'legal' || hash === 'ip') {
        setIsPricingPageOpen(false);
        setActiveLegalPage('ownership');
      } else if (hash === 'compliance' || hash === 'gcp') {
        setIsPricingPageOpen(false);
        setActiveLegalPage('compliance');
      } else if (!hash) {
        setIsPricingPageOpen(false);
        setActiveLegalPage(null);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigateToLegalPage = (tab: LegalTab) => {
    setIsPricingPageOpen(false);
    setActiveLegalPage(tab);
    window.location.hash = `#${tab}`;
  };

  const navigateToPricing = () => {
    setActiveLegalPage(null);
    setIsPricingPageOpen(true);
    openPricingPage();
    scrollToTop(false);
  };

  const returnToLogin = () => {
    setActiveLegalPage(null);
    setIsPricingPageOpen(false);
    closePricingPage();
  };

  // Modal version of the Sign-In card
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const shopNameInputRef = useRef<HTMLInputElement>(null);
  const modalCardRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const openAuthModal = (targetTab: 'owner' | 'partner' | 'staff' | 'register' = 'owner') => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setIsDemoModeActive(false);
    localStorage.removeItem('sokopos_demo_intent');
    setActiveTab(targetTab);
    setPinError(null);
    setEnteredPin('');
    setStaffCredentialInput('');
    setIsEditingStaffId(false);
    setIsForgotPasswordMode(false);
    setResetEmailSuccessMessage(null);
    setEmailAuthError(null);
    setPartnerAuthError(null);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setPinError(null);
    setEnteredPin('');
    setIsForgotPasswordMode(false);
    setResetEmailSuccessMessage(null);
    setEmailAuthError(null);
    setPartnerAuthError(null);
    setIsDemoModeActive(false);
    localStorage.removeItem('sokopos_demo_intent');
    setTimeout(() => {
      previousFocusRef.current?.focus();
    }, 50);
  };

  const scrollToAuthCard = (targetTab?: 'owner' | 'partner' | 'staff' | 'register') => {
    openAuthModal(targetTab || 'owner');
  };

  // Prevent background scrolling and lock body/viewport when modal is open
  useEffect(() => {
    if (!isAuthModalOpen) return;

    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const viewport = document.getElementById('pos-landing-viewport');
    const originalViewportOverflow = viewport ? viewport.style.overflow : '';
    if (viewport) {
      viewport.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      if (viewport) {
        viewport.style.overflow = originalViewportOverflow;
      }
    };
  }, [isAuthModalOpen]);

  // Auto-focus first input field upon modal opening
  useEffect(() => {
    if (!isAuthModalOpen) return;

    const timer = setTimeout(() => {
      if (activeTab === 'owner') {
        emailInputRef.current?.focus();
      } else if (activeTab === 'partner') {
        partnerEmailInputRef.current?.focus();
      } else if (activeTab === 'register') {
        shopNameInputRef.current?.focus();
      } else if (activeTab === 'staff') {
        if (isDemoModeActive && !isEditingStaffId) {
          pinInputRef.current?.focus();
        } else {
          staffInputRef.current?.focus();
        }
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [activeTab, isAuthModalOpen, isDemoModeActive, isEditingStaffId]);

  // Dismiss on Escape key and trap keyboard focus within modal
  useEffect(() => {
    if (!isAuthModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeAuthModal();
        return;
      }

      if (e.key === 'Tab') {
        const modal = modalCardRef.current;
        if (!modal) return;

        const focusable = modal.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !modal.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !modal.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen]);

  const scrollToSection = (sectionId: string) => {
    if (sectionId === 'home' || sectionId === 'top' || sectionId === 'hero' || !sectionId) {
      if (window.location.hash) {
        try {
          history.replaceState(null, '', window.location.pathname);
        } catch {
          window.location.hash = '';
        }
      }
      scrollToTop(true);
      return;
    }
    const el =
      document.getElementById(sectionId) ||
      document.getElementById(
        sectionId === 'industry-solutions'
          ? 'solutions'
          : sectionId === 'kenya-payments'
          ? 'payments'
          : sectionId === 'hardware-guide'
          ? 'hardware'
          : sectionId === 'pricing-comparison'
          ? 'compare'
          : sectionId
      );
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.hash = `#${sectionId}`;
    }
  };

  // Physical keyboard support for staff PIN (only active when modal is open on staff tab)
  useEffect(() => {
    if (!isAuthModalOpen || activeTab !== 'staff') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' &&
        (document.activeElement as HTMLInputElement).type !== 'password'
      ) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        if (!isDemoModeActive && !staffCredentialInput.trim()) {
          setPinError('Please enter your Staff ID or username first');
          staffInputRef.current?.focus();
          return;
        }
        e.preventDefault();
        soundFx.playBeep(640, 0.04);
        setPinError(null);
        setEnteredPin((prev) => {
          if (prev.length < 4) {
            const next = prev + e.key;
            if (next.length === 4) {
              setTimeout(() => {
                submitStaffLogin(next);
              }, 120);
            }
            return next;
          }
          return prev;
        });
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        soundFx.playBeep(520, 0.04);
        setEnteredPin((prev) => prev.slice(0, -1));
        setPinError(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submitStaffLogin();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, activeTab, enteredPin, staffCredentialInput, matchedStaff, isDemoModeActive]);

  const handleKeypadPress = (val: string) => {
    soundFx.playBeep(640, 0.04);
    setPinError(null);
    if (val === 'Clear') {
      setEnteredPin('');
    } else if (val === '⌫') {
      setEnteredPin((prev) => prev.slice(0, -1));
    } else if (enteredPin.length < 4) {
      if (!isDemoModeActive && !staffCredentialInput.trim()) {
        setPinError('Please enter your Staff ID or username first');
        staffInputRef.current?.focus();
        return;
      }
      const nextPin = enteredPin + val;
      setEnteredPin(nextPin);
      if (nextPin.length === 4) {
        setTimeout(() => {
          submitStaffLogin(nextPin);
        }, 120);
      }
    }
  };

  const handleFillDemoPin = () => {
    soundFx.playBeep(640, 0.04);
    setEnteredPin('1234');
    setPinError(null);
    setIsDemoModeActive(true);
    localStorage.setItem('sokopos_demo_intent', 'true');
    setTimeout(() => {
      submitStaffLogin('1234');
    }, 150);
  };

  const submitStaffLogin = async (pinOverride?: string) => {
    const pin = pinOverride || enteredPin;
    if (isSubmittingTerminal) return;
    const credential = staffCredentialInput.trim();
    if (!credential) {
      setPinError('Please enter your Staff ID or username');
      soundFx.playError();
      staffInputRef.current?.focus();
      return;
    }
    if (!pin || pin.length < 4) {
      setPinError('Please enter your 4-digit PIN');
      soundFx.playError();
      pinInputRef.current?.focus();
      return;
    }

    setIsSubmittingTerminal(true);
    setPinError(null);
    try {
      // Authenticate with credentials and PIN — strictly locked to staff member's business ID and permissions
      const success = await loginWithCredentials(credential, pin, isDemoModeActive);
      if (success) {
        setIsAuthModalOpen(false);
        onLoginSuccess?.();
      } else {
        setPinError('Incorrect 4-digit PIN. Try again.');
        setEnteredPin('');
        soundFx.playError();
      }
    } catch (err: any) {
      setPinError(err?.message || 'Authentication failed. Please verify credentials.');
      setEnteredPin('');
      soundFx.playError();
    } finally {
      setIsSubmittingTerminal(false);
    }
  };

  const handleTerminalSubmit = () => {
    submitStaffLogin();
  };

  const handleGoogleSignIn = async () => {
    try {
      const ok = await loginWithFirebaseGoogle();
      if (ok) {
        setIsAuthModalOpen(false);
        onLoginSuccess?.();
      }
    } catch {
      loginWithGoogle(SUPER_ADMIN_EMAIL, 'Platform Administrator');
      setIsAuthModalOpen(false);
      onLoginSuccess?.();
    }
  };

  const handleEmailFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = ownerEmailInput.trim();
    const password = ownerPasswordInput.trim();
    setEmailAuthError(null);

    if (!email) {
      setEmailAuthError('Please enter your email address.');
      return;
    }
    if (!password) {
      setEmailAuthError('Please enter your password.');
      return;
    }
    if (password.length < 6) {
      setEmailAuthError('Password must be at least 6 characters long.');
      return;
    }

    setIsAuthenticatingEmail(true);
    try {
      const res = await loginWithFirebaseEmailPassword(email, password, false);
      if (res.success) {
        setIsAuthModalOpen(false);
        onLoginSuccess?.();
      } else if (res.requiresVerification) {
        setVerificationError(null);
        setVerificationFeedback(`A verification link was sent to ${res.email || email}. Please verify your inbox to continue.`);
      } else {
        setEmailAuthError(res.error || 'Authentication failed. Please check credentials.');
        soundFx.playError();
      }
    } catch (err: any) {
      setEmailAuthError(err?.message || 'Authentication failed.');
      soundFx.playError();
    } finally {
      setIsAuthenticatingEmail(false);
    }
  };

  const handleRegisterFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const storeName = shopNameInput.trim();
    const ownerEmail = shopEmailInput.trim();
    const password = shopPasswordInput.trim();
    setEmailAuthError(null);

    if (!storeName) {
      setEmailAuthError('Please enter your shop or business name.');
      return;
    }
    if (!ownerEmail) {
      setEmailAuthError('Please enter your owner email address.');
      return;
    }
    if (!password) {
      setEmailAuthError('Please enter a password for your account.');
      return;
    }
    if (password.length < 6) {
      setEmailAuthError('Password must be at least 6 characters long.');
      return;
    }

    setIsAuthenticatingEmail(true);
    try {
      const res = await loginWithFirebaseEmailPassword(ownerEmail, password, true, storeName);
      if (res.success) {
        setIsAuthModalOpen(false);
        onLoginSuccess?.();
      } else if (res.requiresVerification) {
        setVerificationError(null);
        setVerificationFeedback(`We sent a verification link to ${res.email || ownerEmail}. Verify your email to activate your shop.`);
      } else {
        setEmailAuthError(res.error || 'Failed to create shop account. Please check inputs.');
        soundFx.playError();
      }
    } catch (err: any) {
      setEmailAuthError(err?.message || 'Failed to create shop account.');
      soundFx.playError();
    } finally {
      setIsAuthenticatingEmail(false);
    }
  };

  const handlePartnerFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPartnerAuthError(null);
    const email = partnerEmailInput.trim().toLowerCase();
    const password = partnerPasswordInput.trim();

    if (!email) {
      setPartnerAuthError('Please enter your email address.');
      return;
    }
    if (!password) {
      setPartnerAuthError('Please enter your password.');
      return;
    }
    if (password.length < 6) {
      setPartnerAuthError('Password must be at least 6 characters long.');
      return;
    }

    if (partnerMode === 'register') {
      const name = partnerNameInput.trim() || email.split('@')[0];
      const phone = partnerPhoneInput.trim();
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length < 9) {
        setPartnerAuthError('Please enter a valid Safaricom M-Pesa phone number for commission payouts.');
        return;
      }

      setIsAuthenticatingPartner(true);
      try {
        const authRes = await loginWithFirebaseEmailPassword(email, password, true, undefined);

        if (authRes.requiresVerification) {
          // Store pending partner details in session so they are enrolled once verified
          sessionStorage.setItem(
            'sokopos_pending_partner_registration',
            JSON.stringify({
              email,
              name,
              phone,
              preferredCode: partnerCodeInput.trim() || undefined,
            })
          );
          setVerificationContext('partner');
          setVerificationError(null);
          setVerificationFeedback(
            `A verification link has been sent to ${authRes.email || email}. Please click the link in your inbox to confirm this is a real email and activate your partner account.`
          );
        } else if (authRes.success) {
          // User is verified (or admin override)
          sessionStorage.removeItem('sokopos_pending_partner_registration');
          const uid = auth.currentUser?.uid || `partner-${Date.now()}`;
          const enrollRes = await enrollAffiliate({
            uid,
            email,
            name,
            mpesaPhone: phone,
            accountType: 'public_partner',
            preferredCode: partnerCodeInput.trim() || undefined,
          });

          setIsAuthModalOpen(false);
          setIsAffiliateModalOpen(true);
          soundFx.playSuccess();
          showToast(
            enrollRes.success && enrollRes.affiliate?.code
              ? `Welcome ${name}! Your referral code is ${enrollRes.affiliate.code}.`
              : 'Partner account created! Referral link ready.',
            'success'
          );
        } else {
          setPartnerAuthError(authRes.error || 'Failed to create partner account.');
          soundFx.playError();
        }
      } catch (err: any) {
        setPartnerAuthError(err?.message || 'Failed to create partner account.');
        soundFx.playError();
      } finally {
        setIsAuthenticatingPartner(false);
      }
    } else {
      // Partner Sign-In mode
      setIsAuthenticatingPartner(true);
      try {
        const authRes = await loginWithFirebaseEmailPassword(email, password, false);
        if (authRes.requiresVerification) {
          setVerificationContext('partner');
          setVerificationError(null);
          setVerificationFeedback(
            `Your email address has not been verified yet. Please check ${authRes.email || email} and verify to access the partner portal.`
          );
        } else if (authRes.success) {
          const uid = auth.currentUser?.uid || '';
          try {
            const data = await fetchAffiliateDashboard(uid, email);
            if (!data.enrolled) {
              await enrollAffiliate({
                uid,
                email,
                name: auth.currentUser?.displayName || email.split('@')[0],
                mpesaPhone: '0700000000',
                accountType: 'public_partner',
              });
            }
          } catch (dashErr) {
            console.warn('Affiliate check on sign in:', dashErr);
          }

          setIsAuthModalOpen(false);
          setIsAffiliateModalOpen(true);
          soundFx.playSuccess();
          showToast('Welcome back to the SokoPoS Partner Portal!', 'success');
        } else {
          setPartnerAuthError(authRes.error || 'Invalid partner email or password.');
          soundFx.playError();
        }
      } catch (err: any) {
        setPartnerAuthError(err?.message || 'Partner sign-in failed.');
        soundFx.playError();
      } finally {
        setIsAuthenticatingPartner(false);
      }
    }
  };

  const handleLaunchDemoSandbox = () => {
    setIsDemoModeActive(true);
    localStorage.setItem('sokopos_demo_intent', 'true');
    setActiveTab('staff');

    // Prefill the cashier profile appointed by the super admin from among cashiers created by admin
    const targetCashier = appointedDemoCashier;
    if (targetCashier) {
      setStaffCredentialInput(targetCashier.code || targetCashier.username || targetCashier.name);
    } else {
      setStaffCredentialInput('#7000');
    }
    setIsEditingStaffId(false);
    setEnteredPin('');
    setPinError(null);
    setIsAuthModalOpen(true);
    soundFx.playBeep(640, 0.04);

    setTimeout(() => {
      pinInputRef.current?.focus();
    }, 120);
  };

  // Render Full-Page Dedicated Pricing view
  if (isPricingPageOpen) {
    return (
      <PricingPageView
        onBackToLogin={returnToLogin}
        onSelectPlan={(_planId) => {
          returnToLogin();
          setTimeout(() => scrollToAuthCard('owner'), 100);
        }}
      />
    );
  }

  // Render Full-Page Legal, FAQ, or Compliance view as the Body of this SPA (Zero floating modals)
  if (activeLegalPage) {
    return (
      <LegalPageView
        currentTab={activeLegalPage}
        onTabChange={navigateToLegalPage}
        onBackToLogin={returnToLogin}
      />
    );
  }

  const activeIndDetails = INDUSTRY_DATA[selectedIndustry] || INDUSTRY_DATA['Retail shops'];

  // Determine staff profiles to show in staff list
  const displayStaff =
    systemUsers.length > 0
      ? systemUsers.slice(0, 4)
      : [
          { id: 'staff-101', name: 'John Mutua', code: 'C-101 · Cashier', initials: 'JM', bg: '#1565d8' },
          { id: 'staff-102', name: 'Amina Wanjiru', code: 'C-102 · Manager', initials: 'AW', bg: '#0a7d46' },
        ];

  return (
    <div
      id="pos-landing-root"
      className="min-h-full w-full flex flex-col justify-between selection:bg-[#1565d8] selection:text-white relative"
      style={{
        backgroundColor: '#f4f7f6',
        color: '#0e1a2b',
        fontFamily: '"Bricolage Grotesque", system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      {/* Strict Light Mode CSS & Reset matching the design HTML */}
      <style>{`
        #pos-landing-root {
          --bg: #f4f7f6;
          --surface: #fff;
          --ink: #0e1a2b;
          --muted: #4c5a6b;
          --line: #d9e1e6;
          --blue: #1565d8;
          --blue-ink: #fff;
          --red: #c8231b;
          --green: #0a7d46;
          --soft: #e8f0fb;
          color-scheme: light;
        }
        .sp-wrap {
          max-width: 1160px;
          margin: 0 auto;
          padding: 0 20px;
        }
        .sp-btn {
          border: 0;
          border-radius: 12px;
          padding: 12px 20px;
          font-weight: 700;
          font-size: 0.95rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.12s, background 0.12s, filter 0.12s;
        }
        .sp-btn:active {
          transform: scale(0.98);
        }
        .sp-btn-blue {
          background: var(--blue);
          color: var(--blue-ink);
        }
        .sp-btn-blue:hover {
          filter: brightness(1.08);
        }
        .sp-btn-red {
          background: var(--red);
          color: #fff;
        }
        .sp-btn-red:hover {
          filter: brightness(1.08);
        }
        .sp-btn-ghost {
          background: transparent;
          color: var(--ink);
          border: 1.5px solid var(--line);
        }
        .sp-btn-ghost:hover {
          border-color: var(--ink);
        }
        .sp-btn-sm {
          padding: 8px 16px;
          font-size: 0.85rem;
        }
        .sp-hero {
          padding: 56px 0 72px;
          text-align: center;
        }
        .sp-h1 {
          font-size: clamp(2.2rem, 5.6vw, 3.8rem);
          line-height: 1.06;
          letter-spacing: -0.035em;
          font-weight: 800;
          margin: 0 auto 20px;
          max-width: 22ch;
          color: var(--ink);
          text-align: center;
        }
        .sp-lead {
          color: var(--muted);
          font-size: 1.15rem;
          max-width: 48ch;
          margin: 0 auto 28px;
          line-height: 1.55;
          text-align: center;
        }
        .sp-cta {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .sp-fine {
          font-size: 0.85rem;
          color: var(--muted);
          margin: 0 auto 36px;
          text-align: center;
        }
        .sp-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: var(--surface);
          overflow: hidden;
          max-width: 760px;
          margin: 0 auto;
          width: 100%;
        }
        @media (min-width: 620px) {
          .sp-stats {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        .sp-stats div {
          padding: 16px 18px;
          border-right: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
        }
        .sp-stats b {
          display: block;
          font-size: 1.5rem;
          letter-spacing: -0.02em;
          font-variant-numeric: tabular-nums;
          color: var(--ink);
        }
        .sp-stats span {
          font-size: 0.8rem;
          color: var(--muted);
        }
        /* Receipt Auth Card with serrated bottom edge */
        .sp-receipt {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 22px;
          position: relative;
          box-shadow: 0 18px 40px -22px rgba(10, 30, 60, 0.45);
        }
        .sp-receipt::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: -9px;
          height: 10px;
          background: radial-gradient(circle at 8px 0, var(--bg) 6px, transparent 6.5px) 0 0/16px 10px repeat-x;
        }
        .sp-seg {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: var(--bg);
          border-radius: 12px;
          padding: 4px;
          gap: 4px;
          margin-bottom: 18px;
        }
        .sp-seg button {
          border: 0;
          background: transparent;
          padding: 10px;
          border-radius: 9px;
          font-weight: 700;
          color: var(--muted);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .sp-seg button[aria-selected="true"] {
          background: var(--surface);
          color: var(--ink);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }
        .sp-receipt h2 {
          font-size: 1.25rem;
          margin: 0 0 14px;
          letter-spacing: -0.02em;
          color: var(--ink);
          font-weight: 800;
        }
        .sp-gbtn {
          width: 100%;
          background: var(--blue);
          color: var(--blue-ink);
          border: 0;
          border-radius: 12px;
          padding: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: filter 0.12s, transform 0.1s;
        }
        .sp-gbtn:hover {
          filter: brightness(1.08);
        }
        .sp-gbtn:active {
          transform: scale(0.99);
        }
        .sp-gbtn b {
          background: #fff;
          color: #4285f4;
          width: 24px;
          height: 24px;
          border-radius: 6px;
          display: grid;
          place-items: center;
          font-size: 0.9rem;
        }
        .sp-or {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--muted);
          font-size: 0.8rem;
          margin: 16px 0;
        }
        .sp-or::before,
        .sp-or::after {
          content: "";
          flex: 1;
          border-top: 1px dashed var(--line);
        }
        .sp-label {
          display: block;
          font-size: 0.82rem;
          font-weight: 700;
          margin: 0 0 6px;
          color: var(--ink);
        }
        .sp-input {
          width: 100%;
          padding: 11px 12px;
          border-radius: 10px;
          border: 1.5px solid var(--line);
          background: var(--bg);
          color: var(--ink);
          font: inherit;
          font-size: 0.95rem;
          outline: none;
        }
        .sp-input:focus {
          border-color: var(--blue);
          background: #fff;
        }
        .sp-row {
          display: flex;
          gap: 8px;
        }
        .sp-field {
          margin-bottom: 14px;
        }
        .sp-staff {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 14px;
        }
        .sp-staff button {
          display: flex;
          gap: 8px;
          align-items: center;
          text-align: left;
          padding: 8px;
          border-radius: 10px;
          border: 1.5px solid var(--line);
          background: var(--bg);
          color: var(--ink);
          font-size: 0.82rem;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }
        .sp-staff button[aria-pressed="true"] {
          border-color: var(--blue);
          background: var(--soft);
        }
        .sp-staff i {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-style: normal;
          font-size: 0.7rem;
          font-weight: 800;
          color: #fff;
          background: var(--blue);
          flex: none;
        }
        .sp-staff small {
          display: block;
          color: var(--muted);
          font-size: 0.7rem;
        }
        .sp-dots {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin: 6px 0 4px;
        }
        .sp-dots i {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 1.5px solid var(--line);
          background: var(--bg);
          transition: background 0.15s, border-color 0.15s;
        }
        .sp-dots i.on {
          background: var(--blue);
          border-color: var(--blue);
        }
        .sp-perr {
          min-height: 20px;
          text-align: center;
          font-size: 0.82rem;
          color: var(--red);
          font-weight: 600;
        }
        .sp-pad {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          max-width: 270px;
          margin: 0 auto 14px;
        }
        .sp-pad button {
          height: 46px;
          border-radius: 10px;
          border: 1.5px solid var(--line);
          background: var(--bg);
          color: var(--ink);
          font-weight: 800;
          font-size: 1.1rem;
          cursor: pointer;
          transition: background 0.12s, color 0.12s;
        }
        .sp-pad button:active {
          background: var(--blue);
          color: var(--blue-ink);
        }
        .sp-pad .fn {
          font-size: 0.72rem;
          color: var(--muted);
          font-weight: 700;
        }
        .sp-link {
          background: none;
          border: 0;
          color: var(--blue);
          font-weight: 600;
          font-size: 0.82rem;
          padding: 0;
          text-decoration: underline;
          cursor: pointer;
        }
        .sp-below {
          margin-top: 18px;
          padding-top: 16px;
          border-top: 1px dashed var(--line);
          text-align: center;
          font-size: 0.9rem;
          color: var(--muted);
        }
        .sp-below .sp-btn {
          width: 100%;
          margin-top: 10px;
        }
        /* Sections */
        section.sp-s {
          padding: 72px 0;
          border-top: 1px solid var(--line);
        }
        h2.sp-t {
          font-size: clamp(1.7rem, 3.6vw, 2.5rem);
          letter-spacing: -0.03em;
          line-height: 1.1;
          margin: 0 0 12px;
          max-width: 22ch;
          color: var(--ink);
          font-weight: 800;
        }
        .sp-sub {
          color: var(--muted);
          max-width: 58ch;
          margin: 0 0 36px;
          font-size: 1rem;
        }
        .sp-grid3 {
          display: grid;
          gap: 16px;
        }
        @media (min-width: 760px) {
          .sp-grid3 {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .sp-card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 22px;
        }
        .sp-card h3 {
          margin: 0 0 6px;
          font-size: 1.1rem;
          letter-spacing: -0.01em;
          color: var(--ink);
          font-weight: 700;
        }
        .sp-card p {
          margin: 0;
          color: var(--muted);
          font-size: 0.95rem;
          line-height: 1.5;
        }
        .sp-tag {
          display: inline-block;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 99px;
          background: var(--soft);
          color: var(--blue);
          margin-bottom: 12px;
        }
        .sp-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
        }
        .sp-tabs button {
          border: 1.5px solid var(--line);
          background: var(--surface);
          color: var(--ink);
          padding: 9px 16px;
          border-radius: 99px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        .sp-tabs button[aria-selected="true"] {
          background: var(--ink);
          color: var(--bg);
          border-color: var(--ink);
        }
        .sp-panel {
          display: grid;
          gap: 24px;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 26px;
        }
        @media (min-width: 760px) {
          .sp-panel {
            grid-template-columns: 1.1fr 1fr;
            padding: 34px;
          }
        }
        .sp-panel h3 {
          font-size: 1.5rem;
          margin: 0 0 10px;
          letter-spacing: -0.02em;
          color: var(--ink);
          font-weight: 800;
        }
        .sp-panel ul {
          margin: 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 10px;
        }
        .sp-panel li {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          color: var(--ink);
          font-size: 0.95rem;
        }
        .sp-panel li::before {
          content: "✓";
          color: var(--green);
          font-weight: 800;
        }
        .sp-hw {
          display: grid;
          gap: 12px;
        }
        @media (min-width: 640px) {
          .sp-hw {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 960px) {
          .sp-hw {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        .sp-scroll {
          overflow-x: auto;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: var(--surface);
        }
        .sp-table {
          border-collapse: collapse;
          width: 100%;
          min-width: 520px;
          font-size: 0.95rem;
        }
        .sp-table th,
        .sp-table td {
          padding: 14px 18px;
          text-align: left;
          border-bottom: 1px solid var(--line);
        }
        .sp-table th {
          font-size: 0.85rem;
          color: var(--muted);
          font-weight: 700;
        }
        .sp-table tr:last-child td {
          border-bottom: 0;
        }
        .sp-table td.y {
          color: var(--green);
          font-weight: 700;
        }
        .sp-table td.n {
          color: var(--muted);
        }
        .sp-final {
          text-align: center;
          padding: 80px 20px;
        }
        .sp-final h2 {
          font-size: clamp(2rem, 5vw, 3.2rem);
          letter-spacing: -0.035em;
          margin: 0 0 12px;
          color: var(--ink);
          font-weight: 800;
        }
        .sp-final p {
          color: var(--muted);
          max-width: 50ch;
          margin: 0 auto 26px;
          font-size: 1.05rem;
        }
        .sp-final .sp-cta {
          justify-content: center;
        }
      `}</style>

      {/* PRESERVED HEADER (Preserved structure, logo, navigation anchors, actions & mobile hamburger menu in light mode) */}
      <header
        className="px-4 sm:px-8 py-3.5 border-b border-[#d9e1e6] bg-[#f4f7f6]/95 backdrop-blur-md shadow-xs flex items-center justify-between shrink-0 sticky top-0 z-50 transition-colors"
      >
        {/* Brand */}
        <AppLogo theme="light" size="md" onClick={() => scrollToTop(true)} />

        {/* Quick Nav Anchors for Desktop Visitors */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-[#4c5a6b]">
          <a
            href="#solutions"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('solutions');
            }}
            className="hover:text-[#1565d8] transition cursor-pointer"
          >
            Solutions
          </a>
          <a
            href="#payments"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('payments');
            }}
            className="hover:text-[#1565d8] transition cursor-pointer"
          >
            M-Pesa &amp; eTIMS
          </a>
          <a
            href="#hardware"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('hardware');
            }}
            className="hover:text-[#1565d8] transition cursor-pointer"
          >
            Hardware Freedom
          </a>
          <a
            href="#compare"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('compare');
            }}
            className="hover:text-[#1565d8] transition cursor-pointer"
          >
            Why SokoPoS
          </a>
        </nav>

        {/* Action Buttons & Mobile Hamburger Menu */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <PWAInstallButton variant="compact" />

          {currentUser ? (
            <button
              type="button"
              id="top-nav-pos-terminal-btn"
              onClick={onLoginSuccess}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Enter POS Terminal</span>
              <span className="sm:hidden">Terminal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            /* Desktop View: Text Login Button in header (opens modal) */
            <button
              type="button"
              id="top-nav-login-btn"
              onClick={() => openAuthModal('owner')}
              className="hidden sm:inline-flex items-center px-4 py-1.5 rounded-xl bg-[#1565d8] hover:bg-[#1255b5] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              Login
            </button>
          )}

          {/* Mobile Hamburger Menu with animated 2-bar toggle icon */}
          <MobileHeaderNav
            onNavigateSection={scrollToSection}
            onNavigatePricing={navigateToPricing}
            onAuthAction={() => {
              if (currentUser) {
                onLoginSuccess?.();
              } else {
                openAuthModal('owner');
              }
            }}
            isLoggedIn={Boolean(currentUser)}
            currentPage="landing"
            theme="light"
          />
        </div>
      </header>

      {/* MAIN BODY: Strictly Light Mode UI Layout from Attached Design */}
      <main id="top" className="flex-1 w-full">
        {/* HERO SECTION (Centered content, preview card removed per user request) */}
        <section className="sp-hero">
          <div className="sp-wrap">
            <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
              <h1 className="sp-h1">The ultimate POS built for retail, bars and supermarkets.</h1>
              <p className="sp-lead">
                Sales in seconds, instant M-Pesa, auto-eTIMS, and zero downtime when the network drops. Keep trading, keep winning.
              </p>
              <div className="sp-cta">
                <button
                  type="button"
                  className="sp-btn sp-btn-blue"
                  id="demo"
                  onClick={handleLaunchDemoSandbox}
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>Try the demo account</span>
                </button>
              </div>
              <p className="sp-fine">Live sandbox in 5 seconds · No credit card · Pre-loaded inventory</p>

              <div className="sp-stats">
                <div>
                  <b>KES <AnimatedMetricCounter target={25} />M+</b>
                  <span>Processed monthly</span>
                </div>
                <div>
                  <b>100%</b>
                  <span>Works offline</span>
                </div>
                <div>
                  <b>&lt; 18s</b>
                  <span>Average checkout</span>
                </div>
                <div>
                  <b>eTIMS</b>
                  <span>Digitax partner</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 1: PAYMENTS & eTIMS (#payments) */}
        <section className="sp-s" id="payments">
          <div className="sp-wrap">
            <h2 className="sp-t">Built around how Kenya pays and files.</h2>
            <p className="sp-sub">
              Take the payments your customers already use and stay compliant without extra paperwork.
            </p>
            <div className="sp-grid3">
              <div className="sp-card">
                <span className="sp-tag">M-Pesa</span>
                <h3>Test M-Pesa checkout</h3>
                <p>Accept mobile money at the till and match each payment to its sale.</p>
              </div>
              <div className="sp-card">
                <span className="sp-tag">eTIMS</span>
                <h3>Tax receipts, handled</h3>
                <p>Issue eTIMS-ready receipts through our Digitax partnership.</p>
              </div>
              <div className="sp-card">
                <span className="sp-tag">Offline</span>
                <h3>Keeps selling without internet</h3>
                <p>Sales are saved on the device and sync when you reconnect.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: INDUSTRY SOLUTIONS (#solutions) */}
        <section className="sp-s" id="solutions">
          <div className="sp-wrap">
            <h2 className="sp-t">One POS, set up for your kind of shop.</h2>
            <p className="sp-sub">Pick your business to see what changes at the till.</p>

            <div className="sp-tabs" role="tablist" id="ind">
              {Object.keys(INDUSTRY_DATA).map((indName) => (
                <button
                  key={indName}
                  type="button"
                  role="tab"
                  aria-selected={selectedIndustry === indName}
                  onClick={() => setSelectedIndustry(indName)}
                >
                  {indName}
                </button>
              ))}
            </div>

            <div className="sp-panel" id="indPanel">
              <div>
                <h3>{activeIndDetails[0]}</h3>
                <p style={{ color: 'var(--muted)', margin: 0 }}>{activeIndDetails[1]}</p>
              </div>
              <ul>
                <li>{activeIndDetails[2]}</li>
                <li>{activeIndDetails[3]}</li>
                <li>Works with M-Pesa and eTIMS</li>
              </ul>
            </div>
          </div>
        </section>

        {/* SECTION 3: HARDWARE FREEDOM (#hardware) */}
        <section className="sp-s" id="hardware">
          <div className="sp-wrap">
            <h2 className="sp-t">Use the hardware you already own.</h2>
            <p className="sp-sub">
              No locked-in terminals. Start on a phone or tablet and add peripherals as you grow.
            </p>
            <div className="sp-hw">
              <div className="sp-card">
                <h3>Barcode scanners</h3>
                <p>USB and Bluetooth scanners work as a keyboard.</p>
              </div>
              <div className="sp-card">
                <h3>Receipt printers</h3>
                <p>Thermal printers for 58mm and 80mm paper.</p>
              </div>
              <div className="sp-card">
                <h3>Phones &amp; tablets</h3>
                <p>Run the terminal in any modern browser.</p>
              </div>
              <div className="sp-card">
                <h3>Laptops &amp; desktops</h3>
                <p>Full keyboard shortcuts for busy counters.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: COMPARISON TABLE (#compare) */}
        <section className="sp-s" id="compare">
          <div className="sp-wrap">
            <h2 className="sp-t">Why shops switch from older desktop POS.</h2>
            <p className="sp-sub">A side-by-side look at what you get.</p>
            <div className="sp-scroll">
              <table className="sp-table">
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>SokoPoS</th>
                    <th>Legacy desktop POS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Runs on phone or tablet</td>
                    <td className="y">Yes</td>
                    <td className="n">Rarely</td>
                  </tr>
                  <tr>
                    <td>M-Pesa checkout</td>
                    <td className="y">Built in</td>
                    <td className="n">Add-on</td>
                  </tr>
                  <tr>
                    <td>eTIMS receipts</td>
                    <td className="y">Built in</td>
                    <td className="n">Varies</td>
                  </tr>
                  <tr>
                    <td>Offline selling</td>
                    <td className="y">Yes</td>
                    <td className="n">Local only</td>
                  </tr>
                  <tr>
                    <td>Live analytics from anywhere</td>
                    <td className="y">Yes</td>
                    <td className="n">At the shop</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECTION 5: FINAL CTA BANNER */}
        <section className="sp-s sp-final">
          <h2>Launch in 30 seconds.</h2>
          <p>Try the live terminal in your browser with pre-loaded stock, or register your shop with your Google account.</p>
          <div className="sp-cta">
            <button
              type="button"
              className="sp-btn sp-btn-blue"
              id="demo2"
              onClick={handleLaunchDemoSandbox}
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Try the demo account</span>
            </button>
          </div>
        </section>
      </main>

      {/* FLOATING ACTION BUTTON */}
      <WhatsAppFloatingButton
        phoneNumber="+254740463021"
        delayEntranceMs={2000}
        playEntranceSound={true}
      />

      {/* PRESERVED BENCHMARK FOOTER (Rendered in matching light mode) */}
      <AppFooter
        onBackToLogin={() => scrollToTop(true)}
        onNavigatePricing={navigateToPricing}
        onNavigatePartners={() => setIsAffiliateModalOpen(true)}
        onNavigateLegal={navigateToLegalPage}
        activePage="landing"
        idPrefix="landing-footer"
        theme="light"
      />

      {/* SIGN-IN MODAL DIALOG (Exact same card design, keyboard trapped, auto-focus, Esc / Backdrop / X dismissal) */}
      {isAuthModalOpen && typeof document !== 'undefined' && createPortal(
        <div
          id="auth-modal-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeAuthModal();
            }
          }}
          className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
        >
          <div
            ref={modalCardRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            id="auth-modal-card"
            style={{
              fontFamily: '"Bricolage Grotesque", system-ui, -apple-system, "Segoe UI", sans-serif',
            }}
            className="relative w-full max-w-[420px] bg-white rounded-3xl border border-[#d9e1e6] p-6 sm:p-7 shadow-2xl shadow-slate-950/25 my-auto animate-in zoom-in-95 fade-in duration-200"
          >
            {/* Dismissal X Button */}
            <button
              type="button"
              id="auth-modal-close-btn"
              onClick={closeAuthModal}
              aria-label="Close dialog"
              className="absolute top-4 right-4 p-2 rounded-xl text-[#4c5a6b] hover:text-[#0e1a2b] hover:bg-slate-100 transition cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {pendingVerificationEmail ? (
              <div id="p-verify-email" className="space-y-4 pt-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1565d8]">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h2
                    id="auth-modal-title"
                    className="text-xl sm:text-[22px] font-extrabold text-[#0e1a2b] tracking-tight mb-1 text-left"
                  >
                    {verificationContext === 'partner'
                      ? 'Verify your partner email address'
                      : 'Verify your email address'}
                  </h2>
                  <p className="text-xs sm:text-[13px] text-[#556375] leading-relaxed text-left">
                    {verificationContext === 'partner'
                      ? 'To prevent system abuse and ensure you receive your M-Pesa commission payouts safely, please click the verification link sent to '
                      : 'To protect your business and ensure this account belongs to a real owner, please click the verification link sent to '}
                    <span className="font-bold text-[#0e1a2b]">{pendingVerificationEmail}</span>.
                  </p>
                </div>

                {verificationFeedback && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-start gap-2">
                    <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    <span>{verificationFeedback}</span>
                  </div>
                )}

                {verificationError && (
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-[#c8231b] text-xs font-medium flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                    <span>{verificationError}</span>
                  </div>
                )}

                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleCheckVerification}
                    disabled={isCheckingVerification}
                    className="w-full h-11 bg-[#1565d8] hover:bg-[#1255b5] active:scale-[0.98] disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
                  >
                    {isCheckingVerification ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Checking verification...</span>
                      </>
                    ) : (
                      <span>I&apos;ve Verified My Email — Continue</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResendingVerification}
                    className="w-full h-10 bg-[#f4f7f6] hover:bg-[#e9eff2] disabled:opacity-60 text-[#0e1a2b] font-bold text-xs rounded-xl border border-[#d9e1e6] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isResendingVerification ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending link...</span>
                      </>
                    ) : (
                      <span>Resend Verification Email</span>
                    )}
                  </button>

                  <div className="pt-1 text-center">
                    <button
                      type="button"
                      onClick={handleCancelVerification}
                      className="text-xs font-bold text-[#556375] hover:text-[#0e1a2b] hover:underline cursor-pointer"
                    >
                      Use a different email account
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
            {/* Segmented Tab Switcher (Owner vs Partner vs Staff, matching attached design) */}
            {activeTab !== 'register' && (
              <div className="bg-[#f0f3f6] p-1 rounded-xl grid grid-cols-3 gap-1 mb-5" role="tablist" id="seg">
                <button
                  type="button"
                  role="tab"
                  id="tab-owner"
                  aria-selected={activeTab === 'owner'}
                  onClick={() => {
                    setActiveTab('owner');
                    setPinError(null);
                    setEmailAuthError(null);
                    setPartnerAuthError(null);
                  }}
                  className={`py-2 px-2 sm:px-3 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center ${
                    activeTab === 'owner'
                      ? 'bg-white text-[#0e1a2b] shadow-xs'
                      : 'bg-transparent text-[#4c5a6b] hover:text-[#0e1a2b]'
                  }`}
                >
                  Owner
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-partner"
                  aria-selected={activeTab === 'partner'}
                  onClick={() => {
                    setActiveTab('partner');
                    setPinError(null);
                    setEmailAuthError(null);
                    setPartnerAuthError(null);
                  }}
                  className={`py-2 px-2 sm:px-3 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    activeTab === 'partner'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'bg-transparent text-[#4c5a6b] hover:text-emerald-700'
                  }`}
                >
                  <span>Partner</span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                    20%
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-staff"
                  aria-selected={activeTab === 'staff'}
                  onClick={() => {
                    setActiveTab('staff');
                    setPinError(null);
                    setEmailAuthError(null);
                    setPartnerAuthError(null);
                  }}
                  className={`py-2 px-2 sm:px-3 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center ${
                    activeTab === 'staff'
                      ? 'bg-white text-[#0e1a2b] shadow-xs'
                      : 'bg-transparent text-[#4c5a6b] hover:text-[#0e1a2b]'
                  }`}
                >
                  Staff
                </button>
              </div>
            )}

            {/* TAB 1: OWNER LOGIN (Email & Password Sign-In Flow / Password Reset) */}
            {activeTab === 'owner' && (
              <div id="p-owner">
                {isForgotPasswordMode ? (
                  <div>
                    <h2
                      id="auth-modal-title"
                      className="text-xl sm:text-[22px] font-extrabold text-[#0e1a2b] tracking-tight mb-1 text-left"
                    >
                      Reset your password
                    </h2>
                    <p className="text-xs text-[#556375] mb-4 text-left">
                      Enter your account email address and we'll send password reset instructions.
                    </p>

                    <form onSubmit={handlePasswordResetSubmit} className="space-y-3 mb-4">
                      <div>
                        <label htmlFor="reset-email-input" className="block text-xs font-bold text-[#0e1a2b] mb-1">
                          Email address
                        </label>
                        <div className="relative flex items-center">
                          <input
                            ref={emailInputRef}
                            type="email"
                            id="reset-email-input"
                            placeholder="yourname@gmail.com"
                            aria-label="Account Email address for Password Reset"
                            autoComplete="email"
                            required
                            value={ownerEmailInput}
                            onChange={(e) => {
                              setOwnerEmailInput(e.target.value);
                              setEmailAuthError(null);
                              setResetEmailSuccessMessage(null);
                            }}
                            className="w-full h-11 pl-3.5 pr-9 rounded-xl border border-[#d9e1e6] bg-[#f4f7f6] text-[#0e1a2b] placeholder-[#8ca0b3] text-sm focus:bg-white focus:border-[#1565d8] focus:outline-none transition-colors"
                          />
                          <Mail className="w-4 h-4 text-[#8ca0b3] absolute right-3 pointer-events-none" />
                        </div>
                      </div>

                      {/* Error alert banner */}
                      {emailAuthError && (
                        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-[#c8231b] text-xs font-medium flex items-start gap-2 animate-in fade-in duration-150">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                          <span>{emailAuthError}</span>
                        </div>
                      )}

                      {/* Success alert banner */}
                      {resetEmailSuccessMessage && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-start gap-2 animate-in fade-in duration-150">
                          <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                          <span>{resetEmailSuccessMessage}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isSendingResetEmail}
                        className="w-full h-11 bg-[#1565d8] hover:bg-[#1255b5] active:scale-[0.98] disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 mt-2"
                      >
                        {isSendingResetEmail ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Sending instructions...</span>
                          </>
                        ) : (
                          <span>Send Password Reset Email</span>
                        )}
                      </button>

                      <div className="pt-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotPasswordMode(false);
                            setEmailAuthError(null);
                            setResetEmailSuccessMessage(null);
                          }}
                          className="text-xs font-bold text-[#1565d8] hover:underline cursor-pointer"
                        >
                          ← Back to Sign In
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div>
                    <h2
                      id="auth-modal-title"
                      className="text-xl sm:text-[22px] font-extrabold text-[#0e1a2b] tracking-tight mb-1 text-left"
                    >
                      Welcome back!
                    </h2>
                    <p className="text-xs text-[#556375] mb-4 text-left">
                      Sign in with your email and password to manage your shop.
                    </p>

                    {/* Email & Password Sign-In Form */}
                    <form id="emailForm" onSubmit={handleEmailFormSubmit} className="space-y-3.5 mb-4">
                      <div>
                        <label htmlFor="owner-email-input" className="block text-xs font-bold text-[#0e1a2b] mb-1">
                          Email address
                        </label>
                        <div className="relative flex items-center">
                          <input
                            ref={emailInputRef}
                            type="email"
                            id="owner-email-input"
                            placeholder="yourname@gmail.com"
                            aria-label="Email address"
                            autoComplete="email"
                            required
                            value={ownerEmailInput}
                            onChange={(e) => {
                              setOwnerEmailInput(e.target.value);
                              setEmailAuthError(null);
                            }}
                            className="w-full h-11 pl-3.5 pr-9 rounded-xl border border-[#d9e1e6] bg-[#f4f7f6] text-[#0e1a2b] placeholder-[#8ca0b3] text-sm focus:bg-white focus:border-[#1565d8] focus:outline-none transition-colors"
                          />
                          <Mail className="w-4 h-4 text-[#8ca0b3] absolute right-3 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label htmlFor="owner-password-input" className="block text-xs font-bold text-[#0e1a2b]">
                            Password
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setIsForgotPasswordMode(true);
                              setEmailAuthError(null);
                              setResetEmailSuccessMessage(null);
                            }}
                            className="text-[11px] font-bold text-[#1565d8] hover:underline cursor-pointer"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <div className="relative flex items-center">
                          <input
                            type={showOwnerPassword ? 'text' : 'password'}
                            id="owner-password-input"
                            placeholder="••••••••"
                            aria-label="Password"
                            autoComplete="current-password"
                            required
                            value={ownerPasswordInput}
                            onChange={(e) => {
                              setOwnerPasswordInput(e.target.value);
                              setEmailAuthError(null);
                            }}
                            className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-[#d9e1e6] bg-[#f4f7f6] text-[#0e1a2b] placeholder-[#8ca0b3] text-sm focus:bg-white focus:border-[#1565d8] focus:outline-none transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOwnerPassword((prev) => !prev)}
                            aria-label={showOwnerPassword ? 'Hide password' : 'Show password'}
                            className="absolute right-2.5 p-1 text-[#556375] hover:text-[#0e1a2b] transition cursor-pointer"
                          >
                            {showOwnerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Error alert banner */}
                      {emailAuthError && (
                        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-[#c8231b] text-xs font-medium flex items-start gap-2 animate-in fade-in duration-150">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                          <span>{emailAuthError}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isAuthenticatingEmail}
                        className="w-full h-11 bg-[#1565d8] hover:bg-[#1255b5] active:scale-[0.98] disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 mt-1"
                      >
                        {isAuthenticatingEmail ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Signing in...</span>
                          </>
                        ) : (
                          <span>Sign in with Email &amp; Password</span>
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PARTNER PORTAL LOGIN / JOIN */}
            {activeTab === 'partner' && (
              <div id="p-partner">
                <div className="flex items-center justify-between mb-1">
                  <h2
                    id="auth-modal-title"
                    className="text-xl sm:text-[22px] font-extrabold text-[#0e1a2b] tracking-tight text-left"
                  >
                    {partnerMode === 'register' ? 'Join as Partner' : 'Partner Sign In'}
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Gift className="w-3 h-3 text-emerald-600" />
                    <span>20% Recurring</span>
                  </span>
                </div>
                <p className="text-xs text-[#556375] mb-4 text-left">
                  {partnerMode === 'register'
                    ? 'Earn 20% recurring monthly commission on every store you refer to SokoPoS.'
                    : 'Sign in to access your referral link, commission ledger, and M-Pesa payouts.'}
                </p>

                {/* Sub-toggle: Sign In vs Become Partner */}
                <div className="bg-[#f4f7f6] p-1 rounded-xl grid grid-cols-2 gap-1 mb-4 border border-[#e2e8f0]">
                  <button
                    type="button"
                    onClick={() => {
                      setPartnerMode('signin');
                      setPartnerAuthError(null);
                    }}
                    className={`py-1.5 px-3 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center ${
                      partnerMode === 'signin'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPartnerMode('register');
                      setPartnerAuthError(null);
                    }}
                    className={`py-1.5 px-3 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center ${
                      partnerMode === 'register'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-500 hover:text-emerald-700'
                    }`}
                  >
                    Become Partner
                  </button>
                </div>

                <form id="partnerForm" onSubmit={handlePartnerFormSubmit} className="space-y-3.5 mb-4">
                  {partnerMode === 'register' && (
                    <div>
                      <label htmlFor="partner-name-input" className="block text-xs font-bold text-[#0e1a2b] mb-1">
                        Full Name / Agency Name
                      </label>
                      <input
                        type="text"
                        id="partner-name-input"
                        placeholder="e.g. Wanjiku Kamau"
                        required
                        value={partnerNameInput}
                        onChange={(e) => {
                          setPartnerNameInput(e.target.value);
                          setPartnerAuthError(null);
                        }}
                        className="w-full h-11 px-3.5 rounded-xl border border-[#d9e1e6] bg-[#f4f7f6] text-[#0e1a2b] placeholder-[#8ca0b3] text-sm focus:bg-white focus:border-emerald-600 focus:outline-none transition-colors"
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="partner-email-input" className="block text-xs font-bold text-[#0e1a2b] mb-1">
                      Email address
                    </label>
                    <div className="relative flex items-center">
                      <input
                        ref={partnerEmailInputRef}
                        type="email"
                        id="partner-email-input"
                        placeholder="yourname@gmail.com"
                        aria-label="Partner email address"
                        autoComplete="email"
                        required
                        value={partnerEmailInput}
                        onChange={(e) => {
                          setPartnerEmailInput(e.target.value);
                          setPartnerAuthError(null);
                        }}
                        className="w-full h-11 pl-3.5 pr-9 rounded-xl border border-[#d9e1e6] bg-[#f4f7f6] text-[#0e1a2b] placeholder-[#8ca0b3] text-sm focus:bg-white focus:border-emerald-600 focus:outline-none transition-colors"
                      />
                      <Mail className="w-4 h-4 text-[#8ca0b3] absolute right-3 pointer-events-none" />
                    </div>
                  </div>

                  {partnerMode === 'register' && (
                    <div>
                      <label htmlFor="partner-phone-input" className="block text-xs font-bold text-[#0e1a2b] mb-1">
                        M-Pesa Payout Number
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="tel"
                          id="partner-phone-input"
                          placeholder="0712 345 678"
                          required
                          value={partnerPhoneInput}
                          onChange={(e) => {
                            setPartnerPhoneInput(e.target.value);
                            setPartnerAuthError(null);
                          }}
                          className="w-full h-11 pl-3.5 pr-9 font-mono rounded-xl border border-[#d9e1e6] bg-[#f4f7f6] text-[#0e1a2b] placeholder-[#8ca0b3] text-sm focus:bg-white focus:border-emerald-600 focus:outline-none transition-colors"
                        />
                        <Phone className="w-4 h-4 text-[#8ca0b3] absolute right-3 pointer-events-none" />
                      </div>
                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                        Commission payouts are disbursed directly via Safaricom M-Pesa.
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="partner-password-input" className="block text-xs font-bold text-[#0e1a2b]">
                        Password
                      </label>
                      {partnerMode === 'signin' && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('owner');
                            setIsForgotPasswordMode(true);
                            setOwnerEmailInput(partnerEmailInput);
                          }}
                          className="text-[11px] font-bold text-[#1565d8] hover:underline cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type={showPartnerPassword ? 'text' : 'password'}
                        id="partner-password-input"
                        placeholder="••••••••"
                        aria-label="Partner password"
                        autoComplete={partnerMode === 'register' ? 'new-password' : 'current-password'}
                        required
                        value={partnerPasswordInput}
                        onChange={(e) => {
                          setPartnerPasswordInput(e.target.value);
                          setPartnerAuthError(null);
                        }}
                        className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-[#d9e1e6] bg-[#f4f7f6] text-[#0e1a2b] placeholder-[#8ca0b3] text-sm focus:bg-white focus:border-emerald-600 focus:outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPartnerPassword((prev) => !prev)}
                        aria-label={showPartnerPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 p-1 text-[#556375] hover:text-[#0e1a2b] transition cursor-pointer"
                      >
                        {showPartnerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {partnerMode === 'register' && (
                    <div>
                      <label htmlFor="partner-code-input" className="block text-xs font-bold text-[#0e1a2b] mb-1">
                        Preferred Referral Code <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        id="partner-code-input"
                        placeholder="e.g. SOKOHUB or MOMBASA"
                        maxLength={12}
                        value={partnerCodeInput}
                        onChange={(e) => {
                          setPartnerCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                        }}
                        className="w-full h-11 px-3.5 font-mono uppercase rounded-xl border border-[#d9e1e6] bg-[#f4f7f6] text-[#0e1a2b] placeholder-[#8ca0b3] text-sm focus:bg-white focus:border-emerald-600 focus:outline-none transition-colors"
                      />
                    </div>
                  )}

                  {/* Error alert banner */}
                  {partnerAuthError && (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-[#c8231b] text-xs font-medium flex items-start gap-2 animate-in fade-in duration-150">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                      <span>{partnerAuthError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isAuthenticatingPartner}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 mt-1"
                  >
                    {isAuthenticatingPartner ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{partnerMode === 'register' ? 'Creating account...' : 'Signing in...'}</span>
                      </>
                    ) : (
                      <span>
                        {partnerMode === 'register'
                          ? 'Create Partner Account & Get Link'
                          : 'Sign In to Partner Portal'}
                      </span>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: STAFF SHIFT / PIN LOGIN (Matches attached card design image_78146b8a.png with credentials input and business ID scoping) */}
            {activeTab === 'staff' && (
              <div id="p-staff" className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2
                    id="auth-modal-title"
                    className="text-xl sm:text-[22px] font-extrabold text-[#0e1a2b] tracking-tight text-left"
                  >
                    Start your shift
                  </h2>
                </div>

                {/* STAFF ID / USERNAME INPUT OR APPOINTED DEMO CASHIER CARD */}
                {isDemoModeActive && !isEditingStaffId ? (
                  <div
                    className="border-2 border-[#1565d8] bg-white rounded-2xl p-3 flex items-center justify-between shadow-2xs transition-all hover:shadow-xs"
                    id="selectedStaffCard"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-full bg-[#1565d8] text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-2xs"
                        aria-hidden="true"
                      >
                        {matchedStaff?.initials ||
                          (matchedStaff?.name
                            ? matchedStaff.name
                                .split(' ')
                                .map((n: string) => n[0])
                                .join('')
                                .substring(0, 2)
                                .toUpperCase()
                            : 'CA')}
                      </div>
                      <div className="min-w-0">
                        <div className="text-base font-extrabold text-[#0e1a2b] truncate leading-tight">
                          {matchedStaff?.name || 'Cashier A'}
                        </div>
                        <div className="text-xs text-[#556375] font-semibold truncate flex items-center gap-1.5 mt-0.5">
                          <span>{matchedStaff?.code || staffCredentialInput || '#7000'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsEditingStaffId(true)}
                      className="text-xs text-[#1565d8] hover:text-[#1255b5] font-bold px-2 py-1 rounded-lg hover:bg-blue-50 transition cursor-pointer shrink-0"
                    >
                      Change ID
                    </button>
                  </div>
                ) : (
                  <div className="border border-[#d9e1e6] bg-[#f8fafc] rounded-2xl p-3 space-y-1.5 shadow-2xs">
                    <label htmlFor="staff-credential-input" className="block text-xs font-bold text-[#0e1a2b]">
                      Staff ID or Username
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        ref={staffInputRef}
                        type="text"
                        id="staff-credential-input"
                        name="staffCredential"
                        autoComplete="username"
                        value={staffCredentialInput}
                        onChange={(e) => {
                          setStaffCredentialInput(e.target.value);
                          setPinError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (isDemoModeActive) {
                              setIsEditingStaffId(false);
                            }
                            pinInputRef.current?.focus();
                          }
                        }}
                        placeholder="Enter Staff ID or username (e.g. #1001, cashier.a)"
                        className="flex-1 h-10 px-3.5 rounded-xl border border-[#d9e1e6] bg-white text-[#0e1a2b] font-bold text-sm focus:border-[#1565d8] focus:outline-none transition-colors"
                      />
                      {isDemoModeActive && (
                        <button
                          type="button"
                          onClick={() => setIsEditingStaffId(false)}
                          className="h-10 px-3.5 bg-[#1565d8] hover:bg-[#1255b5] text-white rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
                        >
                          Done
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* PIN SECTION */}
                <div className="pt-1 text-center">
                  <label htmlFor="staff-pin-entry-input" className="block text-sm font-bold text-[#0e1a2b] mb-1.5">
                    Enter your 4-digit PIN
                  </label>

                  {/* Standard Obscured PIN Input Field per secure-entry practice */}
                  <div className="relative max-w-[200px] mx-auto mb-2">
                    <input
                      ref={pinInputRef}
                      type="password"
                      id="staff-pin-entry-input"
                      name="staffPin"
                      maxLength={4}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="current-password"
                      value={enteredPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                        setEnteredPin(val);
                        setPinError(null);
                        if (val.length === 4) {
                          setTimeout(() => submitStaffLogin(val), 100);
                        }
                      }}
                      placeholder="••••"
                      aria-label="4-digit secure PIN"
                      className="w-full h-11 text-center font-mono text-2xl tracking-[0.4em] rounded-xl border border-[#d9e1e6] bg-[#f8fafc] text-[#0e1a2b] font-black focus:bg-white focus:border-[#1565d8] focus:outline-none transition-colors shadow-2xs select-none"
                    />
                  </div>

                  {/* 4 PIN Dots (Visual feedback matching image_78146b8a.png) */}
                  <div className="flex justify-center gap-3.5 my-2" id="dots">
                    {[0, 1, 2, 3].map((idx) => {
                      const isFilled = idx < enteredPin.length;
                      return (
                        <span
                          key={idx}
                          className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                            isFilled
                              ? 'bg-[#1565d8] border-[#1565d8] scale-110 shadow-2xs'
                              : 'bg-[#f4f7f6] border-[#cbd5e1]'
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* PIN error alert */}
                  <div className="min-h-[20px] text-center text-xs text-[#c8231b] font-semibold" id="perr" role="alert">
                    {pinError}
                  </div>
                </div>

                {/* Numeric Keypad (Exact 3x4 layout matching image_78146b8a.png) */}
                <div className="grid grid-cols-3 gap-2.5 my-1" id="pad">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', '⌫'].map((k) => (
                    <button
                      key={k}
                      type="button"
                      className="h-13 sm:h-14 rounded-2xl border border-[#d9e1e6] bg-[#f8fafc] hover:bg-[#edf2f7] active:bg-[#1565d8] active:text-white text-[#0e1a2b] font-bold text-lg sm:text-xl transition-all cursor-pointer shadow-2xs flex items-center justify-center select-none"
                      onClick={() => handleKeypadPress(k)}
                    >
                      {k === '⌫' ? (
                        <Delete className="w-5 h-5 text-[#0e1a2b]" />
                      ) : k === 'Clear' ? (
                        <span className="text-xs sm:text-sm font-bold text-[#4c5a6b]">{k}</span>
                      ) : (
                        <span>{k}</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Status / Demo hint footer */}
                <div className="pt-2 flex items-center justify-between text-xs text-[#556375]">
                  {isDemoModeActive ? (
                    <button
                      type="button"
                      className="text-[#1565d8] hover:underline font-bold cursor-pointer"
                      id="fillPin"
                      onClick={handleFillDemoPin}
                    >
                      Demo PIN: 1234
                    </button>
                  ) : (
                    <span className="text-xs text-[#556375] font-semibold">Secure terminal login</span>
                  )}
                  <span className="text-[11px] text-[#718096]">
                    {isSubmittingTerminal ? 'Authenticating shift...' : 'Auto-submits on 4 digits'}
                  </span>
                </div>
              </div>
            )}

            {/* TAB 3: REGISTER NEW SHOP */}
            {activeTab === 'register' && (
              <div id="p-register">
                <h2
                  id="auth-modal-title"
                  className="text-xl sm:text-[22px] font-extrabold text-[#0e1a2b] tracking-tight mb-3 text-left"
                >
                  Add a new shop
                </h2>
                <form id="regForm" onSubmit={handleRegisterFormSubmit} className="space-y-3 mb-4">
                  <div>
                    <label className="block text-xs font-bold text-[#0e1a2b] mb-1" htmlFor="shop">
                      Shop or business name
                    </label>
                    <input
                      ref={shopNameInputRef}
                      type="text"
                      id="shop"
                      placeholder="e.g. Mombasa Coastal Grocers"
                      required
                      value={shopNameInput}
                      onChange={(e) => {
                        setShopNameInput(e.target.value);
                        setEmailAuthError(null);
                      }}
                      className="w-full h-11 px-3.5 rounded-xl border border-[#d9e1e6] bg-[#f4f7f6] text-[#0e1a2b] placeholder-[#8ca0b3] text-sm focus:bg-white focus:border-[#1565d8] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#0e1a2b] mb-1" htmlFor="own">
                      Owner email address
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="email"
                        id="own"
                        placeholder="you@gmail.com"
                        required
                        value={shopEmailInput}
                        onChange={(e) => {
                          setShopEmailInput(e.target.value);
                          setEmailAuthError(null);
                        }}
                        className="w-full h-11 pl-3.5 pr-9 rounded-xl border border-[#d9e1e6] bg-[#f4f7f6] text-[#0e1a2b] placeholder-[#8ca0b3] text-sm focus:bg-white focus:border-[#1565d8] focus:outline-none transition-colors"
                      />
                      <Mail className="w-4 h-4 text-[#8ca0b3] absolute right-3 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#0e1a2b] mb-1" htmlFor="shop-pass">
                      Create password
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type={showShopPassword ? 'text' : 'password'}
                        id="shop-pass"
                        placeholder="At least 6 characters"
                        required
                        minLength={6}
                        value={shopPasswordInput}
                        onChange={(e) => {
                          setShopPasswordInput(e.target.value);
                          setEmailAuthError(null);
                        }}
                        className="w-full h-11 pl-3.5 pr-10 rounded-xl border border-[#d9e1e6] bg-[#f4f7f6] text-[#0e1a2b] placeholder-[#8ca0b3] text-sm focus:bg-white focus:border-[#1565d8] focus:outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowShopPassword((prev) => !prev)}
                        aria-label={showShopPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 p-1 text-[#556375] hover:text-[#0e1a2b] transition cursor-pointer"
                      >
                        {showShopPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Error alert banner */}
                  {emailAuthError && (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-[#c8231b] text-xs font-medium flex items-start gap-2 animate-in fade-in duration-150">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                      <span>{emailAuthError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isAuthenticatingEmail}
                    className="w-full h-12 bg-[#1565d8] hover:bg-[#1255b5] active:scale-[0.99] disabled:opacity-60 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs mt-1"
                  >
                    {isAuthenticatingEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating account...</span>
                      </>
                    ) : (
                      <span>Create shop with Email &amp; Password</span>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Below Card Switcher: Dashed divider, question & action button */}
            <div className="border-t border-dashed border-[#d9e1e6] pt-4 text-center" id="below">
              <p className="text-xs sm:text-[13px] text-[#4c5a6b] font-medium mb-2.5" id="belowText">
                {activeTab === 'register'
                  ? 'Already have a registered shop or partner account?'
                  : activeTab === 'partner'
                  ? 'Want to open and manage a physical retail store?'
                  : 'Need to register a new location?'}
              </p>
              <button
                type="button"
                id="belowBtn"
                onClick={() => {
                  if (activeTab === 'register') {
                    setActiveTab('owner');
                  } else if (activeTab === 'partner') {
                    setActiveTab('register');
                  } else {
                    setActiveTab('register');
                  }
                  setPinError(null);
                  setEmailAuthError(null);
                  setPartnerAuthError(null);
                }}
                className={`w-full h-11 rounded-xl font-bold text-sm sm:text-[15px] flex items-center justify-center transition-all cursor-pointer ${
                  activeTab === 'register'
                    ? 'bg-transparent text-[#0e1a2b] border border-[#d9e1e6] hover:bg-slate-50'
                    : 'bg-[#c8231b] hover:bg-[#b01e17] active:scale-[0.99] text-white shadow-xs'
                }`}
              >
                {activeTab === 'register'
                  ? 'Return to login'
                  : activeTab === 'partner'
                  ? 'Add new shop'
                  : 'Add new shop'}
              </button>
            </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* PUBLIC & OWNER AFFILIATE / PARTNER PORTAL */}
      <AffiliatePortalModal
        isOpen={isAffiliateModalOpen}
        onClose={() => setIsAffiliateModalOpen(false)}
        onRequestAuth={(targetTab = 'partner') => {
          setIsAffiliateModalOpen(false);
          openAuthModal(targetTab);
        }}
        onSwitchToPos={() => {
          setIsAffiliateModalOpen(false);
          onLoginSuccess?.();
        }}
        onOpenStoreRegistration={() => {
          setIsAffiliateModalOpen(false);
          openAuthModal('register');
        }}
      />
    </div>
  );
};

