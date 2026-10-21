# AstroVerse — Premium Entitlements & Catalog Specification

**Date:** October 21, 2026  
**Auditor:** Principal Software Architect, Senior Product Strategist & Financial Systems Architect  
**Service:** `services/wallet-service` (Prisma SQLite, Double-Entry Ledger)

---

## 1. Entitlement Key Hierarchy & Catalog

AstroVerse enforces an explicit server-authoritative entitlement catalog. Users access premium capabilities through persistent entitlement records tied to their authenticated account.

| Entitlement Key | Name | Price (INR) | Type | Duration / Scope | Features Unlocked |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `FREE_TIER` | Vedic Traveler | ₹0 | Base | Permanent | D1 Chart, Planetary Table, Active Hora, 24h Schedule, Basic Daily Horoscope, 2 Free AI Queries |
| `DOSSIER_45P` | Full Vedic Dossier | ₹49 | One-Time Purchase | Permanent (Tied to Account) | 45-Page Comprehensive Report, D9, D10, Chalit, Vimshottari 120y Table, Jaimini Karakas, KP Cusps, Shadbala, Classical Yogas, Remedies & Gemstones |
| `PREMIUM_MONTHLY` | AstroVerse Pro (Monthly) | ₹299 / mo | Recurring Subscription | 30 Days | Unlimited 9-Section Multi-Horizon Reports (Hourly to Yearly), Monthly Life Map, Cloud Sync, Priority Generation |
| `PREMIUM_ANNUAL` | AstroVerse Pro (Annual) | ₹1,999 / yr | Recurring Subscription | 365 Days | All Monthly Pro features + Tajika Annual Solar Return Report, 5-Year Dasha Arc, Family Profile Storage (up to 5 profiles) |
| `CONSULT_ACHARYA` | Acharya Shastri Live | ₹15 / min | Metered Usage | Real-Time Deduction | Live 1-on-1 AI Consultation with Senior Parashari Master (Career & Wealth focus) |
| `CONSULT_RADHIKA` | Dr. Radhika Sharma Live | ₹20 / min | Metered Usage | Real-Time Deduction | Live 1-on-1 AI Consultation with KP & Relationship Specialist |
| `CONSULT_ANAND` | Pandit Anand Varma Live | ₹18 / min | Metered Usage | Real-Time Deduction | Live 1-on-1 AI Consultation with Prashna & Remedial Master |

---

## 2. Server-Authoritative Lifecycle & Validation

### A. Purchase Flow
```
User selects "Unlock Dossier for ₹49"
               |
               v
Client sends POST /api/wallet/deduct
{ "amount": 49, "reason": "Unlocked Full 45-Page Vedic Dossier", "featureKey": "DOSSIER_45P" }
               |
               v
Server verifies:
1. Is user authenticated? (Valid Bearer token)
2. Is wallet balance >= ₹49?
3. Has user already purchased DOSSIER_45P for this profile?
               |
               v
Atomic Prisma Transaction:
- Decrement user wallet balance by 49
- Create Transaction ledger record (DEBIT, ₹49, "Unlocked Full 45-Page Vedic Dossier")
- Upsert Entitlement record (userId, featureKey: "DOSSIER_45P", status: "ACTIVE")
- Record AuditEvent (WALLET_DEBIT)
               |
               v
Return HTTP 200 { success: true, newBalance: X, entitlement: "ACTIVE" }
```

### B. Pre-Execution Entitlement Check
Before generating or rendering a premium report:
1. Client requests report with session token.
2. Server validates `user.entitlements.includes("DOSSIER_45P")` or `user.subscription.status === "ACTIVE"`.
3. If not entitled, server returns `HTTP 403 Forbidden` with `{ error: "ENTITLEMENT_REQUIRED", requiredKey: "DOSSIER_45P" }`.

---

## 3. Double-Entry Accounting & Ledger Immutability

1. **Immutable Records:** All balance changes are written to the `Transaction` table. No balance is ever modified without a paired transaction record.
2. **Audit Logging:** Security-sensitive events (recharges, administrative adjustments, entitlement grants) are logged to `AuditEvent`.
3. **No Negative Balances:** All debit operations enforce `WHERE walletBalance >= amount` at the database level.
4. **Tenant Isolation:** Birth profiles and saved reports are scoped by `userId`. Tenant A cannot inspect or delete Tenant B's purchased reports.
