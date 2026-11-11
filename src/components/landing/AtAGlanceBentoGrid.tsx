import React, { useState } from 'react';
import { motion, Variants } from 'framer-motion';
import {
  WifiOff,
  Wifi,
  TrendingUp,
  Award,
  Database,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ShoppingCart,
  UserCheck,
  BarChart3,
  Zap,
} from 'lucide-react';

export const AtAGlanceBentoGrid: React.FC = () => {
  // Card 1 State: Offline Resilience Simulator
  const [isOfflineSimulated, setIsOfflineSimulated] = useState(false);
  const [queuedOfflineSales, setQueuedOfflineSales] = useState(3);
  const [simulatedLocalSalesTotal, setSimulatedLocalSalesTotal] = useState(4850);

  // Card 2 State: Real-Time Analytics View Filter
  const [analyticsFilter, setAnalyticsFilter] = useState<'today' | 'peaks' | 'skus'>('today');

  // Card 3 State: Loyalty & Store Credit Calculator
  const [purchaseAmount, setPurchaseAmount] = useState<number>(2500);
  const loyaltyPointsEarned = Math.floor(purchaseAmount / 100);
  const creditLimit = 20000;
  const currentCreditTab = 8450 + purchaseAmount;
  const creditUsagePercentage = Math.min(100, Math.round((currentCreditTab / creditLimit) * 100));

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.18,
        delayChildren: 0.1,
      },
    },
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 28 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.55,
        ease: 'easeOut',
      },
    },
  };

  const handleSimulateOfflineSale = () => {
    setQueuedOfflineSales((prev) => prev + 1);
    setSimulatedLocalSalesTotal((prev) => prev + 1250);
  };

  return (
    <section id="at-a-glance" className="sp-s relative overflow-hidden bg-[#f4f7f6]">
      <div className="sp-wrap">
        {/* Section Header */}
        <div className="max-w-3xl mb-10 text-left">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1565d8] mb-2 tracking-wide uppercase">
            <span>01. Ecosystem Architecture</span>
            <span aria-hidden="true">·</span>
            <span>At a Glance</span>
          </div>
          <h2 className="sp-t">Engineered for absolute terminal uptime &amp; retail growth.</h2>
          <p className="sp-sub">
            Three core pillars designed to keep your tills trading without internet drops, optimize hourly sales margins, and retain high-value local customers.
          </p>
        </div>

        {/* Staggered Bento Grid */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {/* CARD 1: OFFLINE RESILIENCE (5 Cols) */}
          <motion.div
            variants={cardVariants}
            className="lg:col-span-5 bg-white border border-[#d9e1e6] rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div>
              {/* Unboxed Metadata (Zero-Pill Discipline) */}
              <div className="flex items-center justify-between text-xs text-[#4c5a6b] font-medium mb-3">
                <div className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-[#1565d8]" />
                  <span>IndexedDB Local Engine</span>
                </div>
                <span>Zero Latency</span>
              </div>

              <h3 className="text-xl font-bold text-[#0e1a2b] mb-2 tracking-tight">
                Zero-Downtime Offline Resilience
              </h3>
              <p className="text-sm text-[#4c5a6b] leading-relaxed mb-6">
                Network outages never stall your checkout counters. SokoPoS processes transactions, calculates tax, and prints receipts locally with zero network dependency.
              </p>
            </div>

            {/* Interactive Offline Simulation Container */}
            <div className="bg-[#f4f7f6] border border-[#d9e1e6] rounded-xl p-4.5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#d9e1e6] pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isOfflineSimulated ? 'bg-amber-500 animate-pulse' : 'bg-emerald-600'
                    }`}
                  />
                  <span className="text-xs font-bold text-[#0e1a2b]">
                    {isOfflineSimulated ? 'Offline Mode (Local Storage)' : 'Online (Cloud Sync Active)'}
                  </span>
                </div>

                {/* Interactive State Toggle */}
                <button
                  type="button"
                  onClick={() => setIsOfflineSimulated((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    isOfflineSimulated
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-white text-[#1565d8] border border-[#d9e1e6] hover:bg-slate-50'
                  }`}
                >
                  {isOfflineSimulated ? (
                    <>
                      <WifiOff className="w-3 h-3 text-amber-700" />
                      <span>Simulating Outage</span>
                    </>
                  ) : (
                    <>
                      <Wifi className="w-3 h-3 text-[#1565d8]" />
                      <span>Test Offline Switch</span>
                    </>
                  )}
                </button>
              </div>

              {/* Dynamic Queue Telemetry */}
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="bg-white p-3 rounded-lg border border-[#d9e1e6]">
                  <span className="text-[11px] text-[#4c5a6b] font-medium block mb-0.5">
                    Queued Offline Sales
                  </span>
                  <span className="text-lg font-extrabold font-mono text-[#0e1a2b] tabular-nums">
                    {queuedOfflineSales} transactions
                  </span>
                </div>

                <div className="bg-white p-3 rounded-lg border border-[#d9e1e6]">
                  <span className="text-[11px] text-[#4c5a6b] font-medium block mb-0.5">
                    Local Vault Total
                  </span>
                  <span className="text-lg font-extrabold font-mono text-[#0a7d46] tabular-nums">
                    KES {simulatedLocalSalesTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Action Control */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleSimulateOfflineSale}
                  className="w-full py-2 px-3 bg-[#1565d8] hover:bg-[#1255b5] active:scale-[0.98] text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Simulate Offline Sale (+KES 1,250)</span>
                </button>
              </div>

              <div className="text-[11px] text-[#4c5a6b] text-center pt-1">
                {isOfflineSimulated ? (
                  <span className="text-amber-700 font-bold flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-amber-600" />
                    All receipts &amp; shift totals saved in resilient local cache
                  </span>
                ) : (
                  <span>Auto-uploads queued sales to Firestore within 2 seconds of reconnection</span>
                )}
              </div>
            </div>
          </motion.div>

          {/* CARD 2: REAL-TIME ANALYTICS (7 Cols) */}
          <motion.div
            variants={cardVariants}
            className="lg:col-span-7 bg-white border border-[#d9e1e6] rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div>
              {/* Unboxed Metadata Header */}
              <div className="flex items-center justify-between text-xs text-[#4c5a6b] font-medium mb-3">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#0a7d46]" />
                  <span>Live Business Intelligence</span>
                </div>
                <span>Multi-Till Aggregation</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-[#0e1a2b] tracking-tight">
                    Real-Time Analytics &amp; Revenue Velocity
                  </h3>
                  <p className="text-sm text-[#4c5a6b] leading-relaxed mt-1">
                    Instant visibility into peak trading hours, top-moving inventory items, and profit margins.
                  </p>
                </div>

                {/* Interactive Segmented Control (Functional Buttons, No Candy Pills) */}
                <div className="flex bg-[#f4f7f6] p-1 rounded-lg border border-[#d9e1e6] shrink-0 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => setAnalyticsFilter('today')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                      analyticsFilter === 'today'
                        ? 'bg-white text-[#0e1a2b] shadow-2xs'
                        : 'text-[#4c5a6b] hover:text-[#0e1a2b]'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalyticsFilter('peaks')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                      analyticsFilter === 'peaks'
                        ? 'bg-white text-[#0e1a2b] shadow-2xs'
                        : 'text-[#4c5a6b] hover:text-[#0e1a2b]'
                    }`}
                  >
                    Peak Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalyticsFilter('skus')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                      analyticsFilter === 'skus'
                        ? 'bg-white text-[#0e1a2b] shadow-2xs'
                        : 'text-[#4c5a6b] hover:text-[#0e1a2b]'
                    }`}
                  >
                    Top SKUs
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive Analytics Preview Display */}
            <div className="bg-[#f4f7f6] border border-[#d9e1e6] rounded-xl p-4.5 space-y-4">
              {/* Dynamic Content Views */}
              {analyticsFilter === 'today' && (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs text-[#4c5a6b] font-medium block">Total Revenue Today</span>
                      <span className="text-2xl font-black font-mono text-[#0e1a2b] tabular-nums">
                        KES 184,920.00
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-[#0a7d46] flex items-center justify-end gap-0.5">
                        <ArrowUpRight className="w-4 h-4" /> +22.4% vs Yesterday
                      </span>
                      <span className="text-[11px] text-[#4c5a6b]">342 completed checkouts</span>
                    </div>
                  </div>

                  {/* Simulated Revenue Sparkline Bar Chart */}
                  <div className="h-24 pt-2 flex items-end gap-2 border-b border-[#d9e1e6] pb-3">
                    {[35, 48, 62, 40, 85, 95, 110, 78, 92, 130, 115, 88].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div
                          style={{ height: `${(h / 130) * 100}%` }}
                          className={`w-full rounded-t-sm transition-all duration-300 ${
                            i === 9 ? 'bg-[#1565d8]' : 'bg-[#1565d8]/30 group-hover:bg-[#1565d8]/70'
                          }`}
                        />
                        <span className="text-[9px] font-mono text-[#4c5a6b]">
                          {i + 8}h
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#4c5a6b]">
                    <span>Peak Rush: <strong className="text-[#0e1a2b]">5:00 PM – 7:00 PM</strong></span>
                    <span>Gross Profit Margin: <strong className="text-[#0a7d46] font-mono font-bold">28.4%</strong></span>
                  </div>
                </div>
              )}

              {analyticsFilter === 'peaks' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0e1a2b] uppercase tracking-wider">
                      Hourly Till Rush Heatmap
                    </span>
                    <span className="text-xs font-mono text-[#1565d8] font-semibold">
                      Main Branch · 4 Tills Active
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="bg-white p-2.5 rounded-lg border border-[#d9e1e6] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#1565d8]" />
                        <span className="font-bold text-[#0e1a2b]">12:00 PM - 2:00 PM (Lunch Rush)</span>
                      </div>
                      <span className="font-mono font-bold text-[#0e1a2b] tabular-nums">
                        98 orders · KES 52,400.00
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-[#d9e1e6] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#0a7d46]" />
                        <span className="font-bold text-[#0e1a2b]">5:00 PM - 8:00 PM (Evening Peak)</span>
                      </div>
                      <span className="font-mono font-bold text-[#0a7d46] tabular-nums">
                        164 orders · KES 94,150.00
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#4c5a6b] text-center pt-1">
                    Staffing recommendation: Schedule 2 extra cashiers between 5:00 PM and 7:30 PM
                  </div>
                </div>
              )}

              {analyticsFilter === 'skus' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-[#0e1a2b]">
                    <span>Product Name</span>
                    <span>Units Sold</span>
                  </div>

                  {[
                    { name: 'Fresh Whole Milk 500ml', units: '218 units', rev: 'KES 14,170.00' },
                    { name: 'White Loaf Bread 400g', units: '184 units', rev: 'KES 12,880.00' },
                    { name: 'Pure Sugar 1kg Pack', units: '142 units', rev: 'KES 22,720.00' },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-2.5 rounded-lg border border-[#d9e1e6] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#1565d8]">0{idx + 1}.</span>
                        <span className="font-semibold text-[#0e1a2b]">{item.name}</span>
                      </div>
                      <div className="text-right font-mono">
                        <span className="font-bold text-[#0e1a2b] block">{item.units}</span>
                        <span className="text-[10px] text-[#4c5a6b]">{item.rev}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* CARD 3: CUSTOMER LOYALTY & DAFTARI STORE CREDIT (12 Cols Full Width Banner Card) */}
          <motion.div
            variants={cardVariants}
            className="lg:col-span-12 bg-white border border-[#d9e1e6] rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6 hover:border-slate-300 transition-colors"
          >
            {/* Text Description (Left) */}
            <div className="lg:w-5/12 space-y-3 text-left">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1565d8] tracking-wide uppercase">
                <Award className="w-4 h-4" />
                <span>Customer Retention Engine</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-extrabold text-[#0e1a2b] tracking-tight">
                Customer Loyalty &amp; Daftari Store Credit Tabs
              </h3>

              <p className="text-sm text-[#4c5a6b] leading-relaxed">
                Reward repeat shoppers with automatic points accrual on every checkout. Manage trusted customer store credit tabs with strict credit limit guardrails.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-[#0e1a2b]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0a7d46]" />
                  <span>Automatic Points Accrual</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0a7d46]" />
                  <span>Credit Limit Enforcement</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0a7d46]" />
                  <span>SMS Receipt Reminders</span>
                </div>
              </div>
            </div>

            {/* Interactive Calculator Widget (Right) */}
            <div className="lg:w-7/12 w-full bg-[#f4f7f6] border border-[#d9e1e6] rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d9e1e6] pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#1565d8]" />
                  <span className="text-xs font-bold text-[#0e1a2b]">
                    Loyalty &amp; Tab Simulator
                  </span>
                </div>
                <span className="text-xs text-[#4c5a6b]">
                  Customer: <strong className="text-[#0e1a2b]">John Mutua</strong> (#C-104)
                </span>
              </div>

              {/* Purchase Slider Selector */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#0e1a2b] mb-1.5">
                  <span>Simulate Checkout Amount:</span>
                  <span className="font-mono text-[#1565d8] text-sm">
                    KES {purchaseAmount.toLocaleString()}
                  </span>
                </div>

                <div className="flex gap-2 mb-2">
                  {[1000, 2500, 5000, 10000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPurchaseAmount(amt)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                        purchaseAmount === amt
                          ? 'bg-[#1565d8] text-white shadow-2xs'
                          : 'bg-white text-[#0e1a2b] border border-[#d9e1e6] hover:bg-slate-50'
                      }`}
                    >
                      KES {amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Outcome Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Metric 1: Points Earned */}
                <div className="bg-white p-3 rounded-lg border border-[#d9e1e6] text-left">
                  <span className="text-[11px] text-[#4c5a6b] font-medium block mb-0.5">
                    Loyalty Reward Earned
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black font-mono text-[#1565d8] tabular-nums">
                      +{loyaltyPointsEarned} pts
                    </span>
                    <span className="text-[11px] text-[#4c5a6b] font-medium">
                      (1 pt / KES 100)
                    </span>
                  </div>
                </div>

                {/* Metric 2: Daftari Credit Tab */}
                <div className="bg-white p-3 rounded-lg border border-[#d9e1e6] text-left">
                  <span className="text-[11px] text-[#4c5a6b] font-medium block mb-0.5">
                    Updated Daftari Credit Tab
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-black font-mono text-[#0e1a2b] tabular-nums">
                      KES {currentCreditTab.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-mono text-[#4c5a6b]">
                      Max KES {creditLimit.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Credit Limit Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-[#4c5a6b] font-medium mb-1">
                  <span>Credit Tab Utilization</span>
                  <span className="font-mono font-bold text-[#0e1a2b]">
                    {creditUsagePercentage}% Used
                  </span>
                </div>
                <div className="w-full h-2.5 bg-[#d9e1e6] rounded-full overflow-hidden">
                  <div
                    style={{ width: `${creditUsagePercentage}%` }}
                    className={`h-full transition-all duration-300 rounded-full ${
                      creditUsagePercentage > 85 ? 'bg-amber-500' : 'bg-[#0a7d46]'
                    }`}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
