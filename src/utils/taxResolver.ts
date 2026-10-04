import { TaxRule, BusinessTaxSettings, TaxScope, CartItem, Product, TaxBreakdownEntry } from '../types';

export const DEFAULT_TAX_RULES: TaxRule[] = [
  {
    id: 'rule-std-vat',
    name: 'Standard VAT (16%)',
    code: 'A',
    rate: 0.16,
    scope: 'all',
    isDefault: true,
    isActive: true,
    description: 'Standard VAT applicable to general commodities, manufactured goods, and services (KRA Class A)',
  },
  {
    id: 'rule-zero-flour-grains',
    name: 'Zero-Rated Food Staples (0%)',
    code: 'B',
    rate: 0.0,
    scope: 'category',
    targetCategory: 'Flour & Grains',
    isDefault: false,
    isActive: true,
    description: 'Zero-rated staple foods under KRA VAT Act Schedule 2 (Maize meal, wheat flour, basic grains)',
  },
  {
    id: 'rule-zero-fresh-produce',
    name: 'Zero-Rated Agricultural Produce (0%)',
    code: 'B',
    rate: 0.0,
    scope: 'category',
    targetCategory: 'Fresh Produce',
    isDefault: false,
    isActive: true,
    description: 'Unprocessed agricultural fresh vegetables, fruits, and raw farm produce',
  },
  {
    id: 'rule-special-concession',
    name: 'Concession / Fuel Rate (8%)',
    code: 'C',
    rate: 0.08,
    scope: 'category',
    targetCategory: 'Automotive & Fuel',
    isDefault: false,
    isActive: false,
    description: 'Special 8% tax concession rate for petroleum and energy inputs',
  },
  {
    id: 'rule-region-coast-sez',
    name: 'Special Economic Zone / Export (0%)',
    code: 'E',
    rate: 0.0,
    scope: 'region',
    targetLocationId: 'loc-msa',
    isDefault: false,
    isActive: false,
    description: 'Duty-free export processing zone and bonded warehouse supplies (Mombasa Coastal Hub)',
  },
];

export const DEFAULT_TAX_SETTINGS: BusinessTaxSettings = {
  taxLabel: 'VAT',
  defaultTaxRate: 0.16,
  taxNumber: 'P051234567Z',
  pricingType: 'inclusive',
  enableDynamicCategoryTax: true,
  enableDynamicRegionalTax: true,
  rules: DEFAULT_TAX_RULES,
};

export interface ResolvedTaxInfo {
  rate: number;
  ratePercent: number; // e.g. 16 for 0.16
  ruleName: string;
  code: string;
  scope: TaxScope | 'product' | 'fallback';
  isZeroRated: boolean;
  ruleId?: string;
}

export type { TaxBreakdownEntry } from '../types';

/**
 * Dynamically resolves the effective tax rate for a product based on
 * the business's tax hierarchy:
 * 1. Regional / Location override
 * 2. Category-specific tax rule
 * 3. Product custom tax rate (if explicitly set and different from default)
 * 4. Business default tax rule / rate
 */
export function resolveDynamicTaxRate(
  product: { category?: string; taxRate?: number; id?: string },
  locationId: string,
  taxSettings?: BusinessTaxSettings
): ResolvedTaxInfo {
  const settings = taxSettings || DEFAULT_TAX_SETTINGS;
  const activeRules = (settings.rules || []).filter((r) => r.isActive);

  // 1. Regional / Location Rule (if enabled)
  if (settings.enableDynamicRegionalTax !== false && locationId) {
    const regionalRule = activeRules.find(
      (r) => r.scope === 'region' && r.targetLocationId === locationId
    );
    if (regionalRule) {
      return {
        rate: regionalRule.rate,
        ratePercent: Math.round(regionalRule.rate * 100),
        ruleName: regionalRule.name,
        code: regionalRule.code,
        scope: 'region',
        isZeroRated: regionalRule.rate === 0,
        ruleId: regionalRule.id,
      };
    }
  }

  // 2. Category-specific Rule (if enabled)
  if (settings.enableDynamicCategoryTax !== false && product.category) {
    const prodCatLower = product.category.trim().toLowerCase();
    const categoryRule = activeRules.find(
      (r) => r.scope === 'category' && r.targetCategory?.trim().toLowerCase() === prodCatLower
    );
    if (categoryRule) {
      return {
        rate: categoryRule.rate,
        ratePercent: Math.round(categoryRule.rate * 100),
        ruleName: categoryRule.name,
        code: categoryRule.code,
        scope: 'category',
        isZeroRated: categoryRule.rate === 0,
        ruleId: categoryRule.id,
      };
    }
  }

  // 3. Product specific rate override (if provided and valid)
  if (product.taxRate !== undefined && product.taxRate !== null && !isNaN(product.taxRate)) {
    const pRate = product.taxRate;
    // If it matches a known rule code
    const matchingRule = activeRules.find((r) => r.rate === pRate);
    if (matchingRule) {
      return {
        rate: matchingRule.rate,
        ratePercent: Math.round(matchingRule.rate * 100),
        ruleName: matchingRule.name,
        code: matchingRule.code,
        scope: 'product',
        isZeroRated: matchingRule.rate === 0,
        ruleId: matchingRule.id,
      };
    }
  }

  // 4. Default business tax rule
  const defaultRule = activeRules.find((r) => r.isDefault || r.scope === 'all');
  if (defaultRule) {
    return {
      rate: defaultRule.rate,
      ratePercent: Math.round(defaultRule.rate * 100),
      ruleName: defaultRule.name,
      code: defaultRule.code,
      scope: 'all',
      isZeroRated: defaultRule.rate === 0,
      ruleId: defaultRule.id,
    };
  }

  // Fallback safe 16% VAT
  const fallbackRate = settings.defaultTaxRate ?? 0.16;
  return {
    rate: fallbackRate,
    ratePercent: Math.round(fallbackRate * 100),
    ruleName: `${settings.taxLabel || 'VAT'} (${Math.round(fallbackRate * 100)}%)`,
    code: 'A',
    scope: 'fallback',
    isZeroRated: fallbackRate === 0,
  };
}

/**
 * Calculates itemized dynamic tax breakdown for current cart items
 */
export function calculateCartTaxBreakdown(
  cart: CartItem[],
  locationId: string,
  taxSettings?: BusinessTaxSettings,
  productsCatalog?: Product[]
): TaxBreakdownEntry[] {
  const breakdownMap: Record<string, TaxBreakdownEntry> = {};
  const isExclusive = taxSettings?.pricingType === 'exclusive';

  cart.forEach((item) => {
    // Find category from catalog if not stored directly on cart item
    const catalogProd = productsCatalog?.find((p) => p.id === item.productId);
    const category = (item as any).category || catalogProd?.category;

    const resolved = resolveDynamicTaxRate(
      { category, taxRate: item.taxRate, id: item.productId },
      locationId,
      taxSettings
    );

    const key = `${resolved.code}_${resolved.rate}`;
    const discountedPrice = item.unitPrice * (1 - (item.discountPercent || 0) / 100);

    let netTotal: number;
    let taxAmount: number;
    let grossTotal: number;

    if (isExclusive) {
      netTotal = discountedPrice * item.quantity;
      taxAmount = netTotal * resolved.rate;
      grossTotal = netTotal + taxAmount;
    } else {
      grossTotal = discountedPrice * item.quantity;
      netTotal = grossTotal / (1 + resolved.rate);
      taxAmount = grossTotal - netTotal;
    }

    if (!breakdownMap[key]) {
      breakdownMap[key] = {
        code: resolved.code,
        name: resolved.ruleName,
        rate: resolved.rate,
        ratePercent: resolved.ratePercent,
        taxableAmount: 0,
        taxAmount: 0,
        grossAmount: 0,
        itemCount: 0,
        items: [],
      };
    }

    breakdownMap[key].taxableAmount += netTotal;
    breakdownMap[key].taxAmount += taxAmount;
    breakdownMap[key].grossAmount += grossTotal;
    breakdownMap[key].itemCount += item.quantity;
    breakdownMap[key].items?.push({
      productName: item.productName,
      quantity: item.quantity,
      subtotal: grossTotal,
    });
  });

  return Object.values(breakdownMap).sort((a, b) => b.rate - a.rate);
}
