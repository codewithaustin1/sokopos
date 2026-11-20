import React, { useState, useEffect } from 'react';
import {
  X,
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
  Store,
  ShieldCheck,
  Server,
  FileCheck,
} from 'lucide-react';
import { FAQ_ITEMS, FAQ_CATEGORIES } from '../data/faqData';
import {
  LEGAL_ENTITY,
  TERMS_SECTIONS,
  PRIVACY_SECTIONS,
  OWNERSHIP_IP_SECTIONS,
} from '../data/legalContent';

export type LegalTab = 'terms' | 'privacy' | 'compliance' | 'ownership' | 'faq';

interface LegalAndFaqModalProps {
  isOpen: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
}

export const LegalAndFaqModal: React.FC<LegalAndFaqModalProps> = ({
  isOpen,
  initialTab = 'terms',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);
  const [faqSearchQuery, setFaqSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-ownership');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const categories = FAQ_CATEGORIES;

  const filteredFaqs = FAQ_ITEMS.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesQuery =
      faqSearchQuery.trim() === '' ||
      item.question.toLowerCase().includes(faqSearchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(faqSearchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div
      id="legal-and-faq-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">SokoPoS Legal & Information Hub</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Sokoplus Horizon
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official terms, privacy, compliance standards, and merchant guidance.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-legal-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className="px-5 bg-slate-950/50 border-b border-slate-800 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <button
            type="button"
            id="tab-terms-btn"
            onClick={() => setActiveTab('terms')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'terms'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Terms of Service</span>
          </button>

          <button
            type="button"
            id="tab-privacy-btn"
            onClick={() => setActiveTab('privacy')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'privacy'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Privacy Policy</span>
          </button>

          <button
            type="button"
            id="tab-compliance-btn"
            onClick={() => setActiveTab('compliance')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'compliance'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>GCP & Cloud Compliance</span>
          </button>

          <button
            type="button"
            id="tab-ownership-btn"
            onClick={() => setActiveTab('ownership')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ownership'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Ownership & Legal Notice</span>
          </button>

          <button
            type="button"
            id="tab-faq-btn"
            onClick={() => setActiveTab('faq')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'faq'
                ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Frequently Asked Questions (FAQ)</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6 text-slate-300 text-xs leading-relaxed">
          {/* ======================================================== */}
          {/* TAB 1: TERMS OF SERVICE */}
          {/* ======================================================== */}
          {activeTab === 'terms' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                <FileText className="w-5 h-5 text-[#28a745] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-sm mb-1">
                    {LEGAL_ENTITY.trademarkName} Commercial Software License &amp; Terms of Service
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Last Revised: {LEGAL_ENTITY.lastRevised} &middot; {LEGAL_ENTITY.productName} is engineered, wholly owned,
                    and operated by <strong>{LEGAL_ENTITY.companyName}</strong>. Includes &ldquo;AS IS&rdquo; warranty
                    disclaimers, a 12-month fee liability cap, and operational disclaimers for eTIMS, M-Pesa, offline sync,
                    hardware, and AI features.
                  </p>
                </div>
              </div>

              {TERMS_SECTIONS.map((section) => (
                <section key={section.number} className="space-y-2 pb-4 border-b border-slate-800/80 last:border-b-0">
                  <h5 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 inline-flex items-center justify-center text-[10px] font-mono tabular-nums shrink-0">
                      {section.number}
                    </span>
                    <span>{section.title}</span>
                  </h5>
                  {section.paragraphs.map((para, pIdx) => (
                    <p key={pIdx} className="text-slate-300">
                      {para}
                    </p>
                  ))}
                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="list-disc pl-5 space-y-1.5 text-slate-300 pt-1">
                      {section.bullets.map((b, bIdx) => (
                        <li key={bIdx}>
                          {b.label && <strong className="text-white">{b.label}: </strong>}
                          <span>{b.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {section.callout && (
                    <div className="mt-2 p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-[11px]">
                      {section.callout}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: PRIVACY POLICY */}
          {/* ======================================================== */}
          {activeTab === 'privacy' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-sm mb-1">
                    {LEGAL_ENTITY.productName} Privacy &amp; Data Protection Commitment
                  </h4>
                  <p className="text-[11px] text-emerald-200/90">
                    Operated by <strong>{LEGAL_ENTITY.companyName}</strong>. We adhere to the Kenya Data Protection Act 2019,
                    multi-tenant cryptographic isolation, and zero third-party data monetization.
                  </p>
                </div>
              </div>

              {PRIVACY_SECTIONS.map((section) => (
                <section key={section.number} className="space-y-2 pb-4 border-b border-slate-800/80 last:border-b-0">
                  <h5 className="text-sm font-bold text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {section.number}. {section.title}
                    </span>
                  </h5>
                  {section.paragraphs.map((para, pIdx) => (
                    <p key={pIdx} className="text-slate-300">
                      {para}
                    </p>
                  ))}
                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="list-disc pl-5 space-y-1 text-slate-300">
                      {section.bullets.map((b, bIdx) => (
                        <li key={bIdx}>
                          {b.label && <strong className="text-white">{b.label}: </strong>}
                          <span>{b.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: GCP & CLOUD COMPLIANCE */}
          {/* ======================================================== */}
          {activeTab === 'compliance' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-sm mb-1">
                    Google Cloud Platform & Acceptable Use Policy Compliance
                  </h4>
                  <p className="text-[11px] text-emerald-200/90">
                    SokoPoS is engineered and maintained in rigorous compliance with the <strong>Google Cloud Platform Terms of Service</strong>,
                    <strong>Google Cloud Acceptable Use Policy (AUP)</strong>, and <strong>Google API Services User Data Policy</strong>.
                  </p>
                </div>
              </div>

              {/* Compliance Highlights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2 font-bold text-emerald-400 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Zero Open Write Vulnerabilities</span>
                  </div>
                  <p className="text-slate-400">
                    All Firestore cloud database collections enforce strict authenticated token evaluation and row-level tenant boundary checks. No unauthenticated public writes are permitted.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2 font-bold text-emerald-400 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Rate-Limited AI & Auth Endpoints</span>
                  </div>
                  <p className="text-slate-400">
                    Vision AI and staff verification routes are protected by aggressive per-IP rate limits to prevent brute forcing, automated resource exhaustion, and DoS abuse.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2 font-bold text-emerald-400 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Google API Limited Use Certified</span>
                  </div>
                  <p className="text-slate-400">
                    Authentication data is strictly used for tenant provisioning and session security. User data is never transferred to data brokers or used to train third-party AI models.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2 font-bold text-emerald-400 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Prohibited Activities Banned</span>
                  </div>
                  <p className="text-slate-400">
                    Cryptocurrency mining, spam distribution, port scanning, unauthorized vulnerability testing, and malicious payload distribution are strictly barred from the system.
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <h5 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  1. Google Cloud Acceptable Use Policy (AUP) Statement
                </h5>
                <p>
                  SokoPoS subscribers and users agree not to use the services, or encourage others to use the services:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                  <li>To violate or encourage the violation of the legal rights of others (including intellectual property, privacy, or trade secret rights).</li>
                  <li>To engage in, promote, or encourage illegal activity, including money laundering, fraud, or tax evasion.</li>
                  <li>For any unlawful, invasive, defamatory, infringing, or fraudulent purpose (such as phishing, creating pyramid schemes, or mirroring unauthorized software).</li>
                  <li>To distribute viruses, worms, Trojan horses, corrupted files, hoaxes, or other items of a destructive or deceptive nature.</li>
                  <li>To disable, disrupt, or impair the infrastructure or operational capability of Google Cloud Platform, Google APIs, or SokoPoS cloud sync endpoints.</li>
                  <li>To engage in cryptocurrency mining without prior written authorization from Google Cloud.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h5 className="text-sm font-bold text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-400" />
                  2. Anti-Suspension Architecture & Infrastructure Protection
                </h5>
                <p>
                  To prevent project suspension, billing anomalies, or automated threat containment triggers by Google Cloud security scanners:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                  <li><strong>Hardened Cloud Firestore Security Rules:</strong> Every collection requires valid Google authentication. The default fallback rule enforces <code className="bg-slate-800 text-rose-400 px-1.5 py-0.5 rounded">allow read, write: if false;</code> to block unmanaged root traversal.</li>
                  <li><strong>Memory Local Caching:</strong> In-browser memory caching is enforced to prevent local storage quota exhaustion, multi-tab heartbeat thrashing, or uncaught assertion failures.</li>
                  <li><strong>Graceful Backoff:</strong> Cloud synchronization routines execute deterministic exponential backoff when networks are offline or throttled, eliminating retry storms against GCP servers.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h5 className="text-sm font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  3. Google User Data Privacy & Limited Use Disclosure
                </h5>
                <p>
                  SokoPoS’s use and transfer of information received from Google APIs adheres to the <strong>Google API Services User Data Policy</strong>, including the Limited Use requirements. Specifically:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                  <li>We only request minimal OAuth scopes necessary for authenticating the merchant owner (profile identity and email address).</li>
                  <li>We do not transfer user data to third parties other than Google Cloud Platform service infrastructure necessary to operate the application.</li>
                  <li>We never sell user data or disclose authentication tokens to advertising networks.</li>
                  <li>We do not use Google user data to serve targeted advertisements or train generalized artificial intelligence models without explicit merchant consent.</li>
                </ul>
              </section>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: OWNERSHIP & LEGAL NOTICE */}
          {/* ======================================================== */}
          {activeTab === 'ownership' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800/60 flex items-start gap-3">
                <Building className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-sm mb-1">
                    Corporate Ownership &amp; Intellectual Property Notice
                  </h4>
                  <p className="text-[11px] text-purple-200/90">
                    Official declaration of entity ownership, trademark rights, anti-cloning protections, and IP reporting under{' '}
                    <strong>{LEGAL_ENTITY.companyName}</strong>.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Store className="w-4 h-4 text-[#28a745]" />
                  <span>{LEGAL_ENTITY.trademarkName} Brand &amp; Operations Statement</span>
                </div>
                <p className="text-xs text-slate-300">
                  <strong>{LEGAL_ENTITY.trademarkName}</strong> is a proprietary enterprise retail management, point-of-sale,
                  and cloud synchronization software solution engineered, owned, and operated exclusively by{' '}
                  <strong>{LEGAL_ENTITY.companyName}</strong>.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[11px]">
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] font-semibold">Operating Entity &amp; IP Owner</span>
                    <strong className="text-white">{LEGAL_ENTITY.companyName}</strong>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] font-semibold">Protected Brand &amp; Platform</span>
                    <strong className="text-white">{LEGAL_ENTITY.trademarkName} Point of Sale Platform</strong>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] font-semibold">Governing Law &amp; Jurisdiction</span>
                    <strong className="text-white">{LEGAL_ENTITY.governingLaw}</strong>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] font-semibold">Legal, IP &amp; Takedown Contact</span>
                    <strong className="text-white">{LEGAL_ENTITY.legalEmail}</strong>
                  </div>
                </div>
              </div>

              {OWNERSHIP_IP_SECTIONS.map((section) => (
                <section key={section.number} className="space-y-2 pb-4 border-b border-slate-800/80 last:border-b-0">
                  <h5 className="text-sm font-bold text-white flex items-center gap-2">
                    <Scale className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>
                      {section.number}. {section.title}
                    </span>
                  </h5>
                  {section.paragraphs.map((para, pIdx) => (
                    <p key={pIdx} className="text-slate-300">
                      {para}
                    </p>
                  ))}
                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="list-disc pl-5 space-y-1 text-slate-300">
                      {section.bullets.map((b, bIdx) => (
                        <li key={bIdx}>{b.text}</li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: FREQUENTLY ASKED QUESTIONS (FAQ) */}
          {/* ======================================================== */}
          {activeTab === 'faq' && (
            <div className="space-y-4 animate-fade-in">
              {/* FAQ Search and Filter Controls */}
              <div className="space-y-2.5 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={faqSearchQuery}
                    onChange={(e) => setFaqSearchQuery(e.target.value)}
                    placeholder="Search questions (e.g. pricing, eTIMS, Paystack, M-Pesa, shifts, offline)..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  {faqSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setFaqSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-[10px] font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* FAQ Accordion List */}
              <div className="space-y-2.5">
                {filteredFaqs.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No questions found matching your search. Try another keyword or browse all categories.
                  </div>
                ) : (
                  filteredFaqs.map((faq) => {
                    const isExpanded = expandedFaqId === faq.id;
                    return (
                      <div
                        key={faq.id}
                        className={`rounded-xl border transition-all ${
                          isExpanded
                            ? 'bg-slate-950 border-blue-500/40 shadow-md'
                            : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                          className="w-full px-4 py-3.5 flex items-center justify-between text-left gap-3 cursor-pointer"
                        >
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
                              {faq.category}
                            </span>
                            <span className="font-bold text-white text-xs sm:text-sm">{faq.question}</span>
                          </div>
                          <div className="p-1 rounded-lg bg-slate-900 text-slate-400 shrink-0">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 pt-1 text-slate-300 text-xs border-t border-slate-800/80 leading-relaxed">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-950/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-[11px]">
            <Building className="w-3.5 h-3.5 text-blue-400" />
            <span>SokoPoS is owned and operated by <strong>Sokoplus Horizon</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>Print Page</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer shadow-xs"
            >
              Close Hub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
