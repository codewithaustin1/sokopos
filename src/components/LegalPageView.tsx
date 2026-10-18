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

interface LegalPageViewProps {
  currentTab: LegalTab;
  onTabChange: (tab: LegalTab) => void;
  onBackToLogin: () => void;
  loginBgGraphic?: string | null;
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
  {
    id: 'faq-gcp-compliance',
    category: 'Data & Security',
    question: 'How does SokoPoS comply with Google Cloud Platform Terms of Service and Acceptable Use Policy?',
    answer:
      'SokoPoS is engineered in strict compliance with Google Cloud Platform Terms of Service and Acceptable Use Policy (AUP). Database collections enforce authenticated row-level security with zero public open-write rules, eliminating risks of database abuse or automated project suspension. Server and AI endpoints enforce IP rate limiting to prevent resource exhaustion, and all data storage conforms to Google API Services User Data Policy.',
  },
];

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentTab]);

  const categories = [
    'All',
    'General & Ownership',
    'Offline & Connectivity',
    'Payments & M-Pesa',
    'Hardware & Peripherals',
    'Data & Security',
  ];

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
      icon: <FileText className="w-6 h-6 text-blue-600" />,
    },
    privacy: {
      title: 'Privacy Policy & Data Protection',
      subtitle: 'Kenya Data Protection Act 2019 & GDPR Alignment',
      icon: <Shield className="w-6 h-6 text-emerald-600" />,
    },
    faq: {
      title: 'Frequently Asked Questions (FAQ)',
      subtitle: 'Everything you need to know about SokoPoS terminal setup and operations',
      icon: <HelpCircle className="w-6 h-6 text-blue-600" />,
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
      className={`min-h-screen w-full flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white ${
        loginBgGraphic ? 'bg-slate-950/70 backdrop-blur-md' : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-800 bg-slate-950/95 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            id="back-to-terminal-btn"
            onClick={onBackToLogin}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-bold border border-slate-700/80 transition cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Back to POS Terminal</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div className="h-5 w-px bg-slate-800 hidden sm:block" />

          {/* Logo Brand */}
          <AppLogo theme="dark" size="md" onClick={onBackToLogin} />
        </div>

        {/* Secondary Header Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-800 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Print Document</span>
          </button>
        </div>
      </header>

      {/* Main Page Body */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Navigation Breadcrumb & Tab Pills */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
            <button
              type="button"
              onClick={onBackToLogin}
              className="hover:text-blue-400 transition cursor-pointer"
            >
              Home
            </button>
            <span className="text-slate-600">/</span>
            <span className="text-white font-semibold">{currentInfo.title}</span>
          </div>

          {/* Tab Selector Buttons */}
          <nav
            aria-label="Legal Sections Navigation"
            className="flex items-center gap-1.5 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800 overflow-x-auto scrollbar-none"
          >
            <button
              type="button"
              id="page-tab-terms"
              onClick={() => onTabChange('terms')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                currentTab === 'terms'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
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
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
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
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
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
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Ownership & Legal Notice</span>
            </button>

            <button
              type="button"
              id="page-tab-compliance"
              onClick={() => onTabChange('compliance')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                currentTab === 'compliance'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Cloud Compliance</span>
            </button>
          </nav>
        </div>

        {/* Page Header Card - Translucent white background with black text */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-white/60 p-6 sm:p-8 mb-8 shadow-xl text-black">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
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

            <div className="shrink-0 flex items-center gap-2">
              <span className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
                Operated by Sokoplus Horizon
              </span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: TERMS OF SERVICE */}
        {/* ======================================================== */}
        {currentTab === 'terms' && (
          <div className="space-y-6">
            {/* Overview Card */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 p-6 shadow-md text-black">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-black text-base text-black mb-1">
                    SokoPoS Commercial Software License & Terms of Service
                  </h2>
                  <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                    Last Revised: January 2026. SokoPoS is an enterprise retail point-of-sale and business
                    management platform engineered, wholly owned, and operated by <strong>Sokoplus Horizon</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Document Content Sections */}
            <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white/60 p-6 sm:p-8 shadow-xl text-black space-y-7 text-xs leading-relaxed">
              <section className="space-y-2.5">
                <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-black inline-flex items-center justify-center text-xs font-mono font-bold">
                    1
                  </span>
                  Acceptance & Scope of Agreement
                </h3>
                <p className="text-neutral-700">
                  By accessing, deploying, or utilizing SokoPoS across your registers, tablets, phones, or computers,
                  authenticating via Google Accounts or terminal staff PINs, or accessing the cloud management console,
                  you (“Merchant”, “Subscriber”) enter into a binding agreement with <strong>Sokoplus Horizon</strong> (“Company”, “we”, “our”).
                  If you do not agree to these terms, you may not provision business accounts or operate the software.
                </p>
              </section>

              <hr className="border-neutral-200" />

              <section className="space-y-2.5">
                <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-black inline-flex items-center justify-center text-xs font-mono font-bold">
                    2
                  </span>
                  Cloud Service & Multi-Tenant Provisioning
                </h3>
                <p className="text-neutral-700">
                  Sokoplus Horizon provides an elastic, multi-tenant cloud service hosted on redundant Google Cloud infrastructure.
                  Each store entity is assigned a secure tenant space segregated via cryptographic Row-Level Security.
                  Subscribers receive continuous software improvements, automatic database backups, and access to cloud sync services.
                </p>
              </section>

              <hr className="border-neutral-200" />

              <section className="space-y-2.5">
                <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-black inline-flex items-center justify-center text-xs font-mono font-bold">
                    3
                  </span>
                  Offline Mode & Merchant Synchronization Duty
                </h3>
                <p className="text-neutral-700">
                  SokoPoS includes autonomous offline registers designed to safeguard store revenues during internet disruptions.
                  Merchants acknowledge that offline transactions remain localized in terminal browser storage until an active
                  network connection is re-established. Merchants must reconnect registers to the internet at least once every
                  7 days to synchronize transaction queues, prevent inventory skew, and preserve audit histories.
                </p>
              </section>

              <hr className="border-neutral-200" />

              <section className="space-y-2.5">
                <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-black inline-flex items-center justify-center text-xs font-mono font-bold">
                    4
                  </span>
                  Cashier PIN Security & Staff Governance
                </h3>
                <p className="text-neutral-700">
                  Merchants are solely responsible for assigning and revoking staff PINs and maintaining manager overrides.
                  Sokoplus Horizon secures PINs using salted cryptographic hashing (bcrypt) and maintains immutable audit logs
                  for refunds, manual discounts, and price adjustments. The Merchant assumes responsibility for all sales operations
                  executed under authorized staff profiles.
                </p>
              </section>

              <hr className="border-neutral-200" />

              <section className="space-y-2.5">
                <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-black inline-flex items-center justify-center text-xs font-mono font-bold">
                    5
                  </span>
                  Payment Integrations & Financial Compliance
                </h3>
                <p className="text-neutral-700">
                  When utilizing M-Pesa STK Push, Till numbers, Paybill channels, or external card payment terminals, the Merchant
                  agrees to comply with telecommunications carrier rules, Anti-Money Laundering (AML) standards, and applicable
                  central bank directives. Sokoplus Horizon facilitates technological integration and verification but is not
                  a banking institution or custodian of merchant funds.
                </p>
              </section>

              <hr className="border-neutral-200" />

              <section className="space-y-2.5">
                <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-black inline-flex items-center justify-center text-xs font-mono font-bold">
                    6
                  </span>
                  Data Ownership & Zero Lock-In
                </h3>
                <p className="text-neutral-700">
                  The Merchant retains 100% legal ownership of their customer records, product catalogs, sales receipts, and price books.
                  Sokoplus Horizon provides on-demand data export tools (JSON and CSV) allowing merchants to export their entire store
                  history at any time with no export penalties or transfer restrictions.
                </p>
              </section>

              <hr className="border-neutral-200" />

              <section className="space-y-2.5">
                <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-black inline-flex items-center justify-center text-xs font-mono font-bold">
                    7
                  </span>
                  Service Level Commitment & Uptime Guarantee
                </h3>
                <p className="text-neutral-700">
                  Sokoplus Horizon targets a 99.9% cloud operational availability backed by Google Cloud Platform’s enterprise
                  infrastructure. Scheduled maintenance windows are communicated in advance. Autonomous offline registers
                  remain capable of processing cash sales, printing receipts, and ringing inventory even during cloud maintenance.
                </p>
              </section>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: PRIVACY POLICY */}
        {/* ======================================================== */}
        {currentTab === 'privacy' && (
          <div className="space-y-6">
            {/* Overview Card */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 p-6 shadow-md text-black">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-black text-base text-black mb-1">
                    SokoPoS Privacy & Data Protection Commitment
                  </h2>
                  <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                    Operated by <strong>Sokoplus Horizon</strong>. We adhere strictly to the Kenya Data Protection Act 2019,
                    General Data Protection Regulation (GDPR) standards, multi-tenant cryptographic isolation, and zero third-party data monetization.
                  </p>
                </div>
              </div>
            </div>

            {/* Document Content Sections */}
            <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white/60 p-6 sm:p-8 shadow-xl text-black space-y-7 text-xs leading-relaxed">
              <section className="space-y-2.5">
                <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  1. Information Collected and Processed
                </h3>
                <p className="text-neutral-700">
                  To provide point-of-sale functionality, inventory sync, and sales reporting, Sokoplus Horizon processes:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-neutral-700">
                  <li>
                    <strong>Merchant Credentials:</strong> Business name, tax registration/PIN numbers, location addresses, and owner contact emails.
                  </li>
                  <li>
                    <strong>Staff Records:</strong> Cashier display names, role permissions, and one-way bcrypt hashed PINs.
                  </li>
                  <li>
                    <strong>Transaction Details:</strong> Items purchased, total prices, tax breakdowns, timestamps, and payment modes.
                  </li>
                  <li>
                    <strong>Payment Identifiers:</strong> M-Pesa phone numbers (solely for STK Push prompt delivery) and transaction reference codes (e.g. QKJ4...). We never store customer credit card CVVs or M-Pesa secret PINs.
                  </li>
                </ul>
              </section>

              <hr className="border-neutral-200" />

              <section className="space-y-2.5">
                <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  2. Strict No-Sale Policy
                </h3>
                <p className="text-neutral-700 font-medium">
                  Sokoplus Horizon does NOT sell, rent, or trade your retail business data, customer lists,
                  or transaction volumes to third-party data brokers, marketers, or advertisers under any circumstances.
                  Your business data belongs strictly to you.
                </p>
              </section>

              <hr className="border-neutral-200" />

              <section className="space-y-2.5">
                <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  3. Multi-Tenant Architecture & Row-Level Security
                </h3>
                <p className="text-neutral-700">
                  All database operations on Google Cloud Firestore are protected by cryptographically enforced security rules.
                  Every query is strictly bounded by your unique <code className="bg-slate-200 text-blue-700 px-1.5 py-0.5 rounded font-mono">businessId</code>,
                  guaranteeing that no other business or tenant on SokoPoS can access, view, or modify your sales records.
                </p>
              </section>

              <hr className="border-neutral-200" />

              <section className="space-y-2.5">
                <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-600" />
                  4. Data Retention & Right to Erasure
                </h3>
                <p className="text-neutral-700">
                  Transaction histories are retained in compliance with statutory tax retention guidelines. Should you choose to
                  close your account, our administrative tools allow you to purge sales records (with automated backup archives)
                  or request complete tenant deletion from our servers.
                </p>
              </section>
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
                  placeholder="Search questions (e.g. offline, M-Pesa, barcode, cash drawer, receipt printer)..."
                  className="w-full pl-10 pr-16 py-2.5 bg-neutral-100 border border-neutral-300 rounded-xl text-xs text-black placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition"
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
                        ? 'bg-blue-600 text-white shadow-xs'
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
                  No questions found matching your search. Try searching for &ldquo;offline&rdquo;, &ldquo;M-Pesa&rdquo;, or &ldquo;printer&rdquo;.
                </div>
              ) : (
                filteredFaqs.map((faq) => {
                  const isExpanded = expandedFaqId === faq.id;
                  return (
                    <div
                      key={faq.id}
                      className={`bg-white/90 backdrop-blur-md rounded-2xl border transition-all overflow-hidden ${
                        isExpanded
                          ? 'border-blue-500/60 shadow-lg'
                          : 'border-white/60 hover:border-neutral-300 shadow-sm'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                        className="w-full px-5 py-4 flex items-center justify-between text-left gap-4 cursor-pointer"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
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
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-white/60 p-6 shadow-md text-black">
              <div className="flex items-start gap-3">
                <Building className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-black text-base text-black mb-1">
                    Corporate Ownership & Intellectual Property Notice
                  </h2>
                  <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                    Official declaration of entity ownership, intellectual property rights, and platform governance.
                  </p>
                </div>
              </div>
            </div>

            {/* Corporate Entity Grid */}
            <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white/60 p-6 sm:p-8 shadow-xl text-black space-y-6 text-xs leading-relaxed">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-black font-black text-sm sm:text-base">
                  <Store className="w-5 h-5 text-blue-600" />
                  <span>SokoPoS Brand & Operations Statement</span>
                </div>
                <p className="text-neutral-700">
                  <strong>SokoPoS</strong> is a proprietary enterprise retail management, point-of-sale, and cloud synchronization
                  software solution developed, owned, and operated exclusively by <strong>Sokoplus Horizon</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="p-4 bg-neutral-100 rounded-xl border border-neutral-200">
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">Operating Entity</span>
                  <strong className="text-black text-sm">Sokoplus Horizon</strong>
                </div>
                <div className="p-4 bg-neutral-100 rounded-xl border border-neutral-200">
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">Platform Product</span>
                  <strong className="text-black text-sm">SokoPoS Enterprise Platform</strong>
                </div>
                <div className="p-4 bg-neutral-100 rounded-xl border border-neutral-200">
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">Technical Operations</span>
                  <strong className="text-black text-sm">Cloud Architecture & Retail Systems</strong>
                </div>
                <div className="p-4 bg-neutral-100 rounded-xl border border-neutral-200">
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">Inquiries & Support</span>
                  <strong className="text-black text-sm">support@sokoplushorizon.com</strong>
                </div>
              </div>

              <hr className="border-neutral-200" />

              <section className="space-y-2.5">
                <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2">
                  <Scale className="w-4 h-4 text-purple-600" />
                  Intellectual Property & Trademarks
                </h3>
                <p className="text-neutral-700">
                  All source code, algorithms, offline synchronization protocols, UI visual assets, logos, and technical documentation
                  comprising SokoPoS are the exclusive intellectual property of <strong>Sokoplus Horizon</strong>. Unauthorized copying,
                  reverse engineering, decompilation, or sub-licensing without written authorization is strictly prohibited.
                </p>
              </section>

              <hr className="border-neutral-200" />

              <section className="space-y-2.5">
                <h3 className="text-sm sm:text-base font-black text-black flex items-center gap-2">
                  <Building className="w-4 h-4 text-purple-600" />
                  Governing Law & Legal Jurisdiction
                </h3>
                <p className="text-neutral-700">
                  These agreements and operations are governed by the Laws of Kenya, in harmony with international digital commerce
                  standards and cloud compliance best practices. Any disputes arising out of the platform shall be submitted to
                  competent commercial arbitration in Nairobi, Kenya.
                </p>
              </section>
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
        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackToLogin}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold border border-slate-700 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-blue-400" />
            <span>Return to POS Terminal Login</span>
          </button>

          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer font-medium"
          >
            Scroll to Top ↑
          </button>
        </div>
      </main>

      {/* Footer with working navigation links */}
      <footer
        className={`px-6 py-5 border-t text-center text-xs text-slate-400 shrink-0 relative z-10 ${
          loginBgGraphic
            ? 'border-white/10 bg-slate-950/70 backdrop-blur-md'
            : 'border-slate-800/80 bg-slate-950/90'
        }`}
      >
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          {/* Copyright statement */}
          <div className="flex items-center gap-1.5 flex-wrap justify-center text-slate-400">
            <span>© 2026 SokoPoS Enterprise Platform • Sokoplus Horizon</span>
          </div>

          {/* Working Legal Navigation Links */}
          <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap justify-center font-medium">
            <button
              type="button"
              id="legal-page-footer-terms-btn"
              onClick={() => onTabChange('terms')}
              className={`transition cursor-pointer ${
                currentTab === 'terms' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-blue-400'
              }`}
            >
              Terms of Service
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              id="legal-page-footer-privacy-btn"
              onClick={() => onTabChange('privacy')}
              className={`transition cursor-pointer ${
                currentTab === 'privacy' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-blue-400'
              }`}
            >
              Privacy Policy
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              id="legal-page-footer-faq-btn"
              onClick={() => onTabChange('faq')}
              className={`transition cursor-pointer ${
                currentTab === 'faq' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-blue-400'
              }`}
            >
              FAQ
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              id="legal-page-footer-legal-notice-btn"
              onClick={() => onTabChange('ownership')}
              className={`transition cursor-pointer ${
                currentTab === 'ownership' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-blue-400'
              }`}
            >
              Legal & IP
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
