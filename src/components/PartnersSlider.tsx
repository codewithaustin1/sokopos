import React, { useRef, useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export interface Partner {
  id: string;
  name: string;
  category: 'Payments' | 'Tax & Compliance' | 'Banking' | 'Supply Chain' | 'Networks';
  badge: string;
  description: string;
  brandColor: string;
  renderLogo: () => React.ReactNode;
}

export const PARTNERS_DATA: Partner[] = [
  {
    id: 'safaricom-mpesa',
    name: 'Safaricom M-PESA',
    category: 'Payments',
    badge: 'Mobile Money',
    description: 'Direct STK Push, Till Number & Paybill automated payment reconciliation.',
    brandColor: '#00a651',
    renderLogo: () => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#00a651] flex items-center justify-center text-white font-black text-xs shadow-sm">
          <span className="tracking-tighter">M</span>
        </div>
        <div className="flex flex-col text-left">
          <span className="font-extrabold text-[#00a651] text-sm tracking-tight leading-none">
            M-PESA
          </span>
          <span className="text-[10px] text-[#4c5a6b] font-semibold leading-tight">
            Safaricom Till
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'kra-etims',
    name: 'KRA eTIMS',
    category: 'Tax & Compliance',
    badge: 'Official Fiscalization',
    description: 'Kenya Revenue Authority certified automated electronic Tax Invoice Management.',
    brandColor: '#c8231b',
    renderLogo: () => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#c8231b] flex items-center justify-center text-white font-black text-xs shadow-sm">
          <span className="tracking-tighter">KRA</span>
        </div>
        <div className="flex flex-col text-left">
          <span className="font-extrabold text-[#0e1a2b] text-sm tracking-tight leading-none">
            eTIMS
          </span>
          <span className="text-[10px] text-[#c8231b] font-semibold leading-tight">
            KRA Certified
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'digitax',
    name: 'Digitax Tech',
    category: 'Tax & Compliance',
    badge: 'eTIMS Middleware',
    description: 'Accredited middleware engine for uninterrupted offline-to-cloud fiscal signing.',
    brandColor: '#6366f1',
    renderLogo: () => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#4f46e5] to-[#7c3aed] flex items-center justify-center text-white font-black text-xs shadow-sm">
          <span className="tracking-tighter">Dx</span>
        </div>
        <div className="flex flex-col text-left">
          <span className="font-extrabold text-[#1e1b4b] text-sm tracking-tight leading-none">
            Digitax
          </span>
          <span className="text-[10px] text-[#6366f1] font-semibold leading-tight">
            eTIMS Engine
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'equity-bank',
    name: 'Equity Bank',
    category: 'Banking',
    badge: 'Merchant Banking',
    description: 'Instant settlement to business accounts with dedicated merchant financing.',
    brandColor: '#a32a29',
    renderLogo: () => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#a32a29] flex items-center justify-center text-white font-black text-xs shadow-sm">
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-[#eab308]">
            <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm0 4l6 3.33v4.67c0 3.7-2.56 7.16-6 8-3.44-.84-6-4.3-6-8V9.33L12 6z" />
          </svg>
        </div>
        <div className="flex flex-col text-left">
          <span className="font-extrabold text-[#a32a29] text-sm tracking-tight leading-none">
            EQUITY
          </span>
          <span className="text-[10px] text-[#4c5a6b] font-semibold leading-tight">
            Merchant Pay
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'kcb-bank',
    name: 'KCB Bank',
    category: 'Banking',
    badge: 'Tier-1 Banking',
    description: 'Commercial till processing, B2B supplier payments, and agency cash drops.',
    brandColor: '#007a3d',
    renderLogo: () => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#007a3d] flex items-center justify-center text-white font-black text-xs shadow-sm">
          <span className="tracking-tighter">KCB</span>
        </div>
        <div className="flex flex-col text-left">
          <span className="font-extrabold text-[#007a3d] text-sm tracking-tight leading-none">
            KCB Bank
          </span>
          <span className="text-[10px] text-[#4c5a6b] font-semibold leading-tight">
            Merchant Tills
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'mastercard',
    name: 'Mastercard',
    category: 'Networks',
    badge: 'EMV & NFC',
    description: 'Global debit & credit card acceptance with tap-and-go contactless NFC support.',
    brandColor: '#eb001b',
    renderLogo: () => (
      <div className="flex items-center gap-2.5">
        <div className="flex items-center -space-x-2.5">
          <div className="w-6 h-6 rounded-full bg-[#eb001b] opacity-90 shadow-sm" />
          <div className="w-6 h-6 rounded-full bg-[#f79e1b] opacity-90 shadow-sm" />
        </div>
        <div className="flex flex-col text-left">
          <span className="font-extrabold text-[#0e1a2b] text-sm tracking-tight leading-none">
            mastercard
          </span>
          <span className="text-[10px] text-[#4c5a6b] font-semibold leading-tight">
            Contactless POS
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'visa',
    name: 'Visa',
    category: 'Networks',
    badge: 'Card Network',
    description: 'Instant multi-currency Visa card verification and encrypted EMV tokenization.',
    brandColor: '#1a1f71',
    renderLogo: () => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#1a1f71] flex items-center justify-center text-white font-black text-xs shadow-sm">
          <span className="italic tracking-wider font-serif">V</span>
        </div>
        <div className="flex flex-col text-left">
          <span className="font-black italic text-[#1a1f71] text-sm tracking-wider leading-none">
            VISA
          </span>
          <span className="text-[10px] text-[#4c5a6b] font-semibold leading-tight">
            Chip & PIN
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'brookside',
    name: 'Brookside Dairy',
    category: 'Supply Chain',
    badge: 'FMCG Wholesale',
    description: 'Automated digital supplier purchase orders and perishables stock tracking.',
    brandColor: '#0284c7',
    renderLogo: () => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#0284c7] flex items-center justify-center text-white font-bold text-xs shadow-sm">
          <span className="text-[11px] font-black">BD</span>
        </div>
        <div className="flex flex-col text-left">
          <span className="font-extrabold text-[#0284c7] text-sm tracking-tight leading-none">
            Brookside
          </span>
          <span className="text-[10px] text-[#4c5a6b] font-semibold leading-tight">
            FMCG Logistics
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'unga-group',
    name: 'Unga Farm Care',
    category: 'Supply Chain',
    badge: 'Agri & Milling',
    description: 'Direct wholesale linkage for cereal, animal nutrition, and flour stock refills.',
    brandColor: '#b45309',
    renderLogo: () => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#b45309] flex items-center justify-center text-white font-bold text-xs shadow-sm">
          <span className="font-black text-xs">UG</span>
        </div>
        <div className="flex flex-col text-left">
          <span className="font-extrabold text-[#b45309] text-sm tracking-tight leading-none">
            UNGA
          </span>
          <span className="text-[10px] text-[#4c5a6b] font-semibold leading-tight">
            Farm Care
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'airtel-money',
    name: 'Airtel Money',
    category: 'Payments',
    badge: 'Mobile Wallet',
    description: 'Zero-fee merchant wallet payments and interoperable mobile money transfers.',
    brandColor: '#dc2626',
    renderLogo: () => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#dc2626] flex items-center justify-center text-white font-black text-xs shadow-sm">
          <span>airtel</span>
        </div>
        <div className="flex flex-col text-left">
          <span className="font-extrabold text-[#dc2626] text-sm tracking-tight leading-none">
            Airtel Money
          </span>
          <span className="text-[10px] text-[#4c5a6b] font-semibold leading-tight">
            Merchant QR
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'stanbic-bank',
    name: 'Stanbic Bank',
    category: 'Banking',
    badge: 'Corporate Banking',
    description: 'Real-time multi-branch merchant treasury and working capital financing.',
    brandColor: '#0033aa',
    renderLogo: () => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#0033aa] flex items-center justify-center text-white font-bold text-xs shadow-sm">
          <span className="font-black text-xs">SB</span>
        </div>
        <div className="flex flex-col text-left">
          <span className="font-extrabold text-[#0033aa] text-sm tracking-tight leading-none">
            Stanbic
          </span>
          <span className="text-[10px] text-[#4c5a6b] font-semibold leading-tight">
            SME Treasury
          </span>
        </div>
      </div>
    ),
  },
];

export const PartnersSlider: React.FC = () => {
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [activePartnerDetail, setActivePartnerDetail] = useState<Partner | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startX, setStartX] = useState<number>(0);
  const [scrollLeft, setScrollLeft] = useState<number>(0);

  // Manual scroll step handlers for desktop/tablet buttons
  const handleScrollManual = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const step = 320;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -step : step,
        behavior: 'smooth',
      });
    }
  };

  // Mouse drag handlers for manual swiping
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      handleScrollManual('left');
    } else if (e.key === 'ArrowRight') {
      handleScrollManual('right');
    }
  };

  return (
    <section
      id="our-partners"
      className="w-full border-t border-[#d9e1e6] bg-[#f8fafc]/90 py-12 md:py-16 relative overflow-hidden select-none"
      aria-label="Our Partners and Ecosystem Integrations"
      onKeyDown={handleKeyDown}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1565d8]/10 text-[#1565d8] text-xs font-bold tracking-wide uppercase mb-2.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1565d8]" />
              <span>Certified Ecosystem Integrations</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0e1a2b] font-display">
              Our Partners
            </h2>
            <p className="text-sm sm:text-base text-[#4c5a6b] mt-1.5 max-w-2xl">
              Connected directly to East Africa's leading payment gateways, official revenue systems, tier-1 banks, and wholesale distributors.
            </p>
          </div>

          {/* Interactive Controls: Pause/Play & Manual Step Arrows */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setIsPaused((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#d9e1e6] bg-white text-xs font-semibold text-[#4c5a6b] hover:text-[#0e1a2b] hover:border-[#1565d8]/50 transition-colors shadow-2xs"
              title={isPaused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
              aria-label={isPaused ? 'Resume auto-scroll' : 'Pause auto-scroll'}
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 text-[#0a7d46] fill-[#0a7d46]" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-[#1565d8]" />
                  <span>Pause</span>
                </>
              )}
            </button>

            <div className="flex items-center border border-[#d9e1e6] rounded-lg bg-white overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => handleScrollManual('left')}
                className="p-1.5 text-[#4c5a6b] hover:text-[#0e1a2b] hover:bg-[#f1f5f9] transition-colors"
                aria-label="Scroll partners left"
                title="Previous partners"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="w-[1px] h-4 bg-[#d9e1e6]" />
              <button
                type="button"
                onClick={() => handleScrollManual('right')}
                className="p-1.5 text-[#4c5a6b] hover:text-[#0e1a2b] hover:bg-[#f1f5f9] transition-colors"
                aria-label="Scroll partners right"
                title="Next partners"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Marquee & Manual Swiping Slider Track */}
      <div
        className="relative w-full group overflow-hidden py-2"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => {
          if (!isDragging) setIsPaused(false);
        }}
      >
        {/* Subtle Edge Vignettes */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-r from-[#f8fafc] to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-l from-[#f8fafc] to-transparent z-10" />

        {/* Scrollable Container (supports touch swipe & continuous CSS animation) */}
        <div
          ref={scrollContainerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          className={`flex gap-4 overflow-x-auto scrollbar-none px-6 cursor-grab active:cursor-grabbing ${
            isDragging ? 'scroll-auto' : ''
          }`}
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {/* Continuous Track: Double array to make infinite animation completely seamless */}
          <div
            className={`flex gap-4 shrink-0 transition-transform ${
              isPaused ? '[animation-play-state:paused]' : ''
            }`}
            style={{
              animation: 'partner-scroll 38s linear infinite',
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          >
            {[...PARTNERS_DATA, ...PARTNERS_DATA].map((partner, idx) => (
              <div
                key={`${partner.id}-${idx}`}
                onClick={() => setActivePartnerDetail(partner)}
                className="w-[230px] sm:w-[260px] h-[92px] shrink-0 bg-white rounded-xl border border-[#d9e1e6] p-3.5 flex flex-col justify-between hover:border-[#1565d8] hover:shadow-md transition-all duration-200 cursor-pointer group/card relative"
              >
                {/* Top Row: Partner Logo & Category Pill */}
                <div className="flex items-center justify-between gap-2">
                  <div className="shrink-0">{partner.renderLogo()}</div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f1f5f9] text-[#4c5a6b] border border-[#e2e8f0] group-hover/card:bg-[#1565d8]/10 group-hover/card:text-[#1565d8] transition-colors whitespace-nowrap">
                    {partner.badge}
                  </span>
                </div>

                {/* Bottom Row: Verification Status & Capability Note */}
                <div className="flex items-center justify-between text-[11px] text-[#4c5a6b] pt-2 border-t border-[#f1f5f9]">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0a7d46] shrink-0" />
                    <span className="truncate max-w-[170px] font-medium text-[#1e293b]">
                      {partner.description}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trust & Interoperability Summary */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-[#4c5a6b]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#0a7d46] animate-pulse" />
          <span className="font-semibold text-[#0e1a2b]">Live integrations ready:</span>
          <span>Zero third-party terminal rentals • Automated reconciliation • Single POS dashboard</span>
        </div>
        <div className="text-[11px] text-[#4c5a6b]/80">
          Hover or touch to inspect integration specifics • Drag or swipe to explore
        </div>
      </div>

      {/* Partner Detail Dialog Modal */}
      {activePartnerDetail && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setActivePartnerDetail(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl border border-[#d9e1e6] p-6 shadow-2xl relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                {activePartnerDetail.renderLogo()}
              </div>
              <button
                type="button"
                onClick={() => setActivePartnerDetail(null)}
                className="w-8 h-8 rounded-full bg-[#f1f5f9] hover:bg-[#e2e8f0] flex items-center justify-center text-[#4c5a6b] font-bold text-sm transition-colors"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#1565d8]/10 text-[#1565d8] mb-1.5">
                  {activePartnerDetail.category} · {activePartnerDetail.badge}
                </span>
                <h3 className="text-lg font-bold text-[#0e1a2b]">
                  {activePartnerDetail.name} Integration
                </h3>
              </div>

              <p className="text-sm text-[#4c5a6b] leading-relaxed">
                {activePartnerDetail.description}
              </p>

              <div className="p-3.5 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#4c5a6b]">Integration Status:</span>
                  <span className="font-bold text-[#0a7d46] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Certified & Pre-Configured
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#4c5a6b]">Latency / Settlement:</span>
                  <span className="font-semibold text-[#0e1a2b]">Sub-second STK / Real-time</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#4c5a6b]">Hardware Requirement:</span>
                  <span className="font-semibold text-[#0e1a2b]">Any Mobile or PC Terminal</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActivePartnerDetail(null)}
                  className="px-4 py-2 rounded-xl bg-[#1565d8] text-white text-xs font-bold hover:bg-[#1255b8] transition-colors shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Marquee Keyframes */}
      <style>{`
        @keyframes partner-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </section>
  );
};
