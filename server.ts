import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust reverse proxy for accurate client IP identification (Cloud Run / Nginx)
  app.set('trust proxy', 1);

  app.use(express.json());

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

  // Cryptographic PIN Verification with Bcrypt (Protected by 5-attempt / 15-minute rate limit)
  app.post('/api/auth/verify-pin', pinVerifyLimiter, async (req, res) => {
    try {
      const { pin, hash } = req.body;
      if (!pin || !hash) {
        return res.status(400).json({ error: 'Both pin and hash are required' });
      }

      // Check if stored value is a standard bcrypt hash ($2a$, $2b$, or $2y$)
      const isBcrypt = typeof hash === 'string' && (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$'));

      if (isBcrypt) {
        const isValid = await bcrypt.compare(String(pin), hash);
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

      // Legacy plain-text fallback check for unmigrated entries
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
