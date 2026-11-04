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
import { scrollToTop } from '../../utils/scrollUtils';
import { MobileBentoMenuOverlay } from './MobileBentoMenuOverlay';


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
      scrollToTop(true);
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

      {/* Option B: Full-Screen Immersive Bento Overlay */}
      <MobileBentoMenuOverlay
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onNavigateSection={handleItemClick}
        onNavigatePricing={handlePricingClick}
        onAuthAction={handleAuthClick}
        isLoggedIn={isLoggedIn}
      />

    </div>
  );
};
