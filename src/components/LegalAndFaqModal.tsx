import React, { useState, useMemo } from 'react';
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
  Smartphone,
  WifiOff,
  Database,
  ArrowRight,
  Store,
} from 'lucide-react';

export type LegalTab = 'terms' | 'privacy' | 'faq' | 'ownership';

interface LegalAndFaqModalProps {
  isOpen: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
}

interface FaqItem {
  id: string;
  category: 'General & Ownership' | 'Offline & Connectivity' | 'Payments & M-Pesa' | 'Hardware & Peripherals' | 'Data & Security';
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-ownership',
    category: 'General & Ownership',
    question: 'Who owns and operates SokoPoS?',
    answer:
      'SokoPoS is engineered, hosted, and operated exclusively by Sokoplus Horizon. Sokoplus Horizon provides cloud infrastructure, product engineering, continuous software maintenance, customer support, and multi-tenant security operations for all SokoPoS retail platforms.',
  },
  {
    id: 'faq-retail-types',
    category: 'General & Ownership',
    question: 'What types of retail businesses can use SokoPoS?',
    answer:
      'SokoPoS is designed for supermarkets, convenience stores, electronics outlets, fashion boutiques, agro-dealers, pharmacies, hardware shops, wholesale distribution depots, and multi-branch retail enterprises across East Africa and beyond.',
  },
  {
    id: 'faq-multi-branch',
    category: 'General & Ownership',
    question: 'How does multi-store and branch management work?',
    answer:
      'A single business account can manage multiple store locations, distribution centers, or branches. Inventory levels are tracked per location, and sales analytics can be viewed per branch or aggregated across your entire retail chain in real-time.',
  },
  {
    id: 'faq-offline-capability',
    category: 'Offline & Connectivity',
    question: 'What happens to checkout if our internet connection drops?',
    answer:
      'SokoPoS is built on an offline-first architecture. If your internet disconnects, the register terminal continues operating without interruption. Cashiers can scan barcodes, ring up products, tender cash, apply discounts, calculate change, and print thermal slips completely offline.',
  },
  {
    id: 'faq-offline-sync',
    category: 'Offline & Connectivity',
    question: 'How do offline transactions sync back to the cloud?',
    answer:
      'Every sale made while offline is automatically placed in an encrypted local FIFO queue. The moment an active network connection (Wi-Fi or mobile data) is detected, SokoPoS flushes the queue to Google Cloud Firestore in the background without cashier intervention.',
  },
  {
    id: 'faq-mpesa-support',
    category: 'Payments & M-Pesa',
    question: 'How does M-Pesa integration work on SokoPoS?',
    answer:
      'SokoPoS supports multiple M-Pesa payment workflows: direct STK Push (where the customer receives an automatic prompt on their phone to enter their M-Pesa PIN), dynamic customer-facing QR codes, Buy Goods Till numbers, and Paybill accounts with account reference matching.',
  },
  {
    id: 'faq-cash-rounding',
    category: 'Payments & M-Pesa',
    question: 'How are cents handled during cash vs. electronic payments?',
    answer:
      'Electronic payments (M-Pesa and Card terminals) settle exact transaction amounts down to the cent. For cash payments involving cents, SokoPoS applies Standard Half-Up rounding: KES 0.50 and above rounds up to KES 1, while below KES 0.50 rounds down to KES 0.',
  },
  {
    id: 'faq-scanners',
    category: 'Hardware & Peripherals',
    question: 'Which barcode scanners are compatible with SokoPoS?',
    answer:
      'SokoPoS works out-of-the-box with any standard USB or Bluetooth handheld or desktop barcode scanner configured in HID Keyboard Wedge mode (e.g. Honeywell, Zebra, Sunlux, Netum). SokoPoS also includes a built-in camera barcode scanner for mobile phones and tablets.',
  },
  {
    id: 'faq-cash-drawers',
    category: 'Hardware & Peripherals',
    question: 'Is SokoPoS compatible with RJ11/RJ12 cash drawers?',
    answer:
      'Yes. Standard RJ11/RJ12 cash drawers plug directly into the DK (Drawer Kick) port of your thermal receipt printer. When configured in your printer driver or browser kiosk printing mode, the drawer kicks open automatically upon completing a cash sale.',
  },
  {
    id: 'faq-printers',
    category: 'Hardware & Peripherals',
    question: 'What thermal receipt printers are supported?',
    answer:
      'SokoPoS supports both 80mm (3-inch) standard commercial POS printers and 58mm (2-inch) mini mobile thermal printers via USB, Bluetooth, or LAN. You can enable automatic receipt printing and silent kiosk printing (--kiosk-printing) for zero-click instant slips.',
  },
  {
    id: 'faq-storage-limits',
    category: 'Data & Security',
    question: 'How much cloud storage space does each business account get?',
    answer:
      'Storage is unmetered and elastic with no artificial limits on inventory SKUs, transaction histories, or customer records. Data is stored across redundant Google Cloud Firestore instances with multi-zone replication.',
  },
  {
    id: 'faq-data-export',
    category: 'Data & Security',
    question: 'Can I export my sales and inventory data for accounting?',
    answer:
      'Yes. Business administrators can download complete structured JSON archives and sales backups directly from the system at any time for Excel, QuickBooks, or tax authority compliance with zero data lock-in.',
  },
  {
    id: 'faq-pin-security',
    category: 'Data & Security',
    question: 'How does cashier PIN authentication work?',
    answer:
      'Cashier PINs are protected with industry-standard salted bcrypt hashing. Managers can enforce role-based access control (RBAC), and high-impact actions like refunds or discounts are recorded with an immutable audit log.',
  },
];

export const LegalAndFaqModal: React.FC<LegalAndFaqModalProps> = ({
  isOpen,
  initialTab = 'terms',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);
  const [faqSearchQuery, setFaqSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-ownership');

  if (!isOpen) return null;

  const categories = ['All', 'General & Ownership', 'Offline & Connectivity', 'Payments & M-Pesa', 'Hardware & Peripherals', 'Data & Security'];

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
              <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/60 flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-sm mb-1">
                    SokoPoS Commercial Software License & Terms of Service
                  </h4>
                  <p className="text-[11px] text-blue-200/90">
                    Last Revised: January 2026. SokoPoS is a retail point of sale and business management platform
                    wholly owned and operated by <strong>Sokoplus Horizon</strong>.
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <h5 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 inline-flex items-center justify-center text-[10px] font-mono">1</span>
                  Acceptance & Scope of Agreement
                </h5>
                <p>
                  By deploying SokoPoS across your registers, authenticating via Google Accounts or terminal staff PINs,
                  or accessing the cloud management console, you (“Merchant”, “Subscriber”) enter into a binding
                  agreement with <strong>Sokoplus Horizon</strong> (“Company”, “we”, “our”). If you do not accept these terms,
                  you may not provision business accounts or operate the software.
                </p>
              </section>

              <section className="space-y-2">
                <h5 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 inline-flex items-center justify-center text-[10px] font-mono">2</span>
                  Cloud Service & Multi-Tenant Provisioning
                </h5>
                <p>
                  Sokoplus Horizon provides an elastic, multi-tenant cloud service backed by Google Cloud infrastructure.
                  Each store entity is assigned a secure tenant space segregated via cryptographic Row-Level Security.
                  Subscribers receive continuous software improvements, automatic database backups, and access to cloud sync services.
                </p>
              </section>

              <section className="space-y-2">
                <h5 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 inline-flex items-center justify-center text-[10px] font-mono">3</span>
                  Offline Mode & Merchant Synchronization Duty
                </h5>
                <p>
                  SokoPoS includes autonomous offline registers designed to safeguard store revenues during internet disruptions.
                  Merchants acknowledge that offline transactions remain localized in terminal browser storage until an active
                  network connection is re-established. Merchants must reconnect registers to the internet at least once every
                  7 days to synchronize transaction queues, prevent inventory skew, and preserve audit histories.
                </p>
              </section>

              <section className="space-y-2">
                <h5 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 inline-flex items-center justify-center text-[10px] font-mono">4</span>
                  Cashier PIN Security & Staff Governance
                </h5>
                <p>
                  Merchants are solely responsible for assigning and revoking staff PINs and maintaining manager overrides.
                  Sokoplus Horizon secures PINs using salted cryptographic hashing (bcrypt) and maintains immutable audit logs
                  for refunds, manual discounts, and price adjustments. The Merchant assumes responsibility for all sales operations
                  executed under authorized staff profiles.
                </p>
              </section>

              <section className="space-y-2">
                <h5 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 inline-flex items-center justify-center text-[10px] font-mono">5</span>
                  Payment Integrations & Financial Compliance
                </h5>
                <p>
                  When utilizing M-Pesa STK Push, Till numbers, Paybill channels, or external card payment terminals, the Merchant
                  agrees to comply with telecommunications carrier rules, Anti-Money Laundering (AML) standards, and applicable
                  central bank directives. Sokoplus Horizon facilitates technological integration and verification but is not
                  a banking institution or custodian of merchant funds.
                </p>
              </section>

              <section className="space-y-2">
                <h5 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 inline-flex items-center justify-center text-[10px] font-mono">6</span>
                  Data Ownership & Zero Lock-in
                </h5>
                <p>
                  The Merchant retains 100% legal ownership of their customer records, product catalogs, sales receipts, and price books.
                  Sokoplus Horizon provides on-demand data export tools (JSON and CSV) allowing merchants to export their entire store
                  history at any time with no export penalties or transfer restrictions.
                </p>
              </section>
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
                    SokoPoS Privacy & Data Protection Commitment
                  </h4>
                  <p className="text-[11px] text-emerald-200/90">
                    Operated by <strong>Sokoplus Horizon</strong>. We adhere to rigorous data privacy principles, multi-tenant
                    cryptographic isolation, and zero third-party data monetization.
                  </p>
                </div>
              </div>

              <section className="space-y-2">
                <h5 className="text-sm font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  1. Information Collected and Processed
                </h5>
                <p>
                  To provide point-of-sale functionality, inventory sync, and sales reporting, Sokoplus Horizon collects:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                  <li><strong>Merchant Credentials:</strong> Business name, tax registration/PIN numbers, location addresses, and owner contact emails.</li>
                  <li><strong>Staff Records:</strong> Cashier display names, role permissions, and one-way hashed PINs.</li>
                  <li><strong>Transaction Details:</strong> Items purchased, total prices, tax breakdowns, timestamps, and payment modes.</li>
                  <li><strong>Payment Identifiers:</strong> M-Pesa phone numbers (for STK Push prompt delivery) and transaction reference codes (e.g. QKJ4...). We never store customer credit card CVVs or M-Pesa secret PINs.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h5 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  2. Strict No-Sale Policy
                </h5>
                <p>
                  <strong>Sokoplus Horizon does NOT sell, rent, or trade your retail business data</strong>, customer lists,
                  or transaction volumes to third-party data brokers, marketers, or advertisers under any circumstances.
                  Your business data belongs strictly to you.
                </p>
              </section>

              <section className="space-y-2">
                <h5 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  3. Multi-Tenant Architecture & Row-Level Security
                </h5>
                <p>
                  All database operations on Google Cloud Firestore are protected by cryptographically enforced security rules.
                  Every query is strictly bounded by your unique <code className="bg-slate-800 text-blue-400 px-1.5 py-0.5 rounded">businessId</code>,
                  guaranteeing that no other business or tenant on SokoPoS can access, view, or modify your sales records.
                </p>
              </section>

              <section className="space-y-2">
                <h5 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  4. Data Retention & Right to Erasure
                </h5>
                <p>
                  Transaction histories are retained in compliance with statutory tax retention guidelines. Should you choose to
                  close your account, our administrative tools allow you to purge sales records (with automated backup archives)
                  or request complete tenant deletion from our servers.
                </p>
              </section>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: OWNERSHIP & LEGAL NOTICE */}
          {/* ======================================================== */}
          {activeTab === 'ownership' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800/60 flex items-start gap-3">
                <Building className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white text-sm mb-1">
                    Corporate Ownership & Intellectual Property Notice
                  </h4>
                  <p className="text-[11px] text-purple-200/90">
                    Official declaration of entity ownership, intellectual property rights, and platform governance.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Store className="w-4 h-4 text-blue-400" />
                  <span>SokoPoS Brand & Operations Statement</span>
                </div>
                <p className="text-xs text-slate-300">
                  <strong>SokoPoS</strong> is a proprietary enterprise retail management, point of sale, and cloud synchronization
                  software solution developed, owned, and operated exclusively by <strong>Sokoplus Horizon</strong>.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[11px]">
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Operating Entity</span>
                    <strong className="text-white">Sokoplus Horizon</strong>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Platform Product</span>
                    <strong className="text-white">SokoPoS Enterprise Platform</strong>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Technical Operations</span>
                    <strong className="text-white">Cloud Architecture & Retail Systems</strong>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Inquiries & Support</span>
                    <strong className="text-white">support@sokoplushorizon.com</strong>
                  </div>
                </div>
              </div>

              <section className="space-y-2">
                <h5 className="text-sm font-bold text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-purple-400" />
                  Intellectual Property & Trademarks
                </h5>
                <p>
                  All source code, algorithms, offline synchronization protocols, UI visual assets, logos, and technical documentation
                  comprising SokoPoS are the exclusive intellectual property of <strong>Sokoplus Horizon</strong>. Unauthorized copying,
                  reverse engineering, decompilation, or sub-licensing without written authorization is strictly prohibited.
                </p>
              </section>

              <section className="space-y-2">
                <h5 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-purple-400" />
                  Governing Law & Legal Jurisdiction
                </h5>
                <p>
                  These agreements and operations are governed by the Laws of Kenya, in harmony with international digital commerce
                  standards and cloud compliance best practices. Any disputes arising out of the platform shall be submitted to
                  competent commercial arbitration in Nairobi, Kenya.
                </p>
              </section>
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
                    placeholder="Search questions (e.g. offline, M-Pesa, barcode, cash drawer, storage)..."
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
