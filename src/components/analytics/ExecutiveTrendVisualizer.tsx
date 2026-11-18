import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line,
  ComposedChart,
} from 'recharts';
import { BiChartMetric } from '../../types/reporting';
import { ExecutiveTrendPoint } from '../../utils/biEngine';

interface ExecutiveTrendVisualizerProps {
  data: ExecutiveTrendPoint[];
  metric: BiChartMetric;
  onMetricChange: (metric: BiChartMetric) => void;
  currency: string;
  canViewCost: boolean;
  usedRollupHistory: boolean;
  dateLabel: string;
  isLoading?: boolean;
}

export const ExecutiveTrendVisualizer: React.FC<ExecutiveTrendVisualizerProps> = ({
  data,
  metric,
  onMetricChange,
  currency,
  canViewCost,
  usedRollupHistory,
  dateLabel,
  isLoading = false,
}) => {
  const metricOptions: Array<{ id: BiChartMetric; label: string; restricted?: boolean }> = [
    { id: 'net_sales', label: 'Net Sales' },
    { id: 'gross_profit', label: 'Gross Profit', restricted: !canViewCost },
    { id: 'margin_pct', label: 'Margin %', restricted: !canViewCost },
    { id: 'orders', label: 'Orders' },
  ];

  const hasAnyValues = data.some(
    (d) => d.netSales > 0 || d.grossProfit !== 0 || d.orders > 0 || d.priorNetSales > 0
  );

  const fmtAxisVal = (val: number) => {
    if (metric === 'margin_pct') return `${val}%`;
    if (metric === 'orders') return `${val}`;
    if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
    return `${val}`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Revenue & Margin Trajectory</h3>
          <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
            {dateLabel}
            {usedRollupHistory ? ' · Includes persisted daily cloud rollups' : ''}
          </p>
        </div>

        <div className="inline-flex items-center p-0.5 rounded-lg border border-slate-200 bg-slate-50 self-start sm:self-auto overflow-x-auto max-w-full">
          {metricOptions.map((opt) => {
            const disabled = opt.restricted;
            const active = metric === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && onMetricChange(opt.id)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white text-slate-900 border border-slate-200 font-semibold'
                    : disabled
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="h-[260px] w-full rounded-lg bg-slate-50 border border-slate-100 animate-pulse flex items-center justify-center text-xs text-slate-400">
          Hydrating historical ledger...
        </div>
      ) : !hasAnyValues ? (
        <div className="h-[260px] w-full rounded-lg border border-dashed border-slate-200 flex flex-col items-center justify-center text-center px-4">
          <p className="text-sm font-semibold text-slate-700">No recorded sales in this window</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Complete a checkout on the POS Register or widen your selected date horizon to populate real-time P&amp;L curves.
          </p>
        </div>
      ) : (
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {metric === 'orders' ? (
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={20}
                />
                <YAxis
                  tickFormatter={fmtAxisVal}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value} orders`, 'Transactions']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel || ''}
                />
                <Bar dataKey="orders" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            ) : metric === 'margin_pct' ? (
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={20}
                />
                <YAxis
                  tickFormatter={fmtAxisVal}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Gross Margin']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel || ''}
                />
                <Area
                  type="monotone"
                  dataKey="marginPct"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="#059669"
                  fillOpacity={0.12}
                />
              </AreaChart>
            ) : (
              <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={20}
                />
                <YAxis
                  tickFormatter={fmtAxisVal}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => {
                    const lbl =
                      name === 'netSales'
                        ? 'Net Revenue'
                        : name === 'grossProfit'
                        ? 'Gross Profit'
                        : 'Prior Period';
                    return [`${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, lbl];
                  }}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel || ''}
                />
                {metric === 'net_sales' && (
                  <>
                    <Area
                      type="monotone"
                      dataKey="netSales"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fill="#2563eb"
                      fillOpacity={0.12}
                    />
                    {canViewCost && (
                      <Line
                        type="monotone"
                        dataKey="grossProfit"
                        stroke="#059669"
                        strokeWidth={2}
                        dot={false}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="priorNetSales"
                      stroke="#94a3b8"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </>
                )}
                {metric === 'gross_profit' && (
                  <>
                    <Area
                      type="monotone"
                      dataKey="grossProfit"
                      stroke="#059669"
                      strokeWidth={2}
                      fill="#059669"
                      fillOpacity={0.14}
                    />
                    <Line
                      type="monotone"
                      dataKey="netSales"
                      stroke="#2563eb"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </>
                )}
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
