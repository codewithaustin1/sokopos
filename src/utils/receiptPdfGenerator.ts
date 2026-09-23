import { jsPDF } from 'jspdf';
import { Transaction, Location } from '../types';
import { getItemDiscountedUnitPrice } from './discountUtils';

export interface GenerateReceiptPdfOptions {
  transaction?: Transaction | null;
  location: Location;
  businessName?: string;
  businessTaxNumber?: string;
  customTitle?: string;
  customSubtitle?: string;
  customText?: string;
}

/**
 * Generates an official 80mm POS slip PDF for receipts or credit notes.
 * Returns { doc, blob, url, fileName }
 */
export function generateReceiptPdf({
  transaction,
  location,
  businessName,
  businessTaxNumber,
  customTitle,
  customText,
}: GenerateReceiptPdfOptions): {
  doc: jsPDF;
  blob: Blob;
  url: string;
  fileName: string;
} {
  const storeName = (businessName || 'SokoPoS Retail').toUpperCase();
  const taxId = businessTaxNumber || location.taxId || 'P000000000X';
  const currency = location.currency || 'KES';
  const receiptNum = transaction?.receiptNumber || 'RCP-' + Date.now().toString().slice(-6);
  const fileName = `Receipt_${receiptNum}.pdf`;

  // Standard POS receipt roll: 80mm width
  // Dynamic page height based on number of items or custom text lines
  const itemCount = transaction?.items?.length || 0;
  const extraLines = customText ? customText.split('\n').length : 0;
  const estimatedHeight = Math.max(160, 110 + itemCount * 9 + extraLines * 5 + (transaction?.refunds?.length || 0) * 12);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, estimatedHeight],
  });

  const pageWidth = 80;
  let y = 8;

  // Helper for centered text
  const printCenter = (text: string, size = 9, isBold = false) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.text(text, pageWidth / 2, y, { align: 'center' });
    y += size * 0.42 + 1.2;
  };

  // Helper for left-right text
  const printRow = (left: string, right: string, size = 8, isBold = false) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.text(left, 5, y);
    doc.text(right, pageWidth - 5, y, { align: 'right' });
    y += size * 0.42 + 1.2;
  };

  // Helper for dashed line
  const printDashedLine = () => {
    doc.setLineDashPattern([1, 1], 0);
    doc.setDrawColor(180, 180, 180);
    doc.line(5, y, pageWidth - 5, y);
    y += 3.5;
  };

  // 1. Header (Store Name & Tax Credentials)
  doc.setTextColor(20, 20, 20);
  printCenter(storeName, 12, true);

  if (location.name) {
    printCenter(`${location.name}`, 8, false);
  }
  if (location.address) {
    printCenter(`${location.address}`, 7.5, false);
  }
  printCenter(`KRA PIN: ${taxId} | Tel: ${location.phone}`, 7.5, false);

  y += 1;
  printDashedLine();

  // 2. Receipt metadata or Custom Text
  if (transaction) {
    printRow('Receipt No:', transaction.receiptNumber, 8, true);
    printRow('Date:', new Date(transaction.timestamp).toLocaleString(), 7.5, false);
    printRow('Cashier:', transaction.cashierName, 7.5, false);
    printRow('Terminal:', transaction.terminalName, 7.5, false);

    const paymentLabel = transaction.paymentMethod.toUpperCase() +
      (transaction.paymentDetails.mpesaCode ? ` (${transaction.paymentDetails.mpesaCode})` : '') +
      (transaction.paymentDetails.cardLast4 ? ` (*${transaction.paymentDetails.cardLast4})` : '');
    printRow('Payment:', paymentLabel, 7.5, true);

    printDashedLine();

    // 3. Itemized list
    printRow('QTY / ITEM', 'AMOUNT', 8, true);
    y += 1;

    for (const item of transaction.items) {
      const unitPrice = getItemDiscountedUnitPrice(item);
      const lineTotal = (unitPrice * item.quantity).toFixed(2);
      const qtyAndName = `${item.quantity}x ${item.productName}`;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      // Truncate if long
      const splitTitle = doc.splitTextToSize(qtyAndName, 48);
      doc.text(splitTitle, 5, y);

      doc.setFont('helvetica', 'bold');
      doc.text(lineTotal, pageWidth - 5, y, { align: 'right' });

      y += Math.max(splitTitle.length * 3.6, 4.2);
    }

    printDashedLine();

    // 4. Totals and VAT Breakdown
    printRow('Net Subtotal:', `${currency} ${transaction.subtotal.toFixed(2)}`, 8, false);
    printRow('VAT / Tax (16%):', `${currency} ${transaction.taxAmount.toFixed(2)}`, 8, false);

    if (transaction.roundingAmount && transaction.roundingAmount !== 0) {
      const sign = transaction.roundingAmount > 0 ? '+' : '';
      printRow('Cash Rounding:', `${sign}${currency} ${transaction.roundingAmount.toFixed(2)}`, 7.5, false);
    }

    y += 1;
    // Total Box
    doc.setFillColor(245, 247, 250);
    doc.rect(5, y - 2, pageWidth - 10, 7.5, 'F');
    doc.setTextColor(15, 23, 42);
    printRow(`TOTAL PAID (${transaction.paymentMethod.toUpperCase()}):`, `${currency} ${transaction.total.toFixed(2)}`, 9, true);
    y += 1.5;

    // Cash Tender / Change
    if (transaction.paymentMethod === 'cash' && transaction.paymentDetails.cashTendered !== undefined) {
      printRow('Cash Tendered:', `${currency} ${transaction.paymentDetails.cashTendered.toFixed(2)}`, 7.5, false);
      printRow('Change Returned:', `${currency} ${(transaction.paymentDetails.cashChange ?? 0).toFixed(2)}`, 7.5, true);
    }

    // Refund adjustments if any
    if (transaction.totalRefunded && transaction.totalRefunded > 0) {
      y += 1;
      printDashedLine();
      printRow('Total Refunded:', `-${currency} ${transaction.totalRefunded.toFixed(2)}`, 7.5, true);
      const netRetained = Math.max(0, transaction.total - transaction.totalRefunded);
      printRow('Net Retained:', `${currency} ${netRetained.toFixed(2)}`, 8, true);
    }

  } else if (customText) {
    // Render custom credit note or formatted slip text
    if (customTitle) {
      printCenter(customTitle, 9, true);
      y += 1;
    }
    const lines = customText.split('\n');
    for (const line of lines) {
      if (line.startsWith('---')) {
        printDashedLine();
      } else if (line.includes(': ')) {
        const [k, ...v] = line.split(': ');
        printRow(k + ':', v.join(': '), 7.5, false);
      } else {
        printCenter(line, 7.5, false);
      }
    }
  }

  y += 2;
  printDashedLine();

  // 5. Simulated thermal barcode
  doc.setFillColor(30, 41, 59);
  doc.rect(pageWidth / 2 - 22, y, 44, 6, 'F');
  y += 7.5;
  printCenter(`*${receiptNum}*`, 7, false);

  // 6. Mandatory Footer: Powered by Sokoplus Horizon exclusively at bottom
  y += 1;
  doc.setTextColor(100, 116, 139);
  printCenter('Powered by Sokoplus Horizon', 7.5, false);
  printCenter('Asante kwa kununua na sisi!', 7.5, true);

  // Generate blob and object URL
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);

  return { doc, blob, url, fileName };
}
