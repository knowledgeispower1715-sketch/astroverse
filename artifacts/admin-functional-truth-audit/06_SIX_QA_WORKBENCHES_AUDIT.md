# ASTROVERSE AI — SIX QA WORKBENCHES AUDIT

**Mission:** Complete Admin Control Centre Functional Truth Audit, Real Data Integrity & Enterprise Remediation  
**Date:** 2026-11-04  
**Author:** Principal Full-Stack Engineer, Jyotish Calculation Specialist & Senior QA Director  

---

## 1. Architectural Role of QA Workbenches

The 6 administrative test workbenches provide comprehensive operational validation of AstroVerse's core Jyotish ephemeris, AI consultation, numerology, report generation, and billing simulation engines without mutating production customer records or distorting live financial ledgers.

Every single workbench carries explicit `.provenance-synthetic` (`SYNTHETIC TEST FIXTURE`) or `.provenance-demo` (`DEMO SANDBOX`) badges.

---

## 2. Detailed Workbench Verification

### 1. Kundli & Divisional Charts Test Harness (`#admin-tool-kundli`)
- **Active Benchmark Native:** Synthetic Vedic Benchmark Native (DOB: 1995-10-24 14:05:00 IST, Jabalpur, 23.17° N, 79.95° E, TZ: 5.5).
- **Lagna & Planetary Dignities (D1):**
  - Ascendant (Lagna): Scorpio (Vrishchika 24.17°)
  - Moon: Aquarius (Kumbha 12.21° H4)
  - Mars: Aries (Mesha 18.29° Swakshetra H6 - Ruchaka Yoga mitigated)
  - Sun: Leo (Simha 3.50° Swakshetra H10 - Digbala)
  - Jupiter: Virgo (Kanya 22.46° H11)
  - Venus: Virgo (Kanya 28.10° Neecha H11 - Neechabhanga in D9)
  - Saturn: Cancer (Karka 8.12° H9)
  - Rahu / Ketu: Aries 21.05° / Libra 21.05°
- **Divisional Gating & Unlocks:**
  - **D9 Navamsha:** Gated on `FREE` tier with simulated paywall banner; Unlocked on `PLUS` and `PREMIUM` displaying Gemini (Mithuna 7.33°) Navamsha Lagna and Taurus Venus Vargottama.
  - **D10 Dashamsha:** Gated on `FREE` and `PLUS`; Unlocked exclusively on `PREMIUM` displaying Leo (Simha 12.45°) D10 Lagna and Sun in 10th Digbala.
  - **Upagrahas & Kalavelas:** Gated on `FREE`; Unlocked on `PLUS` and `PREMIUM` verifying Parashari diurnal sunrise portions (Mandi 14°12' Leo, Gulika 26°48' Leo, Yamaghantaka 18°30' Aries, Ardhaprahara 9°06' Cancer, Kaala 3°24' Virgo).
- **Provenance Classification:** `SYNTHETIC TEST FIXTURE` (Labeled visibly).

### 2. Six-Horizon Guidance & Mahadasha Harness (`#admin-tool-forecasts`)
- **Horizons Tested:**
  1. *Hourly Hora:* Unlocked on all tiers; active planetary hora (Mars), favorable/caution guidance.
  2. *Daily 24-Hour:* Unlocked on all tiers; Moon in Shatabhisha (Aquarius H4), Rahu Kaal window (1:45 PM – 3:15 PM).
  3. *Weekly 7-Day:* Gated on `FREE`; Unlocked on `PLUS` and `PREMIUM`; multi-day transit progression (Mon-Tue H4, Wed-Thu H5, Fri-Sun H6).
  4. *Monthly Calendar:* Gated on `FREE`; Unlocked on `PLUS` and `PREMIUM`; 4-week lunar cycle impacts.
  5. *Yearly Solar Transit:* Gated on `FREE` and `PLUS`; Unlocked exclusively on `PREMIUM`; major Saturn and Jupiter transit vectors.
  6. *Mahadasha Life Arc:* Gated on `FREE` and `PLUS`; Unlocked exclusively on `PREMIUM`; Vimshottari Mahadasha timeline (Jupiter-Venus period).
- **Provenance Classification:** `SYNTHETIC TEST FIXTURE` (Labeled visibly).

### 3. AI Astrologer Consultation & Quota Harness (`#admin-tool-ai-astrologer`)
- **Fictional AI Personas Tested:**
  - *Acharya Devratan:* Parashari Jyotish, Career Architecture & Dhana Yogas (Languages: English, Hindi).
  - *Dr. Sunita Shastri:* Jaimini Jyotish, Chara Karakas, Relationship & D9 Synastry (Languages: Hindi, Sanskrit, English).
  - *Pandit Raghavendra:* Classical Yogas, Wealth, Arudha & Remedial Jyotish (Languages: English, Hindi, Telugu).
- **Quota Persistence & Enforcement:**
  - Free: 3 daily questions
  - Plus: 15 daily questions
  - Premium: 30 daily questions
  - Concurrency safety: Atomic `consumeQuery()` ledger bounded by `Asia/Kolkata` midnight.
- **Provenance Classification:** `DEMO SANDBOX` (Labeled visibly).

### 4. Numerology Studio & Entitlement Gating Harness (`#admin-tool-numerology`)
- **Calculations Verified:** Deterministic reduction on full name and birth date:
  - Life Path Number (Date of Birth reduction)
  - Destiny / Expression Number (Full Name letter values via Pythagorean/Chaldean systems)
  - Soul Urge / Heart's Desire Number (Vowels reduction)
  - Personality Number (Consonants reduction)
- **Provenance Classification:** `SYNTHETIC TEST FIXTURE` (Labeled visibly).

### 5. Reports Catalogue & PDF Reader Test Harness (`#admin-tool-reports`)
- **10 Canonical Report SKUs Verified:**
  1. `report_career_education` (₹149 / 14,900 paise)
  2. `report_love_marriage` (₹149 / 14,900 paise)
  3. `report_kundli_deep_dive` (₹199 / 19,900 paise)
  4. `report_wealth_finance` (₹149 / 14,900 paise)
  5. `report_health_vitality` (₹149 / 14,900 paise)
  6. `report_panchang_varshphal` (₹149 / 14,900 paise)
  7. `report_dosha_remedy` (₹149 / 14,900 paise)
  8. `report_gemstone_rudraksha` (₹149 / 14,900 paise)
  9. `report_numerology` (₹99 / 9,900 paise)
  10. `report_spiritual_moksha` (₹149 / 14,900 paise)
- **Member Discounts:** Free: 0%, Plus: 10% OFF, Premium: 20% OFF (and unlimited online viewing).
- **In-Browser Sample Reader:** Reads chapters with Devanagari text rendering and divisional chart SVGs.
- **PDF Download Gating:** Gated on `FREE`; Unlocked on `PLUS` and `PREMIUM`.
- **Provenance Classification:** `DEMO CATALOGUE` (Labeled visibly).

### 6. Billing Simulation & Isolated Demo Wallet Harness (`#admin-tool-billing`)
- **Isolated Balance:** `currentDemoWalletBalance` (Initialized to ₹500.00, top-up +₹1,000 Demo, reset to ₹500.00).
- **Checkout Simulation:** Simulates purchasing any report SKU with member discount, deducting from demo balance.
- **Isolation Guarantee:** Zero database `PaymentOrder` or `WalletLedger` mutations. Transactions are confined to client sessionStorage/localStorage and never leak into `getPlatformMetrics()` or financial analytics.
- **Provenance Classification:** `DEMO SANDBOX` (Labeled visibly).
