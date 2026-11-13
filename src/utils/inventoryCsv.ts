import { Location, Product, Supplier } from '../types';

function escapeCsvCell(val: unknown): string {
  const str = val === null || val === undefined ? '' : String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function triggerCsvDownload(csvContent: string, filename: string): void {
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportProductsToCsv(
  products: Product[],
  locations: Location[],
  includeCostPrice: boolean,
  filenamePrefix = 'sokopos-inventory'
): void {
  const headers: string[] = [
    'Name',
    'SKU',
    'Barcode',
    'Category',
    'Supplier',
    ...(includeCostPrice ? ['Buying Price'] : []),
    'Selling Price',
    'Unit',
    'Reorder Point',
    'Description',
    ...locations.map((loc) => `Stock (${loc.name})`),
  ];

  const rows = products.map((p) => [
    p.name,
    p.sku,
    p.barcode,
    p.category || 'All',
    p.supplierName || '',
    ...(includeCostPrice ? [p.buyingPrice.toFixed(2)] : []),
    p.sellingPrice.toFixed(2),
    p.unit || 'piece',
    String(p.reorderPoint ?? 10),
    p.description || '',
    ...locations.map((loc) => String(p.stockByLocation?.[loc.id] ?? 0)),
  ]);

  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(','));
  const dateTag = new Date().toISOString().split('T')[0];
  triggerCsvDownload(lines.join('\r\n'), `${filenamePrefix}-${dateTag}.csv`);
}

export function downloadProductCsvTemplate(locations: Location[]): void {
  const branchCols = locations.length > 0 ? locations.map((loc) => `Stock (${loc.name})`) : ['Stock'];
  const headers = [
    'Name',
    'SKU',
    'Barcode',
    'Category',
    'Supplier',
    'Buying Price',
    'Selling Price',
    'Unit',
    'Reorder Point',
    'Description',
    ...branchCols,
  ];
  const sampleRow = [
    'Jogoo Maize Meal 2kg',
    'SKU-1042',
    '6161100123456',
    'Flour & Grains',
    '',
    '145.00',
    '180.00',
    'packet',
    '15',
    'Fortified sifted maize meal',
    ...branchCols.map(() => '25'),
  ];
  const csv = [headers, sampleRow].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
  triggerCsvDownload(csv, 'sokopos-catalog-template.csv');
}

export function parseCsvMatrix(rawText: string): string[][] {
  const text = rawText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field.trim());
      field = '';
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field.trim());
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  row.push(field.trim());
  if (row.some((cell) => cell.length > 0)) {
    rows.push(row);
  }
  return rows;
}

export interface ParsedCsvProductRow {
  rowNumber: number;
  status: 'new' | 'duplicate' | 'error';
  error?: string;
  matchedProductId?: string;
  draft: Omit<Product, 'id' | 'businessId'>;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function analyzeImportedProductsCsv(
  csvText: string,
  existingProducts: Product[],
  suppliers: Supplier[],
  locations: Location[],
  activeLocationId: string
): { headers: string[]; rows: ParsedCsvProductRow[] } {
  const matrix = parseCsvMatrix(csvText);
  if (matrix.length < 2) {
    return { headers: matrix[0] || [], rows: [] };
  }

  const rawHeaders = matrix[0];
  const normHeaders = rawHeaders.map(normalizeHeader);

  const findCol = (candidates: string[]) =>
    normHeaders.findIndex((h) => candidates.some((c) => h === c || h.includes(c)));

  const nameIdx = findCol(['product name', 'name', 'item']);
  const skuIdx = findCol(['sku', 'item code']);
  const barcodeIdx = findCol(['barcode', 'ean', 'upc']);
  const categoryIdx = findCol(['category', 'dept']);
  const supplierIdx = findCol(['supplier']);
  const buyingIdx = findCol(['buying price', 'cost price', 'buying', 'cost']);
  const sellingIdx = findCol(['selling price', 'retail price', 'selling', 'price']);
  const unitIdx = findCol(['unit', 'uom']);
  const reorderIdx = findCol(['reorder point', 'reorder', 'min stock']);
  const descIdx = findCol(['description', 'notes']);

  // Map stock columns to locations
  const branchStockCols: Array<{ colIndex: number; locationId: string }> = [];
  rawHeaders.forEach((rawH, idx) => {
    const low = rawH.trim().toLowerCase();
    if (!low.startsWith('stock')) return;
    const matchedLoc = locations.find((loc) => {
      const n = loc.name.toLowerCase();
      const code = (loc.code || '').toLowerCase();
      return low.includes(n) || (code && low.includes(code)) || low.includes(loc.id.toLowerCase());
    });
    if (matchedLoc) {
      branchStockCols.push({ colIndex: idx, locationId: matchedLoc.id });
    } else if (low === 'stock' || low === 'quantity' || low === 'qty') {
      branchStockCols.push({ colIndex: idx, locationId: activeLocationId });
    }
  });

  const skuLookup = new Map<string, Product>();
  const barcodeLookup = new Map<string, Product>();
  existingProducts.forEach((p) => {
    if (p.sku) skuLookup.set(p.sku.trim().toLowerCase(), p);
    if (p.barcode) barcodeLookup.set(p.barcode.trim().toLowerCase(), p);
  });

  const rows: ParsedCsvProductRow[] = [];

  for (let r = 1; r < matrix.length; r++) {
    const cols = matrix[r];
    const name = nameIdx >= 0 ? (cols[nameIdx] || '').trim() : '';
    const rawSku = skuIdx >= 0 ? (cols[skuIdx] || '').trim() : '';
    const rawBarcode = barcodeIdx >= 0 ? (cols[barcodeIdx] || '').trim() : '';
    const category = categoryIdx >= 0 && cols[categoryIdx]?.trim() ? cols[categoryIdx].trim() : 'All';
    const rawSupplier = supplierIdx >= 0 ? (cols[supplierIdx] || '').trim() : '';
    const rawBuying = buyingIdx >= 0 ? Number((cols[buyingIdx] || '').replace(/[^0-9.-]/g, '')) : 0;
    const rawSelling = sellingIdx >= 0 ? Number((cols[sellingIdx] || '').replace(/[^0-9.-]/g, '')) : NaN;
    const unit = unitIdx >= 0 && cols[unitIdx]?.trim() ? cols[unitIdx].trim() : 'piece';
    const rawReorder = reorderIdx >= 0 ? parseInt((cols[reorderIdx] || '').replace(/[^0-9]/g, ''), 10) : 10;
    const description = descIdx >= 0 ? (cols[descIdx] || '').trim() : '';

    const stockByLocation: Record<string, number> = {};
    locations.forEach((loc) => {
      stockByLocation[loc.id] = 0;
    });
    branchStockCols.forEach(({ colIndex, locationId }) => {
      const parsed = parseInt((cols[colIndex] || '').replace(/[^0-9-]/g, ''), 10);
      if (Number.isFinite(parsed) && parsed >= 0) {
        stockByLocation[locationId] = parsed;
      }
    });

    const sku = rawSku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
    const barcode = rawBarcode || `616${Math.floor(100000000 + Math.random() * 900000000)}`;

    const matchedSupplier = rawSupplier
      ? suppliers.find((s) => s.name.trim().toLowerCase() === rawSupplier.toLowerCase())
      : undefined;

    const existingMatch =
      (rawSku && skuLookup.get(rawSku.toLowerCase())) ||
      (rawBarcode && barcodeLookup.get(rawBarcode.toLowerCase())) ||
      undefined;

    let error: string | undefined;
    if (!name) {
      error = 'Missing product name';
    } else if (!Number.isFinite(rawSelling) || rawSelling < 0) {
      error = 'Invalid or missing selling price';
    } else if (!Number.isFinite(rawBuying) || rawBuying < 0) {
      error = 'Invalid buying price';
    }

    rows.push({
      rowNumber: r + 1,
      status: error ? 'error' : existingMatch ? 'duplicate' : 'new',
      error,
      matchedProductId: existingMatch?.id,
      draft: {
        name: name || 'Unnamed Item',
        sku,
        barcode,
        category,
        supplierId: matchedSupplier ? matchedSupplier.id : existingMatch?.supplierId ?? null,
        supplierName: matchedSupplier ? matchedSupplier.name : rawSupplier || existingMatch?.supplierName || null,
        buyingPrice: Number.isFinite(rawBuying) ? Math.max(0, rawBuying) : 0,
        sellingPrice: Number.isFinite(rawSelling) ? Math.max(0, rawSelling) : 0,
        unit,
        taxRate: existingMatch?.taxRate ?? 0.16,
        reorderPoint: Number.isFinite(rawReorder) ? Math.max(0, rawReorder) : 10,
        description,
        stockByLocation,
      },
    });
  }

  return { headers: rawHeaders, rows };
}
