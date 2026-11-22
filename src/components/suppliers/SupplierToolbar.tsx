import React, { useId } from 'react';
import { Search, X } from 'lucide-react';

export type SupplierStatusFilter = 'all' | 'active' | 'inactive';

interface SupplierToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedTermFilter: string;
  onTermFilterChange: (val: string) => void;
  selectedStatusFilter: SupplierStatusFilter;
  onStatusFilterChange: (val: SupplierStatusFilter) => void;
  totalMatchingCount: number;
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

const STATUS_TABS: { id: SupplierStatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
];

export const SupplierToolbar: React.FC<SupplierToolbarProps> = React.memo(
  ({
    searchQuery,
    onSearchChange,
    selectedTermFilter,
    onTermFilterChange,
    selectedStatusFilter,
    onStatusFilterChange,
    totalMatchingCount,
    hasActiveFilters,
    onResetFilters,
  }) => {
    const searchId = useId();
    const termsId = useId();

    return (
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <label htmlFor={searchId} className="sr-only">
              Search suppliers by company name, sales rep, phone number, category, or KRA PIN
            </label>
            <Search
              className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id={searchId}
              type="search"
              placeholder="Search vendor, rep, phone, KRA PIN..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full min-h-[40px] bg-slate-50 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-500 pl-9 pr-9 py-2 focus:outline-none focus:border-blue-600 focus:bg-white focus-visible:outline-2 focus-visible:outline-blue-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear supplier search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Payment Terms Filter */}
          <div className="w-full sm:w-auto">
            <label htmlFor={termsId} className="sr-only">
              Filter by payment terms
            </label>
            <select
              id={termsId}
              value={selectedTermFilter}
              onChange={(e) => onTermFilterChange(e.target.value)}
              className="w-full sm:w-auto min-h-[40px] bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <option value="all">All Payment Terms</option>
              <option value="cod">Cash on Delivery (COD)</option>
              <option value="net_7">Net 7 Days</option>
              <option value="net_14">Net 14 Days</option>
              <option value="net_30">Net 30 Days</option>
              <option value="consignment">Consignment Stock</option>
              <option value="prepaid">Prepaid / Advance</option>
            </select>
          </div>

          {/* Status Segmented Tabs */}
          <div
            role="tablist"
            aria-label="Filter suppliers by status"
            className="inline-flex bg-slate-100 rounded-lg p-1 border border-slate-200 self-start sm:self-auto"
          >
            {STATUS_TABS.map((tab) => {
              const isSelected = selectedStatusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => onStatusFilterChange(tab.id)}
                  className={`min-h-[34px] px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600 ${
                    isSelected
                      ? 'bg-white text-slate-900 border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Result Count & Clear Filters */}
        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-600 shrink-0">
          <span className="font-medium tabular-nums">
            {totalMatchingCount} matching supplier{totalMatchingCount === 1 ? '' : 's'}
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="min-h-[34px] px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>
    );
  }
);

SupplierToolbar.displayName = 'SupplierToolbar';
