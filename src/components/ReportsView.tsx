import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Building2, History, Loader2 } from 'lucide-react';
import { usePos } from '../context/PosContext';
import { DateRange } from '../types/reporting';
import { calculateDateRange } from '../utils/dateRangeUtils';
import { GlobalTimeRangeSelector } from './reports/GlobalTimeRangeSelector';
import { ReportViewContainer } from './reports/ReportViewContainer';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const ReportsView: React.FC = () => {
  const {
    transactions,
    products,
    locations,
    currentLocation,
    currentBusiness,
    systemUsers,
    currentUser,
    superAdminAuditLogs,
    loadHistoricalTransactions,
    isLoadingOlderTransactions,
    olderTransactionsLoadedFrom,
    refreshTenantCustomers,
    refreshTenantSuppliers,
    refreshTenantStaff,
    isDemoSession,
  } = usePos();

  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>(() => calculateDateRange('last_7d'));

  useEffect(() => {
    refreshTenantCustomers(false).catch(() => {});
    refreshTenantSuppliers(false).catch(() => {});
    refreshTenantStaff(false).catch(() => {});
  }, [refreshTenantCustomers, refreshTenantSuppliers, refreshTenantStaff]);

  useEffect(() => {
    if (isDemoSession) return;
    const sevenDaysAgoMs = Date.now() - SEVEN_DAYS_MS;
    const needsOlderHistory =
      dateRange.preset === 'all' || dateRange.start.getTime() < sevenDaysAgoMs;

    if (!needsOlderHistory) return;

    const startIso = dateRange.start.toISOString();
    const endIso = dateRange.end.toISOString();
    if (!olderTransactionsLoadedFrom || startIso < olderTransactionsLoadedFrom) {
      loadHistoricalTransactions(startIso, endIso).catch(() => {});
    }
  }, [dateRange, isDemoSession, olderTransactionsLoadedFrom, loadHistoricalTransactions]);

  const handleManualLoadOlder = useCallback(() => {
    const startIso = dateRange.start.toISOString();
    const endIso = dateRange.end.toISOString();
    loadHistoricalTransactions(startIso, endIso).catch(() => {});
  }, [dateRange.start, dateRange.end, loadHistoricalTransactions]);

  return (
    <div
      id="pos-reports-view"
      className="flex-1 h-full overflow-y-auto bg-slate-50 font-sans selection:bg-blue-600 selection:text-white"
    >
      {/* Sticky Top Header Bar */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-700 shrink-0">
            <FileText className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Operations &amp; Financial Reports
              </h1>
              <span className="text-xs font-medium text-slate-600 font-mono tabular-nums">
                {currentBusiness.name} · {transactions.length} receipts
              </span>
            </div>
            <p className="text-xs text-slate-600 truncate">
              Audited retail ledger, tax/ETR compliance, margins &amp; inventory valuation
            </p>
          </div>
        </div>

        {/* Global Filters: Branch Selector & Date Range Picker */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <div className="min-h-[40px] flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20">
            <Building2 className="w-3.5 h-3.5 text-blue-700 shrink-0" aria-hidden="true" />
            <label htmlFor="reports-location-filter-select" className="sr-only">
              Filter reports by branch location
            </label>
            <select
              id="reports-location-filter-select"
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer font-semibold text-xs text-slate-900 pr-1"
            >
              <option value="all">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.city})
                </option>
              ))}
            </select>
          </div>

          <GlobalTimeRangeSelector
            currentRange={dateRange}
            onChange={setDateRange}
            align="right"
          />
        </div>
      </header>

      {/* Main Content: Interactive Report Suite */}
      <main className="p-3 sm:p-6 pb-24 md:pb-12 max-w-7xl mx-auto space-y-4">
        {!isDemoSession && (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs"
          >
            <div className="flex items-center gap-2 text-slate-700 tabular-nums">
              <History className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
              <span>
                {olderTransactionsLoadedFrom
                  ? `Showing live 7-day receipts plus archived history from ${new Date(
                      olderTransactionsLoadedFrom
                    ).toLocaleDateString()}.`
                  : 'Syncing last 7 days live (up to 200 receipts) to minimize cloud reads.'}
              </span>
            </div>
            <button
              type="button"
              id="reports-load-older-history-btn"
              onClick={handleManualLoadOlder}
              disabled={isLoadingOlderTransactions}
              className="min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs transition cursor-pointer disabled:opacity-50 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              {isLoadingOlderTransactions ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" aria-hidden="true" />
                  <span>Loading archive...</span>
                </>
              ) : (
                <>
                  <History className="w-3.5 h-3.5 text-slate-600 shrink-0" aria-hidden="true" />
                  <span>Load older history</span>
                </>
              )}
            </button>
          </div>
        )}

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
      </main>
    </div>
  );
};
