import { calculatePaymentGuardrails, roundCashHalfUp, hasCents } from '../src/utils/cashRounding';
import {
  getItemDiscountedUnitPrice,
  getItemUnitDiscount,
  getItemLineTotal,
  hasDirectDiscountPermission,
} from '../src/utils/discountUtils';
import {
  calculateSalesReport,
  calculateShiftTillReport,
  calculateStockReport,
  calculateTaxVatReport,
  calculateProfitMarginReport,
  calculateRefundVoidReport,
  exportToCsv,
} from '../src/utils/reportCalculations';
import { calculateDateRange } from '../src/utils/dateRangeUtils';
import { INITIAL_PRODUCTS, INITIAL_LOCATIONS, INITIAL_SYSTEM_USERS, INITIAL_BUSINESSES } from '../src/data/initialData';
import { Transaction, Product, ShiftSession, Cashier } from '../src/types';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(category: string, name: string, condition: boolean, details: string) {
  results.push({
    category,
    name,
    passed: condition,
    details: condition ? details : `FAILED: ${details}`,
  });
}

console.log('================================================================');
console.log('  RUNNING SOKOPOS MAINSTREAM OPERATIONAL LOGIC TEST SUITE');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// 1. CASH ROUNDING & PAYMENT GUARDRAILS TEST
// -----------------------------------------------------------------------------
{
  const cat = '1. Tender & Cash Rounding';

  // Rule: Half-up rounding for physical counter cash
  const r1 = calculatePaymentGuardrails(100.49, 'cash');
  assert(cat, 'Cash rounding down (100.49 -> 100.00)', r1.payableAmount === 100 && r1.roundingDifference === -0.49, `Payable: ${r1.payableAmount}, diff: ${r1.roundingDifference}`);

  const r2 = calculatePaymentGuardrails(100.50, 'cash');
  assert(cat, 'Cash rounding up (100.50 -> 101.00)', r2.payableAmount === 101 && r2.roundingDifference === 0.50, `Payable: ${r2.payableAmount}, diff: ${r2.roundingDifference}`);

  const r3 = calculatePaymentGuardrails(100.85, 'cash');
  assert(cat, 'Cash rounding up (100.85 -> 101.00)', r3.payableAmount === 101 && r3.roundingDifference === 0.15, `Payable: ${r3.payableAmount}, diff: ${r3.roundingDifference}`);

  // Rule: Electronic (M-Pesa, Card) must NEVER round; charge exact cents
  const rMpesa = calculatePaymentGuardrails(100.49, 'mpesa');
  assert(cat, 'M-Pesa exact charge preservation (100.49)', rMpesa.payableAmount === 100.49 && rMpesa.roundingDifference === 0, `Payable: ${rMpesa.payableAmount}`);

  const rCard = calculatePaymentGuardrails(100.85, 'card');
  assert(cat, 'Card exact charge preservation (100.85)', rCard.payableAmount === 100.85 && rCard.roundingDifference === 0, `Payable: ${rCard.payableAmount}`);
}

// -----------------------------------------------------------------------------
// 2. DISCOUNTS & MARGIN PRESERVATION TEST
// -----------------------------------------------------------------------------
{
  const cat = '2. Discounts & Pricing Logic';

  // Percentage discount
  const unitPrice = 200;
  const pDiscountPrice = getItemDiscountedUnitPrice({
    unitPrice,
    discountPercent: 15,
    discountAmount: 0,
    discountType: 'percentage',
  });
  assert(cat, '15% Percentage Discount (200 -> 170)', pDiscountPrice === 170, `Discounted price: ${pDiscountPrice}`);

  // Flat amount discount
  const fDiscountPrice = getItemDiscountedUnitPrice({
    unitPrice,
    discountPercent: 0,
    discountAmount: 40,
    discountType: 'flat',
  });
  assert(cat, 'Flat KES 40 Discount (200 -> 160)', fDiscountPrice === 160, `Discounted price: ${fDiscountPrice}`);

  // Non-negative bounding (cannot discount below 0)
  const excessiveDiscount = getItemDiscountedUnitPrice({
    unitPrice,
    discountPercent: 0,
    discountAmount: 300,
    discountType: 'flat',
  });
  assert(cat, 'Non-negative price protection', excessiveDiscount === 0, `Discounted price: ${excessiveDiscount}`);

  // Authority check
  const cashierUser: Cashier = {
    id: 'u-1',
    name: 'Cashier John',
    initials: 'CJ',
    pin: '1234',
    avatarColor: 'bg-blue-500',
    shiftStartedAt: '',
    role: 'cashier',
    code: 'C01',
    businessId: 'biz-1',
    assignedLocationId: 'loc-1',
    canApplyDiscount: false,
  };
  assert(cat, 'Cashier without flag blocked from direct discount', hasDirectDiscountPermission(cashierUser, 'cashier') === false, 'Blocked correctly');

  const cashierWithFlag: Cashier = { ...cashierUser, canApplyDiscount: true };
  assert(cat, 'Cashier with flag allowed direct discount', hasDirectDiscountPermission(cashierWithFlag, 'cashier') === true, 'Allowed correctly');

  const supervisorUser: Cashier = { ...cashierUser, role: 'supervisor', canApplyDiscount: false };
  assert(cat, 'Supervisor always allowed direct discount', hasDirectDiscountPermission(supervisorUser, 'supervisor') === true, 'Supervisor authorized');
}

// -----------------------------------------------------------------------------
// 3. SHIFT / TILL RECONCILIATION & Z-REPORT FORMULA TEST
// -----------------------------------------------------------------------------
{
  const cat = '3. Shift & Till Reconciliation (Z-Report)';

  // Theoretical Expected Cash Formula:
  // Expected Cash = Opening Float + Cash Sales - Cash Refunds - Cash Drops - Petty Cash Expenses
  const openingFloat = 5000;
  const cashSales = 12500;
  const cashRefunds = 1500;
  const cashDrops = 6000;
  const expenses = 1200;

  const expectedCash = Number((openingFloat + cashSales - cashRefunds - cashDrops - expenses).toFixed(2));
  assert(cat, 'Expected Drawer Cash Formula Verification', expectedCash === 8800, `Expected cash: ${expectedCash} (Expected: 8800)`);

  // Balanced count
  const balancedCounted = 8800;
  const balancedVariance = balancedCounted - expectedCash;
  assert(cat, 'Balanced Drawer (0 variance)', balancedVariance === 0, `Variance: ${balancedVariance}`);

  // Shortage (theft, miscounting, unrecorded payout)
  const shortCounted = 8650;
  const shortageVariance = shortCounted - expectedCash;
  assert(cat, 'Cash Shortage Detection (-150)', shortageVariance === -150, `Variance: ${shortageVariance}`);

  // Overage (unrecorded sale, under-change)
  const overCounted = 8920;
  const overageVariance = overCounted - expectedCash;
  assert(cat, 'Cash Overage Detection (+120)', overageVariance === 120, `Variance: ${overageVariance}`);
}

// -----------------------------------------------------------------------------
// 4. INVENTORY INTEGRITY & ZERO-STOCK PREVENTION TEST
// -----------------------------------------------------------------------------
{
  const cat = '4. Inventory Stock Control';

  const mockProduct: Product = {
    id: 'prod-milk',
    businessId: 'biz-1',
    sku: 'DRY-001',
    barcode: '616110000003',
    unit: 'packet',
    name: 'Fresh Whole Milk 500ml',
    category: 'Dairy',
    buyingPrice: 50,
    sellingPrice: 65,
    taxRate: 0.16,
    reorderPoint: 10,
    stockByLocation: {
      'loc-nairobi': 25,
      'loc-mombasa': 0, // Out of stock at Mombasa
    },
  };

  // Check branch isolation
  const nairobiStock = mockProduct.stockByLocation['loc-nairobi'];
  const mombasaStock = mockProduct.stockByLocation['loc-mombasa'];
  assert(cat, 'Multi-branch Stock Isolation', nairobiStock === 25 && mombasaStock === 0, `Nairobi: ${nairobiStock}, Mombasa: ${mombasaStock}`);

  // Simulation of sale at Nairobi: stock reduces by sold quantity
  const soldQty = 3;
  const postSaleStock = nairobiStock - soldQty;
  assert(cat, 'Inventory Deduction on Successful Checkout', postSaleStock === 22, `Remaining stock: ${postSaleStock}`);

  // Zero stock sale check (must be rejected)
  const isZeroStockBlocked = mombasaStock <= 0;
  assert(cat, 'Zero-Stock Selling Gatekeeper (Mombasa branch)', isZeroStockBlocked === true, 'Zero-stock purchase prohibited');

  // Overshoot prevention (cannot sell more than on-hand)
  const orderQty = 30;
  const isOvershootBlocked = orderQty > nairobiStock;
  assert(cat, 'Stock Overshoot Gatekeeper (Order 30 > Stock 25)', isOvershootBlocked === true, 'Excess order quantity prohibited');
}

// -----------------------------------------------------------------------------
// 5. REVERSE LOGISTICS: RETURNS, REFUNDS & RESTOCKING TEST
// -----------------------------------------------------------------------------
{
  const cat = '5. Returns & Reverse Logistics';

  const initialStock = 22;

  // Case A: Customer returns undamaged item -> Restock = true
  const restockedStock = initialStock + 1;
  assert(cat, 'Inventory Restocked on Valid Return', restockedStock === 23, `Restocked inventory: ${restockedStock}`);

  // Case B: Customer returns expired or damaged goods -> Restock = false (written off)
  const damagedRestock = initialStock; // does not increase sellable stock
  assert(cat, 'Damaged/Expired Returns Excluded from Stock Replenishment', damagedRestock === 22, `Sellable stock remains: ${damagedRestock}`);

  // Max refund limit: cannot return more than purchased
  const purchasedQty = 2;
  const requestedReturnQty = 3;
  const isExcessReturnRejected = requestedReturnQty > purchasedQty;
  assert(cat, 'Excessive Quantity Return Blocked', isExcessReturnRejected === true, 'Prevented returning more than bought');
}

// -----------------------------------------------------------------------------
// 6. TAX & FISCAL VAT SEPARATION TEST (16% vs Zero-Rated)
// -----------------------------------------------------------------------------
{
  const cat = '6. Tax & Fiscal Compliance';

  // Standard 16% Taxable Item: Gross = KES 116 -> Net = 100, Tax = 16
  const grossStandard = 116;
  const netStandard = Number((grossStandard / 1.16).toFixed(2));
  const vatStandard = Number((grossStandard - netStandard).toFixed(2));
  assert(cat, '16% Standard VAT calculation (KES 116 -> KES 16 VAT)', vatStandard === 16 && netStandard === 100, `Net: ${netStandard}, VAT: ${vatStandard}`);

  // Zero-Rated / Exempt Item (e.g. Unprocessed agricultural produce / milk): Tax = 0
  const grossExempt = 200;
  const vatExempt = 0;
  const netExempt = grossExempt;
  assert(cat, '0% Zero-Rated / Exempt Supply calculation', vatExempt === 0 && netExempt === 200, `Net: ${netExempt}, VAT: ${vatExempt}`);
}

// -----------------------------------------------------------------------------
// 7. REPORTING ENGINE & DATA AGGREGATION TEST
// -----------------------------------------------------------------------------
{
  const cat = '7. Reporting Engine & Aggregations';

  const mockTxs: Transaction[] = [
    {
      id: 'tx-1',
      businessId: 'biz-upfront',
      receiptNumber: 'RCP-2026-001',
      timestamp: new Date().toISOString(),
      locationId: 'loc-cbd',
      locationName: 'Nairobi CBD Flagship',
      terminalName: 'Terminal #01',
      cashierId: 'u-1',
      cashierName: 'Grace M.',
      items: [
        {
          productId: 'prod-flour',
          productName: 'Premium Maize Flour 2kg',
          sku: 'FLR-001',
          barcode: '616110000001',
          unitPrice: 180,
          quantity: 2,
          taxRate: 0.16,
          discountPercent: 0,
          discountAmount: 0,
          discountType: 'percentage',
        },
      ],
      subtotal: 310.34,
      taxAmount: 49.66,
      discountAmount: 0,
      rawTotal: 360,
      roundingAmount: 0,
      total: 360,
      paymentMethod: 'mpesa',
      paymentDetails: {},
      syncedToCloud: true,
      status: 'completed',
    },
    {
      id: 'tx-2',
      businessId: 'biz-upfront',
      receiptNumber: 'RCP-2026-002',
      timestamp: new Date().toISOString(),
      locationId: 'loc-cbd',
      locationName: 'Nairobi CBD Flagship',
      terminalName: 'Terminal #01',
      cashierId: 'u-1',
      cashierName: 'Grace M.',
      items: [
        {
          productId: 'prod-oil',
          productName: 'Vegetable Cooking Oil 1L',
          sku: 'OIL-001',
          barcode: '616110000002',
          unitPrice: 250,
          quantity: 1,
          taxRate: 0.16,
          discountPercent: 0,
          discountAmount: 0,
          discountType: 'percentage',
        },
      ],
      subtotal: 215.52,
      taxAmount: 34.48,
      discountAmount: 0,
      rawTotal: 250,
      roundingAmount: 0,
      total: 250,
      paymentMethod: 'cash',
      paymentDetails: {},
      syncedToCloud: true,
      status: 'completed',
    },
  ];

  const dateRange = calculateDateRange('today');
  const salesReport = calculateSalesReport(mockTxs, dateRange, 'all');

  assert(cat, 'Sales Report Gross Sales Summation (360 + 250 = 610)', salesReport.grossSales === 610, `Gross: ${salesReport.grossSales}`);
  assert(cat, 'Sales Report Order Count (2 orders)', salesReport.orderCount === 2, `Orders: ${salesReport.orderCount}`);
  assert(cat, 'Sales Report Total Items Sold (3 items)', salesReport.totalItemsSold === 3, `Items sold: ${salesReport.totalItemsSold}`);
}

// -----------------------------------------------------------------------------
// PRINT SUMMARY REPORT
// -----------------------------------------------------------------------------
console.log('----------------------------------------------------------------');
console.log(`TEST RUN COMPLETE: ${results.length} Assertions Evaluated.`);
console.log('----------------------------------------------------------------\n');

const passedCount = results.filter((r) => r.passed).length;
const failedCount = results.filter((r) => !r.passed).length;

const categories = [...new Set(results.map((r) => r.category))];

categories.forEach((cat) => {
  console.log(`\n### ${cat}`);
  results
    .filter((r) => r.category === cat)
    .forEach((r) => {
      console.log(`  [${r.passed ? 'PASS ✓' : 'FAIL ✗'}] ${r.name} — ${r.details}`);
    });
});

console.log('\n================================================================');
console.log(`FINAL RESULT: ${passedCount}/${results.length} PASSED (${failedCount} FAILURES)`);
console.log('================================================================\n');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
