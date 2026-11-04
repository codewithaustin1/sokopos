import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ArrowRight,
  Home,
  Layers,
  Smartphone,
  Cpu,
  Award,
  CreditCard,
  MessageCircle,
  ShoppingCart,
  Package,
  BarChart3,
  Clock,
  FileText,
  Truck,
  Users,
  RefreshCw,
  Settings,
  ShieldCheck,
  Monitor,
  User,
} from 'lucide-react';
import { usePos } from '../../context/PosContext';
import { scrollToTop } from '../../utils/scrollUtils';

export interface MobileSlideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateSection?: (sectionId: string) => void;
  onNavigatePricing?: () => void;
  onAuthAction?: () => void;
  onNavigateTab?: (
    tab:
      | 'register'
      | 'inventory'
      | 'suppliers'
      | 'analytics'
      | 'reports'
      | 'cloud-sync'
      | 'staff'
      | 'shifts'
      | 'customers'
      | 'settings'
      | 'super-admin'
  ) => void;
  isLoggedIn?: boolean;
  triggerButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

export const MobileSlideDrawer: React.FC<MobileSlideDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateSection,
  onNavigatePricing,
  onAuthAction,
  onNavigateTab,
  isLoggedIn = false,
  triggerButtonRef,
}) => {
  const slideMenuRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Safe POS context extraction
  let posContext: ReturnType<typeof usePos> | null = null;
  try {
    posContext = usePos();
  } catch {
    posContext = null;
  }
  const isSuperAdmin = posContext?.isSuperAdmin ?? false;

  // Manage accessibility, focus trap, escape key, and body scroll locking
  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element for restoration on close
    previousFocusRef.current = (document.activeElement as HTMLElement) || triggerButtonRef?.current || null;

    // Prevent background body scroll
    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Set focus to the first focusable element inside drawer (close button)
    const focusTimer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    // Keyboard handlers: Escape key and Focus Trap (Tab / Shift+Tab)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && slideMenuRef.current) {
        const focusableElements = slideMenuRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !slideMenuRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement || !slideMenuRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    // Close drawer automatically if viewport is resized to desktop breakpoint (>= 768px / md)
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = originalBodyOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);

      // Return focus to trigger button or previous active element
      if (triggerButtonRef?.current) {
        triggerButtonRef.current.focus();
      } else if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose, triggerButtonRef]);

  // Navigation handlers
  const handleItemClick = (action: () => void) => {
    onClose();
    // Allow drawer exit transition to start smoothly before executing navigation
    setTimeout(() => {
      action();
    }, 50);
  };

  const handleScrollHome = () => {
    handleItemClick(() => {
      scrollToTop(true);
    });
  };

  const handleSectionNav = (sectionId: string) => {
    handleItemClick(() => {
      if (onNavigateSection) {
        onNavigateSection(sectionId);
      } else {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.location.hash = `#${sectionId}`;
        }
      }
    });
  };

  const handlePricingNav = () => {
    handleItemClick(() => {
      if (onNavigatePricing) {
        onNavigatePricing();
      } else {
        window.location.hash = '#pricing';
      }
    });
  };

  const handleWhatsAppSupport = () => {
    handleItemClick(() => {
      const text = encodeURIComponent(
        'Hello SokoPoS Team! I need assistance with my Point of Sale setup in Kenya.'
      );
      window.open(`https://wa.me/254740463021?text=${text}`, '_blank', 'noopener,noreferrer');
    });
  };

  const handleFooterCta = () => {
    handleItemClick(() => {
      if (isLoggedIn) {
        if (onNavigateTab) {
          onNavigateTab('register');
        } else if (onAuthAction) {
          onAuthAction();
        }
      } else {
        if (onAuthAction) {
          onAuthAction();
        } else {
          window.location.hash = '#register';
        }
      }
    });
  };

  // Determine if we should show the operational POS tabs (authenticated user or onNavigateTab provided)
  const isPosOperational = Boolean(isLoggedIn && onNavigateTab);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <>
      {/* Semi-Transparent Dark Backdrop */}
      <div
        id="menu-backdrop"
        onClick={onClose}
        className={`backdrop-fade fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Slide-In Drawer Navigation Menu */}
      <aside
        id="slide-menu"
        ref={slideMenuRef}
        tabIndex={-1}
        aria-label="Mobile Navigation Drawer"
        aria-hidden={!isOpen}
        className={`drawer-slide fixed top-0 right-0 bottom-0 z-50 w-full max-w-xs bg-white shadow-2xl flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2.5 text-slate-900 font-bold text-lg min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs shadow-sm shadow-blue-500/20 shrink-0">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">Navigation</span>
          </div>

          {/* Close Button inside drawer */}
          <button
            id="menu-close"
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 focus:outline-none transition-all cursor-pointer shrink-0"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Scrollable Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {isPosOperational ? (
            /* Authenticated POS Terminal Navigation Items */
            <>
              <button
                type="button"
                onClick={() => handleItemClick(() => onNavigateTab!('register'))}
                className="drawer-item flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-700 font-medium hover:bg-blue-50 hover:text-blue-600 transition-all cursor-pointer group text-sm w-full text-left"
              >
                <ShoppingCart className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                <span className="truncate flex-1">Register / Sell</span>
              </button>

              <button
                type="button"
                onClick={() => handleItemClick(() => onNavigateTab!('inventory'))}
                className="drawer-item flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-700 font-medium hover:bg-blue-50 hover:text-blue-600 transition-all cursor-pointer group text-sm w-full text-left"
              >
                <Package className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                <span className="truncate flex-1">Inventory Catalog</span>
              </button>

              <button
                type="button"
                onClick={() => handleItemClick(() => onNavigateTab!('analytics'))}
                className="drawer-item flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-700 font-medium hover:bg-blue-50 hover:text-blue-600 transition-all cursor-pointer group text-sm w-full text-left"
              >
                <BarChart3 className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                <span className="truncate flex-1">Sales Analytics</span>
              </button>

              <button
                type="button"
                onClick={() => handleItemClick(() => onNavigateTab!('shifts'))}
                className="drawer-item flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-700 font-medium hover:bg-blue-50 hover:text-blue-600 transition-all cursor-pointer group text-sm w-full text-left"
              >
                <Clock className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                <span className="truncate flex-1">Shifts & Till Sessions</span>
              </button>

              <button
                type="button"
                onClick={() => handleItemClick(() => onNavigateTab!('reports'))}
                className="drawer-item flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-700 font-medium hover:bg-blue-50 hover:text-blue-600 transition-all cursor-pointer group text-sm w-full text-left"
              >
                <FileText className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                <span className="truncate flex-1">Thermal Z-Reports</span>
              </button>

              <button
                type="button"
                onClick={() => handleItemClick(() => onNavigateTab!('suppliers'))}
                className="drawer-item flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-700 font-medium hover:bg-blue-50 hover:text-blue-600 transition-all cursor-pointer group text-sm w-full text-left"
              >
                <Truck className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                <span className="truncate flex-1">Suppliers & Invoices</span>
              </button>

              <button
                type="button"
                onClick={() => handleItemClick(() => onNavigateTab!('customers'))}
                className="drawer-item flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-700 font-medium hover:bg-blue-50 hover:text-blue-600 transition-all cursor-pointer group text-sm w-full text-left"
              >
                <Users className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                <span className="truncate flex-1">Customers & Daftari</span>
              </button>

              <button
                type="button"
                onClick={() => handleItemClick(() => onNavigateTab!('cloud-sync'))}
                className="drawer-item flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-700 font-medium hover:bg-blue-50 hover:text-blue-600 transition-all cursor-pointer group text-sm w-full text-left"
              >
                <RefreshCw className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                <span className="truncate flex-1">Cloud Sync Vault</span>
              </button>

              <button
                type="button"
                onClick={() => handleItemClick(() => onNavigateTab!('settings'))}
                className="drawer-item flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-700 font-medium hover:bg-blue-50 hover:text-blue-600 transition-all cursor-pointer group text-sm w-full text-left"
              >
                <Settings className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                <span className="truncate flex-1">Store Settings</span>
              </button>

              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => handleItemClick(() => onNavigateTab!('super-admin'))}
                  className="drawer-item flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-700 font-medium hover:bg-blue-50 hover:text-blue-600 transition-all cursor-pointer group text-sm w-full text-left"
                >
                  <ShieldCheck className="w-5 h-5 text-amber-500 group-hover:text-blue-600 transition-colors shrink-0" />
                  <span className="truncate flex-1">Super Admin Console</span>
                </button>
              )}
            </>
          ) : (
            /* Public Landing & Showcase SokoPoS Content */
            <>
              <button
                type="button"
                onClick={handleScrollHome}
                className="drawer-item flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-700 font-medium hover:bg-blue-50 hover:text-blue-600 transition-all cursor-pointer group text-sm w-full text-left"
              >
                <Home className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                <span className="truncate flex-1">Home</span>
              </button>

              <button
                type="button"
                onClick={() => handleSectionNav('solutions')}
                className="drawer-item flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-700 font-medium hover:bg-blue-50 hover:text-blue-600 transition-all cursor-pointer group text-sm w-full text-left"
              >
                <Layers className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                <span className="truncate flex-1">Solutions</span>
              </button>

              <button
                type="button"
                onClick={() => handleSectionNav('payments')}
                className="drawer-item flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-700 font-medium hover:bg-blue-50 hover:text-blue-600 transition-all cursor-pointer group text-sm w-full text-left"
              >
                <Smartphone className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                <span className="truncate flex-1">M-Pesa & eTIMS</span>
              </button>

              <button
                type="button"
                onClick={() => handleSectionNav('hardware')}
                className="drawer-item flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-700 font-medium hover:bg-blue-50 hover:text-blue-600 transition-all cursor-pointer group text-sm w-full text-left"
              >
                <Cpu className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                <span className="truncate flex-1">Hardware Freedom</span>
              </button>

              <button
                type="button"
                onClick={() => handleSectionNav('compare')}
                className="drawer-item flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-700 font-medium hover:bg-blue-50 hover:text-blue-600 transition-all cursor-pointer group text-sm w-full text-left"
              >
                <Award className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                <span className="truncate flex-1">Why SokoPoS</span>
              </button>

              <button
                type="button"
                onClick={handlePricingNav}
                className="drawer-item flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-700 font-medium hover:bg-blue-50 hover:text-blue-600 transition-all cursor-pointer group text-sm w-full text-left"
              >
                <CreditCard className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                <span className="truncate flex-1">Pricing Plans</span>
              </button>

              <button
                type="button"
                onClick={() => handleItemClick(() => onAuthAction?.())}
                className="drawer-item flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-700 font-medium hover:bg-blue-50 hover:text-blue-600 transition-all cursor-pointer group text-sm w-full text-left"
              >
                <User className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                <span className="truncate flex-1">Merchant Sign In</span>
              </button>

              <button
                type="button"
                onClick={handleWhatsAppSupport}
                className="drawer-item flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-700 font-medium hover:bg-blue-50 hover:text-blue-600 transition-all cursor-pointer group text-sm w-full text-left"
              >
                <MessageCircle className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
                <span className="truncate flex-1">WhatsApp Support</span>
              </button>
            </>
          )}
        </nav>

        {/* Drawer Footer Call to Action */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2 shrink-0">
          <button
            type="button"
            onClick={handleFooterCta}
            className="drawer-item flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all hover:shadow-md cursor-pointer"
          >
            {isPosOperational ? (
              <>
                <Monitor className="w-4 h-4" />
                <span>Enter POS Terminal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Get Started Now</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          <div className="text-center text-xs text-slate-400 pt-1">
            &copy; 2026 SokoPoS Enterprise Platform
          </div>
        </div>
      </aside>
    </>,
    document.body
  );
};
