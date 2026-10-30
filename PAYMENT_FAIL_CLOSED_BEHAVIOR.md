# ASTROVERSE AI — PAYMENT FAIL-CLOSED ARCHITECTURE & DEFENSIVE BEHAVIOR

**Document ID:** `AV-SEC-2026-10-30-03`  
**Classification:** Application Security & Financial Integrity  
**Author:** Principal Engineering Lead & Security Architect  
**Status:** Certified & Verified via Automated Negative Test Suites  
**Target Environment:** `https://astroverse-eta.vercel.app/`  

---

## 1. PRINCIPLE OF FAIL-CLOSED OPERATION

In financial architectures, "fail-open" vulnerabilities allow users to access paid services or credit without verified funds transfer when third-party dependencies are offline or unconfigured. AstroVerse AI enforces strict **fail-closed** operation across all monetary, entitlement, and report-generation paths.

When Cashfree Payments credentials are missing or unconfigured:
1. **No Simulated Payments in Production:** The application never generates fake payment receipts, mock order approvals, or simulated gateway responses in live or production environments.
2. **Stable Error Contract (`PAYMENTS_NOT_CONFIGURED`):** Endpoints that require live gateway interaction return HTTP 503 with standardized error payloads.
3. **Zero Financial Entitlement Leakage:** A user cannot obtain a paid subscription, wallet credit, or personalized PDF blueprint without verified database order settlement.
4. **Preservation of Non-Monetary Features:** Core astrological tools (Janam Kundli D1, Panchang, planetary Horas, and free chart previews) remain fully available.

---

## 2. ENDPOINT-BY-ENDPOINT FAIL-CLOSED AUDIT

```
+---------------------------------------------------------------------------------------------------------+
|                                ENDPOINT FAIL-CLOSED AUDIT MATRIX                                        |
+------------------------------------+--------------------------+---------------+-------------------------+
| Route / Action                     | Condition                | HTTP Code     | Error Identifier        |
+------------------------------------+--------------------------+---------------+-------------------------+
| POST /api/wallet/create-order      | Cashfree Unconfigured    | 503           | PAYMENTS_NOT_CONFIGURED |
| POST /api/wallet/verify-payment    | Unpaid / Unconfigured    | 503 / 400     | PAYMENTS_NOT_CONFIGURED |
| POST /api/subscriptions/create-ord | Cashfree Unconfigured    | 503           | PAYMENTS_NOT_CONFIGURED |
| POST /api/subscriptions/verify-pay | Unpaid / Unconfigured    | 503 / 400     | PAYMENTS_NOT_CONFIGURED |
| POST /api/reports/order (Online)   | Cashfree Unconfigured    | 503           | PAYMENTS_NOT_CONFIGURED |
| POST /api/reports/verify-generate  | Unpaid / Unconfigured    | 503 / 400     | PAYMENTS_NOT_CONFIGURED |
| POST /api/cashfree/create-order    | Cashfree Unconfigured    | 503           | CASHFREE_NOT_CONFIGURED |
| POST /api/cashfree/verify-order    | Unpaid / Unconfigured    | 503 / 400     | PAYMENT_NOT_COMPLETED   |
| POST /api/webhooks/cashfree        | Unconfigured / Bad Sig   | 400           | INVALID_SIGNATURE       |
| POST /api/webhooks/razorpay        | All Requests (Retired)   | 410           | GATEWAY_RETIRED         |
+------------------------------------+--------------------------+---------------+-------------------------+
```

### Detailed Endpoint Analysis:

#### 2.1 Wallet Recharges (`/api/wallet/create-order`)
- Direct balance modification via deprecated `/api/wallet/recharge` is blocked with HTTP 400 `DEPRECATED_ENDPOINT`.
- When creating an order, if `!isCashfreeConfigured()`, returns:
  ```json
  {
    "error": "PAYMENTS_NOT_CONFIGURED",
    "message": "Online payments are currently unconfigured. Please contact support or try again later.",
    "gateway": "CASHFREE"
  }
  ```
- No order record is inserted into `paymentOrders`, preventing downstream order verification hijacking.

#### 2.2 Subscriptions (`/api/subscriptions/create-order` & `/verify-payment`)
- Order creation fails closed with HTTP 503 when gateway is missing.
- Verification checks:
  1. `order.userId === sessionUser.id` (User ownership).
  2. `order.productType === 'SUBSCRIPTION'` (AV-SEC-02 cross-product replay guard).
  3. `order.productId === targetTier` (Tier mismatch guard).
  4. `order.amount === expectedRupees` (Tamper guard).
  5. Gateway check: if order is unpaid and Cashfree is unconfigured, returns HTTP 503 without mutating `subscriptionTier`.

#### 2.3 Report Ordering & PDF Generation (`/api/reports/order` & `/verify-and-generate`)
- For gateway orders: fails closed with HTTP 503 `PAYMENTS_NOT_CONFIGURED`.
- For Wallet payments: requires `dbUser.walletBalance >= pricing.finalPriceRupees`; debits balance transactionally.
- Verification checks:
  1. Validates report ownership.
  2. Enforces `order.productType === 'REPORT'`.
  3. Enforces `order.productId === productId`.
  4. Requires confirmed payment settlement from Cashfree before invoking `ReportDocumentGenerator`.

---

## 3. PRESERVATION OF ACCESSIBLE FUNCTIONALITY

Missing Cashfree credentials do NOT disable the non-monetary functions of AstroVerse AI:
- **Public & Guest Tools:** Free Janam Kundli D1 Rashi chart, Nirayana planetary coordinates, daily Panchang, and 24-hour planetary Horas function continuously.
- **Catalogue & Pricing Transparency:** Product cards, chapter outlines, and subscription pricing matrices remain visible and accurately priced.
- **Existing Paid Entitlements:** Users who previously purchased reports or subscriptions retain full read access to their stored reports in `#modal-report-reader`.
- **Wallet Debit Workflow:** Registered users with existing wallet balances can continue purchasing reports without gateway involvement.
- **Admin Preview Test Harness:** Super Administrators can test all report publications and layouts using isolated Demo credits or preview sessions.

---

## 4. SECURITY AUDIT INVARIANTS CERTIFIED

1. **No Fake Paid Records:** No synthetic order marked `PAID` is generated during failure modes.
2. **Timing-Safe Rejection:** Signature verification failures reject before database lookups to prevent side-channel timing attacks.
3. **No Memory Leaks or Freezes:** Off-screen PDF generation cleans up object URLs and detached DOM elements.
