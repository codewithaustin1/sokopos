import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Scan,
  X,
  ShoppingCart,
  Copy,
  Check,
  ShieldAlert,
  TrendingUp,
  PackagePlus,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { Product } from '../types';
import { ScannerBurstMetadata } from '../utils/backgroundScanner';

export interface InventoryQuickCheckHUDProps {
  isOpen: boolean;
  barcode: string | null;
  metadata?: ScannerBurstMetadata | null;
  source?: 'hardware' | 'camera' | 'search' | 'manual' | null;
  onClose: () => void;
  onProductAdded?: (product: Product, addedToCart: boolean) => void;
}

export const InventoryQuickCheckHUD: React.FC<InventoryQuickCheckHUDProps> = ({
  isOpen,
  barcode,
  metadata,
  source = 'hardware',
  onClose,
  onProductAdded,
}) => {
  const {
    categories,
    currentLocation,
    currentBusiness,
    locations,
    addProduct,
    addToCart,
    showToast,
    soundFx,
    activeShift,
    can,
  } = usePos();

  const canManageInventory = can('manageInventory');
  const canViewCost = can('viewCostPrice');
  const canSell = can('sell');
  const isShiftOpen = Boolean(activeShift && activeShift.status === 'open');
  const canSellNow = canSell && isShiftOpen;

  const nameInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [initialStock, setInitialStock] = useState('1');
  const [unit, setUnit] = useState('packet');
  const [reorderPoint, setReorderPoint] = useState('5');
  const [sku, setSku] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableCategories = useMemo(() => {
    const base = categories.filter((c) => c && c !== 'All' && c !== 'All Items');
    const defaults = ['General Merchandise', 'Groceries', 'Beverages', 'Electronics & Accessories'];
    const merged = Array.from(new Set([...base, ...defaults]));
    return merged;
  }, [categories]);

  // Initialize or reset form whenever modal opens with a new barcode
  useEffect(() => {
    if (isOpen && barcode) {
      setName('');
      setCategory(availableCategories[0] || 'General Merchandise');
      setSellingPrice('');
      setBuyingPrice('');
      setInitialStock('1');
      setUnit('packet');
      setReorderPoint('5');
      setCopied(false);

      const cleanDigits = barcode.replace(/\D/g, '');
      const skuSuffix =
        cleanDigits.length >= 4
          ? cleanDigits.slice(-4)
          : barcode
              .replace(/[^a-zA-Z0-9]/g, '')
              .toUpperCase()
              .slice(0, 6) || String(Math.floor(1000 + Math.random() * 9000));
      setSku(`SKU-${skuSuffix}`);

      if (canManageInventory) {
        const timer = setTimeout(() => {
          nameInputRef.current?.focus();
        }, 80);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, barcode, availableCategories, canManageInventory]);

  // Keyboard shortcut: Esc to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !barcode) return null;

  const cleanBarcode = barcode.trim();
  const numSelling = parseFloat(sellingPrice) || 0;
  const numBuying = canViewCost ? parseFloat(buyingPrice) || 0 : 0;
  const marginAmt = numSelling - numBuying;
  const marginPct = numSelling > 0 ? ((marginAmt / numSelling) * 100).toFixed(1) : '0.0';

  const barcodeType =
    cleanBarcode.length === 12
      ? 'UPC-A (12-digit)'
      : cleanBarcode.length === 13
      ? cleanBarcode.startsWith('616')
        ? 'GS1 Kenya (EAN-13)'
        : 'EAN-13'
      : cleanBarcode.length === 8
      ? 'EAN-8'
      : cleanBarcode.length >= 14
      ? 'ITF-14 / Extended'
      : 'Code-128 / Custom';

  const sourceLabel =
    source === 'camera'
      ? 'Camera Scanner'
      : source === 'search'
      ? 'Register Search'
      : 'Hardware Scanner';

  const handleCopyBarcode = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(cleanBarcode).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = (addDirectlyToCart: boolean = false) => {
    if (!canManageInventory) {
      soundFx.playError();
      showToast('Permission denied: Inventory management rights are required to create products.', 'error');
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      soundFx.playError();
      showToast('Please enter a product name before saving.', 'warning');
      nameInputRef.current?.focus();
      return;
    }

    if (numSelling <= 0) {
      soundFx.playError();
      showToast('Selling price must be greater than zero.', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const parsedStock = Math.max(0, parseInt(initialStock, 10) || 0);
      const effectiveStock = addDirectlyToCart ? Math.max(1, parsedStock) : parsedStock;
      const stockMap: Record<string, number> = {};
      locations.forEach((loc) => {
        stockMap[loc.id] = loc.id === currentLocation.id ? effectiveStock : 0;
      });

      const defaultTaxRate =
        typeof currentBusiness?.taxSettings?.defaultTaxRate === 'number'
          ? currentBusiness.taxSettings.defaultTaxRate
          : 0.16;

      const createdProduct = addProduct({
        name: trimmedName,
        sku: sku.trim() || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        barcode: cleanBarcode,
        category: category || 'General Merchandise',
        buyingPrice: numBuying,
        sellingPrice: numSelling,
        unit: unit || 'piece',
        taxRate: defaultTaxRate,
        reorderPoint: Math.max(1, parseInt(reorderPoint, 10) || 5),
        stockByLocation: stockMap,
        description: `Added via ${sourceLabel} Quick-Add (${cleanBarcode})`,
      });

      if (!createdProduct) {
        return;
      }

      soundFx.playBarcodeBeep();

      let addedToCart = false;
      if (addDirectlyToCart) {
        if (canSellNow) {
          addToCart(createdProduct, 1);
          addedToCart = true;
          showToast(`"${trimmedName}" saved and added (+1) to active cart.`, 'success');
        } else {
          showToast(`"${trimmedName}" saved to inventory. Open a shift to ring it up.`, 'info');
        }
      }

      onProductAdded?.(createdProduct, addedToCart);
      onClose();
    } catch (err) {
      console.error('Error saving product via Quick-Add modal:', err);
      soundFx.playError();
      showToast('Failed to save product to inventory.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Restricted View for Staff without `manageInventory` (e.g., standard Cashier)
  if (!canManageInventory) {
    return (
      <div
        id="inventory-quick-check-hud-overlay"
        className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4"
      >
        <div
          className="fixed inset-0"
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-slate-900"
          role="dialog"
          aria-modal="true"
          aria-labelledby="hud-restricted-title"
        >
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 id="hud-restricted-title" className="font-display text-base font-bold text-slate-900 truncate">
                  Product Not in Catalog
                </h2>
                <p className="text-xs text-slate-500">
                  {sourceLabel} · Inventory permission required
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              aria-label="Close notice"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Scanned barcode · {barcodeType}</p>
                <p className="font-mono text-base font-bold text-slate-900 tabular-nums truncate mt-0.5">
                  {cleanBarcode}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyBarcode}
                className="min-h-[40px] px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              This item is not registered in <span className="font-semibold text-slate-900">{currentBusiness?.name || 'your store'}</span> yet. Ask a Store Manager or Inventory Clerk to add it to inventory before ringing it up.
            </p>
          </div>

          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-mono text-[11px]">Esc</kbd> to return
            </span>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap"
            >
              Got It
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="inventory-quick-check-hud-overlay"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-3 sm:p-4"
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative z-10 w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hud-title"
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
              <Scan className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="hud-title" className="font-display text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">
                Quick-Add Missing Product
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {sourceLabel} · Barcode not found in catalog
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer shrink-0"
            title="Dismiss (Esc)"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanned Barcode Context Strip */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-slate-500 font-medium">Scanned Code</span>
            <span className="font-mono text-sm font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 tabular-nums">
              {cleanBarcode}
            </span>
            <button
              type="button"
              onClick={handleCopyBarcode}
              className="min-w-[34px] min-h-[34px] inline-flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition cursor-pointer"
              title="Copy Barcode"
              aria-label="Copy barcode"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="text-xs text-slate-500 font-mono tabular-nums flex items-center gap-1.5">
            <span>{barcodeType}</span>
            {metadata && (
              <>
                <span aria-hidden="true">·</span>
                <span>{(metadata.interKeyAvgMs ?? 0).toFixed(0)}ms burst</span>
              </>
            )}
          </div>
        </div>

        {/* Quick-Add Form Body */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(canSellNow);
          }}
          className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto"
        >
          {/* Product Name */}
          <div>
            <label htmlFor="hud-product-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Product / Item Name <span className="text-rose-600">*</span>
            </label>
            <input
              id="hud-product-name"
              ref={nameInputRef}
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Pembe Maize Flour 2kg, Omo Detergent 500g"
              className="w-full min-h-[44px] bg-white border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-slate-900 text-base sm:text-sm rounded-xl px-3.5 py-2.5 outline-none transition placeholder:text-slate-400"
            />
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="hud-product-category" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Category
              </label>
              <select
                id="hud-product-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-[44px] bg-white border border-slate-300 focus:border-blue-600 text-slate-900 text-base sm:text-xs rounded-xl px-3 py-2.5 outline-none transition font-medium"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="hud-product-unit" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Packaging Unit
              </label>
              <select
                id="hud-product-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full min-h-[44px] bg-white border border-slate-300 focus:border-blue-600 text-slate-900 text-base sm:text-xs rounded-xl px-3 py-2.5 outline-none transition font-medium"
              >
                <option value="packet">packet (pkt)</option>
                <option value="piece">piece (pc)</option>
                <option value="bottle">bottle (btl)</option>
                <option value="can">can</option>
                <option value="box">box / carton</option>
                <option value="kg">kg (kilogram)</option>
                <option value="litre">litre (L)</option>
                <option value="tray">tray</option>
              </select>
            </div>
          </div>

          {/* Pricing Grid (Buying cost & margin gated by viewCostPrice) */}
          <div className={`grid ${canViewCost ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200`}>
            <div>
              <label htmlFor="hud-selling-price" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Selling Price ({currentLocation.currency}) <span className="text-rose-600">*</span>
              </label>
              <input
                id="hud-selling-price"
                type="number"
                min="0"
                step="any"
                required
                placeholder="0.00"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full min-h-[44px] bg-white border border-slate-300 focus:border-blue-600 text-slate-900 text-base sm:text-sm font-mono font-bold tabular-nums rounded-lg px-3 py-2 outline-none transition"
              />
            </div>

            {canViewCost && (
              <div>
                <label htmlFor="hud-buying-price" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Buying / Cost Price ({currentLocation.currency})
                </label>
                <input
                  id="hud-buying-price"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Optional cost"
                  value={buyingPrice}
                  onChange={(e) => setBuyingPrice(e.target.value)}
                  className="w-full min-h-[44px] bg-white border border-slate-300 focus:border-blue-600 text-slate-900 text-base sm:text-sm font-mono tabular-nums rounded-lg px-3 py-2 outline-none transition"
                />
              </div>
            )}

            {canViewCost && numSelling > 0 && (
              <div className="sm:col-span-2 pt-1 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-600 inline-flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Estimated Gross Margin</span>
                </span>
                <span className={`font-mono font-semibold tabular-nums ${marginAmt >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {currentLocation.currency} {marginAmt.toFixed(2)} ({marginPct}%)
                </span>
              </div>
            )}
          </div>

          {/* Initial Stock, SKU & Reorder Point */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="hud-initial-stock" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Stock @ {currentLocation.name}
              </label>
              <input
                id="hud-initial-stock"
                type="number"
                min="0"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                className="w-full min-h-[44px] bg-white border border-slate-300 focus:border-blue-600 text-slate-900 text-base sm:text-xs font-mono tabular-nums rounded-xl px-3 py-2 outline-none transition"
              />
            </div>

            <div>
              <label htmlFor="hud-sku" className="block text-xs font-semibold text-slate-700 mb-1.5">
                SKU Code
              </label>
              <input
                id="hud-sku"
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full min-h-[44px] bg-white border border-slate-300 focus:border-blue-600 text-slate-900 text-base sm:text-xs font-mono uppercase rounded-xl px-3 py-2 outline-none transition"
              />
            </div>

            <div>
              <label htmlFor="hud-reorder-point" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Reorder Alert Level
              </label>
              <input
                id="hud-reorder-point"
                type="number"
                min="1"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(e.target.value)}
                className="w-full min-h-[44px] bg-white border border-slate-300 focus:border-blue-600 text-slate-900 text-base sm:text-xs font-mono tabular-nums rounded-xl px-3 py-2 outline-none transition"
              />
            </div>
          </div>
        </form>

        {/* Modal Footer Actions */}
        <div className="bg-slate-50 px-4 sm:px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <span className="text-xs text-slate-500 hidden sm:inline">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-mono text-[11px]">Esc</kbd> to cancel
          </span>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>

            <button
              type="button"
              id="hud-save-inventory-btn"
              onClick={() => handleSave(false)}
              disabled={isSubmitting}
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <PackagePlus className="w-4 h-4 text-slate-600" />
              <span>Save to Inventory</span>
            </button>

            <button
              type="button"
              id="hud-save-and-add-cart-btn"
              onClick={() => handleSave(true)}
              disabled={isSubmitting || !canSellNow}
              title={
                !canSell
                  ? 'Your role cannot ring up sales on the register'
                  : !isShiftOpen
                  ? 'Open a till shift to ring up items directly into the cart'
                  : 'Save product to catalog and add 1 unit directly to cart'
              }
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Save &amp; Add to Cart</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
