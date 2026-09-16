import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  ArrowRightLeft,
  Barcode,
  Edit2,
  AlertTriangle,
  Building2,
  Filter,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Cloud,
} from 'lucide-react';
import { Product } from '../types';
import { usePos } from '../context/PosContext';
import { ProductFormModal } from './ProductFormModal';
import { StockTransferModal } from './StockTransferModal';

export const InventoryView: React.FC = () => {
  const {
    products,
    categories,
    locations,
    currentLocation,
    adjustStock,
    deleteProduct,
    showToast,
    fetchFreshInventoryFromServer,
    isInventoryFreshFromServer,
    isInventoryLoading,
    inventoryLastFetchedAt,
  } = usePos();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [showMultiLocationColumns, setShowMultiLocationColumns] = useState(false);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTargetProduct, setTransferTargetProduct] = useState<Product | null>(null);

  // Quick adjust inline state
  const [quickAdjustProductId, setQuickAdjustProductId] = useState<string | null>(null);
  const [adjustValue, setAdjustValue] = useState<string>('');

  // Low stock counts
  const lowStockItems = useMemo(() => {
    return products.filter((p) => {
      const stock = p.stockByLocation[currentLocation.id] ?? 0;
      return stock <= p.reorderPoint;
    });
  }, [products, currentLocation]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory =
        selectedCategory === 'All Categories' || p.category === selectedCategory;

      const matchSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.includes(searchQuery.trim());

      const currentStock = p.stockByLocation[currentLocation.id] ?? 0;
      let matchStock = true;
      if (stockFilter === 'in_stock') matchStock = currentStock > p.reorderPoint;
      if (stockFilter === 'low_stock') matchStock = currentStock > 0 && currentStock <= p.reorderPoint;
      if (stockFilter === 'out_of_stock') matchStock = currentStock === 0;

      return matchCategory && matchSearch && matchStock;
    });
  }, [products, selectedCategory, searchQuery, stockFilter, currentLocation]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setIsProductModalOpen(true);
  };

  const handleOpenTransferModal = (p: Product) => {
    setTransferTargetProduct(p);
    setIsTransferModalOpen(true);
  };

  const submitQuickAdjust = (p: Product) => {
    const val = parseInt(adjustValue, 10);
    if (!isNaN(val)) {
      adjustStock(p.id, currentLocation.id, val, 'Manual register cycle count');
    }
    setQuickAdjustProductId(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden">
      {/* Top Banner / Actions Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg font-black text-slate-800">Inventory & Stock Catalog</h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {products.length} Products
            </span>
            {isInventoryLoading ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                Fetching fresh from server...
              </span>
            ) : isInventoryFreshFromServer ? (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"
                title="Bypassed cache: direct fresh server snapshot"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Server Fresh
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-1">
            <span>Directly synchronized with central cloud repository</span>
            {inventoryLastFetchedAt && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 font-medium">
                  Fresh fetch: {new Date(inventoryLastFetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-refresh-inventory-fresh"
            onClick={() => fetchFreshInventoryFromServer(undefined, true)}
            disabled={isInventoryLoading}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Force fetch latest inventory directly from Firestore server (bypassing cache)"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isInventoryLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh from Cloud</span>
          </button>

          <button
            onClick={() => {
              setTransferTargetProduct(null);
              setIsTransferModalOpen(true);
            }}
            className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
            <span>Branch Transfer</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="p-3 sm:p-6 flex-1 flex flex-col gap-3 sm:gap-4 overflow-hidden">
        {/* Low Stock Warning Callout (if any) */}
        {lowStockItems.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
              <div className="truncate">
                <span className="text-xs font-bold text-amber-900">
                  {lowStockItems.length} items low in{' '}
                  {currentLocation.name}:
                </span>
                <span className="text-xs text-amber-800 ml-1.5 hidden md:inline">
                  {lowStockItems.map((i) => i.name).slice(0, 3).join(', ')}
                  {lowStockItems.length > 3 ? ` +${lowStockItems.length - 3} more` : ''}
                </span>
              </div>
            </div>
            <button
              onClick={() => setStockFilter('low_stock')}
              className="text-xs font-bold text-amber-800 hover:underline shrink-0 ml-2"
            >
              Filter →
            </button>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-2.5 sm:gap-3 shrink-0 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-2.5 flex-1">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search item, SKU or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg text-xs pl-8 pr-3 py-2 sm:py-1.5 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg text-xs px-3 py-2 sm:py-1.5 text-slate-700 font-medium"
            >
              <option value="All Categories">All Categories</option>
              {categories.filter((c) => c !== 'All Items').map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Stock Level Filter */}
            <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-[11px] font-bold overflow-x-auto">
              <button
                onClick={() => setStockFilter('all')}
                className={`px-2.5 py-1 rounded transition flex-1 sm:flex-none text-center ${
                  stockFilter === 'all' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStockFilter('in_stock')}
                className={`px-2.5 py-1 rounded transition flex-1 sm:flex-none text-center ${
                  stockFilter === 'in_stock' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500'
                }`}
              >
                In Stock
              </button>
              <button
                onClick={() => setStockFilter('low_stock')}
                className={`px-2.5 py-1 rounded transition flex-1 sm:flex-none text-center ${
                  stockFilter === 'low_stock' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Low Stock
              </button>
              <button
                onClick={() => setStockFilter('out_of_stock')}
                className={`px-2.5 py-1 rounded transition flex-1 sm:flex-none text-center ${
                  stockFilter === 'out_of_stock' ? 'bg-white text-red-700 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Out
              </button>
            </div>
          </div>

          {/* Toggle Multi-Location Matrix View (desktop only) */}
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setShowMultiLocationColumns(!showMultiLocationColumns)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 ${
                showMultiLocationColumns
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Multi-Store Matrix</span>
            </button>
          </div>
        </div>

        {/* Mobile View: Responsive Product Cards (< md) */}
        <div className="md:hidden flex-1 overflow-y-auto space-y-2.5 pr-0.5 pb-16">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
              <p className="text-sm font-bold text-slate-600">No products found</p>
              <p className="text-xs text-slate-400 mt-1">Adjust search or filter options</p>
            </div>
          ) : (
            filteredProducts.map((p) => {
              const currentStock = p.stockByLocation[currentLocation.id] ?? 0;
              const isOutOfStock = currentStock === 0;
              const isLowStock = currentStock > 0 && currentStock <= p.reorderPoint;
              const margin =
                p.sellingPrice > 0
                  ? (((p.sellingPrice - p.buyingPrice) / p.sellingPrice) * 100).toFixed(1)
                  : '0';

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-900 leading-snug">
                        {p.name}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{p.sku}</span>
                        <span>{p.category}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-blue-600">
                        {currentLocation.currency} {p.sellingPrice.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Cost: {p.buyingPrice.toFixed(2)} ({margin}%)
                      </div>
                    </div>
                  </div>

                  {/* Stock Level & Inline Quick Adjust */}
                  <div className="bg-slate-50 rounded-lg p-2 flex items-center justify-between border border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">
                        {currentLocation.name.split(' ')[0]} Stock:
                      </span>
                      {quickAdjustProductId === p.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={adjustValue}
                            onChange={(e) => setAdjustValue(e.target.value)}
                            className="w-14 bg-white border border-blue-500 rounded px-1.5 py-0.5 text-xs font-mono font-bold"
                            autoFocus
                          />
                          <button
                            onClick={() => submitQuickAdjust(p)}
                            className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-bold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setQuickAdjustProductId(null)}
                            className="text-slate-400 hover:text-slate-600 text-[10px]"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setQuickAdjustProductId(p.id);
                            setAdjustValue(currentStock.toString());
                          }}
                          className="cursor-pointer"
                          title="Tap to adjust quantity"
                        >
                          {isOutOfStock ? (
                            <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold text-[10px]">
                              Out of stock (Edit)
                            </span>
                          ) : isLowStock ? (
                            <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold text-[10px]">
                              {currentStock} in stock (Low)
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">
                              {currentStock} in stock
                            </span>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <Barcode className="w-3 h-3" />
                      <span>{p.barcode}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-end gap-3 pt-1 border-t border-slate-100 text-xs">
                    <button
                      onClick={() => handleOpenTransferModal(p)}
                      className="text-slate-600 hover:text-blue-600 font-bold flex items-center gap-1 py-1 cursor-pointer"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                      <span>Transfer</span>
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(p)}
                      className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 py-1 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="text-slate-400 hover:text-red-600 font-bold flex items-center gap-1 py-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Products Table (md and up) */}
        <div className="hidden md:flex bg-white rounded-xl border border-slate-200 flex-1 overflow-hidden flex-col shadow-2xs">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="p-3 pl-5">Product Name & Barcode</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Buying Price</th>
                  <th className="p-3">Selling Price</th>
                  <th className="p-3">Margin</th>
                  <th className="p-3">
                    {currentLocation.name.split(' ')[0]} Stock
                  </th>
                  {showMultiLocationColumns && (
                    <>
                      <th className="p-3 text-center">Nairobi</th>
                      <th className="p-3 text-center">Westlands</th>
                      <th className="p-3 text-center">Mombasa</th>
                      <th className="p-3 text-center">Kisumu</th>
                    </>
                  )}
                  <th className="p-3 text-right pr-5">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100 text-slate-700">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={showMultiLocationColumns ? 12 : 8} className="p-8 text-center text-slate-400">
                      No products found matching filters.
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
                        : '0';

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition group">
                        {/* Name & Barcode */}
                        <td className="p-3 pl-5">
                          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition">
                            {p.name}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 mt-0.5">
                            <Barcode className="w-3 h-3 text-slate-400" />
                            <span>{p.barcode}</span>
                          </div>
                        </td>

                        {/* SKU */}
                        <td className="p-3 font-mono text-slate-500">{p.sku}</td>

                        {/* Category */}
                        <td className="p-3 font-medium text-slate-600">{p.category}</td>

                        {/* Buying Price */}
                        <td className="p-3 font-mono text-slate-500">
                          {currentLocation.currency} {p.buyingPrice.toFixed(2)}
                        </td>

                        {/* Selling Price */}
                        <td className="p-3 font-mono font-bold text-blue-600">
                          {currentLocation.currency} {p.sellingPrice.toFixed(2)}
                        </td>

                        {/* Margin */}
                        <td className="p-3 font-mono text-[11px] font-bold text-emerald-700">
                          {margin}%
                        </td>

                        {/* Current Location Stock Level */}
                        <td className="p-3">
                          {quickAdjustProductId === p.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                value={adjustValue}
                                onChange={(e) => setAdjustValue(e.target.value)}
                                className="w-16 bg-white border border-blue-500 rounded px-1.5 py-0.5 text-xs font-mono font-bold"
                                autoFocus
                              />
                              <button
                                onClick={() => submitQuickAdjust(p)}
                                className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-bold"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setQuickAdjustProductId(null)}
                                className="text-slate-400 hover:text-slate-600 text-[10px]"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                setQuickAdjustProductId(p.id);
                                setAdjustValue(currentStock.toString());
                              }}
                              className="cursor-pointer group/stock inline-block"
                              title="Click to quickly adjust stock count"
                            >
                              {isOutOfStock ? (
                                <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold text-[10px] group-hover/stock:ring-1 group-hover/stock:ring-red-400">
                                  Out of stock
                                </span>
                              ) : isLowStock ? (
                                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold text-[10px] group-hover/stock:ring-1 group-hover/stock:ring-amber-400">
                                  {currentStock} in stock (Low)
                                </span>
                              ) : (
                                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px] group-hover/stock:ring-1 group-hover/stock:ring-emerald-400">
                                  {currentStock} in stock
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Multi-Location Matrix Columns */}
                        {showMultiLocationColumns && (
                          <>
                            <td className="p-3 text-center font-mono font-semibold">
                              {p.stockByLocation['loc-nbi'] ?? 0}
                            </td>
                            <td className="p-3 text-center font-mono font-semibold">
                              {p.stockByLocation['loc-wst'] ?? 0}
                            </td>
                            <td className="p-3 text-center font-mono font-semibold">
                              {p.stockByLocation['loc-msa'] ?? 0}
                            </td>
                            <td className="p-3 text-center font-mono font-semibold">
                              {p.stockByLocation['loc-ksm'] ?? 0}
                            </td>
                          </>
                        )}

                        {/* Actions */}
                        <td className="p-3 text-right pr-5 space-x-2">
                          <button
                            onClick={() => handleOpenTransferModal(p)}
                            className="text-slate-500 hover:text-blue-600 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                            title="Transfer stock to another branch"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>Transfer</span>
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => deleteProduct(p.id)}
                            className="text-slate-400 hover:text-red-600 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                            title="Delete product (Safeguard Protected)"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
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
      <ProductFormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productToEdit={editingProduct}
      />

      <StockTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        defaultProduct={transferTargetProduct}
      />
    </div>
  );
};
