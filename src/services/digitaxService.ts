/**
 * Digitax KRA eTIMS Integration Service
 * 
 * Provides automated electronic tax register (eTIMS) invoicing,
 * certified Control Unit (CU) sequences, digital tax signatures,
 * and KRA verification QR codes in partnership with Digitax Technologies.
 */

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
}

export interface DigitaxItem {
  id: string;
  item_class_code: string;
  item_type_code: string;
  item_name: string;
  origin_nation_code: string;
  package_unit_code: string;
  quantity_unit_code: string;
  tax_type_code: 'A' | 'B' | 'C' | 'D' | 'E';
  default_unit_price: number;
  etims_item_code: string;
  is_stock_item: boolean;
  stock_quantity: number;
  active: boolean;
  status: string;
}

export interface DigitaxSaleItem {
  id: string; // Digitax item id
  quantity: number;
  unit_price: number;
  total_amount: number;
}

export interface CreateSaleParams {
  sale_date: string; // YYYY-MM-DD
  trader_invoice_number: string;
  payment_type_code: '01' | '02' | '03' | '04'; // 01=Cash, 02=Card, 04=Mobile/M-Pesa
  invoice_status_code?: string; // 02=Normal
  customer_tin?: string;
  customer_name?: string;
  items: DigitaxSaleItem[];
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

export interface DigitaxEtimsRecord {
  saleId: string;
  cuSerialNumber: string;
  cuInvoiceNumber: number | string;
  receiptNumber: number | string;
  internalData: string;
  receiptSignature: string;
  etimsUrl: string;
  offlineUrl: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  taxPin: string;
  customerTin?: string;
  customerName?: string;
  verifiedAt: string;
}

export const DIGITAX_TEST_API_KEY = 'KEN_TEST_api_key_0HBmI6qU0WOhnkjcVgf8cleoFR1yIWsk';
export const DIGITAX_BASE_URL = 'https://api.digitax.tech/ke/v2';

// Known pre-registered Digitax items in test account:
// 1. item_01M4WCY79237JRVADVKFB0SMNW -> 16% Standard VAT (Class B, non-stock)
// 2. item_01M4WCNT8YSR2KY1Z0K8AFJ2HE -> 0% Exempt (Class A, non-stock)
export const DEFAULT_VAT16_ITEM_ID = 'item_01M4WCY79237JRVADVKFB0SMNW';
export const DEFAULT_EXEMPT_ITEM_ID = 'item_01M4WCNT8YSR2KY1Z0K8AFJ2HE';

class DigitaxService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = localStorage.getItem('sokopos_digitax_api_key') || DIGITAX_TEST_API_KEY;
    this.baseUrl = DIGITAX_BASE_URL;
  }

  public getApiKey(): string {
    return this.apiKey;
  }

  public setApiKey(key: string) {
    this.apiKey = key.trim() || DIGITAX_TEST_API_KEY;
    localStorage.setItem('sokopos_digitax_api_key', this.apiKey);
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Api-Key': this.apiKey,
    };
  }

  /**
   * Fetch merchant eTIMS info from Digitax
   */
  async getEtimsInfo(): Promise<DigitaxEtimsInfo> {
    // Try backend proxy first for optimal reliability, then fallback to direct API
    try {
      const res = await fetch('/api/digitax/etims-info', {
        headers: { 'X-Api-Key': this.apiKey },
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback to direct client call
    }

    const response = await fetch(`${this.baseUrl}/etims-info`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Digitax eTIMS info failed (${response.status}): ${errText}`);
    }

    return await response.json();
  }

  /**
   * Fetch registered items from Digitax
   */
  async getItems(): Promise<DigitaxItem[]> {
    try {
      const res = await fetch('/api/digitax/items', {
        headers: { 'X-Api-Key': this.apiKey },
      });
      if (res.ok) {
        const body = await res.json();
        return body.data || [];
      }
    } catch {
      // Fallback to direct client call
    }

    const response = await fetch(`${this.baseUrl}/items`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to fetch Digitax items (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  /**
   * Fetch sales from Digitax
   */
  async getSales(): Promise<DigitaxSaleResponse[]> {
    try {
      const res = await fetch('/api/digitax/sales', {
        headers: { 'X-Api-Key': this.apiKey },
      });
      if (res.ok) {
        const body = await res.json();
        return body.data || [];
      }
    } catch {
      // Fallback to direct client call
    }

    const response = await fetch(`${this.baseUrl}/sales`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to fetch Digitax sales (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  /**
   * Create an eTIMS compliant invoice in Digitax
   */
  async createSale(params: CreateSaleParams): Promise<DigitaxSaleResponse> {
    try {
      const res = await fetch('/api/digitax/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Fallback to direct client call
    }

    const response = await fetch(`${this.baseUrl}/sales`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        ...params,
        invoice_status_code: params.invoice_status_code || '02',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Digitax eTIMS invoice generation failed (${response.status}): ${errText}`);
    }

    return await response.json();
  }

  /**
   * Poll sale until status is COMPLETED (Digitax signs asynchronously)
   */
  async pollSaleCompletion(saleId: string, maxAttempts = 6, delayMs = 1200): Promise<DigitaxSaleResponse> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      try {
        let sale: DigitaxSaleResponse | null = null;
        try {
          const res = await fetch(`/api/digitax/sales/${saleId}`, {
            headers: { 'X-Api-Key': this.apiKey },
          });
          if (res.ok) {
            sale = await res.json();
          }
        } catch {
          // Fallback
        }

        if (!sale) {
          const response = await fetch(`${this.baseUrl}/sales/${saleId}`, {
            headers: this.getHeaders(),
          });
          if (response.ok) {
            sale = await response.json();
          }
        }

        if (sale && sale.status === 'COMPLETED' && sale.receipt_signature) {
          return sale;
        }
      } catch (err) {
        console.warn(`Polling Digitax sale ${saleId} attempt ${attempt + 1}:`, err);
      }
    }

    // Return the latest known state even if still pending
    const fallbackResponse = await fetch(`${this.baseUrl}/sales/${saleId}`, {
      headers: this.getHeaders(),
    });
    return await fallbackResponse.json();
  }

  /**
   * Helper to format a POS transaction into an eTIMS invoice payload
   */
  mapTransactionToEtims(
    tx: {
      receiptNumber: string;
      total: number;
      subtotal: number;
      taxAmount: number;
      paymentMethod: string;
      customerName?: string;
      customerPhone?: string;
      items: Array<{
        name: string;
        quantity: number;
        price: number;
        taxRate?: number;
      }>;
    },
    buyerPin?: string
  ): CreateSaleParams {
    const today = new Date().toISOString().split('T')[0];

    // Map payment method to KRA payment_type_code
    // 01 = Cash, 02 = Card, 04 = Mobile (M-Pesa)
    let payment_type_code: '01' | '02' | '03' | '04' = '01';
    if (tx.paymentMethod === 'mpesa') {
      payment_type_code = '04';
    } else if (tx.paymentMethod === 'card') {
      payment_type_code = '02';
    }

    // Separate items by VAT rate: 16% (Class B) vs 0% (Class A / Exempt)
    let totalTaxableB = 0;
    let totalTaxableA = 0;

    tx.items.forEach((item) => {
      const lineTotal = item.price * item.quantity;
      if (item.taxRate && item.taxRate > 0) {
        totalTaxableB += lineTotal;
      } else {
        totalTaxableA += lineTotal;
      }
    });

    const items: DigitaxSaleItem[] = [];

    if (totalTaxableB > 0) {
      items.push({
        id: DEFAULT_VAT16_ITEM_ID,
        quantity: 1,
        unit_price: Number(totalTaxableB.toFixed(2)),
        total_amount: Number(totalTaxableB.toFixed(2)),
      });
    }

    if (totalTaxableA > 0 || items.length === 0) {
      const exemptAmount = totalTaxableA > 0 ? totalTaxableA : tx.total;
      items.push({
        id: DEFAULT_EXEMPT_ITEM_ID,
        quantity: 1,
        unit_price: Number(exemptAmount.toFixed(2)),
        total_amount: Number(exemptAmount.toFixed(2)),
      });
    }

    return {
      sale_date: today,
      trader_invoice_number: tx.receiptNumber.startsWith('SOKO')
        ? tx.receiptNumber
        : `SOKO-${tx.receiptNumber}`,
      payment_type_code,
      invoice_status_code: '02',
      customer_tin: buyerPin || undefined,
      customer_name: tx.customerName || undefined,
      items,
    };
  }
}

export const digitaxService = new DigitaxService();
