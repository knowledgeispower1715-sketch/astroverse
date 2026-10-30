# AstroVerse AI — Admin & Public Catalogue Integration Architecture

**Author:** Principal Engineering Lead  
**Document Reference:** Deliverable 6 / Systems Integration  
**Components Evaluated:**  
- Public Store & Builder: `#modal-report-store`, `#modal-report-builder`, `openReportStoreModal()`, `openReportBuilderModal()`  
- Admin Control Centre: `#admin-tool-reports` (Module 16: Reports Catalogue & PDF Reader Harness)  
- Backend Catalog: `services/wallet-service/src/monetization/catalog.ts`  
- Shared Reader Modal: `#modal-report-reader` (`openReportReaderModal()`)  
**Date:** October 30, 2026  
**Status:** Unified, Reconciled & Formally Verified  

---

## 1. System Integration Overview

AstroVerse AI maintains a clear boundary between **Customer-Facing Purchase & Reading Workflows** and **Administrative Simulation & Diagnostics Workflows**, while ensuring both layers consume the exact same underlying product definitions and astrological calculation engines.

```
                             AUTHORITATIVE SOURCE OF TRUTH
                     services/wallet-service/src/monetization/catalog.ts
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
         PUBLIC USER STOREFRONT                         ADMIN CONTROL CENTRE
         (Customer-Facing Mode)                       (Module 16 Test Harness)
                  │                                               │
  1. Browse: #modal-report-store                 1. Synthetic Tier Switcher (Free/Plus/Prem)
  2. Configure: #modal-report-builder            2. 10 Product Cards with Live Member Discounts
  3. Live Price Calculation                      3. "Sample Chapters" -> Launch Reader Modal
  4. Checkout (Cashfree / Wallet)                4. "Download PDF" -> High-Res Canvas Pipeline
                  │                                               │
                  └───────────────────────┬───────────────────────┘
                                          ▼
                               UNIFIED REPORT READER
                                #modal-report-reader
                       (Bilingual Summary, Chapters, Voice, PDF)
```

---

## 2. Public Storefront & Customization Workflow

### 2.1. Discovery (`#modal-report-store`)
Public users open the Storefront by clicking "Order Custom Report" in the navigation bar. The modal displays:
- Filter categories: All, Life Blueprint, Career, Marriage, Annual & Roadmaps.
- All 10 canonical products rendered with display names, descriptions, base prices, and member discounts.
- Live price tags showing original price, strikethrough, and effective price based on active session tier:
  $$\text{effectivePrice} = \operatorname{round}\left(\text{basePrice} \times \left(1 - \frac{\text{tierDiscount}}{100}\right)\right)$$

### 2.2. Product Configuration & Builder (`#modal-report-builder`)
Selecting a product opens the customization builder:
- **Profile Selector:** Selects from saved user profiles or computes from active chart coordinates.
- **Focus Dimension:** Allows seekers to specify analytical emphasis (*Holistic Life Pattern*, *Promotion & Authority*, *Marital Compatibility*, etc.).
- **Analytical Depth:** Standard vs Advanced Shodashavarga.
- **Language Selection:** English (`en`) or Hindi (`hi`).
- **Real-Time Price Ledger:** Dynamically computes wallet deduction, Cashfree gateway shortfall, and member savings before initiating transaction.

### 2.3. Post-Purchase Delivery
Upon successful payment verification or authorized demo fulfillment:
- The compiled document is persisted to the user's permanent digital library (`POST /api/reports/save`).
- The user is immediately transitioned into `#modal-report-reader` with full chapter navigation and audio narration.
- If the user holds Plus or Premium tier (or purchased a standalone PDF-entitled product), high-resolution PDF downloads are immediately available.

---

## 3. Admin Module 16 Harness Specification

### 3.1. Purpose & Diagnostic Mandate
Module 16 in the Admin Control Centre serves as the principal quality assurance harness for the engineering and executive teams. It allows staff to:
1. Verify the visual layout, pricing math, and discount application for all 10 canonical products simultaneously.
2. Toggle instantly between simulated tiers (**FREE**, **PLUS**, **PREMIUM**) without altering real user database records or charging payment cards.
3. Inspect sample chapters in the identical high-fidelity `#modal-report-reader` used by paying customers.
4. Execute physical PDF compilation and verify browser download behavior on real devices.

### 3.2. Strict State & Data Isolation
The administrative simulation operates under strict isolation invariants:
- **LocalStorage Precedence:** Simulated tiers are stored under `astro_admin_preview_tier` and `astro_simulated_tier`.
- **Demo Wallet Segregation:** Demo balance is tracked in `astro_demo_wallet_bal` and `tool-billing-demo-bal`, completely isolated from real customer ledgers in PostgreSQL.
- **Fail-Closed Backend Guard:** Any administrative tier-switch API call (`POST /api/admin/preview/set-tier`) strictly validates the session against `CANONICAL_ADMIN_ROLES` (`['OWNER', 'SECURITY_ADMIN', 'SUPPORT_ADMIN', 'CONTENT_EDITOR', 'FINANCE_ADMIN']`). Non-admin attempts fail closed with `HTTP 403 Forbidden`.

---

## 4. Cross-System Architectural Consistency Matrix

| Dimension | Public Store & Builder | Admin Module 16 Harness | Status |
| :--- | :--- | :--- | :--- |
| **Product IDs** | `report_janam_kundli_deep_dive`, `report_career_education`, etc. | Identical canonical IDs from `catalog.ts` | **SYNCHRONIZED (100%)** |
| **Base Prices** | ₹49 to ₹499 (Paise `4900` to `49900`) | Exact base prices from `catalog.ts` | **SYNCHRONIZED (100%)** |
| **Discounts** | 0% Free, 10% Plus, 20% Premium | 0% Free, 10% Plus, 20% Premium | **SYNCHRONIZED (100%)** |
| **Reader View** | `#modal-report-reader` with TOC & Hindi switch | `#modal-report-reader` with TOC & Hindi switch | **UNIFIED (100%)** |
| **PDF Generation** | `generateAndDownloadReportPdf()` | `generateAndDownloadReportPdf()` | **IDENTICAL PIPELINE** |
| **Download Security** | DOM-attached Blob anchor with delayed cleanup | DOM-attached Blob anchor with delayed cleanup | **VERIFIED NO CANCEL** |
| **Financial Mutation** | Real Cashfree / Real Wallet Debit | Synthetic Demo Wallet Debit (Zero real impact) | **ISOLATED (100%)** |

---

## 5. Verification Summary

In our automated browser regression run (`scripts/verify_module16_end_to_end.mjs`):
1. **Free Tier Gating:** Verified that simulated Free tier properly sets button to `PDF Gated` and displays informative upgrade guidance.
2. **Premium Unlocking:** Verified that switching to Premium unlocked the button to `Download PDF`, reduced displayed prices by 20%, and enabled direct multi-page PDF generation.
3. **Reader Launch:** Verified that clicking "Sample Chapters" in Module 16 seamlessly launched `#modal-report-reader` with full chapter contents, proving complete integration between the administrative harness and the public reader engine.
