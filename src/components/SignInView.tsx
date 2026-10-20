import React, { useState, useEffect } from 'react';
import {
  Key,
  Building2,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  Store,
  Clock,
  ArrowRight,
  ArrowLeft,
  Fingerprint,
  Delete,
  Loader2,
  Zap,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Check,
  ChevronRight,
  Monitor,
  Printer,
  Receipt,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { soundFx } from '../utils/audio';
import { SignUpSkeleton } from './SignUpSkeleton';
import { LegalTab } from './LegalAndFaqModal';
import { LegalPageView } from './LegalPageView';
import { KenyaPaymentBadges } from './landing/KenyaPaymentBadges';
import { IndustrySolutionsSwitcher } from './landing/IndustrySolutionsSwitcher';
import { HardwareCompatibilityGuide } from './landing/HardwareCompatibilityGuide';
import { LegacyPosComparison } from './landing/LegacyPosComparison';
import { WhatsAppFloatingButton } from './landing/WhatsAppFloatingButton';
import { AppLogo } from './common/AppLogo';

interface SignInViewProps {
  onLoginSuccess?: () => void;
}

export const SignInView: React.FC<SignInViewProps> = ({ onLoginSuccess }) => {
  const {
    currentUser,
    loginWithGoogle,
    loginWithFirebaseGoogle,
    isFirebaseAuthLoading,
    loginWithCredentials,
    systemUsers,
    locations,
    showToast,
    loginBgGraphic,
    isRealGoogleAccount,
    platformLogo,
  } = usePos();

  const [activeTab, setActiveTab] = useState<'google' | 'terminal' | 'register'>('google');
  const [isFirebaseSigningIn, setIsFirebaseSigningIn] = useState(false);
  const [isRegisteringStore, setIsRegisteringStore] = useState(false);
  const [isSimulatingSkeleton, setIsSimulatingSkeleton] = useState(false);
  const [activeLegalPage, setActiveLegalPage] = useState<LegalTab | null>(null);

  // Synchronize URL hash with active legal page for browser history & direct links
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (hash === 'terms' || hash === 'tos') {
        setActiveLegalPage('terms');
      } else if (hash === 'privacy') {
        setActiveLegalPage('privacy');
      } else if (hash === 'faq') {
        setActiveLegalPage('faq');
      } else if (hash === 'ownership' || hash === 'legal' || hash === 'ip') {
        setActiveLegalPage('ownership');
      } else if (hash === 'compliance' || hash === 'gcp') {
        setActiveLegalPage('compliance');
      } else if (!hash) {
        setActiveLegalPage(null);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigateToLegalPage = (tab: LegalTab) => {
    setActiveLegalPage(tab);
    window.location.hash = `#${tab}`;
  };

  const returnToLogin = () => {
    setActiveLegalPage(null);
    if (window.location.hash) {
      window.history.pushState(null, '', window.location.pathname + window.location.search);
    }
  };


  // Terminal PIN / Staff login state
  const [selectedStaffId, setSelectedStaffId] = useState<string>(() => systemUsers[0]?.id || '');
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [customUsername, setCustomUsername] = useState<string>('');
  const [isCustomStaff, setIsCustomStaff] = useState<boolean>(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [isSubmittingTerminal, setIsSubmittingTerminal] = useState<boolean>(false);

  // New Store Registration form
  const [newStoreName, setNewStoreName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');

  // Accelerating Counter Animation for "KES 25M+" metric
  const [metricCount, setMetricCount] = useState<number>(1);

  useEffect(() => {
    // Accelerating count-up animation from 1 to 25
    const target = 25;
    const duration = 2200; // 2.2 seconds total duration
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    let animationFrameId: number;

    const animate = (timestamp?: number) => {
      const now = typeof timestamp === 'number' && !isNaN(timestamp)
        ? timestamp
        : (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const elapsed = Math.max(0, now - startTime);
      const progress = Math.max(0, Math.min(elapsed / duration, 1));

      // Accelerating curve (ease-in / exponential power curve: progress^2.5)
      // Starts slow and speeds up rapidly as it climbs to 25
      const easedProgress = Math.pow(progress, 2.5);
      const calculatedVal = Math.round(1 + (target - 1) * easedProgress);
      const currentVal = isNaN(calculatedVal) ? target : Math.max(1, Math.min(target, calculatedVal));

      setMetricCount(currentVal);

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
  }, []);

  // Keep selectedStaffId aligned if systemUsers changes
  useEffect(() => {
    if (!selectedStaffId && systemUsers.length > 0) {
      setSelectedStaffId(systemUsers[0].id);
    }
  }, [systemUsers, selectedStaffId]);

  // Handle physical keyboard for PIN
  useEffect(() => {
    if (activeTab !== 'terminal') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if focusing an input other than PIN
      if (document.activeElement?.tagName === 'INPUT' && (document.activeElement as HTMLInputElement).type !== 'password') {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        soundFx.playBarcodeBeep();
        setEnteredPin((prev) => (prev.length < 6 ? prev + e.key : prev));
        setPinError(null);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setEnteredPin((prev) => prev.slice(0, -1));
        setPinError(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleTerminalSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, enteredPin, selectedStaffId, isCustomStaff, customUsername]);

  const handleKeypadPress = (digit: string) => {
    soundFx.playBarcodeBeep();
    setPinError(null);
    if (enteredPin.length < 6) {
      setEnteredPin((prev) => prev + digit);
    }
  };

  const handleKeypadClear = () => {
    setEnteredPin('');
    setPinError(null);
  };

  const handleKeypadBackspace = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  const handleTerminalSubmit = async () => {
    if (isSubmittingTerminal) return;
    if (!enteredPin) {
      setPinError('Please enter your 4-digit PIN');
      soundFx.playError();
      return;
    }

    let usernameOrCode = '';
    if (isCustomStaff) {
      if (!customUsername.trim()) {
        setPinError('Please enter your staff username or code');
        soundFx.playError();
        return;
      }
      usernameOrCode = customUsername.trim();
    } else {
      const staff = systemUsers.find((u) => u.id === selectedStaffId);
      if (!staff) {
        setPinError('Please select a staff profile');
        return;
      }
      usernameOrCode = staff.username || staff.code || staff.name;
    }

    setIsSubmittingTerminal(true);
    setPinError(null);
    try {
      const success = await loginWithCredentials(usernameOrCode, enteredPin);
      if (success) {
        onLoginSuccess?.();
      } else {
        setPinError('Incorrect PIN or unauthorized staff account');
        setEnteredPin('');
        soundFx.playError();
      }
    } catch (err: any) {
      setPinError(err?.message || 'Authentication error. Please retry.');
      setEnteredPin('');
      soundFx.playError();
    } finally {
      setIsSubmittingTerminal(false);
    }
  };

  const handleRegisterStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim() || !newOwnerEmail.trim()) {
      showToast('Store name and Google owner email are required', 'error');
      return;
    }
    if (!isRealGoogleAccount(newOwnerEmail.trim())) {
      showToast('A verified Google Account email (e.g. name@gmail.com) is required to register as store owner.', 'error');
      return;
    }
    setIsRegisteringStore(true);
    try {
      // Allow structural skeleton shimmer to render with deliberate continuity
      await new Promise((resolve) => setTimeout(resolve, 450));
      const success = loginWithGoogle(
        newOwnerEmail.trim(),
        newOwnerName.trim() || 'Store Owner',
        newStoreName.trim()
      );
      if (success) {
        onLoginSuccess?.();
      }
    } finally {
      setIsRegisteringStore(false);
    }
  };

  const handleLaunchDemoSandbox = () => {
    const ok = loginWithGoogle('upfrontretaile@gmail.com', 'Platform Administrator');
    if (ok) {
      showToast('Welcome to SokoPoS Interactive Demo Sandbox! Explore products, test M-Pesa checkout, or view live analytics.', 'success');
      onLoginSuccess?.();
    }
  };

  const scrollToAuthCard = (targetTab?: 'google' | 'terminal' | 'register') => {
    if (targetTab) setActiveTab(targetTab);
    const el = document.getElementById('auth-card-container');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const activeStaffMember = systemUsers.find((u) => u.id === selectedStaffId);

  // Render Full-Page Legal, FAQ, or Compliance view as the Body of this SPA (Zero floating modals)
  if (activeLegalPage) {
    return (
      <LegalPageView
        currentTab={activeLegalPage}
        onTabChange={navigateToLegalPage}
        onBackToLogin={returnToLogin}
        loginBgGraphic={loginBgGraphic}
      />
    );
  }

  // Structural Skeleton Shimmer Gate while checking initial Firebase session
  if (isFirebaseAuthLoading) {
    return (
      <div
        id="pos-login-page"
        className="min-h-full w-full bg-slate-950 flex flex-col justify-between text-slate-100 font-sans selection:bg-blue-600 selection:text-white"
      >
        <header className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50 backdrop-blur-md shrink-0">
          <AppLogo theme="dark" size="md" />
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto py-8">
          <SignUpSkeleton
            theme="dark"
            mode="signup"
            message="Connecting POS terminal & checking secure session..."
          />
        </main>

        <footer className="px-6 py-4 border-t border-slate-800/80 bg-slate-900/40 text-center text-xs text-slate-400 shrink-0">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px]">
            <div className="flex items-center gap-1.5 flex-wrap justify-center text-slate-400">
              <span>© 2026 SokoPoS Enterprise Platform</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-center font-medium">
              <button
                type="button"
                onClick={() => navigateToLegalPage('terms')}
                className="text-slate-400 hover:text-blue-400 transition cursor-pointer"
              >
                Terms of Service
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={() => navigateToLegalPage('privacy')}
                className="text-slate-400 hover:text-blue-400 transition cursor-pointer"
              >
                Privacy Policy
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={() => navigateToLegalPage('faq')}
                className="text-blue-400 hover:text-blue-300 font-semibold transition cursor-pointer"
              >
                FAQ
              </button>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div
      id="pos-login-page"
      className={`min-h-full w-full flex flex-col justify-between text-slate-100 font-sans selection:bg-blue-600 selection:text-white relative overflow-x-clip ${
        loginBgGraphic ? 'bg-slate-950/40 backdrop-blur-[2px]' : 'bg-slate-950'
      }`}
      style={
        loginBgGraphic
          ? {
              backgroundImage: `url(${loginBgGraphic})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundAttachment: 'fixed',
            }
          : undefined
      }
    >
      {/* Full-bleed background darkening overlay when custom graphic is active for WCAG AA contrast */}
      {loginBgGraphic && (
        <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px] pointer-events-none z-0" />
      )}

      {/* Top Navigation Bar: Brand, Solutions Navigation, and Demo Actions */}
      <header
        className={`px-4 sm:px-8 py-3.5 border-b flex items-center justify-between shrink-0 sticky top-0 z-50 ${
          loginBgGraphic
            ? 'border-white/10 bg-slate-950/95 backdrop-blur-md shadow-md shadow-black/30'
            : 'border-slate-800/80 bg-slate-950/95 backdrop-blur-md shadow-md shadow-black/30'
        }`}
      >
        {/* Brand */}
        <AppLogo theme="dark" size="md" />

        {/* Quick Nav Anchors for Desktop Visitors */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-slate-300">
          <a href="#industry-solutions" className="hover:text-blue-400 transition">
            Solutions
          </a>
          <a href="#kenya-payments" className="hover:text-blue-400 transition">
            M-Pesa & eTIMS
          </a>
          <a href="#hardware-guide" className="hover:text-blue-400 transition">
            Hardware Freedom
          </a>
          <a href="#pricing-comparison" className="hover:text-blue-400 transition">
            Why SokoPoS
          </a>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {currentUser ? (
            <button
              type="button"
              id="top-nav-pos-terminal-btn"
              onClick={onLoginSuccess}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Enter POS Terminal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              id="top-nav-demo-btn"
              onClick={handleLaunchDemoSandbox}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-white text-white" />
              <span className="hidden xs:inline">Interactive</span>
              <span>Demo</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => scrollToAuthCard('terminal')}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 hover:text-white font-bold text-xs border border-slate-700/70 transition cursor-pointer flex items-center gap-1.5"
          >
            <Fingerprint className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Cashier</span>
            <span>PIN</span>
          </button>
        </div>
      </header>

      {/* Main Container with Full Landing Flow */}
      <main className="flex-1 flex flex-col relative z-10 w-full overflow-x-clip">
        {/* Soft Ambient Radial Glow for Depth */}
        <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-1" />

        {/* SECTION: HERO SHOWCASE (Dual-Column: Pitch on Left, Auth on Right) */}
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-12 pb-10 sm:pb-16 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column (7 cols): High-Impact Value Pitch & Quick Demo Launcher */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.12]">
                The High-Velocity POS Built for Kenyan Retailers, Bars & Supermarkets
              </h1>

              {/* Logged-In Active User Session Banner */}
              {currentUser && (
                <div className="p-3.5 sm:p-4 bg-emerald-950/70 border border-emerald-500/40 rounded-2xl flex items-center justify-between gap-3 text-left shadow-lg animate-in fade-in">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm shrink-0 border border-emerald-500/30">
                      {currentUser.initials}
                    </div>
                    <div className="text-xs min-w-0">
                      <div className="font-bold text-white flex items-center gap-2 truncate">
                        <span>Logged in as {currentUser.name}</span>
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                          Active Session
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {currentUser.businessName || currentUser.email}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onLoginSuccess}
                    className="bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-md"
                  >
                    <span>Enter Terminal</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Primary Dual Action CTAs */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
                <button
                  type="button"
                  id="hero-launch-demo-btn"
                  onClick={currentUser ? onLoginSuccess : handleLaunchDemoSandbox}
                  className="primary-cta-shimmer w-full sm:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm sm:text-base flex items-center justify-center gap-3 cursor-pointer group"
                >
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/20 text-white shadow-inner shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                    {currentUser ? <Monitor className="w-3.5 h-3.5 text-white" /> : <Zap className="w-3.5 h-3.5 fill-white text-white" />}
                  </span>
                  <span className="tracking-tight">{currentUser ? 'Launch POS Terminal' : 'Launch Interactive Demo Sandbox'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  type="button"
                  id="hero-setup-new-store-btn"
                  onClick={() => scrollToAuthCard('register')}
                  className="w-full sm:w-auto px-5 py-4 rounded-2xl bg-[#DC2626] hover:bg-[#b91c1c] active:bg-[#991b1b] text-white font-bold text-sm border border-red-700 shadow-lg shadow-red-600/30 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Store className="w-4 h-4 text-white" />
                  <span>Set Up a New Store</span>
                </button>
              </div>

              {/* Subtitle Under CTA */}
              <div className="flex items-center justify-center lg:justify-start gap-3 text-xs text-slate-400 flex-wrap">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  5-Second Live Sandbox
                </span>
                <span>•</span>
                <span>No Credit Card</span>
                <span>•</span>
                <span>Instant Pre-loaded Inventory</span>
              </div>

              {/* Live Metric Stats Banner - Translucent white background with black text */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-slate-800/80">
                <div className="bg-white/85 backdrop-blur-md p-3 rounded-2xl border border-white/60 text-center lg:text-left shadow-md text-black">
                  <div className="text-base sm:text-lg font-black text-black tracking-tight">
                    <span>KES </span>
                    <span className="tabular-nums font-mono">{String(isNaN(metricCount) ? 25 : metricCount)}</span>
                    <span>M+</span>
                  </div>
                  <div className="text-[10px] text-neutral-800 font-semibold">Monthly Processed</div>
                </div>
                <div className="bg-white/85 backdrop-blur-md p-3 rounded-2xl border border-white/60 text-center lg:text-left shadow-md text-black">
                  <div className="text-base sm:text-lg font-black text-black">100%</div>
                  <div className="text-[10px] text-neutral-800 font-semibold">Offline Resilient</div>
                </div>
                <div className="bg-white/85 backdrop-blur-md p-3 rounded-2xl border border-white/60 text-center lg:text-left shadow-md text-black">
                  <div className="text-base sm:text-lg font-black text-black">&lt; 18s</div>
                  <div className="text-[10px] text-neutral-800 font-semibold">Avg Checkout Speed</div>
                </div>
                <div className="bg-white/85 backdrop-blur-md p-3 rounded-2xl border border-white/60 text-center lg:text-left shadow-md text-black">
                  <div className="text-base sm:text-lg font-black text-black">eTIMS</div>
                  <div className="text-[10px] text-neutral-800 font-semibold">Digitax Partner</div>
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Embedded Frictionless Auth Card - Translucent white background with black text */}
            <div id="auth-card-container" className="lg:col-span-5 flex justify-center w-full">
              <div
                className="w-full max-w-[360px] xs:max-w-[390px] sm:max-w-[420px] rounded-[28px] sm:rounded-[32px] shadow-2xl overflow-hidden my-auto transition-all border border-white/60 bg-white/90 backdrop-blur-xl shadow-black/40 text-black"
              >
                {/* Top Section */}
                <div className="p-4.5 sm:p-6 pt-4.5 sm:pt-6">
            {/* If in New Store Registration mode, display Back Navigation Header */}
            {activeTab === 'register' ? (
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('google')}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-black font-semibold transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Login</span>
                </button>
              </div>
            ) : (
              /* Segmented Mode Selector: [ Login ] [ PIN Pad ] */
              <div className="grid grid-cols-2 gap-1.5 bg-neutral-100 p-1.5 rounded-2xl border border-neutral-200">
                <button
                  type="button"
                  id="login-tab-btn"
                  onClick={() => setActiveTab('google')}
                  className={`py-2.5 sm:py-3 px-3 rounded-xl text-sm sm:text-base font-bold transition flex items-center justify-center cursor-pointer ${
                    activeTab === 'google'
                      ? 'bg-white text-black shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 font-medium'
                  }`}
                >
                  Login
                </button>

                <button
                  type="button"
                  id="pin-tab-btn"
                  onClick={() => setActiveTab('terminal')}
                  className={`py-2.5 sm:py-3 px-3 rounded-xl text-sm sm:text-base font-bold transition flex items-center justify-center cursor-pointer ${
                    activeTab === 'terminal'
                      ? 'bg-white text-black shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900 font-medium'
                  }`}
                >
                  PIN Pad
                </button>
              </div>
            )}

            {/* TAB 1: GOOGLE OAUTH */}
            {activeTab === 'google' && (
              <div className="pt-1">
                <h1 className="text-black font-extrabold text-xl sm:text-[24px] tracking-tight text-center my-6 sm:my-7 leading-tight">
                  Log In to POS Terminal
                </h1>

                {/* Primary: Live Firebase Google Button */}
                <button
                  type="button"
                  id="continue-with-google-btn"
                  disabled={isFirebaseSigningIn}
                  onClick={async () => {
                    setIsFirebaseSigningIn(true);
                    try {
                      const ok = await loginWithFirebaseGoogle();
                      if (ok) {
                        onLoginSuccess?.();
                      }
                    } finally {
                      setIsFirebaseSigningIn(false);
                    }
                  }}
                  className="primary-cta-shimmer w-full bg-[#1d8af3] hover:bg-[#167edb] active:bg-[#1270c5] text-white font-bold text-base sm:text-lg py-3.5 sm:py-4 px-4 rounded-2xl transition shadow-lg flex items-center justify-center gap-3.5 cursor-pointer disabled:opacity-60"
                >
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-xs shrink-0 p-1">
                    <svg className="w-4.5 h-4.5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  </div>
                  {isFirebaseSigningIn ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Opening Google Auth...</span>
                    </span>
                  ) : (
                    <span>Continue with Google</span>
                  )}
                </button>

                {isFirebaseSigningIn && (
                  <div className="mt-2.5 flex items-center justify-between px-2 text-[11px] text-neutral-800 bg-white/90 p-2 rounded-xl border border-neutral-200 animate-in fade-in">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                      Waiting for Google account approval...
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsFirebaseSigningIn(false)}
                      className="text-[11px] text-red-600 hover:text-red-700 font-semibold cursor-pointer px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}

              </div>
            )}

            {/* TAB 2: TERMINAL KEYPAD PIN */}
            {activeTab === 'terminal' && (
              <div className="pt-1 space-y-3 text-black">
                <h1 className="text-black font-extrabold text-lg sm:text-xl tracking-tight text-center mt-3 mb-2 leading-tight">
                  Log In to POS Terminal
                </h1>

                {/* Staff Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-neutral-800 flex items-center gap-1">
                      <User className="w-3 h-3 text-blue-600" />
                      Cashier / Staff Profile:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomStaff(!isCustomStaff);
                        setEnteredPin('');
                        setPinError(null);
                      }}
                      className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer"
                    >
                      {isCustomStaff ? 'Select from list' : 'Custom username'}
                    </button>
                  </div>

                  {isCustomStaff ? (
                    <input
                      type="text"
                      value={customUsername}
                      onChange={(e) => setCustomUsername(e.target.value)}
                      placeholder="Staff username or badge code (e.g. john.mutua or #8841)"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg text-black focus:outline-none focus:border-blue-500 font-medium"
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {systemUsers.map((staff) => {
                        const isSelected = staff.id === selectedStaffId;
                        return (
                          <button
                            key={staff.id}
                            type="button"
                            onClick={() => {
                              setSelectedStaffId(staff.id);
                              setEnteredPin('');
                              setPinError(null);
                            }}
                            className={`p-1.5 rounded-lg border text-left text-xs transition cursor-pointer flex items-center gap-2 ${
                              isSelected
                                ? 'bg-blue-50 border-blue-500 text-black font-bold'
                                : 'bg-white border-neutral-200 text-neutral-800 hover:border-neutral-400'
                            }`}
                          >
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 ${
                                staff.avatarColor || 'bg-blue-600'
                              }`}
                            >
                              {staff.initials}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-[11px] font-semibold">{staff.name}</div>
                              <div className="text-[9px] text-neutral-500">
                                {staff.code} • {staff.role}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* PIN Display & Masked Dots - Translucent white card */}
                <div className="bg-white/90 border border-neutral-200 rounded-xl p-2.5 text-center shadow-xs">
                  <div className="text-[10px] font-bold text-neutral-800 uppercase tracking-wider mb-1">
                    ENTER 4-DIGIT PIN
                  </div>

                  {/* Animated PIN Dots */}
                  <div className="flex items-center justify-center gap-2.5 my-1.5">
                    {[0, 1, 2, 3].map((index) => {
                      const isFilled = index < enteredPin.length;
                      return (
                        <div
                          key={index}
                          className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                            isFilled
                              ? 'bg-blue-600 scale-110 shadow-sm shadow-blue-500/50'
                              : 'bg-neutral-200 border border-neutral-300'
                          }`}
                        />
                      );
                    })}
                  </div>

                  {pinError ? (
                    <div className="text-[11px] text-red-600 font-semibold mt-1 flex items-center justify-center gap-1 animate-shake">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{pinError}</span>
                    </div>
                  ) : (
                    <div className="text-[9px] text-neutral-500">
                      Enter registered 4-digit PIN
                    </div>
                  )}
                </div>

                {/* Touch Numeric Keypad */}
                <div className="grid grid-cols-3 gap-1.5 max-w-[260px] mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleKeypadPress(digit)}
                      className="h-10 rounded-lg bg-white/90 hover:bg-neutral-100 active:bg-blue-600 text-base font-black text-black border border-neutral-200 transition shadow-xs flex items-center justify-center cursor-pointer select-none"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleKeypadClear}
                    className="h-10 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-[10px] font-bold text-neutral-700 border border-neutral-200 transition flex items-center justify-center cursor-pointer select-none"
                  >
                    CLEAR
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="h-10 rounded-lg bg-white/90 hover:bg-neutral-100 active:bg-blue-600 text-base font-black text-black border border-neutral-200 transition shadow-xs flex items-center justify-center cursor-pointer select-none"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleKeypadBackspace}
                    className="h-10 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-neutral-700 border border-neutral-200 transition flex items-center justify-center cursor-pointer select-none"
                  >
                    <Delete className="w-4 h-4" />
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleTerminalSubmit}
                  disabled={enteredPin.length < 4 || isSubmittingTerminal}
                  className="w-full bg-[#1d8af3] hover:bg-[#167edb] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmittingTerminal ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Fingerprint className="w-3.5 h-3.5" />
                  )}
                  <span>{isSubmittingTerminal ? 'Verifying...' : 'Clock In & Start Shift'}</span>
                </button>

                {/* Demo Helper for Cashier PIN */}
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    id="auto-fill-demo-pin-btn"
                    onClick={() => {
                      if (systemUsers.length > 0) {
                        setSelectedStaffId(systemUsers[0].id);
                      }
                      setEnteredPin('1234');
                      setPinError(null);
                    }}
                    className="text-[11px] text-neutral-600 hover:text-blue-600 transition font-medium cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Demo Staff PIN: <strong className="text-black font-mono">1234</strong> (Click to fill)</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: REGISTER NEW STORE */}
            {activeTab === 'register' && (
              isRegisteringStore || isSimulatingSkeleton ? (
                <div className="relative text-black">
                  <div className="px-2 pt-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                      {isSimulatingSkeleton ? 'Skeleton Animation Preview' : 'Store Provisioning'}
                    </span>
                    {isSimulatingSkeleton && (
                      <button
                        type="button"
                        onClick={() => setIsSimulatingSkeleton(false)}
                        className="text-xs text-neutral-500 hover:text-black underline cursor-pointer"
                      >
                        Exit Preview
                      </button>
                    )}
                  </div>
                  <SignUpSkeleton
                    variant="form-only"
                    theme="dark"
                    mode="signup"
                    message={
                      isSimulatingSkeleton
                        ? 'Low-contrast diagonal shimmer sweep over layout placeholders'
                        : 'Setting up store tenant & configuring Google owner credentials...'
                    }
                  />
                </div>
              ) : (
                <form onSubmit={handleRegisterStoreSubmit} className="space-y-3 pt-1 text-black">
                  <h1 className="text-black font-bold text-xl tracking-tight text-center mb-1">
                    Set Up a New Store
                  </h1>
                  <p className="text-[11px] text-neutral-600 text-center mb-3">
                    Register a retail location. Google Account receives full administrative ownership.
                  </p>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-800 mb-1">
                      Store / Business Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newStoreName}
                      onChange={(e) => setNewStoreName(e.target.value)}
                      placeholder="e.g. Mombasa Coastal Grocers"
                      className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-xl text-black placeholder:text-neutral-400 focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-800 mb-1">
                      Business Owner Google Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={newOwnerEmail}
                      onChange={(e) => setNewOwnerEmail(e.target.value)}
                      placeholder="e.g. owner@coastal-grocers.com"
                      className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-xl text-black placeholder:text-neutral-400 focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-800 mb-1">
                      Owner Full Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={newOwnerName}
                      onChange={(e) => setNewOwnerName(e.target.value)}
                      placeholder="e.g. Fatuma Ali"
                      className="w-full px-3 py-2 text-xs bg-white border border-neutral-300 rounded-xl text-black placeholder:text-neutral-400 focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div className="pt-1.5">
                    <button
                      type="submit"
                      className="w-full bg-[#1d8af3] hover:bg-[#167edb] text-white font-bold text-xs py-2.5 px-4 rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>Create Store & Proceed</span>
                    </button>
                  </div>
                </form>
              )
            )}
          </div>

          {/* Bottom Footer Section - Translucent white background with black text */}
          <div className="bg-white/95 px-5 sm:px-6 py-5 sm:py-6 border-t border-neutral-200 space-y-3.5 text-center text-black">
            {activeTab === 'register' ? (
              <>
                <p className="text-neutral-700 font-normal text-sm sm:text-base">
                  Already have a registered location?
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('google')}
                  className="w-full bg-neutral-900 hover:bg-black active:bg-neutral-800 text-white font-bold text-sm sm:text-base py-3 sm:py-3.5 px-5 rounded-2xl shadow-md flex items-center justify-center gap-2.5 transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-white shrink-0" />
                  <span>Return to Login</span>
                </button>
              </>
            ) : (
              <>
                <p className="text-neutral-700 font-normal text-sm sm:text-base">
                  Need to register a new location?
                </p>

                <button
                  type="button"
                  id="setup-new-store-btn"
                  onClick={() => setActiveTab('register')}
                  className="w-full bg-[#DC2626] hover:bg-[#b91c1c] active:bg-[#991b1b] text-white font-bold text-sm sm:text-base py-3 sm:py-3.5 px-5 rounded-2xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2.5 transition cursor-pointer border border-red-700"
                >
                  <Store className="w-5 h-5 text-white stroke-[2] shrink-0" />
                  <span>Set Up a New Store</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  </section>

  {/* SECTION 1: KENYA PAYMENT & COMPLIANCE BADGES */}
  <KenyaPaymentBadges />

  {/* SECTION 2: INTERACTIVE INDUSTRY SOLUTIONS SWITCHER */}
  <IndustrySolutionsSwitcher onLaunchDemo={handleLaunchDemoSandbox} />

  {/* SECTION 3: HARDWARE COMPATIBILITY GUIDE & SAVINGS CALCULATOR */}
  <HardwareCompatibilityGuide onLaunchDemo={handleLaunchDemoSandbox} />

  {/* SECTION 4: LEGACY POS COMPARISON (SOKOPOS VS SIMBAPOS / DESKTOP) */}
  <LegacyPosComparison />

  {/* SECTION 5: FINAL CONVERSION BANNER */}
  <section className="w-full py-14 px-4 sm:px-6 bg-gradient-to-b from-[#0e141f] to-slate-950 border-t border-slate-800 text-center relative">
    <div className="max-w-3xl mx-auto space-y-5">
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
        Launch in 30 Seconds.
      </h2>

      <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
        Test our live terminal right in your browser now with pre-loaded inventory, or register your retail location with your Google Account for full ownership.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleLaunchDemoSandbox}
          className="primary-cta-shimmer w-full sm:w-auto px-7 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md cursor-pointer transition group"
        >
          <Zap className="w-4 h-4 fill-white text-white group-hover:scale-110 transition-transform" />
          <span>Launch Interactive Demo Sandbox</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          type="button"
          onClick={() => scrollToAuthCard('register')}
          className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-[#DC2626] hover:bg-[#b91c1c] active:bg-[#991b1b] text-white font-bold text-sm border border-red-700 shadow-lg shadow-red-600/30 cursor-pointer transition"
        >
          Set Up a New Store Free
        </button>
      </div>
    </div>
  </section>
</main>

{/* Floating WhatsApp Action Button */}
<WhatsAppFloatingButton phoneNumber="+254740463021" />

{/* Footer System Disclaimer with Legal & FAQ Links */}
<footer
  className={`px-6 pt-6 pb-24 sm:pb-7 border-t text-center text-xs text-slate-400 shrink-0 relative z-10 ${
    loginBgGraphic
      ? 'border-white/10 bg-slate-950/70 backdrop-blur-md'
      : 'border-slate-800/80 bg-slate-950/90'
  }`}
>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] sm:pr-72">
          {/* Brand Logo & Copyright statement */}
          <div className="flex items-center gap-2.5 flex-wrap justify-center text-slate-400">
            <AppLogo theme="dark" size="sm" />
            <span className="hidden sm:inline text-slate-600">•</span>
            <span>© 2026 SokoPoS Enterprise Platform</span>
          </div>

          {/* Legal Navigation Links */}
          <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap justify-center font-medium">
            <button
              type="button"
              id="footer-terms-btn"
              onClick={() => navigateToLegalPage('terms')}
              className="text-slate-400 hover:text-blue-400 transition cursor-pointer"
            >
              Terms of Service
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              id="footer-privacy-btn"
              onClick={() => navigateToLegalPage('privacy')}
              className="text-slate-400 hover:text-blue-400 transition cursor-pointer"
            >
              Privacy Policy
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              id="footer-faq-btn"
              onClick={() => navigateToLegalPage('faq')}
              className="text-blue-400 hover:text-blue-300 font-semibold transition cursor-pointer flex items-center gap-1"
            >
              <span>FAQ</span>
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              id="footer-legal-notice-btn"
              onClick={() => navigateToLegalPage('ownership')}
              className="text-slate-400 hover:text-blue-400 transition cursor-pointer"
            >
              Legal & IP
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
