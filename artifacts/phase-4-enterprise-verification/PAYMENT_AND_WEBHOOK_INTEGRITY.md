# PAYMENT AND WEBHOOK INTEGRITY RE-AUDIT

**Target Subsystem:** Cashfree Gateway Adapter & Durable Webhook Engine  
**Gateway Provider:** Cashfree Payments (v6 API: `2026-01-01`)  
**Retired Providers:** Razorpay (Permanently disabled, returns HTTP 410)  
**Database Tables:** `PaymentOrder`, `WebhookEvent`, `WalletLedger`, `Entitlement`

---

## 1. Critical Webhook Transaction Invariant

A webhook event is **never** marked `PROCESSED` before the financial transaction commits to the database:
1. **Atomic Claim:** When a webhook arrives, it is inserted with status `RECEIVED`. The handler atomically updates `processingStatus` to `PROCESSING` via row-level locking.
2. **Transaction Scope:** Balance crediting, order status transition to `PAID`, and entitlement grants occur within a single database transaction.
3. **Failure Recovery:** If fulfilment encounters an error, the webhook transitions to `RETRYABLE_FAILURE` and the transaction rolls back completely. The event remains recoverable and is retried up to 5 times with exponential backoff.
4. **Idempotency Guarantee:** If the same webhook is delivered concurrently or repeatedly, the unique `providerEventId` constraint and `processingStatus` check prevent duplicate credits or duplicate entitlement activation.

---

## 2. Forensic Resolution of Prior 16 Payment Hardening Items

| # | Hardening Scope | Prior Vulnerability | Latest HEAD Verification | Status |
|---|---|---|---|---|
| **01** | **Client-Controlled Pricing** | Client could submit arbitrary `amount` | Authoritative pricing in `catalog.ts`; server overrides client amount | **VERIFIED** |
| **02** | **Billing-Period Fallback** | Missing billing period defaulted unsafely | Requires explicit valid period (`MONTHLY`, `ANNUAL`); rejects invalid | **VERIFIED** |
| **03** | **Subscription Row Lock** | Lack of `FOR UPDATE` allowed race condition | Uses PostgreSQL row-level locks or transactional compare-and-swap | **VERIFIED** |
| **04** | **Subscription Idempotency** | Duplicate requests extended duration twice | Gated on unique `requestId`; duplicate returns 409 IDEMPOTENCY_CONFLICT | **VERIFIED** |
| **05** | **Payment-Order Locking** | Concurrent webhook & client verify | Single-winner atomic transition from `CREATED` to `PAID` | **VERIFIED** |
| **06** | **Paid Entitlement Uniqueness** | Multiple activations of same SKU | Composite uniqueness constraint on `(userId, featureKey, isActive)` | **VERIFIED** |
| **07** | **Webhook False-Success** | Returned HTTP 200 before fulfillment | Returns HTTP 200 ONLY after transaction commits; 500 on retryable fail | **VERIFIED** |
| **08** | **Durable Webhook Claims** | In-memory tracking lost on restart | Durable `WebhookEvent` table in PostgreSQL | **VERIFIED** |
| **09** | **Reclaim Concurrency** | Retrying webhook clashed with in-flight | Strict timeout lease check (`processingStartedAt > NOW() - INTERVAL 5 MIN`)| **VERIFIED** |
| **10** | **Fulfilment Rollback** | Partial failure left dangling ledger | Atomic transaction rollback on any step failure | **VERIFIED** |
| **11** | **Orphan Reconciliation** | Unclaimed orders lost forever | Scheduled reconciliation job matches Cashfree `providerOrderId` | **VERIFIED** |
| **12** | **Synthetic Payment IDs** | Mock IDs accepted in live mode | Live mode strictly verifies cryptographic signature against Cashfree secret| **VERIFIED** |
| **13** | **Hardcoded Owner Recovery**| Hardcoded `tiwariji` / `aryan` UUIDs | Removed; uses generic authoritative admin allowlist and role lookup | **VERIFIED** |
| **14** | **Cashfree Secret Override** | Secret could be overwritten in-memory | Runtime secrets immutable after bootstrap | **VERIFIED** |
| **15** | **Catalogue Mutations** | In-memory prices mutable via API | Prices frozen in `AUTHORITATIVE_CATALOG`; tamper-proof | **VERIFIED** |
| **16** | **Ephemeral Storage** | Preview lost data on sleep | Requires PostgreSQL or explicitly flags ephemeral mode in headers | **VERIFIED** |

---

## 3. Verification Evidence

- `phase_3_1_enterprise_adversarial.test.ts` (Sections 1-9): **20/20 PASS**
- `cashfree_and_serverless_state.test.ts`: **PASS**
- `payment_activation_and_catalog_sync.test.ts`: **PASS**
