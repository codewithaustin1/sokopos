import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  QrCode,
  Barcode as BarcodeIcon,
  Tag,
  Download,
  Copy,
  Check,
  Plus,
  Minus,
  Trash2,
  Sliders,
  Sparkles,
  Layers,
  Store,
  Eye,
  RefreshCw,
  Info,
} from 'lucide-react';
import { Product } from '../types';
import { usePos } from '../context/PosContext';
import { BarcodeRenderer } from './BarcodeRenderer';
import { QrCodeRenderer } from './QrCodeRenderer';
import { generateLabelsPdf, LabelPrintItem } from '../utils/labelPdfGenerator';

interface ProductLabelPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProducts: Product[];
  onRemoveProduct?: (productId: string) => void;
}

export const ProductLabelPrintModal: React.FC<ProductLabelPrintModalProps> = ({
  isOpen,
  onClose,
  selectedProducts,
  onRemoveProduct,
}) => {
  const { currentLocation, currentBusiness, showToast, receiptFormat } = usePos();

  // Print quantities mapping: productId -> quantity
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Label configuration
  const [codeType, setCodeType] = useState<'barcode' | 'qr' | 'both'>('barcode');
  const [paperFormat, setPaperFormat] = useState<'80mm' | '58mm' | 'label_50x30' | 'a4_grid'>(
    receiptFormat === '58mm' ? '58mm' : '80mm'
  );
  const [includeStoreName, setIncludeStoreName] = useState(true);
  const [includePrice, setIncludePrice] = useState(true);
  const [includeSku, setIncludeSku] = useState(true);
  const [includeBarcodeText, setIncludeBarcodeText] = useState(true);
  const [includeCategory, setIncludeCategory] = useState(false);
  const [labelSizeDensity, setLabelSizeDensity] = useState<'normal' | 'compact'>('normal');

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isCopiedList, setIsCopiedList] = useState(false);

  // Initialize quantities whenever selected products change
  useEffect(() => {
    if (isOpen && selectedProducts.length > 0) {
      setQuantities((prev) => {
        const next = { ...prev };
        selectedProducts.forEach((p) => {
          if (!next[p.id]) {
            next[p.id] = 1;
          }
        });
        return next;
      });
    }
  }, [isOpen, selectedProducts]);

  // Synchronize paper format default with user's POS receipt format setting
  useEffect(() => {
    if (receiptFormat === '58mm') {
      setPaperFormat('58mm');
    } else if (receiptFormat === '80mm' || receiptFormat === 'standard') {
      setPaperFormat('80mm');
    }
  }, [receiptFormat]);

  // Keyboard shortcut listener: Esc to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const currency = currentLocation?.currency || 'KES';
  const businessName = currentBusiness?.name || 'SokoPoS Horizon';

  const updateQuantity = (productId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[productId] ?? 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  const setExplicitQuantity = (productId: string, val: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(1, val || 1),
    }));
  };

  const handleSetAllToQuantity = (qty: number) => {
    const updated: Record<string, number> = {};
    selectedProducts.forEach((p) => {
      updated[p.id] = qty;
    });
    setQuantities(updated);
    showToast(`Set all labels to ${qty} copy each`, 'info');
  };

  const handleMatchCurrentStock = () => {
    const updated: Record<string, number> = {};
    let totalStockLabels = 0;
    selectedProducts.forEach((p) => {
      const count = Math.max(1, p.stockByLocation[currentLocation.id] ?? 1);
      updated[p.id] = count;
      totalStockLabels += count;
    });
    setQuantities(updated);
    showToast(`Matched quantities to on-hand inventory (${totalStockLabels} total labels)`, 'success');
  };

  // Build flattened label list for printing & preview
  const printItems: LabelPrintItem[] = useMemo(() => {
    return selectedProducts.map((product) => ({
      product,
      quantity: quantities[product.id] || 1,
    }));
  }, [selectedProducts, quantities]);

  const totalLabelCount = useMemo(() => {
    return printItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [printItems]);

  const handlePrint = () => {
    if (selectedProducts.length === 0) {
      showToast('No products selected for printing', 'error');
      return;
    }
    // Browser print triggers thermal printer driver with unboxed CSS
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (selectedProducts.length === 0) return;
    setIsExportingPdf(true);
    try {
      const { fileName, url } = await generateLabelsPdf({
        items: printItems,
        codeType,
        format: paperFormat,
        currency,
        businessName,
        includeStoreName,
        includePrice,
        includeSku,
        includeBarcodeText,
        includeCategory,
      });

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      showToast(`Labels PDF (${fileName}) downloaded`, 'success');
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('Failed to generate PDF labels', 'error');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleCopyBarcodeList = () => {
    if (selectedProducts.length === 0) return;
    const lines = [
      'Product Name\tSKU\tBarcode\tSelling Price\tPrint Qty',
      ...selectedProducts.map(
        (p) =>
          `${p.name}\t${p.sku}\t${p.barcode}\t${p.sellingPrice.toFixed(2)}\t${quantities[p.id] || 1}`
      ),
    ].join('\n');

    navigator.clipboard.writeText(lines);
    setIsCopiedList(true);
    showToast('Product barcodes copied to clipboard (TSV format)', 'success');
    setTimeout(() => setIsCopiedList(false), 2500);
  };

  if (!isOpen) return null;

  // Max width of printable paper preview depending on format
  const printableWidthClass =
    paperFormat === '58mm'
      ? 'w-[58mm] max-w-[240px]'
      : paperFormat === 'label_50x30'
      ? 'w-[50mm] max-w-[210px]'
      : paperFormat === 'a4_grid'
      ? 'w-full max-w-[580px]'
      : 'w-[80mm] max-w-[320px]';

  return (
    <div
      id="product-labels-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-in fade-in-50"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full overflow-hidden flex flex-col my-auto max-h-[96vh]">
        {/* Top Header Bar (Screen Only) */}
        <div className="no-print flex items-center justify-between px-5 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white">
                  Thermal Label & Barcode Generator
                </h3>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {totalLabelCount} {totalLabelCount === 1 ? 'Label' : 'Labels'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Generate high-contrast QR & 1D barcodes optimized for standard 80mm/58mm POS thermal slips & sticky shelf labels.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            title="Close modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Two Columns (Controls on Left / Thermal Preview on Right) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50 min-h-0">
          {/* Left Column: Configuration & Selected Products Queue (Screen Only) */}
          <div className="no-print lg:w-[480px] border-b lg:border-b-0 lg:border-r border-slate-200 p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto shrink-0 bg-white">
            {/* Format & Code Type Selection */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                  1. Code Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCodeType('barcode')}
                    className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      codeType === 'barcode'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500/30'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <BarcodeIcon className="w-4 h-4 mb-1" />
                    <span>1D Barcode</span>
                    <span className="text-[9px] font-normal text-slate-400 mt-0.5">Code 128 / EAN</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCodeType('qr')}
                    className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      codeType === 'qr'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500/30'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <QrCode className="w-4 h-4 mb-1" />
                    <span>2D QR Code</span>
                    <span className="text-[9px] font-normal text-slate-400 mt-0.5">Phone & 2D Optical</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCodeType('both')}
                    className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      codeType === 'both'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500/30'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Layers className="w-4 h-4 mb-1" />
                    <span>Dual Hybrid</span>
                    <span className="text-[9px] font-normal text-slate-400 mt-0.5">Barcode + QR</span>
                  </button>
                </div>
              </div>

              {/* Thermal Paper Sizing */}
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                  2. Thermal Paper & Sizing
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaperFormat('80mm')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition cursor-pointer ${
                      paperFormat === '80mm'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500/30'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>80mm POS Roll</span>
                      {receiptFormat === '80mm' && (
                        <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1.5 rounded">Default</span>
                      )}
                    </div>
                    <span className="text-[10px] font-normal text-slate-500 block mt-0.5">
                      Standard commercial counter printer
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaperFormat('58mm')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition cursor-pointer ${
                      paperFormat === '58mm'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500/30'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>58mm Mini Roll</span>
                      {receiptFormat === '58mm' && (
                        <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1.5 rounded">Default</span>
                      )}
                    </div>
                    <span className="text-[10px] font-normal text-slate-500 block mt-0.5">
                      Mobile bluetooth belt-clip printer
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaperFormat('label_50x30')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition cursor-pointer ${
                      paperFormat === 'label_50x30'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500/30'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>50x30mm Sticky Tag</span>
                    </div>
                    <span className="text-[10px] font-normal text-slate-500 block mt-0.5">
                      Direct thermal adhesive shelf stickers
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaperFormat('a4_grid')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition cursor-pointer ${
                      paperFormat === 'a4_grid'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500/30'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>A4 Sticker Sheet</span>
                    </div>
                    <span className="text-[10px] font-normal text-slate-500 block mt-0.5">
                      Multi-column 3x8 sticker sheets
                    </span>
                  </button>
                </div>
              </div>

              {/* Label Elements Toggles */}
              <div>
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                  3. Content on Label
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={includeStoreName}
                      onChange={(e) => setIncludeStoreName(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>Store Name</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={includePrice}
                      onChange={(e) => setIncludePrice(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>Selling Price</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={includeSku}
                      onChange={(e) => setIncludeSku(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>SKU Code</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={includeBarcodeText}
                      onChange={(e) => setIncludeBarcodeText(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>Digits / Text</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={includeCategory}
                      onChange={(e) => setIncludeCategory(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>Category</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={labelSizeDensity === 'compact'}
                      onChange={(e) => setLabelSizeDensity(e.target.checked ? 'compact' : 'normal')}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>Compact Padding</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Selected Products List & Quantities Manager */}
            <div className="flex-1 flex flex-col min-h-0 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Selected Items ({selectedProducts.length})
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSetAllToQuantity(1)}
                    className="text-[10px] font-bold text-slate-600 hover:text-blue-600 bg-slate-100 px-2 py-0.5 rounded cursor-pointer transition"
                    title="Set 1 label for every product"
                  >
                    1 each
                  </button>
                  <button
                    type="button"
                    onClick={handleMatchCurrentStock}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded cursor-pointer transition"
                    title="Print stickers equal to stock on hand"
                  >
                    Match Stock
                  </button>
                </div>
              </div>

              {selectedProducts.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                  No products selected. Check items in the inventory table.
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-[220px] pr-1">
                  {selectedProducts.map((p) => {
                    const stock = p.stockByLocation[currentLocation.id] ?? 0;
                    const qty = quantities[p.id] ?? 1;

                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 truncate">{p.name}</div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                            <span>SKU: {p.sku}</span>
                            <span>•</span>
                            <span className="font-bold text-blue-600">
                              {currency} {p.sellingPrice.toFixed(2)}
                            </span>
                            <span>•</span>
                            <span>Stock: {stock}</span>
                          </div>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateQuantity(p.id, -1)}
                            className="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-600 flex items-center justify-center hover:bg-slate-100 font-bold cursor-pointer"
                            title="Decrease labels"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max="999"
                            value={qty}
                            onChange={(e) => setExplicitQuantity(p.id, parseInt(e.target.value, 10))}
                            className="w-10 text-center font-mono font-bold text-xs bg-white border border-slate-300 rounded-md py-0.5"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(p.id, 1)}
                            className="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-600 flex items-center justify-center hover:bg-slate-100 font-bold cursor-pointer"
                            title="Increase labels"
                          >
                            <Plus className="w-3 h-3" />
                          </button>

                          {onRemoveProduct && (
                            <button
                              type="button"
                              onClick={() => onRemoveProduct(p.id)}
                              className="w-6 h-6 rounded-md text-slate-400 hover:text-red-600 flex items-center justify-center cursor-pointer ml-1"
                              title="Remove from print batch"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Thermal Print Preview Canvas */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col items-center justify-start bg-slate-200/75">
            {/* Preview Banner Header (Screen Only) */}
            <div className="no-print w-full flex items-center justify-between pb-3 mb-3 border-b border-slate-300 max-w-xl">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Live Thermal Print Preview
                </span>
                <span className="text-[10px] bg-white border border-slate-300 text-slate-600 px-2 py-0.5 rounded-full font-mono font-bold">
                  {paperFormat.toUpperCase()}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {totalLabelCount} labels to print
              </div>
            </div>

            {/* Printable Container: Unboxed in @media print for exact 80mm/58mm roll feeding */}
            <div
              id="product-labels-printable-container"
              className={`product-labels-printable-container ${printableWidthClass} flex flex-col gap-3 items-center`}
            >
              {printItems.map((item) => {
                const p = item.product;
                const qty = item.quantity;
                const codeVal = p.barcode || p.sku || '000000';

                // Render 'qty' copies of this label
                return Array.from({ length: qty }).map((_, copyIndex) => (
                  <div
                    key={`${p.id}-${copyIndex}`}
                    className={`thermal-label-card keep-white w-full bg-white rounded-xl shadow-md border border-slate-300 text-slate-900 select-text flex flex-col items-center justify-between text-center relative ${
                      labelSizeDensity === 'compact' ? 'p-2 sm:p-2.5' : 'p-3 sm:p-4'
                    }`}
                    style={{
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid',
                    }}
                  >
                    {/* Top Store Header */}
                    {includeStoreName && (
                      <div className="text-[9px] font-black uppercase tracking-wider text-slate-500 font-sans pb-0.5 border-b border-dashed border-slate-200 w-full mb-1">
                        {businessName}
                      </div>
                    )}

                    {/* Product Title */}
                    <div className="w-full px-1">
                      <h4 className="text-xs font-black text-slate-950 font-sans leading-tight line-clamp-2">
                        {p.name}
                      </h4>
                      {includeCategory && p.category && (
                        <span className="text-[9px] text-slate-500 font-sans block mt-0.5">
                          {p.category}
                        </span>
                      )}
                    </div>

                    {/* Price Badge */}
                    {includePrice && (
                      <div className="my-1 py-0.5 px-2 bg-slate-100 rounded-md font-sans">
                        <span className="text-xs font-black text-slate-900 tracking-tight">
                          {currency} {p.sellingPrice.toFixed(2)}
                        </span>
                        {p.unit && (
                          <span className="text-[9px] text-slate-500 ml-1">/ {p.unit}</span>
                        )}
                      </div>
                    )}

                    {/* Barcode / QR Code Graphic Area */}
                    <div className="w-full flex items-center justify-center my-1 min-h-[46px] overflow-hidden">
                      {codeType === 'both' ? (
                        <div className="flex items-center justify-center gap-2 w-full">
                          <div className="flex-1 flex justify-center">
                            <BarcodeRenderer
                              value={codeVal}
                              width={1.2}
                              height={34}
                              displayValue={false}
                              margin={1}
                              className="max-h-[38px]"
                            />
                          </div>
                          <div className="shrink-0">
                            <QrCodeRenderer value={codeVal} size={48} margin={0} />
                          </div>
                        </div>
                      ) : codeType === 'qr' ? (
                        <div className="flex flex-col items-center justify-center py-0.5">
                          <QrCodeRenderer
                            value={codeVal}
                            size={paperFormat === '58mm' ? 84 : 96}
                            margin={1}
                          />
                        </div>
                      ) : (
                        <div className="w-full flex flex-col items-center justify-center">
                          <BarcodeRenderer
                            value={codeVal}
                            width={paperFormat === '58mm' ? 1.3 : 1.6}
                            height={paperFormat === '58mm' ? 36 : 42}
                            displayValue={false}
                            margin={1}
                            className="max-h-[46px]"
                          />
                        </div>
                      )}
                    </div>

                    {/* Bottom Metadata: Human-readable digits & SKU */}
                    {(includeBarcodeText || includeSku) && (
                      <div className="w-full pt-1 border-t border-dashed border-slate-200 mt-1 flex items-center justify-around text-[10px] font-mono text-slate-600">
                        {includeSku && (
                          <span className="font-semibold truncate max-w-[45%]">
                            SKU: {p.sku}
                          </span>
                        )}
                        {includeBarcodeText && (
                          <span className="font-bold tracking-wider truncate max-w-[55%]">
                            *{p.barcode}*
                          </span>
                        )}
                      </div>
                    )}

                    {/* Paper Tear Indicator guide (Screen Preview Only) */}
                    <div className="no-print absolute -bottom-2 inset-x-4 border-b border-dotted border-slate-400 opacity-40 pointer-events-none" />
                  </div>
                ));
              })}
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions Bar (Screen Only) */}
        <div className="no-print px-5 py-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Thermal roll unboxing enabled. Direct ESC/POS silent kiosk printing supported.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleCopyBarcodeList}
              className="px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Copy barcode list in TSV format for Excel/Google Sheets"
            >
              {isCopiedList ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy List</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf || selectedProducts.length === 0}
              className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Save printable labels file as vector PDF"
            >
              {isExportingPdf ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
              ) : (
                <Download className="w-3.5 h-3.5 text-blue-600" />
              )}
              <span>Download PDF</span>
            </button>

            <button
              id="btn-confirm-print-thermal-labels"
              type="button"
              onClick={handlePrint}
              disabled={selectedProducts.length === 0}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Send directly to thermal receipt or barcode label printer"
            >
              <Printer className="w-4 h-4" />
              <span>Print {totalLabelCount} Labels</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
