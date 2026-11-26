import {
  Location,
  PaymentMethod,
  Product,
  ShiftSession,
  Transaction,
} from '../types';
import {
  AnalyticsDailyRollup,
  AnalyticsTarget,
  BranchBenchmarkRow,
  BranchTargetScorecardRow,
  CategoryProfitabilityRow,
  DateRange,
  ExecutivePLSummary,
  MonthlyTargetPacing,
  SkuProfitabilityRow,
  TenderMixRow,
} from '../types/reporting';
import { getPreviousEquivalentRange, isTimestampInRange } from './dateRangeUtils';
import { triggerCsvDownload } from './inventoryCsv';

export function toLocalDateKey(input: string | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPeriodKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function sanitizeRollupSegment(seg: string): string {
  return String(seg || 'unknown').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 48);
}

export function makeRollupDocId(businessId: string, locationId: string, dateKey: string): string {
  return `${sanitizeRollupSegment(businessId)}__${sanitizeRollupSegment(locationId)}__${dateKey}`;
}

export function makeTargetDocId(businessId: string, locationId: string, periodKey: string): string {
  return `${sanitizeRollupSegment(businessId)}__${sanitizeRollupSegment(locationId)}__${periodKey}`;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function calcTransactionRefundTotal(tx: Transaction): number {
  if (typeof tx.totalRefunded === 'number' && !isNaN(tx.totalRefunded)) {
    return Math.max(0, tx.totalRefunded);
  }
  if (Array.isArray(tx.refunds) && tx.refunds.length > 0) {
    return tx.refunds.reduce((s, r) => s + (r.totalRefund || 0), 0);
  }
  return 0;
}

export function calcTransactionDiscountsTotal(tx: Transaction): number {
  if (typeof tx.discountAmount === 'number' && tx.discountAmount > 0) {
    return tx.discountAmount;
  }
  let lineDisc = 0;
  for (const it of tx.items || []) {
    if (it.discountType === 'flat' && typeof it.discountAmount === 'number') {
      lineDisc += Math.max(0, it.discountAmount);
    } else if ((it.discountPercent || 0) > 0) {
      lineDisc += (it.unitPrice * it.quantity * it.discountPercent) / 100;
    }
  }
  return round2(lineDisc);
}

export function resolveItemUnitCost(
  item: { productId: string; unitCost?: number },
  productMap: Map<string, Product>
): { unitCost: number; hasCostData: boolean } {
  if (typeof item.unitCost === 'number' && item.unitCost > 0) {
    return { unitCost: item.unitCost, hasCostData: true };
  }
  const prod = productMap.get(item.productId);
  if (prod && typeof prod.buyingPrice === 'number' && prod.buyingPrice > 0) {
    return { unitCost: prod.buyingPrice, hasCostData: true };
  }
  return { unitCost: 0, hasCostData: false };
}

export function computeTransactionFinancials(
  tx: Transaction,
  productMap: Map<string, Product>
): {
  grossSales: number;
  refundsTotal: number;
  discountsTotal: number;
  netSales: number;
  taxTotal: number;
  cogsTotal: number;
  grossProfit: number;
  uncostedRevenue: number;
  unitsSold: number;
} {
  const grossSales = tx.total || 0;
  const refundsTotal = calcTransactionRefundTotal(tx);
  const discountsTotal = calcTransactionDiscountsTotal(tx);
  const netSales = Math.max(0, grossSales - refundsTotal);

  const refundedRatio = grossSales > 0 ? Math.min(1, refundsTotal / grossSales) : 0;
  const taxRefunded = Array.isArray(tx.refunds)
    ? tx.refunds.reduce((s, r) => s + (r.taxRefund || 0), 0)
    : (tx.taxAmount || 0) * refundedRatio;
  const taxTotal = Math.max(0, (tx.taxAmount || 0) - taxRefunded);

  // Refunded units per productId so returned goods do not inflate net COGS
  const refundedQtyByProduct = new Map<string, number>();
  for (const ref of tx.refunds || []) {
    for (const ri of ref.items || []) {
      refundedQtyByProduct.set(
        ri.productId,
        (refundedQtyByProduct.get(ri.productId) || 0) + (ri.quantity || 0)
      );
    }
  }

  let cogsTotal = 0;
  let uncostedRevenue = 0;
  let unitsSold = 0;

  for (const item of tx.items || []) {
    const refundedQty = refundedQtyByProduct.get(item.productId) || 0;
    const netQty = Math.max(0, (item.quantity || 0) - refundedQty);
    unitsSold += netQty;
    if (netQty <= 0) continue;

    const { unitCost, hasCostData } = resolveItemUnitCost(item, productMap);
    const lineNetRatio = item.quantity > 0 ? netQty / item.quantity : 0;
    const disc =
      item.discountType === 'flat' && typeof item.discountAmount === 'number'
        ? Math.max(0, item.discountAmount)
        : (item.unitPrice * item.quantity * (item.discountPercent || 0)) / 100;
    const lineNetRevenue = Math.max(0, (item.unitPrice * item.quantity - disc) * lineNetRatio);

    if (hasCostData) {
      cogsTotal += unitCost * netQty;
    } else {
      uncostedRevenue += lineNetRevenue;
    }
  }

  // Revenue ex VAT vs COGS = clean retail gross profit when pricing is inclusive/exclusive
  const revenueExTax = Math.max(0, netSales - taxTotal);
  const grossProfit = revenueExTax - cogsTotal;

  return {
    grossSales: round2(grossSales),
    refundsTotal: round2(refundsTotal),
    discountsTotal: round2(discountsTotal),
    netSales: round2(netSales),
    taxTotal: round2(taxTotal),
    cogsTotal: round2(cogsTotal),
    grossProfit: round2(grossProfit),
    uncostedRevenue: round2(uncostedRevenue),
    unitsSold,
  };
}

export function extractTenderBreakdown(tx: Transaction): {
  mpesa: number;
  cash: number;
  card: number;
  storeCredit: number;
} {
  let mpesa = 0;
  let cash = 0;
  let card = 0;
  let storeCredit = 0;
  const netFactor =
    tx.total > 0 ? Math.max(0, (tx.total - calcTransactionRefundTotal(tx)) / tx.total) : 1;

  const applyMethod = (m: PaymentMethod | string, amt: number) => {
    const val = amt * netFactor;
    if (m === 'mpesa') mpesa += val;
    else if (m === 'cash') cash += val;
    else if (m === 'card') card += val;
    else if (m === 'store_credit') storeCredit += val;
  };

  if (tx.paymentMethod === 'split') {
    if (tx.paymentDetails?.splitBreakdown && tx.paymentDetails.splitBreakdown.length > 0) {
      for (const b of tx.paymentDetails.splitBreakdown) {
        applyMethod(b.method, b.amount || 0);
      }
    } else {
      const cashPart = Math.min(tx.total, tx.paymentDetails?.cashTendered || 0);
      const creditPart = Math.min(Math.max(0, tx.total - cashPart), tx.storeCreditUsed || 0);
      const restPart = Math.max(0, tx.total - cashPart - creditPart);
      applyMethod('cash', cashPart);
      applyMethod('store_credit', creditPart);
      applyMethod('mpesa', restPart);
    }
  } else {
    applyMethod(tx.paymentMethod, tx.total || 0);
  }

  return {
    mpesa: round2(mpesa),
    cash: round2(cash),
    card: round2(card),
    storeCredit: round2(storeCredit),
  };
}

/**
 * Deterministically constructs daily rollup snapshots keyed by
 * `{businessId}__{locationId}__{YYYY-MM-DD}` from tenant transactions, shifts, and catalog.
 */
export function buildDailyRollupsFromData(params: {
  businessId: string;
  transactions: Transaction[];
  products: Product[];
  shifts: ShiftSession[];
  locations: Location[];
}): AnalyticsDailyRollup[] {
  const { businessId, transactions, products, shifts, locations } = params;
  if (!businessId) return [];

  const productMap = new Map<string, Product>();
  for (const p of products) productMap.set(p.id, p);

  const locationNameMap = new Map<string, string>();
  for (const l of locations) locationNameMap.set(l.id, l.name);

  const map = new Map<string, AnalyticsDailyRollup>();
  const nowIso = new Date().toISOString();

  const getOrCreate = (locationId: string, locationName: string, dateKey: string): AnalyticsDailyRollup => {
    const id = makeRollupDocId(businessId, locationId, dateKey);
    const existing = map.get(id);
    if (existing) return existing;
    const created: AnalyticsDailyRollup = {
      id,
      businessId,
      locationId,
      locationName: locationName || locationNameMap.get(locationId) || 'Main Branch',
      dateKey,
      grossSales: 0,
      refundsTotal: 0,
      discountsTotal: 0,
      netSales: 0,
      taxTotal: 0,
      cogsTotal: 0,
      grossProfit: 0,
      operatingExpenses: 0,
      transactionCount: 0,
      unitsSold: 0,
      mpesaTotal: 0,
      cashTotal: 0,
      cardTotal: 0,
      storeCreditTotal: 0,
      uncostedRevenue: 0,
      updatedAt: nowIso,
    };
    map.set(id, created);
    return created;
  };

  for (const tx of transactions) {
    if (tx.businessId && tx.businessId !== businessId) continue;
    const dateKey = toLocalDateKey(tx.timestamp);
    if (!dateKey) continue;
    const locId = tx.locationId || 'loc-main';
    const bucket = getOrCreate(locId, tx.locationName, dateKey);
    const fin = computeTransactionFinancials(tx, productMap);
    const tender = extractTenderBreakdown(tx);

    bucket.grossSales = round2(bucket.grossSales + fin.grossSales);
    bucket.refundsTotal = round2(bucket.refundsTotal + fin.refundsTotal);
    bucket.discountsTotal = round2(bucket.discountsTotal + fin.discountsTotal);
    bucket.netSales = round2(bucket.netSales + fin.netSales);
    bucket.taxTotal = round2(bucket.taxTotal + fin.taxTotal);
    bucket.cogsTotal = round2(bucket.cogsTotal + fin.cogsTotal);
    bucket.grossProfit = round2(bucket.grossProfit + fin.grossProfit);
    bucket.uncostedRevenue = round2(bucket.uncostedRevenue + fin.uncostedRevenue);
    bucket.transactionCount += 1;
    bucket.unitsSold += fin.unitsSold;
    bucket.mpesaTotal = round2(bucket.mpesaTotal + tender.mpesa);
    bucket.cashTotal = round2(bucket.cashTotal + tender.cash);
    bucket.cardTotal = round2(bucket.cardTotal + tender.card);
    bucket.storeCreditTotal = round2(bucket.storeCreditTotal + tender.storeCredit);
  }

  for (const shift of shifts) {
    if (shift.businessId && shift.businessId !== businessId) continue;
    for (const exp of shift.expenses || []) {
      const dateKey = toLocalDateKey(exp.timestamp || shift.openedAt);
      if (!dateKey) continue;
      const locId = exp.locationId || shift.locationId || 'loc-main';
      const bucket = getOrCreate(locId, shift.locationName, dateKey);
      bucket.operatingExpenses = round2(bucket.operatingExpenses + (exp.amount || 0));
    }
  }

  return Array.from(map.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

function getExpensesInRange(
  shifts: ShiftSession[],
  range: DateRange,
  selectedLocationId: string
): number {
  let total = 0;
  for (const shift of shifts) {
    if (selectedLocationId !== 'all' && shift.locationId !== selectedLocationId) continue;
    for (const exp of shift.expenses || []) {
      const expLoc = exp.locationId || shift.locationId;
      if (selectedLocationId !== 'all' && expLoc !== selectedLocationId) continue;
      if (isTimestampInRange(exp.timestamp || shift.openedAt, range)) {
        total += exp.amount || 0;
      }
    }
  }
  return round2(total);
}

interface PeriodBucketTotals {
  grossSales: number;
  refundsTotal: number;
  discountsTotal: number;
  netRevenue: number;
  taxTotal: number;
  cogsTotal: number;
  grossProfit: number;
  operatingExpenses: number;
  ordersCount: number;
  refundedOrdersCount: number;
  unitsSold: number;
  uncostedRevenue: number;
  usedRollupHistory: boolean;
}

/**
 * Aggregates live transactions + persisted daily rollups without double counting:
 * For each (locationId, dateKey), raw live transactions take precedence if any exist
 * for that day/branch in memory; otherwise persisted rollups fill older days beyond the
 * live 30-day window.
 */
function aggregateRangeTotals(params: {
  range: DateRange;
  selectedLocationId: string;
  transactions: Transaction[];
  rollups: AnalyticsDailyRollup[];
  shifts: ShiftSession[];
  productMap: Map<string, Product>;
}): PeriodBucketTotals {
  const { range, selectedLocationId, transactions, rollups, shifts, productMap } = params;

  const liveCoveredDayLocs = new Set<string>();
  const totals: PeriodBucketTotals = {
    grossSales: 0,
    refundsTotal: 0,
    discountsTotal: 0,
    netRevenue: 0,
    taxTotal: 0,
    cogsTotal: 0,
    grossProfit: 0,
    operatingExpenses: 0,
    ordersCount: 0,
    refundedOrdersCount: 0,
    unitsSold: 0,
    uncostedRevenue: 0,
    usedRollupHistory: false,
  };

  for (const tx of transactions) {
    if (selectedLocationId !== 'all' && tx.locationId !== selectedLocationId) continue;
    if (!isTimestampInRange(tx.timestamp, range)) continue;

    const dk = toLocalDateKey(tx.timestamp);
    if (dk) {
      liveCoveredDayLocs.add(`${tx.locationId || 'loc-main'}__${dk}`);
    }

    const fin = computeTransactionFinancials(tx, productMap);
    totals.grossSales += fin.grossSales;
    totals.refundsTotal += fin.refundsTotal;
    totals.discountsTotal += fin.discountsTotal;
    totals.netRevenue += fin.netSales;
    totals.taxTotal += fin.taxTotal;
    totals.cogsTotal += fin.cogsTotal;
    totals.grossProfit += fin.grossProfit;
    totals.uncostedRevenue += fin.uncostedRevenue;
    totals.ordersCount += 1;
    totals.unitsSold += fin.unitsSold;
    if (tx.status === 'refunded' || tx.status === 'partially_refunded') {
      totals.refundedOrdersCount += 1;
    }
  }

  const startKey = toLocalDateKey(range.start);
  const endKey = toLocalDateKey(range.end);

  let rollupExpenses = 0;
  for (const r of rollups) {
    if (selectedLocationId !== 'all' && r.locationId !== selectedLocationId) continue;
    if (!r.dateKey || r.dateKey < startKey || r.dateKey > endKey) continue;
    const key = `${r.locationId || 'loc-main'}__${r.dateKey}`;
    if (liveCoveredDayLocs.has(key)) continue;

    totals.usedRollupHistory = true;
    totals.grossSales += r.grossSales || 0;
    totals.refundsTotal += r.refundsTotal || 0;
    totals.discountsTotal += r.discountsTotal || 0;
    totals.netRevenue += r.netSales || 0;
    totals.taxTotal += r.taxTotal || 0;
    totals.cogsTotal += r.cogsTotal || 0;
    totals.grossProfit += r.grossProfit || 0;
    totals.uncostedRevenue += r.uncostedRevenue || 0;
    totals.ordersCount += r.transactionCount || 0;
    totals.unitsSold += r.unitsSold || 0;
    rollupExpenses += r.operatingExpenses || 0;
  }

  const liveShiftExpenses = getExpensesInRange(shifts, range, selectedLocationId);
  totals.operatingExpenses = Math.max(liveShiftExpenses, rollupExpenses);

  return {
    ...totals,
    grossSales: round2(totals.grossSales),
    refundsTotal: round2(totals.refundsTotal),
    discountsTotal: round2(totals.discountsTotal),
    netRevenue: round2(totals.netRevenue),
    taxTotal: round2(totals.taxTotal),
    cogsTotal: round2(totals.cogsTotal),
    grossProfit: round2(totals.grossProfit),
    operatingExpenses: round2(totals.operatingExpenses),
    uncostedRevenue: round2(totals.uncostedRevenue),
  };
}

function pctDelta(current: number, prior: number): number | null {
  if (prior <= 0) {
    return current > 0 ? 100 : null;
  }
  return round2(((current - prior) / prior) * 100);
}

export function calculateExecutivePLSummary(params: {
  dateRange: DateRange;
  selectedLocationId: string;
  transactions: Transaction[];
  rollups: AnalyticsDailyRollup[];
  products: Product[];
  shifts: ShiftSession[];
}): ExecutivePLSummary {
  const { dateRange, selectedLocationId, transactions, rollups, products, shifts } = params;
  const productMap = new Map<string, Product>();
  for (const p of products) productMap.set(p.id, p);

  const cur = aggregateRangeTotals({
    range: dateRange,
    selectedLocationId,
    transactions,
    rollups,
    shifts,
    productMap,
  });

  const priorRange = dateRange.preset === 'all' ? null : getPreviousEquivalentRange(dateRange);
  const prev = priorRange
    ? aggregateRangeTotals({
        range: priorRange,
        selectedLocationId,
        transactions,
        rollups,
        shifts,
        productMap,
      })
    : null;

  const netExTax = Math.max(0, cur.netRevenue - cur.taxTotal);
  const grossMarginPct = netExTax > 0 ? round2((cur.grossProfit / netExTax) * 100) : 0;
  const netOperatingProfit = round2(cur.grossProfit - cur.operatingExpenses);
  const netOperatingMarginPct = netExTax > 0 ? round2((netOperatingProfit / netExTax) * 100) : 0;
  const avgBasket = cur.ordersCount > 0 ? round2(cur.netRevenue / cur.ordersCount) : 0;

  const costedRev = Math.max(0, cur.netRevenue - cur.uncostedRevenue);
  const costCoveragePct =
    cur.netRevenue > 0 ? Math.min(100, round2((costedRev / cur.netRevenue) * 100)) : 100;

  const priorAvgBasket =
    prev && prev.ordersCount > 0 ? round2(prev.netRevenue / prev.ordersCount) : 0;
  const priorNetExTax = prev ? Math.max(0, prev.netRevenue - prev.taxTotal) : 0;
  const priorMarginPct =
    prev && priorNetExTax > 0 ? round2((prev.grossProfit / priorNetExTax) * 100) : null;

  return {
    grossSales: cur.grossSales,
    refundsTotal: cur.refundsTotal,
    discountsTotal: cur.discountsTotal,
    netRevenue: cur.netRevenue,
    taxTotal: cur.taxTotal,
    cogsTotal: cur.cogsTotal,
    grossProfit: cur.grossProfit,
    grossMarginPct,
    operatingExpenses: cur.operatingExpenses,
    netOperatingProfit,
    netOperatingMarginPct,
    ordersCount: cur.ordersCount,
    refundedOrdersCount: cur.refundedOrdersCount,
    unitsSold: cur.unitsSold,
    avgBasket,
    costCoveragePct,
    uncostedRevenue: cur.uncostedRevenue,
    usedRollupHistory: cur.usedRollupHistory,
    priorNetRevenue: prev?.netRevenue || 0,
    priorGrossProfit: prev?.grossProfit || 0,
    priorOrdersCount: prev?.ordersCount || 0,
    priorAvgBasket,
    netRevenueDeltaPct: prev ? pctDelta(cur.netRevenue, prev.netRevenue) : null,
    grossProfitDeltaPct: prev ? pctDelta(cur.grossProfit, prev.grossProfit) : null,
    ordersDeltaPct: prev ? pctDelta(cur.ordersCount, prev.ordersCount) : null,
    avgBasketDeltaPct: prev ? pctDelta(avgBasket, priorAvgBasket) : null,
    marginDeltaPts:
      priorMarginPct !== null ? round2(grossMarginPct - priorMarginPct) : null,
  };
}

export function calculateSkuProfitability(params: {
  transactions: Transaction[];
  products: Product[];
  dateRange: DateRange;
  selectedLocationId: string;
}): SkuProfitabilityRow[] {
  const { transactions, products, dateRange, selectedLocationId } = params;
  const productMap = new Map<string, Product>();
  for (const p of products) productMap.set(p.id, p);

  const windowDays = Math.max(
    1,
    Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (24 * 60 * 60 * 1000))
  );

  const acc = new Map<
    string,
    {
      productId: string;
      sku: string;
      name: string;
      category: string;
      unit: string;
      unitsSold: number;
      unitsRefunded: number;
      grossRevenue: number;
      discountsGiven: number;
      refundAmount: number;
      taxAdjustedOut: number;
      cogsTotal: number;
      hasCostData: boolean;
    }
  >();

  for (const tx of transactions) {
    if (selectedLocationId !== 'all' && tx.locationId !== selectedLocationId) continue;
    if (!isTimestampInRange(tx.timestamp, dateRange)) continue;

    const refundedQtyMap = new Map<string, { qty: number; amount: number }>();
    for (const ref of tx.refunds || []) {
      for (const ri of ref.items || []) {
        const cur = refundedQtyMap.get(ri.productId) || { qty: 0, amount: 0 };
        cur.qty += ri.quantity || 0;
        cur.amount += ri.refundTotalAmount || 0;
        refundedQtyMap.set(ri.productId, cur);
      }
    }

    for (const item of tx.items || []) {
      const prod = productMap.get(item.productId);
      const existing = acc.get(item.productId) || {
        productId: item.productId,
        sku: item.sku || prod?.sku || '—',
        name: item.productName || prod?.name || 'Unnamed Product',
        category: prod?.category || 'Uncategorized',
        unit: prod?.unit || 'piece',
        unitsSold: 0,
        unitsRefunded: 0,
        grossRevenue: 0,
        discountsGiven: 0,
        refundAmount: 0,
        taxAdjustedOut: 0,
        cogsTotal: 0,
        hasCostData: false,
      };

      const itemGrossBeforeDisc = (item.unitPrice || 0) * (item.quantity || 0);
      const itemDiscount =
        item.discountType === 'flat' && typeof item.discountAmount === 'number'
          ? Math.max(0, item.discountAmount)
          : (itemGrossBeforeDisc * (item.discountPercent || 0)) / 100;
      const lineAfterDisc = Math.max(0, itemGrossBeforeDisc - itemDiscount);

      const refInfo = refundedQtyMap.get(item.productId) || { qty: 0, amount: 0 };
      const netQty = Math.max(0, (item.quantity || 0) - refInfo.qty);
      const { unitCost, hasCostData } = resolveItemUnitCost(item, productMap);

      const netLineIncTax = Math.max(0, lineAfterDisc - refInfo.amount);
      const rate = typeof item.taxRate === 'number' && item.taxRate > 0 ? item.taxRate : 0;
      const lineTax = rate > 0 ? netLineIncTax - netLineIncTax / (1 + rate) : 0;

      existing.unitsSold += item.quantity || 0;
      existing.unitsRefunded += refInfo.qty;
      existing.grossRevenue += itemGrossBeforeDisc;
      existing.discountsGiven += itemDiscount;
      existing.refundAmount += refInfo.amount;
      existing.taxAdjustedOut += lineTax;
      if (hasCostData) {
        existing.hasCostData = true;
        existing.cogsTotal += unitCost * netQty;
      }

      acc.set(item.productId, existing);
    }
  }

  const rows: SkuProfitabilityRow[] = [];
  for (const r of acc.values()) {
    const prod = productMap.get(r.productId);
    const netUnitsSold = Math.max(0, r.unitsSold - r.unitsRefunded);
    const netRevenue = Math.max(0, r.grossRevenue - r.discountsGiven - r.refundAmount);
    const netExTax = Math.max(0, netRevenue - r.taxAdjustedOut);
    const grossProfit = netExTax - r.cogsTotal;
    const marginPct = netExTax > 0 ? round2((grossProfit / netExTax) * 100) : 0;

    let stockOnHand = 0;
    if (prod?.stockByLocation) {
      if (selectedLocationId === 'all') {
        stockOnHand = Object.values(prod.stockByLocation).reduce((s, n) => s + (n || 0), 0);
      } else {
        stockOnHand = prod.stockByLocation[selectedLocationId] || 0;
      }
    }

    const dailyVelocity = netUnitsSold / windowDays;
    const daysOfCover =
      dailyVelocity > 0.01 ? Math.round(stockOnHand / dailyVelocity) : null;

    rows.push({
      productId: r.productId,
      sku: r.sku,
      name: r.name,
      category: r.category,
      unit: r.unit,
      unitsSold: r.unitsSold,
      unitsRefunded: r.unitsRefunded,
      netUnitsSold,
      grossRevenue: round2(r.grossRevenue),
      discountsGiven: round2(r.discountsGiven),
      refundAmount: round2(r.refundAmount),
      netRevenue: round2(netRevenue),
      cogsTotal: round2(r.cogsTotal),
      grossProfit: round2(grossProfit),
      marginPct,
      hasCostData: r.hasCostData,
      currentUnitCost: prod?.buyingPrice ?? 0,
      currentSellingPrice: prod?.sellingPrice ?? 0,
      stockOnHand,
      reorderPoint: prod?.reorderPoint ?? 10,
      daysOfCover,
    });
  }

  return rows.sort((a, b) => b.netRevenue - a.netRevenue);
}

export function calculateCategoryProfitability(
  skuRows: SkuProfitabilityRow[]
): CategoryProfitabilityRow[] {
  const totalNet = skuRows.reduce((s, r) => s + r.netRevenue, 0);
  const byCat = new Map<
    string,
    {
      skuIds: Set<string>;
      unitsSold: number;
      netRevenue: number;
      cogsTotal: number;
      grossProfit: number;
      discountsGiven: number;
      refundAmount: number;
      uncostedRevenue: number;
    }
  >();

  for (const r of skuRows) {
    const cat = r.category || 'Uncategorized';
    const cur = byCat.get(cat) || {
      skuIds: new Set<string>(),
      unitsSold: 0,
      netRevenue: 0,
      cogsTotal: 0,
      grossProfit: 0,
      discountsGiven: 0,
      refundAmount: 0,
      uncostedRevenue: 0,
    };
    cur.skuIds.add(r.productId);
    cur.unitsSold += r.netUnitsSold;
    cur.netRevenue += r.netRevenue;
    cur.cogsTotal += r.cogsTotal;
    cur.grossProfit += r.grossProfit;
    cur.discountsGiven += r.discountsGiven;
    cur.refundAmount += r.refundAmount;
    if (!r.hasCostData) {
      cur.uncostedRevenue += r.netRevenue;
    }
    byCat.set(cat, cur);
  }

  const rows: CategoryProfitabilityRow[] = [];
  for (const [category, val] of byCat.entries()) {
    const marginPct = val.netRevenue > 0 ? round2((val.grossProfit / val.netRevenue) * 100) : 0;
    const revenueSharePct = totalNet > 0 ? round2((val.netRevenue / totalNet) * 100) : 0;
    rows.push({
      category,
      skuCount: val.skuIds.size,
      unitsSold: val.unitsSold,
      netRevenue: round2(val.netRevenue),
      cogsTotal: round2(val.cogsTotal),
      grossProfit: round2(val.grossProfit),
      marginPct,
      discountsGiven: round2(val.discountsGiven),
      refundAmount: round2(val.refundAmount),
      revenueSharePct,
      uncostedRevenue: round2(val.uncostedRevenue),
    });
  }

  return rows.sort((a, b) => b.netRevenue - a.netRevenue);
}

export function calculateBranchBenchmarks(params: {
  locations: Location[];
  transactions: Transaction[];
  rollups: AnalyticsDailyRollup[];
  products: Product[];
  shifts: ShiftSession[];
  dateRange: DateRange;
}): BranchBenchmarkRow[] {
  const { locations, transactions, rollups, products, shifts, dateRange } = params;
  const productMap = new Map<string, Product>();
  for (const p of products) productMap.set(p.id, p);

  const rows = locations.map((loc) => {
    const totals = aggregateRangeTotals({
      range: dateRange,
      selectedLocationId: loc.id,
      transactions,
      rollups,
      shifts,
      productMap,
    });
    const netExTax = Math.max(0, totals.netRevenue - totals.taxTotal);
    const marginPct = netExTax > 0 ? round2((totals.grossProfit / netExTax) * 100) : 0;
    const netOperatingProfit = round2(totals.grossProfit - totals.operatingExpenses);
    return {
      locationId: loc.id,
      locationName: loc.name,
      code: loc.code,
      ordersCount: totals.ordersCount,
      netRevenue: totals.netRevenue,
      cogsTotal: totals.cogsTotal,
      grossProfit: totals.grossProfit,
      marginPct,
      operatingExpenses: totals.operatingExpenses,
      netOperatingProfit,
      revenueSharePct: 0,
    };
  });

  const totalRev = rows.reduce((s, r) => s + r.netRevenue, 0);
  return rows
    .map((r) => ({
      ...r,
      revenueSharePct: totalRev > 0 ? round2((r.netRevenue / totalRev) * 100) : 0,
    }))
    .sort((a, b) => b.netRevenue - a.netRevenue);
}

export function calculateTenderMix(params: {
  transactions: Transaction[];
  rollups: AnalyticsDailyRollup[];
  dateRange: DateRange;
  selectedLocationId: string;
}): TenderMixRow[] {
  const { transactions, rollups, dateRange, selectedLocationId } = params;
  const acc: Record<'mpesa' | 'cash' | 'card' | 'store_credit', { amount: number; txCount: number }> = {
    mpesa: { amount: 0, txCount: 0 },
    cash: { amount: 0, txCount: 0 },
    card: { amount: 0, txCount: 0 },
    store_credit: { amount: 0, txCount: 0 },
  };

  const liveCovered = new Set<string>();
  for (const tx of transactions) {
    if (selectedLocationId !== 'all' && tx.locationId !== selectedLocationId) continue;
    if (!isTimestampInRange(tx.timestamp, dateRange)) continue;
    const dk = toLocalDateKey(tx.timestamp);
    if (dk) liveCovered.add(`${tx.locationId || 'loc-main'}__${dk}`);

    const t = extractTenderBreakdown(tx);
    if (t.mpesa > 0) {
      acc.mpesa.amount += t.mpesa;
      acc.mpesa.txCount += 1;
    }
    if (t.cash > 0) {
      acc.cash.amount += t.cash;
      acc.cash.txCount += 1;
    }
    if (t.card > 0) {
      acc.card.amount += t.card;
      acc.card.txCount += 1;
    }
    if (t.storeCredit > 0) {
      acc.store_credit.amount += t.storeCredit;
      acc.store_credit.txCount += 1;
    }
  }

  const startKey = toLocalDateKey(dateRange.start);
  const endKey = toLocalDateKey(dateRange.end);
  for (const r of rollups) {
    if (selectedLocationId !== 'all' && r.locationId !== selectedLocationId) continue;
    if (!r.dateKey || r.dateKey < startKey || r.dateKey > endKey) continue;
    if (liveCovered.has(`${r.locationId || 'loc-main'}__${r.dateKey}`)) continue;
    acc.mpesa.amount += r.mpesaTotal || 0;
    acc.cash.amount += r.cashTotal || 0;
    acc.card.amount += r.cardTotal || 0;
    acc.store_credit.amount += r.storeCreditTotal || 0;
  }

  const total =
    acc.mpesa.amount + acc.cash.amount + acc.card.amount + acc.store_credit.amount;

  const list: TenderMixRow[] = [
    {
      method: 'mpesa',
      label: 'M-Pesa Mobile',
      amount: round2(acc.mpesa.amount),
      sharePct: total > 0 ? round2((acc.mpesa.amount / total) * 100) : 0,
      txCount: acc.mpesa.txCount,
    },
    {
      method: 'cash',
      label: 'Cash Drawer',
      amount: round2(acc.cash.amount),
      sharePct: total > 0 ? round2((acc.cash.amount / total) * 100) : 0,
      txCount: acc.cash.txCount,
    },
    {
      method: 'card',
      label: 'Card / PDQ',
      amount: round2(acc.card.amount),
      sharePct: total > 0 ? round2((acc.card.amount / total) * 100) : 0,
      txCount: acc.card.txCount,
    },
    {
      method: 'store_credit',
      label: 'Store Credit',
      amount: round2(acc.store_credit.amount),
      sharePct: total > 0 ? round2((acc.store_credit.amount / total) * 100) : 0,
      txCount: acc.store_credit.txCount,
    },
  ];

  return list;
}

export interface ExecutiveTrendPoint {
  bucketKey: string;
  label: string;
  fullLabel: string;
  netSales: number;
  grossProfit: number;
  cogsTotal: number;
  marginPct: number;
  orders: number;
  avgBasket: number;
  priorNetSales: number;
}

export function buildExecutiveTrendSeries(params: {
  dateRange: DateRange;
  selectedLocationId: string;
  transactions: Transaction[];
  rollups: AnalyticsDailyRollup[];
  products: Product[];
}): ExecutiveTrendPoint[] {
  const { dateRange, selectedLocationId, transactions, rollups, products } = params;
  const productMap = new Map<string, Product>();
  for (const p of products) productMap.set(p.id, p);

  const durationMs = dateRange.end.getTime() - dateRange.start.getTime();
  const isHourly = durationMs <= 48 * 60 * 60 * 1000;

  if (isHourly) {
    const startMs = dateRange.start.getTime();
    const bucketCount = 24;
    const stepMs = Math.max(60 * 60 * 1000, durationMs / bucketCount);
    const buckets: ExecutiveTrendPoint[] = [];

    for (let i = 0; i < bucketCount; i++) {
      const d = new Date(startMs + i * stepMs);
      const hr = `${String(d.getHours()).padStart(2, '0')}:00`;
      buckets.push({
        bucketKey: `${i}`,
        label: hr,
        fullLabel: `${d.toLocaleDateString()} ${hr}`,
        netSales: 0,
        grossProfit: 0,
        cogsTotal: 0,
        marginPct: 0,
        orders: 0,
        avgBasket: 0,
        priorNetSales: 0,
      });
    }

    for (const tx of transactions) {
      if (selectedLocationId !== 'all' && tx.locationId !== selectedLocationId) continue;
      if (!isTimestampInRange(tx.timestamp, dateRange)) continue;
      const ms = new Date(tx.timestamp).getTime();
      const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((ms - startMs) / stepMs)));
      const fin = computeTransactionFinancials(tx, productMap);
      buckets[idx].netSales += fin.netSales;
      buckets[idx].grossProfit += fin.grossProfit;
      buckets[idx].cogsTotal += fin.cogsTotal;
      buckets[idx].orders += 1;
    }

    const priorRange = getPreviousEquivalentRange(dateRange);
    const priorStartMs = priorRange.start.getTime();
    for (const tx of transactions) {
      if (selectedLocationId !== 'all' && tx.locationId !== selectedLocationId) continue;
      if (!isTimestampInRange(tx.timestamp, priorRange)) continue;
      const ms = new Date(tx.timestamp).getTime();
      const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((ms - priorStartMs) / stepMs)));
      buckets[idx].priorNetSales += Math.max(0, tx.total - calcTransactionRefundTotal(tx));
    }

    return buckets.map((b) => ({
      ...b,
      netSales: round2(b.netSales),
      grossProfit: round2(b.grossProfit),
      cogsTotal: round2(b.cogsTotal),
      priorNetSales: round2(b.priorNetSales),
      marginPct: b.netSales > 0 ? round2((b.grossProfit / b.netSales) * 100) : 0,
      avgBasket: b.orders > 0 ? round2(b.netSales / b.orders) : 0,
    }));
  }

  // Daily buckets (up to 90 days) or monthly aggregation if span > 120 days
  const daysSpan = Math.max(1, Math.ceil(durationMs / (24 * 60 * 60 * 1000)));
  const useMonthly = daysSpan > 120;

  const bucketMap = new Map<string, ExecutiveTrendPoint>();
  const ensureBucket = (key: string, label: string, fullLabel: string) => {
    const existing = bucketMap.get(key);
    if (existing) return existing;
    const pt: ExecutiveTrendPoint = {
      bucketKey: key,
      label,
      fullLabel,
      netSales: 0,
      grossProfit: 0,
      cogsTotal: 0,
      marginPct: 0,
      orders: 0,
      avgBasket: 0,
      priorNetSales: 0,
    };
    bucketMap.set(key, pt);
    return pt;
  };

  if (!useMonthly) {
    const cursor = new Date(dateRange.start);
    cursor.setHours(0, 0, 0, 0);
    const endDay = new Date(dateRange.end);
    endDay.setHours(23, 59, 59, 999);
    while (cursor <= endDay) {
      const dk = toLocalDateKey(cursor);
      const shortLbl = cursor.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      ensureBucket(dk, shortLbl, dk);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const liveDayLocs = new Set<string>();
  for (const tx of transactions) {
    if (selectedLocationId !== 'all' && tx.locationId !== selectedLocationId) continue;
    if (!isTimestampInRange(tx.timestamp, dateRange)) continue;
    const dk = toLocalDateKey(tx.timestamp);
    if (!dk) continue;
    liveDayLocs.add(`${tx.locationId || 'loc-main'}__${dk}`);

    const key = useMonthly ? dk.slice(0, 7) : dk;
    const label = useMonthly
      ? new Date(`${key}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
      : new Date(`${dk}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const b = ensureBucket(key, label, key);
    const fin = computeTransactionFinancials(tx, productMap);
    b.netSales += fin.netSales;
    b.grossProfit += fin.grossProfit;
    b.cogsTotal += fin.cogsTotal;
    b.orders += 1;
  }

  const startKey = toLocalDateKey(dateRange.start);
  const endKey = toLocalDateKey(dateRange.end);
  for (const r of rollups) {
    if (selectedLocationId !== 'all' && r.locationId !== selectedLocationId) continue;
    if (!r.dateKey || r.dateKey < startKey || r.dateKey > endKey) continue;
    if (liveDayLocs.has(`${r.locationId || 'loc-main'}__${r.dateKey}`)) continue;

    const key = useMonthly ? r.dateKey.slice(0, 7) : r.dateKey;
    const label = useMonthly
      ? new Date(`${key}-01T00:00:00`).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
      : new Date(`${r.dateKey}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const b = ensureBucket(key, label, key);
    b.netSales += r.netSales || 0;
    b.grossProfit += r.grossProfit || 0;
    b.cogsTotal += r.cogsTotal || 0;
    b.orders += r.transactionCount || 0;
  }

  // Fill prior period curve mapped by relative bucket index
  const sortedKeys = Array.from(bucketMap.keys()).sort();
  if (dateRange.preset !== 'all' && sortedKeys.length > 0) {
    const priorRange = getPreviousEquivalentRange(dateRange);
    const priorStartMs = priorRange.start.getTime();
    const priorSpanMs = Math.max(1, priorRange.end.getTime() - priorStartMs);
    const priorCovered = new Set<string>();

    for (const tx of transactions) {
      if (selectedLocationId !== 'all' && tx.locationId !== selectedLocationId) continue;
      if (!isTimestampInRange(tx.timestamp, priorRange)) continue;
      const dk = toLocalDateKey(tx.timestamp);
      if (dk) priorCovered.add(`${tx.locationId || 'loc-main'}__${dk}`);
      const frac = Math.min(0.9999, Math.max(0, (new Date(tx.timestamp).getTime() - priorStartMs) / priorSpanMs));
      const idx = Math.floor(frac * sortedKeys.length);
      const target = bucketMap.get(sortedKeys[idx]);
      if (target) {
        target.priorNetSales += Math.max(0, tx.total - calcTransactionRefundTotal(tx));
      }
    }

    const pStartKey = toLocalDateKey(priorRange.start);
    const pEndKey = toLocalDateKey(priorRange.end);
    for (const r of rollups) {
      if (selectedLocationId !== 'all' && r.locationId !== selectedLocationId) continue;
      if (!r.dateKey || r.dateKey < pStartKey || r.dateKey > pEndKey) continue;
      if (priorCovered.has(`${r.locationId || 'loc-main'}__${r.dateKey}`)) continue;
      const ms = new Date(`${r.dateKey}T12:00:00`).getTime();
      const frac = Math.min(0.9999, Math.max(0, (ms - priorStartMs) / priorSpanMs));
      const idx = Math.floor(frac * sortedKeys.length);
      const target = bucketMap.get(sortedKeys[idx]);
      if (target) {
        target.priorNetSales += r.netSales || 0;
      }
    }
  }

  return sortedKeys.map((k) => {
    const b = bucketMap.get(k)!;
    return {
      ...b,
      netSales: round2(b.netSales),
      grossProfit: round2(b.grossProfit),
      cogsTotal: round2(b.cogsTotal),
      priorNetSales: round2(b.priorNetSales),
      marginPct: b.netSales > 0 ? round2((b.grossProfit / b.netSales) * 100) : 0,
      avgBasket: b.orders > 0 ? round2(b.netSales / b.orders) : 0,
    };
  });
}

export function evaluateTargetPacing(
  summary: ExecutivePLSummary,
  target: AnalyticsTarget | undefined
): {
  revenuePct: number;
  marginStatus: 'on_track' | 'watch' | 'behind' | 'unset';
  revenueStatus: 'on_track' | 'watch' | 'behind' | 'unset';
  discountLeakagePct: number;
  discountBreached: boolean;
} {
  if (!target || target.revenueTarget <= 0) {
    return {
      revenuePct: 0,
      marginStatus: 'unset',
      revenueStatus: 'unset',
      discountLeakagePct: summary.grossSales > 0 ? round2((summary.discountsTotal / summary.grossSales) * 100) : 0,
      discountBreached: false,
    };
  }

  const revenuePct = round2((summary.netRevenue / target.revenueTarget) * 100);
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const expectedPacePct = (now.getDate() / daysInMonth) * 100;

  let revenueStatus: 'on_track' | 'watch' | 'behind' = 'on_track';
  if (revenuePct < expectedPacePct * 0.7) revenueStatus = 'behind';
  else if (revenuePct < expectedPacePct * 0.92) revenueStatus = 'watch';

  let marginStatus: 'on_track' | 'watch' | 'behind' = 'on_track';
  if (summary.grossMarginPct < target.grossMarginTargetPct - 5) marginStatus = 'behind';
  else if (summary.grossMarginPct < target.grossMarginTargetPct) marginStatus = 'watch';

  const discountLeakagePct =
    summary.grossSales > 0 ? round2((summary.discountsTotal / summary.grossSales) * 100) : 0;
  const discountBreached =
    target.maxDiscountPct > 0 && discountLeakagePct > target.maxDiscountPct;

  return {
    revenuePct,
    marginStatus,
    revenueStatus,
    discountLeakagePct,
    discountBreached,
  };
}

export function getDaysInPeriodMonth(periodKey: string): {
  year: number;
  monthIndex: number;
  daysInMonth: number;
} {
  const match = /^(\d{4})-(\d{2})$/.exec(String(periodKey || '').trim());
  const fallbackNow = new Date();
  const year = match ? Number(match[1]) : fallbackNow.getFullYear();
  const monthIndex = match
    ? Math.min(11, Math.max(0, Number(match[2]) - 1))
    : fallbackNow.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  return { year, monthIndex, daysInMonth };
}

export function resolveEffectiveTargetForBranch(
  targets: AnalyticsTarget[],
  locationId: string,
  periodKey: string,
  allowStoreFallback: boolean = true
): { target: AnalyticsTarget | null; isStoreFallback: boolean } {
  const exact = targets.find(
    (t) => t.locationId === locationId && t.periodKey === periodKey
  );
  if (exact) {
    return { target: exact, isStoreFallback: false };
  }
  if (allowStoreFallback && locationId !== 'all') {
    const storeAll = targets.find(
      (t) => t.locationId === 'all' && t.periodKey === periodKey
    );
    if (storeAll) {
      return { target: storeAll, isStoreFallback: true };
    }
  }
  return { target: null, isStoreFallback: false };
}

export function calculateMonthlyTargetPacing(params: {
  periodKey: string;
  selectedLocationId: string;
  targets: AnalyticsTarget[];
  transactions: Transaction[];
  rollups: AnalyticsDailyRollup[];
  products: Product[];
  shifts: ShiftSession[];
  now?: Date;
  allowStoreFallback?: boolean;
}): MonthlyTargetPacing {
  const {
    periodKey,
    selectedLocationId,
    targets,
    transactions,
    rollups,
    products,
    shifts,
    now = new Date(),
    allowStoreFallback = true,
  } = params;

  const { year, monthIndex, daysInMonth } = getDaysInPeriodMonth(periodKey);
  const currentMonthKey = getPeriodKey(now);
  const isCurrentMonth = periodKey === currentMonthKey;
  const isPastMonth = periodKey < currentMonthKey;
  const isFutureMonth = periodKey > currentMonthKey;

  const monthStart = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const monthEnd = isCurrentMonth
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    : new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

  const monthRange: DateRange = {
    start: monthStart,
    end: monthEnd,
    label: periodKey,
    preset: 'custom',
  };

  const productMap = new Map<string, Product>();
  for (const p of products) productMap.set(p.id, p);

  const mtdTotals = isFutureMonth
    ? {
        grossSales: 0,
        refundsTotal: 0,
        discountsTotal: 0,
        netRevenue: 0,
        taxTotal: 0,
        cogsTotal: 0,
        grossProfit: 0,
        operatingExpenses: 0,
        ordersCount: 0,
        refundedOrdersCount: 0,
        unitsSold: 0,
        uncostedRevenue: 0,
        usedRollupHistory: false,
      }
    : aggregateRangeTotals({
        range: monthRange,
        selectedLocationId,
        transactions,
        rollups,
        shifts,
        productMap,
      });

  // Calculate today's net revenue for current month run-rate tracking
  const todayDateKey = toLocalDateKey(now);
  let todayNetRevenue = 0;
  if (isCurrentMonth) {
    let coveredTodayLocs = false;
    for (const tx of transactions) {
      if (selectedLocationId !== 'all' && tx.locationId !== selectedLocationId) continue;
      if (toLocalDateKey(tx.timestamp) === todayDateKey) {
        coveredTodayLocs = true;
        todayNetRevenue += computeTransactionFinancials(tx, productMap).netSales;
      }
    }
    if (!coveredTodayLocs) {
      for (const r of rollups) {
        if (selectedLocationId !== 'all' && r.locationId !== selectedLocationId) continue;
        if (r.dateKey === todayDateKey) {
          todayNetRevenue += r.netSales || 0;
        }
      }
    }
    todayNetRevenue = round2(todayNetRevenue);
  }

  const mtdNetRevenue = round2(mtdTotals.netRevenue);
  const mtdGrossSales = round2(mtdTotals.grossSales);
  const mtdDiscountsTotal = round2(mtdTotals.discountsTotal);
  const mtdGrossProfit = round2(mtdTotals.grossProfit);
  const mtdGrossMarginPct =
    mtdNetRevenue > 0 ? round2((mtdGrossProfit / mtdNetRevenue) * 100) : 0;
  const mtdCostCoveragePct =
    mtdNetRevenue > 0
      ? round2(Math.max(0, Math.min(100, ((mtdNetRevenue - mtdTotals.uncostedRevenue) / mtdNetRevenue) * 100)))
      : 100;

  const daysElapsed = isFutureMonth
    ? 0
    : isPastMonth
      ? daysInMonth
      : Math.min(daysInMonth, Math.max(1, now.getDate()));
  const daysRemaining = isFutureMonth
    ? daysInMonth
    : isPastMonth
      ? 0
      : Math.max(1, daysInMonth - daysElapsed + 1); // Remaining days including today

  const { target, isStoreFallback } = resolveEffectiveTargetForBranch(
    targets,
    selectedLocationId,
    periodKey,
    allowStoreFallback
  );

  const discountLeakagePct =
    mtdGrossSales > 0 ? round2((mtdDiscountsTotal / mtdGrossSales) * 100) : 0;

  const actualDailyAvg =
    daysElapsed > 0 ? round2(mtdNetRevenue / daysElapsed) : 0;
  const projectedMonthEnd = isPastMonth
    ? mtdNetRevenue
    : isFutureMonth
      ? 0
      : round2(actualDailyAvg * daysInMonth);

  const hasRevenueTarget = Boolean(target && target.revenueTarget > 0);
  if (!target || target.revenueTarget <= 0) {
    let marginStatus: MonthlyTargetPacing['marginStatus'] = 'unset';
    if (target && target.grossMarginTargetPct > 0 && mtdNetRevenue > 0) {
      if (mtdGrossMarginPct < target.grossMarginTargetPct - 5) marginStatus = 'behind';
      else if (mtdGrossMarginPct < target.grossMarginTargetPct) marginStatus = 'watch';
      else marginStatus = 'on_track';
    }

    let discountStatus: MonthlyTargetPacing['discountStatus'] = 'unset';
    let discountBreached = false;
    if (target && target.maxDiscountPct > 0) {
      if (discountLeakagePct > target.maxDiscountPct) {
        discountStatus = 'breached';
        discountBreached = true;
      } else if (discountLeakagePct >= target.maxDiscountPct * 0.8) {
        discountStatus = 'watch';
      } else {
        discountStatus = 'healthy';
      }
    }

    return {
      periodKey,
      locationId: selectedLocationId,
      target,
      isStoreFallback,
      hasRevenueTarget: false,
      isCurrentMonth,
      isPastMonth,
      isFutureMonth,
      daysInMonth,
      daysElapsed,
      daysRemaining,
      mtdNetRevenue,
      mtdGrossSales,
      mtdDiscountsTotal,
      mtdGrossProfit,
      mtdGrossMarginPct,
      mtdCostCoveragePct,
      todayNetRevenue,
      revenuePct: 0,
      expectedPacePct: round2((daysElapsed / daysInMonth) * 100),
      revenueRemaining: 0,
      actualDailyAvg,
      requiredDailyRunRate: 0,
      baselineDailyTarget: 0,
      projectedMonthEnd,
      revenueStatus: 'unset',
      marginStatus,
      discountLeakagePct,
      discountStatus,
      discountBreached,
    };
  }

  const revenuePct = round2((mtdNetRevenue / target.revenueTarget) * 100);
  const expectedPacePct = round2((daysElapsed / daysInMonth) * 100);
  const revenueRemaining = round2(Math.max(0, target.revenueTarget - mtdNetRevenue));
  const baselineDailyTarget = round2(target.revenueTarget / daysInMonth);

  // Stable intraday daily run-rate: remaining target from start of today divided by remaining days including today
  const mtdBeforeToday = isCurrentMonth
    ? Math.max(0, mtdNetRevenue - todayNetRevenue)
    : mtdNetRevenue;
  const requiredDailyRunRate =
    revenueRemaining <= 0
      ? 0
      : isPastMonth
        ? revenueRemaining
        : round2(Math.max(0, target.revenueTarget - mtdBeforeToday) / Math.max(1, daysRemaining));

  let revenueStatus: MonthlyTargetPacing['revenueStatus'] = 'on_track';
  if (mtdNetRevenue >= target.revenueTarget) {
    revenueStatus = 'achieved';
  } else if (isFutureMonth) {
    revenueStatus = 'on_track';
  } else if (isPastMonth) {
    revenueStatus = revenuePct >= 95 ? 'watch' : 'behind';
  } else if (revenuePct < expectedPacePct * 0.75) {
    revenueStatus = 'behind';
  } else if (revenuePct < expectedPacePct * 0.94) {
    revenueStatus = 'watch';
  }

  let marginStatus: MonthlyTargetPacing['marginStatus'] = 'unset';
  if (target.grossMarginTargetPct > 0) {
    if (mtdGrossMarginPct < target.grossMarginTargetPct - 5) marginStatus = 'behind';
    else if (mtdGrossMarginPct < target.grossMarginTargetPct) marginStatus = 'watch';
    else marginStatus = 'on_track';
  }

  let discountStatus: MonthlyTargetPacing['discountStatus'] = 'unset';
  let discountBreached = false;
  if (target.maxDiscountPct > 0) {
    if (discountLeakagePct > target.maxDiscountPct) {
      discountStatus = 'breached';
      discountBreached = true;
    } else if (discountLeakagePct >= target.maxDiscountPct * 0.8) {
      discountStatus = 'watch';
    } else {
      discountStatus = 'healthy';
    }
  }

  return {
    periodKey,
    locationId: selectedLocationId,
    target,
    isStoreFallback,
    hasRevenueTarget,
    isCurrentMonth,
    isPastMonth,
    isFutureMonth,
    daysInMonth,
    daysElapsed,
    daysRemaining,
    mtdNetRevenue,
    mtdGrossSales,
    mtdDiscountsTotal,
    mtdGrossProfit,
    mtdGrossMarginPct,
    mtdCostCoveragePct,
    todayNetRevenue,
    revenuePct,
    expectedPacePct,
    revenueRemaining,
    actualDailyAvg,
    requiredDailyRunRate,
    baselineDailyTarget,
    projectedMonthEnd,
    revenueStatus,
    marginStatus,
    discountLeakagePct,
    discountStatus,
    discountBreached,
  };
}

export function calculateBranchTargetScorecards(params: {
  periodKey: string;
  locations: Location[];
  targets: AnalyticsTarget[];
  transactions: Transaction[];
  rollups: AnalyticsDailyRollup[];
  products: Product[];
  shifts: ShiftSession[];
  now?: Date;
}): BranchTargetScorecardRow[] {
  const { periodKey, locations, targets, transactions, rollups, products, shifts, now } = params;

  return locations.map((loc) => {
    const explicitTarget =
      targets.find((t) => t.locationId === loc.id && t.periodKey === periodKey) || null;
    const pacing = calculateMonthlyTargetPacing({
      periodKey,
      selectedLocationId: loc.id,
      targets,
      transactions,
      rollups,
      products,
      shifts,
      now,
      allowStoreFallback: false,
    });
    return {
      locationId: loc.id,
      locationName: loc.name,
      code: loc.code,
      target: explicitTarget,
      hasExplicitTarget: Boolean(explicitTarget && explicitTarget.revenueTarget > 0),
      pacing,
    };
  });
}

function escapeCsvCell(val: unknown): string {
  const str = val === null || val === undefined ? '' : String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportBiTableToCsv(params: {
  mode: 'sku_margin' | 'category_pl' | 'ledger';
  skuRows: SkuProfitabilityRow[];
  categoryRows: CategoryProfitabilityRow[];
  transactions: Transaction[];
  productMap: Map<string, Product>;
  includeCostPrice: boolean;
  currency: string;
}): void {
  const { mode, skuRows, categoryRows, transactions, productMap, includeCostPrice, currency } = params;
  const dateTag = new Date().toISOString().split('T')[0];

  if (mode === 'sku_margin') {
    const headers = [
      'SKU',
      'Product Name',
      'Category',
      'Units Sold',
      'Returned Units',
      'Net Units',
      `Gross Revenue (${currency})`,
      `Discounts (${currency})`,
      `Refunds (${currency})`,
      `Net Revenue (${currency})`,
      ...(includeCostPrice
        ? [`COGS (${currency})`, `Gross Profit (${currency})`, 'Margin %']
        : []),
      'Stock On Hand',
      'Days Cover',
    ];
    const rows = skuRows.map((r) => [
      r.sku,
      r.name,
      r.category,
      r.unitsSold,
      r.unitsRefunded,
      r.netUnitsSold,
      r.grossRevenue.toFixed(2),
      r.discountsGiven.toFixed(2),
      r.refundAmount.toFixed(2),
      r.netRevenue.toFixed(2),
      ...(includeCostPrice
        ? [
            r.hasCostData ? r.cogsTotal.toFixed(2) : '0.00',
            r.grossProfit.toFixed(2),
            `${r.marginPct.toFixed(1)}%`,
          ]
        : []),
      r.stockOnHand,
      r.daysOfCover !== null ? `${r.daysOfCover}d` : '—',
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
    triggerCsvDownload(csv, `sokopos-sku-profitability-${dateTag}.csv`);
    return;
  }

  if (mode === 'category_pl') {
    const headers = [
      'Category',
      'Active SKUs',
      'Units Sold',
      `Net Revenue (${currency})`,
      'Revenue Share %',
      `Discounts (${currency})`,
      `Refunds (${currency})`,
      ...(includeCostPrice
        ? [`COGS (${currency})`, `Gross Profit (${currency})`, 'Margin %']
        : []),
    ];
    const rows = categoryRows.map((r) => [
      r.category,
      r.skuCount,
      r.unitsSold,
      r.netRevenue.toFixed(2),
      `${r.revenueSharePct.toFixed(1)}%`,
      r.discountsGiven.toFixed(2),
      r.refundAmount.toFixed(2),
      ...(includeCostPrice
        ? [r.cogsTotal.toFixed(2), r.grossProfit.toFixed(2), `${r.marginPct.toFixed(1)}%`]
        : []),
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
    triggerCsvDownload(csv, `sokopos-category-pl-${dateTag}.csv`);
    return;
  }

  const headers = [
    'Receipt #',
    'Timestamp',
    'Branch',
    'Cashier',
    'Payment Method',
    'Status',
    `Gross (${currency})`,
    `Refunded (${currency})`,
    `Net Sales (${currency})`,
    ...(includeCostPrice ? [`Est COGS (${currency})`, `Gross Profit (${currency})`] : []),
  ];
  const rows = transactions.map((tx) => {
    const fin = computeTransactionFinancials(tx, productMap);
    return [
      tx.receiptNumber,
      tx.timestamp,
      tx.locationName,
      tx.cashierName,
      tx.paymentMethod.toUpperCase(),
      tx.status,
      fin.grossSales.toFixed(2),
      fin.refundsTotal.toFixed(2),
      fin.netSales.toFixed(2),
      ...(includeCostPrice ? [fin.cogsTotal.toFixed(2), fin.grossProfit.toFixed(2)] : []),
    ];
  });
  const csv = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
  triggerCsvDownload(csv, `sokopos-sales-ledger-${dateTag}.csv`);
}
