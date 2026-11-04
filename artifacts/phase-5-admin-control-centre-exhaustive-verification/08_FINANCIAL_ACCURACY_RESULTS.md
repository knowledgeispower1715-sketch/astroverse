# 08. FINANCIAL & COMMERCIAL ACCURACY AUDIT RESULTS

**Target Application:** AstroVerse AI  
**Release Target:** Phase 5 — Exhaustive Admin Control Centre Audit & Remediation  
**Gateway Integration:** Cashfree Payments Protocol 2026-01-01  
**Arithmetic Precision:** Exact Arbitrary-Precision String Decimals & Integer Paise Calculations  

---

## 1. Monetary Precision & Aggregation Architecture

1. **Elimination of IEEE 754 Floating-Point Loss:**
   - PostgreSQL queries execute arbitrary-precision formatting:
     ```sql
     to_char(COALESCE(sum("amount"), 0), 'FM999999999990.00')
     ```
   - In JavaScript, calculations are conducted in integer paise (`Math.round(rupees * 100)`), completely eliminating binary float rounding errors.
   - Frontend `formatMoney(v)` formats exact strings without float coercion.

2. **Commercial Revenue vs Liability Classification:**
   - **Captured Payment:** Direct customer cash paid via gateway and cleared in webhook (`OrderStatus.PAID`).
   - **Authorized Payment:** Temporary hold before settlement (`OrderStatus.ACTIVE`). Not counted as settled revenue.
   - **Pending Payment:** Order initiated with gateway, awaiting completion (`OrderStatus.PENDING`).
   - **Failed Payment:** User dropped or gateway rejected (`OrderStatus.FAILED`).
   - **Wallet Liability:** Customer prepaid deposit (`WalletLedger` type `RECHARGE`). Held as an unearned liability until consumed for consultations or reports.
   - **Complimentary Credit:** Admin demo or testing grant (`WalletLedger` type `DEMO_CREDIT`). Strictly separated from real customer balances and marked with synthetic watermarks.
   - **Promotional Discount:** Subtracted prior to order creation (`Promotion.discountAmount`). Never counted as captured customer revenue.
   - **Consultation Revenue:** Deducted from wallet ledger on completed consultation session (`WalletLedger` type `CONSULTATION_DEBIT`).
   - **Report Revenue:** Directly purchased SKU revenue or debited wallet balance (`WalletLedger` type `REPORT_PURCHASE`).

---

## 2. Refund State Machine & Idempotency

The Cashfree refund state machine enforces atomic transitions:
`NONE` → `PENDING` → `PROCESSED` (or `FAILED` / `REJECTED`)

| Order State | Requested Refund Type | Validation Rule | Ledger Effect | State Machine Transition | Result |
|:---|:---|:---|:---|:---|:---:|
| `PAID` (₹295.00) | Full Refund (₹295.00) | Order is `PAID`, no prior refunds | Reverses credit, records `REFUND` debit | `RefundState.PROCESSED` | **PASS** |
| `PAID` (₹295.00) | Partial Refund (₹100.00) | Cumulative refund <= original amount | Deducts ₹100.00, updates refund ledger | `RefundState.PARTIALLY_REFUNDED` | **PASS** |
| `PAID` (₹295.00) | Excess Refund (₹350.00) | Cumulative refund exceeds paid amount | Rejected with `HTTP 400 REFUND_EXCEEDS_ORDER` | State unchanged (`NONE`) | **PASS** |
| `PENDING` | Any Refund | Cannot refund unsettled orders | Rejected with `HTTP 400 INVALID_ORDER_STATE` | State unchanged | **PASS** |
| `PAID` | Duplicate Refund Request | Idempotency key match | Reuses existing refund record, no double-debit | Idempotent response | **PASS** |

---

## 3. GST Calculation & Pricing Authority

- **Server-Authoritative Pricing:** Client-supplied prices cannot override canonical catalog prices (`ProductCatalog`).
- **GST Rate:** Fixed at 18% integer paise:
  - Custom ₹1.00 recharge: 100 paise base + 18 paise GST = 118 paise total payable (₹1.18 payable, ₹1.00 wallet credit).
  - Preset ₹100 pack: ₹100 base + ₹18 GST = ₹118 payable, ₹10 promotional bonus = ₹110 wallet credit.
  - Preset ₹250 pack: ₹250 base + ₹45 GST = ₹295 payable, ₹35 promotional bonus = ₹285 wallet credit.
  - Preset ₹500 pack: ₹500 base + ₹90 GST = ₹590 payable, ₹100 promotional bonus = ₹600 wallet credit.
- **Cryptographic Webhook Validation:**
  - HMAC-SHA256 signature calculated over raw request body using `x-webhook-signature` and `x-webhook-timestamp`.
  - Stale webhooks (> 5 min skew) or forged signatures are rejected with `HTTP 401 INVALID_SIGNATURE`.
