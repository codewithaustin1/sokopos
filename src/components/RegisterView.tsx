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
} from 'lucide-react';
import { usePos } from '../context/PosContext';

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
    cartTotal,
    handleBarcodeScanned,
  } = usePos();

  const [selectedCategory, setSelectedCategory] = useState<string>('All Items');
  const [searchQuery, setSearchQuery] = useState<string>('');

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
    if (e.key === 'Enter' && searchQuery.trim()) {
      // Check if it's a barcode or exact SKU
      const res = handleBarcodeScanned(searchQuery.trim());
      if (res.success) {
        setSearchQuery('');
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100">
      {/* Products Workspace (Left / 62%) */}
      <div className="flex-1 md:w-[62%] p-4 flex flex-col gap-3 border-r border-slate-200 bg-slate-50 overflow-hidden">
        {/* Search & Category Header */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shrink-0">
          {/* Quick Search with Barcode Enter support */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Scan barcode or search name/SKU (Press Enter to scan)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full bg-white border border-slate-300 rounded-xl py-2 pl-9 pr-20 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 shadow-2xs"
            />
            <button
              onClick={openBarcodeScanner}
              className="absolute right-1.5 top-1.5 bottom-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-blue-200"
            >
              <Scan className="w-3 h-3" /> Scan (F2)
            </button>
          </div>

          <div className="text-[11px] font-semibold text-slate-500 whitespace-nowrap hidden lg:block">
            Location: <span className="font-bold text-slate-800">{currentLocation.name}</span>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-thin">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap shadow-2xs ${
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
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-slate-400">
              <ShoppingBag className="w-12 h-12 mb-3 stroke-1 text-slate-300" />
              <p className="text-sm font-bold text-slate-600">No items match your criteria</p>
              <p className="text-xs text-slate-400 mt-1">Try another category or clear the search query</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-3">
              {filteredProducts.map((prod) => {
                const stock = prod.stockByLocation[currentLocation.id] ?? 0;
                const isOutOfStock = stock <= 0;
                const isLowStock = stock > 0 && stock <= prod.reorderPoint;
                const inCart = cart.find((item) => item.productId === prod.id);

                return (
                  <div
                    key={prod.id}
                    onClick={() => addToCart(prod)}
                    className={`bg-white border rounded-xl p-3.5 flex flex-col justify-between hover:border-blue-500 cursor-pointer shadow-2xs hover:shadow-md transition group select-none relative ${
                      inCart
                        ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20'
                        : 'border-slate-200'
                    }`}
                  >
                    {inCart && (
                      <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                        {inCart.quantity}
                      </div>
                    )}

                    <div>
                      <div className="flex items-start justify-between gap-2 pr-5">
                        <h4 className="text-xs font-bold text-slate-800 leading-snug group-hover:text-blue-600 transition">
                          {prod.name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] text-slate-400 font-mono">{prod.sku}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[10px] text-slate-500 font-medium">{prod.category}</span>
                      </div>
                    </div>

                    <div className="mt-3.5 pt-2 border-t border-slate-100 flex items-end justify-between">
                      <div>
                        {isOutOfStock ? (
                          <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> Out of stock
                          </span>
                        ) : isLowStock ? (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                            Qty: {stock} (Low)
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded">
                            Qty: {stock}
                          </span>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-black text-blue-600 tracking-tight">
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
      </div>

      {/* Cart & Checkout Sidebar (Right / 38%) */}
      <div className="md:w-[38%] bg-white flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-200 shadow-lg md:shadow-none h-full max-h-[calc(100vh-4rem)]">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/80 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-slate-800 text-sm">Active Order</h2>
              <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {cart.reduce((a, b) => a + b.quantity, 0)} items
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {currentLocation.terminalName}
            </p>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-red-600 font-bold hover:bg-red-50 px-2.5 py-1 rounded-lg transition"
            >
              Clear Cart
            </button>
          )}
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <ShoppingBag className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
              <div className="text-xs font-bold text-slate-600">Cart is empty</div>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                Scan a barcode, search, or click any product card to start checkout.
              </p>
            </div>
          ) : (
            cart.map((item) => {
              const lineTotal =
                item.unitPrice * (1 - item.discountPercent / 100) * item.quantity;

              return (
                <div key={item.productId} className="py-3 flex items-center justify-between gap-3 group">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 truncate">
                      {item.productName}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-slate-400 font-mono">
                        {currentLocation.currency} {item.unitPrice.toFixed(2)}
                      </span>
                      {item.discountPercent > 0 && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1 rounded">
                          -{item.discountPercent}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                      <button
                        onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-200 font-bold transition"
                        title="Reduce"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-black text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-200 font-bold transition"
                        title="Increase"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right min-w-[75px]">
                      <div className="text-xs font-black text-slate-800">
                        {currentLocation.currency} {lineTotal.toFixed(2)}
                      </div>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="text-slate-300 hover:text-red-600 transition p-1"
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
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2 shrink-0">
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
          <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
            <span>Total Payable</span>
            <span className="text-blue-600">
              {currentLocation.currency} {cartTotal.toFixed(2)}
            </span>
          </div>

          <button
            disabled={cart.length === 0}
            onClick={onProceedToPayment}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition text-sm mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>Proceed to Payment</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
