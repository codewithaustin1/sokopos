import React, { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Clock,
  CalendarDays,
  Coins,
  Receipt,
  ShoppingCart,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Transaction } from '../../types';
import { DateRange } from '../../types/reporting';
import { isTimestampInRange, getPreviousEquivalentRange } from '../../utils/dateRangeUtils';

export type TrendGranularity = 'daily' | 'weekly';
export type TrendMetric = 'revenue' | 'transactions' | 'avg_basket';

interface SalesTrendVisualizerProps {
  transactions: Transaction[];
  dateRange: DateRange;
  currency: string;
  selectedLocationId?: string;
}

export const SalesTrendVisualizer: React.FC<SalesTrendVisualizerProps> = ({
  transactions,
  dateRange,
  currency,
  selectedLocationId = 'all',
}) => {
  const [granularity, setGranularity] = useState<TrendGranularity>('daily');
  const [activeMetric, setActiveMetric] = useState<TrendMetric>('revenue');
  const [showComparison, setShowComparison] = useState<boolean>(true);

  // Filter transactions for current period
  const currentPeriodTxs = useMemo(() => {
    return (transactions || []).filter((tx) => {
      if (selectedLocationId !== 'all' && tx.locationId !== selectedLocationId) return false;
      return isTimestampInRange(tx.timestamp, dateRange);
    });
  }, [transactions, dateRange, selectedLocationId]);

  // Filter transactions for previous equivalent period
  const previousRange = useMemo(() => getPreviousEquivalentRange(dateRange), [dateRange]);
  const previousPeriodTxs = useMemo(() => {
    return (transactions || []).filter((tx) => {
      if (selectedLocationId !== 'all' && tx.locationId !== selectedLocationId) return false;
      return isTimestampInRange(tx.timestamp, previousRange);
    });
  }, [transactions, previousRange, selectedLocationId]);

  // Generate chart data series based on granularity
  const chartData = useMemo(() => {
    if (granularity === 'daily') {
      // Daily view: hourly buckets (06:00 to 22:00 or full 24h)
      const hours = [
        '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
        '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
        '18:00', '19:00', '20:00', '21:00', '22:00'
      ];

      return hours.map((hourLabel) => {
        const targetHour = parseInt(hourLabel.split(':')[0], 10);

        // Find txs in current period matching this hour of day
        const currentMatches = currentPeriodTxs.filter((tx) => {
          const d = new Date(tx.timestamp);
          return d.getHours() === targetHour;
        });

        // Find txs in previous period matching this hour of day
        const prevMatches = previousPeriodTxs.filter((tx) => {
          const d = new Date(tx.timestamp);
          return d.getHours() === targetHour;
        });

        const currentRev = currentMatches.reduce((s, tx) => s + tx.total, 0);
        const currentCount = currentMatches.length;
        const currentAvg = currentCount > 0 ? currentRev / currentCount : 0;

        const prevRev = prevMatches.reduce((s, tx) => s + tx.total, 0);
        const prevCount = prevMatches.length;
        const prevAvg = prevCount > 0 ? prevRev / prevCount : 0;

        return {
          timeLabel: hourLabel,
          revenue: currentRev,
          transactions: currentCount,
          avg_basket: Math.round(currentAvg),
          // Comparison metrics
          prev_revenue: prevRev,
          prev_transactions: prevCount,
          prev_avg_basket: Math.round(prevAvg),
        };
      });
    } else {
      // Weekly view: 7 day breakdown across the selected week/range
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      // Map day of week (Monday=1, Sunday=0)
      return dayNames.map((dayName, idx) => {
        const jsDayIndex = (idx + 1) % 7; // Monday=1, ..., Sunday=0

        const currentMatches = currentPeriodTxs.filter((tx) => {
          const d = new Date(tx.timestamp);
          return d.getDay() === jsDayIndex;
        });

        const prevMatches = previousPeriodTxs.filter((tx) => {
          const d = new Date(tx.timestamp);
          return d.getDay() === jsDayIndex;
        });

        const currentRev = currentMatches.reduce((s, tx) => s + tx.total, 0);
        const currentCount = currentMatches.length;
        const currentAvg = currentCount > 0 ? currentRev / currentCount : 0;

        const prevRev = prevMatches.reduce((s, tx) => s + tx.total, 0);
        const prevCount = prevMatches.length;
        const prevAvg = prevCount > 0 ? prevRev / prevCount : 0;

        return {
          timeLabel: dayName,
          revenue: currentRev,
          transactions: currentCount,
          avg_basket: Math.round(currentAvg),
          prev_revenue: prevRev,
          prev_transactions: prevCount,
          prev_avg_basket: Math.round(prevAvg),
        };
      });
    }
  }, [granularity, currentPeriodTxs, previousPeriodTxs]);

  // Aggregate stats for the active metric
  const stats = useMemo(() => {
    const curTotalRev = currentPeriodTxs.reduce((s, tx) => s + tx.total, 0);
    const curCount = currentPeriodTxs.length;
    const curAvg = curCount > 0 ? curTotalRev / curCount : 0;

    const prevTotalRev = previousPeriodTxs.reduce((s, tx) => s + tx.total, 0);
    const prevCount = previousPeriodTxs.length;
    const prevAvg = prevCount > 0 ? prevTotalRev / prevCount : 0;

    const calcGrowth = (cur: number, prev: number) => {
      if (prev === 0) return cur > 0 ? 100 : 0;
      return ((cur - prev) / prev) * 100;
    };

    return {
      revenue: {
        current: curTotalRev,
        previous: prevTotalRev,
        growth: calcGrowth(curTotalRev, prevTotalRev),
      },
      transactions: {
        current: curCount,
        previous: prevCount,
        growth: calcGrowth(curCount, prevCount),
      },
      avg_basket: {
        current: curAvg,
        previous: prevAvg,
        growth: calcGrowth(curAvg, prevAvg),
      },
    };
  }, [currentPeriodTxs, previousPeriodTxs]);

  const metricConfig = {
    revenue: {
      label: 'Gross Revenue',
      dataKey: 'revenue',
      prevKey: 'prev_revenue',
      color: '#2563eb', // Blue
      prevColor: '#94a3b8', // Muted slate
      formatValue: (v: number) => `${currency} ${v.toLocaleString()}`,
      unit: currency,
    },
    transactions: {
      label: 'Transaction Count',
      dataKey: 'transactions',
      prevKey: 'prev_transactions',
      color: '#10b981', // Emerald
      prevColor: '#94a3b8',
      formatValue: (v: number) => `${v.toLocaleString()} orders`,
      unit: 'Orders',
    },
    avg_basket: {
      label: 'Average Basket Value',
      dataKey: 'avg_basket',
      prevKey: 'prev_avg_basket',
      color: '#8b5cf6', // Violet
      prevColor: '#94a3b8',
      formatValue: (v: number) => `${currency} ${v.toLocaleString()}`,
      unit: currency,
    },
  };

  const activeConf = metricConfig[activeMetric];
  const activeStat = stats[activeMetric];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
      {/* Visualizer Top Bar Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Sales Trend Visualizer</span>
            </h3>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-100">
              {granularity === 'daily' ? 'Hourly Intraday' : 'Weekly Daily Totals'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time throughput curve respecting {dateRange.label}
          </p>
        </div>

        {/* Granularity & Comparison Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Granularity Toggle: Daily (Hourly) vs Weekly (Daily) */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              id="granularity-daily-btn"
              onClick={() => setGranularity('daily')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                granularity === 'daily'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Daily (Hourly)</span>
            </button>
            <button
              type="button"
              id="granularity-weekly-btn"
              onClick={() => setGranularity('weekly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                granularity === 'weekly'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Weekly (Daily)</span>
            </button>
          </div>

          {/* Comparison Overlay Toggle */}
          <button
            type="button"
            id="trend-comparison-toggle-btn"
            onClick={() => setShowComparison(!showComparison)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              showComparison
                ? 'bg-slate-800 text-white border-slate-700 shadow-2xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Overlay prior equivalent period"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Prior Period Overlay</span>
          </button>
        </div>
      </div>

      {/* Metric Selector Pills (Revenue, Transactions, Basket) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
        {/* Metric 1: Revenue */}
        <button
          type="button"
          onClick={() => setActiveMetric('revenue')}
          className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
            activeMetric === 'revenue'
              ? 'bg-blue-50/60 border-blue-400 ring-2 ring-blue-500/20'
              : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-blue-600" /> Revenue
            </span>
            <span
              className={`text-[10px] font-black flex items-center gap-0.5 ${
                stats.revenue.growth >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {stats.revenue.growth >= 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {Math.abs(stats.revenue.growth).toFixed(1)}%
            </span>
          </div>
          <div className="text-lg font-black text-slate-900 mt-1">
            {currency} {stats.revenue.current.toLocaleString()}
          </div>
          {showComparison && (
            <div className="text-[10px] text-slate-400 mt-0.5">
              Prior: {currency} {stats.revenue.previous.toLocaleString()}
            </div>
          )}
        </button>

        {/* Metric 2: Transactions */}
        <button
          type="button"
          onClick={() => setActiveMetric('transactions')}
          className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
            activeMetric === 'transactions'
              ? 'bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-500/20'
              : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-emerald-600" /> Transactions
            </span>
            <span
              className={`text-[10px] font-black flex items-center gap-0.5 ${
                stats.transactions.growth >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {stats.transactions.growth >= 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {Math.abs(stats.transactions.growth).toFixed(1)}%
            </span>
          </div>
          <div className="text-lg font-black text-slate-900 mt-1">
            {stats.transactions.current.toLocaleString()} orders
          </div>
          {showComparison && (
            <div className="text-[10px] text-slate-400 mt-0.5">
              Prior: {stats.transactions.previous.toLocaleString()} orders
            </div>
          )}
        </button>

        {/* Metric 3: Avg Basket Value */}
        <button
          type="button"
          onClick={() => setActiveMetric('avg_basket')}
          className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
            activeMetric === 'avg_basket'
              ? 'bg-purple-50/60 border-purple-400 ring-2 ring-purple-500/20'
              : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5 text-purple-600" /> Avg Basket
            </span>
            <span
              className={`text-[10px] font-black flex items-center gap-0.5 ${
                stats.avg_basket.growth >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {stats.avg_basket.growth >= 0 ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {Math.abs(stats.avg_basket.growth).toFixed(1)}%
            </span>
          </div>
          <div className="text-lg font-black text-slate-900 mt-1">
            {currency} {Math.round(stats.avg_basket.current).toLocaleString()}
          </div>
          {showComparison && (
            <div className="text-[10px] text-slate-400 mt-0.5">
              Prior: {currency} {Math.round(stats.avg_basket.previous).toLocaleString()}
            </div>
          )}
        </button>
      </div>

      {/* Main Recharts Area / Line Chart Canvas */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={activeConf.color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={activeConf.color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="timeLabel"
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
            />
            <Tooltip
              formatter={(val: number, name: string) => {
                const isPrior = name.includes('Prior');
                return [
                  activeConf.formatValue(val),
                  isPrior ? 'Prior Equivalent Period' : `Current (${activeConf.label})`,
                ];
              }}
              contentStyle={{
                backgroundColor: '#0f172a',
                borderRadius: '12px',
                borderColor: '#1e293b',
                color: '#ffffff',
                fontSize: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              height={30}
              iconType="circle"
              wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
            />

            {/* Current Period Curve */}
            <Area
              name={`Current ${activeConf.label}`}
              type="monotone"
              dataKey={activeConf.dataKey}
              stroke={activeConf.color}
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#trendGradient)"
            />

            {/* Prior Period Overlay Line */}
            {showComparison && (
              <Line
                name="Prior Equivalent Period"
                type="monotone"
                dataKey={activeConf.prevKey}
                stroke={activeConf.prevColor}
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 2.5, fill: activeConf.prevColor }}
                activeDot={{ r: 4 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 mt-2">
        <span>* Intraday buckets sync with Firestore real-time transaction timestamps</span>
        <span className="font-mono text-[11px] text-slate-500">
          Range: {dateRange.label}
        </span>
      </div>
    </div>
  );
};
