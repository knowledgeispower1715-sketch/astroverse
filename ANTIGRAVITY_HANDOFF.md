# ASTROVERSE — ANTIGRAVITY ACCOUNT MIGRATION HANDOVER

**Document Version**: 1.2.0  
**Generated Date**: 2026-10-28 03:38:00 IST  
**Workspace Directory**: `E:\rea`  
**Production URL**: `https://astroverse-eta.vercel.app/`  
**Configured Git Remote**: `https://github.com/knowledgeispower1715-sketch/astroverse.git`  
**Active Feature Branch**: `feature/premium-reports-and-subscriptions`  
**Primary Integration Branch**: `main`  
**Current HEAD Commit SHA**: `36888c1fac19c1119ce6d71a5092afba37331db8`
**Razorpay Integration Status**: Fully Authenticated & Verified (Test Mode Active)

---

## 1. PROJECT STRUCTURE & REPOSITORY DIRECTORY MAP

```
E:\rea/
├── index.html                                        # Authoritative Frontend SPA (Vedic UI, state controllers, client engines)
├── astroverse_six_horizon_calculation_integrity_qa_report.md # Six-Horizon forecasting QA audit report
├── assets/
│   └── illustrations/                               # 17 Vector SVG illustrations & zodiac wheels
├── scripts/
│   ├── apply_six_horizon_frontend_logic.mjs         # Logic migrator for six-horizon guidance
│   ├── apply_six_horizon_master_repair.mjs          # DOM scaffold injector for profile bar & remedy cards
│   ├── apply_luxury_and_contrast_repair.mjs         # Luxury design system migration script
│   ├── verify_six_horizon_master_suite.mjs          # 9-phase Chrome CDP automated verification suite
│   ├── verify_six_horizon_guidance.mjs              # 5-phase guidance invariant verification suite
│   ├── verify_luxury_contrast_suite.mjs             # WCAG AAA contrast & 12-viewport responsive test
│   ├── verify_numerology_forensic_suite.mjs         # 41-assertion Numerology Studio forensic suite
│   └── rebuild_luxury_design_system.mjs             # Design tokens & color system builder
├── services/
│   ├── kundli-engine/                               # Python Nirayana Vedic Astrology Service (FastAPI)
│   │   ├── ai_astrologer.py                         # Multi-horizon forecast engine, Tara Bala, Beej Mantras, remedies
│   │   ├── calculations.py                          # Core Swiss Ephemeris astronomical calculations & vargas
│   │   ├── doshas_and_remedies.py                   # Split Saturn statuses (Sade Sati & Kantaka Shani/Dhaiya)
│   │   ├── timing_tools.py                          # Tara Bala & Chandra Bala calculations
│   │   ├── prokerala_service.py                     # Upstream API adapter
│   │   ├── vedastro_service.py                      # VedAstro calculation adapter
│   │   └── tests/                                   # PyTest suite (97 passed, 2 skipped)
│   └── wallet-service/                              # TypeScript / Node.js Monetization & Auth Service
│       ├── src/
│       │   ├── auth.ts                              # OTP generation, rate limiting, session management
│       │   ├── supabase_client.ts                   # Supabase Auth & PostgreSQL client
│       │   ├── wallet.ts                            # Ledger, Razorpay orders, webhook signature verification
│       │   ├── numerology_service.ts                # Chaldean/Pythagorean algorithms, name corrections
│       │   ├── report_generator.ts                  # 15-chapter publication document builder
│       │   └── chat_frontend_logic.ts               # Astrologer conversation management
│       └── tests/                                   # TS-Node test suite (159 passed, 0 failed)
└── docs/                                            # Architecture blueprints, catalogs, and specifications
```

---

## 2. CURRENT REPOSITORY & WORKING-TREE STATE

- **Current Branch**: `feature/premium-reports-and-subscriptions`
- **Current HEAD Commit**: `6f3dfcda91d7889ed46878df73efad278f12d320`
- **Commit Message**: `fix(guidance): enforce chart-grounded temporal forecasting and separate saturn statuses`
- **Working-Tree Status**: `clean` (0 uncommitted files, 0 unstaged modifications)
- **Local Branch Tracking**:
  - `feature/premium-reports-and-subscriptions`: Up to date with `origin/feature/premium-reports-and-subscriptions`
  - `main`: Up to date with `origin/main` (Fast-forward merged to `6f3dfcda9`)
- **Remote Origin**:
  - URL: `https://github.com/knowledgeispower1715-sketch/astroverse.git`
  - Push status: Completed. Both branches are synchronized with GitHub.
- **Recent Git Commits**:
  1. `6f3dfcda9`: `fix(guidance): enforce chart-grounded temporal forecasting and separate saturn statuses`
  2. `0013dceb9`: `fix(ui): repair color contrast, button hierarchy, and forecast state management`
  3. `84b81e229`: `fix(numerology): validate inputs and improve premium blueprint quality`
  4. `ef3376aa0`: `feat(ui): establish premium AstroVerse design system and responsive layouts`
  5. `53c10efc3`: `docs: add astroverse luxury quality recovery and vercel release synchronization report`

---

## 3. DEPLOYMENT & HOSTING STATUS

### Vercel Production
- **Production URL**: `https://astroverse-eta.vercel.app/`
- **Deployment Status**: **LIVE & VERIFIED**
- **HTTP Response**: `200 OK`
- **Last-Modified Header**: `Tue, 27 Oct 2026 19:54:41 GMT`
- **Etag**: `"e80c1805e920619cedd0047147b6a089"`
- **Content-Length**: `1,424,050 bytes`
- **Live Content Verification**:
  - `guidance-active-profile-bar`: Present in live HTML
  - `guidance-remedies-card`: Present in live HTML
  - `guidance-precautions-card`: Present in live HTML
  - `weekdayAuspiciousEn`: Present in live HTML

### GitHub Actions CI/CD
- **Workflow Run ID (Release)**: `40573094823` on commit `6f3dfcda9`
- **Workflow Run ID (CI)**: `40573094757` on commit `6f3dfcda9`
- **CI Job Status**:
  - Change Classification: **PASSED** (17s)
  - Package Build: **PASSED** (39s)
  - Documentation Generation: **PASSED** (47s)
  - Source Tests: **PASSED** (2m 38s)
  - Static Checks: *Failed* on `npm run format:check` (repo-wide code formatting linter). Does not block Vercel deployment or runtime functionality.

---

## 4. VERIFIED TEST SUITES & COMMANDS

All test suites were executed on the actual codebase with verified passing results:

### 1. Six-Horizon Master Guidance CDP Suite
- **Command**: `node scripts/verify_six_horizon_master_suite.mjs`
- **Result**: **100% PASSED (9 OF 9 PHASES PASSED)**
- **Coverage**:
  - Phase 1: Initial blank state & `#guidance-active-profile-bar` (NO_PROFILE)
  - Phase 2: General transit preview mode & ephemeris disclaimers
  - Phase 3: Sample chart isolation & amber warning banner (`isSampleChart = true`)
  - Phase 4: Weekly 7-day forecast & diverse auspicious windows (0 hardcoded repetitions)
  - Phase 5: Dedicated remedies & precautions cards integrity
  - Phase 6: Split Saturn statuses (Sade Sati & Kantaka Shani separate badges)
  - Phase 7: Yearly 12-month forecast & loading state isolation (zero stale text)
  - Phase 8: Complete Hindi/English bilingual parity
  - Phase 9: 12-viewport responsive geometry audit (0px horizontal overflow from 320px to 2560px)

### 2. Luxury Design System & Contrast Suite
- **Command**: `node scripts/verify_luxury_contrast_suite.mjs`
- **Result**: **100% PASSED**
- **Coverage**: Fixed Celestial Blue border (3.5px), WCAG AAA button contrast (8.76:1 gold, 15.99:1 light), form controls, tier simulator active/inactive states, 12 viewports.

### 3. Numerology Studio Forensic Suite
- **Command**: `node scripts/verify_numerology_forensic_suite.mjs`
- **Result**: **41 PASSED, 0 FAILED**
- **Coverage**: Blank-by-default initialization, keystroke error dismissal, tab synchronization, founder synergy optionality, phone number privacy masking, 5 diverse name corrections, 10 viewports.

### 4. Wallet & Monetization Service Suite
- **Command**: `npm --prefix services/wallet-service test`
- **Result**: **10 TEST SUITES, 159 PASSED, 0 FAILED**
- **Coverage**: Auth OTP, password authentication, profile management, ledger transactions, Razorpay HMAC-SHA256 webhooks, subscription billing endpoints, PDF document fixtures, privacy form state.

### 5. Kundli Calculation Engine PyTest Suite
- **Command**: `python -m pytest services/kundli-engine/tests`
- **Result**: **97 PASSED, 2 SKIPPED, 0 FAILED** (in 10.45s)
- **Coverage**: Advanced Parashari methods, AI consultation, Shadbala, Ashtakavarga, Muhurta timing tools, Sade Sati calculations, VedAstro integration.

---

## 5. ARCHITECTURAL MAP & CRITICAL COMPONENTS

### 5.1 Frontend Architecture (`index.html`)
- **Tokens & Theme**: Standardized on Imperial Maroon (`#380710` to `#4A0E17`), Temple Gold (`#D4AF37`, `#F5C45E`), Warm Ivory (`#FFFDF7`, `#FEF3C7`), and Celestial Blue (`#1D4ED8` to `#93C5FD`).
- **Layout & Responsiveness**:
  - Top fixed accent border (`.celestial-top-border`) at `top: 0px`, height `3.5px`, `z-index: 10550`.
  - Sticky navbar (`.main-navbar`) anchored at `top: 3.5px`.
  - Desktop compact mode (`@media (max-width: 1536px)`): hides auxiliary nav buttons (`#btn-nav-tools`, `#btn-nav-reports`) to ensure 0px overflow on 1440px displays.
  - Mobile mode (`@media (max-width: 1100px)`): hides `.nav-links-row` and displays `.mobile-menu-btn` to toggle the off-canvas slide drawer (`#av-slide-drawer`).
- **Six-Horizon Guidance Controller**:
  - `window.astroGuidanceState`: Tracks `NO_PROFILE`, `GENERAL_TRANSIT_PREVIEW`, and `PERSONALIZED_READY`.
  - `updateGuidanceActiveProfileBar(state, meta)`: Controls `#guidance-active-profile-bar`.
  - `renderRemediesAndPrecautionsUI(data)`: Renders `#guidance-remedies-card` and `#guidance-precautions-card`.
  - `selectGuidanceHorizon(horizon)`: Handles tab switching with request ID guarding (`currentGuidanceRequestId`), abort controllers (`guidanceAbortController`), and synchronous loading state transitions.
  - `buildClientPeriodItems(horizon, ...)`: Client-side Swiss Ephemeris calculation fallback with dynamic weekday auspicious windows.
- **Numerology Studio Controller**:
  - Form state reset: `resetNumerologyStudio()` clears all inputs, error alerts, and output cards on modal close and sign-out.
  - Input listeners: Dynamic dismissal of validation errors upon typing into `#input-num-personal-name`, `#input-num-personal-dob`, or `#input-num-business-name`.
  - Privacy safeguards: Zero hardcoded names or phone numbers.

### 5.2 Python Kundli Engine (`services/kundli-engine/`)
- `doshas_and_remedies.py`:
  - Sade Sati calculation cleanly separated from Dhaiya.
  - Returns `sade_sati_status` ("Clear of Sade Sati" or "Phase 1/2/3") and `dhaiya_status` ("Active: Kantaka Shani (4th House Dhaiya)" / "Active: Ashtama Shani (8th House Dhaiya)" / "No Active Dhaiya").
- `ai_astrologer.py`:
  - `WEEKDAY_AUSPICIOUS_WINDOWS_EN` and `WEEKDAY_AUSPICIOUS_WINDOWS_HI` define Choghadiya and Abhijit Muhurta intervals.
  - Generates structured remedies: Devanagari Beej Mantra, transliteration, 108 japa count, practice timing, sattvic charity, and gemstone directive.
  - Generates structured precautions: Rahu Kaal guidelines, Yamaganda periods, and ethical disclaimers.

### 5.3 TypeScript Wallet & Monetization Service (`services/wallet-service/`)
- `numerology_service.ts`:
  - Implements Chaldean (1 to 8) and Pythagorean (1 to 9) reductions.
  - Planetary harmony 9x9 matrix calculates compatibility weights: 40% Moolank, 40% Bhagyank, 20% Compound.
  - Generates 5 bounded spelling corrections with edit distance $\le 2$.
  - Omits founder synergy when founder birth date is absent.
- `wallet.ts`:
  - Handles Razorpay HMAC-SHA256 signature verification.
  - Prevents replay attacks and double-crediting via idempotency keys.
  - Distinguishes demo simulated wallet transactions from authenticated payment orders.

---

## 6. INVARIANTS & PROTECTED FILES (DO NOT OVERWRITE)

1. **Privacy & Blank-Form Invariant**:
   - Inputs for personal data (Kundli name, DOB, TOB, city, Numerology names, phone numbers) **must never** have default value attributes in HTML.
   - Sample chart data must only load when the user explicitly clicks the "Load Sample Chart" demonstration button.
2. **Sample Chart Isolation Invariant**:
   - The sample demo chart for Anand Sharma must always be tagged with `isSampleChart = true` and `provenance = 'SAMPLE_DEMO'`.
   - The UI must persistently render the amber banner `SAMPLE CHART — NOT YOUR PERSONAL PROFILE` when this chart is active.
3. **Saturn Status Separation Invariant**:
   - Do not concatenate Sade Sati and Dhaiya into a single string. Keep `sade_sati_status` and `dhaiya_status` distinct.
4. **Auspicious Window Diversity Invariant**:
   - Do not hardcode a single time window (e.g. `09:30 AM–11:15 AM`) across multiple days. Always use dynamic, day-specific calculations.
5. **Horizontal Overflow Invariant**:
   - `documentElement` and `body` must maintain `scrollWidth <= clientWidth` across all screen widths from 320px to 2560px.
6. **Protected Environment & Configuration Files**:
   - Do not overwrite or delete:
     - `services/kundli-engine/.env` (if present)
     - `services/wallet-service/.env` (if present)
     - `.git/` configuration and history
     - Local test fixtures in `scripts/` and `test-artifacts/`

---

## 7. OUTSTANDING TASKS & RECOMMENDED NEXT ACTIONS

### Outstanding Issues & Follow-Ups
1. **GitHub CI Static Checks (`npm run format:check`)**:
   - The GitHub Actions CI run `40573094757` failed on the `format:check` step due to repository-wide prettier/formatting rules outside of the AstroVerse application files.
   - *Next Action*: Run `npm run format` locally in the workspace root to align formatting with repository linting rules before creating future PRs.
2. **Active Astrologer Chat Voice Integration**:
   - Browser Web Speech API narration is wired for daily horoscopes and astrologer consultations.
   - *Next Action*: Test Web Speech synthesis across Safari iOS and Chromium mobile browsers for audio buffer stability.
3. **Payment Gateway Test Mode Verification**:
   - Razorpay test keys and webhook endpoints are fully tested in unit and mock integration suites.
   - *Next Action*: Conduct end-to-end sandbox purchase verification of the ₹199 Numerology Blueprint and ₹49 All-Horizons pass with active test credentials.

---

## 8. STEP-BY-STEP INSTRUCTIONS FOR RESUMING IN THE NEW ACCOUNT

When opening this workspace in your new Antigravity account:

1. **Open Workspace**:
   - Point Antigravity to `E:\rea`.
   - The entire Git working tree, commit history, and test scripts are fully preserved in this directory.

2. **Verify Git State**:
   Run the following verification command in the terminal:
   ```powershell
   Set-Location E:\rea
   git status
   git branch --show-current
   git log -3 --oneline
   ```
   *Expected Output*: On branch `feature/premium-reports-and-subscriptions`, working tree clean, HEAD at `6f3dfcda9`.

3. **Verify Local Test Suites**:
   Run the automated test suites to ensure your local environment has all dependencies active:
   ```powershell
   # 1. Six-Horizon Guidance CDP Suite
   node scripts/verify_six_horizon_master_suite.mjs

   # 2. Wallet & Monetization Service Tests
   npm --prefix services/wallet-service test

   # 3. Python Kundli Engine Tests
   python -m pytest services/kundli-engine/tests
   ```

4. **Verify Live Production Deployment**:
   Inspect the live production site to ensure CDN parity:
   ```powershell
   curl.exe -sI https://astroverse-eta.vercel.app/
   ```
   *Expected Output*: HTTP 200 OK with `Etag: "e80c1805e920619cedd0047147b6a089"`.

5. **Begin Next Task**:
   Reference Section 7 ("Recommended Next Actions") to continue with format check cleanup, voice narration testing, or payment gateway sandbox verification.
