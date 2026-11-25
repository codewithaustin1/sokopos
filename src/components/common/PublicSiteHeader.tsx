import React from 'react';
import { ArrowRight, Monitor } from 'lucide-react';
import { AppLogo } from './AppLogo';
import { MobileHeaderNav } from './MobileHeaderNav';
import { PWAInstallButton } from '../PWAInstallButton';

interface PublicSiteHeaderProps {
  currentPage: 'landing' | 'pricing';
  isLoggedIn: boolean;
  onBrandClick: () => void;
  onNavigateSection: (sectionId: string) => void;
  onNavigatePricing: () => void;
  onAuthAction: () => void;
  loginButtonId?: string;
  terminalButtonId?: string;
}

const SECTION_NAV_ITEMS: { id: string; label: string }[] = [
  { id: 'solutions', label: 'Solutions' },
  { id: 'payments', label: 'Platform' },
  { id: 'hardware', label: 'Hardware' },
  { id: 'compare', label: 'Compare' },
];

export const PublicSiteHeader: React.FC<PublicSiteHeaderProps> = ({
  currentPage,
  isLoggedIn,
  onBrandClick,
  onNavigateSection,
  onNavigatePricing,
  onAuthAction,
  loginButtonId = 'top-nav-login-btn',
  terminalButtonId = 'top-nav-pos-terminal-btn',
}) => {
  const isPricingActive = currentPage === 'pricing';

  return (
    <header className="px-4 sm:px-8 py-3.5 border-b border-[#e2e8f0] bg-[#f4f7f6]/95 backdrop-blur-md shadow-xs flex items-center justify-between gap-8 shrink-0 sticky top-0 z-50 transition-colors">
      {/* Brand */}
      <AppLogo theme="light" size="md" onClick={onBrandClick} />

      {/* Quick Nav Anchors for Desktop Visitors */}
      <nav
        aria-label="Primary navigation"
        className="hidden lg:flex items-center gap-7 text-sm font-bold tracking-tight text-[#090d16]"
      >
        {SECTION_NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={(e) => {
              e.preventDefault();
              onNavigateSection(item.id);
            }}
            className="relative py-1 text-[#090d16] hover:text-[#28a745] transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#28a745] after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:rounded-full after:bg-[#28a745] after:origin-left after:scale-x-0 hover:after:scale-x-100 focus-visible:after:scale-x-100 after:transition-transform after:duration-150 motion-reduce:after:transition-none"
          >
            {item.label}
          </a>
        ))}

        <a
          href="/pricing"
          aria-current={isPricingActive ? 'page' : undefined}
          onClick={(e) => {
            e.preventDefault();
            onNavigatePricing();
          }}
          className={`relative py-1 transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#28a745] after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:rounded-full after:bg-[#28a745] after:origin-left after:transition-transform after:duration-150 motion-reduce:after:transition-none ${
            isPricingActive
              ? 'text-[#28a745] after:scale-x-100'
              : 'text-[#090d16] hover:text-[#28a745] after:scale-x-0 hover:after:scale-x-100 focus-visible:after:scale-x-100'
          }`}
        >
          Pricing
        </a>
      </nav>

      {/* Action Buttons & Mobile Hamburger Menu */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <PWAInstallButton variant="compact" />

        {isLoggedIn ? (
          <button
            type="button"
            id={terminalButtonId}
            onClick={onAuthAction}
            className="px-3.5 py-2 min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <Monitor className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Open Till</span>
            <span className="sm:hidden">Till</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        ) : (
          <button
            type="button"
            id={loginButtonId}
            onClick={onAuthAction}
            className="hidden sm:inline-flex items-center px-4 py-2 min-h-[40px] rounded-xl bg-[#28a745] hover:bg-[#218838] text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            Sign In
          </button>
        )}

        {/* Mobile Hamburger Menu */}
        <MobileHeaderNav
          onNavigateSection={onNavigateSection}
          onNavigatePricing={onNavigatePricing}
          onAuthAction={onAuthAction}
          isLoggedIn={isLoggedIn}
          currentPage={currentPage}
          theme="light"
        />
      </div>
    </header>
  );
};
