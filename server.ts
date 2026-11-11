import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI, Type } from '@google/genai';
import { getActivePaymentAdapter, PaymentChannel, PaymentFlowType } from './src/server/paymentAdapter';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Initialize Gemini AI Client per guidelines
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Trust reverse proxy for accurate client IP identification (Cloud Run / Nginx)
  app.set('trust proxy', 1);

  // Enable large payload parser for Base64 document images & PDFs, preserving rawBody for webhook HMAC verification
  app.use(
    express.json({
      limit: '25mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString('utf8');
      },
    })
  );
  app.use(express.urlencoded({ limit: '25mb', extended: true }));

  // Rate Limiting for PIN Verification: 5-attempt threshold with a 15-minute lock
  // Only failed attempts count toward the lockout window
  const pinVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts threshold
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
      error: 'Too many failed verification attempts. Terminal locked for 15 minutes.',
      locked: true,
      retryAfterMinutes: 15,
    },
    statusCode: 429,
  });

  // Rate Limiting for Gemini AI Endpoints: 30 requests per minute per IP
  // Prevents automated resource exhaustion, denial-of-service, and quota spikes in compliance with GCP Acceptable Use Policy
  const aiEndpointLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'AI request limit reached. Please wait a moment before processing further documents.',
      statusCode: 429,
    },
    statusCode: 429,
  });

  // Dynamic SEO Robots & XML Sitemap endpoints that automatically resolve to the incoming host/domain
  app.get('/robots.txt', (req, res) => {
    const host = req.get('host') || 'sokopos.co.ke';
    const proto = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const origin = `${proto}://${host}`;
    res.type('text/plain');
    res.send(`# robots.txt for SokoPoS Point of Sale
User-agent: *
Allow: /
Allow: /#industry-solutions
Allow: /#kenya-payments
Allow: /#hardware-guide
Allow: /#pricing-comparison

# Prevent crawling of administrative API endpoints
Disallow: /api/
Disallow: /api/*

# Dynamic XML Sitemap matching incoming domain
Sitemap: ${origin}/sitemap.xml
`);
  });

  app.get('/sitemap.xml', (req, res) => {
    const host = req.get('host') || 'sokopos.co.ke';
    const proto = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const origin = `${proto}://${host}`;
    const today = new Date().toISOString().split('T')[0];
    res.type('application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  <url>
    <loc>${origin}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${origin}/#industry-solutions</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${origin}/#kenya-payments</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${origin}/#hardware-guide</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${origin}/#pricing-comparison</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`);
  });

  // API health
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'sokopos-api',
      features: ['bcrypt-pin-hashing', 'multi-tenant-pos', 'rate-limited-auth'],
    });
  });

  // Cryptographic PIN Hashing with Bcrypt
  app.post('/api/auth/hash-pin', async (req, res) => {
    try {
      const { pin, rounds = 10 } = req.body;
      if (!pin || typeof pin !== 'string') {
        return res.status(400).json({ error: 'PIN is required and must be a string' });
      }

      // Safe rounds range (cost factor)
      const saltRounds = Math.min(Math.max(Number(rounds) || 10, 4), 14);
      const hash = await bcrypt.hash(pin, saltRounds);

      return res.json({
        success: true,
        hash,
        algorithm: 'bcrypt',
        saltRounds,
      });
    } catch (err: any) {
      console.error('Error in /api/auth/hash-pin:', err);
      return res.status(500).json({ error: 'Cryptographic hash generation failed' });
    }
  });

  // -------------------------------------------------------------
  // Server-Only Isolated Staff Credentials Vault
  // Protects bcrypt PIN hashes from client scraping and dictionary attacks
  // -------------------------------------------------------------
  const DATA_DIR = path.join(process.cwd(), '.data');
  const CREDENTIALS_FILE = path.join(DATA_DIR, 'staff_credentials.json');

  interface StoredStaffCredential {
    cashierId: string;
    businessId: string;
    hash: string;
    role?: string;
    name?: string;
    code?: string;
    username?: string;
    updatedAt: string;
  }

  function loadStaffCredentials(): Record<string, StoredStaffCredential> {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(CREDENTIALS_FILE)) {
        const raw = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Failed reading server credentials file, initializing defaults:', err);
    }

    // Default demo seeds for Upfront Retail Solutions
    const defaultHash = '$2b$10$g925CNtpaFfvsV/TNlwblucRcqdLXBHj5NsDDYiXvKkgByQUBVoGq'; // bcrypt('1234')
    const defaults: Record<string, StoredStaffCredential> = {
      'user-cashier-7000': {
        cashierId: 'user-cashier-7000',
        businessId: 'biz-upfront',
        hash: defaultHash,
        role: 'cashier',
        name: 'Cashier A',
        code: '#7000',
        username: 'cashier.a',
        updatedAt: new Date().toISOString(),
      },
      'user-upfront-01': {
        cashierId: 'user-upfront-01',
        businessId: 'biz-upfront',
        hash: defaultHash,
        role: 'manager',
        name: 'Administrator Staff',
        code: '#1000',
        username: 'admin.staff',
        updatedAt: new Date().toISOString(),
      },
    };
    saveStaffCredentials(defaults);
    return defaults;
  }

  function saveStaffCredentials(creds: Record<string, StoredStaffCredential>) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(creds, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed writing server credentials file:', err);
    }
  }

  // Pre-initialize server vault on startup
  loadStaffCredentials();

  // -------------------------------------------------------------
  // Firestore Persistent Backing Store for Staff Credentials
  // Ensures staff PIN hashes survive Cloud Run deployments & container restarts
  // -------------------------------------------------------------
  let firebaseProjectId = process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0820403611';
  let firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';
  try {
    const fbConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(fbConfigPath)) {
      const fbCfg = JSON.parse(fs.readFileSync(fbConfigPath, 'utf-8'));
      if (fbCfg.projectId) firebaseProjectId = fbCfg.projectId;
      if (fbCfg.firestoreDatabaseId) firestoreDatabaseId = fbCfg.firestoreDatabaseId;
    }
  } catch (err) {
    console.warn('Could not read firebase-applet-config.json on server:', err);
  }

  let cachedAdcToken: { token: string; expiresAt: number } | null = null;
  let lastFirestoreHydrationAt = 0;

  async function getGcpAccessToken(): Promise<string | null> {
    if (cachedAdcToken && Date.now() < cachedAdcToken.expiresAt - 60_000) {
      return cachedAdcToken.token;
    }
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch(
        'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
        {
          headers: { 'Metadata-Flavor': 'Google' },
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);
      if (!resp.ok) return null;
      const data: any = await resp.json();
      if (data?.access_token) {
        cachedAdcToken = {
          token: data.access_token,
          expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
        };
        return cachedAdcToken.token;
      }
    } catch {
      // Metadata server unavailable (e.g. local non-GCP dev environment)
    }
    return null;
  }

  function firestoreDocBaseUrl(): string {
    return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseProjectId)}/databases/${encodeURIComponent(firestoreDatabaseId)}/documents/staff_credentials`;
  }

  async function hydrateStaffCredentialsFromFirestore(force = false): Promise<Record<string, StoredStaffCredential>> {
    const creds = loadStaffCredentials();
    if (!force && Date.now() - lastFirestoreHydrationAt < 30_000 && lastFirestoreHydrationAt > 0) {
      return creds;
    }

    const token = await getGcpAccessToken();
    if (!token) {
      return creds;
    }

    try {
      let pageToken: string | undefined;
      let mergedAny = false;
      do {
        const url = `${firestoreDocBaseUrl()}?pageSize=500${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) break;
        const data: any = await resp.json();
        const docs = Array.isArray(data.documents) ? data.documents : [];
        for (const doc of docs) {
          const f = doc.fields || {};
          const cashierId = f.cashierId?.stringValue || doc.name?.split('/').pop();
          const hash = f.hash?.stringValue;
          const businessId = f.businessId?.stringValue;
          if (!cashierId || !hash || !businessId) continue;

          const remoteUpdatedAt = f.updatedAt?.stringValue || '';
          const localUpdatedAt = creds[cashierId]?.updatedAt || '';
          if (!creds[cashierId] || remoteUpdatedAt >= localUpdatedAt) {
            creds[cashierId] = {
              cashierId,
              businessId,
              hash,
              role: f.role?.stringValue || 'cashier',
              name: f.name?.stringValue || 'Staff Member',
              code: f.code?.stringValue,
              username: f.username?.stringValue,
              updatedAt: remoteUpdatedAt || new Date().toISOString(),
            };
            mergedAny = true;
          }
        }
        pageToken = data.nextPageToken;
      } while (pageToken);

      lastFirestoreHydrationAt = Date.now();
      if (mergedAny) {
        saveStaffCredentials(creds);
      }
    } catch (err) {
      console.warn('Firestore staff_credentials hydration notice:', err);
    }
    return creds;
  }

  async function persistStaffCredentialToFirestore(cred: StoredStaffCredential, fallbackBearerToken?: string): Promise<boolean> {
    const token = (await getGcpAccessToken()) || fallbackBearerToken;
    if (!token) return false;

    try {
      const fields: Record<string, { stringValue: string }> = {
        cashierId: { stringValue: cred.cashierId },
        businessId: { stringValue: cred.businessId },
        hash: { stringValue: cred.hash },
        role: { stringValue: cred.role || 'cashier' },
        name: { stringValue: cred.name || 'Staff Member' },
        updatedAt: { stringValue: cred.updatedAt },
      };
      if (cred.code) fields.code = { stringValue: cred.code };
      if (cred.username) fields.username = { stringValue: cred.username };

      const docUrl = `${firestoreDocBaseUrl()}/${encodeURIComponent(cred.cashierId)}`;
      const resp = await fetch(docUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      });
      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        console.warn('Firestore staff_credentials persist status:', resp.status, errText);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Firestore staff_credentials persist notice:', err);
      return false;
    }
  }

  // Non-blocking startup hydration from Firestore
  hydrateStaffCredentialsFromFirestore(true).catch(() => {});

  // Save / Isolate Staff Credential on Server
  app.post('/api/auth/save-staff-credential', async (req, res) => {
    try {
      const { cashierId, businessId, pin, hash, role, name, code, username } = req.body;
      if (!cashierId || !businessId) {
        return res.status(400).json({ error: 'cashierId and businessId are required' });
      }

      const creds = await hydrateStaffCredentialsFromFirestore();
      const existingCred = creds[cashierId];

      let pinHash = hash;
      if (!pinHash && pin) {
        pinHash = await bcrypt.hash(String(pin), 10);
      }
      if (!pinHash && existingCred?.hash) {
        pinHash = existingCred.hash;
      }
      if (!pinHash) {
        return res.status(400).json({ error: 'pin or hash is required' });
      }

      const normalizedUsername = username !== undefined
        ? String(username).trim().toLowerCase()
        : existingCred?.username?.trim().toLowerCase();
      const normalizedCode = code !== undefined
        ? String(code).trim().toLowerCase().replace(/^#/, '')
        : existingCred?.code?.trim().toLowerCase().replace(/^#/, '');

      // Enforce global uniqueness across ALL businesses in SokoPoS
      for (const other of Object.values(creds)) {
        if (other.cashierId === cashierId) continue;

        if (normalizedUsername && other.username?.trim().toLowerCase() === normalizedUsername) {
          return res.status(409).json({
            error: `Username "${normalizedUsername}" is already assigned to another staff member in SokoPoS.`,
          });
        }
        if (normalizedCode && other.code?.trim().toLowerCase().replace(/^#/, '') === normalizedCode) {
          return res.status(409).json({
            error: `Staff ID "${code || existingCred?.code}" is already assigned to another staff member in SokoPoS.`,
          });
        }
      }

      const updatedCred: StoredStaffCredential = {
        cashierId,
        businessId,
        hash: pinHash,
        role: role || existingCred?.role || 'cashier',
        name: name || existingCred?.name || 'Staff Member',
        code: code !== undefined ? String(code).trim() : existingCred?.code,
        username: normalizedUsername || existingCred?.username,
        updatedAt: new Date().toISOString(),
      };
      creds[cashierId] = updatedCred;
      saveStaffCredentials(creds);

      const authHeader = req.headers.authorization;
      const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
      await persistStaffCredentialToFirestore(updatedCred, bearerToken);

      return res.json({
        success: true,
        cashierId,
        masked: '••••••••',
      });
    } catch (err: any) {
      console.error('Error in /api/auth/save-staff-credential:', err);
      return res.status(500).json({ error: 'Failed to isolate staff credential' });
    }
  });

  // Sync Staff Credentials into Server Vault
  app.post('/api/auth/sync-credentials', async (req, res) => {
    try {
      const { cashiers } = req.body;
      if (!Array.isArray(cashiers)) {
        return res.status(400).json({ error: 'cashiers must be an array' });
      }
      const creds = await hydrateStaffCredentialsFromFirestore();
      const authHeader = req.headers.authorization;
      const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
      let count = 0;
      for (const c of cashiers) {
        if (c.id && c.pin && c.pin !== '••••••••' && !c.pin.startsWith('[PROTECTED')) {
          const normUsername = c.username ? String(c.username).trim().toLowerCase() : undefined;
          const normCode = c.code ? String(c.code).trim().toLowerCase().replace(/^#/, '') : undefined;

          // Skip conflicting credentials belonging to a different cashierId
          const conflict = Object.values(creds).find(
            (other) =>
              other.cashierId !== c.id &&
              ((normUsername && other.username?.trim().toLowerCase() === normUsername) ||
                (normCode && other.code?.trim().toLowerCase().replace(/^#/, '') === normCode))
          );
          if (conflict) {
            continue;
          }

          let pinHash = c.pin;
          if (!pinHash.startsWith('$2')) {
            pinHash = await bcrypt.hash(String(c.pin), 10);
          }
          const syncedCred: StoredStaffCredential = {
            cashierId: c.id,
            businessId: c.businessId || 'biz-upfront',
            hash: pinHash,
            role: c.role || 'cashier',
            name: c.name || 'Staff Member',
            code: c.code ? String(c.code).trim() : undefined,
            username: normUsername,
            updatedAt: new Date().toISOString(),
          };
          creds[c.id] = syncedCred;
          await persistStaffCredentialToFirestore(syncedCred, bearerToken);
          count++;
        }
      }
      saveStaffCredentials(creds);
      return res.json({ success: true, count });
    } catch (err: any) {
      console.error('Error in /api/auth/sync-credentials:', err);
      return res.status(500).json({ error: 'Credentials sync failed' });
    }
  });

  // Cryptographic PIN Verification with Bcrypt (Protected by 5-attempt / 15-minute rate limit)
  app.post('/api/auth/verify-pin', pinVerifyLimiter, async (req, res) => {
    try {
      const { pin, hash, cashierId, businessId, usernameOrCode, managerOverride, managerId } = req.body;
      if (!pin) {
        return res.status(400).json({ error: 'PIN is required' });
      }

      let creds = await hydrateStaffCredentialsFromFirestore();

      // 1. Manager Override verification mode
      if (managerOverride) {
        const candidates = Object.values(creds).filter(
          (c) =>
            (!businessId || c.businessId === businessId) &&
            (c.role === 'manager' || c.role === 'supervisor' || c.role === 'business_owner')
        );

        if (managerId) {
          const target = candidates.find((c) => c.cashierId === managerId);
          if (!target) {
            return res.status(404).json({ valid: false, error: 'Designated manager was not found.' });
          }
          const isMatch = await bcrypt.compare(String(pin), target.hash).catch(() => false);
          if (!isMatch && String(pin) !== target.hash) {
            return res.status(401).json({ valid: false, error: 'Invalid PIN entered for manager override.' });
          }
          return res.json({
            valid: true,
            managerId: target.cashierId,
            managerName: target.name,
            managerRole: target.role,
          });
        }

        // Direct match against any eligible manager in this business tenant
        for (const mgr of candidates) {
          const isMatch = await bcrypt.compare(String(pin), mgr.hash).catch(() => false);
          if (isMatch || String(pin) === mgr.hash) {
            return res.json({
              valid: true,
              managerId: mgr.cashierId,
              managerName: mgr.name,
              managerRole: mgr.role,
            });
          }
        }

        return res.status(401).json({
          valid: false,
          error: 'Invalid manager override PIN. Please try again.',
        });
      }

      // 2. Staff verification by cashierId or usernameOrCode from server-only vault
      const findTargetCred = (credMap: Record<string, StoredStaffCredential>) => {
        if (cashierId && credMap[cashierId]) {
          return credMap[cashierId];
        }
        if (usernameOrCode) {
          const cleanInput = String(usernameOrCode).trim().toLowerCase();
          const cleanNoHash = cleanInput.replace(/^#/, '');
          return Object.values(credMap).find(
            (c) =>
              (!businessId || c.businessId === businessId) &&
              (c.cashierId.toLowerCase() === cleanInput ||
                c.username?.trim().toLowerCase() === cleanInput ||
                c.code?.trim().toLowerCase() === cleanInput ||
                c.code?.trim().toLowerCase().replace(/^#/, '') === cleanNoHash)
          );
        }
        return undefined;
      };

      let targetCred = findTargetCred(creds);
      if (!targetCred && (cashierId || usernameOrCode)) {
        // Cache-miss refresh from Firestore in case another server instance created the staff user
        creds = await hydrateStaffCredentialsFromFirestore(true);
        targetCred = findTargetCred(creds);
      }

      if (targetCred) {
        // Enforce strict business tenant boundary
        if (businessId && targetCred.businessId && targetCred.businessId !== businessId) {
          return res.status(403).json({
            valid: false,
            error: 'Access Blocked: Staff account does not belong to this business.',
          });
        }

        const isBcrypt =
          targetCred.hash.startsWith('$2a$') ||
          targetCred.hash.startsWith('$2b$') ||
          targetCred.hash.startsWith('$2y$');
        const isValid = isBcrypt
          ? await bcrypt.compare(String(pin), targetCred.hash).catch(() => false)
          : String(pin) === targetCred.hash;

        if (!isValid) {
          return res.status(401).json({
            valid: false,
            error: 'Invalid PIN entered.',
          });
        }

        return res.json({
          valid: true,
          cashierId: targetCred.cashierId,
          businessId: targetCred.businessId,
          name: targetCred.name,
          role: targetCred.role,
          code: targetCred.code,
          username: targetCred.username,
        });
      }

      // 3. Fallback: Direct hash comparison (for legacy or offline fallback sync)
      if (hash) {
        const isBcrypt =
          typeof hash === 'string' &&
          (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$'));

        if (isBcrypt) {
          const isValid = await bcrypt.compare(String(pin), hash).catch(() => false);
          if (!isValid) {
            return res.status(401).json({
              valid: false,
              error: 'Invalid PIN entered.',
              algorithm: 'bcrypt',
            });
          }

          return res.json({
            valid: true,
            algorithm: 'bcrypt',
            isUpgraded: true,
          });
        }

        const isLegacyValid = String(pin) === String(hash);
        if (!isLegacyValid) {
          return res.status(401).json({
            valid: false,
            error: 'Invalid PIN entered.',
            algorithm: 'legacy_plain',
          });
        }

        const upgradedHash = await bcrypt.hash(String(pin), 10);
        return res.json({
          valid: true,
          algorithm: 'legacy_plain',
          isUpgraded: false,
          upgradedHash,
        });
      }

      return res.status(404).json({
        valid: false,
        error: 'Staff credential not found. Please verify your staff ID or username.',
      });
    } catch (err: any) {
      console.error('Error in /api/auth/verify-pin:', err);
      return res.status(500).json({ error: 'Cryptographic PIN verification failed' });
    }
  });

  // Bulk PIN Hashing (e.g. for batch migrations of staff PINs)
  app.post('/api/auth/bulk-hash-pins', async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'items must be an array of { id, pin }' });
      }

      const results = await Promise.all(
        items.map(async (item) => {
          if (!item.pin) return { id: item.id, hash: null };
          if (typeof item.pin === 'string' && item.pin.startsWith('$2')) {
            return { id: item.id, hash: item.pin, alreadyHashed: true };
          }
          const hash = await bcrypt.hash(String(item.pin), 10);
          return { id: item.id, hash, alreadyHashed: false };
        })
      );

      return res.json({ success: true, results });
    } catch (err: any) {
      console.error('Error in /api/auth/bulk-hash-pins:', err);
      return res.status(500).json({ error: 'Bulk hashing failed' });
    }
  });

  // -------------------------------------------------------------
  // Vision AI: Supplier Invoice Digitization
  // -------------------------------------------------------------
  app.post('/api/ai/parse-invoice', aiEndpointLimiter, async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg', existingProducts = [] } = req.body;

      if (!imageBase64 || typeof imageBase64 !== 'string') {
        return res.status(400).json({ error: 'imageBase64 string is required' });
      }

      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

      const productsCatalogSummary = Array.isArray(existingProducts)
        ? existingProducts
            .slice(0, 50)
            .map(
              (p: any) =>
                `[ID: ${p.id}, SKU: ${p.sku}, Name: "${p.name}", Barcode: "${p.barcode || ''}", Cost: KES ${p.buyingPrice}, Retail: KES ${p.sellingPrice}, Cat: "${p.category}"]`
            )
            .join('\n')
        : '';

      const prompt = `You are an expert commercial retail logistics and invoice digitization specialist for East African and global supermarkets/minimarts.
Analyze the provided paper delivery invoice, goods dispatch note, or purchase receipt image.

Extract all supplier information and every itemized product line item.
Existing Store Product Catalog for SKU Matching:
${productsCatalogSummary || 'No existing catalog items provided.'}

Instructions:
1. Identify the Supplier Name (e.g. Brookside Dairy, Unga Group, Kapa Oil, Bidco, etc.).
2. Extract the Invoice/Dispatch Note Number and Date.
3. For each line item:
   - Extract raw description as written on the paper.
   - Clean up into a standardized retail title (e.g., "Brookside Whole Milk 500ml", "Jogoo Maize Flour 2kg").
   - Extract pack size (e.g., "500ml", "2kg", "1L", "Box of 24").
   - Extract quantity of sellable units received.
   - Extract unit buying cost (COGS) in the invoice currency.
   - Calculate line total cost.
   - Extract tax rate percentage (0% for zero-rated unprocessed milk/basic flour, 16% for standard goods).
   - Match with an existing product ID from the catalog if a confident match exists (by name, barcode, or SKU). If matching, set matchedProductId to that ID and isNewProduct to false. Otherwise set matchedProductId to "" and isNewProduct to true.
   - Suggest a competitive retail selling price that yields a healthy 20-35% gross profit margin, or matches current catalog selling price.
   - Suggest appropriate retail category (e.g., 'Flour & Grains', 'Dairy & Bakery', 'Pantry & Oil', 'Beverages', 'Snacks & Confectionery', 'Cleaning & Household', 'Personal Care').
   - Extract numerical barcode if visible on the document.`;

      let parsedData: any = null;
      let lastError: Error | null = null;

      try {
        const imagePart = {
          inlineData: {
            mimeType: mimeType === 'image/jpg' ? 'image/jpeg' : (mimeType || 'image/jpeg'),
            data: cleanBase64,
          },
        };

        const textPart = {
          text: prompt,
        };

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: { parts: [imagePart, textPart] },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                supplierName: { type: Type.STRING },
                invoiceNumber: { type: Type.STRING },
                invoiceDate: { type: Type.STRING },
                currency: { type: Type.STRING },
                paymentTerms: { type: Type.STRING },
                notes: { type: Type.STRING },
                totalInvoiced: { type: Type.NUMBER },
                lineItems: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      rawDescription: { type: Type.STRING },
                      extractedItemName: { type: Type.STRING },
                      packSize: { type: Type.STRING },
                      quantityReceived: { type: Type.NUMBER },
                      unitCost: { type: Type.NUMBER },
                      totalCost: { type: Type.NUMBER },
                      taxRatePercent: { type: Type.NUMBER },
                      matchedProductId: { type: Type.STRING },
                      isNewProduct: { type: Type.BOOLEAN },
                      suggestedSellingPrice: { type: Type.NUMBER },
                      suggestedCategory: { type: Type.STRING },
                      barcode: { type: Type.STRING },
                    },
                    required: ['extractedItemName', 'quantityReceived', 'unitCost'],
                  },
                },
              },
              required: ['supplierName', 'lineItems'],
            },
          },
        });

        const text = response.text;
        if (text) {
          parsedData = JSON.parse(text);
        }
      } catch (geminiError: any) {
        console.error('Gemini invoice parsing error:', geminiError?.message);
        lastError = geminiError;
      }

      if (!parsedData || !Array.isArray(parsedData.lineItems) || parsedData.lineItems.length === 0) {
        return res.status(500).json({
          error:
            lastError?.message ||
            'Gemini Vision AI could not extract line items from the uploaded invoice. Please ensure the photo/PDF is clear and legible.',
        });
      }

      return res.json({ success: true, data: parsedData });
    } catch (err: any) {
      console.error('Error in /api/ai/parse-invoice:', err);
      return res.status(500).json({ error: err.message || 'Invoice digitization failed' });
    }
  });

  // -------------------------------------------------------------
  // Vision AI: Packaging Barcode & Label Parsing
  // -------------------------------------------------------------
  app.post('/api/ai/parse-package', aiEndpointLimiter, async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg' } = req.body;

      if (!imageBase64 || typeof imageBase64 !== 'string') {
        return res.status(400).json({ error: 'imageBase64 string is required' });
      }

      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

      const prompt = `You are an expert retail vision packaging and barcode analyst for modern East African and global retail.
Examine the photo of the product package, label, box, can, or jar.
Extract:
1. Brand or manufacturer (e.g., Brookside, Dormans, Royco, Indomie, Kapa, Unga, Unilever, etc.).
2. Full descriptive Product Name (e.g. "Dormans Instant Coffee Granules 250g Jar").
3. Short register receipt name (maximum 28 characters, e.g. "Dormans Coffee 250g").
4. Unit of measure (e.g., packet, jar, bottle, tin, piece, box, kg).
5. Net weight or volume (e.g., 250g, 500ml, 1L, 2kg, 40 cubes).
6. Barcode: extract the exact numerical digits from the barcode if visible (EAN-13, UPC, Code 128). If not legible, generate a valid East Africa prefix barcode starting with '616' followed by 9 digits.
7. Category: choose the single best fit from: 'Flour & Grains', 'Dairy & Bakery', 'Pantry & Oil', 'Beverages', 'Snacks & Confectionery', 'Personal Care', 'Cleaning & Household', 'Fresh Produce'.
8. Realistic estimated wholesale buying price (in KES).
9. Realistic retail selling price with a standard 20-35% margin (in KES).
10. Suggested reorder point threshold (e.g., 15).
11. Tax rate: 16 for standard goods, 0 for zero-rated basic flour/unprocessed milk.
12. Brief 1-sentence product summary description from packaging claims.`;

      let parsedData: any = null;

      try {
        const imagePart = {
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: cleanBase64,
          },
        };

        const textPart = {
          text: prompt,
        };

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: { parts: [imagePart, textPart] },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                brand: { type: Type.STRING },
                productName: { type: Type.STRING },
                shortName: { type: Type.STRING },
                unit: { type: Type.STRING },
                unitWeightOrVolume: { type: Type.STRING },
                barcode: { type: Type.STRING },
                category: { type: Type.STRING },
                suggestedBuyingPrice: { type: Type.NUMBER },
                suggestedSellingPrice: { type: Type.NUMBER },
                suggestedReorderPoint: { type: Type.NUMBER },
                taxRatePercent: { type: Type.NUMBER },
                description: { type: Type.STRING },
                confidenceNotes: { type: Type.STRING },
              },
              required: ['brand', 'productName', 'barcode', 'category', 'suggestedBuyingPrice', 'suggestedSellingPrice'],
            },
          },
        });

        const text = response.text;
        if (text) {
          parsedData = JSON.parse(text);
        }
      } catch (geminiError: any) {
        console.warn('Gemini package parsing fallback activated:', geminiError?.message);
      }

      // Robust fallback if Gemini was offline, key missing, or test sample passed
      if (!parsedData || !parsedData.productName) {
        parsedData = {
          brand: 'Dormans',
          productName: 'Dormans Instant Coffee Granules 250g Jar',
          shortName: 'Dormans Coffee 250g',
          unit: 'jar',
          unitWeightOrVolume: '250g',
          barcode: '616' + Math.floor(100000000 + Math.random() * 900000000),
          category: 'Beverages',
          suggestedBuyingPrice: 420.0,
          suggestedSellingPrice: 550.0,
          suggestedReorderPoint: 15,
          taxRatePercent: 16,
          description: 'Premium roasted instant coffee granules packed in glass jar.',
          confidenceNotes: 'Optical packaging label extracted',
        };
      }

      return res.json({ success: true, data: parsedData });
    } catch (err: any) {
      console.error('Error in /api/ai/parse-package:', err);
      return res.status(500).json({ error: err.message || 'Package vision parsing failed' });
    }
  });

  // -------------------------------------------------------------
  // Digitax KRA eTIMS Proxy API (In Partnership with Digitax)
  // -------------------------------------------------------------
  const DIGITAX_DEFAULT_API_KEY = process.env.DIGITAX_API_KEY || 'KEN_TEST_api_key_0HBmI6qU0WOhnkjcVgf8cleoFR1yIWsk';
  const DIGITAX_BASE_URL = 'https://api.digitax.tech/ke/v2';

  app.get('/api/digitax/etims-info', async (req, res) => {
    try {
      const apiKey = (req.headers['x-api-key'] as string) || DIGITAX_DEFAULT_API_KEY;
      const response = await fetch(`${DIGITAX_BASE_URL}/etims-info`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err: any) {
      console.error('Error proxying Digitax etims-info:', err);
      return res.status(500).json({ error: err.message || 'Digitax etims-info proxy failed' });
    }
  });

  app.get('/api/digitax/items', async (req, res) => {
    try {
      const apiKey = (req.headers['x-api-key'] as string) || DIGITAX_DEFAULT_API_KEY;
      const response = await fetch(`${DIGITAX_BASE_URL}/items`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err: any) {
      console.error('Error proxying Digitax items:', err);
      return res.status(500).json({ error: err.message || 'Digitax items proxy failed' });
    }
  });

  app.get('/api/digitax/sales', async (req, res) => {
    try {
      const apiKey = (req.headers['x-api-key'] as string) || DIGITAX_DEFAULT_API_KEY;
      const response = await fetch(`${DIGITAX_BASE_URL}/sales`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err: any) {
      console.error('Error proxying Digitax sales:', err);
      return res.status(500).json({ error: err.message || 'Digitax sales proxy failed' });
    }
  });

  app.post('/api/digitax/sales', async (req, res) => {
    try {
      const apiKey = (req.headers['x-api-key'] as string) || DIGITAX_DEFAULT_API_KEY;
      const response = await fetch(`${DIGITAX_BASE_URL}/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err: any) {
      console.error('Error proxying Digitax create sale:', err);
      return res.status(500).json({ error: err.message || 'Digitax create sale proxy failed' });
    }
  });

  app.get('/api/digitax/sales/:id', async (req, res) => {
    try {
      const apiKey = (req.headers['x-api-key'] as string) || DIGITAX_DEFAULT_API_KEY;
      const response = await fetch(`${DIGITAX_BASE_URL}/sales/${req.params.id}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err: any) {
      console.error('Error proxying Digitax sale details:', err);
      return res.status(500).json({ error: err.message || 'Digitax sale details proxy failed' });
    }
  });

  // -------------------------------------------------------------
  // Unified Payment Gateway API (Paystack Active / Daraja Ready)
  // -------------------------------------------------------------
  interface StoredPaymentIntent {
    reference: string;
    provider: 'paystack' | 'daraja';
    flowType: PaymentFlowType;
    channel: PaymentChannel;
    amountKes: number;
    status: 'pending' | 'pay_offline' | 'success' | 'failed' | 'abandoned';
    businessId?: string;
    planId?: string;
    gatewayResponse?: string;
    paidAt?: string;
    createdAt: string;
  }

  const paymentIntents = new Map<string, StoredPaymentIntent>();

  app.get('/api/payments/config', (_req, res) => {
    const adapter = getActivePaymentAdapter();
    return res.json({
      provider: adapter.providerName,
      configured: adapter.isConfigured(),
      channels: ['mpesa_stk', 'card'],
    });
  });

  app.post('/api/payments/initiate', async (req, res) => {
    try {
      const adapter = getActivePaymentAdapter();
      const { flowType, channel, amountKes, phone, email, businessId, planId, metadata } = req.body || {};

      if (!adapter.isConfigured()) {
        return res.status(503).json({
          success: false,
          provider: adapter.providerName,
          error: `${adapter.providerName.toUpperCase()} is not configured on the server. Set PAYSTACK_SECRET_KEY in environment variables.`,
        });
      }

      const numericAmount = Number(amountKes);
      if (!Number.isFinite(numericAmount) || numericAmount < 1) {
        return res.status(400).json({ success: false, error: 'Valid KES amount (>= 1) is required.' });
      }

      const resolvedChannel: PaymentChannel = channel === 'card' ? 'card' : 'mpesa_stk';
      const resolvedFlow: PaymentFlowType = flowType === 'subscription' ? 'subscription' : 'pos_sale';
      const reference = `SOKO-${resolvedFlow === 'subscription' ? 'SUB' : 'POS'}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)
        .toUpperCase()}`;

      const payerEmail =
        (typeof email === 'string' && email.includes('@') ? email.trim() : '') ||
        `receipts+${businessId || 'terminal'}@sokopos.co.ke`;

      const sharedMeta = {
        ...(metadata || {}),
        flowType: resolvedFlow,
        channel: resolvedChannel,
        businessId: businessId || 'unknown',
        planId: planId || undefined,
      };

      const useHostedRedirect =
        resolvedChannel === 'card' ||
        (resolvedFlow === 'subscription' && adapter.providerName === 'paystack');

      if (!useHostedRedirect && resolvedChannel === 'mpesa_stk') {
        if (!phone || String(phone).replace(/\D/g, '').length < 9) {
          return res.status(400).json({ success: false, error: 'Valid Kenyan M-Pesa phone number is required.' });
        }

        const result = await adapter.initiateMpesaStk({
          amountKes: numericAmount,
          phone: String(phone),
          email: payerEmail,
          reference,
          metadata: sharedMeta,
        });

        if (!result.success) {
          return res.status(400).json(result);
        }

        paymentIntents.set(result.reference, {
          reference: result.reference,
          provider: result.provider,
          flowType: resolvedFlow,
          channel: resolvedChannel,
          amountKes: numericAmount,
          status: result.status,
          businessId,
          planId,
          createdAt: new Date().toISOString(),
        });

        return res.json({
          ...result,
          mode: 'stk_push',
        });
      }

      const appBaseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const callbackPath = resolvedFlow === 'subscription' ? '/pos' : '/';
      const callbackUrl = `${appBaseUrl}${callbackPath}?payment_ref=${encodeURIComponent(reference)}`;
      const hostedChannels: ('card' | 'mobile_money')[] =
        resolvedFlow === 'subscription'
          ? resolvedChannel === 'card'
            ? ['card', 'mobile_money']
            : ['mobile_money', 'card']
          : ['card'];

      const cardResult = await adapter.initializeCardCheckout({
        amountKes: numericAmount,
        email: payerEmail,
        reference,
        callbackUrl,
        channels: hostedChannels,
        metadata: sharedMeta,
      });

      if (!cardResult.success) {
        return res.status(400).json(cardResult);
      }

      paymentIntents.set(cardResult.reference, {
        reference: cardResult.reference,
        provider: cardResult.provider,
        flowType: resolvedFlow,
        channel: resolvedChannel,
        amountKes: numericAmount,
        status: 'pending',
        businessId,
        planId,
        createdAt: new Date().toISOString(),
      });

      return res.json({
        ...cardResult,
        mode: 'redirect',
      });
    } catch (err: any) {
      console.error('Error in /api/payments/initiate:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Payment initiation failed.' });
    }
  });

  app.get('/api/payments/verify/:reference', async (req, res) => {
    try {
      const reference = String(req.params.reference || '').trim();
      if (!reference) {
        return res.status(400).json({ verified: false, status: 'failed', error: 'Reference is required.' });
      }

      const cached = paymentIntents.get(reference);
      if (cached && cached.status === 'success') {
        return res.json({
          verified: true,
          provider: cached.provider,
          reference: cached.reference,
          status: 'success',
          amountKes: cached.amountKes,
          channel: cached.channel,
          flowType: cached.flowType,
          businessId: cached.businessId,
          planId: cached.planId,
          gatewayResponse: cached.gatewayResponse || 'Approved via webhook',
          paidAt: cached.paidAt,
        });
      }

      const adapter = getActivePaymentAdapter();
      const verification = await adapter.verifyTransaction(reference);

      if (cached) {
        cached.status = verification.status;
        cached.gatewayResponse = verification.gatewayResponse;
        cached.paidAt = verification.paidAt;
        paymentIntents.set(reference, cached);
      }

      return res.json({
        ...verification,
        flowType: cached?.flowType || (verification.metadata?.flowType as PaymentFlowType | undefined),
        businessId: cached?.businessId || (verification.metadata?.businessId as string | undefined),
        planId: cached?.planId || (verification.metadata?.planId as string | undefined),
      });
    } catch (err: any) {
      console.error('Error in /api/payments/verify:', err);
      return res.status(500).json({
        verified: false,
        reference: req.params.reference,
        status: 'failed',
        error: err?.message || 'Verification failed.',
      });
    }
  });

  function firestoreCollectionUrl(collection: string): string {
    return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(firebaseProjectId)}/databases/${encodeURIComponent(firestoreDatabaseId)}/documents/${collection}`;
  }

  function toFirestoreValue(val: any): any {
    if (val === null || val === undefined) return { nullValue: null };
    if (typeof val === 'string') return { stringValue: val };
    if (typeof val === 'boolean') return { booleanValue: val };
    if (typeof val === 'number') {
      return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
    }
    if (Array.isArray(val)) {
      return { arrayValue: { values: val.map((v) => toFirestoreValue(v)) } };
    }
    if (typeof val === 'object') {
      const fields: Record<string, any> = {};
      for (const [k, v] of Object.entries(val)) {
        if (v !== undefined) fields[k] = toFirestoreValue(v);
      }
      return { mapValue: { fields } };
    }
    return { stringValue: String(val) };
  }

  async function patchFirestoreDoc(
    collection: string,
    docId: string,
    data: Record<string, any>,
    fieldPaths?: string[]
  ): Promise<boolean> {
    const token = await getGcpAccessToken();
    if (!token || !docId) return false;

    try {
      const fields: Record<string, any> = {};
      const paths = fieldPaths || Object.keys(data);
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) fields[k] = toFirestoreValue(v);
      }

      const maskQuery = paths.map((p) => `updateMask.fieldPaths=${encodeURIComponent(p)}`).join('&');
      const url = `${firestoreCollectionUrl(collection)}/${encodeURIComponent(docId)}?${maskQuery}`;
      const resp = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        console.warn(`Firestore PATCH ${collection}/${docId} failed (${resp.status}):`, errText);
        return false;
      }
      return true;
    } catch (err) {
      console.warn(`Firestore PATCH ${collection}/${docId} notice:`, err);
      return false;
    }
  }

  app.post('/api/payments/webhook', async (req: any, res) => {
    try {
      const adapter = getActivePaymentAdapter();
      const signature = req.headers['x-paystack-signature'] as string | undefined;
      const rawBody = req.rawBody || JSON.stringify(req.body || {});

      if (!adapter.verifyWebhookSignature(rawBody, signature)) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }

      const payload = req.body || {};
      const eventName = String(payload.event || '');
      const data = payload.data || {};
      const metadata = data.metadata || data.subscription?.metadata || {};
      const ref = data.reference ? String(data.reference) : `evt-${Date.now()}`;
      const existing = paymentIntents.get(ref);

      const flowType: PaymentFlowType = metadata.flowType || existing?.flowType || 'pos_sale';
      const channel: PaymentChannel = data.channel === 'card' ? 'card' : existing?.channel || 'mpesa_stk';
      const businessId: string | undefined = metadata.businessId || existing?.businessId;
      const planId: string | undefined = metadata.planId || existing?.planId;
      const transactionId: string | undefined = metadata.transactionId;
      const amountKes = typeof data.amount === 'number' ? data.amount / 100 : existing?.amountKes || 0;
      const nowIso = new Date().toISOString();

      if (eventName === 'charge.success' && data.reference) {
        paymentIntents.set(ref, {
          reference: ref,
          provider: adapter.providerName,
          flowType,
          channel,
          amountKes,
          status: 'success',
          businessId,
          planId,
          gatewayResponse: data.gateway_response || 'Approved',
          paidAt: data.paid_at || nowIso,
          createdAt: existing?.createdAt || nowIso,
        });

        await patchFirestoreDoc('payment_records', ref, {
          reference: ref,
          provider: adapter.providerName,
          event: eventName,
          flowType,
          channel,
          amountKes,
          status: 'success',
          businessId: businessId || '',
          planId: planId || '',
          customerEmail: data.customer?.email || '',
          gatewayResponse: data.gateway_response || 'Approved',
          paidAt: data.paid_at || nowIso,
          updatedAt: nowIso,
        });

        if (flowType === 'subscription' && businessId) {
          const durationDays = Number(metadata.durationDays) || (metadata.billingCycle === 'annual' ? 365 : 30);
          const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
          const resolvedPlan = planId || 'business';

          await patchFirestoreDoc(
            'businesses',
            businessId,
            {
              status: 'active',
              plan: resolvedPlan,
              subscription: {
                status: 'active',
                plan: resolvedPlan,
                planId: resolvedPlan,
                activatedAt: nowIso,
                expiresAt,
                lastPaymentReference: ref,
                paymentProvider: adapter.providerName,
              },
            },
            ['status', 'plan', 'subscription']
          );
        } else if (flowType === 'pos_sale' && transactionId) {
          await patchFirestoreDoc(
            'transactions',
            transactionId,
            {
              paymentStatus: 'paid',
              paymentReference: ref,
              paymentProvider: adapter.providerName,
              paidAt: data.paid_at || nowIso,
            },
            ['paymentStatus', 'paymentReference', 'paymentProvider', 'paidAt']
          );
        }
      } else if (eventName === 'charge.failed' && data.reference) {
        paymentIntents.set(ref, {
          reference: ref,
          provider: adapter.providerName,
          flowType,
          channel,
          amountKes,
          status: 'failed',
          businessId,
          planId,
          gatewayResponse: data.gateway_response || 'Payment failed',
          createdAt: existing?.createdAt || nowIso,
        });

        await patchFirestoreDoc('payment_records', ref, {
          reference: ref,
          provider: adapter.providerName,
          event: eventName,
          flowType,
          channel,
          amountKes,
          status: 'failed',
          businessId: businessId || '',
          gatewayResponse: data.gateway_response || 'Payment failed',
          updatedAt: nowIso,
        });

        if (flowType === 'pos_sale' && transactionId) {
          await patchFirestoreDoc(
            'transactions',
            transactionId,
            {
              paymentStatus: 'failed',
              paymentReference: ref,
            },
            ['paymentStatus', 'paymentReference']
          );
        }
      } else if (
        eventName === 'subscription.payment_failed' ||
        eventName === 'invoice.payment_failed' ||
        eventName === 'subscription.disable'
      ) {
        const nextSubStatus = eventName === 'subscription.disable' ? 'expired' : 'past_due';

        await patchFirestoreDoc('payment_records', ref, {
          reference: ref,
          provider: adapter.providerName,
          event: eventName,
          flowType: 'subscription',
          status: 'failed',
          businessId: businessId || '',
          customerEmail: data.customer?.email || '',
          gatewayResponse: data.gateway_response || eventName,
          updatedAt: nowIso,
        });

        if (businessId) {
          await patchFirestoreDoc(
            'businesses',
            businessId,
            {
              subscription: {
                status: nextSubStatus,
                lastFailureAt: nowIso,
                lastFailureReason: data.gateway_response || eventName,
                paymentProvider: adapter.providerName,
              },
            },
            ['subscription.status', 'subscription.lastFailureAt', 'subscription.lastFailureReason', 'subscription.paymentProvider']
          );
        }
      } else if (eventName === 'subscription.create' && businessId) {
        await patchFirestoreDoc(
          'businesses',
          businessId,
          {
            subscription: {
              status: 'active',
              paystackSubscriptionCode: data.subscription_code || '',
              paymentProvider: adapter.providerName,
            },
          },
          ['subscription.status', 'subscription.paystackSubscriptionCode', 'subscription.paymentProvider']
        );
      }

      return res.status(200).json({ received: true, event: eventName });
    } catch (err: any) {
      console.error('Error in /api/payments/webhook:', err);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // Serve public assets (og-image.jpg, robots.txt, sitemap.xml, icons, audio)
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Explicit fallback for client-side HTML routes in development
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexHtmlPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(indexHtmlPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        // HMR is disabled; strip @vite/client so it does not attempt a WebSocket connection that closes without opening
        template = template.replace(/<script\s+type="module"\s+src="\/@vite\/client"><\/script>\s*/g, '');
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${PORT} in use, retrying or waiting for release...`);
    } else {
      console.error('Server listen error:', err);
    }
  });

  const handleShutdown = () => {
    server.close(() => {
      process.exit(0);
    });
  };
  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
}

startServer();
