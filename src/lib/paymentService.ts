export type ClientPaymentChannel = 'mpesa_stk' | 'card';
export type ClientPaymentFlowType = 'pos_sale' | 'subscription';

export interface PaymentConfigResponse {
  provider: 'paystack' | 'daraja';
  configured: boolean;
  subscriptionMpesaProvider?: 'paystack' | 'daraja';
  cardProvider?: 'paystack';
  darajaConfigured?: boolean;
  darajaEnv?: 'sandbox' | 'production';
  paystackConfigured?: boolean;
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
  checkoutRequestId?: string;
  merchantRequestId?: string;
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
  mpesaReceiptNumber?: string;
  gatewayResponse?: string;
  paidAt?: string;
  flowType?: ClientPaymentFlowType;
  businessId?: string;
  planId?: string;
  activatedSubscription?: Record<string, any>;
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

export async function verifyServerPayment(
  reference: string,
  idToken?: string
): Promise<VerifyPaymentResponse> {
  try {
    const headers: Record<string, string> = {};
    if (idToken) {
      headers.Authorization = `Bearer ${idToken}`;
    }
    const resp = await fetch(`/api/payments/verify/${encodeURIComponent(reference)}`, {
      headers,
    });
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

export interface KenyanMpesaValidationResult {
  valid: boolean;
  msisdn: string;
  formattedDisplay: string;
  error?: string;
}

/**
 * Validates Kenyan M-Pesa phone formats (`07XXXXXXXX`, `01XXXXXXXX`,
 * `2547XXXXXXXX`, `+2547XXXXXXXX`, `2541XXXXXXXX`, `+2541XXXXXXXX`)
 * and normalizes to the 12-digit Daraja MSISDN (`254XXXXXXXXX`).
 */
export function validateKenyanMpesaPhone(rawPhone: string): KenyanMpesaValidationResult {
  const compact = String(rawPhone || '').trim().replace(/[\s\-()]/g, '');
  if (!compact) {
    return {
      valid: false,
      msisdn: '',
      formattedDisplay: '',
      error: 'Please enter a Kenyan M-Pesa phone number (e.g. 07XXXXXXXX or +2547XXXXXXXX).',
    };
  }

  const localMatch = /^0((?:7|1)\d{8})$/.exec(compact);
  const intlMatch = /^\+?254((?:7|1)\d{8})$/.exec(compact);
  const nineDigits = localMatch?.[1] || intlMatch?.[1];

  if (!nineDigits) {
    return {
      valid: false,
      msisdn: '',
      formattedDisplay: '',
      error: 'Enter a valid Kenyan M-Pesa number (07XXXXXXXX, 01XXXXXXXX, or +2547XXXXXXXX).',
    };
  }

  const msisdn = `254${nineDigits}`;
  const formattedDisplay = `+254 ${nineDigits.slice(0, 3)} ${nineDigits.slice(3, 6)} ${nineDigits.slice(6, 9)}`;

  return {
    valid: true,
    msisdn,
    formattedDisplay,
  };
}

export interface PollPaymentOptions {
  getIdToken?: () => Promise<string | undefined>;
  intervalMs?: number;
  maxAttempts?: number;
  signal?: AbortSignal;
  onUpdate?: (res: VerifyPaymentResponse, attempt: number) => void;
}

/**
 * Periodically polls `/api/payments/verify/:reference` (which triggers Daraja STK Query
 * or Paystack verification) until a terminal `'success'`, `'failed'`, or `'abandoned'`
 * status is reached, or polling is aborted / hits `maxAttempts`.
 */
export async function pollSubscriptionPaymentStatus(
  reference: string,
  options: PollPaymentOptions = {}
): Promise<VerifyPaymentResponse> {
  const {
    getIdToken,
    intervalMs = 3000,
    maxAttempts = 60,
    signal,
    onUpdate,
  } = options;

  let lastResult: VerifyPaymentResponse = {
    verified: false,
    reference,
    status: 'pending',
    gatewayResponse: 'Awaiting M-Pesa PIN confirmation.',
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (signal?.aborted) {
      return lastResult;
    }

    const waitMs = attempt > 10 ? Math.max(intervalMs, 5000) : intervalMs;
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, waitMs);
      if (signal) {
        const onAbort = () => {
          clearTimeout(timer);
          resolve();
        };
        if (signal.aborted) {
          clearTimeout(timer);
          resolve();
          return;
        }
        signal.addEventListener('abort', onAbort, { once: true });
      }
    });

    if (signal?.aborted) {
      return lastResult;
    }

    const idToken = getIdToken ? await getIdToken().catch(() => undefined) : undefined;
    if (signal?.aborted) {
      return lastResult;
    }

    const res = await verifyServerPayment(reference, idToken);
    lastResult = res;
    onUpdate?.(res, attempt);

    if (
      (res.verified && res.status === 'success') ||
      res.status === 'failed' ||
      res.status === 'abandoned'
    ) {
      return res;
    }
  }

  return lastResult;
}
