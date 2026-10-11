import React, { useState, useEffect } from 'react';
import { X, Barcode, Save, Sparkles, Trash2, Camera, CheckCircle2 } from 'lucide-react';
import { Product } from '../types';
import { usePos } from '../context/PosContext';
import { PackageScannerModal } from './PackageScannerModal';
import { ParsedProductPackage } from '../types/aiVision';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  initialAiProduct?: ParsedProductPackage | null;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  initialAiProduct,
}) => {
  const { categories, locations, suppliers, addProduct, updateProduct, deleteProduct, currentLocation } = usePos();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Flour & Grains');
  const [supplierId, setSupplierId] = useState('');
  const [buyingPrice, setBuyingPrice] = useState('100');
  const [sellingPrice, setSellingPrice] = useState('130');
  const [unit, setUnit] = useState('packet');
  const [reorderPoint, setReorderPoint] = useState('15');
  const [description, setDescription] = useState('');
  const [initialStocks, setInitialStocks] = useState<Record<string, number>>({});
  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);
  const [aiPopulatedNotice, setAiPopulatedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setSku(productToEdit.sku);
      setBarcode(productToEdit.barcode);
      setCategory(productToEdit.category || 'All');
      setSupplierId(productToEdit.supplierId || '');
      setBuyingPrice(productToEdit.buyingPrice.toString());
      setSellingPrice(productToEdit.sellingPrice.toString());
      setUnit(productToEdit.unit);
      setReorderPoint(productToEdit.reorderPoint.toString());
      setDescription(productToEdit.description || '');
      setInitialStocks(productToEdit.stockByLocation);
      setAiPopulatedNotice(null);
    } else if (initialAiProduct) {
      applyAiParsedData(initialAiProduct);
    } else {
      // Reset for new product
      setName('');
      const randNum = Math.floor(1000 + Math.random() * 9000);
      setSku(`SKU-${randNum}`);
      setBarcode(`616${Math.floor(100000000 + Math.random() * 900000000)}`);
      const defaultCat = categories.find((c) => c !== 'All') || categories[0] || 'All';
      setCategory(defaultCat);
      setSupplierId('');
      setBuyingPrice('120');
      setSellingPrice('150');
      setUnit('packet');
      setReorderPoint('20');
      setDescription('');
      setAiPopulatedNotice(null);
      // Default stock 25 across locations
      const defaultStocks: Record<string, number> = {};
      locations.forEach((loc) => {
        defaultStocks[loc.id] = 25;
      });
      setInitialStocks(defaultStocks);
    }
  }, [productToEdit, initialAiProduct, isOpen, categories, locations]);

  const applyAiParsedData = (data: ParsedProductPackage) => {
    setName(data.productName);
    setBarcode(data.barcode);
    if (data.category && categories.includes(data.category)) {
      setCategory(data.category);
    }
    setBuyingPrice(data.suggestedBuyingPrice.toString());
    setSellingPrice(data.suggestedSellingPrice.toString());
    setUnit(data.unit || 'packet');
    setReorderPoint((data.suggestedReorderPoint || 15).toString());
    setDescription(data.description || `Extracted via Gemini Vision from ${data.brand} packaging`);
    setAiPopulatedNotice(`Auto-populated from ${data.brand} packaging via Gemini Vision AI`);
  };

  if (!isOpen) return null;

  const generateBarcode = () => {
    setBarcode(`616${Math.floor(100000000 + Math.random() * 900000000)}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const bPrice = parseFloat(buyingPrice) || 0;
    const sPrice = parseFloat(sellingPrice) || 0;
    const reorder = parseInt(reorderPoint, 10) || 10;
    const finalCat = category?.trim() || 'All';
    const chosenSupplier = suppliers.find((s) => s.id === supplierId);
    const suppName = chosenSupplier ? chosenSupplier.name : undefined;

    if (productToEdit) {
      updateProduct(productToEdit.id, {
        name,
        sku,
        barcode,
        category: finalCat,
        buyingPrice: bPrice,
        sellingPrice: sPrice,
        unit,
        reorderPoint: reorder,
        description,
        supplierId: supplierId || undefined,
        supplierName: suppName,
        stockByLocation: initialStocks,
      });
    } else {
      addProduct({
        name,
        sku,
        barcode,
        category: finalCat,
        buyingPrice: bPrice,
        sellingPrice: sPrice,
        unit,
        taxRate: 0.16,
        reorderPoint: reorder,
        description,
        supplierId: supplierId || undefined,
        supplierName: suppName,
        stockByLocation: initialStocks,
      });
    }

    onClose();
  };

  return (
    <div id="product-form-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[96vh] sm:max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-slate-900 text-white shrink-0">
          <div>
            <h3 className="font-bold text-sm sm:text-base">
              {productToEdit ? 'Edit Product Details' : 'Add New Inventory Item'}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Synchronized with cloud catalog across all branches
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 overflow-y-auto space-y-3.5 sm:space-y-4 flex-1">
          {/* AI Vision Packaging Scan Trigger */}
          {!productToEdit && (
            <div className="space-y-2">
              <button
                type="button"
                id="btn-ai-package-scan-form"
                onClick={() => setIsAiScannerOpen(true)}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 hover:from-indigo-100 hover:to-blue-100 border border-indigo-200 text-indigo-950 font-bold text-xs transition cursor-pointer shadow-2xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs">Scan Package with Vision AI</span>
                      <span className="text-[9px] font-black uppercase bg-indigo-200 text-indigo-800 px-1.5 py-0.2 rounded-full">
                        Gemini Vision
                      </span>
                    </div>
                    <div className="text-[10px] text-indigo-600/80 font-normal mt-0.5">
                      Point camera or upload packaging to extract brand, title, weight, barcode & prices
                    </div>
                  </div>
                </div>
                <Sparkles className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform shrink-0" />
              </button>

              {aiPopulatedNotice && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{aiPopulatedNotice}</span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Product Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Unga Jogoo Maize Flour 2kg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">SKU / Code</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700">Barcode (EAN/UPC)</label>
                <button
                  type="button"
                  onClick={generateBarcode}
                  className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5"
                >
                  <Sparkles className="w-2.5 h-2.5" /> Auto-gen
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-xs font-mono font-bold text-slate-800"
                />
                <Barcode className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700"
              >
                {categories.filter((c) => c !== 'All Items').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Unit of Measure</label>
              <input
                type="text"
                placeholder="packet, bottle, kg..."
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Linked Supplier / Supply Chain Association */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-700">
                Primary Supplier / Vendor
              </label>
              <span className="text-[10px] text-slate-400">
                Supply chain tracking & replenishment
              </span>
            </div>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800"
            >
              <option value="">-- No Supplier Assigned (Unlinked) --</option>
              {suppliers.map((supp) => (
                <option key={supp.id} value={supp.id}>
                  {supp.name} ({supp.category || 'General'} • {supp.paymentTerms.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Pricing & Margins */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Pricing ({currentLocation.currency}) & Profit Margin
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Buying Price
                </label>
                <input
                  type="number"
                  step="any"
                  value={buyingPrice}
                  onChange={(e) => setBuyingPrice(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Selling Price
                </label>
                <input
                  type="number"
                  step="any"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Gross Margin
                </label>
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2 text-xs font-bold font-mono">
                  {parseFloat(sellingPrice) > 0
                    ? `${(
                        ((parseFloat(sellingPrice) - parseFloat(buyingPrice)) /
                          parseFloat(sellingPrice)) *
                        100
                      ).toFixed(1)}%`
                    : '0%'}
                </div>
              </div>
            </div>
          </div>

          {/* Location-Specific Initial Inventory Counts */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Multi-Location Initial Stock Counts
              </span>
              <span className="text-[10px] text-slate-500">Cloud synched</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {locations.map((loc) => (
                <div key={loc.id} className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-800 block truncate">
                    {loc.name}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-400">Units:</span>
                    <input
                      type="number"
                      min="0"
                      value={initialStocks[loc.id] ?? 0}
                      onChange={(e) =>
                        setInitialStocks({
                          ...initialStocks,
                          [loc.id]: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-20 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex justify-between items-center gap-2">
            {productToEdit ? (
              <button
                type="button"
                onClick={() => {
                  deleteProduct(productToEdit.id);
                  onClose();
                }}
                className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                title="Delete this product"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{productToEdit ? 'Save Changes' : 'Create Product'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <PackageScannerModal
        isOpen={isAiScannerOpen}
        onClose={() => setIsAiScannerOpen(false)}
        onApplyParsedProduct={(parsed) => {
          applyAiParsedData(parsed);
          setIsAiScannerOpen(false);
        }}
      />
    </div>
  );
};
