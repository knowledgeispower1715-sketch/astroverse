# AstroVerse Mobile Forensic Audit & Baseline Report

**Project**: AstroVerse Mobile OS (iOS & Android)  
**Workspace**: `E:\rea`  
**Git Remote**: `https://github.com/knowledgeispower1715-sketch/astroverse.git`  
**Baseline Branch**: `main`  
**Baseline Commit**: `777e5b4ec`  
**Audit Lead**: Principal Mobile Software Architect, Senior React Native Engineer & Security QA Lead  
**Date**: 2026-10-21  

---

## 1. Executive Summary

This forensic audit evaluates the existing AstroVerse codebase prior to the construction of the native iOS and Android applications. 

The audit establishes:
1. The web application at [`index.html`](file:///E:/rea/index.html) and deployed at `https://astroverse-eta.vercel.app/` operates on vanilla HTML5/CSS3/JavaScript with robust multi-horizon predictions, client-side ephemeris fallbacks, and Astrotalk UI/UX patterns.
2. The backend services consist of:
   - `services/wallet-service` (Node.js/Express, TypeScript, Double-entry ledger, JWT/256-bit sessions, Birth Profile CRUD, Report persistence, Super Admin console).
   - `services/kundli-engine` (Python 3.12, FastAPI, Swiss Ephemeris `pyswisseph 2.10.3.2`, Lahiri Chitrapaksha Ayanamsha, 24-Hour solar Horas, Ashtakoota 36-Guna matchmaking, 6-horizon prediction engine).
3. The existing directory `mobile-client` was an incomplete, unlinked prototype with hardcoded planetary arrays (`d1Planets = { 1: ['Jup'], ... }`), a hardcoded birth date (`1996-11-24`), unauthenticated socket connections, and zero multi-horizon prediction depth.
4. A production-grade native application architecture will be built in `apps/mobile/` utilizing React Native, Expo, TypeScript, native SVG charts, typed backend API clients, secure session storage, and an Astrotalk-grade 4-tab mobile experience.

---

## 2. Verification of Existing Backend Services & Test Suites

Before introducing mobile code, all existing backend regression test suites were re-executed and verified:

### 2.1 Kundli Astronomical Engine Suite (`pytest`)
* **Target File**: `services/kundli-engine/tests/test_calculations.py`
* **Execution Command**: `python -m pytest services/kundli-engine/tests`
* **Result**: **14 Passed in 8.00s (0 failures, 100% pass rate)**
* **Verified Behaviors**:
  - Ephemeris longitudes with Lahiri Ayanamsha
  - Canonical Jabalpur profile (Sun Leo 3.49°, Moon Aquarius 12.21° Shatabhisha Pada 2, Lagna Scorpio 24.19° Jyeshtha Pada 3)
  - 120-Year Vimshottari Dasha timeline & Antardashas
  - 24-Hour unequal day/night planetary Horas & Rahu Kaal
  - Ashtakoota 36-Guna Matchmaking algorithm
  - 6-Horizon structured prediction reports (`hourly`, `daily`, `weekly`, `monthly`, `yearly`, `mahadasha`)
  - FreeAstrologyAPI & ProKerala provider connectivity

### 2.2 Wallet & Authentication Suite (`npm test`)
* **Target File**: `services/wallet-service/tests/auth.test.ts`
* **Execution Command**: `Push-Location services/wallet-service; $env:NODE_ENV="test"; npm test; Pop-Location`
* **Result**: **32 Passed in 1.48s (0 failures, 100% pass rate)**
* **Verified Behaviors**:
  - Email & Mobile Phone OTP dispatch with 60-second rate-limiting cooldown
  - Single-use OTP eviction (replay attack rejection)
  - 256-bit cryptographic session token issuance
  - Birth profile creation, validation, and multi-profile isolation (HTTP 403 enforcement between users)
  - Prediction report persistence and retrieval
  - Administrative role-based access control (Super Admin audit trail and user suspension)

---

## 3. Forensic Defect Registry of the Existing Mobile Prototype (`mobile-client`)

| Defect ID | Component | Observed Defect in `mobile-client` | Severity | Required Native Mobile Remediation |
| :--- | :--- | :--- | :--- | :--- |
| **MOB-01** | Architecture | Unstructured root directory (`mobile-client`) missing standard Expo configuration (`app.json`, `tsconfig.json`, modern SDK dependencies). | High | Establish clean monorepo application at `apps/mobile/` with Expo SDK 51/52, TypeScript, and native SVG. |
| **MOB-02** | Authentication | No authentication, no user registration, no token storage. Hardcoded user ID (`user_101`). | Critical | Implement `AuthModal` / `AuthContext` supporting Password + OTP authentication, persistent session restoration via AsyncStorage / SecureStore, and multi-profile binding. |
| **MOB-03** | Astronomical Data | Hardcoded dummy planets dictionary (`d1Planets = { 1: ['Jup'], 4: ['Ket', 'Sat'] }`) rendered in SVG. | Critical | Connect `NorthIndianChart.tsx` to live canonical calculation output from `services/kundli-engine` and client astronomical fallback with dynamic house numbers and graha coordinates. |
| **MOB-04** | Hero Feature | Missing Personal Hourly Guidance hero section. Only had generic static 4-hour timetable with hardcoded percentages. | Critical | Implement `HourlyGuidanceCard` as the hero feature of the mobile Home tab, featuring real-time solar Hora countdown, start/end timestamps, and chart-grounded Parashari interpretation. |
| **MOB-05** | Predictions | Missing Multi-Horizon Prediction engine entirely. No Daily, Weekly, Monthly, Yearly, or 5-Year Mahadasha tabs. | Critical | Build `MultiHorizonView` supporting all 6 temporal horizons with standardized 7-section reporting (Outlook, Supportive, Cautions, Time Windows, Grounding, Reflection, Limitations). |
| **MOB-06** | AI Astrologer | Generic single-field prompt with no persona selection, no session duration timer, and no wallet metering. | High | Implement `ConsultationModal` with 3 authentic Vedic AI personas (Acharya Devratan, Dr. Sunita Shastri, Pandit Raghavendra), live call/chat duration timer, and wallet deduction. |
| **MOB-07** | Clutter & Fake Data | Directory screen displayed fake online status indicators, unverified session counts (14,200+ orders), and nonfunctional video call buttons. | Medium | Purge fake livestreams, fake viewer counts, and unverified human claims. Clearly disclose AI personas as intelligent Vedic consultation agents. |

---

## 4. Mobile Scope Classification

### 4.1 CORE FEATURES (Retained in Primary Mobile Navigation)
1. **Personal Hourly Guidance (Hero Experience)**: Active Hora ruler, live millisecond-precise countdown, start/end times, and chart-grounded recommendations.
2. **Professional Kundli & Divisional Charts**: Native North Indian diamond SVG rendering of D1 (Lagna), D9 (Navamsha), D10 (Dashamsha), Moon Chart, and Chalit Chart.
3. **Planetary Positions & Ephemeris Table**: Degrees, signs, houses, Nakshatras, Padas, retrograde flags, and Chara Karakas.
4. **Multi-Horizon Predictions Engine**: Horizon tabs for Hourly (Hora), Daily (24h), Weekly (7 Days), Monthly (4 Weeks), Yearly (12 Months), and Mahadasha (5-Year Arc).
5. **Interactive AI Astrologer Consultation**: 3 distinct personas with chart context injection, live duration timer, and wallet metering.
6. **Persistent User Accounts & Multi-Profile Management**: Login/Register, persistent storage, switching between saved birth profiles, and saved report history.
7. **Transparent Freemium Gating**: Free Kundli, Horas, Hourly, and Daily previews; ₹49 one-time wallet unlock for deep Weekly/Monthly/Yearly reports.

### 4.2 PURGED / DEFERRED FROM PRIMARY NAVIGATION
- Large desktop promotional banners.
- Fake human astrologer availability and decorative viewer counts.
- Non-functional video calling and livestreaming mockups.
- Unimplemented Astromall e-commerce and Puja booking controls.
- Administrative management console (restricted to secure web admin).
