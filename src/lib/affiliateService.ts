import { AffiliateAccountType, AffiliateCommission, AffiliatePayout, AffiliateProfile } from '../types';

const REFERRAL_STORAGE_KEY = 'sokopos_referral_attribution';
const REFERRAL_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30-day attribution window

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
    const resp = await fetch('/api/affiliates/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  const resp = await fetch(`/api/affiliates/me?${query.toString()}`);
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
    const resp = await fetch('/api/affiliates/payout-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  const resp = await fetch('/api/affiliates/admin/overview');
  if (!resp.ok) {
    throw new Error('Failed to load admin affiliate overview');
  }
  return await resp.json();
}

export async function reviewAffiliatePayout(params: {
  payoutId: string;
  action: 'paid' | 'rejected';
  mpesaReceiptNumber?: string;
  reviewedBy?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const resp = await fetch('/api/affiliates/admin/payout-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const resp = await fetch('/api/affiliates/admin/update-rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
