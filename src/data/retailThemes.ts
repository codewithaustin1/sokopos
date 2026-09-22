export type RetailTheme = 'classic' | 'emerald' | 'amber' | 'burgundy' | 'industrial';

export interface RetailThemeConfig {
  id: RetailTheme;
  name: string;
  subtitle: string;
  tagline: string;
  trade: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  highlightColor: string;
  lightBg: string;
  lightBorder: string;
  swatchGradient: string;
  tags: string[];
}

export const RETAIL_THEMES: RetailThemeConfig[] = [
  {
    id: 'classic',
    name: 'Enterprise Classic (Default)',
    subtitle: 'Modern Indigo & Cobalt Blue',
    tagline: 'Clean corporate retail & electronics',
    trade: 'General retail, consumer electronics, and multi-department stores',
    description: 'Modern indigo & cobalt blue — universal, crisp, and high-visibility for all retail operations.',
    primaryColor: '#2563eb',
    accentColor: '#3b82f6',
    highlightColor: '#60a5fa',
    lightBg: '#eff6ff',
    lightBorder: '#bfdbfe',
    swatchGradient: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
    tags: ['General Retail', 'Electronics', 'Department'],
  },
  {
    id: 'emerald',
    name: 'Fresh Market Emerald',
    subtitle: 'Deep Emerald & Mint Accents',
    tagline: 'Tailored for grocers, produce & organics',
    trade: 'Supermarkets, grocery stores, florists, and organic shops',
    description: 'Deep emerald & mint accents — ideal for supermarkets, grocery stores, florists, and organic shops.',
    primaryColor: '#059669',
    accentColor: '#10b981',
    highlightColor: '#34d399',
    lightBg: '#ecfdf5',
    lightBorder: '#a7f3d0',
    swatchGradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    tags: ['Supermarkets', 'Grocers', 'Florists', 'Organics'],
  },
  {
    id: 'amber',
    name: 'Artisan Cafe & Bakery',
    subtitle: 'Warm Amber, Espresso & Terracotta',
    tagline: 'Crafted for coffee roasters, bistros & bakeries',
    trade: 'Coffee shops, bakeries, cafes, and quick-service diners',
    description: 'Warm amber, espresso, and terracotta accents — designed for coffee shops, bakeries, and quick-service diners.',
    primaryColor: '#d97706',
    accentColor: '#f59e0b',
    highlightColor: '#fbbf24',
    lightBg: '#fffbeb',
    lightBorder: '#fde68a',
    swatchGradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    tags: ['Coffee Shops', 'Bakeries', 'Bistros', 'Diners'],
  },
  {
    id: 'burgundy',
    name: 'Boutique & Luxury',
    subtitle: 'Burgundy, Rosewood & Champagne Gold',
    tagline: 'Refined elegance for fashion & jewelry',
    trade: 'Fashion apparel, cosmetics, jewelry counters, and fine wine',
    description: 'Burgundy, rosewood, and champagne gold — designed for fashion apparel, cosmetics, and jewelry counters.',
    primaryColor: '#9f1239',
    accentColor: '#e11d48',
    highlightColor: '#f43f5e',
    lightBg: '#fff1f2',
    lightBorder: '#fecdd3',
    swatchGradient: 'linear-gradient(135deg, #9f1239 0%, #e11d48 100%)',
    tags: ['Fashion Apparel', 'Cosmetics', 'Jewelry', 'Luxury'],
  },
  {
    id: 'industrial',
    name: 'Industrial & Hardware',
    subtitle: 'High-Visibility Graphite & Caution Amber',
    tagline: 'High-contrast heavy-duty trade counter',
    trade: 'Hardware stores, auto parts, lumber, and wholesale warehouses',
    description: 'High-visibility graphite and caution amber/slate — tailored for hardware stores, auto parts, and wholesale warehouses.',
    primaryColor: '#1e293b',
    accentColor: '#f59e0b',
    highlightColor: '#fbbf24',
    lightBg: '#f8fafc',
    lightBorder: '#cbd5e1',
    swatchGradient: 'linear-gradient(135deg, #1e293b 0%, #f59e0b 100%)',
    tags: ['Hardware Stores', 'Auto Parts', 'Wholesale', 'Warehouses'],
  },
];
