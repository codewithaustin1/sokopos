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
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { CartItem } from '../types';
import { ItemDiscountModal } from './ItemDiscountModal';
import { VoidModal } from './VoidModal';
import { CustomerSelectModal } from './CustomerSelectModal';
import { CartLineItem } from './CartLineItem';
import { ShiftSessionClosedCard } from './shift/ShiftSessionClosedCard';
import { ShiftInitializationCard } from './shift/ShiftInitializationCard';
import { Haptics } from '../utils/haptics';
import { roundCashHalfUp, hasCents } from '../utils/cashRounding';

interface RegisterViewProps {
  onProceedToPayment: () => void;
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
    currentUser,
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
    t,
  } = usePos();

  const canManageInventory = can('manageInventory');

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

  return (
    <div id="register-pos-workspace" className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100 relative min-h-0 h-full w-full">
      {/* Mobile Top Segmented View Switcher */}
      <div className="md:hidden bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2 shrink-0 z-20">
        <button
          type="button"
          onClick={() => setMobileActiveView('catalog')}
          className={`flex-1 min-h-[44px] py-2 px-3 rounded-lg text-xs font-semibold transition-colors duration-150 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            mobileActiveView === 'catalog'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
          <span className="tabular-nums">Catalog ({filteredProducts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileActiveView('cart')}
          className={`flex-1 min-h-[44px] py-2 px-3 rounded-lg text-xs font-semibold transition-colors duration-150 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            mobileActiveView === 'cart'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
          <span className="tabular-nums">Cart ({totalCartCount})</span>
          {totalCartCount > 0 && (
            <span className={`text-[11px] font-mono tabular-nums ${mobileActiveView === 'cart' ? 'text-blue-100' : 'text-slate-500'}`}>
              · {currentLocation.currency} {cartTotal.toFixed(0)}
            </span>
          )}
        </button>
      </div>

      {/* Products Workspace (Left / 62% on desktop, full screen on mobile catalog view) */}
      <div
        className={`flex-1 md:w-[62%] p-3 sm:p-4 flex flex-col gap-3 border-r border-slate-200 bg-slate-50 overflow-hidden relative min-h-0 ${
          mobileActiveView === 'catalog' ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Unified Single-Row Command Bar (Search + Scan + Progressive More Menu) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Search with Barcode Enter support & Ctrl+F shortcut */}
          <div ref={searchContainerRef} className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="register-search-input"
              ref={searchInputRef}
              type="text"
              placeholder={t('reg_search_placeholder', 'Search product, SKU or scan barcode...')}
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full min-h-[44px] bg-white border border-slate-300 rounded-lg py-2 pl-9 pr-32 text-base sm:text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
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
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-md transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={openBarcodeScanner}
                className="min-h-[34px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0"
                title="Open Camera Scanner (F2)"
              >
                <Scan className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>{t('action_scan', 'Scan')}</span>
              </button>
            </div>

            {/* Recent Searches Dropdown Popover */}
            {isSearchFocused && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-white rounded-xl shadow-md border border-slate-200 py-1.5 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 text-[11px]">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Recent Searches</span>
                  </div>
                  {recentSearches.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllRecentSearches}
                      className="min-h-[32px] px-2 text-[11px] font-medium text-slate-500 hover:text-red-600 rounded transition cursor-pointer"
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
                            <Clock className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                            <span className="font-medium text-slate-700 group-hover:text-blue-700 truncate">
                              {term}
                            </span>
                            <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                              · {matchCount} {matchCount === 1 ? 'match' : 'matches'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => removeRecentSearch(term, e)}
                            title={`Remove "${term}" from history`}
                            aria-label={`Remove "${term}" from recent searches`}
                            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0 ml-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-3 py-3 text-center text-slate-400 text-xs">
                    <p className="font-medium text-slate-500">No recent searches yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Products searched by name, SKU or barcode will appear here.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Progressive Register Quick Actions Popover */}
          <div ref={quickActionsRef} className="relative shrink-0">
            <button
              id="register-quick-actions-btn"
              type="button"
              aria-expanded={isQuickActionsOpen}
              onClick={() => setIsQuickActionsOpen((prev) => !prev)}
              className="min-h-[44px] px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap"
              title="More Register Actions"
            >
              <MoreHorizontal className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="hidden sm:inline">More</span>
            </button>

            {isQuickActionsOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-40 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionsOpen(false);
                    setIsCustomerSelectOpen(true);
                  }}
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 rounded-lg text-left font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  <User className="w-4 h-4 text-slate-500 shrink-0" />
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
                    className="w-full min-h-[40px] flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-left font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <PauseCircle className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>{t('reg_resume_cart', 'Held Orders')}</span>
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-blue-600 tabular-nums">
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
                      className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 rounded-lg text-left font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>{t('nav_returns', 'Returns & Refunds')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickActionsOpen(false);
                        openShiftManagement();
                      }}
                      className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 rounded-lg text-left font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>Shift &amp; Till Drawer</span>
                    </button>
                  </>
                )}

                <div className="mt-1 pt-1.5 px-3 pb-1 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-600">
                    <Keyboard className="w-3.5 h-3.5 text-slate-400" />
                    <span>Shortcuts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Search catalog</span>
                    <kbd className="font-mono text-slate-600">Ctrl+F</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Exact Cash</span>
                    <kbd className="font-mono text-slate-600">F1</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Pay / Checkout</span>
                    <kbd className="font-mono text-slate-600">Enter / Space</kbd>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 shrink-0 scrollbar-none touch-pan-x">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto pr-0.5 sm:pr-1 pb-20 md:pb-0">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-slate-400 text-center">
              <ShoppingBag className="w-12 h-12 mb-3 stroke-1 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">
                {searchQuery.trim()
                  ? `No items match "${searchQuery.trim()}"`
                  : 'No items match your criteria'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
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
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
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
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                  >
                    Clear Search
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-2.5 sm:gap-3">
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
                    className={`border rounded-xl p-3.5 min-h-[96px] flex flex-col justify-between text-left transition-all duration-150 select-none relative touch-manipulation ${
                      isOutOfStock
                        ? 'bg-slate-50/90 border-red-200/80 opacity-60 cursor-not-allowed'
                        : inCart
                        ? 'bg-blue-50/35 border-blue-600 cursor-pointer hover:bg-blue-50/60 active:scale-[0.98]'
                        : 'bg-white border-slate-200 cursor-pointer hover:border-blue-400 active:scale-[0.98] group'
                    }`}
                  >
                    {inCart && (
                      <div className="absolute top-2.5 right-2.5 bg-blue-600 text-white text-[11px] font-mono font-bold tabular-nums min-w-[24px] h-[24px] px-1.5 rounded-md flex items-center justify-center">
                        {inCart.quantity}
                      </div>
                    )}

                    <div className="w-full pr-7">
                      <h4 className={`text-xs sm:text-[13px] font-semibold leading-snug line-clamp-2 ${isOutOfStock ? 'text-slate-500' : 'text-slate-900 group-hover:text-blue-600 transition-colors'}`}>
                        {prod.name}
                      </h4>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between gap-2 w-full">
                      <div className="min-w-0">
                        {isOutOfStock ? (
                          <span className="text-[11px] text-red-600 font-semibold inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>Out of stock</span>
                          </span>
                        ) : isLowStock ? (
                          <span className="text-[11px] text-amber-700 font-semibold tabular-nums">
                            {stock} left (Low)
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium tabular-nums">
                            {stock} in stock
                          </span>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`text-xs sm:text-sm font-bold font-mono tabular-nums tracking-tight ${isOutOfStock ? 'text-slate-400 line-through' : 'text-blue-600'}`}>
                          {currentLocation.currency} {prod.sellingPrice.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart & Checkout Sidebar (Right / 38% on desktop, full screen on mobile cart view) */}
      <div
        className={`md:w-[38%] bg-white flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-200 h-full min-h-0 overflow-hidden relative ${
          mobileActiveView === 'cart' ? 'flex flex-1' : 'hidden md:flex'
        }`}
      >
        {/* Cart Header */}
        <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-slate-200 flex justify-between items-center bg-white shrink-0 gap-2 relative">
          <div className="min-w-0">
            <h2 className="font-display font-bold text-slate-900 text-sm sm:text-base truncate">
              {t('reg_cart_title', 'Active Order')}
              <span className="text-slate-300 font-normal"> · </span>
              <span className="text-blue-600 font-mono font-semibold tabular-nums">
                {totalCartCount} {totalCartCount === 1 ? t('reg_item', 'item') : t('reg_items', 'items')}
              </span>
            </h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!selectedCustomer && (
              <button
                type="button"
                onClick={() => setIsCustomerSelectOpen(true)}
                className="min-h-[40px] px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Assign customer for loyalty or store credit"
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span>+ Customer</span>
              </button>
            )}
            {heldOrders.length > 0 && (
              <div ref={heldOrdersRef} className="relative">
                <button
                  id="register-held-orders-btn"
                  type="button"
                  aria-expanded={isHeldOrdersOpen}
                  onClick={() => setIsHeldOrdersOpen((prev) => !prev)}
                  className={`min-h-[40px] px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    isHeldOrdersOpen
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-700 hover:text-blue-700 hover:bg-slate-100'
                  }`}
                  title="Resume or manage held baskets"
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span className="tabular-nums">
                    Held ({heldOrders.length})
                  </span>
                </button>

                {isHeldOrdersOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 bg-white rounded-xl shadow-lg border border-slate-200 p-2 z-40 text-xs">
                    <div className="px-2 py-1.5 border-b border-slate-100 flex items-center justify-between">
                      <span className="font-bold text-slate-800">Held Orders</span>
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        {heldOrders.length} parked
                      </span>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 mt-1">
                      {heldOrders.map((order) => {
                        const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
                        const heldTime = new Date(order.heldAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        return (
                          <div key={order.id} className="py-2 px-1.5 flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-900 truncate">
                                {order.customerName || 'Walk-in Basket'}
                              </div>
                              <div className="text-[11px] text-slate-500 tabular-nums mt-0.5">
                                {heldTime} · {itemCount} item{itemCount !== 1 ? 's' : ''} ·{' '}
                                <span className="font-mono font-semibold text-slate-700">
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
                                className="min-h-[36px] px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold transition cursor-pointer whitespace-nowrap"
                              >
                                Resume
                              </button>
                              <button
                                type="button"
                                onClick={() => discardHeldOrder(order.id)}
                                aria-label="Discard held order"
                                title="Discard held order"
                                className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
            {cart.length > 0 && (
              <button
                id="register-hold-cart-btn"
                type="button"
                onClick={() => holdActiveCart()}
                className="min-h-[40px] px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-150 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                title="Place current basket on hold to serve next customer"
              >
                <PauseCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{t('reg_hold_cart', 'Hold')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileActiveView('catalog')}
              className="md:hidden min-h-[40px] px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              + Add
            </button>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleOpenCartVoid}
                className="min-h-[40px] px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150 cursor-pointer whitespace-nowrap"
                title="Cancel sale and record audited cart void"
              >
                {t('reg_clear_cart', 'Clear')}
              </button>
            )}
          </div>
        </div>

        {/* Assigned Customer Strip (Only shown once a customer is attached) */}
        {selectedCustomer && (
          <div className="px-3.5 sm:px-4 py-1.5 bg-slate-50/70 border-b border-slate-200 shrink-0">
            <div className="min-h-[44px] py-0.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {selectedCustomer.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {selectedCustomer.name}
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-slate-400 truncate">
                      {selectedCustomer.phone}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] mt-0.5 tabular-nums">
                    <span className="text-amber-700 font-semibold inline-flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      {selectedCustomer.loyaltyPoints || 0} pts
                    </span>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span
                      className={`font-semibold font-mono tabular-nums ${
                        (selectedCustomer.storeCreditBalance || 0) < 0
                          ? 'text-red-600'
                          : (selectedCustomer.storeCreditBalance || 0) > 0
                          ? 'text-emerald-600'
                          : 'text-slate-500'
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
                  className="min-h-[40px] px-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer whitespace-nowrap"
                  title="Change customer"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                  title="Remove customer assignment (Walk-in)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cart Item List - Bounded scrolling container */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 divide-y divide-slate-100 overscroll-contain">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <ShoppingBag className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
              <div className="text-xs font-semibold text-slate-600">{t('reg_empty_cart', 'Your cart is empty')}</div>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
                {t('reg_empty_cart_sub', 'Scan a barcode, search, or click any product card to start checkout.')}
              </p>
              <button
                type="button"
                onClick={() => setMobileActiveView('catalog')}
                className="mt-3 md:hidden min-h-[40px] text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
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

        {/* Totals & Checkout Box - Permanently Sticky at Bottom */}
        <div className="shrink-0 sticky bottom-0 z-20 bg-white border-t border-slate-200 p-3 sm:p-4 space-y-2">
          {cartDiscount > 0 && (
            <div className="flex justify-between text-xs text-emerald-700 font-semibold">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                <span>{t('reg_discount', 'Discount')}</span>
              </span>
              <span className="font-mono tabular-nums">
                - {currentLocation.currency} {cartDiscount.toFixed(2)}
              </span>
            </div>
          )}

          {/* Progressive Tax & Rounding Breakdown */}
          {isBreakdownOpen && (
            <div className="space-y-1.5 pb-2 border-b border-slate-100 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>{t('reg_subtotal', 'Subtotal (Net)')}</span>
                <span className="font-mono font-medium tabular-nums text-slate-700">
                  {currentLocation.currency} {cartSubtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>
                  {currentBusiness?.taxSettings?.taxLabel || 'VAT'}
                  <span className="text-slate-400">
                    {' '}· {currentBusiness?.taxSettings?.pricingType === 'exclusive' ? 'Exclusive' : 'Inclusive'}
                    {cartTaxBreakdown && cartTaxBreakdown.length > 1 ? ` · ${cartTaxBreakdown.length} Rates` : ''}
                  </span>
                </span>
                <span className="font-mono font-medium tabular-nums text-slate-700">
                  {currentLocation.currency} {cartTax.toFixed(2)}
                </span>
              </div>
              {hasCents(cartTotal) && (
                <div className="text-[11px] text-slate-500 flex justify-between items-center pt-0.5 tabular-nums">
                  <span>
                    Cash: <strong className="font-mono text-slate-700">{currentLocation.currency} {roundCashHalfUp(cartTotal).toFixed(2)}</strong>
                  </span>
                  <span>
                    Electronic: <strong className="font-mono text-slate-700">{currentLocation.currency} {cartTotal.toFixed(2)}</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-display text-sm sm:text-base font-bold text-slate-900">
                {t('reg_total', 'Total')}
              </span>
              {cart.length > 0 && (
                <button
                  id="register-breakdown-toggle-btn"
                  type="button"
                  aria-expanded={isBreakdownOpen}
                  onClick={() => setIsBreakdownOpen((prev) => !prev)}
                  className="text-[11px] font-medium text-slate-500 hover:text-slate-800 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-slate-100 transition cursor-pointer whitespace-nowrap"
                >
                  <span>{isBreakdownOpen ? 'Hide' : 'Breakdown'}</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-150 ${
                      isBreakdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              )}
            </div>
            <span className="text-blue-600 font-mono font-bold tabular-nums text-lg sm:text-xl">
              {currentLocation.currency} {cartTotal.toFixed(2)}
            </span>
          </div>

          {/* Checkout Buttons: Secondary Exact Cash + Sole Primary Pay CTA */}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              id="register-exact-cash-btn"
              type="button"
              disabled={cart.length === 0}
              onClick={() => settleExactCash()}
              className="bg-white hover:bg-slate-50 active:scale-[0.985] border border-slate-300 disabled:opacity-50 disabled:bg-slate-50 text-slate-800 font-bold min-h-[48px] px-3.5 sm:px-4 rounded-xl transition-all duration-150 text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600"
              title="Instant single-tap cash checkout with standard half-up rounding (Shortcut: F1)"
            >
              <Banknote className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="hidden sm:inline">{t('pay_exact_amount', 'Exact Cash')}</span>
              <span className="sm:hidden">{t('pay_cash', 'Cash')}</span>
            </button>

            <button
              id="register-settle-btn"
              type="button"
              disabled={cart.length === 0}
              onClick={onProceedToPayment}
              className="flex-1 bg-blue-600 hover:bg-blue-700 active:scale-[0.985] disabled:bg-slate-300 text-white font-bold min-h-[48px] px-5 rounded-xl transition-all duration-150 text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              title="Pay / Proceed to Checkout (Shortcuts: Space, Enter)"
            >
              <span className="text-sm font-bold font-mono tabular-nums truncate">
                {t('reg_pay_button', 'Pay')} {currentLocation.currency} {cartTotal.toFixed(2)}
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150 shrink-0" />
            </button>
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
          className={`md:hidden fixed inset-x-0 z-30 bg-white border-t border-slate-200 px-3 py-1.5 flex items-center justify-between gap-2 ${
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
            title="Inspect Active Cart"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 truncate tabular-nums">
                <span>{totalCartCount} item{totalCartCount !== 1 ? 's' : ''}</span>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <span className="text-blue-700 font-mono">
                  {currentLocation.currency} {cartTotal.toFixed(2)}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 truncate flex items-center gap-0.5">
                <span>View order</span>
                <ChevronRight className="w-3 h-3 text-slate-400 inline" />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              Haptics.light();
              onProceedToPayment();
            }}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs min-h-[44px] px-4 rounded-lg flex items-center gap-1.5 transition-colors duration-150 cursor-pointer shrink-0 whitespace-nowrap"
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
