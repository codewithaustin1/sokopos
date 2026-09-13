import bcrypt from 'bcryptjs';

export interface HashPinResult {
  hash: string;
  algorithm: 'bcrypt' | 'client_fallback';
}

export interface VerifyPinResult {
  isValid: boolean;
  algorithm: string;
  upgradedHash?: string | null;
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

/**
 * Request server-side cryptographic PIN verification.
 * Compares candidate plain PIN against stored bcrypt hash on the server.
 * Includes offline client-side bcrypt fallback.
 */
export async function verifyPinOnServer(pin: string, storedHashOrPin: string): Promise<boolean> {
  if (!pin || !storedHashOrPin) {
    return false;
  }

  try {
    const response = await fetch('/api/auth/verify-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pin,
        hash: storedHashOrPin,
      }),
    });

    if (response.status === 429) {
      const data = await response.json().catch(() => ({}));
      const errorMsg = data.error || 'Too many failed verification attempts. Terminal locked for 15 minutes.';
      throw new Error(errorMsg);
    }

    if (response.status === 401) {
      return false;
    }

    if (response.ok) {
      const data = await response.json();
      return Boolean(data.valid);
    }
  } catch (err: any) {
    // If it's an explicit lockout error from the rate limiter, re-throw to enforce lock
    if (err?.message?.includes('locked') || err?.message?.includes('Too many')) {
      throw err;
    }
    console.warn('Server PIN verification request unreachable, evaluating via local cryptographic bcrypt engine:', err);
  }

  // Local verification fallback
  try {
    if (storedHashOrPin.startsWith('$2a$') || storedHashOrPin.startsWith('$2b$') || storedHashOrPin.startsWith('$2y$')) {
      return bcrypt.compareSync(pin, storedHashOrPin);
    }
    // Legacy unhashed comparison
    return pin === storedHashOrPin;
  } catch (err) {
    console.error('Cryptographic comparison error:', err);
    return false;
  }
}

/**
 * Checks if a PIN string is already a valid bcrypt hash
 */
export function isBcryptHash(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  return value.startsWith('$2a$') || value.startsWith('$2b$') || value.startsWith('$2y$');
}
