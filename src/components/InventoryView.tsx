import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  ArrowRightLeft,
  Barcode,
  Edit2,
  AlertTriangle,
  Building2,
  Trash2,
  RefreshCw,
  Tag,
  Sparkles,
  Camera,
  Truck,
  Printer,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Wrench,
  ChevronDown,
  MoreHorizontal,
  Copy,
  Eye,
  Upload,
  Download,
  Minus,
  Check,
  X,
} from 'lucide-react';
import { Product } from '../types';
import { usePos } from '../context/PosContext';
import { ProductFormModal } from './ProductFormModal';
import { StockTransferModal } from './StockTransferModal';
import { CategoryManagerModal } from './CategoryManagerModal';
import { SupplierInvoiceModal } from './SupplierInvoiceModal';
import { PackageScannerModal } from './PackageScannerModal';
import { ProductLabelPrintModal } from './ProductLabelPrintModal';
import { ProductInspectorDrawer } from './inventory/ProductInspectorDrawer';
import { BulkInventoryActionModal, BulkActionMode } from './inventory/BulkInventoryActionModal';
import { InventoryCsvModal } from './inventory/InventoryCsvModal';
import { exportProductsToCsv } from '../utils/inventoryCsv';
import { ParsedProductPackage } from '../types/aiVision';

type SortField = 'name' | 'sku' | 'buyingPrice' | 'sellingPrice' | 'margin' | 'stock';
type SortDirection = 'asc' | 'desc';

export const InventoryView: React.FC = () => {
  const {
    products,
    categories,
    suppliers,
    locations,
    currentLocation,
    adjustStock,
    deleteProduct,
    bulkDeleteProducts,
    showToast,
    fetchFreshInventoryFromServer,
    isInventoryLoading,
    inventoryLastFetchedAt,
    can,
    refreshTenantSuppliers,
  } = usePos();

  const canManage = can('manageInventory');
  const canViewCost = can('viewCostPrice');
  const canTransfer = can('stockTransfers');
  const canManageSuppliers = can('manageSuppliers');

  useEffect(() => {
    refreshTenantSuppliers(false).catch(() => {});
  }, [refreshTenantSuppliers]);

  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [showMultiLocationColumns, setShowMultiLocationColumns] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Menus & Drawers
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [openRowMenuId, setOpenRowMenuId] = useState<string | null>(null);
  const [inspectedProductId, setInspectedProductId] = useState<string | null>(null);

  // Modals State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [clonedDraftProduct, setClonedDraftProduct] = useState<Partial<Product> | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetProduct, setTransferTargetProduct] = useState<Product | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPackageScannerOpen, setIsPackageScannerOpen] = useState(false);
  const [stagedAiProduct, setStagedAiProduct] = useState<ParsedProductPackage | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [bulkModalMode, setBulkModalMode] = useState<BulkActionMode | null>(null);

  // Inline Quick Adjust State
  const [quickAdjustProductId, setQuickAdjustProductId] = useState<string | null>(null);
  const [adjustValue, setAdjustValue] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('Cycle count');

  // Selection State
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [singlePrintProduct, setSinglePrintProduct] = useState<Product | null>(null);

  // Refs & Scroller
  const searchInputRef = useRef<HTMLInputElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const productsTableScrollRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [rowMenuPosition, setRowMenuPosition] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);

  // Global `/` shortcut to focus search & click-outside menu closing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setIsToolsMenuOpen(false);
        setOpenRowMenuId(null);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setIsToolsMenuOpen(false);
      }
      const targetEl = e.target as HTMLElement | null;
      if (targetEl && !targetEl.closest('[data-row-menu-root]')) {
        setOpenRowMenuId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const pageTop = e.currentTarget.scrollTop;
    const tableTop = productsTableScrollRef.current?.scrollTop ?? 0;
    setShowScrollTop(pageTop > 140 || tableTop > 140);
  };

  const handleProductsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const tableTop = e.currentTarget.scrollTop;
    const pageTop = scrollContainerRef.current?.scrollTop ?? 0;
    setShowScrollTop(tableTop > 140 || pageTop > 140);
    if (openRowMenuId) {
      setOpenRowMenuId(null);
    }
  };

  const scrollToTop = () => {
    productsTableScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const inspectedProduct = useMemo(
    () => (inspectedProductId ? products.find((p) => p.id === inspectedProductId) || null : null),
    [inspectedProductId, products]
  );

  // Low stock counts
  const lowStockItems = useMemo(() => {
    return (products || []).filter((p) => {
      const stock = p.stockByLocation[currentLocation.id] ?? 0;
      return stock <= p.reorderPoint;
    });
  }, [products, currentLocation]);

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = (products || []).filter((p) => {
      const matchCategory =
        selectedCategory === 'All Categories' || p.category === selectedCategory;

      const matchSupplier =
        selectedSupplierFilter === 'all'
          ? true
          : selectedSupplierFilter === 'unlinked'
          ? !p.supplierId
          : p.supplierId === selectedSupplierFilter;

      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.supplierName && p.supplierName.toLowerCase().includes(q)) ||
        p.barcode.toLowerCase().includes(q);

      const currentStock = p.stockByLocation[currentLocation.id] ?? 0;
      let matchStock = true;
      if (stockFilter === 'in_stock') matchStock = currentStock > p.reorderPoint;
      if (stockFilter === 'low_stock') matchStock = currentStock > 0 && currentStock <= p.reorderPoint;
      if (stockFilter === 'out_of_stock') matchStock = currentStock === 0;

      return matchCategory && matchSupplier && matchSearch && matchStock;
    });

    const dir = sortDirection === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortField === 'name') {
        return a.name.localeCompare(b.name) * dir;
      }
      if (sortField === 'sku') {
        return a.sku.localeCompare(b.sku) * dir;
      }
      if (sortField === 'buyingPrice') {
        return (a.buyingPrice - b.buyingPrice) * dir;
      }
      if (sortField === 'sellingPrice') {
        return (a.sellingPrice - b.sellingPrice) * dir;
      }
      if (sortField === 'margin') {
        const mA = a.sellingPrice > 0 ? (a.sellingPrice - a.buyingPrice) / a.sellingPrice : 0;
        const mB = b.sellingPrice > 0 ? (b.sellingPrice - b.buyingPrice) / b.sellingPrice : 0;
        return (mA - mB) * dir;
      }
      const sA = a.stockByLocation[currentLocation.id] ?? 0;
      const sB = b.stockByLocation[currentLocation.id] ?? 0;
      return (sA - sB) * dir;
    });
  }, [
    products,
    selectedCategory,
    selectedSupplierFilter,
    searchQuery,
    stockFilter,
    currentLocation,
    sortField,
    sortDirection,
  ]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-blue-600" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-600" />
    );
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedCategory !== 'All Categories' ||
    selectedSupplierFilter !== 'all' ||
    stockFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All Categories');
    setSelectedSupplierFilter('all');
    setStockFilter('all');
  };

  // Product Modals & Drawer Handlers
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setClonedDraftProduct(null);
    setStagedAiProduct(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setClonedDraftProduct(null);
    setStagedAiProduct(null);
    setIsProductModalOpen(true);
  };

  const handleCloneProduct = (p: Product) => {
    setEditingProduct(null);
    setStagedAiProduct(null);
    setClonedDraftProduct(p);
    setIsProductModalOpen(true);
  };

  const handleOpenTransferModal = (p: Product | null) => {
    setTransferTargetProduct(p);
    setIsTransferModalOpen(true);
  };

  const submitQuickAdjust = (p: Product) => {
    if (!canManage) return;
    const val = parseInt(adjustValue, 10);
    if (!isNaN(val) && val >= 0) {
      adjustStock(p.id, currentLocation.id, val, adjustReason || 'Manual register cycle count');
    }
    setQuickAdjustProductId(null);
  };

  const stepQuickAdjust = (delta: number) => {
    const curr = parseInt(adjustValue, 10);
    const next = Math.max(0, (isNaN(curr) ? 0 : curr) + delta);
    setAdjustValue(String(next));
  };

  // Selection Handlers
  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    const next = new Set(selectedProductIds);
    filteredProducts.forEach((p) => next.add(p.id));
    setSelectedProductIds(next);
  };

  const deselectAllFiltered = () => {
    const next = new Set(selectedProductIds);
    filteredProducts.forEach((p) => next.delete(p.id));
    setSelectedProductIds(next);
  };

  const selectLowStockOnly = () => {
    const next = new Set<string>();
    lowStockItems.forEach((p) => next.add(p.id));
    setSelectedProductIds(next);
    showToast(`Selected ${lowStockItems.length} low-stock items`, 'info');
  };

  const clearSelection = () => {
    setSelectedProductIds(new Set());
  };

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedProductIds.has(p.id)),
    [products, selectedProductIds]
  );

  const isAllFilteredSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedProductIds.has(p.id));

  const isSomeFilteredSelected =
    filteredProducts.some((p) => selectedProductIds.has(p.id)) && !isAllFilteredSelected;

  const handleOpenLabelModalForSelected = () => {
    if (selectedProductIds.size === 0) {
      if (filteredProducts.length > 0) {
        selectAllFiltered();
        setSinglePrintProduct(null);
        setIsLabelModalOpen(true);
        return;
      }
      showToast('No products available to print labels', 'error');
      return;
    }
    setSinglePrintProduct(null);
    setIsLabelModalOpen(true);
  };

  const handleOpenLabelModalForSingle = (p: Product) => {
    setSinglePrintProduct(p);
    setIsLabelModalOpen(true);
  };

  const activeLabelModalProducts = useMemo(() => {
    if (singlePrintProduct) return [singlePrintProduct];
    return selectedProducts;
  }, [singlePrintProduct, selectedProducts]);

  const handleExportCsv = () => {
    const listToExport =
      selectedProducts.length > 0 ? selectedProducts : filteredProducts;
    if (listToExport.length === 0) {
      showToast('No products to export', 'warning');
      return;
    }
    exportProductsToCsv(listToExport, locations, canViewCost);
    showToast(`Exported ${listToExport.length} products to CSV`, 'success');
  };

  const dynamicColSpan = 9 + (showMultiLocationColumns ? locations.length : 0);

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 flex flex-col bg-slate-100 overflow-y-auto md:overflow-hidden overflow-x-hidden min-h-0 relative inventory-vertical-scroller"
      id="inventory-scroll-container"
    >
      {/* Top Bar: Single-line Title + Unboxed Count Metadata · Icon Refresh · Tools Menu · 1 Primary CTA */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 whitespace-nowrap truncate">
            Inventory &amp; Stock Catalog
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 whitespace-nowrap truncate">
            <span className="font-medium text-slate-700 tabular-nums">
              {products.length} {products.length === 1 ? 'product' : 'products'}
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>
              {isInventoryLoading
                ? 'Refreshing from cloud...'
                : inventoryLastFetchedAt
                ? `Synced ${new Date(inventoryLastFetchedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : 'Cloud synchronized'}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-refresh-inventory-fresh"
            type="button"
            onClick={() => fetchFreshInventoryFromServer(undefined, true)}
            disabled={isInventoryLoading}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer disabled:opacity-50 shrink-0"
            title="Refresh inventory from cloud server"
            aria-label="Refresh inventory from cloud"
          >
            <RefreshCw className={`w-4 h-4 ${isInventoryLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* Grouped Tools Dropdown */}
          <div className="relative" ref={toolsMenuRef}>
            <button
              id="btn-inventory-tools-menu"
              type="button"
              onClick={() => setIsToolsMenuOpen((prev) => !prev)}
              aria-expanded={isToolsMenuOpen}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <Wrench className="w-3.5 h-3.5 text-slate-500" />
              <span>Tools</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isToolsMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 z-30">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400">
                  Catalog &amp; Labels
                </div>
                <button
                  id="btn-print-labels-modal"
                  type="button"
                  onClick={() => {
                    setIsToolsMenuOpen(false);
                    handleOpenLabelModalForSelected();
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="flex-1">Print Labels</span>
                  {selectedProductIds.size > 0 && (
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                      {selectedProductIds.size}
                    </span>
                  )}
                </button>
                <button
                  id="btn-inventory-categories"
                  type="button"
                  onClick={() => {
                    setIsToolsMenuOpen(false);
                    setIsCategoryModalOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                >
                  <Tag className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Manage Categories</span>
                </button>
                {canManage && (
                  <button
                    id="btn-import-csv-modal"
                    type="button"
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      setIsCsvModalOpen(true);
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span>Import CSV Catalog</span>
                  </button>
                )}
                <button
                  id="btn-export-csv"
                  type="button"
                  onClick={() => {
                    setIsToolsMenuOpen(false);
                    handleExportCsv();
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span>
                    {selectedProductIds.size > 0
                      ? `Export Selected (${selectedProductIds.size}) CSV`
                      : 'Export Catalog CSV'}
                  </span>
                </button>

                <div className="my-1.5 border-t border-slate-100" />
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400">
                  AI Capture &amp; Transfers
                </div>
                {(canManageSuppliers || canManage) && (
                  <button
                    id="btn-ai-invoice-onboarding"
                    type="button"
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      setIsInvoiceModalOpen(true);
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>AI Invoice Onboarding</span>
                  </button>
                )}
                {canManage && (
                  <button
                    id="btn-ai-package-scan"
                    type="button"
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      setIsPackageScannerOpen(true);
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>AI Package Scan</span>
                  </button>
                )}
                {canTransfer && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      handleOpenTransferModal(null);
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Branch Transfer</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {canManage && (
            <button
              id="btn-add-product"
              type="button"
              onClick={handleOpenAddModal}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-3 p-3 sm:p-5 pb-24 md:pb-5 min-h-0 md:overflow-hidden">
        {/* Low Stock Callout */}
        {lowStockItems.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="text-xs text-amber-900 truncate">
                <span className="font-semibold tabular-nums">
                  {lowStockItems.length} {lowStockItems.length === 1 ? 'item' : 'items'} at or below reorder level in {currentLocation.name}:
                </span>
                <span className="text-amber-800 ml-1.5 hidden md:inline">
                  {lowStockItems.map((i) => i.name).slice(0, 3).join(', ')}
                  {lowStockItems.length > 3 ? ` +${lowStockItems.length - 3} more` : ''}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStockFilter('low_stock')}
              className="text-xs font-semibold text-amber-800 hover:underline shrink-0 cursor-pointer whitespace-nowrap"
            >
              Show Low Stock
            </button>
          </div>
        )}

        {/* Selected Products Bulk Actions Bar */}
        {selectedProductIds.size > 0 && (
          <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl border border-slate-700 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2.5 text-xs">
              <span className="font-mono font-bold text-emerald-400 tabular-nums">
                {selectedProductIds.size} selected
              </span>
              <span className="text-slate-500">·</span>
              <button
                type="button"
                onClick={selectLowStockOnly}
                className="text-slate-300 hover:text-white underline cursor-pointer"
              >
                Select low stock ({lowStockItems.length})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleOpenLabelModalForSelected}
                className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Labels</span>
              </button>

              {canManage && (
                <>
                  <button
                    type="button"
                    onClick={() => setBulkModalMode('category')}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Tag className="w-3.5 h-3.5 text-blue-400" />
                    <span>Category</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkModalMode('supplier')}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Truck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Supplier</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkModalMode('price')}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap"
                  >
                    <span>Adjust Price</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      bulkDeleteProducts(Array.from(selectedProductIds), () => {
                        clearSelection();
                        if (inspectedProductId && selectedProductIds.has(inspectedProductId)) {
                          setInspectedProductId(null);
                        }
                      })
                    }
                    className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={clearSelection}
                className="text-slate-400 hover:text-white text-xs font-semibold px-2.5 py-1.5 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Filter & Sort Controls Bar */}
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 flex-1">
            {/* Search with `/` shortcut */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search item, SKU or barcode... (/)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchQuery('');
                    e.currentTarget.blur();
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs pl-8 pr-7 py-2 sm:py-1.5 focus:outline-none focus:bg-white focus:border-blue-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 sm:py-1.5 text-slate-700 font-medium"
            >
              <option value="All Categories">All Categories</option>
              {categories.filter((c) => c !== 'All Items').map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Supplier Filter Dropdown */}
            <select
              value={selectedSupplierFilter}
              onChange={(e) => setSelectedSupplierFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg text-xs px-3 py-2 sm:py-1.5 text-slate-700 font-medium"
            >
              <option value="all">All Suppliers</option>
              <option value="unlinked">Unlinked (No Supplier)</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Stock Level Filter */}
            <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs font-medium overflow-x-auto">
              {(
                [
                  { id: 'all', label: 'All', activeClass: 'bg-white text-slate-900 shadow-2xs' },
                  { id: 'in_stock', label: 'In Stock', activeClass: 'bg-white text-emerald-700 shadow-2xs' },
                  { id: 'low_stock', label: 'Low Stock', activeClass: 'bg-white text-amber-700 shadow-2xs' },
                  { id: 'out_of_stock', label: 'Out', activeClass: 'bg-white text-rose-700 shadow-2xs' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStockFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-md transition flex-1 sm:flex-none text-center whitespace-nowrap cursor-pointer ${
                    stockFilter === tab.id ? tab.activeClass : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 cursor-pointer whitespace-nowrap"
              >
                Reset
              </button>
            )}
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-2 shrink-0">
            <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
              Showing {filteredProducts.length} of {products.length}
            </span>
            {locations.length > 1 && (
              <button
                type="button"
                onClick={() => setShowMultiLocationColumns((prev) => !prev)}
                className={`hidden md:flex px-3 py-1.5 rounded-lg border text-xs font-semibold transition items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  showMultiLocationColumns
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Branch Matrix ({locations.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile View: Responsive Product Cards (< md) */}
        <div className="md:hidden space-y-2.5">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 space-y-2">
              <p className="text-sm font-semibold text-slate-700">
                {products.length === 0 ? 'Your catalog is empty' : 'No matching products'}
              </p>
              <p className="text-xs text-slate-500">
                {products.length === 0
                  ? 'Add your first product or import an existing spreadsheet via Tools.'
                  : 'Try clearing search or filter criteria.'}
              </p>
              {products.length === 0 && canManage ? (
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="mt-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                >
                  Add First Product
                </button>
              ) : (
                hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )
              )}
            </div>
          ) : (
            filteredProducts.map((p) => {
              const currentStock = p.stockByLocation[currentLocation.id] ?? 0;
              const isOutOfStock = currentStock === 0;
              const isLowStock = currentStock > 0 && currentStock <= p.reorderPoint;
              const margin =
                p.sellingPrice > 0
                  ? (((p.sellingPrice - p.buyingPrice) / p.sellingPrice) * 100).toFixed(1)
                  : '0.0';

              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-xl border p-3.5 flex flex-col gap-2.5 transition ${
                    selectedProductIds.has(p.id)
                      ? 'border-blue-500 bg-blue-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.has(p.id)}
                        onChange={() => toggleSelectProduct(p.id)}
                        className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4 shrink-0 cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => setInspectedProductId(p.id)}
                        className="min-w-0 text-left cursor-pointer"
                      >
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">
                          {p.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-mono tabular-nums">{p.sku}</span>
                          <span>·</span>
                          <span>{p.category}</span>
                          {p.supplierName && (
                            <>
                              <span>·</span>
                              <span className="text-slate-600">{p.supplierName}</span>
                            </>
                          )}
                        </div>
                      </button>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                        {currentLocation.currency} {p.sellingPrice.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                        {canViewCost ? `Cost ${p.buyingPrice.toFixed(2)} (${margin}%)` : 'Cost ••••'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg px-2.5 py-2 flex items-center justify-between border border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">
                        {currentLocation.name.split(' ')[0]}:
                      </span>
                      {quickAdjustProductId === p.id && canManage ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => stepQuickAdjust(-1)}
                            className="w-6 h-6 rounded border border-slate-300 bg-white flex items-center justify-center text-slate-700"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={adjustValue}
                            onChange={(e) => setAdjustValue(e.target.value)}
                            className="w-14 bg-white border border-blue-500 rounded px-1.5 py-0.5 text-xs font-mono font-semibold text-center tabular-nums"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => stepQuickAdjust(1)}
                            className="w-6 h-6 rounded border border-slate-300 bg-white flex items-center justify-center text-slate-700"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => submitQuickAdjust(p)}
                            className="bg-blue-600 text-white px-2 py-1 rounded text-[11px] font-semibold"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (!canManage) return;
                            setQuickAdjustProductId(p.id);
                            setAdjustValue(currentStock.toString());
                          }}
                          className={`font-semibold tabular-nums ${
                            isOutOfStock
                              ? 'text-rose-600'
                              : isLowStock
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {isOutOfStock ? 'Out of stock' : `${currentStock} in stock`}
                        </button>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                      {p.barcode}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    <button
                      type="button"
                      onClick={() => setInspectedProductId(p.id)}
                      className="text-slate-700 font-semibold flex items-center gap-1 py-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Details</span>
                    </button>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleOpenLabelModalForSingle(p)}
                        className="text-slate-600 font-semibold py-1 cursor-pointer"
                      >
                        Label
                      </button>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(p)}
                            className="text-blue-600 font-semibold py-1 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteProduct(p.id)}
                            className="text-rose-600 font-semibold py-1 cursor-pointer"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Sortable Product Grid with Right-Side Vertical Scroller (md and up) */}
        <div className="hidden md:flex md:flex-col flex-1 min-h-0 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div
            ref={productsTableScrollRef}
            onScroll={handleProductsScroll}
            className="flex-1 min-h-0 products-view-scroller"
          >
            <table
              className={`w-full text-left border-collapse ${
                showMultiLocationColumns ? 'min-w-max' : 'min-w-[820px]'
              }`}
            >
              <thead className="sticky top-0 z-20 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0] text-xs font-semibold text-slate-600">
                <tr>
                  <th className="py-2.5 pl-3 pr-1.5 w-9 text-center">
                    <input
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeFilteredSelected;
                      }}
                      onChange={(e) => {
                        if (e.target.checked) selectAllFiltered();
                        else deselectAllFiltered();
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer align-middle"
                      title={isAllFilteredSelected ? 'Deselect all filtered' : 'Select all filtered'}
                    />
                  </th>
                  <th className="py-2.5 px-2.5">
                    <button
                      type="button"
                      onClick={() => toggleSort('name')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer"
                    >
                      <span>Product</span>
                      {renderSortIcon('name')}
                    </button>
                  </th>
                  <th className="py-2.5 px-2.5">
                    <button
                      type="button"
                      onClick={() => toggleSort('sku')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer"
                    >
                      <span>SKU</span>
                      {renderSortIcon('sku')}
                    </button>
                  </th>
                  <th className="py-2.5 px-2.5">Category</th>
                  <th className="py-2.5 px-2.5">Supplier</th>
                  <th className="py-2.5 px-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('buyingPrice')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer ml-auto"
                    >
                      <span>Buying</span>
                      {renderSortIcon('buyingPrice')}
                    </button>
                  </th>
                  <th className="py-2.5 px-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('sellingPrice')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer ml-auto"
                    >
                      <span>Selling</span>
                      {renderSortIcon('sellingPrice')}
                    </button>
                  </th>
                  <th className="py-2.5 px-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('margin')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer ml-auto"
                    >
                      <span>Margin</span>
                      {renderSortIcon('margin')}
                    </button>
                  </th>
                  <th className="py-2.5 px-2.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleSort('stock')}
                      className="inline-flex items-center gap-1.5 hover:text-slate-900 cursor-pointer"
                    >
                      <span>{currentLocation.name.split(' ')[0]} Stock</span>
                      {renderSortIcon('stock')}
                    </button>
                  </th>

                  {showMultiLocationColumns &&
                    locations.map((loc) => (
                      <th
                        key={loc.id}
                        className="py-2.5 px-2.5 text-center whitespace-nowrap"
                        title={loc.name}
                      >
                        {loc.code || loc.name.split(' ')[0]}
                      </th>
                    ))}

                  <th className="py-2.5 pl-2.5 pr-4 text-right sticky right-0 z-30 bg-slate-50 border-l border-slate-200/70">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="text-xs divide-y divide-slate-100 text-slate-700">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={dynamicColSpan} className="p-10 text-center">
                      <div className="max-w-sm mx-auto space-y-2">
                        <p className="text-sm font-semibold text-slate-700">
                          {products.length === 0
                            ? 'No products in your catalog yet'
                            : 'No products match the active filters'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {products.length === 0
                            ? 'Create your first SKU or bulk import an existing CSV catalog from Tools.'
                            : 'Adjust your search term, category, supplier, or stock filter.'}
                        </p>
                        <div className="pt-2 flex items-center justify-center gap-2">
                          {products.length === 0 && canManage ? (
                            <>
                              <button
                                type="button"
                                onClick={handleOpenAddModal}
                                className="px-3.5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                              >
                                Add First Product
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsCsvModalOpen(true)}
                                className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold cursor-pointer"
                              >
                                Import CSV
                              </button>
                            </>
                          ) : (
                            hasActiveFilters && (
                              <button
                                type="button"
                                onClick={resetFilters}
                                className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold cursor-pointer"
                              >
                                Clear All Filters
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const currentStock = p.stockByLocation[currentLocation.id] ?? 0;
                    const isOutOfStock = currentStock === 0;
                    const isLowStock = currentStock > 0 && currentStock <= p.reorderPoint;
                    const margin =
                      p.sellingPrice > 0
                        ? (((p.sellingPrice - p.buyingPrice) / p.sellingPrice) * 100).toFixed(1)
                        : '0.0';
                    const isInspected = inspectedProductId === p.id;
                    const isSelected = selectedProductIds.has(p.id);

                    return (
                      <tr
                        key={p.id}
                        className={`transition-colors group ${
                          isInspected
                            ? 'bg-blue-50/60'
                            : isSelected
                            ? 'bg-blue-50/30'
                            : 'hover:bg-slate-50/90'
                        }`}
                      >
                        {/* Selection Checkbox */}
                        <td className="py-2.5 pl-3 pr-1.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectProduct(p.id)}
                            className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer align-middle"
                            title="Select product"
                          />
                        </td>

                        {/* Name & Barcode (Click opens Slide-Over Drawer) */}
                        <td className="py-2.5 px-2.5">
                          <button
                            type="button"
                            onClick={() => setInspectedProductId(p.id)}
                            className="text-left group/name cursor-pointer block max-w-[200px] xl:max-w-[250px]"
                          >
                            <div className="font-semibold text-slate-900 group-hover/name:text-blue-600 transition truncate">
                              {p.name}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] font-mono tabular-nums text-slate-400">
                              <Barcode className="w-3 h-3 shrink-0" />
                              <span>{p.barcode}</span>
                            </div>
                          </button>
                        </td>

                        {/* SKU */}
                        <td className="py-2.5 px-2.5 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                          {p.sku}
                        </td>

                        {/* Category */}
                        <td className="py-2.5 px-2.5 text-slate-600 whitespace-nowrap max-w-[140px] truncate">
                          {p.category}
                        </td>

                        {/* Supplier (Zero-Pill Clean Text) */}
                        <td className="py-2.5 px-2.5">
                          {p.supplierName ? (
                            <span className="inline-flex items-center gap-1.5 text-slate-700 max-w-[130px]">
                              <Truck className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{p.supplierName}</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Unlinked</span>
                          )}
                        </td>

                        {/* Buying Price */}
                        <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-slate-500 whitespace-nowrap">
                          {canViewCost ? `${currentLocation.currency} ${p.buyingPrice.toFixed(2)}` : '••••'}
                        </td>

                        {/* Selling Price */}
                        <td className="py-2.5 px-2.5 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                          {currentLocation.currency} {p.sellingPrice.toFixed(2)}
                        </td>

                        {/* Margin */}
                        <td className="py-2.5 px-2.5 text-right font-mono tabular-nums font-medium text-emerald-700 whitespace-nowrap">
                          {canViewCost ? `${margin}%` : '—'}
                        </td>

                        {/* Current Location Stock Level + Inline Stepper Editor */}
                        <td className="py-2.5 px-2.5 whitespace-nowrap">
                          {quickAdjustProductId === p.id && canManage ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => stepQuickAdjust(-1)}
                                className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 cursor-pointer"
                                title="Decrease 1"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={adjustValue}
                                onChange={(e) => setAdjustValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') submitQuickAdjust(p);
                                  if (e.key === 'Escape') setQuickAdjustProductId(null);
                                }}
                                className="w-14 bg-white border border-blue-500 rounded px-1.5 py-0.5 text-xs font-mono font-semibold text-center tabular-nums"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => stepQuickAdjust(1)}
                                className="w-6 h-6 rounded border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 cursor-pointer"
                                title="Increase 1"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <select
                                value={adjustReason}
                                onChange={(e) => setAdjustReason(e.target.value)}
                                className="px-1.5 py-0.5 border border-slate-200 rounded bg-white text-[11px] text-slate-600"
                              >
                                <option value="Cycle count">Count</option>
                                <option value="Restock">Restock</option>
                                <option value="Damaged">Damage</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => submitQuickAdjust(p)}
                                className="w-6 h-6 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center cursor-pointer"
                                title="Save stock count"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuickAdjustProductId(null)}
                                className="w-6 h-6 rounded text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (!canManage) {
                                  setInspectedProductId(p.id);
                                  return;
                                }
                                setQuickAdjustProductId(p.id);
                                setAdjustValue(currentStock.toString());
                                setAdjustReason('Cycle count');
                              }}
                              className={`inline-flex items-center gap-1.5 font-mono tabular-nums font-semibold px-2 py-0.5 rounded-md transition cursor-pointer ${
                                isOutOfStock
                                  ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                                  : isLowStock
                                  ? 'text-amber-800 bg-amber-50 hover:bg-amber-100'
                                  : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                              }`}
                              title={canManage ? 'Click to adjust stock inline' : 'View stock details'}
                            >
                              {isOutOfStock
                                ? 'Out (0)'
                                : isLowStock
                                ? `${currentStock} Low`
                                : `${currentStock}`}
                            </button>
                          )}
                        </td>

                        {/* Dynamic Multi-Location Stock Matrix */}
                        {showMultiLocationColumns &&
                          locations.map((loc) => {
                            const locQty = p.stockByLocation?.[loc.id] ?? 0;
                            return (
                              <td
                                key={loc.id}
                                className={`py-2.5 px-3 text-center font-mono tabular-nums font-medium ${
                                  locQty === 0
                                    ? 'text-rose-600'
                                    : locQty <= p.reorderPoint
                                    ? 'text-amber-700'
                                    : 'text-slate-700'
                                }`}
                              >
                                {locQty}
                              </td>
                            );
                          })}

                        {/* Actions: Primary Inspect/Edit + Compact Row Overflow Menu (Sticky Right) */}
                        <td
                          className={`py-2.5 pl-2.5 pr-4 text-right whitespace-nowrap sticky right-0 z-10 border-l border-slate-100 transition-colors ${
                            isInspected
                              ? 'bg-blue-50'
                              : isSelected
                              ? 'bg-blue-50'
                              : 'bg-white group-hover:bg-slate-50'
                          }`}
                        >
                          <div className="inline-flex items-center justify-end gap-1" data-row-menu-root>
                            <button
                              type="button"
                              onClick={() =>
                                canManage ? handleOpenEditModal(p) : setInspectedProductId(p.id)
                              }
                              className="px-2 py-1 rounded-md text-xs font-semibold text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            >
                              {canManage ? 'Edit' : 'View'}
                            </button>

                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  if (openRowMenuId === p.id) {
                                    setOpenRowMenuId(null);
                                    return;
                                  }
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  if (spaceBelow < 210) {
                                    setRowMenuPosition({
                                      bottom: window.innerHeight - rect.top + 4,
                                      right: Math.max(12, window.innerWidth - rect.right),
                                    });
                                  } else {
                                    setRowMenuPosition({
                                      top: rect.bottom + 4,
                                      right: Math.max(12, window.innerWidth - rect.right),
                                    });
                                  }
                                  setOpenRowMenuId(p.id);
                                }}
                                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                aria-label={`More actions for ${p.name}`}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>

                              {openRowMenuId === p.id && rowMenuPosition && (
                                <div
                                  style={{
                                    top: rowMenuPosition.top,
                                    bottom: rowMenuPosition.bottom,
                                    right: rowMenuPosition.right,
                                  }}
                                  className="fixed w-48 bg-white rounded-xl border border-slate-200 shadow-xl py-1 z-50 text-left"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenRowMenuId(null);
                                      setInspectedProductId(p.id);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Inspect Details</span>
                                  </button>
                                  {canManage && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenRowMenuId(null);
                                        handleCloneProduct(p);
                                      }}
                                      className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                    >
                                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                                      <span>Clone SKU</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenRowMenuId(null);
                                      handleOpenLabelModalForSingle(p);
                                    }}
                                    className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Print Label</span>
                                  </button>
                                  {canTransfer && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenRowMenuId(null);
                                        handleOpenTransferModal(p);
                                      }}
                                      className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                    >
                                      <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Transfer Stock</span>
                                    </button>
                                  )}
                                  {canManage && (
                                    <>
                                      <div className="my-1 border-t border-slate-100" />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenRowMenuId(null);
                                          deleteProduct(p.id);
                                        }}
                                        className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete Product</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
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

      {/* Scroll Back To Top */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed sm:absolute bottom-20 sm:bottom-8 right-5 sm:right-9 z-30 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg border border-blue-500/50 transition-all duration-150 flex items-center justify-center cursor-pointer"
          title="Scroll back to top of inventory"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}

      {/* Slide-Over Product Inspector Drawer */}
      <ProductInspectorDrawer
        product={inspectedProduct}
        onClose={() => setInspectedProductId(null)}
        onEditFull={(p) => {
          setInspectedProductId(null);
          handleOpenEditModal(p);
        }}
        onClone={(p) => {
          setInspectedProductId(null);
          handleCloneProduct(p);
        }}
        onPrintLabel={(p) => handleOpenLabelModalForSingle(p)}
        onTransfer={(p) => {
          setInspectedProductId(null);
          handleOpenTransferModal(p);
        }}
        onDelete={(p) => deleteProduct(p.id)}
      />

      {/* Bulk Update & CSV Import Modals */}
      <BulkInventoryActionModal
        isOpen={Boolean(bulkModalMode)}
        mode={bulkModalMode}
        selectedProducts={selectedProducts}
        onClose={() => setBulkModalMode(null)}
        onComplete={clearSelection}
      />

      <InventoryCsvModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
      />

      {/* Existing Modals */}
      <ProductLabelPrintModal
        isOpen={isLabelModalOpen}
        onClose={() => {
          setIsLabelModalOpen(false);
          setSinglePrintProduct(null);
        }}
        selectedProducts={activeLabelModalProducts}
        onRemoveProduct={(id) => {
          if (singlePrintProduct) {
            setIsLabelModalOpen(false);
            setSinglePrintProduct(null);
          } else {
            setSelectedProductIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }
        }}
      />

      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setStagedAiProduct(null);
          setClonedDraftProduct(null);
        }}
        productToEdit={editingProduct}
        initialAiProduct={stagedAiProduct}
        initialDraftProduct={clonedDraftProduct}
      />

      <StockTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        defaultProduct={transferTargetProduct}
      />

      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />

      <SupplierInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
      />

      <PackageScannerModal
        isOpen={isPackageScannerOpen}
        onClose={() => setIsPackageScannerOpen(false)}
        onApplyParsedProduct={(parsed) => {
          setStagedAiProduct(parsed);
          setClonedDraftProduct(null);
          setEditingProduct(null);
          setIsProductModalOpen(true);
          setIsPackageScannerOpen(false);
        }}
      />
    </div>
  );
};
