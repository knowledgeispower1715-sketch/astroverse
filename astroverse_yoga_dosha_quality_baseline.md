# ASTROVERSE — CLASSICAL VEDIC YOGA & DOSHA QUALITY BASELINE

**Audit Date:** October 29, 2026  
**Auditor:** Principal Vedic Astrology Systems Architect & Staff Full-Stack Engineer  
**Baseline Commit:** `7f873680dde9d995b91cf2c006e29026044f4931`  
**Repository Branch:** `feature/premium-reports-and-subscriptions`  
**Standard of Authority:** *Brihat Parashara Hora Shastra* (Ch. 35 & 36), *Saravali* (Ch. 31), *Phaladeepika* (Ch. 6)

---

## 1. Executive Summary & Defect Inventory

This quality baseline establishes the authoritative defect audit, architectural analysis, and verification boundaries for AstroVerse's Classical Vedic Yoga/Dosha Intelligence and Personalized Guidance engine.

### Confirmed Defects Identified from User Experience & Code Reconnaissance:

1. **Context Desynchronization across Hourly Guidance:**
   - **Symptom:** In Hourly Guidance, the card heading displayed one planetary Hora (e.g. Moon Hora), while the narrative outlook referenced another planet (e.g. Mercury Hora), and the remedies section displayed a generic Jupiter mantra (*Om Graam Greem Graum Sah Guruve Namah*) with an ambiguous trigger label.
   - **Root Cause:** 
     - In `index.html`, `generatePersonalizedGuidance()` only computed `window.currentActiveHoraPlanet` if it was falsy. Once initialized, subsequent renders or tab visits reused stale values.
     - In `renderFallbackGuidanceUI()`, `remedies` and `precautions` objects were omitted from the fallback payload, causing `renderRemediesAndPrecautionsUI()` to fall back to hardcoded defaults (Jupiter mantra) rather than the active Hora lord (for hourly horizon) or active Dasha lord (for daily/multi-horizon).
     - In `renderFallbackGuidanceUI()` daily outlook, text hardcoded `during benefic ${activeMaha} and Mercury Horas` regardless of active transits or day lords.
     - In `services/kundli-engine/ai_astrologer.py`, the unpersonalized return payload omitted `remedies` and `precautions` dictionaries, while the personalized branch assigned remedies to `active_maha` even when the requested horizon was `hourly`.

2. **Absent Combinations Screen Clutter:**
   - **Symptom:** In classical evaluations, out of dozens of evaluated yogas, only a subset are active for any given chart. Previously, rendering every absent yoga card created a massive vertical list of negative cards that overwhelmed the user.
   - **Solution:** A dedicated, collapsible `#evaluated-absent-yogas-drawer` ("Other Evaluated Combinations") that neatly aggregates absent combinations with exact shastric rule failure rationales, while displaying active and mitigated yogas prominently.

3. **Shastric Evidence & Classical Citations Missing from Active Cards:**
   - **Symptom:** Users and astrologers could not verify *why* a yoga was detected or mitigated (which planets, houses from Lagna/Moon, degrees, and classical text citations).
   - **Solution:** Structured evidence presentation for each detected yoga card including exact planetary formations, houses from Lagna and Moon, and citations from *BPHS*, *Saravali*, or *Phaladeepika*.

4. **Multi-Reference Kuja Dosha (Manglik) & Cancellation Transparency:**
   - **Symptom:** Binary "Manglik" classifications created needless anxiety without explaining classical mitigations (such as Mars in its own sign Aries/Scorpio or exaltation in Capricorn).
   - **Solution:** Transparent multi-reference evaluation from Lagna, Moon, and Venus, with explicit status badges (`ACTIVE`, `MITIGATED`, or `CLEAR`) and classical cancellation evidence (*Swakshetra*, *Uchcha*, or *Guru Drishti*).

5. **Customer PDF Report Parity:**
   - **Symptom:** Discrepancies between screen rendering and Chapter 6 of downloadable PDF reports.
   - **Solution:** Ensure both client-side report generator (`generateAndDownloadReportPdf`) and backend generator (`services/wallet-service/src/monetization/reportGenerator.ts`) consume canonical calculated chart results.

---

## 2. Baseline Test Execution Counts

Before making modifications in this session, existing baseline test suites were executed with the following passing counts:

- **Python Ephemeris Engine (`services/kundli-engine/tests`):**
  - **120 passed, 2 skipped** in 9.85s.
  - Covers Vimshottari dasha calculations, upagraha degrees, yoga dosha evaluation rules, and ephemeris calculations.

- **TypeScript Services & Frontend Logic (`services/wallet-service/tests`):**
  - **18 test suites passing (100%)**:
    1. `auth.test.ts`
    2. `supabase_auth.test.ts`
    3. `chat_frontend_logic.test.ts`
    4. `monetization.test.ts`
    5. `pdf_fixtures.test.ts`
    6. `differentiation.test.ts`
    7. `pdf_quality_regression.test.ts`
    8. `numerology.test.ts`
    9. `razorpay_compliance.test.ts`
    10. `privacy_and_form_state.test.ts`
    11. `security_and_ratelimit.test.ts`
    12. `dosha_yoga_parity.test.ts`
    13. `admin_security_mfa_and_modules.test.ts`
    14. `ai_astrologer_conversation_quality.test.ts`
    15. `promotions_and_free_minute.test.ts`
    16. `admin_tier_preview_and_security.test.ts`
    17. `kundli_analysis_and_ashtakavarga.test.ts`
    18. `dasha_yoga_upagraha_intelligence.test.ts`

---

## 3. Implementation Target Plan

1. **Synchronize Hora, Dasha, and Remedies in `index.html` & `services/kundli-engine/ai_astrologer.py`**:
   - Dynamic Hora recalculation in `generatePersonalizedGuidance()`.
   - Guaranteed alignment between header planet, body text, countdown, period cards, and remedy mantra.
   - Full remedies/precautions payload generation in client-side fallback `renderFallbackGuidanceUI()`.
2. **Polish Yoga & Dosha Cards & Executive Synthesis in `renderKundliYogasView()`**:
   - Enrich `renderKundliYogasView()` with detailed planetary evidence, houses, and shastra citations.
   - Complete collapsible drawer `#evaluated-absent-yogas-drawer`.
3. **Verify Complete Kundli PDF Chapter 6 Parity**:
   - In `index.html` and `services/wallet-service/src/monetization/reportGenerator.ts`.
4. **Add Dedicated Test Suite**:
   - `services/wallet-service/tests/yoga_dosha_quality_and_context.test.ts` asserting strict contextual parity.
5. **Re-run Full Test Matrix, Verify Clean Diff, and Synchronize Remotes**.
