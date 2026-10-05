import { jsPDF } from 'jspdf';
import { ReportPrintData } from '../components/reports/ReportPrintModal';
import { formatRangeDisplay } from './dateRangeUtils';

/**
 * Builds a standalone, fully styled A4 HTML document for reliable isolated printing.
 * Guarantees zero white pages, crisp contrast, repeating table headers, and strict pagination.
 */
export function buildReportPrintHtml(data: ReportPrintData): string {
  const currentDate = new Date().toLocaleString();
  const currency = data.business?.currency || 'KES';
  const taxId = data.business?.taxNumber || data.location?.taxId || '';

  const summaryCardsHtml =
    data.summaryCards && data.summaryCards.length > 0
      ? `
      <div class="kpi-grid">
        ${data.summaryCards
          .map(
            (card) => `
          <div class="kpi-card">
            <div class="kpi-label">${escapeHtml(card.label)}</div>
            <div class="kpi-value">${escapeHtml(String(card.value))}</div>
            ${card.sub ? `<div class="kpi-sub">${escapeHtml(card.sub)}</div>` : ''}
          </div>
        `
          )
          .join('')}
      </div>
    `
      : '';

  const tableHeadersHtml = data.tableHeaders
    .map((header, idx) => {
      const isRight = idx >= data.tableHeaders.length - 2;
      return `<th class="${isRight ? 'text-right' : 'text-left'}">${escapeHtml(header)}</th>`;
    })
    .join('');

  const tableRowsHtml =
    data.tableRows.length === 0
      ? `<tr><td colspan="${data.tableHeaders.length}" class="text-center empty-cell">No transactional data records found for this period.</td></tr>`
      : data.tableRows
          .map((row, rIdx) => {
            const isAlt = rIdx % 2 === 1;
            const cells = row
              .map((cell, cIdx) => {
                const isRight = cIdx >= data.tableHeaders.length - 2;
                const isBold = cIdx === 0;
                const cellVal = typeof cell === 'boolean' ? (cell ? 'YES' : 'NO') : String(cell ?? '');
                return `<td class="${isRight ? 'text-right mono' : 'text-left'} ${isBold ? 'font-bold' : ''}">${escapeHtml(cellVal)}</td>`;
              })
              .join('');
            return `<tr class="${isAlt ? 'row-alt' : 'row-normal'}">${cells}</tr>`;
          })
          .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(data.meta.title)} — ${escapeHtml(data.business.name)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 14mm 14mm;
    }
    @page :first {
      margin-top: 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100%;
      height: 100%;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 10.5px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .report-container {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
      padding: 0;
    }
    /* Header Section */
    .header-bar {
      border-bottom: 2.5px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 12px;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .business-title {
      font-size: 20px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: -0.02em;
      text-transform: uppercase;
      line-height: 1.2;
    }
    .business-meta {
      font-size: 10px;
      color: #475569;
      margin-top: 4px;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .business-meta strong {
      color: #0f172a;
    }
    .report-title-block {
      text-align: right;
    }
    .report-title {
      font-size: 16px;
      font-weight: 900;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      line-height: 1.2;
    }
    .report-ref {
      font-size: 9.5px;
      font-family: monospace;
      color: #64748b;
      margin-top: 3px;
    }
    /* Metadata Grid Ribbon */
    .meta-ribbon {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      font-size: 9.5px;
    }
    .meta-item-label {
      text-transform: uppercase;
      font-size: 8px;
      font-weight: 700;
      color: #94a3b8;
      display: block;
    }
    .meta-item-val {
      font-weight: 700;
      color: #1e293b;
    }
    /* Summary KPI Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .kpi-card {
      background: #f8fafc !important;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
    }
    .kpi-label {
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #64748b;
    }
    .kpi-value {
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
      font-family: monospace;
      margin-top: 2px;
    }
    .kpi-sub {
      font-size: 8.5px;
      color: #64748b;
      margin-top: 2px;
    }
    /* Table Styling */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      page-break-inside: auto;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    th {
      background-color: #f1f5f9 !important;
      color: #0f172a;
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 6px 8px;
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
    }
    td {
      padding: 5.5px 8px;
      font-size: 9.5px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }
    .row-alt {
      background-color: #f8fafc !important;
    }
    .row-normal {
      background-color: #ffffff !important;
    }
    .font-bold {
      font-weight: 700;
      color: #0f172a;
    }
    .mono {
      font-family: monospace;
      font-weight: 600;
    }
    .text-left {
      text-align: left;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .empty-cell {
      padding: 24px;
      color: #94a3b8;
      font-style: italic;
    }
    /* Footer Sign-off & Audit Notes */
    .footer-section {
      border-top: 2px solid #cbd5e1;
      padding-top: 12px;
      margin-top: 16px;
      page-break-inside: avoid;
    }
    .footer-grid {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }
    .audit-note {
      max-width: 60%;
    }
    .audit-note-title {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      color: #1e293b;
      margin-bottom: 2px;
    }
    .audit-note-text {
      font-size: 8.5px;
      color: #64748b;
      line-height: 1.4;
    }
    .signoff-box {
      text-align: right;
    }
    .signoff-line {
      width: 160px;
      border-bottom: 1px solid #64748b;
      padding-bottom: 3px;
      margin-bottom: 4px;
      font-size: 8px;
      color: #94a3b8;
      text-transform: uppercase;
      text-align: center;
    }
    .signoff-timestamp {
      font-size: 8.5px;
      color: #64748b;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Header -->
    <div class="header-bar">
      <div class="header-top">
        <div>
          <div class="business-title">${escapeHtml(data.business.name)}</div>
          <div class="business-meta">
            <span>Branch: <strong>${escapeHtml(data.location.name)}</strong></span>
            <span>City: <strong>${escapeHtml(data.location.city)}</strong></span>
            ${taxId ? `<span>Tax / PIN ID: <strong>${escapeHtml(taxId)}</strong></span>` : ''}
          </div>
        </div>
        <div class="report-title-block">
          <div class="report-title">${escapeHtml(data.meta.title)}</div>
          <div class="report-ref">Ref: RPT-${escapeHtml(data.meta.id.toUpperCase())}-${Date.now().toString().slice(-6)}</div>
        </div>
      </div>

      <!-- Metadata Ribbon -->
      <div class="meta-ribbon">
        <div>
          <span class="meta-item-label">Time Range</span>
          <span class="meta-item-val">${escapeHtml(formatRangeDisplay(data.dateRange))}</span>
        </div>
        <div>
          <span class="meta-item-label">Generated At</span>
          <span class="meta-item-val">${escapeHtml(currentDate)}</span>
        </div>
        <div>
          <span class="meta-item-label">Auditor / User</span>
          <span class="meta-item-val">${escapeHtml(data.generatedBy)}</span>
        </div>
        <div>
          <span class="meta-item-label">Currency</span>
          <span class="meta-item-val" style="color: #1e3a8a;">${escapeHtml(currency)}</span>
        </div>
      </div>
    </div>

    <!-- Summary KPI Cards -->
    ${summaryCardsHtml}

    <!-- Itemized Report Table -->
    <table>
      <thead>
        <tr>${tableHeadersHtml}</tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>

    <!-- Footer Sign-off & Audit Notes -->
    <div class="footer-section">
      <div class="footer-grid">
        <div class="audit-note">
          <div class="audit-note-title">System Audit & Compliance Note</div>
          <p class="audit-note-text">
            This official report was compiled directly from the authenticated SokoPoS Cloud Ledger.
            All figures reflect verified point-of-sale transactions, ledger journals, and inventory
            movements recorded under active tenant credentials.
          </p>
        </div>
        <div class="signoff-box">
          <div class="signoff-line">Authorized Signature / Stamp</div>
          <div class="signoff-timestamp">Official Z-Report Timestamp: ${escapeHtml(currentDate)}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Triggers an isolated, bulletproof browser print dialog for the report.
 * Guarantees zero blank/white pages by isolating print styles inside a standalone iframe.
 */
export function printReportDocument(data: ReportPrintData): void {
  // Remove existing print frame if present
  const oldIframe = document.getElementById('sokopos-report-print-iframe');
  if (oldIframe) {
    try {
      oldIframe.remove();
    } catch (_) {}
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'sokopos-report-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.zIndex = '-9999';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';

  document.body.appendChild(iframe);

  const frameDoc = iframe.contentWindow?.document;
  if (!frameDoc) {
    console.warn('Iframe document unavailable, falling back to window.print()');
    window.print();
    return;
  }

  const html = buildReportPrintHtml(data);
  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  // Allow browser layout engine 250ms to render CSS and font metrics
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.warn('Isolated iframe print failed, executing direct window.print() fallback:', err);
      window.print();
    } finally {
      // Clean up iframe after print stream is spooled
      setTimeout(() => {
        try {
          iframe.remove();
        } catch (_) {}
      }, 4000);
    }
  }, 250);
}

/**
 * Generates an official vector A4 PDF using jsPDF for direct download.
 */
export function generateReportPdf(data: ReportPrintData): {
  doc: jsPDF;
  blob: Blob;
  url: string;
  fileName: string;
} {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const currentDate = new Date().toLocaleString();
  const currency = data.business?.currency || 'KES';
  const taxId = data.business?.taxNumber || data.location?.taxId || '';

  let y = margin;

  // Helper for text
  const addHeader = (isFirstPage = true) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text((data.business.name || 'SOKOPOS RETAIL').toUpperCase(), margin, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    let subInfo = `Branch: ${data.location.name} | City: ${data.location.city}`;
    if (taxId) subInfo += ` | Tax PIN: ${taxId}`;
    doc.text(subInfo, margin, y + 10);

    // Right-side report title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 58, 138); // blue-900
    doc.text(data.meta.title.toUpperCase(), pageWidth - margin, y + 4, { align: 'right' });

    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Ref: RPT-${data.meta.id.toUpperCase()}-${Date.now().toString().slice(-6)}`, pageWidth - margin, y + 10, {
      align: 'right',
    });

    y += 14;

    // Divider
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.6);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    if (isFirstPage) {
      // Metadata line
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('TIME RANGE:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(formatRangeDisplay(data.dateRange), margin + 20, y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('GENERATED:', margin + 70, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(currentDate, margin + 90, y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('AUDITOR:', margin + 140, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(data.generatedBy.slice(0, 20), margin + 155, y);

      y += 6;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
    }
  };

  addHeader(true);

  // Summary KPI Cards (on first page if space permits)
  if (data.summaryCards && data.summaryCards.length > 0) {
    const cardCount = Math.min(data.summaryCards.length, 4);
    const cardWidth = (contentWidth - (cardCount - 1) * 3) / cardCount;
    const cardHeight = 14;

    data.summaryCards.slice(0, 4).forEach((card, idx) => {
      const cardX = margin + idx * (cardWidth + 3);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.25);
      doc.roundedRect(cardX, y, cardWidth, cardHeight, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(card.label.toUpperCase().slice(0, 20), cardX + 2.5, y + 4);

      doc.setFont('courier', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(String(card.value).slice(0, 16), cardX + 2.5, y + 8.5);

      if (card.sub) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text(card.sub.slice(0, 22), cardX + 2.5, y + 12);
      }
    });

    y += cardHeight + 6;
  }

  // Table Rendering
  const colCount = data.tableHeaders.length;
  const colWidth = contentWidth / colCount;

  const renderTableHead = () => {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
    doc.line(margin, y + 6, pageWidth - margin, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);

    data.tableHeaders.forEach((h, cIdx) => {
      const isRight = cIdx >= colCount - 2;
      const xPos = isRight ? margin + (cIdx + 1) * colWidth - 2 : margin + cIdx * colWidth + 2;
      doc.text(h.toUpperCase().slice(0, 18), xPos, y + 4.2, { align: isRight ? 'right' : 'left' });
    });

    y += 7.5;
  };

  renderTableHead();

  // Table Body Rows
  data.tableRows.forEach((row, rIdx) => {
    // Check page overflow
    if (y > pageHeight - 25) {
      doc.addPage();
      y = margin;
      addHeader(false);
      renderTableHead();
    }

    const isAlt = rIdx % 2 === 1;
    if (isAlt) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 1, contentWidth, 5.5, 'F');
    }

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.15);
    doc.line(margin, y + 4.5, pageWidth - margin, y + 4.5);

    doc.setFontSize(7);

    row.forEach((cell, cIdx) => {
      const isRight = cIdx >= colCount - 2;
      const isFirst = cIdx === 0;
      const xPos = isRight ? margin + (cIdx + 1) * colWidth - 2 : margin + cIdx * colWidth + 2;

      if (isFirst) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
      } else if (isRight) {
        doc.setFont('courier', 'normal');
        doc.setTextColor(30, 41, 59);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
      }

      const cellText = typeof cell === 'boolean' ? (cell ? 'YES' : 'NO') : String(cell ?? '');
      doc.text(cellText.slice(0, 26), xPos, y + 3, { align: isRight ? 'right' : 'left' });
    });

    y += 5.5;
  });

  // Footer Audit Section
  if (y > pageHeight - 35) {
    doc.addPage();
    y = margin;
    addHeader(false);
  }

  y += 6;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('SYSTEM AUDIT & COMPLIANCE NOTE', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'This official report was compiled directly from the authenticated SokoPoS Cloud Ledger. Figures reflect verified point-of-sale transactions.',
    margin,
    y + 4
  );

  doc.text(`Official POS Z-Report Timestamp: ${currentDate}`, margin, y + 8);

  // Signature line on right
  const sigX = pageWidth - margin - 50;
  doc.setDrawColor(148, 163, 184);
  doc.line(sigX, y + 4, pageWidth - margin, y + 4);
  doc.setFontSize(6);
  doc.text('AUTHORIZED SIGNATURE / STAMP', sigX + 25, y + 7, { align: 'center' });

  const safeTitle = data.meta.title.replace(/[^a-z0-9]/gi, '_');
  const safeLoc = (data.location.name || 'Store').replace(/[^a-z0-9]/gi, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `Report_${safeTitle}_${safeLoc}_${dateStr}.pdf`;

  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);

  return { doc, blob, url, fileName };
}

/**
 * Downloads the official A4 PDF directly to user's device.
 */
export function downloadReportPdf(data: ReportPrintData): void {
  const { fileName, url } = generateReportPdf(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
