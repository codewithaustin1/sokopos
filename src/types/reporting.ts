import { PaymentMethod } from '../types';

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
