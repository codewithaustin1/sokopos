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

        {/* 4 Feature Cards Grid - Translucent white background with black text, no card labels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Safaricom M-Pesa Ecosystem */}
          <div className="bg-white/85 backdrop-blur-md p-5 rounded-2xl border border-white/60 shadow-lg hover:bg-white/95 transition-all duration-200 group text-black flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-emerald-600 mb-3 group-hover:scale-105 transition-transform">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-black font-extrabold text-sm mb-1.5">
                M-Pesa STK, QR & Till
              </h3>
              <p className="text-xs text-neutral-800 leading-relaxed">
                Instant customer phone prompt (STK Push), dynamic QR code generation, and Buy Goods Till / Paybill reconciliation without manual typing.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-200/80 flex items-center justify-between text-[11px] text-neutral-900 font-semibold">
              <span>Auto-matched reference</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          </div>

          {/* Card 2: KRA eTIMS Compliance with Digitax Partnership */}
          <div className="bg-white/85 backdrop-blur-md p-5 rounded-2xl border border-white/60 shadow-lg hover:bg-white/95 transition-all duration-200 group text-black flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-blue-600 mb-3 group-hover:scale-105 transition-transform">
                <FileCheck className="w-5 h-5" />
              </div>
              <h3 className="text-black font-extrabold text-sm mb-1.5">
                KRA eTIMS by Digitax
              </h3>
              <p className="text-xs text-neutral-800 leading-relaxed">
                Automated KRA tax compliance provided in partnership with Digitax. Real-time VAT classification (16% Class A, 0% Class B), certified Control Unit (CU) numbers, and instant QR codes.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-200/80 flex items-center justify-between text-[11px] text-neutral-900 font-semibold">
              <span>Digitax Certified Invoicing</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            </div>
          </div>

          {/* Card 3: 100% Offline-First Architecture */}
          <div className="bg-white/85 backdrop-blur-md p-5 rounded-2xl border border-white/60 shadow-lg hover:bg-white/95 transition-all duration-200 group text-black flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-amber-600 mb-3 group-hover:scale-105 transition-transform">
                <WifiOff className="w-5 h-5" />
              </div>
              <h3 className="text-black font-extrabold text-sm mb-1.5">
                100% Offline Resilience
              </h3>
              <p className="text-xs text-neutral-800 leading-relaxed">
                Fibre cable severed or local cellular glitch? Cashiers keep ringing up sales and printing receipts normally. Syncs to cloud when online.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-200/80 flex items-center justify-between text-[11px] text-neutral-900 font-semibold">
              <span>IndexedDB Local Vault</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
            </div>
          </div>

          {/* Card 4: Multi-Bank & Quick Cash */}
          <div className="bg-white/85 backdrop-blur-md p-5 rounded-2xl border border-white/60 shadow-lg hover:bg-white/95 transition-all duration-200 group text-black flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-purple-600 mb-3 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-black font-extrabold text-sm mb-1.5">
                Cash, Cards & Bank Split
              </h3>
              <p className="text-xs text-neutral-800 leading-relaxed">
                Support for Visa, Mastercard, KCB, Equity Bank, Pesapal, Airtel Money and quick Kenyan Shilling cash buttons (50, 100, 200, 500, 1000).
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-200/80 flex items-center justify-between text-[11px] text-neutral-900 font-semibold">
              <span>End-of-Day Shift Audit</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
