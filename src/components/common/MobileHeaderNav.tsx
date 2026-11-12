import React, { useState, useRef } from 'react';
import { MobileSlideDrawer } from './MobileSlideDrawer';
import { HamburgerCloseBurst } from './HamburgerCloseBurst';

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
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleMenu = () => {
    setIsOpen((prev) => !prev);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <div className="lg:hidden flex items-center">
      {/* Accessible Hamburger Button with 3 Morphing Horizontal Bars */}
      <button
        ref={buttonRef}
        id="menu-toggle"
        type="button"
        onClick={toggleMenu}
        aria-expanded={isOpen}
        aria-controls="slide-menu"
        aria-label="Toggle navigation menu"
        className="relative inline-flex items-center justify-center p-2 rounded-lg text-slate-700 hover:text-blue-600 hover:bg-slate-100 focus:outline-none transition-colors border border-slate-200/80 cursor-pointer shadow-xs active:scale-95"
      >
        <div className="w-6 h-5 flex flex-col justify-between items-center pointer-events-none">
          <span className="bar-top w-full h-0.5 bg-current rounded-full" />
          <span className="bar-middle w-full h-0.5 bg-current rounded-full" />
          <span className="bar-bottom w-full h-0.5 bg-current rounded-full" />
        </div>
        {!isLoggedIn && <HamburgerCloseBurst isOpen={isOpen} />}
      </button>

      {/* Accessible Slide-In Drawer Navigation Menu */}
      <MobileSlideDrawer
        isOpen={isOpen}
        onClose={closeMenu}
        onNavigateSection={onNavigateSection}
        onNavigatePricing={onNavigatePricing}
        onAuthAction={onAuthAction}
        isLoggedIn={isLoggedIn}
        currentPage={currentPage}
        triggerButtonRef={buttonRef}
      />
    </div>
  );
};
