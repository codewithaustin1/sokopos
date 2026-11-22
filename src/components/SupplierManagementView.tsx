import React, { useState, useMemo, useEffect, useCallback, useDeferredValue, useRef } from 'react';
import {
  Building2,
  Plus,
  Sparkles,
  RefreshCw,
  Upload,
  Loader2,
} from 'lucide-react';
import { Supplier } from '../types';
import { usePos } from '../context/PosContext';
import { SupplierFormModal } from './SupplierFormModal';
import { LinkSupplierModal } from './LinkSupplierModal';
import { SupplierDetailModal } from './SupplierDetailModal';
import { SupplierInvoiceModal } from './SupplierInvoiceModal';
import { SupplierCsvImportModal } from './SupplierCsvImportModal';
import { SupplierKpiStrip, SupplierStats } from './suppliers/SupplierKpiStrip';
import { SupplierToolbar, SupplierStatusFilter } from './suppliers/SupplierToolbar';
import { SupplierDirectoryTable } from './suppliers/SupplierDirectoryTable';
import { SupplierMobileCardList } from './suppliers/SupplierMobileCardList';
import { SupplierPaginationBar } from './suppliers/SupplierPaginationBar';
import { SortDirection, SupplierSortKey } from './suppliers/supplierConstants';

export const SupplierManagementView: React.FC = () => {
  const {
    suppliers,
    products,
    currentLocation,
    currentBusiness,
    refreshTenantSuppliers,
    isSuppliersLoading,
  } = usePos();

  useEffect(() => {
    refreshTenantSuppliers(false).catch(() => {});
  }, [refreshTenantSuppliers]);

  // Filter, sort & pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [selectedTermFilter, setSelectedTermFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<SupplierStatusFilter>('all');
  const [sortKey, setSortKey] = useState<SupplierSortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [supplierForLink, setSupplierForLink] = useState<Supplier | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [supplierForDetail, setSupplierForDetail] = useState<Supplier | null>(null);

  const [isAiInvoiceModalOpen, setIsAiInvoiceModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Focus restoration tracker for WCAG 2.1 AA modal return focus
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  const captureTriggerFocus = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      lastFocusedElementRef.current = document.activeElement;
    }
  }, []);

  const restoreTriggerFocus = useCallback(() => {
    requestAnimationFrame(() => {
      if (lastFocusedElementRef.current && document.body.contains(lastFocusedElementRef.current)) {
        lastFocusedElementRef.current.focus();
      }
      lastFocusedElementRef.current = null;
    });
  }, []);

  const currency = currentBusiness?.currency || currentLocation?.currency || 'KES';
  const supplierList = suppliers || [];

  // Single-pass map of linked products per supplier
  const linkedProductCountBySupplier = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((p) => {
      if (p.supplierId) {
        counts.set(p.supplierId, (counts.get(p.supplierId) || 0) + 1);
      }
    });
    return counts;
  }, [products]);

  // Aggregate KPI metrics
  const stats = useMemo<SupplierStats>(() => {
    let totalPurchases = 0;
    let activeVendors = 0;
    let totalShipments = 0;

    supplierList.forEach((s) => {
      totalPurchases += s.totalInvoiced || 0;
      if (s.status === 'active') activeVendors += 1;
      totalShipments += s.ordersCount || 0;
    });

    let linkedProductsCount = 0;
    linkedProductCountBySupplier.forEach((c) => {
      linkedProductsCount += c;
    });

    return {
      totalSuppliers: supplierList.length,
      activeVendors,
      totalPurchases,
      totalShipments,
      linkedProductsCount,
      totalCatalogCount: products.length,
    };
  }, [supplierList, linkedProductCountBySupplier, products.length]);

  // Filtered & sorted suppliers
  const sortedSuppliers = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();

    const filtered = supplierList.filter((s) => {
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
        s.phone.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q)) ||
        (s.kraPin && s.kraPin.toLowerCase().includes(q));

      const matchTerms = selectedTermFilter === 'all' || s.paymentTerms === selectedTermFilter;
      const matchStatus = selectedStatusFilter === 'all' || s.status === selectedStatusFilter;

      return matchSearch && matchTerms && matchStatus;
    });

    const factor = sortDirection === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name) * factor;
        case 'category':
          return (a.category || 'General').localeCompare(b.category || 'General') * factor;
        case 'paymentTerms':
          return a.paymentTerms.localeCompare(b.paymentTerms) * factor;
        case 'linkedCount': {
          const countA = linkedProductCountBySupplier.get(a.id) || 0;
          const countB = linkedProductCountBySupplier.get(b.id) || 0;
          return (countA - countB) * factor;
        }
        case 'leadTimeDays':
          return ((a.leadTimeDays ?? 2) - (b.leadTimeDays ?? 2)) * factor;
        case 'totalInvoiced':
          return ((a.totalInvoiced || 0) - (b.totalInvoiced || 0)) * factor;
        case 'status':
          return a.status.localeCompare(b.status) * factor;
        default:
          return 0;
      }
    });
  }, [
    supplierList,
    deferredSearch,
    selectedTermFilter,
    selectedStatusFilter,
    sortKey,
    sortDirection,
    linkedProductCountBySupplier,
  ]);

  const totalPages = Math.max(1, Math.ceil(sortedSuppliers.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedSuppliers = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return sortedSuppliers.slice(startIdx, startIdx + pageSize);
  }, [sortedSuppliers, safeCurrentPage, pageSize]);

  // Handlers
  const handleSearchChange = useCallback((val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  }, []);

  const handleTermFilterChange = useCallback((val: string) => {
    setSelectedTermFilter(val);
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((val: SupplierStatusFilter) => {
    setSelectedStatusFilter(val);
    setCurrentPage(1);
  }, []);

  const handleSortChange = useCallback(
    (key: SupplierSortKey) => {
      if (sortKey === key) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDirection('asc');
      }
      setCurrentPage(1);
    },
    [sortKey]
  );

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const hasActiveFilters = Boolean(
    searchQuery.trim() || selectedTermFilter !== 'all' || selectedStatusFilter !== 'all'
  );

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedTermFilter('all');
    setSelectedStatusFilter('all');
    setCurrentPage(1);
  }, []);

  const handleOpenAddModal = useCallback(() => {
    captureTriggerFocus();
    setSupplierToEdit(null);
    setIsFormModalOpen(true);
  }, [captureTriggerFocus]);

  const handleOpenEditModal = useCallback(
    (supp: Supplier) => {
      captureTriggerFocus();
      setSupplierToEdit(supp);
      setIsFormModalOpen(true);
    },
    [captureTriggerFocus]
  );

  const handleOpenLinkModal = useCallback(
    (supp: Supplier) => {
      captureTriggerFocus();
      setSupplierForLink(supp);
      setIsLinkModalOpen(true);
    },
    [captureTriggerFocus]
  );

  const handleOpenDetailModal = useCallback(
    (supp: Supplier) => {
      captureTriggerFocus();
      setSupplierForDetail(supp);
      setIsDetailModalOpen(true);
    },
    [captureTriggerFocus]
  );

  const handleOpenCsvModal = useCallback(() => {
    captureTriggerFocus();
    setIsCsvModalOpen(true);
  }, [captureTriggerFocus]);

  const handleOpenAiInvoiceModal = useCallback(() => {
    captureTriggerFocus();
    setIsAiInvoiceModalOpen(true);
  }, [captureTriggerFocus]);

  return (
    <div
      id="pos-suppliers-view"
      className="flex-1 h-full overflow-y-auto flex flex-col bg-slate-100"
    >
      {/* Sticky Top Banner / Actions Bar */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3.5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5 shrink-0">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
            Supplier &amp; Vendor Directory
          </h2>
          <p className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
            <span className="font-semibold text-slate-800 font-mono tabular-nums">
              {supplierList.length}
            </span>
            <span>Suppliers</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-slate-800 font-mono tabular-nums">
              {stats.linkedProductsCount}
            </span>
            <span>Linked catalog items</span>
            <span aria-hidden="true" className="hidden sm:inline">
              ·
            </span>
            <span className="hidden sm:inline">Procurement &amp; payment terms oversight</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => refreshTenantSuppliers(true)}
            disabled={isSuppliersLoading}
            aria-label="Refresh suppliers from cloud"
            className="min-w-[40px] min-h-[40px] px-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg border border-slate-300 transition cursor-pointer disabled:opacity-50 inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-blue-600"
            title="Refresh suppliers from cloud"
          >
            <RefreshCw
              className={`w-4 h-4 ${isSuppliersLoading ? 'animate-spin text-blue-700' : ''}`}
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            id="btn-supplier-ai-invoice"
            onClick={handleOpenAiInvoiceModal}
            className="min-h-[40px] bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold text-xs px-3.5 py-2 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            title="Digitize supplier delivery notes with AI invoice scan"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
            <span>AI Invoice Onboarding</span>
          </button>

          <button
            type="button"
            id="btn-supplier-import-csv"
            onClick={handleOpenCsvModal}
            className="min-h-[40px] bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold text-xs px-3.5 py-2 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600"
            title="Bulk import suppliers from a CSV spreadsheet with data validation"
          >
            <Upload className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
            <span>Import CSV</span>
          </button>

          <button
            type="button"
            id="btn-add-supplier"
            onClick={handleOpenAddModal}
            className="min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Add Supplier</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className="p-3 sm:p-6 pb-20 lg:pb-8 flex-1 flex flex-col gap-3 sm:gap-4">
        <SupplierKpiStrip stats={stats} currency={currency} />

        <SupplierToolbar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          selectedTermFilter={selectedTermFilter}
          onTermFilterChange={handleTermFilterChange}
          selectedStatusFilter={selectedStatusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          totalMatchingCount={sortedSuppliers.length}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={handleResetFilters}
        />

        {/* Directory Container: Responsive Table (Desktop) & Stacked Cards (Mobile) */}
        <section
          aria-label="Supplier directory list"
          className="bg-white rounded-xl border border-slate-200 flex-1 flex flex-col min-h-[380px] overflow-hidden"
        >
          {isSuppliersLoading && supplierList.length === 0 ? (
            <div
              role="status"
              aria-live="polite"
              className="flex-1 flex flex-col items-center justify-center p-10 text-center text-slate-600 gap-2.5"
            >
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" aria-hidden="true" />
              <p className="text-sm font-semibold text-slate-800">Loading supplier directory...</p>
            </div>
          ) : sortedSuppliers.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-10 text-center">
              <Building2 className="w-8 h-8 text-slate-400 mb-2.5" aria-hidden="true" />
              <h3 className="text-sm font-bold text-slate-900">
                {supplierList.length === 0
                  ? 'No suppliers registered yet'
                  : 'No suppliers match your current filters'}
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mt-1">
                {supplierList.length === 0
                  ? 'Add a distributor manually or import a vendor list via CSV to track purchase terms and linked stock.'
                  : 'Adjust your search query, payment terms, or status filter to see matching vendors.'}
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                {supplierList.length > 0 && hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="min-h-[40px] px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    Reset Filters
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleOpenAddModal}
                      className="min-h-[40px] px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
                    >
                      Register First Supplier
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenCsvModal}
                      className="min-h-[40px] px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
                    >
                      Import CSV
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <>
              <SupplierDirectoryTable
                suppliers={paginatedSuppliers}
                linkedCountMap={linkedProductCountBySupplier}
                currency={currency}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSortChange={handleSortChange}
                onView={handleOpenDetailModal}
                onEdit={handleOpenEditModal}
                onLink={handleOpenLinkModal}
              />

              <SupplierMobileCardList
                suppliers={paginatedSuppliers}
                linkedCountMap={linkedProductCountBySupplier}
                currency={currency}
                onView={handleOpenDetailModal}
                onEdit={handleOpenEditModal}
                onLink={handleOpenLinkModal}
              />

              <SupplierPaginationBar
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                totalItems={sortedSuppliers.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={handlePageSizeChange}
              />
            </>
          )}
        </section>
      </main>

      {/* Workflow Modals */}
      <SupplierFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          restoreTriggerFocus();
        }}
        supplierToEdit={supplierToEdit}
      />

      <LinkSupplierModal
        isOpen={isLinkModalOpen}
        onClose={() => {
          setIsLinkModalOpen(false);
          restoreTriggerFocus();
        }}
        supplier={supplierForLink}
      />

      <SupplierDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          restoreTriggerFocus();
        }}
        supplier={supplierForDetail}
        onEditSupplier={(s) => {
          setIsDetailModalOpen(false);
          handleOpenEditModal(s);
        }}
        onOpenLinkModal={(s) => {
          setIsDetailModalOpen(false);
          handleOpenLinkModal(s);
        }}
        onOpenInvoiceModal={() => handleOpenAiInvoiceModal()}
      />

      <SupplierInvoiceModal
        isOpen={isAiInvoiceModalOpen}
        onClose={() => {
          setIsAiInvoiceModalOpen(false);
          restoreTriggerFocus();
        }}
      />

      <SupplierCsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => {
          setIsCsvModalOpen(false);
          restoreTriggerFocus();
        }}
      />
    </div>
  );
};
