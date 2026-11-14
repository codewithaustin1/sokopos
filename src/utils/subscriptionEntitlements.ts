import { Business, PricingTier, DEFAULT_PRICING_TIERS } from '../types';

export type CanonicalTierId = 'free' | 'starter' | 'business' | 'premium';

export type SubscriptionCapabilityKey =
  | 'unlimitedProducts'
  | 'multiBranch'
  | 'stockTransfers'
  | 'suppliers'
  | 'loyaltyAndStoreCredit'
  | 'advancedTaxRules'
  | 'advancedReportsAndExport'
  | 'returnsAndRefunds'
  | 'analytics'
  | 'granularRbac'
  | 'customReceiptBranding'
  | 'multiCurrency'
  | 'enterpriseAudit';

export interface TierQuotaLimits {
  maxBranches: number; // -1 = unlimited
  maxStaffUsers: number; // -1 = unlimited
  maxProducts: number; // -1 = unlimited
}

export interface SubscriptionEntitlements {
  rawPlan: string;
  tierId: CanonicalTierId;
  tierName: string;
  tierAlias: string;
  isActive: boolean;
  isSuspended: boolean;
  isExpired: boolean;
  limits: TierQuotaLimits;
  capabilities: Record<SubscriptionCapabilityKey, boolean>;
}

export interface UpgradePromptRequest {
  title: string;
  description: string;
  requiredTier: CanonicalTierId;
  featureLabel: string;
  quotaMetric?: {
    label: string;
    used: number;
    limit: number;
  };
}

const TIER_RANK: Record<CanonicalTierId, number> = {
  free: 0,
  starter: 1,
  business: 2,
  premium: 3,
};

export const CAPABILITY_MIN_TIER: Record<SubscriptionCapabilityKey, CanonicalTierId> = {
  unlimitedProducts: 'starter',
  multiBranch: 'business',
  stockTransfers: 'business',
  suppliers: 'business',
  loyaltyAndStoreCredit: 'business',
  advancedTaxRules: 'business',
  advancedReportsAndExport: 'business',
  returnsAndRefunds: 'business',
  analytics: 'business',
  granularRbac: 'premium',
  customReceiptBranding: 'premium',
  multiCurrency: 'premium',
  enterpriseAudit: 'premium',
};

export const CAPABILITY_LABELS: Record<
  SubscriptionCapabilityKey,
  { title: string; description: string }
> = {
  unlimitedProducts: {
    title: 'Unlimited Product Catalog',
    description:
      'Free Advisory accounts are capped at 250 inventory SKUs. Upgrade to Starter or higher for an unlimited catalog.',
  },
  multiBranch: {
    title: 'Multi-Branch Store Locations',
    description:
      'Manage multiple physical branches, counters, and consolidated multi-location reporting on Business or Premium.',
  },
  stockTransfers: {
    title: 'Inter-Branch Stock Transfers',
    description:
      'Transfer inventory batches cleanly between store branches and warehouses with full audit tracking on Business or Premium.',
  },
  suppliers: {
    title: 'Suppliers & Purchase Orders',
    description:
      'Manage vendor profiles, purchase orders, AI invoice digitization, and supplier deliveries on Business or Premium.',
  },
  loyaltyAndStoreCredit: {
    title: 'Loyalty Rewards & Store Credit (Daftari)',
    description:
      'Configure points earning/redemption rules and manage customer Daftari store credit limits and ledgers on Business or Premium.',
  },
  advancedTaxRules: {
    title: 'Dynamic VAT & KRA Tax Rules',
    description:
      'Create custom category-level and regional VAT/eTIMS tax rules and automated tax overrides on Business or Premium.',
  },
  advancedReportsAndExport: {
    title: '15+ Advanced Reports & CSV/PDF Export',
    description:
      'Unlock all 15+ operational, tax, margin, and comparative reports plus accountant CSV/PDF exports on Business or Premium.',
  },
  returnsAndRefunds: {
    title: 'Returns, Voids & Refund Workflows',
    description:
      'Process receipt returns, restock workflows, and supervisor-authorized credit notes on Business or Premium.',
  },
  analytics: {
    title: 'Executive Analytics & Margin Insights',
    description:
      'Unlock live profit margin breakdowns, trading hour heatmaps, and multi-channel trend charts on Business or Premium.',
  },
  granularRbac: {
    title: 'Granular Role Permissions (RBAC)',
    description:
      'Customize per-role permissions across POS, inventory, shifts, credit, and reporting on the Premium Enterprise plan.',
  },
  customReceiptBranding: {
    title: 'Custom Receipt Branding & White-Labeling',
    description:
      'Customize thermal receipt header/footer branding and white-label storefront themes on the Premium Enterprise plan.',
  },
  multiCurrency: {
    title: 'Multi-Currency & Foreign Exchange',
    description:
      'Operate store terminals and reporting in USD, EUR, GBP, TZS, UGX, and additional currencies on the Premium Enterprise plan.',
  },
  enterpriseAudit: {
    title: 'Enterprise Audit & Batch Controls',
    description:
      'Access enterprise-grade audit trail exports and multi-warehouse governance on the Premium Enterprise plan.',
  },
};

export function normalizePlanTier(
  plan?: string | null,
  subscriptionPlanId?: string | null
): CanonicalTierId {
  const candidates = [plan, subscriptionPlanId];
  for (const candidate of candidates) {
    const clean = String(candidate || '').trim().toLowerCase();
    if (!clean) continue;
    if (clean === 'free' || clean === 'free_advisory') return 'free';
    if (clean === 'starter' || clean === 'basic') return 'starter';
    if (clean === 'business' || clean === 'professional' || clean === 'pro') return 'business';
    if (clean === 'premium' || clean === 'enterprise') return 'premium';
  }
  return 'free';
}

export function isTierAtLeast(
  currentTier: CanonicalTierId,
  requiredTier: CanonicalTierId
): boolean {
  return TIER_RANK[currentTier] >= TIER_RANK[requiredTier];
}

export function getRequiredTierForBranchCount(targetCount: number): CanonicalTierId {
  if (targetCount <= 1) return 'free';
  if (targetCount <= 3) return 'business';
  return 'premium';
}

export function getRequiredTierForStaffCount(targetCount: number): CanonicalTierId {
  if (targetCount <= 1) return 'free';
  if (targetCount <= 2) return 'starter';
  if (targetCount <= 10) return 'business';
  return 'premium';
}

export function getRequiredTierForProductCount(targetCount: number): CanonicalTierId {
  if (targetCount <= 250) return 'free';
  return 'starter';
}

export function resolveBusinessEntitlements(
  business?: Business | null,
  pricingTiers: PricingTier[] = DEFAULT_PRICING_TIERS
): SubscriptionEntitlements {
  const rawPlan = String(business?.plan || business?.subscription?.planId || 'free');
  const baseTierId = normalizePlanTier(business?.plan, business?.subscription?.planId);

  const isPrivilegedDemoOrAdmin =
    business?.id === 'biz-demo' || business?.id === 'biz-upfront';

  const isSuspended = !isPrivilegedDemoOrAdmin && business?.status === 'suspended';

  let isExpired = false;
  if (!isPrivilegedDemoOrAdmin && business?.subscription) {
    if (business.subscription.status === 'expired') {
      isExpired = true;
    } else if (business.subscription.expiresAt && baseTierId !== 'free') {
      const expMs = new Date(business.subscription.expiresAt).getTime();
      if (Number.isFinite(expMs) && expMs < Date.now()) {
        isExpired = true;
      }
    }
  }

  // Expired paid subscriptions fall back to free entitlements until renewed
  const effectiveTierId: CanonicalTierId = isExpired ? 'free' : baseTierId;

  const tierDef =
    pricingTiers.find((t) => t.id === effectiveTierId) ||
    DEFAULT_PRICING_TIERS.find((t) => t.id === effectiveTierId) ||
    DEFAULT_PRICING_TIERS[0];

  const defaultBranchCap =
    effectiveTierId === 'premium'
      ? -1
      : effectiveTierId === 'business'
      ? 3
      : 1;
  const defaultStaffCap =
    effectiveTierId === 'premium'
      ? -1
      : effectiveTierId === 'business'
      ? 10
      : effectiveTierId === 'starter'
      ? 2
      : 1;
  const defaultProductCap = effectiveTierId === 'free' ? 250 : -1;

  const limits: TierQuotaLimits = {
    maxBranches:
      typeof tierDef.maxBranches === 'number' ? tierDef.maxBranches : defaultBranchCap,
    maxStaffUsers:
      typeof tierDef.maxStaffUsers === 'number' ? tierDef.maxStaffUsers : defaultStaffCap,
    maxProducts: defaultProductCap,
  };

  const capabilities: Record<SubscriptionCapabilityKey, boolean> = {
    unlimitedProducts: isTierAtLeast(effectiveTierId, CAPABILITY_MIN_TIER.unlimitedProducts),
    multiBranch: isTierAtLeast(effectiveTierId, CAPABILITY_MIN_TIER.multiBranch),
    stockTransfers: isTierAtLeast(effectiveTierId, CAPABILITY_MIN_TIER.stockTransfers),
    suppliers: isTierAtLeast(effectiveTierId, CAPABILITY_MIN_TIER.suppliers),
    loyaltyAndStoreCredit: isTierAtLeast(
      effectiveTierId,
      CAPABILITY_MIN_TIER.loyaltyAndStoreCredit
    ),
    advancedTaxRules: isTierAtLeast(effectiveTierId, CAPABILITY_MIN_TIER.advancedTaxRules),
    advancedReportsAndExport: isTierAtLeast(
      effectiveTierId,
      CAPABILITY_MIN_TIER.advancedReportsAndExport
    ),
    returnsAndRefunds: isTierAtLeast(effectiveTierId, CAPABILITY_MIN_TIER.returnsAndRefunds),
    analytics: isTierAtLeast(effectiveTierId, CAPABILITY_MIN_TIER.analytics),
    granularRbac: isTierAtLeast(effectiveTierId, CAPABILITY_MIN_TIER.granularRbac),
    customReceiptBranding: isTierAtLeast(
      effectiveTierId,
      CAPABILITY_MIN_TIER.customReceiptBranding
    ),
    multiCurrency: isTierAtLeast(effectiveTierId, CAPABILITY_MIN_TIER.multiCurrency),
    enterpriseAudit: isTierAtLeast(effectiveTierId, CAPABILITY_MIN_TIER.enterpriseAudit),
  };

  return {
    rawPlan,
    tierId: effectiveTierId,
    tierName: tierDef.name,
    tierAlias: tierDef.alias,
    isActive: !isSuspended && !isExpired,
    isSuspended,
    isExpired,
    limits,
    capabilities,
  };
}

export function isQuotaAtOrAboveLimit(used: number, limit: number): boolean {
  if (limit < 0) return false; // -1 means unlimited
  return used >= limit;
}

export function formatTierDisplayName(tierId: CanonicalTierId): string {
  switch (tierId) {
    case 'free':
      return 'Free Advisory';
    case 'starter':
      return 'Starter';
    case 'business':
      return 'Business (Pro)';
    case 'premium':
      return 'Premium (Enterprise)';
  }
}
