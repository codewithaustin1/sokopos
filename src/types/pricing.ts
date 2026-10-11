export type PackageTierId = 'starter' | 'business' | 'premium';

export interface PricingTierFeature {
  id: string;
  name: string;
  category: 'pos' | 'inventory' | 'reports' | 'branches' | 'support' | 'security';
  includedInStarter: boolean;
  includedInBusiness: boolean;
  includedInPremium: boolean;
}

export interface PricingTier {
  id: string; // 'starter' | 'business' | 'premium'
  tierKey: 'starter' | 'business' | 'premium' | 'professional' | 'enterprise';
  name: string; // e.g. "STARTER", "BUSINESS", "PREMIUM"
  alias: string; // "Basic", "Pro", "Enterprise"
  badge?: string; // "Best Value", "Starter Choice", "Enterprise Scale"
  isPopular?: boolean;
  monthlyPrice: number; // e.g. 399, 899, 1499
  annualPrice: number; // e.g. 3990, 8990, 14990
  currency: string; // "KES"
  tagline: string;
  description: string;
  maxBranches: number; // 1, 3, or -1 (unlimited)
  maxStaffUsers: number; // 2, 10, or -1 (unlimited)
  features: string[];
  colorTheme: 'blue' | 'indigo' | 'amber' | 'purple' | 'emerald';
  supportLevel: string;
  isActive: boolean;
}

export const DEFAULT_PRICING_TIERS: PricingTier[] = [
  {
    id: 'starter',
    tierKey: 'starter',
    name: 'STARTER',
    alias: 'Basic',
    badge: 'Starter Choice',
    isPopular: false,
    monthlyPrice: 399,
    annualPrice: 3990,
    currency: 'KES',
    tagline: 'Ideal for solo kiosks, boutiques & quick checkout counters',
    description: 'Everything you need to ring up sales fast, print thermal receipts, and keep accurate track of inventory.',
    maxBranches: 1,
    maxStaffUsers: 2,
    features: [
      '1 Store branch location (single-register till)',
      'Up to 2 Cashier user logins with PIN lock',
      'Optical barcode scanning & fast SKU lookup',
      'Core inventory management & low-stock alerts',
      'Thermal receipt printing (58mm & 80mm support)',
      'Daily shift till closing & cash drawer audit',
      'Cash, M-Pesa manual & split payment support',
      'Offline cashiering with auto-cloud synchronization',
      'Standard email & community support'
    ],
    colorTheme: 'blue',
    supportLevel: 'Standard Email & Community',
    isActive: true,
  },
  {
    id: 'business',
    tierKey: 'business',
    name: 'BUSINESS',
    alias: 'Pro',
    badge: 'Best Value',
    isPopular: true,
    monthlyPrice: 899,
    annualPrice: 8990,
    currency: 'KES',
    tagline: 'For high-volume retail stores, busy mini-marts & multi-counter shops',
    description: 'Powerful multi-branch capabilities, in-depth reports, customer loyalty, and automated tax accounting.',
    maxBranches: 3,
    maxStaffUsers: 10,
    features: [
      'Up to 3 Store branches with instant multi-location switching',
      'Up to 10 Cashier & Manager logins with role authorization',
      'Multi-branch inventory sync & inter-store stock transfers',
      '15+ Advanced financial & inventory reports with CSV export',
      'Supplier purchase orders & stock delivery receiving',
      'Customer loyalty points & store credit ledgers',
      'Automated VAT / KRA tax rate calculation & breakdown reports',
      'Returns, voids & refund authorization workflow with audit logs',
      'Priority WhatsApp & direct phone technical support'
    ],
    colorTheme: 'indigo',
    supportLevel: 'Priority WhatsApp & Phone Support',
    isActive: true,
  },
  {
    id: 'premium',
    tierKey: 'premium',
    name: 'PREMIUM',
    alias: 'Enterprise',
    badge: 'Enterprise Flagship',
    isPopular: false,
    monthlyPrice: 1499,
    annualPrice: 14990,
    currency: 'KES',
    tagline: 'Supermarkets, multi-chain franchises, wholesale hubs & multi-branch enterprises',
    description: 'Uncapped multi-store scale, custom branding, granular security access, and dedicated account management.',
    maxBranches: -1, // Unlimited
    maxStaffUsers: -1, // Unlimited
    features: [
      'Unlimited Store branch locations & warehouse distribution hubs',
      'Unlimited Cashier, Manager & Supervisor staff user accounts',
      'Granular Role-Based Access Control (RBAC) & PIN permissions',
      'Multi-warehouse valuation, batch numbering & expiry alerts',
      'Custom receipt branding & platform white-labeling',
      'Complete super-admin write audit trail & shrinkage protection',
      'Supplier debt tracking & automated stock replenishment orders',
      'Multi-currency and foreign exchange support',
      'Dedicated Account Manager & 24/7 priority emergency support'
    ],
    colorTheme: 'purple',
    supportLevel: 'Dedicated Account Manager & 24/7 Hotline',
    isActive: true,
  },
];

export interface SliderTierStep {
  index: number;
  tierId: PackageTierId;
  label: string;
  subLabel: string;
  branchLabel: string;
  recommendedFor: string;
}

export const SLIDER_TIER_STEPS: SliderTierStep[] = [
  {
    index: 0,
    tierId: 'starter',
    label: 'STARTER',
    subLabel: 'Basic',
    branchLabel: '1 Store Branch',
    recommendedFor: 'Solo retail shops, kiosks & small counters',
  },
  {
    index: 1,
    tierId: 'business',
    label: 'BUSINESS',
    subLabel: 'Pro • Best Value ⭐',
    branchLabel: 'Up to 3 Branches',
    recommendedFor: 'Busy mini-marts, boutiques & multi-counter shops',
  },
  {
    index: 2,
    tierId: 'premium',
    label: 'PREMIUM',
    subLabel: 'Enterprise',
    branchLabel: 'Unlimited Branches',
    recommendedFor: 'Franchises, supermarkets & expanding retail chains',
  },
];

export function getRecommendedTierIdByBranches(branchCount: number): PackageTierId {
  if (branchCount <= 1) return 'starter';
  if (branchCount <= 3) return 'business';
  return 'premium';
}
