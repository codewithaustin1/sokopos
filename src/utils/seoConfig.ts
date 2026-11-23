export const CANONICAL_ORIGIN =
  (typeof process !== 'undefined' && process.env?.CANONICAL_ORIGIN?.replace(/\/+$/, '')) ||
  'https://sokopos.co.ke';

export type LegalRouteTab = 'terms' | 'privacy' | 'faq' | 'ownership' | 'compliance';

export interface RouteSeoMeta {
  path: string;
  canonicalPath: string;
  title: string;
  description: string;
  keywords: string;
  robots: 'index, follow' | 'noindex, nofollow';
  ogType: 'website' | 'article';
  breadcrumbName: string;
}

export const ROUTE_SEO_MAP: Record<string, RouteSeoMeta> = {
  '/': {
    path: '/',
    canonicalPath: '/',
    title: 'SokoPoS Kenya – M-Pesa, eTIMS & Offline Retail POS',
    description:
      'Cloud & offline POS for Kenyan supermarkets, agrovets, hardware, bars & wholesale shops. Match M-Pesa STK/Till, print eTIMS receipts & sync stock nationwide.',
    keywords:
      'point of sale kenya, pos system nairobi, mpesa pos, kra etims pos software, supermarket pos kenya, agrovet pos software, hardware store pos kenya, wines and spirits pos kenya, wholesale pos mombasa kisumu nakuru eldoret, offline pos system kenya',
    robots: 'index, follow',
    ogType: 'website',
    breadcrumbName: 'Home',
  },
  '/pricing': {
    path: '/pricing',
    canonicalPath: '/pricing',
    title: 'SokoPoS Pricing Kenya – Plans from KES 599/mo',
    description:
      'Transparent KES POS pricing for Kenyan shops: Free setup tier, Starter KES 599/mo, Business KES 1,299/mo & Premium KES 2,999/mo with M-Pesa & eTIMS built in.',
    keywords:
      'pos system price in kenya, sokopos pricing, mpesa pos subscription kes, supermarket pos software cost nairobi, affordable retail pos kenya',
    robots: 'index, follow',
    ogType: 'website',
    breadcrumbName: 'Pricing & Plans',
  },
  '/faq': {
    path: '/faq',
    canonicalPath: '/faq',
    title: 'SokoPoS Kenya FAQs – M-Pesa, eTIMS & Offline POS',
    description:
      'Get answers on Safaricom M-Pesa STK Push, KRA eTIMS 16% VAT receipts, offline selling, 58mm/80mm thermal printers, daftari credit & Kenyan branch sync.',
    keywords:
      'sokopos faq, mpesa stk push pos setup, kra etims pos requirements kenya, offline pos sync kenya, thermal printer pos nairobi',
    robots: 'index, follow',
    ogType: 'website',
    breadcrumbName: 'FAQs',
  },
  '/terms': {
    path: '/terms',
    canonicalPath: '/terms',
    title: 'Terms of Service – SokoPoS Kenya (Sokoplus Horizon)',
    description:
      'Read the SokoPoS Terms of Service by Sokoplus Horizon covering merchant accounts, KES billing, offline sync, M-Pesa & eTIMS disclaimers across Kenya.',
    keywords: 'sokopos terms of service, sokoplus horizon merchant agreement, kenya pos software terms',
    robots: 'index, follow',
    ogType: 'article',
    breadcrumbName: 'Terms of Service',
  },
  '/privacy': {
    path: '/privacy',
    canonicalPath: '/privacy',
    title: 'Privacy Policy – Kenya Data Protection | SokoPoS',
    description:
      'Learn how Sokoplus Horizon protects Kenyan retail sales records, customer credit ledgers, and M-Pesa logs under the Kenya Data Protection Act 2019.',
    keywords: 'sokopos privacy policy, kenya data protection act pos, merchant data security kenya',
    robots: 'index, follow',
    ogType: 'article',
    breadcrumbName: 'Privacy Policy',
  },
  '/ownership': {
    path: '/ownership',
    canonicalPath: '/ownership',
    title: 'Legal Notice & IP Ownership – SokoPoS Kenya',
    description:
      'Official intellectual property notice, SokoPoS™ trademark rights, and software architecture disclosures for Sokoplus Horizon retail systems in Kenya.',
    keywords: 'sokoplus horizon, sokopos trademark, sokopos legal notice kenya',
    robots: 'index, follow',
    ogType: 'article',
    breadcrumbName: 'Legal & IP Notice',
  },
  '/compliance': {
    path: '/compliance',
    canonicalPath: '/compliance',
    title: 'KRA eTIMS & Security Compliance – SokoPoS Kenya',
    description:
      'Explore SokoPoS cloud security, encryption, audit trails, and KRA eTIMS receipt verification infrastructure built for Kenyan retailers and wholesalers.',
    keywords: 'kra etims compliance pos, sokopos cloud security, retail audit trail kenya',
    robots: 'index, follow',
    ogType: 'article',
    breadcrumbName: 'Compliance & Security',
  },
  '/pos': {
    path: '/pos',
    canonicalPath: '/pos',
    title: 'SokoPoS Terminal Workspace',
    description: 'Authenticated SokoPoS point-of-sale checkout, inventory, and shift workspace.',
    keywords: 'sokopos terminal',
    robots: 'noindex, nofollow',
    ogType: 'website',
    breadcrumbName: 'POS Terminal',
  },
};

export function normalizePathname(rawPath: string): string {
  const clean = (rawPath || '/').split('?')[0].split('#')[0].trim();
  if (!clean || clean === '/') return '/';
  const collapsed = clean.replace(/\/+$/, '') || '/';
  return collapsed.toLowerCase();
}

export function resolveLegacyHashToPath(rawHash: string): string | null {
  const hash = (rawHash || '').replace(/^#/, '').toLowerCase().trim();
  if (!hash) return null;
  if (hash === 'pricing' || hash === 'plans' || hash === 'price') return '/pricing';
  if (hash === 'terms' || hash === 'tos') return '/terms';
  if (hash === 'privacy') return '/privacy';
  if (hash === 'faq' || hash === 'faqs') return '/faq';
  if (hash === 'ownership' || hash === 'legal' || hash === 'ip') return '/ownership';
  if (hash === 'compliance' || hash === 'gcp') return '/compliance';
  return null;
}

export function getLegalTabFromPath(rawPath: string): LegalRouteTab | null {
  const p = normalizePathname(rawPath);
  if (p === '/terms') return 'terms';
  if (p === '/privacy') return 'privacy';
  if (p === '/faq') return 'faq';
  if (p === '/ownership') return 'ownership';
  if (p === '/compliance') return 'compliance';
  return null;
}

export function isPublicSeoPath(rawPath: string): boolean {
  const p = normalizePathname(rawPath);
  return (
    p === '/' ||
    p === '/pricing' ||
    p === '/faq' ||
    p === '/terms' ||
    p === '/privacy' ||
    p === '/ownership' ||
    p === '/compliance' ||
    p === '/sitemap'
  );
}

export function getRouteSeoMeta(rawPath: string): RouteSeoMeta {
  const p = normalizePathname(rawPath);
  if (p.startsWith('/pos') || p.startsWith('/app') || p === '/sitemap') {
    return ROUTE_SEO_MAP['/pos'];
  }
  return ROUTE_SEO_MAP[p] || ROUTE_SEO_MAP['/'];
}

export function isCanonicalProductionHost(hostHeader?: string): boolean {
  if (!hostHeader) return false;
  const hostname = hostHeader.split(':')[0].toLowerCase().trim();
  try {
    const canonicalHostname = new URL(CANONICAL_ORIGIN).hostname.toLowerCase();
    return hostname === canonicalHostname || hostname === `www.${canonicalHostname}`;
  } catch {
    return hostname === 'sokopos.co.ke' || hostname === 'www.sokopos.co.ke';
  }
}

export function buildRouteJsonLd(rawPath: string): Record<string, unknown> {
  const meta = getRouteSeoMeta(rawPath);
  const canonicalUrl = `${CANONICAL_ORIGIN}${meta.canonicalPath === '/' ? '/' : meta.canonicalPath}`;

  const organizationNode = {
    '@type': 'Organization',
    '@id': `${CANONICAL_ORIGIN}/#organization`,
    name: 'Sokoplus Horizon',
    legalName: 'Sokoplus Horizon',
    brand: {
      '@type': 'Brand',
      name: 'SokoPoS',
    },
    url: `${CANONICAL_ORIGIN}/`,
    email: 'support@sokoplushorizon.com',
    logo: `${CANONICAL_ORIGIN}/og-image.jpg`,
    areaServed: [
      { '@type': 'Country', name: 'Kenya' },
      { '@type': 'City', name: 'Nairobi' },
      { '@type': 'City', name: 'Mombasa' },
      { '@type': 'City', name: 'Kisumu' },
      { '@type': 'City', name: 'Nakuru' },
      { '@type': 'City', name: 'Eldoret' },
    ],
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Nairobi',
      addressRegion: 'Nairobi County',
      addressCountry: 'KE',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+254-740-463021',
      email: 'support@sokoplushorizon.com',
      contactType: 'Sales and Technical Support',
      areaServed: 'KE',
      availableLanguage: ['English', 'Swahili'],
    },
  };

  const websiteNode = {
    '@type': 'WebSite',
    '@id': `${CANONICAL_ORIGIN}/#website`,
    name: 'SokoPoS Point of Sale Kenya',
    url: `${CANONICAL_ORIGIN}/`,
    inLanguage: 'en-KE',
    publisher: { '@id': `${CANONICAL_ORIGIN}/#organization` },
  };

  const breadcrumbItems: Array<Record<string, unknown>> = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: `${CANONICAL_ORIGIN}/`,
    },
  ];

  if (meta.canonicalPath !== '/' && meta.robots === 'index, follow') {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 2,
      name: meta.breadcrumbName,
      item: canonicalUrl,
    });
  } else if (meta.canonicalPath === '/') {
    breadcrumbItems.push(
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Pricing & Plans',
        item: `${CANONICAL_ORIGIN}/pricing`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Kenya FAQs',
        item: `${CANONICAL_ORIGIN}/faq`,
      }
    );
  }

  const breadcrumbNode = {
    '@type': 'BreadcrumbList',
    '@id': `${canonicalUrl}#breadcrumbs`,
    itemListElement: breadcrumbItems,
  };

  const graph: Array<Record<string, unknown>> = [websiteNode, organizationNode, breadcrumbNode];

  if (meta.canonicalPath === '/' || meta.canonicalPath === '/pricing') {
    graph.push({
      '@type': ['SoftwareApplication', 'WebApplication'],
      '@id': `${CANONICAL_ORIGIN}/#software`,
      name: 'SokoPoS Point of Sale',
      alternateName: ['SokoPoS Kenya', 'SokoPoS Retail POS', 'SokoPoS Cloud POS'],
      operatingSystem: 'Web Browser, Android, iOS, Windows, macOS, Linux',
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Point of Sale & Retail Inventory Management',
      inLanguage: 'en-KE',
      description:
        'Cloud and offline Point of Sale software built for Kenyan supermarkets, minimarts, agrovets, hardware stores, wholesale depots, bars, wines and spirits, and restaurants.',
      url: `${CANONICAL_ORIGIN}/`,
      copyrightHolder: { '@id': `${CANONICAL_ORIGIN}/#organization` },
      copyrightYear: 2026,
      creator: { '@id': `${CANONICAL_ORIGIN}/#organization` },
      publisher: { '@id': `${CANONICAL_ORIGIN}/#organization` },
      image: `${CANONICAL_ORIGIN}/og-image.jpg`,
      screenshot: `${CANONICAL_ORIGIN}/og-image.jpg`,
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'KES',
        lowPrice: '0',
        highPrice: '2999',
        offerCount: '4',
        offers: [
          {
            '@type': 'Offer',
            name: 'Free (Advisory) Account',
            price: '0',
            priceCurrency: 'KES',
            url: `${CANONICAL_ORIGIN}/pricing`,
            availability: 'https://schema.org/InStock',
          },
          {
            '@type': 'Offer',
            name: 'Starter Retail Plan',
            price: '599',
            priceCurrency: 'KES',
            url: `${CANONICAL_ORIGIN}/pricing`,
            availability: 'https://schema.org/InStock',
          },
          {
            '@type': 'Offer',
            name: 'Business Pro Plan',
            price: '1299',
            priceCurrency: 'KES',
            url: `${CANONICAL_ORIGIN}/pricing`,
            availability: 'https://schema.org/InStock',
          },
          {
            '@type': 'Offer',
            name: 'Premium Enterprise Plan',
            price: '2999',
            priceCurrency: 'KES',
            url: `${CANONICAL_ORIGIN}/pricing`,
            availability: 'https://schema.org/InStock',
          },
        ],
      },
      featureList: [
        'Safaricom M-Pesa STK Push, Till & Paybill Reconciliation',
        'KRA eTIMS Tax Compliance & Standard 16% VAT Categorization via Digitax',
        '100% Offline Cashiering with IndexedDB Sync Vault',
        '58mm & 80mm ESC/POS Thermal Receipt Printing & Cash Drawer Kickout',
        'Supermarket, Agrovet, Hardware, Wholesale & Wines & Spirits Workflows',
        'Multi-Branch Inventory Tracking & Inter-Store Stock Transfers',
        'Customer Store Credit (Daftari) Ledger with WhatsApp & SMS Receipts',
      ],
    });
  }

  if (meta.canonicalPath === '/' || meta.canonicalPath === '/faq') {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${CANONICAL_ORIGIN}/faq#faqpage`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How does M-Pesa integration work on SokoPoS?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'SokoPoS supports direct Safaricom M-Pesa STK Push, dynamic customer QR codes, Buy Goods Till numbers, and Paybill matching so every mobile payment ties directly to its till receipt.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does SokoPoS continue selling when the internet drops in Kenya?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Every sale completed offline is saved in an encrypted local queue and automatically synchronizes back to the cloud as soon as Wi-Fi or mobile data reconnects.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is SokoPoS compliant with KRA eTIMS tax invoicing?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. SokoPoS integrates KRA eTIMS receipt workflows via Digitax with 16% VAT, zero-rated and exempt item mapping, buyer PIN capture, and scannable verification QR codes.',
          },
        },
        {
          '@type': 'Question',
          name: 'Which Kenyan retail businesses and cities does SokoPoS support?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'SokoPoS serves supermarkets, minimarts, agrovets, hardware and wholesale shops, pharmacies, bars, wines and spirits outlets, and restaurants across Nairobi, Mombasa, Kisumu, Nakuru, Eldoret, and nationwide.',
          },
        },
        {
          '@type': 'Question',
          name: 'How much does SokoPoS cost per month in Kenya?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'SokoPoS offers a Free software tier (with optional KES 1,999 one-time setup advisory), Starter at KES 599/month, Business at KES 1,299/month, and Premium multi-branch at KES 2,999/month.',
          },
        },
      ],
    });
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function injectRouteSeoIntoHtml(
  html: string,
  rawPath: string,
  isProductionHost: boolean
): string {
  const meta = getRouteSeoMeta(rawPath);
  const canonicalUrl = `${CANONICAL_ORIGIN}${meta.canonicalPath === '/' ? '/' : meta.canonicalPath}`;
  const effectiveRobots = isProductionHost ? meta.robots : 'noindex, nofollow';
  const safeTitle = escapeHtmlAttr(meta.title);
  const safeDesc = escapeHtmlAttr(meta.description);
  const safeKeywords = escapeHtmlAttr(meta.keywords);
  const safeCanonical = escapeHtmlAttr(canonicalUrl);
  const jsonLdString = JSON.stringify(buildRouteJsonLd(rawPath)).replace(/<\//g, '<\\/');

  let out = html;

  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
  out = out.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${safeDesc}" />`
  );
  out = out.replace(
    /<meta\s+name="keywords"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="keywords" content="${safeKeywords}" />`
  );
  out = out.replace(
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="robots" content="${effectiveRobots}, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />`
  );
  out = out.replace(
    /<meta\s+name="googlebot"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="googlebot" content="${effectiveRobots}, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />`
  );
  out = out.replace(
    /<link\s+rel="canonical"\s+id="seo-canonical-link"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" id="seo-canonical-link" href="${safeCanonical}" />`
  );
  out = out.replace(
    /<link\s+rel="alternate"\s+hreflang="en-KE"\s+id="seo-hreflang-ke"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="alternate" hreflang="en-KE" id="seo-hreflang-ke" href="${safeCanonical}" />`
  );
  out = out.replace(
    /<link\s+rel="alternate"\s+hreflang="x-default"\s+id="seo-hreflang-default"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="alternate" hreflang="x-default" id="seo-hreflang-default" href="${safeCanonical}" />`
  );
  out = out.replace(
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:type" content="${meta.ogType}" />`
  );
  out = out.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${safeTitle}" />`
  );
  out = out.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${safeDesc}" />`
  );
  out = out.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${safeCanonical}" />`
  );
  out = out.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${safeTitle}" />`
  );
  out = out.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${safeDesc}" />`
  );
  out = out.replace(
    /<script\s+type="application\/ld\+json"\s+id="seo-structured-data">[\s\S]*?<\/script>/i,
    `<script type="application/ld+json" id="seo-structured-data">${jsonLdString}</script>`
  );

  return out;
}

export function syncDocumentHeadSeo(rawPath: string): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const meta = getRouteSeoMeta(rawPath);
  const canonicalUrl = `${CANONICAL_ORIGIN}${meta.canonicalPath === '/' ? '/' : meta.canonicalPath}`;
  const isProdHost = isCanonicalProductionHost(window.location.host);
  const effectiveRobots = isProdHost ? meta.robots : 'noindex, nofollow';

  document.title = meta.title;

  const setMetaContent = (selector: string, content: string) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute('content', content);
  };

  setMetaContent('meta[name="description"]', meta.description);
  setMetaContent('meta[name="keywords"]', meta.keywords);
  setMetaContent(
    'meta[name="robots"]',
    `${effectiveRobots}, max-snippet:-1, max-image-preview:large, max-video-preview:-1`
  );
  setMetaContent(
    'meta[name="googlebot"]',
    `${effectiveRobots}, max-snippet:-1, max-image-preview:large, max-video-preview:-1`
  );
  setMetaContent('meta[property="og:type"]', meta.ogType);
  setMetaContent('meta[property="og:title"]', meta.title);
  setMetaContent('meta[property="og:description"]', meta.description);
  setMetaContent('meta[property="og:url"]', canonicalUrl);
  setMetaContent('meta[name="twitter:title"]', meta.title);
  setMetaContent('meta[name="twitter:description"]', meta.description);

  const canonicalEl = document.getElementById('seo-canonical-link');
  if (canonicalEl) canonicalEl.setAttribute('href', canonicalUrl);

  const hreflangKe = document.getElementById('seo-hreflang-ke');
  if (hreflangKe) hreflangKe.setAttribute('href', canonicalUrl);

  const hreflangDefault = document.getElementById('seo-hreflang-default');
  if (hreflangDefault) hreflangDefault.setAttribute('href', canonicalUrl);

  const schemaEl = document.getElementById('seo-structured-data');
  if (schemaEl) {
    schemaEl.textContent = JSON.stringify(buildRouteJsonLd(rawPath));
  }
}
