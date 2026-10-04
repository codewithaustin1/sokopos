import React, { useState } from 'react';
import {
  FileText,
  Building2,
  Calendar,
  FileSpreadsheet,
  Printer,
  Sparkles,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import { DateRange } from '../types/reporting';
import { calculateDateRange } from '../utils/dateRangeUtils';
import { GlobalTimeRangeSelector } from './reports/GlobalTimeRangeSelector';
import { ReportViewContainer } from './reports/ReportViewContainer';

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
  } = usePos();

  // Location selector (All Locations vs specific location)
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');

  // Global Time-Range Selector State for on-demand reports
  const [dateRange, setDateRange] = useState<DateRange>(() => calculateDateRange('last_7d'));

  return (
    <div
      id="pos-reports-view"
      className="flex-1 h-full overflow-y-auto bg-slate-50 font-sans selection:bg-blue-600 selection:text-white"
    >
      {/* Sticky Top Header Bar */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-600">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Operations & Financial Reports
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                  15 On-Demand Reports
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Audited retail ledger, tax/ETR compliance, margins & inventory valuation • {currentBusiness.name}
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
      <div className="p-3 sm:p-6 pb-24 md:pb-12 max-w-7xl mx-auto">
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
