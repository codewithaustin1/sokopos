import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'recharts';
import {
  RefreshCw,
  Download,
  AlertCircle,
  Filter,
  Globe,
  Store,
  CreditCard,
  TrendingUp,
  Monitor,
  Smartphone,
  Tablet,
  ArrowUpRight,
} from 'lucide-react';
import { fetchPlatformTrafficOverview } from '../../lib/telemetryService';
import { PlatformTrafficOverviewResponse } from '../../types/traffic';
import { SettingsSectionHeader } from '../common/SettingsSectionHeader';

type ChartMetricMode = 'traffic' | 'stores' | 'revenue';
type FeedCategoryFilter = 'all' | 'funnel' | 'pos' | 'billing';

const EVENT_LABELS: Record<string, { label: string; category: FeedCategoryFilter; tone: string }> = {
  page_view: { label: 'New Visitor Session', category: 'funnel', tone: 'text-slate-700 dark:text-slate-300' },
  pricing_view: { label: 'Pricing Page View', category: 'funnel', tone: 'text-blue-700 dark:text-blue-400' },
  demo_start: { label: 'Sandbox Demo Started', category: 'funnel', tone: 'text-amber-700 dark:text-amber-400' },
  signin_start: { label: 'Sign-In Initiated', category: 'funnel', tone: 'text-blue-700 dark:text-blue-400' },
  signup_complete: { label: 'New Store Created', category: 'funnel', tone: 'text-emerald-700 dark:text-emerald-400' },
  pos_session_start: { label: 'POS Terminal Session', category: 'pos', tone: 'text-slate-700 dark:text-slate-300' },
  pos_checkout: { label: 'POS Checkout Completed', category: 'pos', tone: 'text-emerald-700 dark:text-emerald-400' },
  subaccount_verified: { label: 'Paystack Subaccount Verified', category: 'billing', tone: 'text-blue-700 dark:text-blue-400' },
  subscription_activated: { label: 'Paid Subscription Activated', category: 'billing', tone: 'text-emerald-700 dark:text-emerald-400' },
};

export const SuperAdminTrafficTab: React.FC = () => {
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90>(30);
  const [excludeDemo, setExcludeDemo] = useState<boolean>(true);
  const [chartMode, setChartMode] = useState<ChartMetricMode>('traffic');
  const [feedFilter, setFeedFilter] = useState<FeedCategoryFilter>('all');

  const [overview, setOverview] = useState<PlatformTrafficOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(
    async (silent = false) => {
      if (silent) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);
      try {
        const data = await fetchPlatformTrafficOverview(rangeDays, excludeDemo);
        setOverview(data);
      } catch (err: any) {
        setError(err?.message || 'Unable to load platform traffic metrics.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [rangeDays, excludeDemo]
  );

  useEffect(() => {
    loadOverview(false);
  }, [loadOverview]);

  const filteredEvents = useMemo(() => {
    if (!overview?.recentEvents) return [];
    if (feedFilter === 'all') return overview.recentEvents;
    return overview.recentEvents.filter((evt) => {
      const meta = EVENT_LABELS[evt.eventType];
      return meta ? meta.category === feedFilter : feedFilter === 'funnel';
    });
  }, [overview?.recentEvents, feedFilter]);

  const handleExportCsv = () => {
    if (!overview) return;
    const headers = [
      'Date',
      'Page Views',
      'Unique Sessions',
      'Landing Views',
      'Pricing Views',
      'Sign-In Starts',
      'Demo Starts',
      'Stores Created',
      'Active Stores',
      'POS Sessions',
      'POS Checkouts',
      'POS GMV (KES)',
      'Paid Subscriptions',
      'Subscription Revenue (KES)',
      'Bots Filtered',
    ];
    const rows = overview.dailySeries.map((d) => [
      d.dateKey,
      d.pageViews,
      d.uniqueSessions,
      d.landingViews,
      d.pricingViews,
      d.signInStarts,
      d.demoStarts,
      d.signUpsCompleted,
      d.activeStoresCount,
      d.posSessions,
      d.posCheckouts,
      d.posGmvKes,
      d.subscriptionActivations,
      d.subscriptionRevenueKes,
      d.botHitsBlocked,
    ]);
    const csvContent = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sokopos-platform-traffic-${rangeDays}d-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading && !overview) {
    return (
      <div className="space-y-5">
        <div className="h-14 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 skeleton-shimmer" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 skeleton-shimmer"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-72 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 skeleton-shimmer" />
          <div className="h-72 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 skeleton-shimmer" />
        </div>
      </div>
    );
  }

  const totals = overview?.totals;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <SettingsSectionHeader
        title="Platform Traffic & Telemetry"
        description="Cookie-free first-party acquisition attribution, store activation, and payment conversion telemetry."
        meta={
          <>
            <span>{totals?.botHitsBlocked ?? 0} bots filtered</span>
            {overview?.generatedAt && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  Updated{' '}
                  {new Date(overview.generatedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </>
            )}
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Date Range Segmented Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium">
              {([7, 30, 90] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setRangeDays(days)}
                  className={`px-2.5 py-1 rounded-md transition whitespace-nowrap shrink-0 cursor-pointer ${
                    rangeDays === days
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>

            {/* Exclude Demo Toggle */}
            <button
              type="button"
              onClick={() => setExcludeDemo((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                excludeDemo
                  ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-400'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title="Exclude Sandbox Demo store activity from store counts and checkouts"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{excludeDemo ? 'Prod Stores Only' : 'Incl. Demo'}</span>
            </button>

            <button
              type="button"
              onClick={() => loadOverview(true)}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600 dark:text-blue-400' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!overview}
              className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        }
      />

      {/* Inline Error Banner */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadOverview(false)}
            className="px-3 py-1 rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/50 cursor-pointer whitespace-nowrap shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Hairline 4-Column KPI Summary Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
        <div className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Unique Visitor Sessions</span>
            <Globe className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
            {(totals?.uniqueSessions ?? 0).toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono tabular-nums">
            <span>{(totals?.pageViews ?? 0).toLocaleString()} views</span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <span>{(totals?.pricingViews ?? 0).toLocaleString()} pricing</span>
          </p>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Signup Conversion Rate</span>
            <TrendingUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
            {(totals?.signupConversionRate ?? 0).toFixed(1)}%
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono tabular-nums">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {(totals?.signUpsCompleted ?? 0).toLocaleString()} created
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <span>{(totals?.demoStarts ?? 0).toLocaleString()} demos</span>
          </p>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Active Stores ({rangeDays}d)</span>
            <Store className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
            {(totals?.activeStoresInRange ?? 0).toLocaleString()}
            <span className="text-sm font-normal text-slate-400 dark:text-slate-500 ml-1">
              / {(totals?.totalRegisteredStores ?? 0).toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono tabular-nums">
            <span>{(totals?.posSessions ?? 0).toLocaleString()} sessions</span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <span>{totals?.verifiedSubaccountsCount ?? 0} Paystack</span>
          </p>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">POS &amp; Plan Checkouts</span>
            <CreditCard className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
            {(totals?.posCheckouts ?? 0).toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono tabular-nums">
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              KES {(totals?.posGmvKes ?? 0).toLocaleString()}
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {totals?.subscriptionActivations ?? 0} paid plans
            </span>
          </p>
        </div>
      </div>

      {/* Time-Series Chart + Acquisition Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily Traffic & Usage Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Daily Activity Trend</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {chartMode === 'traffic'
                  ? 'Unique visitor sessions vs total pageviews'
                  : chartMode === 'stores'
                  ? 'Active retail stores vs completed POS checkouts'
                  : 'Subscription activations & daily POS GMV'}
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium w-fit">
              <button
                type="button"
                onClick={() => setChartMode('traffic')}
                className={`px-2.5 py-1 rounded-md transition whitespace-nowrap cursor-pointer ${
                  chartMode === 'traffic'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Traffic
              </button>
              <button
                type="button"
                onClick={() => setChartMode('stores')}
                className={`px-2.5 py-1 rounded-md transition whitespace-nowrap cursor-pointer ${
                  chartMode === 'stores'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Stores &amp; Sales
              </button>
              <button
                type="button"
                onClick={() => setChartMode('revenue')}
                className={`px-2.5 py-1 rounded-md transition whitespace-nowrap cursor-pointer ${
                  chartMode === 'revenue'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Billing
              </button>
            </div>
          </div>

          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'traffic' ? (
                <AreaChart data={overview?.dailySeries || []} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trafficViewsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="trafficSessionsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="pageViews"
                    name="Pageviews"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#trafficViewsFill)"
                  />
                  <Area
                    type="monotone"
                    dataKey="uniqueSessions"
                    name="Unique Sessions"
                    stroke="#16a34a"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#trafficSessionsFill)"
                  />
                </AreaChart>
              ) : chartMode === 'stores' ? (
                <BarChart data={overview?.dailySeries || []} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="activeStoresCount" name="Active Stores" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="posCheckouts" name="POS Checkouts" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <BarChart data={overview?.dailySeries || []} margin={{ top: 6, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="subscriptionCheckouts" name="Plan Checkouts Started" fill="#64748b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="subscriptionActivations" name="Paid Subscriptions" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Acquisition & Activation Funnel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Acquisition &amp; Plan Funnel</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Progression from first landing impression to paid store
            </p>

            <div className="mt-4 space-y-3.5">
              {(overview?.funnel || []).map((step, idx) => (
                <div key={step.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{step.label}</span>
                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {step.count.toLocaleString()}
                      </span>
                      {idx > 0 && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {step.rateFromPrevious.toFixed(0)}% step
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        idx === 0
                          ? 'bg-slate-700 dark:bg-slate-500'
                          : idx === 4
                          ? 'bg-emerald-600'
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.max(step.count > 0 ? 4 : 0, step.rateFromLanding)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>
              Billing modal:{' '}
              <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {totals?.subscriptionModalOpens ?? 0}
              </strong>
            </span>
            <span>
              Sub revenue:{' '}
              <strong className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                KES {(totals?.subscriptionRevenueKes ?? 0).toLocaleString()}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Attribution & Operational Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Acquisition Sources, Referrers & Devices */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-5">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Traffic Sources &amp; Referrers</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">First-touch UTM sources and referring domains</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* UTM Sources */}
            <div>
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-100 dark:border-slate-800">
                UTM Sources
              </div>
              {(overview?.utmSources || []).length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 py-4">No visitor sessions recorded yet.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {overview!.utmSources.map((row) => (
                    <div key={row.label} className="py-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                        {row.label}
                      </span>
                      <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {row.count}{' '}
                        <span className="text-slate-400 dark:text-slate-500">({row.sharePercent}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Referrers */}
            <div>
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-100 dark:border-slate-800">
                Referring Domains
              </div>
              {(overview?.referrers || []).length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 py-4">No external referrers recorded yet.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {overview!.referrers.map((row) => (
                    <div key={row.label} className="py-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px] flex items-center gap-1">
                        <span>{row.label}</span>
                        {row.label !== 'direct' && (
                          <ArrowUpRight className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                        )}
                      </span>
                      <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {row.count}{' '}
                        <span className="text-slate-400 dark:text-slate-500">({row.sharePercent}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Device Mix */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2.5">Device Form Factor Mix</div>
            {(overview?.devices || []).length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">Waiting for session data.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {overview!.devices.map((dev) => {
                  const Icon =
                    dev.label === 'mobile' ? Smartphone : dev.label === 'tablet' ? Tablet : Monitor;
                  return (
                    <div
                      key={dev.label}
                      className="border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 rounded-lg px-3 py-2 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 capitalize">
                        <Icon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>{dev.label}</span>
                      </div>
                      <span className="text-xs font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        {dev.sharePercent}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Payment Channels & Feature Usage */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-5">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Checkout Channels &amp; POS Navigation
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live payment split and most visited POS workspaces
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-100 dark:border-slate-800">
                POS Payment Channels
              </div>
              {(overview?.checkoutChannels || []).length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 py-4">No POS checkouts recorded in range.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {overview!.checkoutChannels.map((row) => (
                    <div key={row.label} className="py-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300 uppercase">{row.label}</span>
                      <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {row.count}{' '}
                        <span className="text-slate-400 dark:text-slate-500">({row.sharePercent}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300 pb-2 border-b border-slate-100 dark:border-slate-800">
                POS Module Engagement
              </div>
              {(overview?.posTabs || []).length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 py-4">No POS workspace visits recorded yet.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {overview!.posTabs.map((row) => (
                    <div key={row.label} className="py-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">{row.label}</span>
                      <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {row.count}{' '}
                        <span className="text-slate-400 dark:text-slate-500">({row.sharePercent}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {overview && overview.utmCampaigns.length > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Active UTM Campaigns</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                {overview.utmCampaigns.map((c) => (
                  <span key={c.label} className="font-mono tabular-nums">
                    {c.label}: <strong className="text-slate-900 dark:text-slate-100">{c.count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Active Tenant Stores Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Most Active Retail Stores</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tenants ranked by completed POS checkouts and till sessions in the selected window
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
            {overview?.topStores.length || 0} active stores
          </span>
        </div>

        {(overview?.topStores || []).length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No store terminal sessions recorded for this period yet. Activity will populate automatically as merchants sign in and process sales.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                <tr>
                  <th className="py-2.5 px-4">Store Name</th>
                  <th className="py-2.5 px-3">Plan &amp; Status</th>
                  <th className="py-2.5 px-3">Paystack</th>
                  <th className="py-2.5 px-3 text-right">POS Sessions</th>
                  <th className="py-2.5 px-3 text-right">Checkouts</th>
                  <th className="py-2.5 px-3 text-right">GMV (KES)</th>
                  <th className="py-2.5 px-4 text-right">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                {overview!.topStores.map((st) => (
                  <tr key={st.businessId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {st.businessName}
                    </td>
                    <td className="py-2.5 px-3 capitalize">
                      {st.plan} ·{' '}
                      <span
                        className={
                          st.status === 'active'
                            ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                            : 'text-amber-600 dark:text-amber-400 font-medium'
                        }
                      >
                        {st.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={
                          st.paystackVerified
                            ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                            : 'text-slate-400 dark:text-slate-500'
                        }
                      >
                        {st.paystackVerified ? 'Verified' : 'Unlinked'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {st.posSessions.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {st.posCheckouts.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {st.posGmvKes.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {st.lastSeenDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Milestone Events Feed */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recent Milestone Feed</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Latest non-PII acquisition, store activation, and payment conversion events
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium w-fit">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'funnel', label: 'Funnel' },
                { id: 'pos', label: 'POS' },
                { id: 'billing', label: 'Billing' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFeedFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md transition whitespace-nowrap cursor-pointer ${
                  feedFilter === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No milestone events recorded for this filter yet.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-80 overflow-y-auto modal-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                <tr>
                  <th className="py-2.5 px-4">Time</th>
                  <th className="py-2.5 px-3">Milestone Event</th>
                  <th className="py-2.5 px-3">Source / Referrer</th>
                  <th className="py-2.5 px-3">Store / Plan</th>
                  <th className="py-2.5 px-3">Device</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                {filteredEvents.map((evt) => {
                  const meta = EVENT_LABELS[evt.eventType] || {
                    label: evt.eventType,
                    category: 'funnel' as FeedCategoryFilter,
                    tone: 'text-slate-700 dark:text-slate-300',
                  };
                  return (
                    <tr key={evt.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-4 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(evt.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className={`py-2 px-3 font-medium ${meta.tone}`}>
                        {meta.label}
                        {evt.channel ? (
                          <span className="ml-1.5 text-[11px] font-normal text-slate-500 dark:text-slate-400 uppercase">
                            ({evt.channel})
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                        {evt.utmSource || evt.referrerHost || 'direct'}
                        {evt.utmCampaign ? ` · ${evt.utmCampaign}` : ''}
                      </td>
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-200">
                        {evt.businessName || evt.planId || evt.pageName || 'Public'}
                      </td>
                      <td className="py-2 px-3 capitalize text-slate-500 dark:text-slate-400">{evt.deviceType}</td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                        {typeof evt.amountKes === 'number' && evt.amountKes > 0
                          ? `KES ${evt.amountKes.toLocaleString()}`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
