import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Pill,
  ShoppingBag,
  ShoppingCart,
  Store,
  Wine,
  X,
  Zap,
} from 'lucide-react';
import industryRetailShop from '../../assets/images/industry_retail_shop_1794857445198.jpg';
import industryBarRestaurant from '../../assets/images/industry_bar_restaurant_1794857445769.jpg';
import industrySupermarket from '../../assets/images/industry_supermarket_1794857446020.jpg';
import industryPharmacy from '../../assets/images/industry_pharmacy_1794857446477.jpg';
import { usePos } from '../../context/PosContext';

export interface RetailIndustryItem {
  id: 'retail' | 'bars' | 'supermarkets' | 'pharmacies';
  name: string;
  sectorLabel: string;
  headline: string;
  summary: string;
  image: string;
  imageAlt: string;
  metricLabel: string;
  metricValue: string;
  accentGradient: string;
  icon: React.ComponentType<{ className?: string }>;
  overview: string;
  capabilities: string[];
  hardwareSetup: string;
  sampleItems: { item: string; qty: string; totalKes: string }[];
}

export const RETAIL_INDUSTRIES: RetailIndustryItem[] = [
  {
    id: 'retail',
    name: 'Retail & Agrovet',
    sectorLabel: 'Dukas, Agrovets, Hardware & Wholesale',
    headline: 'Stop losing sales to stockouts and unrecorded credit tabs',
    summary:
      'Ring up items in seconds, break bulk sacks into single kilos, and keep every M-Pesa Till or customer credit tab recorded.',
    image: industryRetailShop,
    imageAlt:
      'Kenyan retail shop, agrovet, and hardware cashier scanning items at an M-Pesa POS counter in Nairobi',
    metricLabel: 'Barcode scan speed',
    metricValue: '< 2s / item',
    accentGradient: 'from-emerald-500/90 via-teal-600/85 to-slate-900',
    icon: Store,
    overview:
      'Built for neighborhood dukas, agrovets, hardware stores, and wholesale depots across Nairobi, Mombasa, Kisumu, Nakuru, and Eldoret. Know before fast-moving staples or farm inputs run out, replace torn paper daftari books with digital balances, and match every Lipa na M-Pesa payment automatically.',
    capabilities: [
      'Low-stock alerts before best-selling hardware, feeds, or staples run out',
      'Digital customer credit book (Daftari) with SMS & WhatsApp balance reminders',
      'Wholesale carton-to-piece pricing updated across every counter right away',
      'M-Pesa STK Push and KRA eTIMS receipts printed through Digitax',
    ],
    hardwareSetup: 'Android tablet or browser terminal, USB barcode scanner, and 58mm thermal printer',
    sampleItems: [
      { item: 'Pembe Maize Meal 2kg', qty: '2 pcs', totalKes: 'KES 420.00' },
      { item: 'Ketepa Pride Tea 250g', qty: '1 pkt', totalKes: 'KES 195.00' },
      { item: 'Cooking Oil 1L', qty: '1 btl', totalKes: 'KES 340.00' },
    ],
  },
  {
    id: 'bars',
    name: 'Bars & Hospitality',
    sectorLabel: 'Bars, Wines & Spirits, and Restaurants',
    headline: 'Catch missing tots and settle busy table tabs fast',
    summary:
      'Split table bills across M-Pesa and cash, send food tickets straight to the kitchen, and track every bottle down to the tot.',
    image: industryBarRestaurant,
    imageAlt:
      'Kenyan bar, wines and spirits counter, and restaurant using touch POS software for table bills and M-Pesa',
    metricLabel: 'Tab split & settle',
    metricValue: 'Instant STK',
    accentGradient: 'from-amber-500/90 via-emerald-700/85 to-slate-900',
    icon: Wine,
    overview:
      'Keep evening rush orders organized across wines and spirits shops, lounges, restaurants, and sports bars in Nairobi, Mombasa, Kisumu, Nakuru, and Eldoret. Staff open table tabs, route drink slips to the bar and kitchen orders cleanly, and track 25ml or 50ml tot pours against 750ml bottles.',
    capabilities: [
      'Open, merge, and split group bills across M-Pesa and cash',
      'Separate Kitchen Order Tickets (KOT) and counter bar drink slips',
      'Tot-to-bottle stock tracking that spots unexplained pours early',
      'Scheduled Happy Hour pricing without manual cashier overrides',
    ],
    hardwareSetup: 'Touchscreen POS register, kitchen/bar thermal printers, and waiter mobile access',
    sampleItems: [
      { item: 'Tusker Lager Cold 500ml', qty: '4 btls', totalKes: 'KES 1,280.00' },
      { item: 'Single Malt Tot 50ml', qty: '2 tots', totalKes: 'KES 900.00' },
      { item: 'Nyama Choma Platter 1kg', qty: '1 order', totalKes: 'KES 1,450.00' },
    ],
  },
  {
    id: 'supermarkets',
    name: 'Supermarkets',
    sectorLabel: 'Supermarkets, Minimarts & Multi-Lane Stores',
    headline: 'Keep queues moving—and check every branch from your phone',
    summary:
      'Scan full grocery baskets fast even offline, catch cashier till shortages early, and compare branch totals anywhere.',
    image: industrySupermarket,
    imageAlt:
      'Kenyan supermarket and minimart express lane cashier scanning groceries with offline POS software',
    metricLabel: 'Express lane pace',
    metricValue: '45+ tx / hr',
    accentGradient: 'from-sky-500/90 via-emerald-600/85 to-slate-900',
    icon: ShoppingCart,
    overview:
      'Made for peak weekend queues, minimarts, and multi-aisle Kenyan supermarkets in Nairobi, Mombasa, Kisumu, Nakuru, and Eldoret. Cashiers scan 50+ item baskets quickly with keyboard shortcuts, declare blind cash totals at shift close, and keep ringing up sales even when fiber drops.',
    capabilities: [
      'Fast barcode scanning for 50+ item grocery baskets',
      'Blind shift cash counts that reveal till variances before staff leave',
      'Keeps ringing up sales 100% offline and syncs when internet returns',
      'Monitor live cash, M-Pesa, and stock across Nairobi, coastal & Rift Valley branches',
    ],
    hardwareSetup: 'Desktop/All-in-One terminal, dual-display counter, hands-free scanner, 80mm cutter printer',
    sampleItems: [
      { item: 'Fresh Dairy Milk 500ml', qty: '6 pkts', totalKes: 'KES 390.00' },
      { item: 'Jogoo Maize Flour 2kg', qty: '2 bags', totalKes: 'KES 410.00' },
      { item: 'Basmati Rice 5kg', qty: '1 bag', totalKes: 'KES 1,150.00' },
    ],
  },
  {
    id: 'pharmacies',
    name: 'Pharmacies',
    sectorLabel: 'Chemists & Healthcare Dispensaries',
    headline: 'Spot expiring packs early and dispense down to single strips',
    summary:
      'Track medicine batch numbers, catch 30/60/90-day expiries before stock goes bad, and sell full boxes or blister strips accurately.',
    image: industryPharmacy,
    imageAlt:
      'Kenyan community pharmacy and chemist counter running SokoPoS terminal with batch expiry tracking',
    metricLabel: 'Batch traceability',
    metricValue: '100% audit',
    accentGradient: 'from-teal-500/90 via-sky-700/85 to-slate-900',
    icon: Pill,
    overview:
      'Avoid throwing away expired stock and keep patient dispensing clean across community chemists throughout Kenya. Track batch numbers from supplier delivery to the counter, get early 30/60/90-day expiry warnings, and break boxes into single blister strips without messing up inventory.',
    capabilities: [
      'Batch number and expiry alerts before a medicine sits past date',
      'Sell full boxes, single blister strips, or individual doses accurately',
      'Optional prescriber reference and patient notes printed on receipts',
      'Zero-rated and VAT-exempt items set up cleanly for KRA eTIMS',
    ],
    hardwareSetup: 'Compact counter laptop or tablet, 2D barcode reader, and high-clarity thermal printer',
    sampleItems: [
      { item: 'Amoxicillin 500mg Strip (10s)', qty: '2 strips', totalKes: 'KES 700.00' },
      { item: 'Paracetamol 500mg Box (20s)', qty: '1 box', totalKes: 'KES 120.00' },
      { item: 'Vitamin C Effervescent Tube', qty: '1 tube', totalKes: 'KES 850.00' },
    ],
  },
];

interface SolutionsGalleryProps {
  onLaunchDemo?: () => void;
  onCreateAccount?: () => void;
}

export const SolutionsGallery: React.FC<SolutionsGalleryProps> = ({
  onLaunchDemo,
  onCreateAccount,
}) => {
  const { industryImages } = usePos();
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [modalIndustryId, setModalIndustryId] = useState<RetailIndustryItem['id'] | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setFailedImages({});
  }, [industryImages]);

  const currentIndustry = RETAIL_INDUSTRIES[focusedIndex];
  const prevIndex = (focusedIndex - 1 + RETAIL_INDUSTRIES.length) % RETAIL_INDUSTRIES.length;
  const nextIndex = (focusedIndex + 1) % RETAIL_INDUSTRIES.length;
  const prevIndustry = RETAIL_INDUSTRIES[prevIndex];
  const nextIndustry = RETAIL_INDUSTRIES[nextIndex];

  const activeModalIndustry =
    RETAIL_INDUSTRIES.find((item) => item.id === modalIndustryId) || null;
  const activeModalImage = activeModalIndustry
    ? industryImages[activeModalIndustry.id]?.url || activeModalIndustry.image
    : '';
  const activeModalIndex = activeModalIndustry
    ? RETAIL_INDUSTRIES.findIndex((item) => item.id === activeModalIndustry.id)
    : -1;

  // Close details modal cleanly with Escape key
  useEffect(() => {
    if (!activeModalIndustry) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalIndustryId(null);
      } else if (e.key === 'ArrowRight' && activeModalIndex >= 0) {
        const nextIdx = (activeModalIndex + 1) % RETAIL_INDUSTRIES.length;
        setModalIndustryId(RETAIL_INDUSTRIES[nextIdx].id);
        setFocusedIndex(nextIdx);
      } else if (e.key === 'ArrowLeft' && activeModalIndex >= 0) {
        const prevIdx =
          (activeModalIndex - 1 + RETAIL_INDUSTRIES.length) % RETAIL_INDUSTRIES.length;
        setModalIndustryId(RETAIL_INDUSTRIES[prevIdx].id);
        setFocusedIndex(prevIdx);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModalIndustry, activeModalIndex]);

  const markImageFailed = (id: string) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  const handleStepModalIndustry = (direction: -1 | 1) => {
    if (activeModalIndex < 0) return;
    const nextIdx =
      (activeModalIndex + direction + RETAIL_INDUSTRIES.length) % RETAIL_INDUSTRIES.length;
    setModalIndustryId(RETAIL_INDUSTRIES[nextIdx].id);
    setFocusedIndex(nextIdx);
  };

  const CurrentIcon = currentIndustry.icon;
  const currentResolvedImage =
    industryImages[currentIndustry.id]?.url || currentIndustry.image;
  const isCurrentFailed = Boolean(failedImages[currentIndustry.id]);

  return (
    <div className="w-full space-y-8">
      {/* Horizontal Segmented Industry Switcher Bar (Netlify pattern) */}
      <div className="flex justify-center">
        <div
          role="tablist"
          aria-label="Shop vertical categories"
          className="inline-flex flex-wrap items-center justify-center gap-1.5 p-1.5 rounded-2xl bg-white border border-[#e2e8f0] shadow-xs"
        >
          {RETAIL_INDUSTRIES.map((industry, idx) => {
            const Icon = industry.icon;
            const isSelected = focusedIndex === idx;
            return (
              <button
                key={industry.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setFocusedIndex(idx)}
                className={`inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#28a745] ${
                  isSelected
                    ? 'bg-[#090d16] text-white shadow-xs'
                    : 'text-[#475569] hover:text-[#090d16] hover:bg-[#f8fafc]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{industry.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Peeking Horizontal Showcase Stage */}
      <div className="relative flex items-stretch justify-center gap-5 overflow-hidden py-2">
        {/* Left Peeking Adjacent Gradient Card (Desktop) */}
        <button
          type="button"
          onClick={() => setFocusedIndex(prevIndex)}
          aria-label={`View ${prevIndustry.name}`}
          className={`hidden xl:flex w-44 shrink-0 rounded-3xl bg-gradient-to-br ${prevIndustry.accentGradient} p-6 flex-col justify-between text-left text-white opacity-75 hover:opacity-95 transition-all duration-200 -rotate-1 hover:rotate-0 cursor-pointer shadow-md`}
        >
          <span className="text-xs font-bold tracking-tight opacity-85">Previous vertical</span>
          <div>
            <span className="block text-lg font-extrabold leading-tight">{prevIndustry.name}</span>
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold opacity-90">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Switch</span>
            </span>
          </div>
        </button>

        {/* Center Active Vertical Showcase Card */}
        <article className="w-full max-w-5xl rounded-3xl border border-[#e2e8f0] bg-[#090d16] text-white overflow-hidden shadow-xl shadow-slate-950/15 grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Left Narrative & CTA Surface */}
          <div className="lg:col-span-6 p-6 sm:p-9 lg:p-10 flex flex-col justify-between gap-6 bg-gradient-to-br from-[#090d16] via-[#0f172a] to-[#064e3b]/80">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                <span className="font-bold">{currentIndustry.name}</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-300 truncate">{currentIndustry.sectorLabel}</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-[1.15] text-white text-balance">
                {currentIndustry.headline}
              </h3>

              <p className="text-sm sm:text-[15px] text-slate-300 leading-relaxed">
                {currentIndustry.summary}
              </p>

              {/* Sample Kenyan Counter Receipt Preview */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="font-semibold">Sample Counter Ticket</span>
                  <span className="font-mono text-emerald-300 tabular-nums">
                    {currentIndustry.metricLabel}: {currentIndustry.metricValue}
                  </span>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  {currentIndustry.sampleItems.slice(0, 2).map((row) => (
                    <div
                      key={row.item}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="text-slate-200 truncate">
                        {row.item} <span className="text-slate-400">({row.qty})</span>
                      </span>
                      <span className="font-mono font-bold text-white tabular-nums shrink-0">
                        {row.totalKes}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                id={`solutions-learn-more-${currentIndustry.id}`}
                onClick={() => setModalIndustryId(currentIndustry.id)}
                className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[42px] rounded-full bg-white text-[#090d16] hover:bg-emerald-50 text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Read the workflow</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              {onLaunchDemo && (
                <button
                  type="button"
                  onClick={onLaunchDemo}
                  className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-full border border-white/25 text-white hover:bg-white/10 text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Zap className="w-3.5 h-3.5 shrink-0" />
                  <span>Test in Demo</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Full-Bleed Shop Photography with Scrim & Fallback */}
          <div className="lg:col-span-6 relative min-h-[260px] lg:min-h-[400px] bg-slate-900 overflow-hidden">
            {isCurrentFailed ? (
              <div
                className={`w-full h-full bg-gradient-to-br ${currentIndustry.accentGradient} flex flex-col items-center justify-center p-8 text-center text-white`}
              >
                <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mb-4">
                  <CurrentIcon className="w-7 h-7" />
                </div>
                <span className="text-lg font-extrabold">{currentIndustry.name}</span>
                <span className="text-xs text-white/80 mt-1">{currentIndustry.sectorLabel}</span>
              </div>
            ) : (
              <img
                src={currentResolvedImage}
                alt={currentIndustry.imageAlt}
                referrerPolicy="no-referrer"
                onError={() => markImageFailed(currentIndustry.id)}
                className="w-full h-full object-cover transition-transform duration-500 motion-reduce:transition-none"
              />
            )}
            <div
              className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent pointer-events-none"
              aria-hidden="true"
            />
            <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between gap-3 text-xs text-white/90">
              <span className="font-semibold truncate">{currentIndustry.hardwareSetup}</span>
            </div>
          </div>
        </article>

        {/* Right Peeking Adjacent Gradient Card (Desktop) */}
        <button
          type="button"
          onClick={() => setFocusedIndex(nextIndex)}
          aria-label={`View ${nextIndustry.name}`}
          className={`hidden xl:flex w-44 shrink-0 rounded-3xl bg-gradient-to-br ${nextIndustry.accentGradient} p-6 flex-col justify-between text-left text-white opacity-75 hover:opacity-95 transition-all duration-200 rotate-1 hover:rotate-0 cursor-pointer shadow-md`}
        >
          <span className="text-xs font-bold tracking-tight opacity-85">Next vertical</span>
          <div>
            <span className="block text-lg font-extrabold leading-tight">{nextIndustry.name}</span>
            <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold opacity-90">
              <span>Explore</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </button>
      </div>

      {/* Industry Details Modal (Rendered in Portal on "Read the workflow") */}
      {activeModalIndustry &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            id="solutions-detail-overlay"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                setModalIndustryId(null);
              }
            }}
            className="fixed inset-0 z-[110] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="solution-detail-title"
              className="w-full max-w-4xl bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl overflow-hidden my-auto text-[#090d16]"
              style={{
                fontFamily: '"Bricolage Grotesque", system-ui, -apple-system, "Segoe UI", sans-serif',
              }}
            >
              {/* Top Utility Bar */}
              <div className="px-5 sm:px-6 py-4 bg-[#f8fafc] border-b border-[#e2e8f0] flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs font-medium text-[#475569] min-w-0">
                  <span className="font-bold text-[#28a745] whitespace-nowrap shrink-0">
                    {activeModalIndustry.name}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{activeModalIndustry.sectorLabel}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStepModalIndustry(-1)}
                    aria-label="Previous industry"
                    className="w-9 h-9 rounded-lg border border-[#e2e8f0] bg-white hover:bg-slate-50 flex items-center justify-center text-[#090d16] transition cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStepModalIndustry(1)}
                    aria-label="Next industry"
                    className="w-9 h-9 rounded-lg border border-[#e2e8f0] bg-white hover:bg-slate-50 flex items-center justify-center text-[#090d16] transition cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    id="solutions-detail-close-btn"
                    onClick={() => setModalIndustryId(null)}
                    aria-label="Close industry details"
                    className="w-9 h-9 rounded-lg border border-[#e2e8f0] bg-white hover:bg-slate-100 flex items-center justify-center text-[#090d16] transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 2-Column Split Detail Content */}
              <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
                {/* Left Column: High-Res Visual + Sample Counter Basket */}
                <div className="md:col-span-5 bg-[#f8fafc] border-b md:border-b-0 md:border-r border-[#e2e8f0] flex flex-col justify-between">
                  <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden border-b border-[#e2e8f0]">
                    {failedImages[activeModalIndustry.id] ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-100">
                        <ShoppingBag className="w-8 h-8 text-[#28a745] mb-2" />
                        <span className="text-sm font-bold text-[#090d16]">
                          {activeModalIndustry.name}
                        </span>
                      </div>
                    ) : (
                      <img
                        src={activeModalImage}
                        alt={activeModalIndustry.imageAlt}
                        referrerPolicy="no-referrer"
                        onError={() => markImageFailed(activeModalIndustry.id)}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Typical Kenyan Basket Snapshot */}
                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-[#475569] mb-2.5 flex items-center justify-between">
                        <span>Typical Kenyan Till Receipt</span>
                        <span className="font-mono text-[#28a745] tabular-nums">
                          {activeModalIndustry.metricValue}
                        </span>
                      </div>
                      <div className="space-y-2 border-t border-[#e2e8f0] pt-2.5">
                        {activeModalIndustry.sampleItems.map((row) => (
                          <div
                            key={row.item}
                            className="flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-semibold text-[#090d16] block truncate">
                                {row.item}
                              </span>
                              <span className="text-[11px] text-[#475569]">{row.qty}</span>
                            </div>
                            <span className="font-mono font-semibold text-[#090d16] tabular-nums shrink-0">
                              {row.totalKes}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#e2e8f0] text-[11px] text-[#475569]">
                      <strong className="text-[#090d16] block mb-0.5">Recommended Counter</strong>
                      <span>{activeModalIndustry.hardwareSetup}</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Workflow Capabilities & Actions */}
                <div className="md:col-span-7 p-6 sm:p-7 flex flex-col justify-between gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3
                        id="solution-detail-title"
                        className="text-2xl font-extrabold text-[#090d16] tracking-tight text-balance"
                      >
                        {activeModalIndustry.headline}
                      </h3>
                      <p className="text-sm text-[#475569] mt-2 leading-relaxed">
                        {activeModalIndustry.overview}
                      </p>
                    </div>

                    <div className="pt-2">
                      <h4 className="text-xs font-bold text-[#090d16] mb-3">
                        How this helps your counter run smoothly
                      </h4>
                      <ul className="space-y-2.5">
                        {activeModalIndustry.capabilities.map((cap) => (
                          <li key={cap} className="flex items-start gap-2.5 text-sm text-[#090d16]">
                            <span className="w-5 h-5 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#28a745] shrink-0 mt-0.5">
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            </span>
                            <span className="leading-snug">{cap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-5 border-t border-[#e2e8f0] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {onLaunchDemo && (
                        <button
                          type="button"
                          onClick={() => {
                            setModalIndustryId(null);
                            onLaunchDemo();
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl bg-[#28a745] hover:bg-[#218838] text-white text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Zap className="w-3.5 h-3.5 fill-white" />
                          <span>Switch to Test Mode</span>
                        </button>
                      )}
                      {onCreateAccount && (
                        <button
                          type="button"
                          onClick={() => {
                            setModalIndustryId(null);
                            onCreateAccount();
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl bg-white hover:bg-[#f8fafc] text-[#090d16] border border-[#e2e8f0] hover:border-slate-300 text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <span>Set up your shop</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setModalIndustryId(null)}
                      className="text-xs font-semibold text-[#475569] hover:text-[#090d16] px-2 py-1.5 cursor-pointer whitespace-nowrap"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
