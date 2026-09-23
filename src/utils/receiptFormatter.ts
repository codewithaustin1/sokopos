import { Transaction, Location } from '../types';

export function formatTransactionReceiptText(
  transaction: Transaction,
  location: Location,
  businessName?: string,
  businessTaxNumber?: string
): string {
  const store = businessName || 'SokoPoS Retail';
  const currency = location.currency || 'KES';
  const dateStr = new Date(transaction.timestamp).toLocaleString();
  const taxId = businessTaxNumber || location.taxId;

  const lines: string[] = [
    `🧾 ${store.toUpperCase()}`,
    `${location.name}`,
    `${location.address}`,
    `Tel: ${location.phone} | PIN: ${taxId}`,
    '----------------------------------------',
    `Receipt: ${transaction.receiptNumber}`,
    `Date: ${dateStr}`,
    `Cashier: ${transaction.cashierName}`,
    `Payment: ${transaction.paymentMethod.toUpperCase()}${
      transaction.paymentDetails.mpesaCode ? ` (${transaction.paymentDetails.mpesaCode})` : ''
    }${
      transaction.paymentDetails.cardLast4 ? ` (*${transaction.paymentDetails.cardLast4})` : ''
    }`,
    '----------------------------------------',
    'ITEMS:',
  ];

  transaction.items.forEach((item) => {
    const discountedPrice =
      item.discountPercent > 0
        ? item.unitPrice * (1 - item.discountPercent / 100)
        : item.discountAmount
        ? Math.max(0, item.unitPrice - item.discountAmount / item.quantity)
        : item.unitPrice;
    const lineTotal = (discountedPrice * item.quantity).toFixed(2);
    lines.push(`• ${item.quantity}x ${item.productName} = ${currency} ${lineTotal}`);
  });

  lines.push('----------------------------------------');
  lines.push(`Subtotal: ${currency} ${transaction.subtotal.toFixed(2)}`);
  lines.push(`VAT (16%): ${currency} ${transaction.taxAmount.toFixed(2)}`);

  if (transaction.roundingAmount && transaction.roundingAmount !== 0) {
    const sign = transaction.roundingAmount >= 0 ? '+' : '';
    lines.push(`Cash Rounding (Half-up): ${sign}${currency} ${transaction.roundingAmount.toFixed(2)}`);
  }

  lines.push(`TOTAL PAID: ${currency} ${transaction.total.toFixed(2)}`);

  if (transaction.paymentMethod === 'cash' && transaction.paymentDetails.cashTendered !== undefined) {
    lines.push(`Cash Tendered: ${currency} ${transaction.paymentDetails.cashTendered.toFixed(2)}`);
    lines.push(`Change: ${currency} ${(transaction.paymentDetails.cashChange ?? 0).toFixed(2)}`);
  }

  if (transaction.totalRefunded && transaction.totalRefunded > 0) {
    lines.push(`Refunded Amount: -${currency} ${transaction.totalRefunded.toFixed(2)}`);
  }

  lines.push('----------------------------------------');
  lines.push('Thank you for shopping with us!');
  lines.push('Powered by Sokoplus Horizon');

  return lines.join('\n');
}

export function formatRefundVoucherText(
  refund: {
    refundNumber: string;
    receiptNumber: string;
    timestamp: string;
    cashierName: string;
    refundMethod: string;
    refundReason: string;
    totalRefund: number;
    customerName?: string;
    customerPhone?: string;
    items: Array<{
      productName: string;
      quantity: number;
      refundTotalAmount: number;
      restockToInventory: boolean;
      sku: string;
    }>;
  },
  location: Location,
  businessName?: string,
  businessTaxNumber?: string
): string {
  const store = businessName || 'SokoPoS Retail';
  const currency = location.currency || 'KES';
  const dateStr = new Date(refund.timestamp).toLocaleString();
  const taxId = businessTaxNumber || location.taxId;

  const lines: string[] = [
    `🔄 ${store.toUpperCase()} - OFFICIAL CREDIT NOTE`,
    `${location.name}`,
    `${location.address}`,
    `Tel: ${location.phone} | PIN: ${taxId}`,
    '----------------------------------------',
    `Credit Note: ${refund.refundNumber}`,
    `Original Sale: #${refund.receiptNumber}`,
    `Date: ${dateStr}`,
    `Cashier: ${refund.cashierName}`,
    `Refund Mode: ${refund.refundMethod.toUpperCase().replace('_', ' ')}`,
    `Reason: ${refund.refundReason}`,
  ];

  if (refund.customerName) {
    lines.push(`Customer: ${refund.customerName} ${refund.customerPhone ? `(${refund.customerPhone})` : ''}`);
  }

  lines.push('----------------------------------------');
  lines.push('RETURNED ITEMS:');

  refund.items.forEach((it) => {
    lines.push(`• ${it.quantity}x ${it.productName} = -${currency} ${it.refundTotalAmount.toFixed(2)}`);
  });

  lines.push('----------------------------------------');
  lines.push(`TOTAL REFUNDED: -${currency} ${refund.totalRefund.toFixed(2)}`);
  lines.push('----------------------------------------');
  lines.push('Customer copy');
  lines.push('Powered by Sokoplus Horizon');

  return lines.join('\n');
}

export function normalizePhoneNumber(rawPhone: string): string {
  const cleaned = rawPhone.replace(/[^\d+]/g, '');
  if (!cleaned) return '';

  // If starts with 07 or 01, transform to 2547... or 2541...
  if (/^0[17]\d{8}$/.test(cleaned)) {
    return `254${cleaned.slice(1)}`;
  }
  // Strip leading +
  if (cleaned.startsWith('+')) {
    return cleaned.slice(1);
  }
  return cleaned;
}
