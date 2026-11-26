/**
 * Digitax KRA eTIMS Integration Service
 *
 * Provides authenticated, server-validated electronic tax register (eTIMS)
 * SKU registration, itemized invoicing, automated Credit Notes on refunds,
 * and certified Control Unit (CU) polling in partnership with Digitax Technologies.
 */
import { auth } from '../lib/firebase';
import { resolveApiUrl } from '../lib/apiConfig';
import type {
  BusinessTaxSettings,
  CartItem,
  KraTaxTypeCode,
  PaymentMethod,
  Product,
  RefundRecord,
  SplitPaymentTender,
} from '../types';
import {
  buildDigitaxCreditNotePayload,
  buildDigitaxSalePayload,
  DigitaxCreditNotePayload,
  DigitaxSalePayload,
  resolveKraTaxTypeCode,
  roundCurrency2,
} from '../utils/etimsFiscalMapper';
import { resolveDynamicTaxRate } from '../utils/taxResolver';

export interface DigitaxEtimsInfo {
  tax_pin: string;
  branch_office_id: string;
  branch_office_name?: string;
  branch_status_code?: string;
  county_name?: string;
  sub_county_name?: string;
  tax_locality_name?: string;
  location_description?: string;
  manager_name?: string;
  manager_contact?: string;
  manager_email?: string;
  is_head_office: boolean;
  business_id: string;
  environment?: 'sandbox' | 'production';
}

export interface DigitaxItem {
  id: string;
  item_class_code: string;
  item_type_code: string;
  item_name: string;
  origin_nation_code: string;
  package_unit_code: string;
  quantity_unit_code: string;
  tax_type_code: KraTaxTypeCode;
  default_unit_price: number;
  etims_item_code: string;
  is_stock_item: boolean;
  stock_quantity: number;
  active: boolean;
  status: string;
}

export interface CreateDigitaxItemParams {
  item_name: string;
  item_class_code?: string;
  item_type_code?: '1' | '2' | '3';
  tax_type_code: KraTaxTypeCode;
  origin_nation_code?: string;
  package_unit_code?: string;
  quantity_unit_code?: string;
  default_unit_price: number;
  is_stock_item?: boolean;
  sku?: string;
}

export interface DigitaxSaleResponse {
  id: string;
  date: string;
  time: string;
  trader_invoice_number: string;
  receipt_type_code: string;
  sale_detail_url?: string;
  serial_number: string;
  receipt_number: number;
  invoice_number: number;
  customer_id?: string;
  customer_name?: string;
  customer_tin?: string;
  customer_pin?: string;
  internal_data: string;
  receipt_signature: string;
  etims_url: string;
  offline_url: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  sales_tax_summary?: {
    taxable_amount_a: number;
    taxable_amount_b: number;
    taxable_amount_c: number;
    taxable_amount_d: number;
    taxable_amount_e: number;
    tax_rate_a: number;
    tax_rate_b: number;
    tax_rate_c: number;
    tax_rate_d: number;
    tax_rate_e: number;
    tax_amount_a: number;
    tax_amount_b: number;
    tax_amount_c: number;
    tax_amount_d: number;
    tax_amount_e: number;
  };
}

export interface DigitaxCreditNoteResponse extends DigitaxSaleResponse {
  sale_id?: string;
  original_trader_invoice_number?: string;
}

export class DigitaxApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly retryable: boolean;

  constructor(message: string, status = 500, code = 'DIGITAX_ERROR') {
    super(message);
    this.name = 'DigitaxApiError';
    this.status = status;
    this.code = code;
    this.retryable = status === 0 || status >= 500 || status === 429 || status === 408;
  }
}

class DigitaxService {
  private cachedItemsByKey = new Map<string, DigitaxItem>();

  private async getProxyHeaders(options: {
    includeJson?: boolean;
    environment?: 'sandbox' | 'production';
    expectedTaxPin?: string;
    businessId?: string;
  } = {}): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};
    if (options.includeJson) {
      headers['Content-Type'] = 'application/json';
    }
    if (options.environment) {
      headers['X-Digitax-Env'] = options.environment;
    }
    if (options.expectedTaxPin) {
      headers['X-Tenant-Tax-Pin'] = options.expectedTaxPin;
    }
    if (options.businessId) {
      headers['X-Business-Id'] = options.businessId;
    }
    const idToken = await auth.currentUser?.getIdToken().catch(() => undefined);
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }
    return headers;
  }

  private async requestJson<T>(
    path: string,
    init: RequestInit = {},
    headerOptions: {
      includeJson?: boolean;
      environment?: 'sandbox' | 'production';
      expectedTaxPin?: string;
      businessId?: string;
    } = {}
  ): Promise<T> {
    let res: Response;
    try {
      res = await fetch(resolveApiUrl(path), {
        ...init,
        headers: {
          ...(await this.getProxyHeaders(headerOptions)),
          ...(init.headers as Record<string, string> | undefined),
        },
      });
    } catch (networkErr: any) {
      throw new DigitaxApiError(
        networkErr?.message || 'Network unavailable while reaching SokoPoS Fiscal Gateway',
        0,
        'NETWORK_OFFLINE'
      );
    }

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg =
        body?.error ||
        body?.message ||
        (Array.isArray(body?.errors) ? body.errors.join('; ') : '') ||
        `Digitax eTIMS request failed (${res.status})`;
      const code = body?.code || (res.status === 422 ? 'FISCAL_VALIDATION_FAILED' : 'DIGITAX_HTTP_ERROR');
      throw new DigitaxApiError(errMsg, res.status, code);
    }

    return body as T;
  }

  /**
   * Fetch merchant eTIMS info from Digitax via authenticated backend proxy
   */
  async getEtimsInfo(environment?: 'sandbox' | 'production'): Promise<DigitaxEtimsInfo> {
    return this.requestJson<DigitaxEtimsInfo>(
      '/api/digitax/etims-info',
      { method: 'GET' },
      { environment }
    );
  }

  /**
   * Verify store KRA PIN format, anti-placeholder check, and Digitax Control Unit alignment
   */
  async verifyTaxPin(params: {
    taxPin: string;
    businessId?: string;
    environment?: 'sandbox' | 'production';
  }): Promise<{
    success: boolean;
    validFormat: boolean;
    isPlaceholder: boolean;
    matchedCuPin: boolean;
    remoteCuPin: string | null;
    status: 'verified' | 'mismatch' | 'unverified' | 'sandbox_placeholder';
    verifiedAt?: string;
    normalizedPin?: string;
    message?: string;
  }> {
    return this.requestJson(
      '/api/digitax/verify-tax-pin',
      {
        method: 'POST',
        body: JSON.stringify({
          taxPin: params.taxPin,
          businessId: params.businessId,
        }),
      },
      {
        includeJson: true,
        environment: params.environment,
        businessId: params.businessId,
      }
    );
  }

  /**
   * Fetch registered items from Digitax
   */
  async getItems(environment?: 'sandbox' | 'production'): Promise<DigitaxItem[]> {
    const body = await this.requestJson<{ data?: DigitaxItem[] } | DigitaxItem[]>(
      '/api/digitax/items',
      { method: 'GET' },
      { environment }
    );
    const list = Array.isArray(body) ? body : body?.data || [];
    for (const item of list) {
      if (item?.item_name && item?.tax_type_code) {
        this.cachedItemsByKey.set(
          `${item.item_name.trim().toLowerCase()}::${item.tax_type_code}`,
          item
        );
      }
    }
    return list;
  }

  /**
   * Register a POS SKU in Digitax eTIMS catalog
   */
  async registerItem(
    params: CreateDigitaxItemParams,
    environment?: 'sandbox' | 'production'
  ): Promise<DigitaxItem> {
    const payload: CreateDigitaxItemParams = {
      item_name: params.item_name.trim().slice(0, 180),
      item_class_code: params.item_class_code || '50202300', // General consumer retail goods UNSPSC fallback
      item_type_code: params.item_type_code || '2', // Finished product
      tax_type_code: params.tax_type_code,
      origin_nation_code: params.origin_nation_code || 'KE',
      package_unit_code: params.package_unit_code || 'CT',
      quantity_unit_code: params.quantity_unit_code || 'U',
      default_unit_price: roundCurrency2(Math.max(0, params.default_unit_price)),
      is_stock_item: params.is_stock_item ?? true,
      sku: params.sku,
    };

    const created = await this.requestJson<DigitaxItem>(
      '/api/digitax/items',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      { includeJson: true, environment }
    );

    if (created?.item_name && created?.tax_type_code) {
      this.cachedItemsByKey.set(
        `${created.item_name.trim().toLowerCase()}::${created.tax_type_code}`,
        created
      );
    }
    return created;
  }

  /**
   * Ensures every SKU in a checkout or refund has a valid registered Digitax item ID
   * aligned with its resolved KRA tax_type_code. Returns both mapping and product updates.
   */
  async ensureProductsRegisteredForSale(params: {
    items: Array<Pick<CartItem, 'productId' | 'productName' | 'sku' | 'unitPrice' | 'taxRate' | 'taxTypeCode' | 'digitaxItemId'>>;
    productsCatalog: Product[];
    locationId: string;
    taxSettings?: BusinessTaxSettings;
    environment?: 'sandbox' | 'production';
  }): Promise<{
    resolvedItemIdsByProductId: Record<string, string>;
    registeredProducts: Array<{
      productId: string;
      digitaxItemId: string;
      etimsItemCode?: string;
      taxTypeCode: KraTaxTypeCode;
      itemClassCode?: string;
      packageUnitCode?: string;
      quantityUnitCode?: string;
      digitaxSyncedAt: string;
    }>;
  }> {
    const resolvedItemIdsByProductId: Record<string, string> = {};
    const registeredProducts: Array<{
      productId: string;
      digitaxItemId: string;
      etimsItemCode?: string;
      taxTypeCode: KraTaxTypeCode;
      itemClassCode?: string;
      packageUnitCode?: string;
      quantityUnitCode?: string;
      digitaxSyncedAt: string;
    }> = [];

    const needsLookup: Array<{
      productId: string;
      name: string;
      sku: string;
      unitPrice: number;
      taxTypeCode: KraTaxTypeCode;
      itemClassCode?: string;
      packageUnitCode?: string;
      quantityUnitCode?: string;
    }> = [];

    for (const item of params.items) {
      const prod = params.productsCatalog.find((p) => p.id === item.productId);
      const resolvedTax = resolveDynamicTaxRate(
        { category: prod?.category, taxRate: item.taxRate ?? prod?.taxRate, id: item.productId },
        params.locationId,
        params.taxSettings
      );
      const taxTypeCode = resolveKraTaxTypeCode({
        taxRate: resolvedTax.rate,
        ruleCode: resolvedTax.code,
        ruleName: resolvedTax.ruleName,
        explicitTaxTypeCode: item.taxTypeCode || prod?.taxTypeCode,
      });

      // Reuse cached product Digitax ID if tax class still matches
      const existingId = prod?.digitaxItemId || item.digitaxItemId;
      const storedClass = prod?.taxTypeCode || item.taxTypeCode;
      if (existingId && (!storedClass || storedClass === taxTypeCode)) {
        resolvedItemIdsByProductId[item.productId] = existingId;
        continue;
      }

      const displayName = prod?.name || item.productName;
      const cacheKey = `${displayName.trim().toLowerCase()}::${taxTypeCode}`;
      const memMatch = this.cachedItemsByKey.get(cacheKey);
      if (memMatch?.id) {
        resolvedItemIdsByProductId[item.productId] = memMatch.id;
        registeredProducts.push({
          productId: item.productId,
          digitaxItemId: memMatch.id,
          etimsItemCode: memMatch.etims_item_code,
          taxTypeCode,
          itemClassCode: memMatch.item_class_code,
          packageUnitCode: memMatch.package_unit_code,
          quantityUnitCode: memMatch.quantity_unit_code,
          digitaxSyncedAt: new Date().toISOString(),
        });
        continue;
      }

      needsLookup.push({
        productId: item.productId,
        name: displayName,
        sku: prod?.sku || item.sku,
        unitPrice: prod?.sellingPrice ?? item.unitPrice,
        taxTypeCode,
        itemClassCode: prod?.itemClassCode,
        packageUnitCode: prod?.packageUnitCode,
        quantityUnitCode: prod?.quantityUnitCode,
      });
    }

    if (needsLookup.length === 0) {
      return { resolvedItemIdsByProductId, registeredProducts };
    }

    // Fetch existing Digitax items once to avoid duplicate registrations
    let remoteItems: DigitaxItem[] = [];
    try {
      remoteItems = await this.getItems(params.environment);
    } catch {
      remoteItems = [];
    }

    for (const entry of needsLookup) {
      const remoteMatch = remoteItems.find(
        (ri) =>
          ri.active !== false &&
          ri.tax_type_code === entry.taxTypeCode &&
          (ri.item_name.trim().toLowerCase() === entry.name.trim().toLowerCase() ||
            (entry.sku && ri.etims_item_code === entry.sku))
      );

      if (remoteMatch?.id) {
        resolvedItemIdsByProductId[entry.productId] = remoteMatch.id;
        registeredProducts.push({
          productId: entry.productId,
          digitaxItemId: remoteMatch.id,
          etimsItemCode: remoteMatch.etims_item_code,
          taxTypeCode: entry.taxTypeCode,
          itemClassCode: remoteMatch.item_class_code,
          packageUnitCode: remoteMatch.package_unit_code,
          quantityUnitCode: remoteMatch.quantity_unit_code,
          digitaxSyncedAt: new Date().toISOString(),
        });
        continue;
      }

      const created = await this.registerItem(
        {
          item_name: entry.name,
          item_class_code: entry.itemClassCode,
          tax_type_code: entry.taxTypeCode,
          package_unit_code: entry.packageUnitCode,
          quantity_unit_code: entry.quantityUnitCode,
          default_unit_price: entry.unitPrice,
          is_stock_item: true,
          sku: entry.sku,
        },
        params.environment
      );

      if (!created?.id) {
        throw new DigitaxApiError(
          `Digitax did not return an item ID when registering "${entry.name}".`,
          502,
          'DIGITAX_ITEM_REGISTRATION_ERROR'
        );
      }

      resolvedItemIdsByProductId[entry.productId] = created.id;
      registeredProducts.push({
        productId: entry.productId,
        digitaxItemId: created.id,
        etimsItemCode: created.etims_item_code,
        taxTypeCode: entry.taxTypeCode,
        itemClassCode: created.item_class_code,
        packageUnitCode: created.package_unit_code,
        quantityUnitCode: created.quantity_unit_code,
        digitaxSyncedAt: new Date().toISOString(),
      });
    }

    return { resolvedItemIdsByProductId, registeredProducts };
  }

  /**
   * Fetch sales from Digitax
   */
  async getSales(environment?: 'sandbox' | 'production'): Promise<DigitaxSaleResponse[]> {
    const body = await this.requestJson<{ data?: DigitaxSaleResponse[] } | DigitaxSaleResponse[]>(
      '/api/digitax/sales',
      { method: 'GET' },
      { environment }
    );
    return Array.isArray(body) ? body : body?.data || [];
  }

  /**
   * Create a server-validated eTIMS compliant invoice in Digitax
   */
  async createSale(
    params: DigitaxSalePayload,
    options: { environment?: 'sandbox' | 'production'; expectedTaxPin?: string; businessId?: string } = {}
  ): Promise<DigitaxSaleResponse> {
    return this.requestJson<DigitaxSaleResponse>(
      '/api/digitax/sales',
      {
        method: 'POST',
        body: JSON.stringify({
          ...params,
          invoice_status_code: params.invoice_status_code || '02',
        }),
      },
      {
        includeJson: true,
        environment: options.environment,
        expectedTaxPin: options.expectedTaxPin,
        businessId: options.businessId,
      }
    );
  }

  /**
   * Poll sale until status is COMPLETED (Digitax signs asynchronously)
   */
  async pollSaleCompletion(
    saleId: string,
    maxAttempts = 6,
    delayMs = 1200,
    environment?: 'sandbox' | 'production'
  ): Promise<DigitaxSaleResponse> {
    let latest: DigitaxSaleResponse | null = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      try {
        latest = await this.requestJson<DigitaxSaleResponse>(
          `/api/digitax/sales/${encodeURIComponent(saleId)}`,
          { method: 'GET' },
          { environment }
        );
        if (latest && latest.status === 'COMPLETED' && latest.receipt_signature) {
          return latest;
        }
        if (latest && latest.status === 'FAILED') {
          return latest;
        }
      } catch (err) {
        console.warn(`Polling Digitax sale ${saleId} attempt ${attempt + 1}:`, err);
      }
    }

    if (latest) return latest;
    return this.requestJson<DigitaxSaleResponse>(
      `/api/digitax/sales/${encodeURIComponent(saleId)}`,
      { method: 'GET' },
      { environment }
    );
  }

  /**
   * Issue a KRA eTIMS Credit Note via Digitax for returns & refunds
   */
  async createCreditNote(
    params: DigitaxCreditNotePayload,
    options: { environment?: 'sandbox' | 'production'; expectedTaxPin?: string; businessId?: string } = {}
  ): Promise<DigitaxCreditNoteResponse> {
    return this.requestJson<DigitaxCreditNoteResponse>(
      '/api/digitax/credit-notes',
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
      {
        includeJson: true,
        environment: options.environment,
        expectedTaxPin: options.expectedTaxPin,
        businessId: options.businessId,
      }
    );
  }

  /**
   * Poll credit note until KRA signature is confirmed
   */
  async pollCreditNoteCompletion(
    creditNoteId: string,
    maxAttempts = 5,
    delayMs = 1200,
    environment?: 'sandbox' | 'production'
  ): Promise<DigitaxCreditNoteResponse> {
    let latest: DigitaxCreditNoteResponse | null = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      try {
        latest = await this.requestJson<DigitaxCreditNoteResponse>(
          `/api/digitax/credit-notes/${encodeURIComponent(creditNoteId)}`,
          { method: 'GET' },
          { environment }
        );
        if (latest && latest.status === 'COMPLETED' && latest.receipt_signature) {
          return latest;
        }
        if (latest && latest.status === 'FAILED') {
          return latest;
        }
      } catch (err) {
        console.warn(`Polling Digitax credit note ${creditNoteId} attempt ${attempt + 1}:`, err);
      }
    }
    if (latest) return latest;
    return this.requestJson<DigitaxCreditNoteResponse>(
      `/api/digitax/credit-notes/${encodeURIComponent(creditNoteId)}`,
      { method: 'GET' },
      { environment }
    );
  }

  /**
   * Formats a POS transaction into an itemized Digitax eTIMS invoice payload
   */
  mapTransactionToEtims(params: {
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
    return buildDigitaxSalePayload(params);
  }

  /**
   * Formats a POS RefundRecord into a KRA Credit Note payload linked to the original sale
   */
  mapRefundToCreditNote(params: {
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
    return buildDigitaxCreditNotePayload(params);
  }
}

export const digitaxService = new DigitaxService();
