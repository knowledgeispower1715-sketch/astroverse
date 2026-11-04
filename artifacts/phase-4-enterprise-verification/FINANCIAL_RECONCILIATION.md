# FINANCIAL RECONCILIATION & ACCOUNTING TRUTH AUDIT

**Target Subsystem:** Payment Gateway, Wallet Ledger, and Monetization Accounting  
**Authoritative Currency:** INR (Indian Rupee)  
**Authoritative Storage Precision:** Integer Paise ($1\text{ INR} = 100\text{ paise}$)  
**Ledger Invariant:** $\text{Wallet Balance} = \sum(\text{Credits}) - \sum(\text{Debits})$

---

## 1. Integer Paise & Accounting Precision Standards

### Rules Enforced:
1. **Zero Floating-Point Leakage:** All internal calculations, ledger entries, and payment orders operate on exact integer paise (`amountPaise`).
2. **Strict Input Validation:** Decimal inputs (e.g. `250.00`) are parsed using bounded string/integer arithmetic. Inputs with fractional paise (e.g. `250.005`) are rejected immediately with HTTP 400 `INVALID_AMOUNT`.
3. **Immutable Wallet Ledger:** Every balance modification creates an append-only `WalletLedger` row with a cryptographically unique `idempotencyKey`. Updating or deleting ledger entries is strictly prohibited by RLS and database triggers.
4. **Reconciliation Proof:** Running balance is verified against ledger entries:
   ```sql
   SELECT u.id, u."walletBalance", COALESCE(SUM(l.amount), 0) as ledger_balance
   FROM "User" u
   LEFT JOIN "WalletLedger" l ON l."userId" = u.id
   GROUP BY u.id;
   ```
   Zero balance divergence observed across all test accounts.

---

## 2. Revenue Segregation Matrix

| Revenue Category | Data Source | Included in Paid Revenue | Included in Float Liability | Description |
|---|---|---|---|---|
| **Captured Customer Payments** | `PaymentOrder` (PAID) | **YES** | No | Real funds received via Cashfree |
| **Pending Payments** | `PaymentOrder` (CREATED) | **NO** | No | Awaiting bank/UPI settlement |
| **Failed Payments** | `PaymentOrder` (FAILED) | **NO** | No | Dropped or rejected transactions |
| **Completed Refunds** | `PaymentOrder` (REFUNDED) | **DEDUCTED** | No | Reversed funds returned to customer |
| **Pending Refunds** | `RefundRecord` (PENDING) | **NO** | **YES** | Liability earmarked for settlement |
| **Customer Wallet Balance** | `User.walletBalance` | No | **YES** | Outstanding customer purchasing power |
| **Promotional Credits** | `WalletLedger` (PROMO) | **NO** | **YES** | Platform-subsidized balance grants |
| **Complimentary Subscriptions**| `Entitlement` (ADMIN) | **NO** | No | Zero-rupee admin feature unlocks |
| **Paid Report Purchases** | `PaymentOrder` (REPORT) | **YES** | No | Direct unlocked prediction reports |
| **Consultation Earnings** | `WalletLedger` (CREDIT) | **DEDUCTED** | **YES** | Due payable to astrologers |

---

## 3. Financial Reconciliation Invariant Results

- `custom_wallet_recharge.test.ts` (Section 4 & 5): **PASS** (Recharging ₹250 pack credits exactly ₹285.00 via integer paise; ₹1.00 custom recharge credits exactly ₹1.00; duplicate execution returns existing balance).
- `phase_3_1_enterprise_adversarial.test.ts` (Section 8): **PASS** (Zero floating-point rounding errors across all SKU tiers).
- Direct tampering with altered amount is rejected with `AMOUNT_MISMATCH`.
- Reconcile balance query matches ledger sum with $\Delta = 0.00$.
