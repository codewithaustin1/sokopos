import React from 'react';
import { AppLogo } from './AppLogo';
import { usePos } from '../../context/PosContext';
import { scrollToTop } from '../../utils/scrollUtils';

export interface AppFooterProps {
  onBackToLogin?: () => void;
  onNavigatePricing?: () => void;
  onNavigateLegal?: (tab: 'terms' | 'privacy' | 'faq' | 'ownership' | 'compliance') => void;
  activePage?: 'pricing' | 'terms' | 'privacy' | 'faq' | 'ownership' | 'compliance' | 'landing';
  idPrefix?: string;
  className?: string;
  loginBgGraphic?: string | null;
  theme?: 'dark' | 'light';
}

export const AppFooter: React.FC<AppFooterProps> = ({
  onBackToLogin,
  onNavigatePricing,
  onNavigateLegal,
  activePage,
  idPrefix = 'footer',
  className = '',
  loginBgGraphic: propLoginBgGraphic,
  theme = 'dark',
}) => {
  const { loginBgGraphic: contextLoginBgGraphic } = usePos();
  const loginBgGraphic = propLoginBgGraphic ?? contextLoginBgGraphic;

  const handlePricingClick = () => {
    if (activePage === 'pricing') {
      scrollToTop(true);
    } else if (onNavigatePricing) {
      onNavigatePricing();
    } else {
      window.location.hash = '#pricing';
      scrollToTop(true);
    }
  };

  const handleLegalClick = (tab: 'terms' | 'privacy' | 'faq' | 'ownership' | 'compliance') => {
    if (onNavigateLegal) {
      onNavigateLegal(tab);
    } else {
      window.location.hash = `#${tab}`;
      scrollToTop(true);
    }
  };

  const handleLogoClick = () => {
    if (onBackToLogin) {
      onBackToLogin();
    } else {
      window.location.hash = '';
      scrollToTop(true);
    }
  };

  const isLight = theme === 'light';

  return (
    <footer
      className={`px-6 pt-6 pb-24 sm:pb-7 border-t text-center text-xs shrink-0 relative z-10 transition-colors ${
        isLight
          ? 'border-[#d9e1e6] bg-[#f4f7f6] text-[#4c5a6b]'
          : loginBgGraphic
          ? 'border-white/10 bg-[#0F1613]/70 backdrop-blur-md text-[#9FB2A7]'
          : 'border-[#2B3A32] bg-[#0F1613] text-[#9FB2A7]'
      } ${className}`}
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] sm:pr-72">
        {/* Brand Logo & Copyright statement */}
        <div className={`flex items-center gap-2.5 flex-wrap justify-center ${isLight ? 'text-[#4c5a6b]' : 'text-[#9FB2A7]'}`}>
          <AppLogo theme={theme} size="sm" onClick={handleLogoClick} />
          <span className={`hidden sm:inline ${isLight ? 'text-[#d9e1e6]' : 'text-[#2B3A32]'}`}>•</span>
          <span>© 2026 SokoPoS Enterprise Platform</span>
        </div>

        {/* Legal & Pricing Navigation Links */}
        <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap justify-center font-medium">
          <button
            type="button"
            id={`${idPrefix}-pricing-btn`}
            onClick={handlePricingClick}
            className={`transition cursor-pointer ${
              activePage === 'pricing'
                ? isLight ? 'text-[#1565d8] font-bold' : 'text-[#4CC38A] font-bold'
                : isLight ? 'text-[#4c5a6b] hover:text-[#1565d8]' : 'text-[#9FB2A7] hover:text-[#4CC38A]'
            }`}
          >
            Pricing
          </button>
          <span className={isLight ? 'text-[#d9e1e6]' : 'text-[#2B3A32]'}>•</span>
          <button
            type="button"
            id={`${idPrefix}-terms-btn`}
            onClick={() => handleLegalClick('terms')}
            className={`transition cursor-pointer ${
              activePage === 'terms'
                ? isLight ? 'text-[#1565d8] font-bold' : 'text-[#4CC38A] font-bold'
                : isLight ? 'text-[#4c5a6b] hover:text-[#1565d8]' : 'text-[#9FB2A7] hover:text-[#4CC38A]'
            }`}
          >
            Terms of Service
          </button>
          <span className={isLight ? 'text-[#d9e1e6]' : 'text-[#2B3A32]'}>•</span>
          <button
            type="button"
            id={`${idPrefix}-privacy-btn`}
            onClick={() => handleLegalClick('privacy')}
            className={`transition cursor-pointer ${
              activePage === 'privacy'
                ? isLight ? 'text-[#1565d8] font-bold' : 'text-[#4CC38A] font-bold'
                : isLight ? 'text-[#4c5a6b] hover:text-[#1565d8]' : 'text-[#9FB2A7] hover:text-[#4CC38A]'
            }`}
          >
            Privacy Policy
          </button>
          <span className={isLight ? 'text-[#d9e1e6]' : 'text-[#2B3A32]'}>•</span>
          <button
            type="button"
            id={`${idPrefix}-faq-btn`}
            onClick={() => handleLegalClick('faq')}
            className={`transition cursor-pointer ${
              activePage === 'faq'
                ? isLight ? 'text-[#1565d8] font-bold' : 'text-[#4CC38A] font-bold'
                : isLight ? 'text-[#4c5a6b] hover:text-[#1565d8]' : 'text-[#9FB2A7] hover:text-[#4CC38A]'
            }`}
          >
            FAQs
          </button>
          <span className={isLight ? 'text-[#d9e1e6]' : 'text-[#2B3A32]'}>•</span>
          <button
            type="button"
            id={`${idPrefix}-legal-notice-btn`}
            onClick={() => handleLegalClick('ownership')}
            className={`transition cursor-pointer ${
              activePage === 'ownership'
                ? isLight ? 'text-[#1565d8] font-bold' : 'text-[#4CC38A] font-bold'
                : isLight ? 'text-[#4c5a6b] hover:text-[#1565d8]' : 'text-[#9FB2A7] hover:text-[#4CC38A]'
            }`}
          >
            Legal & IP
          </button>
          <span className={isLight ? 'text-[#d9e1e6]' : 'text-[#2B3A32]'}>•</span>
          <button
            type="button"
            id={`${idPrefix}-scroll-to-top-btn`}
            onClick={() => scrollToTop(true)}
            className={`transition cursor-pointer font-medium ${
              isLight ? 'text-[#4c5a6b] hover:text-[#1565d8]' : 'text-[#9FB2A7] hover:text-[#4CC38A]'
            }`}
            aria-label="Scroll to top of page"
          >
            Scroll to Top ↑
          </button>
        </div>
      </div>
    </footer>
  );
};
