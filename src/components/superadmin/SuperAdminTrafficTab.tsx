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

type ChartMetricMode = 'traffic' | 'stores' | 'revenue';
type FeedCategoryFilter = 'all' | 'funnel' | 'pos' | 'billing';

const EVENT_LABELS: Record<string, { label: string; category: FeedCategoryFilter; tone: string }> = {
  page_view: { label: 'New Visitor Session', category: 'funnel', tone: 'text-slate-700' },
  pricing_view: { label: 'Pricing Page View', category: 'funnel', tone: 'text-blue-700' },
  demo_start: { label: 'Sandbox Demo Started', category: 'funnel', tone: 'text-amber-700' },
  signin_start: { label: 'Sign-In Initiated', category: 'funnel', tone: 'text-blue-700' },
  signup_complete: { label: 'New Store Created', category: 'funnel', tone: 'text-emerald-700' },
  pos_session_start: { label: 'POS Terminal Session', category: 'pos', tone: 'text-slate-700' },
  pos_checkout: { label: 'POS Checkout Completed', category: 'pos', tone: 'text-emerald-700' },
  subaccount_verified: { label: 'Paystack Subaccount Verified', category: 'billing', tone: 'text-blue-700' },
  subscription_activated: { label: 'Paid Subscription Activated', category: 'billing', tone: 'text-emerald-700' },
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
      <div className="space-y-4">
        <div className="h-12 rounded-xl border border-slate-200 bg-white skeleton-shimmer-light" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl border border-slate-200 bg-white skeleton-shimmer-light" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-72 rounded-xl border border-slate-200 bg-white skeleton-shimmer-light" />
          <div className="h-72 rounded-xl border border-slate-200 bg-white skeleton-shimmer-light" />
        </div>
      </div>
    );
  }

  const totals = overview?.totals;

  return (
    <div className="space-y-5">
      {/* Header Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Platform Traffic, Attribution &amp; Conversion Telemetry
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
            <span>Cookie-free first-party rollups</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="font-mono tabular-nums">
              {totals?.botHitsBlocked ?? 0} automated bot hits filtered
            </span>
            {overview?.generatedAt && (
              <>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="font-mono tabular-nums">
                  Updated {new Date(overview.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Date Range Segmented Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold">
            {([7, 30, 90] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setRangeDays(days)}
                className={`px-2.5 py-1 rounded-md transition whitespace-nowrap shrink-0 cursor-pointer ${
                  rangeDays === days
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {days} Days
              </button>
            ))}
          </div>

          {/* Exclude Demo Toggle */}
          <button
            type="button"
            onClick={() => setExcludeDemo((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              excludeDemo
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Exclude Sandbox Demo store activity from store counts and checkouts"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{excludeDemo ? 'Production Stores Only' : 'Including Demo Store'}</span>
          </button>

          <button
            type="button"
            onClick={() => loadOverview(true)}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!overview}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Inline Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadOverview(false)}
            className="px-3 py-1 rounded-lg bg-white border border-rose-200 font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer whitespace-nowrap shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4-Column Flat KPI Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Unique Visitor Sessions</span>
            <Globe className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {(totals?.uniqueSessions ?? 0).toLocaleString()}
          </div>
          <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="font-mono tabular-nums">{(totals?.pageViews ?? 0).toLocaleString()} pageviews</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="font-mono tabular-nums">{(totals?.pricingViews ?? 0).toLocaleString()} pricing</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Signup Conversion Rate</span>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {(totals?.signupConversionRate ?? 0).toFixed(1)}%
          </div>
          <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="font-mono tabular-nums text-emerald-700 font-semibold">
              {(totals?.signUpsCompleted ?? 0).toLocaleString()} stores created
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="font-mono tabular-nums">{(totals?.demoStarts ?? 0).toLocaleString()} demos</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Active Stores ({rangeDays}d)</span>
            <Store className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {(totals?.activeStoresInRange ?? 0).toLocaleString()}
            <span className="text-sm font-normal text-slate-400 ml-1">
              / {(totals?.totalRegisteredStores ?? 0).toLocaleString()}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="font-mono tabular-nums">{(totals?.posSessions ?? 0).toLocaleString()} till sessions</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="font-mono tabular-nums">{totals?.verifiedSubaccountsCount ?? 0} Paystack ready</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">POS &amp; Plan Checkouts</span>
            <CreditCard className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {(totals?.posCheckouts ?? 0).toLocaleString()}
          </div>
          <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="font-mono tabular-nums text-slate-700 font-medium">
              KES {(totals?.posGmvKes ?? 0).toLocaleString()} GMV
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="font-mono tabular-nums text-emerald-700 font-semibold">
              {totals?.subscriptionActivations ?? 0} paid plans
            </span>
          </p>
        </div>
      </div>

      {/* Time-Series Chart + Acquisition Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily Traffic & Usage Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Daily Activity Trend</h4>
              <p className="text-xs text-slate-500">
                {chartMode === 'traffic'
                  ? 'Unique visitor sessions vs total pageviews'
                  : chartMode === 'stores'
                  ? 'Active retail stores vs completed POS checkouts'
                  : 'Subscription activations & daily POS GMV'}
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold w-fit">
              <button
                type="button"
                onClick={() => setChartMode('traffic')}
                className={`px-2.5 py-1 rounded-md transition whitespace-nowrap cursor-pointer ${
                  chartMode === 'traffic' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Traffic
              </button>
              <button
                type="button"
                onClick={() => setChartMode('stores')}
                className={`px-2.5 py-1 rounded-md transition whitespace-nowrap cursor-pointer ${
                  chartMode === 'stores' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Stores &amp; Sales
              </button>
              <button
                type="button"
                onClick={() => setChartMode('revenue')}
                className={`px-2.5 py-1 rounded-md transition whitespace-nowrap cursor-pointer ${
                  chartMode === 'revenue' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="subscriptionCheckouts" name="Plan Checkouts Started" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="subscriptionActivations" name="Paid Subscriptions" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Acquisition & Activation Funnel */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Acquisition &amp; Plan Funnel</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Progression from first landing impression to paid store
            </p>

            <div className="mt-4 space-y-3.5">
              {(overview?.funnel || []).map((step, idx) => (
                <div key={step.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{step.label}</span>
                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      <span className="font-bold text-slate-900">{step.count.toLocaleString()}</span>
                      {idx > 0 && (
                        <span className="text-[11px] text-slate-500">
                          {step.rateFromPrevious.toFixed(0)}% step
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        idx === 0
                          ? 'bg-slate-700'
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

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Billing modal opens: <strong className="font-mono tabular-nums text-slate-900">{totals?.subscriptionModalOpens ?? 0}</strong></span>
            <span>Sub revenue: <strong className="font-mono tabular-nums text-emerald-700">KES {(totals?.subscriptionRevenueKes ?? 0).toLocaleString()}</strong></span>
          </div>
        </div>
      </div>

      {/* Attribution & Operational Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Acquisition Sources, Referrers & Devices */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-5">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Traffic Sources &amp; Referrers</h4>
            <p className="text-xs text-slate-500">First-touch UTM sources and referring domains</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* UTM Sources */}
            <div>
              <div className="text-xs font-semibold text-slate-700 pb-2 border-b border-slate-100">
                UTM Sources
              </div>
              {(overview?.utmSources || []).length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No visitor sessions recorded yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {overview!.utmSources.map((row) => (
                    <div key={row.label} className="py-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 truncate max-w-[140px]">{row.label}</span>
                      <span className="font-mono tabular-nums text-slate-600">
                        {row.count} <span className="text-slate-400">({row.sharePercent}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Referrers */}
            <div>
              <div className="text-xs font-semibold text-slate-700 pb-2 border-b border-slate-100">
                Referring Domains
              </div>
              {(overview?.referrers || []).length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No external referrers recorded yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {overview!.referrers.map((row) => (
                    <div key={row.label} className="py-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 truncate max-w-[140px] flex items-center gap-1">
                        <span>{row.label}</span>
                        {row.label !== 'direct' && <ArrowUpRight className="w-3 h-3 text-slate-400 shrink-0" />}
                      </span>
                      <span className="font-mono tabular-nums text-slate-600">
                        {row.count} <span className="text-slate-400">({row.sharePercent}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Device Mix */}
          <div className="pt-3 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-700 mb-2.5">Device Form Factor Mix</div>
            {(overview?.devices || []).length === 0 ? (
              <p className="text-xs text-slate-400">Waiting for session data.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {overview!.devices.map((dev) => {
                  const Icon =
                    dev.label === 'mobile' ? Smartphone : dev.label === 'tablet' ? Tablet : Monitor;
                  return (
                    <div
                      key={dev.label}
                      className="border border-slate-200 rounded-lg px-3 py-2 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 capitalize">
                        <Icon className="w-3.5 h-3.5 text-slate-400" />
                        <span>{dev.label}</span>
                      </div>
                      <span className="text-xs font-mono tabular-nums font-bold text-slate-900">
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
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-5">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Checkout Channels &amp; POS Navigation</h4>
            <p className="text-xs text-slate-500">Live payment split and most visited POS workspaces</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-slate-700 pb-2 border-b border-slate-100">
                POS Payment Channels
              </div>
              {(overview?.checkoutChannels || []).length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No POS checkouts recorded in range.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {overview!.checkoutChannels.map((row) => (
                    <div key={row.label} className="py-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 uppercase">{row.label}</span>
                      <span className="font-mono tabular-nums text-slate-600">
                        {row.count} <span className="text-slate-400">({row.sharePercent}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-700 pb-2 border-b border-slate-100">
                POS Module Engagement
              </div>
              {(overview?.posTabs || []).length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No POS workspace visits recorded yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {overview!.posTabs.map((row) => (
                    <div key={row.label} className="py-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 capitalize">{row.label}</span>
                      <span className="font-mono tabular-nums text-slate-600">
                        {row.count} <span className="text-slate-400">({row.sharePercent}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {overview && overview.utmCampaigns.length > 0 && (
            <div className="pt-3 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-700 mb-2">Active UTM Campaigns</div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                {overview.utmCampaigns.map((c) => (
                  <span key={c.label} className="font-mono tabular-nums">
                    {c.label}: <strong className="text-slate-900">{c.count}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Active Tenant Stores Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Most Active Retail Stores</h4>
            <p className="text-xs text-slate-500">
              Tenants ranked by completed POS checkouts and till sessions in the selected window
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {overview?.topStores.length || 0} active stores
          </span>
        </div>

        {(overview?.topStores || []).length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No store terminal sessions recorded for this period yet. Activity will populate automatically as merchants sign in and process sales.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
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
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {overview!.topStores.map((st) => (
                  <tr key={st.businessId} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {st.businessName}
                    </td>
                    <td className="py-2.5 px-3 capitalize">
                      {st.plan} ·{' '}
                      <span className={st.status === 'active' ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                        {st.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={st.paystackVerified ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                        {st.paystackVerified ? 'Verified' : 'Unlinked'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {st.posSessions.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {st.posCheckouts.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {st.posGmvKes.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-500">
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
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Recent Milestone Feed</h4>
            <p className="text-xs text-slate-500">
              Latest non-PII acquisition, store activation, and payment conversion events
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold w-fit">
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
                  feedFilter === tab.id ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No milestone events recorded for this filter yet.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Time</th>
                  <th className="py-2.5 px-3">Milestone Event</th>
                  <th className="py-2.5 px-3">Source / Referrer</th>
                  <th className="py-2.5 px-3">Store / Plan</th>
                  <th className="py-2.5 px-3">Device</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredEvents.map((evt) => {
                  const meta = EVENT_LABELS[evt.eventType] || {
                    label: evt.eventType,
                    category: 'funnel' as FeedCategoryFilter,
                    tone: 'text-slate-700',
                  };
                  return (
                    <tr key={evt.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        {new Date(evt.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className={`py-2 px-3 font-semibold ${meta.tone}`}>
                        {meta.label}
                        {evt.channel ? (
                          <span className="ml-1.5 text-[11px] font-normal text-slate-500 uppercase">
                            ({evt.channel})
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {evt.utmSource || evt.referrerHost || 'direct'}
                        {evt.utmCampaign ? ` · ${evt.utmCampaign}` : ''}
                      </td>
                      <td className="py-2 px-3 text-slate-700">
                        {evt.businessName || evt.planId || evt.pageName || 'Public'}
                      </td>
                      <td className="py-2 px-3 capitalize text-slate-500">{evt.deviceType}</td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums font-medium text-slate-900">
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
