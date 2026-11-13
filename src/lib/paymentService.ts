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
  code?: string;
  provider?: 'paystack' | 'daraja';
  mode?: 'redirect' | 'stk_push';
  reference?: string;
  status?: 'pay_offline' | 'pending' | 'success' | 'failed';
  displayText?: string;
  authorizationUrl?: string;
  accessCode?: string;
  error?: string;
}

export interface SettlementBankOption {
  name: string;
  code: string;
  type: string;
  currency: string;
  active: boolean;
}

export interface PaystackSettlementInfo {
  paystackSubaccountCode: string;
  paystackSettlementBank: string;
  paystackSettlementAccountMask: string;
  paystackSubaccountStatus: 'verified' | 'unconfigured' | 'inactive';
  paystackSubaccountVerifiedAt: string;
  paystackFeeBearer: 'subaccount';
}

export interface ManageSubaccountRequest {
  action: 'verify_existing' | 'create' | 'unlink';
  businessId: string;
  subaccountCode?: string;
  businessName?: string;
  settlementBankCode?: string;
  settlementBankName?: string;
  accountNumber?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
}

export interface ManageSubaccountResponse {
  success: boolean;
  persistedToFirestore?: boolean;
  settlement?: PaystackSettlementInfo;
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

export async function fetchPaystackSettlementBanks(): Promise<{
  success: boolean;
  banks: SettlementBankOption[];
  error?: string;
}> {
  try {
    const resp = await fetch('/api/payments/banks');
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data?.success) {
      return {
        success: false,
        banks: [],
        error: data?.error || `Failed to load Kenyan settlement banks (${resp.status})`,
      };
    }
    return {
      success: true,
      banks: Array.isArray(data.banks) ? data.banks : [],
    };
  } catch (err: any) {
    return {
      success: false,
      banks: [],
      error: err?.message || 'Unable to load settlement banks.',
    };
  }
}

export async function manageBusinessPaystackSubaccount(
  payload: ManageSubaccountRequest,
  idToken: string
): Promise<ManageSubaccountResponse> {
  try {
    const resp = await fetch('/api/payments/subaccounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data?.success) {
      return {
        success: false,
        error: data?.error || `Subaccount update failed (${resp.status})`,
      };
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Unable to reach settlement configuration server.',
    };
  }
}

export async function initiateServerPayment(
  payload: InitiatePaymentRequest,
  idToken?: string
): Promise<InitiatePaymentResponse> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idToken) {
      headers.Authorization = `Bearer ${idToken}`;
    }
    const resp = await fetch('/api/payments/initiate', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return {
        success: false,
        code: data?.code,
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
