# AstroVerse AI — Project Inventory & Forensic Baseline

**Document Date:** October 26, 2026  
**Auditor:** Principal Software Architect, Full-Stack Lead & Security Specialist  
**Working Branch:** `feature/astroverse-master-release`  
**Production URL:** `https://astroverse-eta.vercel.app/`  

---

## 1. Genuine Repository Architecture

AstroVerse AI is structured as a multi-tier monorepo managed under Vercel multi-service routing (`vercel.json`) with an integrated native mobile application under `apps/mobile/`.

```
E:\rea\
├── index.html                           # Production SPA frontend (Vedic Luxury Web Application)
├── vercel.json                          # Vercel multi-service routing and serverless definition
├── package.json                         # Workspace root dependencies & scripts
├── apps/
│   └── mobile/                          # Production Native Mobile Client (Expo SDK 51 / React Native 0.74)
│       ├── App.tsx                      # Root mobile container with bottom tab navigation
│       ├── app.json                     # Expo manifest (app.astroverse.mobile, v2.0.0)
│       ├── src/
│       │   ├── api/                     # Unified HTTP client, Auth, Kundli, Predictions
│       │   ├── calculations/            # Astronomical, Dasha & Hora calculations
│       │   ├── components/              # NorthIndianChart, HourlyGuidanceCard, Modals
│       │   ├── context/                 # AuthContext, ChartContext, WalletContext
│       │   ├── screens/                 # TodayScreen, ChartScreen, PredictionsScreen, ProfileScreen
│       │   └── theme/                   # Cosmic design tokens & planetary palette
│       └── tests/                       # Hourly guidance calculation test suite
├── services/
│   ├── wallet-service/                  # Primary SaaS backend API
│   │   ├── src/
│   │   │   ├── server.ts                # Express 4 server: Auth, Profiles, Wallet, Orders, Entitlements
│   │   │   ├── razorpay.ts              # Razorpay SDK initialization & HMAC-SHA256 signature verification
│   │   │   ├── db.ts                    # Resilient JSON & PostgreSQL database adapter
│   │   │   └── monetization/            # Catalog, Entitlements, ReportGenerator, Numerology
│   │   └── tests/                       # 8 automated regression test suites (128 tests)
│   ├── kundli-engine/                   # Python Swiss Ephemeris Vedic calculation service
│   │   ├── main.py                      # FastAPI routes (/api/kundli, /api/panchang, /api/horas)
│   │   └── tests/                       # 86 pytest automated test cases
│   └── consultation-service/            # AI Astrologer consultation service
├── mobile-client/                       # Backward compatibility forwarder to apps/mobile
├── docs/                                # Technical specifications, compliance dossiers & manuals
└── AUDIT/                               # Forensic audit and release quality documentation
```

---

## 2. Technology Stack Verification

| Component | Verified Technology | Version / Configuration | Deployment Target |
| :--- | :--- | :--- | :--- |
| **Web Frontend** | Single-Page Application (SPA) | Vanilla TypeScript / HTML5 / CSS3 / GSAP 3.12 / HTML2PDF 0.10 | Vercel Edge (`buildCommand: echo 'Static app ready'`) |
| **Mobile Client** | React Native / Expo | Expo SDK 51 / React Native 0.74.5 / TypeScript 5.3 | iOS & Android (EAS / Standalone Builds) |
| **Authentication** | Google Identity Services + JWT | OAuth 2.0 GIS client + Session Token store + Password Hash | Vercel Serverless (`wallet-service`) |
| **Backend Services**| Node.js / Express / TypeScript | Express 4.19 / Node.js 20+ / Prisma 5.11 | Vercel Serverless (`wallet-service`) |
| **Astrology Engine**| Python / FastAPI / Swiss Ephemeris | Python 3.12 / PySwisseph / VedAstro (Nirayana, Lahiri) | Vercel Serverless (`kundli-engine`) |
| **AI Consultations**| Node.js / TypeScript | Dynamic chart-grounded prompts | Vercel Serverless (`consultation-service`) |
| **Database** | Resilient Storage Engine | Supabase Postgres + Encrypted JSON durable fallback | Serverless Persistent Storage |
| **Payment Gateway** | Razorpay SDK | `razorpay` 2.9.2 (HMAC-SHA256 webhooks, order settlement) | Razorpay RBI-licensed Aggregator |

---

## 3. Deployment Configuration (`vercel.json`)

Vercel routes inbound traffic using pattern-based service rewrites:
- `/api/wallet/(.*)` -> `wallet-service`
- `/api/auth/(.*)` -> `wallet-service`
- `/api/numerology/(.*)` -> `wallet-service`
- `/api/reports/(.*)` -> `wallet-service`
- `/api/subscriptions/(.*)` -> `wallet-service`
- `/api/entitlements/(.*)` -> `wallet-service`
- `/api/webhooks/(.*)` -> `wallet-service`
- `/api/billing/(.*)` -> `wallet-service`
- `/api/kundli/(.*)` -> `kundli-engine`
- `/api/panchang/(.*)` -> `kundli-engine`
- `/api/horas/(.*)` -> `kundli-engine`
- `/api/consultation/(.*)` -> `consultation-service`
- All other web assets -> `.` (serving `index.html`)

---

## 4. Initial Health & Execution Commands

1. **Backend Tests**: `npm --prefix services/wallet-service test` (Runs 8 test suites, 128 tests).
2. **Backend Typecheck**: `npx --prefix services/wallet-service tsc --project services/wallet-service/tsconfig.json --noEmit`.
3. **Astrology Engine Tests**: `pytest services/kundli-engine/tests` (Runs 86 calculation tests).
4. **Mobile Client Tests**: `npm --prefix apps/mobile test` (Runs 13 native hourly guidance tests).
5. **Mobile Client Typecheck**: `npm --prefix apps/mobile run typecheck` (Runs `tsc --noEmit`).
