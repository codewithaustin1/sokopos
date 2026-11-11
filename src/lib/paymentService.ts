export type ClientPaymentChannel = 'mpesa_stk' | 'card';
export type ClientPaymentFlowType = 'pos_sale' | 'subscription';

export interface PaymentConfigResponse {
  provider: 'paystack' | 'daraja';
  configured: boolean;
  channels: ClientPaymentChannel[];
}

export interface InitiatePaymentRequest {
  flowType: ClientPaymentFlowType;
  channel: ClientPaymentChannel;
  amountKes: number;
  phone?: string;
  email?: string;
  businessId?: string;
  planId?: string;
  metadata?: Record<string, any>;
}

export interface InitiatePaymentResponse {
  success: boolean;
  provider?: 'paystack' | 'daraja';
  mode?: 'redirect' | 'stk_push';
  reference?: string;
  status?: 'pay_offline' | 'pending' | 'success' | 'failed';
  displayText?: string;
  authorizationUrl?: string;
  accessCode?: string;
  error?: string;
}

export interface VerifyPaymentResponse {
  verified: boolean;
  provider?: 'paystack' | 'daraja';
  reference: string;
  status: 'success' | 'pending' | 'failed' | 'abandoned';
  amountKes?: number;
  channel?: string;
  gatewayResponse?: string;
  paidAt?: string;
  flowType?: ClientPaymentFlowType;
  businessId?: string;
  planId?: string;
  metadata?: Record<string, any>;
  error?: string;
}

export async function getPaymentGatewayConfig(): Promise<PaymentConfigResponse> {
  try {
    const resp = await fetch('/api/payments/config');
    if (resp.ok) {
      return await resp.json();
    }
  } catch (err) {
    console.warn('Could not fetch payment gateway config:', err);
  }
  return {
    provider: 'paystack',
    configured: false,
    channels: ['mpesa_stk', 'card'],
  };
}

export async function initiateServerPayment(
  payload: InitiatePaymentRequest
): Promise<InitiatePaymentResponse> {
  try {
    const resp = await fetch('/api/payments/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return {
        success: false,
        error: data?.error || `Payment initiation failed (${resp.status})`,
      };
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Unable to reach payment server.',
    };
  }
}

export async function verifyServerPayment(reference: string): Promise<VerifyPaymentResponse> {
  try {
    const resp = await fetch(`/api/payments/verify/${encodeURIComponent(reference)}`);
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok && !data?.status) {
      return {
        verified: false,
        reference,
        status: 'failed',
        error: data?.error || `Verification failed (${resp.status})`,
      };
    }
    return data;
  } catch (err: any) {
    return {
      verified: false,
      reference,
      status: 'pending',
      error: err?.message || 'Network error verifying payment.',
    };
  }
}
