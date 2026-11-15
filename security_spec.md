# Multi-Tenant Row-Level Security (RLS) Specification

## Application Context
- **Target Database**: `ai-studio-sokopospointofsa-5314257a-dae6-432a-bde0-81ab935cc7ad`
- **Application**: SokoPOS Multi-Tenant Retail Point-of-Sale System
- **Super Administrator**: `upfrontretaile@gmail.com`

---

## Core Security Invariant
All tenant data access across all core collections (`products`, `transactions`, `locations`, `cashiers`, `stock_transfers`, `sync_logs`) must enforce:

```javascript
request.auth.token.businessId == resource.data.businessId
```

Non-super-admin users cannot read, list, create, update, or delete data belonging to other tenants.

---

## The Eight Pillars Enforcement
1. **Default Deny**: `match /{document=**} { allow read, write: if false; }` at root.
2. **Explicit Data-Access Scoping**: Every match block checks `request.auth.token.businessId == resource.data.businessId`.
3. **Write Protection**: On create, `request.resource.data.businessId` must match the caller's token.
4. **Relational Isolation**: Collections are isolated strictly by tenant ID.
5. **Role Escalation Prevention**: Super-admin actions are restricted to `upfrontretaile@gmail.com` or custom claim `role == 'super_admin'`.
6. **No Client-Side Delegation**: Rules do not trust client filtering; the database enforces isolation.
7. **Audit Trail Security**: Destructive actions (deletions) are restricted or logged.
8. **Error Handling Architecture**: Client service catches and formats Firestore errors using `OperationType` and `handleFirestoreError`.

---

## Dirty Dozen Security Test Scenarios
1. **Unauthenticated Read**: Request without auth token to `/products/prod-1` -> REJECTED (403).
2. **Unauthenticated Write**: Request without auth token to `/transactions/tx-1` -> REJECTED (403).
3. **Cross-Tenant Product Read**: User with `businessId: "biz-1"` reading product with `businessId: "biz-2"` -> REJECTED.
4. **Cross-Tenant Product Mutation**: User with `businessId: "biz-1"` updating product with `businessId: "biz-2"` -> REJECTED.
5. **Cross-Tenant Transaction Injection**: User with `businessId: "biz-1"` creating transaction with `businessId: "biz-2"` -> REJECTED.
6. **Tenant Location Leakage**: User with `businessId: "biz-1"` listing locations of `businessId: "biz-2"` -> REJECTED.
7. **Tenant Staff/Cashier Tampering**: User with `businessId: "biz-1"` modifying cashier of `businessId: "biz-2"` -> REJECTED.
8. **Stock Transfer Spoofing**: User attempting to initiate transfer for an unauthorized business -> REJECTED.
9. **Super-Admin Authorized Audit Read**: Super-admin (`upfrontretaile@gmail.com`) querying any tenant -> ALLOWED.
10. **Tenant Self-Read**: Authenticated user with `businessId: "biz-1"` querying their own products -> ALLOWED.
11. **Tenant Self-Transaction Write**: Authenticated user with `businessId: "biz-1"` saving a sale with matching `businessId: "biz-1"` -> ALLOWED.
12. **Catch-All Wildcard Exploit**: Accessing an undefined collection or document -> REJECTED by Default Deny.
13. **Client Self-Upgrade Tampering**: Business owner or tenant member attempting to directly update `plan`, `status`, `subscription`, or `paystackSubaccount*` on `/businesses/{businessId}` -> REJECTED (`403 PERMISSION_DENIED`).
14. **Self-Signup Free Tier Lock**: Non-super-admin creating `/businesses/{businessId}` with `plan: "business"` or `"premium"`, or injecting a `subscription` object -> REJECTED (`403 PERMISSION_DENIED`).
15. **Verified Payment / Webhook & Super-Admin Provisioning**: Server-side verified Paystack transaction (`/api/payments/verify/:reference` or webhook `charge.success` via ADC) or Super Admin updating `plan`, `status`, and `subscription` on `/businesses/{businessId}` -> ALLOWED.
16. **Daraja / Paystack Payment Record Protection**: Authenticated or unauthenticated client attempting to create, update, or delete `/payment_records/{recordId}` directly -> REJECTED (`403 PERMISSION_DENIED`); only server Admin/ADC writes and Super-Admin audit reads are permitted.
