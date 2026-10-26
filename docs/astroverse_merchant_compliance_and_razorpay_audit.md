# AstroVerse AI — Forensic Merchant Classification, Website Compliance & Razorpay Readiness Audit

**Audit Date:** October 26, 2026  
**Auditor:** Senior Full-Stack Architect, SaaS Compliance Specialist & Payment Security Lead  
**Repository:** `E:\rea`  
**Production URL:** `https://astroverse-eta.vercel.app/`  
**Classification Issue:** Razorpay classified merchant onboarding as "Matrimony / Dating Application" and blocked onboarding.  

---

## 1. Confirmed Technology Stack

| Component | Technology | Version / Configuration | Notes |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | Single-Page Application (SPA) | Vanilla TypeScript / HTML5 / CSS3 | Served statically via Vercel (`buildCommand: echo 'Static app ready'`) |
| **Animation & Rendering** | GSAP & ScrollTrigger | 3.12.5 (CDN) | Smooth transitions, mobile drawer animations |
| **PDF Publishing Engine** | HTML2PDF.js + Puppeteer Backend | 0.10.1 (Frontend) / Headless Chrome | Generates 10 distinct physical PDF publications |
| **Authentication System** | Google Identity Services (GIS) + OTP | OAuth 2.0 GIS client + HMAC-SHA256 tokens | Single Google One-Tap/button + Email/Phone OTP session management |
| **Backend Services (SaaS)** | Node.js Express / TypeScript | Express 4.x / Node 20+ / Vercel Serverless | Handled by `services/wallet-service` (`src/server.ts`) |
| **Astrology Calculation Engine** | Python / FastAPI / Swiss Ephemeris | Python 3.12 / FastAPI / PySwisseph / VedAstro | Handled by `services/kundli-engine` (Nirayana Sidereal, Lahiri Ayanamsha) |
| **AI Astrologer Engine** | Node.js / TypeScript | Vercel Serverless (`services/consultation-service`) | Real-time chart-grounded astrology consultations |
| **Database & Persistence** | Supabase PostgreSQL / Local Resilient DB | `services/wallet-service/src/db.ts` | Complete RLS, encrypted sessions, profiles, orders, and ledger |
| **Payment Gateway Integration**| Razorpay SDK | `razorpay` npm package (v2.9.2) | Server-controlled orders, HMAC-SHA256 signature verification |

---

## 2. Confirmed Application Structure

```
E:\rea\
├── index.html                           # Production SPA frontend (AstroVerse Luxury Vedic Platform)
├── vercel.json                          # Multi-service routing configuration (routes API calls to wallet-service)
├── package.json                         # Monorepo root toolchain
├── services/
│   ├── wallet-service/                  # Primary SaaS backend API
│   │   ├── src/
│   │   │   ├── server.ts                # Express server: Auth, Profiles, Wallet, Orders, Entitlements
│   │   │   ├── razorpay.ts              # Razorpay SDK initialization & HMAC-SHA256 signature verification
│   │   │   ├── db.ts                    # User, Profile, Order, Transaction & Entitlement store
│   │   │   └── monetization/
│   │   │       ├── catalog.ts           # 10 report products, 3 subscription tiers, capability matrix
│   │   │       ├── entitlements.ts      # Tier simulation, discount evaluation, capability enforcement
│   │   │       ├── reportGenerator.ts   # Canonical 10-product report compiler
│   │   │       ├── astroCalculator.ts   # Astronomical calculation adapter
│   │   │       └── numerologyCalculator.ts # Vedic/Chaldean/Pythagorean numerology engine
│   │   └── tests/                       # 7 automated regression test suites (115 tests)
│   ├── kundli-engine/                   # Python Swiss Ephemeris Vedic calculation service
│   │   ├── main.py                      # FastAPI routes (/api/kundli, /api/panchang, /api/horas)
│   │   └── tests/                       # 86 pytest automated test cases
│   └── consultation-service/            # AI Astrologer consultation service
└── docs/                                # Technical & compliance documentation
```

---

## 3. Forensic Root-Cause Analysis: Why Razorpay Classified AstroVerse as "Matrimony / Dating"

A rigorous source and network forensic audit revealed that the misclassification was triggered by **five intersecting factors** across website presentation, missing compliance pages, heuristic terminology, and merchant category submission:

### Finding 1: Pervasive Use of "Matchmaking" and "Matrimonial" Heuristic Keywords
- **Evidence**:
  - Main navigation ID: `btn-nav-matchmaking` and mobile drawer `mob-nav-matchmaking`.
  - Tab 4 headline (`index.html#L5418`): `<h2><i class="fa-solid fa-heart"></i> Kundli Milan — 36-Guna Matchmaking</h2>`.
  - Form field placeholders (`index.html#L5428-L5518`): `Boy's Particulars (Groom)` with default value `"Groom"`; `Girl's Particulars (Bride)` with default value `"Bride"`.
  - Tools directory (`index.html#L6026-L6041`): `36-Guna Ashtakoota Matchmaking` with artifact labeled `Matrimonial Verdict`.
  - Product catalog (`catalog.ts#L251`): Product display name `Detailed Kundli Milan (Matchmaking)` and description `Two-chart synastry evaluation for marriage or long-term partnership...` with section headings `Matrimonial Longevity` and `Matrimonial & Kalatra Architecture`.
- **Classification Impact**:
  - Razorpay's automated website compliance crawlers (and merchant risk underwriting models) scan HTML headings, labels, button texts, and catalog descriptions for keyword triggers.
  - The combination of **"Matchmaking"**, **"Groom"**, **"Bride"**, **"Matrimonial Verdict"**, and **"Marriage"** overwhelmingly matches the feature profile of a matrimonial portal or dating site.

### Finding 2: Actual Functionality is 100% Mathematical Astrological Synastry (Zero Dating/Social Features)
- **Forensic Verification**:
  - *Does AstroVerse have user-to-user messaging?* **NO.** The chat is strictly an automated AI Vedic Astrologer consultation (`Acharya Devratan`, etc.).
  - *Does AstroVerse have user discovery, matrimonial profiles, or browsing other members?* **NO.**
  - *Does AstroVerse have swipe cards, partner matching, or matrimonial introductions?* **NO.**
  - *What does Kundli Milan actually do?* A single user manually inputs two sets of birth particulars (Date, Time, Place of Chart A and Chart B). The Python calculation engine calculates the astronomical moon positions (Nakshatras and Rashis) and applies the classical Parashari **Ashtakoota 8-Koota algorithm** (Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi) to yield a classical score out of 36 points.
- **Root Conclusion**: The underlying feature is **mathematical astronomical chart synastry**, NOT a dating service or matrimonial agency. However, the UI borrowed colloquial matrimonial phrasing ("Matchmaking", "Groom/Bride") that misrepresented the algorithmic feature.

### Finding 3: Total Absence of Public Website Footer and Mandatory Legal Policies
- **Evidence**:
  - Inspection of `index.html` revealed **NO `<footer>` element** on the website.
  - Search for legal pages revealed **ZERO policy pages**:
    - No Terms of Service
    - No Privacy Policy
    - No Refund & Cancellation Policy
    - No Contact Us / Customer Support page
    - No Shipping & Digital Delivery Policy
- **Compliance Impact**:
  - Under RBI (Reserve Bank of India) Payment Aggregator Guidelines and Razorpay Underwriting Policy, any merchant onboarding application lacking direct, transparent links to **Terms & Conditions**, **Privacy Policy**, **Refund & Cancellation Policy**, and **Contact Us with official support details** is **automatically flagged and rejected/held**.
  - Without these pages defining the product as digital software, Razorpay's underwriting system defaults to the strictest heuristic categorization.

### Finding 4: Absence of Machine-Readable SEO & Schema.org Software Metadata
- **Evidence**:
  - `<head>` in `index.html` contained only `<title>` without `<meta name="description">`, `<meta name="keywords">`, OpenGraph tags, or JSON-LD structured data.
- **Impact**:
  - Automated merchant scanners parse Schema.org JSON-LD to understand business classification.
  - Without a declared `@type: SoftwareApplication` or `WebApplication` with `applicationCategory: ReferenceApplication / UtilitiesApplication / AstrologySoftware`, the crawler relies exclusively on scraped page text.

### Finding 5: Merchant Application Category Selection on Razorpay Dashboard
- **Impact**:
  - If the initial Razorpay merchant application was submitted under an ambiguous business category (e.g. "Services - Matrimony" or "Social Networking"), Razorpay's underwriting system locks in that category and demands matrimonial licenses that AstroVerse does not need.
  - AstroVerse must be registered under **"Software as a Service (SaaS)"**, **"Digital Goods & Educational Content"**, or **"Astrology & Personal Consulting Software"** (MCC 5818 / 7299 / 7372).

---

## 4. Remediation Strategy & Corrective Actions

| Component | Current State | Required Corrective Action |
| :--- | :--- | :--- |
| **Business Positioning** | Undefined metadata; ambiguous hero text | Define as: **"AstroVerse AI — Vedic Astrology Software and Personalized Astrology Services"** across metadata, OpenGraph, Schema.org JSON-LD, and page header. |
| **Kundli Milan Synastry UI** | "36-Guna Matchmaking", "Groom/Bride", "Matrimonial Verdict" | Rename to: **"Kundli Milan — 36-Guna Astrological Compatibility Analysis"**; replace Groom/Bride with **"First Chart (Chart A)"** and **"Second Chart (Chart B)"**; add explicit disclaimer: *"This is a mathematical birth-chart compatibility calculator based on ancient Parashari Jyotish, not a dating service or matrimonial agency."* |
| **Catalog & Report Generator** | "Detailed Kundli Milan (Matchmaking)", "Matrimonial Longevity" | Update product title to **"Detailed Kundli Milan (Astrological Synastry)"**; replace "matrimonial" references with "synastry harmony" and "relationship longevity". |
| **Mandatory Legal Pages** | Completely missing | Implement full modal dialogs and dedicated view routes for: 1. Terms of Service, 2. Privacy Policy, 3. Refund & Cancellation Policy, 4. Contact Us, 5. Shipping & Digital Delivery, 6. Pricing & Subscription Disclosures. |
| **Website Footer** | Completely missing | Build a comprehensive luxury website footer with clear merchant identity, copyright, disclaimers, and links to all legal pages. |
| **Razorpay Webhooks** | Missing in `server.ts` | Implement `POST /api/webhooks/razorpay` with raw HMAC-SHA256 signature verification and idempotent event handling (`order.paid`, `payment.captured`, `subscription.charged`, `subscription.cancelled`). |
| **Merchant Dossier** | Not prepared | Prepare a complete Merchant Onboarding Evidence Dossier for the business owner to submit directly to Razorpay Merchant Support. |

---

## 5. Risks & Required Owner Clarification

1. **Merchant Category Code (MCC) on Razorpay Portal**:
   - The business owner must log in to the Razorpay Merchant Dashboard (`dashboard.razorpay.com`) and verify the selected Business Category. It must be updated to **"Software / IT Services"** or **"Digital Goods / Content"** or **"Personal Services (Astrology)"**.
2. **Official Business Identity**:
   - Legal business name, registered entity (Proprietorship, LLP, or Pvt Ltd), official contact email (`support@astroverse.app` or owner domain email), and operational office address must be declared on the Contact Us policy page. Placeholder support details are provided and must be confirmed by the owner.
3. **Razorpay Live Credentials**:
   - Testing must remain strictly in Razorpay **Test Mode** until Razorpay formally approves the merchant account and the owner authorizes the production switch.
