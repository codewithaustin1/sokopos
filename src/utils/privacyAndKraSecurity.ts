/**
 * Shared KRA PIN anti-forgery, PII masking, log/audit redaction,
 * and Kenya Data Protection Act (DPA) 2019 anonymization utilities.
 *
 * Pure TypeScript (no DOM or browser-only globals) so it runs identically
 * in both client React components and server-side Express routes.
 */

export const KRA_PIN_REGEX = /^[AP]\d{9}[A-Z]$/;

/**
 * Known sample/placeholder Kenyan KRA PINs commonly copied from docs/examples.
 */
export const PLACEHOLDER_KRA_PINS: ReadonlySet<string> = new Set([
  'P000000000X',
  'P051234567Z',
  'P051234567X',
  'A000000000A',
  'P000000000A',
  'P123456789A',
  'A123456789Z',
  'P123456789Z',
  'A000000000X',
]);

export const ANONYMIZED_CUSTOMER_NAME = 'Anonymized Customer';

export function isPlaceholderOrRepeatedKraPin(pin?: string | null): boolean {
  if (!pin) return false;
  const normalized = pin.trim().toUpperCase().replace(/\s+/g, '');
  if (!normalized) return false;
  if (PLACEHOLDER_KRA_PINS.has(normalized)) return true;
  // Reject 9 identical digits (e.g. P000000000M, A111111111B)
  if (/^[AP](\d)\1{8}[A-Z]$/.test(normalized)) return true;
  // Reject sequential dummy digits
  const digits = normalized.slice(1, 10);
  if (digits === '012345678' || digits === '123456789' || digits === '987654321') {
    return true;
  }
  return false;
}

export interface KraPinValidationResult {
  normalized?: string;
  isValid: boolean;
  isPlaceholder: boolean;
  reason?: string;
}

/**
 * Strict Kenyan KRA PIN validation:
 * - Uppercase normalization and whitespace removal
 * - Format enforcement: [AP] + 9 digits + [A-Z]
 * - Anti-forgery guard rejecting placeholder/repeated-digit PINs unless explicitly allowed for sandbox
 */
export function validateKraPinStrict(
  pin?: string | null,
  options: { required?: boolean; allowPlaceholderInSandbox?: boolean } = {}
): KraPinValidationResult {
  const raw = typeof pin === 'string' ? pin.trim() : '';
  if (!raw) {
    return {
      normalized: undefined,
      isValid: !options.required,
      isPlaceholder: false,
      reason: options.required ? 'KRA PIN is required.' : undefined,
    };
  }

  const normalized = raw.toUpperCase().replace(/\s+/g, '');
  if (!KRA_PIN_REGEX.test(normalized)) {
    return {
      normalized,
      isValid: false,
      isPlaceholder: false,
      reason: 'Invalid KRA PIN format (expected A or P + 9 digits + 1 letter, e.g. A011001890C).',
    };
  }

  const isPlaceholder = isPlaceholderOrRepeatedKraPin(normalized);
  if (isPlaceholder && !options.allowPlaceholderInSandbox) {
    return {
      normalized,
      isValid: false,
      isPlaceholder: true,
      reason: 'Placeholder or repeated-digit KRA PINs cannot be used as a live tax identifier.',
    };
  }

  return {
    normalized,
    isValid: true,
    isPlaceholder,
  };
}

/**
 * Determines whether the active staff role may toggle full customer PII reveal
 * in back-office details. Cashiers and inventory clerks stay masked by default.
 */
export function canViewUnmaskedCustomerPii(
  role?: string | null,
  isSuperAdmin?: boolean
): boolean {
  if (isSuperAdmin) return true;
  if (!role) return false;
  return ['super_admin', 'business_owner', 'manager', 'supervisor', 'accountant'].includes(
    role.toLowerCase().trim()
  );
}

/**
 * Checks whether a customer record has already been anonymized under Kenya DPA 2019.
 */
export function isCustomerAnonymized(
  customer?: { isAnonymized?: boolean; name?: string; phone?: string } | null
): boolean {
  if (!customer) return false;
  if (customer.isAnonymized) return true;
  if (customer.name === ANONYMIZED_CUSTOMER_NAME) return true;
  if (typeof customer.phone === 'string' && customer.phone.startsWith('REDACTED-')) return true;
  return false;
}

export function buildAnonymizedPhoneToken(customerId: string): string {
  const suffix = String(customerId || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-6)
    .toUpperCase() || 'DPA19';
  return `REDACTED-${suffix}`;
}

/**
 * Masks phone numbers for cashier screens and printed/shared receipts:
 * e.g. "+254 712 345 678" -> "+254 7•• •••678", "0712345678" -> "07•• •••678"
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const trimmed = String(phone).trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('REDACTED-')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 6) {
    return `${trimmed.slice(0, 2)}•••`;
  }
  const last3 = digits.slice(-3);
  if (trimmed.startsWith('+254') || digits.startsWith('254')) {
    const carrierDigit = digits.startsWith('254') ? digits.charAt(3) : '';
    return `+254 ${carrierDigit || '7'}•• •••${last3}`;
  }
  if (digits.startsWith('0') && digits.length >= 9) {
    return `${digits.slice(0, 2)}•• •••${last3}`;
  }
  return `${trimmed.slice(0, 3)}••••${last3}`;
}

/**
 * Masks email addresses: e.g. "grace.wanjiku@company.co.ke" -> "g••••@company.co.ke"
 */
export function maskEmailAddress(email?: string | null): string {
  if (!email) return '';
  const trimmed = String(email).trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0) return '••••';
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  const prefix = local.slice(0, Math.min(2, local.length));
  return `${prefix}••••@${domain}`;
}

/**
 * Masks KRA PINs: e.g. "P051289192M" -> "P051•••••2M"
 */
export function maskKraPin(pin?: string | null): string {
  if (!pin) return '';
  const normalized = String(pin).trim().toUpperCase().replace(/\s+/g, '');
  if (normalized.length < 6) return '••••';
  return `${normalized.slice(0, 4)}•••••${normalized.slice(-2)}`;
}

/**
 * Masks physical street/neighborhood addresses for non-privileged views.
 */
export function maskAddress(address?: string | null): string {
  if (!address) return '';
  const trimmed = String(address).trim();
  if (!trimmed) return '';
  const firstSegment = trimmed.split(',')[0]?.trim() || trimmed;
  if (firstSegment.length <= 4) return '••••';
  return `${firstSegment.slice(0, 4)}••••`;
}

const SENSITIVE_KEY_EXACT = new Set([
  'phone',
  'customerphone',
  'mpesaphone',
  'contactphone',
  'email',
  'owneremail',
  'customeremail',
  'acceptedbyemail',
  'reconciledbyemail',
  'krapin',
  'customertin',
  'customer_pin',
  'customer_tin',
  'taxpin',
  'pin',
  'pinhash',
  'password',
  'totpsecret',
  'secret',
  'token',
  'idtoken',
  'bearertoken',
  'authorization',
  'apikey',
  'x-api-key',
  'bankaccount',
  'address',
  'notes',
]);

/**
 * Scrubs inline PII patterns (Kenyan phones, emails, KRA PINs, Bearer tokens, API keys)
 * from freeform log strings and audit descriptions.
 */
export function redactPiiInText(input: string): string {
  if (!input || typeof input !== 'string') return input;
  let out = input;

  // 1. Bearer tokens / JWTs
  out = out.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]');
  // 2. Common API key prefixes
  out = out.replace(/\b(AIza[0-9A-Za-z\-_]{16,}|sk_(?:live|test)_[0-9A-Za-z]{12,}|re_[0-9A-Za-z_]{12,})\b/g, '[API_KEY_REDACTED]');
  // 3. Kenyan KRA PINs
  out = out.replace(/\b([AP])(\d{3})\d{5}([A-Z])\b/g, '$1$2•••••$3');
  // 4. Email addresses (preserve support@sokopos.co.ke operational alias)
  out = out.replace(/\b([A-Za-z0-9._%+-]{1,64})@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g, (full, local, domain) => {
    if (full.toLowerCase() === 'support@sokopos.co.ke') return full;
    const prefix = String(local).slice(0, Math.min(2, String(local).length));
    return `${prefix}••••@${domain}`;
  });
  // 5. Kenyan phone numbers (+2547..., 2547..., 07..., +2541..., 01...)
  out = out.replace(/(?:\+?254[\s-]?[17]\d{2}[\s-]?\d{3}[\s-]?\d{3}|\b0[17]\d{2}[\s-]?\d{3}[\s-]?\d{3})\b/g, (match) =>
    maskPhoneNumber(match)
  );

  return out;
}

/**
 * Recursively clones and redacts PII fields from arbitrary audit/log payloads
 * without mutating live application state.
 */
export function redactPiiForLogs<T>(value: T, depth = 0): T {
  if (value === null || value === undefined) return value;
  if (depth > 6) return '[TRUNCATED]' as unknown as T;

  if (typeof value === 'string') {
    return redactPiiInText(value) as unknown as T;
  }
  if (typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => redactPiiForLogs(item, depth + 1)) as unknown as T;
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const lowerKey = k.toLowerCase();
    if (SENSITIVE_KEY_EXACT.has(lowerKey)) {
      if (v === null || v === undefined || v === '') {
        out[k] = v;
      } else if (lowerKey.includes('pin') && !lowerKey.includes('kra') && !lowerKey.includes('tax') && !lowerKey.includes('tin')) {
        out[k] = '[PIN_REDACTED]';
      } else if (lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey.includes('token') || lowerKey.includes('apikey')) {
        out[k] = '[REDACTED]';
      } else if (lowerKey.includes('email')) {
        out[k] = typeof v === 'string' ? maskEmailAddress(v) : '[EMAIL_REDACTED]';
      } else if (lowerKey.includes('phone')) {
        out[k] = typeof v === 'string' ? maskPhoneNumber(v) : '[PHONE_REDACTED]';
      } else if (lowerKey.includes('kra') || lowerKey.includes('tin') || lowerKey.includes('taxpin')) {
        out[k] = typeof v === 'string' ? maskKraPin(v) : '[PIN_REDACTED]';
      } else if (lowerKey === 'address') {
        out[k] = typeof v === 'string' ? maskAddress(v) : '[REDACTED]';
      } else {
        out[k] = '[REDACTED]';
      }
      continue;
    }
    out[k] = redactPiiForLogs(v, depth + 1);
  }
  return out as T;
}

/**
 * Normalizes and enforces bounded string lengths before persisting customer records.
 */
export function clampStringField(value: string | undefined | null, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}
