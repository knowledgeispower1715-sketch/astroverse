# ASTROVERSE — VIMSHOTTARI DASHA INTELLIGENCE & PERSONALIZED KUNDLI SUMMARY BASELINE AUDIT

**Author:** Principal Vedic Astrology Systems Architect, Senior Parashari Jyotish Specialist, Full-Stack QA Lead  
**Target Repository:** `E:\rea`  
**Active Branch:** `feature/premium-reports-and-subscriptions`  
**Starting Commit:** `1a199df3938924e7695d12be8457c2abd4715578`  
**Audit Timestamp:** October 29, 2026  
**Status:** **PHASE 0 BASELINE AUDIT COMPLETE**

---

## 1. Executive Baseline Summary

A comprehensive architectural and astrological audit of AstroVerse's Vimshottari Dasha calculation, presentation, interpretation pipeline, and privacy guards was executed across the codebase (`index.html`, `services/kundli-engine/`, and `services/wallet-service/`).

### Key Findings & Structural Diagnoses

1. **Client Timeline Decoupling from Calculation Engine**:
   - In `index.html`, `calculateClientKundli` calculates `activeNow` (current Mahadasha and Antardasha based on Moon's sidereal degree and remaining fraction), but omits the full 120-year `timeline` array of Mahadashas and nested Antardashas from its returned `vimshottari_dasha` payload.
   - Consequently, `renderKundliDashasView` in `index.html` was falling back to iterating over a static array `lords = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury']` instead of the native's chronologically ordered birth-timeline.
   - The timeline cards showed planetary names and static durations (e.g., "Jupiter Mahadasha (16 Years)"), but lacked start and end calendar dates, past/current/future status indicators, and chronological progression from birth.
   
2. **Missing Structured Dasha Interpretation Layer**:
   - The Dasha tab displayed only the basic active period card (`disp-cur-maha`, `disp-cur-antar`, `disp-dasha-fill`, `disp-dasha-start`, `disp-dasha-end`) without explaining the astrological significance of the active planetary periods.
   - Users were not provided an explanation of:
     * Functional house lordships of the Mahadasha lord from the natal Lagna.
     * Placement (house, sign, dignity) of the Mahadasha and Antardasha lords.
     * The Sambandha (relationship) between the Mahadasha and Antardasha lords (e.g., Kendra, Trikona, Shadashtaka 6/8, Dvidvadasha 2/12).
     * Supportive indications vs. challenging friction points.
     * Actionable practical guidance and traditional qualified remedies.
     * Upcoming Antardasha and Mahadasha transition dates.

3. **Backend `dasha_engine.py` Schema Gaps**:
   - In `services/kundli-engine/dasha_engine.py`, `active_now` returns `maha_dasha`, `antar_dasha`, `start_date`, `end_date`, and `progress_percent`.
   - However, `start_date` and `end_date` in `active_now` represented the *Mahadasha* start and end dates, rather than distinguishing between `maha_start_date` / `maha_end_date` and `antar_start_date` / `antar_end_date`.
   - The `next_transition` date and the Antardasha progress fraction were not separately surfaced.

4. **Privacy by Default Audit**:
   - In `index.html`, primary birth input fields (`input-k-name`, `input-k-dob`, `input-k-tob`, `input-k-city-search`) are blank by default (`value=""`).
   - However, several fallback expressions across the codebase referenced static placeholder cities (e.g., `|| 'Jabalpur, Madhya Pradesh, India'`). These fallbacks must be replaced with strict null/blank-safe defaults so that no personal details appear in fresh sessions or unpopulated charts.
   - When no chart has been calculated, the Dasha panel must explicitly render a clean "No Chart Loaded" guidance state rather than displaying ungrounded period data.

5. **PDF & Report Consistency**:
   - The downloadable PDF report and online report reader must consume the canonical structured Dasha interpretation object, ensuring that the active lords, dates, placements, and guidance match the UI exactly in both English and Hindi.

---

## 2. Calculation Baseline & Classical Jyotish Rules

### 2.1 Vimshottari Sequence & Period Durations (120-Year Parashari Standard)

| Index | Mahadasha Lord | Duration (Years) | Associated Nakshatras (Ashwini to Revati) |
| :---: | :--- | :---: | :--- |
| 1 | **Ketu** | 7 | Ashwini (1), Magha (10), Moola (19) |
| 2 | **Venus (Shukra)** | 20 | Bharani (2), Purva Phalguni (11), Purva Ashadha (20) |
| 3 | **Sun (Surya)** | 6 | Krittika (3), Uttara Phalguni (12), Uttara Ashadha (21) |
| 4 | **Moon (Chandra)** | 10 | Rohini (4), Hasta (13), Shravana (22) |
| 5 | **Mars (Mangal)** | 7 | Mrigashira (5), Chitra (14), Dhanishta (23) |
| 6 | **Rahu** | 18 | Ardra (6), Swati (15), Shatabhisha (24) |
| 7 | **Jupiter (Guru)** | 16 | Punarvasu (7), Vishakha (16), Purva Bhadrapada (25) |
| 8 | **Saturn (Shani)** | 19 | Pushya (8), Anuradha (17), Uttara Bhadrapada (26) |
| 9 | **Mercury (Budha)** | 17 | Ashlesha (9), Jyeshtha (18), Revati (27) |
| **Total** | **9 Lords** | **120.0** | **27 Nakshatras** |

### 2.2 Balance of Dasha at Birth Formula
$$\text{Nakshatra Span} = 13^\circ 20' = 13.3333^\circ$$
$$\text{Nakshatra Index} = \lfloor \text{Moon Longitude} / 13.3333^\circ \rfloor$$
$$\text{Degree Elapsed in Nakshatra} = \text{Moon Longitude} \pmod{13.3333^\circ}$$
$$\text{Fraction Remaining} = \frac{13.3333^\circ - \text{Degree Elapsed}}{13.3333^\circ}$$
$$\text{Initial Dasha Balance (Years)} = \text{Fraction Remaining} \times \text{Duration}(\text{Birth Lord})$$

### 2.3 Proportional Antardasha Duration Formula
$$\text{Antardasha Duration (Years)} = \frac{\text{Duration}(\text{Maha Lord}) \times \text{Duration}(\text{Antar Lord})}{120.0}$$

---

## 3. Automated Test Suite Baseline

- **Node.js / TypeScript Test Harness (`services/wallet-service`)**:
  - Command: `npm --prefix services/wallet-service test`
  - Suites run: 17 test suites (auth, supabase_auth, chat_frontend_logic, monetization, pdf_fixtures, differentiation, pdf_quality_regression, numerology, razorpay_compliance, privacy_and_form_state, security_and_ratelimit, dosha_yoga_parity, admin_security_mfa_and_modules, ai_astrologer_conversation_quality, promotions_and_free_minute, admin_tier_preview_and_security, kundli_analysis_and_ashtakavarga).
  - Result: **17 passed, 0 failed (100% pass rate)**.
- **Python Calculation Test Suite (`services/kundli-engine`)**:
  - Command: `python -m pytest services/kundli-engine/tests`
  - Tests run: 118 items.
  - Result: **116 passed, 2 skipped (100% of runnable tests passed)**.
- **Repository Hygiene**:
  - Command: `git diff --check`
  - Result: **0 whitespace or syntax errors**.

---

## 4. Phase-by-Phase Remediation Roadmap

1. **Phase 1 & 2: Authoritative Dasha Pipeline & Canonical Dasha Result Object**:
   - Upgrade Python `dasha_engine.py` and client `calculateClientKundli` to produce a unified, canonical Vimshottari result schema containing:
     * Full chronologically ordered 120-year timeline starting from birth with real calendar dates (`start_date`, `end_date`, `duration_years`, `status`: PAST, CURRENT, FUTURE).
     * Nested 9 Antardashas within each Mahadasha with exact start/end dates, duration in months, and active flags.
     * Fine-grained `active_now` detailing `maha_dasha`, `antar_dasha`, `maha_start_date`, `maha_end_date`, `antar_start_date`, `antar_end_date`, `next_transition_date`, `maha_progress_pct`, and `antar_progress_pct`.
     * Strict cache/snapshot invalidation upon chart selection.

2. **Phase 3 & 4: Structured Dasha Interpretation Engine (English & Hindi)**:
   - Build a deterministic, chart-grounded interpretation generator that evaluates:
     * Natural & functional significations of Mahadasha and Antardasha lords from the natal Lagna.
     * Mutual Sambandha (e.g. Kendra/Trikona vs 6/8 Shadashtaka or 2/12 Dvidvadasha).
     * Dignity, house placement, aspects, and conjunctions.
     * Synthesizes: Executive Summary, Key Period Emphases (Career, Finance, Relationships, Health/Spiritual), Supportive Factors, Challenges & Watch-outs, Practical Actionable Guidance, Timing & Transitions, and Qualified Parashari Remedies.
     * Full bilingual support (English and natural Devanagari Hindi).

3. **Phase 5 & 6: Redesign the Active Dasha Card & Rebuild the 120-Year Timeline**:
   - Modernize the active card with dual-progress indicators, transition countdown, and expandable "Why this interpretation?" technical reasoning drawer.
   - Rebuild the 120-year timeline as a clean, chronological timeline with automatic scrolling to the current active period, accessible accordion expansion of all 9 Antardashas, responsive mobile styling without nested scroll traps.

4. **Phase 7 & 8: Dasha & Transits Integration, Privacy by Default & No-Chart State**:
   - Cross-reference active Gochara transits (Jupiter, Saturn, Rahu, Ketu, Mars) with the active Dasha lords and natal houses.
   - Guarantee blank-by-default behavior when no chart is loaded, rendering a helpful prompt instead of ungrounded calculations.
   - Purge static fallback strings.

5. **Phase 9, 10 & 11: Bilingual Narration, PDF Synchronization & Schema Validation**:
   - Wire English/Hindi toggles to Dasha voice narration and transcripts.
   - Synchronize Chapter 5/Dasha sections of the Kundli PDF report with the canonical interpretation snapshot.

6. **Phase 12–14: Comprehensive Test Suite, Verification & Release**:
   - Author a dedicated test suite verifying all 9 Mahadashas, 120-year cycle, Antardasha boundaries, bilingual output, privacy defaults, and PDF agreement.
   - Commit, push, and verify live Vercel production deployment.
