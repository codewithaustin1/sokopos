import { PaymentMethod } from '../types';

/**
 * Standard Half-Up Cash Rounding:
 * - 0.50 and above goes up to KES 1
 * - below 0.50 goes down to KES 0
 *
 * For electronic payments (M-Pesa, Card), the exact amount is charged.
 */

export interface PaymentGuardrailResult {
  rawTotal: number;
  payableAmount: number;
  roundingDifference: number; // e.g. -0.40 or +0.50 for cash, 0 for electronic
  hasCents: boolean;
  isCash: boolean;
  ruleDescription: string;
}

/**
 * Checks if an amount involves non-zero cents (fractional currency units).
 */
export function hasCents(amount: number): boolean {
  const cents = Math.round(Number(amount.toFixed(2)) * 100) % 100;
  return cents !== 0;
}

/**
 * Applies Standard Half-Up Rounding to whole units:
 * 0.50 and above goes up (+1), below 0.50 goes down (+0).
 */
export function roundCashHalfUp(amount: number): number {
  const clean = Number(amount.toFixed(2));
  const floor = Math.floor(clean);
  const cents = Math.round((clean - floor) * 100) / 100;

  if (cents >= 0.5) {
    return floor + 1;
  }
  return floor;
}

/**
 * Evaluates payment guardrails based on payment mode:
 * - Electronic (M-Pesa, Card): Charge exact amount including cents.
 * - Cash: Standard Half-Up Rounding to nearest whole unit.
 */
export function calculatePaymentGuardrails(
  rawTotal: number,
  paymentMethod: PaymentMethod
): PaymentGuardrailResult {
  const cleanRaw = Number(rawTotal.toFixed(2));
  const involvesCents = hasCents(cleanRaw);
  const isCash = paymentMethod === 'cash';

  if (!isCash) {
    // Mode of payment is electronic -> charge exact amount
    return {
      rawTotal: cleanRaw,
      payableAmount: cleanRaw,
      roundingDifference: 0,
      hasCents: involvesCents,
      isCash: false,
      ruleDescription: involvesCents
        ? 'Electronic payment: exact amount charged with no rounding'
        : 'Exact amount charged',
    };
  }

  // Mode of payment is cash -> standard half-up rounding
  if (!involvesCents) {
    return {
      rawTotal: cleanRaw,
      payableAmount: cleanRaw,
      roundingDifference: 0,
      hasCents: false,
      isCash: true,
      ruleDescription: 'Cash payment: exact whole amount',
    };
  }

  const payableAmount = roundCashHalfUp(cleanRaw);
  const roundingDifference = Number((payableAmount - cleanRaw).toFixed(2));
  const centsValue = Math.round((cleanRaw - Math.floor(cleanRaw)) * 100);
  const direction = roundingDifference >= 0 ? 'up' : 'down';

  return {
    rawTotal: cleanRaw,
    payableAmount,
    roundingDifference,
    hasCents: true,
    isCash: true,
    ruleDescription: `Cash rounding: ${centsValue}¢ goes ${direction} to whole unit (${roundingDifference >= 0 ? '+' : ''}${roundingDifference.toFixed(2)})`,
  };
}
