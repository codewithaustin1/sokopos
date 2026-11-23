export type TimeRangePreset =
  | 'today'
  | 'last_24h'
  | 'last_7d'
  | 'last_30d'
  | 'last_90d'
  | 'last_180d'
  | 'last_1y'
  | 'custom'
  | 'all';

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
  preset: TimeRangePreset;
  isRolling?: boolean;
}

export type ReportCategory = 'phase1' | 'phase2' | 'phase3';

export type ReportType =
  // Phase 1 - Core
  | 'sales'
  | 'stock'
  | 'payment_methods'
  | 'tax_vat'
  | 'profit_margin'
  | 'shift_till'
  | 'refund_void'
  // Phase 2 - Operational
  | 'customer'
  | 'staff_performance'
  | 'discount_promo'
  | 'low_stock_reorder'
  | 'product_performance'
  // Phase 3 - Advanced
  | 'supplier_po'
  | 'audit_log'
  | 'comparative';

export interface ReportMeta {
  id: ReportType;
  title: string;
  category: ReportCategory;
  description: string;
  phaseLabel: string;
}

export const REPORT_REGISTRY: ReportMeta[] = [
  // Phase 1 - Core
  {
    id: 'sales',
    title: 'Sales Report',
    category: 'phase1',
    description: 'Itemized transaction records, totals, category distribution, and revenue trends',
    phaseLabel: 'Phase 1 • Core',
  },
  {
    id: 'stock',
    title: 'Stock Report',
    category: 'phase1',
    description: 'Current on-hand inventory levels, valuation, and stock movements by location',
    phaseLabel: 'Phase 1 • Core',
  },
  {
    id: 'payment_methods',
    title: 'Payment-Method Report',
    category: 'phase1',
    description: 'Breakdown of cash drawer, M-Pesa STK/till, card terminals, and split receipts',
    phaseLabel: 'Phase 1 • Core',
  },
  {
    id: 'tax_vat',
    title: 'Tax / VAT Report',
    category: 'phase1',
    description: 'VAT collections, standard 16% vs zero-rated sales, and KRA remittance summary',
    phaseLabel: 'Phase 1 • Core',
  },
  {
    id: 'profit_margin',
    title: 'Profit & Margin Report',
    category: 'phase1',
    description: 'COGS vs selling prices, gross margin percentages per category and net margins',
    phaseLabel: 'Phase 1 • Core',
  },
  {
    id: 'shift_till',
    title: 'Shift / Till Report (Z-Report)',
    category: 'phase1',
    description: 'Opening/closing cash, drawer discrepancies, tender reconciliation, and register audit',
    phaseLabel: 'Phase 1 • Core',
  },
  {
    id: 'refund_void',
    title: 'Refund / Void / Return Report',
    category: 'phase1',
    description: 'Returned and voided items, reasons for return, credit notes, and product return rates',
    phaseLabel: 'Phase 1 • Core',
  },
  // Phase 2 - Operational
  {
    id: 'customer',
    title: 'Customer Report',
    category: 'phase2',
    description: 'Top customers by spend, purchase history, visit frequencies, and repeat rates',
    phaseLabel: 'Phase 2 • Operational',
  },
  {
    id: 'staff_performance',
    title: 'Staff / Cashier Performance',
    category: 'phase2',
    description: 'Sales volume per cashier, shift duration, voids/refunds processed, and throughput',
    phaseLabel: 'Phase 2 • Operational',
  },
  {
    id: 'discount_promo',
    title: 'Discount & Promotion Report',
    category: 'phase2',
    description: 'Manual and promotional discounts given, margin impact, and promo code performance',
    phaseLabel: 'Phase 2 • Operational',
  },
  {
    id: 'low_stock_reorder',
    title: 'Low-Stock & Reorder Report',
    category: 'phase2',
    description: 'Items below reorder thresholds, estimated depletion velocity, and suggested PO quantities',
    phaseLabel: 'Phase 2 • Operational',
  },
  {
    id: 'product_performance',
    title: 'Product Performance Report',
    category: 'phase2',
    description: 'Velocity analysis, top grossers, slow-moving dead inventory, and SKU sell-through',
    phaseLabel: 'Phase 2 • Operational',
  },
  // Phase 3 - Advanced
  {
    id: 'supplier_po',
    title: 'Supplier & PO Report',
    category: 'phase3',
    description: 'Purchase orders received, procurement expenditure, supplier terms, and COGS intake',
    phaseLabel: 'Phase 3 • Advanced',
  },
  {
    id: 'audit_log',
    title: 'Audit & Activity Log Report',
    category: 'phase3',
    description: 'Security log of who changed prices, stock overrides, tenant switches, and user roles',
    phaseLabel: 'Phase 3 • Advanced',
  },
  {
    id: 'comparative',
    title: 'Comparative Period-over-Period',
    category: 'phase3',
    description: 'Week-over-week, month-over-month, and year-over-year revenue and margin growth',
    phaseLabel: 'Phase 3 • Advanced',
  },
];

// =============================================================================
// Executive Business Intelligence (BI) Suite & Persistence Models
// =============================================================================

export type BiFocusTab = 'sku_margin' | 'category_pl' | 'ledger';
export type BiChartMetric = 'net_sales' | 'gross_profit' | 'margin_pct' | 'orders';

export interface AnalyticsDailyRollup {
  id: string; // Deterministic: {businessId}__{locationId}__{YYYY-MM-DD}
  businessId: string;
  locationId: string;
  locationName: string;
  dateKey: string; // YYYY-MM-DD
  grossSales: number;
  refundsTotal: number;
  discountsTotal: number;
  netSales: number;
  taxTotal: number;
  cogsTotal: number;
  grossProfit: number;
  operatingExpenses: number;
  transactionCount: number;
  unitsSold: number;
  mpesaTotal: number;
  cashTotal: number;
  cardTotal: number;
  storeCreditTotal: number;
  uncostedRevenue: number;
  updatedAt: string;
}

export interface AnalyticsTarget {
  id: string; // Deterministic: {businessId}__{locationId}__{periodKey}
  businessId: string;
  locationId: string; // 'all' or specific branch ID
  periodKey: string; // e.g., '2026-11'
  revenueTarget: number;
  grossMarginTargetPct: number;
  maxDiscountPct: number;
  updatedAt: string;
  updatedByUid?: string;
  updatedByEmail?: string;
}

export interface AnalyticsSavedView {
  id: string;
  businessId: string;
  name: string;
  locationId: string; // 'all' or locationId
  preset: TimeRangePreset;
  customStartIso?: string;
  customEndIso?: string;
  focusTab: BiFocusTab;
  chartMetric: BiChartMetric;
  createdByUid?: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutivePLSummary {
  grossSales: number;
  refundsTotal: number;
  discountsTotal: number;
  netRevenue: number;
  taxTotal: number;
  cogsTotal: number;
  grossProfit: number;
  grossMarginPct: number;
  operatingExpenses: number;
  netOperatingProfit: number;
  netOperatingMarginPct: number;
  ordersCount: number;
  refundedOrdersCount: number;
  unitsSold: number;
  avgBasket: number;
  costCoveragePct: number;
  uncostedRevenue: number;
  usedRollupHistory: boolean;
  priorNetRevenue: number;
  priorGrossProfit: number;
  priorOrdersCount: number;
  priorAvgBasket: number;
  netRevenueDeltaPct: number | null;
  grossProfitDeltaPct: number | null;
  ordersDeltaPct: number | null;
  avgBasketDeltaPct: number | null;
  marginDeltaPts: number | null;
}

export interface SkuProfitabilityRow {
  productId: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  unitsSold: number;
  unitsRefunded: number;
  netUnitsSold: number;
  grossRevenue: number;
  discountsGiven: number;
  refundAmount: number;
  netRevenue: number;
  cogsTotal: number;
  grossProfit: number;
  marginPct: number;
  hasCostData: boolean;
  currentUnitCost: number;
  currentSellingPrice: number;
  stockOnHand: number;
  reorderPoint: number;
  daysOfCover: number | null;
}

export interface CategoryProfitabilityRow {
  category: string;
  skuCount: number;
  unitsSold: number;
  netRevenue: number;
  cogsTotal: number;
  grossProfit: number;
  marginPct: number;
  discountsGiven: number;
  refundAmount: number;
  revenueSharePct: number;
  uncostedRevenue: number;
}

export interface BranchBenchmarkRow {
  locationId: string;
  locationName: string;
  code: string;
  ordersCount: number;
  netRevenue: number;
  cogsTotal: number;
  grossProfit: number;
  marginPct: number;
  operatingExpenses: number;
  netOperatingProfit: number;
  revenueSharePct: number;
}

export interface TenderMixRow {
  method: 'mpesa' | 'cash' | 'card' | 'store_credit';
  label: string;
  amount: number;
  sharePct: number;
  txCount: number;
}

export type BiInspectorTarget =
  | { type: 'sku'; productId: string }
  | { type: 'category'; category: string }
  | { type: 'transaction'; transactionId: string }
  | null;

