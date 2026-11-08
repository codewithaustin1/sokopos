import QRCode from 'qrcode';

/**
 * RFC 6238 Time-based One-Time Password (TOTP) Service for SokoPoS
 * Standard 6-digit Authenticator App implementation (Google Authenticator, Microsoft Authenticator, Authy).
 * Operates purely using standard Base32 encoding and Web Crypto / Node HMAC-SHA1.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generates a cryptographically random Base32 secret for Authenticator apps
 */
export function generateTotpSecret(length: number = 20): string {
  const bytes = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(bytes);
  } else {
    // Node.js fallback
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodeCrypto = require('crypto');
      nodeCrypto.randomFillSync(bytes);
    } catch {
      for (let i = 0; i < length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
  }

  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += BASE32_ALPHABET[bytes[i] % BASE32_ALPHABET.length];
  }
  return secret;
}

/**
 * Decodes a Base32 string into Uint8Array
 */
export function base32Decode(base32: string): Uint8Array {
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_ALPHABET.indexOf(clean[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

/**
 * Generates the standard otpauth URI scanned by Authenticator Apps
 */
export function generateOtpAuthUrl(
  secret: string,
  accountEmail: string,
  issuer: string = 'SokoPoS'
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountEmail || 'retail@sokopos.co.ke');
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generates a clean QR code Data URL for mobile camera scanning
 */
export async function generateQrCodeDataUrl(otpAuthUrl: string): Promise<string> {
  return await QRCode.toDataURL(otpAuthUrl, {
    width: 220,
    margin: 2,
    color: {
      dark: '#0e1a2b',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}

/**
 * Calculates standard 6-digit TOTP for a given 30-second counter offset
 */
export async function generateTotpForOffset(
  secret: string,
  offset: number = 0,
  timestampMs: number = Date.now()
): Promise<string> {
  const counter = Math.floor(timestampMs / 1000 / 30) + offset;
  const counterBuffer = new ArrayBuffer(8);
  const view = new DataView(counterBuffer);
  view.setBigInt64(0, BigInt(counter));

  const keyBytes = base32Decode(secret);

  // Web Crypto API HMAC-SHA1
  let hmacBytes: Uint8Array;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyBytes as unknown as BufferSource,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, counterBuffer);
    hmacBytes = new Uint8Array(signature);
  } else {
    // Node.js fallback
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require('crypto');
    const hmac = nodeCrypto.createHmac('sha1', Buffer.from(keyBytes)).update(Buffer.from(counterBuffer)).digest();
    hmacBytes = new Uint8Array(hmac);
  }

  const offsetIdx = hmacBytes[hmacBytes.length - 1] & 0x0f;
  const code =
    ((hmacBytes[offsetIdx] & 0x7f) << 24) |
    ((hmacBytes[offsetIdx + 1] & 0xff) << 16) |
    ((hmacBytes[offsetIdx + 2] & 0xff) << 8) |
    (hmacBytes[offsetIdx + 3] & 0xff);

  return (code % 1000000).toString().padStart(6, '0');
}

/**
 * Verifies a 6-digit user-entered code against the shared Base32 secret.
 * Evaluates ±1 time window step (tolerance of 30 seconds before/after) to account for clock skew.
 */
export async function verifyTotpCode(
  code: string,
  secret: string,
  windowSteps: number = 1
): Promise<boolean> {
  const cleanCode = code.trim().replace(/\s+/g, '');
  if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    return false;
  }

  if (!secret) return false;

  for (let offset = -windowSteps; offset <= windowSteps; offset++) {
    try {
      const expected = await generateTotpForOffset(secret, offset);
      if (cleanCode === expected) {
        return true;
      }
    } catch (err) {
      console.warn('Error calculating TOTP window offset:', err);
    }
  }

  return false;
}

/**
 * Verifies TOTP via backend /api/auth/verify-totp with fallback to local Web Crypto evaluation
 */
export async function verifyTotpOnServer(code: string, secret: string): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/verify-totp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, secret }),
    });
    if (res.ok) {
      const data = await res.json();
      return Boolean(data.verified);
    }
  } catch (err) {
    console.warn('Server verify-totp network issue, falling back to client crypto:', err);
  }
  return await verifyTotpCode(code, secret);
}
