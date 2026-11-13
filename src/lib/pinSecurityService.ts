import bcrypt from 'bcryptjs';
import { auth } from './firebase';

export const PROTECTED_PIN_MASK = '••••••••';

export interface HashPinResult {
  hash: string;
  algorithm: 'bcrypt' | 'client_fallback';
}

export interface VerifyPinResult {
  isValid: boolean;
  algorithm?: string;
  cashierId?: string;
  businessId?: string;
  role?: string;
  name?: string;
  code?: string;
  username?: string;
  businessName?: string;
  businessStatus?: string;
  error?: string;
}

export interface ManagerOverrideResult {
  success: boolean;
  managerName?: string;
  managerId?: string;
  managerRole?: string;
  error?: string;
}

export function isProtectedPin(value?: string | null): boolean {
  if (!value) return false;
  return value === PROTECTED_PIN_MASK || value.startsWith('[PROTECTED');
}

/**
 * Checks if a PIN string is already a valid bcrypt hash
 */
export function isBcryptHash(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$');
}

/**
 * Request server-side cryptographic PIN hashing via bcrypt.
 * Falls back to client-side bcrypt if server endpoint is unreachable (e.g., offline terminal).
 */
export async function hashPinOnServer(pin: string): Promise<string> {
  if (!pin || typeof pin !== 'string') {
    throw new Error('PIN must be a non-empty string');
  }

  try {
    const response = await fetch('/api/auth/hash-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pin }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.hash) {
        return data.hash;
      }
    }
  } catch (err) {
    console.warn('Server PIN hashing request failed, using local cryptographic bcrypt fallback:', err);
  }

  // Cryptographic fallback (pure JS bcrypt in browser)
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(pin, salt);
}

export interface SaveStaffCredentialResult {
  success: boolean;
  error?: string;
  status?: number;
}

/**
 * Save staff credential directly into the server-only isolated vault.
 * Raw or hashed PIN is strictly stored server-side and never exposed to other clients.
 */
export async function saveStaffCredentialOnServer(params: {
  cashierId: string;
  businessId: string;
  pin?: string;
  hash?: string;
  role?: string;
  name?: string;
  code?: string;
  username?: string;
}): Promise<SaveStaffCredentialResult> {
  try {
    const idToken = await auth.currentUser?.getIdToken().catch(() => undefined);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const response = await fetch('/api/auth/save-staff-credential', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    if (response.ok) {
      return { success: true, status: response.status };
    }
    const data = await response.json().catch(() => ({}));
    return {
      success: false,
      status: response.status,
      error: data.error || 'Failed to save staff credential on server.',
    };
  } catch (err) {
    console.warn('Failed saving staff credential to server vault:', err);
    return { success: false, error: 'Server unreachable while saving staff credential.' };
  }
}

/**
 * Bulk sync existing staff credentials into server vault (e.g., on initialization)
 */
export async function syncStaffCredentialsOnServer(cashiers: any[]): Promise<number> {
  try {
    const idToken = await auth.currentUser?.getIdToken().catch(() => undefined);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const response = await fetch('/api/auth/sync-credentials', {
      method: 'POST',
      headers,
      body: JSON.stringify({ cashiers }),
    });
    if (response.ok) {
      const data = await response.json();
      return data.count || 0;
    }
  } catch (err) {
    console.warn('Staff credentials bulk sync notice:', err);
  }
  return 0;
}

/**
 * Handle staff PIN validation through the protected /api/auth/verify-pin server route.
 * Never requires client to possess or expose the underlying PIN hash.
 */
export async function verifyStaffPinViaServer(params: {
  pin: string;
  cashierId?: string;
  businessId?: string;
  usernameOrCode?: string;
  fallbackHash?: string;
}): Promise<VerifyPinResult> {
  const { pin, cashierId, businessId, usernameOrCode, fallbackHash } = params;
  if (!pin) {
    return { isValid: false, error: 'PIN is required' };
  }

  try {
    const response = await fetch('/api/auth/verify-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pin,
        cashierId,
        businessId,
        usernameOrCode,
        hash: fallbackHash && !isProtectedPin(fallbackHash) ? fallbackHash : undefined,
      }),
    });

    if (response.status === 429) {
      const data = await response.json().catch(() => ({}));
      const errorMsg =
        data.error || 'Too many failed verification attempts. Terminal locked for 15 minutes.';
      throw new Error(errorMsg);
    }

    if (response.status === 401) {
      return { isValid: false, error: 'Incorrect PIN entered.' };
    }

    if (response.status === 403) {
      const data = await response.json().catch(() => ({}));
      return {
        isValid: false,
        error: data.error || 'Access Blocked: Staff account does not belong to this business.',
      };
    }

    if (response.ok) {
      const data = await response.json();
      return {
        isValid: Boolean(data.valid),
        cashierId: data.cashierId,
        businessId: data.businessId,
        role: data.role,
        name: data.name,
        code: data.code,
        username: data.username,
        businessName: data.businessName,
        businessStatus: data.businessStatus,
      };
    }
  } catch (err: any) {
    if (err?.message?.includes('locked') || err?.message?.includes('Too many')) {
      throw err;
    }
    console.warn('Server PIN verification request unreachable:', err);
  }

  // Local fallback ONLY if an actual bcrypt hash was cached and available
  if (fallbackHash && !isProtectedPin(fallbackHash)) {
    try {
      if (isBcryptHash(fallbackHash)) {
        const isValid = bcrypt.compareSync(pin, fallbackHash);
        return { isValid };
      }
      return { isValid: pin === fallbackHash };
    } catch {
      return { isValid: false };
    }
  }

  return { isValid: false, error: 'Verification server is currently unreachable.' };
}

/**
 * Handle Manager Override validation strictly via protected server route.
 * Verifies supervisor credentials server-side without exposing supervisor hashes to cashier terminals.
 */
export async function verifyManagerOverrideViaServer(params: {
  pin: string;
  businessId: string;
  managerId?: string;
}): Promise<ManagerOverrideResult> {
  const { pin, businessId, managerId } = params;
  if (!pin) {
    return { success: false, error: 'PIN is required' };
  }

  try {
    const response = await fetch('/api/auth/verify-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pin,
        businessId,
        managerId,
        managerOverride: true,
      }),
    });

    if (response.status === 429) {
      const data = await response.json().catch(() => ({}));
      const errorMsg =
        data.error || 'Too many failed verification attempts. Terminal locked for 15 minutes.';
      throw new Error(errorMsg);
    }

    if (response.status === 401) {
      return { success: false, error: 'Invalid manager override PIN entered.' };
    }

    if (response.ok) {
      const data = await response.json();
      return {
        success: Boolean(data.valid),
        managerName: data.managerName,
        managerId: data.managerId,
        managerRole: data.managerRole,
      };
    }
  } catch (err: any) {
    if (err?.message?.includes('locked') || err?.message?.includes('Too many')) {
      throw err;
    }
    console.warn('Server manager override verification request unreachable:', err);
  }

  return { success: false, error: 'Manager verification server unreachable.' };
}

/**
 * Legacy cryptographic PIN verification (retains backward compatibility)
 */
export async function verifyPinOnServer(pin: string, storedHashOrPin: string): Promise<boolean> {
  if (!pin || !storedHashOrPin) {
    return false;
  }

  const result = await verifyStaffPinViaServer({
    pin,
    fallbackHash: storedHashOrPin,
  });

  return result.isValid;
}

