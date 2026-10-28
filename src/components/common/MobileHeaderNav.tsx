import React, { useState, useEffect, useRef } from 'react';
import {
  Monitor,
  ArrowRight,
  Layers,
  Smartphone,
  Cpu,
  Award,
  CreditCard,
  User,
  ChevronRight,
} from 'lucide-react';

export interface MobileHeaderNavProps {
  onNavigateSection: (sectionId: string) => void;
  onNavigatePricing?: () => void;
  onAuthAction?: () => void;
  isLoggedIn?: boolean;
  currentPage?: 'landing' | 'pricing';
  theme?: 'slate' | 'forest' | 'light';
}

export const MobileHeaderNav: React.FC<MobileHeaderNavProps> = ({
  onNavigateSection,
  onNavigatePricing,
  onAuthAction,
  isLoggedIn = false,
  currentPage = 'landing',
  theme = 'slate',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleItemClick = (sectionId: string) => {
    setIsOpen(false);
    onNavigateSection(sectionId);
  };

  const handlePricingClick = () => {
    setIsOpen(false);
    if (currentPage === 'pricing') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (onNavigatePricing) {
      onNavigatePricing();
    } else {
      window.location.hash = '#pricing';
    }
  };

  const handleAuthClick = () => {
    setIsOpen(false);
    if (onAuthAction) {
      onAuthAction();
    }
  };

  // The 4 items from the user's attachment:
  // Solutions | M-Pesa & eTIMS | Hardware Freedom | Why SokoPoS
  const navItems = [
    {
      id: 'industry-solutions',
      aliasId: 'solutions',
      label: 'Solutions',
      icon: Layers,
      description: 'Supermarkets, Boutiques, Agrovets, Chemists & Bars',
    },
    {
      id: 'kenya-payments',
      aliasId: 'payments',
      label: 'M-Pesa & eTIMS',
      icon: Smartphone,
      description: 'Dynamic STK push, QR codes & KRA compliance',
    },
    {
      id: 'hardware-guide',
      aliasId: 'hardware',
      label: 'Hardware Freedom',
      icon: Cpu,
      description: 'Zero lock-in thermal printers, USB & Bluetooth scanners',
    },
    {
      id: 'pricing-comparison',
      aliasId: 'compare',
      label: 'Why SokoPoS',
      icon: Award,
      description: 'Modern offline-first POS vs legacy server software',
    },
  ];

  const isForest = theme === 'forest';
  const isLight = theme === 'light';

  return (
    <div className="lg:hidden flex items-center">
      {/* Animated Hamburger Icon Button
          Mimics the clip behavior: 2 bold horizontal bars translating and rotating smoothly to form an 'X' */}
      <button
        ref={buttonRef}
        type="button"
        id="mobile-nav-hamburger-btn"
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative w-10 h-10 flex flex-col items-center justify-center gap-[4px] rounded-xl border transition-all cursor-pointer z-50 select-none ${
          isOpen
            ? isForest
              ? 'bg-[#17211C] border-[#4CC38A]/60 shadow-md shadow-[#4CC38A]/20'
              : isLight
              ? 'bg-white border-[#1565d8] shadow-md shadow-[#1565d8]/20'
              : 'bg-slate-900 border-slate-700 shadow-md shadow-black/40'
            : isForest
            ? 'bg-[#17211C]/90 hover:bg-[#202d26] border-[#2B3A32] active:scale-95'
            : isLight
            ? 'bg-white hover:bg-slate-100 border-[#d9e1e6] text-[#0e1a2b] active:scale-95'
            : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 active:scale-95'
        }`}
      >
        {/* Top Bar: Translates down and rotates +45deg */}
        <span
          className={`block w-6 h-[3px] rounded-[1px] transition-all duration-300 ease-in-out transform origin-center ${
            isOpen
              ? isForest
                ? 'bg-[#4CC38A] translate-y-[3.5px] rotate-45'
                : isLight
                ? 'bg-[#1565d8] translate-y-[3.5px] rotate-45'
                : 'bg-white translate-y-[3.5px] rotate-45'
              : isForest
              ? 'bg-[#EAF1EC] translate-y-0 rotate-0'
              : isLight
              ? 'bg-[#0e1a2b] translate-y-0 rotate-0'
              : 'bg-white translate-y-0 rotate-0'
          }`}
        />
        {/* Bottom Bar: Translates up and rotates -45deg */}
        <span
          className={`block w-6 h-[3px] rounded-[1px] transition-all duration-300 ease-in-out transform origin-center ${
            isOpen
              ? isForest
                ? 'bg-[#4CC38A] -translate-y-[3.5px] -rotate-45'
                : isLight
                ? 'bg-[#1565d8] -translate-y-[3.5px] -rotate-45'
                : 'bg-white -translate-y-[3.5px] -rotate-45'
              : isForest
              ? 'bg-[#EAF1EC] translate-y-0 rotate-0'
              : isLight
              ? 'bg-[#0e1a2b] translate-y-0 rotate-0'
              : 'bg-white translate-y-0 rotate-0'
          }`}
        />
      </button>

      {/* Dropdown Menu Modal / Drawer */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu Drawer */}
          <div
            ref={menuRef}
            id="mobile-nav-menu-drawer"
            className={`fixed top-[62px] left-0 right-0 z-40 border-b shadow-2xl p-4 sm:p-6 max-h-[calc(100vh-70px)] overflow-y-auto animate-in slide-in-from-top-4 fade-in duration-200 ${
              isForest
                ? 'bg-[#0F1613]/98 border-[#2B3A32] text-[#EAF1EC]'
                : isLight
                ? 'bg-[#f4f7f6]/98 border-[#d9e1e6] text-[#0e1a2b]'
                : 'bg-slate-950/98 border-slate-800 text-slate-100'
            }`}
          >
            <div className="max-w-md mx-auto space-y-4">
              {/* Header Label */}
              <div
                className={`flex items-center justify-between px-2 pt-1 pb-2 border-b ${
                  isLight ? 'border-slate-200' : 'border-white/5'
                }`}
              >
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Quick Navigation
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Kenya Retail Suite
                </span>
              </div>

              {/* Navigation Items from Attached Image */}
              <div className="grid gap-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      id={`mobile-nav-link-${item.id}`}
                      onClick={() => handleItemClick(item.id)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer group active:scale-[0.99] ${
                        isForest
                          ? 'bg-[#17211C]/80 hover:bg-[#202d26] border-[#2B3A32] hover:border-[#4CC38A]/50'
                          : isLight
                          ? 'bg-white hover:bg-blue-50/60 border-[#d9e1e6] hover:border-[#1565d8]/50 shadow-xs'
                          : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 hover:border-blue-500/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isForest
                              ? 'bg-[#4CC38A]/10 text-[#4CC38A] group-hover:bg-[#4CC38A] group-hover:text-[#0A1A11]'
                              : isLight
                              ? 'bg-[#e8f0fb] text-[#1565d8] group-hover:bg-[#1565d8] group-hover:text-white'
                              : 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-600 group-hover:text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold flex items-center gap-2">
                            <span>{item.label}</span>
                          </div>
                          <div
                            className={`text-[11px] line-clamp-1 ${
                              isLight ? 'text-slate-500' : 'text-slate-400'
                            }`}
                          >
                            {item.description}
                          </div>
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 transition-all ${
                          isForest
                            ? 'text-slate-500 group-hover:text-[#4CC38A]'
                            : isLight
                            ? 'text-slate-400 group-hover:text-[#1565d8]'
                            : 'text-slate-500 group-hover:text-blue-400'
                        } group-hover:translate-x-0.5`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Secondary Navigation: Pricing & Account Action */}
              <div
                className={`pt-2 border-t grid grid-cols-2 gap-2 ${
                  isLight ? 'border-slate-200' : 'border-white/5'
                }`}
              >
                <button
                  type="button"
                  id="mobile-nav-pricing-btn"
                  onClick={handlePricingClick}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    currentPage === 'pricing'
                      ? isForest
                        ? 'bg-[#4CC38A]/20 border-[#4CC38A] text-[#4CC38A]'
                        : isLight
                        ? 'bg-[#1565d8]/10 border-[#1565d8] text-[#1565d8]'
                        : 'bg-blue-500/20 border-blue-500 text-blue-400'
                      : isForest
                      ? 'bg-[#17211C] hover:bg-[#202d26] border-[#2B3A32] text-[#EAF1EC]'
                      : isLight
                      ? 'bg-white hover:bg-slate-100 border-[#d9e1e6] text-[#0e1a2b] shadow-xs'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Pricing Plans</span>
                </button>

                {isLoggedIn ? (
                  <button
                    type="button"
                    id="mobile-nav-enter-terminal-btn"
                    onClick={handleAuthClick}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>POS Terminal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    id="mobile-nav-login-cta-btn"
                    onClick={handleAuthClick}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer ${
                      isForest
                        ? 'bg-[#4CC38A] hover:bg-[#3db079] text-[#0A1A11]'
                        : isLight
                        ? 'bg-[#1565d8] hover:bg-[#1255b5] text-white shadow-[#1565d8]/20'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Login / Register</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
