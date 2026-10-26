import React, { useState, useEffect, useRef } from 'react';
import {
  Scan,
  PlusCircle,
  X,
  CheckCircle2,
  ShoppingCart,
  Copy,
  Check,
  AlertTriangle,
  Zap,
  TrendingUp,
  PackagePlus,
  Layers,
  Sparkles,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { Product } from '../types';
import { ScannerBurstMetadata } from '../utils/backgroundScanner';

export interface InventoryQuickCheckHUDProps {
  isOpen: boolean;
  barcode: string | null;
  metadata?: ScannerBurstMetadata | null;
  onClose: () => void;
  onProductAdded?: (product: Product, addedToCart: boolean) => void;
}

export const InventoryQuickCheckHUD: React.FC<InventoryQuickCheckHUDProps> = ({
  isOpen,
  barcode,
  metadata,
  onClose,
  onProductAdded,
}) => {
  const {
    categories,
    currentLocation,
    locations,
    addProduct,
    addToCart,
    showToast,
    soundFx,
    currentUser,
    activeShift,
  } = usePos();

  const nameInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [sellingPrice, setSellingPrice] = useState('150');
  const [buyingPrice, setBuyingPrice] = useState('110');
  const [initialStock, setInitialStock] = useState('25');
  const [unit, setUnit] = useState('packet');
  const [reorderPoint, setReorderPoint] = useState('10');
  const [sku, setSku] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or reset form whenever HUD opens with a new barcode
  useEffect(() => {
    if (isOpen && barcode) {
      setName('');
      const defaultCat = categories.find((c) => c !== 'All') || categories[0] || 'General Merchandise';
      setCategory(defaultCat);
      setSellingPrice('150');
      setBuyingPrice('110');
      setInitialStock('25');
      setUnit('packet');
      setReorderPoint('10');

      // Generate a clean SKU derived from barcode suffix or random digits
      const cleanDigits = barcode.replace(/\D/g, '');
      const skuSuffix = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : Math.floor(1000 + Math.random() * 9000).toString();
      setSku(`SKU-${skuSuffix}`);

      // Auto-focus the name input after HUD transition
      const timer = setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isOpen, barcode, categories]);

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

  const numSelling = parseFloat(sellingPrice) || 0;
  const numBuying = parseFloat(buyingPrice) || 0;
  const marginAmt = numSelling - numBuying;
  const marginPct = numSelling > 0 ? ((marginAmt / numSelling) * 100).toFixed(1) : '0';

  // Barcode format inference
  const cleanBarcode = barcode.trim();
  const barcodeType =
    cleanBarcode.length === 12
      ? 'UPC-A (12-digit)'
      : cleanBarcode.length === 13
      ? cleanBarcode.startsWith('616')
        ? 'GS1 Kenya (EAN-13)'
        : 'EAN-13 standard'
      : cleanBarcode.length === 8
      ? 'EAN-8'
      : cleanBarcode.length >= 14
      ? 'ITF-14 / Extended'
      : 'Code-128 / Custom';

  const handleCopyBarcode = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(cleanBarcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = (addDirectlyToCart: boolean = false) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      soundFx.playError();
      showToast('Please enter a product name before saving to inventory.', 'warning');
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
      // Build location stocks
      const stockVal = Math.max(0, parseInt(initialStock, 10) || 0);
      const stockMap: Record<string, number> = {};
      locations.forEach((loc) => {
        stockMap[loc.id] = loc.id === currentLocation.id ? stockVal : 0;
      });

      const newProductPayload: Omit<Product, 'id' | 'businessId'> = {
        name: trimmedName,
        sku: sku.trim() || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        barcode: cleanBarcode,
        category: category || 'General Merchandise',
        buyingPrice: numBuying,
        sellingPrice: numSelling,
        unit: unit || 'piece',
        taxRate: 0.16,
        reorderPoint: parseInt(reorderPoint, 10) || 10,
        stockByLocation: stockMap,
        description: `Added via Inventory Quick-Check HUD from hardware barcode scan (${cleanBarcode})`,
      };

      addProduct(newProductPayload);

      // Create a temporary product object to pass to addToCart / callback
      const addedProduct: Product = {
        ...newProductPayload,
        id: `prod-${Date.now()}`,
        businessId: currentUser?.businessId || '',
      };

      soundFx.playBarcodeBeep();
      showToast(`Added "${trimmedName}" (${cleanBarcode}) to inventory list!`, 'success');

      if (addDirectlyToCart) {
        if (activeShift && activeShift.status === 'open') {
          addToCart(addedProduct, 1);
          showToast(`+1 "${trimmedName}" added directly to active cart.`, 'success');
        } else {
          showToast(`Product saved. Shift is not open; could not add to cart.`, 'info');
        }
      }

      onProductAdded?.(addedProduct, addDirectlyToCart);
      onClose();
    } catch (err) {
      console.error('Error adding product via Quick-Check HUD:', err);
      soundFx.playError();
      showToast('Failed to save product to inventory.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="inventory-quick-check-hud-overlay"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-xl bg-slate-900 border border-cyan-500/30 rounded-2xl sm:rounded-3xl shadow-2xl shadow-cyan-950/50 overflow-hidden flex flex-col text-slate-100 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hud-title"
      >
        {/* HUD Top Bar Header */}
        <div className="bg-slate-950 px-4 sm:px-6 py-3.5 border-b border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-inner">
                <Scan className="w-5 h-5 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="hud-title" className="text-sm font-black tracking-tight text-white uppercase flex items-center gap-1.5">
                  <span>Inventory Quick-Check</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    HUD
                  </span>
                </h2>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
                Barcode not in POS database &bull; Quick Add to Inventory
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Dismiss HUD (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanned Barcode Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-cyan-950/20 to-slate-950 px-4 sm:px-6 py-3 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Scanned Code:
            </span>
            <span className="font-mono text-sm sm:text-base font-black text-cyan-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-cyan-500/30 tracking-wider">
              {cleanBarcode}
            </span>
            <button
              type="button"
              onClick={handleCopyBarcode}
              className="p-1 text-slate-400 hover:text-cyan-300 rounded transition cursor-pointer"
              title="Copy Barcode"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 font-medium">
              {barcodeType}
            </span>
            {metadata && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-400">
                <Zap className="w-3 h-3 text-amber-400" />
                {(metadata.interKeyAvgMs ?? 0).toFixed(0)}ms burst
              </span>
            )}
          </div>
        </div>

        {/* Quick-Add Form Body */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(false);
          }}
          className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto dark-scrollbar"
        >
          {/* Product Name (Primary Field) */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5">
              Product / Item Name <span className="text-red-400">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Pembe Maize Flour 2kg, Omo Detergent 500g..."
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-white text-sm rounded-xl px-3.5 py-2.5 outline-none transition placeholder:text-slate-500 font-medium"
            />
          </div>

          {/* Category & Unit in Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 text-white text-xs rounded-xl px-3 py-2.5 outline-none transition font-medium"
              >
                {categories
                  .filter((c) => c !== 'All')
                  .map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                <option value="General Merchandise">General Merchandise</option>
                <option value="Groceries">Groceries</option>
                <option value="Electronics & Accessories">Electronics & Accessories</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                Packaging Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 text-white text-xs rounded-xl px-3 py-2.5 outline-none transition font-medium"
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

          {/* Pricing Grid with Live Margin Calculation */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Selling Price ({currentLocation.currency}) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-400 text-white text-sm font-bold rounded-lg px-3 py-2 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Buying / Cost Price ({currentLocation.currency})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={buyingPrice}
                onChange={(e) => setBuyingPrice(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 text-white text-sm font-medium rounded-lg px-3 py-2 outline-none transition"
              />
            </div>

            {/* Margin display */}
            <div className="col-span-2 pt-1 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                Gross Profit Margin:
              </span>
              <span className={`font-bold ${marginAmt >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {currentLocation.currency} {marginAmt.toFixed(2)} ({marginPct}%)
              </span>
            </div>
          </div>

          {/* Initial Stock & SKU Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                Stock Count @ {currentLocation.name}
              </label>
              <input
                type="number"
                min="0"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 text-white text-xs rounded-xl px-3 py-2 outline-none transition font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                SKU Code
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 text-white text-xs rounded-xl px-3 py-2 outline-none transition font-mono uppercase"
              />
            </div>
          </div>

          {/* Reorder Point */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Low Stock Reorder Alert Level:
            </span>
            <input
              type="number"
              min="1"
              value={reorderPoint}
              onChange={(e) => setReorderPoint(e.target.value)}
              className="w-20 bg-slate-950 border border-slate-700 text-right text-white text-xs rounded-lg px-2 py-1 outline-none font-medium"
            />
          </div>
        </form>

        {/* HUD Bottom Actions */}
        <div className="bg-slate-950 px-4 sm:px-6 py-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="text-[11px] text-slate-400 w-full sm:w-auto text-center sm:text-left">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Esc</kbd> to cancel</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>

            {/* Save & Add to Cart button */}
            <button
              type="button"
              id="hud-save-and-add-cart-btn"
              onClick={() => handleSave(true)}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5 shadow-md shadow-blue-900/30 cursor-pointer disabled:opacity-50"
              title="Add to catalog and immediately append 1 unit to the current sale"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Save & Add to Cart</span>
            </button>

            {/* Primary Save Button */}
            <button
              type="button"
              id="hud-save-inventory-btn"
              onClick={() => handleSave(false)}
              disabled={isSubmitting}
              className="px-4.5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white transition flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Save to Inventory</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
