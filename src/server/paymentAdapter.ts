import crypto from 'crypto';

export type PaymentProviderName = 'paystack' | 'daraja';
export type PaymentChannel = 'mpesa_stk' | 'card';
export type PaymentFlowType = 'pos_sale' | 'subscription';

export interface MpesaStkInitParams {
  amountKes: number;
  phone: string;
  email: string;
  reference: string;
  callbackUrl?: string;
  accountReference?: string;
  transactionDesc?: string;
  subaccount?: string;
  bearer?: 'account' | 'subaccount';
  metadata?: Record<string, any>;
}

export interface MpesaStkInitResult {
  success: boolean;
  provider: PaymentProviderName;
  reference: string;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  customerMessage?: string;
  status: 'pay_offline' | 'pending' | 'success' | 'failed';
  displayText: string;
  error?: string;
}

export interface CardCheckoutInitParams {
  amountKes: number;
  email: string;
  reference: string;
  callbackUrl?: string;
  channels?: ('card' | 'mobile_money')[];
  subaccount?: string;
  bearer?: 'account' | 'subaccount';
  metadata?: Record<string, any>;
}

export interface CardCheckoutInitResult {
  success: boolean;
  provider: PaymentProviderName;
  reference: string;
  authorizationUrl?: string;
  accessCode?: string;
  status: 'pending' | 'failed';
  error?: string;
}

export interface SettlementBankOption {
  name: string;
  code: string;
  type: string;
  currency: string;
  active: boolean;
}

export interface SubaccountDetails {
  found: boolean;
  subaccountCode: string;
  businessName?: string;
  settlementBank?: string;
  accountNumberMask?: string;
  percentageCharge?: number;
  active: boolean;
  error?: string;
}

export interface CreateSubaccountParams {
  businessName: string;
  settlementBankCode: string;
  accountNumber: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  description?: string;
}

export interface CreateSubaccountResult {
  success: boolean;
  subaccountCode?: string;
  businessName?: string;
  settlementBank?: string;
  accountNumberMask?: string;
  active?: boolean;
  error?: string;
}

export function maskAccountNumber(accountNumber: string | undefined | null): string {
  const clean = String(accountNumber || '').trim();
  if (!clean) return '****';
  if (clean.length <= 4) return `****${clean}`;
  return `****${clean.slice(-4)}`;
}

export interface PaymentVerificationResult {
  verified: boolean;
  provider: PaymentProviderName;
  reference: string;
  status: 'success' | 'pending' | 'failed' | 'abandoned';
  amountKes?: number;
  channel?: string;
  mpesaReceiptNumber?: string;
  gatewayResponse?: string;
  paidAt?: string;
  metadata?: Record<string, any>;
  error?: string;
}

export interface PaymentProviderAdapter {
  readonly providerName: PaymentProviderName;
  isConfigured(): boolean;
  initiateMpesaStk(params: MpesaStkInitParams): Promise<MpesaStkInitResult>;
  initializeCardCheckout(params: CardCheckoutInitParams): Promise<CardCheckoutInitResult>;
  verifyTransaction(reference: string): Promise<PaymentVerificationResult>;
  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean;
}

export function normalizeKenyanPhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length >= 12) {
    return `+${digits.slice(0, 12)}`;
  }
  if (digits.startsWith('0') && digits.length >= 10) {
    return `+254${digits.slice(1, 10)}`;
  }
  if ((digits.startsWith('7') || digits.startsWith('1')) && digits.length >= 9) {
    return `+254${digits.slice(0, 9)}`;
  }
  return phone.startsWith('+') ? phone : `+${digits}`;
}

export class PaystackAdapter implements PaymentProviderAdapter {
  readonly providerName: PaymentProviderName = 'paystack';
  private readonly baseUrl = 'https://api.paystack.co';

  private getSecretKey(): string {
    return (process.env.PAYSTACK_SECRET_KEY || '').trim();
  }

  isConfigured(): boolean {
    const key = this.getSecretKey();
    return Boolean(key && !key.includes('MY_PAYSTACK_SECRET_KEY'));
  }

  async initiateMpesaStk(params: MpesaStkInitParams): Promise<MpesaStkInitResult> {
    const secretKey = this.getSecretKey();
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.providerName,
        reference: params.reference,
        status: 'failed',
        displayText: 'Paystack API key is not configured on the server.',
        error: 'PAYSTACK_SECRET_KEY is not configured in server environment variables.',
      };
    }

    const normalizedPhone = normalizeKenyanPhone(params.phone);
    const amountSubunits = Math.round(Number(params.amountKes) * 100);
    if (!Number.isFinite(amountSubunits) || amountSubunits < 100) {
      return {
        success: false,
        provider: this.providerName,
        reference: params.reference,
        status: 'failed',
        displayText: 'Invalid payment amount.',
        error: 'Amount must be at least KES 1.00.',
      };
    }

    const payload: Record<string, any> = {
      email: params.email,
      amount: String(amountSubunits),
      currency: 'KES',
      reference: params.reference,
      mobile_money: {
        phone: normalizedPhone,
        provider: 'mpesa',
      },
      metadata: params.metadata || {},
    };
    if (params.subaccount) {
      payload.subaccount = params.subaccount;
      payload.bearer = params.bearer || 'subaccount';
    }

    const response = await fetch(`${this.baseUrl}/charge`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data: any = await response.json().catch(() => ({}));
    if (!response.ok || !data?.status) {
      return {
        success: false,
        provider: this.providerName,
        reference: params.reference,
        status: 'failed',
        displayText: data?.message || 'Failed to initiate M-Pesa STK Push.',
        error: data?.message || `Paystack error (${response.status})`,
      };
    }

    const txStatus = data?.data?.status;
    return {
      success: true,
      provider: this.providerName,
      reference: data?.data?.reference || params.reference,
      status: txStatus === 'success' ? 'success' : txStatus === 'pay_offline' ? 'pay_offline' : 'pending',
      displayText:
        data?.data?.display_text ||
        `M-Pesa STK prompt sent to ${normalizedPhone}. Please enter your M-Pesa PIN.`,
    };
  }

  async initializeCardCheckout(params: CardCheckoutInitParams): Promise<CardCheckoutInitResult> {
    const secretKey = this.getSecretKey();
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.providerName,
        reference: params.reference,
        status: 'failed',
        error: 'PAYSTACK_SECRET_KEY is not configured in server environment variables.',
      };
    }

    const amountSubunits = Math.round(Number(params.amountKes) * 100);
    if (!Number.isFinite(amountSubunits) || amountSubunits < 100) {
      return {
        success: false,
        provider: this.providerName,
        reference: params.reference,
        status: 'failed',
        error: 'Amount must be at least KES 1.00.',
      };
    }

    const payload: Record<string, any> = {
      email: params.email,
      amount: String(amountSubunits),
      currency: 'KES',
      reference: params.reference,
      channels: params.channels && params.channels.length > 0 ? params.channels : ['card'],
      ...(params.callbackUrl ? { callback_url: params.callbackUrl } : {}),
      metadata: params.metadata || {},
    };
    if (params.subaccount) {
      payload.subaccount = params.subaccount;
      payload.bearer = params.bearer || 'subaccount';
    }

    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data: any = await response.json().catch(() => ({}));
    if (!response.ok || !data?.status || !data?.data?.authorization_url) {
      return {
        success: false,
        provider: this.providerName,
        reference: params.reference,
        status: 'failed',
        error: data?.message || `Failed to initialize card checkout (${response.status})`,
      };
    }

    return {
      success: true,
      provider: this.providerName,
      reference: data.data.reference || params.reference,
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      status: 'pending',
    };
  }

  async listSettlementBanks(country = 'kenya'): Promise<SettlementBankOption[]> {
    const secretKey = this.getSecretKey();
    if (!this.isConfigured()) {
      return [];
    }
    const response = await fetch(
      `${this.baseUrl}/bank?country=${encodeURIComponent(country)}&perPage=100`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );
    const data: any = await response.json().catch(() => ({}));
    if (!response.ok || !data?.status || !Array.isArray(data?.data)) {
      return [];
    }
    return data.data
      .filter((b: any) => b?.code && b?.name && b.active !== false)
      .map((b: any) => ({
        name: String(b.name),
        code: String(b.code),
        type: String(b.type || 'bank'),
        currency: String(b.currency || 'KES'),
        active: b.active !== false,
      }));
  }

  async fetchSubaccount(subaccountCode: string): Promise<SubaccountDetails> {
    const cleanCode = String(subaccountCode || '').trim();
    if (!this.isConfigured()) {
      return {
        found: false,
        subaccountCode: cleanCode,
        active: false,
        error: 'PAYSTACK_SECRET_KEY is not configured in server environment variables.',
      };
    }
    if (!cleanCode || !cleanCode.startsWith('ACCT_')) {
      return {
        found: false,
        subaccountCode: cleanCode,
        active: false,
        error: 'Paystack subaccount code must start with ACCT_.',
      };
    }

    const secretKey = this.getSecretKey();
    const response = await fetch(
      `${this.baseUrl}/subaccount/${encodeURIComponent(cleanCode)}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );
    const data: any = await response.json().catch(() => ({}));
    if (!response.ok || !data?.status || !data?.data) {
      return {
        found: false,
        subaccountCode: cleanCode,
        active: false,
        error: data?.message || `Subaccount ${cleanCode} was not found on Paystack (${response.status}).`,
      };
    }

    const sa = data.data;
    return {
      found: true,
      subaccountCode: String(sa.subaccount_code || cleanCode),
      businessName: sa.business_name ? String(sa.business_name) : undefined,
      settlementBank: sa.settlement_bank ? String(sa.settlement_bank) : undefined,
      accountNumberMask: maskAccountNumber(sa.account_number),
      percentageCharge: typeof sa.percentage_charge === 'number' ? sa.percentage_charge : undefined,
      active: sa.active !== false,
    };
  }

  async createSubaccount(params: CreateSubaccountParams): Promise<CreateSubaccountResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'PAYSTACK_SECRET_KEY is not configured in server environment variables.',
      };
    }

    const secretKey = this.getSecretKey();
    const response = await fetch(`${this.baseUrl}/subaccount`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        business_name: params.businessName.trim(),
        settlement_bank: params.settlementBankCode.trim(),
        account_number: params.accountNumber.trim(),
        percentage_charge: 0,
        description: params.description || `SokoPoS merchant settlement for ${params.businessName}`,
        ...(params.primaryContactEmail ? { primary_contact_email: params.primaryContactEmail } : {}),
        ...(params.primaryContactPhone ? { primary_contact_phone: params.primaryContactPhone } : {}),
      }),
    });

    const data: any = await response.json().catch(() => ({}));
    if (!response.ok || !data?.status || !data?.data?.subaccount_code) {
      return {
        success: false,
        error: data?.message || `Failed to create Paystack subaccount (${response.status}).`,
      };
    }

    const sa = data.data;
    return {
      success: true,
      subaccountCode: String(sa.subaccount_code),
      businessName: sa.business_name ? String(sa.business_name) : params.businessName,
      settlementBank: sa.settlement_bank ? String(sa.settlement_bank) : params.settlementBankCode,
      accountNumberMask: maskAccountNumber(sa.account_number || params.accountNumber),
      active: sa.active !== false,
    };
  }

  async verifyTransaction(reference: string): Promise<PaymentVerificationResult> {
    const secretKey = this.getSecretKey();
    if (!this.isConfigured()) {
      return {
        verified: false,
        provider: this.providerName,
        reference,
        status: 'failed',
        error: 'PAYSTACK_SECRET_KEY is not configured on the server.',
      };
    }

    const response = await fetch(
      `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );

    const data: any = await response.json().catch(() => ({}));
    if (!response.ok || !data?.status) {
      return {
        verified: false,
        provider: this.providerName,
        reference,
        status: response.status === 404 ? 'pending' : 'failed',
        error: data?.message || `Verification request failed (${response.status})`,
      };
    }

    const tx = data.data || {};
    const txStatus = String(tx.status || '').toLowerCase();
    const isSuccess = txStatus === 'success';

    return {
      verified: isSuccess,
      provider: this.providerName,
      reference: tx.reference || reference,
      status: isSuccess
        ? 'success'
        : txStatus === 'failed'
        ? 'failed'
        : txStatus === 'abandoned'
        ? 'abandoned'
        : 'pending',
      amountKes: typeof tx.amount === 'number' ? tx.amount / 100 : undefined,
      channel: tx.channel,
      gatewayResponse: tx.gateway_response,
      paidAt: tx.paid_at,
      metadata: tx.metadata && typeof tx.metadata === 'object' ? tx.metadata : undefined,
    };
  }

  verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
    const secretKey = this.getSecretKey();
    if (!secretKey || !signature) return false;
    const expected = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }
}


export function normalizeDarajaMsisdn(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length >= 12) {
    return digits.slice(0, 12);
  }
  if (digits.startsWith('0') && digits.length >= 10) {
    return `254${digits.slice(1, 10)}`;
  }
  if ((digits.startsWith('7') || digits.startsWith('1')) && digits.length >= 9) {
    return `254${digits.slice(0, 9)}`;
  }
  return digits;
}

export function formatDarajaTimestamp(date = new Date()): string {
  // Format YYYYMMDDHHmmss strictly in East Africa Time (UTC+3)
  const eatMs = date.getTime() + 3 * 60 * 60 * 1000;
  const eat = new Date(eatMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    String(eat.getUTCFullYear()) +
    pad(eat.getUTCMonth() + 1) +
    pad(eat.getUTCDate()) +
    pad(eat.getUTCHours()) +
    pad(eat.getUTCMinutes()) +
    pad(eat.getUTCSeconds())
  );
}

export interface DarajaCallbackParsed {
  merchantRequestId: string;
  checkoutRequestId: string;
  resultCode: number;
  resultDesc: string;
  amountKes?: number;
  mpesaReceiptNumber?: string;
  transactionDate?: string;
  phoneNumber?: string;
}

export function parseDarajaStkCallback(body: any): DarajaCallbackParsed | null {
  const cb = body?.Body?.stkCallback;
  if (!cb || !cb.CheckoutRequestID) return null;

  const resultCode = Number(cb.ResultCode);
  const resultDesc = String(cb.ResultDesc || '').trim();
  const parsed: DarajaCallbackParsed = {
    merchantRequestId: String(cb.MerchantRequestID || ''),
    checkoutRequestId: String(cb.CheckoutRequestID || ''),
    resultCode: Number.isFinite(resultCode) ? resultCode : -1,
    resultDesc: resultDesc || 'Daraja STK callback received',
  };

  const items = Array.isArray(cb.CallbackMetadata?.Item) ? cb.CallbackMetadata.Item : [];
  for (const item of items) {
    if (!item || !item.Name) continue;
    if (item.Name === 'Amount' && item.Value !== undefined) {
      const amt = Number(item.Value);
      if (Number.isFinite(amt)) parsed.amountKes = amt;
    } else if (item.Name === 'MpesaReceiptNumber' && item.Value !== undefined) {
      parsed.mpesaReceiptNumber = String(item.Value).trim();
    } else if (item.Name === 'TransactionDate' && item.Value !== undefined) {
      parsed.transactionDate = String(item.Value).trim();
    } else if (item.Name === 'PhoneNumber' && item.Value !== undefined) {
      parsed.phoneNumber = String(item.Value).trim();
    }
  }

  return parsed;
}

export class DarajaAdapter implements PaymentProviderAdapter {
  readonly providerName: PaymentProviderName = 'daraja';
  private cachedToken: { token: string; expiresAt: number } | null = null;

  getEnvironment(): 'sandbox' | 'production' {
    const raw = (process.env.DARAJA_ENV || 'sandbox').trim().toLowerCase();
    return raw === 'production' || raw === 'live' ? 'production' : 'sandbox';
  }

  private getBaseUrl(): string {
    return this.getEnvironment() === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  private getCredentials() {
    return {
      consumerKey: (process.env.DARAJA_CONSUMER_KEY || '').trim(),
      consumerSecret: (process.env.DARAJA_CONSUMER_SECRET || '').trim(),
      shortCode: (process.env.DARAJA_SHORTCODE || '').trim(),
      passkey: (process.env.DARAJA_PASSKEY || '').trim(),
      transactionType:
        (process.env.DARAJA_TRANSACTION_TYPE || '').trim() === 'CustomerBuyGoodsOnline'
          ? 'CustomerBuyGoodsOnline'
          : 'CustomerPayBillOnline',
    };
  }

  isConfigured(): boolean {
    const { consumerKey, consumerSecret, shortCode, passkey } = this.getCredentials();
    return Boolean(consumerKey && consumerSecret && shortCode && passkey);
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt - 60_000) {
      return this.cachedToken.token;
    }

    const { consumerKey, consumerSecret } = this.getCredentials();
    if (!consumerKey || !consumerSecret) {
      throw new Error('DARAJA_CONSUMER_KEY and DARAJA_CONSUMER_SECRET are not configured.');
    }

    const authBasic = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const resp = await fetch(
      `${this.getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${authBasic}`,
        },
      }
    );

    const data: any = await resp.json().catch(() => ({}));
    if (!resp.ok || !data?.access_token) {
      throw new Error(
        data?.errorMessage || data?.error_description || `Daraja OAuth failed (${resp.status}).`
      );
    }

    const expiresInSec = Math.max(120, Number(data.expires_in) || 3599);
    this.cachedToken = {
      token: String(data.access_token),
      expiresAt: Date.now() + expiresInSec * 1000,
    };
    return this.cachedToken.token;
  }

  private buildPassword(shortCode: string, passkey: string, timestamp: string): string {
    return Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
  }

  async initiateMpesaStk(params: MpesaStkInitParams): Promise<MpesaStkInitResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.providerName,
        reference: params.reference,
        status: 'failed',
        displayText: 'Safaricom Daraja credentials are not configured on the server.',
        error:
          'DARAJA_CONSUMER_KEY, DARAJA_CONSUMER_SECRET, DARAJA_SHORTCODE, and DARAJA_PASSKEY must be configured.',
      };
    }

    const msisdn = normalizeDarajaMsisdn(params.phone);
    if (!/^254(7|1)\d{8}$/.test(msisdn)) {
      return {
        success: false,
        provider: this.providerName,
        reference: params.reference,
        status: 'failed',
        displayText: 'Enter a valid Safaricom M-Pesa phone number (e.g. 07XX or 01XX).',
        error: 'Phone number must be a valid 12-digit Kenyan mobile number (2547XXXXXXXX or 2541XXXXXXXX).',
      };
    }

    const amountKes = Math.round(Number(params.amountKes));
    if (!Number.isFinite(amountKes) || amountKes < 1) {
      return {
        success: false,
        provider: this.providerName,
        reference: params.reference,
        status: 'failed',
        displayText: 'Invalid KES amount.',
        error: 'Amount must be at least KES 1.',
      };
    }

    if (!params.callbackUrl || !/^https?:\/\//i.test(params.callbackUrl)) {
      return {
        success: false,
        provider: this.providerName,
        reference: params.reference,
        status: 'failed',
        displayText: 'Daraja callback URL is missing.',
        error: 'Valid CallBackURL is required for Daraja STK Push.',
      };
    }

    try {
      const token = await this.getAccessToken();
      const { shortCode, passkey, transactionType } = this.getCredentials();
      const timestamp = formatDarajaTimestamp();
      const password = this.buildPassword(shortCode, passkey, timestamp);

      const accountReference = String(params.accountReference || params.reference || 'SokoPoS')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 12) || 'SokoPoS';
      const transactionDesc = String(params.transactionDesc || 'SokoPoS Plan')
        .replace(/[^a-zA-Z0-9 _-]/g, '')
        .slice(0, 13) || 'SokoPoS Plan';

      const payload = {
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: transactionType,
        Amount: amountKes,
        PartyA: msisdn,
        PartyB: shortCode,
        PhoneNumber: msisdn,
        CallBackURL: params.callbackUrl,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc,
      };

      const resp = await fetch(`${this.getBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data: any = await resp.json().catch(() => ({}));
      if (!resp.ok || String(data?.ResponseCode) !== '0' || !data?.CheckoutRequestID) {
        const errMsg =
          data?.errorMessage ||
          data?.ResponseDescription ||
          `Daraja STK Push failed (${resp.status}).`;
        return {
          success: false,
          provider: this.providerName,
          reference: params.reference,
          status: 'failed',
          displayText: errMsg,
          error: errMsg,
        };
      }

      const customerMsg =
        data?.CustomerMessage ||
        `M-Pesa Express prompt sent to +${msisdn}. Enter your M-Pesa PIN to authorize KES ${amountKes.toLocaleString()}.`;

      return {
        success: true,
        provider: this.providerName,
        reference: params.reference,
        checkoutRequestId: String(data.CheckoutRequestID),
        merchantRequestId: String(data.MerchantRequestID || ''),
        customerMessage: customerMsg,
        status: 'pending',
        displayText: customerMsg,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.providerName,
        reference: params.reference,
        status: 'failed',
        displayText: err?.message || 'Unable to reach Safaricom Daraja API.',
        error: err?.message || 'Daraja STK Push request failed.',
      };
    }
  }

  async initializeCardCheckout(params: CardCheckoutInitParams): Promise<CardCheckoutInitResult> {
    return {
      success: false,
      provider: this.providerName,
      reference: params.reference,
      status: 'failed',
      error: 'Daraja API does not process card payments. Use Paystack for card channels.',
    };
  }

  async verifyTransaction(checkoutRequestId: string): Promise<PaymentVerificationResult> {
    if (!this.isConfigured()) {
      return {
        verified: false,
        provider: this.providerName,
        reference: checkoutRequestId,
        status: 'failed',
        error: 'Daraja credentials are not configured on the server.',
      };
    }
    if (!checkoutRequestId) {
      return {
        verified: false,
        provider: this.providerName,
        reference: checkoutRequestId,
        status: 'failed',
        error: 'CheckoutRequestID is required for Daraja STK Query.',
      };
    }

    try {
      const token = await this.getAccessToken();
      const { shortCode, passkey } = this.getCredentials();
      const timestamp = formatDarajaTimestamp();
      const password = this.buildPassword(shortCode, passkey, timestamp);

      const resp = await fetch(`${this.getBaseUrl()}/mpesa/stkpushquery/v1/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: shortCode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkoutRequestId,
        }),
      });

      const data: any = await resp.json().catch(() => ({}));
      const errorCode = String(data?.errorCode || '');
      const errorMessage = String(data?.errorMessage || '').toLowerCase();

      // Daraja returns 500.001.1001 ("The transaction is being processed") while awaiting customer PIN
      if (
        errorCode === '500.001.1001' ||
        errorMessage.includes('being processed') ||
        (resp.ok && data?.ResultCode === undefined && String(data?.ResponseCode) === '0')
      ) {
        return {
          verified: false,
          provider: this.providerName,
          reference: checkoutRequestId,
          status: 'pending',
          gatewayResponse: data?.errorMessage || data?.ResponseDescription || 'Awaiting M-Pesa PIN confirmation',
        };
      }

      if (!resp.ok && data?.ResultCode === undefined) {
        return {
          verified: false,
          provider: this.providerName,
          reference: checkoutRequestId,
          status: 'pending',
          gatewayResponse: data?.errorMessage || `STK query returned ${resp.status}`,
        };
      }

      const resultCode = Number(data?.ResultCode);
      const resultDesc = String(data?.ResultDesc || data?.ResponseDescription || '').trim();

      if (resultCode === 0) {
        return {
          verified: true,
          provider: this.providerName,
          reference: checkoutRequestId,
          status: 'success',
          channel: 'mpesa_stk',
          gatewayResponse: resultDesc || 'The service request is processed successfully.',
          paidAt: new Date().toISOString(),
        };
      }

      if (resultCode === 1032) {
        return {
          verified: false,
          provider: this.providerName,
          reference: checkoutRequestId,
          status: 'abandoned',
          gatewayResponse: resultDesc || 'M-Pesa prompt was cancelled by the user.',
          error: resultDesc || 'M-Pesa prompt was cancelled by the user.',
        };
      }

      if (Number.isFinite(resultCode)) {
        return {
          verified: false,
          provider: this.providerName,
          reference: checkoutRequestId,
          status: 'failed',
          gatewayResponse: resultDesc || `M-Pesa request declined (code ${resultCode}).`,
          error: resultDesc || `M-Pesa request declined (code ${resultCode}).`,
        };
      }

      return {
        verified: false,
        provider: this.providerName,
        reference: checkoutRequestId,
        status: 'pending',
        gatewayResponse: resultDesc || 'Awaiting M-Pesa confirmation',
      };
    } catch (err: any) {
      return {
        verified: false,
        provider: this.providerName,
        reference: checkoutRequestId,
        status: 'pending',
        gatewayResponse: err?.message || 'Temporary network notice querying Daraja STK status.',
      };
    }
  }

  verifyWebhookSignature(): boolean {
    return true;
  }
}

export function getActivePaymentAdapter(): PaymentProviderAdapter {
  const configured = (process.env.PAYMENT_PROVIDER || 'paystack').trim().toLowerCase();
  if (configured === 'daraja') {
    return new DarajaAdapter();
  }
  return new PaystackAdapter();
}
