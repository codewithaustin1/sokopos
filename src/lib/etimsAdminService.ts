import { resolveApiUrl } from './apiConfig';

export type EtimsOutboxStatus =
  | 'FAILED'
  | 'PENDING'
  | 'WAITING_SALE'
  | 'MISSING'
  | 'COMPLETED';

export type EtimsOutboxKind = 'sale' | 'credit_note';

export type EtimsErrorCategory =
  | 'COMPLIANT'
  | 'PARENT_SALE_UNFISCALIZED'
  | 'TAX_PIN_MISMATCH'
  | 'SKU_UNREGISTERED'
  | 'GATEWAY_UNCONFIGURED'
  | 'FISCAL_VALIDATION'
  | 'GATEWAY_TIMEOUT'
  | 'CU_REJECTED'
  | 'AWAITING_SIGNATURE'
  | 'NEVER_SUBMITTED';

export interface AdminEtimsLineSummary {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  taxTypeCode?: string;
  hasDigitaxItemId: boolean;
}

export interface AdminEtimsOutboxItem {
  outboxId: string;
  kind: EtimsOutboxKind;
  transactionId: string;
  refundId?: string;
  businessId: string;
  businessName: string;
  businessCode: string;
  ownerEmail: string;
  environment: 'sandbox' | 'production';
  configuredTaxPin: string;
  receiptNumber: string;
  refundNumber?: string;
  traderInvoiceNumber: string;
  originalTraderInvoiceNumber?: string;
  timestamp: string;
  amountKes: number;
  taxAmountKes: number;
  paymentMethod: string;
  status: EtimsOutboxStatus;
  digitaxId?: string;
  cuSerialNumber?: string;
  cuInvoiceNumber?: number | string;
  fiscalReceiptNumber?: number | string;
  receiptSignature?: string;
  etimsUrl?: string;
  attemptCount: number;
  lastAttemptAt?: string;
  lastError?: string;
  errorCategory: EtimsErrorCategory;
  parentSaleStatus?: EtimsOutboxStatus;
  parentSaleId?: string;
  parentCuInvoiceNumber?: number | string;
  itemCount: number;
  itemsSummary: AdminEtimsLineSummary[];
  overrideReason?: string;
  overriddenByEmail?: string;
  overriddenAt?: string;
}

export interface AdminEtimsTenantSummary {
  businessId: string;
  businessName: string;
  businessCode: string;
  taxPin: string;
  environment: 'sandbox' | 'production';
  totalCount: number;
  completedCount: number;
  failedCount: number;
  pendingCount: number;
  waitingSaleCount: number;
  missingCount: number;
  attentionCount: number;
  exposedKes: number;
}

export interface AdminEtimsOutboxSummary {
  totalRecords: number;
  completedCount: number;
  failedCount: number;
  pendingCount: number;
  waitingSaleCount: number;
  missingCount: number;
  attentionCount: number;
  failedSalesCount: number;
  failedCreditNotesCount: number;
  complianceRatePct: number;
  affectedTenantCount: number;
  exposedKes: number;
  digitaxConfigured: {
    sandbox: boolean;
    production: boolean;
  };
}

export interface AdminEtimsOutboxResponse {
  success: boolean;
  items: AdminEtimsOutboxItem[];
  tenants: AdminEtimsTenantSummary[];
  summary?: AdminEtimsOutboxSummary;
  error?: string;
}

export interface AdminEtimsActionResponse {
  success: boolean;
  status?: string;
  code?: string;
  newlyRegisteredSkus?: number;
  beforeValue?: unknown;
  afterValue?: unknown;
  message?: string;
  error?: string;
}

export interface AdminEtimsBulkReplayItemResult {
  transactionId: string;
  refundId?: string;
  businessId?: string;
  businessName?: string;
  receiptNumber?: string;
  kind: EtimsOutboxKind;
  ok: boolean;
  status: string;
  message: string;
  beforeValue?: unknown;
  afterValue?: unknown;
}

export interface AdminEtimsBulkReplayResponse {
  success: boolean;
  results: AdminEtimsBulkReplayItemResult[];
  summary?: {
    processed: number;
    completedCount: number;
    pendingCount: number;
    failedCount: number;
  };
  error?: string;
}

export async function fetchAdminEtimsOutbox(
  idToken: string
): Promise<AdminEtimsOutboxResponse> {
  const res = await fetch(resolveApiUrl('/api/digitax/admin/outbox'), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      items: [],
      tenants: [],
      error: body?.error || `Failed to load Global eTIMS Outbox (${res.status})`,
    };
  }
  return {
    success: Boolean(body?.success),
    items: Array.isArray(body?.items) ? body.items : [],
    tenants: Array.isArray(body?.tenants) ? body.tenants : [],
    summary: body?.summary,
  };
}

export async function pollAdminEtimsItem(
  idToken: string,
  params: { transactionId: string; refundId?: string }
): Promise<AdminEtimsActionResponse> {
  const res = await fetch(resolveApiUrl('/api/digitax/admin/poll'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(params),
  });
  const body = await res.json().catch(() => ({}));
  return {
    success: Boolean(res.ok && body?.success),
    status: body?.status,
    code: body?.code,
    beforeValue: body?.beforeValue,
    afterValue: body?.afterValue,
    message: body?.message,
    error: body?.error || (!res.ok ? `Poll request failed (${res.status})` : undefined),
  };
}

export async function retryAdminEtimsItem(
  idToken: string,
  params: { transactionId: string; refundId?: string }
): Promise<AdminEtimsActionResponse> {
  const res = await fetch(resolveApiUrl('/api/digitax/admin/retry'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(params),
  });
  const body = await res.json().catch(() => ({}));
  return {
    success: Boolean(res.ok && body?.success),
    status: body?.status,
    code: body?.code,
    newlyRegisteredSkus: body?.newlyRegisteredSkus,
    beforeValue: body?.beforeValue,
    afterValue: body?.afterValue,
    message: body?.message,
    error: body?.error || (!res.ok ? `Retry request failed (${res.status})` : undefined),
  };
}

export async function bulkReplayAdminEtims(
  idToken: string,
  items: Array<{ transactionId: string; refundId?: string }>
): Promise<AdminEtimsBulkReplayResponse> {
  const res = await fetch(resolveApiUrl('/api/digitax/admin/bulk-replay'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ items }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      results: [],
      error: body?.error || `Bulk replay failed (${res.status})`,
    };
  }
  return {
    success: Boolean(body?.success),
    results: Array.isArray(body?.results) ? body.results : [],
    summary: body?.summary,
  };
}

export async function overrideAdminEtimsItem(
  idToken: string,
  params: {
    transactionId: string;
    refundId?: string;
    targetStatus: 'COMPLETED' | 'FAILED';
    reason: string;
    cuInvoiceNumber?: string;
    cuSerialNumber?: string;
    receiptSignature?: string;
    etimsUrl?: string;
  }
): Promise<AdminEtimsActionResponse> {
  const res = await fetch(resolveApiUrl('/api/digitax/admin/override'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(params),
  });
  const body = await res.json().catch(() => ({}));
  return {
    success: Boolean(res.ok && body?.success),
    status: body?.status,
    beforeValue: body?.beforeValue,
    afterValue: body?.afterValue,
    message: body?.message,
    error: body?.error || (!res.ok ? `Override request failed (${res.status})` : undefined),
  };
}
