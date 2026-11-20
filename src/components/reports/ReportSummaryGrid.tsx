import React from 'react';

interface SummaryCardItem {
  label: string;
  value: string | number;
  sub?: string;
}

interface ReportSummaryGridProps {
  cards: SummaryCardItem[];
}

export const ReportSummaryGrid: React.FC<ReportSummaryGridProps> = React.memo(({ cards }) => {
  if (cards.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Key summary metrics"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
    >
      {cards.map((card, idx) => (
        <div
          key={`${card.label}-${idx}`}
          className="p-3.5 sm:p-4 bg-slate-50/90 rounded-xl border border-slate-200 flex flex-col justify-between min-w-0"
        >
          <div className="text-xs font-semibold text-slate-600 truncate">
            {card.label}
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-900 mt-1 font-mono tabular-nums truncate">
            {card.value}
          </div>
          {card.sub && (
            <div className="text-[11px] text-slate-600 font-medium mt-1 truncate">
              {card.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

ReportSummaryGrid.displayName = 'ReportSummaryGrid';
