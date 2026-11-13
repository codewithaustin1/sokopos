import React, { useState, useEffect } from 'react';
import {
  FileText,
  Building2,
  History,
  Loader2,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { DateRange } from '../types/reporting';
import { calculateDateRange } from '../utils/dateRangeUtils';
import { GlobalTimeRangeSelector } from './reports/GlobalTimeRangeSelector';
import { ReportViewContainer } from './reports/ReportViewContainer';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

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

  // Location selector (All Locations vs specific location)
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');

  // Global Time-Range Selector State for on-demand reports
  const [dateRange, setDateRange] = useState<DateRange>(() => calculateDateRange('last_7d'));

  useEffect(() => {
    refreshTenantCustomers(false).catch(() => {});
    refreshTenantSuppliers(false).catch(() => {});
    refreshTenantStaff(false).catch(() => {});
  }, [refreshTenantCustomers, refreshTenantSuppliers, refreshTenantStaff]);

  useEffect(() => {
    if (isDemoSession) return;
    const thirtyDaysAgoMs = Date.now() - THIRTY_DAYS_MS;
    const needsOlderHistory =
      dateRange.preset === 'all' || dateRange.start.getTime() < thirtyDaysAgoMs;

    if (!needsOlderHistory) return;

    const startIso = dateRange.start.toISOString();
    const endIso = dateRange.end.toISOString();
    if (!olderTransactionsLoadedFrom || startIso < olderTransactionsLoadedFrom) {
      loadHistoricalTransactions(startIso, endIso).catch(() => {});
    }
  }, [dateRange, isDemoSession, olderTransactionsLoadedFrom, loadHistoricalTransactions]);

  const handleManualLoadOlder = () => {
    const startIso = dateRange.start.toISOString();
    const endIso = dateRange.end.toISOString();
    loadHistoricalTransactions(startIso, endIso).catch(() => {});
  };

  return (
    <div
      id="pos-reports-view"
      className="flex-1 h-full overflow-y-auto bg-slate-50 font-sans selection:bg-blue-600 selection:text-white"
    >
      {/* Sticky Top Header Bar */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-600">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-baseline gap-2.5">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Operations & Financial Reports
                </h1>
                <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                  {currentBusiness.name} · {transactions.length} receipts loaded
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Audited retail ledger, tax/ETR compliance, margins & inventory valuation
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls: Location Filter & Date Range Picker */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {/* Branch Location Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700">
            <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <select
              id="reports-location-filter-select"
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer font-bold text-xs"
            >
              <option value="all">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.city})
                </option>
              ))}
            </select>
          </div>

          {/* Global Time Range Selector */}
          <GlobalTimeRangeSelector
            currentRange={dateRange}
            onChange={(newRange) => setDateRange(newRange)}
          />
        </div>
      </div>

      {/* Main Content: Interactive Report Suite */}
      <div className="p-3 sm:p-6 pb-24 md:pb-12 max-w-7xl mx-auto space-y-4">
        {!isDemoSession && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs">
            <div className="flex items-center gap-2 text-slate-600 tabular-nums">
              <History className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                {olderTransactionsLoadedFrom
                  ? `Showing live 30-day receipts plus archived history from ${new Date(olderTransactionsLoadedFrom).toLocaleDateString()}.`
                  : 'Syncing last 30 days live to minimize cloud reads.'}
              </span>
            </div>
            <button
              type="button"
              id="reports-load-older-history-btn"
              onClick={handleManualLoadOlder}
              disabled={isLoadingOlderTransactions}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer disabled:opacity-50"
            >
              {isLoadingOlderTransactions ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>Loading archive...</span>
                </>
              ) : (
                <>
                  <History className="w-3.5 h-3.5 text-slate-500" />
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
      </div>
    </div>
  );
};
