import React from 'react';

/**
 * Constellation / Network Mesh Watermark SVG
 * Recreates the subtle nodes and interconnecting graph lines from the reference designs.
 */
const ConstellationWatermark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    className={`absolute pointer-events-none ${className}`}
    viewBox="0 0 240 240"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* Interconnected network lines */}
    <path
      d="M225 25L180 55L130 30L95 70L45 60L180 55M180 55L200 115L145 140L180 55M145 140L95 70M200 115L235 155L185 190L145 140M235 155L230 85M185 190L135 215M45 60L25 110L70 145L95 70M70 145L35 195L105 180L145 140M130 30L155 8"
      stroke="#94A3B8"
      strokeWidth="0.9"
      strokeDasharray="2 3"
      opacity="0.3"
    />
    {/* Nodes */}
    <circle cx="225" cy="25" r="3" fill="#94A3B8" opacity="0.45" />
    <circle cx="180" cy="55" r="3.5" fill="#64748B" opacity="0.55" />
    <circle cx="130" cy="30" r="2.5" fill="#94A3B8" opacity="0.4" />
    <circle cx="95" cy="70" r="3" fill="#94A3B8" opacity="0.45" />
    <circle cx="45" cy="60" r="2.5" fill="#94A3B8" opacity="0.35" />
    <circle cx="200" cy="115" r="3" fill="#64748B" opacity="0.45" />
    <circle cx="145" cy="140" r="3.5" fill="#64748B" opacity="0.5" />
    <circle cx="235" cy="155" r="2.5" fill="#94A3B8" opacity="0.4" />
    <circle cx="185" cy="190" r="3" fill="#94A3B8" opacity="0.45" />
    <circle cx="70" cy="145" r="2.5" fill="#94A3B8" opacity="0.35" />
    <circle cx="105" cy="180" r="2" fill="#94A3B8" opacity="0.3" />
    <circle cx="230" cy="85" r="2" fill="#94A3B8" opacity="0.35" />
  </svg>
);

export const KenyaPaymentBadges: React.FC = () => {
  return (
    <section id="kenya-payments" className="w-full py-14 px-4 sm:px-6 bg-[#080d1a] border-y border-slate-800/80 relative">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Retail & Wholesale Powerhouse</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
            Engineered for High-Volume Kenyan Retail
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-xl mx-auto leading-relaxed">
            Instant M-Pesa prompts, zero-ETR KRA compliance, offline checkout protection, and major card processing in one unified system.
          </p>
        </div>

        {/* 2 by 2 Grid on Large Screens / 1 Column on Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7 lg:gap-8">

          {/* =========================================================================
              CARD 1: FAST & RELIABLE PAYMENT COLLECTION (M-PESA & MOBILE PAY)
             ========================================================================= */}
          <div className="bg-white rounded-[28px] border border-slate-200/90 shadow-xl shadow-slate-950/20 p-7 sm:p-8 md:p-9 flex flex-col justify-between relative overflow-hidden group hover:shadow-2xl hover:border-slate-300 transition-all duration-300 min-h-[420px]">
            {/* Constellation Network Watermarks */}
            <ConstellationWatermark className="top-0 right-0 w-56 h-56 -mr-6 -mt-6" />
            <ConstellationWatermark className="bottom-0 left-0 w-40 h-40 -ml-8 -mb-8 rotate-180" />

            {/* Top Content */}
            <div className="relative z-10">
              {/* Graphic Row: M-Pesa Circular Badge + Smartphone Prompt */}
              <div className="flex items-center gap-4 mb-5">
                {/* M-Pesa Official Circular Badge */}
                <div className="w-14 h-14 rounded-full bg-[#00853F] flex flex-col items-center justify-center shadow-md shadow-emerald-900/20 border-2 border-white shrink-0">
                  <div className="flex items-center justify-center">
                    <span className="text-white text-xs font-black tracking-wider leading-none">M</span>
                    <span className="w-2.5 h-4 bg-red-600 rounded-[2px] mx-0.5 border border-white/60 flex items-center justify-center">
                      <span className="w-1.5 h-2 bg-white rounded-[1px]" />
                    </span>
                    <span className="text-white text-xs font-black tracking-wider leading-none">PESA</span>
                  </div>
                </div>

                {/* Smartphone with Payment Checkmark and Hand Tapping Card */}
                <div className="relative w-12 h-15 bg-slate-900 rounded-lg p-1 shadow-md border border-slate-700 flex flex-col items-center justify-between shrink-0">
                  <div className="w-3.5 h-0.5 bg-slate-600 rounded-full" />
                  <div className="w-full bg-emerald-500/20 rounded-md py-1 flex flex-col items-center justify-center border border-emerald-400/40">
                    <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span className="text-[7px] font-bold text-emerald-400 mt-0.5 uppercase tracking-tighter">COIN</span>
                  </div>
                  <div className="w-2 h-2 rounded-full border border-slate-600" />
                  {/* Floating Hand with Card */}
                  <div className="absolute -right-3 top-2.5 bg-white rounded-md shadow-md p-0.5 border border-slate-200">
                    <div className="w-6 h-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2px] flex items-center justify-end pr-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-[#0B3B48] font-black text-2xl sm:text-[28px] leading-[1.12] tracking-tight uppercase">
                FAST &amp; RELIABLE<br />
                PAYMENT COLLECTION
              </h3>

              {/* Description */}
              <p className="text-slate-800 text-sm sm:text-[15px] font-medium leading-relaxed mt-3 max-w-md">
                Easily and reliably collect payments from customers through fast Payment prompts!
              </p>
            </div>

            {/* Bottom Content (Seamless without horizontal line) */}
            <div className="relative z-10 mt-7 pt-2 flex flex-col gap-4">
              {/* Reliable & Fast Features */}
              <div className="flex items-center gap-8">
                {/* Reliable */}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
                    <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </div>
                  <span className="text-[#0B3B48] font-bold text-sm sm:text-base">Reliable</span>
                </div>

                {/* Fast */}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
                    <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <polyline points="12 6 12 12" />
                      <path d="m11 10 3-3" />
                      <path d="m13 14-3 3" />
                    </svg>
                  </div>
                  <span className="text-[#0B3B48] font-bold text-sm sm:text-base">Fast</span>
                </div>
              </div>

              {/* Contactless & Mobile Pay */}
              <div className="flex items-center justify-end gap-4 text-slate-700">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <svg className="w-4.5 h-4.5 text-slate-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                  </svg>
                  <span>Contactless</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <svg className="w-4.5 h-4.5 text-slate-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                    <path d="M12 18h.01" />
                    <rect width="6" height="4" x="9" y="6" rx="1" />
                  </svg>
                  <span>Mobile Pay</span>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              CARD 2: BUILT-IN AUTOMATED TAX COMPLIANCE (iTax & eTIMS)
             ========================================================================= */}
          <div className="bg-white rounded-[28px] border border-slate-200/90 shadow-xl shadow-slate-950/20 p-7 sm:p-8 md:p-9 flex flex-col justify-between relative overflow-hidden group hover:shadow-2xl hover:border-slate-300 transition-all duration-300 min-h-[420px]">
            {/* Constellation Network Watermarks */}
            <ConstellationWatermark className="top-0 right-0 w-56 h-56 -mr-6 -mt-6" />
            <ConstellationWatermark className="bottom-0 left-0 w-40 h-40 -ml-8 -mb-8 rotate-180" />

            {/* Top Content */}
            <div className="relative z-10">
              {/* Official Kenya iTax Logo Representation */}
              <div className="mb-4">
                <div className="flex items-center gap-1.5">
                  <div className="relative inline-flex items-center">
                    <span className="text-red-600 font-serif font-black text-3xl italic">i</span>
                    <span className="text-black font-black text-3xl tracking-tight">Tax</span>
                    {/* Swoosh arcs */}
                    <svg className="absolute -top-1 -right-8 w-11 h-9 text-red-600 pointer-events-none" viewBox="0 0 40 30" fill="none">
                      <path d="M2 18C12 4 32 2 38 12" stroke="#DC2626" strokeWidth="2.8" strokeLinecap="round" />
                      <path d="M8 22C16 10 32 8 36 18" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
                <div className="text-[10px] text-red-600 font-medium italic mt-0.5 tracking-wide">
                  Simple, Swift, Secure
                </div>
              </div>

              {/* Title */}
              <h3 className="text-[#0B3B48] font-black text-2xl sm:text-[28px] leading-[1.12] tracking-tight uppercase">
                BUILT-IN<br />
                AUTOMATED TAX COMPLIANCE
              </h3>

              {/* Description */}
              <p className="text-slate-800 text-sm sm:text-[15px] font-medium leading-relaxed mt-3 max-w-md">
                Get Built-in automated tax compliance. Removes the need for expensive physical ETR machines and double taxation!
              </p>
            </div>

            {/* Bottom Content: Features Grid & Centered Footer Note */}
            <div className="relative z-10 mt-7 pt-2 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Feature 1: Compliance */}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </div>
                  <span className="text-[#0B3B48] font-bold text-sm sm:text-base leading-tight">Compliance</span>
                </div>

                {/* Feature 2: No ETR Machines Needed */}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center relative shrink-0">
                    {/* ETR symbol with Red X to Cloud */}
                    <svg className="w-5 h-5 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect width="14" height="10" x="5" y="10" rx="1" />
                      <path d="M8 6h8v4H8z" />
                      <line x1="4" y1="4" x2="20" y2="20" stroke="#DC2626" strokeWidth="2.5" />
                      <line x1="20" y1="4" x2="4" y2="20" stroke="#DC2626" strokeWidth="2.5" />
                    </svg>
                  </div>
                  <span className="text-[#0B3B48] font-bold text-xs sm:text-sm leading-tight">No ETR Machines Needed</span>
                </div>
              </div>

              {/* Feature 3: Financial Accuracy */}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m3 3 7 7 4-4 7 7" />
                    <path d="M14 7h7v7" />
                    <circle cx="18" cy="18" r="3" fill="#10B981" stroke="none" />
                  </svg>
                </div>
                <span className="text-[#0B3B48] font-bold text-sm sm:text-base">Financial Accuracy</span>
              </div>

              {/* Footer Note */}
              <div className="text-center pt-1">
                <span className="text-xs font-medium text-slate-500">
                  iTax: Kenya&apos;s Digital Tax Partner
                </span>
              </div>
            </div>
          </div>

          {/* =========================================================================
              CARD 3: OFFLINE SALES RESILIENCE (STANDBY HUB & RECEIPT PRINTING)
             ========================================================================= */}
          <div className="bg-white rounded-[28px] border border-slate-200/90 shadow-xl shadow-slate-950/20 p-7 sm:p-8 md:p-9 flex flex-col justify-between relative overflow-hidden group hover:shadow-2xl hover:border-slate-300 transition-all duration-300 min-h-[420px]">
            {/* Constellation Network Watermarks */}
            <ConstellationWatermark className="top-0 right-0 w-56 h-56 -mr-6 -mt-6" />
            <ConstellationWatermark className="bottom-0 left-0 w-40 h-40 -ml-8 -mb-8 rotate-180" />

            {/* Top Content */}
            <div className="relative z-10">
              {/* Title */}
              <h3 className="text-[#0B3B48] font-black text-2xl sm:text-[28px] leading-[1.12] tracking-tight uppercase">
                OFFLINE SALES<br />
                RESILIENCE
              </h3>

              {/* Description */}
              <p className="text-slate-800 text-sm sm:text-[15px] font-medium leading-relaxed mt-3 max-w-md">
                Keep processing transactions and making sales even during network outages. Data stores locally and syncs securely when connection is restored.
              </p>
            </div>

            {/* 2x2 Feature Grid */}
            <div className="relative z-10 mt-7 pt-2 grid grid-cols-2 gap-y-5 gap-x-4">
              {/* 1. Receipt Printing Active */}
              <div className="flex items-center gap-3">
                {/* Thermal Printer Illustration */}
                <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center p-1 relative shrink-0 shadow-xs">
                  <div className="w-7 h-3.5 bg-white rounded-t border border-slate-300 flex items-center justify-center">
                    <span className="text-[6px] font-bold text-emerald-700 leading-none">✓ RECEIPT</span>
                  </div>
                  <div className="w-9 h-4 bg-slate-700 rounded-b flex items-center justify-between px-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="w-3.5 h-0.5 bg-slate-400" />
                  </div>
                </div>
                <div>
                  <div className="text-[#0B3B48] font-bold text-xs sm:text-sm uppercase leading-tight">RECEIPT<br />PRINTING</div>
                  <div className="text-xs font-bold text-emerald-700">Active</div>
                </div>
              </div>

              {/* 2. Transaction Hub Standby */}
              <div className="flex items-center gap-3">
                {/* Cash Register Illustration */}
                <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center p-1 shrink-0 shadow-xs">
                  <div className="w-7 h-2.5 bg-emerald-800 rounded-t text-[6px] text-white font-mono flex items-center justify-center px-0.5">
                    Offline
                  </div>
                  <div className="w-9 h-4.5 bg-slate-300 border border-slate-400 rounded-b grid grid-cols-3 gap-0.5 p-0.5">
                    <span className="bg-slate-500 rounded-xs" />
                    <span className="bg-slate-500 rounded-xs" />
                    <span className="bg-slate-500 rounded-xs" />
                  </div>
                </div>
                <div>
                  <div className="text-[#0B3B48] font-bold text-xs sm:text-sm uppercase leading-tight">TRANSACTION<br />HUB</div>
                  <div className="text-xs font-bold text-slate-600">Standby</div>
                </div>
              </div>

              {/* 3. Data Vault Secure */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <circle cx="12" cy="11" r="3" />
                  </svg>
                </div>
                <div>
                  <div className="text-[#0B3B48] font-bold text-xs sm:text-sm uppercase leading-tight">DATA<br />VAULT</div>
                  <div className="text-xs font-bold text-emerald-700">Secure</div>
                </div>
              </div>

              {/* 4. Cloud Sync Automatic */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="16" r="4" />
                    <circle cx="16" cy="16" r="4" />
                    <path d="M12 12V3m0 0L8 7m4-4 4 4" />
                  </svg>
                </div>
                <div>
                  <div className="text-[#0B3B48] font-bold text-xs sm:text-sm uppercase leading-tight">CLOUD<br />SYNC</div>
                  <div className="text-xs font-bold text-emerald-700">Automatic</div>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
              CARD 4: EASILY PROCESS CARDS (VISA, MASTERCARD, AMEX, DISCOVER)
             ========================================================================= */}
          <div className="bg-white rounded-[28px] border border-slate-200/90 shadow-xl shadow-slate-950/20 p-7 sm:p-8 md:p-9 flex flex-col justify-between relative overflow-hidden group hover:shadow-2xl hover:border-slate-300 transition-all duration-300 min-h-[420px]">
            {/* Constellation Network Watermarks */}
            <ConstellationWatermark className="top-0 right-0 w-56 h-56 -mr-6 -mt-6" />
            <ConstellationWatermark className="bottom-0 left-0 w-40 h-40 -ml-8 -mb-8 rotate-180" />

            {/* Top Content */}
            <div className="relative z-10">
              {/* Title */}
              <h3 className="text-[#0B3B48] font-black text-2xl sm:text-[28px] leading-[1.12] tracking-tight uppercase">
                EASILY PROCESS<br />
                CARDS
              </h3>

              {/* Description */}
              <p className="text-slate-800 text-sm sm:text-[15px] font-medium leading-relaxed mt-3 max-w-md">
                Accept payments from major credit and debit cards securely.
              </p>
            </div>

            {/* Bottom Content: Logos & Merchant Trust */}
            <div className="relative z-10 mt-7 pt-2 flex flex-col gap-4">
              {/* Card Brands Grid */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* Visa & Mastercard Box */}
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/90 flex flex-col items-center justify-center shadow-xs">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    {/* Visa Logo */}
                    <span className="font-black italic text-blue-900 tracking-tighter text-base sm:text-lg">
                      VISA
                    </span>
                    {/* Mastercard Overlapping Circles */}
                    <div className="flex -space-x-1.5 items-center">
                      <div className="w-5 h-5 rounded-full bg-[#EB001B]" />
                      <div className="w-5 h-5 rounded-full bg-[#F79E1B]/95" />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#0B3B48] text-center">Accepted Worldwide</span>
                </div>

                {/* Amex & Discover Box */}
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/90 flex flex-col items-center justify-center shadow-xs">
                  <div className="flex items-center gap-2 mb-1.5">
                    {/* Amex Blue Box */}
                    <span className="bg-[#006FCF] text-white font-extrabold text-[10px] px-2 py-0.5 rounded-[3px] tracking-tight">
                      AMEX
                    </span>
                    {/* Discover Box */}
                    <span className="border border-slate-300 bg-white text-slate-900 font-extrabold text-[10px] px-1.5 py-0.5 rounded-[3px] flex items-center gap-0.5">
                      DISCOVER
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#0B3B48] text-center">Secure Transactions</span>
                </div>
              </div>

              {/* Merchant Trust & Global Reach Row */}
              <div className="grid grid-cols-2 gap-3.5 pt-1">
                {/* Merchant Trust */}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="m11 11 2 2 4-4" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[#0B3B48] font-bold text-xs sm:text-sm leading-tight">Merchant<br />Trust</div>
                  </div>
                </div>

                {/* Global Reach */}
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="8" cy="16" r="4" />
                      <circle cx="16" cy="16" r="4" />
                      <path d="m10 10 4-4m0 0h-3m3 0v3" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[#0B3B48] font-bold text-xs sm:text-sm leading-tight">Global<br />Reach</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
