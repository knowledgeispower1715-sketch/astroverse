# AstroVerse AI — Authoritative Product Catalogue & Pricing Architecture

**Author:** Principal Engineering Lead  
**Document Reference:** Deliverable 4 / Monetization Specification  
**Authoritative Code Source:** `services/wallet-service/src/monetization/catalog.ts`  
**Frontend Synchronization:** `index.html` (`ADMIN_REPORTS_DATA`, `REPORT_STORE_CATALOGUE`, `updateBuilderPriceEstimate`)  
**Date:** October 30, 2026  
**Status:** Reconciled, Verified & Mathematically Grounded  

---

## 1. Executive Principles & Pricing Boundaries

AstroVerse AI enforces strict, transparent, Indian-rupee-first monetization rules:
1. **Server-Authoritative Integer Currency:** All financial transactions, order requests, and wallet balances are stored and validated server-side in **integer paise** (₹1.00 = 100 paise) to eliminate floating-point rounding errors.
2. **Approved Bounded Range:** Individual report products range strictly between **₹49 and ₹499**. No unauthorized prices or artificial surcharges are permitted.
3. **No Hidden Subscription Gating for Purchases:** Every report product can be acquired individually without mandatory active recurring subscriptions.
4. **Member Discounts:** Subscribed members receive deterministic, server-enforced discounts on individual report purchases:
   - **Plus Tier:** 10% discount across all individual report products.
   - **Premium Tier:** 20% discount across all individual report products.

---

## 2. Canonical Report Product Catalogue (All 10 Canonical Products)

| # | Product ID | Canonical Display Name | Base Price (Paise) | Base Price (Rupees) | Plus Member Price (10% Off) | Premium Member Price (20% Off) | Target Horizon / Scope |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **0** | `report_basic_chart_summary` | Basic Chart Summary | `0` | **₹0 (Free)** | ₹0 | ₹0 | Foundational D1 Lagna, Moon sign & basic Panchang |
| **1** | `report_one_month_forecast` | One-Month Personalized Forecast | `4900` | **₹49** | ₹44 | ₹39 | Granular 30-day lunar transit triggers & auspicious dates |
| **2** | `report_career_education` | Career & Education Report | `14900` | **₹149** | ₹134 | ₹119 | 10th House, D10 Dashamsha, promotion & vocational timing |
| **3** | `report_relationship_marriage` | Relationship & Marriage Report | `14900` | **₹149** | ₹134 | ₹119 | 7th House Kalatra, D9 Navamsha partner archetypes & remedies |
| **4** | `report_kundli_milan` | Detailed Kundli Milan (Synastry) | `14900` | **₹149** | ₹134 | ₹119 | Full 36-Guna Ashtakoota matrix & cross-D9 compatibility |
| **5** | `report_remedial_gemstones` | Remedial Measures & Gemstone Blueprint | `14900` | **₹149** | ₹134 | ₹119 | Lagna-safe Ratna prescriptions, Devanagari Beej mantras & Yantras |
| **6** | `report_janam_kundli_deep_dive` | Complete Janam Kundli Deep Dive | `19900` | **₹199** | ₹179 | ₹159 | 25+ page life blueprint: D1–D60, Ashtakavarga, Shadbala, Dashas |
| **7** | `report_vedic_name_numerology` | Vedic Name Correction & Numerology Master Blueprint | `19900` | **₹199** | ₹179 | ₹159 | 15+ pages: Moolank, Bhagyank, Chaldean Naamank & 5 name alternatives |
| **8** | `report_twelve_month_varshphal` | Twelve-Month Varshphal (Annual Forecast) | `24900` | **₹249** | ₹224 | ₹199 | Tajika annual solar return & 12 calendar month breakdowns |
| **9** | `report_bundle_kundli_varshphal` | Complete Kundli + Varshphal Master Bundle | `39900` | **₹399** | ₹359 | ₹319 | Best-value bundle (saves ₹49 vs buying ₹199 + ₹249 separately) |
| **10** | `report_three_year_roadmap` | Three-Year Personal Roadmap | `49900` | **₹499** | ₹449 | ₹399 | Strategic 36-month macro horizon mapping major Dasha shifts |

---

## 3. Authoritative Subscription Tier Matrix

Subscription plans provide platform capabilities, calculation depth, and discount entitlements:

```
                                    SUBSCRIPTION PLANS
┌─────────────────────────────┬─────────────────────────────┬─────────────────────────────┐
│    AstroVerse Essentials    │       AstroVerse Plus       │     AstroVerse Premium      │
│          (FREE)             │          (₹149/mo)          │          (₹299/mo)          │
├─────────────────────────────┼─────────────────────────────┼─────────────────────────────┤
│ • 1 Active Birth Profile    │ • 3 Active Birth Profiles   │ • Up to 5 Active Profiles   │
│ • Basic D1 Rashi Chart      │ • D1, D9 Navamsha, D10      │ • Complete D1-D60 Vargas    │
│ • Basic Panchang & Horas    │ • Detailed Vimshottari      │ • Full 337 SAV & Shadbala   │
│ • 3 AI Questions / Day      │ • 15 AI Questions / Day     │ • 30 AI Questions / Day     │
│ • 0% Report Discount        │ • 10% Member Discount       │ • 20% Member Discount       │
│ • PDF Downloads Gated       │ • PDF Downloads Gated       │ • High-Res PDF Unlocked     │
│ • Web Reader Preview Only   │ • Web Reader Full Access    │ • Private Reader + Exports  │
└─────────────────────────────┴─────────────────────────────┴─────────────────────────────┘
```

### Detailed Plan Specifications:
1. **AstroVerse Essentials (FREE):**
   - Monthly Price: ₹0 | Annual Price: ₹0
   - Profiles: 1 active profile.
   - Calculation Capabilities: D1 Rashi chart, basic planetary longitudes, birth Nakshatra, basic 24-hour planetary horas, foundational Vimshottari Mahadasha.
   - AI Consultation: 3 substantive questions/day.
   - Report Privileges: Free preview of sample chapters in online reader. PDF file download is gated.
2. **AstroVerse Plus:**
   - Monthly Price: ₹149.00 (`14900` paise) | Annual Price: ₹1,299.00 (`129900` paise, ~₹108/mo).
   - Profiles: 3 active profiles.
   - Calculation Capabilities: D1, D9 Navamsha (marriage & soul), D10 Dashamsha (career), detailed 3-tier Vimshottari Dasha (Mahadasha, Antardasha, Pratyantardasha).
   - AI Consultation: 15 substantive questions/day.
   - Report Privileges: 10% discount on all individual report purchases; full access to private online reader.
3. **AstroVerse Premium:**
   - Monthly Price: ₹299.00 (`29900` paise) | Annual Price: ₹2,499.00 (`249900` paise, ~₹208/mo).
   - Profiles: 5 authorized profiles.
   - Calculation Capabilities: Complete Shodashavarga (all 16 divisional charts D1 through D60), complete 337-Bindu Sarvashtakavarga matrix, Six-Fold Shadbala potency in Rupas, 11 classical Upagrahas, Prashna Tantra, Tamil Pancha Pakshi biorhythms, and full Vedic Name Correction Studio.
   - AI Consultation: 30 substantive questions/day.
   - Report Privileges: 20% discount on all report purchases; high-resolution multi-page PDF compilation and physical file downloads unlocked.

---

## 4. Reconciliation of Synthetic Test Harness Pricing vs. Public Catalogue

### The Synthetic Discrepancy Explained
In the supplied video forensic audit (`media_1793314292460_501052cf.mp4`), Module 16 rendered cards with crossed-out prices such as ₹799 crossed out with 20% discount showing ₹639.
**Reconciliation Finding:**
- Module 16 is an administrative test harness designed to simulate billing math, tier discounts, and PDF generation under synthetic conditions.
- In earlier experimental commits, arbitrary numbers (e.g. ₹699, ₹799, ₹999) were injected into a test array `ADMIN_REPORTS_DATA` to simulate large currency amounts.
- In `index.html`, `ADMIN_REPORTS_DATA` has now been strictly re-anchored to the canonical catalog base prices:
  `report_one_month_forecast` = ₹49, `report_career_education` = ₹149, `report_janam_kundli_deep_dive` = ₹199, `report_twelve_month_varshphal` = ₹249, `report_bundle_kundli_varshphal` = ₹399, `report_three_year_roadmap` = ₹499.

### Mathematical Invariants
Every discount calculation throughout the platform follows the immutable formula:
$$\text{finalPriceRupees} = \operatorname{round}\left(\text{basePriceRupees} \times \left(1 - \frac{\text{discountPercent}}{100}\right)\right)$$
$$\text{finalPricePaise} = \text{finalPriceRupees} \times 100$$

All orders submitted to `/api/wallet/create-order` or `/api/cashfree/create-order` are validated against this exact formula on the backend. Any attempt to alter prices on the client fails closed with `HTTP 400 INVALID_ORDER_AMOUNT`.
