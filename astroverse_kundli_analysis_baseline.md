# ASTROVERSE KUNDLI ANALYSIS & ASHTAKAVARGA BASELINE AUDIT
## Phase 0 Forensic Inspection, Tab Inventory & Defect Reproduction

**Date:** 29 October 2026  
**Repository:** `E:\rea`  
**Git Branch:** `feature/premium-reports-and-subscriptions`  
**Starting Commit:** `c2923c73533a42a556a086eedad5877c832f2e86`  
**Clean Working Tree:** Verified with `git status --short` (0 uncommitted changes)  
**Whitespace Check:** `git diff --check` passed with 0 errors  

---

## 1. Baseline Test Suite Execution

### 1.1 Node.js Wallet Service Suite (`npm --prefix services/wallet-service test`)
- **Total Test Suites:** 16
- **Test Suites Passed:** 16 (100%)
- **Test Suites Failed:** 0
- **Suites Executed:**
  1. `tests/auth.test.ts`
  2. `tests/supabase_auth.test.ts`
  3. `tests/chat_frontend_logic.test.ts`
  4. `tests/monetization.test.ts`
  5. `tests/pdf_fixtures.test.ts`
  6. `tests/differentiation.test.ts`
  7. `tests/pdf_quality_regression.test.ts`
  8. `tests/numerology.test.ts`
  9. `tests/razorpay_compliance.test.ts`
  10. `tests/privacy_and_form_state.test.ts`
  11. `tests/security_and_ratelimit.test.ts`
  12. `tests/dosha_yoga_parity.test.ts`
  13. `tests/admin_security_mfa_and_modules.test.ts`
  14. `tests/ai_astrologer_conversation_quality.test.ts`
  15. `tests/promotions_and_free_minute.test.ts`
  16. `tests/admin_tier_preview_and_security.test.ts`

### 1.2 Python Kundli & Ephemeris Engine (`pytest services/kundli-engine/tests`)
- **Collected Test Items:** 112
- **Passed:** 110
- **Skipped:** 2 (External Prokerala network credentials optional in offline CI)
- **Failed:** 0
- **Execution Time:** 11.49s

---

## 2. Forensic Reproduction of Reported Defects

### 2.1 The Ashtakavarga 336 vs 337 Inconsistency & Twelve 28s
- **Observable Failure in Screenshot:**
  - Tab: `Ashtakavarga`
  - Subtabs: Only `SAV (Total)`, `Jupiter BAV`, `Saturn BAV`, `Sun BAV` are visible.
  - Heading: `Parashari Ashtakavarga Bindu Matrix (337 Total Points)`
  - Grid Display: Twelve zodiac sign cells, each displaying `28`.
  - Arithmetic Sum: `12 * 28 = 336`, contradicting the heading's declared total of 337 points.
- **Root Cause Tracing:**
  1. **Object Key vs Numeric Index Access:** In `index.html` line 27409, `scores` receives `fd.ashtakavarga.sarvashtakavarga`. In the calculation engine (`ashtakavarga_engine.py`), `sarvashtakavarga` is a dictionary keyed by zodiac sign name: `{"Aries": 31, "Taurus": 34, ...}`.
  2. In `index.html` line 27415, the cell rendering logic reads:
     ```javascript
     const pts = scores[idx] !== undefined ? scores[idx] : 28;
     ```
     Because `idx` is a number (`0, 1, 2, ... 11`), accessing `scores[0]` on an object keyed by `"Aries"` returns `undefined`!
  3. Consequently, for every single sign, `scores[idx] !== undefined` evaluates to `false`, and the fallback value `28` is rendered.
  4. 12 cells displaying 28 sum to 336 instead of the true Parashari total 337.
  5. **Nonexistent Click Handler on BAV Buttons:** In `index.html` lines 6517-6520, buttons call `onclick="renderAshtakavargaGrid('Jupiter')"`. But `renderAshtakavargaGrid` is **completely undefined** in `index.html` (the existing function is named `renderKundliAshtakavargaView`). Clicking any subtab threw an uncaught `ReferenceError: renderAshtakavargaGrid is not defined`!
  6. **Missing BAV Planets:** The HTML only provides buttons for `SAV (Total)`, `Jupiter BAV`, `Saturn BAV`, and `Sun BAV`. `Moon BAV`, `Mars BAV`, `Mercury BAV`, and `Venus BAV` are entirely missing from the DOM.
  7. **Hardcoded PDF Template:** In `index.html` line 22655, the PDF generation function `downloadKundliBasicPdf` hardcodes static values `31, 34, 29, 30, 35, 27, 32, 25, 33, 28, 30, 26` instead of consuming calculated chart bindus.

### 2.2 Tab Interaction & Content Rendering Inventory
- **`Divisional (D1–D60)` (`#btn-kw-vargas`, `#kw-pane-vargas`):**
  - Event Handler: `switchKundliTab('vargas')` -> `renderKundliVargasView()`.
  - Issue: Renders a textual table of planetary placements, but lacks a visual North Indian Diamond SVG chart for the selected Varga. Furthermore, non-standard divisional charts fall back to a naive modulo formula rather than authentic Parashari rules.
- **`Strength & Avasthas` (`#btn-kw-shadbala`, `#kw-pane-shadbala`):**
  - Event Handler: `switchKundliTab('shadbala')` -> `renderKundliShadbalaView()`.
  - Issue: If backend `shadbala` is not supplied, it falls back to static hardcoded values.
- **`Dasha & Transits` (`#btn-kw-dashas`, `#kw-pane-dashas`):**
  - Event Handler: `switchKundliTab('dashas')` -> `renderKundliDashasView()`.
  - Issue: The sub-periods cannot be expanded into individual Antardashas, and transit calculations relative to natal Lagna/Moon are missing from the pane.
- **`Yogas & Doshas` (`#btn-kw-yogas`, `#kw-pane-yogas`):**
  - Event Handler: `switchKundliTab('yogas')` -> `renderKundliYogasView()`.
  - Issue: Dosha badge containers (`#pill-manglik-verdict`, `#desc-manglik-text`, etc.) are only populated during the initial calculation, but not refreshed upon tab switching.
- **`Upagrahas` (`#btn-kw-upagrahas`, `#kw-pane-upagrahas`):**
  - Event Handler: `switchKundliTab('upagrahas')` -> `renderKundliUpagrahasView()`.
  - Issue: Evaluates only 7 sub-planets using approximate Sun offsets rather than full 11 classical Upagrahas (5 Sun-based + 6 Kalavelas).

---

## 3. Authoritative Architectural Remediation Plan

1. **One Canonical Calculation Engine:**
   - Implement an authentic, client-safe Parashari Ashtakavarga engine in JavaScript within `index.html` (matching `ashtakavarga_engine.py`) so that both online API responses and offline client calculations compute the exact 337-point SAV matrix and 7 planetary BAV matrices.
2. **Ashtakavarga UI & Subtab Overhaul:**
   - Expose all 8 selectors: `SAV (Total)`, `Sun BAV (48)`, `Moon BAV (49)`, `Mars BAV (39)`, `Mercury BAV (54)`, `Jupiter BAV (56)`, `Venus BAV (52)`, `Saturn BAV (39)`.
   - Correctly resolve sign bindus using sign names (`scores[sign] ?? scores[idx]`).
   - Dynamically update the heading, description, total bindus, and transit auspiciousness badge based on the active selection.
3. **Divisional Charts (Vargas D1–D60):**
   - Render both an SVG North Indian Diamond Chart and the planetary placements table for any selected Varga.
   - Support authentic Parashari mapping rules for the 16 Shodashavarga charts.
4. **Shadbala & Avasthas:**
   - Present detailed sixfold strength breakdowns (Sthana, Dig, Kala, Cheshta, Naisargika, Drik) in Rupas and Virupas.
   - Display authentic Baladi and Jagradadi Avasthas, along with Ishta/Kashta Phala calculations.
5. **Dasha & Transits:**
   - Enable interactive expansion of Antardashas under the active Mahadasha with exact date boundaries.
   - Add a Gochara (Transit) table computing live transits of Saturn, Jupiter, Rahu, Ketu, Sun, and Mars relative to natal Lagna and Moon.
6. **Yogas & Doshas:**
   - Synchronize dosha status cards and classical yoga registry with verified BPHS evidence upon tab activation.
7. **Complete Kundli PDF Consistency:**
   - Wire the active calculated chart's SAV and BAV bindu scores directly into the 5-page Kundli publication PDF template.
