import type {
  BusinessTaxSettings,
  CartItem,
  KraTaxTypeCode,
  PaymentMethod,
  Product,
  RefundRecord,
  SplitPaymentTender,
} from '../types';
import { getItemDiscountedUnitPrice } from './discountUtils';
import { resolveDynamicTaxRate } from './taxResolver';

export const VALID_KRA_TAX_CODES: readonly KraTaxTypeCode[] = ['A', 'B', 'C', 'D', 'E'] as const;
export const VALID_CREDIT_NOTE_REASONS = ['01', '02', '03', '04', '05', '06'] as const;
export type KraCreditNoteReasonCode = (typeof VALID_CREDIT_NOTE_REASONS)[number];

export interface DigitaxSaleItemPayload {
  id: string;
  sku?: string;
  name?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  tax_type_code: KraTaxTypeCode;
  tax_rate: number;
  taxable_amount: number;
  tax_amount: number;
  discount_rate: number;
  discount_amount: number;
}

export interface DigitaxSalePayload {
  sale_date: string;
  trader_invoice_number: string;
  payment_type_code: '01' | '02' | '03' | '04' | '05';
  invoice_status_code?: string;
  customer_pin?: string;
  customer_tin?: string;
  customer_name?: string;
  pricing_type?: 'inclusive' | 'exclusive';
  expected_total?: number;
  rounding_adjustment?: number;
  items: DigitaxSaleItemPayload[];
}

export interface DigitaxCreditNoteItemPayload {
  id: string;
  sku?: string;
  name?: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  tax_type_code: KraTaxTypeCode;
  tax_rate: number;
  taxable_amount: number;
  tax_amount: number;
  discount_rate: number;
  discount_amount: number;
}

export interface DigitaxCreditNotePayload {
  return_date: string;
  trader_invoice_number: string;
  original_trader_invoice_number: string;
  sale_id?: string;
  original_invoice_number?: number | string;
  credit_note_reason: KraCreditNoteReasonCode;
  receipt_type_code: 'R';
  customer_pin?: string;
  customer_tin?: string;
  customer_name?: string;
  items: DigitaxCreditNoteItemPayload[];
}

export interface FiscalValidationResult {
  valid: boolean;
  errors: string[];
  computedTotal: number;
  computedTaxable: number;
  computedTax: number;
}

export function roundCurrency2(val: number): number {
  return Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100;
}

/**
 * Validates standard Kenyan KRA PIN format: e.g. A011001890C or P051289192M
 */
export function normalizeAndValidateKraPin(pin?: string | null): {
  normalized?: string;
  isValid: boolean;
} {
  if (!pin || !pin.trim()) {
    return { normalized: undefined, isValid: true };
  }
  const normalized = pin.trim().toUpperCase().replace(/\s+/g, '');
  return {
    normalized,
    isValid: /^[AP]\d{9}[A-Z]$/.test(normalized),
  };
}

/**
 * Resolves authoritative KRA eTIMS tax_type_code:
 * - A: Exempt (0%)
 * - B: Standard VAT (16%)
 * - C: Zero-Rated (0%)
 * - D: Non-VAT (0%)
 * - E: Special / Concession Rate (8%)
 */
export function resolveKraTaxTypeCode(params: {
  taxRate: number;
  ruleCode?: string;
  ruleName?: string;
  explicitTaxTypeCode?: KraTaxTypeCode;
}): KraTaxTypeCode {
  const rate = Number(params.taxRate || 0);
  const explicit = params.explicitTaxTypeCode;

  if (Math.abs(rate - 0.16) < 0.001) {
    return 'B';
  }
  if (Math.abs(rate - 0.08) < 0.001) {
    return 'E';
  }

  if (explicit && ['A', 'C', 'D'].includes(explicit) && rate === 0) {
    return explicit;
  }

  const label = `${params.ruleCode || ''} ${params.ruleName || ''}`.toLowerCase();
  if (rate === 0) {
    if (label.includes('non-vat') || label.includes('non vat') || label.includes('duty-free') || params.ruleCode === 'D') {
      return 'D';
    }
    if (label.includes('exempt')) {
      return 'A';
    }
    return 'C';
  }

  // Fallback for any custom positive VAT rate maps to Standard B
  return rate > 0 ? 'B' : 'C';
}

export function getExpectedTaxRateForCode(code: KraTaxTypeCode): number | null {
  switch (code) {
    case 'B':
      return 0.16;
    case 'E':
      return 0.08;
    case 'A':
    case 'C':
    case 'D':
      return 0;
    default:
      return null;
  }
}

export function mapPaymentMethodToKraCode(
  paymentMethod: PaymentMethod | string,
  splitBreakdown?: SplitPaymentTender[]
): '01' | '02' | '03' | '04' | '05' {
  if (paymentMethod === 'split' && Array.isArray(splitBreakdown) && splitBreakdown.length > 0) {
    const primary = [...splitBreakdown].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0];
    if (primary) {
      return mapPaymentMethodToKraCode(primary.method);
    }
  }
  switch (paymentMethod) {
    case 'mpesa':
      return '04';
    case 'card':
      return '02';
    case 'store_credit':
      return '03'; // Credit / Store Tab
    case 'cash':
    default:
      return '01';
  }
}

export function computeLineTaxAndNetTotals(params: {
  item: Pick<
    CartItem,
    'unitPrice' | 'quantity' | 'discountPercent' | 'discountAmount' | 'discountType'
  >;
  taxRate: number;
  pricingType: 'inclusive' | 'exclusive';
}): {
  originalUnitPrice: number;
  netUnitPrice: number;
  discountRatePct: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  grossTotal: number;
} {
  const qty = Math.max(0.0001, Number(params.item.quantity || 1));
  const originalUnitPrice = Math.max(0, Number(params.item.unitPrice || 0));
  const netUnitPrice = Math.max(0, getItemDiscountedUnitPrice(params.item));

  const discountPerUnit = Math.max(0, originalUnitPrice - netUnitPrice);
  const discountAmount = roundCurrency2(discountPerUnit * qty);
  const discountRatePct =
    originalUnitPrice > 0
      ? roundCurrency2(Math.min(100, Math.max(0, (discountPerUnit / originalUnitPrice) * 100)))
      : 0;

  const rate = Math.max(0, Number(params.taxRate || 0));
  const netLineBase = roundCurrency2(netUnitPrice * qty);

  let taxableAmount: number;
  let taxAmount: number;
  let grossTotal: number;

  if (params.pricingType === 'exclusive') {
    taxableAmount = netLineBase;
    taxAmount = roundCurrency2(taxableAmount * rate);
    grossTotal = roundCurrency2(taxableAmount + taxAmount);
  } else {
    grossTotal = netLineBase;
    taxableAmount = rate > 0 ? roundCurrency2(grossTotal / (1 + rate)) : grossTotal;
    taxAmount = roundCurrency2(grossTotal - taxableAmount);
  }

  return {
    originalUnitPrice: roundCurrency2(originalUnitPrice),
    netUnitPrice: roundCurrency2(netUnitPrice),
    discountRatePct,
    discountAmount,
    taxableAmount,
    taxAmount,
    grossTotal,
  };
}

export function formatTraderInvoiceNumber(receiptNumber: string): string {
  const clean = String(receiptNumber || '').trim();
  if (!clean) return `SOKO-${Date.now()}`;
  return clean.startsWith('SOKO') ? clean : `SOKO-${clean}`;
}

export function buildDigitaxSalePayload(params: {
  tx: {
    receiptNumber: string;
    timestamp?: string;
    locationId: string;
    total: number;
    subtotal: number;
    taxAmount: number;
    roundingAmount?: number;
    pricingType?: 'inclusive' | 'exclusive';
    paymentMethod: PaymentMethod | string;
    paymentDetails?: { splitBreakdown?: SplitPaymentTender[] };
    customerName?: string | null;
    items: CartItem[];
  };
  productsCatalog: Product[];
  resolvedItemIdsByProductId: Record<string, string>;
  taxSettings?: BusinessTaxSettings;
  buyerPin?: string;
}): DigitaxSalePayload {
  const { tx, productsCatalog, resolvedItemIdsByProductId, taxSettings, buyerPin } = params;
  const pricingType = tx.pricingType || taxSettings?.pricingType || 'inclusive';
  const saleDate = (tx.timestamp || new Date().toISOString()).split('T')[0];
  const { normalized: validBuyerPin } = normalizeAndValidateKraPin(buyerPin);

  const items: DigitaxSaleItemPayload[] = tx.items.map((cartItem) => {
    const product = productsCatalog.find((p) => p.id === cartItem.productId);
    const resolvedTax = resolveDynamicTaxRate(
      {
        category: product?.category,
        taxRate: cartItem.taxRate ?? product?.taxRate,
        id: cartItem.productId,
      },
      tx.locationId,
      taxSettings
    );

    const taxTypeCode = resolveKraTaxTypeCode({
      taxRate: resolvedTax.rate,
      ruleCode: resolvedTax.code,
      ruleName: resolvedTax.ruleName,
      explicitTaxTypeCode: cartItem.taxTypeCode || product?.taxTypeCode,
    });

    const lineCalc = computeLineTaxAndNetTotals({
      item: cartItem,
      taxRate: resolvedTax.rate,
      pricingType,
    });

    const digitaxId =
      resolvedItemIdsByProductId[cartItem.productId] ||
      cartItem.digitaxItemId ||
      product?.digitaxItemId ||
      '';

    return {
      id: digitaxId,
      sku: cartItem.sku,
      name: cartItem.productName,
      quantity: Number(cartItem.quantity),
      unit_price: pricingType === 'exclusive'
        ? roundCurrency2(lineCalc.grossTotal / Math.max(0.0001, Number(cartItem.quantity)))
        : lineCalc.netUnitPrice,
      total_amount: lineCalc.grossTotal,
      tax_type_code: taxTypeCode,
      tax_rate: resolvedTax.rate,
      taxable_amount: lineCalc.taxableAmount,
      tax_amount: lineCalc.taxAmount,
      discount_rate: lineCalc.discountRatePct,
      discount_amount: lineCalc.discountAmount,
    };
  });

  // Balance tiny half-up cash rounding against the largest line item so sum(items.total_amount) == tx.total
  // without introducing negative line unit prices.
  const sumItems = roundCurrency2(items.reduce((acc, it) => acc + it.total_amount, 0));
  const diff = roundCurrency2(Number(tx.total) - sumItems);
  if (Math.abs(diff) > 0 && Math.abs(diff) <= 1 && items.length > 0) {
    let targetIdx = 0;
    for (let i = 1; i < items.length; i++) {
      if (items[i].total_amount > items[targetIdx].total_amount) {
        targetIdx = i;
      }
    }
    const target = items[targetIdx];
    const adjustedGross = roundCurrency2(Math.max(0, target.total_amount + diff));
    const adjustedTaxable =
      target.tax_rate > 0
        ? roundCurrency2(adjustedGross / (1 + target.tax_rate))
        : adjustedGross;
    const adjustedTax = roundCurrency2(adjustedGross - adjustedTaxable);

    items[targetIdx] = {
      ...target,
      total_amount: adjustedGross,
      unit_price: roundCurrency2(adjustedGross / Math.max(0.0001, target.quantity)),
      taxable_amount: adjustedTaxable,
      tax_amount: adjustedTax,
      discount_amount: diff < 0 ? roundCurrency2(target.discount_amount + Math.abs(diff)) : target.discount_amount,
    };
  }

  return {
    sale_date: saleDate,
    trader_invoice_number: formatTraderInvoiceNumber(tx.receiptNumber),
    payment_type_code: mapPaymentMethodToKraCode(
      tx.paymentMethod,
      tx.paymentDetails?.splitBreakdown
    ),
    invoice_status_code: '02',
    customer_pin: validBuyerPin,
    customer_tin: validBuyerPin,
    customer_name: tx.customerName?.trim() || undefined,
    pricing_type: pricingType,
    expected_total: roundCurrency2(tx.total),
    rounding_adjustment: roundCurrency2(tx.roundingAmount || 0),
    items,
  };
}

export function deriveKraCreditNoteReasonCode(
  refundReason: string,
  hasNonRestockedItems: boolean
): KraCreditNoteReasonCode {
  const lower = String(refundReason || '').toLowerCase();
  if (lower.includes('damaged') || lower.includes('defective') || lower.includes('expired')) {
    return '03'; // Damaged
  }
  if (lower.includes('missing') || lower.includes('short')) {
    return '01'; // Missing Quantity
  }
  if (lower.includes('waste') || lower.includes('spoil')) {
    return '04'; // Wasted
  }
  if (hasNonRestockedItems && !lower.includes('change of mind')) {
    return '03';
  }
  return '06'; // Refund
}

export function buildDigitaxCreditNotePayload(params: {
  refund: RefundRecord;
  originalTx: {
    receiptNumber: string;
    locationId: string;
    pricingType?: 'inclusive' | 'exclusive';
    customerName?: string | null;
    items: CartItem[];
    etimsData?: {
      saleId?: string;
      traderInvoiceNumber?: string;
      cuInvoiceNumber?: number | string;
      customerTin?: string;
      customerName?: string;
    };
  };
  productsCatalog: Product[];
  resolvedItemIdsByProductId: Record<string, string>;
  taxSettings?: BusinessTaxSettings;
}): DigitaxCreditNotePayload {
  const { refund, originalTx, productsCatalog, resolvedItemIdsByProductId, taxSettings } = params;
  const pricingType = originalTx.pricingType || taxSettings?.pricingType || 'inclusive';
  const returnDate = (refund.timestamp || new Date().toISOString()).split('T')[0];
  const anyNonRestocked = refund.items.some((ri) => !ri.restockToInventory);
  const { normalized: validBuyerPin } = normalizeAndValidateKraPin(originalTx.etimsData?.customerTin);

  const items: DigitaxCreditNoteItemPayload[] = refund.items.map((ri) => {
    const prod = productsCatalog.find((p) => p.id === ri.productId);
    const origLine = originalTx.items.find((ci) => ci.productId === ri.productId);
    const resolvedTax = resolveDynamicTaxRate(
      {
        category: prod?.category,
        taxRate: ri.taxRate ?? origLine?.taxRate ?? prod?.taxRate,
        id: ri.productId,
      },
      originalTx.locationId,
      taxSettings
    );

    const taxTypeCode = resolveKraTaxTypeCode({
      taxRate: resolvedTax.rate,
      ruleCode: resolvedTax.code,
      ruleName: resolvedTax.ruleName,
      explicitTaxTypeCode: ri.taxTypeCode || origLine?.taxTypeCode || prod?.taxTypeCode,
    });

    const totalAmount = roundCurrency2(ri.refundTotalAmount);
    const qty = Math.max(0.0001, Number(ri.quantity || 1));
    const unitPrice = roundCurrency2(totalAmount / qty);

    let discountRate = 0;
    let discountAmount = 0;
    if (origLine) {
      const origLineCalc = computeLineTaxAndNetTotals({
        item: {
          unitPrice: origLine.unitPrice,
          quantity: qty,
          discountPercent: origLine.discountPercent,
          discountAmount: origLine.discountAmount ? roundCurrency2((origLine.discountAmount / Math.max(0.0001, origLine.quantity)) * qty) : undefined,
          discountType: origLine.discountType,
        },
        taxRate: resolvedTax.rate,
        pricingType,
      });
      discountRate = origLineCalc.discountRatePct;
      discountAmount = origLineCalc.discountAmount;
    } else {
      const origGrossUnit =
        pricingType === 'exclusive'
          ? roundCurrency2(ri.unitPrice * (1 + resolvedTax.rate))
          : roundCurrency2(ri.unitPrice);
      const discountPerUnit = Math.max(0, origGrossUnit - unitPrice);
      discountRate = origGrossUnit > 0 ? roundCurrency2((discountPerUnit / origGrossUnit) * 100) : 0;
      discountAmount = roundCurrency2(discountPerUnit * qty);
    }

    const taxableAmount =
      resolvedTax.rate > 0
        ? roundCurrency2(totalAmount / (1 + resolvedTax.rate))
        : totalAmount;
    const taxAmount = roundCurrency2(totalAmount - taxableAmount);

    const digitaxId =
      resolvedItemIdsByProductId[ri.productId] ||
      origLine?.digitaxItemId ||
      prod?.digitaxItemId ||
      '';

    return {
      id: digitaxId,
      sku: ri.sku,
      name: ri.productName,
      quantity: Number(ri.quantity),
      unit_price: unitPrice,
      total_amount: totalAmount,
      tax_type_code: taxTypeCode,
      tax_rate: resolvedTax.rate,
      taxable_amount: taxableAmount,
      tax_amount: taxAmount,
      discount_rate: discountRate,
      discount_amount: discountAmount,
    };
  });

  return {
    return_date: returnDate,
    trader_invoice_number: formatTraderInvoiceNumber(refund.refundNumber),
    original_trader_invoice_number:
      originalTx.etimsData?.traderInvoiceNumber || formatTraderInvoiceNumber(originalTx.receiptNumber),
    sale_id: originalTx.etimsData?.saleId,
    original_invoice_number: originalTx.etimsData?.cuInvoiceNumber,
    credit_note_reason: deriveKraCreditNoteReasonCode(refund.refundReason, anyNonRestocked),
    receipt_type_code: 'R',
    customer_pin: validBuyerPin,
    customer_tin: validBuyerPin,
    customer_name: refund.customerName || originalTx.etimsData?.customerName || originalTx.customerName || undefined,
    items,
  };
}

/**
 * Authoritative server-side fiscal payload & tax math verification
 */
export function verifyDigitaxSalePayloadServerSide(payload: any): FiscalValidationResult {
  const errors: string[] = [];
  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['Missing sale payload body'], computedTotal: 0, computedTaxable: 0, computedTax: 0 };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(payload.sale_date || ''))) {
    errors.push('Invalid sale_date format; expected YYYY-MM-DD');
  }
  if (!payload.trader_invoice_number || typeof payload.trader_invoice_number !== 'string' || payload.trader_invoice_number.length > 80) {
    errors.push('Missing or invalid trader_invoice_number');
  }

  const buyerPinRaw = payload.customer_pin ?? payload.customer_tin;
  const pinCheck = normalizeAndValidateKraPin(buyerPinRaw);
  if (!pinCheck.isValid) {
    errors.push(`Invalid buyer KRA PIN format: ${buyerPinRaw}`);
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0 || payload.items.length > 500) {
    errors.push('Sale must include between 1 and 500 itemized lines');
    return { valid: false, errors, computedTotal: 0, computedTaxable: 0, computedTax: 0 };
  }

  let computedTotal = 0;
  let computedTaxable = 0;
  let computedTax = 0;

  payload.items.forEach((item: any, idx: number) => {
    const prefix = `Item[${idx}]`;
    if (!item || typeof item.id !== 'string' || !item.id.trim()) {
      errors.push(`${prefix}: missing registered Digitax item id`);
    }
    const qty = Number(item?.quantity);
    const unitPrice = Number(item?.unit_price);
    const totalAmount = Number(item?.total_amount);
    const discountRate = Number(item?.discount_rate ?? 0);
    const discountAmount = Number(item?.discount_amount ?? 0);

    if (!Number.isFinite(qty) || qty <= 0) {
      errors.push(`${prefix}: quantity must be greater than 0`);
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      errors.push(`${prefix}: unit_price cannot be negative`);
    }
    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
      errors.push(`${prefix}: total_amount cannot be negative`);
    }
    if (!Number.isFinite(discountRate) || discountRate < 0 || discountRate > 100) {
      errors.push(`${prefix}: discount_rate must be between 0 and 100`);
    }
    if (!Number.isFinite(discountAmount) || discountAmount < 0) {
      errors.push(`${prefix}: discount_amount cannot be negative`);
    }

    if (Number.isFinite(qty) && Number.isFinite(unitPrice) && Number.isFinite(totalAmount)) {
      const expectedNetTotal = roundCurrency2(qty * unitPrice);
      const expectedGrossMinusDiscount = roundCurrency2(qty * unitPrice - discountAmount);
      const matchesNet = Math.abs(totalAmount - expectedNetTotal) <= 0.15;
      const matchesDiscounted = Math.abs(totalAmount - expectedGrossMinusDiscount) <= 0.15;
      if (!matchesNet && !matchesDiscounted) {
        errors.push(`${prefix}: total_amount (${totalAmount}) disagrees with qty*unit_price (${expectedNetTotal})`);
      }
    }

    const taxCode = item?.tax_type_code as KraTaxTypeCode;
    if (taxCode) {
      const expectedRate = getExpectedTaxRateForCode(taxCode);
      if (expectedRate === null) {
        errors.push(`${prefix}: unsupported KRA tax_type_code "${taxCode}"`);
      } else if (item.taxable_amount !== undefined && item.tax_amount !== undefined) {
        const taxable = Number(item.taxable_amount);
        const taxAmt = Number(item.tax_amount);
        if (!Number.isFinite(taxable) || !Number.isFinite(taxAmt) || taxable < 0 || taxAmt < 0) {
          errors.push(`${prefix}: taxable_amount and tax_amount must be non-negative numbers`);
        } else {
          const expectedTax = roundCurrency2(taxable * expectedRate);
          if (Math.abs(taxAmt - expectedTax) > 0.15) {
            errors.push(`${prefix}: tax_amount (${taxAmt}) mismatches Class ${taxCode} rate (${expectedTax})`);
          }
          if (Math.abs(roundCurrency2(taxable + taxAmt) - roundCurrency2(totalAmount)) > 0.15) {
            errors.push(`${prefix}: taxable_amount + tax_amount must equal total_amount`);
          }
          computedTaxable = roundCurrency2(computedTaxable + taxable);
          computedTax = roundCurrency2(computedTax + taxAmt);
        }
      }
    }

    if (Number.isFinite(totalAmount)) {
      computedTotal = roundCurrency2(computedTotal + totalAmount);
    }
  });

  if (payload.expected_total !== undefined) {
    const expectedTotal = Number(payload.expected_total);
    if (!Number.isFinite(expectedTotal) || Math.abs(computedTotal - expectedTotal) > 0.25) {
      errors.push(`Invoice total mismatch: sum of items (${computedTotal}) != expected_total (${expectedTotal})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    computedTotal,
    computedTaxable,
    computedTax,
  };
}

export function verifyDigitaxCreditNotePayloadServerSide(payload: any): FiscalValidationResult {
  const errors: string[] = [];
  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['Missing credit note payload body'], computedTotal: 0, computedTaxable: 0, computedTax: 0 };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(payload.return_date || ''))) {
    errors.push('Invalid return_date format; expected YYYY-MM-DD');
  }
  if (!payload.trader_invoice_number || typeof payload.trader_invoice_number !== 'string') {
    errors.push('Missing credit note trader_invoice_number');
  }
  if (!payload.sale_id && !payload.original_trader_invoice_number) {
    errors.push('Credit note must reference original sale_id or original_trader_invoice_number');
  }
  if (!VALID_CREDIT_NOTE_REASONS.includes(payload.credit_note_reason)) {
    errors.push('Invalid credit_note_reason; expected KRA code 01-06');
  }

  const itemValidation = verifyDigitaxSalePayloadServerSide({
    sale_date: payload.return_date,
    trader_invoice_number: payload.trader_invoice_number,
    customer_pin: payload.customer_pin ?? payload.customer_tin,
    items: payload.items,
  });

  return {
    valid: errors.length === 0 && itemValidation.valid,
    errors: [...errors, ...itemValidation.errors],
    computedTotal: itemValidation.computedTotal,
    computedTaxable: itemValidation.computedTaxable,
    computedTax: itemValidation.computedTax,
  };
}
