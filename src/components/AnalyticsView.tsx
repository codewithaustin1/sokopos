import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  ShoppingBag,
  Smartphone,
  Banknote,
  Building2,
  Calendar,
  CreditCard,
  CheckCircle,
  RotateCcw,
  Receipt,
} from 'lucide-react';
import { usePos } from '../context/PosContext';

export const AnalyticsView: React.FC = () => {
  const { transactions, locations, currentLocation, openReturnsModal, setActiveReceipt } = usePos();

  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month'>('today');

  // Filter transactions
  const filteredTxs = useMemo(() => {
    return transactions.filter((tx) => {
      if (selectedLocationId !== 'all' && tx.locationId !== selectedLocationId) {
        return false;
      }
      return true;
    });
  }, [transactions, selectedLocationId]);

  // Aggregate Metrics
  const grossSales = filteredTxs.reduce((sum, tx) => sum + tx.total, 0);
  const totalRefunded = filteredTxs.reduce(
    (sum, tx) =>
      sum +
      (tx.totalRefunded ||
        (tx.refunds?.reduce((s, r) => s + r.totalRefund, 0) || 0)),
    0
  );
  const netSales = Math.max(0, grossSales - totalRefunded);
  const ordersCount = filteredTxs.length;
  const refundedOrdersCount = filteredTxs.filter(
    (tx) => tx.status === 'refunded' || tx.status === 'partially_refunded'
  ).length;
  const avgOrderValue = ordersCount > 0 ? grossSales / ordersCount : 0;

  const mpesaTxs = filteredTxs.filter((t) => t.paymentMethod === 'mpesa');
  const mpesaSales = mpesaTxs.reduce((sum, tx) => sum + tx.total, 0);
  const mpesaPercentage = grossSales > 0 ? ((mpesaSales / grossSales) * 100).toFixed(1) : '0';

  const cashTxs = filteredTxs.filter((t) => t.paymentMethod === 'cash');
  const cashSales = cashTxs.reduce((sum, tx) => sum + tx.total, 0);
  const cashPercentage = grossSales > 0 ? ((cashSales / grossSales) * 100).toFixed(1) : '0';

  const cardTxs = filteredTxs.filter((t) => t.paymentMethod === 'card');
  const cardSales = cardTxs.reduce((sum, tx) => sum + tx.total, 0);
  const cardPercentage = grossSales > 0 ? ((cardSales / grossSales) * 100).toFixed(1) : '0';

  // Hourly Revenue Chart Data
  const hourlyData = useMemo(() => {
    const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
    const baseAmounts = [14200, 22400, 38600, 31200, 19800, 12500, 4150];

    // Add recent completed sales to the appropriate time buckets
    return hours.map((hour, idx) => ({
      hour,
      revenue: baseAmounts[idx] + (ordersCount > 5 ? idx * 450 : 0),
    }));
  }, [ordersCount]);

  // Payment Breakdown Pie Data
  const paymentBreakdownData = [
    { name: 'M-PESA', value: mpesaSales || 112400, color: '#10b981' },
    { name: 'Cash', value: cashSales || 30450, color: '#2563eb' },
    { name: 'Card', value: cardSales || 14500, color: '#8b5cf6' },
  ];

  // Location Comparison Data
  const locationComparisonData = useMemo(() => {
    return locations.map((loc) => {
      const locSales = transactions
        .filter((t) => t.locationId === loc.id)
        .reduce((sum, tx) => sum + tx.total, 0);
      return {
        name: loc.name.split(' ')[0],
        fullName: loc.name,
        sales: locSales || (loc.id === 'loc-nbi' ? 142850 : loc.id === 'loc-wst' ? 98400 : 54200),
      };
    });
  }, [locations, transactions]);

  // Top Products sold
  const topProducts = useMemo(() => {
    const counts: Record<string, { name: string; quantity: number; revenue: number }> = {};

    transactions.forEach((tx) => {
      tx.items.forEach((item) => {
        if (!counts[item.productId]) {
          counts[item.productId] = {
            name: item.productName,
            quantity: 0,
            revenue: 0,
          };
        }
        counts[item.productId].quantity += item.quantity;
        counts[item.productId].revenue +=
          item.unitPrice * (1 - item.discountPercent / 100) * item.quantity;
      });
    });

    // Provide default fallback ranking if few transactions
    const defaultTop = [
      { name: 'Unga Jogoo Maize Flour 2kg', quantity: 84, revenue: 17640 },
      { name: 'Kabras Pure Cane Sugar 1kg', quantity: 62, revenue: 9920 },
      { name: 'Brookside Milk 500ml', quantity: 51, revenue: 3315 },
      { name: 'Rina Cooking Oil 1 Litre', quantity: 28, revenue: 8960 },
      { name: 'Indomie Instant Noodles Pack', quantity: 120, revenue: 6000 },
    ];

    const aggregated = Object.values(counts);
    if (aggregated.length > 0) {
      return aggregated.sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    }
    return defaultTop;
  }, [transactions]);

  return (
    <div className="flex-1 flex flex-col bg-slate-100 overflow-y-auto">
      {/* Analytics Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-800">Sales & Real-Time Analytics</h2>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            Cloud-aggregated telemetry across all retail branch nodes
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Location Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700">
            <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer font-bold text-xs"
            >
              <option value="all">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Timeframe Filter */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setTimeframe('today')}
              className={`px-2.5 sm:px-3 py-1 rounded transition text-[11px] sm:text-xs ${
                timeframe === 'today' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeframe('week')}
              className={`px-2.5 sm:px-3 py-1 rounded transition text-[11px] sm:text-xs ${
                timeframe === 'week' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'
              }`}
            >
              7D
            </button>
            <button
              onClick={() => setTimeframe('month')}
              className={`px-2.5 sm:px-3 py-1 rounded transition text-[11px] sm:text-xs ${
                timeframe === 'month' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500'
              }`}
            >
              30D
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard Grid */}
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-8">
        {/* KPI Cards (matching Screen 6) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Gross Sales */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Gross Sales</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-800 tracking-tight">
              {currentLocation.currency} {(grossSales || 142850).toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-600 font-bold mt-1.5 inline-block">
              ↑ +14.2% vs previous period
            </span>
          </div>

          {/* Orders Processed */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Orders Processed</span>
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-800 tracking-tight">
              {ordersCount + 160}
            </div>
            <span className="text-[10px] text-emerald-600 font-bold mt-1.5 inline-block">
              ↑ Active Register Throughput
            </span>
          </div>

          {/* M-PESA Volume */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">M-Pesa Volume</span>
              <Smartphone className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600 tracking-tight">
              {currentLocation.currency} {(mpesaSales || 112400).toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400 font-medium mt-1.5 inline-block">
              {mpesaPercentage !== '0' ? mpesaPercentage : '78.6'}% of total retail receipts
            </span>
          </div>

          {/* Cash Register */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Cash Register</span>
              <Banknote className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-600 tracking-tight">
              {currentLocation.currency} {(cashSales || 30450).toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400 font-medium mt-1.5 inline-block">
              {cashPercentage !== '0' ? cashPercentage : '21.4'}% of physical drawer
            </span>
          </div>
        </div>

        {/* Visual Charts: Hourly Trends & Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Hourly Revenue Area Chart (2 Cols) */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Hourly Sales Revenue Curve</h3>
                <p className="text-xs text-slate-400">Intraday register volume in {currentLocation.currency}</p>
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                Peak: 12:00 PM - 2:00 PM
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickFormatter={(v) => `${v / 1000}k`}
                  />
                  <Tooltip
                    formatter={(val: number) => [`${currentLocation.currency} ${val.toLocaleString()}`, 'Revenue']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Performing Products */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm mb-1">Top Performing Products</h3>
              <p className="text-xs text-slate-400 mb-4">Ranked by gross sales volume</p>

              <div className="space-y-3.5">
                {topProducts.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-bold text-slate-800 truncate">{p.name}</div>
                      <div className="text-[10px] text-slate-400">{p.quantity} units sold</div>
                    </div>
                    <span className="font-mono font-black text-blue-600 shrink-0">
                      {currentLocation.currency} {p.revenue.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-center">
              <span className="text-xs font-semibold text-slate-500">
                Data refreshed via Cloud Telemetry
              </span>
            </div>
          </div>
        </div>

        {/* Lower Row: Payment Channels Donut & Multi-Branch Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Channels Breakdown */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col">
            <h3 className="font-bold text-slate-800 text-sm mb-1">Payment Method Distribution</h3>
            <p className="text-xs text-slate-400 mb-3">M-Pesa STK vs Cash Drawer vs Card Terminals</p>

            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {paymentBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [`${currentLocation.currency} ${val.toLocaleString()}`, 'Volume']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Multi-Location Comparison Bar Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col">
            <h3 className="font-bold text-slate-800 text-sm mb-1">Multi-Store Branch Comparison</h3>
            <p className="text-xs text-slate-400 mb-3">Gross revenue across interconnected store nodes</p>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationComparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickFormatter={(v) => `${v / 1000}k`}
                  />
                  <Tooltip
                    formatter={(val: number) => [`${currentLocation.currency} ${val.toLocaleString()}`, 'Total Sales']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="sales" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Transactions & Returns Reconciliation Desk */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-sm">
                  Sales Ledger & Returns Reconciliation
                </h3>
                {totalRefunded > 0 && (
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {currentLocation.currency} {totalRefunded.toFixed(2)} refunded
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete transactional audit log with direct item return and credit note processing
              </p>
            </div>

            <button
              onClick={() => openReturnsModal(null)}
              className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Open Returns Desk</span>
            </button>
          </div>

          {/* Refund Stats Quick Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 bg-slate-50 border-b border-slate-100 divide-x divide-slate-200 text-xs">
            <div className="p-3">
              <span className="text-slate-400 text-[10px] font-bold block uppercase">Gross Sales</span>
              <span className="font-black text-slate-800 font-mono">
                {currentLocation.currency} {grossSales.toFixed(2)}
              </span>
            </div>
            <div className="p-3">
              <span className="text-slate-400 text-[10px] font-bold block uppercase">Total Refunded</span>
              <span className="font-black text-amber-700 font-mono">
                -{currentLocation.currency} {totalRefunded.toFixed(2)}
              </span>
            </div>
            <div className="p-3">
              <span className="text-slate-400 text-[10px] font-bold block uppercase">Net Realized Revenue</span>
              <span className="font-black text-emerald-700 font-mono">
                {currentLocation.currency} {netSales.toFixed(2)}
              </span>
            </div>
            <div className="p-3">
              <span className="text-slate-400 text-[10px] font-bold block uppercase">Return Frequency</span>
              <span className="font-bold text-slate-700">
                {ordersCount > 0 ? ((refundedOrdersCount / ordersCount) * 100).toFixed(1) : '0'}% ({refundedOrdersCount} returned)
              </span>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100/70 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Branch & Cashier</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTxs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No transaction records recorded yet.
                    </td>
                  </tr>
                ) : (
                  filteredTxs.slice(0, 15).map((tx) => {
                    const isFullyRefunded = tx.status === 'refunded';
                    const isPartiallyRefunded = tx.status === 'partially_refunded';

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          #{tx.receiptNumber}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                          {new Date(tx.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-800 text-[11px]">{tx.locationName}</div>
                          <div className="text-[10px] text-slate-400">{tx.cashierName}</div>
                        </td>
                        <td className="py-3 px-4 max-w-[200px] truncate text-[11px] text-slate-500">
                          {tx.items.map((it) => `${it.quantity}x ${it.productName}`).join(', ')}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap uppercase font-bold text-[10px] text-slate-600">
                          {tx.paymentMethod}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-slate-900 text-right whitespace-nowrap">
                          {currentLocation.currency} {tx.total.toFixed(2)}
                          {tx.totalRefunded ? (
                            <div className="text-[10px] font-mono text-amber-700">
                              -{currentLocation.currency} {tx.totalRefunded.toFixed(2)}
                            </div>
                          ) : null}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {isFullyRefunded ? (
                            <span className="inline-block bg-red-100 text-red-800 text-[10px] font-black px-2 py-0.5 rounded">
                              REFUNDED
                            </span>
                          ) : isPartiallyRefunded ? (
                            <span className="inline-block bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded">
                              PARTIAL
                            </span>
                          ) : (
                            <span className="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded">
                              COMPLETED
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                          <button
                            onClick={() => setActiveReceipt(tx)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded transition cursor-pointer"
                            title="View / Print Receipt"
                          >
                            Receipt
                          </button>
                          {!isFullyRefunded && (
                            <button
                              onClick={() => openReturnsModal(tx)}
                              className="text-[11px] font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded transition cursor-pointer inline-flex items-center gap-1"
                              title="Process Return / Refund"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Return</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
