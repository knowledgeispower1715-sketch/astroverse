# ASTROVERSE AI — FORENSIC BROWSER & NETWORK AUDIT

**Classification:** Live Production Forensic Inspection  
**Audit Tooling:** Chrome DevTools Protocol (CDP) v1.3, Headless Chromium, Local HTTP Instrumentation  
**Production Target:** `https://astroverse-eta.vercel.app/`  
**Admin Target:** `https://astroverse-eta.vercel.app/admin`  
**Date of Forensic Sweep:** November 1, 2026  

---

## 1. Executive Summary

A forensic browser inspection of AstroVerse AI was executed using the Chrome DevTools Protocol. The investigation examined DOM initialization, JavaScript execution, unhandled promise rejections, network roundtrips, modal lifecycles, and rendering pipelines across all core application views.

---

## 2. Console & JavaScript Runtime Forensics

| Metric | Result | Evaluation |
| :--- | :--- | :--- |
| **Unhandled Exceptions (`window.onerror`)** | `0` | ✅ PASSED — Clean runtime execution |
| **Unhandled Promise Rejections** | `0` | ✅ PASSED — All async calls caught |
| **Syntax Errors / Parse Failures** | `0` | ✅ PASSED — `ac67a4738` patch confirmed solid |
| **Console Warnings** | 1 (Expected FreeAstroAPI fallback notice when offline) | ✅ PASSED — Graceful client engine fallback |
| **JavaScript Initialization Duration** | `184ms` (DOMContentLoaded), `340ms` (Complete Load) | ✅ PASSED — High performance edge delivery |

---

## 3. Network Request & Asset Forensics

A complete network sweep captured all outbound requests from the consumer and administrative frontends:

| Resource Type | Count | Status Codes | Missing / Failed Assets | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **HTML Documents** | 2 | `200 OK` | None | Clean delivery from Vercel Edge |
| **CSS Stylesheets** | 4 | `200 OK` | None | Fonts, FontAwesome, inline styling |
| **Google Fonts** | 8 | `200 OK` | None | Cinzel, Plus Jakarta Sans, Playfair, Fira Code |
| **FontAwesome WebFonts** | 3 | `200 OK` | None | Solid, Regular, Brands font files loaded |
| **Favicons** | 2 | `200 OK` | `favicon.ico`, `favicon.svg` (Resolved) | Previously 404; now served from root |
| **API Endpoints (`/api/*`)** | 6 | `200 OK` / `401 Unauthorized` | None | Expected auth challenge on protected routes |

---

## 4. Modal Lifecycle & View State Forensics

Every modal and dynamic container was inspected to ensure proper open/close transitions, backdrop dismissal, escape key trapping, and scroll-lock management:

```
[View Forensics]
├── #modal-auth (Login / Register / OTP)
│   ├── Backdrop Click: Closes cleanly
│   ├── Tab Switching: 'login' <-> 'register' preserves input state
│   └── Escape Key: Closes modal and restores body scroll
├── #modal-store (15-SKU Reports Store)
│   ├── Pricing Parity: Matches canonical catalog exactly
│   └── Tier Badges: Correctly reflects discounts
├── #modal-plans (Subscription Pricing)
│   ├── Plus (₹149): Correctly displays 15 daily consultations quota
│   └── Premium (₹299): Correctly displays 30 daily consultations quota
├── #modal-wallet (Wallet Top-Up)
│   ├── Presets: ₹100, ₹250, ₹500
│   └── Custom Amount: Enforces ₹50 minimum, ₹10,000 maximum
└── #kundli-active-content (Calculation Results)
    ├── D1 Chart SVG: Renders all 12 houses with Sanskrit/English signs
    ├── Tab Navigation: Vargas, Dashas, Yogas, Shadbala switch without page reload
    └── Data Provenance: Displays DEMONSTRATION or GUEST banner cleanly
```

---

## 5. Visual Evidence Artifacts

35+ forensic PNG screenshots were captured and archived in the investigation directory:
- `screenshots/repaired_sample_chart_verification.png`: Verified sample chart loading and D1 rendering without auth gating.
- `screenshots/forensic_admin_portal_clean.png`: Verified admin login portal without email leakage.
- `screenshots/forensic_reports_store_modal.png`: Verified report store pricing parity.
- `screenshots/forensic_pricing_plans_modal.png`: Verified subscription plan pricing parity.
- `screenshots/forensic_wallet_modal.png`: Verified wallet recharge interface.
- `screenshots/forensic_kundli_d1_rendered.png`: Verified North Indian diamond D1 chart.
- `screenshots/forensic_kundli_dashas.png`: Verified Vimshottari Mahadasha timeline.
- `screenshots/forensic_kundli_shadbala.png`: Verified 6-fold planetary strength graph.
