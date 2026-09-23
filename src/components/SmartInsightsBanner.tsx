import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Clock,
  TrendingUp,
  PackageX,
  AlertTriangle,
  Flame,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShoppingBag,
  Coins,
  Store,
  Info,
} from 'lucide-react';
import { Transaction, Product, Location } from '../types';
import { DateRange } from '../types/reporting';

interface SmartInsightsBannerProps {
  transactions: Transaction[];
  products: Product[];
  selectedLocationId: string;
  locations: Location[];
  dateRange: DateRange;
  currency: string;
  onNavigateToReports?: (reportType?: string) => void;
}

export interface RushHourInsight {
  peakHourRange: string;
  transactionCount: number;
  revenue: number;
  percentageOfDailyVolume: number;
  topPaymentMethod: string;
}

export interface FastMovingProductInsight {
  id: string;
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
  currentStock: number;
  daysOfStockLeft: number | null; // estimated
  isLowStockWarning: boolean;
}

export interface DeadInventoryInsight {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  tiedUpCapital: number;
  sellingPrice: number;
  buyingPrice: number;
  daysDormant: number;
}

export const SmartInsightsBanner: React.FC<SmartInsightsBannerProps> = ({
  transactions,
  products,
  selectedLocationId,
  locations,
  dateRange,
  currency,
  onNavigateToReports,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'rush' | 'fast' | 'dead'>('all');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Filter transactions by selected location
  const scopedTransactions = useMemo(() => {
    return (transactions || []).filter((tx) => {
      if (selectedLocationId !== 'all' && tx.locationId !== selectedLocationId) {
        return false;
      }
      return true;
    });
  }, [transactions, selectedLocationId]);

  // Compute Rush Hours Analysis
  const rushHourData = useMemo<RushHourInsight | null>(() => {
    if (scopedTransactions.length === 0) return null;

    // Group transactions by hour of day (0 to 23)
    const hourBuckets: Record<number, { count: number; revenue: number; methods: Record<string, number> }> = {};
    for (let i = 0; i < 24; i++) {
      hourBuckets[i] = { count: 0, revenue: 0, methods: {} };
    }

    let totalRevenue = 0;
    scopedTransactions.forEach((tx) => {
      const date = new Date(tx.timestamp);
      const hour = date.getHours();
      if (hourBuckets[hour]) {
        hourBuckets[hour].count += 1;
        hourBuckets[hour].revenue += tx.total;
        totalRevenue += tx.total;
        const method = tx.paymentMethod || 'other';
        hourBuckets[hour].methods[method] = (hourBuckets[hour].methods[method] || 0) + 1;
      }
    });

    // Find peak 2-hour rolling window or single peak hour
    let peakHour = 12;
    let maxCount = -1;
    let peakRevenue = 0;
    let peakMethods: Record<string, number> = {};

    Object.entries(hourBuckets).forEach(([hStr, data]) => {
      const h = parseInt(hStr, 10);
      if (data.count > maxCount) {
        maxCount = data.count;
        peakHour = h;
        peakRevenue = data.revenue;
        peakMethods = data.methods;
      }
    });

    if (maxCount === 0) return null;

    // Format peak hour range (e.g. 12:00 PM - 2:00 PM)
    const formatHour = (hour: number) => {
      const period = hour >= 12 ? 'PM' : 'AM';
      const adjusted = hour % 12 === 0 ? 12 : hour % 12;
      return `${adjusted}:00 ${period}`;
    };

    const nextHour = (peakHour + 1) % 24;
    const peakHourRange = `${formatHour(peakHour)} – ${formatHour(nextHour)}`;

    // Top payment method in peak hour
    let topMethod = 'M-Pesa';
    let topMethodCount = 0;
    Object.entries(peakMethods).forEach(([m, count]) => {
      if (count > topMethodCount) {
        topMethodCount = count;
        topMethod = m.toUpperCase();
      }
    });

    const percentage = totalRevenue > 0 ? Math.round((peakRevenue / totalRevenue) * 100) : 0;

    return {
      peakHourRange,
      transactionCount: maxCount,
      revenue: peakRevenue,
      percentageOfDailyVolume: percentage,
      topPaymentMethod: topMethod,
    };
  }, [scopedTransactions]);

  // Compute Fast-Moving Items & Stock Runout Warnings
  const fastMovingItems = useMemo<FastMovingProductInsight[]>(() => {
    if (scopedTransactions.length === 0 || products.length === 0) return [];

    const salesByProduct: Record<string, { unitsSold: number; revenue: number; name: string }> = {};

    scopedTransactions.forEach((tx) => {
      tx.items.forEach((item) => {
        if (!salesByProduct[item.productId]) {
          salesByProduct[item.productId] = {
            unitsSold: 0,
            revenue: 0,
            name: item.productName,
          };
        }
        salesByProduct[item.productId].unitsSold += item.quantity;
        salesByProduct[item.productId].revenue +=
          item.unitPrice * (1 - (item.discountPercent || 0) / 100) * item.quantity;
      });
    });

    // Map against catalog products to extract current on-hand stock and velocity
    const insights: FastMovingProductInsight[] = [];

    Object.entries(salesByProduct).forEach(([productId, data]) => {
      const catalogProd = products.find((p) => p.id === productId);
      if (!catalogProd) return;

      // Location specific or total stock
      let currentStock = 0;
      if (selectedLocationId !== 'all') {
        currentStock = Number(catalogProd.stockByLocation[selectedLocationId] || 0);
      } else {
        currentStock = (Object.values(catalogProd.stockByLocation) as number[]).reduce(
          (sum: number, count: number) => sum + (Number(count) || 0),
          0
        );
      }

      // Days of stock remaining calculation (if selling velocity > 0)
      let daysOfStockLeft: number | null = null;
      if (data.unitsSold > 0) {
        // Average daily velocity based on transactions timeframe (at least 1 day)
        const dailyVelocity = Math.max(1, data.unitsSold / 7); // normalized 7-day velocity baseline
        daysOfStockLeft = Math.max(0, Math.round(currentStock / dailyVelocity));
      }

      const isLowStockWarning = currentStock <= (catalogProd.reorderPoint || 10);

      insights.push({
        id: catalogProd.id,
        name: catalogProd.name,
        category: catalogProd.category,
        unitsSold: data.unitsSold,
        revenue: data.revenue,
        currentStock,
        daysOfStockLeft,
        isLowStockWarning,
      });
    });

    // Sort by units sold descending
    return insights.sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 5);
  }, [scopedTransactions, products, selectedLocationId]);

  // Compute Dead Inventory (Zero sales in active transactions but positive capital tied up)
  const deadInventory = useMemo<DeadInventoryInsight[]>(() => {
    if (products.length === 0) return [];

    // Find all product IDs sold in this period
    const soldProductIds = new Set<string>();
    scopedTransactions.forEach((tx) => {
      tx.items.forEach((item) => soldProductIds.add(item.productId));
    });

    const deadItems: DeadInventoryInsight[] = [];

    products.forEach((prod) => {
      // If sold, it's not dead in this timeframe
      if (soldProductIds.has(prod.id)) return;

      let currentStock = 0;
      if (selectedLocationId !== 'all') {
        currentStock = Number(prod.stockByLocation[selectedLocationId] || 0);
      } else {
        currentStock = (Object.values(prod.stockByLocation) as number[]).reduce(
          (sum: number, count: number) => sum + (Number(count) || 0),
          0
        );
      }

      // Only items that have actual positive stock sitting on shelves
      if (currentStock > 0) {
        const tiedUpCapital = currentStock * (prod.buyingPrice || prod.sellingPrice * 0.7);
        deadItems.push({
          id: prod.id,
          name: prod.name,
          category: prod.category,
          currentStock,
          tiedUpCapital,
          sellingPrice: prod.sellingPrice,
          buyingPrice: prod.buyingPrice,
          daysDormant: 30, // dormant throughout tracking period
        });
      }
    });

    // Sort by tied up capital descending to highlight biggest cash drags
    return deadItems.sort((a, b) => b.tiedUpCapital - a.tiedUpCapital).slice(0, 5);
  }, [products, scopedTransactions, selectedLocationId]);

  // Total Capital Tied Up in Dead Stock
  const totalDeadCapital = useMemo(() => {
    return deadInventory.reduce((acc, curr) => acc + curr.tiedUpCapital, 0);
  }, [deadInventory]);

  const locationLabel = useMemo(() => {
    if (selectedLocationId === 'all') return 'All Branches';
    const loc = locations.find((l) => l.id === selectedLocationId);
    return loc ? loc.name : 'Selected Branch';
  }, [selectedLocationId, locations]);

  return (
    <div
      id="smart-insights-banner"
      className="bg-white rounded-2xl border border-blue-200/80 shadow-sm overflow-hidden transition-all duration-200"
    >
      {/* Banner Top Ribbon */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20 shadow-xs">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black tracking-tight">
                Automated Retail Smart Insights
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30">
                Live AI Digest
              </span>
            </div>
            <p className="text-[11px] text-blue-100/80">
              Pattern discovery engine analyzing {locationLabel} across {dateRange.label}
            </p>
          </div>
        </div>

        {/* Filter Pills / Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-black/20 p-1 rounded-xl backdrop-blur-xs text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 font-bold shadow-xs'
                : 'text-blue-100 hover:text-white'
            }`}
          >
            All Insights
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rush')}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] flex items-center gap-1 cursor-pointer ${
              activeTab === 'rush'
                ? 'bg-white text-slate-900 font-bold shadow-xs'
                : 'text-blue-100 hover:text-white'
            }`}
          >
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Rush Hours</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fast')}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] flex items-center gap-1 cursor-pointer ${
              activeTab === 'fast'
                ? 'bg-white text-slate-900 font-bold shadow-xs'
                : 'text-blue-100 hover:text-white'
            }`}
          >
            <Flame className="w-3 h-3 text-emerald-400" />
            <span>Fast-Moving</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dead')}
            className={`px-2.5 py-1 rounded-lg transition text-[11px] flex items-center gap-1 cursor-pointer ${
              activeTab === 'dead'
                ? 'bg-white text-slate-900 font-bold shadow-xs'
                : 'text-blue-100 hover:text-white'
            }`}
          >
            <PackageX className="w-3 h-3 text-rose-300" />
            <span>Dead Inventory</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse Smart Insights' : 'Expand Smart Insights'}
            className="ml-1 p-1 rounded-lg hover:bg-white/15 text-blue-100 transition cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Insights Grid Body */}
      {isExpanded && (
        <div className="p-4 sm:p-5 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CARD 1: RUSH HOURS & PEAK THROUGHPUT */}
            {(activeTab === 'all' || activeTab === 'rush') && (
              <div
                className={`bg-white rounded-xl border transition-all p-4 flex flex-col justify-between shadow-2xs ${
                  activeTab === 'rush' ? 'ring-2 ring-blue-500 border-transparent md:col-span-3' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Peak Rush Window
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      Staffing Alert
                    </span>
                  </div>

                  {rushHourData ? (
                    <div className="mt-3 space-y-3">
                      <div>
                        <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                          {rushHourData.peakHourRange}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Peak traffic window processing{' '}
                          <strong className="text-slate-800 font-bold">{rushHourData.transactionCount} transactions</strong>.
                        </p>
                      </div>

                      {/* Stat Grid */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                          <span className="text-[10px] text-slate-500 block font-medium">Rush Revenue</span>
                          <span className="text-xs font-black text-slate-800">
                            {currency} {rushHourData.revenue.toLocaleString()}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                          <span className="text-[10px] text-slate-500 block font-medium">Daily Share</span>
                          <span className="text-xs font-black text-indigo-700">
                            {rushHourData.percentageOfDailyVolume}% of sales
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-600 bg-amber-50/70 p-2.5 rounded-lg border border-amber-200/70 flex items-start gap-2">
                        <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Recommendation:</strong> Schedule at least 2 active cashiers and verify M-Pesa till network strength before{' '}
                          {rushHourData.peakHourRange.split('–')[0]?.trim()}.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      No transaction timestamp patterns recorded yet in this range.
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Dominant tender:</span>
                  <span className="font-bold text-slate-700">
                    {rushHourData?.topPaymentMethod || 'M-Pesa'}
                  </span>
                </div>
              </div>
            )}

            {/* CARD 2: FAST-MOVING ITEMS & HIGH VELOCITY */}
            {(activeTab === 'all' || activeTab === 'fast') && (
              <div
                className={`bg-white rounded-xl border transition-all p-4 flex flex-col justify-between shadow-2xs ${
                  activeTab === 'fast' ? 'ring-2 ring-emerald-500 border-transparent md:col-span-3' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                        <Flame className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Fast-Moving Velocity
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      High Demand
                    </span>
                  </div>

                  {fastMovingItems.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {fastMovingItems.slice(0, activeTab === 'fast' ? 5 : 3).map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-2 rounded-lg bg-slate-50/80 border border-slate-200/70 hover:bg-emerald-50/40 transition flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black text-slate-400 w-3">
                                #{idx + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-800 truncate block">
                                {item.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 ml-4">
                              <span>{item.unitsSold} units sold</span>
                              <span>•</span>
                              <span className="text-emerald-700 font-semibold">
                                {currency} {Math.round(item.revenue).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md inline-block ${
                                item.isLowStockWarning
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-slate-200/70 text-slate-700'
                              }`}
                            >
                              {item.currentStock} in stock
                            </span>
                            {item.daysOfStockLeft !== null && (
                              <span className="text-[9px] text-slate-400 block mt-0.5">
                                ~{item.daysOfStockLeft}d left
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                      <div className="text-[11px] text-emerald-800 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200/70 flex items-center gap-1.5 mt-2">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          Top driver: <strong>{fastMovingItems[0]?.name}</strong> ({fastMovingItems[0]?.unitsSold} sold).
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      No high-volume sales velocity recorded in this window.
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Reorder urgency:</span>
                  <span className="font-bold text-slate-700">
                    {fastMovingItems.filter((i) => i.isLowStockWarning).length} products critical
                  </span>
                </div>
              </div>
            )}

            {/* CARD 3: DEAD INVENTORY & TIED-UP CASH */}
            {(activeTab === 'all' || activeTab === 'dead') && (
              <div
                className={`bg-white rounded-xl border transition-all p-4 flex flex-col justify-between shadow-2xs ${
                  activeTab === 'dead' ? 'ring-2 ring-rose-500 border-transparent md:col-span-3' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-200">
                        <PackageX className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        Dormant & Dead Stock
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      Capital Drag
                    </span>
                  </div>

                  {deadInventory.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      <div className="bg-rose-50/70 p-2.5 rounded-lg border border-rose-200/80 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-rose-700 font-bold block">Tied-Up Working Capital</span>
                          <span className="text-sm font-black text-rose-900">
                            {currency} {Math.round(totalDeadCapital).toLocaleString()}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-rose-200/80 text-rose-900">
                          {deadInventory.length} zero-turn items
                        </span>
                      </div>

                      {deadInventory.slice(0, activeTab === 'dead' ? 5 : 2).map((item) => (
                        <div
                          key={item.id}
                          className="p-2 rounded-lg bg-slate-50/80 border border-slate-200/70 hover:bg-rose-50/30 transition flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-slate-800 truncate block">
                              {item.name}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              <span>{item.currentStock} units unpurchased</span>
                              <span>•</span>
                              <span className="text-slate-600 font-medium">
                                Value: {currency} {Math.round(item.tiedUpCapital).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 shrink-0">
                            Zero Turns
                          </span>
                        </div>
                      ))}

                      <div className="text-[11px] text-slate-600 bg-slate-100 p-2 rounded-lg border border-slate-200 flex items-start gap-1.5 mt-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Action:</strong> Run clearance promotions or bundle slow items with fast-moving goods to unlock cash.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      Excellent inventory turnover! All stocked items have recorded transactions in this timeframe.
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Turnover health:</span>
                  <span className="font-bold text-emerald-700">
                    {deadInventory.length === 0 ? 'Optimal (100% active)' : `${deadInventory.length} items flagged`}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
