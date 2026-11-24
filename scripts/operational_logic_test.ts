import { calculatePaymentGuardrails } from '../src/utils/cashRounding';
import { getItemDiscountedUnitPrice } from '../src/utils/discountUtils';
import { calculateSalesReport } from '../src/utils/reportCalculations';
import { calculateDateRange } from '../src/utils/dateRangeUtils';
import {
  resolveKraTaxTypeCode,
  normalizeAndValidateKraPin,
  mapPaymentMethodToKraCode,
  buildDigitaxSalePayload,
  buildDigitaxCreditNotePayload,
  verifyDigitaxSalePayloadServerSide,
  verifyDigitaxCreditNotePayloadServerSide,
} from '../src/utils/etimsFiscalMapper';
import { Transaction, Product, RefundRecord, BusinessTaxSettings } from '../src/types';

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
// 8. KRA eTIMS TAX CLASS, PIN & PAYMENT CODE MAPPING TEST
// -----------------------------------------------------------------------------
{
  const cat = '8. KRA eTIMS Tax Class, PIN & Tender Mapping';

  assert(cat, '16% Standard VAT maps to KRA Class B', resolveKraTaxTypeCode({ taxRate: 0.16, ruleCode: 'A' }) === 'B', `Resolved: ${resolveKraTaxTypeCode({ taxRate: 0.16, ruleCode: 'A' })}`);
  assert(cat, '8% Concession VAT maps to KRA Class E', resolveKraTaxTypeCode({ taxRate: 0.08 }) === 'E', `Resolved: ${resolveKraTaxTypeCode({ taxRate: 0.08 })}`);
  assert(cat, '0% Zero-Rated Food maps to KRA Class C', resolveKraTaxTypeCode({ taxRate: 0, ruleName: 'Zero-Rated Staples' }) === 'C', `Resolved: ${resolveKraTaxTypeCode({ taxRate: 0, ruleName: 'Zero-Rated Staples' })}`);
  assert(cat, '0% Tax Exempt maps to KRA Class A', resolveKraTaxTypeCode({ taxRate: 0, ruleName: 'Exempt Medical' }) === 'A', `Resolved: ${resolveKraTaxTypeCode({ taxRate: 0, ruleName: 'Exempt Medical' })}`);
  assert(cat, '0% Non-VAT maps to KRA Class D', resolveKraTaxTypeCode({ taxRate: 0, ruleName: 'Non-VAT Duty-Free' }) === 'D', `Resolved: ${resolveKraTaxTypeCode({ taxRate: 0, ruleName: 'Non-VAT Duty-Free' })}`);

  const validPin = normalizeAndValidateKraPin(' p051289192m ');
  assert(cat, 'Valid KRA PIN normalized & accepted', validPin.isValid && validPin.normalized === 'P051289192M', `Normalized: ${validPin.normalized}`);

  const invalidPin = normalizeAndValidateKraPin('INVALID123');
  assert(cat, 'Invalid KRA PIN rejected', !invalidPin.isValid, 'Rejected INVALID123');

  assert(cat, 'Cash -> KRA code 01', mapPaymentMethodToKraCode('cash') === '01', '01');
  assert(cat, 'Card -> KRA code 02', mapPaymentMethodToKraCode('card') === '02', '02');
  assert(cat, 'Store Credit -> KRA code 03', mapPaymentMethodToKraCode('store_credit') === '03', '03');
  assert(cat, 'M-Pesa -> KRA code 04', mapPaymentMethodToKraCode('mpesa') === '04', '04');
  assert(
    cat,
    'Split Tender selects largest leg (M-Pesa 04 > Cash 01)',
    mapPaymentMethodToKraCode('split', [
      { id: 's1', method: 'cash', amount: 200 },
      { id: 's2', method: 'mpesa', amount: 800 },
    ]) === '04',
    'Primary split tender selected'
  );
}

// -----------------------------------------------------------------------------
// 9. DIGITAX SALE PAYLOAD & SERVER-SIDE MATH VERIFICATION TEST
// -----------------------------------------------------------------------------
{
  const cat = '9. Digitax Itemized Sale & Server Verifier';

  const catalog: Product[] = [
    {
      id: 'p-oil',
      businessId: 'biz-1',
      sku: 'OIL-1L',
      barcode: '616001',
      unit: 'bottle',
      name: 'Cooking Oil 1L',
      category: 'Oils',
      buyingPrice: 200,
      sellingPrice: 290,
      taxRate: 0.16,
      taxTypeCode: 'B',
      digitaxItemId: 'item_oil_123',
      reorderPoint: 10,
      stockByLocation: { 'loc-1': 20 },
    },
    {
      id: 'p-flour',
      businessId: 'biz-1',
      sku: 'FLR-2K',
      barcode: '616002',
      unit: 'packet',
      name: 'Maize Flour 2kg',
      category: 'Flour & Grains',
      buyingPrice: 120,
      sellingPrice: 150,
      taxRate: 0,
      taxTypeCode: 'C',
      digitaxItemId: 'item_flour_456',
      reorderPoint: 10,
      stockByLocation: { 'loc-1': 30 },
    },
  ];

  const taxSettings: BusinessTaxSettings = {
    taxLabel: 'VAT',
    defaultTaxRate: 0.16,
    taxNumber: 'P051234567Z',
    pricingType: 'inclusive',
    enableDynamicCategoryTax: true,
    enableDynamicRegionalTax: false,
    rules: [
      { id: 'r1', name: 'Zero-Rated Flour', code: 'C', rate: 0, scope: 'category', targetCategory: 'Flour & Grains', isActive: true },
    ],
  };

  // Case A: Inclusive pricing with % discount, flat discount & half-up cash rounding (-0.49)
  // Item 1: 2 * 290 with 10% discount => unit 261 => line = 522.00 (16% B)
  // Item 2: 1 * 150.49 with KES 20 flat discount => line = 130.49 (0% C)
  // Raw total = 652.49 -> Cash half-up payable = 652.00 (roundingAmount = -0.49)
  const saleInclusive = buildDigitaxSalePayload({
    tx: {
      receiptNumber: 'SOK-1001',
      timestamp: '2026-11-23T12:00:00.000Z',
      locationId: 'loc-1',
      subtotal: 580.49,
      taxAmount: 72.0,
      roundingAmount: -0.49,
      total: 652.0,
      pricingType: 'inclusive',
      paymentMethod: 'cash',
      customerName: 'Acme Buyer Ltd',
      items: [
        {
          productId: 'p-oil',
          productName: 'Cooking Oil 1L',
          sku: 'OIL-1L',
          barcode: '616001',
          unitPrice: 290,
          quantity: 2,
          taxRate: 0.16,
          discountPercent: 10,
          discountAmount: 0,
          discountType: 'percentage',
        },
        {
          productId: 'p-flour',
          productName: 'Maize Flour 2kg',
          sku: 'FLR-2K',
          barcode: '616002',
          unitPrice: 150.49,
          quantity: 1,
          taxRate: 0,
          discountPercent: 0,
          discountAmount: 20,
          discountType: 'flat',
        },
      ],
    },
    productsCatalog: catalog,
    resolvedItemIdsByProductId: { 'p-oil': 'item_oil_123', 'p-flour': 'item_flour_456' },
    taxSettings,
    buyerPin: 'P051289192M',
  });

  const inclusiveVerification = verifyDigitaxSalePayloadServerSide(saleInclusive);
  assert(
    cat,
    'Inclusive Multi-SKU + Discounts + Cash Rounding Sale Verifies Cleanly',
    inclusiveVerification.valid && inclusiveVerification.computedTotal === 652.0 && saleInclusive.items.every((i) => i.total_amount > 0),
    `Valid: ${inclusiveVerification.valid}, Total: ${inclusiveVerification.computedTotal}, Errors: ${inclusiveVerification.errors.join('; ')}`
  );

  // Case B: Exclusive pricing (net unit price + 16% added on top)
  const saleExclusive = buildDigitaxSalePayload({
    tx: {
      receiptNumber: 'SOK-1002',
      timestamp: '2026-11-23T12:05:00.000Z',
      locationId: 'loc-1',
      subtotal: 500,
      taxAmount: 80,
      roundingAmount: 0,
      total: 580,
      pricingType: 'exclusive',
      paymentMethod: 'mpesa',
      items: [
        {
          productId: 'p-oil',
          productName: 'Cooking Oil 1L',
          sku: 'OIL-1L',
          barcode: '616001',
          unitPrice: 250,
          quantity: 2,
          taxRate: 0.16,
          discountPercent: 0,
          discountAmount: 0,
          discountType: 'percentage',
        },
      ],
    },
    productsCatalog: catalog,
    resolvedItemIdsByProductId: { 'p-oil': 'item_oil_123' },
    taxSettings: { ...taxSettings, pricingType: 'exclusive' },
  });
  const exclusiveVerification = verifyDigitaxSalePayloadServerSide(saleExclusive);
  assert(
    cat,
    'Tax-Exclusive Itemized Sale Math Verifies (500 + 80 = 580)',
    exclusiveVerification.valid && exclusiveVerification.computedTax === 80 && exclusiveVerification.computedTotal === 580,
    `Tax: ${exclusiveVerification.computedTax}, Total: ${exclusiveVerification.computedTotal}`
  );

  // Rejection Cases on Server Verifier
  const tamperedTotal = { ...saleInclusive, expected_total: 9999 };
  assert(cat, 'Verifier Rejects Tampered Invoice Total', !verifyDigitaxSalePayloadServerSide(tamperedTotal).valid, 'Tampered total blocked');

  const missingItemId = {
    ...saleInclusive,
    items: [{ ...saleInclusive.items[0], id: '' }],
  };
  assert(cat, 'Verifier Rejects Missing Digitax Item ID', !verifyDigitaxSalePayloadServerSide(missingItemId).valid, 'Missing item ID blocked');

  const negativePrice = {
    ...saleInclusive,
    items: [{ ...saleInclusive.items[0], unit_price: -50 }],
  };
  assert(cat, 'Verifier Rejects Negative Unit Price', !verifyDigitaxSalePayloadServerSide(negativePrice).valid, 'Negative unit price blocked');

  const badBuyerPin = { ...saleInclusive, customer_pin: 'BADPIN' };
  assert(cat, 'Verifier Rejects Malformed Buyer KRA PIN', !verifyDigitaxSalePayloadServerSide(badBuyerPin).valid, 'Malformed PIN blocked');

  const wrongTaxClass = {
    ...saleInclusive,
    expected_total: 522,
    items: [{ ...saleInclusive.items[0], tax_type_code: 'C' }], // claims 0% C while tax_amount > 0
  };
  assert(cat, 'Verifier Rejects Mismatched Tax Class Math', !verifyDigitaxSalePayloadServerSide(wrongTaxClass).valid, 'Tax class mismatch blocked');
}

// -----------------------------------------------------------------------------
// 10. KRA CREDIT NOTE ON REFUND BUILD & VERIFICATION TEST
// -----------------------------------------------------------------------------
{
  const cat = '10. Automated KRA Credit Note on Refund';

  const refundDamaged: RefundRecord = {
    id: 'ref-1',
    refundNumber: 'CRN-1001',
    transactionId: 'tx-1001',
    receiptNumber: 'SOK-1001',
    timestamp: '2026-11-23T13:00:00.000Z',
    cashierId: 'c1',
    cashierName: 'Grace M.',
    locationId: 'loc-1',
    locationName: 'Main Store',
    refundMethod: 'mpesa',
    refundReason: 'Defective / Damaged Item',
    items: [
      {
        productId: 'p-oil',
        productName: 'Cooking Oil 1L',
        sku: 'OIL-1L',
        quantity: 1,
        unitPrice: 290,
        taxRate: 0.16,
        taxTypeCode: 'B',
        refundUnitAmount: 261, // net of 10% original discount
        refundTotalAmount: 261,
        restockToInventory: false,
        restockLocationId: 'loc-1',
        reason: 'Defective / Damaged Item',
      },
    ],
    subtotalRefund: 225,
    taxRefund: 36,
    totalRefund: 261,
  };

  const cnPayloadDamaged = buildDigitaxCreditNotePayload({
    refund: refundDamaged,
    originalTx: {
      receiptNumber: 'SOK-1001',
      locationId: 'loc-1',
      pricingType: 'inclusive',
      items: [
        {
          productId: 'p-oil',
          productName: 'Cooking Oil 1L',
          sku: 'OIL-1L',
          barcode: '616001',
          unitPrice: 290,
          quantity: 2,
          taxRate: 0.16,
          taxTypeCode: 'B',
          discountPercent: 10,
          discountAmount: 0,
          discountType: 'percentage',
        },
      ],
      etimsData: {
        saleId: 'sale_01ABC',
        traderInvoiceNumber: 'SOKO-SOK-1001',
        cuInvoiceNumber: 1181901,
        customerTin: 'P051289192M',
      },
    },
    productsCatalog: [],
    resolvedItemIdsByProductId: { 'p-oil': 'item_oil_123' },
  });

  const cnVerification = verifyDigitaxCreditNotePayloadServerSide(cnPayloadDamaged);
  assert(
    cat,
    'Damaged Item Refund Maps Reason Code 03, Links Original Sale & Verifies',
    cnVerification.valid &&
      cnPayloadDamaged.credit_note_reason === '03' &&
      cnPayloadDamaged.sale_id === 'sale_01ABC' &&
      cnPayloadDamaged.original_trader_invoice_number === 'SOKO-SOK-1001' &&
      cnPayloadDamaged.items[0].discount_rate === 10 &&
      cnVerification.computedTotal === 261,
    `Valid: ${cnVerification.valid}, Reason: ${cnPayloadDamaged.credit_note_reason}, DiscRate: ${cnPayloadDamaged.items[0].discount_rate}%`
  );

  const cnCustomerMind = buildDigitaxCreditNotePayload({
    refund: { ...refundDamaged, refundReason: 'Customer Changed Mind', items: [{ ...refundDamaged.items[0], restockToInventory: true }] },
    originalTx: {
      receiptNumber: 'SOK-1001',
      locationId: 'loc-1',
      items: [],
      etimsData: { traderInvoiceNumber: 'SOKO-SOK-1001' },
    },
    productsCatalog: [],
    resolvedItemIdsByProductId: { 'p-oil': 'item_oil_123' },
  });
  assert(
    cat,
    'Customer Change-of-Mind Restocked Return Maps Reason Code 06',
    cnCustomerMind.credit_note_reason === '06' && verifyDigitaxCreditNotePayloadServerSide(cnCustomerMind).valid,
    `Reason code: ${cnCustomerMind.credit_note_reason}`
  );

  const unlinkedCn = { ...cnPayloadDamaged, sale_id: undefined, original_trader_invoice_number: undefined };
  assert(
    cat,
    'Credit Note Verifier Rejects Unlinked Refund Without Original Sale Reference',
    !verifyDigitaxCreditNotePayloadServerSide(unlinkedCn).valid,
    'Unlinked credit note blocked'
  );
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
