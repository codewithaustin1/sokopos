import React, { useState } from 'react';
import {
  Monitor,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { AppLogo } from './common/AppLogo';
import { AppFooter } from './common/AppFooter';
import { MobileHeaderNav } from './common/MobileHeaderNav';
import { WhatsAppFloatingButton } from './landing/WhatsAppFloatingButton';
import { usePos } from '../context/PosContext';
import { scrollToTop } from '../utils/scrollUtils';

interface PricingPageViewProps {
  onBackToLogin: () => void;
  onSelectPlan?: (planId: string) => void;
  loginBgGraphic?: string | null;
}

interface TierDefinition {
  id: string;
  name: string;
  alias: string;
  badge: string;
  m: number;
  a: number;
  setup?: number;
  setupNote?: string;
  tagline: string;
  branches: string;
  staff: string;
  support: string;
  cta: string;
  f: string[];
  pop?: boolean;
}

const TIERS: TierDefinition[] = [
  {
    id: 'free',
    name: 'Free',
    alias: 'Free account',
    badge: 'No monthly fee',
    m: 0,
    a: 0,
    setup: 1999,
    setupNote: 'Includes 1-on-1 printer pairing, stock upload and KRA tax advice.',
    tagline: 'Lifetime free POS, with expert setup for a one-time fee.',
    branches: '1',
    staff: '1',
    support: 'Setup consultation and community help',
    cta: 'Book a setup session',
    f: [
      'Free cloud POS, forever',
      '250 products with barcode scanning',
      'Receipt printing, 58mm and 80mm',
      'Offline selling that syncs later',
      'M-Pesa, cash and split payments',
      'Printer pairing and CSV stock upload',
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    alias: 'Basic',
    badge: '',
    m: 399,
    a: 3990,
    tagline: 'For solo kiosks, boutiques and quick checkout counters.',
    branches: '1',
    staff: '2',
    support: 'Email and community help',
    cta: 'Choose Starter',
    f: [
      'Barcode scanning and SKU lookup',
      'Low-stock alerts',
      'Receipt printing, 58mm and 80mm',
      'Daily till closing and cash audit',
      'Cash, M-Pesa and split payments',
      'Offline selling that syncs later',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    alias: 'Pro',
    badge: 'Best value',
    m: 899,
    a: 8990,
    pop: true,
    tagline: 'For busy mini-marts and multi-counter shops.',
    branches: '3',
    staff: '10',
    support: 'Priority WhatsApp and phone support',
    cta: 'Choose Business',
    f: [
      'Switch between branches instantly',
      'Stock transfers between stores',
      '15+ reports with CSV export',
      'Purchase orders and stock receiving',
      'Loyalty points and store credit',
      'VAT and KRA tax reports',
      'Refund approvals with audit logs',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    alias: 'Enterprise',
    badge: '',
    m: 1499,
    a: 14990,
    tagline: 'For supermarkets, franchises and wholesale hubs.',
    branches: 'Unlimited',
    staff: 'Unlimited',
    support: 'Dedicated account manager, 24/7 hotline',
    cta: 'Choose Premium',
    f: [
      'Role-based access and PIN permissions',
      'Multi-warehouse stock, batches and expiry alerts',
      'Custom receipt branding',
      'Full audit trail and shrinkage protection',
      'Supplier debt and automatic reordering',
      'Multi-currency support',
    ],
  },
];

const STEPS: Record<string, string> = {
  starter: 'Solo shops, kiosks and small counters.',
  business: 'Mini-marts, boutiques and multi-counter shops.',
  premium: 'Franchises, supermarkets and growing chains.',
};

function recommendTier(branchesCount: number): string {
  return branchesCount <= 1 ? 'starter' : branchesCount <= 3 ? 'business' : 'premium';
}

const fmt = new Intl.NumberFormat('en-KE');

export const PricingPageView: React.FC<PricingPageViewProps> = ({
  onBackToLogin,
  onSelectPlan,
  loginBgGraphic: propLoginBgGraphic,
}) => {
  const {
    currentUser,
    loginBgGraphic: contextLoginBgGraphic,
    setIsSubscriptionModalOpen,
    showToast,
  } = usePos();
  const loginBgGraphic = propLoginBgGraphic ?? contextLoginBgGraphic;

  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [selectedBranches, setSelectedBranches] = useState<number | null>(null);
  const [recommendedId, setRecommendedId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const savePercentage = Math.round((1 - TIERS[1].a / (TIERS[1].m * 12)) * 100);

  const handleBranchSelect = (n: number) => {
    setSelectedBranches(n);
    const recId = recommendTier(n);
    setRecommendedId(recId);
    const target = TIERS.find((t) => t.id === recId);
    if (target) {
      const extra = recId === 'starter' ? ' Starting out? The free plan also covers one branch.' : '';
      setStatusMessage(`${target.name} fits best: ${STEPS[recId]}${extra}`);
    }
  };

  const handleCtaClick = (tier: TierDefinition) => {
    if (tier.id === 'free') {
      const text = encodeURIComponent(
        'Hello SokoPoS! I would like to register for the Free Account and schedule the 1-on-1 Store Setup & Advisory Consultation (Ksh 1,999).'
      );
      window.open(`https://wa.me/254740463021?text=${text}`, '_blank', 'noopener,noreferrer');
      if (onSelectPlan) {
        onSelectPlan('free');
      }
      return;
    }

    if (currentUser) {
      showToast(`Selected ${tier.name} Plan (${billing === 'annual' ? 'Annual' : 'Monthly'}). Opening checkout...`, 'info');
      setIsSubscriptionModalOpen(true);
    } else if (onSelectPlan) {
      onSelectPlan(tier.id);
    } else {
      onBackToLogin();
    }
  };

  const navigateToSection = (sectionId: string) => {
    onBackToLogin();
    setTimeout(() => {
      window.location.hash = `#${sectionId}`;
      const el = document.getElementById(sectionId);
      el?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  const navigateToLegal = (tab: string) => {
    onBackToLogin();
    setTimeout(() => {
      window.location.hash = `#${tab}`;
    }, 60);
  };

  const isYearly = billing === 'annual';

  return (
    <div
      id="pricing-page"
      className="min-h-full w-full flex flex-col justify-between relative selection:bg-[#1565d8] selection:text-white"
      style={{
        backgroundColor: '#f4f7f6',
        color: '#0e1a2b',
        fontFamily: 'var(--body, Figtree, system-ui, sans-serif)',
      }}
    >
      {/* Scoped CSS for light mode fidelity matching landing page */}
      <style>{`
        #pricing-page {
          --bg: #f4f7f6;
          --surface: #ffffff;
          --ink: #0e1a2b;
          --muted: #4c5a6b;
          --line: #d9e1e6;
          --accent: #0a7d46;
          --on-accent: #ffffff;
          --mark: #d98e04;
          --mark-soft: #fbf0d6;
          --mark-ink: #6b4500;
          --display: "Bricolage Grotesque", "Trebuchet MS", system-ui, sans-serif;
          --body: "Figtree", system-ui, -apple-system, "Segoe UI", sans-serif;
          color-scheme: light;
        }
        .sp-display {
          font-family: var(--display);
        }
        .sp-body {
          font-family: var(--body);
        }
        .sp-seg {
          display: inline-flex;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 4px;
          gap: 4px;
          flex-wrap: wrap;
        }
        .sp-seg button {
          font: 500 0.95rem var(--body);
          color: var(--ink);
          background: transparent;
          border: 0;
          border-radius: 9px;
          padding: 8px 16px;
          min-height: 44px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: background 0.15s, color 0.15s;
        }
        .sp-seg button:hover {
          background: rgba(76, 195, 138, 0.12);
        }
        .sp-seg button[aria-pressed="true"] {
          background: var(--accent);
          color: var(--on-accent);
          font-weight: 600;
        }
        .sp-chip {
          font-size: 0.78rem;
          font-weight: 600;
          background: var(--mark-soft);
          color: var(--mark-ink);
          border-radius: 99px;
          padding: 2px 8px;
        }
        .sp-seg button[aria-pressed="true"] .sp-chip {
          background: rgba(10, 26, 17, 0.2);
          color: var(--on-accent);
        }
        .sp-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
          align-items: stretch;
        }
        @media (max-width: 1060px) {
          .sp-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .sp-grid {
            grid-template-columns: 1fr;
          }
        }
        .sp-card {
          position: relative;
          display: flex;
          flex-direction: column;
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 26px 22px 22px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .sp-card.popular {
          border-color: var(--accent);
          border-width: 2px;
          padding: 25px 21px 21px;
        }
        .sp-card.rec {
          box-shadow: 0 0 0 3px var(--mark);
        }
        .sp-tags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          min-height: 26px;
          margin-bottom: 10px;
        }
        .sp-tag {
          font-size: 0.8rem;
          font-weight: 600;
          border-radius: 99px;
          padding: 3px 10px;
          background: var(--bg);
          color: var(--muted);
          border: 1px solid var(--line);
        }
        .sp-tag.best {
          background: var(--accent);
          color: var(--on-accent);
          border-color: var(--accent);
        }
        .sp-tag.fit {
          background: var(--mark);
          color: #1d1400;
          border-color: var(--mark);
          font-weight: 700;
        }
        .sp-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-block: 1px solid var(--line);
          margin-bottom: 16px;
        }
        .sp-stats div {
          padding: 10px 0;
        }
        .sp-stats div + div {
          padding-left: 14px;
          border-left: 1px solid var(--line);
        }
        .sp-stats b {
          display: block;
          font-family: var(--display);
          font-weight: 700;
          font-size: 1.15rem;
          color: var(--ink);
        }
        .sp-stats span {
          font-size: 0.82rem;
          color: var(--muted);
        }
        .sp-features {
          list-style: none;
          margin: 0 0 20px;
          padding: 0;
          display: grid;
          gap: 9px;
          font-size: 0.95rem;
          color: var(--ink);
        }
        .sp-features li {
          position: relative;
          padding-left: 26px;
        }
        .sp-features li::before {
          content: "";
          position: absolute;
          left: 4px;
          top: 0.35em;
          width: 6px;
          height: 11px;
          border: solid var(--accent);
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
        .sp-support {
          margin-top: auto;
          font-size: 0.85rem;
          color: var(--muted);
          padding-top: 14px;
          border-top: 1px dashed var(--line);
          margin-bottom: 16px;
        }
        .sp-cta {
          font-family: var(--body);
          font-weight: 600;
          font-size: 1rem;
          min-height: 48px;
          border-radius: 11px;
          border: 1.5px solid var(--accent);
          background: transparent;
          color: var(--accent);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, color 0.15s, transform 0.1s;
        }
        .sp-cta:hover {
          background: var(--accent);
          color: var(--on-accent);
        }
        .sp-card.popular .sp-cta {
          background: var(--accent);
          color: var(--on-accent);
        }
        .sp-card.popular .sp-cta:hover {
          filter: brightness(1.1);
        }
        .sp-sr {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0 0 0 0);
          white-space: nowrap;
        }
      `}</style>

      {/* Darkening background overlay when custom image graphic is configured */}
      {loginBgGraphic && (
        <div className="fixed inset-0 bg-[#0F1613]/70 backdrop-blur-[1px] pointer-events-none -z-5" />
      )}

      {/* Top Navigation Bar: Light mode matching landing page */}
      <header
        className="px-4 sm:px-8 py-3.5 border-b border-[#d9e1e6] bg-[#f4f7f6]/95 backdrop-blur-md shadow-xs flex items-center justify-between shrink-0 sticky top-0 z-50 transition-colors"
      >
        {/* Brand */}
        <AppLogo theme="light" size="md" onClick={onBackToLogin} />

        {/* Quick Nav Anchors for Desktop Visitors */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-[#4c5a6b]">
          <a
            href="#industry-solutions"
            onClick={(e) => {
              e.preventDefault();
              navigateToSection('industry-solutions');
            }}
            className="hover:text-[#1565d8] transition"
          >
            Solutions
          </a>
          <a
            href="#kenya-payments"
            onClick={(e) => {
              e.preventDefault();
              navigateToSection('kenya-payments');
            }}
            className="hover:text-[#1565d8] transition"
          >
            M-Pesa &amp; eTIMS
          </a>
          <a
            href="#hardware-guide"
            onClick={(e) => {
              e.preventDefault();
              navigateToSection('hardware-guide');
            }}
            className="hover:text-[#1565d8] transition"
          >
            Hardware Freedom
          </a>
          <a
            href="#pricing-comparison"
            onClick={(e) => {
              e.preventDefault();
              navigateToSection('pricing-comparison');
            }}
            className="hover:text-[#1565d8] transition"
          >
            Why SokoPoS
          </a>
        </nav>

        {/* Action Buttons & Mobile Hamburger Menu */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {currentUser ? (
            <button
              type="button"
              id="pricing-top-nav-pos-terminal-btn"
              onClick={onBackToLogin}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition cursor-pointer"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Enter POS Terminal</span>
              <span className="sm:hidden">Terminal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              {/* Mobile View: Account Icon (returns to login) */}
              <button
                type="button"
                id="pricing-mobile-nav-account-btn"
                onClick={onBackToLogin}
                className="sm:hidden w-9 h-9 rounded-full bg-white hover:bg-slate-100 border border-[#d9e1e6] flex items-center justify-center transition cursor-pointer active:scale-95 shadow-xs group"
                title="Account Login"
                aria-label="Account Login"
              >
                <img
                  src="/assets/aistudio/icons8-account-50_6ea01032.png"
                  alt="Account"
                  className="w-5 h-5 object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                />
              </button>

              {/* Desktop View: Text Login Button in header (returns to login) */}
              <button
                type="button"
                id="pricing-top-nav-login-btn"
                onClick={onBackToLogin}
                className="hidden sm:inline-flex items-center px-4 py-1.5 rounded-xl bg-[#1565d8] hover:bg-[#1255b5] text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                Login
              </button>
            </>
          )}

          {/* Mobile Hamburger Menu with animated 2-bar toggle icon */}
          <MobileHeaderNav
            onNavigateSection={navigateToSection}
            onNavigatePricing={() => scrollToTop(true)}
            onAuthAction={onBackToLogin}
            isLoggedIn={Boolean(currentUser)}
            currentPage="pricing"
            theme="light"
          />
        </div>
      </header>

      {/* Main Pricing Section */}
      <main className="max-w-[1200px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-14 flex-1">
        {/* Header Title & Lede */}
        <div className="mb-8">
          <h1 className="sp-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#0e1a2b] mb-3 max-w-[16ch] leading-[1.05]">
            Pricing that grows with your shop
          </h1>
          <p className="text-base sm:text-lg text-[#4c5a6b] max-w-[52ch] leading-relaxed mb-8">
            Start free, add branches when you’re ready. All prices are in Kenyan shillings, with M-Pesa checkout built in.
          </p>
        </div>

        {/* Controls: Billing Cycle and Branch Recommender */}
        <div className="flex flex-wrap gap-5 sm:gap-10 items-end mb-2">
          {/* Billing selector */}
          <div className="flex flex-col gap-2" role="group" aria-labelledby="billing-label">
            <span id="billing-label" className="text-sm font-semibold text-[#0e1a2b]">
              Billing
            </span>
            <div className="sp-seg" id="billing">
              <button
                type="button"
                data-v="monthly"
                aria-pressed={billing === 'monthly'}
                onClick={() => setBilling('monthly')}
              >
                Monthly
              </button>
              <button
                type="button"
                data-v="annual"
                aria-pressed={billing === 'annual'}
                onClick={() => setBilling('annual')}
              >
                <span>Yearly</span>
                <span className="sp-chip">Save {savePercentage}%</span>
              </button>
            </div>
          </div>

          {/* How many branches do you run? */}
          <div className="flex flex-col gap-2" role="group" aria-labelledby="branches-label">
            <span id="branches-label" className="text-sm font-semibold text-[#0e1a2b]">
              How many branches do you run?
            </span>
            <div className="sp-seg" id="branches">
              <button
                type="button"
                data-n="1"
                aria-pressed={selectedBranches === 1}
                onClick={() => handleBranchSelect(1)}
              >
                1 branch
              </button>
              <button
                type="button"
                data-n="3"
                aria-pressed={selectedBranches === 3}
                onClick={() => handleBranchSelect(3)}
              >
                2 to 3
              </button>
              <button
                type="button"
                data-n="4"
                aria-pressed={selectedBranches === 4}
                onClick={() => handleBranchSelect(4)}
              >
                4 or more
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Branch Recommendation Hint */}
        <p className="min-h-[1.6em] my-3 sm:mb-7 text-sm sm:text-[0.95rem] text-[#4c5a6b]" aria-live="polite">
          {statusMessage || 'Choose your branch count and we’ll point you to the right plan.'}
        </p>

        {/* 4 Cards Grid */}
        <section className="sp-grid" aria-label="Plans">
          {TIERS.map((t) => {
            const big = isYearly ? t.a : t.m;
            const per = t.m === 0 ? '/month' : isYearly ? '/year' : '/month';
            const isRec = recommendedId === t.id;

            let sub: React.ReactNode;
            if (t.setup) {
              sub = (
                <span>
                  <strong>+ Ksh {fmt.format(t.setup)}</strong> one-time setup. {t.setupNote}
                </span>
              );
            } else if (isYearly) {
              sub = (
                <span>
                  About Ksh {fmt.format(Math.round(t.a / 12))} a month. You save{' '}
                  <strong>Ksh {fmt.format(t.m * 12 - t.a)}</strong>.
                </span>
              );
            } else {
              sub = <span>Or Ksh {fmt.format(t.a)} a year.</span>;
            }

            return (
              <article
                key={t.id}
                className={`sp-card ${t.pop ? 'popular' : ''} ${isRec ? 'rec' : ''}`}
                aria-labelledby={`h-${t.id}`}
              >
                {/* Tags container */}
                <div className="sp-tags">
                  {t.badge && (
                    <span className={`sp-tag ${t.pop ? 'best' : ''}`}>{t.badge}</span>
                  )}
                  {isRec && <span className="sp-tag fit">Fits your shops</span>}
                </div>

                {/* Plan Header */}
                <h2 id={`h-${t.id}`} className="sp-display text-2xl font-bold text-[#0e1a2b] m-0 leading-tight">
                  {t.name}
                </h2>
                <p className="text-[#4c5a6b] text-[0.95rem] mt-0.5 mb-4">{t.alias}</p>

                {/* Pricing amount */}
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="sp-display font-bold text-[2.4rem] leading-none tracking-tight text-[#0e1a2b]">
                    Ksh {fmt.format(big)}
                  </span>
                  <span className="text-[#4c5a6b] text-[0.95rem]">{per}</span>
                </div>

                {/* Subtext description */}
                <p className="text-[#4c5a6b] text-sm my-1.5 mb-3.5 min-h-[2.8em] leading-snug">{sub}</p>

                {/* Tagline */}
                <p className="text-[0.95rem] text-[#0e1a2b] mb-4 leading-normal">{t.tagline}</p>

                {/* 2-Column Stats (Branches & Staff Logins) */}
                <div className="sp-stats">
                  <div>
                    <b>{t.branches}</b>
                    <span>{t.branches === '1' ? 'branch' : 'branches'}</span>
                  </div>
                  <div>
                    <b>{t.staff}</b>
                    <span>{t.staff === '1' ? 'staff login' : 'staff logins'}</span>
                  </div>
                </div>

                {/* Feature Checklist */}
                <ul className="sp-features">
                  {t.f.map((feature, idx) => (
                    <li key={idx}>{feature}</li>
                  ))}
                </ul>

                {/* Support line */}
                <p className="sp-support">{t.support}</p>

                {/* Action CTA Button */}
                <button
                  type="button"
                  className="sp-cta cursor-pointer"
                  data-id={t.id}
                  onClick={() => handleCtaClick(t)}
                >
                  {t.cta}
                  <span className="sp-sr"> for the {t.name} plan</span>
                </button>
              </article>
            );
          })}
        </section>

        {/* Explanatory Footnote */}
        <p className="mt-7 text-[#4c5a6b] text-sm max-w-[70ch] leading-relaxed">
          Yearly billing covers ten months instead of twelve. The free plan has no monthly fee; the one-time setup session is paid once.
        </p>

        {/* Action Bar at bottom of document */}
        <div className="mt-10 pt-6 border-t border-[#d9e1e6] flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackToLogin}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-[#0e1a2b] text-xs font-bold border border-[#d9e1e6] transition cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-[#1565d8]" />
            <span>{currentUser ? 'Return to Active POS Register' : 'Return to POS Terminal Login'}</span>
          </button>

          <button
            type="button"
            id="pricing-scroll-to-top-btn"
            onClick={() => scrollToTop(true)}
            className="text-xs text-[#4c5a6b] hover:text-[#0e1a2b] transition cursor-pointer font-medium select-none"
            aria-label="Scroll to top of page"
          >
            Scroll to Top ↑
          </button>
        </div>
      </main>

      {/* Floating WhatsApp Action Button for Kenya Retailers */}
      <WhatsAppFloatingButton phoneNumber="+254740463021" />

      {/* Benchmark Footer in Light Mode */}
      <AppFooter
        onBackToLogin={onBackToLogin}
        onNavigatePricing={() => scrollToTop(true)}
        onNavigateLegal={navigateToLegal}
        activePage="pricing"
        idPrefix="pricing-footer"
        theme="light"
      />
    </div>
  );
};
