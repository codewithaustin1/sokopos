import React, { useRef } from 'react';
import { FileText, Lock } from 'lucide-react';
import { ReportCategory, ReportMeta, ReportType } from '../../types/reporting';

interface ReportNavigationBarProps {
  phaseFilter: 'all' | ReportCategory;
  onSelectPhase: (phase: 'all' | ReportCategory) => void;
  reports: ReportMeta[];
  activeReportId: ReportType;
  onSelectReport: (report: ReportMeta) => void;
  isReportLocked: (meta: ReportMeta) => boolean;
}

const CATEGORY_TABS: Array<{
  id: 'phase1' | 'phase2' | 'phase3' | 'all';
  domId: string;
  label: string;
}> = [
  { id: 'phase1', domId: 'report-filter-phase1-btn', label: 'Core (7)' },
  { id: 'phase2', domId: 'report-filter-phase2-btn', label: 'Operations (5)' },
  { id: 'phase3', domId: 'report-filter-phase3-btn', label: 'Advanced (3)' },
  { id: 'all', domId: 'report-filter-all-btn', label: 'All (15)' },
];

export const ReportNavigationBar: React.FC<ReportNavigationBarProps> = React.memo(
  ({
    phaseFilter,
    onSelectPhase,
    reports,
    activeReportId,
    onSelectReport,
    isReportLocked,
  }) => {
    const categoryRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const reportRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const handleTablistKeyDown = (
      e: React.KeyboardEvent,
      index: number,
      total: number,
      refs: React.MutableRefObject<Array<HTMLButtonElement | null>>,
      onActivate: (nextIdx: number) => void
    ) => {
      let nextIndex: number | null = null;
      if (e.key === 'ArrowRight') nextIndex = (index + 1) % total;
      else if (e.key === 'ArrowLeft') nextIndex = (index - 1 + total) % total;
      else if (e.key === 'Home') nextIndex = 0;
      else if (e.key === 'End') nextIndex = total - 1;

      if (nextIndex !== null) {
        e.preventDefault();
        refs.current[nextIndex]?.focus();
        onActivate(nextIndex);
      }
    };

    return (
      <section
        aria-label="Report suite navigation"
        className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 space-y-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200/80 pb-3.5">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 tracking-tight">
              <FileText className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
              <span>Retail Reporting &amp; Audit Suite</span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Select a compliance or operational report to inspect, export CSV, or print A4
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Report categories"
            className="flex flex-wrap sm:flex-nowrap items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold self-start lg:self-auto"
          >
            {CATEGORY_TABS.map((tab, idx) => {
              const isSelected = phaseFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    categoryRefs.current[idx] = el;
                  }}
                  type="button"
                  role="tab"
                  id={tab.domId}
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => onSelectPhase(tab.id)}
                  onKeyDown={(e) =>
                    handleTablistKeyDown(e, idx, CATEGORY_TABS.length, categoryRefs, (nextIdx) => {
                      onSelectPhase(CATEGORY_TABS[nextIdx].id);
                    })
                  }
                  className={`min-h-[38px] px-3 py-1.5 rounded-md transition-colors duration-150 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                    isSelected
                      ? 'bg-white text-slate-900 border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Report Selector Tab Strip */}
        <div
          role="tablist"
          aria-label="Available reports"
          className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin"
        >
          {reports.map((report, idx) => {
            const isSelected = report.id === activeReportId;
            const locked = isReportLocked(report);
            return (
              <button
                key={report.id}
                ref={(el) => {
                  reportRefs.current[idx] = el;
                }}
                type="button"
                role="tab"
                id={`report-select-${report.id}-btn`}
                aria-selected={isSelected}
                aria-controls="active-report-panel"
                tabIndex={isSelected ? 0 : -1}
                onClick={() => onSelectReport(report)}
                onKeyDown={(e) =>
                  handleTablistKeyDown(e, idx, reports.length, reportRefs, (nextIdx) => {
                    const nextReport = reports[nextIdx];
                    if (nextReport && !isReportLocked(nextReport)) {
                      onSelectReport(nextReport);
                    }
                  })
                }
                className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors duration-150 flex items-center gap-1.5 cursor-pointer shrink-0 border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{report.title}</span>
                {locked ? (
                  <Lock
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isSelected ? 'text-white/90' : 'text-slate-500'
                    }`}
                    aria-label="Subscription upgrade required"
                  />
                ) : (
                  report.category === 'phase1' && (
                    <span
                      className={`text-[11px] font-medium ${
                        isSelected ? 'text-blue-100' : 'text-slate-500'
                      }`}
                    >
                      · Core
                    </span>
                  )
                )}
              </button>
            );
          })}
        </div>
      </section>
    );
  }
);

ReportNavigationBar.displayName = 'ReportNavigationBar';
