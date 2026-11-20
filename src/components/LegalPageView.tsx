import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  Shield,
  HelpCircle,
  Building,
  Search,
  CheckCircle2,
  Lock,
  Scale,
  ChevronDown,
  ChevronUp,
  Printer,
  ArrowLeft,
  Store,
  ShieldCheck,
  Server,
  FileCheck,
  ArrowRight,
} from 'lucide-react';
import { LegalTab } from './LegalAndFaqModal';
import { AppLogo } from './common/AppLogo';
import { AppFooter } from './common/AppFooter';
import { MobileHeaderNav } from './common/MobileHeaderNav';
import { scrollToTop } from '../utils/scrollUtils';
import { FAQ_ITEMS, FAQ_CATEGORIES } from '../data/faqData';
import {
  LEGAL_ENTITY,
  TERMS_SECTIONS,
  PRIVACY_SECTIONS,
  OWNERSHIP_IP_SECTIONS,
} from '../data/legalContent';

interface LegalPageViewProps {
  currentTab: LegalTab;
  onTabChange: (tab: LegalTab) => void;
  onBackToLogin: () => void;
  loginBgGraphic?: string | null;
}

export const LegalPageView: React.FC<LegalPageViewProps> = ({
  currentTab,
  onTabChange,
  onBackToLogin,
  loginBgGraphic,
}) => {
  const [faqSearchQuery, setFaqSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-ownership');

  // Scroll to top when tab changes
  useEffect(() => {
    scrollToTop(true);
  }, [currentTab]);

  const categories = FAQ_CATEGORIES;

  const filteredFaqs = useMemo(() => {
    return FAQ_ITEMS.filter((item) => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesQuery =
        faqSearchQuery.trim() === '' ||
        item.question.toLowerCase().includes(faqSearchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(faqSearchQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [selectedCategory, faqSearchQuery]);

  const pageTitles: Record<LegalTab, { title: string; subtitle: string; icon: React.ReactNode }> = {
    terms: {
      title: 'Terms of Service',
      subtitle: 'SokoPoS Cloud Master Services Agreement & End-User License',
      icon: <FileText className="w-6 h-6 text-emerald-600" />,
    },
    privacy: {
      title: 'Privacy Policy & Data Protection',
      subtitle: 'Kenya Data Protection Act 2019 & GDPR Alignment',
      icon: <Shield className="w-6 h-6 text-emerald-600" />,
    },
    faq: {
      title: 'Frequently Asked Questions (FAQ)',
      subtitle: 'Everything you need to know about SokoPoS terminal setup and operations',
      icon: <HelpCircle className="w-6 h-6 text-emerald-600" />,
    },
    ownership: {
      title: 'Ownership & Legal Notice',
      subtitle: 'Corporate Governance, Intellectual Property & Trademark Protection',
      icon: <Building className="w-6 h-6 text-purple-600" />,
    },
    compliance: {
      title: 'Cloud & Regulatory Compliance',
      subtitle: 'Google Cloud Platform Terms of Service & Acceptable Use Policy',
      icon: <ShieldCheck className="w-6 h-6 text-emerald-600" />,
    },
  };

  const currentInfo = pageTitles[currentTab] || pageTitles.terms;

  return (
    <div
      id="legal-page-body"
      className="min-h-screen w-full flex flex-col justify-between font-sans selection:bg-[#28a745] selection:text-white bg-[#f8fafc] text-[#090d16]"
    >
      {/* Top Navigation Bar: Light mode */}
      <header className="fixed top-0 left-0 right-0 z-30 w-full border-b border-[#e2e8f0] bg-[#f8fafc]/95 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            id="back-to-terminal-btn"
            onClick={onBackToLogin}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-[#090d16] text-xs font-bold border border-[#e2e8f0] transition cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-[#28a745]" />
            <span className="hidden sm:inline">Back to POS Terminal</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div className="h-5 w-px bg-[#d9e1e6] hidden sm:block" />

          {/* Logo Brand */}
          <AppLogo theme="light" size="md" onClick={onBackToLogin} />
        </div>

        {/* Secondary Header Actions & Mobile Hamburger Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-[#0e1a2b] text-xs font-semibold border border-[#d9e1e6] transition cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-[#4c5a6b]" />
            <span className="hidden sm:inline">Print Document</span>
          </button>

          <MobileHeaderNav
            onNavigateSection={(sectionId) => {
              onBackToLogin();
              setTimeout(() => {
                if (sectionId === 'home' || sectionId === 'top' || !sectionId) {
                  if (window.location.hash) {
                    try {
                      history.replaceState(null, '', window.location.pathname);
                    } catch {
                      window.location.hash = '';
                    }
                  }
                  scrollToTop(true);
                } else {
                  window.location.hash = `#${sectionId}`;
                  const el = document.getElementById(sectionId);
                  el?.scrollIntoView({ behavior: 'smooth' });
                }
              }, 80);
            }}
            onNavigatePricing={() => {
              window.location.hash = '#pricing';
            }}
            onAuthAction={onBackToLogin}
            isLoggedIn={false}
            currentPage="landing"
            theme="light"
          />
        </div>
      </header>

      {/* Main Page Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8 sm:pb-12">
        {/* Navigation Breadcrumb & Tab Pills */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-[#4c5a6b] mb-3">
            <button
              type="button"
              onClick={onBackToLogin}
              className="hover:text-[#28a745] transition cursor-pointer"
            >
              Home
            </button>
            <span className="text-[#d9e1e6]">/</span>
            <span className="text-[#0e1a2b] font-semibold">{currentInfo.title}</span>
          </div>

          {/* Tab Selector Buttons */}
          <nav
            aria-label="Legal Sections Navigation"
            className="flex items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-[#d9e1e6] shadow-xs overflow-x-auto scrollbar-none"
          >
            <button
              type="button"
              id="page-tab-terms"
              onClick={() => onTabChange('terms')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                currentTab === 'terms'
                  ? 'bg-[#28a745] text-white shadow-md shadow-emerald-600/30'
                  : 'text-[#4c5a6b] hover:text-[#0e1a2b] hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Terms of Service</span>
            </button>

            <button
              type="button"
              id="page-tab-privacy"
              onClick={() => onTabChange('privacy')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                currentTab === 'privacy'
                  ? 'bg-[#28a745] text-white shadow-md shadow-emerald-600/30'
                  : 'text-[#4c5a6b] hover:text-[#0e1a2b] hover:bg-slate-100'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Privacy Policy</span>
            </button>

            <button
              type="button"
              id="page-tab-faq"
              onClick={() => onTabChange('faq')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                currentTab === 'faq'
                  ? 'bg-[#28a745] text-white shadow-md shadow-emerald-600/30'
                  : 'text-[#4c5a6b] hover:text-[#0e1a2b] hover:bg-slate-100'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>FAQ</span>
            </button>

            <button
              type="button"
              id="page-tab-ownership"
              onClick={() => onTabChange('ownership')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                currentTab === 'ownership'
                  ? 'bg-[#28a745] text-white shadow-md shadow-emerald-600/30'
                  : 'text-[#4c5a6b] hover:text-[#0e1a2b] hover:bg-slate-100'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Ownership &amp; Legal Notice</span>
            </button>

            <button
              type="button"
              id="page-tab-compliance"
              onClick={() => onTabChange('compliance')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                currentTab === 'compliance'
                  ? 'bg-[#28a745] text-white shadow-md shadow-emerald-600/30'
                  : 'text-[#4c5a6b] hover:text-[#0e1a2b] hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Cloud Compliance</span>
            </button>
          </nav>
        </div>

        {/* Page Header Card - Translucent white background with black text */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-white/60 p-6 sm:p-8 mb-8 shadow-xl text-black">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 shrink-0">
              {currentInfo.icon}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight leading-tight">
                {currentInfo.title}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 mt-1 font-medium">
                {currentInfo.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: TERMS OF SERVICE */}
        {/* ======================================================== */}
        {currentTab === 'terms' && (
          <div className="space-y-6">
            {/* Overview Card */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-[#e2e8f0] p-6 shadow-xs text-[#090d16]">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-[#28a745] shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-black text-base text-[#090d16] mb-1">
                    {LEGAL_ENTITY.trademarkName} Commercial Software License &amp; Terms of Service
                  </h2>
                  <p className="text-xs text-[#475569] font-medium leading-relaxed">
                    Last Revised: {LEGAL_ENTITY.lastRevised} &middot; {LEGAL_ENTITY.productName} is engineered, wholly owned,
                    and operated by <strong>{LEGAL_ENTITY.companyName}</strong>. Key protections include an &ldquo;AS IS&rdquo;
                    warranty disclaimer, a 12-month fee liability cap, and explicit third-party disclaimers for eTIMS, M-Pesa,
                    offline storage, hardware, and AI features.
                  </p>
                </div>
              </div>
            </div>

            {/* Document Content Sections */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-[#e2e8f0] p-6 sm:p-8 shadow-sm text-[#090d16] space-y-7 text-xs sm:text-[13px] leading-relaxed">
              {TERMS_SECTIONS.map((section, idx) => (
                <React.Fragment key={section.number}>
                  {idx > 0 && <hr className="border-[#e2e8f0]" />}
                  <section className="space-y-2.5">
                    <h3 className="text-sm sm:text-base font-black text-[#090d16] flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-slate-100 border border-[#e2e8f0] text-[#090d16] inline-flex items-center justify-center text-xs font-mono font-bold tabular-nums shrink-0">
                        {section.number}
                      </span>
                      <span>{section.title}</span>
                    </h3>
                    {section.paragraphs.map((para, pIdx) => (
                      <p key={pIdx} className="text-[#334155]">
                        {para}
                      </p>
                    ))}
                    {section.bullets && section.bullets.length > 0 && (
                      <ul className="list-disc pl-5 space-y-2 text-[#334155] pt-1">
                        {section.bullets.map((b, bIdx) => (
                          <li key={bIdx}>
                            {b.label && <strong className="text-[#090d16]">{b.label}: </strong>}
                            <span>{b.text}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {section.callout && (
                      <div className="mt-2 p-3.5 rounded-xl bg-slate-50 border border-[#e2e8f0] text-[#090d16] text-xs font-medium">
                        {section.callout}
                      </div>
                    )}
                  </section>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: PRIVACY POLICY */}
        {/* ======================================================== */}
        {currentTab === 'privacy' && (
          <div className="space-y-6">
            {/* Overview Card */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-[#e2e8f0] p-6 shadow-xs text-[#090d16]">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-[#28a745] shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-black text-base text-[#090d16] mb-1">
                    {LEGAL_ENTITY.productName} Privacy &amp; Data Protection Commitment
                  </h2>
                  <p className="text-xs text-[#475569] font-medium leading-relaxed">
                    Operated by <strong>{LEGAL_ENTITY.companyName}</strong>. We adhere strictly to the Kenya Data Protection Act 2019,
                    GDPR alignment standards, multi-tenant cryptographic isolation, and zero third-party data monetization.
                  </p>
                </div>
              </div>
            </div>

            {/* Document Content Sections */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-[#e2e8f0] p-6 sm:p-8 shadow-sm text-[#090d16] space-y-7 text-xs sm:text-[13px] leading-relaxed">
              {PRIVACY_SECTIONS.map((section, idx) => (
                <React.Fragment key={section.number}>
                  {idx > 0 && <hr className="border-[#e2e8f0]" />}
                  <section className="space-y-2.5">
                    <h3 className="text-sm sm:text-base font-black text-[#090d16] flex items-center gap-2">
                      {section.number === '1' && <Lock className="w-4 h-4 text-[#28a745] shrink-0" />}
                      {section.number === '2' && <CheckCircle2 className="w-4 h-4 text-[#28a745] shrink-0" />}
                      {section.number === '3' && <ShieldCheck className="w-4 h-4 text-[#28a745] shrink-0" />}
                      {section.number === '4' && <Server className="w-4 h-4 text-[#28a745] shrink-0" />}
                      <span>
                        {section.number}. {section.title}
                      </span>
                    </h3>
                    {section.paragraphs.map((para, pIdx) => (
                      <p key={pIdx} className="text-[#334155]">
                        {para}
                      </p>
                    ))}
                    {section.bullets && section.bullets.length > 0 && (
                      <ul className="list-disc pl-5 space-y-1.5 text-[#334155]">
                        {section.bullets.map((b, bIdx) => (
                          <li key={bIdx}>
                            {b.label && <strong className="text-[#090d16]">{b.label}: </strong>}
                            <span>{b.text}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: FAQ */}
        {/* ======================================================== */}
        {currentTab === 'faq' && (
          <div className="space-y-6">
            {/* Search and Category Filters */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 p-5 shadow-md text-black space-y-4">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  id="faq-search-input"
                  value={faqSearchQuery}
                  onChange={(e) => setFaqSearchQuery(e.target.value)}
                  placeholder="Search questions (e.g. pricing, eTIMS, Paystack, M-Pesa, shifts, stock transfer, offline)..."
                  className="w-full pl-10 pr-16 py-2.5 bg-neutral-100 border border-neutral-300 rounded-xl text-xs text-black placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
                />
                {faqSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setFaqSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black text-xs font-bold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* FAQ Accordion List */}
            <div className="space-y-3">
              {filteredFaqs.length === 0 ? (
                <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 p-12 text-center text-neutral-500 text-xs">
                  No questions found matching your search. Try searching for &ldquo;pricing&rdquo;, &ldquo;eTIMS&rdquo;, &ldquo;Paystack&rdquo;, or &ldquo;offline&rdquo;.
                </div>
              ) : (
                filteredFaqs.map((faq) => {
                  const isExpanded = expandedFaqId === faq.id;
                  return (
                    <div
                      key={faq.id}
                      className={`bg-white/90 backdrop-blur-md rounded-2xl border transition-all overflow-hidden ${
                        isExpanded
                          ? 'border-emerald-500/60 shadow-lg'
                          : 'border-white/60 hover:border-neutral-300 shadow-sm'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                        className="w-full px-5 py-4 flex items-center justify-between text-left gap-4 cursor-pointer"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                            {faq.category}
                          </span>
                          <span className="font-bold text-black text-xs sm:text-sm">{faq.question}</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-neutral-100 text-neutral-600 shrink-0">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-2 text-neutral-700 text-xs border-t border-neutral-100 leading-relaxed font-medium">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Assistance Banner */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 p-6 shadow-md text-black flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-black text-sm text-black">Still have questions?</h3>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Our Nairobi retail support team is available on WhatsApp to help configure your store.
                </p>
              </div>
              <a
                href="https://wa.me/254740463021?text=Hello%20SokoPoS%20Specialist,%20I%20have%20a%20question%20about%20the%20platform."
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs whitespace-nowrap"
              >
                Talk to a POS Specialist
              </a>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: OWNERSHIP & LEGAL NOTICE */}
        {/* ======================================================== */}
        {currentTab === 'ownership' && (
          <div className="space-y-6">
            {/* Overview Card */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-[#e2e8f0] p-6 shadow-xs text-[#090d16]">
              <div className="flex items-start gap-3">
                <Building className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-black text-base text-[#090d16] mb-1">
                    Corporate Ownership &amp; Intellectual Property Notice
                  </h2>
                  <p className="text-xs text-[#475569] font-medium leading-relaxed">
                    Official declaration of entity ownership, trademark attribution, anti-cloning protections, and IP reporting under{' '}
                    <strong>{LEGAL_ENTITY.companyName}</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Corporate Entity Grid */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-[#e2e8f0] p-6 sm:p-8 shadow-sm text-[#090d16] space-y-6 text-xs sm:text-[13px] leading-relaxed">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#090d16] font-black text-sm sm:text-base">
                  <Store className="w-5 h-5 text-[#28a745]" />
                  <span>{LEGAL_ENTITY.trademarkName} Brand &amp; Operations Statement</span>
                </div>
                <p className="text-[#334155]">
                  <strong>{LEGAL_ENTITY.trademarkName}</strong> is a proprietary enterprise retail management, point-of-sale,
                  and cloud synchronization software platform engineered, wholly owned, and operated exclusively by{' '}
                  <strong>{LEGAL_ENTITY.companyName}</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="p-4 bg-slate-50 rounded-xl border border-[#e2e8f0]">
                  <span className="text-[#475569] block text-[11px] font-semibold">Operating Legal Entity &amp; IP Owner</span>
                  <strong className="text-[#090d16] text-sm">{LEGAL_ENTITY.companyName}</strong>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-[#e2e8f0]">
                  <span className="text-[#475569] block text-[11px] font-semibold">Protected Brand &amp; Platform</span>
                  <strong className="text-[#090d16] text-sm">{LEGAL_ENTITY.trademarkName} Point of Sale Platform</strong>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-[#e2e8f0]">
                  <span className="text-[#475569] block text-[11px] font-semibold">Governing Law &amp; Jurisdiction</span>
                  <strong className="text-[#090d16] text-sm">{LEGAL_ENTITY.governingLaw}</strong>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-[#e2e8f0]">
                  <span className="text-[#475569] block text-[11px] font-semibold">Legal, IP &amp; Takedown Contact</span>
                  <strong className="text-[#090d16] text-sm">{LEGAL_ENTITY.legalEmail}</strong>
                </div>
              </div>

              {OWNERSHIP_IP_SECTIONS.map((section) => (
                <React.Fragment key={section.number}>
                  <hr className="border-[#e2e8f0]" />
                  <section className="space-y-2.5">
                    <h3 className="text-sm sm:text-base font-black text-[#090d16] flex items-center gap-2">
                      <Scale className="w-4 h-4 text-[#28a745] shrink-0" />
                      <span>
                        {section.number}. {section.title}
                      </span>
                    </h3>
                    {section.paragraphs.map((para, pIdx) => (
                      <p key={pIdx} className="text-[#334155]">
                        {para}
                      </p>
                    ))}
                    {section.bullets && section.bullets.length > 0 && (
                      <ul className="list-disc pl-5 space-y-1.5 text-[#334155]">
                        {section.bullets.map((b, bIdx) => (
                          <li key={bIdx}>{b.text}</li>
                        ))}
                      </ul>
                    )}
                  </section>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: GCP & CLOUD COMPLIANCE */}
        {/* ======================================================== */}
        {currentTab === 'compliance' && (
          <div className="space-y-6">
            {/* Overview Card */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 p-6 shadow-md text-black">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-black text-base text-black mb-1">
                    Google Cloud Platform & Acceptable Use Policy Compliance
                  </h2>
                  <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                    SokoPoS is engineered and maintained in rigorous compliance with the <strong>Google Cloud Platform Terms of Service</strong>,
                    <strong>Google Cloud Acceptable Use Policy (AUP)</strong>, and <strong>Google API Services User Data Policy</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Compliance Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm text-black">
                <div className="flex items-center gap-2 font-bold text-emerald-700 mb-1.5 text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Zero Open Write Vulnerabilities</span>
                </div>
                <p className="text-neutral-700 text-xs leading-relaxed">
                  All Firestore cloud database collections enforce strict authenticated token evaluation and row-level tenant boundary checks. No unauthenticated public writes are permitted.
                </p>
              </div>

              <div className="p-4 bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm text-black">
                <div className="flex items-center gap-2 font-bold text-emerald-700 mb-1.5 text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Rate-Limited AI & Auth Endpoints</span>
                </div>
                <p className="text-neutral-700 text-xs leading-relaxed">
                  Vision AI and staff verification routes are protected by aggressive per-IP rate limits to prevent brute forcing, automated resource exhaustion, and DoS abuse.
                </p>
              </div>

              <div className="p-4 bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm text-black">
                <div className="flex items-center gap-2 font-bold text-emerald-700 mb-1.5 text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Google API Limited Use Certified</span>
                </div>
                <p className="text-neutral-700 text-xs leading-relaxed">
                  Authentication data is strictly used for tenant provisioning and session security. User data is never transferred to data brokers or used to train third-party AI models.
                </p>
              </div>

              <div className="p-4 bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm text-black">
                <div className="flex items-center gap-2 font-bold text-emerald-700 mb-1.5 text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Prohibited Activities Banned</span>
                </div>
                <p className="text-neutral-700 text-xs leading-relaxed">
                  Cryptocurrency mining, spam distribution, port scanning, unauthorized vulnerability testing, and malicious payload distribution are strictly barred from the system.
                </p>
              </div>
            </div>

            {/* Detailed Policies */}
            <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white/60 p-6 sm:p-8 shadow-xl text-black space-y-7 text-xs leading-relaxed">
              <section className="space-y-2.5">
                <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  1. Google Cloud Acceptable Use Policy (AUP) Statement
                </h3>
                <p className="text-neutral-700">
                  SokoPoS subscribers and users agree not to use the services, or encourage others to use the services:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-neutral-700">
                  <li>To violate or encourage the violation of the legal rights of others (including intellectual property, privacy, or trade secret rights).</li>
                  <li>To engage in, promote, or encourage illegal activity, including money laundering, fraud, or tax evasion.</li>
                  <li>For any unlawful, invasive, defamatory, infringing, or fraudulent purpose.</li>
                  <li>To distribute viruses, worms, Trojan horses, corrupted files, or items of a destructive nature.</li>
                  <li>To disable, disrupt, or impair the infrastructure or operational capability of Google Cloud Platform, Google APIs, or SokoPoS endpoints.</li>
                  <li>To engage in cryptocurrency mining without prior written authorization from Google Cloud.</li>
                </ul>
              </section>

              <hr className="border-neutral-200" />

              <section className="space-y-2.5">
                <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-600" />
                  2. Anti-Suspension Architecture & Infrastructure Protection
                </h3>
                <p className="text-neutral-700">
                  To prevent project suspension, billing anomalies, or automated threat containment triggers by Google Cloud security scanners:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-neutral-700">
                  <li>
                    <strong>Hardened Cloud Firestore Security Rules:</strong> Every collection requires valid Google authentication. The default fallback rule enforces <code className="bg-slate-200 text-rose-700 px-1.5 py-0.5 rounded font-mono">allow read, write: if false;</code> to block unmanaged root traversal.
                  </li>
                  <li>
                    <strong>Memory Local Caching:</strong> In-browser memory caching is enforced to prevent local storage quota exhaustion, multi-tab heartbeat thrashing, or uncaught assertion failures.
                  </li>
                  <li>
                    <strong>Graceful Backoff:</strong> Cloud synchronization routines execute deterministic exponential backoff when networks are offline or throttled, eliminating retry storms against GCP servers.
                  </li>
                </ul>
              </section>
            </div>
          </div>
        )}

        {/* Back to Login Action Bar at bottom of document */}
        <div className="mt-10 pt-6 border-t border-[#d9e1e6] flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackToLogin}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-[#0e1a2b] text-xs font-bold border border-[#d9e1e6] transition cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-[#28a745]" />
            <span>Return to POS Terminal Login</span>
          </button>

          <button
            type="button"
            id="legal-scroll-to-top-btn"
            onClick={() => scrollToTop(true)}
            className="text-xs text-[#4c5a6b] hover:text-[#0e1a2b] transition cursor-pointer font-medium select-none"
            aria-label="Scroll to top of page"
          >
            Scroll to Top ↑
          </button>
        </div>
      </main>

      {/* Benchmark System Footer in Light Mode */}
      <AppFooter
        onBackToLogin={onBackToLogin}
        onNavigatePricing={() => {
          window.location.hash = '#pricing';
        }}
        onNavigateLegal={onTabChange}
        activePage={currentTab}
        idPrefix="legal-page-footer"
        theme="light"
      />
    </div>
  );
};
