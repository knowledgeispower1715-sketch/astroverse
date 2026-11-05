# 08 — CASHFREE SANDBOX COMMERCIAL WORKFLOW VALIDATION

**AstroVerse AI Commercial Launch & Production Certification — Phase 6**  
**Classification:** End-to-End Financial Workflow & Payment Gateway Lifecycle  
**Evaluator:** Senior Payments Architect & Financial Systems Lead  
**Evaluation Date:** 2026-11-05T13:27:00Z  
**Verification Environment:** Cashfree Sandbox (`https://sandbox.cashfree.com/pg`) & Local Automated Suites  

---

## 1. Commercial Purchase Lifecycle & State Machine

AstroVerse monetizes through three product categories:
1. **Wallet Recharges:** Flexible denominations (₹100, ₹250, ₹500, ₹1000, ₹2500) plus custom amounts (`min ₹50, max ₹10,000`).
2. **Subscriptions:** `PLUS` (₹149/mo, ₹1490/yr) and `PREMIUM` (₹299/mo, ₹2990/yr).
3. **À la carte Reports & Consultations:** Kundli Deep Dive (₹399), Annual Transit (₹499), Life Horoscopes (₹799), Live Consultations (₹25/min).

```
+-------------------------------------------------------------------------------------------------+
| Step 1: Customer selects SKU / Recharge Pack                                                    |
| -> Client calls POST /api/wallet/create-order with { amount: 100 }                              |
+-------------------------------------------------------------------------------------------------+
                                               |
                                               v
+-------------------------------------------------------------------------------------------------+
| Step 2: Server creates internal PaymentOrder record & requests Cashfree Gateway Order           |
| -> Base: ₹84.75 | 18% GST: ₹15.25 | Total: ₹100.00                                              |
| -> Returns { orderId: "cf_wal_...", paymentSessionId: "session_..." }                           |
+-------------------------------------------------------------------------------------------------+
                                               |
                                               v
+-------------------------------------------------------------------------------------------------+
| Step 3: Cashfree Checkout Drop-in / Hosted Payment                                              |
| -> Customer executes payment in Cashfree Sandbox via UPI / Card / Netbanking                   |
+-------------------------------------------------------------------------------------------------+
                                               |
                     +-------------------------+-------------------------+
                     |                                                   |
                     v                                                   v
+-----------------------------------------+   +---------------------------------------------------+
| Step 4A: Synchronous Verification       |   | Step 4B: Asynchronous Webhook                     |
| -> Client posts to /api/cashfree/verify |   | -> Cashfree POSTs to /api/wallet/webhook          |
| -> Confirms status: PAID                |   | -> Validates HMAC signature & timestamp           |
+-----------------------------------------+   +---------------------------------------------------+
                     |                                                   |
                     +-------------------------+-------------------------+
                                               |
                                               v
+-------------------------------------------------------------------------------------------------+
| Step 5: Authoritative Idempotent Credit & Double-Entry Ledger Posting                           |
| -> Checks db.isPaymentIdUsed(paymentId, orderKey)                                               |
| -> Atomically credits customer wallet balance (+₹84.75 base)                                    |
| -> Inserts WalletLedger entry with integer paise amount 8475                                   |
| -> Emits AuditEvent and updates PaymentOrder.status = "PAID"                                    |
+-------------------------------------------------------------------------------------------------+
```

---

## 2. Order Recovery & Self-Healing Capabilities

A critical feature validated in Phase 6 is **Automatic Order Recovery (P0 Incident Recovery)**:
- **Scenario:** Customer completes payment on Cashfree, but internet connectivity drops before the browser redirects back, and webhook delivery is delayed.
- **Self-Healing Mechanism:**
  1. Next time customer calls `GET /api/user/me`, `GET /api/wallet/me`, or `POST /api/wallet/reconcile`, the server automatically sweeps all `CREATED` orders for that user.
  2. The server queries `getCashfreeOrderStatus(orderId)` and `getPaymentsForCashfreeOrder(orderId)`.
  3. If payment was captured on Cashfree, the server authoritatively fulfills the order and credits the wallet immediately.
  4. Fully tested under `tests/cashfree_order_recovery_p0.test.ts` and `tests/unified_financial_infrastructure.test.ts` (100% pass rate).

---

## 3. Financial Invariant Verification

- **Tax Precision:** 18% GST is accurately computed using integer paise rounding (`round(amount * 18 / 118)`).
- **Exact Credit Arithmetic:** The customer's spendable wallet balance is credited with the pre-tax base amount (or full recharged amount per promotion configuration), guaranteeing zero floating-point accumulation errors.
- **Fail-Closed Sandbox Gate:** If Cashfree credentials are missing or invalid, `POST /api/wallet/create-order` returns `HTTP 503 PAYMENTS_NOT_CONFIGURED`, refusing to accept unfulfillable orders.
