import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Smartphone,
  Receipt,
  CheckCircle2,
  Layers,
  Cpu,
  Printer,
  Scan,
  ShoppingBag,
  Pill,
  Wine,
  ShieldCheck,
  Wifi,
  WifiOff,
  MessageCircle,
  Globe,
  ChevronRight,
  CreditCard,
  Monitor,
  User,
  ArrowRight,
  Clock,
  Settings,
  Zap,
  Sparkles,
  BarChart3,
  Package,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { usePos } from '../../context/PosContext';

export interface MobileBentoMenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateSection?: (sectionId: string) => void;
  onNavigatePricing?: () => void;
  onAuthAction?: () => void;
  onNavigateTab?: (tab: 'register' | 'inventory' | 'suppliers' | 'analytics' | 'reports' | 'cloud-sync' | 'staff' | 'shifts' | 'customers' | 'settings' | 'super-admin') => void;
  isLoggedIn?: boolean;
}

export const MobileBentoMenuOverlay: React.FC<MobileBentoMenuOverlayProps> = ({
  isOpen,
  onClose,
  onNavigateSection,
  onNavigatePricing,
  onAuthAction,
  onNavigateTab,
  isLoggedIn = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Safe POS context extraction
  let posContext: ReturnType<typeof usePos> | null = null;
  try {
    posContext = usePos();
  } catch (e) {
    posContext = null;
  }

  const isOnline = posContext?.isOnline ?? true;
  const setIsOnline = posContext?.setIsOnline;
  const currentUser = posContext?.currentUser;
  const currentBusiness = posContext?.currentBusiness;
  const activeShift = posContext?.activeShift;

  const [currency, setCurrency] = useState<'KES' | 'USD'>('KES');
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [activeStkStep, setActiveStkStep] = useState<number>(0);

  // Animated mini STK Push sequence inside the Hero Card
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setActiveStkStep((prev) => (prev + 1) % 3);
    }, 2800);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Lock body scroll and set up accessibility focus trap & Escape key
  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element for restoration
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Lock background scrolling
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';

    // Auto-focus close button
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus trapping inside overlay
      if (e.key === 'Tab' && containerRef.current) {
        const focusables = containerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleHeroClick = () => {
    onClose();
    if (onNavigateSection) {
      onNavigateSection('kenya-payments');
    } else if (onNavigateTab) {
      onNavigateTab('settings');
    }
  };

  const handleIndustryClick = (industry: string) => {
    onClose();
    if (onNavigateSection) {
      onNavigateSection('industry-solutions');
    } else if (onNavigateTab) {
      onNavigateTab('register');
    }
  };

  const handleHardwareClick = () => {
    onClose();
    if (onNavigateSection) {
      onNavigateSection('hardware-guide');
    } else if (onNavigateTab) {
      onNavigateTab('settings');
    }
  };

  const handleWhatsAppClick = () => {
    const text = encodeURIComponent('Hello SokoPoS Team! I am interested in Kenya Payments, eTIMS compliance, and POS setup.');
    window.open(`https://wa.me/254700000000?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation Bento Grid Menu"
      aria-expanded={isOpen}
      className="fixed inset-0 z-50 bg-slate-950/96 backdrop-blur-xl text-slate-100 flex flex-col justify-between overflow-y-auto modal-scrollbar overscroll-none animate-in fade-in duration-300 select-none"
    >
      {/* Background Ambient Glow Orbs */}
      <div className="absolute top-1/4 -left-32 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 -right-32 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-950/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 p-0.5 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="text-sm font-black tracking-tight text-white flex items-center gap-2">
              <span>SOKOPOS</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                BENTO MENU
              </span>
            </div>
            {currentBusiness ? (
              <div className="text-[10px] text-slate-400 font-medium truncate max-w-[160px]">
                {currentBusiness.name}
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 font-medium">
                Retail &amp; POS Suite Kenya
              </div>
            )}
          </div>
        </div>

        {/* Dismissal Close (X) Button */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close menu overlay"
          className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Main Bento Grid Container */}
      <main className="flex-1 px-4 sm:px-6 py-5 max-w-lg mx-auto w-full space-y-4">
        {/* Bento Grid Header Title */}
        <div className="flex items-center justify-between px-1 animate-bento-cascade opacity-0" style={{ animationDelay: '30ms' }}>
          <span className="text-xs font-mono uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Product Ecosystem &amp; Navigation
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            Tap cards to open
          </span>
        </div>

        {/* Bento Grid Structure */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* HERO BENTO CARD (Span 2 / Full Width) */}
          <div
            onClick={handleHeroClick}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleHeroClick();
              }
            }}
            className="sm:col-span-2 group relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-emerald-950/40 p-4 sm:p-5 shadow-xl transition-all duration-300 hover:border-emerald-400/60 hover:shadow-2xl hover:shadow-emerald-500/10 cursor-pointer active:scale-[0.99] animate-bento-cascade opacity-0"
            style={{ animationDelay: '80ms' }}
          >
            {/* Top Row: Active Green M-Pesa Badge & Title */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Active Green M-Pesa &amp; eTIMS</span>
              </div>
              <div className="text-[10px] font-mono font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                STK Instant
              </div>
            </div>

            {/* Hero Card Copy */}
            <div className="space-y-1 mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center justify-between group-hover:text-emerald-300 transition-colors">
                <span>Kenya Payments &amp; eTIMS Compliance</span>
                <ChevronRight className="w-5 h-5 text-emerald-400 transition-transform group-hover:translate-x-1" />
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-md">
                1-tap dynamic M-Pesa STK push, QR code receipt checkout, and automated KRA eTIMS tax invoice verification.
              </p>
            </div>

            {/* Miniature Animated Receipt / STK Push Graphic */}
            <div className="relative mt-3 rounded-xl bg-slate-950/80 border border-emerald-500/20 p-3 shadow-inner overflow-hidden">
              <div className="flex items-center justify-between text-[11px] font-mono border-b border-white/10 pb-2 mb-2">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>STK Push Demo</span>
                </div>
                <span className="text-slate-400">eTIMS CU: #098-441</span>
              </div>

              {/* Animated STK States */}
              <div className="space-y-2">
                {activeStkStep === 0 && (
                  <div className="flex items-center justify-between bg-emerald-950/40 border border-emerald-500/30 p-2 rounded-lg text-xs animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 text-slate-200">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <span>Sending M-Pesa prompt to customer phone...</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">KES 1,250</span>
                  </div>
                )}

                {activeStkStep === 1 && (
                  <div className="flex items-center justify-between bg-blue-950/40 border border-blue-500/30 p-2 rounded-lg text-xs animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 text-slate-200">
                      <Smartphone className="w-4 h-4 text-blue-400 animate-bounce" />
                      <span>Customer entering M-Pesa PIN...</span>
                    </div>
                    <span className="font-mono font-bold text-blue-300">Prompting...</span>
                  </div>
                )}

                {activeStkStep === 2 && (
                  <div className="flex items-center justify-between bg-emerald-900/50 border border-emerald-400/50 p-2 rounded-lg text-xs animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 text-emerald-300 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>STK Paid &amp; eTIMS Tax Invoice Generated!</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-300">VERIFIED</span>
                  </div>
                )}

                {/* Animated receipt paper visual lines */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                  <div className="flex items-center gap-1">
                    <Receipt className="w-3 h-3 text-slate-500" />
                    <span>VAT 16% Tax Included</span>
                  </div>
                  <span className="text-emerald-400 font-bold">100% Offline-Ready</span>
                </div>
              </div>
            </div>
          </div>

          {/* SPLIT CARD 1: Industry Solutions */}
          <div
            onClick={() => handleIndustryClick('solutions')}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleIndustryClick('solutions');
              }
            }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-lg transition-all duration-300 hover:border-blue-400/50 hover:bg-slate-900 cursor-pointer active:scale-[0.99] flex flex-col justify-between animate-bento-cascade opacity-0"
            style={{ animationDelay: '150ms' }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Layers className="w-4 h-4" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
              </div>

              <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                Industry Solutions
              </h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Tailored workflows for fast retail checkout.
              </p>
            </div>

            {/* Icon Badges with Sub-labels */}
            <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition border border-white/5">
                <ShoppingBag className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="font-medium text-[11px]">Supermarkets</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition border border-white/5">
                <Pill className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-medium text-[11px]">Chemist / Pharmacy</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition border border-white/5">
                <Wine className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-medium text-[11px]">Bar &amp; Restaurant</span>
              </div>
            </div>
          </div>

          {/* SPLIT CARD 2: Hardware Freedom */}
          <div
            onClick={handleHardwareClick}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleHardwareClick();
              }
            }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-lg transition-all duration-300 hover:border-purple-400/50 hover:bg-slate-900 cursor-pointer active:scale-[0.99] flex flex-col justify-between animate-bento-cascade opacity-0"
            style={{ animationDelay: '220ms' }}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Cpu className="w-4 h-4" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
              </div>

              <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                Hardware Freedom
              </h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Zero hardware lock-in plug &amp; play hardware.
              </p>
            </div>

            {/* Icon Badges with Sub-labels */}
            <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition border border-white/5">
                <Printer className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="font-medium text-[11px]">ESC/POS Printers (58mm/80mm)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300 bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition border border-white/5">
                <Scan className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-medium text-[11px]">Barcode &amp; QR Scanners</span>
              </div>
            </div>
          </div>

          {/* ADDITIONAL QUICK POS NAVIGATION CARDS (If Logged In / POS Terminal Context) */}
          {isLoggedIn && onNavigateTab && (
            <div className="sm:col-span-2 grid grid-cols-2 gap-2.5 pt-1 animate-bento-cascade opacity-0" style={{ animationDelay: '290ms' }}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateTab('register');
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-bold text-xs transition cursor-pointer text-left"
              >
                <Monitor className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="truncate">
                  <div className="leading-tight">POS Terminal</div>
                  <div className="text-[9px] font-normal text-blue-300/80">Active Register</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateTab('inventory');
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 font-bold text-xs transition cursor-pointer text-left"
              >
                <Package className="w-4 h-4 text-emerald-400 shrink-0" />
                <div className="truncate">
                  <div className="leading-tight">Inventory</div>
                  <div className="text-[9px] font-normal text-slate-400">Stock &amp; Batches</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateTab('analytics');
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 font-bold text-xs transition cursor-pointer text-left"
              >
                <BarChart3 className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="truncate">
                  <div className="leading-tight">Analytics</div>
                  <div className="text-[9px] font-normal text-slate-400">Sales Reports</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateTab('shifts');
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 font-bold text-xs transition cursor-pointer text-left"
              >
                <Clock className="w-4 h-4 text-purple-400 shrink-0" />
                <div className="truncate">
                  <div className="leading-tight">Shifts &amp; Till</div>
                  <div className="text-[9px] font-normal text-slate-400">
                    {activeShift ? `Shift #${activeShift.shiftNumber}` : 'Open Shift'}
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* LANDING ACTION BAR (If on Landing Page) */}
          {!isLoggedIn && (
            <div className="sm:col-span-2 grid grid-cols-2 gap-2.5 pt-1 animate-bento-cascade opacity-0" style={{ animationDelay: '290ms' }}>
              {onNavigatePricing && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigatePricing();
                  }}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 font-bold text-xs transition cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-purple-400" />
                  <span>View Pricing Plans</span>
                </button>
              )}

              {onAuthAction && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAuthAction();
                  }}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  <User className="w-4 h-4" />
                  <span>Launch Terminal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* FOOTER UTILITY STRIP (Sleek Horizontal Tray Anchored at Bottom) */}
      <footer className="sticky bottom-0 z-20 border-t border-white/10 bg-slate-950/90 backdrop-blur-md px-4 sm:px-6 py-3.5 shrink-0 animate-bento-cascade opacity-0" style={{ animationDelay: '360ms' }}>
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2 flex-wrap">
          {/* 1. Currency Selector (KES) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-slate-200 transition cursor-pointer"
              title="Select Base Currency"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Currency: {currency}</span>
            </button>

            {isCurrencyDropdownOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-44 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-1 z-30 animate-in fade-in duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setCurrency('KES');
                    setIsCurrencyDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono font-bold text-left transition ${
                    currency === 'KES' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span>KES (KSh)</span>
                  <span className="text-[10px]">Kenya</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrency('USD');
                    setIsCurrencyDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono font-bold text-left transition ${
                    currency === 'USD' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span>USD ($)</span>
                  <span className="text-[10px]">Global</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. Offline Status Badge */}
          <button
            type="button"
            onClick={() => setIsOnline && setIsOnline(!isOnline)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              isOnline
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
            }`}
            title="Click to toggle network state simulation"
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Online (Cloud Synced)</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Offline Mode (Active)</span>
              </>
            )}
          </button>

          {/* 3. WhatsApp Fast-Support Action Button */}
          <button
            type="button"
            onClick={handleWhatsAppClick}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs transition shadow-lg shadow-emerald-950/40 cursor-pointer"
            title="Open WhatsApp Direct Agent Support"
          >
            <MessageCircle className="w-4 h-4 fill-white text-emerald-600" />
            <span>WhatsApp Support</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
