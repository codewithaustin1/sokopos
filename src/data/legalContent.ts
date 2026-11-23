export type LegalTab = 'terms' | 'privacy' | 'compliance' | 'ownership' | 'faq';

export interface LegalClauseSection {
  number: string;
  title: string;
  paragraphs: string[];
  bullets?: { label?: string; text: string }[];
  callout?: string;
}

export const LEGAL_ENTITY = {
  companyName: 'Sokoplus Horizon',
  productName: 'SokoPoS',
  trademarkName: 'SokoPoS™',
  platformLabel: 'SokoPoS™ by Sokoplus Horizon',
  copyrightNotice: '© 2026 Sokoplus Horizon · SokoPoS™ · All rights reserved',
  supportEmail: 'support@sokoplushorizon.com',
  legalEmail: 'support@sokoplushorizon.com',
  lastRevised: 'November 2026',
  governingLaw: 'Laws of Kenya (Commercial Arbitration in Nairobi, Kenya)',
  liabilityCapLabel: 'Total fees paid in the preceding 12 months (or KES 5,000 for free/sandbox accounts)',
} as const;

export const TERMS_SECTIONS: LegalClauseSection[] = [
  {
    number: '1',
    title: 'Acceptance & Scope of Agreement',
    paragraphs: [
      'By registering a shop, creating a partner account, deploying SokoPoS™ across registers, tablets, phones, or desktop browsers, authenticating via Google Accounts or terminal staff PINs, or accessing any Sokoplus Horizon cloud console, you (“Merchant”, “Subscriber”, or “User”) enter into a legally binding agreement with Sokoplus Horizon (“Company”, “we”, “our”, “us”).',
      'If you accept these Terms on behalf of a retail business, partnership, or corporate entity, you represent that you have full legal authority to bind that entity. If you do not agree to these Terms, including the Warranty Disclaimers and Limitation of Liability below, do not register an account or operate the software.',
    ],
  },
  {
    number: '2',
    title: 'Cloud Service & Multi-Tenant Provisioning',
    paragraphs: [
      'Sokoplus Horizon provides an elastic, multi-tenant software-as-a-service (SaaS) retail platform hosted on Google Cloud infrastructure. Each merchant organization is provisioned a segregated tenant space governed by Row-Level Security rules keyed to its business identifier.',
      'We may release software updates, security patches, UI improvements, or deprecate legacy APIs from time to time to preserve system integrity and regulatory alignment.',
    ],
  },
  {
    number: '3',
    title: 'Offline Mode & Merchant Synchronization Duty',
    paragraphs: [
      'SokoPoS™ includes an offline register queue intended to keep checkout counters operating during temporary internet interruptions. Offline sales, stock adjustments, and shifts are held locally in browser IndexedDB or device storage until network connectivity resumes.',
      'Merchants must reconnect every active register to the internet at least once every seven (7) days to synchronize pending queues and preserve cloud backups. Sokoplus Horizon bears no responsibility for un-synced transactions lost due to cleared browser data, private/incognito browsing, device theft, OS resets, or hardware failure prior to confirmed cloud synchronization.',
    ],
  },
  {
    number: '4',
    title: 'Cashier PIN Security & Staff Governance',
    paragraphs: [
      'Merchants are solely responsible for creating, assigning, rotating, and revoking staff accounts, manager override privileges, and terminal PINs. Sokoplus Horizon secures terminal PINs using salted cryptographic hashing and maintains operational audit trails for refunds, voids, manual discounts, and shift cash counts.',
      'The Merchant assumes sole legal and financial responsibility for all till activity, cash shrinkage, inventory discrepancies, and unauthorized refunds executed under authorized staff credentials.',
    ],
  },
  {
    number: '5',
    title: 'Payment Integrations & Non-Custodial Role',
    paragraphs: [
      'When enabling M-Pesa STK Push, Buy Goods Till numbers, Paybill channels, Paystack, or external PDQ card terminals, the Merchant agrees to comply with telecommunications operator terms, payment processor agreements, Anti-Money Laundering (AML) laws, and Central Bank of Kenya directives.',
      'Sokoplus Horizon acts strictly as a technical software interface and is NOT a bank, licensed Payment Service Provider (PSP), money transmitter, or custodian of merchant funds. All settlement timing, transaction fees, chargebacks, and customer reversals occur strictly between the Merchant and its chosen telecom or payment provider.',
    ],
  },
  {
    number: '6',
    title: 'Merchant Data Ownership, Zero Lock-In & Feedback License',
    paragraphs: [
      'The Merchant retains 100% ownership of its shop catalog, customer credit records, supplier lists, pricing books, and transaction history (“Merchant Data”). You grant Sokoplus Horizon only a limited, non-exclusive license to host, process, transmit, and back up Merchant Data as needed to operate SokoPoS™ and perform automated security protections.',
      'You may export your business records at any time using built-in CSV and JSON export tools with zero export penalties. Any voluntary feature suggestions, bug reports, or usability feedback submitted to Sokoplus Horizon may be incorporated freely into the platform without royalty or obligation.',
    ],
  },
  {
    number: '7',
    title: 'Service Availability Target & Scheduled Maintenance',
    paragraphs: [
      'Sokoplus Horizon engineers the cloud platform toward a 99.9% monthly operational availability target backed by redundant cloud infrastructure. However, this target is an engineering goal rather than an absolute guarantee or SLA credit obligation.',
      'Temporary interruptions may occur during scheduled maintenance windows, emergency security patching, or upstream cloud, DNS, or telecommunications outages beyond our reasonable control.',
    ],
  },
  {
    number: '8',
    title: 'Disclaimer of Warranties (“AS IS” & “AS AVAILABLE”)',
    paragraphs: [
      'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SOKOPOS™ AND ALL RELATED SERVICES, INTEGRATIONS, REPORTS, HARDWARE GUIDES, AND AI FEATURES ARE PROVIDED ON AN “AS IS” AND “AS AVAILABLE” BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY.',
      'SOKOPLUS HORIZON EXPRESSLY DISCLAIMS ALL IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, UNINTERRUPTED AVAILABILITY, ERROR-FREE OPERATION, AND TAX OR REGULATORY CERTIFICATION ACCURACY.',
    ],
  },
  {
    number: '9',
    title: 'Limitation of Liability (12-Month Fee Cap)',
    paragraphs: [
      'TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL SOKOPLUS HORIZON, ITS FOUNDERS, DIRECTORS, EMPLOYEES, CONTRACTORS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES—INCLUDING LOSS OF PROFITS, REVENUE, GOODWILL, INVENTORY SHRINKAGE, UNCOLLECTED DAFTARI CREDIT, DATA LOSS, OR TAX/STATUTORY PENALTIES—ARISING OUT OF OR RELATED TO YOUR USE OF SOKOPOS™, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.',
      'SOKOPLUS HORIZON’S TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS COMBINED ARISING UNDER OR IN CONNECTION WITH THESE TERMS (WHETHER IN CONTRACT, TORT, NEGLIGENCE, OR STATUTE) SHALL NOT EXCEED THE GREATER OF: (A) THE TOTAL SUBSCRIPTION FEES ACTUALLY PAID BY THE MERCHANT TO SOKOPLUS HORIZON DURING THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM, OR (B) KES 5,000 FOR FREE OR SANDBOX ACCOUNTS.',
    ],
    callout:
      'Essential Basis of the Bargain: Platform pricing reflects this allocation of risk and the 12-month fee cap. Nothing in these Terms excludes liability that cannot lawfully be excluded under Kenyan law.',
  },
  {
    number: '10',
    title: 'Operational & Third-Party Risk Disclaimers',
    paragraphs: [
      'Merchants acknowledge and accept the following operational boundaries inherent to retail POS software and external third-party ecosystems:',
    ],
    bullets: [
      {
        label: 'KRA eTIMS & Tax Compliance Disclaimer',
        text: 'SokoPoS™ supplies electronic receipt formatting, VAT categorization (standard 16%, zero-rated, exempt), and eTIMS integration workflows solely as administrative productivity tools. Sokoplus Horizon does not provide tax, accounting, or legal advice. The Merchant bears sole responsibility for KRA taxpayer registration, verifying successful eTIMS CU/QR transmission, reconciling VAT filings, and settling any tax assessments or penalties.',
      },
      {
        label: 'M-Pesa, Paystack & Payment Rails',
        text: 'Safaricom Daraja STK Push prompts, Till/Paybill notifications, and Paystack checkouts depend on external telecommunications networks and payment gateways. Sokoplus Horizon is not liable for delayed callbacks, carrier downtime, SMS verification failures, or unauthorized mobile money reversals. Cashiers should verify settlement alerts before releasing high-value merchandise.',
      },
      {
        label: 'Offline Storage & Sync Skew',
        text: 'Extended offline usage relies on local browser storage controlled by your operating system and browser settings. Sokoplus Horizon cannot recover locally queued sales erased by browser history sweeps, storage quota eviction, damaged terminals, or multi-branch stock overselling during disconnected shifts.',
      },
      {
        label: 'Third-Party POS Hardware',
        text: 'SokoPoS™ supports standard 58mm/80mm ESC/POS thermal printers, USB/Bluetooth HID barcode scanners, and RJ11/RJ12 cash drawers on a best-effort compatibility basis. Sokoplus Horizon makes no warranty regarding third-party manufacturer firmware, OS driver updates, WebUSB/WebBluetooth browser permissions, or electrical/hardware defects.',
      },
      {
        label: 'Vision AI & Automated Extraction',
        text: 'AI-powered invoice scanning, supplier CSV mapping, and automated analytics summaries are probabilistic assistive features that may occasionally misread handwritten numbers, tax rates, or SKU names. Merchants must human-verify all extracted quantities, costs, and ledger totals prior to final confirmation.',
      },
    ],
  },
  {
    number: '11',
    title: 'Merchant Indemnification',
    paragraphs: [
      'You agree to defend, indemnify, and hold harmless Sokoplus Horizon and its officers, employees, and partners from and against any claims, regulatory fines, damages, losses, or legal fees arising from: (a) your retail business operations, inventory, or customer disputes; (b) inaccurate tax filings or non-compliance with KRA eTIMS or AML rules; (c) staff misconduct or unauthorized account sharing; or (d) your breach of these Terms or applicable law.',
    ],
  },
  {
    number: '12',
    title: 'Force Majeure, Severability & Governing Law',
    paragraphs: [
      'Sokoplus Horizon shall not be liable for any delay or failure in performance resulting from causes beyond its reasonable control, including fiber/undersea cable cuts, power grid blackouts, upstream cloud outages, telecommunications failures, regulatory mandates, pandemics, or natural disasters.',
      'If any provision of these Terms is held unenforceable, the remaining provisions remain in full force. These Terms are governed exclusively by the Laws of the Republic of Kenya, and any unresolved commercial dispute shall be referred to competent commercial arbitration seated in Nairobi, Kenya.',
    ],
  },
];

export const OWNERSHIP_IP_SECTIONS: LegalClauseSection[] = [
  {
    number: '1',
    title: 'Sole Intellectual Property Ownership',
    paragraphs: [
      'All software architecture, TypeScript/React source code, algorithms, offline synchronization protocols, Firestore security rule structures, UI/UX layouts, receipt designs, icons, trademarks (including SokoPoS™ and Sokoplus Horizon™), brand trade dress, and technical documentation are the exclusive intellectual property of Sokoplus Horizon, protected under the Copyright Act (Kenya), Trademarks Act (Kenya), Industrial Property Act, and international IP treaties.',
      'Your subscription grants a limited, non-exclusive, non-transferable, revocable license to access and operate SokoPoS™ for your internal retail or authorized partner activities during an active subscription term. No title or ownership rights in the platform software transfer to any user.',
    ],
  },
  {
    number: '2',
    title: 'Anti-Cloning, Anti-Scraping & Reverse-Engineering Prohibitions',
    paragraphs: [
      'Except where expressly permitted by mandatory law, no merchant, partner, competitor, or visitor may directly or indirectly:',
    ],
    bullets: [
      {
        text: 'Copy, clone, mirror, frame, white-label, resell, or sub-license SokoPoS™ interfaces, workflows, pricing calculators, or documentation without a signed enterprise reseller agreement from Sokoplus Horizon.',
      },
      {
        text: 'Decompile, disassemble, reverse-engineer, bypass authentication/rate limits, or attempt to extract underlying source code, prompts, or security logic.',
      },
      {
        text: 'Deploy automated scrapers, bots, crawlers, or harvesting scripts against SokoPoS™ pages or APIs, or use any SokoPoS™ content, UI screenshots, or outputs to train third-party machine-learning or AI models.',
      },
    ],
  },
  {
    number: '3',
    title: 'Trademarks, Third-Party Marks & Brand Attribution',
    paragraphs: [
      '“Sokoplus Horizon”, “SokoPoS”, and associated logos are proprietary marks of Sokoplus Horizon. Unauthorized registration of confusingly similar domain names, social handles, WhatsApp business profiles, or app listings impersonating SokoPoS™ is strictly prohibited.',
      'Third-party names referenced for hardware or payment interoperability—including Safaricom M-Pesa®, KRA eTIMS®, Paystack®, Google Cloud®, and hardware OEM brands—remain the trademarks of their respective owners and do not imply endorsement or joint venture unless expressly stated.',
    ],
  },
  {
    number: '4',
    title: 'IP Infringement Notices & Governing Jurisdiction',
    paragraphs: [
      'To report suspected copyright infringement, unauthorized brand impersonation, or counterfeit SokoPoS™ distributions—or to request written brand press/partner usage permission—send a detailed written notice to support@sokoplushorizon.com with subject line “IP & Legal Notice — SokoPoS”.',
      'All intellectual property rights and brand enforcement actions are governed by the Laws of Kenya, with competent arbitration and judicial jurisdiction in Nairobi, Kenya.',
    ],
  },
];

export const PRIVACY_SECTIONS: LegalClauseSection[] = [
  {
    number: '1',
    title: 'Information Collected and Processed',
    paragraphs: [
      'To deliver point-of-sale execution, multi-branch stock synchronization, eTIMS formatting, and audit reporting, Sokoplus Horizon processes:',
    ],
    bullets: [
      {
        label: 'Merchant Credentials',
        text: 'Business name, tax registration / KRA PIN numbers, branch addresses, and verified owner contact emails.',
      },
      {
        label: 'Staff Records',
        text: 'Cashier display names, role permissions, and one-way salted bcrypt hashed PINs.',
      },
      {
        label: 'Transaction Details',
        text: 'Items sold, quantities, totals, VAT breakdowns, shift timestamps, and payment modes.',
      },
      {
        label: 'Payment Identifiers',
        text: 'M-Pesa phone numbers (solely for STK Push delivery and receipt matching) and gateway reference codes (e.g. QKJ4...). We never store credit card CVVs or M-Pesa secret PINs.',
      },
    ],
  },
  {
    number: '2',
    title: 'Strict No-Sale Policy',
    paragraphs: [
      'Sokoplus Horizon does NOT sell, rent, or trade your retail business data, supplier contacts, customer lists, or sales volumes to third-party data brokers, marketers, or advertisers under any circumstances. Your business data belongs strictly to you.',
    ],
  },
  {
    number: '3',
    title: 'Multi-Tenant Architecture & Row-Level Security',
    paragraphs: [
      'All cloud database operations on Google Cloud Firestore are guarded by cryptographically enforced security rules. Queries and writes are strictly scoped by your unique businessId, isolating your sales, inventory, and supplier records from every other tenant.',
    ],
  },
  {
    number: '4',
    title: 'Data Retention, Statutory Records & Right to Erasure',
    paragraphs: [
      'Transaction logs are retained in alignment with Kenya statutory tax recordkeeping periods while your account remains active. Upon closing your store account, administrative tools and support requests allow you to export your full archive and purge tenant records from active cloud storage.',
    ],
  },
];

export function hasValidBusinessLegalConsent(
  consent?: import('../types').BusinessLegalConsent | null
): boolean {
  if (!consent) return false;
  return Boolean(
    consent.termsAccepted === true &&
      consent.asIsWarrantyAcknowledged === true &&
      consent.operationalRisksAccepted === true &&
      consent.entityName === LEGAL_ENTITY.companyName &&
      typeof consent.acceptedAt === 'string' &&
      consent.acceptedAt.trim().length > 0 &&
      typeof consent.acceptedByEmail === 'string' &&
      consent.acceptedByEmail.trim().length > 0
  );
}
