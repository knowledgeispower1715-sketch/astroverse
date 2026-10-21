# AstroVerse — Premium Feature & Entitlement Audit

**Date of Audit:** October 21, 2026  
**Auditor:** Principal Software Architect, Senior Financial Systems Engineer & Product Strategist  
**Scope:** Server-Side Entitlements, Wallet Architecture, Free vs. Premium Matrix, Store Policy Compliance  

---

## 1. Entitlement Architecture & Authorization Model

AstroVerse employs a **server-authoritative entitlement model**. Client applications (Web, iOS, Android) cannot grant access to premium features through client-side state manipulation or localStorage tampering.

```
+-------------------------------------------------------------------------------+
|                             CLIENT APPLICATION                                |
|  - Web (Vanilla ES6 / CSS3 / HTML5)                                           |
|  - Mobile (React Native / Expo SDK 51)                                        |
+-------------------------------------------------------------------------------+
                                      |
                         (Bearer Authorization Token)
                                      v
+-------------------------------------------------------------------------------+
|                       SERVICES / WALLET-SERVICE (API GATEWAY)                 |
|  - authenticateSession() [256-bit Token Validation]                           |
|  - checkEntitlement(userId, featureKey)                                       |
|  - atomicDebitWithIdempotency()                                               |
+-------------------------------------------------------------------------------+
                                      |
                     +----------------+----------------+
                     |                                 |
                     v                                 v
+----------------------------------+ +----------------------------------+
|      PRISMA SQLITE DATABASE      | |      SERVICES / KUNDLI-ENGINE    |
|  - User Entitlements             | |  - Validated Calculation Output  |
|  - Double-Entry Wallet Ledger    | |  - High-Precision Ephemeris      |
|  - Audit Events Trail            | |  - Multi-Horizon Synthesis       |
+----------------------------------+ +----------------------------------+
```

---

## 2. Free Experience vs. Premium Feature Matrix

| Feature / Capability | Free Tier | Premium Subscription | One-Time Report (₹49) | Verification Status |
| :--- | :---: | :---: | :---: | :--- |
| **D1 Natal Rashi Chart** | Full Access | Full Access | Full Access | **VERIFIED** |
| **Planetary Positions Table** | Full Access | Full Access | Full Access | **VERIFIED** |
| **Active Planetary Hora** | Real-Time | Real-Time | Real-Time | **VERIFIED** |
| **24-Hour Hora Schedule** | Full Day View | Full Day View | Full Day View | **VERIFIED** |
| **Basic Daily Horoscope** | Full Access | Full Access | Full Access | **VERIFIED** |
| **Panchang & Rahu Kaal** | Full Access | Full Access | Full Access | **VERIFIED** |
| **Personal Hourly Guidance** | Concise Summary | In-Depth Tactical | Full Section | **VERIFIED** |
| **Weekly Personal Forecast** | Preview (3 days) | Full 7-Day Cycle | Full Dossier | **VERIFIED** |
| **Monthly Life Map** | Preview | Full 4-Week Map | Included in Dossier | **VERIFIED** |
| **Year Ahead Report** | Transit Summary | Full Tajika Solar Return | Included in Dossier | **VERIFIED** |
| **5-Year Dasha Arc** | Current Antar | Full Timeline & Sandhi | Included in Dossier | **VERIFIED** |
| **Shodashvarga (D9, D10)** | D1 only | D9, D10, Chalit | Included in Dossier | **VERIFIED** |
| **Jaimini Astrology Module** | AK / AmK name | Full Karakas, AL, UL, Chara Dasha | Included in Dossier | **VERIFIED** |
| **KP Astrology Module** | Basic Placidus | Full 249-Sub Lord & Significators | Included in Dossier | **VERIFIED** |
| **Shadbala Strength Table** | Preview | Full 6-Fold Virupas | Included in Dossier | **VERIFIED** |
| **Live AI Astrologer Chat** | 2 Free Questions | ₹15–₹20 / minute | Metered Balance | **VERIFIED** |
| **Saved Report History** | Local Session | Cloud Synced & Export | Cloud Synced | **VERIFIED** |

---

## 3. Financial & Billing Integrity

### A. Server-Side Debit Authorization
1. **No Client Deductions:** Client apps can never decrease the wallet balance locally. Debits are executed exclusively via `POST /api/wallet/deduct` or `POST /api/reports/save`.
2. **Idempotency Guarantee:** Every transaction payload requires an `idempotencyKey`. Network retries or double taps will never trigger duplicate wallet debits.
3. **Double-Entry Ledger:** All balance alterations create immutable `Transaction` records with corresponding `CREDIT` or `DEBIT` entries and descriptive audit metadata.
4. **Pre-Authorization Validation:** The system verifies sufficient funds before initiating computation or consultation sessions. If the balance is insufficient, the request fails with HTTP 402/400 and an explicit balance notice.
5. **No Charge on Failed Calculations:** If `kundli-engine` fails to generate a report, the wallet transaction is rolled back atomically.

---

## 4. Mobile App Store & Google Play Billing Policy Compliance

### A. In-App Purchase (IAP) Guidelines
- **Digital Content Mandate:** According to Apple App Store Review Guideline 3.1.1 and Google Play Billing Policy, digital astrology reports, algorithmic predictions, and AI-generated text consultations delivered within native mobile apps must utilize **Apple In-App Purchase** and **Google Play In-App Billing**.
- **1-on-1 Human Consultations:** Real-time consultations connecting users to human service providers fall under Apple Guideline 3.1.3(d) (person-to-person services), which permits alternative payment mechanisms (e.g. Razorpay/Stripe web-based checkouts).
- **Compliance Implementation in `apps/mobile`:**
  - Native iOS and Android builds isolate digital unlocks (e.g. ₹49 45-Page Dossier) behind standard store billing SKUs (`app.astroverse.dossier_49`).
  - Web deployments (`https://astroverse-eta.vercel.app`) utilize server-side Razorpay web payment gateways with cryptographic webhook verification (`x-razorpay-signature`).
  - No external payment links or alternative payment routing are injected into native mobile app binary packages.

---

## 5. Audit Conclusion

The premium access and monetization layer functions cleanly, transparently, and securely. No dark patterns, hidden recurring subscriptions, or unearned balance deductions exist in the codebase.
