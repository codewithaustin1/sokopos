import React, { useState } from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  FileText,
  CreditCard,
  Edit2,
  Trash2,
  Package,
  Plus,
  Link as LinkIcon,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Supplier, Product } from '../types';
import { usePos } from '../context/PosContext';

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
  const { products, deleteSupplier, currentLocation, currentBusiness, linkProductToSupplier } = usePos();
  const [activeTab, setActiveTab] = useState<'overview' | 'catalog'>('overview');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  if (!isOpen || !supplier) return null;

  const linkedProducts = products.filter((p) => p.supplierId === supplier.id);
  const currency = currentBusiness?.currency || currentLocation?.currency || 'KES';

  // Compute total stock of supplied products at current branch
  const totalBranchStock = linkedProducts.reduce((sum, p) => {
    return sum + (p.stockByLocation[currentLocation.id] ?? 0);
  }, 0);

  const lowStockCount = linkedProducts.filter((p) => {
    const stock = p.stockByLocation[currentLocation.id] ?? 0;
    return stock <= p.reorderPoint;
  }).length;

  const handleDelete = async () => {
    await deleteSupplier(supplier.id);
    onClose();
  };

  return (
    <div id="supplier-detail-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">{supplier.name}</h3>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    supplier.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {supplier.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {supplier.category || 'General Supplies'} • Terms: {supplier.paymentTerms.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onEditSupplier(supplier)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Edit Profile"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Overview & Account Details
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'catalog'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Linked Catalog Items</span>
            <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-black">
              {linkedProducts.length}
            </span>
          </button>
        </div>

        {/* Tab Viewport */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Aggregates Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3">
                  <div className="text-[10px] font-black uppercase text-blue-600">Supplied Products</div>
                  <div className="text-xl font-black text-blue-900 mt-0.5">{linkedProducts.length}</div>
                  <div className="text-[10px] text-blue-700/80">In store catalog</div>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3">
                  <div className="text-[10px] font-black uppercase text-emerald-600">Units in Stock</div>
                  <div className="text-xl font-black text-emerald-900 mt-0.5">{totalBranchStock}</div>
                  <div className="text-[10px] text-emerald-700/80">At {currentLocation.name.split(' ')[0]}</div>
                </div>

                <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3">
                  <div className="text-[10px] font-black uppercase text-amber-600">Lead Time</div>
                  <div className="text-xl font-black text-amber-900 mt-0.5">
                    {supplier.leadTimeDays || 2} <span className="text-xs font-bold">days</span>
                  </div>
                  <div className="text-[10px] text-amber-700/80">Delivery window</div>
                </div>

                <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-3">
                  <div className="text-[10px] font-black uppercase text-purple-600">Total Purchases</div>
                  <div className="text-base font-black text-purple-900 mt-0.5 truncate">
                    {currency} {(supplier.totalInvoiced || 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-purple-700/80">{supplier.ordersCount || 0} shipments</div>
                </div>
              </div>

              {/* Low stock alert callout if any */}
              {lowStockCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-bold text-amber-900">
                      {lowStockCount} linked product{lowStockCount > 1 ? 's are' : ' is'} below reorder threshold.
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab('catalog')}
                    className="font-bold text-amber-800 hover:underline shrink-0"
                  >
                    View Items →
                  </button>
                </div>
              )}

              {/* Contact & Banking Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Contact Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Contact & Logistics
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    {supplier.contactPerson && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px] font-medium w-24">Sales Rep:</span>
                        <span className="font-bold text-slate-900">{supplier.contactPerson}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px] font-medium w-24">Phone:</span>
                      <a href={`tel:${supplier.phone}`} className="font-mono font-bold text-blue-600 hover:underline">
                        {supplier.phone}
                      </a>
                    </div>
                    {supplier.email && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px] font-medium w-24">Email:</span>
                        <a href={`mailto:${supplier.email}`} className="text-slate-800 hover:underline truncate">
                          {supplier.email}
                        </a>
                      </div>
                    )}
                    {supplier.address && (
                      <div className="flex items-start gap-2">
                        <span className="text-slate-400 text-[11px] font-medium w-24 shrink-0">Depot Address:</span>
                        <span className="text-slate-800">{supplier.address}, {supplier.city}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Remittance Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Settlement & Tax Compliance
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px] font-medium w-24">Payment Terms:</span>
                      <span className="font-black text-blue-700 uppercase bg-blue-100/60 px-2 py-0.5 rounded-full text-[10px]">
                        {supplier.paymentTerms.replace('_', ' ')}
                      </span>
                    </div>
                    {supplier.kraPin && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px] font-medium w-24">KRA PIN:</span>
                        <span className="font-mono font-bold text-slate-900">{supplier.kraPin}</span>
                      </div>
                    )}
                    {supplier.mpesaPaybillOrTill && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px] font-medium w-24">M-Pesa Till:</span>
                        <span className="font-mono font-bold text-emerald-700">{supplier.mpesaPaybillOrTill}</span>
                      </div>
                    )}
                    {supplier.bankName && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px] font-medium w-24">Bank Account:</span>
                        <span className="font-mono text-slate-800">{supplier.bankName} {supplier.bankAccount}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {supplier.notes && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Route Schedules & Operational Notes
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{supplier.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'catalog' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    Supplied Inventory Catalog ({linkedProducts.length} items)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Inventory items sourced from {supplier.name}
                  </p>
                </div>
                <button
                  onClick={() => onOpenLinkModal(supplier)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Link / Unlink Products</span>
                </button>
              </div>

              {linkedProducts.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
                  <Package className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">No products linked yet</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Link specific items to this supplier to track inventory replenishment, order lead times, and unit cost margins.
                  </p>
                  <button
                    onClick={() => onOpenLinkModal(supplier)}
                    className="mt-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-xs font-bold px-3 py-1.5 rounded-xl transition"
                  >
                    Select Products to Link
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {linkedProducts.map((p) => {
                    const currentStock = p.stockByLocation[currentLocation.id] ?? 0;
                    const isLow = currentStock <= p.reorderPoint;
                    const margin =
                      p.sellingPrice > 0
                        ? (((p.sellingPrice - p.buyingPrice) / p.sellingPrice) * 100).toFixed(1)
                        : '0';

                    return (
                      <div key={p.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 truncate">{p.name}</span>
                            {isLow && (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                                Low ({currentStock} left)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                            <span>SKU: {p.sku}</span>
                            <span>•</span>
                            <span>Cost: {currency} {p.buyingPrice.toFixed(2)}</span>
                            <span>•</span>
                            <span>Price: {currency} {p.sellingPrice.toFixed(2)}</span>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold">{margin}% Margin</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <div className="text-xs font-bold font-mono text-slate-800">
                              {currentStock} {p.unit}s
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Reorder at {p.reorderPoint}
                            </div>
                          </div>

                          <button
                            onClick={() => linkProductToSupplier(p.id, null)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition cursor-pointer"
                            title="Unlink this product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Delete safeguard zone */}
          <div className="pt-4 border-t border-slate-200">
            {isConfirmingDelete ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="text-xs text-red-900 font-bold">
                  Delete supplier "{supplier.name}"? Products will be unlinked.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsConfirmingDelete(false)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="text-xs px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition shadow-2xs"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsConfirmingDelete(true)}
                className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Supplier Record</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {onOpenInvoiceModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenInvoiceModal();
                }}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>AI Invoice Receiving</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
