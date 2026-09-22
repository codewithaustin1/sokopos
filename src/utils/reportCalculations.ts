import { Transaction, Product, Location, Cashier, SuperAdminAuditEntry } from '../types';
import { DateRange } from '../types/reporting';
import { isTimestampInRange } from './dateRangeUtils';

// -------------------------------------------------------------
// 1. Sales Report
// -------------------------------------------------------------
export interface SalesReportData {
  grossSales: number;
  totalRefunded: number;
  netSales: number;
  totalDiscounts: number;
  totalTax: number;
  orderCount: number;
  avgOrderValue: number;
  totalItemsSold: number;
  categoryBreakdown: Array<{
    category: string;
    revenue: number;
    units: number;
    percent: number;
  }>;
  transactions: Transaction[];
}

export function calculateSalesReport(
  transactions: Transaction[],
  range: DateRange,
  locationId?: string
): SalesReportData {
  const filtered = transactions.filter((tx) => {
    if (locationId && locationId !== 'all' && tx.locationId !== locationId) return false;
    return isTimestampInRange(tx.timestamp, range);
  });

  const grossSales = filtered.reduce((sum, tx) => sum + tx.total, 0);
  const totalRefunded = filtered.reduce((sum, tx) => sum + (tx.totalRefunded || 0), 0);
  const netSales = Math.max(0, grossSales - totalRefunded);
  const totalDiscounts = filtered.reduce((sum, tx) => sum + (tx.discountAmount || 0), 0);
  const totalTax = filtered.reduce((sum, tx) => sum + (tx.taxAmount || 0), 0);
  const orderCount = filtered.length;
  const avgOrderValue = orderCount > 0 ? grossSales / orderCount : 0;

  let totalItemsSold = 0;
  const catMap: Record<string, { revenue: number; units: number }> = {};

  filtered.forEach((tx) => {
    tx.items.forEach((item) => {
      totalItemsSold += item.quantity;
      const cat = item.productId ? 'Retail' : 'General'; // fallback
      const rev = item.unitPrice * (1 - (item.discountPercent || 0) / 100) * item.quantity;
      if (!catMap[cat]) catMap[cat] = { revenue: 0, units: 0 };
      catMap[cat].revenue += rev;
      catMap[cat].units += item.quantity;
    });
  });

  const categoryBreakdown = Object.entries(catMap).map(([category, d]) => ({
    category,
    revenue: d.revenue,
    units: d.units,
    percent: grossSales > 0 ? (d.revenue / grossSales) * 100 : 0,
  }));

  return {
    grossSales,
    totalRefunded,
    netSales,
    totalDiscounts,
    totalTax,
    orderCount,
    avgOrderValue,
    totalItemsSold,
    categoryBreakdown,
    transactions: filtered,
  };
}

// -------------------------------------------------------------
// 2. Stock Report
// -------------------------------------------------------------
export interface StockReportItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  buyingPrice: number;
  sellingPrice: number;
  stock: number;
  reorderPoint: number;
  valuationCost: number;
  valuationRetail: number;
  potentialProfit: number;
  marginPercent: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export interface StockReportData {
  totalSkus: number;
  totalUnits: number;
  totalValuationCost: number;
  totalValuationRetail: number;
  totalLowStockCount: number;
  totalOutOfStockCount: number;
  items: StockReportItem[];
}

export function calculateStockReport(
  products: Product[],
  locationId?: string
): StockReportData {
  let totalUnits = 0;
  let totalValuationCost = 0;
  let totalValuationRetail = 0;
  let totalLowStockCount = 0;
  let totalOutOfStockCount = 0;

  const items: StockReportItem[] = products.map((p) => {
    let stock = 0;
    if (locationId && locationId !== 'all') {
      stock = p.stockByLocation[locationId] || 0;
    } else {
      stock = Object.values(p.stockByLocation || {}).reduce((a, b) => a + b, 0);
    }

    const valuationCost = stock * (p.buyingPrice || 0);
    const valuationRetail = stock * (p.sellingPrice || 0);
    const potentialProfit = Math.max(0, valuationRetail - valuationCost);
    const marginPercent = p.sellingPrice > 0 ? ((p.sellingPrice - p.buyingPrice) / p.sellingPrice) * 100 : 0;

    let status: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
    if (stock <= 0) {
      status = 'out_of_stock';
      totalOutOfStockCount++;
    } else if (stock <= p.reorderPoint) {
      status = 'low_stock';
      totalLowStockCount++;
    }

    totalUnits += stock;
    totalValuationCost += valuationCost;
    totalValuationRetail += valuationRetail;

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      buyingPrice: p.buyingPrice,
      sellingPrice: p.sellingPrice,
      stock,
      reorderPoint: p.reorderPoint,
      valuationCost,
      valuationRetail,
      potentialProfit,
      marginPercent,
      status,
    };
  });

  return {
    totalSkus: products.length,
    totalUnits,
    totalValuationCost,
    totalValuationRetail,
    totalLowStockCount,
    totalOutOfStockCount,
    items,
  };
}

// -------------------------------------------------------------
// 3. Payment Method Report
// -------------------------------------------------------------
export interface PaymentMethodSummary {
  method: string;
  name: string;
  transactionCount: number;
  volume: number;
  percentageOfVolume: number;
  refundVolume: number;
  netVolume: number;
  avgTicket: number;
}

export interface PaymentReportData {
  totalGrossVolume: number;
  totalTransactions: number;
  methods: PaymentMethodSummary[];
}

export function calculatePaymentMethodReport(
  transactions: Transaction[],
  range: DateRange,
  locationId?: string
): PaymentReportData {
  const filtered = transactions.filter((tx) => {
    if (locationId && locationId !== 'all' && tx.locationId !== locationId) return false;
    return isTimestampInRange(tx.timestamp, range);
  });

  const methodMap: Record<string, { count: number; volume: number; refundVolume: number }> = {
    mpesa: { count: 0, volume: 0, refundVolume: 0 },
    cash: { count: 0, volume: 0, refundVolume: 0 },
    card: { count: 0, volume: 0, refundVolume: 0 },
    split: { count: 0, volume: 0, refundVolume: 0 },
  };

  let totalGrossVolume = 0;
  let totalTransactions = filtered.length;

  filtered.forEach((tx) => {
    const m = tx.paymentMethod || 'cash';
    if (!methodMap[m]) {
      methodMap[m] = { count: 0, volume: 0, refundVolume: 0 };
    }
    methodMap[m].count++;
    methodMap[m].volume += tx.total;
    methodMap[m].refundVolume += tx.totalRefunded || 0;
    totalGrossVolume += tx.total;
  });

  const methodNames: Record<string, string> = {
    mpesa: 'M-Pesa STK & Till',
    cash: 'Cash Register Drawer',
    card: 'Card Terminal (Visa/Mastercard)',
    split: 'Split Tender',
  };

  const methods: PaymentMethodSummary[] = Object.entries(methodMap).map(([method, d]) => ({
    method,
    name: methodNames[method] || method.toUpperCase(),
    transactionCount: d.count,
    volume: d.volume,
    percentageOfVolume: totalGrossVolume > 0 ? (d.volume / totalGrossVolume) * 100 : 0,
    refundVolume: d.refundVolume,
    netVolume: Math.max(0, d.volume - d.refundVolume),
    avgTicket: d.count > 0 ? d.volume / d.count : 0,
  }));

  return {
    totalGrossVolume,
    totalTransactions,
    methods,
  };
}

// -------------------------------------------------------------
// 4. Tax / VAT Report
// -------------------------------------------------------------
export interface TaxVatReportData {
  totalGrossInclusive: number;
  totalTaxableSales: number; // 16% VAT items
  totalZeroRatedSales: number; // 0% tax items
  totalVatCollected: number;
  totalNetExclusive: number;
  effectiveTaxRate: number;
  categoryTaxBreakdown: Array<{
    category: string;
    taxRatePercent: number;
    salesVolume: number;
    taxCollected: number;
  }>;
}

export function calculateTaxVatReport(
  transactions: Transaction[],
  products: Product[],
  range: DateRange,
  locationId?: string
): TaxVatReportData {
  const filtered = transactions.filter((tx) => {
    if (locationId && locationId !== 'all' && tx.locationId !== locationId) return false;
    return isTimestampInRange(tx.timestamp, range);
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  let totalGrossInclusive = 0;
  let totalTaxableSales = 0;
  let totalZeroRatedSales = 0;
  let totalVatCollected = 0;

  const categoryTaxMap: Record<string, { rate: number; sales: number; tax: number }> = {};

  filtered.forEach((tx) => {
    totalGrossInclusive += tx.total;
    totalVatCollected += tx.taxAmount || 0;

    tx.items.forEach((item) => {
      const prod = productMap.get(item.productId);
      const taxRate = item.taxRate !== undefined ? item.taxRate : prod ? prod.taxRate : 0.16;
      const itemGross = item.unitPrice * (1 - (item.discountPercent || 0) / 100) * item.quantity;
      const cat = prod?.category || 'General';

      if (taxRate > 0) {
        totalTaxableSales += itemGross;
      } else {
        totalZeroRatedSales += itemGross;
      }

      const itemTax = itemGross * (taxRate / (1 + taxRate));

      if (!categoryTaxMap[cat]) {
        categoryTaxMap[cat] = { rate: taxRate * 100, sales: 0, tax: 0 };
      }
      categoryTaxMap[cat].sales += itemGross;
      categoryTaxMap[cat].tax += itemTax;
    });
  });

  const totalNetExclusive = Math.max(0, totalGrossInclusive - totalVatCollected);
  const effectiveTaxRate = totalNetExclusive > 0 ? (totalVatCollected / totalNetExclusive) * 100 : 0;

  const categoryTaxBreakdown = Object.entries(categoryTaxMap).map(([category, d]) => ({
    category,
    taxRatePercent: d.rate,
    salesVolume: d.sales,
    taxCollected: d.tax,
  }));

  return {
    totalGrossInclusive,
    totalTaxableSales,
    totalZeroRatedSales,
    totalVatCollected,
    totalNetExclusive,
    effectiveTaxRate,
    categoryTaxBreakdown,
  };
}

// -------------------------------------------------------------
// 5. Profit & Margin Report
// -------------------------------------------------------------
export interface ProductMarginRow {
  productId: string;
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPercent: number;
}

export interface ProfitMarginReportData {
  totalRevenue: number;
  totalCogs: number;
  totalGrossProfit: number;
  overallGrossMargin: number;
  categoryMargins: Array<{
    category: string;
    revenue: number;
    cogs: number;
    grossProfit: number;
    marginPercent: number;
  }>;
  productMargins: ProductMarginRow[];
}

export function calculateProfitMarginReport(
  transactions: Transaction[],
  products: Product[],
  range: DateRange,
  locationId?: string
): ProfitMarginReportData {
  const filtered = transactions.filter((tx) => {
    if (locationId && locationId !== 'all' && tx.locationId !== locationId) return false;
    return isTimestampInRange(tx.timestamp, range);
  });

  const productMap = new Map(products.map((p) => [p.id, p]));
  const itemSummary: Record<string, { name: string; category: string; units: number; revenue: number; cogs: number }> = {};
  const catSummary: Record<string, { revenue: number; cogs: number }> = {};

  let totalRevenue = 0;
  let totalCogs = 0;

  filtered.forEach((tx) => {
    tx.items.forEach((item) => {
      const prod = productMap.get(item.productId);
      const buyingPrice = prod?.buyingPrice ?? (item.unitPrice * 0.75); // fallback 75% cost
      const itemRev = item.unitPrice * (1 - (item.discountPercent || 0) / 100) * item.quantity;
      const itemCogs = buyingPrice * item.quantity;
      const cat = prod?.category || 'General';

      totalRevenue += itemRev;
      totalCogs += itemCogs;

      if (!itemSummary[item.productId]) {
        itemSummary[item.productId] = {
          name: item.productName,
          category: cat,
          units: 0,
          revenue: 0,
          cogs: 0,
        };
      }
      itemSummary[item.productId].units += item.quantity;
      itemSummary[item.productId].revenue += itemRev;
      itemSummary[item.productId].cogs += itemCogs;

      if (!catSummary[cat]) {
        catSummary[cat] = { revenue: 0, cogs: 0 };
      }
      catSummary[cat].revenue += itemRev;
      catSummary[cat].cogs += itemCogs;
    });
  });

  const totalGrossProfit = totalRevenue - totalCogs;
  const overallGrossMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

  const categoryMargins = Object.entries(catSummary).map(([category, d]) => {
    const profit = d.revenue - d.cogs;
    return {
      category,
      revenue: d.revenue,
      cogs: d.cogs,
      grossProfit: profit,
      marginPercent: d.revenue > 0 ? (profit / d.revenue) * 100 : 0,
    };
  });

  const productMargins: ProductMarginRow[] = Object.entries(itemSummary).map(([productId, d]) => {
    const grossProfit = d.revenue - d.cogs;
    return {
      productId,
      name: d.name,
      category: d.category,
      unitsSold: d.units,
      revenue: d.revenue,
      cogs: d.cogs,
      grossProfit,
      marginPercent: d.revenue > 0 ? (grossProfit / d.revenue) * 100 : 0,
    };
  }).sort((a, b) => b.grossProfit - a.grossProfit);

  return {
    totalRevenue,
    totalCogs,
    totalGrossProfit,
    overallGrossMargin,
    categoryMargins,
    productMargins,
  };
}

// -------------------------------------------------------------
// 6. Shift / Till Report (Z-Report)
// -------------------------------------------------------------
export interface ShiftTillReportData {
  reportDate: string;
  openingFloat: number;
  cashSalesTendered: number;
  cashRefundsGiven: number;
  expectedCashInDrawer: number;
  actualCountedCash: number;
  variance: number;
  mpesaVolume: number;
  cardVolume: number;
  totalRevenue: number;
  totalTransactionsCount: number;
  cashierShifts: Array<{
    cashierName: string;
    shiftStart: string;
    transactionCount: number;
    totalHandled: number;
  }>;
}

export function calculateShiftTillReport(
  transactions: Transaction[],
  cashiers: Cashier[],
  range: DateRange,
  locationId?: string
): ShiftTillReportData {
  const filtered = transactions.filter((tx) => {
    if (locationId && locationId !== 'all' && tx.locationId !== locationId) return false;
    return isTimestampInRange(tx.timestamp, range);
  });

  const openingFloat = 5000; // standard cash drawer float
  let cashSalesTendered = 0;
  let cashRefundsGiven = 0;
  let mpesaVolume = 0;
  let cardVolume = 0;

  const cashierMap: Record<string, { name: string; count: number; total: number; shiftStart: string }> = {};

  cashiers.forEach((c) => {
    cashierMap[c.id] = {
      name: c.name,
      count: 0,
      total: 0,
      shiftStart: c.shiftStartedAt || new Date().toISOString(),
    };
  });

  filtered.forEach((tx) => {
    if (tx.paymentMethod === 'cash') {
      cashSalesTendered += tx.total;
    } else if (tx.paymentMethod === 'mpesa') {
      mpesaVolume += tx.total;
    } else if (tx.paymentMethod === 'card') {
      cardVolume += tx.total;
    }

    if (tx.totalRefunded && tx.paymentMethod === 'cash') {
      cashRefundsGiven += tx.totalRefunded;
    }

    const cid = tx.cashierId || 'cash-01';
    if (!cashierMap[cid]) {
      cashierMap[cid] = {
        name: tx.cashierName || 'Cashier',
        count: 0,
        total: 0,
        shiftStart: new Date(Date.now() - 4 * 3600000).toISOString(),
      };
    }
    cashierMap[cid].count++;
    cashierMap[cid].total += tx.total;
  });

  const expectedCashInDrawer = openingFloat + cashSalesTendered - cashRefundsGiven;
  const actualCountedCash = expectedCashInDrawer; // Zero discrepancy default
  const variance = actualCountedCash - expectedCashInDrawer;

  const cashierShifts = Object.values(cashierMap)
    .filter((c) => c.count > 0)
    .map((c) => ({
      cashierName: c.name,
      shiftStart: c.shiftStart,
      transactionCount: c.count,
      totalHandled: c.total,
    }));

  return {
    reportDate: new Date().toLocaleDateString(),
    openingFloat,
    cashSalesTendered,
    cashRefundsGiven,
    expectedCashInDrawer,
    actualCountedCash,
    variance,
    mpesaVolume,
    cardVolume,
    totalRevenue: cashSalesTendered + mpesaVolume + cardVolume,
    totalTransactionsCount: filtered.length,
    cashierShifts,
  };
}

// -------------------------------------------------------------
// 7. Refund / Void / Return Report
// -------------------------------------------------------------
export interface RefundVoidReportData {
  totalRefundAmount: number;
  totalRefundTransactions: number;
  refundRatePercent: number;
  reasonBreakdown: Array<{
    reason: string;
    count: number;
    amount: number;
  }>;
  itemizedRefunds: Array<{
    id: string;
    receiptNumber: string;
    timestamp: string;
    cashierName: string;
    productName: string;
    amount: number;
    reason: string;
  }>;
}

export function calculateRefundVoidReport(
  transactions: Transaction[],
  range: DateRange,
  locationId?: string
): RefundVoidReportData {
  const filtered = transactions.filter((tx) => {
    if (locationId && locationId !== 'all' && tx.locationId !== locationId) return false;
    return isTimestampInRange(tx.timestamp, range);
  });

  const grossSales = filtered.reduce((s, tx) => s + tx.total, 0);

  let totalRefundAmount = 0;
  let totalRefundTransactions = 0;
  const reasonMap: Record<string, { count: number; amount: number }> = {};
  const itemizedRefunds: RefundVoidReportData['itemizedRefunds'] = [];

  filtered.forEach((tx) => {
    if (tx.status === 'refunded' || tx.status === 'partially_refunded' || (tx.totalRefunded && tx.totalRefunded > 0)) {
      totalRefundTransactions++;
      const refAmount = tx.totalRefunded || tx.total;
      totalRefundAmount += refAmount;

      const reason = tx.refunds?.[0]?.refundReason || 'Customer Exchange / Defect';
      if (!reasonMap[reason]) {
        reasonMap[reason] = { count: 0, amount: 0 };
      }
      reasonMap[reason].count++;
      reasonMap[reason].amount += refAmount;

      itemizedRefunds.push({
        id: tx.id,
        receiptNumber: tx.receiptNumber,
        timestamp: tx.timestamp,
        cashierName: tx.cashierName,
        productName: tx.items.map((i) => i.productName).join(', ') || 'Various items',
        amount: refAmount,
        reason,
      });
    }
  });

  const reasonBreakdown = Object.entries(reasonMap).map(([reason, d]) => ({
    reason,
    count: d.count,
    amount: d.amount,
  }));

  const refundRatePercent = grossSales > 0 ? (totalRefundAmount / grossSales) * 100 : 0;

  return {
    totalRefundAmount,
    totalRefundTransactions,
    refundRatePercent,
    reasonBreakdown,
    itemizedRefunds,
  };
}

// -------------------------------------------------------------
// 8. CSV Export Utility (RFC 4180 Compliant)
// -------------------------------------------------------------
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  const formatCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(formatCell).join(','),
    ...rows.map((row) => row.map(formatCell).join(',')),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
