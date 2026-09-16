import React, { useState } from 'react';
import { X, ArrowRightLeft, Building2, Package, CheckCircle2 } from 'lucide-react';
import { Product } from '../types';
import { usePos } from '../context/PosContext';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProduct?: Product | null;
}

export const StockTransferModal: React.FC<StockTransferModalProps> = ({
  isOpen,
  onClose,
  defaultProduct,
}) => {
  const { products, locations, currentLocation, transferStock } = usePos();

  const [selectedProductId, setSelectedProductId] = useState<string>(
    defaultProduct?.id || products[0]?.id || ''
  );
  const [fromLocationId, setFromLocationId] = useState<string>(currentLocation.id);
  const [toLocationId, setToLocationId] = useState<string>(
    locations.find((l) => l.id !== currentLocation.id)?.id || locations[1]?.id || ''
  );
  const [quantity, setQuantity] = useState<string>('5');

  if (!isOpen) return null;

  const product = products.find((p) => p.id === selectedProductId) || products[0];
  const availableInFrom = product ? product.stockByLocation[fromLocationId] ?? 0 : 0;
  const availableInTo = product ? product.stockByLocation[toLocationId] ?? 0 : 0;
  const transferQty = parseInt(quantity, 10) || 0;

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || transferQty <= 0) return;

    const success = transferStock(product.id, fromLocationId, toLocationId, transferQty);
    if (success) {
      onClose();
    }
  };

  return (
    <div id="stock-transfer-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[96vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">Inter-Branch Stock Transfer</h3>
              <p className="text-[11px] sm:text-xs text-slate-400">Rebalance inventory across cloud store nodes</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleTransfer} className="p-3.5 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
          {/* Select Product */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Product to Move
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {/* Transfer Route */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            {/* Origin */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                From (Source Branch)
              </label>
              <select
                value={fromLocationId}
                onChange={(e) => setFromLocationId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id} disabled={loc.id === toLocationId}>
                    {loc.name}
                  </option>
                ))}
              </select>
              <div className="mt-1.5 text-[11px] text-slate-500">
                Available: <b className="text-blue-600 font-mono">{availableInFrom}</b> units
              </div>
            </div>

            {/* Destination */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                To (Receiving Branch)
              </label>
              <select
                value={toLocationId}
                onChange={(e) => setToLocationId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id} disabled={loc.id === fromLocationId}>
                    {loc.name}
                  </option>
                ))}
              </select>
              <div className="mt-1.5 text-[11px] text-slate-500">
                Current: <b className="text-slate-800 font-mono">{availableInTo}</b> units
              </div>
            </div>
          </div>

          {/* Transfer Quantity */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Quantity to Transfer
            </label>
            <input
              type="number"
              min="1"
              max={availableInFrom}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-base font-mono font-black text-slate-800 focus:outline-none focus:border-blue-600"
            />
            {transferQty > availableInFrom && (
              <p className="text-[10px] text-red-600 font-bold mt-1">
                Transfer quantity exceeds available stock at source!
              </p>
            )}
          </div>

          {/* Forecast preview */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-blue-800 font-bold block">Post-Transfer Rebalance:</span>
              <span className="text-blue-600 text-[11px]">
                Source becomes {Math.max(0, availableInFrom - transferQty)} • Destination becomes{' '}
                {availableInTo + transferQty}
              </span>
            </div>
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
          </div>

          {/* Actions */}
          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={transferQty <= 0 || transferQty > availableInFrom}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>Initiate Cloud Transfer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
