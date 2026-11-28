import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Scan,
  ArrowRight,
  ShoppingBag,
  AlertTriangle,
  RotateCcw,
  Banknote,
  Tag,
  Clock,
  User,
  Star,
  X,
  ShoppingCart,
  ChevronRight,
  ChevronDown,
  PackagePlus,
  MoreHorizontal,
  Keyboard,
  PauseCircle,
  Trash2,
  Target,
  LayoutGrid,
  Table2,
  Smartphone,
  Minus,
  Plus,
  CreditCard,
  GitFork,
  Wallet,
  Lock,
  Award,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { CartItem, PaymentMethod } from '../types';
import { ItemDiscountModal } from './ItemDiscountModal';
import { VoidModal } from './VoidModal';
import { CustomerSelectModal } from './CustomerSelectModal';
import { CartLineItem } from './CartLineItem';
import { ShiftSessionClosedCard } from './shift/ShiftSessionClosedCard';
import { ShiftInitializationCard } from './shift/ShiftInitializationCard';
import { Haptics } from '../utils/haptics';
import { roundCashHalfUp, hasCents } from '../utils/cashRounding';
import { calculateMonthlyTargetPacing, getPeriodKey } from '../utils/biEngine';
import { getItemLineTotal } from '../utils/discountUtils';

interface RegisterViewProps {
  onProceedToPayment: (method?: PaymentMethod) => void;
  openBarcodeScanner: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({
  onProceedToPayment,
  openBarcodeScanner,
}) => {
  const {
    products,
    categories,
    currentLocation,
    cart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    cartSubtotal,
    cartTax,
    cartTaxBreakdown,
    cartDiscount,
    cartTotal,
    currentBusiness,
    handleBarcodeScanned,
    openUnknownBarcodeModal,
    can,
    openReturnsModal,
    settleExactCash,
    activeShift,
    openShiftManagement,
    selectedCustomer,
    setSelectedCustomer,
    isSellingMode,
    heldOrders,
    holdActiveCart,
    resumeHeldOrder,
    discardHeldOrder,
    transactions,
    analyticsRollups,
    analyticsTargets,
    shiftHistory,
    isSuperAdmin,
    entitlements,
    requireCapability,
    loyaltySettings,
    showToast,
    t,
  } = usePos();

  const canManageInventory = can('manageInventory');
  const canUseStoreCredit = isSuperAdmin || entitlements.capabilities.loyaltyAndStoreCredit;
  const canRedeemLoyalty = can('manageLoyalty');

  const [selectedCategory, setSelectedCategory] = useState<string>('All Items');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mobileActiveView, setMobileActiveView] = useState<'catalog' | 'cart'>('catalog');
  const [selectedDiscountItem, setSelectedDiscountItem] = useState<CartItem | null>(null);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState<boolean>(false);
  const [isCustomerSelectOpen, setIsCustomerSelectOpen] = useState<boolean>(false);

  const [isInitializingShift, setIsInitializingShift] = useState<boolean>(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState<boolean>(false);
  const [isHeldOrdersOpen, setIsHeldOrdersOpen] = useState<boolean>(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState<boolean>(false);
  const [isPaceBannerDismissed, setIsPaceBannerDismissed] = useState<boolean>(false);

  const REGISTER_VIEW_MODE_KEY = 'sokopos_register_view_mode';
  const [catalogViewMode, setCatalogViewMode] = useState<'cards' | 'table'>(() => {
    try {
      const saved = localStorage.getItem(REGISTER_VIEW_MODE_KEY);
      return saved === 'table' ? 'table' : 'cards';
    } catch {
      return 'cards';
    }
  });

  const handleSelectCatalogViewMode = (mode: 'cards' | 'table') => {
    setCatalogViewMode(mode);
    try {
      localStorage.setItem(REGISTER_VIEW_MODE_KEY, mode);
    } catch {
      // Ignore storage errors
    }
  };

  const activePeriodKey = getPeriodKey();
  const registerTargetPacing = useMemo(
    () =>
      calculateMonthlyTargetPacing({
        periodKey: activePeriodKey,
        selectedLocationId: currentLocation.id,
        targets: analyticsTargets,
        transactions: transactions || [],
        rollups: analyticsRollups || [],
        products: products || [],
        shifts: shiftHistory || [],
        allowStoreFallback: true,
      }),
    [
      activePeriodKey,
      currentLocation.id,
      analyticsTargets,
      transactions,
      analyticsRollups,
      products,
      shiftHistory,
    ]
  );

  const cartGrossBeforeDiscount = cartSubtotal + cartDiscount;
  const cartEffectiveDiscountPct =
    cartGrossBeforeDiscount > 0 ? (cartDiscount / cartGrossBeforeDiscount) * 100 : 0;
  const branchDiscountCeilingPct = registerTargetPacing.target?.maxDiscountPct ?? 0;
  const isCartOverDiscountCeiling =
    branchDiscountCeilingPct > 0 &&
    cartDiscount > 0 &&
    cartEffectiveDiscountPct > branchDiscountCeilingPct;

  // Void Management Modal State (Edge Case 1)
  const [voidModalState, setVoidModalState] = useState<{
    isOpen: boolean;
    voidType: 'line_item' | 'cart_void';
    item?: CartItem | null;
    itemsToVoid: CartItem[];
  }>({
    isOpen: false,
    voidType: 'line_item',
    item: null,
    itemsToVoid: [],
  });

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const heldOrdersRef = useRef<HTMLDivElement>(null);

  const RECENT_SEARCHES_STORAGE_KEY = 'sokopos_recent_searches';
  const MAX_RECENT_SEARCHES = 8;

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (item): item is string => typeof item === 'string' && item.trim().length > 0
          );
        }
      }
    } catch {
      // Ignore read errors
    }
    return [];
  });
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      try {
        localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore write errors
      }
      return updated;
    });
  };

  const removeRecentSearch = (termToRemove: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRecentSearches((prev) => {
      const updated = prev.filter((item) => item !== termToRemove);
      try {
        localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore write errors
      }
      return updated;
    });
  };

  const clearAllRecentSearches = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
    } catch {
      // Ignore write errors
    }
  };

  const handleSelectRecentSearch = (term: string) => {
    setSearchQuery(term);
    saveRecentSearch(term);
    setIsSearchFocused(false);
    searchInputRef.current?.focus();
  };

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
      }
      if (
        quickActionsRef.current &&
        !quickActionsRef.current.contains(event.target as Node)
      ) {
        setIsQuickActionsOpen(false);
      }
      if (
        heldOrdersRef.current &&
        !heldOrdersRef.current.contains(event.target as Node)
      ) {
        setIsHeldOrdersOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Global Ctrl+F / Cmd+F shortcut to focus product search while on the register tab
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setMobileActiveView('catalog');
        setTimeout(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
          setIsSearchFocused(true);
        }, 20);
      }
    };

    const handleFocusSearchEvent = () => {
      setMobileActiveView('catalog');
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        setIsSearchFocused(true);
      }, 20);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('focus-register-search', handleFocusSearchEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('focus-register-search', handleFocusSearchEvent);
    };
  }, []);

  // Filtered products (Unconditional Hook at Top Level)
  const filteredProducts = useMemo(() => {
    return (products || []).filter((p) => {
      const matchCategory =
        selectedCategory === 'All Items' || p.category === selectedCategory;
      const matchSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.includes(searchQuery.trim());
      return matchCategory && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const totalCartCount = (cart || []).reduce((acc, item) => acc + item.quantity, 0);

  const handleOpenCartVoid = () => {
    if (cart.length === 0) return;
    setVoidModalState({
      isOpen: true,
      voidType: 'cart_void',
      item: null,
      itemsToVoid: cart,
    });
  };

  const handleOpenLineItemVoid = (targetItem: CartItem) => {
    setVoidModalState({
      isOpen: true,
      voidType: 'line_item',
      item: targetItem,
      itemsToVoid: [targetItem],
    });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (searchQuery) {
        setSearchQuery('');
      } else {
        (e.target as HTMLInputElement).blur();
        setIsSearchFocused(false);
      }
      return;
    }
    if (e.key === 'Enter') {
      if (searchQuery.trim()) {
        e.preventDefault();
        const term = searchQuery.trim();
        saveRecentSearch(term);
        setIsSearchFocused(false);

        // 1. Direct barcode or SKU lookup
        const res = handleBarcodeScanned(term);
        if (res.success) {
          setSearchQuery('');
          return;
        }
        // 2. If exactly one product matches the search query, add it directly to cart
        if (filteredProducts.length === 1) {
          addToCart(filteredProducts[0], 1);
          setSearchQuery('');
          return;
        }
        // 3. Unrecognized barcode/SKU with zero catalog matches -> open unified Quick-Add / Restricted notice
        if (res.reason === 'not_found' && filteredProducts.length === 0) {
          openUnknownBarcodeModal(term, { source: 'search' });
        }
      } else if (cart.length > 0) {
        // Quick Settle on empty Enter
        e.preventDefault();
        onProceedToPayment();
      }
    }
  };

  // Strict Rule: The sales interface remains completely inaccessible until a shift session is active
  if (!activeShift || activeShift.status !== 'open') {
    return (
      <div
        id="register-session-locked-view"
        className="flex-1 h-full w-full flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-100 overflow-y-auto"
      >
        <div className="my-auto w-full flex flex-col items-center justify-center">
          {!isInitializingShift ? (
            <ShiftSessionClosedCard
              onOpenShiftClick={() => setIsInitializingShift(true)}
            />
          ) : (
            <div className="w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-150">
              <div className="max-w-lg w-full mb-3 flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => setIsInitializingShift(false)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs transition cursor-pointer"
                >
                  ← Back to Closed Status
                </button>
                {!isSellingMode && (
                  <button
                    type="button"
                    onClick={openShiftManagement}
                    className="text-xs font-bold text-[#132c54] hover:underline cursor-pointer"
                  >
                    Open in Shift &amp; Till Tab →
                  </button>
                )}
              </div>
              <ShiftInitializationCard
                onSuccess={() => setIsInitializingShift(false)}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  const isTaxExclusive = currentBusiness?.taxSettings?.pricingType === 'exclusive';
  const summarySubtotalAmount = isTaxExclusive ? cartSubtotal : cartTotal + cartDiscount;

  return (
    <div id="register-pos-workspace" className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#f8fafc] text-slate-950 relative min-h-0 h-full w-full">
      {/* Mobile Top Segmented View Switcher */}
      <div className="md:hidden bg-white border-b border-slate-300 px-3 py-2 flex items-center gap-2 shrink-0 z-20">
        <button
          type="button"
          onClick={() => setMobileActiveView('catalog')}
          className={`flex-1 min-h-[44px] py-2 px-3 rounded-lg text-xs font-bold transition-colors duration-150 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            mobileActiveView === 'catalog'
              ? 'bg-[#1d4ed8] text-white'
              : 'bg-[#f8fafc] border border-slate-300 text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
          <span className="tabular-nums">Catalog ({filteredProducts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileActiveView('cart')}
          className={`flex-1 min-h-[44px] py-2 px-3 rounded-lg text-xs font-bold transition-colors duration-150 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            mobileActiveView === 'cart'
              ? 'bg-[#1d4ed8] text-white'
              : 'bg-[#f8fafc] border border-slate-300 text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
          <span className="tabular-nums">Order ({totalCartCount})</span>
          {totalCartCount > 0 && (
            <span className={`text-[11px] font-mono tabular-nums ${mobileActiveView === 'cart' ? 'text-blue-100' : 'text-slate-600'}`}>
              · {currentLocation.currency} {cartTotal.toFixed(0)}
            </span>
          )}
        </button>
      </div>

      {/* Products Workspace (Left / 62% on desktop, full screen on mobile catalog view) */}
      <div
        className={`flex-1 md:w-[62%] p-3 sm:p-4 flex flex-col gap-2.5 sm:gap-3 border-r border-slate-300 bg-[#f8fafc] overflow-hidden relative min-h-0 ${
          mobileActiveView === 'catalog' ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Prominent Walk-in Customer Selector Bar */}
        <div className="shrink-0">
          {!selectedCustomer ? (
            <button
              id="register-customer-selector-btn"
              type="button"
              onClick={() => setIsCustomerSelectOpen(true)}
              className="w-full min-h-[44px] bg-white hover:bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 flex items-center justify-between gap-2 transition-colors duration-150 cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-[#1d4ed8]"
              title="Select customer for loyalty points or store credit"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-[#1d4ed8] flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs sm:text-sm font-bold text-slate-950 truncate">
                    Walk-in Customer
                  </span>
                  <span className="hidden sm:inline text-xs text-slate-500">
                    · Tap to assign loyalty or credit tab
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1d4ed8] shrink-0 whitespace-nowrap">
                <span>Assign</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </span>
            </button>
          ) : (
            <div className="w-full min-h-[44px] bg-white border-2 border-[#1d4ed8] rounded-xl px-3 py-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#1d4ed8] text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {selectedCustomer.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-slate-950 truncate">
                      {selectedCustomer.name}
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-slate-600 truncate">
                      {selectedCustomer.phone}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] tabular-nums">
                    <span className="text-slate-700 font-semibold inline-flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-600" />
                      {selectedCustomer.loyaltyPoints || 0} pts
                    </span>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span
                      className={`font-bold font-mono tabular-nums ${
                        (selectedCustomer.storeCreditBalance || 0) < 0
                          ? 'text-[#b91c1c]'
                          : (selectedCustomer.storeCreditBalance || 0) > 0
                          ? 'text-[#047857]'
                          : 'text-slate-600'
                      }`}
                    >
                      {(selectedCustomer.storeCreditBalance || 0) < 0
                        ? `Tab: -${currentLocation.currency} ${Math.abs(selectedCustomer.storeCreditBalance).toFixed(0)}`
                        : (selectedCustomer.storeCreditBalance || 0) > 0
                        ? `Credit: +${currentLocation.currency} ${selectedCustomer.storeCreditBalance.toFixed(0)}`
                        : 'Tab: Clear'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCustomerSelectOpen(true)}
                  className="min-h-[40px] px-2.5 text-xs font-bold text-[#1d4ed8] hover:bg-blue-50 rounded-lg transition cursor-pointer whitespace-nowrap"
                  title="Change customer"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 hover:text-[#b91c1c] rounded-lg hover:bg-red-50 transition cursor-pointer"
                  title="Reset to Walk-in Customer"
                  aria-label="Reset to Walk-in Customer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Unified Single-Row Command Bar (Search + Scan + Cards/Express Table Toggle + More) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Search with Barcode Enter support & Ctrl+F shortcut */}
          <div ref={searchContainerRef} className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="register-search-input"
              ref={searchInputRef}
              type="text"
              placeholder={t('reg_search_placeholder', 'Product name / SKU / Barcode...')}
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full min-h-[44px] bg-white border border-slate-300 rounded-xl py-2 pl-9 pr-28 sm:pr-32 text-base sm:text-xs font-semibold text-slate-950 placeholder:text-slate-500 focus:outline-none focus:border-[#1d4ed8] focus:ring-2 focus:ring-blue-100 transition"
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  title="Clear search"
                  className="min-w-[34px] min-h-[34px] flex items-center justify-center hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={openBarcodeScanner}
                className="min-h-[34px] px-2.5 py-1 bg-[#f8fafc] hover:bg-slate-200 border border-slate-300 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0"
                title="Open Camera Scanner (F2)"
              >
                <Scan className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                <span>{t('action_scan', 'Scan')}</span>
              </button>
            </div>

            {/* Recent Searches Dropdown Popover */}
            {isSearchFocused && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white rounded-xl shadow-lg border border-slate-300 py-1.5 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Recent Searches</span>
                  </div>
                  {recentSearches.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllRecentSearches}
                      className="min-h-[32px] px-2 text-[11px] font-bold text-slate-600 hover:text-[#b91c1c] rounded transition cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {recentSearches.length > 0 ? (
                  <div className="max-h-56 overflow-y-auto py-1">
                    {recentSearches.map((term) => {
                      const matchCount = (products || []).filter(
                        (p) =>
                          p.name.toLowerCase().includes(term.toLowerCase()) ||
                          p.sku.toLowerCase().includes(term.toLowerCase()) ||
                          p.barcode.includes(term)
                      ).length;

                      return (
                        <div
                          key={term}
                          onClick={() => handleSelectRecentSearch(term)}
                          className="flex items-center justify-between pl-3 pr-1.5 py-1 hover:bg-slate-50 transition-colors cursor-pointer group text-xs min-h-[44px]"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#1d4ed8] shrink-0" />
                            <span className="font-semibold text-slate-900 group-hover:text-[#1d4ed8] truncate">
                              {term}
                            </span>
                            <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                              · {matchCount} {matchCount === 1 ? 'match' : 'matches'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => removeRecentSearch(term, e)}
                            title={`Remove "${term}" from history`}
                            aria-label={`Remove "${term}" from recent searches`}
                            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 hover:text-[#b91c1c] hover:bg-red-50 rounded-lg transition shrink-0 ml-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-3 py-3 text-center text-slate-500 text-xs">
                    <p className="font-semibold text-slate-700">No recent searches yet</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Products searched by name, SKU or barcode will appear here.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Segmented View Switcher: Product Cards vs Express Table */}
          <div
            role="group"
            aria-label="Catalog display mode"
            className="inline-flex items-center bg-white border border-slate-300 rounded-xl p-0.5 shrink-0"
          >
            <button
              id="register-cards-view-toggle"
              type="button"
              onClick={() => handleSelectCatalogViewMode('cards')}
              aria-pressed={catalogViewMode === 'cards'}
              title="Visual Product Cards (Best for loose & un-barcoded goods)"
              className={`min-h-[40px] px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                catalogViewMode === 'cards'
                  ? 'bg-[#1d4ed8] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">Cards</span>
            </button>
            <button
              id="register-express-table-toggle"
              type="button"
              onClick={() => handleSelectCatalogViewMode('table')}
              aria-pressed={catalogViewMode === 'table'}
              title="Express Table (High-density barcode & tabular entry)"
              className={`min-h-[40px] px-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                catalogViewMode === 'table'
                  ? 'bg-[#1d4ed8] text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Table2 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Express</span>
            </button>
          </div>

          {/* Progressive Register Quick Actions Popover */}
          <div ref={quickActionsRef} className="relative shrink-0">
            <button
              id="register-quick-actions-btn"
              type="button"
              aria-expanded={isQuickActionsOpen}
              onClick={() => setIsQuickActionsOpen((prev) => !prev)}
              className="min-h-[44px] px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-900 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap"
              title="More Register Actions"
            >
              <MoreHorizontal className="w-4 h-4 text-slate-700 shrink-0" />
              <span className="hidden xl:inline">More</span>
            </button>

            {isQuickActionsOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-lg border border-slate-300 p-1.5 z-40 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    setIsCustomerSelectOpen(true);
                  }}
                  className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-lg text-left font-semibold text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                >
                  <User className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="truncate">
                    {selectedCustomer ? `Customer: ${selectedCustomer.name}` : 'Assign Customer'}
                  </span>
                </button>
                {heldOrders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickActionsOpen(false);
                      setMobileActiveView('cart');
                      setIsHeldOrdersOpen(true);
                    }}
                    className="w-full min-h-[44px] flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-left font-semibold text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <PauseCircle className="w-4 h-4 text-slate-600 shrink-0" />
                      <span>{t('reg_resume_cart', 'Held Orders')}</span>
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#1d4ed8] tabular-nums">
                      {heldOrders.length}
                    </span>
                  </button>
                )}
                {!isSellingMode && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickActionsOpen(false);
                        openReturnsModal(null);
                      }}
                      className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-lg text-left font-semibold text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4 text-slate-600 shrink-0" />
                      <span>{t('nav_returns', 'Returns & Refunds')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickActionsOpen(false);
                        openShiftManagement();
                      }}
                      className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 rounded-lg text-left font-semibold text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <Clock className="w-4 h-4 text-slate-600 shrink-0" />
                      <span>Shift &amp; Till Drawer</span>
                    </button>
                  </>
                )}

                <div className="mt-1 pt-1.5 px-3 pb-1 border-t border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Keyboard className="w-3.5 h-3.5 text-slate-600" />
                    <span>Shortcuts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Search catalog</span>
                    <kbd className="font-mono font-semibold text-slate-900">Ctrl+F</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Exact Cash</span>
                    <kbd className="font-mono font-semibold text-slate-900">F1</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Pay / Checkout</span>
                    <kbd className="font-mono font-semibold text-slate-900">Enter / Space</kbd>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Non-Blocking Daily Target Pacing Strip */}
        {registerTargetPacing.hasRevenueTarget && !isPaceBannerDismissed && (
          <div className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white flex items-center justify-between gap-2 text-xs shrink-0 text-slate-900">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <Target
                className={`w-3.5 h-3.5 shrink-0 ${
                  registerTargetPacing.revenueStatus === 'behind'
                    ? 'text-[#b91c1c]'
                    : registerTargetPacing.revenueStatus === 'watch'
                    ? 'text-slate-700'
                    : 'text-[#047857]'
                }`}
              />
              <span className="font-bold truncate">{currentLocation.name} Pace</span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="font-mono font-semibold tabular-nums">
                {registerTargetPacing.revenueRemaining <= 0
                  ? `Month goal met (${registerTargetPacing.revenuePct.toFixed(0)}%)`
                  : `Today ${currentLocation.currency} ${registerTargetPacing.todayNetRevenue.toLocaleString(
                      undefined,
                      { maximumFractionDigits: 0 }
                    )} / ${currentLocation.currency} ${registerTargetPacing.requiredDailyRunRate.toLocaleString(
                      undefined,
                      { maximumFractionDigits: 0 }
                    )} daily target`}
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">·</span>
              <span className="font-bold hidden sm:inline whitespace-nowrap">
                {registerTargetPacing.revenueStatus === 'achieved'
                  ? 'Goal Achieved'
                  : registerTargetPacing.revenueStatus === 'on_track'
                  ? 'On Pace'
                  : registerTargetPacing.revenueStatus === 'watch'
                  ? 'Watch Pace'
                  : 'Behind Pace'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsPaceBannerDismissed(true)}
              aria-label="Dismiss daily pace indicator"
              className="p-1 rounded text-slate-500 hover:text-slate-950 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Category Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 shrink-0 scrollbar-none touch-pan-x">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#1d4ed8] ${
                selectedCategory === cat
                  ? 'bg-[#1d4ed8] text-white border border-[#1d4ed8]'
                  : 'bg-white border border-slate-300 text-slate-900 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Catalog Viewport: Product Cards Grid OR High-Density Express Table */}
        <div className="flex-1 overflow-y-auto pr-0.5 sm:pr-1 pb-20 md:pb-0">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-slate-500 text-center bg-white border border-slate-300 rounded-xl">
              <ShoppingBag className="w-12 h-12 mb-3 stroke-1 text-slate-400" />
              <p className="text-sm font-bold text-slate-900">
                {searchQuery.trim()
                  ? `No items match "${searchQuery.trim()}"`
                  : 'No items match your criteria'}
              </p>
              <p className="text-xs text-slate-600 mt-1 max-w-sm">
                {searchQuery.trim()
                  ? !isSellingMode && canManageInventory
                    ? 'You can add this barcode or SKU directly to your catalog, or clear the search.'
                    : isSellingMode
                    ? 'Try another category or clear the search query.'
                    : 'Try another category, clear the search query, or ask a manager to add missing stock.'
                  : 'Try another category or clear the search query.'}
              </p>
              {searchQuery.trim() && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {!isSellingMode && canManageInventory && (
                    <button
                      type="button"
                      onClick={() => openUnknownBarcodeModal(searchQuery.trim(), { source: 'search' })}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                    >
                      <PackagePlus className="w-4 h-4" />
                      <span>Add &quot;{searchQuery.trim()}&quot; to Inventory</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-900 text-xs font-bold transition cursor-pointer whitespace-nowrap"
                  >
                    Clear Search
                  </button>
                </div>
              )}
            </div>
          ) : catalogViewMode === 'cards' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {filteredProducts.map((prod) => {
                const stock = prod.stockByLocation[currentLocation.id] ?? 0;
                const isOutOfStock = stock <= 0;
                const isLowStock = stock > 0 && stock <= prod.reorderPoint;
                const inCart = cart.find((item) => item.productId === prod.id);

                return (
                  <button
                    key={prod.id}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => {
                      if (searchQuery.trim()) {
                        saveRecentSearch(searchQuery.trim());
                      }
                      addToCart(prod);
                    }}
                    title={isOutOfStock ? `Cannot sell ${prod.name}: 0 stock available` : `Add ${prod.name} to cart`}
                    className={`rounded-xl p-3.5 min-h-[96px] flex flex-col justify-between text-left transition-all duration-150 select-none relative touch-manipulation ${
                      isOutOfStock
                        ? 'bg-slate-100 border border-slate-300 opacity-65 cursor-not-allowed'
                        : inCart
                        ? 'bg-blue-50/70 border-2 border-[#1d4ed8] cursor-pointer hover:bg-blue-50 active:scale-[0.98]'
                        : 'bg-white border border-slate-300 cursor-pointer hover:border-[#1d4ed8] active:scale-[0.98] group'
                    }`}
                  >
                    {inCart && (
                      <div className="absolute top-2.5 right-2.5 bg-[#1d4ed8] text-white text-[11px] font-mono font-bold tabular-nums min-w-[24px] h-[24px] px-1.5 rounded-md flex items-center justify-center">
                        {inCart.quantity}
                      </div>
                    )}

                    <div className="w-full pr-7">
                      <h4 className={`text-xs sm:text-[13px] font-bold leading-snug line-clamp-2 ${isOutOfStock ? 'text-slate-600' : 'text-slate-950 group-hover:text-[#1d4ed8] transition-colors'}`}>
                        {prod.name}
                      </h4>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between gap-2 w-full">
                      <div className="min-w-0">
                        {isOutOfStock ? (
                          <span className="text-[11px] text-[#b91c1c] font-bold inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>Out</span>
                          </span>
                        ) : isLowStock ? (
                          <span className="text-[11px] text-slate-700 font-bold tabular-nums">
                            {stock} left
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-600 font-medium tabular-nums">
                            {stock} stock
                          </span>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`text-xs sm:text-sm font-bold font-mono tabular-nums tracking-tight ${isOutOfStock ? 'text-slate-500 line-through' : 'text-[#1d4ed8]'}`}>
                          {currentLocation.currency} {prod.sellingPrice.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Express Table Mode: High-Density Supermarket Tabular Scan & Touch Entry */
            <div className="bg-white border border-slate-300 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-300 text-[11px] font-bold uppercase tracking-wide text-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-2 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">
                        Unit ({currentLocation.currency})
                      </th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">
                        Subtotal ({currentLocation.currency})
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs sm:text-[13px]">
                    {filteredProducts.map((prod) => {
                      const stock = prod.stockByLocation[currentLocation.id] ?? 0;
                      const isOutOfStock = stock <= 0;
                      const isLowStock = stock > 0 && stock <= prod.reorderPoint;
                      const inCart = cart.find((item) => item.productId === prod.id);
                      const rowSubtotal = inCart ? getItemLineTotal(inCart) : 0;

                      return (
                        <tr
                          key={prod.id}
                          className={`transition-colors ${
                            isOutOfStock
                              ? 'bg-slate-100/80 opacity-65'
                              : inCart
                              ? 'bg-blue-50/70'
                              : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2 px-3 align-middle">
                            <button
                              type="button"
                              disabled={isOutOfStock}
                              onClick={() => {
                                if (searchQuery.trim()) {
                                  saveRecentSearch(searchQuery.trim());
                                }
                                addToCart(prod);
                              }}
                              className="w-full text-left min-h-[44px] flex flex-col justify-center cursor-pointer disabled:cursor-not-allowed"
                            >
                              <div className="font-bold text-slate-950 leading-snug line-clamp-1">
                                {prod.name}
                              </div>
                              <div className="text-[11px] text-slate-600 font-mono tabular-nums flex items-center gap-1.5 mt-0.5">
                                <span>{prod.sku || prod.barcode}</span>
                                <span className="text-slate-300" aria-hidden="true">·</span>
                                {isOutOfStock ? (
                                  <span className="font-sans font-bold text-[#b91c1c]">Out of stock</span>
                                ) : isLowStock ? (
                                  <span className="font-sans font-bold text-slate-800">{stock} left</span>
                                ) : (
                                  <span className="font-sans text-slate-600">{stock} in stock</span>
                                )}
                              </div>
                            </button>
                          </td>

                          <td className="py-2 px-2 align-middle text-center">
                            {isOutOfStock ? (
                              <span className="text-[11px] font-bold text-[#b91c1c]">—</span>
                            ) : inCart ? (
                              <div className="inline-flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => {
                                    Haptics.light();
                                    if (inCart.quantity <= 1) {
                                      handleOpenLineItemVoid(inCart);
                                    } else {
                                      updateCartQuantity(prod.id, inCart.quantity - 1);
                                    }
                                  }}
                                  className="w-11 h-11 flex items-center justify-center text-slate-900 hover:bg-slate-100 active:bg-blue-100 transition cursor-pointer touch-manipulation"
                                  aria-label={`Decrease quantity of ${prod.name}`}
                                  title="Decrease quantity"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="min-w-[28px] px-1 text-center font-mono font-bold tabular-nums text-[#1d4ed8]">
                                  {inCart.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    Haptics.light();
                                    addToCart(prod, 1);
                                  }}
                                  className="w-11 h-11 flex items-center justify-center text-slate-900 hover:bg-slate-100 active:bg-blue-100 transition cursor-pointer touch-manipulation"
                                  aria-label={`Increase quantity of ${prod.name}`}
                                  title="Increase quantity"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (searchQuery.trim()) {
                                    saveRecentSearch(searchQuery.trim());
                                  }
                                  addToCart(prod, 1);
                                }}
                                className="min-h-[44px] px-3 rounded-lg border border-slate-300 bg-white hover:border-[#1d4ed8] hover:text-[#1d4ed8] text-slate-950 text-xs font-bold inline-flex items-center justify-center gap-1 transition cursor-pointer touch-manipulation whitespace-nowrap"
                                aria-label={`Add ${prod.name} to order`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                              </button>
                            )}
                          </td>

                          <td className="py-2 px-3 align-middle text-right font-mono font-semibold tabular-nums text-slate-900 whitespace-nowrap">
                            {prod.sellingPrice.toFixed(2)}
                          </td>

                          <td className="py-2 px-3 align-middle text-right font-mono font-bold tabular-nums whitespace-nowrap">
                            {inCart ? (
                              <span className="text-[#1d4ed8]">{rowSubtotal.toFixed(2)}</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Summary & Checkout Rail (Right / 38% on desktop, full screen on mobile cart view) */}
      <div
        className={`md:w-[38%] bg-white flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-300 h-full min-h-0 overflow-hidden relative ${
          mobileActiveView === 'cart' ? 'flex flex-1' : 'hidden md:flex'
        }`}
      >
        {/* Rail Header */}
        <div className="px-3.5 py-2.5 sm:px-4 border-b border-slate-300 flex justify-between items-center bg-white shrink-0 gap-2">
          <div className="min-w-0 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-[#1d4ed8] shrink-0" />
            <h2 className="font-display font-bold text-slate-950 text-sm sm:text-base truncate">
              Order Summary
              <span className="text-slate-300 font-normal"> · </span>
              <span className="text-[#1d4ed8] font-mono font-bold tabular-nums">
                {totalCartCount} {totalCartCount === 1 ? t('reg_item', 'item') : t('reg_items', 'items')}
              </span>
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setMobileActiveView('catalog')}
            className="md:hidden min-h-[40px] px-3 py-1.5 text-xs font-bold text-[#1d4ed8] border border-slate-300 bg-[#f8fafc] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            + Add Items
          </button>
        </div>

        {/* Mobile Cart Customer Quick Strip (Desktop keeps Walk-in Customer bar visible on left) */}
        <div className="md:hidden px-3.5 py-2 bg-[#f8fafc] border-b border-slate-300 shrink-0">
          <button
            type="button"
            onClick={() => setIsCustomerSelectOpen(true)}
            className="w-full min-h-[40px] flex items-center justify-between gap-2 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2 min-w-0">
              <User className="w-4 h-4 text-[#1d4ed8] shrink-0" />
              <span className="text-xs font-bold text-slate-950 truncate">
                {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
              </span>
              {selectedCustomer && (
                <span className="text-[11px] font-mono text-slate-600 tabular-nums shrink-0">
                  · {selectedCustomer.loyaltyPoints || 0} pts
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-[#1d4ed8] shrink-0">
              {selectedCustomer ? 'Change' : 'Assign'}
            </span>
          </button>
        </div>

        {/* Separated Clean Secondary Utility Bar (Quiet neutral controls, Void isolated far right) */}
        <div className="px-3 py-1.5 bg-[#f8fafc] border-b border-slate-300 flex items-center justify-between gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              id="register-hold-cart-btn"
              type="button"
              disabled={cart.length === 0}
              onClick={() => holdActiveCart()}
              className="min-h-[40px] px-2.5 py-1.5 bg-[#EE8C03] hover:bg-[#d47c02] disabled:opacity-45 disabled:bg-slate-200 disabled:text-slate-500 border border-[#EE8C03] disabled:border-slate-300 text-xs font-bold text-white rounded-lg transition-colors duration-150 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
              title="Place current basket on hold to serve next customer"
            >
              <PauseCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{t('reg_hold_cart', 'Hold')}</span>
            </button>

            {heldOrders.length > 0 && (
              <div ref={heldOrdersRef} className="relative">
                <button
                  id="register-held-orders-btn"
                  type="button"
                  aria-expanded={isHeldOrdersOpen}
                  onClick={() => setIsHeldOrdersOpen((prev) => !prev)}
                  className={`min-h-[40px] px-2.5 py-1.5 border text-xs font-bold rounded-lg transition-colors duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    isHeldOrdersOpen
                      ? 'bg-[#3d17b5] border-[#3d17b5] text-white'
                      : 'bg-[#4E21DF] hover:bg-[#411ab8] border-[#4E21DF] text-white'
                  }`}
                  title="Resume or manage held baskets"
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span className="tabular-nums">Held ({heldOrders.length})</span>
                </button>

                {isHeldOrdersOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-white rounded-xl shadow-lg border border-slate-300 p-2 z-40 text-xs">
                    <div className="px-2 py-1.5 border-b border-slate-200 flex items-center justify-between">
                      <span className="font-bold text-slate-950">Held Orders</span>
                      <span className="text-[11px] font-semibold text-slate-600 tabular-nums">
                        {heldOrders.length} parked
                      </span>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-200 mt-1">
                      {heldOrders.map((order) => {
                        const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
                        const heldTime = new Date(order.heldAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        return (
                          <div key={order.id} className="py-2 px-1.5 flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-950 truncate">
                                {order.customerName || 'Walk-in Basket'}
                              </div>
                              <div className="text-[11px] text-slate-600 tabular-nums mt-0.5">
                                {heldTime} · {itemCount} item{itemCount !== 1 ? 's' : ''} ·{' '}
                                <span className="font-mono font-bold text-slate-900">
                                  {currentLocation.currency} {order.total.toFixed(2)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  resumeHeldOrder(order.id);
                                  setIsHeldOrdersOpen(false);
                                }}
                                className="min-h-[40px] px-3 py-1 bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap"
                              >
                                Resume
                              </button>
                              <button
                                type="button"
                                onClick={() => discardHeldOrder(order.id)}
                                aria-label="Discard held order"
                                title="Discard held order"
                                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 hover:text-[#b91c1c] hover:bg-red-50 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isSellingMode && (
              <button
                type="button"
                onClick={() => openReturnsModal(null)}
                className="min-h-[40px] px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-900 rounded-lg transition-colors duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Process returns or refunds"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                <span>Returns</span>
              </button>
            )}
          </div>

          <button
            type="button"
            disabled={cart.length === 0}
            onClick={handleOpenCartVoid}
            className="min-h-[40px] px-2.5 py-1.5 bg-[#E81715] hover:bg-[#c81210] border border-[#E81715] disabled:opacity-45 disabled:bg-slate-200 disabled:border-slate-300 disabled:text-slate-500 text-xs font-bold text-white rounded-lg transition-colors duration-150 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
            title="Cancel sale and record audited cart void"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span>{t('reg_clear_cart', 'Void')}</span>
          </button>
        </div>

        {/* Cart Item List - Bounded scrolling container */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 divide-y divide-slate-200 overscroll-contain bg-white">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <ShoppingBag className="w-10 h-10 mb-2 stroke-1 text-slate-400" />
              <div className="text-xs font-bold text-slate-900">{t('reg_empty_cart', 'Your order is empty')}</div>
              <p className="text-[11px] text-slate-600 mt-1 max-w-[220px]">
                {t('reg_empty_cart_sub', 'Scan a barcode, search, or tap any product to start checkout.')}
              </p>
              <button
                type="button"
                onClick={() => setMobileActiveView('catalog')}
                className="mt-3 md:hidden min-h-[44px] text-xs font-bold text-white bg-[#1d4ed8] hover:bg-[#1e40af] px-4 py-2 rounded-xl transition-colors"
              >
                Browse Catalog
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <CartLineItem
                key={item.productId}
                item={item}
                currency={currentLocation.currency}
                onUpdateQuantity={updateCartQuantity}
                onOpenDiscountModal={(it) => {
                  setSelectedDiscountItem(it);
                  setIsDiscountModalOpen(true);
                }}
                onOpenLineItemVoid={handleOpenLineItemVoid}
              />
            ))
          )}
        </div>

        {/* Totals & 3 Primary Tender Keys - Permanently Sticky at Bottom */}
        <div className="shrink-0 sticky bottom-0 z-20 bg-white border-t border-slate-300 p-3 sm:p-4 space-y-2.5">
          {/* Structured Order Summary Metrics */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center text-slate-700">
              <span className="font-semibold">Total Quantity</span>
              <span className="font-mono font-bold tabular-nums text-slate-950">
                {totalCartCount}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-700">
              <span className="font-semibold">
                {isTaxExclusive ? t('reg_subtotal', 'Subtotal (Net)') : 'Subtotal'}
              </span>
              <span className="font-mono font-bold tabular-nums text-slate-950">
                {currentLocation.currency} {summarySubtotalAmount.toFixed(2)}
              </span>
            </div>

            {isTaxExclusive && (
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-semibold">
                  {currentBusiness?.taxSettings?.taxLabel || 'VAT'} (Exclusive)
                </span>
                <span className="font-mono font-bold tabular-nums text-slate-950">
                  {currentLocation.currency} {cartTax.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className={`font-semibold inline-flex items-center gap-1 ${cartDiscount > 0 ? 'text-[#047857]' : 'text-slate-700'}`}>
                {cartDiscount > 0 && <Tag className="w-3.5 h-3.5" />}
                <span>{t('reg_discount', 'Discount')}</span>
              </span>
              <span className={`font-mono font-bold tabular-nums ${cartDiscount > 0 ? 'text-[#047857]' : 'text-slate-950'}`}>
                {cartDiscount > 0 ? '- ' : ''}{currentLocation.currency} {cartDiscount.toFixed(2)}
              </span>
            </div>
          </div>

          {cartDiscount > 0 &&
            (isCartOverDiscountCeiling || registerTargetPacing.discountBreached) &&
            branchDiscountCeilingPct > 0 && (
              <div className="px-2.5 py-1.5 rounded-lg border border-red-300 bg-red-50 text-[#b91c1c] text-[11px] font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate font-mono tabular-nums">
                  {isCartOverDiscountCeiling
                    ? `Order discount ${cartEffectiveDiscountPct.toFixed(1)}% exceeds ${branchDiscountCeilingPct.toFixed(1)}% branch ceiling`
                    : `Branch MTD discount rate ${registerTargetPacing.discountLeakagePct.toFixed(1)}% exceeds ${branchDiscountCeilingPct.toFixed(1)}% ceiling`}
                </span>
              </div>
            )}

          {/* Progressive Tax & Cash Rounding Breakdown */}
          {cart.length > 0 && (
            <div>
              <button
                id="register-breakdown-toggle-btn"
                type="button"
                aria-expanded={isBreakdownOpen}
                onClick={() => setIsBreakdownOpen((prev) => !prev)}
                className="text-[11px] font-bold text-slate-600 hover:text-slate-950 inline-flex items-center gap-1 py-0.5 rounded transition cursor-pointer whitespace-nowrap"
              >
                <span>{isBreakdownOpen ? 'Hide tax & rounding' : 'Tax & rounding details'}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                    isBreakdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isBreakdownOpen && (
                <div className="mt-1.5 p-2.5 rounded-lg bg-[#f8fafc] border border-slate-300 space-y-1 text-[11px] text-slate-700">
                  <div className="flex justify-between">
                    <span>Net (Ex-Tax)</span>
                    <span className="font-mono font-bold tabular-nums text-slate-950">
                      {currentLocation.currency} {cartSubtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>
                      {currentBusiness?.taxSettings?.taxLabel || 'VAT'} ·{' '}
                      {isTaxExclusive ? 'Exclusive' : 'Inclusive'}
                      {cartTaxBreakdown && cartTaxBreakdown.length > 1 ? ` · ${cartTaxBreakdown.length} Rates` : ''}
                    </span>
                    <span className="font-mono font-bold tabular-nums text-slate-950">
                      {currentLocation.currency} {cartTax.toFixed(2)}
                    </span>
                  </div>
                  {hasCents(cartTotal) && (
                    <div className="pt-1 border-t border-slate-200 flex justify-between items-center tabular-nums">
                      <span>
                        Cash: <strong className="font-mono text-slate-950">{currentLocation.currency} {roundCashHalfUp(cartTotal).toFixed(2)}</strong>
                      </span>
                      <span>
                        Electronic: <strong className="font-mono text-slate-950">{currentLocation.currency} {cartTotal.toFixed(2)}</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Glare-Resistant High-Contrast Amount Due Hero Banner */}
          <div className="bg-slate-950 text-white rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
            <span className="font-display text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-200">
              Amount Due
            </span>
            <span className="font-mono font-bold tabular-nums text-xl sm:text-2xl text-white tracking-tight">
              {currentLocation.currency} {cartTotal.toFixed(2)}
            </span>
          </div>

          {/* Payment Methods Area (Migrated with Compact Scroller & Intelligent Tender Colors) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold uppercase tracking-wide text-slate-600">
                Payment Methods
              </span>
              <span className="font-semibold text-slate-500">
                Scroll for all 7
              </span>
            </div>

            <div
              className="grid grid-cols-2 gap-2 max-h-[106px] overflow-y-auto pr-1 overscroll-contain [scrollbar-width:thin] [scrollbar-color:#94a3b8_transparent]"
              role="group"
              aria-label="Payment methods"
            >
              {/* 1. Exact Cash (1-Tap Instant Settlement) */}
              <button
                id="register-exact-cash-btn"
                type="button"
                disabled={cart.length === 0}
                onClick={() => settleExactCash()}
                className="bg-white hover:bg-emerald-50 active:scale-[0.98] border-2 border-[#059E39] disabled:opacity-45 disabled:bg-slate-100 disabled:border-slate-300 disabled:text-slate-500 text-[#059E39] font-bold min-h-[44px] px-2.5 py-2 rounded-xl transition-all duration-150 text-xs flex items-center justify-between gap-1.5 cursor-pointer disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-[#059E39]"
                title="Instant single-tap exact cash checkout (Shortcut: F1)"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <Banknote className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t('pay_exact_amount', 'Exact Cash')}</span>
                </span>
                <span className="text-[10px] font-mono opacity-85 shrink-0 hidden sm:inline">
                  1-Tap
                </span>
              </button>

              {/* 2. M-Pesa */}
              <button
                id="register-mpesa-btn"
                type="button"
                disabled={cart.length === 0}
                onClick={() => onProceedToPayment('mpesa')}
                className="bg-[#44B703] hover:bg-[#389902] active:scale-[0.98] disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold min-h-[44px] px-2.5 py-2 rounded-xl transition-all duration-150 text-xs flex items-center justify-between gap-1.5 cursor-pointer disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#44B703]"
                title="Collect payment via M-Pesa Till QR or STK Push (F2)"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <span className="truncate">M-Pesa</span>
                </span>
                <span className="text-[10px] font-mono opacity-90 shrink-0 hidden sm:inline">
                  QR/STK
                </span>
              </button>

              {/* 3. Cash (Drawer Tender & Change Calculator) */}
              <button
                id="register-settle-btn"
                type="button"
                disabled={cart.length === 0}
                onClick={() => onProceedToPayment('cash')}
                className="bg-[#059E39] hover:bg-[#04842f] active:scale-[0.98] disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold min-h-[44px] px-2.5 py-2 rounded-xl transition-all duration-150 text-xs flex items-center justify-between gap-1.5 cursor-pointer disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#059E39]"
                title="Cash tender with note buttons & change calculator (F1 / Enter)"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <Banknote className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t('pay_cash', 'Cash')}</span>
                </span>
                <span className="text-[10px] font-mono opacity-90 shrink-0 hidden sm:inline">
                  Change
                </span>
              </button>

              {/* 4. Card (PDQ / Online Card) */}
              <button
                id="register-card-btn"
                type="button"
                disabled={cart.length === 0}
                onClick={() => onProceedToPayment('card')}
                className="bg-[#0655E3] hover:bg-[#0546bd] active:scale-[0.98] disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold min-h-[44px] px-2.5 py-2 rounded-xl transition-all duration-150 text-xs flex items-center justify-between gap-1.5 cursor-pointer disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0655E3]"
                title="Card checkout via PDQ terminal or Paystack (F3)"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <CreditCard className="w-4 h-4 shrink-0" />
                  <span className="truncate">Card</span>
                </span>
                <span className="text-[10px] font-mono opacity-90 shrink-0 hidden sm:inline">
                  PDQ
                </span>
              </button>

              {/* 5. Split Payment */}
              <button
                id="register-split-btn"
                type="button"
                disabled={cart.length === 0}
                onClick={() => onProceedToPayment('split')}
                className="bg-[#038BF9] hover:bg-[#0273cf] active:scale-[0.98] disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold min-h-[44px] px-2.5 py-2 rounded-xl transition-all duration-150 text-xs flex items-center justify-between gap-1.5 cursor-pointer disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#038BF9]"
                title="Split payment across Cash, M-Pesa, Card or Credit (F5)"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <GitFork className="w-4 h-4 rotate-90 shrink-0" />
                  <span className="truncate">Split Pay</span>
                </span>
                <span className="text-[10px] font-mono opacity-90 shrink-0 hidden sm:inline">
                  Multi
                </span>
              </button>

              {/* 6. Store Credit / Daftari Tab */}
              <button
                id="register-credit-btn"
                type="button"
                disabled={cart.length === 0}
                onClick={() => {
                  if (!requireCapability('loyaltyAndStoreCredit')) return;
                  onProceedToPayment('store_credit');
                }}
                className="bg-[#711CF4] hover:bg-[#5e15d1] active:scale-[0.98] disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold min-h-[44px] px-2.5 py-2 rounded-xl transition-all duration-150 text-xs flex items-center justify-between gap-1.5 cursor-pointer disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#711CF4]"
                title="Charge to customer Store Credit / Daftari tab (F4)"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <Wallet className="w-4 h-4 shrink-0" />
                  <span className="truncate">Store Credit</span>
                </span>
                <span className="text-[10px] font-mono opacity-90 shrink-0 flex items-center gap-0.5">
                  {!canUseStoreCredit ? (
                    <Lock className="w-3 h-3" />
                  ) : (
                    <span className="hidden sm:inline">Tab</span>
                  )}
                </span>
              </button>

              {/* 7. Loyalty Points Redemption */}
              <button
                id="register-loyalty-btn"
                type="button"
                disabled={cart.length === 0}
                onClick={() => {
                  if (!requireCapability('loyaltyAndStoreCredit')) return;
                  if (!canRedeemLoyalty) {
                    showToast('Permission Denied: Your role cannot redeem loyalty points.', 'error');
                    return;
                  }
                  onProceedToPayment('loyalty_points');
                }}
                className="bg-[#FA148B] hover:bg-[#d90f77] active:scale-[0.98] disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold min-h-[44px] px-2.5 py-2 rounded-xl transition-all duration-150 text-xs flex items-center justify-between gap-1.5 cursor-pointer disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FA148B]"
                title={
                  !loyaltySettings.enabled
                    ? 'Loyalty points program is disabled in Store Settings'
                    : 'Redeem customer loyalty points toward this sale (F6)'
                }
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <Award className="w-4 h-4 shrink-0" />
                  <span className="truncate">Loyalty Pts</span>
                </span>
                <span className="text-[10px] font-mono opacity-90 shrink-0 flex items-center gap-0.5">
                  {!canUseStoreCredit || !canRedeemLoyalty ? (
                    <Lock className="w-3 h-3" />
                  ) : selectedCustomer ? (
                    <span className="tabular-nums">{selectedCustomer.loyaltyPoints || 0}</span>
                  ) : (
                    <span className="hidden sm:inline">Pts</span>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Line Item Discount Modal */}
      <ItemDiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => {
          setIsDiscountModalOpen(false);
          setSelectedDiscountItem(null);
        }}
        item={selectedDiscountItem}
      />

      {/* Audited Void Management Modal (Edge Case 1) */}
      <VoidModal
        isOpen={voidModalState.isOpen}
        voidType={voidModalState.voidType}
        item={voidModalState.item}
        itemsToVoid={voidModalState.itemsToVoid}
        onClose={() =>
          setVoidModalState((prev) => ({ ...prev, isOpen: false, item: null, itemsToVoid: [] }))
        }
        onConfirmVoid={() => {
          if (voidModalState.voidType === 'line_item' && voidModalState.item) {
            removeFromCart(voidModalState.item.productId);
          } else if (voidModalState.voidType === 'cart_void') {
            clearCart();
          }
        }}
      />

      {/* Customer Quick Selector Modal */}
      <CustomerSelectModal
        isOpen={isCustomerSelectOpen}
        onClose={() => setIsCustomerSelectOpen(false)}
        onSelectCustomer={(c) => setSelectedCustomer(c)}
      />

      {/* Mobile Sticky Quick Checkout Strip (Flush above bottom nav, or flush to bottom in Selling Mode) */}
      {cart.length > 0 && mobileActiveView === 'catalog' && (
        <aside
          id="mobile-sticky-cart-pill"
          aria-label="Active order quick checkout bar"
          className={`md:hidden fixed inset-x-0 z-30 bg-white border-t border-slate-300 px-3 py-1.5 flex items-center justify-between gap-2 ${
            isSellingMode
              ? 'bottom-0 pb-[max(0.375rem,env(safe-area-inset-bottom,0px))]'
              : 'bottom-[calc(54px+env(safe-area-inset-bottom,0px))]'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              Haptics.light();
              setMobileActiveView('cart');
            }}
            className="flex items-center gap-2.5 min-w-0 flex-1 min-h-[44px] text-left cursor-pointer active:opacity-80"
            title="Inspect Active Order"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-[#1d4ed8] flex items-center justify-center shrink-0">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-950 flex items-center gap-1.5 truncate tabular-nums">
                <span>{totalCartCount} item{totalCartCount !== 1 ? 's' : ''}</span>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <span className="text-[#1d4ed8] font-mono">
                  {currentLocation.currency} {cartTotal.toFixed(2)}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 truncate flex items-center gap-0.5">
                <span>View order</span>
                <ChevronRight className="w-3 h-3 text-slate-500 inline" />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              Haptics.light();
              onProceedToPayment('cash');
            }}
            className="bg-[#1d4ed8] hover:bg-[#1e40af] active:bg-blue-900 text-white font-bold text-xs min-h-[44px] px-4 rounded-xl flex items-center gap-1.5 transition-colors duration-150 cursor-pointer shrink-0 whitespace-nowrap"
            title="Pay / Proceed to Checkout"
          >
            <span>Pay</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </aside>
      )}
    </div>
  );
};
