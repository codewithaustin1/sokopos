import React from 'react';
import { AppLogo } from './AppLogo';
import { usePos } from '../../context/PosContext';
import { scrollToTop } from '../../utils/scrollUtils';

export interface AppFooterProps {
  onBackToLogin?: () => void;
  onNavigatePricing?: () => void;
  onNavigatePartners?: () => void;
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
  onNavigatePartners,
  onNavigateLegal,
  activePage,
  idPrefix = 'footer',
  className = '',
  loginBgGraphic: propLoginBgGraphic,
  theme = 'dark',
}) => {
  const { loginBgGraphic: contextLoginBgGraphic, language, setLanguage, t, setIsAffiliateModalOpen } = usePos();
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
          <span>{t('footer_copyright', '© 2026 SokoPoS Enterprise Platform')}</span>
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
            {t('footer_pricing', 'Pricing')}
          </button>
          <span className={isLight ? 'text-[#d9e1e6]' : 'text-[#2B3A32]'}>•</span>
          <button
            type="button"
            id={`${idPrefix}-partners-btn`}
            onClick={() => {
              if (onNavigatePartners) {
                onNavigatePartners();
              } else {
                setIsAffiliateModalOpen(true);
              }
            }}
            className={`transition cursor-pointer ${
              isLight ? 'text-[#4c5a6b] hover:text-[#1565d8]' : 'text-[#9FB2A7] hover:text-[#4CC38A]'
            }`}
          >
            {t('footer_partners', 'Partner Program')}
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
            {t('footer_terms', 'Terms of Service')}
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
            {t('footer_privacy', 'Privacy Policy')}
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
            {t('footer_faqs', 'FAQs')}
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
            {t('footer_legal_ip', 'Legal & IP')}
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
            {t('footer_scroll_top', 'Scroll to Top ↑')}
          </button>
          <span className={isLight ? 'text-[#d9e1e6]' : 'text-[#2B3A32]'}>•</span>
          <div className="inline-flex items-center">
            <select
              id={`${idPrefix}-language-select`}
              value={language}
              onChange={(e) => setLanguage(e.target.value as 'en' | 'fr' | 'sw')}
              aria-label="Select Language"
              className={`bg-transparent font-medium cursor-pointer focus:outline-none transition ${
                isLight ? 'text-[#4c5a6b] hover:text-[#1565d8]' : 'text-[#9FB2A7] hover:text-[#4CC38A]'
              }`}
            >
              <option value="en" className={isLight ? 'bg-white text-[#0e1a2b]' : 'bg-[#0F1613] text-[#9FB2A7]'}>English</option>
              <option value="fr" className={isLight ? 'bg-white text-[#0e1a2b]' : 'bg-[#0F1613] text-[#9FB2A7]'}>Français</option>
              <option value="sw" className={isLight ? 'bg-white text-[#0e1a2b]' : 'bg-[#0F1613] text-[#9FB2A7]'}>Kiswahili</option>
            </select>
          </div>
        </div>
      </div>
    </footer>
  );
};
