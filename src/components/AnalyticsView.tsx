import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  RefreshCw,
  Wrench,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Download,
  Printer,
  Bookmark,
  Target,
  History,
  RotateCcw,
  Building2,
  X,
  Lock,
  AlertTriangle,
  BarChart3,
  LayoutDashboard,
  Trash2,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { Product } from '../types';
import {
  BiChartMetric,
  BiFocusTab,
  BiInspectorTarget,
  DateRange,
} from '../types/reporting';
import { calculateDateRange, isTimestampInRange } from '../utils/dateRangeUtils';
import {
  buildExecutiveTrendSeries,
  calculateBranchBenchmarks,
  calculateCategoryProfitability,
  calculateExecutivePLSummary,
  calculateSkuProfitability,
  calculateTenderMix,
  computeTransactionFinancials,
  evaluateTargetPacing,
  exportBiTableToCsv,
  getPeriodKey,
} from '../utils/biEngine';
import { GlobalTimeRangeSelector } from './reports/GlobalTimeRangeSelector';
import { ReportViewContainer } from './reports/ReportViewContainer';
import { ReportPrintData, ReportPrintModal } from './reports/ReportPrintModal';
import { ExecutiveTrendVisualizer } from './analytics/ExecutiveTrendVisualizer';
import { BiInspectorDrawer } from './analytics/BiInspectorDrawer';
import { BiTargetModal } from './analytics/BiTargetModal';
import { BiSavedViewModal } from './analytics/BiSavedViewModal';

interface AnalyticsViewProps {
  onNavigateToReports?: () => void;
  onNavigateToInventory?: () => void;
  onNavigateToRegister?: () => void;
}

type SkuSortField =
  | 'name'
  | 'netUnitsSold'
  | 'netRevenue'
  | 'cogsTotal'
  | 'grossProfit'
  | 'marginPct'
  | 'stockOnHand';
type CatSortField =
  | 'category'
  | 'unitsSold'
  | 'netRevenue'
  | 'cogsTotal'
  | 'grossProfit'
  | 'marginPct';
type TxSortField = 'timestamp' | 'receiptNumber' | 'netSales' | 'status';

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  onNavigateToInventory,
  onNavigateToRegister,
}) => {
  const {
    transactions,
    products,
    locations,
    currentLocation,
    currentBusiness,
    systemUsers,
    currentUser,
    superAdminAuditLogs,
    shiftHistory,
    analyticsRollups,
    analyticsTargets,
    analyticsSavedViews,
    isBiSyncing,
    biLastSyncedAt,
    syncAnalyticsRollups,
    saveAnalyticsTarget,
    saveAnalyticsSavedView,
    deleteAnalyticsSavedView,
    openReturnsModal,
    setActiveReceipt,
    openBusinessSettings,
    canResetStore,
    showToast,
    loadHistoricalTransactions,
    isLoadingOlderTransactions,
    olderTransactionsLoadedFrom,
    isDemoSession,
    can,
  } = usePos();

  const canViewCost = can('viewCostPrice');
  const canProcessReturns = can('processRefunds');
  const currency = currentBusiness?.currency || currentLocation?.currency || 'KES';

  // Top-level mode: Executive BI Dashboard vs 15-Report Suite
  const [viewMode, setViewMode] = useState<'overview' | 'reports'>('overview');

  // Filter & Slice Controls
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>(() => calculateDateRange('last_30d'));
  const [focusTab, setFocusTab] = useState<BiFocusTab>('sku_margin');
  const [chartMetric, setChartMetric] = useState<BiChartMetric>('net_sales');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSavedViewId, setActiveSavedViewId] = useState<string | null>(null);

  // Sorting state per ledger mode
  const [skuSort, setSkuSort] = useState<{ field: SkuSortField; dir: 'asc' | 'desc' }>({
    field: 'netRevenue',
    dir: 'desc',
  });
  const [catSort, setCatSort] = useState<{ field: CatSortField; dir: 'asc' | 'desc' }>({
    field: 'netRevenue',
    dir: 'desc',
  });
  const [txSort, setTxSort] = useState<{ field: TxSortField; dir: 'asc' | 'desc' }>({
    field: 'timestamp',
    dir: 'desc',
  });

  // Menus, Drawers, Modals
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [inspectorTarget, setInspectorTarget] = useState<BiInspectorTarget>(null);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
  const [printData, setPrintData] = useState<ReportPrintData | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts (`/` focuses search, `Escape` closes menus)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (e.key === '/' && !isTyping && viewMode === 'overview') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setIsToolsMenuOpen(false);
      }
    };
    const onClickOutside = (e: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setIsToolsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, [viewMode]);

  // Hydrate older cloud history on demand if user chooses a window > 30d
  useEffect(() => {
    if (isDemoSession) return;
    const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const needsOlder =
      dateRange.preset === 'all' || dateRange.start.getTime() < thirtyDaysAgoMs;
    if (!needsOlder) return;

    const startIso = dateRange.start.toISOString();
    const endIso = dateRange.end.toISOString();
    if (!olderTransactionsLoadedFrom || startIso < olderTransactionsLoadedFrom) {
      loadHistoricalTransactions(startIso, endIso).catch(() => {});
    }
  }, [dateRange, isDemoSession, olderTransactionsLoadedFrom, loadHistoricalTransactions]);

  const productMap = useMemo(() => {
    const m = new Map<string, Product>();
    products.forEach((p) => m.set(p.id, p));
    return m;
  }, [products]);

  // Transactions inside active slice
  const filteredTxs = useMemo(() => {
    return (transactions || []).filter((tx) => {
      if (selectedLocationId !== 'all' && tx.locationId !== selectedLocationId) return false;
      return isTimestampInRange(tx.timestamp, dateRange);
    });
  }, [transactions, selectedLocationId, dateRange]);

  // Deterministic Executive P&L Engine
  const summary = useMemo(
    () =>
      calculateExecutivePLSummary({
        dateRange,
        selectedLocationId,
        transactions: transactions || [],
        rollups: analyticsRollups || [],
        products: products || [],
        shifts: shiftHistory || [],
      }),
    [dateRange, selectedLocationId, transactions, analyticsRollups, products, shiftHistory]
  );

  const skuRows = useMemo(
    () =>
      calculateSkuProfitability({
        transactions: transactions || [],
        products: products || [],
        dateRange,
        selectedLocationId,
      }),
    [transactions, products, dateRange, selectedLocationId]
  );

  const categoryRows = useMemo(() => calculateCategoryProfitability(skuRows), [skuRows]);

  const branchBenchmarks = useMemo(
    () =>
      calculateBranchBenchmarks({
        locations: locations || [],
        transactions: transactions || [],
        rollups: analyticsRollups || [],
        products: products || [],
        shifts: shiftHistory || [],
        dateRange,
      }),
    [locations, transactions, analyticsRollups, products, shiftHistory, dateRange]
  );

  const tenderMix = useMemo(
    () =>
      calculateTenderMix({
        transactions: transactions || [],
        rollups: analyticsRollups || [],
        dateRange,
        selectedLocationId,
      }),
    [transactions, analyticsRollups, dateRange, selectedLocationId]
  );

  const trendSeries = useMemo(
    () =>
      buildExecutiveTrendSeries({
        dateRange,
        selectedLocationId,
        transactions: transactions || [],
        rollups: analyticsRollups || [],
        products: products || [],
      }),
    [dateRange, selectedLocationId, transactions, analyticsRollups, products]
  );

  // Active target for current month & branch scope
  const activePeriodKey = getPeriodKey();
  const activeTarget = useMemo(() => {
    return (
      analyticsTargets.find(
        (t) => t.locationId === selectedLocationId && t.periodKey === activePeriodKey
      ) ||
      analyticsTargets.find((t) => t.locationId === 'all' && t.periodKey === activePeriodKey)
    );
  }, [analyticsTargets, selectedLocationId, activePeriodKey]);

  const targetPacing = useMemo(
    () => evaluateTargetPacing(summary, activeTarget),
    [summary, activeTarget]
  );

  // Search + Sort for each ledger tab
  const q = searchQuery.trim().toLowerCase();

  const sortedSkuRows = useMemo(() => {
    const filtered = q
      ? skuRows.filter(
          (r) =>
            r.name.toLowerCase().includes(q) ||
            r.sku.toLowerCase().includes(q) ||
            r.category.toLowerCase().includes(q)
        )
      : skuRows;

    return [...filtered].sort((a, b) => {
      const dir = skuSort.dir === 'asc' ? 1 : -1;
      if (skuSort.field === 'name') return a.name.localeCompare(b.name) * dir;
      return ((a[skuSort.field] || 0) - (b[skuSort.field] || 0)) * dir;
    });
  }, [skuRows, q, skuSort]);

  const sortedCategoryRows = useMemo(() => {
    const filtered = q
      ? categoryRows.filter((r) => r.category.toLowerCase().includes(q))
      : categoryRows;

    return [...filtered].sort((a, b) => {
      const dir = catSort.dir === 'asc' ? 1 : -1;
      if (catSort.field === 'category') return a.category.localeCompare(b.category) * dir;
      return ((a[catSort.field] || 0) - (b[catSort.field] || 0)) * dir;
    });
  }, [categoryRows, q, catSort]);

  const sortedTxs = useMemo(() => {
    const filtered = q
      ? filteredTxs.filter(
          (tx) =>
            tx.receiptNumber.toLowerCase().includes(q) ||
            tx.cashierName.toLowerCase().includes(q) ||
            tx.locationName.toLowerCase().includes(q) ||
            tx.items.some((it) => it.productName.toLowerCase().includes(q))
        )
      : filteredTxs;

    return [...filtered].sort((a, b) => {
      const dir = txSort.dir === 'asc' ? 1 : -1;
      if (txSort.field === 'receiptNumber') return a.receiptNumber.localeCompare(b.receiptNumber) * dir;
      if (txSort.field === 'status') return a.status.localeCompare(b.status) * dir;
      if (txSort.field === 'netSales') {
        const finA = computeTransactionFinancials(a, productMap).netSales;
        const finB = computeTransactionFinancials(b, productMap).netSales;
        return (finA - finB) * dir;
      }
      return (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) * dir;
    });
  }, [filteredTxs, q, txSort, productMap]);

  const fmtMoney = (n: number) =>
    `${currency} ${n.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const fmtDelta = (val: number | null, suffix = '%') => {
    if (val === null || isNaN(val)) return 'No prior baseline';
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(1)}${suffix} vs prior`;
  };

  const selectedLocationName =
    selectedLocationId === 'all'
      ? 'All Branches'
      : locations.find((l) => l.id === selectedLocationId)?.name || 'Branch';

  const lastSyncDisplay = biLastSyncedAt
    ? `Synced ${new Date(biLastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : isDemoSession
    ? 'Sandbox preview'
    : 'Live cache';

  const handleApplySavedView = (viewId: string) => {
    const view = analyticsSavedViews.find((v) => v.id === viewId);
    if (!view) return;
    setActiveSavedViewId(view.id);
    setSelectedLocationId(view.locationId || 'all');
    setDateRange(calculateDateRange(view.preset, view.customStartIso, view.customEndIso));
    setFocusTab(view.focusTab);
    setChartMetric(
      !canViewCost && (view.chartMetric === 'gross_profit' || view.chartMetric === 'margin_pct')
        ? 'net_sales'
        : view.chartMetric
    );
    showToast(`Applied view "${view.name}"`, 'info');
  };

  const handleResetFilters = () => {
    setSelectedLocationId('all');
    setDateRange(calculateDateRange('last_30d'));
    setSearchQuery('');
    setActiveSavedViewId(null);
  };

  const handleExportCsv = () => {
    setIsToolsMenuOpen(false);
    exportBiTableToCsv({
      mode: focusTab,
      skuRows: sortedSkuRows,
      categoryRows: sortedCategoryRows,
      transactions: sortedTxs,
      productMap,
      includeCostPrice: canViewCost,
      currency,
    });
    showToast('Exported BI table CSV.', 'success');
  };

  const handleOpenPrintSummary = () => {
    setIsToolsMenuOpen(false);
    const activeLoc =
      locations.find((l) => l.id === selectedLocationId) || currentLocation;

    const headers =
      focusTab === 'sku_margin'
        ? [
            'SKU',
            'Product',
            'Units',
            'Net Revenue',
            ...(canViewCost ? ['COGS', 'Gross Profit', 'Margin %'] : []),
          ]
        : focusTab === 'category_pl'
        ? [
            'Category',
            'SKUs',
            'Units',
            'Net Revenue',
            ...(canViewCost ? ['COGS', 'Gross Profit', 'Margin %'] : []),
          ]
        : ['Receipt #', 'Cashier', 'Branch', 'Tender', 'Net Total'];

    const rows =
      focusTab === 'sku_margin'
        ? sortedSkuRows.slice(0, 60).map((r) => [
            r.sku,
            r.name,
            r.netUnitsSold,
            fmtMoney(r.netRevenue),
            ...(canViewCost
              ? [fmtMoney(r.cogsTotal), fmtMoney(r.grossProfit), `${r.marginPct.toFixed(1)}%`]
              : []),
          ])
        : focusTab === 'category_pl'
        ? sortedCategoryRows.map((r) => [
            r.category,
            r.skuCount,
            r.unitsSold,
            fmtMoney(r.netRevenue),
            ...(canViewCost
              ? [fmtMoney(r.cogsTotal), fmtMoney(r.grossProfit), `${r.marginPct.toFixed(1)}%`]
              : []),
          ])
        : sortedTxs.slice(0, 60).map((tx) => {
            const fin = computeTransactionFinancials(tx, productMap);
            return [
              tx.receiptNumber,
              tx.cashierName,
              tx.locationName,
              tx.paymentMethod.toUpperCase(),
              fmtMoney(fin.netSales),
            ];
          });

    setPrintData({
      meta: {
        id: 'profit_margin',
        title: 'Executive P&L & Margin Statement',
        category: 'phase1',
        description: `${selectedLocationName} · ${dateRange.label}`,
        phaseLabel: 'Executive BI',
      },
      dateRange,
      business: currentBusiness,
      location: activeLoc,
      generatedBy: currentUser?.email || 'Store Manager',
      summaryCards: [
        { label: 'Net Revenue', value: fmtMoney(summary.netRevenue), sub: `${summary.ordersCount} orders` },
        {
          label: 'COGS',
          value: canViewCost ? fmtMoney(summary.cogsTotal) : 'Restricted',
          sub: `${summary.costCoveragePct.toFixed(0)}% costed`,
        },
        {
          label: 'Gross Profit',
          value: canViewCost ? fmtMoney(summary.grossProfit) : 'Restricted',
          sub: canViewCost ? `${summary.grossMarginPct.toFixed(1)}% margin` : undefined,
        },
        {
          label: 'Net Operating Profit',
          value: canViewCost ? fmtMoney(summary.netOperatingProfit) : 'Restricted',
          sub: `After ${fmtMoney(summary.operatingExpenses)} shift expenses`,
        },
      ],
      tableHeaders: headers,
      tableRows: rows,
      footerNotes: [
        `Tax Collected (${currentBusiness?.taxSettings?.taxLabel || 'VAT'}): ${fmtMoney(summary.taxTotal)}`,
        `Discounts Granted: ${fmtMoney(summary.discountsTotal)} · Refunds: ${fmtMoney(summary.refundsTotal)}`,
      ],
    });
  };

  const toggleSkuSort = (field: SkuSortField) => {
    setSkuSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: field === 'name' ? 'asc' : 'desc' }
    );
  };

  const toggleCatSort = (field: CatSortField) => {
    setCatSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: field === 'category' ? 'asc' : 'desc' }
    );
  };

  const toggleTxSort = (field: TxSortField) => {
    setTxSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { field, dir: 'desc' }
    );
  };

  const renderSortIcon = (active: boolean, dir: 'asc' | 'desc') => {
    if (!active) return <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />;
    return dir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-blue-600 shrink-0" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-600 shrink-0" />
    );
  };

  const isFiltered =
    selectedLocationId !== 'all' ||
    dateRange.preset !== 'last_30d' ||
    searchQuery.trim().length > 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden">
      {/* ====================================================================
          Sticky Single-Line Top Bar (Mirrors InventoryView Header Discipline)
         ==================================================================== */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">
            Business Intelligence &amp; Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums flex items-center gap-2 flex-wrap">
            <span>{summary.ordersCount.toLocaleString()} orders</span>
            <span aria-hidden="true">·</span>
            <span>{skuRows.length} active SKUs</span>
            <span aria-hidden="true">·</span>
            <span>{lastSyncDisplay}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{currency}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Cloud Rollup Sync Icon Button */}
          <button
            type="button"
            onClick={() => syncAnalyticsRollups(false)}
            disabled={isBiSyncing}
            title="Sync daily P&L rollup snapshots to Firestore"
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isBiSyncing ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* Grouped Tools Dropdown */}
          <div className="relative" ref={toolsMenuRef}>
            <button
              type="button"
              onClick={() => setIsToolsMenuOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-medium transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <Wrench className="w-3.5 h-3.5 text-slate-500" />
              <span>Tools</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isToolsMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 z-30">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export Active Table CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenPrintSummary}
                  className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Print P&amp;L Statement (A4)</span>
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  type="button"
                  onClick={() => {
                    setIsToolsMenuOpen(false);
                    setIsSaveViewModalOpen(true);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                >
                  <Bookmark className="w-3.5 h-3.5 text-slate-500" />
                  <span>Save Current BI View</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsToolsMenuOpen(false);
                    setIsTargetModalOpen(true);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                >
                  <Target className="w-3.5 h-3.5 text-slate-500" />
                  <span>Set Monthly Goals &amp; Floor</span>
                </button>
                {!isDemoSession && (
                  <button
                    type="button"
                    disabled={isLoadingOlderTransactions}
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      loadHistoricalTransactions(
                        dateRange.start.toISOString(),
                        dateRange.end.toISOString()
                      ).catch(() => {});
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
                  >
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {isLoadingOlderTransactions
                        ? 'Loading older records...'
                        : 'Load Older Cloud History'}
                    </span>
                  </button>
                )}
                {canResetStore(currentBusiness?.id || '').allowed && (
                  <>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        openBusinessSettings('reset');
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs text-rose-700 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                      <span>Clean Zero Store Reset</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Primary Action Toggle: Executive BI vs 15-Report Suite */}
          <button
            type="button"
            id="analytics-suite-toggle-btn"
            onClick={() =>
              setViewMode((prev) => (prev === 'overview' ? 'reports' : 'overview'))
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
          >
            {viewMode === 'overview' ? (
              <>
                <BarChart3 className="w-4 h-4" />
                <span>Reporting Suite (15)</span>
              </>
            ) : (
              <>
                <LayoutDashboard className="w-4 h-4" />
                <span>BI Overview</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ====================================================================
          Main Scrollable Canvas
         ==================================================================== */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 pb-24 lg:pb-8">
        {viewMode === 'reports' ? (
          <>
            <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="inline-flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedLocationId}
                    onChange={(e) => setSelectedLocationId(e.target.value)}
                    className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Locations ({locations.length})</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <GlobalTimeRangeSelector
                  currentRange={dateRange}
                  onChange={(r) => setDateRange(r)}
                />
              </div>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {filteredTxs.length} receipts in scope
              </span>
            </div>

            <ReportViewContainer
              transactions={transactions}
              products={products}
              locations={locations}
              cashiers={systemUsers}
              currentBusiness={currentBusiness}
              currentLocation={currentLocation}
              currentUserEmail={currentUser?.email || 'admin@sokopos.co.ke'}
              auditLogs={superAdminAuditLogs}
              dateRange={dateRange}
              selectedLocationId={selectedLocationId}
            />
          </>
        ) : (
          <>
            {/* ----------------------------------------------------------------
                1. Saved Views & Monthly Target Pacing Strip
               ---------------------------------------------------------------- */}
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap shrink-0">
                  Saved Views:
                </span>
                {analyticsSavedViews.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setIsSaveViewModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-slate-300 text-xs text-slate-600 hover:border-blue-400 hover:text-blue-600 transition cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Bookmark className="w-3 h-3" />
                    <span>Save current filter view</span>
                  </button>
                ) : (
                  analyticsSavedViews.map((v) => {
                    const active = activeSavedViewId === v.id;
                    return (
                      <div
                        key={v.id}
                        className={`inline-flex items-center rounded-lg border text-xs transition shrink-0 ${
                          active
                            ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleApplySavedView(v.id)}
                          className="px-2.5 py-1 cursor-pointer whitespace-nowrap"
                        >
                          {v.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (activeSavedViewId === v.id) setActiveSavedViewId(null);
                            deleteAnalyticsSavedView(v.id);
                          }}
                          title="Delete saved view"
                          className="pr-2 pl-0.5 py-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                {activeTarget && activeTarget.revenueTarget > 0 ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="min-w-[170px]">
                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 mb-1">
                        <span>{activePeriodKey} Target Pace</span>
                        <span className="font-mono tabular-nums font-semibold text-slate-900">
                          {targetPacing.revenuePct.toFixed(0)}% of {fmtMoney(activeTarget.revenueTarget)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            targetPacing.revenueStatus === 'on_track'
                              ? 'bg-emerald-600'
                              : targetPacing.revenueStatus === 'watch'
                              ? 'bg-amber-500'
                              : 'bg-rose-600'
                          }`}
                          style={{ width: `${Math.min(100, targetPacing.revenuePct)}%` }}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsTargetModalOpen(true)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer whitespace-nowrap"
                    >
                      Edit Goal
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsTargetModalOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 transition cursor-pointer whitespace-nowrap"
                  >
                    <Target className="w-3.5 h-3.5 text-slate-400" />
                    <span>Set {activePeriodKey} Revenue &amp; Margin Target</span>
                  </button>
                )}
              </div>
            </div>

            {/* ----------------------------------------------------------------
                2. Executive P&L 4-Column Hairline Grid (Single Elevation)
               ---------------------------------------------------------------- */}
            <section
              aria-label="Executive P&L Summary"
              className="bg-white rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 overflow-hidden"
            >
              {/* Net Revenue */}
              <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-500">Net Revenue</span>
                  <span
                    className={`text-[11px] font-mono tabular-nums font-medium ${
                      summary.netRevenueDeltaPct === null
                        ? 'text-slate-400'
                        : summary.netRevenueDeltaPct >= 0
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {fmtDelta(summary.netRevenueDeltaPct)}
                  </span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1.5 tracking-tight">
                  {fmtMoney(summary.netRevenue)}
                </p>
                <p className="text-xs text-slate-500 font-mono tabular-nums mt-2">
                  Gross {fmtMoney(summary.grossSales)} · Disc -{fmtMoney(summary.discountsTotal)}
                </p>
              </div>

              {/* Gross Profit & COGS */}
              <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-500">Gross Profit &amp; Margin</span>
                  <span
                    className={`text-[11px] font-mono tabular-nums font-medium ${
                      !canViewCost || summary.marginDeltaPts === null
                        ? 'text-slate-400'
                        : summary.marginDeltaPts >= 0
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {canViewCost
                      ? summary.marginDeltaPts !== null
                        ? `${summary.marginDeltaPts >= 0 ? '+' : ''}${summary.marginDeltaPts.toFixed(1)} pts`
                        : `${summary.grossMarginPct.toFixed(1)}% margin`
                      : 'Restricted'}
                  </span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1.5 tracking-tight">
                  {canViewCost ? (
                    fmtMoney(summary.grossProfit)
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-slate-400 text-lg">
                      <Lock className="w-4 h-4" /> ••••
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 font-mono tabular-nums mt-2">
                  {canViewCost
                    ? `COGS ${fmtMoney(summary.cogsTotal)} · ${summary.grossMarginPct.toFixed(1)}% GP`
                    : 'Cost visibility restricted by role'}
                </p>
              </div>

              {/* Net Operating Profit */}
              <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-500">Net Operating Profit</span>
                  <span className="text-[11px] font-mono tabular-nums text-slate-500">
                    {canViewCost ? `${summary.netOperatingMarginPct.toFixed(1)}% op margin` : '—'}
                  </span>
                </div>
                <p
                  className={`text-xl sm:text-2xl font-bold font-mono tabular-nums mt-1.5 tracking-tight ${
                    !canViewCost
                      ? 'text-slate-400'
                      : summary.netOperatingProfit >= 0
                      ? 'text-slate-900'
                      : 'text-rose-700'
                  }`}
                >
                  {canViewCost ? fmtMoney(summary.netOperatingProfit) : '••••'}
                </p>
                <p className="text-xs text-slate-500 font-mono tabular-nums mt-2">
                  Petty Cash -{fmtMoney(summary.operatingExpenses)} · Tax {fmtMoney(summary.taxTotal)}
                </p>
              </div>

              {/* Orders & Avg Basket */}
              <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-500">Orders &amp; Avg Basket</span>
                  <span
                    className={`text-[11px] font-mono tabular-nums font-medium ${
                      summary.ordersDeltaPct === null
                        ? 'text-slate-400'
                        : summary.ordersDeltaPct >= 0
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {fmtDelta(summary.ordersDeltaPct)}
                  </span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1.5 tracking-tight">
                  {summary.ordersCount.toLocaleString()} orders
                </p>
                <p className="text-xs text-slate-500 font-mono tabular-nums mt-2">
                  Avg {fmtMoney(summary.avgBasket)} · {summary.refundedOrdersCount} returns
                </p>
              </div>
            </section>

            {/* ----------------------------------------------------------------
                3. Trajectory Chart + Tender Mix / Branch Benchmark Panels
               ---------------------------------------------------------------- */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-8">
                <ExecutiveTrendVisualizer
                  data={trendSeries}
                  metric={chartMetric}
                  onMetricChange={setChartMetric}
                  currency={currency}
                  canViewCost={canViewCost}
                  usedRollupHistory={summary.usedRollupHistory}
                  dateLabel={dateRange.label}
                  isLoading={isLoadingOlderTransactions}
                />
              </div>

              <div className="lg:col-span-4 space-y-5">
                {/* Payment Channel Mix */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-900">Tender Channel Mix</h3>
                    <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                      Net realized
                    </span>
                  </div>
                  <div className="space-y-3">
                    {tenderMix.map((t) => (
                      <div key={t.method}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-slate-700">{t.label}</span>
                          <span className="font-mono tabular-nums text-slate-900 font-semibold">
                            {fmtMoney(t.amount)}{' '}
                            <span className="text-slate-400 font-normal">
                              ({t.sharePct.toFixed(1)}%)
                            </span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              t.method === 'mpesa'
                                ? 'bg-emerald-600'
                                : t.method === 'cash'
                                ? 'bg-blue-600'
                                : t.method === 'card'
                                ? 'bg-slate-700'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, t.sharePct)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Multi-Branch Benchmark */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-900">Branch P&amp;L Split</h3>
                    <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                      {branchBenchmarks.length} node{branchBenchmarks.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  {branchBenchmarks.length === 0 ? (
                    <p className="text-xs text-slate-500">No active branches configured.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {branchBenchmarks.map((b) => (
                        <button
                          key={b.locationId}
                          type="button"
                          onClick={() =>
                            setSelectedLocationId((prev) =>
                              prev === b.locationId ? 'all' : b.locationId
                            )
                          }
                          className={`w-full py-2 flex items-center justify-between text-left hover:bg-slate-50 px-1.5 -mx-1.5 rounded transition cursor-pointer ${
                            selectedLocationId === b.locationId ? 'bg-blue-50/70' : ''
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {b.locationName}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                              {b.ordersCount} orders · {b.revenueSharePct.toFixed(0)}% share
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-mono font-semibold text-slate-900 tabular-nums">
                              {fmtMoney(b.netRevenue)}
                            </p>
                            <p className="text-[11px] font-mono text-emerald-700 tabular-nums">
                              {canViewCost ? `${b.marginPct.toFixed(1)}% GP` : '••••'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ----------------------------------------------------------------
                4. Inventory-Aligned Filter Bar + Sortable Multi-Tab Ledger
               ---------------------------------------------------------------- */}
            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Toolbar */}
              <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Segmented Focus Tabs */}
                <div className="inline-flex items-center p-0.5 rounded-lg border border-slate-200 bg-slate-50 self-start overflow-x-auto max-w-full">
                  {(
                    [
                      { id: 'sku_margin', label: `SKU Profitability (${sortedSkuRows.length})` },
                      { id: 'category_pl', label: `Category P&L (${sortedCategoryRows.length})` },
                      { id: 'ledger', label: `Sales Ledger (${sortedTxs.length})` },
                    ] as const
                  ).map((tab) => {
                    const active = focusTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setFocusTab(tab.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition cursor-pointer whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-white text-slate-900 border border-slate-200 font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Search + Branch + Time Range + Export */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[200px] sm:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter SKU, category, receipt ( / )"
                      className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                        aria-label="Clear filter"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="inline-flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <select
                      value={selectedLocationId}
                      onChange={(e) => {
                        setSelectedLocationId(e.target.value);
                        setActiveSavedViewId(null);
                      }}
                      className="text-xs font-medium text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                    >
                      <option value="all">All Branches ({locations.length})</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <GlobalTimeRangeSelector
                    currentRange={dateRange}
                    onChange={(r) => {
                      setDateRange(r);
                      setActiveSavedViewId(null);
                    }}
                  />

                  {isFiltered && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer whitespace-nowrap"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Cost Coverage Transparency Notice when uncosted revenue exists */}
              {canViewCost && summary.uncostedRevenue > 0 && summary.netRevenue > 0 && (
                <div className="px-4 py-2 border-b border-amber-200 bg-amber-50/70 flex items-center justify-between gap-3 text-xs text-amber-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">
                      Cost basis verified on{' '}
                      <strong className="font-mono tabular-nums">
                        {summary.costCoveragePct.toFixed(1)}%
                      </strong>{' '}
                      of net sales ({fmtMoney(summary.uncostedRevenue)} sold on SKUs missing buying prices).
                    </span>
                  </div>
                  {onNavigateToInventory && (
                    <button
                      type="button"
                      onClick={onNavigateToInventory}
                      className="font-semibold text-amber-900 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Update Buying Prices
                    </button>
                  )}
                </div>
              )}

              {/* Desktop Sticky-Header Sortable Tables */}
              <div className="hidden md:block max-h-[540px] overflow-auto">
                {focusTab === 'sku_margin' && (
                  <table className="w-full text-left text-xs text-slate-700 border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0] text-[11px] font-semibold text-slate-600">
                      <tr>
                        <th className="py-2.5 px-4">
                          <button
                            type="button"
                            onClick={() => toggleSkuSort('name')}
                            className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                          >
                            <span>SKU &amp; Product</span>
                            {renderSortIcon(skuSort.field === 'name', skuSort.dir)}
                          </button>
                        </th>
                        <th className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => toggleSkuSort('netUnitsSold')}
                            className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                          >
                            <span>Net Units</span>
                            {renderSortIcon(skuSort.field === 'netUnitsSold', skuSort.dir)}
                          </button>
                        </th>
                        <th className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => toggleSkuSort('netRevenue')}
                            className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                          >
                            <span>Net Revenue</span>
                            {renderSortIcon(skuSort.field === 'netRevenue', skuSort.dir)}
                          </button>
                        </th>
                        <th className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => toggleSkuSort('cogsTotal')}
                            className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                          >
                            <span>COGS</span>
                            {renderSortIcon(skuSort.field === 'cogsTotal', skuSort.dir)}
                          </button>
                        </th>
                        <th className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => toggleSkuSort('grossProfit')}
                            className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                          >
                            <span>Gross Profit</span>
                            {renderSortIcon(skuSort.field === 'grossProfit', skuSort.dir)}
                          </button>
                        </th>
                        <th className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => toggleSkuSort('marginPct')}
                            className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                          >
                            <span>Margin %</span>
                            {renderSortIcon(skuSort.field === 'marginPct', skuSort.dir)}
                          </button>
                        </th>
                        <th className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => toggleSkuSort('stockOnHand')}
                            className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                          >
                            <span>Stock / Cover</span>
                            {renderSortIcon(skuSort.field === 'stockOnHand', skuSort.dir)}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedSkuRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center">
                            <p className="text-sm font-semibold text-slate-700">
                              No SKU sales recorded for this filter slice
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Adjust your date window, branch filter, or complete a checkout on the POS register.
                            </p>
                            {onNavigateToRegister && (
                              <button
                                type="button"
                                onClick={onNavigateToRegister}
                                className="mt-3 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition cursor-pointer"
                              >
                                Open POS Register
                              </button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        sortedSkuRows.map((r) => (
                          <tr
                            key={r.productId}
                            onClick={() =>
                              setInspectorTarget({ type: 'sku', productId: r.productId })
                            }
                            className="hover:bg-slate-50 transition cursor-pointer"
                          >
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2">
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-900 truncate max-w-[240px]">
                                    {r.name}
                                  </p>
                                  <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                                    {r.sku} · {r.category}
                                  </p>
                                </div>
                                {canViewCost && !r.hasCostData && (
                                  <span
                                    title="Missing buyingPrice in Inventory"
                                    className="text-amber-600 shrink-0"
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-800">
                              {r.netUnitsSold}
                              {r.unitsRefunded > 0 && (
                                <span className="text-[10px] text-rose-600 block">
                                  -{r.unitsRefunded} ret
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                              {fmtMoney(r.netRevenue)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                              {canViewCost ? fmtMoney(r.cogsTotal) : '••••'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                              {canViewCost ? fmtMoney(r.grossProfit) : '••••'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">
                              {!canViewCost ? (
                                <span className="text-slate-400">Restricted</span>
                              ) : !r.hasCostData ? (
                                <span className="text-amber-700">Uncosted</span>
                              ) : (
                                <span
                                  className={
                                    r.marginPct >= 25
                                      ? 'text-emerald-700'
                                      : r.marginPct >= 12
                                      ? 'text-amber-700'
                                      : 'text-rose-700'
                                  }
                                >
                                  {r.marginPct.toFixed(1)}%
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                              {r.stockOnHand}{' '}
                              <span className="text-slate-400 text-[11px]">
                                {r.daysOfCover !== null ? `(${r.daysOfCover}d)` : ''}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {focusTab === 'category_pl' && (
                  <table className="w-full text-left text-xs text-slate-700 border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0] text-[11px] font-semibold text-slate-600">
                      <tr>
                        <th className="py-2.5 px-4">
                          <button
                            type="button"
                            onClick={() => toggleCatSort('category')}
                            className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                          >
                            <span>Category</span>
                            {renderSortIcon(catSort.field === 'category', catSort.dir)}
                          </button>
                        </th>
                        <th className="py-2.5 px-3 text-right">SKUs</th>
                        <th className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => toggleCatSort('unitsSold')}
                            className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                          >
                            <span>Units</span>
                            {renderSortIcon(catSort.field === 'unitsSold', catSort.dir)}
                          </button>
                        </th>
                        <th className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => toggleCatSort('netRevenue')}
                            className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                          >
                            <span>Net Revenue</span>
                            {renderSortIcon(catSort.field === 'netRevenue', catSort.dir)}
                          </button>
                        </th>
                        <th className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => toggleCatSort('cogsTotal')}
                            className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                          >
                            <span>COGS</span>
                            {renderSortIcon(catSort.field === 'cogsTotal', catSort.dir)}
                          </button>
                        </th>
                        <th className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => toggleCatSort('grossProfit')}
                            className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                          >
                            <span>Gross Profit</span>
                            {renderSortIcon(catSort.field === 'grossProfit', catSort.dir)}
                          </button>
                        </th>
                        <th className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => toggleCatSort('marginPct')}
                            className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                          >
                            <span>Margin %</span>
                            {renderSortIcon(catSort.field === 'marginPct', catSort.dir)}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedCategoryRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-500">
                            No category P&amp;L activity recorded in this window.
                          </td>
                        </tr>
                      ) : (
                        sortedCategoryRows.map((c) => (
                          <tr
                            key={c.category}
                            onClick={() =>
                              setInspectorTarget({ type: 'category', category: c.category })
                            }
                            className="hover:bg-slate-50 transition cursor-pointer"
                          >
                            <td className="py-2.5 px-4 font-semibold text-slate-900">
                              {c.category}
                              <span className="ml-2 text-[11px] font-mono font-normal text-slate-400">
                                {c.revenueSharePct.toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                              {c.skuCount}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                              {c.unitsSold}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                              {fmtMoney(c.netRevenue)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                              {canViewCost ? fmtMoney(c.cogsTotal) : '••••'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                              {canViewCost ? fmtMoney(c.grossProfit) : '••••'}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold">
                              {canViewCost ? `${c.marginPct.toFixed(1)}%` : 'Restricted'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {focusTab === 'ledger' && (
                  <table className="w-full text-left text-xs text-slate-700 border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0] text-[11px] font-semibold text-slate-600">
                      <tr>
                        <th className="py-2.5 px-4">
                          <button
                            type="button"
                            onClick={() => toggleTxSort('receiptNumber')}
                            className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                          >
                            <span>Receipt #</span>
                            {renderSortIcon(txSort.field === 'receiptNumber', txSort.dir)}
                          </button>
                        </th>
                        <th className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => toggleTxSort('timestamp')}
                            className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                          >
                            <span>Timestamp</span>
                            {renderSortIcon(txSort.field === 'timestamp', txSort.dir)}
                          </button>
                        </th>
                        <th className="py-2.5 px-3">Branch &amp; Cashier</th>
                        <th className="py-2.5 px-3">Tender</th>
                        <th className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => toggleTxSort('netSales')}
                            className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                          >
                            <span>Net Total</span>
                            {renderSortIcon(txSort.field === 'netSales', txSort.dir)}
                          </button>
                        </th>
                        <th className="py-2.5 px-3 text-right">Est. Profit</th>
                        <th className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => toggleTxSort('status')}
                            className="inline-flex items-center gap-1 cursor-pointer hover:text-slate-900"
                          >
                            <span>Status</span>
                            {renderSortIcon(txSort.field === 'status', txSort.dir)}
                          </button>
                        </th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedTxs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-500">
                            No receipts found for this filter slice.
                          </td>
                        </tr>
                      ) : (
                        sortedTxs.slice(0, 100).map((tx) => {
                          const fin = computeTransactionFinancials(tx, productMap);
                          return (
                            <tr
                              key={tx.id}
                              onClick={() =>
                                setInspectorTarget({ type: 'transaction', transactionId: tx.id })
                              }
                              className="hover:bg-slate-50 transition cursor-pointer"
                            >
                              <td className="py-2.5 px-4 font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                                #{tx.receiptNumber}
                              </td>
                              <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                                {new Date(tx.timestamp).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="font-medium text-slate-900">{tx.locationName}</span>
                                <span className="text-slate-400"> · {tx.cashierName}</span>
                              </td>
                              <td className="py-2.5 px-3 uppercase font-mono text-[11px] text-slate-600 whitespace-nowrap">
                                {tx.paymentMethod.replace('_', ' ')}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                                {fmtMoney(fin.netSales)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700 whitespace-nowrap">
                                {canViewCost ? fmtMoney(fin.grossProfit) : '••••'}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span
                                  className={`text-[11px] font-semibold ${
                                    tx.status === 'refunded'
                                      ? 'text-rose-700'
                                      : tx.status === 'partially_refunded'
                                      ? 'text-amber-700'
                                      : 'text-emerald-700'
                                  }`}
                                >
                                  {tx.status === 'refunded'
                                    ? 'Refunded'
                                    : tx.status === 'partially_refunded'
                                    ? 'Partial Return'
                                    : 'Completed'}
                                </span>
                              </td>
                              <td
                                className="py-2.5 px-4 text-right whitespace-nowrap space-x-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveReceipt({
                                      ...tx,
                                      isReprint: true,
                                      reprintedAt: new Date().toISOString(),
                                    })
                                  }
                                  className="text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                                >
                                  Reprint
                                </button>
                                {canProcessReturns && tx.status !== 'refunded' && (
                                  <button
                                    type="button"
                                    onClick={() => openReturnsModal(tx)}
                                    className="text-xs font-medium text-amber-700 hover:text-amber-900 cursor-pointer"
                                  >
                                    Return
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Mobile Card List (< md) */}
              <div className="md:hidden divide-y divide-slate-100">
                {focusTab === 'sku_margin' &&
                  (sortedSkuRows.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No SKU sales recorded for this slice.
                    </div>
                  ) : (
                    sortedSkuRows.slice(0, 40).map((r) => (
                      <button
                        key={r.productId}
                        type="button"
                        onClick={() => setInspectorTarget({ type: 'sku', productId: r.productId })}
                        className="w-full p-3.5 text-left hover:bg-slate-50 flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">{r.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                            {r.sku} · {r.netUnitsSold} units · Stock {r.stockOnHand}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                            {fmtMoney(r.netRevenue)}
                          </p>
                          <p className="text-[11px] font-mono text-emerald-700 tabular-nums">
                            {canViewCost ? `${r.marginPct.toFixed(1)}% GP` : '••••'}
                          </p>
                        </div>
                      </button>
                    ))
                  ))}

                {focusTab === 'category_pl' &&
                  (sortedCategoryRows.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No category P&amp;L activity recorded for this slice.
                    </div>
                  ) : (
                    sortedCategoryRows.map((c) => (
                      <button
                        key={c.category}
                        type="button"
                        onClick={() =>
                          setInspectorTarget({ type: 'category', category: c.category })
                        }
                        className="w-full p-3.5 text-left hover:bg-slate-50 flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {c.category}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                            {c.skuCount} SKUs · {c.unitsSold} units
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                            {fmtMoney(c.netRevenue)}
                          </p>
                          <p className="text-[11px] font-mono text-emerald-700 tabular-nums">
                            {canViewCost ? `${c.marginPct.toFixed(1)}% GP` : '••••'}
                          </p>
                        </div>
                      </button>
                    ))
                  ))}

                {focusTab === 'ledger' &&
                  (sortedTxs.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No receipts found in this window.
                    </div>
                  ) : (
                    sortedTxs.slice(0, 40).map((tx) => {
                      const fin = computeTransactionFinancials(tx, productMap);
                      return (
                        <button
                          key={tx.id}
                          type="button"
                          onClick={() =>
                            setInspectorTarget({ type: 'transaction', transactionId: tx.id })
                          }
                          className="w-full p-3.5 text-left hover:bg-slate-50 flex items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                              #{tx.receiptNumber}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {tx.locationName} · {tx.cashierName}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                              {fmtMoney(fin.netSales)}
                            </p>
                            <p className="text-[11px] font-mono text-slate-500 uppercase">
                              {tx.paymentMethod.replace('_', ' ')}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  ))}
              </div>
            </section>
          </>
        )}
      </div>

      {/* ====================================================================
          Slide-Over BI Inspector Drawer & Modals
         ==================================================================== */}
      <BiInspectorDrawer
        target={inspectorTarget}
        onClose={() => setInspectorTarget(null)}
        onSelectTarget={(next) => setInspectorTarget(next)}
        skuRows={skuRows}
        categoryRows={categoryRows}
        transactions={filteredTxs}
        currency={currency}
        dateRange={dateRange}
        selectedLocationId={selectedLocationId}
        onNavigateToInventory={onNavigateToInventory}
      />

      <BiTargetModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        locations={locations}
        selectedLocationId={selectedLocationId}
        currency={currency}
        existingTargets={analyticsTargets}
        onSave={saveAnalyticsTarget}
      />

      <BiSavedViewModal
        isOpen={isSaveViewModalOpen}
        onClose={() => setIsSaveViewModalOpen(false)}
        selectedLocationName={selectedLocationName}
        dateRange={dateRange}
        focusTab={focusTab}
        chartMetric={chartMetric}
        onSave={async (name, isPinned) => {
          const saved = await saveAnalyticsSavedView({
            name,
            locationId: selectedLocationId,
            preset: dateRange.preset,
            customStartIso:
              dateRange.preset === 'custom' ? dateRange.start.toISOString() : undefined,
            customEndIso:
              dateRange.preset === 'custom' ? dateRange.end.toISOString() : undefined,
            focusTab,
            chartMetric,
            isPinned,
          });
          setActiveSavedViewId(saved.id);
        }}
      />

      <ReportPrintModal
        isOpen={Boolean(printData)}
        onClose={() => setPrintData(null)}
        data={printData}
      />
    </div>
  );
};
