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
  icon: React.ComponentType<{ className?: string }>;
  overview: string;
  capabilities: string[];
  hardwareSetup: string;
  sampleItems: { item: string; qty: string; totalKes: string }[];
}

export const RETAIL_INDUSTRIES: RetailIndustryItem[] = [
  {
    id: 'retail',
    name: 'Retail',
    sectorLabel: 'Dukas, Boutiques & Agrovets',
    headline: 'Fast counters for everyday stock',
    summary:
      'Scan barcodes, track fractional weights, and record M-Pesa Till or customer credit tabs in seconds.',
    image: industryRetailShop,
    imageAlt:
      'Kenyan retail shop cashier scanning packaged goods at a digital POS counter in Nairobi',
    metricLabel: 'Barcode scan speed',
    metricValue: '< 2s / item',
    icon: Store,
    overview:
      'Built for busy neighborhood shops, agrovets, hardware stores, and boutiques across Kenya. Keep shelves stocked with automated reorder alerts, break down bulk sacks into single-kilo units, and collect Lipa na M-Pesa payments without manual till reconciliation.',
    capabilities: [
      'Instant low-stock alerts before fast-moving staples run out',
      'Digital customer credit book (Duka Tab) with SMS/WhatsApp reminders',
      'Central price updates synchronized across every counter instantly',
      'Native M-Pesa STK Push and KRA eTIMS receipts via Digitax',
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
    name: 'Bars',
    sectorLabel: 'Bars, Lounges & Bistros',
    headline: 'Tabs, tables and pours under control',
    summary:
      'Open and split table tabs, route Kitchen Order Tickets, and track spirits by the bottle or tot.',
    image: industryBarRestaurant,
    imageAlt:
      'Contemporary Kenyan bar and lounge counter with touch POS terminal tracking open table tabs',
    metricLabel: 'Tab split & settle',
    metricValue: 'Instant STK',
    icon: Wine,
    overview:
      'Keep evening rush orders flowing across terraces, VIP lounges, and sports bars. Waitstaff open tabs by table, dispatch drinks to the bar and grills to the kitchen, and deduct 25ml or 50ml tot pours accurately against full 750ml bottle stock.',
    capabilities: [
      'Open, merge, and split bills across M-Pesa and cash per guest',
      'Separate Kitchen Order Tickets (KOT) and counter bar drink slips',
      'Automated tot-to-bottle inventory tracking to prevent shrinkage',
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
    sectorLabel: 'Mini-Marts & Multi-Lane Stores',
    headline: 'High-volume tills with live branch control',
    summary:
      'Ring up long grocery baskets quickly, verify cashier shift drops, and compare branches remotely.',
    image: industrySupermarket,
    imageAlt:
      'Kenyan supermarket express checkout lane with cashier scanning groceries into a digital POS',
    metricLabel: 'Express lane pace',
    metricValue: '45+ tx / hr',
    icon: ShoppingCart,
    overview:
      'Engineered for peak weekend queues and multi-aisle Kenyan supermarkets. Process multi-item baskets cleanly with keyboard shortcuts and high-speed scanners, hold cashiers accountable with blind shift cash declarations, and keep selling even if fiber drops.',
    capabilities: [
      'Sub-second hardware barcode capture for 50+ item grocery baskets',
      'Blind shift closing reports with float, petty cash, and till variances',
      '100% offline register continuity with automatic cloud sync on reconnect',
      'Consolidated head-office analytics across Nairobi and upcountry branches',
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
    headline: 'Trusted dispensing, batch by batch',
    summary:
      'Monitor batch numbers, flag approaching expiry dates, and dispense blisters or full packs accurately.',
    image: industryPharmacy,
    imageAlt:
      'Clean Kenyan community pharmacy dispensary counter with POS terminal and organized medicine shelves',
    metricLabel: 'Batch traceability',
    metricValue: '100% audit',
    icon: Pill,
    overview:
      'Protect patient safety and regulatory compliance across community chemists and cosmetic outlets. Track lot numbers from distributor delivery to point of sale, get 30/60/90-day expiry warnings before stock expires, and break boxes down into strips seamlessly.',
    capabilities: [
      'Batch number and expiry-date alerts prior to dispensing stock',
      'Fractional dispensing from boxes down to blister strips or single doses',
      'Optional prescriber reference and patient notes printed on receipts',
      'Zero-rated and VAT-exempt tax classification ready for KRA eTIMS',
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
  const [selectedIndustryId, setSelectedIndustryId] = useState<RetailIndustryItem['id'] | null>(
    null
  );
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const activeIndustry =
    RETAIL_INDUSTRIES.find((item) => item.id === selectedIndustryId) || null;
  const activeIndex = activeIndustry
    ? RETAIL_INDUSTRIES.findIndex((item) => item.id === activeIndustry.id)
    : -1;

  // Close details modal cleanly with Escape key
  useEffect(() => {
    if (!activeIndustry) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedIndustryId(null);
      } else if (e.key === 'ArrowRight' && activeIndex >= 0) {
        const nextIdx = (activeIndex + 1) % RETAIL_INDUSTRIES.length;
        setSelectedIndustryId(RETAIL_INDUSTRIES[nextIdx].id);
      } else if (e.key === 'ArrowLeft' && activeIndex >= 0) {
        const prevIdx = (activeIndex - 1 + RETAIL_INDUSTRIES.length) % RETAIL_INDUSTRIES.length;
        setSelectedIndustryId(RETAIL_INDUSTRIES[prevIdx].id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndustry, activeIndex]);

  const markImageFailed = (id: string) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
  };

  const handleStepIndustry = (direction: -1 | 1) => {
    if (activeIndex < 0) return;
    const nextIdx =
      (activeIndex + direction + RETAIL_INDUSTRIES.length) % RETAIL_INDUSTRIES.length;
    setSelectedIndustryId(RETAIL_INDUSTRIES[nextIdx].id);
  };

  return (
    <div className="w-full">
      {/* 2x2 Editorial Industry Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {RETAIL_INDUSTRIES.map((industry) => {
          const Icon = industry.icon;
          const isFailed = Boolean(failedImages[industry.id]);
          const isSelected = selectedIndustryId === industry.id;

          return (
            <article
              key={industry.id}
              className={`group bg-white rounded-2xl border overflow-hidden flex flex-col transition-all duration-200 ${
                isSelected
                  ? 'border-[#059669] ring-1 ring-[#059669]/30'
                  : 'border-[#e2e8f0] hover:border-slate-300'
              }`}
            >
              {/* Framed Kenyan Retail Photography (4:3) */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 border-b border-[#e2e8f0]">
                {isFailed ? (
                  <div className="w-full h-full bg-gradient-to-br from-slate-100 via-slate-50 to-emerald-50 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-white border border-[#e2e8f0] flex items-center justify-center text-[#059669] mb-3">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-[#090d16]">{industry.name}</span>
                    <span className="text-xs text-[#475569] mt-0.5">{industry.sectorLabel}</span>
                  </div>
                ) : (
                  <img
                    src={industry.image}
                    alt={industry.imageAlt}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    onError={() => markImageFailed(industry.id)}
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                )}
                {/* Subtle bottom contrast gradient strictly for optical separation */}
                <div
                  className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 via-black/10 to-transparent pointer-events-none"
                  aria-hidden="true"
                />
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col justify-between gap-5">
                <div>
                  {/* Quiet Unboxed Metadata Kicker */}
                  <div className="flex items-center gap-2 text-xs font-medium text-[#475569] mb-2">
                    <span className="font-semibold text-[#059669]">{industry.name}</span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{industry.sectorLabel}</span>
                  </div>

                  <h3 className="text-xl font-extrabold text-[#090d16] tracking-tight leading-snug mb-2">
                    {industry.headline}
                  </h3>

                  <p className="text-sm text-[#475569] leading-relaxed">{industry.summary}</p>
                </div>

                {/* Metric & Learn More Action Row */}
                <div className="pt-4 border-t border-[#e2e8f0] flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="block text-[11px] text-[#475569] truncate">
                      {industry.metricLabel}
                    </span>
                    <span className="block text-sm font-bold text-[#090d16] font-mono tabular-nums">
                      {industry.metricValue}
                    </span>
                  </div>

                  <button
                    type="button"
                    id={`solutions-learn-more-${industry.id}`}
                    onClick={() => setSelectedIndustryId(industry.id)}
                    className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-xl bg-[#f8fafc] hover:bg-[#059669] text-[#090d16] hover:text-white border border-[#e2e8f0] hover:border-[#059669] text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#059669]"
                  >
                    <span>Learn More</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Industry Details Modal (Rendered in Portal on "Learn More") */}
      {activeIndustry &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            id="solutions-detail-overlay"
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedIndustryId(null);
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
                  <span className="font-bold text-[#059669] whitespace-nowrap shrink-0">
                    {activeIndustry.name}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{activeIndustry.sectorLabel}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStepIndustry(-1)}
                    aria-label="Previous industry"
                    className="w-9 h-9 rounded-lg border border-[#e2e8f0] bg-white hover:bg-slate-50 flex items-center justify-center text-[#090d16] transition cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStepIndustry(1)}
                    aria-label="Next industry"
                    className="w-9 h-9 rounded-lg border border-[#e2e8f0] bg-white hover:bg-slate-50 flex items-center justify-center text-[#090d16] transition cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    id="solutions-detail-close-btn"
                    onClick={() => setSelectedIndustryId(null)}
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
                    {failedImages[activeIndustry.id] ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-100">
                        <ShoppingBag className="w-8 h-8 text-[#059669] mb-2" />
                        <span className="text-sm font-bold text-[#090d16]">
                          {activeIndustry.name}
                        </span>
                      </div>
                    ) : (
                      <img
                        src={activeIndustry.image}
                        alt={activeIndustry.imageAlt}
                        referrerPolicy="no-referrer"
                        onError={() => markImageFailed(activeIndustry.id)}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Typical Kenyan Basket Snapshot */}
                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-[#475569] mb-2.5 flex items-center justify-between">
                        <span>Typical Kenyan Till Receipt</span>
                        <span className="font-mono text-[#059669] tabular-nums">
                          {activeIndustry.metricValue}
                        </span>
                      </div>
                      <div className="space-y-2 border-t border-[#e2e8f0] pt-2.5">
                        {activeIndustry.sampleItems.map((row) => (
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
                      <span>{activeIndustry.hardwareSetup}</span>
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
                        {activeIndustry.headline}
                      </h3>
                      <p className="text-sm text-[#475569] mt-2 leading-relaxed">
                        {activeIndustry.overview}
                      </p>
                    </div>

                    <div className="pt-2">
                      <h4 className="text-xs font-bold text-[#090d16] mb-3">
                        What SokoPoS handles at the till
                      </h4>
                      <ul className="space-y-2.5">
                        {activeIndustry.capabilities.map((cap) => (
                          <li key={cap} className="flex items-start gap-2.5 text-sm text-[#090d16]">
                            <span className="w-5 h-5 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#059669] shrink-0 mt-0.5">
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
                            setSelectedIndustryId(null);
                            onLaunchDemo();
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <Zap className="w-3.5 h-3.5 fill-white" />
                          <span>Try Live Sandbox</span>
                        </button>
                      )}
                      {onCreateAccount && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedIndustryId(null);
                            onCreateAccount();
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl bg-white hover:bg-[#f8fafc] text-[#090d16] border border-[#e2e8f0] hover:border-slate-300 text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0"
                        >
                          <span>Create Shop Account</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedIndustryId(null)}
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
