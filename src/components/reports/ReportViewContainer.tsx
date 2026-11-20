import React, { useState, useMemo, useCallback, useDeferredValue, useEffect } from 'react';
import { Printer, FileSpreadsheet, Lock } from 'lucide-react';
import {
  Transaction,
  Product,
  Location,
  Cashier,
  Business,
  SuperAdminAuditEntry,
} from '../../types';
import {
  DateRange,
  ReportType,
  REPORT_REGISTRY,
  ReportCategory,
  ReportMeta,
} from '../../types/reporting';
import { exportToCsv } from '../../utils/reportCalculations';
import { ReportPrintModal } from './ReportPrintModal';
import { formatRangeDisplay } from '../../utils/dateRangeUtils';
import { usePos } from '../../context/PosContext';
import { printReportDocument } from '../../utils/reportPrinter';
import { soundFx as directSoundFx } from '../../utils/audio';
import { useActiveReportPayload } from './useActiveReportPayload';
import { ReportNavigationBar } from './ReportNavigationBar';
import { ReportSummaryGrid } from './ReportSummaryGrid';
import { ReportDataDisplay, SortState } from './ReportDataDisplay';

interface ReportViewContainerProps {
  transactions: Transaction[];
  products: Product[];
  locations: Location[];
  cashiers: Cashier[];
  currentBusiness: Business;
  currentLocation: Location;
  currentUserEmail: string;
  auditLogs: SuperAdminAuditEntry[];
  dateRange: DateRange;
  selectedLocationId: string;
}

const FREE_CORE_REPORT_IDS = new Set<ReportType>([
  'sales',
  'stock',
  'payment_methods',
  'shift_till',
]);

export const ReportViewContainer: React.FC<ReportViewContainerProps> = ({
  transactions,
  products,
  locations,
  cashiers,
  currentBusiness,
  currentLocation,
  currentUserEmail,
  auditLogs,
  dateRange,
  selectedLocationId,
}) => {
  const {
    shiftHistory,
    adminActivityLogs,
    supervisorOverrideLogs,
    suppliers,
    soundFx,
    showToast,
    setActiveReceipt,
    entitlements,
    isSuperAdmin,
    requireCapability,
  } = usePos();

  const canUseAdvancedReports = isSuperAdmin || entitlements.capabilities.advancedReportsAndExport;
  const audio = soundFx || directSoundFx;

  const [activeReportId, setActiveReportId] = useState<ReportType>('sales');
  const [phaseFilter, setPhaseFilter] = useState<'all' | ReportCategory>('phase1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  const isReportLocked = useCallback(
    (meta: ReportMeta) => !canUseAdvancedReports && !FREE_CORE_REPORT_IDS.has(meta.id),
    [canUseAdvancedReports]
  );

  // Reset sorting and pagination cleanly when switching report scope
  useEffect(() => {
    setSortState(null);
    setCurrentPage(1);
  }, [activeReportId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLocationId, dateRange, deferredSearchQuery, pageSize]);

  const handleReprintTransaction = useCallback(
    (receiptNumOrId: string) => {
      const clean = receiptNumOrId.replace(/^#/, '').trim().toLowerCase();
      const targetTx = transactions.find(
        (t) =>
          t.receiptNumber.toLowerCase() === clean ||
          t.id.toLowerCase() === clean ||
          `#${t.receiptNumber.toLowerCase()}` === clean
      );

      if (targetTx) {
        audio.playBarcodeBeep();
        setActiveReceipt({
          ...targetTx,
          isReprint: true,
          reprintedAt: new Date().toISOString(),
        });
        showToast(
          `Duplicate receipt loaded for #${targetTx.receiptNumber}. Ready to provide customer copy.`,
          'info'
        );
      } else {
        audio.playError();
        showToast(`Could not find transaction record for "${receiptNumOrId}"`, 'error');
      }
    },
    [transactions, audio, setActiveReceipt, showToast]
  );

  const activeBusinessObj: Business = useMemo(() => {
    if (currentBusiness) return currentBusiness;
    return {
      id: 'biz-default',
      name: 'SokoPoS Retail Store',
      code: 'SOKOPOS',
      ownerEmail: currentUserEmail || 'admin@sokopos.co.ke',
      ownerName: 'Super Administrator',
      createdAt: new Date().toISOString(),
      plan: 'enterprise',
      status: 'active',
      currency: 'KES',
      taxNumber: 'P051234567Z',
    };
  }, [currentBusiness, currentUserEmail]);

  const activeLocationObj: Location = useMemo(() => {
    if (selectedLocationId === 'all') {
      return {
        id: 'all',
        businessId: activeBusinessObj.id,
        name: 'All Locations (Consolidated Enterprise)',
        code: 'ALL',
        city: 'All Branches',
        address: 'All Branches & Terminals',
        phone: '',
        currency: activeBusinessObj.currency || 'KES',
        taxId: activeBusinessObj.taxNumber || '',
        isOnline: true,
        lastSynced: new Date().toISOString(),
        terminalName: 'All Terminals',
      };
    }
    const matched = locations.find((l) => l.id === selectedLocationId);
    if (matched) return matched;
    if (currentLocation) return currentLocation;
    if (locations[0]) return locations[0];
    return {
      id: 'default-loc',
      businessId: activeBusinessObj.id,
      name: 'Main Store Location',
      code: 'MAIN',
      city: 'Nairobi',
      address: 'Headquarters Terminal',
      phone: '',
      currency: activeBusinessObj.currency || 'KES',
      taxId: activeBusinessObj.taxNumber || '',
      isOnline: true,
      lastSynced: new Date().toISOString(),
      terminalName: 'Main Terminal',
    };
  }, [selectedLocationId, locations, currentLocation, activeBusinessObj]);

  const activeMeta = useMemo(
    () => REPORT_REGISTRY.find((r) => r.id === activeReportId) || REPORT_REGISTRY[0],
    [activeReportId]
  );

  const currency = activeBusinessObj.currency || 'KES';

  const filteredReportsList = useMemo(() => {
    return REPORT_REGISTRY.filter((r) => phaseFilter === 'all' || r.category === phaseFilter);
  }, [phaseFilter]);

  const reportPayload = useActiveReportPayload({
    activeReportId,
    activeMeta,
    transactions,
    products,
    locations,
    cashiers,
    shiftHistory,
    suppliers,
    adminActivityLogs,
    supervisorOverrideLogs,
    auditLogs,
    dateRange,
    selectedLocationId,
    activeBusinessObj,
    activeLocationObj,
    currentUserEmail,
    currency,
    searchQuery: deferredSearchQuery,
  });

  const handleSelectReport = useCallback(
    (report: ReportMeta) => {
      if (isReportLocked(report)) {
        requireCapability('advancedReportsAndExport');
        return;
      }
      setActiveReportId(report.id);
    },
    [isReportLocked, requireCapability]
  );

  const handleToggleSort = useCallback((colIndex: number) => {
    setSortState((prev) => {
      if (!prev || prev.colIndex !== colIndex) {
        return { colIndex, dir: 'asc' };
      }
      if (prev.dir === 'asc') {
        return { colIndex, dir: 'desc' };
      }
      return null;
    });
    setCurrentPage(1);
  }, []);

  const handleInstantCsv = useCallback(() => {
    if (!requireCapability('advancedReportsAndExport')) return;
    const filename = `${activeBusinessObj.name
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()}_${activeMeta.id}_${Date.now()}`;
    const hasAction = reportPayload.tableHeaders.some((h) => h.toLowerCase() === 'action');
    const headers = hasAction
      ? reportPayload.tableHeaders.filter((h) => h.toLowerCase() !== 'action')
      : reportPayload.tableHeaders;
    const rows = hasAction
      ? reportPayload.tableRows.map((r) => r.slice(0, headers.length))
      : reportPayload.tableRows;
    exportToCsv(filename, headers, rows);
  }, [requireCapability, activeBusinessObj.name, activeMeta.id, reportPayload]);

  const handleQuickPrint = useCallback(() => {
    if (!requireCapability('advancedReportsAndExport')) return;
    audio?.playSuccess?.();
    showToast(`Sending ${reportPayload.meta.title} directly to printer...`, 'info');
    printReportDocument(reportPayload);
  }, [requireCapability, audio, showToast, reportPayload]);

  const handleOpenPrintPreview = useCallback(() => {
    if (!requireCapability('advancedReportsAndExport')) return;
    audio?.playBeep?.();
    setIsPrintModalOpen(true);
  }, [requireCapability, audio]);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Report Selection Navigation */}
      <ReportNavigationBar
        phaseFilter={phaseFilter}
        onSelectPhase={setPhaseFilter}
        reports={filteredReportsList}
        activeReportId={activeReportId}
        onSelectReport={handleSelectReport}
        isReportLocked={isReportLocked}
      />

      {/* Active Report Workspace Panel */}
      <section
        id="active-report-panel"
        role="tabpanel"
        aria-labelledby={`report-select-${activeReportId}-btn`}
        className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 space-y-5"
      >
        {/* Report Title & Action Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {activeMeta.title}
              </h2>
              <span className="text-xs font-medium text-slate-600">
                · {activeMeta.phaseLabel}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              {activeMeta.description} · Filtered for {formatRangeDisplay(dateRange)}
            </p>
          </div>

          {/* Export & Print Controls */}
          <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
            <button
              type="button"
              id="report-instant-csv-btn"
              onClick={handleInstantCsv}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              title="Download RFC 4180 CSV spreadsheet"
            >
              {!canUseAdvancedReports ? (
                <Lock className="w-3.5 h-3.5 text-emerald-700 shrink-0" aria-hidden="true" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
              )}
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              id="report-direct-quick-print-btn"
              onClick={handleQuickPrint}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white border border-slate-800 rounded-lg text-xs font-semibold transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              title="Quick Print directly to connected printer or Save as PDF"
            >
              {!canUseAdvancedReports ? (
                <Lock className="w-3.5 h-3.5 text-slate-300 shrink-0" aria-hidden="true" />
              ) : (
                <Printer className="w-3.5 h-3.5 text-blue-300 shrink-0" aria-hidden="true" />
              )}
              <span>Quick Print</span>
            </button>

            <button
              type="button"
              id="report-open-print-btn"
              onClick={handleOpenPrintPreview}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              title="Preview A4 document, format pagination, and print or export PDF"
            >
              {!canUseAdvancedReports ? (
                <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <Printer className="w-4 h-4 shrink-0" aria-hidden="true" />
              )}
              <span>Print / PDF (A4)</span>
            </button>
          </div>
        </div>

        {/* Live KPI Summary Cards */}
        <ReportSummaryGrid cards={reportPayload.summaryCards} />

        {/* Responsive, Sortable, Paginated Report Data */}
        <ReportDataDisplay
          reportTitle={activeMeta.title}
          activeReportId={activeReportId}
          tableHeaders={reportPayload.tableHeaders}
          tableRows={reportPayload.tableRows}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortState={sortState}
          onToggleSort={handleToggleSort}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          onReprintTransaction={handleReprintTransaction}
          branchName={activeLocationObj.name}
        />
      </section>

      {/* A4 Print & PDF Preview Modal */}
      <ReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        data={reportPayload}
      />
    </div>
  );
};
