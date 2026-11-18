# Multi-Tenant Row-Level Security (RLS) & API Hardening Specification

## Application Context
- **Target Database**: `ai-studio-sokopospointofsa-5314257a-dae6-432a-bde0-81ab935cc7ad`
- **Application**: SokoPoS Multi-Tenant Retail Point-of-Sale System
- **Super Administrator**: `upfrontretaile@gmail.com`

---

## Core Security Invariant
All tenant data access across core collections (`products`, `categories`, `locations`, `cashiers`, `transactions`, `customers`, `suppliers`, `stock_transfers`, `sync_logs`, `purged_sales_backups`, `analytics_daily_rollups`, `analytics_targets`, `analytics_saved_views`) must enforce verified tenant membership or ownership on **both** single-document reads (`get`), queries (`list`), creates, updates, and deletes:

```javascript
hasTenantAccess(resource.data.businessId) // isEmailVerified() && (isSuperAdmin() || tokenBusinessId() == bizId || isOwnerOf(bizId) || isMemberOf(bizId))
```

Non-super-admin users cannot list, read, create, update, or delete records belonging to any other business tenant or records lacking a `businessId`.

---

## Hardened Controls (Database + Server + Edge API)
1. **Default Deny**: `match /{document=**} { allow read, write: if false; }` at root.
2. **Strict Tenant `allow list` Scoping**: Every tenant collection checks `hasTenantAccess(resource.data.businessId)` on `list` as well as `get`, preventing cross-tenant enumeration.
3. **Document ID Validation (`isValidId`)**: All collection paths validate document IDs against `^[a-zA-Z0-9_.\-]+$` and `size() <= 128` (with strict date/ID patterns on payment and telemetry records).
4. **Privilege Escalation Prevention**:
   - `/users/{userId}` blocks self-assignment of `super_admin` roles and prevents binding to unowned `businessId` tenants.
   - `/businesses/{businessId}` blocks client modification of `plan`, `status`, `subscription`, `referredByCode`, `referredAt`, and `paystackSubaccount*` fields.
   - `/staff_credentials/{credId}` disallows all client writes (`allow write: if false;`); writes are performed exclusively by authenticated `/api/auth/*` server handlers via ADC.
   - `/affiliates`, `/affiliate_commissions`, and `/affiliate_payouts` disallow direct non-admin client writes; mutations execute exclusively via authenticated backend endpoints.
   - `/payment_records/{recordId}` is read-only for Super Admin audit and written exclusively server-side.
5. **Bcrypt-Only Authentication & Vaulting**:
   - Plaintext PIN comparison fallbacks removed from Express (`/server.ts`), Cloudflare Edge (`/functions/api/[[route]].ts`), and client fallback code.
   - `/api/auth/save-staff-credential`, `/api/auth/sync-credentials`, `/api/auth/check-staff-identity`, `/api/auth/verify-totp`, `/api/auth/hash-pin`, and `/api/auth/bulk-hash-pins` require verified Firebase ID Bearer tokens (and tenant manager/owner RBAC for credential mutations).
6. **Payment & Affiliate API Security**:
   - `/api/payments/initiate` (`subscription`) and `/api/payments/verify/:reference` (`SOKO-SUB-*` / subscriptions) require verified Firebase ID tokens and tenant authorization.
   - `/api/payments/daraja/callback` rejects unknown `CheckoutRequestID` intents and verifies `DARAJA_CALLBACK_SECRET`, signed HMAC URL tokens, or independent Safaricom STK Query confirmation before crediting subscriptions.
   - `/api/affiliates/enroll`, `/api/affiliates/me`, and `/api/affiliates/payout-request` derive `uid`/`email` strictly from verified Firebase ID tokens; admin affiliate routes enforce `requireSuperAdminCaller`.
7. **HTTP Security Headers & Edge CORS**:
   - Express sets `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Permitted-Cross-Domain-Policies`, HSTS (over HTTPS), and `Content-Security-Policy` with scoped `frame-ancestors` (zero `x-powered-by` leakage).
   - Cloudflare Pages Edge adapter replaces wildcard `Access-Control-Allow-Origin: *` with explicit origin allowlist matching and Firebase token verification.
