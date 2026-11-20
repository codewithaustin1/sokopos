import React, { useState, useMemo, useEffect, useRef, useId } from 'react';
import {
  X,
  Building2,
  Edit2,
  Trash2,
  Package,
  Plus,
  CheckCircle2,
  PauseCircle,
  AlertTriangle,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Supplier } from '../types';
import { usePos } from '../context/PosContext';
import { formatPaymentTermsLabel } from './suppliers/supplierConstants';

interface SupplierDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  onEditSupplier: (supplier: Supplier) => void;
  onOpenLinkModal: (supplier: Supplier) => void;
  onOpenInvoiceModal?: () => void;
}

export const SupplierDetailModal: React.FC<SupplierDetailModalProps> = ({
  isOpen,
  onClose,
  supplier,
  onEditSupplier,
  onOpenLinkModal,
  onOpenInvoiceModal,
}) => {
  const { products, deleteSupplier, currentLocation, currentBusiness, linkProductToSupplier } =
    usePos();
  const [activeTab, setActiveTab] = useState<'overview' | 'catalog'>('overview');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const overviewTabId = useId();
  const catalogTabId = useId();
  const overviewPanelId = useId();
  const catalogPanelId = useId();

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('overview');
    setIsConfirmingDelete(false);
    setIsDeleting(false);
    requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
  }, [isOpen, supplier?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  const { linkedProducts, totalBranchStock, lowStockCount } = useMemo(() => {
    if (!supplier) {
      return { linkedProducts: [], totalBranchStock: 0, lowStockCount: 0 };
    }
    const locId = currentLocation?.id || '';
    const linked = products.filter((p) => p.supplierId === supplier.id);
    let totalStock = 0;
    let lowCount = 0;

    linked.forEach((p) => {
      const stock = p.stockByLocation[locId] ?? 0;
      totalStock += stock;
      if (stock <= p.reorderPoint) lowCount += 1;
    });

    return {
      linkedProducts: linked,
      totalBranchStock: totalStock,
      lowStockCount: lowCount,
    };
  }, [products, supplier, currentLocation?.id]);

  if (!isOpen || !supplier) return null;

  const currency = currentBusiness?.currency || currentLocation?.currency || 'KES';
  const isActive = supplier.status === 'active';

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteSupplier(supplier.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      id="supplier-detail-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-[1px] p-2 sm:p-4"
    >
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0"
              aria-hidden="true"
            >
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id={titleId} className="font-bold text-base sm:text-lg text-white truncate">
                {supplier.name}
              </h3>
              <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    isActive ? 'text-emerald-300' : 'text-slate-300'
                  }`}
                >
                  {isActive ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <PauseCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  )}
                  <span>{isActive ? 'Active' : 'Inactive'}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span>{supplier.category || 'General Supplies'}</span>
                <span aria-hidden="true">·</span>
                <span>{formatPaymentTermsLabel(supplier.paymentTerms)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onEditSupplier(supplier)}
              aria-label={`Edit profile for ${supplier.name}`}
              title="Edit Profile"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
            >
              <Edit2 className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              aria-label="Close supplier details modal"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-white"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Accessible Tab Navigation */}
        <div
          role="tablist"
          aria-label="Supplier detail sections"
          className="flex border-b border-slate-200 bg-slate-50 px-5 shrink-0"
        >
          <button
            id={overviewTabId}
            type="button"
            role="tab"
            aria-selected={activeTab === 'overview'}
            aria-controls={overviewPanelId}
            onClick={() => setActiveTab('overview')}
            className={`min-h-[44px] py-2.5 px-4 text-xs font-semibold border-b-2 transition cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600 ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Overview &amp; Account Details
          </button>
          <button
            id={catalogTabId}
            type="button"
            role="tab"
            aria-selected={activeTab === 'catalog'}
            aria-controls={catalogPanelId}
            onClick={() => setActiveTab('catalog')}
            className={`min-h-[44px] py-2.5 px-4 text-xs font-semibold border-b-2 transition cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600 ${
              activeTab === 'catalog'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Linked Catalog Items</span>
            <span className="font-mono tabular-nums text-slate-600">
              ({linkedProducts.length})
            </span>
          </button>
        </div>

        {/* Tab Viewport */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'overview' ? (
            <div
              id={overviewPanelId}
              role="tabpanel"
              aria-labelledby={overviewTabId}
              className="space-y-5"
            >
              {/* Summary Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-4 border-b border-slate-200">
                <div>
                  <div className="text-xs font-semibold text-slate-600">Supplied Products</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                    {linkedProducts.length}
                  </div>
                  <div className="text-xs text-slate-600">In catalog</div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-600">Units in Stock</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-0.5">
                    {totalBranchStock.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-600 truncate">
                    At {currentLocation.name.split(' ')[0]}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-600">Lead Time</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                    {supplier.leadTimeDays ?? 2} <span className="text-xs font-sans">days</span>
                  </div>
                  <div className="text-xs text-slate-600">Delivery window</div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-600">Total Purchases</div>
                  <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5 truncate">
                    {currency} {(supplier.totalInvoiced || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-600 font-mono tabular-nums">
                    {supplier.ordersCount || 0} shipments
                  </div>
                </div>
              </div>

              {/* Low Stock Callout */}
              {lowStockCount > 0 && (
                <div
                  role="status"
                  className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 text-amber-900 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
                    <span>
                      {lowStockCount} linked product{lowStockCount > 1 ? 's are' : ' is'} at or
                      below reorder threshold.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('catalog')}
                    className="font-semibold text-amber-900 hover:underline shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-700 rounded px-1"
                  >
                    View Items →
                  </button>
                </div>
              )}

              {/* Contact & Settlement Details (Divider-separated grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <section aria-label="Contact and logistics" className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-900 pb-1.5 border-b border-slate-200">
                    Contact &amp; Logistics
                  </h4>
                  <dl className="space-y-2 text-xs text-slate-800">
                    {supplier.contactPerson && (
                      <div className="flex items-baseline gap-2">
                        <dt className="text-slate-600 font-medium w-24 shrink-0">Sales Rep:</dt>
                        <dd className="font-semibold text-slate-900">{supplier.contactPerson}</dd>
                      </div>
                    )}
                    <div className="flex items-baseline gap-2">
                      <dt className="text-slate-600 font-medium w-24 shrink-0">Phone:</dt>
                      <dd>
                        <a
                          href={`tel:${supplier.phone}`}
                          className="font-mono tabular-nums font-semibold text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
                        >
                          {supplier.phone}
                        </a>
                      </dd>
                    </div>
                    {supplier.email && (
                      <div className="flex items-baseline gap-2">
                        <dt className="text-slate-600 font-medium w-24 shrink-0">Email:</dt>
                        <dd className="min-w-0">
                          <a
                            href={`mailto:${supplier.email}`}
                            className="text-slate-800 hover:text-blue-700 hover:underline truncate block focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
                          >
                            {supplier.email}
                          </a>
                        </dd>
                      </div>
                    )}
                    {supplier.address && (
                      <div className="flex items-baseline gap-2">
                        <dt className="text-slate-600 font-medium w-24 shrink-0">Address:</dt>
                        <dd className="text-slate-800">
                          {supplier.address}
                          {supplier.city ? `, ${supplier.city}` : ''}
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>

                <section aria-label="Settlement and tax compliance" className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-900 pb-1.5 border-b border-slate-200">
                    Settlement &amp; Tax Compliance
                  </h4>
                  <dl className="space-y-2 text-xs text-slate-800">
                    <div className="flex items-baseline gap-2">
                      <dt className="text-slate-600 font-medium w-24 shrink-0">Terms:</dt>
                      <dd className="font-semibold text-blue-800">
                        {formatPaymentTermsLabel(supplier.paymentTerms)}
                      </dd>
                    </div>
                    {supplier.kraPin && (
                      <div className="flex items-baseline gap-2">
                        <dt className="text-slate-600 font-medium w-24 shrink-0">KRA PIN:</dt>
                        <dd className="font-mono font-semibold text-slate-900">
                          {supplier.kraPin}
                        </dd>
                      </div>
                    )}
                    {supplier.mpesaPaybillOrTill && (
                      <div className="flex items-baseline gap-2">
                        <dt className="text-slate-600 font-medium w-24 shrink-0">M-Pesa:</dt>
                        <dd className="font-mono font-semibold text-emerald-700">
                          {supplier.mpesaPaybillOrTill}
                        </dd>
                      </div>
                    )}
                    {(supplier.bankName || supplier.bankAccount) && (
                      <div className="flex items-baseline gap-2">
                        <dt className="text-slate-600 font-medium w-24 shrink-0">Bank:</dt>
                        <dd className="font-mono text-slate-800">
                          {[supplier.bankName, supplier.bankAccount].filter(Boolean).join(' · ')}
                        </dd>
                      </div>
                    )}
                  </dl>
                </section>
              </div>

              {/* Operational Notes */}
              {supplier.notes && (
                <div className="pt-3 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-slate-700 mb-1">
                    Route Schedules &amp; Operational Notes
                  </h4>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {supplier.notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div
              id={catalogPanelId}
              role="tabpanel"
              aria-labelledby={catalogTabId}
              className="space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Supplied Inventory Catalog ({linkedProducts.length} item
                    {linkedProducts.length === 1 ? '' : 's'})
                  </h4>
                  <p className="text-xs text-slate-600">
                    Inventory items sourced from {supplier.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenLinkModal(supplier)}
                  className="min-h-[38px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-indigo-600"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Link / Unlink Products</span>
                </button>
              </div>

              {linkedProducts.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-300 rounded-xl space-y-2 px-4">
                  <Package className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
                  <p className="text-xs font-bold text-slate-800">No products linked yet</p>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    Link catalog items to track inventory replenishment, order lead times, and cost
                    margins for this vendor.
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenLinkModal(supplier)}
                    className="min-h-[38px] mt-1 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200 text-xs font-semibold px-3.5 py-1.5 rounded-lg transition cursor-pointer focus-visible:outline-2 focus-visible:outline-indigo-600"
                  >
                    Select Products to Link
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {linkedProducts.map((p) => {
                    const currentStock = p.stockByLocation[currentLocation.id] ?? 0;
                    const isLow = currentStock <= p.reorderPoint;
                    const margin =
                      p.sellingPrice > 0
                        ? (((p.sellingPrice - p.buyingPrice) / p.sellingPrice) * 100).toFixed(1)
                        : '0.0';

                    return (
                      <div
                        key={p.id}
                        className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {p.name}
                            </span>
                            {isLow && (
                              <span className="inline-flex items-center gap-1 text-amber-800 text-xs font-semibold">
                                <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
                                <span>Low ({currentStock} left)</span>
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600 font-mono tabular-nums mt-0.5">
                            <span>SKU: {p.sku}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Cost: {currency} {p.buyingPrice.toFixed(2)}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Price: {currency} {p.sellingPrice.toFixed(2)}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-700 font-semibold">{margin}% margin</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <div className="text-xs font-bold font-mono tabular-nums text-slate-900">
                              {currentStock} {p.unit}
                            </div>
                            <div className="text-xs text-slate-600 font-mono tabular-nums">
                              Reorder ≤ {p.reorderPoint}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => linkProductToSupplier(p.id, null)}
                            aria-label={`Unlink ${p.name} from ${supplier.name}`}
                            title="Unlink product"
                            className="min-w-[38px] min-h-[38px] flex items-center justify-center text-slate-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition cursor-pointer focus-visible:outline-2 focus-visible:outline-red-600"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Delete Safeguard Zone */}
          <div className="pt-4 border-t border-slate-200">
            {isConfirmingDelete ? (
              <div
                role="alert"
                className="bg-red-50 border border-red-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="text-xs text-red-900 font-semibold">
                  Delete supplier &ldquo;{supplier.name}&rdquo;? Linked products will remain in your
                  catalog.
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setIsConfirmingDelete(false)}
                    className="min-h-[38px] text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDelete}
                    className="min-h-[38px] text-xs px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-red-700"
                  >
                    {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                    <span>Confirm Delete</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="min-h-[38px] text-xs font-semibold text-red-700 hover:text-red-800 hover:underline inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-red-600 rounded px-1"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Delete Supplier Record</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div>
            {onOpenInvoiceModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInvoiceModal();
                }}
                className="min-h-[38px] text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 rounded px-1"
              >
                <span>AI Invoice Receiving</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-lg transition cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
