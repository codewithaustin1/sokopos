import React, { useState } from 'react';
import {
  X,
  Link as LinkIcon,
  Search,
  Check,
  Building2,
  Package,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { Supplier } from '../types';
import { usePos } from '../context/PosContext';

interface LinkSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}

export const LinkSupplierModal: React.FC<LinkSupplierModalProps> = ({
  isOpen,
  onClose,
  supplier,
}) => {
  const { products, linkProductToSupplier } = usePos();
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !supplier) return null;

  const linkedProducts = products.filter((p) => p.supplierId === supplier.id);
  const unlinkedProducts = products.filter((p) => p.supplierId !== supplier.id);

  const filteredUnlinked = unlinkedProducts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode.includes(q) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  const handleLink = async (productId: string) => {
    setIsProcessing(true);
    try {
      await linkProductToSupplier(productId, supplier.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnlink = async (productId: string) => {
    setIsProcessing(true);
    try {
      await linkProductToSupplier(productId, null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div id="link-supplier-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
              <LinkIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                Link Inventory Catalog to {supplier.name}
              </h3>
              <p className="text-[11px] text-slate-400">
                Track replenishment, lead times and supply chain oversight
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Active Linked Items Section */}
          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-900">
                  Currently Supplied Catalog
                </span>
                <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {linkedProducts.length} items
                </span>
              </div>
              <span className="text-[11px] text-indigo-700 font-medium">
                {supplier.paymentTerms.toUpperCase()} • Lead time: {supplier.leadTimeDays || 2}d
              </span>
            </div>

            {linkedProducts.length === 0 ? (
              <p className="text-xs text-indigo-700/80 italic py-1">
                No inventory items are currently linked to this supplier. Search below to assign catalog items.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {linkedProducts.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white border border-indigo-200/80 rounded-lg p-2.5 flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {p.sku} • {p.category}
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnlink(p.id)}
                      disabled={isProcessing}
                      className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition cursor-pointer shrink-0"
                      title="Unlink from supplier"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search to Link New Items */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Search Shop Catalog to Link
              </label>
              <span className="text-[11px] text-slate-400">
                {filteredUnlinked.length} available items
              </span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search products by title, SKU, barcode or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>

            {/* Catalog List */}
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 divide-y divide-slate-100">
              {filteredUnlinked.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No unlinked catalog items found matching "{searchQuery}"
                </div>
              ) : (
                filteredUnlinked.map((p) => (
                  <div
                    key={p.id}
                    className="pt-1.5 flex items-center justify-between gap-3 hover:bg-slate-50 p-2 rounded-lg transition"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{p.name}</div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span>{p.sku}</span>
                        <span>•</span>
                        <span>{p.category}</span>
                        {p.supplierName && (
                          <span className="text-amber-600 font-sans font-semibold">
                            (Currently supplied by: {p.supplierName})
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleLink(p.id)}
                      disabled={isProcessing}
                      className="bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Link Item</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
