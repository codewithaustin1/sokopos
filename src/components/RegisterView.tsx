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
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { CartItem } from '../types';
import { ItemDiscountModal } from './ItemDiscountModal';
import {
  getItemDiscountedUnitPrice,
  getItemLineTotal,
  formatDiscountBadge,
} from '../utils/discountUtils';

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
    cart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    cartSubtotal,
    cartTax,
    cartDiscount,
    cartTotal,
    handleBarcodeScanned,
    openReturnsModal,
    settleExactCash,
  } = usePos();

  const [selectedCategory, setSelectedCategory] = useState<string>('All Items');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mobileActiveView, setMobileActiveView] = useState<'catalog' | 'cart'>('catalog');
  const [selectedDiscountItem, setSelectedDiscountItem] = useState<CartItem | null>(null);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState<boolean>(false);

  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
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
                onClick={clearCart}
                className="text-xs text-red-600 font-bold hover:bg-red-50 px-2.5 py-1 rounded-lg transition cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
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
            cart.map((item) => {
              const lineTotal = getItemLineTotal(item);
              const discountBadge = formatDiscountBadge(item, currentLocation.currency);

              return (
                <div key={item.productId} className="py-2.5 sm:py-3 flex items-center justify-between gap-2 group">
                  <div
                    onClick={() => {
                      setSelectedDiscountItem(item);
                      setIsDiscountModalOpen(true);
                    }}
                    className="flex-1 min-w-0 pr-1 cursor-pointer group/item select-none"
                    title="Tap to apply flat or percentage discount"
                  >
                    <h4 className="text-xs font-bold text-slate-800 truncate group-hover/item:text-blue-600 transition-colors">
                      {item.productName}
                    </h4>
                    <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {currentLocation.currency} {item.unitPrice.toFixed(2)}
                      </span>
                      {discountBadge ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDiscountItem(item);
                            setIsDiscountModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-black px-1.5 py-0.5 rounded shadow-2xs transition cursor-pointer"
                          title="Click to edit or remove discount"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          <span>{discountBadge}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDiscountItem(item);
                            setIsDiscountModalOpen(true);
                          }}
                          className="opacity-70 group-hover/item:opacity-100 text-[10px] text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-bold px-1.5 py-0.5 rounded transition flex items-center gap-0.5 cursor-pointer"
                          title="Quick tap to apply discount"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          <span>+ Discount</span>
                        </button>
                      )}
                      {item.discountReason && (
                        <span className="text-[9px] text-slate-400 italic">
                          ({item.discountReason})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Stepper with touch-friendly targets */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                      <button
                        onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-200 font-bold transition cursor-pointer"
                        title="Reduce"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 text-center text-xs font-black text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-200 font-bold transition cursor-pointer"
                        title="Increase"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right min-w-[65px] sm:min-w-[75px]">
                      <div className="text-xs font-black text-slate-800 font-mono">
                        {currentLocation.currency} {lineTotal.toFixed(2)}
                      </div>
                      {discountBadge && (
                        <div className="text-[9px] text-emerald-600 font-bold line-through opacity-70 font-mono">
                          {currentLocation.currency} {(item.unitPrice * item.quantity).toFixed(2)}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="text-slate-300 hover:text-red-600 transition p-1.5 cursor-pointer"
                      title="Remove Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
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
          <div className="flex justify-between text-xs text-slate-500">
            <span>VAT / Tax (16% inclusive)</span>
            <span className="font-semibold text-slate-700">
              {currentLocation.currency} {cartTax.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm sm:text-base font-black text-slate-900 pt-2 border-t border-slate-200">
            <span>Total Payable</span>
            <span className="text-blue-600 font-black">
              {currentLocation.currency} {cartTotal.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 sm:mt-2">
            {/* Direct Exact Cash 1-tap checkout */}
            <button
              id="register-exact-cash-btn"
              type="button"
              disabled={cart.length === 0}
              onClick={() => settleExactCash()}
              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-300 text-white font-black py-3 sm:py-3.5 px-3 rounded-xl shadow-md hover:shadow-lg transition text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed group"
              title="Instant single-tap cash checkout with exact amount (Shortcut: F1)"
            >
              <Banknote className="w-4 h-4 text-emerald-100 group-hover:scale-110 transition-transform shrink-0" />
              <span className="truncate">
                Exact Cash ({currentLocation.currency} {cartTotal.toFixed(2)})
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
    </div>
  );
};
