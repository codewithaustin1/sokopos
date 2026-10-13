import React, { useState } from 'react';
import { 
  Printer, 
  Smartphone, 
  Monitor, 
  ScanBarcode, 
  DollarSign, 
  CheckCircle2, 
  HelpCircle, 
  ArrowRight,
  ShieldAlert,
  Zap,
  Sparkles,
  Layers
} from 'lucide-react';

interface HardwareCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  compatibleBrands: string[];
  setupTime: string;
  legacyCost: number; // In KES
  sokoCost: number;   // In KES
}

const HARDWARE_CATEGORIES: HardwareCategory[] = [
  {
    id: 'devices',
    name: 'Screens & Terminals',
    icon: Monitor,
    description: 'Runs directly in modern browsers on any device you already own — no proprietary POS terminals required.',
    compatibleBrands: ['Android Tablets & Phones', 'Apple iPad & iPhones', 'Windows Laptops & Desktops', 'Sunmi / iMin POS', 'MacBook & Chromebook'],
    setupTime: '< 1 minute',
    legacyCost: 45000,
    sokoCost: 0
  },
  {
    id: 'printers',
    name: 'Thermal Receipt Printers',
    icon: Printer,
    description: 'Plug-and-play standard ESC/POS printing. Supports both 58mm portable printers and 80mm heavy-duty counter cutters.',
    compatibleBrands: ['Xprinter (USB/BT/LAN)', 'Epson TM-T20 & TM-T88', 'Sunmi Built-in Printer', 'Bixolon & Rongta', 'Generic 58mm/80mm ESC/POS'],
    setupTime: 'Instant Driverless',
    legacyCost: 18000,
    sokoCost: 0
  },
  {
    id: 'scanners',
    name: 'Barcode Scanners',
    icon: ScanBarcode,
    description: 'Captures keyboard wedge laser bursts under 55ms. Also includes built-in camera scanning on mobile phones.',
    compatibleBrands: ['Honeywell Voyager & Orbit', 'Zebra / Motorola Symbol', 'Netum & Tera Wireless', 'Datalogic & Eyoyo', 'Built-in Mobile Camera'],
    setupTime: 'Plug & Play USB',
    legacyCost: 12000,
    sokoCost: 0
  },
  {
    id: 'drawers',
    name: 'Cash Drawers',
    icon: DollarSign,
    description: 'Automatic electronic drawer release triggered via the standard printer RJ11/RJ12 kick-out port upon sale tender.',
    compatibleBrands: ['Standard 4-Bill/5-Bill Drawers', 'Maken Heavy Duty', 'Posiflex', 'Generic RJ11/RJ12 Cash Tills'],
    setupTime: 'RJ11 Printer Cable',
    legacyCost: 8500,
    sokoCost: 0
  }
];

export const HardwareCompatibilityGuide: React.FC<{ onLaunchDemo?: () => void }> = ({ onLaunchDemo }) => {
  const [selectedDevices, setSelectedDevices] = useState<string[]>(['devices', 'printers', 'scanners']);

  const toggleDevice = (id: string) => {
    setSelectedDevices((prev) => 
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const totalLegacySavings = selectedDevices.reduce((sum, id) => {
    const item = HARDWARE_CATEGORIES.find((h) => h.id === id);
    return sum + (item ? item.legacyCost : 0);
  }, 0);

  return (
    <section id="hardware-guide" className="w-full py-12 px-4 sm:px-6 bg-[#0c111a] border-t border-slate-800/80 relative">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
            Use Hardware You Already Own — Zero Lock-In
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Traditional vendors charge KSh 60,000 to KSh 100,000+ for proprietary hardware bundles. SokoPoS runs seamlessly on your current tablet, phone, laptop, and standard receipt printers.
          </p>
        </div>

        {/* 4 Hardware Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {HARDWARE_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isChecked = selectedDevices.includes(cat.id);
            return (
              <div
                key={cat.id}
                onClick={() => toggleDevice(cat.id)}
                className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isChecked
                    ? 'bg-[#151e2b] border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/30'
                    : 'bg-[#101622] border-slate-800 hover:border-slate-700 opacity-80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      isChecked ? 'bg-blue-600 text-white' : 'border border-slate-700'
                    }`}>
                      {isChecked && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                  </div>

                  <h3 className="text-white font-bold text-sm mb-1">{cat.name}</h3>
                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">{cat.description}</p>

                  <div className="space-y-1 mb-4">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Compatible Brands:
                    </div>
                    {cat.compatibleBrands.slice(0, 3).map((brand, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>{brand}</span>
                      </div>
                    ))}
                    <div className="text-[10px] text-slate-400">+ many more standard models</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Setup: {cat.setupTime}</span>
                  <span className="text-emerald-400 font-extrabold text-[11px]">100% Compatible</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Savings Calculator Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-[#101722] to-blue-950/40 border border-emerald-500/30 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-1.5">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider border border-emerald-500/30">
                Interactive BYOD Savings Calculator
              </span>
            </div>
            <h4 className="text-lg sm:text-xl font-black text-white">
              Estimated Upfront Savings: <span className="text-emerald-400">KES {totalLegacySavings.toLocaleString()}</span>
            </h4>
            <p className="text-xs text-slate-400 max-w-xl">
              By running SokoPoS on the devices you already have, you completely avoid the heavy upfront hardware markup required by legacy POS resellers.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {onLaunchDemo && (
              <button
                type="button"
                onClick={onLaunchDemo}
                className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer transition"
              >
                <Zap className="w-4 h-4" />
                <span>Test My Hardware in Sandbox Demo</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
