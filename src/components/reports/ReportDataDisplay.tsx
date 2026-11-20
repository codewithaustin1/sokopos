import React, { useMemo } from 'react';
import {
  Search,
  X,
  Printer,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { ReportType } from '../../types/reporting';

export interface SortState {
  colIndex: number;
  dir: 'asc' | 'desc';
}

interface ReportDataDisplayProps {
  reportTitle: string;
  activeReportId: ReportType;
  tableHeaders: string[];
  tableRows: (string | number | boolean)[][];
  searchQuery: string;
  onSearchChange: (val: string) => void;
  sortState: SortState | null;
  onToggleSort: (colIndex: number) => void;
  currentPage: number;
  pageSize: number;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (nextSize: number) => void;
  onReprintTransaction: (receiptNumOrId: string) => void;
  branchName: string;
}

const PAGE_SIZE_OPTIONS = [15, 25, 50, 100];

function parseSortableValue(val: string | number | boolean): number | string {
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 1 : 0;
  const raw = String(val).trim();
  // Match clean signed numbers, currency amounts, or percentages (e.g. "1,250.00", "+13.6%", "-9.1%")
  const numericCandidate = raw.replace(/[,%\s+]/g, '').replace(/pts$/i, '');
  if (/^-?\d+(\.\d+)?$/.test(numericCandidate)) {
    return parseFloat(numericCandidate);
  }
  return raw.toLowerCase();
}

function isActionHeaderName(header: string): boolean {
  const lower = header.toLowerCase();
  return lower === 'action' || lower === 'actions';
}

function isRightAlignedColumn(header: string, colIdx: number, totalCols: number, hasActionCol: boolean): boolean {
  if (colIdx === 0 || isActionHeaderName(header)) return false;
  if (header.toLowerCase().includes('status') || header.toLowerCase().includes('reason')) return false;
  if (
    /\(([^)]+)\)/.test(header) ||
    /qty|count|orders|stock|point|margin|rate|share|%|growth|change|visits/i.test(header)
  ) {
    return true;
  }
  const threshold = totalCols - (hasActionCol ? 3 : 2);
  return colIdx >= threshold;
}

export const ReportDataDisplay: React.FC<ReportDataDisplayProps> = React.memo(
  ({
    reportTitle,
    activeReportId,
    tableHeaders,
    tableRows,
    searchQuery,
    onSearchChange,
    sortState,
    onToggleSort,
    currentPage,
    pageSize,
    onPageChange,
    onPageSizeChange,
    onReprintTransaction,
    branchName,
  }) => {
    const hasActionCol = useMemo(
      () => tableHeaders.some(isActionHeaderName),
      [tableHeaders]
    );

    const isReceiptClickable = activeReportId === 'sales' || activeReportId === 'refund_void';

    // Sort complete filtered dataset prior to pagination
    const sortedRows = useMemo(() => {
      if (!sortState) return tableRows;
      const { colIndex, dir } = sortState;
      const copy = [...tableRows];
      copy.sort((rowA, rowB) => {
        const aVal = parseSortableValue(rowA[colIndex] ?? '');
        const bVal = parseSortableValue(rowB[colIndex] ?? '');
        let cmp = 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          cmp = aVal - bVal;
        } else {
          cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        }
        return dir === 'asc' ? cmp : -cmp;
      });
      return copy;
    }, [tableRows, sortState]);

    const totalRecords = sortedRows.length;
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const startIdx = (safePage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, totalRecords);

    const paginatedRows = useMemo(
      () => sortedRows.slice(startIdx, endIdx),
      [sortedRows, startIdx, endIdx]
    );

    const statusColIndex = useMemo(
      () => tableHeaders.findIndex((h) => h.toLowerCase().includes('status')),
      [tableHeaders]
    );

    const primaryNumericColIndex = useMemo(() => {
      for (let i = tableHeaders.length - 1; i >= 1; i--) {
        const h = tableHeaders[i];
        if (!isActionHeaderName(h) && !h.toLowerCase().includes('status')) {
          return i;
        }
      }
      return -1;
    }, [tableHeaders]);

    return (
      <div className="space-y-4">
        {/* Search & Live Record Summary Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-md">
            <label htmlFor="report-search-input" className="sr-only">
              Search {reportTitle} records
            </label>
            <Search
              className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              id="report-search-input"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={`Search ${reportTitle.toLowerCase()}...`}
              className="w-full min-h-[42px] bg-slate-50 border border-slate-300 rounded-lg py-2 pl-10 pr-10 text-sm sm:text-xs font-medium focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 focus:bg-white text-slate-900 placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear report search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div
            aria-live="polite"
            className="text-xs text-slate-600 font-medium flex flex-wrap items-center gap-2 tabular-nums"
          >
            <span>
              {totalRecords === 0
                ? '0 matching records'
                : `Showing ${startIdx + 1}–${endIdx} of ${totalRecords} records`}
            </span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span className="font-mono text-xs text-slate-700">Branch: {branchName}</span>
          </div>
        </div>

        {/* Empty State */}
        {totalRecords === 0 ? (
          <div className="border border-slate-200 rounded-xl bg-white py-12 px-4 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-800">
              No records matched your current filters
            </p>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Try adjusting the date range, branch filter, or search term for {reportTitle}.
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="min-h-[40px] px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Responsive Stacked Summary Cards (< md) */}
            <div
              className="md:hidden space-y-2.5"
              role="region"
              aria-label={`${reportTitle} mobile cards`}
            >
              {paginatedRows.map((row, rIdx) => {
                const absoluteIndex = startIdx + rIdx;
                const primaryValue = String(row[0] ?? '');
                const hasRowAction =
                  hasActionCol ||
                  row.some((cell, idx) => isActionHeaderName(tableHeaders[idx] || '') || cell === 'REPRINT');
                const highlightVal =
                  primaryNumericColIndex >= 0 ? String(row[primaryNumericColIndex] ?? '') : null;
                const statusVal = statusColIndex >= 0 ? String(row[statusColIndex] ?? '') : null;

                const detailIndices = tableHeaders
                  .map((_, i) => i)
                  .filter(
                    (i) =>
                      i !== 0 &&
                      i !== primaryNumericColIndex &&
                      i !== statusColIndex &&
                      !isActionHeaderName(tableHeaders[i] || '')
                  );

                return (
                  <article
                    key={`${primaryValue}-${absoluteIndex}`}
                    className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {isReceiptClickable ? (
                          <button
                            type="button"
                            onClick={() => onReprintTransaction(primaryValue)}
                            className="font-mono text-sm font-bold text-blue-700 hover:text-blue-900 underline underline-offset-2 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
                          >
                            {primaryValue}
                          </button>
                        ) : (
                          <h3 className="text-sm font-bold text-slate-900 break-words">
                            {primaryValue}
                          </h3>
                        )}
                        {statusVal && (
                          <span className="inline-block mt-0.5 text-[11px] font-semibold text-slate-600">
                            {statusVal}
                          </span>
                        )}
                      </div>

                      {highlightVal !== null && (
                        <div className="text-right shrink-0">
                          <div className="text-[11px] text-slate-600 font-medium">
                            {tableHeaders[primaryNumericColIndex]}
                          </div>
                          <div className="text-sm font-bold font-mono tabular-nums text-slate-900">
                            {highlightVal}
                          </div>
                        </div>
                      )}
                    </div>

                    {detailIndices.length > 0 && (
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 border-t border-slate-100 text-xs">
                        {detailIndices.map((colIdx) => {
                          const label = tableHeaders[colIdx];
                          const val = row[colIdx];
                          const formatted =
                            typeof val === 'boolean' ? (val ? 'YES' : 'NO') : String(val ?? '');
                          const isWide = formatted.length > 28;
                          return (
                            <div
                              key={colIdx}
                              className={isWide ? 'col-span-2 min-w-0' : 'min-w-0'}
                            >
                              <dt className="text-[11px] text-slate-600 font-medium truncate">
                                {label}
                              </dt>
                              <dd className="text-xs font-semibold text-slate-900 font-mono tabular-nums break-words">
                                {formatted}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    )}

                    {hasRowAction && (
                      <div className="pt-1">
                        <button
                          type="button"
                          id={`reprint-order-mobile-btn-${absoluteIndex}`}
                          onClick={() => onReprintTransaction(primaryValue)}
                          className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-semibold text-xs transition cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
                        >
                          <Printer className="w-4 h-4 text-blue-700 shrink-0" aria-hidden="true" />
                          <span>Reprint Duplicate Receipt</span>
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {/* Desktop Tabular Data Display (>= md) */}
            <div className="hidden md:block border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div
                tabIndex={0}
                role="region"
                aria-label={`${reportTitle} data table`}
                className="overflow-x-auto max-h-[540px] focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-600"
              >
                <table className="w-full text-left text-xs border-collapse">
                  <caption className="sr-only">
                    {reportTitle} for {branchName} showing {startIdx + 1} to {endIdx} of{' '}
                    {totalRecords} records
                  </caption>
                  <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs text-[11px] font-bold text-slate-700 border-b border-slate-200 z-10">
                    <tr>
                      {tableHeaders.map((header, idx) => {
                        const isAction = isActionHeaderName(header);
                        const isRight = isRightAlignedColumn(
                          header,
                          idx,
                          tableHeaders.length,
                          hasActionCol
                        );
                        const isSortedCol = sortState?.colIndex === idx;
                        const ariaSortValue = isAction
                          ? undefined
                          : isSortedCol
                          ? sortState.dir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none';

                        return (
                          <th
                            key={`${header}-${idx}`}
                            scope="col"
                            aria-sort={ariaSortValue}
                            className={`py-2.5 px-4 whitespace-nowrap ${
                              isAction ? 'text-center' : isRight ? 'text-right' : 'text-left'
                            }`}
                          >
                            {isAction ? (
                              <span>{header}</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onToggleSort(idx)}
                                className={`inline-flex items-center gap-1 font-bold text-slate-700 hover:text-slate-950 cursor-pointer rounded px-1 -mx-1 py-0.5 focus-visible:outline-2 focus-visible:outline-blue-600 ${
                                  isRight ? 'flex-row-reverse' : ''
                                }`}
                                aria-label={`Sort by ${header}`}
                              >
                                <span>{header}</span>
                                {isSortedCol ? (
                                  sortState.dir === 'asc' ? (
                                    <ArrowUp className="w-3.5 h-3.5 text-blue-700 shrink-0" aria-hidden="true" />
                                  ) : (
                                    <ArrowDown className="w-3.5 h-3.5 text-blue-700 shrink-0" aria-hidden="true" />
                                  )
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" aria-hidden="true" />
                                )}
                              </button>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedRows.map((row, rIdx) => {
                      const absoluteIndex = startIdx + rIdx;
                      return (
                        <tr
                          key={`${String(row[0])}-${absoluteIndex}`}
                          className="hover:bg-slate-50/90 transition-colors duration-100"
                        >
                          {row.map((cell, cIdx) => {
                            const header = tableHeaders[cIdx] || '';
                            const isActionColumn = isActionHeaderName(header) || cell === 'REPRINT';

                            if (isActionColumn) {
                              const receiptNum = String(row[0]);
                              return (
                                <td key={cIdx} className="py-2 px-4 text-center whitespace-nowrap">
                                  <button
                                    type="button"
                                    id={`reprint-order-btn-${absoluteIndex}`}
                                    onClick={() => onReprintTransaction(receiptNum)}
                                    className="min-h-[34px] inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-800 border border-blue-200 font-semibold text-xs transition cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
                                    aria-label={`Reprint duplicate receipt for ${receiptNum}`}
                                  >
                                    <Printer className="w-3.5 h-3.5 text-blue-700 shrink-0" aria-hidden="true" />
                                    <span>Reprint</span>
                                  </button>
                                </td>
                              );
                            }

                            if (cIdx === 0 && isReceiptClickable) {
                              return (
                                <td key={cIdx} className="py-2.5 px-4 whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => onReprintTransaction(String(cell))}
                                    className="font-mono font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer text-left rounded focus-visible:outline-2 focus-visible:outline-blue-600"
                                    aria-label={`Reprint duplicate receipt ${String(cell)}`}
                                  >
                                    {String(cell)}
                                  </button>
                                </td>
                              );
                            }

                            const isNumeric = isRightAlignedColumn(
                              header,
                              cIdx,
                              tableHeaders.length,
                              hasActionCol
                            );

                            return (
                              <td
                                key={cIdx}
                                className={`py-2.5 px-4 whitespace-nowrap ${
                                  cIdx === 0
                                    ? 'font-semibold text-slate-900'
                                    : isNumeric
                                    ? 'text-right font-mono tabular-nums font-medium text-slate-900'
                                    : 'text-slate-700 text-xs'
                                }`}
                              >
                                {typeof cell === 'boolean' ? (cell ? 'YES' : 'NO') : String(cell)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Client-Side Pagination Bar */}
            <nav
              aria-label="Report table pagination"
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs text-slate-700"
            >
              <div className="flex items-center gap-2">
                <label htmlFor="report-page-size-select" className="font-medium text-slate-600">
                  Rows per page
                </label>
                <select
                  id="report-page-size-select"
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="min-h-[38px] px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold font-mono tabular-nums text-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2">
                <span className="font-mono tabular-nums text-slate-600 mr-1">
                  Page {safePage} of {totalPages}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onPageChange(1)}
                    disabled={safePage <= 1}
                    aria-label="First page"
                    className="min-w-[38px] min-h-[38px] inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    <ChevronsLeft className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onPageChange(safePage - 1)}
                    disabled={safePage <= 1}
                    aria-label="Previous page"
                    className="min-w-[38px] min-h-[38px] inline-flex items-center justify-center gap-1 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Prev</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onPageChange(safePage + 1)}
                    disabled={safePage >= totalPages}
                    aria-label="Next page"
                    className="min-w-[38px] min-h-[38px] inline-flex items-center justify-center gap-1 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onPageChange(totalPages)}
                    disabled={safePage >= totalPages}
                    aria-label="Last page"
                    className="min-w-[38px] min-h-[38px] inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    <ChevronsRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </nav>
          </>
        )}
      </div>
    );
  }
);

ReportDataDisplay.displayName = 'ReportDataDisplay';
