import React, { useMemo, useState } from 'react';
import { X, Tag, Truck, DollarSign, Check } from 'lucide-react';
import { Product } from '../../types';
import { usePos } from '../../context/PosContext';

export type BulkActionMode = 'category' | 'supplier' | 'price';

interface BulkInventoryActionModalProps {
  isOpen: boolean;
  mode: BulkActionMode | null;
  selectedProducts: Product[];
  onClose: () => void;
  onComplete: () => void;
}

export const BulkInventoryActionModal: React.FC<BulkInventoryActionModalProps> = ({
  isOpen,
  mode,
  selectedProducts,
  onClose,
  onComplete,
}) => {
  const { categories, suppliers, currentLocation, bulkUpdateProducts } = usePos();

  const [categoryValue, setCategoryValue] = useState(
    categories.find((c) => c !== 'All') || 'All'
  );
  const [customCategory, setCustomCategory] = useState('');
  const [supplierValue, setSupplierValue] = useState('');
  const [priceOp, setPriceOp] = useState<'pct_inc' | 'pct_dec' | 'flat_inc' | 'flat_dec' | 'set_exact'>('pct_inc');
  const [priceAmount, setPriceAmount] = useState('10');

  const previewRows = useMemo(() => {
    const val = parseFloat(priceAmount) || 0;
    return selectedProducts.slice(0, 4).map((p) => {
      let nextPrice = p.sellingPrice;
      if (priceOp === 'pct_inc') nextPrice = p.sellingPrice * (1 + val / 100);
      if (priceOp === 'pct_dec') nextPrice = p.sellingPrice * (1 - val / 100);
      if (priceOp === 'flat_inc') nextPrice = p.sellingPrice + val;
      if (priceOp === 'flat_dec') nextPrice = p.sellingPrice - val;
      if (priceOp === 'set_exact') nextPrice = val;
      nextPrice = Math.max(0, Number(nextPrice.toFixed(2)));
      return {
        id: p.id,
        name: p.name,
        oldPrice: p.sellingPrice,
        nextPrice,
      };
    });
  }, [selectedProducts, priceOp, priceAmount]);

  if (!isOpen || !mode || selectedProducts.length === 0) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'category') {
      const targetCategory = customCategory.trim() || categoryValue || 'All';
      bulkUpdateProducts(
        selectedProducts.map((p) => ({
          id: p.id,
          updates: { category: targetCategory },
        })),
        `Moved ${selectedProducts.length} products to category "${targetCategory}"`
      );
    } else if (mode === 'supplier') {
      const chosenSupplier = suppliers.find((s) => s.id === supplierValue);
      bulkUpdateProducts(
        selectedProducts.map((p) => ({
          id: p.id,
          updates: {
            supplierId: chosenSupplier ? chosenSupplier.id : null,
            supplierName: chosenSupplier ? chosenSupplier.name : null,
          },
        })),
        chosenSupplier
          ? `Linked ${selectedProducts.length} products to ${chosenSupplier.name}`
          : `Unlinked supplier from ${selectedProducts.length} products`
      );
    } else if (mode === 'price') {
      const val = parseFloat(priceAmount);
      if (!Number.isFinite(val) || val < 0) return;
      bulkUpdateProducts(
        selectedProducts.map((p) => {
          let nextPrice = p.sellingPrice;
          if (priceOp === 'pct_inc') nextPrice = p.sellingPrice * (1 + val / 100);
          if (priceOp === 'pct_dec') nextPrice = p.sellingPrice * (1 - val / 100);
          if (priceOp === 'flat_inc') nextPrice = p.sellingPrice + val;
          if (priceOp === 'flat_dec') nextPrice = p.sellingPrice - val;
          if (priceOp === 'set_exact') nextPrice = val;
          return {
            id: p.id,
            updates: { sellingPrice: Math.max(0, Number(nextPrice.toFixed(2))) },
          };
        }),
        `Updated selling price for ${selectedProducts.length} products`
      );
    }

    onComplete();
    onClose();
  };

  const titles: Record<BulkActionMode, { title: string; icon: React.ReactNode }> = {
    category: { title: 'Bulk Assign Category', icon: <Tag className="w-4 h-4 text-blue-600" /> },
    supplier: { title: 'Bulk Assign Supplier', icon: <Truck className="w-4 h-4 text-blue-600" /> },
    price: { title: 'Bulk Price Adjustment', icon: <DollarSign className="w-4 h-4 text-blue-600" /> },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] p-4">
      <div className="bg-white w-full max-w-md rounded-xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {titles[mode].icon}
            <h3 className="text-sm font-bold text-slate-900">{titles[mode].title}</h3>
            <span className="text-xs text-slate-500">· {selectedProducts.length} selected</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            aria-label="Close bulk update dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {mode === 'category' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Choose Existing Category
                </label>
                <select
                  value={categoryValue}
                  onChange={(e) => setCategoryValue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white"
                >
                  {categories.filter((c) => c !== 'All Items').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Or Enter New Category Name (Optional)
                </label>
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Overrides dropdown if filled"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900"
                />
              </div>
            </div>
          )}

          {mode === 'supplier' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Supplier
              </label>
              <select
                value={supplierValue}
                onChange={(e) => setSupplierValue(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white"
              >
                <option value="">Unlink Supplier (None)</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {mode === 'price' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Adjustment Method
                  </label>
                  <select
                    value={priceOp}
                    onChange={(e) => setPriceOp(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white"
                  >
                    <option value="pct_inc">Increase by %</option>
                    <option value="pct_dec">Decrease by %</option>
                    <option value="flat_inc">Increase by {currentLocation.currency}</option>
                    <option value="flat_dec">Decrease by {currentLocation.currency}</option>
                    <option value="set_exact">Set Exact Price</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {priceOp.startsWith('pct') ? 'Percentage (%)' : `Amount (${currentLocation.currency})`}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceAmount}
                    onChange={(e) => setPriceAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono tabular-nums text-slate-900"
                    required
                  />
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg bg-slate-50 p-3 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-500">Preview</div>
                {previewRows.map((row) => (
                  <div key={row.id} className="flex items-center justify-between text-xs gap-2">
                    <span className="text-slate-700 truncate">{row.name}</span>
                    <span className="font-mono tabular-nums text-slate-900 shrink-0">
                      <span className="text-slate-400 line-through mr-1.5">
                        {row.oldPrice.toFixed(2)}
                      </span>
                      <span className="font-semibold text-blue-700">
                        {currentLocation.currency} {row.nextPrice.toFixed(2)}
                      </span>
                    </span>
                  </div>
                ))}
                {selectedProducts.length > 4 && (
                  <div className="text-[11px] text-slate-400">
                    +{selectedProducts.length - 4} more items
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply to {selectedProducts.length} Items</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
