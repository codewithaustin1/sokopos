import React from 'react';
import { 
  WifiOff, 
  Smartphone, 
  CheckCircle2, 
  TrendingUp, 
  FileCheck 
} from 'lucide-react';

export const KenyaPaymentBadges: React.FC = () => {
  return (
    <section id="kenya-payments" className="w-full py-10 px-4 sm:px-6 bg-slate-900/60 border-y border-slate-800/80 relative">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Seamless M-Pesa, KRA eTIMS & 100% Offline Resilience
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Engineered around Safaricom M-Pesa daily cashflows and tax compliance, with zero downtime during network blackouts.
          </p>
        </div>

        {/* 4 Feature Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Badge 1: Safaricom M-Pesa Ecosystem */}
          <div className="bg-[#131b26] p-4.5 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition-all duration-200 group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <Smartphone className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Safaricom Ready
              </span>
            </div>
            <h3 className="text-white font-bold text-sm mb-1.5 flex items-center gap-1.5">
              <span>M-Pesa STK, QR & Till</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instant customer phone prompt (STK Push), dynamic QR code generation, and Buy Goods Till / Paybill reconciliation without manual typing.
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-400 font-semibold">
              <span>Auto-matched reference</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Badge 2: KRA eTIMS Compliance with Digitax Partnership */}
          <div className="bg-[#131b26] p-4.5 rounded-2xl border border-slate-800 hover:border-blue-500/40 transition-all duration-200 group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                <FileCheck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30">
                Digitax Partner
              </span>
            </div>
            <h3 className="text-white font-bold text-sm mb-1.5 flex items-center gap-1.5">
              <span>KRA eTIMS by Digitax</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automated KRA tax compliance provided in partnership with Digitax. Real-time VAT classification (16% Class A, 0% Class B), certified Control Unit (CU) numbers, and instant QR codes.
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-blue-400 font-semibold">
              <span>Digitax Certified Invoicing</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Badge 3: 100% Offline-First Architecture */}
          <div className="bg-[#131b26] p-4.5 rounded-2xl border border-slate-800 hover:border-amber-500/40 transition-all duration-200 group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <WifiOff className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Zero Downtime
              </span>
            </div>
            <h3 className="text-white font-bold text-sm mb-1.5 flex items-center gap-1.5">
              <span>100% Offline Resilience</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Fibre cable severed or local cellular glitch? Cashiers keep ringing up sales and printing receipts normally. Syncs to cloud when online.
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-amber-400 font-semibold">
              <span>IndexedDB Local Vault</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Badge 4: Multi-Bank & Quick Cash */}
          <div className="bg-[#131b26] p-4.5 rounded-2xl border border-slate-800 hover:border-purple-500/40 transition-all duration-200 group">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30">
                KES Cash Flow
              </span>
            </div>
            <h3 className="text-white font-bold text-sm mb-1.5 flex items-center gap-1.5">
              <span>Cash, Cards & Bank Split</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Support for Visa, Mastercard, KCB, Equity Bank, Pesapal, Airtel Money and quick Kenyan Shilling cash buttons (50, 100, 200, 500, 1000).
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-purple-400 font-semibold">
              <span>End-of-Day Shift Audit</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
