import React, { useState } from 'react';
import { 
  ShoppingBag, 
  UtensilsCrossed, 
  Wine, 
  Tractor, 
  Pill, 
  Check, 
  ArrowRight, 
  Sparkles, 
  Barcode, 
  Clock, 
  Receipt,
  Users,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface IndustryData {
  id: string;
  name: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badge: string;
  painPoints: string;
  features: {
    title: string;
    desc: string;
  }[];
  mockReceipt: {
    storeName: string;
    category: string;
    items: { name: string; qty: number; price: number; tax: string }[];
    subtotal: number;
    vat: number;
    total: number;
    specialNote: string;
  };
  sampleStats: { label: string; value: string }[];
}

const INDUSTRIES: IndustryData[] = [
  {
    id: 'supermarket',
    name: 'Supermarkets & Retail',
    tagline: 'High-speed barcode scanning, multi-lane checkout, and stock reorders',
    icon: ShoppingBag,
    accentColor: 'blue',
    badge: 'High Velocity Retail',
    painPoints: 'Eliminates peak-hour checkout queues, slow manual item lookups, and inventory shrinkage.',
    features: [
      {
        title: 'Instant Barcode Scanner Bursts',
        desc: 'Continuous high-speed hardware wedge capture (<55ms latency) without missing scans during weekend rush.'
      },
      {
        title: 'Auto Low-Stock & Reorder Alerts',
        desc: 'Set custom safety reorder thresholds so fast-moving maize flour, milk, and cooking oil never stock out.'
      },
      {
        title: 'Shelf Label & Barcode Printing',
        desc: 'Generate Code128 barcodes and price tags for unbranded produce and bulk repackaged grains in seconds.'
      },
      {
        title: 'Cashier Shift Cash Balancing',
        desc: 'Hold cashiers accountable with opening floats, petty cash payouts, and strict drop reconciliation slips.'
      }
    ],
    mockReceipt: {
      storeName: 'Nairobi Central Supermarket',
      category: 'Express Checkout Lane #2',
      items: [
        { name: 'Pembe Maize Flour 2kg', qty: 2, price: 210, tax: 'Exempt' },
        { name: 'Brookside Fresh Milk 500ml', qty: 4, price: 65, tax: '16%' },
        { name: 'Rina Vegetable Oil 1L', qty: 1, price: 340, tax: '16%' },
        { name: 'Sunlight Washing Powder 500g', qty: 1, price: 185, tax: '16%' }
      ],
      subtotal: 1205,
      vat: 124.8,
      total: 1205,
      specialNote: 'M-PESA Till: 8849201 | Confirmed Ref: QKA8219H'
    },
    sampleStats: [
      { label: 'Avg Checkout Speed', value: '< 18 secs' },
      { label: 'Stock Shrinkage Drop', value: '-92%' },
      { label: 'Barcode Recognition', value: '100% Instant' }
    ]
  },
  {
    id: 'hospitality',
    name: 'Restaurants & Lounges',
    tagline: 'Table ordering, Kitchen Order Tickets (KOT), and split bills',
    icon: UtensilsCrossed,
    accentColor: 'amber',
    badge: 'Food & Beverage',
    painPoints: 'Stops kitchen order confusion, lost food bills, and wait-staff payment discrepancies.',
    features: [
      {
        title: 'Kitchen & Bar Order Printing (KOT)',
        desc: 'Food orders automatically route to the kitchen printer while drinks route to the counter bar instantly.'
      },
      {
        title: 'Table Management & Bill Splitting',
        desc: 'Keep open table tabs, merge orders, split bills between M-Pesa and cash, and apply staff tips seamlessly.'
      },
      {
        title: 'Recipe & Ingredient Cost Deduction',
        desc: 'Each burger or meal sold automatically deducts patties, buns, and fries from raw ingredient inventory.'
      },
      {
        title: 'Happy Hour & Dynamic Promotions',
        desc: 'Schedule time-based discounts (e.g. 2-for-1 cocktails 5 PM - 8 PM) without cashier manual calculations.'
      }
    ],
    mockReceipt: {
      storeName: 'The Savannah Grill & Cafe',
      category: 'Table 7 • Waiter: John M.',
      items: [
        { name: 'Goat Nyama Choma 1kg', qty: 1, price: 1200, tax: '16%' },
        { name: 'Ugali & Sukuma Wiki Platter', qty: 2, price: 250, tax: '16%' },
        { name: 'White Cap Lager Cold 500ml', qty: 3, price: 320, tax: '16%' },
        { name: 'Sparkling Mineral Water 1L', qty: 1, price: 200, tax: '16%' }
      ],
      subtotal: 2860,
      vat: 394.5,
      total: 2860,
      specialNote: 'Order #4092 • KOT Dispatched to Grill Chef'
    },
    sampleStats: [
      { label: 'Order to Kitchen', value: '< 2 secs' },
      { label: 'Table Turnaround', value: '+35% Faster' },
      { label: 'Unpaid Tabs Found', value: '0 Leaks' }
    ]
  },
  {
    id: 'liquor',
    name: 'Wines & Spirits',
    tagline: 'Rapid peak-hour checkout, tot vs full bottle portions, and fraud prevention',
    icon: Wine,
    accentColor: 'rose',
    badge: 'Liquor Outlets',
    painPoints: 'Prevents untracked single tots, cashier bottle substitution, and weekend evening congestion.',
    features: [
      {
        title: 'Bottle vs Tot / Peg Measurement',
        desc: 'Sell a 750ml whiskey by the bottle or as 25ml tots — stock volume decrements accurately in real time.'
      },
      {
        title: 'High-Volume Peak Hour Touchpad',
        desc: 'Touch-optimized grid buttons for popular ciders, lagers, and spirits so cashiers ring up sales in 5 seconds.'
      },
      {
        title: 'Cashier Shift Cash Drop Lock',
        desc: 'Prevent cash till pilferage with mandatory intermediate cash drops when till exceeds KSh 20,000.'
      },
      {
        title: 'Age Check & Shift Reconciliations',
        desc: 'Instant 18+ alert prompts and comprehensive gross margin reports by spirit category.'
      }
    ],
    mockReceipt: {
      storeName: 'Westlands Premium Liquors',
      category: 'Counter Express • Shift #14',
      items: [
        { name: 'Black Label Scotch 750ml', qty: 1, price: 4200, tax: '16%' },
        { name: 'Tusker Cider 500ml (Chilled)', qty: 4, price: 260, tax: '16%' },
        { name: 'Jameson Irish (Double Tot 50ml)', qty: 2, price: 450, tax: '16%' },
        { name: 'Tonic Water Mixer Can', qty: 2, price: 120, tax: '16%' }
      ],
      subtotal: 6380,
      vat: 880.0,
      total: 6380,
      specialNote: 'M-PESA Paybill 522123 | Account: BARREL7'
    },
    sampleStats: [
      { label: 'Peak Rush Latency', value: '< 8 secs' },
      { label: 'Tot Discrepancies', value: 'Zero' },
      { label: 'Gross Margin Visibility', value: 'Real-time' }
    ]
  },
  {
    id: 'hardware-agrovet',
    name: 'Agrovets & Hardware',
    tagline: 'Customer credit tabs (Duka Debt), supplier orders, and bulk packaging',
    icon: Tractor,
    accentColor: 'emerald',
    badge: 'Agriculture & Trade',
    painPoints: 'Replaces disorganized paper debt books, untracked farm chemicals, and supplier credit mess.',
    features: [
      {
        title: 'Digital Customer Credit Tab (Duka Ledger)',
        desc: 'Log trusted farmer or contractor credit purchases, track outstanding balances, and send payment reminders.'
      },
      {
        title: 'Supplier Purchase Invoices & POs',
        desc: 'Manage deliveries from seed companies, fertilizer depots, and cement distributors with auto cost averaging.'
      },
      {
        title: 'Bulk-to-Retail Breakdown Units',
        desc: 'Buy 50kg bags of DAP fertilizer or nails in bulk and sell by the single kilo or scoop with accurate stock math.'
      },
      {
        title: 'Product Expiry & Chemical Lot Tracking',
        desc: 'Keep track of veterinary vaccines and agrochemical shelf-life to avoid stocking expired inventory.'
      }
    ],
    mockReceipt: {
      storeName: 'Rift Valley Agrovet & Supplies',
      category: 'Farmer Credit Account: Peter Koech',
      items: [
        { name: 'DAP Fertilizer 50kg Bag', qty: 2, price: 3800, tax: 'Zero' },
        { name: 'Twiga Livestock Dip 1L', qty: 1, price: 1450, tax: '16%' },
        { name: 'Certified Maize Seed 2kg', qty: 4, price: 540, tax: 'Zero' },
        { name: 'Veterinary Dewormer Bolus', qty: 10, price: 85, tax: '16%' }
      ],
      subtotal: 12060,
      vat: 318.6,
      total: 12060,
      specialNote: 'Partial Tender: KSh 5,000 Cash | Balance KSh 7,060 on Tab'
    },
    sampleStats: [
      { label: 'Debt Recovery Rate', value: '+78%' },
      { label: 'Supplier Match', value: '100% Accurate' },
      { label: 'Unit Pack Split', value: 'Automated' }
    ]
  },
  {
    id: 'pharmacy',
    name: 'Pharmacies & Cosmetics',
    tagline: 'Batch number tracking, expiry warnings, and doctor prescription slips',
    icon: Pill,
    accentColor: 'purple',
    badge: 'Healthcare & Beauty',
    painPoints: 'Guarantees medical compliance, prevents selling expired meds, and organizes fast cosmetic checkouts.',
    features: [
      {
        title: 'Batch Number & Expiry Alerts',
        desc: 'Automatic visual flags before dispensing medications approaching expiry within 30, 60, or 90 days.'
      },
      {
        title: 'Doctor & Patient Prescription Records',
        desc: 'Capture prescriber names, patient contact, and dosage instructions directly on thermal receipt printouts.'
      },
      {
        title: 'Fractional Unit Dispensing',
        desc: 'Dispense blister strips, single capsules, or full boxes without corrupting total inventory count.'
      },
      {
        title: 'Beauty & Skincare Variant Matrices',
        desc: 'Group foundation shades, hair dyes, and cosmetic sizes under unified parent products cleanly.'
      }
    ],
    mockReceipt: {
      storeName: 'Avenue Chemist & Cosmetics',
      category: 'Prescription Rx #84102',
      items: [
        { name: 'Amoxicillin 500mg (Blister Strip 10s)', qty: 2, price: 350, tax: 'Exempt' },
        { name: 'Paracetamol 500mg Caplets 20s', qty: 1, price: 120, tax: 'Exempt' },
        { name: 'CeraVe Hydrating Cleanser 236ml', qty: 1, price: 2450, tax: '16%' },
        { name: 'Vitamin C 1000mg Effervescent', qty: 1, price: 980, tax: '16%' }
      ],
      subtotal: 4250,
      vat: 473.1,
      total: 4250,
      specialNote: 'Dr. Odhiambo Ref #902 | Batch: #AK829-EXP09/27'
    },
    sampleStats: [
      { label: 'Expired Items Sold', value: '0%' },
      { label: 'Dosage Precision', value: '100%' },
      { label: 'Customer Retention', value: '+42%' }
    ]
  }
];

export const IndustrySolutionsSwitcher: React.FC<{ onLaunchDemo?: () => void }> = ({ onLaunchDemo }) => {
  const [activeTabId, setActiveTabId] = useState<string>('supermarket');
  const activeIndustry = INDUSTRIES.find((ind) => ind.id === activeTabId) || INDUSTRIES[0];

  return (
    <section id="industry-solutions" className="w-full py-12 px-4 sm:px-6 bg-slate-950 relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
            How SokoPoS Transforms Your Specific Business
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Unlike generic software, SokoPoS adapts directly to the operational rhythms of your industry. Select your store type below:
          </p>
        </div>

        {/* Segmented Industry Switcher Tabs */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-3 mb-8 no-scrollbar scroll-smooth">
          {INDUSTRIES.map((ind) => {
            const Icon = ind.icon;
            const isSelected = ind.id === activeTabId;
            return (
              <button
                key={ind.id}
                type="button"
                onClick={() => setActiveTabId(ind.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/25 scale-[1.02]'
                    : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                <span>{ind.name}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Industry Card with 2-Column Showcase */}
        <div className="bg-[#121924] rounded-3xl border border-slate-800 p-5 sm:p-8 shadow-2xl transition-all">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left 7 Columns: Value proposition & features */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {activeIndustry.tagline}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed bg-slate-900/70 p-3 rounded-xl border border-slate-800/80">
                  <strong className="text-blue-400">Core Problem Solved:</strong> {activeIndustry.painPoints}
                </p>
              </div>

              {/* Feature Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {activeIndustry.features.map((feat, idx) => (
                  <div key={idx} className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 hover:border-slate-700 transition">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white mb-1">{feat.title}</h4>
                        <p className="text-[11px] text-slate-400 leading-normal">{feat.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Industry Metrics Banner */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800">
                {activeIndustry.sampleStats.map((stat, idx) => (
                  <div key={idx} className="bg-slate-950/60 p-2.5 rounded-xl text-center border border-slate-800/60">
                    <div className="text-xs sm:text-sm font-black text-emerald-400">{stat.value}</div>
                    <div className="text-[10px] text-slate-400 font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Call to action */}
              {onLaunchDemo && (
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onLaunchDemo}
                    className="primary-cta-shimmer w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition group"
                  >
                    <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>Test {activeIndustry.name} in Sandbox Demo</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}
            </div>

            {/* Right 5 Columns: Interactive Simulated Receipt Slip */}
            <div className="lg:col-span-5 bg-slate-950 rounded-2xl p-5 border border-slate-800 shadow-inner">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-[11px]">
                <span className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-blue-400" />
                  Simulated Thermal Receipt Output
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] border border-emerald-500/20">
                  80mm ESC/POS
                </span>
              </div>

              {/* Receipt Body */}
              <div className="font-mono text-xs text-slate-200 mt-4 space-y-2.5 bg-[#0a0f16] p-4 rounded-xl border border-slate-800/80 shadow-md">
                <div className="text-center border-b border-dashed border-slate-700/80 pb-2">
                  <div className="font-bold text-white text-sm">{activeIndustry.mockReceipt.storeName}</div>
                  <div className="text-[10px] text-slate-400">P.O. Box 40822 Nairobi, Kenya</div>
                  <div className="text-[10px] text-emerald-400 font-semibold">{activeIndustry.mockReceipt.category}</div>
                </div>

                <div className="space-y-1.5 pt-1 text-[11px]">
                  {activeIndustry.mockReceipt.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start">
                      <div className="min-w-0 pr-2">
                        <div className="truncate text-white font-medium">{item.name}</div>
                        <div className="text-[9px] text-slate-400">
                          {item.qty} x KES {item.price.toFixed(2)} ({item.tax})
                        </div>
                      </div>
                      <div className="font-bold text-white shrink-0">
                        KES {(item.qty * item.price).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-slate-700/80 pt-2 text-[11px] space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span>KES {activeIndustry.mockReceipt.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Tax (eTIMS breakdown):</span>
                    <span>KES {activeIndustry.mockReceipt.vat.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-white font-extrabold text-sm pt-1 border-t border-slate-800">
                    <span>TOTAL:</span>
                    <span className="text-emerald-400">KES {activeIndustry.mockReceipt.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-dashed border-slate-700/80 text-center text-[10px] text-slate-400">
                  <div className="font-semibold text-blue-400">{activeIndustry.mockReceipt.specialNote}</div>
                  <div className="text-[9px] mt-1 text-slate-400">Powered by SokoPoS Cloud Terminal</div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  KRA eTIMS Validated
                </span>
                <span className="text-slate-400">Instant PDF & WhatsApp Share</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
