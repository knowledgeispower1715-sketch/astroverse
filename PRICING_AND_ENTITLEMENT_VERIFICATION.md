# ASTROVERSE AI — PRICING & ENTITLEMENT RECONCILIATION

**Document ID:** `AV-PRC-2026-10-30-05`  
**Classification:** Product Catalogue & Monetization Single Source of Truth  
**Author:** Principal Engineering Lead & Monetization Architect  
**Status:** Reconciled, Synchronized & Verified  
**Target Environment:** `https://astroverse-eta.vercel.app/`  

---

## 1. RECONCILIATION OVERVIEW

A comprehensive audit was performed across the customer-facing storefront (`index.html`), Admin Control Centre (Module 16), backend pricing engine (`services/wallet-service/src/monetization/catalog.ts`), and order creation endpoints.

All monetary figures have been consolidated into **integer paise** (minor currency units) to eliminate floating-point rounding errors and ensure total synchronization across client displays and backend ledgers.

---

## 2. CANONICAL SUBSCRIPTION TIERS & PRICING

```
+-------------------------------------------------------------------------------------------------------------+
|                                  AUTHORITATIVE SUBSCRIPTION PLANS                                           |
+-------------------+--------------------+--------------------+--------------------+--------------------------+
| Tier Identifier   | Monthly (Rupees)   | Monthly (Paise)    | Annual (Rupees)    | Annual (Paise)           |
+-------------------+--------------------+--------------------+--------------------+--------------------------+
| FREE              | ₹0 / mo            | 0 paise            | ₹0 / yr            | 0 paise                  |
| PLUS              | ₹149 / mo          | 14,900 paise       | ₹1,299 / yr        | 129,900 paise            |
| PREMIUM           | ₹299 / mo          | 29,900 paise       | ₹2,499 / yr        | 249,900 paise            |
+-------------------+--------------------+--------------------+--------------------+--------------------------+
```

### Entitlement Matrices:
- **Free Tier:** 1 Active Birth Profile, D1 Rashi chart, daily Panchang, 24h Horas, 3 AI queries/day. All PDF downloads gated.
- **Plus Tier:** 3 Active Birth Profiles, D9 Navamsha & D10 Dashamsha, Vimshottari Antardashas, 15 AI queries/day, **10% Member Discount** on individual reports.
- **Premium Tier:** 5 Active Birth Profiles, all 16 Divisional Charts (D1–D60), full Ashtakavarga & Shadbala, 30 AI queries/day, **20% Member Discount** on individual reports, watermark-free high-resolution PDF exports.

---

## 3. CANONICAL 10-PRODUCT REPORT CATALOGUE

All prices fall strictly within the approved ₹49 to ₹499 boundary:

```
+-----------------------------------+---------------------------------------------------+--------------+---------------+
| Product Identifier (SKU)          | Product Display Name                              | Price (INR)  | Price (Paise) |
+-----------------------------------+---------------------------------------------------+--------------+---------------+
| report_one_month_forecast         | One-Month Personalized Forecast                   | ₹49          | 4,900 paise   |
| report_career_education           | Career & Education Report                         | ₹149         | 14,900 paise  |
| report_relationship_marriage      | Relationship & Marriage Report                    | ₹149         | 14,900 paise  |
| report_kundli_milan               | Detailed Kundli Milan (Astrological Synastry)     | ₹149         | 14,900 paise  |
| report_remedial_gemstones         | Planetary Remedies, Gemstone & Mantra Blueprint   | ₹149         | 14,900 paise  |
| report_janam_kundli_deep_dive     | Complete Janam Kundli Deep Dive                   | ₹199         | 19,900 paise  |
| report_vedic_name_numerology      | Vedic Name Correction & Numerology Master Blueprint| ₹199         | 19,900 paise  |
| report_twelve_month_varshphal     | Twelve-Month Varshphal & Forecast                 | ₹249         | 24,900 paise  |
| report_bundle_kundli_varshphal    | Complete Kundli + 12-Month Forecast Bundle        | ₹399         | 39,900 paise  |
| report_three_year_roadmap         | Three-Year Personal Roadmap                       | ₹499         | 49,900 paise  |
+-----------------------------------+---------------------------------------------------+--------------+---------------+
```

---

## 4. INTEGER PAISE DISCOUNT ARITHMETIC

Discounts are calculated server-side and mirrored on the client using integer arithmetic:
$$\text{finalPricePaise} = \text{basePricePaise} - \operatorname{round}\left(\frac{\text{basePricePaise} \times \text{discountPercent}}{100}\right)$$
$$\text{finalPriceRupees} = \frac{\text{finalPricePaise}}{100}$$

### Worked Examples:
1. **Plus Member (10% Discount) on Career Report (₹149):**
   - Base: $14,900 \text{ paise}$
   - Discount: $\operatorname{round}(14,900 \times 0.10) = 1,490 \text{ paise}$
   - Final Payable: $13,410 \text{ paise} = ₹134.10$ (Zero rounding truncation)
2. **Premium Member (20% Discount) on Three-Year Roadmap (₹499):**
   - Base: $49,900 \text{ paise}$
   - Discount: $\operatorname{round}(49,900 \times 0.20) = 9,980 \text{ paise}$
   - Final Payable: $39,920 \text{ paise} = ₹399.20$

---

## 5. RECONCILIATION AUDIT FINDINGS

1. **Stale Prices in Legal Policy Modals:** Previously, legal policy modals in `index.html` contained outdated legacy tiers (e.g. ₹499/mo, ₹999/mo). These have been updated to reflect the canonical ₹149 / ₹299 tiers.
2. **Module 16 Price Synchronization:** Module 16 test harness dynamic pricing mirrors the canonical catalogue and reflects the simulated Plus (10%) and Premium (20%) discounts accurately.
3. **Double-Entry Wallet Debit Integrity:** When purchasing reports via wallet balance, the system verifies `walletBalance >= finalPriceRupees` and creates an immutable double-entry ledger record.
