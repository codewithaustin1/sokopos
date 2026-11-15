import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Star, Quote } from 'lucide-react';

export interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  business: string;
  location: string;
  avatarBg: string;
  quote: string;
  metric: string;
  rating: number;
}

const LOCAL_TESTIMONIALS: TestimonialItem[] = [
  {
    id: 'test-1',
    name: 'Grace Wanjiku',
    role: 'Owner & Managing Director',
    business: 'Ngara Mini-Supermarket',
    location: 'Nairobi, Kenya',
    avatarBg: 'bg-[#1565d8]',
    quote: 'Cut our stock reconciliation time from 3 hours to 5 minutes with real-time M-Pesa push syncing. Zero discrepancies at end-of-day!',
    metric: '35% Faster Checkout',
    rating: 5,
  },
  {
    id: 'test-2',
    name: 'Hassan Omar',
    role: 'Proprietor',
    business: 'Mombasa Coast Hardware',
    location: 'Mombasa, Kenya',
    avatarBg: 'bg-emerald-600',
    quote: 'Offline mode saved our business during fiber outages. We processed over 150 sales without internet and everything synced instantly when connection returned.',
    metric: '100% Offline Resilience',
    rating: 5,
  },
  {
    id: 'test-3',
    name: 'Mercy Chebet',
    role: 'Operations Lead',
    business: 'Rift Valley Agrovet & Supplies',
    location: 'Nakuru, Kenya',
    avatarBg: 'bg-purple-600',
    quote: 'Cashier PINs and shift reports give me total peace of mind even when I am away traveling. Sales jumped 35% in our first month of switching!',
    metric: 'KES 2.4M+ Monthly Volume',
    rating: 5,
  },
  {
    id: 'test-4',
    name: 'Kevin Omondi',
    role: 'Founder',
    business: 'Kisumu Mega Fresh Foods',
    location: 'Kisumu, Kenya',
    avatarBg: 'bg-amber-600',
    quote: 'The eTIMS receipt integration with Digitax makes Kenya Revenue Authority compliance completely effortless. No more manual tax filing headaches.',
    metric: 'Instant eTIMS Tax Receipts',
    rating: 5,
  },
];

export const CustomerSuccessCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Auto-play timer (pauses on hover)
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % LOCAL_TESTIMONIALS.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [isPaused]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + LOCAL_TESTIMONIALS.length) % LOCAL_TESTIMONIALS.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % LOCAL_TESTIMONIALS.length);
  };

  // Touch handlers for swipe motion
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      handleNext(); // Swiped left
    } else if (distance < -minSwipeDistance) {
      handlePrev(); // Swiped right
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const current = LOCAL_TESTIMONIALS[currentIndex];

  return (
    <section
      className="sp-s sp-reveal bg-gradient-to-b from-[#f4f7f6] via-white to-[#f4f7f6] py-16 sm:py-24 border-t border-[#d9e1e6]"
      id="customer-success-carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="sp-wrap max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <span className="sp-tag inline-block px-3 py-1 rounded-full bg-blue-50 text-[#1565d8] font-bold text-xs mb-3">
            Local Success Stories
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-[#0e1a2b] tracking-tight mb-3">
            Trusted by ambitious Kenyan retailers
          </h2>
          <p className="text-sm sm:text-base text-[#4c5a6b]">
            Hear how business owners across Nairobi, Mombasa, Kisumu, and Nakuru scale operations with SokoPoS.
          </p>
        </div>

        {/* Carousel Card Container */}
        <div
          className="relative bg-white border border-[#d9e1e6] rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-950/5 overflow-hidden transition-all duration-300"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Background watermark quote icon */}
          <div className="absolute top-4 right-6 text-slate-100 pointer-events-none select-none">
            <Quote className="w-24 h-24 sm:w-32 sm:h-32 text-blue-50/60" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between">
            {/* Left: Testimonial details & quote */}
            <div className="flex-1 space-y-6 text-left">
              <div className="flex items-center gap-1.5">
                {Array.from({ length: current.rating }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
                <span className="ml-2 text-xs font-bold text-[#0e1a2b] bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  {current.metric}
                </span>
              </div>

              <blockquote className="text-lg sm:text-2xl font-bold text-[#0e1a2b] leading-snug tracking-tight">
                &ldquo;{current.quote}&rdquo;
              </blockquote>

              <div className="flex items-center gap-4 pt-2">
                <div
                  className={`w-12 h-12 rounded-2xl ${current.avatarBg} text-white font-extrabold text-lg flex items-center justify-center shadow-md`}
                >
                  {current.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-[#0e1a2b]">{current.name}</h3>
                  <p className="text-xs text-[#4c5a6b] font-medium">
                    {current.role}, <strong className="text-[#0e1a2b]">{current.business}</strong>
                  </p>
                  <span className="inline-block mt-0.5 text-[11px] text-[#718096] font-semibold">
                    📍 {current.location}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Controls & slide counter */}
            <div className="flex md:flex-col items-center justify-center gap-4 shrink-0 border-t md:border-t-0 md:border-l border-[#d9e1e6] pt-6 md:pt-0 md:pl-8 w-full md:w-auto">
              <div className="text-xs font-bold text-[#4c5a6b] font-mono">
                0{currentIndex + 1} / 0{LOCAL_TESTIMONIALS.length}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous testimonial"
                  className="w-11 h-11 rounded-2xl border border-[#d9e1e6] bg-[#f8fafc] hover:bg-[#1565d8] hover:text-white hover:border-[#1565d8] text-[#0e1a2b] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next testimonial"
                  className="w-11 h-11 rounded-2xl border border-[#d9e1e6] bg-[#f8fafc] hover:bg-[#1565d8] hover:text-white hover:border-[#1565d8] text-[#0e1a2b] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Pagination Dots */}
              <div className="flex items-center gap-1.5 mt-2">
                {LOCAL_TESTIMONIALS.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      currentIndex === idx ? 'w-8 bg-[#1565d8]' : 'w-2 bg-[#d9e1e6] hover:bg-[#cbd5e1]'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
