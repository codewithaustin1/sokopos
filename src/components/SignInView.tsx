import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  Zap,
  Check,
  X,
  Delete,
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  Phone,
  ShieldCheck,
  Smartphone,
  CreditCard,
  Printer,
  WifiOff,
  Building2,
  Store,
  KeyRound,
} from 'lucide-react';
import { DEFAULT_PRICING_TIERS } from '../types/pricing';
import { usePos } from '../context/PosContext';
import { Cashier } from '../types';
import { soundFx } from '../utils/audio';
import { LegalTab } from '../data/legalContent';
import { LegalPageView } from './LegalPageView';
import { WhatsAppFloatingButton } from './landing/WhatsAppFloatingButton';
import { PublicSiteHeader } from './common/PublicSiteHeader';
import { AppLogo } from './common/AppLogo';
import { AppFooter } from './common/AppFooter';
import { InteractiveGradientMesh } from './common/InteractiveGradientMesh';
import { scrollToTop } from '../utils/scrollUtils';
import {
  getLegalTabFromPath,
  normalizePathname,
  resolveLegacyHashToPath,
} from '../utils/seoConfig';
import { AffiliatePortalModal } from './AffiliatePortalModal';
import {
  enrollAffiliate,
  fetchAffiliateDashboard,
  fetchEmailOtpCapabilities,
  EmailOtpCapabilities,
  requestLoginOtp,
  verifyLoginOtp,
  confirmPasswordResetWithToken,
} from '../lib/affiliateService';
import { auth } from '../lib/firebase';
import { trackPlatformEvent } from '../lib/telemetryService';
import { SolutionsGallery } from './landing/SolutionsGallery';
import { HeroCounterPreview } from './landing/KenyanCounterSimulators';
import { LifecycleShowcase } from './landing/LifecycleShowcase';

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

export const SignInView: React.FC<SignInViewProps> = ({ onLoginSuccess }) => {
  const {
    currentUser,
    loginWithFirebaseEmailPassword,
    loginWithFirebaseEmailOtp,
    sendPasswordResetEmailAction,
    pendingVerificationEmail,
    resendVerificationEmail,
    checkEmailVerificationStatus,
    cancelEmailVerification,
    loginWithCredentials,
    allSystemUsers,
    businesses,
    showToast,
    openPricingPage,
    closePricingPage,
    pendingCheckoutIntent,
    setPendingCheckoutIntent,
    clearPendingCheckoutIntent,
    selectCheckoutPackage,
    checkoutAuthRequested,
    setCheckoutAuthRequested,
    appointedDemoCashier,
    pricingTiers,
    isAffiliateModalOpen,
    setIsAffiliateModalOpen,
    isAuthTransitioning,
  } = usePos();

  const [activeTab, setActiveTab] = useState<'owner' | 'partner' | 'staff' | 'register'>('owner');
  const [activeLegalPage, setActiveLegalPage] = useState<LegalTab | null>(() => {
    if (typeof window !== 'undefined') {
      return getLegalTabFromPath(window.location.pathname);
    }
    return null;
  });
  const [isDemoModeActive, setIsDemoModeActive] = useState<boolean>(false);

  // Staff credentials / ID and PIN login state
  const [staffCredentialInput, setStaffCredentialInput] = useState<string>('');
  const [isEditingStaffId, setIsEditingStaffId] = useState<boolean>(false);
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [showStaffPin, setShowStaffPin] = useState<boolean>(false);
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

  // Direct email & password vs passwordless OTP login state
  const [ownerLoginMethod, setOwnerLoginMethod] = useState<'password' | 'otp'>('password');
  const [ownerEmailInput, setOwnerEmailInput] = useState<string>('');
  const [ownerPasswordInput, setOwnerPasswordInput] = useState<string>('');
  const [showOwnerPassword, setShowOwnerPassword] = useState<boolean>(false);
  const [emailAuthError, setEmailAuthError] = useState<string | null>(null);
  const [isAuthenticatingEmail, setIsAuthenticatingEmail] = useState<boolean>(false);

  // Password reset state (Email-based Resend OTP -> Reset Token -> New Password)
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState<boolean>(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'email' | 'otp' | 'new_password' | 'done'>('email');
  const [resetEmailSuccessMessage, setResetEmailSuccessMessage] = useState<string | null>(null);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState<boolean>(false);
  const [resetOtpCode, setResetOtpCode] = useState<string>('');
  const [resetOtpError, setResetOtpError] = useState<string | null>(null);
  const [resetOtpRemainingAttempts, setResetOtpRemainingAttempts] = useState<number | null>(null);
  const [resetOtpExpirySeconds, setResetOtpExpirySeconds] = useState<number>(600);
  const [resetOtpResendCooldownSec, setResetOtpResendCooldownSec] = useState<number>(0);
  const [isVerifyingResetOtp, setIsVerifyingResetOtp] = useState<boolean>(false);
  const [verifiedResetToken, setVerifiedResetToken] = useState<string | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState<string>('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState<string>('');
  const [showResetNewPassword, setShowResetNewPassword] = useState<boolean>(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState<boolean>(false);
  const [isConfirmingPasswordReset, setIsConfirmingPasswordReset] = useState<boolean>(false);

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

  // 6-Digit Passwordless Email OTP State (Resend + Firebase Custom Token)
  const [pendingOtpEmail, setPendingOtpEmail] = useState<string | null>(null);
  const [loginOtpCode, setLoginOtpCode] = useState<string>('');
  const [isVerifyingLoginOtp, setIsVerifyingLoginOtp] = useState<boolean>(false);
  const [loginOtpError, setLoginOtpError] = useState<string | null>(null);
  const [isSendingLoginOtp, setIsSendingLoginOtp] = useState<boolean>(false);
  const [otpResendCooldownSec, setOtpResendCooldownSec] = useState<number>(0);
  const [otpExpirySeconds, setOtpExpirySeconds] = useState<number>(600);
  const [otpRemainingAttempts, setOtpRemainingAttempts] = useState<number | null>(null);
  const [otpCapabilities, setOtpCapabilities] = useState<EmailOtpCapabilities | null>(null);

  useEffect(() => {
    if (!pendingOtpEmail && !(isForgotPasswordMode && forgotPasswordStep === 'otp')) return;
    const timer = window.setInterval(() => {
      if (pendingOtpEmail) {
        setOtpResendCooldownSec((prev) => (prev > 0 ? prev - 1 : 0));
        setOtpExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }
      if (isForgotPasswordMode && forgotPasswordStep === 'otp') {
        setResetOtpResendCooldownSec((prev) => (prev > 0 ? prev - 1 : 0));
        setResetOtpExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [pendingOtpEmail, isForgotPasswordMode, forgotPasswordStep]);

  const formatCountdownClock = (totalSeconds: number) => {
    const mins = Math.floor(Math.max(0, totalSeconds) / 60);
    const secs = Math.max(0, totalSeconds) % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const handleSendPasswordlessOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = ownerEmailInput.trim().toLowerCase();
    setEmailAuthError(null);
    setLoginOtpError(null);

    if (!email) {
      setEmailAuthError('Please enter your email address.');
      return;
    }

    trackPlatformEvent('signin_start', {
      channel: pendingCheckoutIntent && pendingCheckoutIntent.planId !== 'free' ? 'checkout_email_otp' : 'email_otp',
      planId: pendingCheckoutIntent?.planId,
      dedupeKey: 'signin-start',
      dedupeTtlMs: 15_000,
    });

    setIsSendingLoginOtp(true);
    try {
      const res = await requestLoginOtp(email, 'passwordless_login');
      if (res.success) {
        setPendingOtpEmail(email);
        setLoginOtpCode('');
        setLoginOtpError(null);
        setOtpRemainingAttempts(null);
        setOtpResendCooldownSec(res.resendCooldownSeconds || 60);
        setOtpExpirySeconds(res.expiresInSeconds || 600);
        showToast(`6-digit verification code sent to ${email}.`, 'info');
      } else {
        if (typeof res.retryAfterSeconds === 'number' && res.retryAfterSeconds > 0) {
          setOtpResendCooldownSec(res.retryAfterSeconds);
        }
        setEmailAuthError(res.error || 'Could not send 6-digit verification code.');
        soundFx.playError();
      }
    } catch (err: any) {
      setEmailAuthError(err?.message || 'Failed to send verification code.');
      soundFx.playError();
    } finally {
      setIsSendingLoginOtp(false);
    }
  };

  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingOtpEmail) return;
    const cleanOtp = loginOtpCode.replace(/\D/g, '').trim();
    if (cleanOtp.length !== 6) {
      setLoginOtpError('Please enter the full 6-digit verification code sent to your email.');
      return;
    }

    setIsVerifyingLoginOtp(true);
    setLoginOtpError(null);
    try {
      const res = await verifyLoginOtp(pendingOtpEmail, cleanOtp, 'passwordless_login');
      if (!res.success) {
        if (typeof res.remainingAttempts === 'number') {
          setOtpRemainingAttempts(res.remainingAttempts);
        }
        setLoginOtpError(res.error || 'Incorrect 6-digit verification code. Please try again.');
        soundFx.playError();
        return;
      }

      if (!res.customToken) {
        setLoginOtpError('Your code checked out, but we could not finish opening your shop. Please request a fresh code.');
        soundFx.playError();
        return;
      }

      const sessionRes = await loginWithFirebaseEmailOtp(res.customToken);
      if (sessionRes.success) {
        setPendingOtpEmail(null);
        setLoginOtpCode('');
        setLoginOtpError(null);
        setOtpRemainingAttempts(null);
        setIsAuthModalOpen(false);
        onLoginSuccess?.();
      } else {
        setLoginOtpError(sessionRes.error || 'Could not start your shop session. Please try again.');
        soundFx.playError();
      }
    } catch (err: any) {
      setLoginOtpError(err?.message || 'Verification failed. Please check the code and try again.');
      soundFx.playError();
    } finally {
      setIsVerifyingLoginOtp(false);
    }
  };

  const handleResendLoginOtp = async () => {
    if (!pendingOtpEmail || otpResendCooldownSec > 0) return;
    setIsSendingLoginOtp(true);
    setLoginOtpError(null);
    try {
      const res = await requestLoginOtp(pendingOtpEmail, 'passwordless_login');
      if (res.success) {
        setLoginOtpCode('');
        setOtpRemainingAttempts(null);
        setOtpResendCooldownSec(res.resendCooldownSeconds || 60);
        setOtpExpirySeconds(res.expiresInSeconds || 600);
        showToast(`New 6-digit code sent to ${pendingOtpEmail}.`, 'info');
      } else {
        if (typeof res.retryAfterSeconds === 'number' && res.retryAfterSeconds > 0) {
          setOtpResendCooldownSec(res.retryAfterSeconds);
        }
        setLoginOtpError(res.error || 'Could not resend your login code. Please try again.');
      }
    } catch (err: any) {
      setLoginOtpError(err?.message || 'Could not resend your login code.');
    } finally {
      setIsSendingLoginOtp(false);
    }
  };

  useEffect(() => {
    if (pendingVerificationEmail) {
      setIsAuthModalOpen(true);
    }
  }, [pendingVerificationEmail]);

  // Scroll reveal IntersectionObserver effect for landing sections
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.04, rootMargin: '0px 0px -20px 0px' }
    );

    const elements = document.querySelectorAll('.sp-reveal');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

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
        setVerificationError(res.error || 'We have not seen that link clicked yet. Check your inbox or spam folder and try again.');
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

  const resetForgotPasswordFlowState = () => {
    setForgotPasswordStep('email');
    setResetEmailSuccessMessage(null);
    setEmailAuthError(null);
    setResetOtpCode('');
    setResetOtpError(null);
    setResetOtpRemainingAttempts(null);
    setResetOtpExpirySeconds(600);
    setResetOtpResendCooldownSec(0);
    setVerifiedResetToken(null);
    setResetNewPassword('');
    setResetConfirmPassword('');
    setShowResetNewPassword(false);
    setShowResetConfirmPassword(false);
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = ownerEmailInput.trim().toLowerCase();
    setEmailAuthError(null);
    setResetOtpError(null);
    setResetEmailSuccessMessage(null);

    if (!email) {
      setEmailAuthError('Please enter your account email address.');
      return;
    }

    setIsSendingResetEmail(true);
    try {
      const res = await requestLoginOtp(email, 'password_reset');
      if (res.success) {
        setOwnerEmailInput(email);
        setResetOtpCode('');
        setResetOtpError(null);
        setResetOtpRemainingAttempts(null);
        setVerifiedResetToken(null);
        setResetOtpResendCooldownSec(res.resendCooldownSeconds || 60);
        setResetOtpExpirySeconds(res.expiresInSeconds || 600);
        setForgotPasswordStep('otp');
        soundFx.playSuccess();
        showToast(`6-digit reset code dispatched to ${email}.`, 'info');
      } else {
        if (typeof res.retryAfterSeconds === 'number' && res.retryAfterSeconds > 0) {
          setResetOtpResendCooldownSec(res.retryAfterSeconds);
        }
        setEmailAuthError(res.error || 'Failed to send 6-digit password reset code.');
        soundFx.playError();
      }
    } catch (err: any) {
      setEmailAuthError(err?.message || 'Failed to send password reset code.');
      soundFx.playError();
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  const handleVerifyResetOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = ownerEmailInput.trim().toLowerCase();
    const cleanOtp = resetOtpCode.replace(/\D/g, '').trim();
    if (!email) {
      setForgotPasswordStep('email');
      return;
    }
    if (cleanOtp.length !== 6) {
      setResetOtpError('Please enter the full 6-digit verification code sent to your email.');
      return;
    }

    setIsVerifyingResetOtp(true);
    setResetOtpError(null);
    try {
      const res = await verifyLoginOtp(email, cleanOtp, 'password_reset');
      if (!res.success || !res.verified || !res.resetToken) {
        if (typeof res.remainingAttempts === 'number') {
          setResetOtpRemainingAttempts(res.remainingAttempts);
        }
        setResetOtpError(res.error || 'Incorrect 6-digit reset code. Please check your inbox and try again.');
        soundFx.playError();
        return;
      }

      setVerifiedResetToken(res.resetToken);
      setResetOtpError(null);
      setResetOtpRemainingAttempts(null);
      setResetNewPassword('');
      setResetConfirmPassword('');
      setForgotPasswordStep('new_password');
      soundFx.playSuccess();
    } catch (err: any) {
      setResetOtpError(err?.message || 'Verification failed. Please check the code and try again.');
      soundFx.playError();
    } finally {
      setIsVerifyingResetOtp(false);
    }
  };

  const handleResendResetOtp = async () => {
    const email = ownerEmailInput.trim().toLowerCase();
    if (!email || resetOtpResendCooldownSec > 0) return;
    setIsSendingResetEmail(true);
    setResetOtpError(null);
    try {
      const res = await requestLoginOtp(email, 'password_reset');
      if (res.success) {
        setResetOtpCode('');
        setResetOtpRemainingAttempts(null);
        setResetOtpResendCooldownSec(res.resendCooldownSeconds || 60);
        setResetOtpExpirySeconds(res.expiresInSeconds || 600);
        soundFx.playSuccess();
        showToast(`New 6-digit reset code sent to ${email}.`, 'info');
      } else {
        if (typeof res.retryAfterSeconds === 'number' && res.retryAfterSeconds > 0) {
          setResetOtpResendCooldownSec(res.retryAfterSeconds);
        }
        setResetOtpError(res.error || 'Could not resend verification code. Please try again.');
        soundFx.playError();
      }
    } catch (err: any) {
      setResetOtpError(err?.message || 'Could not resend verification code.');
      soundFx.playError();
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  const handleConfirmNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = ownerEmailInput.trim().toLowerCase();
    setEmailAuthError(null);

    if (!verifiedResetToken) {
      setEmailAuthError('Your verification session expired. Please verify a fresh 6-digit code.');
      setForgotPasswordStep('email');
      return;
    }

    if (resetNewPassword.trim().length < 8 || resetNewPassword.length > 128) {
      setEmailAuthError('Password must be between 8 and 128 characters long.');
      soundFx.playError();
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setEmailAuthError('Passwords do not match. Please re-enter the same password.');
      soundFx.playError();
      return;
    }

    setIsConfirmingPasswordReset(true);
    try {
      const res = await confirmPasswordResetWithToken(email, verifiedResetToken, resetNewPassword);
      if (res.success) {
        setVerifiedResetToken(null);
        setResetNewPassword('');
        setResetConfirmPassword('');
        setOwnerPasswordInput('');
        setResetEmailSuccessMessage(
          res.message || 'Your password has been reset. You can now sign in with your new credentials.'
        );
        setForgotPasswordStep('done');
        soundFx.playSuccess();
        showToast('Password updated! Sign in with your new password.', 'success');
      } else {
        setEmailAuthError(res.error || 'Could not update your password. Please try again.');
        soundFx.playError();
        if (
          res.code === 'INVALID_OR_EXPIRED_RESET_TOKEN' ||
          res.code === 'RESET_TOKEN_ALREADY_USED' ||
          res.code === 'MISSING_RESET_TOKEN'
        ) {
          setVerifiedResetToken(null);
          setForgotPasswordStep('email');
        }
      }
    } catch (err: any) {
      setEmailAuthError(err?.message || 'Network error updating password.');
      soundFx.playError();
    } finally {
      setIsConfirmingPasswordReset(false);
    }
  };

  const handleFallbackPasswordResetLink = async () => {
    const email = ownerEmailInput.trim();
    setEmailAuthError(null);
    setResetEmailSuccessMessage(null);
    if (!email) {
      setEmailAuthError('Please enter your account email address first.');
      return;
    }
    setIsSendingResetEmail(true);
    try {
      const res = await sendPasswordResetEmailAction(email);
      if (res.success) {
        setResetEmailSuccessMessage(res.message || `Password reset link sent to ${email}.`);
        soundFx.playSuccess();
      } else {
        setEmailAuthError(res.error || 'Failed to send password reset link.');
        soundFx.playError();
      }
    } catch (err: any) {
      setEmailAuthError(err?.message || 'Failed to send password reset link.');
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
  const [acceptedShopTerms, setAcceptedShopTerms] = useState<boolean>(false);
  const [acceptedPartnerTerms, setAcceptedPartnerTerms] = useState<boolean>(false);

  // Synchronize clean pathname URLs (/terms, /privacy, /faq, /ownership, /compliance) and legacy hashes
  useEffect(() => {
    const syncRoute = () => {
      if (typeof window === 'undefined') return;
      const legacyTarget = resolveLegacyHashToPath(window.location.hash);
      if (legacyTarget) {
        window.history.replaceState(null, '', legacyTarget);
        if (legacyTarget === '/pricing') {
          setActiveLegalPage(null);
          openPricingPage();
        } else {
          setActiveLegalPage(getLegalTabFromPath(legacyTarget));
        }
        window.dispatchEvent(new Event('sokopos-route-change'));
        return;
      }

      const legalTab = getLegalTabFromPath(window.location.pathname);
      setActiveLegalPage(legalTab);
    };

    syncRoute();
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('sokopos-route-change', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('sokopos-route-change', syncRoute);
    };
  }, [openPricingPage]);

  const navigateToLegalPage = (tab: LegalTab) => {
    closePricingPage();
    setActiveLegalPage(tab);
    if (typeof window !== 'undefined') {
      const target = `/${tab}`;
      if (normalizePathname(window.location.pathname) !== target) {
        window.history.pushState(null, '', target);
        window.dispatchEvent(new Event('sokopos-route-change'));
      }
    }
  };

  const navigateToPricing = () => {
    setActiveLegalPage(null);
    openPricingPage();
    scrollToTop(false);
  };

  const returnToLogin = () => {
    setActiveLegalPage(null);
    closePricingPage();
    if (typeof window !== 'undefined' && normalizePathname(window.location.pathname) !== '/') {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new Event('sokopos-route-change'));
    }
  };

  // Modal version of the Sign-In card
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const shopNameInputRef = useRef<HTMLInputElement>(null);
  const modalCardRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isAuthModalOpen || activeTab !== 'owner') return;
    let cancelled = false;
    fetchEmailOtpCapabilities().then((caps) => {
      if (!cancelled && caps) {
        setOtpCapabilities(caps);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthModalOpen, activeTab]);

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
    resetForgotPasswordFlowState();
    setPartnerAuthError(null);
    setPendingOtpEmail(null);
    setLoginOtpCode('');
    setLoginOtpError(null);
    setOtpRemainingAttempts(null);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setPinError(null);
    setEnteredPin('');
    setIsForgotPasswordMode(false);
    resetForgotPasswordFlowState();
    setPartnerAuthError(null);
    setPendingOtpEmail(null);
    setLoginOtpCode('');
    setLoginOtpError(null);
    setOtpRemainingAttempts(null);
    setIsDemoModeActive(false);
    localStorage.removeItem('sokopos_demo_intent');
    setTimeout(() => {
      previousFocusRef.current?.focus();
    }, 50);
  };

  // Ensure stale error/verification/OTP states are scrubbed whenever user signs out
  useEffect(() => {
    if (!currentUser) {
      setEmailAuthError(null);
      setPartnerAuthError(null);
      setPinError(null);
      setVerificationError(null);
      setVerificationFeedback(null);
      setEnteredPin('');
    }
  }, [currentUser]);

  useEffect(() => {
    if (checkoutAuthRequested && !currentUser) {
      setCheckoutAuthRequested(false);
      openAuthModal('owner');
    }
  }, [checkoutAuthRequested, currentUser, setCheckoutAuthRequested]);

  const activeCheckoutTier = useMemo(() => {
    if (!pendingCheckoutIntent || pendingCheckoutIntent.planId === 'free') return null;
    const sourceTiers = pricingTiers && pricingTiers.length > 0 ? pricingTiers : DEFAULT_PRICING_TIERS;
    return (
      sourceTiers.find((t) => t.id === pendingCheckoutIntent.planId) ||
      DEFAULT_PRICING_TIERS.find((t) => t.id === pendingCheckoutIntent.planId) ||
      DEFAULT_PRICING_TIERS[2]
    );
  }, [pendingCheckoutIntent, pricingTiers]);

  const isCheckoutContextActive = Boolean(
    activeCheckoutTier &&
      pendingCheckoutIntent &&
      (activeTab === 'owner' || activeTab === 'register') &&
      !pendingVerificationEmail
  );

  const handleToggleCheckoutBilling = (nextBilling: 'monthly' | 'annual') => {
    if (!pendingCheckoutIntent || !activeCheckoutTier) return;
    if (pendingCheckoutIntent.billingCycle === nextBilling) return;
    const nextAmount =
      nextBilling === 'annual' ? activeCheckoutTier.annualPrice : activeCheckoutTier.monthlyPrice;
    selectCheckoutPackage(pendingCheckoutIntent.planId, nextBilling);
    setPendingCheckoutIntent({
      ...pendingCheckoutIntent,
      billingCycle: nextBilling,
      amountKes: nextAmount,
      timestamp: Date.now(),
    });
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
        setPinError('Enter your Staff ID or username first so we know whose till to open');
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
      setPinError('Enter your Staff ID or username first');
      soundFx.playError();
      staffInputRef.current?.focus();
      return;
    }
    if (!pin || pin.length < 4) {
      setPinError('Enter all 4 digits of your PIN');
      soundFx.playError();
      pinInputRef.current?.focus();
      return;
    }

    if (!isDemoModeActive) {
      trackPlatformEvent('signin_start', {
        channel: 'staff_pin',
        dedupeKey: 'signin-start',
        dedupeTtlMs: 15_000,
      });
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
        setPinError('That 4-digit PIN did not match. Please try again.');
        setEnteredPin('');
        soundFx.playError();
      }
    } catch (err: any) {
      setPinError(err?.message || 'Could not sign you in. Check your Staff ID and PIN.');
      setEnteredPin('');
      soundFx.playError();
    } finally {
      setIsSubmittingTerminal(false);
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

    trackPlatformEvent('signin_start', {
      channel: pendingCheckoutIntent && pendingCheckoutIntent.planId !== 'free' ? 'checkout_email' : 'email',
      planId: pendingCheckoutIntent?.planId,
      dedupeKey: 'signin-start',
      dedupeTtlMs: 15_000,
    });

    setVerificationContext('owner');
    setIsAuthenticatingEmail(true);
    try {
      const res = await loginWithFirebaseEmailPassword(email, password, false);
      if (res.success) {
        setIsAuthModalOpen(false);
        onLoginSuccess?.();
      } else if (res.requiresVerification) {
        setVerificationError(null);
        setVerificationFeedback(`We sent a confirmation link to ${res.email || email}. Open your inbox and click it to unlock your dashboard.`);
      } else {
        setEmailAuthError(res.error || 'That email or password did not match. Please check and try again.');
        soundFx.playError();
      }
    } catch (err: any) {
      setEmailAuthError(err?.message || 'Could not sign you in. Please try again.');
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
      setEmailAuthError('Enter your shop or business name to continue.');
      return;
    }
    if (!ownerEmail) {
      setEmailAuthError('Enter your email address so you can sign back in later.');
      return;
    }
    if (!password) {
      setEmailAuthError('Choose a password for your shop account.');
      return;
    }
    if (password.length < 6) {
      setEmailAuthError('Use at least 6 characters for your password.');
      return;
    }
    if (!acceptedShopTerms) {
      setEmailAuthError('Please review and accept the Terms of Service, Liability Cap, and Privacy Policy to continue.');
      soundFx.playError();
      return;
    }

    trackPlatformEvent('signin_start', {
      channel: pendingCheckoutIntent && pendingCheckoutIntent.planId !== 'free' ? 'checkout_register' : 'register',
      planId: pendingCheckoutIntent?.planId,
      dedupeKey: 'signin-start',
      dedupeTtlMs: 15_000,
    });

    setVerificationContext('owner');
    setIsAuthenticatingEmail(true);
    try {
      const res = await loginWithFirebaseEmailPassword(ownerEmail, password, true, storeName);
      if (res.success) {
        setIsAuthModalOpen(false);
        onLoginSuccess?.();
      } else if (res.requiresVerification) {
        setVerificationError(null);
        setVerificationFeedback(`We sent a confirmation link to ${res.email || ownerEmail}. Click it in your inbox to open your new shop.`);
      } else {
        setEmailAuthError(res.error || 'Could not create your shop yet. Please check your details and try again.');
        soundFx.playError();
      }
    } catch (err: any) {
      setEmailAuthError(err?.message || 'Could not create your shop account.');
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
      if (!acceptedPartnerTerms) {
        setPartnerAuthError('Please review and accept the Terms of Service, Liability Cap, and Privacy Policy to continue.');
        soundFx.playError();
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
    trackPlatformEvent('demo_start', {
      isDemo: true,
      businessId: 'biz-demo',
      businessName: 'SokoPoS Demo Mart',
      dedupeKey: 'demo-start',
      dedupeTtlMs: 30_000,
    });

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

  return (
    <div
      id="pos-landing-root"
      className="min-h-full w-full flex flex-col justify-between selection:bg-[#28a745] selection:text-white relative overflow-hidden"
      style={{
        backgroundColor: '#f8fafc',
        color: '#090d16',
        fontFamily: '"Bricolage Grotesque", system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      <InteractiveGradientMesh />
      {/* Strict Light Mode CSS & Reset matching the design HTML */}
      <style>{`
        #pos-landing-root {
          --bg: #f8fafc;
          --surface: #ffffff;
          --ink: #090d16;
          --muted: #475569;
          --line: #e2e8f0;
          --blue: #28a745;
          --blue-ink: #ffffff;
          --red: #c8231b;
          --green: #28a745;
          --soft: #ecfdf5;
          --tone-money: #28a745;
          --tone-speed: #1e40af;
          --tone-savings: #b45309;
          --tone-legacy: #475569;
          --tone-calm: #0f766e;
          --tone-action: #1d4ed8;
          color-scheme: light;
        }
        .sp-hl-money {
          color: var(--tone-money);
        }
        .sp-hl-speed {
          color: var(--tone-speed);
        }
        .sp-hl-savings {
          color: var(--tone-savings);
        }
        .sp-hl-legacy {
          color: var(--tone-legacy);
        }
        .sp-hl-calm {
          color: var(--tone-calm);
        }
        .sp-hl-action {
          color: var(--tone-action);
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
          transition: transform 0.16s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease;
        }
        .sp-btn:active {
          transform: scale(0.98);
        }
        .sp-btn-blue {
          background: var(--blue);
          color: var(--blue-ink);
        }
        .sp-btn-blue:hover {
          filter: brightness(1.06);
          transform: translateY(-1px);
          box-shadow: 0 10px 20px -12px rgba(40, 167, 69, 0.55);
        }
        .sp-btn-blue:active {
          transform: scale(0.98);
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
          background-color: rgba(255, 255, 255, 0.9);
          transform: translateY(-1px);
        }
        .sp-btn-ghost:active {
          transform: scale(0.98);
        }
        .sp-btn-ghost svg {
          transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .sp-btn-ghost:hover svg {
          transform: translateX(3px);
        }
        .sp-btn-sm {
          padding: 8px 16px;
          font-size: 0.85rem;
        }
        .sp-hero {
          padding: 44px 0 64px;
        }
        .sp-hero-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
          align-items: center;
        }
        @media (min-width: 980px) {
          .sp-hero-grid {
            grid-template-columns: 1.15fr 0.95fr;
            gap: 48px;
          }
          .sp-hero-left {
            text-align: left;
          }
          .sp-hero-left .sp-h1 {
            text-align: left;
            margin: 0 0 20px 0;
            max-width: none;
          }
          .sp-hero-left .sp-lead {
            text-align: left;
            margin: 0 0 26px 0;
            max-width: 48ch;
          }
          .sp-hero-left .sp-cta {
            justify-content: flex-start;
          }
          .sp-hero-left .sp-fine {
            text-align: left;
            margin: 0 0 32px 0;
          }
          .sp-hero-left .sp-stats {
            margin: 0;
            max-width: 100%;
          }
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
          margin-bottom: 18px;
        }
        .sp-fine {
          font-size: 0.85rem;
          color: var(--muted);
          margin: 0 auto 36px;
          text-align: center;
          line-height: 1.5;
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
        /* Reveal Animations & Crisp Fintech Motion */
        @keyframes spHeroEnter {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .sp-hero-enter {
          animation: spHeroEnter 0.42s cubic-bezier(0.16, 1, 0.3, 1) both;
          animation-delay: calc(var(--hero-delay, 0) * 55ms);
        }
        .sp-reveal {
          opacity: 0;
          transform: translateY(18px);
          transition: opacity 0.54s cubic-bezier(0.16, 1, 0.3, 1), transform 0.54s cubic-bezier(0.16, 1, 0.3, 1);
          will-change: opacity, transform;
        }
        .sp-reveal.active {
          opacity: 1;
          transform: translateY(0);
        }
        .sp-stagger-item {
          opacity: 0;
          transform: translateY(14px);
          transition:
            opacity 0.48s cubic-bezier(0.16, 1, 0.3, 1) calc(var(--stagger-index, 0) * 60ms),
            transform 0.48s cubic-bezier(0.16, 1, 0.3, 1) calc(var(--stagger-index, 0) * 60ms),
            border-color 0.18s ease,
            box-shadow 0.18s ease,
            background-color 0.18s ease,
            color 0.18s ease;
        }
        .sp-reveal.active .sp-stagger-item {
          opacity: 1;
          transform: translateY(0);
        }
        .sp-reveal.active .sp-stagger-item:hover {
          transition-delay: 0ms;
          transition-duration: 0.18s;
        }
        @media (prefers-reduced-motion: reduce) {
          .sp-hero-enter {
            animation: none;
            opacity: 1;
            transform: none;
          }
          .sp-reveal,
          .sp-stagger-item {
            opacity: 1;
            transform: none;
            transition: none;
          }
          .sp-btn,
          .sp-btn-ghost svg,
          .sp-card {
            transition: none;
          }
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
        .sp-card:hover {
          border-color: #cbd5e1;
          transform: translateY(-2px);
          box-shadow: 0 12px 24px -18px rgba(9, 13, 22, 0.22);
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
          display: block;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: var(--tone-money);
          margin-bottom: 8px;
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
        .sp-final p.sp-final-lead {
          color: var(--muted);
          max-width: 50ch;
          margin: 0 auto 28px;
          font-size: 1.05rem;
          line-height: 1.6;
        }
        .sp-final p.sp-final-fine {
          color: #556375;
          max-width: 52ch;
          margin: 20px auto 0;
          font-size: 0.8125rem;
          line-height: 1.55;
        }
        @media (min-width: 640px) {
          .sp-final p.sp-final-fine {
            margin-top: 22px;
            font-size: 0.875rem;
          }
        }
        .sp-final .sp-cta {
          justify-content: center;
        }
      `}</style>

      {/* SHARED PUBLIC HEADER */}
      <PublicSiteHeader
        currentPage="landing"
        isLoggedIn={Boolean(currentUser)}
        onBrandClick={() => scrollToTop(true)}
        onNavigateSection={scrollToSection}
        onNavigatePricing={navigateToPricing}
        onAuthAction={() => {
          if (currentUser) {
            onLoginSuccess?.();
          } else {
            openAuthModal('owner');
          }
        }}
        loginButtonId="top-nav-login-btn"
        terminalButtonId="top-nav-pos-terminal-btn"
      />

      {/* MAIN BODY: Editorial Kenyan Retail Landing Page */}
      <main id="top" className="flex-1 w-full">
        {/* HERO SECTION: Contained Emerald-Sky-Amber Mesh Canvas with Overlapping Live Counter Preview */}
        <section className="pt-5 sm:pt-7 pb-6">
          <div className="sp-wrap">
            <div className="relative rounded-3xl border border-emerald-200/75 bg-gradient-to-br from-emerald-100/90 via-sky-100/80 to-amber-100/85 px-6 py-10 sm:px-10 sm:py-14 lg:px-14 lg:py-16 shadow-sm overflow-visible">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
                {/* Left Column: Indispensable Kenyan Retail Value Proposition */}
                <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left sp-hero-enter" style={{ '--hero-delay': 0 } as React.CSSProperties}>
                  <h1 className="text-[clamp(2.25rem,4.4vw,3.65rem)] font-extrabold tracking-[-0.035em] leading-[1.05] text-[#090d16] text-balance mb-5">
                    Software built for how{' '}
                    <span className="text-[#28a745]">Kenyan counters</span>{' '}
                    actually close.
                  </h1>

                  <p className="text-base sm:text-lg text-[#334155] leading-relaxed max-w-[46ch] mb-7">
                    Shopkeepers rarely love POS software—they rely on what survives the evening rush. SokoPoS solves M-Pesa matching, KRA eTIMS receipts, and offline stability seamlessly.
                  </p>

                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-4">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-full bg-[#28a745] hover:bg-[#218838] text-white text-sm font-bold shadow-md shadow-emerald-950/15 transition cursor-pointer whitespace-nowrap shrink-0"
                      id="demo"
                      onClick={handleLaunchDemoSandbox}
                    >
                      <Zap className="w-4 h-4 fill-white shrink-0" />
                      <span>Switch to Test Mode</span>
                    </button>

                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-6 py-3 min-h-[44px] rounded-full bg-white/90 hover:bg-white text-[#090d16] border border-[#090d16] text-sm font-bold transition cursor-pointer whitespace-nowrap shrink-0"
                      onClick={() => openAuthModal('owner')}
                    >
                      <span>Create free shop account</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  </div>

                  <p className="text-xs sm:text-[13px] font-medium text-[#475569]">
                    Opens in 5 seconds · Sample stock loaded · Works on phone, tablet, or PC
                  </p>
                </div>

                {/* Right Column: Interactive Counter Terminal Preview */}
                <div
                  className="lg:col-span-6 relative sp-hero-enter"
                  style={{ '--hero-delay': 1 } as React.CSSProperties}
                >
                  <div className="relative z-10 lg:mr-[-1rem]">
                    <HeroCounterPreview onLaunchDemo={handleLaunchDemoSandbox} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MONOCHROME KENYAN ECOSYSTEM TRUST STRIP */}
        <section aria-label="Supported Kenyan counter workflows" className="py-7 sm:py-9">
          <div className="sp-wrap">
            <div className="flex flex-wrap items-center justify-center lg:justify-between gap-x-8 gap-y-4 text-[#475569]">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold tracking-tight whitespace-nowrap opacity-85">
                <Smartphone className="w-4 h-4 shrink-0" />
                <span>Safaricom M-Pesa STK &amp; Till</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold tracking-tight whitespace-nowrap opacity-85">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>KRA eTIMS · Digitax CU</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold tracking-tight whitespace-nowrap opacity-85">
                <WifiOff className="w-4 h-4 shrink-0" />
                <span>Offline IndexedDB Queue</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold tracking-tight whitespace-nowrap opacity-85">
                <Printer className="w-4 h-4 shrink-0" />
                <span>58mm &amp; 80mm Thermal</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-bold tracking-tight whitespace-nowrap opacity-85">
                <CreditCard className="w-4 h-4 shrink-0" />
                <span>Cash, Card &amp; Credit Tabs</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 1: ROUNDED WHITE LIFECYCLE SHOWCASE (#payments) */}
        <LifecycleShowcase onLaunchDemo={handleLaunchDemoSandbox} />

        {/* EDITORIAL PULL-QUOTE #1 (Netlify Oversized Typographic Quote + Floating Badge) */}
        <section aria-label="Merchant reconciliation story" className="py-12 sm:py-16">
          <div className="sp-wrap max-w-4xl mx-auto text-center space-y-6">
            <blockquote className="text-2xl sm:text-4xl lg:text-[2.65rem] font-extrabold tracking-[-0.03em] leading-[1.15] text-[#090d16] text-balance">
              &ldquo;Cut our stock reconciliation time from 3 hours to{' '}
              <span className="text-[#28a745]">within 5 minutes</span> with real-time M-Pesa syncing. Zero discrepancies at closing time.&rdquo;
            </blockquote>

            <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border border-[#e2e8f0] shadow-xs text-left">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-[#28a745] font-extrabold text-xs flex items-center justify-center shrink-0">
                GW
              </div>
              <div className="text-xs">
                <strong className="block font-bold text-[#090d16]">Grace Wanjiku</strong>
                <span className="text-[#475569]">Owner, Ngara Mini-Supermarket · Nairobi</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: PEEKING INDUSTRY CAROUSEL (#solutions) */}
        <section className="py-12 sm:py-16" id="solutions">
          <div className="sp-wrap space-y-8">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight leading-[1.08] text-[#090d16] text-balance">
                Focus on your counter.{' '}
                <span className="text-[#0284c7]">Not everything around it.</span>
              </h2>
              <p className="text-sm sm:text-base text-[#475569] leading-relaxed">
                Supermarkets, minimarts, agrovets, hardware shops, bars, wines &amp; spirits, and pharmacies lose money in different ways. Pick your counter type below.
              </p>
            </div>

            <SolutionsGallery
              onLaunchDemo={handleLaunchDemoSandbox}
              onCreateAccount={() => openAuthModal('register')}
            />
          </div>
        </section>

        {/* THREE-CARD METRIC PROOF TRIO + EDITORIAL PULL-QUOTE #2 */}
        <section aria-label="Verified platform performance" className="py-10 sm:py-14 sp-reveal" id="success-stories">
          <div className="sp-wrap max-w-4xl mx-auto space-y-12 sm:space-y-14">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              <div className="rounded-2xl bg-white border border-[#e2e8f0] p-6 text-center shadow-xs sp-stagger-item" style={{ '--stagger-index': 0 } as React.CSSProperties}>
                <b className="block text-3xl sm:text-4xl font-extrabold font-mono text-[#090d16] tabular-nums tracking-tight">
                  KES <AnimatedMetricCounter target={25} />M+
                </b>
                <span className="block mt-1.5 text-xs font-semibold text-[#475569]">
                  Monthly retail till volume
                </span>
              </div>

              <div className="rounded-2xl bg-white border border-[#e2e8f0] p-6 text-center shadow-xs sp-stagger-item" style={{ '--stagger-index': 1 } as React.CSSProperties}>
                <b className="block text-3xl sm:text-4xl font-extrabold font-mono text-[#090d16] tabular-nums tracking-tight">
                  100%
                </b>
                <span className="block mt-1.5 text-xs font-semibold text-[#475569]">
                  Offline checkout continuity
                </span>
              </div>

              <div className="rounded-2xl bg-white border border-[#e2e8f0] p-6 text-center shadow-xs sp-stagger-item" style={{ '--stagger-index': 2 } as React.CSSProperties}>
                <b className="block text-3xl sm:text-4xl font-extrabold font-mono text-[#090d16] tabular-nums tracking-tight">
                  &lt; 18s
                </b>
                <span className="block mt-1.5 text-xs font-semibold text-[#475569]">
                  Average customer checkout
                </span>
              </div>
            </div>

            <div className="text-center space-y-6">
              <blockquote className="text-2xl sm:text-4xl lg:text-[2.5rem] font-extrabold tracking-[-0.03em] leading-[1.15] text-[#090d16] text-balance">
                &ldquo;We processed{' '}
                <span className="text-[#0284c7]">150+ offline sales</span> during a fiber outage, and every shilling synced the moment connection returned.&rdquo;
              </blockquote>

              <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border border-[#e2e8f0] shadow-xs text-left">
                <div className="w-9 h-9 rounded-full bg-sky-100 text-[#0284c7] font-extrabold text-xs flex items-center justify-center shrink-0">
                  HO
                </div>
                <div className="text-xs">
                  <strong className="block font-bold text-[#090d16]">Hassan Omar</strong>
                  <span className="text-[#475569]">Director, Mombasa Coast Hardware · Mombasa</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: HARDWARE FREEDOM (#hardware) */}
        <section className="sp-s sp-reveal" id="hardware">
          <div className="sp-wrap">
            <h2 className="sp-t text-balance">
              Skip the <span className="sp-hl-savings">Ksh 80,000 POS hardware</span> bundle.
            </h2>
            <p className="sp-sub">
              Start on the phone, tablet, or laptop already on your counter. Add a scanner or thermal printer only when your shop needs one.
            </p>
            <div className="sp-hw">
              <div className="sp-card sp-stagger-item" style={{ '--stagger-index': 0 } as React.CSSProperties}>
                <h3>Plug in any scanner</h3>
                <p>Standard USB and Bluetooth barcode scanners ring up items right out of the box.</p>
              </div>
              <div className="sp-card sp-stagger-item" style={{ '--stagger-index': 1 } as React.CSSProperties}>
                <h3>Standard receipt printers</h3>
                <p>Prints cleanly on everyday 58mm and 80mm thermal paper—no proprietary rolls.</p>
              </div>
              <div className="sp-card sp-stagger-item" style={{ '--stagger-index': 2 } as React.CSSProperties}>
                <h3>Phones &amp; tablets you own</h3>
                <p>Open your till in any modern browser without buying locked-in terminals.</p>
              </div>
              <div className="sp-card sp-stagger-item" style={{ '--stagger-index': 3 } as React.CSSProperties}>
                <h3>Fast laptop shortcuts</h3>
                <p>Check out long baskets with keyboard keys when queues build up at peak hours.</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: COMPARISON TABLE (#compare) */}
        <section className="sp-s sp-reveal" id="compare">
          <div className="sp-wrap">
            <h2 className="sp-t text-balance">
              What changes when you leave <span className="sp-hl-legacy">paper books and legacy tills</span> behind
            </h2>
            <div className="sp-scroll">
              <table className="sp-table">
                <thead>
                  <tr>
                    <th>Everyday shop need</th>
                    <th>With SokoPoS</th>
                    <th>Legacy desktop POS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="sp-stagger-item" style={{ '--stagger-index': 0 } as React.CSSProperties}>
                    <td>Runs on the phone or tablet you already own</td>
                    <td className="y">Yes</td>
                    <td className="n">Costly hardware bundle</td>
                  </tr>
                  <tr className="sp-stagger-item" style={{ '--stagger-index': 1 } as React.CSSProperties}>
                    <td>Matches M-Pesa payments to each receipt</td>
                    <td className="y">Built in</td>
                    <td className="n">Manual SMS check</td>
                  </tr>
                  <tr className="sp-stagger-item" style={{ '--stagger-index': 2 } as React.CSSProperties}>
                    <td>Prints KRA eTIMS verification receipts</td>
                    <td className="y">Built in</td>
                    <td className="n">Extra fees or manual</td>
                  </tr>
                  <tr className="sp-stagger-item" style={{ '--stagger-index': 3 } as React.CSSProperties}>
                    <td>Keeps checking out customers offline</td>
                    <td className="y">Yes</td>
                    <td className="n">Local machine only</td>
                  </tr>
                  <tr className="sp-stagger-item" style={{ '--stagger-index': 4 } as React.CSSProperties}>
                    <td>See live cash &amp; stock away from the shop</td>
                    <td className="y">From anywhere</td>
                    <td className="n">Only at the counter</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECTION 5: DUAL-PATH DECISION CARDS (Netlify Bottom Split) */}
        <section className="py-14 sm:py-18 sp-reveal" id="get-started">
          <div className="sp-wrap">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Path 1: Single Shop / Counter */}
              <div className="rounded-3xl bg-white border border-[#e2e8f0] p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row items-start gap-5 sp-stagger-item" style={{ '--stagger-index': 0 } as React.CSSProperties}>
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-400 to-amber-300 flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Store className="w-9 h-9" />
                </div>

                <div className="flex-1 space-y-3">
                  <h3 className="text-xl font-extrabold tracking-tight text-[#090d16]">
                    Already running a counter?
                  </h3>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    Launch Test Mode with sample Kenyan stock in 5 seconds, or create your shop account without changing your existing hardware.
                  </p>
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      id="demo2"
                      onClick={handleLaunchDemoSandbox}
                      className="px-4 py-2 min-h-[40px] rounded-full bg-[#28a745] hover:bg-[#218838] text-white text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Switch to Test Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => openAuthModal('owner')}
                      className="px-4 py-2 min-h-[40px] rounded-full bg-white hover:bg-[#f8fafc] text-[#090d16] border border-[#090d16] text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Create free shop account
                    </button>
                  </div>
                </div>
              </div>

              {/* Path 2: Multi-Branch / Team Decision */}
              <div className="rounded-3xl bg-white border border-[#e2e8f0] p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row items-start gap-5 sp-stagger-item" style={{ '--stagger-index': 1 } as React.CSSProperties}>
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-sky-400 via-emerald-400 to-teal-300 flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Building2 className="w-9 h-9" />
                </div>

                <div className="flex-1 space-y-3">
                  <h3 className="text-xl font-extrabold tracking-tight text-[#090d16]">
                    Deciding for a multi-branch team?
                  </h3>
                  <p className="text-sm text-[#475569] leading-relaxed">
                    Compare branch pricing tiers, set blind cashier PIN handovers, or enroll in the SokoPoS Partner Program.
                  </p>
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={navigateToPricing}
                      className="px-4 py-2 min-h-[40px] rounded-full bg-white hover:bg-[#f8fafc] text-[#090d16] border border-[#090d16] text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Compare Plans
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAffiliateModalOpen(true)}
                      className="px-4 py-2 min-h-[40px] rounded-full bg-white hover:bg-[#f8fafc] text-[#090d16] border border-[#cbd5e1] hover:border-[#090d16] text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Partner Program
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FLOATING ACTION BUTTON */}
      <WhatsAppFloatingButton
        phoneNumber="+254740463021"
        delayEntranceMs={2000}
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
            className={`relative w-full bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl shadow-slate-950/20 overflow-hidden my-auto animate-in zoom-in-95 fade-in duration-200 ${
              isCheckoutContextActive
                ? 'max-w-[460px] md:max-w-[780px] grid grid-cols-1 md:grid-cols-[310px_1fr]'
                : 'max-w-[432px]'
            }`}
          >
            {/* LIVE PLAN SUMMARY & CONVERSION CARD (Visible when logged-out visitor enters via paid plan CTA) */}
            {isCheckoutContextActive && activeCheckoutTier && pendingCheckoutIntent && (() => {
              const isAnnualBilling = pendingCheckoutIntent.billingCycle === 'annual';
              const monthlyTotalYear = activeCheckoutTier.monthlyPrice * 12;
              const annualSavingsKes = Math.max(0, monthlyTotalYear - activeCheckoutTier.annualPrice);
              const annualSavePct = monthlyTotalYear > 0 ? Math.round((annualSavingsKes / monthlyTotalYear) * 100) : 0;
              const displayedKes = isAnnualBilling ? activeCheckoutTier.annualPrice : activeCheckoutTier.monthlyPrice;
              const effectiveMonthlyKes = Math.round(activeCheckoutTier.annualPrice / 12);
              const branchSummary =
                activeCheckoutTier.maxBranches === -1
                  ? 'Unlimited branches'
                  : activeCheckoutTier.maxBranches === 1
                  ? '1 store branch'
                  : `Up to ${activeCheckoutTier.maxBranches} branches`;
              const staffSummary =
                activeCheckoutTier.maxStaffUsers === -1
                  ? 'Unlimited staff'
                  : `${activeCheckoutTier.maxStaffUsers} staff users`;

              return (
                <aside
                  aria-label="Selected checkout plan summary"
                  className="bg-[#f8fafc] border-b md:border-b-0 md:border-r border-[#e2e8f0] p-5 sm:p-6 flex flex-col justify-between gap-5"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-[#28a745]">
                        Checkout Summary
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          closeAuthModal();
                          navigateToPricing();
                        }}
                        className="text-xs font-bold text-[#475569] hover:text-[#090d16] hover:underline underline-offset-2 transition cursor-pointer"
                      >
                        Change plan
                      </button>
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <h3 className="text-xl font-extrabold text-[#090d16] tracking-tight">
                          {pendingCheckoutIntent.planName} Plan
                        </h3>
                        <span className="text-xs font-semibold text-[#475569]">
                          &middot; {activeCheckoutTier.alias}
                        </span>
                      </div>
                      <p className="text-xs text-[#475569] font-medium mt-1">
                        {branchSummary} &middot; {staffSummary}
                      </p>
                    </div>

                    {/* Live Price & Monthly vs Annual Billing Switch */}
                    <div className="pt-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[28px] leading-none font-extrabold text-[#090d16] tracking-tight tabular-nums">
                          Ksh {displayedKes.toLocaleString('en-KE')}
                        </span>
                        <span className="text-xs font-semibold text-[#475569]">
                          {isAnnualBilling ? '/ year' : '/ month'}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-[#475569] mt-1 tabular-nums">
                        {isAnnualBilling
                          ? `Ksh ${effectiveMonthlyKes.toLocaleString('en-KE')}/mo equivalent · Billed annually`
                          : 'Billed monthly · Switch anytime'}
                      </p>

                      <div
                        role="group"
                        aria-label="Billing cycle"
                        className="mt-3 bg-[#e2e8f0]/75 p-1 rounded-xl grid grid-cols-2 gap-1"
                      >
                        <button
                          type="button"
                          aria-pressed={!isAnnualBilling}
                          onClick={() => handleToggleCheckoutBilling('monthly')}
                          className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            !isAnnualBilling
                              ? 'bg-white text-[#090d16] shadow-xs'
                              : 'text-[#475569] hover:text-[#090d16]'
                          }`}
                        >
                          Monthly
                        </button>
                        <button
                          type="button"
                          aria-pressed={isAnnualBilling}
                          onClick={() => handleToggleCheckoutBilling('annual')}
                          className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                            isAnnualBilling
                              ? 'bg-white text-[#090d16] shadow-xs'
                              : 'text-[#475569] hover:text-[#090d16]'
                          }`}
                        >
                          <span>Annual</span>
                          {annualSavePct > 0 && (
                            <span className="text-[10px] font-extrabold text-[#28a745] tabular-nums">
                              -{annualSavePct}%
                            </span>
                          )}
                        </button>
                      </div>

                      {annualSavingsKes > 0 && (
                        isAnnualBilling ? (
                          <div className="mt-2.5 px-3 py-2 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#28a745] text-xs font-semibold flex items-center gap-2 tabular-nums">
                            <Check className="w-3.5 h-3.5 shrink-0 text-[#28a745]" />
                            <span>You save Ksh {annualSavingsKes.toLocaleString('en-KE')}/yr (2 months free)</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleCheckoutBilling('annual')}
                            className="mt-2.5 w-full px-3 py-2 rounded-xl bg-white hover:bg-[#ecfdf5]/70 border border-dashed border-[#28a745]/50 text-[#090d16] text-xs font-semibold flex items-center justify-between gap-2 transition cursor-pointer tabular-nums text-left"
                          >
                            <span>Save Ksh {annualSavingsKes.toLocaleString('en-KE')}/yr with Annual</span>
                            <ArrowRight className="w-3.5 h-3.5 shrink-0 text-[#28a745]" />
                          </button>
                        )
                      )}
                    </div>

                    {/* Trust Signals */}
                    <div className="pt-3 border-t border-[#e2e8f0] space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <Zap className="w-4 h-4 text-[#28a745] shrink-0 mt-0.5" />
                        <div className="text-xs leading-snug">
                          <span className="font-bold text-[#090d16] block">Ready right after M-Pesa</span>
                          <span className="text-[#475569]">Your shop features unlock the moment STK Push or card payment completes.</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <ShieldCheck className="w-4 h-4 text-[#090d16] shrink-0 mt-0.5" />
                        <div className="text-xs leading-snug">
                          <span className="font-bold text-[#090d16] block">Keeps selling when Wi-Fi drops</span>
                          <span className="text-[#475569]">No lost sales during blackouts—everything syncs once internet returns.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#e2e8f0]/80 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => clearPendingCheckoutIntent()}
                      className="text-[11px] font-semibold text-[#64748b] hover:text-[#090d16] transition cursor-pointer"
                    >
                      Just signing in? Dismiss plan
                    </button>
                  </div>
                </aside>
              );
            })()}

            <div className="flex flex-col min-w-0 justify-between">
              {/* Dedicated Brand Header Bar */}
              <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-b border-[#E2E8F0] bg-white">
                <AppLogo theme="light" size="sm" showText />
                <button
                  type="button"
                  id="auth-modal-close-btn"
                  onClick={closeAuthModal}
                  aria-label="Close dialog"
                  className="w-10 h-10 -mr-2 rounded-lg text-[#475569] hover:text-[#0F172A] hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745] transition-colors cursor-pointer flex items-center justify-center shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

            {pendingOtpEmail ? (
              <div id="p-verify-login-otp" className="px-6 pt-5 pb-6 space-y-4 text-left">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#28a745]">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 id="auth-modal-title" className="font-display text-xl sm:text-[22px] font-extrabold text-[#0F172A] tracking-tight mb-1">
                    Check your inbox
                  </h2>
                  <p className="text-[13px] text-[#475569] leading-relaxed">
                    Type the 6-digit login code we sent to{' '}
                    <span className="font-semibold text-[#0F172A]">{pendingOtpEmail}</span>.
                  </p>
                  <p className="text-[11px] font-medium text-[#64748B] mt-1 font-mono tabular-nums">
                    {otpExpirySeconds > 0
                      ? `Expires in ${formatCountdownClock(otpExpirySeconds)}`
                      : 'Code expired · Request a fresh code below'}
                  </p>
                </div>

                {loginOtpError && (
                  <div className="p-3 rounded-[10px] bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs font-medium flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
                    <div className="min-w-0">
                      <span>{loginOtpError}</span>
                      {typeof otpRemainingAttempts === 'number' && otpRemainingAttempts > 0 && (
                        <span className="block text-[11px] text-[#B91C1C] font-semibold mt-0.5 tabular-nums">
                          Tries left before reset: {otpRemainingAttempts}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <form onSubmit={handleVerifyLoginOtp} className="space-y-4 pt-1">
                  <div>
                    <label
                      htmlFor="email-otp-code-input"
                      className="block text-xs font-semibold text-[#0F172A] mb-1.5"
                    >
                      6-Digit Login Code
                    </label>
                    <input
                      id="email-otp-code-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={loginOtpCode}
                      onChange={(e) => {
                        setLoginOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                        setLoginOtpError(null);
                      }}
                      placeholder="000000"
                      className="w-full h-13 px-4 rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] text-center font-mono tabular-nums text-2xl tracking-[0.4em] font-extrabold text-[#0F172A] focus:outline-none focus:border-[#28a745] focus:ring-2 focus:ring-[#28a745]/15 focus:bg-white transition-all"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isAuthTransitioning || isVerifyingLoginOtp || loginOtpCode.length !== 6 || otpExpirySeconds <= 0}
                    className="w-full h-11 bg-[#28a745] hover:bg-[#218838] active:scale-[0.99] disabled:opacity-60 text-white font-semibold text-sm rounded-[10px] transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745] focus-visible:ring-offset-2"
                  >
                    {isAuthTransitioning || isVerifyingLoginOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{isAuthTransitioning ? 'Clearing previous session...' : 'Opening your shop...'}</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {isCheckoutContextActive
                            ? 'Confirm & continue to payment'
                            : 'Open my shop'}
                        </span>
                        {isCheckoutContextActive && <ArrowRight className="w-4 h-4" />}
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleResendLoginOtp}
                      disabled={isSendingLoginOtp || otpResendCooldownSec > 0}
                      className="text-xs font-bold text-[#28a745] hover:underline cursor-pointer disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed font-mono tabular-nums"
                    >
                      {isSendingLoginOtp
                        ? 'Sending code...'
                        : otpResendCooldownSec > 0
                        ? `Resend code in ${formatCountdownClock(otpResendCooldownSec)}`
                        : 'Send a new code'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingOtpEmail(null);
                        setLoginOtpCode('');
                        setLoginOtpError(null);
                        setOtpRemainingAttempts(null);
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
                    >
                      Use another email
                    </button>
                  </div>
                </form>
              </div>
            ) : pendingVerificationEmail ? (
              <div id="p-verify-email" className="px-6 pt-5 pb-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#28a745]">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h2
                    id="auth-modal-title"
                    className="font-display text-xl sm:text-[22px] font-extrabold text-[#0F172A] tracking-tight mb-1 text-left"
                  >
                    {verificationContext === 'partner'
                      ? 'Confirm your partner email'
                      : 'Confirm your email address'}
                  </h2>
                  <p className="text-[13px] text-[#475569] leading-relaxed text-left">
                    {verificationContext === 'partner'
                      ? 'We want to make sure your M-Pesa commission payouts go only to you. Open your inbox and click the link we sent to '
                      : 'So only you can access your shop cash totals and stock reports, click the confirmation link we sent to '}
                    <span className="font-semibold text-[#0F172A]">{pendingVerificationEmail}</span>.
                  </p>
                </div>

                {verificationContext !== 'partner' && pendingCheckoutIntent && pendingCheckoutIntent.planId !== 'free' && (
                  <div className="p-3 rounded-[10px] bg-[#ecfdf5] border border-[#a7f3d0] text-[#15803d] text-xs font-semibold flex items-start gap-2">
                    <Zap className="w-4 h-4 shrink-0 mt-0.5 text-[#28a745]" />
                    <span>
                      Your <strong>{pendingCheckoutIntent.planName} Plan ({pendingCheckoutIntent.billingCycle === 'annual' ? 'Annual' : 'Monthly'})</strong> choice is saved—payment opens as soon as you confirm.
                    </span>
                  </div>
                )}

                {verificationFeedback && (
                  <div className="p-3 rounded-[10px] bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-start gap-2">
                    <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    <span>{verificationFeedback}</span>
                  </div>
                )}

                {verificationError && (
                  <div className="p-3 rounded-[10px] bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs font-medium flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
                    <span>{verificationError}</span>
                  </div>
                )}

                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleCheckVerification}
                    disabled={isCheckingVerification}
                    className="w-full h-11 bg-[#28a745] hover:bg-[#218838] active:scale-[0.99] disabled:opacity-60 text-white font-semibold text-sm rounded-[10px] transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745] focus-visible:ring-offset-2"
                  >
                    {isCheckingVerification ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Checking...</span>
                      </>
                    ) : (
                      <span>I&apos;ve clicked the link — Continue</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResendingVerification}
                    className="w-full h-11 bg-white hover:bg-[#F8FAFC] disabled:opacity-60 text-[#0F172A] font-semibold text-xs rounded-[10px] border border-[#CBD5E1] transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745] focus-visible:ring-offset-2"
                  >
                    {isResendingVerification ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending link again...</span>
                      </>
                    ) : (
                      <span>Send confirmation email again</span>
                    )}
                  </button>

                  <div className="pt-1 text-center">
                    <button
                      type="button"
                      onClick={handleCancelVerification}
                      className="text-xs font-bold text-[#556375] hover:text-[#0e1a2b] hover:underline cursor-pointer"
                    >
                      Use a different email
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
            {/* Underline Role Tabs (Owner vs Partner vs Staff) */}
            {activeTab !== 'register' && (
              <div
                className="grid grid-cols-3 border-b border-[#E2E8F0] px-6 bg-white"
                role="tablist"
                aria-label="Account role"
                id="seg"
              >
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
                  className={`relative min-h-[44px] py-3 px-2 text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#28a745] ${
                    activeTab === 'owner'
                      ? 'text-[#0F172A]'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  <span>Owner</span>
                  {activeTab === 'owner' && (
                    <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-[#28a745]" aria-hidden="true" />
                  )}
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
                  className={`relative min-h-[44px] py-3 px-2 text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#28a745] ${
                    activeTab === 'partner'
                      ? 'text-[#0F172A]'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  <span>Partner</span>
                  <span className="text-[11px] font-bold font-mono tabular-nums text-[#28a745]">
                    20%
                  </span>
                  {activeTab === 'partner' && (
                    <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-[#28a745]" aria-hidden="true" />
                  )}
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
                  className={`relative min-h-[44px] py-3 px-2 text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#28a745] ${
                    activeTab === 'staff'
                      ? 'text-[#0F172A]'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  <span>Staff</span>
                  {activeTab === 'staff' && (
                    <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-[#28a745]" aria-hidden="true" />
                  )}
                </button>
              </div>
            )}

            <div className="px-6 pt-5 pb-6">

            {/* TAB 1: OWNER LOGIN (Email & Password Sign-In Flow / Password Reset) */}
            {activeTab === 'owner' && (
              <div id="p-owner">
                {isForgotPasswordMode ? (
                  <div id="p-forgot-password-otp" className="text-left">
                    {forgotPasswordStep === 'email' && (
                      <div>
                        <h2
                          id="auth-modal-title"
                          className="font-display text-xl sm:text-[22px] font-extrabold text-[#0F172A] tracking-tight mb-1 text-left"
                        >
                          Reset your password
                        </h2>
                        <p className="text-[13px] text-[#475569] leading-relaxed mb-4 text-left">
                          Enter your account email and we&apos;ll send a 6-digit verification code via Resend to securely reset your password.
                        </p>

                        {otpCapabilities &&
                          (!otpCapabilities.emailProviderConfigured || !otpCapabilities.customTokenConfigured) && (
                            <div className="p-3 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] text-xs leading-relaxed mb-4">
                              <span className="font-semibold text-[#0F172A] block mb-0.5">
                                Email OTP reset requires server secrets
                              </span>
                              {!otpCapabilities.emailProviderConfigured
                                ? 'Configure RESEND_API_KEY in AI Studio Secrets, or use the standard reset link below.'
                                : 'Configure FIREBASE_SERVICE_ACCOUNT_JSON in AI Studio Secrets, or use the standard reset link below.'}
                            </div>
                          )}

                        <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
                          <div>
                            <label htmlFor="reset-email-input" className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                              Your account email
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
                                className="w-full h-11 pl-3.5 pr-10 rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] text-sm focus:bg-white focus:border-[#28a745] focus:ring-2 focus:ring-[#28a745]/15 focus:outline-none transition-all"
                              />
                              <Mail className="w-4 h-4 text-[#94A3B8] absolute right-3.5 pointer-events-none" />
                            </div>
                          </div>

                          {emailAuthError && (
                            <div className="p-3 rounded-[10px] bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs font-medium flex items-start gap-2 animate-in fade-in duration-150">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
                              <span>{emailAuthError}</span>
                            </div>
                          )}

                          {resetEmailSuccessMessage && (
                            <div className="p-3 rounded-[10px] bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-start gap-2 animate-in fade-in duration-150">
                              <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                              <span>{resetEmailSuccessMessage}</span>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={isSendingResetEmail}
                            className="w-full h-11 bg-[#28a745] hover:bg-[#218838] active:scale-[0.99] disabled:opacity-60 text-white font-semibold text-sm rounded-[10px] transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745] focus-visible:ring-offset-2"
                          >
                            {isSendingResetEmail ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Sending 6-digit code...</span>
                              </>
                            ) : (
                              <>
                                <span>Send 6-digit reset code</span>
                                <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </button>

                          <div className="flex items-center justify-between pt-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsForgotPasswordMode(false);
                                resetForgotPasswordFlowState();
                              }}
                              className="text-xs font-bold text-[#28a745] hover:underline cursor-pointer"
                            >
                              ← Back to sign in
                            </button>
                            <button
                              type="button"
                              disabled={isSendingResetEmail}
                              onClick={handleFallbackPasswordResetLink}
                              className="text-xs font-semibold text-[#556375] hover:text-[#0e1a2b] hover:underline cursor-pointer disabled:opacity-50"
                            >
                              Send reset link instead
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {forgotPasswordStep === 'otp' && (
                      <div className="space-y-4 pt-1">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#28a745]">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <h2
                            id="auth-modal-title"
                            className="font-display text-xl sm:text-[22px] font-extrabold text-[#0F172A] tracking-tight mb-1"
                          >
                            Enter verification code
                          </h2>
                          <p className="text-[13px] text-[#475569] leading-relaxed">
                            Type the 6-digit reset code we sent to{' '}
                            <span className="font-semibold text-[#0F172A]">{ownerEmailInput.trim().toLowerCase()}</span>.
                          </p>
                          <p className="text-[11px] font-medium text-[#64748B] mt-1 font-mono tabular-nums">
                            {resetOtpExpirySeconds > 0
                              ? `Expires in ${formatCountdownClock(resetOtpExpirySeconds)}`
                              : 'Code expired · Request a fresh code below'}
                          </p>
                        </div>

                        {resetOtpError && (
                          <div className="p-3 rounded-[10px] bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs font-medium flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
                            <div className="min-w-0">
                              <span>{resetOtpError}</span>
                              {typeof resetOtpRemainingAttempts === 'number' && resetOtpRemainingAttempts > 0 && (
                                <span className="block text-[11px] text-[#B91C1C] font-semibold mt-0.5 tabular-nums">
                                  Tries left before lock: {resetOtpRemainingAttempts}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <form onSubmit={handleVerifyResetOtpSubmit} className="space-y-4">
                          <div>
                            <label
                              htmlFor="reset-otp-code-input"
                              className="block text-xs font-semibold text-[#0F172A] mb-1.5"
                            >
                              6-Digit Reset Code
                            </label>
                            <input
                              id="reset-otp-code-input"
                              type="text"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              maxLength={6}
                              value={resetOtpCode}
                              onChange={(e) => {
                                setResetOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                                setResetOtpError(null);
                              }}
                              placeholder="000000"
                              className="w-full h-13 px-4 rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] text-center font-mono tabular-nums text-2xl tracking-[0.4em] font-extrabold text-[#0F172A] focus:outline-none focus:border-[#28a745] focus:ring-2 focus:ring-[#28a745]/15 focus:bg-white transition-all"
                              autoFocus
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isVerifyingResetOtp || resetOtpCode.length !== 6 || resetOtpExpirySeconds <= 0}
                            className="w-full h-11 bg-[#28a745] hover:bg-[#218838] active:scale-[0.99] disabled:opacity-60 text-white font-semibold text-sm rounded-[10px] transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745] focus-visible:ring-offset-2"
                          >
                            {isVerifyingResetOtp ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Verifying code...</span>
                              </>
                            ) : (
                              <>
                                <span>Verify &amp; continue</span>
                                <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </button>

                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={handleResendResetOtp}
                              disabled={isSendingResetEmail || resetOtpResendCooldownSec > 0}
                              className="text-xs font-semibold text-[#28a745] hover:underline cursor-pointer disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed font-mono tabular-nums"
                            >
                              {isSendingResetEmail
                                ? 'Sending code...'
                                : resetOtpResendCooldownSec > 0
                                ? `Resend code in ${formatCountdownClock(resetOtpResendCooldownSec)}`
                                : 'Send a new code'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setForgotPasswordStep('email');
                                setResetOtpCode('');
                                setResetOtpError(null);
                                setResetOtpRemainingAttempts(null);
                              }}
                              className="text-xs font-semibold text-[#475569] hover:text-[#0F172A] cursor-pointer"
                            >
                              Change email
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {forgotPasswordStep === 'new_password' && (
                      <div className="space-y-4 pt-1">
                        <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#28a745]">
                          <KeyRound className="w-5 h-5" />
                        </div>
                        <div>
                          <h2
                            id="auth-modal-title"
                            className="font-display text-xl sm:text-[22px] font-extrabold text-[#0F172A] tracking-tight mb-1"
                          >
                            Create a new password
                          </h2>
                          <p className="text-[13px] text-[#475569] leading-relaxed">
                            Identity verified for{' '}
                            <span className="font-semibold text-[#0F172A]">{ownerEmailInput.trim().toLowerCase()}</span>. Choose a strong new password (at least 8 characters).
                          </p>
                        </div>

                        <form onSubmit={handleConfirmNewPasswordSubmit} className="space-y-4">
                          <div>
                            <label htmlFor="reset-new-password-input" className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                              New password
                            </label>
                            <div className="relative flex items-center">
                              <input
                                id="reset-new-password-input"
                                type={showResetNewPassword ? 'text' : 'password'}
                                placeholder="Minimum 8 characters"
                                autoComplete="new-password"
                                required
                                minLength={8}
                                maxLength={128}
                                value={resetNewPassword}
                                onChange={(e) => {
                                  setResetNewPassword(e.target.value);
                                  setEmailAuthError(null);
                                }}
                                className="w-full h-11 pl-3.5 pr-10 rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] text-sm focus:bg-white focus:border-[#28a745] focus:ring-2 focus:ring-[#28a745]/15 focus:outline-none transition-all"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => setShowResetNewPassword((prev) => !prev)}
                                aria-label={showResetNewPassword ? 'Hide new password' : 'Show new password'}
                                className="absolute right-2 p-1.5 rounded-lg text-[#475569] hover:text-[#0F172A] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745]"
                              >
                                {showResetNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label htmlFor="reset-confirm-password-input" className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                              Confirm new password
                            </label>
                            <div className="relative flex items-center">
                              <input
                                id="reset-confirm-password-input"
                                type={showResetConfirmPassword ? 'text' : 'password'}
                                placeholder="Re-enter new password"
                                autoComplete="new-password"
                                required
                                minLength={8}
                                maxLength={128}
                                value={resetConfirmPassword}
                                onChange={(e) => {
                                  setResetConfirmPassword(e.target.value);
                                  setEmailAuthError(null);
                                }}
                                className="w-full h-11 pl-3.5 pr-10 rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] text-sm focus:bg-white focus:border-[#28a745] focus:ring-2 focus:ring-[#28a745]/15 focus:outline-none transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => setShowResetConfirmPassword((prev) => !prev)}
                                aria-label={showResetConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                                className="absolute right-2 p-1.5 rounded-lg text-[#475569] hover:text-[#0F172A] transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745]"
                              >
                                {showResetConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {emailAuthError && (
                            <div className="p-3 rounded-[10px] bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs font-medium flex items-start gap-2 animate-in fade-in duration-150">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
                              <span>{emailAuthError}</span>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={isConfirmingPasswordReset || resetNewPassword.length < 8 || resetConfirmPassword.length < 8}
                            className="w-full h-11 bg-[#28a745] hover:bg-[#218838] active:scale-[0.99] disabled:opacity-60 text-white font-semibold text-sm rounded-[10px] transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745] focus-visible:ring-offset-2"
                          >
                            {isConfirmingPasswordReset ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Updating password...</span>
                              </>
                            ) : (
                              <>
                                <span>Reset password</span>
                                <Check className="w-4 h-4" />
                              </>
                            )}
                          </button>

                          <div className="pt-1 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setIsForgotPasswordMode(false);
                                resetForgotPasswordFlowState();
                              }}
                              className="text-xs font-semibold text-[#475569] hover:text-[#0F172A] cursor-pointer"
                            >
                              Cancel &amp; return to sign in
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {forgotPasswordStep === 'done' && (
                      <div className="space-y-4 pt-1">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#28a745]">
                          <Check className="w-6 h-6" />
                        </div>
                        <div>
                          <h2
                            id="auth-modal-title"
                            className="font-display text-xl sm:text-[22px] font-extrabold text-[#0F172A] tracking-tight mb-1"
                          >
                            Password updated
                          </h2>
                          <p className="text-[13px] text-[#475569] leading-relaxed">
                            {resetEmailSuccessMessage ||
                              `Your credentials for ${ownerEmailInput.trim().toLowerCase()} have been reset. Sign in below using your new password.`}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotPasswordMode(false);
                            setOwnerLoginMethod('password');
                            setOwnerPasswordInput('');
                            resetForgotPasswordFlowState();
                          }}
                          className="w-full h-11 bg-[#28a745] hover:bg-[#218838] active:scale-[0.99] text-white font-semibold text-sm rounded-[10px] transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745] focus-visible:ring-offset-2"
                        >
                          <span>Back to sign in</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <h2 id="auth-modal-title" className="sr-only">
                      {isCheckoutContextActive ? 'Sign in to finish activating your shop' : 'Owner Sign In'}
                    </h2>

                    {/* Owner Auth Method Switcher: Password vs Email Code (OTP) */}
                    <div
                      className="grid grid-cols-2 gap-1 p-1 rounded-[10px] bg-[#F1F5F9] border border-[#E2E8F0] mb-4"
                      role="radiogroup"
                      aria-label="Owner Sign-In Method"
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={ownerLoginMethod === 'password'}
                        onClick={() => {
                          setOwnerLoginMethod('password');
                          setEmailAuthError(null);
                        }}
                        className={`min-h-[36px] py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745] ${
                          ownerLoginMethod === 'password'
                            ? 'bg-white text-[#0F172A] shadow-2xs border border-[#E2E8F0]/70'
                            : 'text-[#475569] hover:text-[#0F172A]'
                        }`}
                      >
                        <Lock className={`w-3.5 h-3.5 shrink-0 ${ownerLoginMethod === 'password' ? 'text-[#28a745]' : ''}`} />
                        <span>Password</span>
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={ownerLoginMethod === 'otp'}
                        onClick={() => {
                          setOwnerLoginMethod('otp');
                          setEmailAuthError(null);
                        }}
                        className={`min-h-[36px] py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745] ${
                          ownerLoginMethod === 'otp'
                            ? 'bg-white text-[#0F172A] shadow-2xs border border-[#E2E8F0]/70'
                            : 'text-[#475569] hover:text-[#0F172A]'
                        }`}
                      >
                        <Mail className={`w-3.5 h-3.5 shrink-0 ${ownerLoginMethod === 'otp' ? 'text-[#28a745]' : ''}`} />
                        <span>Email Code</span>
                      </button>
                    </div>

                    {ownerLoginMethod === 'password' ? (
                      <form id="emailForm" onSubmit={handleEmailFormSubmit} className="space-y-4">
                        <div>
                          <label htmlFor="owner-email-input" className="block text-xs font-semibold text-[#0F172A] mb-1.5">
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
                              className="w-full h-11 pl-3.5 pr-10 rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] text-sm focus:bg-white focus:border-[#28a745] focus:ring-2 focus:ring-[#28a745]/15 focus:outline-none transition-all"
                            />
                            <Mail className="w-4 h-4 text-[#94A3B8] absolute right-3.5 pointer-events-none" />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label htmlFor="owner-password-input" className="block text-xs font-semibold text-[#0F172A]">
                              Password
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                resetForgotPasswordFlowState();
                                setIsForgotPasswordMode(true);
                              }}
                              className="text-xs font-semibold text-[#28a745] hover:text-[#218838] hover:underline cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745]"
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
                              className="w-full h-11 pl-3.5 pr-11 rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] text-sm focus:bg-white focus:border-[#28a745] focus:ring-2 focus:ring-[#28a745]/15 focus:outline-none transition-all [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                            />
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => setShowOwnerPassword((prev) => !prev)}
                              aria-label={showOwnerPassword ? 'Hide password' : 'Show password'}
                              aria-pressed={showOwnerPassword}
                              title={showOwnerPassword ? 'Hide password' : 'Show password'}
                              className="absolute right-2 z-10 p-1.5 rounded-lg text-[#475569] hover:text-[#0F172A] hover:bg-slate-200/60 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745]"
                            >
                              {showOwnerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Error alert banner */}
                        {emailAuthError && (
                          <div className="p-3 rounded-[10px] bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs font-medium flex items-start gap-2 animate-in fade-in duration-150">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
                            <span>{emailAuthError}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={isAuthTransitioning || isAuthenticatingEmail}
                          className="w-full h-11 bg-[#28a745] hover:bg-[#218838] active:scale-[0.99] disabled:opacity-60 text-white font-semibold text-sm rounded-[10px] transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745] focus-visible:ring-offset-2"
                        >
                          {isAuthTransitioning || isAuthenticatingEmail ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>{isAuthTransitioning ? 'Clearing previous session...' : 'Opening your shop...'}</span>
                            </>
                          ) : (
                            <>
                              <span>
                                {isCheckoutContextActive
                                  ? 'Sign in & pay for plan'
                                  : 'Open my shop'}
                              </span>
                              {isCheckoutContextActive && <ArrowRight className="w-4 h-4" />}
                            </>
                          )}
                        </button>
                      </form>
                    ) : (
                      <form id="emailOtpForm" onSubmit={handleSendPasswordlessOtp} className="space-y-4">
                        {otpCapabilities &&
                          (!otpCapabilities.emailProviderConfigured || !otpCapabilities.customTokenConfigured) && (
                            <div className="p-3 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] text-xs leading-relaxed">
                              <span className="font-semibold text-[#0F172A] block mb-0.5">
                                Email code login needs server keys configured
                              </span>
                              {!otpCapabilities.customTokenConfigured
                                ? 'Requires FIREBASE_SERVICE_ACCOUNT_JSON and RESEND_API_KEY in AI Studio Secrets.'
                                : 'Requires RESEND_API_KEY in AI Studio Secrets to send login codes.'}
                            </div>
                          )}

                        <div>
                          <label htmlFor="owner-otp-email-input" className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                            Email address
                          </label>
                          <div className="relative flex items-center">
                            <input
                              ref={emailInputRef}
                              type="email"
                              id="owner-otp-email-input"
                              placeholder="yourname@gmail.com"
                              aria-label="Email address for 6-digit sign-in code"
                              autoComplete="email"
                              required
                              value={ownerEmailInput}
                              onChange={(e) => {
                                setOwnerEmailInput(e.target.value);
                                setEmailAuthError(null);
                              }}
                              className="w-full h-11 pl-3.5 pr-10 rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] text-sm focus:bg-white focus:border-[#28a745] focus:ring-2 focus:ring-[#28a745]/15 focus:outline-none transition-all"
                            />
                            <Mail className="w-4 h-4 text-[#94A3B8] absolute right-3.5 pointer-events-none" />
                          </div>
                        </div>

                        {emailAuthError && (
                          <div className="p-3 rounded-[10px] bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs font-medium flex items-start gap-2 animate-in fade-in duration-150">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
                            <span>{emailAuthError}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={isSendingLoginOtp}
                          className="w-full h-11 bg-[#28a745] hover:bg-[#218838] active:scale-[0.99] disabled:opacity-60 text-white font-semibold text-sm rounded-[10px] transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745] focus-visible:ring-offset-2"
                        >
                          {isSendingLoginOtp ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Sending code...</span>
                            </>
                          ) : (
                            <>
                              <span>Email me a 6-digit code</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PARTNER PORTAL LOGIN / JOIN */}
            {activeTab === 'partner' && (
              <div id="p-partner">
                <h2 id="auth-modal-title" className="sr-only">
                  {partnerMode === 'register' ? 'Join as a Partner' : 'Partner Sign In'}
                </h2>

                {/* Sub-toggle: Sign In vs Become Partner */}
                <div className="bg-[#F1F5F9] p-1 rounded-[10px] grid grid-cols-2 gap-1 mb-4 border border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => {
                      setPartnerMode('signin');
                      setPartnerAuthError(null);
                    }}
                    className={`min-h-[36px] py-1.5 px-3 rounded-lg font-semibold text-xs transition-all cursor-pointer flex items-center justify-center whitespace-nowrap ${
                      partnerMode === 'signin'
                        ? 'bg-white text-[#0F172A] shadow-2xs border border-[#E2E8F0]/70'
                        : 'text-[#475569] hover:text-[#0F172A]'
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
                    className={`min-h-[36px] py-1.5 px-3 rounded-lg font-semibold text-xs transition-all cursor-pointer flex items-center justify-center whitespace-nowrap ${
                      partnerMode === 'register'
                        ? 'bg-white text-[#0F172A] shadow-2xs border border-[#E2E8F0]/70'
                        : 'text-[#475569] hover:text-[#0F172A]'
                    }`}
                  >
                    Become Partner
                  </button>
                </div>

                <form id="partnerForm" onSubmit={handlePartnerFormSubmit} className="space-y-4">
                  {partnerMode === 'register' && (
                    <div>
                      <label htmlFor="partner-name-input" className="block text-xs font-semibold text-[#0F172A] mb-1.5">
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
                        className="w-full h-11 px-3.5 rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] text-sm focus:bg-white focus:border-[#28a745] focus:ring-2 focus:ring-[#28a745]/15 focus:outline-none transition-all"
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="partner-email-input" className="block text-xs font-semibold text-[#0F172A] mb-1.5">
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
                        className="w-full h-11 pl-3.5 pr-10 rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] text-sm focus:bg-white focus:border-[#28a745] focus:ring-2 focus:ring-[#28a745]/15 focus:outline-none transition-all"
                      />
                      <Mail className="w-4 h-4 text-[#94A3B8] absolute right-3.5 pointer-events-none" />
                    </div>
                  </div>

                  {partnerMode === 'register' && (
                    <div>
                      <label htmlFor="partner-phone-input" className="block text-xs font-semibold text-[#0F172A] mb-1.5">
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
                          className="w-full h-11 pl-3.5 pr-10 font-mono rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] text-sm focus:bg-white focus:border-[#28a745] focus:ring-2 focus:ring-[#28a745]/15 focus:outline-none transition-all"
                        />
                        <Phone className="w-4 h-4 text-[#94A3B8] absolute right-3.5 pointer-events-none" />
                      </div>
                      <span className="text-[11px] text-[#64748B] mt-1 block">
                        Commission payouts are disbursed directly via Safaricom M-Pesa.
                      </span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="partner-password-input" className="block text-xs font-semibold text-[#0F172A]">
                        Password
                      </label>
                      {partnerMode === 'signin' && (
                        <button
                          type="button"
                          onClick={() => {
                            resetForgotPasswordFlowState();
                            setActiveTab('owner');
                            setIsForgotPasswordMode(true);
                            setOwnerEmailInput(partnerEmailInput);
                          }}
                          className="text-xs font-semibold text-[#28a745] hover:text-[#218838] hover:underline cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745]"
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
                        className="w-full h-11 pl-3.5 pr-11 rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] text-sm focus:bg-white focus:border-[#28a745] focus:ring-2 focus:ring-[#28a745]/15 focus:outline-none transition-all [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setShowPartnerPassword((prev) => !prev)}
                        aria-label={showPartnerPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPartnerPassword}
                        title={showPartnerPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2 z-10 p-1.5 rounded-lg text-[#475569] hover:text-[#0F172A] hover:bg-slate-200/60 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745]"
                      >
                        {showPartnerPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {partnerMode === 'register' && (
                    <div>
                      <label htmlFor="partner-code-input" className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                        Preferred Referral Code <span className="text-[#64748B] font-normal">(optional)</span>
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
                        className="w-full h-11 px-3.5 font-mono uppercase rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] text-sm focus:bg-white focus:border-[#28a745] focus:ring-2 focus:ring-[#28a745]/15 focus:outline-none transition-all"
                      />
                    </div>
                  )}

                  {partnerMode === 'register' && (
                    <label
                      htmlFor="partner-terms-consent"
                      className="flex items-start gap-2.5 p-2.5 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#475569] leading-relaxed cursor-pointer select-none min-h-[44px]"
                    >
                      <input
                        id="partner-terms-consent"
                        type="checkbox"
                        checked={acceptedPartnerTerms}
                        onChange={(e) => {
                          setAcceptedPartnerTerms(e.target.checked);
                          if (e.target.checked) setPartnerAuthError(null);
                        }}
                        className="mt-0.5 w-4 h-4 rounded border-[#CBD5E1] accent-[#28a745] cursor-pointer shrink-0"
                      />
                      <span>
                        I agree to the Sokoplus Horizon{' '}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            navigateToLegalPage('terms');
                          }}
                          className="font-semibold text-[#28a745] hover:underline cursor-pointer"
                        >
                          Terms &amp; 12-Month Liability Cap
                        </button>
                        ,{' '}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            navigateToLegalPage('privacy');
                          }}
                          className="font-semibold text-[#28a745] hover:underline cursor-pointer"
                        >
                          Privacy Policy
                        </button>
                        , and{' '}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            navigateToLegalPage('ownership');
                          }}
                          className="font-semibold text-[#28a745] hover:underline cursor-pointer"
                        >
                          IP Notice
                        </button>
                        .
                      </span>
                    </label>
                  )}

                  {/* Error alert banner */}
                  {partnerAuthError && (
                    <div className="p-3 rounded-[10px] bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs font-medium flex items-start gap-2 animate-in fade-in duration-150">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
                      <span>{partnerAuthError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isAuthTransitioning || isAuthenticatingPartner}
                    className="w-full h-11 bg-[#28a745] hover:bg-[#218838] active:scale-[0.99] disabled:opacity-60 text-white font-semibold text-sm rounded-[10px] transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745] focus-visible:ring-offset-2"
                  >
                    {isAuthTransitioning || isAuthenticatingPartner ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>
                          {isAuthTransitioning
                            ? 'Clearing previous session...'
                            : partnerMode === 'register'
                            ? 'Creating account...'
                            : 'Signing in...'}
                        </span>
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

            {/* TAB 2: STAFF SHIFT / PIN LOGIN */}
            {activeTab === 'staff' && (
              <div id="p-staff" className="space-y-3.5">
                <h2 id="auth-modal-title" className="sr-only">
                  Clock in to your till
                </h2>

                {/* STAFF ID / USERNAME INPUT OR APPOINTED DEMO CASHIER CARD */}
                {isDemoModeActive && !isEditingStaffId ? (
                  <div
                    className="border-2 border-[#28a745] bg-white rounded-2xl p-3 flex items-center justify-between shadow-2xs transition-all hover:shadow-xs"
                    id="selectedStaffCard"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl bg-[#28a745] text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-2xs"
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
                        <div className="text-xs text-[#556375] font-semibold font-mono tabular-nums truncate flex items-center gap-1.5 mt-0.5">
                          <span>{matchedStaff?.code || staffCredentialInput || '#7000'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsEditingStaffId(true)}
                      className="text-xs text-[#28a745] hover:text-[#218838] font-bold px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 transition cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      Switch cashier
                    </button>
                  </div>
                ) : (
                  <div className="border border-[#E2E8F0] bg-[#F8FAFC] rounded-xl p-3 space-y-1.5">
                    <label htmlFor="staff-credential-input" className="block text-xs font-semibold text-[#0F172A]">
                      Your Staff ID or username
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
                        placeholder="e.g. #1001 or cashier.a"
                        className="flex-1 h-10 px-3.5 rounded-[10px] border border-[#CBD5E1] bg-white text-[#0F172A] font-semibold text-sm focus:border-[#28a745] focus:ring-2 focus:ring-[#28a745]/15 focus:outline-none transition-all"
                      />
                      {isDemoModeActive && (
                        <button
                          type="button"
                          onClick={() => setIsEditingStaffId(false)}
                          className="h-10 px-3.5 bg-[#28a745] hover:bg-[#218838] text-white rounded-[10px] text-xs font-semibold transition cursor-pointer shrink-0"
                        >
                          Done
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* PIN SECTION */}
                <div className="pt-1 text-center">
                  <label htmlFor="staff-pin-entry-input" className="block text-xs font-semibold text-[#0F172A] mb-2">
                    Enter your 4-digit PIN
                  </label>

                  {/* Standard Obscured PIN Input Field with visibility toggle */}
                  <div className="relative flex items-center max-w-[220px] mx-auto mb-2">
                    <input
                      ref={pinInputRef}
                      type={showStaffPin ? 'text' : 'password'}
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
                      className="w-full h-11 pl-10 pr-10 text-center font-mono text-2xl tracking-[0.35em] rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] font-black focus:bg-white focus:border-[#28a745] focus:ring-2 focus:ring-[#28a745]/15 focus:outline-none transition-all select-none [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setShowStaffPin((prev) => !prev)}
                      aria-label={showStaffPin ? 'Hide PIN' : 'Show PIN'}
                      aria-pressed={showStaffPin}
                      title={showStaffPin ? 'Hide PIN' : 'Show PIN'}
                      className="absolute right-2 z-10 p-1.5 rounded-lg text-[#475569] hover:text-[#0F172A] hover:bg-slate-200/60 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745]"
                    >
                      {showStaffPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* 4 PIN Dots */}
                  <div className="flex justify-center gap-3.5 my-2" id="dots">
                    {[0, 1, 2, 3].map((idx) => {
                      const isFilled = idx < enteredPin.length;
                      return (
                        <span
                          key={idx}
                          className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                            isFilled
                              ? 'bg-[#28a745] border-[#28a745] scale-110 shadow-2xs'
                              : 'bg-[#F8FAFC] border-[#CBD5E1]'
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* PIN error alert */}
                  <div className="min-h-[20px] text-center text-xs text-[#B91C1C] font-semibold" id="perr" role="alert">
                    {pinError}
                  </div>
                </div>

                {/* Numeric Keypad */}
                <div className="grid grid-cols-3 gap-2 my-1" id="pad">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', '⌫'].map((k) => (
                    <button
                      key={k}
                      type="button"
                      className="h-12 sm:h-13 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] active:bg-[#28a745] active:text-white text-[#0F172A] font-bold text-lg sm:text-xl transition-all cursor-pointer flex items-center justify-center select-none font-mono tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745]"
                      onClick={() => handleKeypadPress(k)}
                    >
                      {k === '⌫' ? (
                        <Delete className="w-5 h-5 text-[#0e1a2b]" />
                      ) : k === 'Clear' ? (
                        <span className="text-xs sm:text-sm font-sans font-bold text-[#4c5a6b]">{k}</span>
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
                      className="text-[#28a745] hover:underline font-bold cursor-pointer font-mono tabular-nums"
                      id="fillPin"
                      onClick={handleFillDemoPin}
                    >
                      Tap for sample PIN (1234)
                    </button>
                  ) : (
                    <span className="text-xs text-[#556375] font-semibold">Individual cashier PIN</span>
                  )}
                  <span className="text-[11px] text-[#718096]">
                    {isAuthTransitioning
                      ? 'Clearing previous session...'
                      : isSubmittingTerminal
                      ? 'Opening your till...'
                      : 'Opens on 4th digit'}
                  </span>
                </div>
              </div>
            )}

            {/* TAB 3: REGISTER NEW SHOP */}
            {activeTab === 'register' && (
              <div id="p-register">
                <h2
                  id="auth-modal-title"
                  className="font-display text-xl sm:text-[22px] font-extrabold text-[#0F172A] tracking-tight mb-1 text-left"
                >
                  Set up your shop
                </h2>
                <p className="text-[13px] text-[#475569] leading-relaxed mb-4 text-left">
                  {isCheckoutContextActive && pendingCheckoutIntent
                    ? `Name your shop first—then pay for ${pendingCheckoutIntent.planName} (${pendingCheckoutIntent.billingCycle === 'annual' ? 'Annual' : 'Monthly'}) via M-Pesa or card.`
                    : 'Takes under 2 minutes. Track every shilling, M-Pesa sale, and stock item from day one.'}
                </p>
                <form id="regForm" onSubmit={handleRegisterFormSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5" htmlFor="shop">
                      Your shop or business name
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
                      className="w-full h-11 px-3.5 rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] text-sm focus:bg-white focus:border-[#28a745] focus:ring-2 focus:ring-[#28a745]/15 focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5" htmlFor="own">
                      Your email address
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
                        className="w-full h-11 pl-3.5 pr-10 rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] text-sm focus:bg-white focus:border-[#28a745] focus:ring-2 focus:ring-[#28a745]/15 focus:outline-none transition-all"
                      />
                      <Mail className="w-4 h-4 text-[#94A3B8] absolute right-3.5 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5" htmlFor="shop-pass">
                      Choose a password
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
                        className="w-full h-11 pl-3.5 pr-11 rounded-[10px] border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] text-sm focus:bg-white focus:border-[#28a745] focus:ring-2 focus:ring-[#28a745]/15 focus:outline-none transition-all [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setShowShopPassword((prev) => !prev)}
                        aria-label={showShopPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showShopPassword}
                        title={showShopPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2 z-10 p-1.5 rounded-lg text-[#475569] hover:text-[#0F172A] hover:bg-slate-200/60 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745]"
                      >
                        {showShopPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <label
                    htmlFor="shop-terms-consent"
                    className="flex items-start gap-2.5 p-2.5 rounded-[10px] bg-[#F8FAFC] border border-[#E2E8F0] text-[11px] text-[#475569] leading-relaxed cursor-pointer select-none min-h-[44px]"
                  >
                    <input
                      id="shop-terms-consent"
                      type="checkbox"
                      checked={acceptedShopTerms}
                      onChange={(e) => {
                        setAcceptedShopTerms(e.target.checked);
                        if (e.target.checked) setEmailAuthError(null);
                      }}
                      className="mt-0.5 w-4 h-4 rounded border-[#CBD5E1] accent-[#28a745] cursor-pointer shrink-0"
                    />
                    <span>
                      I accept the Sokoplus Horizon{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          navigateToLegalPage('terms');
                        }}
                        className="font-semibold text-[#28a745] hover:underline cursor-pointer"
                      >
                        Terms &amp; 12-Month Liability Cap
                      </button>
                      ,{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          navigateToLegalPage('privacy');
                        }}
                        className="font-semibold text-[#28a745] hover:underline cursor-pointer"
                      >
                        Privacy Policy
                      </button>
                      , and{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          navigateToLegalPage('ownership');
                        }}
                        className="font-semibold text-[#28a745] hover:underline cursor-pointer"
                      >
                        IP Notice
                      </button>
                      .
                    </span>
                  </label>

                  {/* Error alert banner */}
                  {emailAuthError && (
                    <div className="p-3 rounded-[10px] bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs font-medium flex items-start gap-2 animate-in fade-in duration-150">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
                      <span>{emailAuthError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isAuthTransitioning || isAuthenticatingEmail}
                    className="w-full h-11 bg-[#28a745] hover:bg-[#218838] active:scale-[0.99] disabled:opacity-60 text-white font-semibold text-sm rounded-[10px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745] focus-visible:ring-offset-2"
                  >
                    {isAuthTransitioning || isAuthenticatingEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{isAuthTransitioning ? 'Clearing previous session...' : 'Setting up your shop...'}</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {isCheckoutContextActive
                            ? 'Create shop & go to payment'
                            : 'Create my free shop'}
                        </span>
                        {isCheckoutContextActive && <ArrowRight className="w-4 h-4" />}
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Below Card Switcher: Hairline divider, prompt & subtle outlined secondary button */}
            <div className="border-t border-[#E2E8F0] pt-4 mt-5 text-center" id="below">
              <p className="text-xs text-[#475569] font-medium mb-2.5" id="belowText">
                {activeTab === 'register'
                  ? 'Already have a shop or partner account?'
                  : activeTab === 'partner'
                  ? 'Looking to set up your own retail shop?'
                  : isCheckoutContextActive
                  ? 'First time here? Set up your shop in 2 minutes:'
                  : 'Opening a new shop or branch?'}
              </p>
              <button
                type="button"
                id="belowBtn"
                onClick={() => {
                  if (activeTab === 'register') {
                    setActiveTab('owner');
                  } else {
                    setActiveTab('register');
                  }
                  setPinError(null);
                  setEmailAuthError(null);
                  setPartnerAuthError(null);
                }}
                className="w-full h-11 rounded-[10px] font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap bg-white text-[#0F172A] border border-[#CBD5E1] hover:bg-[#F8FAFC] hover:border-[#94A3B8] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#28a745] focus-visible:ring-offset-2"
              >
                {activeTab === 'register'
                  ? 'Sign in instead'
                  : 'Set up a new shop'}
              </button>
              <div className="mt-3.5 pt-1 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[11px] text-[#64748B]">
                <span className="font-medium text-[#64748B] whitespace-nowrap">SokoPoS&trade;</span>
                <span aria-hidden="true">&middot;</span>
                <button
                  type="button"
                  onClick={() => navigateToLegalPage('terms')}
                  className="font-medium text-[#475569] hover:text-[#28a745] hover:underline cursor-pointer whitespace-nowrap"
                >
                  Terms &amp; Liability Cap
                </button>
                <span aria-hidden="true">&middot;</span>
                <button
                  type="button"
                  onClick={() => navigateToLegalPage('privacy')}
                  className="font-medium text-[#475569] hover:text-[#28a745] hover:underline cursor-pointer whitespace-nowrap"
                >
                  Privacy
                </button>
                <span aria-hidden="true">&middot;</span>
                <button
                  type="button"
                  onClick={() => navigateToLegalPage('ownership')}
                  className="font-medium text-[#475569] hover:text-[#28a745] hover:underline cursor-pointer whitespace-nowrap"
                >
                  IP Notice
                </button>
              </div>
            </div>
            </div>
              </>
            )}
            </div>
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

