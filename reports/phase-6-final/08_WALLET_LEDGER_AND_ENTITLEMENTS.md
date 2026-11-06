# ASTROVERSE AI — PHASE 6.3 WALLET LEDGER, BALANCE INTEGRITY & ENTITLEMENTS

**Document Reference:** `reports/phase-6-final/08_WALLET_LEDGER_AND_ENTITLEMENTS.md`  
**Classification:** Financial Systems, Double-Entry Ledger & Entitlement Engine Audit  
**Status:** PASS — ZERO DRIFT & ATOMIC TRANSACTIONAL FULFILMENT  

---

## 1. Wallet Ledger Architecture & Balance Proof

AstroVerse implements an append-only double-entry wallet ledger where user wallet balances are derived transactionally:
$$\text{Wallet Balance} = \sum \text{Credits} - \sum \text{Debits}$$

Every monetary unit is stored and calculated strictly in integer paise ($1\text{ INR} = 100\text{ paise}$).

### Balance Segregation: Real Money vs Promotional Credits
To protect platform finances, balances are maintained in two distinct ledger buckets:
1. **Withdrawable / Real Money Balance:** Derived strictly from Cashfree payment gateway settlements (net of GST).
2. **Promotional Bonus Balance:** Derived from promo packs (e.g. +₹10 on ₹100 pack) and system bonuses. Marked with `is_promotional: true`.
   - Usable for in-app consultation and premium report purchases.
   - Non-refundable, non-withdrawable, and non-convertible to cash.
   - Segregated from gross gateway captured revenue in administrative accounting.

---

## 2. Wallet Transaction Lifecycle & Concurrency Invariants

| Invariant | Implementation Mechanism | Test Result |
| :--- | :--- | :---: |
| **Negative Balance Prevention** | Database `CHECK (balance >= 0)` constraint and transactional balance verification. | **PASS** |
| **Atomic Deduction** | `UPDATE wallets SET balance = balance - :deduct WHERE id = :id AND balance >= :deduct` | **PASS** |
| **Concurrent Race Conditions** | PostgreSQL row-level locking (`SELECT ... FOR UPDATE`) during session settlement. | **PASS** |
| **Double Credit Prevention** | Unique constraint on `(provider, providerPaymentId)` in `wallet_transactions`. | **PASS** |
| **Aborted Transaction Recovery** | Savepoints used in multi-step settlements; unhandled errors trigger clean `ROLLBACK`. | **PASS** |

---

## 3. Premium Report Entitlement Activation via Wallet

When a customer unlocks a premium report using wallet credits:
1. Customer requests `POST /api/wallet/unlock-report { reportType: "REP-LIFE-HOROSCOPE" }`.
2. Server verifies available balance ($\ge \text{₹}499.00$).
3. Atomic transaction:
   - Debits 49,900 paise from customer wallet balance.
   - Inserts debit entry into `wallet_transactions` (`type: "REPORT_PURCHASE"`).
   - Inserts active entitlement into `customer_entitlements` (`sku: "ENT_REPORT_LIFE_HOROSCOPE", expiresAt: null`).
   - Flags saved report as `is_unlocked: true`.
4. If any step fails, the entire transaction rolls back; no balance is deducted and no partial entitlement is granted.
