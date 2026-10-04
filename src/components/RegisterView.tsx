import React, { useState, useMemo } from 'react';
import {
  Search,
  Scan,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Banknote,
  Tag,
  Percent,
  Lock,
  Clock,
  ShieldAlert,
  User,
  UserCheck,
  Star,
  X,
  ShoppingCart,
  ChevronRight,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { CartItem } from '../types';
import { ItemDiscountModal } from './ItemDiscountModal';
import { VoidModal } from './VoidModal';
import { CustomerSelectModal } from './CustomerSelectModal';
import { CartLineItem } from './CartLineItem';
import { Haptics } from '../utils/haptics';
import {
  getItemDiscountedUnitPrice,
  getItemLineTotal,
  formatDiscountBadge,
} from '../utils/discountUtils';
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
    openReturnsModal,
    settleExactCash,
    activeShift,
    openShiftManagement,
    selectedCustomer,
    setSelectedCustomer,
  } = usePos();

  const [selectedCategory, setSelectedCategory] = useState<string>('All Items');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mobileActiveView, setMobileActiveView] = useState<'catalog' | 'cart'>('catalog');
  const [selectedDiscountItem, setSelectedDiscountItem] = useState<CartItem | null>(null);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState<boolean>(false);
  const [isCustomerSelectOpen, setIsCustomerSelectOpen] = useState<boolean>(false);

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

  // Strict Rule: The sales interface remains completely inaccessible until a shift session is active
  if (!activeShift || activeShift.status !== 'open') {
    return (
      <div
        id="register-session-locked-view"
        className="flex-1 h-full w-full flex items-center justify-center p-4 sm:p-6 md:p-8 bg-slate-100 overflow-y-auto"
      >
        <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Top Inaccessible Banner */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 p-6 text-white text-center relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 opacity-10">
              <Clock className="w-36 h-36" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-black uppercase tracking-wider mb-3">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Sales Interface Inaccessible</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Open Session to Trade
            </h2>
          </div>

          {/* Details & Status Grid */}
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Terminal Location</div>
                <div className="font-bold text-xs text-slate-800 mt-0.5 truncate">{currentLocation.name}</div>
                <div className="text-[11px] text-slate-500 truncate">{currentLocation.terminalName || 'Main Counter'}</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Logged Operator</div>
                <div className="font-bold text-xs text-slate-800 mt-0.5 truncate">{currentUser?.name || 'Cashier'}</div>
                <div className="text-[11px] text-slate-500 capitalize">{currentUser?.role?.replace('_', ' ') || 'Staff'}</div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-700">Till Status</div>
                <div className="font-bold text-xs text-amber-900 mt-0.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Closed & Inactive
                </div>
                <div className="text-[11px] text-amber-800">No active trading shift</div>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200">
                <div className="text-[10px] font-black uppercase tracking-wider text-blue-700">Fiscal Policy</div>
                <div className="font-bold text-xs text-blue-900 mt-0.5">Strict Fiscal Control</div>
                <div className="text-[11px] text-blue-800">Float declaration required</div>
              </div>
            </div>

            <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed text-[11px]">
                <span className="font-bold text-amber-950">Fiscal & Audit Rule: </span>
                To guarantee balanced till accounting and drawer security, transactions cannot be initiated or completed without a declared shift float.
              </div>
            </div>

            {/* Action CTA Button */}
            <div className="pt-2">
              <button
                id="unlock-sales-interface-btn"
                type="button"
                onClick={openShiftManagement}
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black py-3.5 px-5 rounded-2xl transition flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/20 cursor-pointer text-sm"
              >
                <Clock className="w-4 h-4" />
                <span>Open Shift Session & Unlock Register</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalCartCount = (cart || []).reduce((acc, item) => acc + item.quantity, 0);

  // Filtered products
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

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (searchQuery) {
        setSearchQuery('');
      } else {
        (e.target as HTMLInputElement).blur();
      }
      return;
    }
    if (e.key === 'Enter') {
      if (searchQuery.trim()) {
        e.preventDefault();
        // 1. Direct barcode or SKU lookup
        const res = handleBarcodeScanned(searchQuery.trim());
        if (res.success) {
          setSearchQuery('');
          return;
        }
        // 2. If exactly one product matches the search query, add it directly to cart
        if (filteredProducts.length === 1) {
          addToCart(filteredProducts[0], 1);
          setSearchQuery('');
        }
      } else if (cart.length > 0) {
        // Quick Settle on empty Enter
        e.preventDefault();
        onProceedToPayment();
      }
    }
  };

  return (
    <div id="register-pos-workspace" className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100 relative">
      {/* Mobile Top Segmented View Switcher */}
      <div className="md:hidden bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2 shrink-0 z-20">
        <button
          type="button"
          onClick={() => setMobileActiveView('catalog')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileActiveView === 'catalog'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Catalog ({filteredProducts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileActiveView('cart')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer relative ${
            mobileActiveView === 'cart'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <div className="relative">
            <span>Cart ({totalCartCount})</span>
            {totalCartCount > 0 && (
              <span className="ml-1 text-[10px] font-black text-emerald-600">
                • {currentLocation.currency} {cartTotal.toFixed(0)}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Products Workspace (Left / 62% on desktop, full screen on mobile catalog view) */}
      <div
        className={`flex-1 md:w-[62%] p-3 sm:p-4 flex-col gap-2.5 sm:gap-3 border-r border-slate-200 bg-slate-50 overflow-hidden relative ${
          mobileActiveView === 'catalog' ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Search & Category Header */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between shrink-0">
          {/* Quick Search with Barcode Enter support */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 sm:top-3" />
            <input
              type="text"
              placeholder="Search product, SKU or scan barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full bg-white border border-slate-300 rounded-xl py-2 pl-9 pr-20 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
            />
            <button
              onClick={openBarcodeScanner}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-blue-200 cursor-pointer"
            >
              <Scan className="w-3 h-3" /> Scan (F2)
            </button>
          </div>

          <div className="text-[11px] font-semibold text-slate-500 whitespace-nowrap hidden lg:block">
            Location: <span className="font-bold text-slate-800">{currentLocation.name}</span>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-none touch-pan-x">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap shadow-2xs cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto pr-0.5 sm:pr-1 pb-16 md:pb-0">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-slate-400">
              <ShoppingBag className="w-12 h-12 mb-3 stroke-1 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">No items match your criteria</p>
              <p className="text-xs text-slate-400 mt-1">Try another category or clear the search query</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-2 sm:gap-3">
              {filteredProducts.map((prod) => {
                const stock = prod.stockByLocation[currentLocation.id] ?? 0;
                const isOutOfStock = stock <= 0;
                const isLowStock = stock > 0 && stock <= prod.reorderPoint;
                const inCart = cart.find((item) => item.productId === prod.id);

                return (
                  <div
                    key={prod.id}
                    onClick={() => addToCart(prod)}
                    title={isOutOfStock ? `Cannot sell ${prod.name}: 0 stock available` : `Add ${prod.name} to cart`}
                    className={`border rounded-xl p-2.5 sm:p-3.5 flex flex-col justify-between shadow-2xs transition select-none relative ${
                      isOutOfStock
                        ? 'bg-slate-50/90 border-red-200/80 opacity-60 cursor-not-allowed'
                        : inCart
                        ? 'bg-blue-50/20 border-blue-500 ring-2 ring-blue-500/20 cursor-pointer hover:border-blue-500 hover:shadow-md'
                        : 'bg-white border-slate-200 cursor-pointer hover:border-blue-500 hover:shadow-md group'
                    }`}
                  >
                    {inCart && (
                      <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                        {inCart.quantity}
                      </div>
                    )}

                    <div>
                      <div className="flex items-start justify-between gap-1 pr-4">
                        <h4 className={`text-xs font-bold leading-snug line-clamp-2 ${isOutOfStock ? 'text-slate-500' : 'text-slate-800 group-hover:text-blue-600 transition'}`}>
                          {prod.name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                        <span className="font-mono">{prod.sku}</span>
                        <span>•</span>
                        <span className="truncate">{prod.category}</span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-end justify-between gap-1">
                      <div>
                        {isOutOfStock ? (
                          <span className="text-[9px] sm:text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> Zero Stock (Cannot Sell)
                          </span>
                        ) : isLowStock ? (
                          <span className="text-[9px] sm:text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                            Qty: {stock}
                          </span>
                        ) : (
                          <span className="text-[9px] sm:text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded">
                            Qty: {stock}
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <div className={`text-xs sm:text-sm font-black tracking-tight ${isOutOfStock ? 'text-slate-400 line-through' : 'text-blue-600'}`}>
                          {currentLocation.currency} {prod.sellingPrice.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Mobile Floating Order Bottom Bar */}
        {cart.length > 0 && (
          <div className="md:hidden absolute bottom-2 inset-x-2 z-20 animate-in slide-in-from-bottom-2">
            <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-2xl shadow-xl flex items-center justify-between border border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-black text-xs text-white shadow-xs">
                  {totalCartCount}
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Order Total</div>
                  <div className="text-sm font-black text-white">
                    {currentLocation.currency} {cartTotal.toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMobileActiveView('cart')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-2.5 py-2 rounded-xl transition cursor-pointer"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => settleExactCash()}
                  disabled={cart.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-bold text-xs px-2.5 py-2 rounded-xl flex items-center gap-1 transition shadow-sm cursor-pointer disabled:cursor-not-allowed"
                  title="Single-tap exact cash payment"
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Exact</span>
                </button>
                <button
                  type="button"
                  onClick={onProceedToPayment}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <span>Settle</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cart & Checkout Sidebar (Right / 38% on desktop, full screen on mobile cart view) */}
      <div
        className={`md:w-[38%] bg-white flex-col justify-between border-t md:border-t-0 md:border-l border-slate-200 shadow-lg md:shadow-none h-full overflow-hidden ${
          mobileActiveView === 'cart' ? 'flex flex-1' : 'hidden md:flex'
        }`}
      >
        {/* Cart Header */}
        <div className="p-3 sm:p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-slate-800 text-sm">Active Order</h2>
              <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {totalCartCount} items
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {currentLocation.terminalName}
              <span className="text-blue-600 font-semibold md:hidden ml-1">• Swipe left to void</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openReturnsModal(null)}
              className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
              title="Open Returns & Refunds Desk"
            >
              <RotateCcw className="w-3 h-3 text-amber-700" />
              <span>Returns</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileActiveView('catalog')}
              className="md:hidden text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition cursor-pointer"
            >
              + Add Items
            </button>
            {cart.length > 0 && (
              <button
                onClick={handleOpenCartVoid}
                className="text-xs text-red-600 font-bold hover:bg-red-50 px-2.5 py-1 rounded-lg transition cursor-pointer"
                title="Cancel sale and record audited cart void"
              >
                Clear (Void)
              </button>
            )}
          </div>
        </div>

        {/* Customer Assignment Quick Bar */}
        <div className="px-3 sm:px-4 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
          {!selectedCustomer ? (
            <button
              type="button"
              onClick={() => setIsCustomerSelectOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 bg-white hover:bg-slate-100/80 border border-dashed border-slate-300 hover:border-blue-400 rounded-xl text-xs font-bold text-slate-600 hover:text-blue-700 transition cursor-pointer group shadow-2xs"
              title="Assign sale to customer account for loyalty & store credit"
            >
              <span className="flex items-center gap-2 truncate">
                <User className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                <span className="truncate">Walk-in Customer (Unassigned)</span>
              </span>
              <span className="text-[10px] text-blue-600 bg-blue-50 group-hover:bg-blue-100 px-2 py-0.5 rounded-md font-bold shrink-0">
                + Assign
              </span>
            </button>
          ) : (
            <div className="bg-white border border-blue-200 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  {selectedCustomer.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-900 truncate">
                      {selectedCustomer.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 truncate">
                      {selectedCustomer.phone}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] mt-0.5">
                    <span className="text-amber-700 font-bold flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                      {selectedCustomer.loyaltyPoints || 0} pts
                    </span>
                    <span className="text-slate-300">•</span>
                    <span
                      className={`font-bold font-mono ${
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
                  className="px-2 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                  title="Change customer"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                  title="Remove customer assignment (Walk-in)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <ShoppingBag className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
              <div className="text-xs font-bold text-slate-600">Cart is empty</div>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                Scan a barcode, search, or click any product card to start checkout.
              </p>
              <button
                type="button"
                onClick={() => setMobileActiveView('catalog')}
                className="mt-3 md:hidden text-xs font-bold text-white bg-blue-600 px-4 py-2 rounded-xl"
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

        {/* Totals & Checkout Box */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 space-y-1.5 sm:space-y-2 shrink-0">
          {cartDiscount > 0 && (
            <div className="flex justify-between text-xs text-emerald-600 font-bold">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                <span>Discount Savings</span>
              </span>
              <span className="font-mono">
                - {currentLocation.currency} {cartDiscount.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-xs text-slate-500">
            <span>Subtotal (Net)</span>
            <span className="font-semibold text-slate-700">
              {currentLocation.currency} {cartSubtotal.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span>{currentBusiness?.taxSettings?.taxLabel || 'VAT'}</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                {currentBusiness?.taxSettings?.pricingType === 'exclusive' ? 'Exclusive' : 'Inclusive'}
              </span>
              {cartTaxBreakdown && cartTaxBreakdown.length > 1 && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200" title="Multiple dynamic VAT/GST rates applied">
                  {cartTaxBreakdown.length} Rates
                </span>
              )}
            </span>
            <span className="font-semibold text-slate-700 font-mono">
              {currentLocation.currency} {cartTax.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm sm:text-base font-black text-slate-900 pt-2 border-t border-slate-200">
            <span>Total Payable</span>
            <span className="text-blue-600 font-black">
              {currentLocation.currency} {cartTotal.toFixed(2)}
            </span>
          </div>

          {hasCents(cartTotal) && (
            <div className="text-[10px] text-slate-500 font-medium flex justify-between items-center bg-slate-50 border border-slate-200/80 px-2 py-1 rounded-md">
              <span className="text-slate-600">
                Cash: <strong className="text-emerald-700">{currentLocation.currency} {roundCashHalfUp(cartTotal).toFixed(2)}</strong> (half-up)
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-600">
                Electronic: <strong className="text-blue-700">{currentLocation.currency} {cartTotal.toFixed(2)}</strong> (exact)
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 sm:mt-2">
            {/* Direct Exact Cash 1-tap checkout */}
            <button
              id="register-exact-cash-btn"
              type="button"
              disabled={cart.length === 0}
              onClick={() => settleExactCash()}
              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-300 text-white font-black py-3 sm:py-3.5 px-3 rounded-xl shadow-md hover:shadow-lg transition text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed group"
              title="Instant single-tap cash checkout with standard half-up rounding (Shortcut: F1)"
            >
              <Banknote className="w-4 h-4 text-emerald-100 group-hover:scale-110 transition-transform shrink-0" />
              <span className="truncate">
                Exact Cash ({currentLocation.currency} {roundCashHalfUp(cartTotal).toFixed(2)})
              </span>
              <kbd className="hidden xl:inline-block text-[10px] bg-emerald-700/80 border border-emerald-500/40 text-emerald-100 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                F1
              </kbd>
            </button>

            {/* Settle button */}
            <button
              id="register-settle-btn"
              type="button"
              disabled={cart.length === 0}
              onClick={onProceedToPayment}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-300 text-white font-black py-3 sm:py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed group"
              title="Open full payment settlement options (Shortcuts: Space, Enter)"
            >
              <span>Settle</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform shrink-0" />
              <kbd className="hidden xl:inline-block text-[10px] bg-blue-700/80 border border-blue-500/40 text-blue-100 px-1.5 py-0.5 rounded font-mono font-bold shrink-0">
                ↵
              </kbd>
            </button>
          </div>

          {/* Cashier Speed Shortcuts Legend */}
          <div className="hidden lg:flex items-center justify-center flex-wrap gap-x-2 gap-y-1 pt-2 text-[10px] text-slate-400 font-medium">
            <span className="inline-flex items-center gap-1">
              <kbd className="font-mono bg-slate-100 border border-slate-300 rounded px-1 text-slate-600 font-bold">Space / ↵</kbd>
              <span>Settle</span>
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <kbd className="font-mono bg-slate-100 border border-slate-300 rounded px-1 text-slate-600 font-bold">F1</kbd>
              <span>Exact Cash</span>
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <kbd className="font-mono bg-slate-100 border border-slate-300 rounded px-1 text-slate-600 font-bold">F2</kbd>
              <span>M-Pesa</span>
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <kbd className="font-mono bg-slate-100 border border-slate-300 rounded px-1 text-slate-600 font-bold">F3</kbd>
              <span>Card</span>
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <kbd className="font-mono bg-slate-100 border border-slate-300 rounded px-1 text-slate-600 font-bold">+/-</kbd>
              <span>Qty</span>
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <kbd className="font-mono bg-slate-100 border border-slate-300 rounded px-1 text-slate-600 font-bold">Esc</kbd>
              <span>Close</span>
            </span>
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

      {/* Mobile Sticky Floating Cart Action Pill (Thumb-Zone Checkout) */}
      {cart.length > 0 && mobileActiveView === 'catalog' && (
        <aside
          id="mobile-sticky-cart-pill"
          aria-label="Active order quick checkout bar"
          className="md:hidden fixed bottom-16 inset-x-3 sm:inset-x-4 z-40 animate-in slide-in-from-bottom-5 duration-200 safe-bottom"
        >
          <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-2.5 pl-3.5 flex items-center justify-between shadow-[0_12px_32px_rgba(0,0,0,0.4)] border border-slate-700/80">
            {/* Tapping summary switches view to Cart */}
            <button
              type="button"
              onClick={() => {
                Haptics.light();
                setMobileActiveView('cart');
              }}
              className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer active:opacity-85 py-0.5"
              title="Inspect Active Cart"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center font-black shrink-0 border border-blue-500/40">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-white flex items-center gap-1.5 truncate">
                  <span>🛒 {totalCartCount} Item{totalCartCount !== 1 ? 's' : ''}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-emerald-400 font-mono">
                    {currentLocation.currency} {cartTotal.toFixed(2)}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate flex items-center gap-0.5">
                  <span>Tap to view order</span>
                  <ChevronRight className="w-3 h-3 text-slate-500 inline" />
                </div>
              </div>
            </button>

            {/* Direct Pay / View Action Trigger */}
            <button
              type="button"
              onClick={() => {
                Haptics.light();
                onProceedToPayment();
              }}
              className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer shrink-0 ml-2"
              title="Pay / Proceed to Checkout (Single-Thumb Shortcut)"
            >
              <span>Pay / View</span>
              <span className="font-mono text-xs opacity-90">↵</span>
            </button>
          </div>
        </aside>
      )}
    </div>
  );
};
