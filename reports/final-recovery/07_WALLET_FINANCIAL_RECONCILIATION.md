# ASTROVERSE AI — WALLET AND FINANCIAL SYSTEM FULL RECONCILIATION REPORT

**Report ID:** `AV-REP-FIN-20261106-07`  
**Classification:** Financial System Architecture, Ledger Integrity & Revenue Separation  
**Date:** `2026-11-06T16:08:00+05:30`  
**Architecture:** Double-Entry Ledger, Exact Integer Paise Storage, PostgreSQL NUMERIC(14,2)

---

## 1. END-TO-END FINANCIAL TRANSACTION TRACE

Every payment in AstroVerse AI follows an unbroken, immutable audit trail:

```text
[Customer Wallet Modal]
       │
       ▼
[Server Price Resolution: Base + 18% GST]
       │
       ▼
[db.createPaymentOrder: Status CREATED, amountPaise: 118]
       │
       ▼
[Cashfree API v6 POST /orders: payment_session_id]
       │
       ▼
[Customer Checkout via Cashfree Drop-in SDK]
       │
       ▼
[Cashfree Webhook POST /api/wallet/webhook]
       │
       ▼
[HMAC-SHA256 Signature Verification: x-webhook-signature]
       │
       ▼
[Deduplication Check: Event ID & Payment ID in ProcessedEvent Table]
       │
       ▼
[db.rechargeWallet: Atomically inside PostgreSQL Transaction]
  ├── Update PaymentOrder: Status COMPLETED, paidAt: now()
  ├── Insert WalletTransaction: Type CREDIT, amount: baseAmount
  ├── Update User: walletBalance += baseAmount
  └── Insert AuditEvent: Action PAYMENT_COMPLETED
```

---

## 2. MONETARY PRECISION & REVENUE SEPARATION INVARIANTS

### 2.1 Integer Paise & IEEE 754 Elimination
* **Zero Floating-Point Accumulation:** All monetary amounts are converted to integer paise (`Math.round(amount * 100)`) before any calculation or comparison.
* **Database Field Types:** Stored as `Decimal(14,2)` in PostgreSQL Prisma models (`WalletTransaction.amount`, `PaymentOrder.amount`, `User.walletBalance`).

### 2.2 Strict Revenue Accounting Boundaries
1. **Wallet Balance ≠ Platform Revenue:** Unused customer wallet credits represent unearned merchant liabilities, never recognized as revenue.
2. **Complimentary Grants ≠ Revenue:** Admin manual credit adjustments and promotional credits are tagged with `isComplimentary: true` and excluded from gross revenue metrics.
3. **GST Segregation:** 18% statutory GST (CGST 9% + SGST 9%) is segregated at invoice generation and omitted from net product margin metrics.
4. **Pending Authorizations:** Orders with status `CREATED` or `ACTIVE` are strictly excluded from captured sales figures.
