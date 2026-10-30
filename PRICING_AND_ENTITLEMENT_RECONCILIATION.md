# AstroVerse Pricing, Subscriptions & Entitlements Reconciliation

**Date:** October 30, 2026  
**Lead:** Principal Engineering Lead  
**Scope:** Backend Catalog (`catalog.ts`), Client Presentation (`index.html`), Entitlement Engine (`entitlements.ts`)  
**Status:** Authoritatively Reconciled & Synchronized

---

## 1. Authoritative Report Pricing Catalog

AstroVerse maintains 10 distinct report products. Prior to Phase 2, discrepancies existed between frontend tables (which listed obsolete pricing such as ₹99–₹999) and the backend catalog (`catalog.ts`). All frontend select elements, simulation buttons, and administrative pricing fixtures have now been synchronized to the authoritative prices below:

| # | Product ID | Canonical Display Name | Base Price (Paise) | Base Price (INR) | Plus Tier (-20%) | Premium Tier (-40%) |
|---|---|---|---|---|---|---|
| 1 | `report_basic_chart_summary` | Basic Chart Summary | **0** | **₹0 (FREE)** | ₹0 | ₹0 |
| 2 | `report_one_month_forecast` | 1-Month Personalized Forecast | **4,900** | **₹49** | ₹39 | ₹29 |
| 3 | `report_twelve_month_varshphal` | 12-Month Varshphal & Forecast | **14,900** | **₹149** | ₹119 | ₹89 |
| 4 | `report_career_education` | Career & Education Deep Dive | **14,900** | **₹149** | ₹119 | ₹89 |
| 5 | `report_relationship_marriage` | Relationship & Marriage Analysis | **14,900** | **₹149** | ₹119 | ₹89 |
| 6 | `report_remedial_gemstones` | Gemstone & Planetary Remedies | **14,900** | **₹149** | ₹119 | ₹89 |
| 7 | `report_kundli_milan` | Detailed Kundli Milan (Synastry) | **19,900** | **₹199** | ₹159 | ₹119 |
| 8 | `report_janam_kundli_deep_dive` | Complete Janam Kundli Deep Dive | **24,900** | **₹249** | ₹199 | ₹149 |
| 9 | `report_vedic_name_numerology` | Vedic Name & Numerology Blueprint | **24,900** | **₹249** | ₹199 | ₹149 |
| 10 | `report_bundle_kundli_varshphal` | Complete Kundli + Varshphal Bundle | **49,900** | **₹499** | ₹399 | ₹299 |

### Pricing Invariants
1. **Integer Paise Storage:** All prices are modeled as integer paise in the backend database and API payloads to prevent floating-point rounding inaccuracies.
2. **Explicit Free Product Entitlement:** `report_basic_chart_summary` has a canonical price of 0 paise and is unlocked unconditionally for all authenticated users across all tiers.
3. **Deterministic Tier Discounting:** Discounts are computed server-side via `calculateReportPrice(productId, tier)`:
   - Free / Essentials: 0% discount
   - Plus: 20% discount (final price = `Math.round(basePrice * 0.80)`)
   - Premium: 40% discount (final price = `Math.round(basePrice * 0.60)`)
   - Direct payment order amounts must strictly match or exceed `finalPriceRupees`; underpayment is rejected with HTTP 400 (`AMOUNT_MISMATCH`).

---

## 2. Authoritative Subscription Plans & Pricing

AstroVerse provides three subscription tiers with distinct billing periods:

| Subscription Tier | Billing Period | Canonical Price (Paise) | Canonical Price (INR) | Active Period |
|---|---|---|---|---|
| **FREE / ESSENTIALS** | Lifetime | 0 | **₹0** | Continuous |
| **PLUS** | Monthly | 14,900 | **₹149 / month** | 30 Days |
| **PLUS** | Annual | 129,900 | **₹1,299 / year** *(27% Savings)* | 365 Days |
| **PREMIUM** | Monthly | 29,900 | **₹299 / month** | 30 Days |
| **PREMIUM** | Annual | 249,900 | **₹2,499 / year** *(30% Savings)* | 365 Days |

---

## 3. Tier Entitlement & Feature Matrix

All platform capabilities are governed by the authoritative `EntitlementManager` (`services/wallet-service/src/monetization/entitlements.ts`):

| Platform Feature / Entitlement | Free / Essentials | Plus Tier | Premium Tier |
|---|---|---|---|
| **Max Saved Birth Profiles** | 3 profiles | 10 profiles | **Unlimited** |
| **AI Astrologer Daily Quota** | 5 queries / day | 25 queries / day | **100 queries / day** |
| **AI Personas Available** | Guruji (Classical Vedic) only | Guruji + Acharya Anand | **All 3 (Guruji, Anand, Priya)** |
| **Report Tier Discount** | 0% | 20% | **40%** |
| **Basic Chart Summary PDF** | Unlimited Free | Unlimited Free | Unlimited Free |
| **Full PDF Export Unlocking** | Paid per report | Paid (-20%) | Paid (-40%) |
| **Numerology Studio** | Personal core only | Personal + Destiny | **Full Business & Mobile Correction** |
| **Upagraha & Kalavela Insights** | Standard chart | Standard + transit | **Full Parashari 8-Fold Proportions** |
| **Kundli Milan Synastry Analysis** | Ashta-Koota summary | Full 36 Gunas | **Full 36 Gunas + Dosha Mitigation** |
| **Live Consultation Trial** | 1 Free Minute (Single-use) | 1 Free Minute (Single-use) | 1 Free Minute (Single-use) |

---

## 4. Frontend & Backend Synchronization Details

### Changes Made to `index.html`:
1. **Admin Catalog Table (`ADMIN_REPORTS_DATA`):** Updated array items 1 through 10 to reflect ₹49 through ₹499 base pricing with matching chapter counts and descriptions.
2. **Simulation Checkout Selector (`#sim-checkout-product-select`):** Replaced obsolete option labels and value attributes with exact canonical keys (`report_janam_kundli_deep_dive (₹249)`, `report_career_education (₹149)`, etc.).
3. **Demo Purchase Deductions:** Aligned `purchaseReportWithDemo` to calculate deductions using the synchronized rates.

### Verification via Automated Tests:
- `monetization.test.ts` test: `GET /api/reports/catalogue returns all 10 distinct reports with integer paise pricing` -> **PASS**
- `monetization.test.ts` test: `Subscription price validation enforces exact plan amount` -> **PASS**
- `entitlements.test.ts`: Verified all tier quotas, profile limits, and persona access boundaries.
