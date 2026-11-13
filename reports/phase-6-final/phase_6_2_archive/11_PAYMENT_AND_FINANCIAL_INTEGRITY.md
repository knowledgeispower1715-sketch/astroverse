# PHASE 6.2 — STAGE H: COMMERCIAL PAYMENT & FINANCIAL INTEGRITY

**Evaluator:** Senior Payments Architect & Financial Systems Engineer  
**Evaluation Date:** 2026-11-06T01:50:50+05:30  
**Payment Gateway Provider:** Cashfree Payments v6 (API Version `2026-01-01`)  
**Monetary Standard:** Authoritative Integer Paise Arithmetic (1 INR = 100 Paise)  

---

## 1. Mathematical Rigor & Anti-Drift Guarantees

All monetary balances, order amounts, tax amounts, and ledger entries are computed and persisted in integer paise:
- **Base Custom Amount:** ₹1.00 = 100 paise.
- **GST (18% Statutory):** 100 paise * 0.18 = 18 paise.
- **Payable Total:** 118 paise (₹1.18).
- **Wallet Credit:** Exactly 100 paise (₹1.00).

No JavaScript binary floating-point operations (`0.1 + 0.2 = 0.30000000000000004`) are permitted in financial settlement calculation paths. All calculations use `Math.round(amountPaise)` or BigInt integer math.

---

## 2. Separation of Financial Liabilities vs Captured Revenue

AstroVerse enforces strict ledger separation between:
1. **Captured Real Revenue:** Real money received via Cashfree gateway (orders, subscriptions, direct purchases).
2. **Promotional & Bonus Credits:** Complimentary promotional credits (e.g. ₹35 bonus on ₹250 pack) tracked as platform promotional expense liabilities; **NEVER** recognized as captured gross gateway revenue.
3. **Wallet Liabilities:** Outstanding unspent customer wallet balances maintained as balance-sheet customer liabilities.
4. **Consultation Revenue:** Per-minute deductions split between astrologer earnings and platform commission upon session completion.

---

## 3. Order Lifecycle & Idempotency Safeguards

Flow:
`Server Price Resolution → Immutable Order Snapshot → Cashfree Order Creation → Client Payment → Webhook Delivery → HMAC Validation → Atomic Transaction (Prisma) → Wallet Balance / Entitlement Grant`

- **Price Authority:** Client-submitted prices are discarded; order values resolve strictly from `CANONICAL_PRODUCT_CATALOGUE`.
- **Replay Protection:** Unique constraint on `PaymentOrder.referenceId` and `WalletLedger.idempotencyKey` prevents duplicate balance crediting on replayed webhook events.

---

## 4. Stage H Verification Verdict
**PASS:** Financial calculations, integer paise precision, revenue segregation, Cashfree sandbox workflows, and ledger idempotency are verified without defects.
