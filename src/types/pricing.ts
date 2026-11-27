export type PackageTierId = 'free' | 'starter' | 'business' | 'premium';

export interface PendingCheckoutIntent {
  planId: PackageTierId;
  billingCycle: 'monthly' | 'annual';
  planName: string;
  amountKes: number;
  timestamp: number;
}

export interface PricingTierFeature {
  id: string;
  name: string;
  category: 'pos' | 'inventory' | 'reports' | 'branches' | 'support' | 'security';
  includedInFree?: boolean;
  includedInStarter: boolean;
  includedInBusiness: boolean;
  includedInPremium: boolean;
}

export interface PricingTier {
  id: string; // 'free' | 'starter' | 'business' | 'premium'
  tierKey: 'starter' | 'business' | 'premium' | 'professional' | 'enterprise';
  name: string; // e.g. "FREE", "STARTER", "BUSINESS", "PREMIUM"
  alias: string; // "Free Account", "Basic", "Pro", "Enterprise"
  badge?: string; // "Best Value", "Starter Choice", "Enterprise Scale", "1-on-1 Setup"
  bundleLabel?: string; // e.g. "Everything in Starter, plus:"
  isPopular?: boolean;
  monthlyPrice: number; // e.g. 0, 399, 899, 1499
  annualPrice: number; // e.g. 0, 3990, 8990, 14990
  consultationFee?: number; // e.g. 1999 for free account
  consultationDescription?: string;
  currency: string; // "KES"
  tagline: string;
  description: string;
  maxBranches: number; // 1, 3, or -1 (unlimited)
  maxStaffUsers: number; // 1, 2, 10, or -1 (unlimited)
  features: string[];
  colorTheme: 'emerald' | 'blue' | 'indigo' | 'amber' | 'purple' | 'cyan';
  supportLevel: string;
  isActive: boolean;
}

export const DEFAULT_PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    tierKey: 'starter',
    name: 'FREE (ADVISORY)',
    alias: 'Free Account',
    badge: 'Zero Monthly Fee',
    isPopular: false,
    monthlyPrice: 0,
    annualPrice: 0,
    consultationFee: 1999,
    consultationDescription: 'Includes 1-on-1 printer pairing, CSV stock upload & KRA tax setup.',
    currency: 'KES',
    tagline: 'Lifetime POS software with 1-on-1 store setup.',
    description: 'Lifetime free POS with one-time 1-on-1 setup, CSV import, and thermal printer pairing.',
    maxBranches: 1,
    maxStaffUsers: 1,
    features: [
      'Ksh 0/mo lifetime cloud POS',
      '1 branch · 1 cashier PIN login',
      'Up to 250 barcode products',
      '58mm & 80mm thermal receipts',
      'Offline sales + M-Pesa & Cash split',
      '1-time Ksh 1,999 onboarding & CSV upload',
    ],
    colorTheme: 'emerald',
    supportLevel: '1-on-1 Setup Consultation + Community',
    isActive: true,
  },
  {
    id: 'starter',
    tierKey: 'starter',
    name: 'STARTER',
    alias: 'Basic',
    badge: 'Starter Choice',
    isPopular: false,
    monthlyPrice: 599,
    annualPrice: 5990,
    currency: 'KES',
    tagline: 'For solo shops, kiosks & single counters.',
    description: 'Fast barcode checkout, unlimited SKUs, thermal receipts, and daily shift cash audits.',
    maxBranches: 1,
    maxStaffUsers: 2,
    features: [
      '1 branch · Up to 2 cashier PINs',
      'Unlimited SKUs & barcode scan',
      'Low-stock alerts & cash drawer audit',
      '58mm & 80mm thermal receipts',
      'Offline sync + M-Pesa & Cash checkout',
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
    bundleLabel: 'Everything in Starter, plus:',
    isPopular: true,
    monthlyPrice: 1299,
    annualPrice: 12990,
    currency: 'KES',
    tagline: 'For busy mini-marts & multi-counter shops.',
    description: 'Multi-branch stock transfers, 15+ KRA reports, supplier POs, and customer loyalty.',
    maxBranches: 3,
    maxStaffUsers: 10,
    features: [
      'Up to 3 branches · 10 staff logins',
      'Cross-branch transfers & live stock sync',
      '15+ profit, stock & KRA VAT reports',
      'Purchase orders, loyalty & store credit',
      'Priority WhatsApp & phone support',
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
    bundleLabel: 'Everything in Business, plus:',
    isPopular: false,
    monthlyPrice: 2999,
    annualPrice: 29990,
    currency: 'KES',
    tagline: 'For supermarkets, franchises & wholesale hubs.',
    description: 'Unlimited branches, granular RBAC permissions, batch expiry alerts, and 24/7 support.',
    maxBranches: -1, // Unlimited
    maxStaffUsers: -1, // Unlimited
    features: [
      'Unlimited branches & warehouse hubs',
      'Unlimited staff + granular RBAC rules',
      'Batch numbering & expiry alerts',
      'Custom branded receipts & audit logs',
      'Dedicated 24/7 account manager',
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
    recommendedFor: 'Solo shops, kiosks & single counters',
  },
  {
    index: 1,
    tierId: 'business',
    label: 'BUSINESS',
    subLabel: 'Pro • Best Value',
    branchLabel: 'Up to 3 Branches',
    recommendedFor: 'Mini-marts, boutiques & multi-counter shops',
  },
  {
    index: 2,
    tierId: 'premium',
    label: 'PREMIUM',
    subLabel: 'Enterprise',
    branchLabel: 'Unlimited Branches',
    recommendedFor: 'Supermarkets, franchises & wholesale hubs',
  },
];

export function getRecommendedTierIdByBranches(branchCount: number): PackageTierId {
  if (branchCount <= 1) return 'starter';
  if (branchCount <= 3) return 'business';
  return 'premium';
}

const LEGACY_DEFAULT_TAGLINES = new Set([
  'zero monthly software subscription. pay only once for expert onboarding & store setup.',
  'ideal for solo kiosks, boutiques & quick checkout counters',
  'for high-volume retail stores, busy mini-marts & multi-counter shops',
  'supermarkets, multi-chain franchises, wholesale hubs & multi-branch enterprises',
  'lifetime free pos, with expert setup for a one-time fee.',
  'for solo kiosks, boutiques and quick checkout counters.',
  'for busy mini-marts and multi-counter shops.',
  'for supermarkets, franchises and wholesale hubs.',
]);

const LEGACY_DEFAULT_DESCRIPTIONS = new Set([
  'lifetime free pos software paired with professional 1-on-1 retail setup, catalog onboarding, and hardware advisory.',
  'everything you need to ring up sales fast, print thermal receipts, and keep accurate track of inventory.',
  'powerful multi-branch capabilities, in-depth reports, customer loyalty, and automated tax accounting.',
  'uncapped multi-store scale, custom branding, granular security access, and dedicated account management.',
]);

const LEGACY_DEFAULT_CONSULTATION_NOTES = new Set([
  'one-time onboarding advisory: 1-on-1 hardware pairing, catalog migration, kra tax consultation, and staff training.',
  'includes 1-on-1 printer pairing, stock upload and kra tax advice.',
]);

const LEGACY_DEFAULT_FEATURES = new Set([
  'lifetime free cloud pos software (ksh 0/month)',
  '1 store branch location (single checkout till)',
  '1 cashier / owner login with secure pin access',
  'up to 250 inventory products with barcode scanning',
  'thermal receipt printing (58mm & 80mm format)',
  'offline cashiering with automatic cloud synchronization',
  'm-pesa, cash & split payment checkout',
  'one-time ksh 1,999 setup & consultation advisory session',
  'hardware & thermal printer bluetooth/usb pairing guidance',
  'assisted catalog formatting & bulk csv stock upload',
  '1 store branch location (single-register till)',
  'up to 2 cashier user logins with pin lock',
  'optical barcode scanning & fast sku lookup',
  'core inventory management & low-stock alerts',
  'thermal receipt printing (58mm & 80mm support)',
  'daily shift till closing & cash drawer audit',
  'cash, m-pesa manual & split payment support',
  'offline cashiering with auto-cloud synchronization',
  'standard email & community support',
  'up to 3 store branches with instant multi-location switching',
  'up to 10 cashier & manager logins with role authorization',
  'multi-branch inventory sync & inter-store stock transfers',
  '15+ advanced financial & inventory reports with csv export',
  'supplier purchase orders & stock delivery receiving',
  'customer loyalty points & store credit ledgers',
  'automated vat / kra tax rate calculation & breakdown reports',
  'returns, voids & refund authorization workflow with audit logs',
  'priority whatsapp & direct phone technical support',
  'unlimited store branch locations & warehouse distribution hubs',
  'unlimited cashier, manager & supervisor staff user accounts',
  'granular role-based access control (rbac) & pin permissions',
  'multi-warehouse valuation, batch numbering & expiry alerts',
  'custom receipt branding & platform white-labeling',
  'complete super-admin write audit trail & shrinkage protection',
  'supplier debt tracking & automated stock replenishment orders',
  'multi-currency and foreign exchange support',
  'dedicated account manager & 24/7 priority emergency support',
]);

export function normalizePricingTiersArray(rawTiers: unknown): PricingTier[] | null {
  if (!Array.isArray(rawTiers) || rawTiers.length === 0) return null;

  const byId = new Map<string, any>();
  for (const item of rawTiers) {
    if (item && typeof item === 'object' && typeof item.id === 'string') {
      byId.set(item.id.toLowerCase(), item);
    }
  }
  if (byId.size === 0) return null;

  const merged: PricingTier[] = DEFAULT_PRICING_TIERS.map((defTier) => {
    const remote = byId.get(defTier.id.toLowerCase());
    if (!remote) return defTier;

    const monthlyPrice =
      typeof remote.monthlyPrice === 'number' && Number.isFinite(remote.monthlyPrice) && remote.monthlyPrice >= 0
        ? remote.monthlyPrice
        : defTier.monthlyPrice;
    const annualPrice =
      typeof remote.annualPrice === 'number' && Number.isFinite(remote.annualPrice) && remote.annualPrice >= 0
        ? remote.annualPrice
        : defTier.annualPrice;
    const consultationFee =
      typeof remote.consultationFee === 'number' &&
      Number.isFinite(remote.consultationFee) &&
      remote.consultationFee >= 0
        ? remote.consultationFee
        : defTier.consultationFee;

    const remoteFeatures = Array.isArray(remote.features)
      ? remote.features.filter((f: unknown): f is string => typeof f === 'string' && f.trim().length > 0)
      : [];
    const usesOnlyLegacyDefaultFeatures =
      remoteFeatures.length === 0 ||
      remoteFeatures.every((f) => LEGACY_DEFAULT_FEATURES.has(f.trim().toLowerCase()));

    const remoteTagline = typeof remote.tagline === 'string' ? remote.tagline.trim() : '';
    const tagline =
      !remoteTagline || LEGACY_DEFAULT_TAGLINES.has(remoteTagline.toLowerCase())
        ? defTier.tagline
        : remoteTagline;

    const remoteDescription = typeof remote.description === 'string' ? remote.description.trim() : '';
    const description =
      !remoteDescription || LEGACY_DEFAULT_DESCRIPTIONS.has(remoteDescription.toLowerCase())
        ? defTier.description
        : remoteDescription;

    const remoteConsultationDesc =
      typeof remote.consultationDescription === 'string' ? remote.consultationDescription.trim() : '';
    const consultationDescription =
      !remoteConsultationDesc || LEGACY_DEFAULT_CONSULTATION_NOTES.has(remoteConsultationDesc.toLowerCase())
        ? defTier.consultationDescription
        : remoteConsultationDesc;

    const bundleLabel =
      typeof remote.bundleLabel === 'string'
        ? remote.bundleLabel.trim() || undefined
        : defTier.bundleLabel;

    return {
      ...defTier,
      ...remote,
      id: defTier.id,
      monthlyPrice,
      annualPrice,
      tagline,
      description,
      ...(consultationFee !== undefined ? { consultationFee } : {}),
      ...(consultationDescription !== undefined ? { consultationDescription } : {}),
      ...(bundleLabel ? { bundleLabel } : {}),
      maxBranches:
        typeof remote.maxBranches === 'number' && Number.isFinite(remote.maxBranches)
          ? remote.maxBranches
          : defTier.maxBranches,
      maxStaffUsers:
        typeof remote.maxStaffUsers === 'number' && Number.isFinite(remote.maxStaffUsers)
          ? remote.maxStaffUsers
          : defTier.maxStaffUsers,
      features: usesOnlyLegacyDefaultFeatures ? defTier.features : remoteFeatures,
      isPopular: typeof remote.isPopular === 'boolean' ? remote.isPopular : defTier.isPopular,
      isActive: typeof remote.isActive === 'boolean' ? remote.isActive : defTier.isActive,
    };
  });

  return merged;
}
