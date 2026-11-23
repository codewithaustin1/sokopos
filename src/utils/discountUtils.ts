import { CartItem } from '../types';

/**
 * Calculates the discounted unit price for an item after applying either
 * percentage (-10%) or flat amount (- KES 50) discount.
 * Price is mathematically bounded so it cannot drop below 0.
 */
export function getItemDiscountedUnitPrice(
  item: Pick<CartItem, 'unitPrice' | 'discountPercent' | 'discountAmount' | 'discountType'>
): number {
  if (item.discountType === 'flat' && (item.discountAmount ?? 0) > 0) {
    return Math.max(0, item.unitPrice - (item.discountAmount ?? 0));
  }

  if (item.discountType === 'percentage' && (item.discountPercent ?? 0) > 0) {
    return Math.max(0, item.unitPrice * (1 - item.discountPercent / 100));
  }

  // Fallback if discountType not explicitly set but values exist
  if ((item.discountAmount ?? 0) > 0) {
    return Math.max(0, item.unitPrice - (item.discountAmount ?? 0));
  }
  if ((item.discountPercent ?? 0) > 0) {
    return Math.max(0, item.unitPrice * (1 - item.discountPercent / 100));
  }

  return item.unitPrice;
}

/**
 * Calculates the final line total (gross price for the quantity).
 */
export function getItemLineTotal(
  item: Pick<CartItem, 'unitPrice' | 'quantity' | 'discountPercent' | 'discountAmount' | 'discountType'>
): number {
  return getItemDiscountedUnitPrice(item) * item.quantity;
}

/**
 * Human-readable badge text (e.g. "- KES 50.00" or "-10%").
 */
export function formatDiscountBadge(
  item: Pick<CartItem, 'discountPercent' | 'discountAmount' | 'discountType'>,
  currency = 'KES'
): string | null {
  if (item.discountType === 'flat' && (item.discountAmount ?? 0) > 0) {
    return `-${currency} ${(item.discountAmount ?? 0).toFixed(0)}`;
  }
  if ((item.discountPercent ?? 0) > 0) {
    return `-${item.discountPercent}%`;
  }
  if ((item.discountAmount ?? 0) > 0) {
    return `-${currency} ${(item.discountAmount ?? 0).toFixed(0)}`;
  }
  return null;
}
