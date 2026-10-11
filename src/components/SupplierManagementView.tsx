import React, { useState, useMemo } from 'react';
import {
  Building2,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Clock,
  Package,
  Link as LinkIcon,
  CreditCard,
  Edit2,
  Trash2,
  Eye,
  Sparkles,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { Supplier, Product } from '../types';
import { usePos } from '../context/PosContext';
import { SupplierFormModal } from './SupplierFormModal';
import { LinkSupplierModal } from './LinkSupplierModal';
import { SupplierDetailModal } from './SupplierDetailModal';
import { SupplierInvoiceModal } from './SupplierInvoiceModal';

export const SupplierManagementView: React.FC = () => {
  const {
    suppliers,
    products,
    currentLocation,
    currentBusiness,
    showToast,
  } = usePos();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTermFilter, setSelectedTermFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [supplierForLink, setSupplierForLink] = useState<Supplier | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [supplierForDetail, setSupplierForDetail] = useState<Supplier | null>(null);

  const [isAiInvoiceModalOpen, setIsAiInvoiceModalOpen] = useState(false);

  const currency = currentBusiness?.currency || currentLocation?.currency || 'KES';
  const supplierList = suppliers || [];

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    return supplierList.filter((s) => {
      const matchSearch =
        !searchQuery.trim() ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())) ||
        s.phone.includes(searchQuery) ||
        (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.kraPin && s.kraPin.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchTerms = selectedTermFilter === 'all' || s.paymentTerms === selectedTermFilter;
      const matchStatus = selectedStatusFilter === 'all' || s.status === selectedStatusFilter;

      return matchSearch && matchTerms && matchStatus;
    });
  }, [supplierList, searchQuery, selectedTermFilter, selectedStatusFilter]);

  // Overall analytics / overview metrics
  const stats = useMemo(() => {
    let totalPurchases = 0;
    let activeVendors = 0;
    let totalShipments = 0;

    supplierList.forEach((s) => {
      totalPurchases += s.totalInvoiced || 0;
      if (s.status === 'active') activeVendors += 1;
      totalShipments += s.ordersCount || 0;
    });

    const linkedProductsCount = products.filter((p) => Boolean(p.supplierId)).length;

    return {
      totalSuppliers: supplierList.length,
      activeVendors,
      totalPurchases,
      totalShipments,
      linkedProductsCount,
    };
  }, [supplierList, products]);

  const handleOpenAddModal = () => {
    setSupplierToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (supp: Supplier) => {
    setSupplierToEdit(supp);
    setIsFormModalOpen(true);
  };

  const handleOpenLinkModal = (supp: Supplier) => {
    setSupplierForLink(supp);
    setIsLinkModalOpen(true);
  };

  const handleOpenDetailModal = (supp: Supplier) => {
    setSupplierForDetail(supp);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden">
      {/* Top Banner / Actions Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-black text-slate-800">Supplier & Vendor Directory</h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {supplierList.length} Suppliers
            </span>
            <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {stats.linkedProductsCount} Linked Catalog Items
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Procurement accounts, payment terms, and supply chain inventory oversight
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* AI Invoice Digitization Trigger */}
          <button
            id="btn-supplier-ai-invoice"
            onClick={() => setIsAiInvoiceModalOpen(true)}
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Digitize supplier delivery notes with Gemini AI Vision"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>AI Invoice Onboarding</span>
          </button>

          {/* Add Supplier Button */}
          <button
            id="btn-add-supplier"
            onClick={handleOpenAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Container */}
      <div className="p-3 sm:p-6 flex-1 flex flex-col gap-3 sm:gap-4 overflow-hidden">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 shrink-0">
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Active Suppliers
              </div>
              <div className="text-lg sm:text-2xl font-black text-slate-800 mt-0.5">
                {stats.activeVendors} <span className="text-xs text-slate-400 font-bold">/ {stats.totalSuppliers}</span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium">Contracted distributors</div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Linked Inventory
              </div>
              <div className="text-lg sm:text-2xl font-black text-indigo-600 mt-0.5">
                {stats.linkedProductsCount} <span className="text-xs text-slate-400 font-bold">/ {products.length}</span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium">Supply chain tracked</div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <LinkIcon className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Total Procurement
              </div>
              <div className="text-base sm:text-xl font-black text-emerald-600 mt-0.5 truncate">
                {currency} {stats.totalPurchases.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">Recorded intake value</div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Shipments Handled
              </div>
              <div className="text-lg sm:text-2xl font-black text-purple-600 mt-0.5">
                {stats.totalShipments}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">Recorded replenishments</div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-2.5 sm:gap-3 shrink-0 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-2.5 flex-1">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search vendor, rep, phone, KRA..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg text-xs pl-8 pr-3 py-2 sm:py-1.5 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
            </div>

            {/* Terms Filter */}
            <select
              value={selectedTermFilter}
              onChange={(e) => setSelectedTermFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg text-xs px-3 py-2 sm:py-1.5 text-slate-700 font-medium"
            >
              <option value="all">All Payment Terms</option>
              <option value="cod">Cash on Delivery (COD)</option>
              <option value="net_7">Net 7 Days</option>
              <option value="net_14">Net 14 Days</option>
              <option value="net_30">Net 30 Days</option>
              <option value="consignment">Consignment Stock</option>
              <option value="prepaid">Prepaid / Advance</option>
            </select>

            {/* Status Filter */}
            <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-[11px] font-bold">
              <button
                onClick={() => setSelectedStatusFilter('all')}
                className={`px-2.5 py-1 rounded transition ${
                  selectedStatusFilter === 'all' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedStatusFilter('active')}
                className={`px-2.5 py-1 rounded transition ${
                  selectedStatusFilter === 'active' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setSelectedStatusFilter('inactive')}
                className={`px-2.5 py-1 rounded transition ${
                  selectedStatusFilter === 'inactive' ? 'bg-white text-slate-700 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>
        </div>

        {/* Suppliers List & Table */}
        <div className="bg-white rounded-xl border border-slate-200 flex-1 overflow-hidden flex-col flex shadow-2xs">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="p-3 pl-5">Supplier Name & Contact</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Phone & Email</th>
                  <th className="p-3">Payment Terms</th>
                  <th className="p-3">Linked Items</th>
                  <th className="p-3">Lead Time</th>
                  <th className="p-3">Total Invoiced</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right pr-5">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100 text-slate-700">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-slate-400">
                      <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-600">No suppliers found matching criteria.</p>
                      <button
                        onClick={handleOpenAddModal}
                        className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                      >
                        + Register a New Supplier
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supp) => {
                    const linkedProds = products.filter((p) => p.supplierId === supp.id);
                    return (
                      <tr key={supp.id} className="hover:bg-slate-50/80 transition group">
                        {/* Company Name & Rep */}
                        <td className="p-3 pl-5">
                          <button
                            onClick={() => handleOpenDetailModal(supp)}
                            className="font-bold text-slate-900 group-hover:text-blue-600 transition text-left cursor-pointer hover:underline"
                          >
                            {supp.name}
                          </button>
                          {supp.contactPerson && (
                            <div className="text-[11px] text-slate-500 font-medium">
                              Rep: {supp.contactPerson}
                            </div>
                          )}
                        </td>

                        {/* Category */}
                        <td className="p-3 font-medium text-slate-600">
                          {supp.category || 'General'}
                        </td>

                        {/* Phone & Email */}
                        <td className="p-3">
                          <div className="font-mono text-slate-800 font-bold">{supp.phone}</div>
                          {supp.email && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                              {supp.email}
                            </div>
                          )}
                        </td>

                        {/* Payment Terms */}
                        <td className="p-3">
                          <span className="font-bold text-[10px] uppercase bg-blue-50 text-blue-700 border border-blue-200/60 px-2 py-0.5 rounded-full">
                            {supp.paymentTerms.replace('_', ' ')}
                          </span>
                        </td>

                        {/* Linked Items Count */}
                        <td className="p-3">
                          <button
                            onClick={() => handleOpenLinkModal(supp)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition cursor-pointer"
                            title="Manage linked inventory products"
                          >
                            <LinkIcon className="w-3 h-3 text-indigo-600" />
                            <span>{linkedProds.length} items</span>
                          </button>
                        </td>

                        {/* Lead Time */}
                        <td className="p-3 font-mono font-medium text-slate-600">
                          {supp.leadTimeDays || 2} days
                        </td>

                        {/* Total Invoiced */}
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {currency} {(supp.totalInvoiced || 0).toLocaleString()}
                        </td>

                        {/* Status */}
                        <td className="p-3">
                          <span
                            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              supp.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {supp.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-right pr-5 space-x-2 shrink-0">
                          <button
                            onClick={() => handleOpenDetailModal(supp)}
                            className="text-slate-500 hover:text-blue-600 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                            title="View details & supply chain tracking"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden lg:inline">View</span>
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(supp)}
                            className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                            title="Edit supplier profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span className="hidden lg:inline">Edit</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SupplierFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        supplierToEdit={supplierToEdit}
      />

      <LinkSupplierModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        supplier={supplierForLink}
      />

      <SupplierDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        supplier={supplierForDetail}
        onEditSupplier={(s) => {
          setIsDetailModalOpen(false);
          handleOpenEditModal(s);
        }}
        onOpenLinkModal={(s) => {
          setIsDetailModalOpen(false);
          handleOpenLinkModal(s);
        }}
        onOpenInvoiceModal={() => setIsAiInvoiceModalOpen(true)}
      />

      <SupplierInvoiceModal
        isOpen={isAiInvoiceModalOpen}
        onClose={() => setIsAiInvoiceModalOpen(false)}
      />
    </div>
  );
};
