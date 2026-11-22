export type FaqCategory =
  | 'Plans & Getting Started'
  | 'POS, Shifts & Checkout'
  | 'Inventory & Multi-Branch'
  | 'Payments & eTIMS'
  | 'Offline & Hardware'
  | 'Security, Data & Partners';

export interface FaqItem {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
}

export const FAQ_CATEGORIES: Array<'All' | FaqCategory> = [
  'All',
  'Plans & Getting Started',
  'POS, Shifts & Checkout',
  'Inventory & Multi-Branch',
  'Payments & eTIMS',
  'Offline & Hardware',
  'Security, Data & Partners',
];

export const FAQ_ITEMS: FaqItem[] = [
  // Plans & Getting Started
  {
    id: 'faq-ownership',
    category: 'Plans & Getting Started',
    question: 'Who owns and operates SokoPoS?',
    answer:
      'SokoPoS is engineered, hosted, and operated exclusively by Sokoplus Horizon. Sokoplus Horizon provides cloud infrastructure, product engineering, continuous software maintenance, customer support, and multi-tenant security operations for all SokoPoS retail platforms.',
  },
  {
    id: 'faq-pricing-plans',
    category: 'Plans & Getting Started',
    question: 'What pricing plans are available, including the Free Account?',
    answer:
      'SokoPoS offers a lifetime Free Account (KES 0/month for 1 branch, 1 login, and up to 250 products, with an optional one-time KES 1,999 1-on-1 setup and catalog onboarding session). Paid plans scale with your business: Starter at KES 599/month (KES 5,990/year), Business at KES 1,299/month (KES 12,990/year, up to 3 branches and 10 staff), and Premium at KES 2,999/month (KES 29,990/year, unlimited branches and staff). Annual plans include 2 months free.',
  },
  {
    id: 'faq-demo-sandbox',
    category: 'Plans & Getting Started',
    question: 'Can we test SokoPoS before registering a live store?',
    answer:
      'Yes. From the sign-in screen, click "Try the demo account" and enter the demo PIN (1234) to explore a pre-populated store sandbox. Demo sessions run locally in isolation so you can test checkout, inventory, reports, and shift closing without affecting live business data.',
  },
  {
    id: 'faq-retail-types',
    category: 'Plans & Getting Started',
    question: 'What types of retail businesses can use SokoPoS?',
    answer:
      'SokoPoS is built for supermarkets, minimarts, agrovets, hardware stores, wholesale depots, pharmacies, bars, wines and spirits outlets, restaurants, and multi-branch retail chains across Nairobi, Mombasa, Kisumu, Nakuru, Eldoret, and nationwide.',
  },

  // POS, Shifts & Checkout
  {
    id: 'faq-pos-register',
    category: 'POS, Shifts & Checkout',
    question: 'How does the POS register streamline daily cashier checkout?',
    answer:
      'The Register view includes a prominent top-level Quick Action Toolbar (Scan Barcode, Select Customer, Returns, Shift Till, and Pay) paired with instant search, stock status filters, category tabs, held carts, and line-item discount controls so cashiers can complete sales in seconds.',
  },
  {
    id: 'faq-shift-management',
    category: 'POS, Shifts & Checkout',
    question: 'How do Shift & Till controls help prevent cash variance?',
    answer:
      'Cashiers open an active shift session with a starting cash float before ringing up sales. Throughout the shift, teams can record cash drops and till expenses, then perform a blind or guided physical cash count at close to generate a shift reconciliation Z-report showing exact variances.',
  },
  {
    id: 'faq-returns-voids',
    category: 'POS, Shifts & Checkout',
    question: 'How are refunds, voids, and discounts authorized?',
    answer:
      'Returns and transaction voids follow a dedicated workflow from the Register toolbar or receipt history. High-impact actions such as voids, refunds, and price overrides can be restricted by role and require supervisor PIN approval, with every action captured in the audit log.',
  },
  {
    id: 'faq-receipts-sharing',
    category: 'POS, Shifts & Checkout',
    question: 'Can we print receipts and share digital slips with customers?',
    answer:
      'Yes. SokoPoS prints formatted 58mm and 80mm thermal receipts and also lets cashiers share itemized receipts directly via WhatsApp or export them as clean PDF documents.',
  },
  {
    id: 'faq-customers-loyalty',
    category: 'POS, Shifts & Checkout',
    question: 'Does SokoPoS support customer loyalty points and store credit (Daftari)?',
    answer:
      'Yes. You can attach customers directly to any cart to award and redeem loyalty points automatically, or settle purchases onto a customer Store Credit (Daftari) account with configurable credit limits and payment tracking.',
  },

  // Inventory & Multi-Branch
  {
    id: 'faq-multi-branch',
    category: 'Inventory & Multi-Branch',
    question: 'How does multi-branch stock tracking and inter-store transfer work?',
    answer:
      'Business and Premium accounts manage multiple branches from one dashboard. Stock quantities are tracked per branch in a multi-branch matrix, managers can switch active locations instantly, and stock can be moved cleanly between branches using logged Stock Transfers.',
  },
  {
    id: 'faq-ai-onboarding',
    category: 'Inventory & Multi-Branch',
    question: 'How do AI Invoice Onboarding and Package Scanning work?',
    answer:
      'Instead of typing supplier invoices manually, managers can scan paper invoices or product packages with a camera or file upload to extract item names, quantities, and unit costs automatically. In addition, scanning an unrecognized barcode opens the Quick-Check HUD so staff can onboard new items in seconds.',
  },
  {
    id: 'faq-bulk-inventory',
    category: 'Inventory & Multi-Branch',
    question: 'Can we import catalogs via CSV, edit items in bulk, and print barcode labels?',
    answer:
      'Yes. Inventory includes bulk CSV import and export, inline stock quantity steppers, a slide-over product detail drawer, multi-select bulk actions (update price, category, supplier, or delete), and printable barcode and shelf price labels.',
  },
  {
    id: 'faq-suppliers',
    category: 'Inventory & Multi-Branch',
    question: 'How are suppliers and stock deliveries managed?',
    answer:
      'The Suppliers workspace maintains your vendor directory, tracks purchase invoices and outstanding supplier balances, and updates branch inventory quantities automatically when deliveries are received.',
  },

  // Payments & eTIMS
  {
    id: 'faq-mpesa-support',
    category: 'Payments & eTIMS',
    question: 'How does M-Pesa integration work on SokoPoS?',
    answer:
      'SokoPoS supports direct M-Pesa STK Push prompts to the customer phone, dynamic customer-facing M-Pesa QR codes, Buy Goods Till numbers, Paybill accounts with reference matching, and split payments combining Cash, M-Pesa, Card, and Store Credit.',
  },
  {
    id: 'faq-paystack-subaccounts',
    category: 'Payments & eTIMS',
    question: 'How do Paystack Merchant Subaccounts and card payments work?',
    answer:
      'Merchants connect and verify their Paystack Subaccount (ACCT_...) inside Settings. Once verified, live Paystack Card and M-Pesa checkouts route 100% of transaction revenue directly to your business settlement account, with standard Paystack processing fees borne by the merchant subaccount.',
  },
  {
    id: 'faq-kra-etims',
    category: 'Payments & eTIMS',
    question: 'Does SokoPoS support KRA eTIMS invoicing and VAT reporting?',
    answer:
      'Yes. SokoPoS integrates with Digitax for automated KRA eTIMS electronic invoice transmission, receipt sequence signing, and KRA verification QR codes (with offline fallback links when needed), alongside configurable VAT/tax rules and tax summary reports.',
  },
  {
    id: 'faq-cash-rounding',
    category: 'Payments & eTIMS',
    question: 'How are cents handled during cash vs. electronic payments?',
    answer:
      'Electronic payments (M-Pesa and Card) settle exact transaction totals down to the cent. For cash tenders involving cents, SokoPoS applies Standard Half-Up rounding: KES 0.50 and above rounds up to KES 1, while below KES 0.50 rounds down to KES 0.',
  },

  // Offline & Hardware
  {
    id: 'faq-offline-capability',
    category: 'Offline & Hardware',
    question: 'What happens to checkout if our internet connection drops?',
    answer:
      'SokoPoS uses an offline-first architecture. If internet connectivity drops, cashiers can continue scanning barcodes, ringing up products, tendering cash, calculating change, and printing receipts. Offline sales are queued in an encrypted local FIFO queue and automatically sync to Google Cloud Firestore once connectivity resumes.',
  },
  {
    id: 'faq-pwa-install',
    category: 'Offline & Hardware',
    question: 'Can we install SokoPoS as a dedicated app on our POS devices?',
    answer:
      'Yes. SokoPoS is an installable Progressive Web App (PWA). You can install it directly from Chrome, Edge, or Safari onto Windows, macOS, Android tablets, and phones for full-screen app launch and cached offline availability.',
  },
  {
    id: 'faq-scanners',
    category: 'Offline & Hardware',
    question: 'Which barcode scanners are compatible with SokoPoS?',
    answer:
      'SokoPoS works out-of-the-box with any standard USB or Bluetooth barcode scanner configured in HID Keyboard Wedge mode (such as Honeywell, Zebra, Sunlux, and Netum), as well as a built-in device camera scanner for phones and tablets.',
  },
  {
    id: 'faq-printers-drawers',
    category: 'Offline & Hardware',
    question: 'What thermal receipt printers and cash drawers are supported?',
    answer:
      'SokoPoS supports 80mm (3-inch) desktop POS printers and 58mm (2-inch) Bluetooth or USB thermal printers, including silent kiosk printing. Standard RJ11/RJ12 cash drawers plug into the printer DK (Drawer Kick) port and open automatically upon completing cash sales.',
  },

  // Security, Data & Partners
  {
    id: 'faq-pin-security',
    category: 'Security, Data & Partners',
    question: 'How do cashier PINs, staff permissions (RBAC), and audit logs work?',
    answer:
      'Cashier PINs are protected using salted bcrypt hashing. Owners and managers can assign granular Role-Based Access Control (RBAC) permissions per staff member to restrict sensitive actions such as cost visibility, stock adjustments, voids, and settings changes, backed by an immutable audit trail.',
  },
  {
    id: 'faq-reports-export',
    category: 'Security, Data & Partners',
    question: 'What analytics, reports, and data exports are included?',
    answer:
      'SokoPoS includes real-time sales analytics dashboards and 15+ operational, margin, tax, shift, and stock valuation reports. Cloud storage on Google Cloud Firestore is unmetered, and administrators can export structured CSV and JSON records at any time with zero data lock-in.',
  },
  {
    id: 'faq-affiliate-program',
    category: 'Security, Data & Partners',
    question: 'How does the SokoPoS Referral & Partner Program work?',
    answer:
      'Approved partners receive a unique referral code and link with a 30-day attribution window. When referred businesses activate a qualifying paid subscription, partners earn a 20% recurring commission tracked in the Partner Portal with M-Pesa or bank payouts.',
  },
  {
    id: 'faq-multilang',
    category: 'Security, Data & Partners',
    question: 'Which languages does the SokoPoS interface support?',
    answer:
      'SokoPoS supports instant interface switching between English, Kiswahili, and Français from the header or footer language selector, helping diverse retail teams operate comfortably.',
  },
  {
    id: 'faq-gcp-compliance',
    category: 'Security, Data & Partners',
    question: 'How does SokoPoS protect merchant data and cloud compliance?',
    answer:
      'SokoPoS enforces authenticated row-level security across Google Cloud Firestore collections with zero public open-write rules, applies IP rate limiting on server and AI endpoints, aligns with the Kenya Data Protection Act 2019, and complies strictly with Google Cloud Platform Terms of Service and Acceptable Use Policy.',
  },
];
