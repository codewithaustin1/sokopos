/**
 * Comprehensive scroll-to-top utility for SokoPoS.
 * 
 * Works seamlessly across:
 * - Standard window / document scroll
 * - Viewport-locked containers (e.g., #pos-landing-viewport, #pos-pricing-page-container)
 * - Nested scrollable containers in modals and views
 * - iFrame preview environments where scroll offsets are held by inner scroll containers
 */

export const scrollToTop = (smooth: boolean = true) => {
  const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto';

  // 1. Window and root document scrolling
  if (typeof window !== 'undefined') {
    try {
      window.scrollTo({ top: 0, behavior });
    } catch {
      window.scrollTo(0, 0);
    }
  }

  if (typeof document !== 'undefined') {
    if (document.documentElement) {
      try {
        document.documentElement.scrollTo({ top: 0, behavior });
      } catch {
        document.documentElement.scrollTop = 0;
      }
    }

    if (document.body) {
      try {
        document.body.scrollTo({ top: 0, behavior });
      } catch {
        document.body.scrollTop = 0;
      }
    }

    // 2. Named primary viewport and full-page containers
    const primaryContainerIds = [
      'pos-landing-viewport',
      'pos-pricing-page-container',
      'pos-landing-root',
      'pos-app-root',
      'legal-page-body',
      'legal-page-container',
    ];

    primaryContainerIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        try {
          el.scrollTo({ top: 0, behavior });
        } catch {
          el.scrollTop = 0;
        }
      }
    });

    // 3. Fallback: inspect any container with overflow-y-auto or active scroll
    try {
      const scrollableElements = document.querySelectorAll<HTMLElement>(
        '[class*="overflow-y-auto"], [class*="overflow-auto"], main, section'
      );
      scrollableElements.forEach((el) => {
        if (el.scrollTop > 0) {
          try {
            el.scrollTo({ top: 0, behavior });
          } catch {
            el.scrollTop = 0;
          }
        }
      });
    } catch {
      // In case of selector engine quirks, safely ignore
    }
  }
};
