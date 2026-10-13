import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Smartphone, 
  FileCheck, 
  WifiOff, 
  Zap, 
  CheckCircle2, 
  Play, 
  Pause, 
  ArrowRight, 
  Activity, 
  Clock, 
  MapPin, 
  X,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Receipt,
  Sparkles
} from 'lucide-react';

export interface MerchantActivityItem {
  id: string;
  merchant: string;
  location: string;
  type: 'mpesa' | 'etims' | 'offline' | 'speed' | 'inventory';
  title: string;
  amount?: number;
  metric?: string;
  description: string;
  badge: string;
  secondsAgo: number;
  items?: string[];
  refCode?: string;
}

const INITIAL_ACTIVITIES: MerchantActivityItem[] = [
  {
    id: 'act-1',
    merchant: 'QuickMart Mini Westlands',
    location: 'Nairobi',
    type: 'mpesa',
    title: 'M-Pesa STK Push Instant Payment',
    amount: 3450,
    metric: '0.8s verification',
    description: 'Till 890124 • 2 items • Auto-matched customer reference',
    badge: 'M-Pesa STK',
    secondsAgo: 8,
    items: ['2x Pembe Maize Meal 2kg', '1x Elianto Oil 1L'],
    refCode: 'SKP-MP-8831'
  },
  {
    id: 'act-2',
    merchant: 'Kilifi Central Chemist',
    location: 'Kilifi',
    type: 'etims',
    title: 'KRA eTIMS Tax Compliant Receipt',
    amount: 1850,
    metric: 'Fiscal QR verified',
    description: 'Invoice #ET-99214 • 16% VAT automated breakdown',
    badge: 'eTIMS Signed',
    secondsAgo: 24,
    items: ['1x Panadol Extra 24s', '1x Cetirizine 10mg Strip'],
    refCode: 'KRA-QR-99214'
  },
  {
    id: 'act-3',
    merchant: 'Highland Agrovet Supplies',
    location: 'Eldoret',
    type: 'offline',
    title: 'Offline Sales Queue Synced',
    metric: '38 sales restored',
    amount: 42600,
    description: 'Power cut recovery • 0 data loss • Instant cloud merge',
    badge: '100% Offline',
    secondsAgo: 45,
    items: ['DAP Fertilizer 50kg', 'Milking Salve 500g', 'Dewormer 100ml'],
    refCode: 'SYNC-ELD-402'
  },
  {
    id: 'act-4',
    merchant: 'Diani Beach Lounge & Bar',
    location: 'Kwale',
    type: 'mpesa',
    title: 'Split Bill Table Checkout',
    amount: 14200,
    metric: 'Instant SMS alert',
    description: 'Paybill 400200 • Reconciled to Table 4 shift',
    badge: 'M-Pesa Paybill',
    secondsAgo: 70,
    items: ['2x Seafood Platter', '4x Tusker Lager 500ml', '1x Sparkling Water'],
    refCode: 'SKP-MP-9104'
  },
  {
    id: 'act-5',
    merchant: 'Kikuyu Fresh Greengrocers',
    location: 'Kiambu',
    type: 'speed',
    title: 'Rush-Hour Rapid Checkout',
    amount: 980,
    metric: '11 seconds total',
    description: 'Barcode scanned & thermal receipt printed in 11s',
    badge: 'High Velocity',
    secondsAgo: 95,
    items: ['Cabbages 2pcs', 'Tomatoes 1kg', 'Onions 1kg'],
    refCode: 'POS-KIK-1102'
  },
  {
    id: 'act-6',
    merchant: 'Rift Valley Hardware & Cement',
    location: 'Nakuru',
    type: 'etims',
    title: 'B2B Trade Invoice Generated',
    amount: 68400,
    metric: 'KRA eTIMS Validated',
    description: 'Buyer PIN: P051289192M • QR signature embedded',
    badge: 'eTIMS B2B',
    secondsAgo: 130,
    items: ['30x Simba Cement 50kg', '4x Iron Sheets 30G'],
    refCode: 'KRA-B2B-3091'
  },
  {
    id: 'act-7',
    merchant: 'Kibuye Wholesalers & Spices',
    location: 'Kisumu',
    type: 'offline',
    title: 'Local Cache POS Transaction',
    amount: 8750,
    metric: 'Offline Cache Active',
    description: 'Network blackout handled seamlessly on tablet',
    badge: 'Offline Cache',
    secondsAgo: 160,
    items: ['5x Rice 5kg', '2x Pure Wheat Flour 10kg'],
    refCode: 'OFF-KSM-092'
  },
  {
    id: 'act-8',
    merchant: 'Chuka Electronics Hub',
    location: 'Tharaka Nithi',
    type: 'mpesa',
    title: 'M-Pesa Dynamic QR Scan',
    amount: 5200,
    metric: '1.1s confirmation',
    description: 'Customer scanned merchant QR code from counter screen',
    badge: 'M-Pesa QR',
    secondsAgo: 190,
    items: ['1x Fast Charger 65W', '1x USB-C Braided Cable'],
    refCode: 'SKP-QR-4412'
  },
  {
    id: 'act-9',
    merchant: 'Nyeri Tavern & Nyama Choma',
    location: 'Nyeri',
    type: 'speed',
    title: 'Evening Shift Till Reconciled',
    amount: 54300,
    metric: '0.00 discrepancy',
    description: 'Cash drawer counted & M-Pesa ledger closed in 2 mins',
    badge: 'Shift Close',
    secondsAgo: 220,
    items: ['Evening Shift Batch Close', 'Cash KES 22,100 + M-Pesa KES 32,200'],
    refCode: 'SFT-NYR-772'
  },
  {
    id: 'act-10',
    merchant: 'Mombasa Old Town Minimarket',
    location: 'Mombasa',
    type: 'etims',
    title: 'Fiscal Thermal Receipt Printed',
    amount: 2600,
    metric: 'eTIMS QR ready',
    description: 'Bluetooth 58mm printer receipt with verified QR',
    badge: 'eTIMS Thermal',
    secondsAgo: 260,
    items: ['1x Taifa Maize Flour', '2x Fresh Milk 500ml', '1x Tea Leaves 250g'],
    refCode: 'KRA-MSA-118'
  }
];

const NEW_STREAM_EVENTS: Omit<MerchantActivityItem, 'id' | 'secondsAgo'>[] = [
  {
    merchant: 'Apex Superette Westlands',
    location: 'Nairobi',
    type: 'mpesa',
    title: 'M-Pesa STK Push Completed',
    amount: 1450,
    metric: '0.7s prompt',
    description: 'Buy Goods Till 772109 • Customer authenticated via PIN',
    badge: 'M-Pesa STK',
    items: ['1x White Bread 400g', '2x Farm Milk 500ml', '1x Butter 250g'],
    refCode: 'SKP-MP-9941'
  },
  {
    merchant: 'Kericho Tea Hub Pharmacy',
    location: 'Kericho',
    type: 'etims',
    title: 'eTIMS Fiscal Receipt Generated',
    amount: 3200,
    metric: 'KRA QR verified',
    description: 'Automated tax signature attached to thermal printout',
    badge: 'eTIMS Signed',
    items: ['1x Multivitamin 30s', '1x First Aid Kit Compact'],
    refCode: 'KRA-KCH-801'
  },
  {
    merchant: 'Machakos Agro Supplies',
    location: 'Machakos',
    type: 'offline',
    title: 'Local POS Checkout During Outage',
    amount: 9800,
    metric: '100% offline cache',
    description: 'Transactions queued in browser IndexedDB securely',
    badge: '100% Offline',
    items: ['2x Mineral Lick 5kg', '1x Plant Booster 1L'],
    refCode: 'OFF-MCK-512'
  },
  {
    merchant: 'Thika Highway Butchery',
    location: 'Kiambu',
    type: 'speed',
    title: 'Lightning 14s Order & Print',
    amount: 4100,
    metric: '14s cycle',
    description: 'Weight scale integration sent kg directly to cart',
    badge: 'High Velocity',
    items: ['3.2kg Goat Ribs', 'Ugali portion', 'Greens'],
    refCode: 'POS-THK-334'
  }
];

export const LiveMerchantTicker: React.FC<{
  onLaunchDemo?: () => void;
}> = ({ onLaunchDemo }) => {
  const [activities, setActivities] = useState<MerchantActivityItem[]>(INITIAL_ACTIVITIES);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isFastSpeed, setIsFastSpeed] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<MerchantActivityItem | null>(null);
  const [flashNewId, setFlashNewId] = useState<string | null>(null);
  const streamIndexRef = useRef<number>(0);

  // Periodic simulated live stream injection
  useEffect(() => {
    const streamInterval = setInterval(() => {
      const nextTemplate = NEW_STREAM_EVENTS[streamIndexRef.current % NEW_STREAM_EVENTS.length];
      streamIndexRef.current += 1;

      const newId = `stream-${Date.now()}`;
      const newItem: MerchantActivityItem = {
        ...nextTemplate,
        id: newId,
        secondsAgo: 2
      };

      setActivities(prev => [newItem, ...prev.slice(0, 15)]);
      setFlashNewId(newId);

      // Clear flash after 3.5s
      setTimeout(() => {
        setFlashNewId(current => (current === newId ? null : current));
      }, 3500);
    }, 12000);

    return () => clearInterval(streamInterval);
  }, []);

  // Update timestamps every 3 seconds
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setActivities(prev =>
        prev.map(item => ({
          ...item,
          secondsAgo: item.secondsAgo + 3
        }))
      );
    }, 3000);

    return () => clearInterval(timeInterval);
  }, []);

  // Filter activities
  const filteredActivities = useMemo(() => {
    if (selectedCategory === 'all') return activities;
    return activities.filter(item => {
      if (selectedCategory === 'mpesa') return item.type === 'mpesa';
      if (selectedCategory === 'etims') return item.type === 'etims';
      if (selectedCategory === 'offline') return item.type === 'offline';
      if (selectedCategory === 'speed') return item.type === 'speed';
      return true;
    });
  }, [activities, selectedCategory]);

  // Duplicate for seamless infinite marquee loop
  const marqueeItems = useMemo(() => {
    if (filteredActivities.length === 0) return [];
    // Ensure sufficient items for smooth looping
    return [...filteredActivities, ...filteredActivities];
  }, [filteredActivities]);

  const formatTimeAgo = (seconds: number) => {
    if (seconds < 15) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m ago`;
  };

  const getTypeStyle = (type: MerchantActivityItem['type']) => {
    switch (type) {
      case 'mpesa':
        return {
          icon: <Smartphone className="w-3.5 h-3.5 text-emerald-400" />,
          pillBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
          dotBg: 'bg-emerald-400',
          accent: 'border-emerald-500/30 hover:border-emerald-500/60'
        };
      case 'etims':
        return {
          icon: <FileCheck className="w-3.5 h-3.5 text-red-400" />,
          pillBg: 'bg-red-500/15 border-red-500/30 text-red-300',
          dotBg: 'bg-red-400',
          accent: 'border-red-500/30 hover:border-red-500/60'
        };
      case 'offline':
        return {
          icon: <WifiOff className="w-3.5 h-3.5 text-amber-400" />,
          pillBg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
          dotBg: 'bg-amber-400',
          accent: 'border-amber-500/30 hover:border-amber-500/60'
        };
      case 'speed':
      default:
        return {
          icon: <Zap className="w-3.5 h-3.5 text-blue-400" />,
          pillBg: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
          dotBg: 'bg-blue-400',
          accent: 'border-blue-500/30 hover:border-blue-500/60'
        };
    }
  };

  return (
    <section 
      aria-label="Live Kenyan Merchant Activity Stream"
      className="w-full bg-[#0a0f18] border-y border-slate-800/90 py-5 sm:py-6 overflow-hidden relative"
    >
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-28 bg-emerald-500/5 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-96 h-28 bg-blue-500/5 blur-3xl pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Ticker Header & Dynamic Stats Bar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3.5 mb-3.5">
          
          {/* Left: Live Pulse Status & Description */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700/80 shadow-xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                Live Merchant Activity
              </span>
            </div>

            <span className="text-xs text-slate-300 font-medium hidden sm:inline">
              Simulated real-time POS, M-Pesa & eTIMS throughput across Kenyan shops
            </span>
          </div>

          {/* Right: Quick Interactive Controls & Category Filters */}
          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-between lg:justify-end">
            
            {/* Category Filter Pills */}
            <div className="inline-flex items-center gap-1 bg-[#121926] p-1 rounded-xl border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('mpesa')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                  selectedCategory === 'mpesa'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3 h-3" />
                <span>M-Pesa</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('etims')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                  selectedCategory === 'etims'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileCheck className="w-3 h-3" />
                <span>eTIMS</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('offline')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                  selectedCategory === 'offline'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <WifiOff className="w-3 h-3" />
                <span>Offline</span>
              </button>
            </div>

            {/* Play/Pause & Speed Controller */}
            <div className="inline-flex items-center gap-1 bg-[#121926] p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                title={isPaused ? 'Resume ticker stream' : 'Pause ticker stream'}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsFastSpeed(!isFastSpeed)}
                className={`px-2 py-1 rounded-lg font-mono font-bold text-[10px] transition cursor-pointer ${
                  isFastSpeed
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isFastSpeed ? '1.5x' : '1.0x'}
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* Marquee Track Container with Vignette Gradient Edges */}
      <div className="relative w-full overflow-hidden group">
        {/* Left Gradient Fade */}
        <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-[#0a0f18] to-transparent z-10 pointer-events-none" />
        {/* Right Gradient Fade */}
        <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-[#0a0f18] to-transparent z-10 pointer-events-none" />

        {/* Scrolling Strip */}
        <div 
          className={`flex gap-3 sm:gap-4 py-1.5 animate-marquee-infinite select-none ${
            isPaused ? 'paused' : ''
          } ${isFastSpeed ? 'speed-fast' : ''}`}
          style={{ willChange: 'transform' }}
        >
          {marqueeItems.map((item, index) => {
            const style = getTypeStyle(item.type);
            const isFreshlyAdded = flashNewId === item.id;

            return (
              <div
                key={`${item.id}-${index}`}
                onClick={() => setSelectedItem(item)}
                className={`w-[290px] sm:w-[320px] shrink-0 bg-[#141b27] hover:bg-[#192231] rounded-2xl p-3.5 border transition-all duration-200 cursor-pointer text-left shadow-lg relative group/card ${
                  isFreshlyAdded
                    ? 'border-emerald-400 shadow-emerald-500/20 ring-1 ring-emerald-400'
                    : 'border-slate-800/90 hover:border-slate-700'
                }`}
              >
                {/* Top Row: Merchant Name, Location & Relative Time */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <div className="text-white font-bold text-xs truncate flex items-center gap-1.5">
                      <span className="truncate">{item.merchant}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                      <span className="truncate">{item.location}, Kenya</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-medium text-slate-400 shrink-0 bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800">
                    {formatTimeAgo(item.secondsAgo)}
                  </span>
                </div>

                {/* Middle Row: Activity Title & Value */}
                <div className="flex items-baseline justify-between gap-2 mb-2">
                  <span className="text-slate-200 text-xs font-semibold truncate">
                    {item.title}
                  </span>
                  {item.amount !== undefined && (
                    <span className="text-sm font-black font-mono text-emerald-400 shrink-0">
                      KSh {item.amount.toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Bottom Row: Badge Pill, Metric, and Inspect Hint */}
                <div className="flex items-center justify-between text-[10px] pt-2 border-t border-slate-800/80">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-semibold ${style.pillBg}`}>
                    {style.icon}
                    <span>{item.badge}</span>
                  </span>

                  <span className="text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-slate-500" />
                    <span>{item.metric}</span>
                  </span>
                </div>

                {/* Hover Quick Action Cue */}
                <div className="absolute inset-0 bg-blue-600/10 rounded-2xl opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none border border-blue-500/30 flex items-end justify-end p-2.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-blue-300 bg-slate-900/90 px-2 py-0.5 rounded border border-blue-500/40">
                    Click to Inspect
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Item Detail & Flow Sandbox Modal */}
      {selectedItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="bg-[#141b27] border border-slate-700/80 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mb-2">
                  <Activity className="w-3 h-3 text-emerald-400" />
                  <span>Simulated POS Event #{selectedItem.refCode}</span>
                </div>
                <h3 className="text-lg font-black text-white">{selectedItem.merchant}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span>{selectedItem.location}, Kenya</span>
                  <span>•</span>
                  <span>{formatTimeAgo(selectedItem.secondsAgo)}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-[#0b1018] rounded-2xl p-4 border border-slate-800/90 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center text-slate-300 pb-2 border-b border-slate-800">
                <span className="font-bold text-white uppercase text-[11px] font-sans">
                  {selectedItem.title}
                </span>
                {selectedItem.amount && (
                  <span className="text-emerald-400 font-black text-sm">
                    KSh {selectedItem.amount.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Items List */}
              {selectedItem.items && selectedItem.items.length > 0 && (
                <div className="space-y-1.5 text-slate-400 text-[11px]">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-sans font-bold">
                    Line Items
                  </div>
                  {selectedItem.items.map((lineItem, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>• {lineItem}</span>
                      <span className="text-slate-500">Verified</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Technical verification points */}
              <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[10px] text-slate-400">
                <div className="flex justify-between">
                  <span>Latency / Speed:</span>
                  <span className="text-blue-400 font-bold">{selectedItem.metric}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 inline" /> Reconciled
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Audit Reference:</span>
                  <span className="text-slate-500">{selectedItem.refCode}</span>
                </div>
              </div>
            </div>

            {/* Action CTAs */}
            <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedItem(null);
                  onLaunchDemo?.();
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-white" />
                <span>Test Flow in Sandbox</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
