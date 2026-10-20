export interface SitemapEntry {
  path: string;
  fullUrl?: string;
  title: string;
  category: 'public_landing' | 'legal_compliance' | 'pos_operational' | 'system_endpoints';
  priority: number; // 0.1 to 1.0
  changeFreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  authRequired: boolean;
  robotsDirective: 'index, follow' | 'noindex, follow' | 'noindex, nofollow';
  description: string;
  targetRole?: string;
}

export const SYSTEM_SITEMAP_ENTRIES: SitemapEntry[] = [
  // 1. Public Search-Indexed Landing Pages
  {
    path: '/',
    title: 'SokoPoS Point of Sale – Home & Feature Showcase',
    category: 'public_landing',
    priority: 1.0,
    changeFreq: 'daily',
    authRequired: false,
    robotsDirective: 'index, follow',
    description: 'High-velocity Point of Sale landing page for Kenyan retailers, supermarkets, and pharmacies with live demo launcher.',
  },
  {
    path: '/#industry-solutions',
    title: 'Industry Solutions Switcher (Supermarkets, Bars, Liquor, Agrovets)',
    category: 'public_landing',
    priority: 0.9,
    changeFreq: 'weekly',
    authRequired: false,
    robotsDirective: 'index, follow',
    description: 'Specialized POS workflows tailored for FMCG supermarkets, bars, liquor stores, and agrovet chemists.',
  },
  {
    path: '/#kenya-payments',
    title: 'Kenyan Payments & KRA eTIMS Tax Compliance',
    category: 'public_landing',
    priority: 0.9,
    changeFreq: 'weekly',
    authRequired: false,
    robotsDirective: 'index, follow',
    description: 'Safaricom M-Pesa STK Push, Dynamic QR codes, Buy Goods, and KRA eTIMS 16% VAT invoicing.',
  },
  {
    path: '/#hardware-guide',
    title: 'Hardware Compatibility Freedom Guide',
    category: 'public_landing',
    priority: 0.8,
    changeFreq: 'weekly',
    authRequired: false,
    robotsDirective: 'index, follow',
    description: 'ESC/POS 58mm/80mm thermal receipt printers, RJ11/RJ12 cash drawers, and USB/Bluetooth barcode scanners.',
  },
  {
    path: '/#pricing-comparison',
    title: 'Pricing & Transparent Commercial Tiers',
    category: 'public_landing',
    priority: 0.8,
    changeFreq: 'weekly',
    authRequired: false,
    robotsDirective: 'index, follow',
    description: 'Starter, Standard, and Enterprise cloud pricing with ROI savings calculator.',
  },

  // 2. Legal & Merchant Compliance Pages
  {
    path: '/terms',
    title: 'Terms of Service & Merchant SLAs',
    category: 'legal_compliance',
    priority: 0.7,
    changeFreq: 'monthly',
    authRequired: false,
    robotsDirective: 'index, follow',
    description: 'Platform service level agreements, acceptable usage policies, and merchant licensing terms.',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy & Kenya Data Protection Act Compliance',
    category: 'legal_compliance',
    priority: 0.7,
    changeFreq: 'monthly',
    authRequired: false,
    robotsDirective: 'index, follow',
    description: 'Customer data privacy protocols, local data residency, encryption standards, and POPIA alignment.',
  },
  {
    path: '/faq',
    title: 'Frequently Asked Questions & Support Knowledgebase',
    category: 'legal_compliance',
    priority: 0.8,
    changeFreq: 'weekly',
    authRequired: false,
    robotsDirective: 'index, follow',
    description: 'Comprehensive answers to common hardware, M-Pesa, offline sync, and licensing questions.',
  },
  {
    path: '/ownership',
    title: 'Legal Notice, Intellectual Property & Architecture',
    category: 'legal_compliance',
    priority: 0.6,
    changeFreq: 'monthly',
    authRequired: false,
    robotsDirective: 'index, follow',
    description: 'Proprietary IP declarations, offline synchronization algorithms, and software authorship.',
  },

  // 3. Operational POS Terminal Views (Protected Session Routing)
  {
    path: '/pos',
    title: 'POS Terminal Master Workspace',
    category: 'pos_operational',
    priority: 0.8,
    changeFreq: 'always',
    authRequired: true,
    robotsDirective: 'noindex, follow',
    description: 'Authenticated cashier point of sale terminal workspace.',
    targetRole: 'All authenticated staff',
  },
  {
    path: '/pos?tab=register',
    title: 'Register Station & Barcode Checkout',
    category: 'pos_operational',
    priority: 0.7,
    changeFreq: 'always',
    authRequired: true,
    robotsDirective: 'noindex, follow',
    description: 'High-speed keyboard wedge barcode scanning, cart management, and split tender checkout.',
    targetRole: 'Cashiers & Store Operators',
  },
  {
    path: '/pos?tab=inventory',
    title: 'Inventory Catalog & Stock Control Center',
    category: 'pos_operational',
    priority: 0.7,
    changeFreq: 'daily',
    authRequired: true,
    robotsDirective: 'noindex, follow',
    description: 'Item master catalog, low stock alerts, stocktake audits, and AI package vision ingestion.',
    targetRole: 'Managers & Inventory Clerks',
  },
  {
    path: '/pos?tab=shifts',
    title: 'Shift Sessions & Cash Drawer Float Management',
    category: 'pos_operational',
    priority: 0.6,
    changeFreq: 'daily',
    authRequired: true,
    robotsDirective: 'noindex, follow',
    description: 'Opening float declaration, cash drops, counted drawer reconciliation, and shift handovers.',
    targetRole: 'Cashiers & Supervisors',
  },
  {
    path: '/pos?tab=reports',
    title: 'Thermal Z-Reports & Comprehensive Shift Audits',
    category: 'pos_operational',
    priority: 0.6,
    changeFreq: 'daily',
    authRequired: true,
    robotsDirective: 'noindex, follow',
    description: 'ESC/POS 80mm thermal receipt audits, payment breakdown summaries, and PDF export reports.',
    targetRole: 'Supervisors & Business Owners',
  },
  {
    path: '/pos?tab=analytics',
    title: 'Real-Time Financial & Gross Margin Analytics',
    category: 'pos_operational',
    priority: 0.6,
    changeFreq: 'daily',
    authRequired: true,
    robotsDirective: 'noindex, follow',
    description: 'Hourly sales velocity, profit margin calculations, top revenue items, and sales graphs.',
    targetRole: 'Store Owners & Executives',
  },
  {
    path: '/pos?tab=suppliers',
    title: 'Supplier Purchase Orders & Vendor Ledgers',
    category: 'pos_operational',
    priority: 0.5,
    changeFreq: 'weekly',
    authRequired: true,
    robotsDirective: 'noindex, follow',
    description: 'Vendor contact directory, purchase order receipts, and outstanding invoice tracking.',
    targetRole: 'Procurement & Store Managers',
  },
  {
    path: '/pos?tab=customers',
    title: 'Customer CRM, Store Credit (Daftari) & Loyalty Points',
    category: 'pos_operational',
    priority: 0.6,
    changeFreq: 'daily',
    authRequired: true,
    robotsDirective: 'noindex, follow',
    description: 'Customer credit ledger, debt repayment tracking, and automated loyalty reward points.',
    targetRole: 'Cashiers & Store Managers',
  },
  {
    path: '/pos?tab=settings',
    title: 'Store Settings & Multi-Branch Location Configuration',
    category: 'pos_operational',
    priority: 0.5,
    changeFreq: 'monthly',
    authRequired: true,
    robotsDirective: 'noindex, follow',
    description: 'Tax rate preferences, receipt header notes, branch profiles, and staff PIN assignments.',
    targetRole: 'Business Owners & Super Admins',
  },
  {
    path: '/pos?tab=cloud-sync',
    title: 'Offline Vault & Cloud Sync Diagnostics',
    category: 'pos_operational',
    priority: 0.5,
    changeFreq: 'always',
    authRequired: true,
    robotsDirective: 'noindex, follow',
    description: 'Encrypted IndexedDB offline transaction queue status, Firestore connection, and manual sync.',
    targetRole: 'System Operators & Tech Staff',
  },
  {
    path: '/pos?tab=super-admin',
    title: 'Super Admin Multi-Tenant Platform Console',
    category: 'pos_operational',
    priority: 0.4,
    changeFreq: 'monthly',
    authRequired: true,
    robotsDirective: 'noindex, nofollow',
    description: 'Multi-business tenant management, white-label branding, subscription upgrades, and audit logs.',
    targetRole: 'Platform Super Administrators',
  },

  // 4. System & Search Engine Endpoints
  {
    path: '/sitemap.xml',
    title: 'Dynamic XML Search Engine Sitemap Endpoint',
    category: 'system_endpoints',
    priority: 1.0,
    changeFreq: 'daily',
    authRequired: false,
    robotsDirective: 'index, follow',
    description: 'Standard XML sitemap protocol feed consumed by Googlebot, Bingbot, and search indexers.',
  },
  {
    path: '/robots.txt',
    title: 'Search Engine Crawling Directives (robots.txt)',
    category: 'system_endpoints',
    priority: 1.0,
    changeFreq: 'weekly',
    authRequired: false,
    robotsDirective: 'index, follow',
    description: 'Authoritative crawler access rules and sitemap discovery pointers.',
  },
  {
    path: '/og-image.jpg',
    title: 'OpenGraph & Twitter Visual Share Preview Card',
    category: 'system_endpoints',
    priority: 0.8,
    changeFreq: 'monthly',
    authRequired: false,
    robotsDirective: 'index, follow',
    description: 'High-resolution 1200x675 social preview card showcasing SokoPoS hardware and M-Pesa terminal.',
  },
  {
    path: '/api/health',
    title: 'System Microservice Health Check Endpoint',
    category: 'system_endpoints',
    priority: 0.3,
    changeFreq: 'always',
    authRequired: false,
    robotsDirective: 'noindex, nofollow',
    description: 'JSON health probe reporting server status, bcrypt pin hashing, and cloud connectivity.',
  },
];

/**
 * Returns all sitemap entries mapped with full URLs based on the current origin
 */
export function getSystemPaths(origin?: string): SitemapEntry[] {
  const baseOrigin =
    origin || (typeof window !== 'undefined' ? window.location.origin : 'https://sokopos.co.ke');
  return SYSTEM_SITEMAP_ENTRIES.map((entry) => ({
    ...entry,
    fullUrl: `${baseOrigin}${entry.path}`,
  }));
}

/**
 * Generates standard XML sitemap for search engine crawlers
 */
export function generateSitemapXml(origin?: string): string {
  const baseOrigin =
    origin || (typeof window !== 'undefined' ? window.location.origin : 'https://sokopos.co.ke');
  const today = new Date().toISOString().split('T')[0];

  const publicEntries = SYSTEM_SITEMAP_ENTRIES.filter(
    (e) => !e.authRequired && e.robotsDirective.includes('index')
  );

  const urlNodes = publicEntries
    .map(
      (e) => `  <url>
    <loc>${baseOrigin}${e.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${e.changeFreq}</changefreq>
    <priority>${e.priority.toFixed(1)}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urlNodes}
</urlset>`;
}

/**
 * Generates JSON route manifest for developers and programmatic inspection
 */
export function generateSitemapJson(origin?: string) {
  const entries = getSystemPaths(origin);
  return {
    platform: 'SokoPoS Point of Sale',
    generatedAt: new Date().toISOString(),
    origin: origin || (typeof window !== 'undefined' ? window.location.origin : 'https://sokopos.co.ke'),
    totalRoutes: entries.length,
    publicIndexedRoutes: entries.filter((e) => !e.authRequired && e.robotsDirective.includes('index')).length,
    protectedOperationalRoutes: entries.filter((e) => e.authRequired).length,
    routes: entries,
  };
}
