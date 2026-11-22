import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SupplierPaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZES = [10, 25, 50, 100];

export const SupplierPaginationBar: React.FC<SupplierPaginationBarProps> = React.memo(
  ({ currentPage, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange }) => {
    if (totalItems === 0) return null;

    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    const getVisiblePages = (): (number | 'ellipsis')[] => {
      if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }
      const pages: (number | 'ellipsis')[] = [1];
      if (currentPage > 3) pages.push('ellipsis');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let p = start; p <= end; p++) pages.push(p);
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
      return pages;
    };

    const visiblePages = getVisiblePages();

    return (
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-3 text-xs text-slate-600">
          <span className="font-medium tabular-nums">
            Showing <span className="font-semibold text-slate-900">{startItem}</span>–
            <span className="font-semibold text-slate-900">{endItem}</span> of{' '}
            <span className="font-semibold text-slate-900">{totalItems}</span> suppliers
          </span>

          <div className="flex items-center gap-1.5">
            <label htmlFor="supplier-page-size-select" className="text-slate-600 font-medium">
              Rows:
            </label>
            <select
              id="supplier-page-size-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="min-h-[40px] sm:min-h-[36px] px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        <nav aria-label="Supplier directory pagination" className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Previous page"
            className="min-w-[44px] min-h-[44px] sm:min-w-[40px] sm:min-h-[38px] px-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {visiblePages.map((item, idx) =>
            item === 'ellipsis' ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 text-xs font-semibold text-slate-500 select-none"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-label={`Page ${item}`}
                aria-current={item === currentPage ? 'page' : undefined}
                className={`min-w-[44px] min-h-[44px] sm:min-w-[38px] sm:min-h-[38px] px-2.5 rounded-lg text-xs font-semibold font-mono tabular-nums transition cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 ${
                  item === currentPage
                    ? 'bg-blue-600 text-white border border-blue-600'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                {item}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
            className="min-w-[44px] min-h-[44px] sm:min-w-[40px] sm:min-h-[38px] px-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </nav>
      </div>
    );
  }
);

SupplierPaginationBar.displayName = 'SupplierPaginationBar';
