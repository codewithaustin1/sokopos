import React, { useState, useMemo, useEffect, useRef, useId, useDeferredValue } from 'react';
import { X, Link as LinkIcon, Search, Plus, Trash2 } from 'lucide-react';
import { Supplier } from '../types';
import { usePos } from '../context/PosContext';
import { formatPaymentTermsLabel } from './suppliers/supplierConstants';

interface LinkSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}

const MAX_UNLINKED_VISIBLE = 80;

export const LinkSupplierModal: React.FC<LinkSupplierModalProps> = ({
  isOpen,
  onClose,
  supplier,
}) => {
  const { products, linkProductToSupplier } = usePos();
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const titleId = useId();
  const searchInputId = useId();

  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery('');
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  }, [isOpen, supplier?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pendingProductId) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pendingProductId, onClose]);

  const { linkedProducts, unlinkedProducts } = useMemo(() => {
    if (!supplier) return { linkedProducts: [], unlinkedProducts: [] };
    const linked = [];
    const unlinked = [];
    for (const p of products) {
      if (p.supplierId === supplier.id) {
        linked.push(p);
      } else {
        unlinked.push(p);
      }
    }
    return { linkedProducts: linked, unlinkedProducts: unlinked };
  }, [products, supplier]);

  const filteredUnlinked = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return unlinkedProducts;
    return unlinkedProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [unlinkedProducts, deferredSearch]);

  if (!isOpen || !supplier) return null;

  const visibleUnlinked = filteredUnlinked.slice(0, MAX_UNLINKED_VISIBLE);

  const handleLink = async (productId: string) => {
    setPendingProductId(productId);
    try {
      await linkProductToSupplier(productId, supplier.id);
    } finally {
      setPendingProductId(null);
    }
  };

  const handleUnlink = async (productId: string) => {
    setPendingProductId(productId);
    try {
      await linkProductToSupplier(productId, null);
    } finally {
      setPendingProductId(null);
    }
  };

  return (
    <div
      id="link-supplier-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[1px] p-2 sm:p-4"
    >
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shrink-0"
              aria-hidden="true"
            >
              <LinkIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 id={titleId} className="font-bold text-sm sm:text-base text-white truncate">
                Link Inventory Catalog to {supplier.name}
              </h3>
              <p className="text-xs text-slate-300 truncate">
                {formatPaymentTermsLabel(supplier.paymentTerms)} · Lead time:{' '}
                {supplier.leadTimeDays ?? 2} days
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(pendingProductId)}
            aria-label="Close catalog linking modal"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-white shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Active Linked Items Section (Divider-separated, zero nested cards) */}
          <section aria-label="Currently linked products" className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <h4 className="text-xs font-bold text-slate-900">
                Currently Supplied Catalog ·{' '}
                <span className="font-mono tabular-nums text-indigo-700">
                  {linkedProducts.length} item{linkedProducts.length === 1 ? '' : 's'}
                </span>
              </h4>
            </div>

            {linkedProducts.length === 0 ? (
              <p className="text-xs text-slate-600 py-1">
                No inventory items are currently linked to this supplier. Search below to assign
                products.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-48 overflow-y-auto bg-white">
                {linkedProducts.map((p) => (
                  <div
                    key={p.id}
                    className="px-3 py-2 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">{p.name}</div>
                      <div className="text-xs text-slate-600 font-mono">
                        {p.sku} · {p.category}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnlink(p.id)}
                      disabled={Boolean(pendingProductId)}
                      aria-label={`Unlink ${p.name} from ${supplier.name}`}
                      title="Unlink from supplier"
                      className="min-w-[38px] min-h-[38px] flex items-center justify-center text-slate-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition cursor-pointer disabled:opacity-45 shrink-0 focus-visible:outline-2 focus-visible:outline-red-600"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Search to Link New Items */}
          <section aria-label="Available catalog products" className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={searchInputId} className="text-xs font-bold text-slate-800">
                Search Shop Catalog to Link
              </label>
              <span className="text-xs text-slate-600 font-mono tabular-nums">
                {filteredUnlinked.length} available
              </span>
            </div>

            <div className="relative">
              <Search
                className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                id={searchInputId}
                type="search"
                placeholder="Search products by title, SKU, barcode or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[42px] bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-indigo-600 focus:bg-white focus-visible:outline-2 focus-visible:outline-indigo-600"
              />
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-64 overflow-y-auto bg-white">
              {visibleUnlinked.length === 0 ? (
                <div className="text-center py-6 text-slate-600 text-xs px-3">
                  No unlinked catalog items found matching &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                visibleUnlinked.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">{p.name}</div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600 font-mono">
                        <span>{p.sku}</span>
                        <span aria-hidden="true">·</span>
                        <span>{p.category}</span>
                        {p.supplierName && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-amber-800 font-sans font-semibold">
                              Currently: {p.supplierName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLink(p.id)}
                      disabled={Boolean(pendingProductId)}
                      aria-label={`Link ${p.name} to ${supplier.name}`}
                      className="min-h-[38px] bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-800 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-45 shrink-0 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-indigo-600"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Link</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            {filteredUnlinked.length > MAX_UNLINKED_VISIBLE && (
              <p className="text-xs text-slate-600">
                Showing first {MAX_UNLINKED_VISIBLE} of {filteredUnlinked.length} matches. Refine
                search to narrow further.
              </p>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-lg transition cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
