import crypto from 'crypto';

export type PaymentProviderName = 'paystack' | 'daraja';
export type PaymentChannel = 'mpesa_stk' | 'card';
export type PaymentFlowType = 'pos_sale' | 'subscription';

export interface MpesaStkInitParams {
  amountKes: number;
  phone: string;
  email: string;
  reference: string;
  metadata?: Record<string, any>;
}

export interface MpesaStkInitResult {
  success: boolean;
  provider: PaymentProviderName;
  reference: string;
  status: 'pay_offline' | 'pending' | 'success' | 'failed';
  displayText: string;
  error?: string;
}

export interface CardCheckoutInitParams {
  amountKes: number;
  email: string;
  reference: string;
  callbackUrl?: string;
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

export interface PaymentVerificationResult {
  verified: boolean;
  provider: PaymentProviderName;
  reference: string;
  status: 'success' | 'pending' | 'failed' | 'abandoned';
  amountKes?: number;
  channel?: string;
  gatewayResponse?: string;
  paidAt?: string;
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

    const response = await fetch(`${this.baseUrl}/charge`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        amount: String(amountSubunits),
        currency: 'KES',
        reference: params.reference,
        mobile_money: {
          phone: normalizedPhone,
          provider: 'mpesa',
        },
        metadata: params.metadata || {},
      }),
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

    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        amount: String(amountSubunits),
        currency: 'KES',
        reference: params.reference,
        channels: ['card'],
        ...(params.callbackUrl ? { callback_url: params.callbackUrl } : {}),
        metadata: params.metadata || {},
      }),
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

export class DarajaAdapter implements PaymentProviderAdapter {
  readonly providerName: PaymentProviderName = 'daraja';

  isConfigured(): boolean {
    return Boolean(
      process.env.DARAJA_CONSUMER_KEY &&
        process.env.DARAJA_CONSUMER_SECRET &&
        process.env.DARAJA_SHORTCODE &&
        process.env.DARAJA_PASSKEY
    );
  }

  async initiateMpesaStk(params: MpesaStkInitParams): Promise<MpesaStkInitResult> {
    return {
      success: false,
      provider: this.providerName,
      reference: params.reference,
      status: 'failed',
      displayText: 'Safaricom Daraja adapter is reserved for future migration.',
      error: 'Daraja adapter is not yet activated. Set PAYMENT_PROVIDER=paystack.',
    };
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

  async verifyTransaction(reference: string): Promise<PaymentVerificationResult> {
    return {
      verified: false,
      provider: this.providerName,
      reference,
      status: 'failed',
      error: 'Daraja adapter is not yet activated.',
    };
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
