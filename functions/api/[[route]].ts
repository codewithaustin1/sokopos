/**
 * Cloudflare Worker & Pages Function - Full-Stack Edge API Adapter for SokoPoS
 * Serves as the Worker "main" entry point for /api/* routes alongside static assets.
 */
import bcrypt from 'bcryptjs';

const DIGITAX_BASE_URL = 'https://api.digitax.tech/ke/v2';

export interface WorkerEnv {
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
  ALLOWED_ORIGINS?: string;
  DIGITAX_API_KEY?: string;
  FIREBASE_WEB_API_KEY?: string;
  [key: string]: unknown;
}

function resolveAllowedOrigin(request: Request, env: WorkerEnv): string | null {
  const origin = request.headers.get('Origin');
  if (!origin) return null;

  try {
    const reqOrigin = new URL(request.url).origin;
    if (origin === reqOrigin) return origin;
  } catch {
    // Ignore malformed request URL
  }

  const configured = (typeof env.ALLOWED_ORIGINS === 'string' ? env.ALLOWED_ORIGINS : '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (
    configured.includes(origin) ||
    /^https:\/\/([a-z0-9-]+\.)?sokoplus\.co\.ke$/i.test(origin) ||
    /^https:\/\/([a-z0-9-]+\.)?sokopos\.co\.ke$/i.test(origin) ||
    /^https:\/\/ais-(dev|pre)-[a-z0-9-]+\.([a-z0-9-]+\.)?run\.app$/i.test(origin)
  ) {
    return origin;
  }
  return null;
}

function buildCorsHeaders(request: Request, env: WorkerEnv): Record<string, string> {
  const allowedOrigin = resolveAllowedOrigin(request, env);
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
  if (allowedOrigin) {
    headers['Access-Control-Allow-Origin'] = allowedOrigin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

function jsonResponse(
  data: unknown,
  status = 200,
  request?: Request,
  env: WorkerEnv = {}
): Response {
  const cors = request ? buildCorsHeaders(request, env) : {};
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...cors,
    },
  });
}

async function verifyEdgeCaller(
  request: Request,
  env: WorkerEnv
): Promise<{ uid: string; email: string; emailVerified: boolean } | null> {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const idToken = authHeader.slice(7).trim();
  const apiKey = typeof env.FIREBASE_WEB_API_KEY === 'string' ? env.FIREBASE_WEB_API_KEY.trim() : '';
  if (!idToken || !apiKey) return null;

  try {
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!resp.ok) return null;
    const data: any = await resp.json().catch(() => null);
    const user = Array.isArray(data?.users) ? data.users[0] : null;
    if (!user || !user.localId || !user.email || !user.emailVerified) return null;
    return {
      uid: String(user.localId),
      email: String(user.email).trim().toLowerCase(),
      emailVerified: Boolean(user.emailVerified),
    };
  } catch {
    return null;
  }
}

export async function handleApiRequest(request: Request, env: WorkerEnv = {}): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Handle CORS Preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: buildCorsHeaders(request, env),
    });
  }

  // 1. Health Endpoint
  if (pathname === '/api/health') {
    return jsonResponse(
      {
        status: 'ok',
        service: 'sokopos-cloudflare-worker-api',
        features: ['bcrypt-pin-hashing', 'multi-tenant-pos', 'edge-worker', 'digitax-proxy'],
      },
      200,
      request,
      env
    );
  }

  // 2. PIN Cryptographic Hashing (requires verified caller)
  if (pathname === '/api/auth/hash-pin' && request.method === 'POST') {
    const caller = await verifyEdgeCaller(request, env);
    if (!caller) {
      return jsonResponse({ error: 'Authentication required.' }, 401, request, env);
    }
    try {
      const body = (await request.json()) as any;
      const { pin, rounds = 10 } = body || {};
      if (!pin || typeof pin !== 'string' || pin.length > 64) {
        return jsonResponse({ error: 'PIN is required and must be a string' }, 400, request, env);
      }
      const saltRounds = Math.min(Math.max(Number(rounds) || 10, 10), 14);
      const hash = await bcrypt.hash(pin, saltRounds);
      return jsonResponse({ success: true, hash, algorithm: 'bcrypt', saltRounds }, 200, request, env);
    } catch {
      return jsonResponse({ error: 'Cryptographic hash generation failed' }, 500, request, env);
    }
  }

  // 3. PIN Verification & Isolated Staff Validation (Bcrypt only)
  if (pathname === '/api/auth/verify-pin' && request.method === 'POST') {
    try {
      const body = (await request.json()) as any;
      const { pin, hash, cashierId, businessId, usernameOrCode, managerOverride } = body || {};
      if (!pin) {
        return jsonResponse({ error: 'PIN is required' }, 400, request, env);
      }

      const defaultHash = '$2b$10$g925CNtpaFfvsV/TNlwblucRcqdLXBHj5NsDDYiXvKkgByQUBVoGq';
      const defaultCreds: Record<string, any> = {
        'user-cashier-7000': {
          cashierId: 'user-cashier-7000',
          businessId: 'biz-upfront',
          hash: defaultHash,
          role: 'cashier',
          name: 'Cashier A',
          code: '#7000',
          username: 'cashier.a',
        },
        'user-upfront-01': {
          cashierId: 'user-upfront-01',
          businessId: 'biz-upfront',
          hash: defaultHash,
          role: 'manager',
          name: 'Administrator Staff',
          code: '#1000',
          username: 'admin.staff',
        },
      };

      if (managerOverride) {
        const candidates = Object.values(defaultCreds).filter(
          (c) =>
            (!businessId || c.businessId === businessId) &&
            (c.role === 'manager' || c.role === 'supervisor' || c.role === 'business_owner')
        );

        for (const mgr of candidates) {
          const isMatch = await bcrypt.compare(String(pin), mgr.hash).catch(() => false);
          if (isMatch) {
            return jsonResponse(
              {
                valid: true,
                managerId: mgr.cashierId,
                managerName: mgr.name,
                managerRole: mgr.role,
              },
              200,
              request,
              env
            );
          }
        }
        return jsonResponse({ valid: false, error: 'Invalid manager override PIN.' }, 401, request, env);
      }

      let targetCred = cashierId ? defaultCreds[cashierId] : undefined;
      if (!targetCred && usernameOrCode) {
        const clean = String(usernameOrCode).trim().toLowerCase().replace(/^#/, '');
        targetCred = Object.values(defaultCreds).find(
          (c) =>
            c.cashierId.toLowerCase() === clean ||
            c.username?.toLowerCase() === clean ||
            c.code?.toLowerCase().replace(/^#/, '') === clean ||
            c.name?.toLowerCase() === clean
        );
      }

      if (targetCred) {
        const isBcrypt =
          targetCred.hash.startsWith('$2a$') ||
          targetCred.hash.startsWith('$2b$') ||
          targetCred.hash.startsWith('$2y$');
        if (!isBcrypt) {
          return jsonResponse({ valid: false, error: 'Staff credential requires hash upgrade.' }, 401, request, env);
        }
        const isValid = await bcrypt.compare(String(pin), targetCred.hash).catch(() => false);
        if (!isValid) {
          return jsonResponse({ valid: false, error: 'Invalid PIN entered.' }, 401, request, env);
        }
        return jsonResponse(
          {
            valid: true,
            cashierId: targetCred.cashierId,
            businessId: targetCred.businessId,
            name: targetCred.name,
            role: targetCred.role,
            code: targetCred.code,
            username: targetCred.username,
          },
          200,
          request,
          env
        );
      }

      if (hash) {
        const isBcrypt =
          typeof hash === 'string' &&
          (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$'));
        if (!isBcrypt) {
          return jsonResponse(
            { valid: false, error: 'Only valid bcrypt PIN hashes are accepted.' },
            400,
            request,
            env
          );
        }
        const isValid = await bcrypt.compare(String(pin), hash).catch(() => false);
        if (!isValid) {
          return jsonResponse({ valid: false, error: 'Invalid PIN entered.', algorithm: 'bcrypt' }, 401, request, env);
        }
        return jsonResponse({ valid: true, algorithm: 'bcrypt', isUpgraded: true }, 200, request, env);
      }

      return jsonResponse({ valid: false, error: 'Staff credential not found.' }, 404, request, env);
    } catch {
      return jsonResponse({ error: 'Cryptographic PIN verification failed' }, 500, request, env);
    }
  }

  // 4. Bulk Hash Pins (requires verified caller)
  if (pathname === '/api/auth/bulk-hash-pins' && request.method === 'POST') {
    const caller = await verifyEdgeCaller(request, env);
    if (!caller) {
      return jsonResponse({ error: 'Authentication required.' }, 401, request, env);
    }
    try {
      const body = (await request.json()) as any;
      const { items } = body || {};
      if (!Array.isArray(items) || items.length > 200) {
        return jsonResponse({ error: 'items must be an array of at most 200 { id, pin } entries' }, 400, request, env);
      }
      const results = await Promise.all(
        items.map(async (item: any) => {
          if (!item?.pin || typeof item.pin !== 'string') return { id: item?.id, hash: null };
          if (item.pin.startsWith('$2')) {
            return { id: item.id, hash: item.pin, alreadyHashed: true };
          }
          const hash = await bcrypt.hash(String(item.pin), 10);
          return { id: item.id, hash, alreadyHashed: false };
        })
      );
      return jsonResponse({ success: true, results }, 200, request, env);
    } catch {
      return jsonResponse({ error: 'Bulk hashing failed' }, 500, request, env);
    }
  }

  // 5. Digitax KRA eTIMS Proxy Endpoints (requires verified caller & allowlisted paths)
  if (pathname.startsWith('/api/digitax/')) {
    const caller = await verifyEdgeCaller(request, env);
    if (!caller) {
      return jsonResponse({ error: 'Authentication required for Digitax proxy.' }, 401, request, env);
    }
    const subpath = pathname.replace('/api/digitax/', '');
    const isAllowedSubpath =
      subpath === 'etims-info' ||
      subpath === 'items' ||
      subpath === 'sales' ||
      /^sales\/[a-zA-Z0-9_-]{1,64}$/.test(subpath);
    if (!isAllowedSubpath) {
      return jsonResponse({ error: 'Unsupported Digitax endpoint.' }, 400, request, env);
    }

    const headerKey = (request.headers.get('x-api-key') || '').trim();
    const envKey = typeof env.DIGITAX_API_KEY === 'string' ? env.DIGITAX_API_KEY.trim() : '';
    const apiKey = headerKey || envKey;
    if (!apiKey) {
      return jsonResponse({ error: 'DIGITAX_API_KEY is not configured.' }, 503, request, env);
    }

    const targetUrl = `${DIGITAX_BASE_URL}/${subpath}`;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      };

      const fetchOptions: RequestInit = {
        method: request.method,
        headers,
      };

      if (request.method === 'POST' || request.method === 'PUT') {
        const bodyText = await request.text();
        fetchOptions.body = bodyText;
      }

      const response = await fetch(targetUrl, fetchOptions);
      const data = await response.json();
      return jsonResponse(data, response.status, request, env);
    } catch (err: any) {
      return jsonResponse({ error: err?.message || 'Digitax proxy request failed' }, 500, request, env);
    }
  }

  // 6. Gemini Vision AI Invoice & Package Parsing Fallback (requires verified caller)
  if (pathname === '/api/ai/parse-invoice' || pathname === '/api/ai/parse-package') {
    const caller = await verifyEdgeCaller(request, env);
    if (!caller) {
      return jsonResponse({ error: 'Authentication required.' }, 401, request, env);
    }
    return jsonResponse(
      {
        error: 'GEMINI_API_KEY is not configured in Cloudflare Worker environment variables.',
      },
      503,
      request,
      env
    );
  }

  return jsonResponse({ error: `Route ${pathname} not found` }, 404, request, env);
}

// Cloudflare Pages Function compatibility export
export async function onRequest(context: { request: Request; env: WorkerEnv }): Promise<Response> {
  return handleApiRequest(context.request, context.env || {});
}

// Cloudflare Worker "main" entry point (used with wrangler.jsonc "main" + "assets" + "run_worker_first": ["/api/*"])
export default {
  async fetch(request: Request, env: WorkerEnv = {}, _ctx?: unknown): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, env);
    }
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }
    return new Response('Not Found', { status: 404 });
  },
};
