# ASTROVERSE AI — RAZORPAY REMOVAL AUDIT & RECONCILIATION

**Document ID:** `AV-AUD-2026-10-30-01`  
**Classification:** Payment Systems Migration & Deprecation Audit  
**Author:** Principal Engineering Lead  
**Status:** Complete & Verified  
**Target Environment:** `https://astroverse-eta.vercel.app/`  

---

## 1. EXECUTIVE SUMMARY & OBJECTIVE

As mandated by the engineering directive for AstroVerse AI, this audit documents the complete removal of Razorpay from all active transaction execution paths across the frontend web client, mobile application, backend API endpoints, and dependency trees. Cashfree Payments has been established as the sole intended payment gateway for all new transactions.

All modifications strictly adhered to the operating constraints:
- Preserved historical financial transactions and audit ledgers containing `provider = 'RAZORPAY'`.
- Maintained database backwards compatibility without destructive schema drops.
- Enforced fail-closed security guards across all payment, report generation, and subscription workflows.
- Eliminated all client-side bypass mechanisms and mock payment fallbacks.

---

## 2. REPOSITORY INVENTORY & CLASSIFICATION

Every occurrence of Razorpay in the repository has been audited and classified into the seven formal categories:

```
+---------------------------------------------------------------------------------------------------------+
|                               RAZORPAY OCCURRENCE CLASSIFICATION LEDGER                                 |
+------------------------------------------+---------------------+-------------------+--------------------+
| File / Component Location                | Category            | Initial State     | Remediated State   |
+------------------------------------------+---------------------+-------------------+--------------------+
| index.html (initiateWalletTopup)         | A. Active Payment   | new Razorpay(...) | Cashfree JS SDK v3 |
| index.html (initiateSubscriptionCheckout)| A. Active Payment   | new Razorpay(...) | Cashfree JS SDK v3 |
| index.html (orderReportWithPricing)      | A. Active Payment   | method === RAZORPAY| Cashfree JS SDK v3|
| index.html (preview_signature_bypass)    | B. Active Auth/Bypass| Hardcoded Bypass  | REMOVED (Fail-Close)|
| index.html (Legal Policies)              | F. Documentation    | "via Razorpay"    | "via Cashfree"     |
| apps/mobile/ProfileScreen.tsx            | F. Documentation    | "Secured by RZP"  | "Secured by CF"    |
| services/wallet-service/package.json     | E. Tests / Runner   | test script ref   | Retained in runner |
| services/wallet-service/package-lock.json| G. Dead Code        | razorpay@2.9.8    | PRUNED (0 refs)    |
| docker-compose.yml                       | G. Dead Config      | RZP placeholders  | Cashfree config    |
| .env.example (Root & Service)            | F. Runbooks         | RZP env vars      | Cashfree env vars  |
| services/wallet-service/src/server.ts    | A. Active Lookup    | findPaymentOrder..| Removed RZP lookup |
| services/wallet-service/src/server.ts    | B. Active Rejection | 410 GATEWAY_RETIRED| Retained Rejection |
| services/wallet-service/src/server.ts    | C. Historical Sup.  | Billing history   | Retained (History) |
| services/wallet-service/src/db.ts        | C. Historical Sup.  | Schema aliases    | Retained (History) |
| services/wallet-service/src/ledger.ts    | G. Dead Code        | Unimported legacy | Deprecated stub    |
| services/wallet-service/prisma/schema    | D. DB Compatibility | razorpayOrderId   | Retained (DB Col)  |
| services/wallet-service/src/schemaBoot   | D. DB Compatibility | DDL compatibility | Retained (DB Col)  |
| services/wallet-service/tests/*          | E. Tests & Fixtures | Rejection tests   | Retained & Expanded|
| docs/* & AUDIT/*                         | F. Historical Docs  | Onboarding dossier| Retained (Archive) |
+------------------------------------------+---------------------+-------------------+--------------------+
```

### Classification Breakdown:
- **Category A (Active Payment Logic):** Fully eliminated from `index.html` and `server.ts`. No executable path can initiate a Razorpay order, open a Razorpay checkout modal, or submit Razorpay signatures.
- **Category B (Active Authorization & Bypass Logic):** The client-side `preview_signature_bypass` in subscription checkout was completely removed. Rejection filters enforcing HTTP 410 `PAYMENT_PROVIDER_RETIRED` on legacy signatures remain active.
- **Category C (Historical Transaction Support):** Preserved in `db.ts` and `server.ts` so historical transactions previously processed via Razorpay remain accurately queryable by users and admins in `/api/billing/history`.
- **Category D (Database Migration & Compatibility):** The underlying database column `razorpayOrderId` in PostgreSQL and Prisma is retained to avoid data loss or destructive database migrations.
- **Category E (Tests & Fixtures):** Retained and expanded in `tests/razorpay_compliance.test.ts` to actively prove that all retired Razorpay routes and signature submissions return HTTP 410.
- **Category F (Documentation & Regulatory Runbooks):** Active user-facing legal policies, privacy policies, and `.env.example` templates updated to Cashfree; historical audit dossiers preserved as immutable engineering records.
- **Category G (Dead Code & Lingering Dependencies):** The `razorpay` npm package was pruned from `node_modules` and purged from `package-lock.json`. Unimported helpers in `ledger.ts` deprecated.

---

## 3. REMOVAL OF RAZORPAY-SPECIFIC ABSTRACTIONS

### 3.1 Elimination of `db.findPaymentOrderByRazorpayId`
In `services/wallet-service/src/server.ts`, lines 4247 and 4349 previously contained:
```typescript
const order = db.findPaymentOrderByRazorpayId(orderId) || db.findPaymentOrderById(orderId);
```
This retained Razorpay-specific naming in active Cashfree payment verification and webhook processing. Both occurrences were refactored to use the authoritative provider-aware lookup:
```typescript
const order = db.findPaymentOrderById(orderId);
```

### 3.2 Default Webhook Provider Alignment
In `services/wallet-service/src/db.ts`, the default provider argument for `markWebhookEventProcessed` was updated from `'RAZORPAY'` to `'CASHFREE'`:
```typescript
markWebhookEventProcessed(eventId: string, provider: string = 'CASHFREE'): void
```

---

## 4. FRONTEND CHECKOUT MIGRATION (`index.html`)

The frontend application previously contained direct Razorpay checkout invocations and fallback bypasses across three core user flows. All three flows have been migrated to the Cashfree Web SDK v3 (`https://sdk.cashfree.com/js/v3/cashfree.js`):

1. **Wallet Top-Up (`initiateWalletTopup`):**
   - Eliminated `typeof Razorpay !== 'undefined'` and `new Razorpay(rzpOptions)`.
   - Submits order creation to `/api/wallet/create-order`.
   - If Cashfree is unconfigured (HTTP 503 `PAYMENTS_NOT_CONFIGURED`), alerts user: *"Online payments are currently unconfigured. Please try again later."*
   - When `orderData.paymentSessionId` is present, initializes Cashfree JS SDK in modal mode (`redirectTarget: '_modal'`).

2. **Subscription Activation (`initiateSubscriptionCheckout`):**
   - Eliminated `typeof Razorpay !== 'undefined'` and `new Razorpay(rzpOptions)`.
   - **Critical Vulnerability Remediation:** Removed the client-side fallback `await verifySubscriptionPayment(orderData.orderId, 'pay_sub_' + Date.now(), "preview_signature_bypass", tier)`.
   - Handles `orderData.paymentSessionId` via Cashfree Web Checkout; fails closed if unconfigured.

3. **Report Studio Checkout (`orderReportWithPricing`):**
   - Eliminated `method === 'RAZORPAY'` check.
   - Now supports `method === 'CASHFREE'`, allowing users to pay directly via UPI / NetBanking / Cards via Cashfree, or use their stored Wallet balance.

---

## 5. VERCEL CONFIGURATION CLEANUP CHECKLIST

The following obsolete Razorpay environment variables must be decommissioned from the Vercel production dashboard (**Settings > Environment Variables**) after initial deployment:

| Variable Name | Former Purpose | Current Status | Decommission Action |
| :--- | :--- | :--- | :--- |
| `RAZORPAY_KEY_ID` | Public gateway Key ID | Retired | **Delete from Vercel** |
| `RAZORPAY_KEY_SECRET` | Backend API Secret | Retired | **Delete from Vercel** |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook HMAC Secret | Retired | **Delete from Vercel** |

*Note: In accordance with security protocols, zero secret values or credentials are displayed in this audit.*

---

## 6. VERIFICATION EVIDENCE

- **Lockfile Audit:** `npm ls razorpay` confirmed `(empty)` with 0 references in `package-lock.json`.
- **Frontend Source Audit:** `git grep -i "razorpay" index.html` returned 0 occurrences.
- **Automated Regression Suite:** `npx ts-node tests/razorpay_compliance.test.ts` passed **19/19 tests**, proving that all retired Razorpay routes return HTTP 410 while historical transactions remain queryable.
