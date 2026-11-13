import React, { useEffect, useState } from 'react';
import {
  X,
  Edit2,
  Copy,
  Printer,
  ArrowRightLeft,
  Trash2,
  Minus,
  Plus,
  Check,
  Building2,
  Truck,
  Tag,
  Package,
} from 'lucide-react';
import { Product } from '../../types';
import { usePos } from '../../context/PosContext';
import { BarcodeRenderer } from '../BarcodeRenderer';

interface ProductInspectorDrawerProps {
  product: Product | null;
  onClose: () => void;
  onEditFull: (product: Product) => void;
  onClone: (product: Product) => void;
  onPrintLabel: (product: Product) => void;
  onTransfer: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export const ProductInspectorDrawer: React.FC<ProductInspectorDrawerProps> = ({
  product,
  onClose,
  onEditFull,
  onClone,
  onPrintLabel,
  onTransfer,
  onDelete,
}) => {
  const {
    locations,
    currentLocation,
    updateProduct,
    adjustStock,
    can,
  } = usePos();

  const canManage = can('manageInventory');
  const canViewCost = can('viewCostPrice');
  const canTransfer = can('stockTransfers');

  const [isQuickEditingPrices, setIsQuickEditingPrices] = useState(false);
  const [buyingInput, setBuyingInput] = useState('');
  const [sellingInput, setSellingInput] = useState('');
  const [reorderInput, setReorderInput] = useState('');
  const [stockReason, setStockReason] = useState('Drawer cycle count');
  const [branchDrafts, setBranchDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!product) return;
    setIsQuickEditingPrices(false);
    setBuyingInput(String(product.buyingPrice));
    setSellingInput(String(product.sellingPrice));
    setReorderInput(String(product.reorderPoint));
    const drafts: Record<string, string> = {};
    locations.forEach((loc) => {
      drafts[loc.id] = String(product.stockByLocation?.[loc.id] ?? 0);
    });
    setBranchDrafts(drafts);
  }, [product, locations]);

  useEffect(() => {
    if (!product) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [product, onClose]);

  if (!product) return null;

  const totalUnits = locations.reduce(
    (sum, loc) => sum + (product.stockByLocation?.[loc.id] ?? 0),
    0
  );
  const currentLocStock = product.stockByLocation?.[currentLocation.id] ?? 0;
  const marginPct =
    product.sellingPrice > 0
      ? (((product.sellingPrice - product.buyingPrice) / product.sellingPrice) * 100).toFixed(1)
      : '0.0';
  const profitPerUnit = product.sellingPrice - product.buyingPrice;

  const handleSaveQuickPrices = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    const nextSell = Math.max(0, parseFloat(sellingInput) || 0);
    const nextBuy = canViewCost ? Math.max(0, parseFloat(buyingInput) || 0) : product.buyingPrice;
    const nextReorder = Math.max(0, parseInt(reorderInput, 10) || 0);

    updateProduct(product.id, {
      buyingPrice: nextBuy,
      sellingPrice: nextSell,
      reorderPoint: nextReorder,
    });
    setIsQuickEditingPrices(false);
  };

  const commitBranchStock = (locId: string, nextVal: number) => {
    if (!canManage) return;
    const clean = Math.max(0, Math.round(nextVal));
    setBranchDrafts((prev) => ({ ...prev, [locId]: String(clean) }));
    adjustStock(product.id, locId, clean, stockReason || 'Drawer cycle count');
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="fixed inset-0 bg-slate-900/35 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        aria-label={`Product details for ${product.name}`}
        className="relative z-10 w-full max-w-[440px] bg-white h-full border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-150"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-mono font-semibold text-slate-700 tabular-nums">{product.sku}</span>
              <span aria-hidden="true">·</span>
              <span>{product.category || 'All'}</span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{product.unit || 'piece'}</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1 leading-snug break-words">
              {product.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
            aria-label="Close product inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Pricing & Margin Summary */}
          <section className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-700">Pricing &amp; Thresholds</h4>
              {canManage && !isQuickEditingPrices && (
                <button
                  type="button"
                  onClick={() => setIsQuickEditingPrices(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  Quick Edit
                </button>
              )}
            </div>

            {isQuickEditingPrices ? (
              <form onSubmit={handleSaveQuickPrices} className="space-y-3">
                <div className="grid grid-cols-3 gap-2.5">
                  {canViewCost && (
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Buying ({currentLocation.currency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={buyingInput}
                        onChange={(e) => setBuyingInput(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Selling ({currentLocation.currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={sellingInput}
                      onChange={(e) => setSellingInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Reorder At
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={reorderInput}
                      onChange={(e) => setReorderInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsQuickEditingPrices(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Prices</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-slate-500">Selling Price</div>
                  <div className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                    {currentLocation.currency} {product.sellingPrice.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Buying Cost</div>
                  <div className="text-base font-semibold text-slate-700 font-mono tabular-nums mt-0.5">
                    {canViewCost ? `${currentLocation.currency} ${product.buyingPrice.toFixed(2)}` : '••••'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Gross Margin</div>
                  <div className="text-xs font-semibold text-emerald-700 font-mono tabular-nums mt-0.5">
                    {canViewCost
                      ? `${marginPct}% (+${currentLocation.currency} ${profitPerUnit.toFixed(2)})`
                      : 'Restricted'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500">Reorder Alert Level</div>
                  <div className="text-xs font-semibold text-slate-800 font-mono tabular-nums mt-0.5">
                    {product.reorderPoint} {product.unit || 'units'}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Branch Stock Breakdown & Inline Steppers */}
          <section className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <h4 className="text-xs font-semibold text-slate-700">Stock by Branch</h4>
              </div>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                Total: {totalUnits}
              </span>
            </div>

            {canManage && (
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Adjustment Reason</label>
                <select
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700"
                >
                  <option value="Drawer cycle count">Cycle Count / Audit</option>
                  <option value="Supplier restock">Supplier Restock</option>
                  <option value="Damaged or expired">Damaged / Shrinkage</option>
                  <option value="Opening balance correction">Opening Balance Correction</option>
                </select>
              </div>
            )}

            <div className="divide-y divide-slate-100">
              {locations.map((loc) => {
                const qty = product.stockByLocation?.[loc.id] ?? 0;
                const draftVal = branchDrafts[loc.id] ?? String(qty);
                const parsedDraft = parseInt(draftVal, 10);
                const hasPendingInput = !isNaN(parsedDraft) && parsedDraft !== qty;
                const isLow = qty > 0 && qty <= product.reorderPoint;
                const isOut = qty === 0;

                return (
                  <div key={loc.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">
                        {loc.name}
                        {loc.id === currentLocation.id && (
                          <span className="text-[11px] font-normal text-blue-600 ml-1.5">Current</span>
                        )}
                      </div>
                      <div
                        className={`text-[11px] font-medium ${
                          isOut ? 'text-rose-600' : isLow ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {isOut ? 'Out of stock' : isLow ? `${qty} low stock` : `${qty} in stock`}
                      </div>
                    </div>

                    {canManage ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => commitBranchStock(loc.id, qty - 1)}
                          disabled={qty <= 0}
                          className="w-7 h-7 rounded-md border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 disabled:opacity-40 cursor-pointer"
                          aria-label={`Decrease stock at ${loc.name}`}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={draftVal}
                          onChange={(e) =>
                            setBranchDrafts((prev) => ({ ...prev, [loc.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isNaN(parsedDraft)) {
                              e.preventDefault();
                              commitBranchStock(loc.id, parsedDraft);
                            }
                          }}
                          className="w-14 h-7 px-1.5 text-center border border-slate-200 rounded-md text-xs font-mono font-semibold tabular-nums text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => commitBranchStock(loc.id, qty + 1)}
                          className="w-7 h-7 rounded-md border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 cursor-pointer"
                          aria-label={`Increase stock at ${loc.name}`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        {hasPendingInput && (
                          <button
                            type="button"
                            onClick={() => commitBranchStock(loc.id, parsedDraft)}
                            className="h-7 px-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold cursor-pointer"
                          >
                            Apply
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="font-mono text-xs font-semibold tabular-nums text-slate-800">
                        {qty}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Catalog Metadata & Barcode */}
          <section className="border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                  Supplier
                </span>
                <span className="font-medium text-slate-800">
                  {product.supplierName || 'Unlinked'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  Category
                </span>
                <span className="font-medium text-slate-800">{product.category || 'All'}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-slate-400" />
                  {currentLocation.name} Value
                </span>
                <span className="font-mono font-semibold tabular-nums text-slate-800">
                  {currentLocation.currency} {(currentLocStock * product.sellingPrice).toLocaleString()}
                </span>
              </div>
            </div>

            {product.description && (
              <div className="pt-2.5 border-t border-slate-100">
                <div className="text-[11px] text-slate-500 mb-0.5">Description</div>
                <p className="text-xs text-slate-700 leading-relaxed">{product.description}</p>
              </div>
            )}

            <div className="pt-2.5 border-t border-slate-100 flex flex-col items-center bg-slate-50/70 rounded-lg p-3">
              <BarcodeRenderer value={product.barcode || product.sku} height={38} width={1.5} />
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPrintLabel(product)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Label</span>
            </button>
            {canTransfer && (
              <button
                type="button"
                onClick={() => onTransfer(product)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
                <span>Transfer</span>
              </button>
            )}
            {canManage && (
              <button
                type="button"
                onClick={() => onClone(product)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                title="Duplicate item with a fresh SKU & barcode"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Clone</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() => onDelete(product)}
                  className="px-3 py-2 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-xs font-semibold text-rose-700 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
                <button
                  type="button"
                  onClick={() => onEditFull(product)}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};
