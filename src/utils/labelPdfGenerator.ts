import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Product } from '../types';

export interface LabelPrintItem {
  product: Product;
  quantity: number;
}

export interface LabelPdfOptions {
  items: LabelPrintItem[];
  codeType: 'barcode' | 'qr' | 'both';
  format: '80mm' | '58mm' | 'label_50x30' | 'a4_grid';
  currency: string;
  businessName?: string;
  includeStoreName: boolean;
  includePrice: boolean;
  includeSku: boolean;
  includeBarcodeText: boolean;
  includeCategory: boolean;
}

export async function generateLabelsPdf(options: LabelPdfOptions): Promise<{
  doc: jsPDF;
  blob: Blob;
  url: string;
  fileName: string;
}> {
  const {
    items,
    codeType,
    format,
    currency,
    businessName = 'SokoPoS Store',
    includeStoreName,
    includePrice,
    includeSku,
    includeBarcodeText,
    includeCategory,
  } = options;

  // Flatten items by quantity
  const flattenedProducts: Product[] = [];
  items.forEach((item) => {
    const qty = Math.max(1, item.quantity || 1);
    for (let i = 0; i < qty; i++) {
      flattenedProducts.push(item.product);
    }
  });

  const totalLabels = flattenedProducts.length;
  const fileName = `Product_Labels_${Date.now().toString().slice(-6)}.pdf`;

  if (format === 'a4_grid') {
    // Standard A4 sticker sheet: 210 x 297 mm
    // 3 columns x 8 rows = 24 labels per page (approx 65mm x 34mm each)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const cols = 3;
    const rows = 8;
    const labelsPerPage = cols * rows;
    const colWidth = 63;
    const rowHeight = 33;
    const marginLeft = 8;
    const marginTop = 12;
    const gapX = 3;
    const gapY = 2;

    for (let i = 0; i < totalLabels; i++) {
      const pageIndex = Math.floor(i / labelsPerPage);
      const slotIndex = i % labelsPerPage;

      if (slotIndex === 0 && pageIndex > 0) {
        doc.addPage('a4', 'portrait');
      }

      const col = slotIndex % cols;
      const row = Math.floor(slotIndex / cols);
      const x = marginLeft + col * (colWidth + gapX);
      const y = marginTop + row * (rowHeight + gapY);
      const p = flattenedProducts[i];

      // Draw label outline border (subtle guide)
      doc.setDrawColor(210, 215, 220);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, y, colWidth, rowHeight, 1.5, 1.5, 'S');

      let curY = y + 3.5;

      // Store name
      if (includeStoreName) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 110, 120);
        doc.text(businessName.toUpperCase(), x + colWidth / 2, curY, { align: 'center' });
        curY += 3.2;
      }

      // Product Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      const truncatedName = doc.splitTextToSize(p.name, colWidth - 4)[0] || p.name;
      doc.text(truncatedName, x + colWidth / 2, curY, { align: 'center' });
      curY += 3.8;

      // Price
      if (includePrice) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(2, 132, 199);
        const priceStr = `${currency} ${p.sellingPrice.toFixed(2)}`;
        doc.text(priceStr, x + colWidth / 2, curY, { align: 'center' });
        curY += 3.8;
      }

      // QR / Barcode
      const codeVal = p.barcode || p.sku || '000000';
      if (codeType === 'qr' || codeType === 'both') {
        try {
          const qrData = await QRCode.toDataURL(codeVal, { margin: 0, width: 120 });
          const qrSize = 12;
          doc.addImage(qrData, 'PNG', x + colWidth / 2 - qrSize / 2, curY, qrSize, qrSize);
          curY += qrSize + 1.5;
        } catch (e) {
          console.warn('QR error', e);
        }
      } else {
        // Linear barcode simulated or text
        doc.setFont('courier', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);
        doc.text(`||| | ||||| || |||`, x + colWidth / 2, curY + 2, { align: 'center' });
        curY += 5;
      }

      // SKU and Barcode text
      if (includeBarcodeText || includeSku) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(80, 80, 80);
        const details = [
          includeSku ? `SKU: ${p.sku}` : null,
          includeBarcodeText ? `BC: ${p.barcode}` : null,
        ].filter(Boolean).join(' • ');
        doc.text(details, x + colWidth / 2, y + rowHeight - 2, { align: 'center' });
      }
    }

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    return { doc, blob, url, fileName };
  }

  // Thermal roll format (80mm, 58mm, or 50x30mm)
  const rollWidth = format === '58mm' ? 58 : format === 'label_50x30' ? 50 : 80;
  const labelHeight = format === 'label_50x30' ? 32 : 46;
  const totalRollHeight = Math.max(labelHeight, totalLabels * labelHeight + 6);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [rollWidth, totalRollHeight],
  });

  let curY = 4;
  for (let i = 0; i < totalLabels; i++) {
    const p = flattenedProducts[i];
    const labelStartY = curY;
    const centerX = rollWidth / 2;

    // Header Store name
    if (includeStoreName) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      doc.text(businessName.toUpperCase(), centerX, curY + 3, { align: 'center' });
      curY += 4.5;
    }

    // Product Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    const splitName = doc.splitTextToSize(p.name, rollWidth - 8);
    doc.text(splitName[0] || p.name, centerX, curY + 3.5, { align: 'center' });
    curY += 4.5;

    // Price
    if (includePrice) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`${currency} ${p.sellingPrice.toFixed(2)}`, centerX, curY + 4, { align: 'center' });
      curY += 5;
    }

    // QR or Barcode
    const codeVal = p.barcode || p.sku || '000000';
    if (codeType === 'qr' || codeType === 'both') {
      try {
        const qrData = await QRCode.toDataURL(codeVal, { margin: 0, width: 140 });
        const qrSize = format === '58mm' ? 14 : 16;
        doc.addImage(qrData, 'PNG', centerX - qrSize / 2, curY, qrSize, qrSize);
        curY += qrSize + 1.5;
      } catch (e) {
        console.warn('QR error', e);
      }
    } else {
      doc.setFont('courier', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(`|||| | |||||| ||| ||||`, centerX, curY + 3, { align: 'center' });
      curY += 5;
    }

    // Human readable text
    if (includeBarcodeText || includeSku) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(60, 60, 60);
      const textParts = [
        includeSku ? `SKU: ${p.sku}` : null,
        includeBarcodeText ? `*${p.barcode}*` : null,
      ].filter(Boolean).join('  ');
      doc.text(textParts, centerX, curY + 2.5, { align: 'center' });
      curY += 4;
    }

    if (includeCategory && p.category) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100);
      doc.text(p.category, centerX, curY + 2, { align: 'center' });
      curY += 3;
    }

    // Cut line between labels if more than 1
    if (i < totalLabels - 1) {
      doc.setDrawColor(180, 180, 180);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(4, labelStartY + labelHeight - 1, rollWidth - 4, labelStartY + labelHeight - 1);
      doc.setLineDashPattern([], 0);
      curY = labelStartY + labelHeight;
    }
  }

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  return { doc, blob, url, fileName };
}
