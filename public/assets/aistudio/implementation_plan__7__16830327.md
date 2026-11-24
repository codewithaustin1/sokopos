# Digitax KRA eTIMS Accuracy & Fiscal Integrity Plan

This plan overhauls SokoPoS's KRA eTIMS integration so every transmitted invoice and credit note matches the exact items, discounts, tax classes, rounding, and tenant tax identity printed on the customer receipt. It eliminates collapsed placeholder baskets and unverified receipt signatures in favor of server-validated math, persistent Sync Outbox retries, and automated refund credit notes.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Scope & Fiscal Compliance Guardrails**
> All core transmission rules below reflect your confirmed choices. Review the implementation behavior and recommended defaults below before approving execution.

- **Itemized SKU Mapping & Net Discounts (Confirmed)**: Every sold SKU maps individually to Digitax with auto-registration on first sale/sync, preserving per-item quantities, net line-item discounts (`discount_rate` / `discount_amount`), and exact KRA tax classes (`A` Exempt, `B` Standard 16%, `C` Zero-Rated 0%, `E` Special 8%) rather than collapsing baskets into two generic test items.
- **Honest Offline State & Outbox Retry (Confirmed)**: Checkout receipts no longer stamp placeholder KRA CU serials, mock signatures, or hardcoded sandbox URLs when offline or before Digitax confirmation. Unverified sales mark eTIMS status as `PENDING` (or `FAILED` on validation rejection) and queue automatically in the durable IndexedDB Sync Outbox.
- **Server-Side Verification & Refund Credit Notes (Confirmed)**: All Digitax item registrations, sales, and credit notes pass through an authenticated server verification layer that validates line-item tax math, inclusive/exclusive pricing, buyer PINs (`customer_pin`), and server-stored API credentials. Processing a POS refund automatically issues a linked KRA Credit Note (with Sync Outbox fallback).
- **Recommended Default — Zero-Rated vs. Exempt Disambiguation**: When a product has `0%` tax without an explicit rule code, tax resolution defaults to KRA Zero-Rated (`C`) for standard food/retail zero-rated rules and Exempt (`A`) only when matched to an exempt tax rule or product classification—editable cleanly in Catalog and Tax Settings.
- **Recommended Default — Environment & Credential Storage**: Remove all hardcoded fallback API keys from browser storage and source code; manage Digitax API keys exclusively through server environment configuration and authenticated tenant tax settings.

---

## 1. Overview & Core Concept

- **What It Does**: Establishes an end-to-end fiscal verification pipeline between the POS checkout/refund engine, the backend validation gateway, and Digitax Kenya API v2. Every SKU, discount, tax rate, cash rounding difference, payment method, and return is mathematically reconciled before KRA Control Unit signing and persisted cleanly across offline and online states.
- **Target Audience / Persona**: Retail store owners, accountants, supervisors, and cashiers across Kenyan supermarkets, pharmacies, hardware shops, and mini-marts who rely on audit-proof KRA eTIMS receipts and automated VAT reconciliation.
- **Key Value**: Guarantees 1-to-1 parity between POS Z-reports, customer thermal receipts, and KRA iTax/eTIMS ledgers—removing tax-class misreporting, discount inflation, phantom placeholder QR codes, and unreversed VAT on refunded goods.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Catalog & Tax Readiness**: Managers configure KRA tax rules (`16%` Standard, `8%` Special, `0%` Zero-Rated, Exempt) and tenant KRA PIN in the Tax & eTIMS panel. Products automatically receive or sync a verified Digitax Item ID and KRA tax type code upon creation or first checkout.
  2. **POS Checkout & Honest Fiscal Status**:
     - **Online**: Checkout verifies tax math, ensures any unmapped SKUs are registered in Digitax, submits the itemized sale through the server gateway, polls for the official KRA signature, and renders the verified QR code, live CU Serial, CU Invoice `#`, and tenant Tax PIN on the receipt.
     - **Offline / Temporary Failure**: The receipt prints immediately with an explicit **"Pending KRA Fiscalization"** notice (without fake QR codes or mock signatures) and queues into the Sync Outbox. Once connectivity returns, background sync transmits the sale, polls for KRA completion, and silently updates the stored receipt in place.
  3. **Returns & Automated KRA Credit Notes**: When a supervisor authorizes a partial or full refund, SokoPoS calculates proportional net unit amounts and tax refunds per returned SKU and submits a linked Credit Note referencing the original Digitax sale and invoice number, displaying the Credit Note CU sequence on the refund record.
  4. **Outbox & Reconciliation Visibility**: Pending or failed eTIMS fiscalizations appear clearly in the Cloud Sync Hub and Receipt Inspection modal with direct **Retry eTIMS Sync** actions and exact server/KRA validation error reasons.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-trust utilitarian SaaS financial ledger adhering to crisp ledger density and zero-noise clarity.
  - *Color Palette & Mood*: Neutral `--background` slate surfaces (`#f8fafc` light / `#0f172a` dark), high-contrast primary typography (`#0f172a` / `#f8fafc`), and restrained semantic state indicators (`--primary` verified emerald `#059669`, pending amber `#d97706`, failed crimson `#dc2626`) paired with mandatory icon + text labels rather than color-only indicators.
  - *Typography & Hierarchy*: Clean sans-serif interface headings paired with crisp monospaced `tabular-nums` alignment on all KES totals, tax breakdowns, KRA PINs, CU Serials, and invoice sequence numbers so columns never jitter during updates.
  - *Component Styling & Layout*: Single-elevation hairline card containers (`1px` slate dividers, unboxed metadata rows separated by interpuncts `·`), strictly capped metadata badges, and compact side-by-side key-value grids in the Tax Management and Receipt modals.

- **Interactive Feedback & Motion**:
  - Instant micro-feedback during live eTIMS signing ("Verifying Tax Math → Signing with KRA CU"), static icon+text state pills (avoiding pulsing decorative dots), clear non-blocking retry toasts when network drops, and explicit validation diagnostics if KRA rejects a malformed buyer PIN or duplicate invoice reference.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Pre-Sale Automatic SKU Registration vs. Manual Batch Sync**
  - *Chosen Approach*: Auto-register unmapped catalog SKUs seamlessly just-in-time at checkout (or proactively on product save when online) and cache the resulting Digitax Item ID and eTIMS code directly on the product record.
  - *Why*: Cashiers cannot pause checkout queues to manually configure KRA item classifications for newly stocked items.
  - *Alternatives Considered*: Requiring manual "Sync Catalog to eTIMS" before allowing checkout; rejected because missed items would repeatedly block counter sales.

- **Decision 2: Strict Server-Side Math Verification vs. Client-Only Mapping**
  - *Chosen Approach*: Recompute and verify line totals, net discounts, inclusive/exclusive tax extraction, cash rounding tolerance, and total invoice balance on the Express backend before forwarding payloads to Digitax v2.
  - *Why*: Eliminates client-side floating-point drift, blocks tampered or inconsistent totals before they hit KRA, and guarantees accurate `taxable_amount` + `tax_amount` parity.
  - *Alternatives Considered*: Keeping the transparent client-to-proxy passthrough; rejected because client bugs or stale tax settings could submit invalid fiscal records to KRA.

- **Decision 3: Unified IndexedDB Outbox for Sales, Fiscal Signing & Credit Notes**
  - *Chosen Approach*: Extend the existing durable IndexedDB Sync Outbox to support fiscalization jobs (`etims_sale` and `etims_credit_note`) alongside Firestore document mutations, with exponential backoff and dead-letter recovery.
  - *Why*: Survives browser reloads, power cuts, and multi-hour internet outages without losing sequential KRA invoice integrity or creating duplicate submissions via idempotent `trader_invoice_number` keys.
  - *Alternatives Considered*: In-memory retry timers only; rejected because refreshing the POS tab would permanently drop unsigned receipts.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                     SokoPoS Browser Terminal (React)                       │
│  ┌──────────────────┐   ┌──────────────────┐   ┌────────────────────────┐  │
│  │ POS Checkout &   │   │ Tax & Catalog    │   │ Receipt Modal &        │  │
│  │ Refund Engine    │   │ Configurator     │   │ Cloud Sync Hub         │  │
│  └────────┬─────────┘   └────────┬─────────┘   └───────────┬────────────┘  │
│           │                      │                         │               │
│           ▼                      ▼                         ▼               │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │          Client Fiscal Mapper & IndexedDB Outbox Worker              │  │
│  │  • Resolve SKU Digitax IDs, net unit discounts & KRA tax codes       │  │
│  │  • Strip fake signatures; stamp PENDING when offline/queued          │  │
│  │  • Retry failed sales & credit notes with exponential backoff        │  │
│  └───────────────────────────────┬──────────────────────────────────────┘  │
└──────────────────────────────────┼─────────────────────────────────────────┘
                                   │ HTTPS (Firebase Auth Bearer Token)
                                   ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                  Express Server Fiscal Validation Gateway                  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  • Verify caller session & tenant access                             │  │
│  │  • Check line math: qty * net_unit_price == line_total (+/- 0.05)    │  │
│  │  • Verify tax extraction matches inclusive/exclusive tax class       │  │
│  │  • Validate KRA PIN format & tenant TIN via Digitax profile          │  │
│  │  • Inject server-side Digitax API key from environment secrets       │  │
│  └──────┬──────────────────────────┬───────────────────────────┬────────┘  │
└─────────┼──────────────────────────┼───────────────────────────┼───────────┘
          │                          │                           │
          ▼                          ▼                           ▼
   POST /ke/v2/items          POST /ke/v2/sales        POST /ke/v2/credit-notes
          │                          │                           │
          └──────────────────────────┼───────────────────────────┘
                                     ▼
                  ┌────────────────────────────────────┐
                  │  Digitax Kenya eTIMS v2 Platform   │
                  │  & KRA Control Unit Signing        │
                  └──────────────────┬─────────────────┘
                                     │ Verified CU Serial, Invoice #, QR URL
                                     ▼
                  ┌────────────────────────────────────┐
                  │  Firestore Tenant Cloud Persistence │
                  │  (Products, Transactions, Refunds) │
                  └────────────────────────────────────┘
```

### Data Model & State

- **Product Fiscal Attributes**: Extend product records with optional persistent fiscal fields:
  - Digitax Item UUID (`digitaxItemId`), KRA eTIMS item code (`etimsItemCode`), KRA tax type code (`taxTypeCode`: `'A' | 'B' | 'C' | 'D' | 'E'`), KRA classification code (`itemClassCode`), unit codes (`packageUnitCode`, `quantityUnitCode`), and last synced timestamp.
- **Transaction eTIMS Metadata**: Enhance `etimsData` to track lifecycle honestly:
  - Status (`'PENDING' | 'COMPLETED' | 'FAILED'`), attempt counter, last error message, payload checksum/idempotency key (`traderInvoiceNumber`), verified tenant `taxPin` (populated from Digitax/business settings rather than a hardcoded string), buyer PIN (`customerTin`), and verified KRA signature fields—remaining `undefined` until genuinely returned by Digitax.
- **Refund Credit Note Metadata**: Add `etimsCreditNote` onto `RefundRecord` storing the Digitax credit note ID, linked original `saleId` / `originalTraderInvoiceNumber`, KRA credit note reason code (`01`–`06`), CU invoice number, verification QR URL, and sync status (`'PENDING' | 'COMPLETED' | 'FAILED'`).
- **Outbox Mutation Types**: Extend the IndexedDB Sync Outbox entity types to process fiscal transmission tasks (`etims_sale`, `etims_credit_note`) alongside standard Firestore collection syncs, preventing premature receipt sync clearing until fiscal verification succeeds or is explicitly dead-lettered for review.
- **Firestore Schema & Security Synchronization**: Update `firebase-blueprint.json` with the new additive fiscal fields on products, transactions, and refunds, and ensure `firestore.rules` validates tenant ownership and string boundaries without breaking existing writes (deploying any rules update cleanly during execution).

### Interactive Component & State Mapping

- **POS Checkout Handler**: Computes authoritative per-item net amounts (incorporating percentage discounts, flat discounts, and any cart-level rounding allocation), attaches each product's KRA tax type code, records the transaction locally with `etimsData.status = 'PENDING'` (no placeholder CU numbers or mock QR URLs), and dispatches both Firestore persistence and Digitax transmission (falling back smoothly to an Outbox fiscalization task if offline or if transmission fails).
- **Auto-Registration Pipeline**: Before creating a Digitax sale, checks every basket item for a cached `digitaxItemId` matching its current KRA `taxTypeCode`. Missing items are registered atomically via the server's Digitax items endpoint (or matched against existing Digitax items by SKU/name to avoid duplicates) and saved back to local catalog state and Firestore.
- **Tax & Discount Reconciliation Engine**:
  - **Exclusive Pricing**: Computes `taxable_amount = netLineTotal` and `tax_amount = round2(netLineTotal * rate)`, verifying `total_amount = taxable_amount + tax_amount`.
  - **Inclusive Pricing**: Computes `taxable_amount = round2(netLineTotal / (1 + rate))` and `tax_amount = round2(netLineTotal - taxable_amount)`, preserving exact shelf-price totals.
  - **Cash Rounding**: Transmits cash-rounding adjustments transparently (either as a dedicated non-taxable/rounding line or balanced invoice discount/surcharge within Digitax v2 constraints) so the tender total matches the KRA invoice total.
  - **Payment Method Mapping**: Maps all 5 POS tenders accurately (`cash`, `mpesa`, `card`, `store_credit`, and `split` using primary/multi-tender codes) instead of collapsing split/credit sales into cash.
- **Refund & Credit Note Flow**: On `processRefund`, computes proportional discounted unit values and tax reversals for each returned SKU, derives the KRA `credit_note_reason` code (`03` Damaged if non-restock damaged/expired, `06` Refund otherwise), calls the server credit-note endpoint referencing the original Digitax sale/trader invoice, or enqueues a retryable `etims_credit_note` Outbox entry if the original sale is still pending or the terminal is offline (enforcing dependency ordering so the original sale completes signing before its credit note transmits).
- **Receipt Modal & Tax Control Center**:
  - Replaces static `"KRA eTIMS Validated"` headers with live state-aware rendering: **KRA eTIMS Verified** (with live scannable QR + CU serial), **Pending KRA Sync** (with one-click *"Retry KRA Signing"* button), or **Fiscal Sync Attention Required** (showing the validation error without printing misleading QR codes).
  - Updates the Tax Management test sale and ping tools to display real connected CU/PIN metadata, environment indicator (`sandbox` vs `production`), and clear diagnostic responses.

### Key Sequences & Security Integrity

- **Server-Authoritative Credential & Payload Hygiene**:
  - Digitax API keys are loaded strictly from server environment variables (and documented cleanly in `.env.example` without secrets), eliminating hardcoded test keys and client-side `localStorage` key storage or direct browser-to-Digitax API fallback calls.
  - Every `/api/digitax/*` request verifies the caller's Firebase Auth identity and cross-checks tenant tax PIN alignment against the Digitax business profile (`etims-info`).
  - The server enforces strict structural validation (positive quantities, non-negative prices, bounded discount rates `0–100%`, valid KRA tax codes `A–E`, valid Kenyan KRA PIN regex `^[AP]\d{9}[A-Z]$`, and server-recomputed invoice math tolerance checks) before signing any payload with Digitax, preventing malformed data or math drift from reaching KRA.
  - All fiscalization submissions use deterministic `trader_invoice_number` / refund reference IDs (`receiptNumber` and `refundNumber`) so automatic Outbox retries remain strictly idempotent without creating duplicate KRA invoices.
