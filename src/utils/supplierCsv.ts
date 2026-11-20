import { Supplier, SupplierPaymentTerms } from '../types';
import { parseCsvMatrix, triggerCsvDownload } from './inventoryCsv';

export type SupplierCsvDraft = Omit<Supplier, 'id' | 'businessId' | 'createdAt'>;

export interface ParsedCsvSupplierRow {
  rowNumber: number;
  status: 'new' | 'duplicate' | 'error';
  issues: string[];
  warnings: string[];
  matchedSupplierId?: string;
  matchedSupplierName?: string;
  matchReason?: string;
  draft: SupplierCsvDraft;
}

export interface SupplierCsvAnalysisResult {
  headers: string[];
  missingRequiredColumns: string[];
  rows: ParsedCsvSupplierRow[];
  counts: {
    total: number;
    validNew: number;
    duplicates: number;
    errors: number;
    inFileDuplicates: number;
  };
}

function escapeCsvCell(val: unknown): string {
  const str = val === null || val === undefined ? '' : String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function normalizeSupplierPhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  // Normalize Kenyan numbers (07XXXXXXXX / 2547XXXXXXXX / 7XXXXXXXX) for consistent matching
  if (digits.length === 10 && (digits.startsWith('07') || digits.startsWith('01'))) {
    return `254${digits.slice(1)}`;
  }
  if (digits.length === 9 && (digits.startsWith('7') || digits.startsWith('1'))) {
    return `254${digits}`;
  }
  return digits;
}

function parsePaymentTerms(raw: string): { value: SupplierPaymentTerms; valid: boolean } {
  const cleaned = raw.trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (!cleaned) return { value: 'net_14', valid: true };
  if (cleaned === 'cod' || cleaned === 'cashondelivery' || cleaned === 'cash') {
    return { value: 'cod', valid: true };
  }
  if (cleaned === 'net7' || cleaned === '7days' || cleaned === '7d' || cleaned === '7') {
    return { value: 'net_7', valid: true };
  }
  if (cleaned === 'net14' || cleaned === '14days' || cleaned === '14d' || cleaned === '14') {
    return { value: 'net_14', valid: true };
  }
  if (cleaned === 'net30' || cleaned === '30days' || cleaned === '30d' || cleaned === '30') {
    return { value: 'net_30', valid: true };
  }
  if (cleaned === 'consignment' || cleaned === 'consign') {
    return { value: 'consignment', valid: true };
  }
  if (cleaned === 'prepaid' || cleaned === 'advance' || cleaned === 'proforma') {
    return { value: 'prepaid', valid: true };
  }
  return { value: 'net_14', valid: false };
}

function parseSupplierStatus(raw: string): { value: 'active' | 'inactive'; valid: boolean } {
  const cleaned = raw.trim().toLowerCase();
  if (!cleaned || cleaned === 'active' || cleaned === 'enabled' || cleaned === 'yes') {
    return { value: 'active', valid: true };
  }
  if (
    cleaned === 'inactive' ||
    cleaned === 'disabled' ||
    cleaned === 'on-hold' ||
    cleaned === 'on hold' ||
    cleaned === 'hold' ||
    cleaned === 'no'
  ) {
    return { value: 'inactive', valid: true };
  }
  return { value: 'active', valid: false };
}

export function downloadSupplierCsvTemplate(): void {
  const headers = [
    'Company Name',
    'Contact Person',
    'Phone',
    'Email',
    'Category',
    'Address',
    'City',
    'KRA PIN',
    'Payment Terms',
    'Lead Time (Days)',
    'M-Pesa Paybill/Till',
    'Bank Name',
    'Bank Account',
    'Status',
    'Notes',
  ];

  const sampleRows = [
    [
      'Unga Mills East Africa Ltd',
      'David Kilonzo',
      '+254712345678',
      'orders@ungamills.co.ke',
      'Flour & Grains',
      'Commercial St, Industrial Area',
      'Nairobi',
      'P051234567X',
      'net_14',
      '2',
      'Paybill 247247 Acc 0180293847',
      'Equity Bank',
      '0180293847291',
      'active',
      'Delivers Tue & Fri mornings',
    ],
    [
      'Coast Beverages Distributors',
      'Amina Hassan',
      '+254722987654',
      'dispatch@coastbev.co.ke',
      'Beverages',
      'Moi Avenue Depot 4',
      'Mombasa',
      'P051987654M',
      'cod',
      '1',
      'Till 519204',
      '',
      '',
      'active',
      'Minimum order KES 15,000',
    ],
  ];

  const csv = [headers, ...sampleRows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\r\n');
  triggerCsvDownload(csv, 'sokopos-suppliers-template.csv');
}

export function downloadSupplierValidationReport(rows: ParsedCsvSupplierRow[]): void {
  const headers = [
    'Row #',
    'Status',
    'Company Name',
    'Phone',
    'KRA PIN',
    'Payment Terms',
    'Validation Issues / Notes',
  ];

  const reportRows = rows.map((r) => [
    r.rowNumber,
    r.status.toUpperCase(),
    r.draft.name,
    r.draft.phone,
    r.draft.kraPin || '',
    r.draft.paymentTerms,
    [...r.issues, ...r.warnings, r.matchReason].filter(Boolean).join('; ') || 'Valid',
  ]);

  const csv = [headers, ...reportRows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\r\n');
  const dateTag = new Date().toISOString().split('T')[0];
  triggerCsvDownload(csv, `sokopos-supplier-validation-${dateTag}.csv`);
}

export function analyzeImportedSuppliersCsv(
  csvText: string,
  existingSuppliers: Supplier[]
): SupplierCsvAnalysisResult {
  const matrix = parseCsvMatrix(csvText);
  if (matrix.length === 0) {
    return {
      headers: [],
      missingRequiredColumns: ['Company Name', 'Phone'],
      rows: [],
      counts: { total: 0, validNew: 0, duplicates: 0, errors: 0, inFileDuplicates: 0 },
    };
  }

  const rawHeaders = matrix[0];
  const normHeaders = rawHeaders.map(normalizeHeader);

  const findCol = (exactCandidates: string[], partialCandidates: string[] = []) => {
    const exactIdx = normHeaders.findIndex((h) => exactCandidates.includes(h));
    if (exactIdx >= 0) return exactIdx;
    return normHeaders.findIndex((h) =>
      partialCandidates.some((c) => h === c || h.includes(c))
    );
  };

  const nameIdx = findCol(
    ['company name', 'supplier name', 'vendor name', 'name', 'supplier', 'vendor'],
    ['company', 'vendor name', 'supplier name']
  );
  const contactIdx = findCol(
    ['contact person', 'sales rep', 'rep', 'contact name', 'contact'],
    ['contact person', 'sales rep']
  );
  const phoneIdx = findCol(
    ['phone', 'phone number', 'mobile', 'tel', 'telephone'],
    ['phone', 'mobile', 'tel']
  );
  const emailIdx = findCol(['email', 'email address', 'e mail'], ['email']);
  const categoryIdx = findCol(
    ['category', 'supply category', 'trade category'],
    ['category']
  );
  const addressIdx = findCol(
    ['address', 'depot address', 'warehouse address', 'street'],
    ['address']
  );
  const cityIdx = findCol(['city', 'town', 'region'], ['city', 'region']);
  const kraPinIdx = findCol(['kra pin', 'kra', 'pin', 'tax id', 'tax pin'], ['kra']);
  const termsIdx = findCol(
    ['payment terms', 'terms', 'settlement terms'],
    ['payment term', 'terms']
  );
  const leadTimeIdx = findCol(
    ['lead time', 'lead time days', 'delivery days'],
    ['lead time']
  );
  const mpesaIdx = findCol(
    ['mpesa paybill till', 'm pesa paybill till', 'mpesa', 'paybill', 'till'],
    ['mpesa', 'paybill', 'till']
  );
  const bankNameIdx = findCol(['bank name', 'bank'], ['bank name']);
  const bankAccIdx = findCol(
    ['bank account', 'account number', 'bank acc'],
    ['account']
  );
  const statusIdx = findCol(['status', 'vendor status'], ['status']);
  const notesIdx = findCol(['notes', 'supply notes', 'remarks'], ['note', 'remark']);

  const missingRequiredColumns: string[] = [];
  if (nameIdx < 0) missingRequiredColumns.push('Company Name');
  if (phoneIdx < 0) missingRequiredColumns.push('Phone');

  if (matrix.length < 2) {
    return {
      headers: rawHeaders,
      missingRequiredColumns,
      rows: [],
      counts: { total: 0, validNew: 0, duplicates: 0, errors: 0, inFileDuplicates: 0 },
    };
  }

  // Existing directory lookups for consistency checking
  const existingByName = new Map<string, Supplier>();
  const existingByPhone = new Map<string, Supplier>();
  const existingByKraPin = new Map<string, Supplier>();

  existingSuppliers.forEach((s) => {
    if (s.name) existingByName.set(s.name.trim().toLowerCase(), s);
    const normPhone = normalizeSupplierPhone(s.phone || '');
    if (normPhone) existingByPhone.set(normPhone, s);
    if (s.kraPin) existingByKraPin.set(s.kraPin.trim().toUpperCase(), s);
  });

  // In-file duplicate trackers
  const seenNamesInCsv = new Map<string, number>();
  const seenPhonesInCsv = new Map<string, number>();
  const seenKraPinsInCsv = new Map<string, number>();

  const rows: ParsedCsvSupplierRow[] = [];
  let validNew = 0;
  let duplicates = 0;
  let errors = 0;
  let inFileDuplicates = 0;

  for (let r = 1; r < matrix.length; r++) {
    const cols = matrix[r];
    const rowNumber = r + 1;

    const name = nameIdx >= 0 ? (cols[nameIdx] || '').trim() : '';
    const contactPerson = contactIdx >= 0 ? (cols[contactIdx] || '').trim() : '';
    const rawPhone = phoneIdx >= 0 ? (cols[phoneIdx] || '').trim() : '';
    const email = emailIdx >= 0 ? (cols[emailIdx] || '').trim() : '';
    const category = categoryIdx >= 0 ? (cols[categoryIdx] || '').trim() : '';
    const address = addressIdx >= 0 ? (cols[addressIdx] || '').trim() : '';
    const city = cityIdx >= 0 ? (cols[cityIdx] || '').trim() : '';
    const kraPin = kraPinIdx >= 0 ? (cols[kraPinIdx] || '').trim().toUpperCase() : '';
    const rawTerms = termsIdx >= 0 ? (cols[termsIdx] || '').trim() : '';
    const rawLeadTime = leadTimeIdx >= 0 ? (cols[leadTimeIdx] || '').trim() : '';
    const mpesaPaybillOrTill = mpesaIdx >= 0 ? (cols[mpesaIdx] || '').trim() : '';
    const bankName = bankNameIdx >= 0 ? (cols[bankNameIdx] || '').trim() : '';
    const bankAccount = bankAccIdx >= 0 ? (cols[bankAccIdx] || '').trim() : '';
    const rawStatus = statusIdx >= 0 ? (cols[statusIdx] || '').trim() : '';
    const notes = notesIdx >= 0 ? (cols[notesIdx] || '').trim() : '';

    const issues: string[] = [];
    const warnings: string[] = [];

    if (!name) {
      issues.push('Missing company name');
    }

    const normalizedPhone = normalizeSupplierPhone(rawPhone);
    if (!rawPhone) {
      issues.push('Missing phone number');
    } else if (normalizedPhone.length < 9 || normalizedPhone.length > 15) {
      issues.push('Invalid phone number (expected 9–15 digits)');
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      issues.push('Invalid email address format');
    }

    if (kraPin && !/^[AP]\d{9}[A-Z]$/i.test(kraPin)) {
      issues.push('Invalid KRA PIN (expected e.g. P051234567X)');
    }

    const parsedTerms = parsePaymentTerms(rawTerms);
    if (!parsedTerms.valid) {
      issues.push(
        `Invalid payment terms "${rawTerms}" (use COD, Net 7, Net 14, Net 30, Consignment, or Prepaid)`
      );
    }

    let leadTimeDays = 2;
    if (rawLeadTime) {
      const cleanedLead = rawLeadTime.replace(/\s*days?$/i, '').trim();
      const parsedNum = Number(cleanedLead);
      if (!Number.isFinite(parsedNum) || !Number.isInteger(parsedNum) || parsedNum < 0) {
        issues.push('Lead time must be a non-negative whole number of days');
      } else {
        leadTimeDays = parsedNum;
      }
    }

    const parsedStatus = parseSupplierStatus(rawStatus);
    if (!parsedStatus.valid) {
      issues.push(`Invalid status "${rawStatus}" (use active or inactive)`);
    }

    if (bankAccount && !bankName) {
      warnings.push('Bank account provided without Bank Name');
    }

    // Cross-row in-file consistency check
    const nameKey = name.toLowerCase();
    if (nameKey && seenNamesInCsv.has(nameKey)) {
      issues.push(`Duplicate supplier name in CSV (first seen on row ${seenNamesInCsv.get(nameKey)})`);
      inFileDuplicates += 1;
    } else if (normalizedPhone && seenPhonesInCsv.has(normalizedPhone)) {
      issues.push(`Duplicate phone number in CSV (first seen on row ${seenPhonesInCsv.get(normalizedPhone)})`);
      inFileDuplicates += 1;
    } else if (kraPin && seenKraPinsInCsv.has(kraPin)) {
      issues.push(`Duplicate KRA PIN in CSV (first seen on row ${seenKraPinsInCsv.get(kraPin)})`);
      inFileDuplicates += 1;
    }

    if (nameKey && !seenNamesInCsv.has(nameKey)) seenNamesInCsv.set(nameKey, rowNumber);
    if (normalizedPhone && !seenPhonesInCsv.has(normalizedPhone)) {
      seenPhonesInCsv.set(normalizedPhone, rowNumber);
    }
    if (kraPin && !seenKraPinsInCsv.has(kraPin)) seenKraPinsInCsv.set(kraPin, rowNumber);

    // Directory match check
    let matchedSupplier: Supplier | undefined;
    let matchReason: string | undefined;

    if (nameKey && existingByName.has(nameKey)) {
      matchedSupplier = existingByName.get(nameKey);
      matchReason = 'Matches existing supplier name';
    } else if (normalizedPhone && existingByPhone.has(normalizedPhone)) {
      matchedSupplier = existingByPhone.get(normalizedPhone);
      matchReason = `Matches phone of ${matchedSupplier?.name}`;
    } else if (kraPin && existingByKraPin.has(kraPin)) {
      matchedSupplier = existingByKraPin.get(kraPin);
      matchReason = `Matches KRA PIN of ${matchedSupplier?.name}`;
    }

    const status: ParsedCsvSupplierRow['status'] =
      issues.length > 0 ? 'error' : matchedSupplier ? 'duplicate' : 'new';

    if (status === 'new') validNew += 1;
    else if (status === 'duplicate') duplicates += 1;
    else errors += 1;

    rows.push({
      rowNumber,
      status,
      issues,
      warnings,
      matchedSupplierId: matchedSupplier?.id,
      matchedSupplierName: matchedSupplier?.name,
      matchReason,
      draft: {
        name: name || 'Unnamed Supplier',
        contactPerson: contactPerson || undefined,
        phone: rawPhone,
        email: email || undefined,
        category: category || undefined,
        address: address || undefined,
        city: city || undefined,
        kraPin: kraPin || undefined,
        paymentTerms: parsedTerms.value,
        bankName: bankName || undefined,
        bankAccount: bankAccount || undefined,
        mpesaPaybillOrTill: mpesaPaybillOrTill || undefined,
        leadTimeDays,
        status: parsedStatus.value,
        notes: notes || undefined,
      },
    });
  }

  return {
    headers: rawHeaders,
    missingRequiredColumns,
    rows,
    counts: {
      total: rows.length,
      validNew,
      duplicates,
      errors,
      inFileDuplicates,
    },
  };
}
