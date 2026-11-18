import { AffiliateAccountType, AffiliateCommission, AffiliatePayout, AffiliateProfile } from '../types';
import { auth } from './firebase';

const REFERRAL_STORAGE_KEY = 'sokopos_referral_attribution';
const REFERRAL_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30-day attribution window

async function getAffiliateAuthHeaders(includeJsonContentType = false): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json';
  }
  const idToken = await auth.currentUser?.getIdToken().catch(() => undefined);
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }
  return headers;
}

export interface StoredReferralAttribution {
  code: string;
  capturedAt: number;
}

export function captureReferralCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('referral');
    if (ref && /^[a-zA-Z0-9_-]{3,24}$/.test(ref.trim())) {
      const normalized = ref.trim().toUpperCase();
      const payload: StoredReferralAttribution = {
        code: normalized,
        capturedAt: Date.now(),
      };
      localStorage.setItem(REFERRAL_STORAGE_KEY, JSON.stringify(payload));
      return normalized;
    }
  } catch {
    // ignore storage errors
  }
  return getCapturedReferralCode();
}

export function getCapturedReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed: StoredReferralAttribution = JSON.parse(raw);
    if (!parsed?.code || !parsed?.capturedAt) return null;
    if (Date.now() - parsed.capturedAt > REFERRAL_TTL_MS) {
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
      return null;
    }
    return parsed.code;
  } catch {
    return null;
  }
}

export function clearCapturedReferralCode(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export async function validateReferralCode(
  code: string
): Promise<{ valid: boolean; code?: string; partnerName?: string }> {
  try {
    const resp = await fetch(`/api/affiliates/validate/${encodeURIComponent(code.trim())}`);
    if (!resp.ok) return { valid: false };
    return await resp.json();
  } catch {
    return { valid: false };
  }
}

export async function enrollAffiliate(params: {
  uid: string;
  email: string;
  name: string;
  mpesaPhone: string;
  accountType: AffiliateAccountType;
  preferredCode?: string;
}): Promise<{ success: boolean; affiliate?: AffiliateProfile; error?: string }> {
  try {
    const headers = await getAffiliateAuthHeaders(true);
    const resp = await fetch('/api/affiliates/enroll', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return { success: false, error: data?.error || 'Failed to enroll as affiliate.' };
    }
    return { success: true, affiliate: data.affiliate };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error enrolling affiliate.' };
  }
}

export interface AffiliateDashboardData {
  enrolled: boolean;
  affiliate: AffiliateProfile | null;
  commissions: AffiliateCommission[];
  payouts: AffiliatePayout[];
  referredStoresCount?: number;
}

export async function fetchAffiliateDashboard(uid: string, email?: string): Promise<AffiliateDashboardData> {
  const query = new URLSearchParams();
  if (uid) query.set('uid', uid);
  if (email) query.set('email', email.trim().toLowerCase());
  const headers = await getAffiliateAuthHeaders(false);
  const resp = await fetch(`/api/affiliates/me?${query.toString()}`, { headers });
  if (!resp.ok) {
    throw new Error('Failed to load affiliate dashboard');
  }
  return await resp.json();
}

export async function requestAffiliatePayout(params: {
  uid: string;
  amountKes: number;
  mpesaPhone: string;
}): Promise<{ success: boolean; payout?: AffiliatePayout; remainingBalanceKes?: number; error?: string }> {
  try {
    const headers = await getAffiliateAuthHeaders(true);
    const resp = await fetch('/api/affiliates/payout-request', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return { success: false, error: data?.error || 'Failed to request payout.' };
    }
    return { success: true, payout: data.payout, remainingBalanceKes: data.remainingBalanceKes };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error requesting payout.' };
  }
}

export interface AdminAffiliateOverview {
  affiliates: AffiliateProfile[];
  commissions: AffiliateCommission[];
  payouts: AffiliatePayout[];
}

export async function fetchAdminAffiliateOverview(): Promise<AdminAffiliateOverview> {
  const headers = await getAffiliateAuthHeaders(false);
  const resp = await fetch('/api/affiliates/admin/overview', { headers });
  if (!resp.ok) {
    throw new Error('Failed to load admin affiliate overview');
  }
  return await resp.json();
}

export async function reviewAffiliatePayout(params: {
  payoutId: string;
  action: 'approved' | 'paid' | 'rejected';
  mpesaReceiptNumber?: string;
  reviewedBy?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAffiliateAuthHeaders(true);
    const resp = await fetch('/api/affiliates/admin/payout-review', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return { success: false, error: data?.error || 'Failed to review payout.' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error reviewing payout.' };
  }
}

export async function updateAffiliateRateOrStatus(params: {
  affiliateId: string;
  commissionRate?: number;
  status?: 'active' | 'suspended';
}): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = await getAffiliateAuthHeaders(true);
    const resp = await fetch('/api/affiliates/admin/update-rate', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return { success: false, error: data?.error || 'Failed to update affiliate.' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error updating affiliate.' };
  }
}

export interface EmailOtpCapabilities {
  emailProviderConfigured: boolean;
  customTokenConfigured: boolean;
  otpDigits: number;
  ttlSeconds: number;
  resendCooldownSeconds: number;
}

export type EmailOtpPurpose = 'passwordless_login' | 'step_up_2fa';

export async function fetchEmailOtpCapabilities(): Promise<EmailOtpCapabilities | null> {
  try {
    const resp = await fetch('/api/auth/otp/capabilities', { method: 'GET' });
    if (!resp.ok) return null;
    const data = await resp.json().catch(() => null);
    if (!data) return null;
    return {
      emailProviderConfigured: Boolean(data.emailProviderConfigured),
      customTokenConfigured: Boolean(data.customTokenConfigured),
      otpDigits: Number(data.otpDigits) || 6,
      ttlSeconds: Number(data.ttlSeconds) || 600,
      resendCooldownSeconds: Number(data.resendCooldownSeconds) || 60,
    };
  } catch {
    return null;
  }
}

export async function requestLoginOtp(
  email: string,
  purpose: EmailOtpPurpose = 'passwordless_login'
): Promise<{
  success: boolean;
  expiresInSeconds?: number;
  resendCooldownSeconds?: number;
  retryAfterSeconds?: number;
  code?: string;
  error?: string;
}> {
  try {
    const resp = await fetch('/api/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return {
        success: false,
        code: data?.code,
        retryAfterSeconds: typeof data?.retryAfterSeconds === 'number' ? data.retryAfterSeconds : undefined,
        error: data?.error || 'Failed to send verification code.',
      };
    }
    return {
      success: true,
      expiresInSeconds: typeof data?.expiresInSeconds === 'number' ? data.expiresInSeconds : 600,
      resendCooldownSeconds: typeof data?.resendCooldownSeconds === 'number' ? data.resendCooldownSeconds : 60,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error sending verification code.' };
  }
}

export async function verifyLoginOtp(
  email: string,
  otp: string,
  purpose: EmailOtpPurpose = 'passwordless_login'
): Promise<{
  success: boolean;
  verified?: boolean;
  customToken?: string;
  uid?: string;
  email?: string;
  remainingAttempts?: number;
  code?: string;
  error?: string;
}> {
  try {
    const resp = await fetch('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, purpose }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return {
        success: false,
        code: data?.code,
        remainingAttempts: typeof data?.remainingAttempts === 'number' ? data.remainingAttempts : undefined,
        error: data?.error || 'Invalid verification code.',
      };
    }
    return {
      success: true,
      verified: Boolean(data?.verified),
      customToken: typeof data?.customToken === 'string' ? data.customToken : undefined,
      uid: typeof data?.uid === 'string' ? data.uid : undefined,
      email: typeof data?.email === 'string' ? data.email : undefined,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error verifying code.' };
  }
}

