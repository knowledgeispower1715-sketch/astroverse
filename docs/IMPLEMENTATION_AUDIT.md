# Forensic Implementation Audit: Astroverse Astrology Platform

**Audit Date:** 2026-10-20  
**Project:** Astroverse / Astrotalk-Class Vedic Platform  
**Auditor:** Principal Software Architect & QA Lead  
**Scope:** Complete repository codebase, services, calculations, UI components, data isolation, and deployment configurations.

---

## 1. Executive Summary

This forensic audit evaluates all application modules in `E:\rea`. The project previously contained a hybrid static prototype (`index.html`) alongside microservices (`kundli-engine`, `wallet-service`, `consultation-service`). While the visual styling and baseline ephemeris structures were drafted, multiple modules relied on hardcoded prefilled demo profiles (e.g., "Aarav Sharma"), mock wallet balances, simulated timers, and partial koota score approximations. 

This document tracks every component, its defects, required remediation, and verification status using standard criteria:
- `VERIFIED_WORKING`: Fully verified with executable tests and observed outputs.
- `IMPLEMENTED_BUT_BROKEN`: Functional code present but contains edge-case or mathematical defects.
- `FRONTEND_ONLY`: Visual interface exists but lacks backend persistence or real calculation logic.
- `MOCK_DATA`: Contains hardcoded values passed off as dynamic outputs.
- `MISSING`: Not yet implemented.
- `BLOCKED_EXTERNAL_CONFIGURATION`: Integration boundary built, awaiting production API keys/credentials (e.g., SMS OTP gateway, Razorpay live keys).

---

## 2. Module-by-Module Forensic Inventory

### Module 1: Authentication & User Session Management
- **Relevant Files:** `index.html`, `services/wallet-service/src/server.ts`, `prisma/schema.prisma`
- **Initial Status:** `MOCK_DATA` / `FRONTEND_ONLY`
- **Identified Defects:**
  - No dedicated login/signup modal with phone OTP and email flows.
  - User ID was hardcoded as `user_101` in client consultation scripts.
  - No session tokens, account switcher, or sign-out capability.
- **Required Modifications:**
  - Implement full modal authentication for Phone (with country code validation and OTP cooldown) and Email.
  - Implement persistent session store (JWT/localStorage and backend session model).
  - Implement User Profile Switcher allowing users to create, view, switch, and delete multiple birth profiles (Self, Spouse, Child, Friend).
- **Verification Procedure:** Test OTP generation, token verification, session persistence across page reloads, and sign-out.
- **Target Status:** `VERIFIED_WORKING` (with simulated local OTP provider when external SMS gateway is unconfigured).

---

### Module 2: Free Janam Kundli Generation (D1, D9, D10, Moon, Chalit)
- **Relevant Files:** `index.html`, `services/kundli-engine/ephemeris.py`, `divisional_charts.py`, `main.py`
- **Initial Status:** `IMPLEMENTED_BUT_BROKEN` / `MOCK_DATA`
- **Identified Defects:**
  - Form prefilled with "Aarav Sharma", "1996-11-24", violating empty-state policy.
  - Chalit Chart and D10 Dashamsha were stubbed or lacked exact Bhava Chalit cusp math.
  - Ketu calculation in `ephemeris.py` used `deg % 30` rather than 360° opposite longitude calculation, creating small Nakshatra boundary shifts.
- **Required Modifications:**
  - Remove all prefilled dummy names and dates; implement clean empty-state with validation.
  - Correct Ketu exact longitude (`(rahu_lon + 180) % 360`).
  - Implement exact D10 (Dashamsha) divisional calculations for career and status.
  - Implement authentic Bhava Chalit cusp calculations.
  - Render North Indian diamond SVG with dynamic 12-house signs and planetary degree labels.
- **Verification Procedure:** Compare computed Lagna and Graha longitudes against Swiss Ephemeris Lahiri standards for known test coordinates.
- **Target Status:** `VERIFIED_WORKING`

---

### Module 3: Vimshottari Dasha Engine
- **Relevant Files:** `services/kundli-engine/dasha_engine.py`, `index.html`
- **Initial Status:** `IMPLEMENTED_BUT_BROKEN`
- **Identified Defects:**
  - Sub-periods (Antardasha and Pratyantardasha) were partially hardcoded in the frontend view.
  - Only Mahadashas were calculated end-to-end; sub-period proportionality formula required exact fractional calculation.
- **Required Modifications:**
  - Implement mathematical Antardasha calculation: `Antardasha duration = (Maha_years * Antar_years) / 120`.
  - Implement Pratyantardasha breakdown and active period highlighting.
  - Sync frontend timeline bar with exact active sub-dasha.
- **Verification Procedure:** Unit test Dasha sequence starting from Ashwini (Ketu) through Revati (Mercury) with fractional balance at birth.
- **Target Status:** `VERIFIED_WORKING`

---

### Module 4: Dosha Analysis & Classical Remedies
- **Relevant Files:** `services/kundli-engine/doshas_and_remedies.py`, `index.html`
- **Initial Status:** `IMPLEMENTED_BUT_BROKEN`
- **Identified Defects:**
  - Manglik cancellation rules only checked 2 criteria; classical rules (Jupiter aspect on Mars, Mars in Aries/Scorpio/Capricorn, Mars in 8th in Sagittarius) were incomplete.
  - Kaal Sarp logic defaulted to `has_kalsarp: True` regardless of planetary distribution.
  - Shani Sade Sati calculation was hardcoded to Phase 1.
- **Required Modifications:**
  - Implement true Kaal Sarp boundary test: verify if all 7 planets fall between Rahu and Ketu longitudes.
  - Implement dynamic Shani Sade Sati calculation based on transiting Saturn in Pisces relative to natal Moon sign.
  - Comprehensive Manglik rules with classical Parashari cancellation conditions.
- **Verification Procedure:** Test birth charts with known full Kaal Sarp vs. no Kaal Sarp, and verified Sade Sati phases.
- **Target Status:** `VERIFIED_WORKING`

---

### Module 5: 24-Hour Planetary Horas & Hourly Predictions
- **Relevant Files:** `services/kundli-engine/hora_engine.py`, `index.html`
- **Initial Status:** `IMPLEMENTED_BUT_BROKEN`
- **Identified Defects:**
  - Frontend hourly grid displayed 24 fixed 60-minute blocks instead of unequal day and night Hora intervals calculated from sunrise/sunset.
  - Only generic advice was provided without weekly, monthly, and yearly prediction extensions.
- **Required Modifications:**
  - Calculate exact 12 daytime and 12 nighttime Horas using true sunrise/sunset duration divided by 12.
  - Follow the classical Chaldean order: Saturn -> Jupiter -> Mars -> Sun -> Venus -> Mercury -> Moon starting from the weekday ruler.
  - Add Rahu Kaal, Gulika Kaal, and Abhijit Muhurta calculations.
  - Add Weekly, Monthly, and Yearly predictions tabs.
- **Verification Procedure:** Verify that sunrise to sunset is divided into 12 equal parts and sunset to next sunrise into 12 equal parts with continuous boundary timestamps.
- **Target Status:** `VERIFIED_WORKING`

---

### Module 6: Ashtakoota 36-Guna Kundli Matching
- **Relevant Files:** `services/kundli-engine/matchmaking.py`, `index.html`
- **Initial Status:** `MOCK_DATA`
- **Identified Defects:**
  - `varna_score`, `vashya_score`, `yoni_score`, `maitri_score`, `bhakoot_score` were hardcoded constants (1, 2, 3, 4, 7).
  - Score displayed sample 31.5/36 without real matrix lookups.
- **Required Modifications:**
  - Implement authentic Varna (1), Vashya (2), Tara (3), Yoni (4), Graha Maitri (5), Gana (6), Bhakoot (7), and Nadi (8) calculation tables.
  - Implement Nadi Dosha detection and Bhakoot Dosha cancellation rules.
  - Enforce sum total matching: `Total = Varna + Vashya + Tara + Yoni + Maitri + Gana + Bhakoot + Nadi <= 36`.
  - Empty state when either profile input is missing.
- **Verification Procedure:** Unit test all 8 Kootas with known paired Moon signs and Nakshatras.
- **Target Status:** `VERIFIED_WORKING`

---

### Module 7: AI Astrologer Guru & Consultation HUD
- **Relevant Files:** `services/kundli-engine/ai_astrologer.py`, `index.html`, `mobile-client/`
- **Initial Status:** `FRONTEND_ONLY` / `MOCK_DATA`
- **Identified Defects:**
  - Chat responses were hardcoded one-line timeouts.
  - Consultation HUD deducted wallet balance without persistent server ledger validation.
  - User had no real AI conversational astrologer capable of answering custom questions with chart grounding.
- **Required Modifications:**
  - Implement an intelligent, chart-grounded AI consultation engine that reads the user's computed Lagna, Moon sign, 10th house, 7th house, active Dasha, and transits.
  - Support questions on Career, Marriage, Wealth, Health, and custom freeform questions with Parashari remedies.
  - Add voice synthesis / speech output option for consultation realism.
- **Verification Procedure:** Test AI question queries with various chart inputs; confirm readings reference calculated chart factors.
- **Target Status:** `VERIFIED_WORKING`

---

### Module 8: Wallet Ledger & Razorpay Integration
- **Relevant Files:** `services/wallet-service/src/server.ts`, `ledger.ts`, `razorpay.ts`
- **Initial Status:** `IMPLEMENTED_BUT_BROKEN` / `BLOCKED_EXTERNAL_CONFIGURATION`
- **Identified Defects:**
  - Razorpay credentials are test placeholders.
  - Client-side wallet balance was stored only in a JavaScript variable, lost on page refresh.
- **Required Modifications:**
  - Implement persistent wallet state linked to authenticated user profile.
  - Implement double-entry ledger transactions (`WALLET_RECHARGE`, `CONSULTATION_DEBIT`, `PUJA_BOOKING`).
  - Provide graceful test-mode recharge handler when live Razorpay webhooks are not configured.
- **Verification Procedure:** Execute recharge, verify ledger entry creation, verify balance increment and decrement on consultation.
- **Target Status:** `VERIFIED_WORKING`

---

### Module 9: Astromall & Vedic Puja Services
- **Relevant Files:** `index.html`, `services/wallet-service/`
- **Initial Status:** `FRONTEND_ONLY`
- **Identified Defects:**
  - Store items only triggered client alert dialogs without order placement or ledger recording.
- **Required Modifications:**
  - Implement real order placement flow with wallet debit, stock/certificate metadata, and order history view in user dashboard.
  - Implement online Puja booking flow with Pandit assignment metadata and date picker.
- **Verification Procedure:** Order gemstone and puja, verify wallet balance debit and order history persistence.
- **Target Status:** `VERIFIED_WORKING`

---

## 3. Summary of Gaps & Execution Roadmap

| Area | Current State | Target State | Priority |
| :--- | :--- | :--- | :--- |
| **Empty States & Form Pre-fill** | Contains sample user details | 100% clean, validated empty states | P0 |
| **Astrology Calculations** | Simplified/mocked formulas | True Ephemeris, D1/D9/D10/Chalit, 36-Guna | P0 |
| **Hora & Predictions** | Static 24 hours | Calculated sunrise/sunset unequal Horas | P0 |
| **Authentication & Profiles** | None (client variable) | Real modal auth, multi-profile manager | P0 |
| **AI Astrologer Intelligence** | Canned timeout strings | True chart-grounded Parashari AI | P1 |
| **UI/UX Fluidity** | Static CSS transitions | Modern GSAP-powered motion & responsiveness | P1 |
| **Documentation & Tests** | Minimal / missing | Complete test suite & technical docs | P0 |
