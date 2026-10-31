# ASTROVERSE MAHADASHA GUIDANCE VALIDATION REPORT

**Horizon:** Mahadasha 5-Year Life Arc  
**Calculation Module:** `services/kundli-engine/personalization_engine.py` (`generate_mahadasha_guidance`)  
**Methodology:** Vimshottari 120-Year Dasha System (Swiss Ephemeris Birth Moon Degree Grounding)  

---

## 1. Strict Eligibility & Mathematical Grounding

Vimshottari Dasha is calculated strictly from the natal Moon's longitudinal position at birth within its 27 Nakshatras ($13^\circ 20'$ per Nakshatra).
- **Fail-Closed Invariant:** The Mahadasha horizon cannot be calculated in universal preview mode without a chart; any request without a natal birth chart immediately returns:
  ```json
  {
      "status": "CHART_REQUIRED",
      "requires_chart": true,
      "message": "The Vimshottari Mahadasha timeline requires a calculated birth chart grounded in your exact natal Moon longitude."
  }
  ```
- **Timeline Engine:** `services/kundli-engine/dasha_engine.py` evaluates the balance of birth Dasha based on the Moon's elapsed fraction of its birth Nakshatra, and computes exact start/end dates for all Mahadashas and nested Antardashas over the 120-year cycle.

---

## 2. 5-Year Chronological Progression Architecture

`generate_mahadasha_guidance` generates exactly 5 sequential chronological cards spanning the upcoming 5 years:
- **Card Fields:**
  - `period_index`: 1 to 5.
  - `year_label`: Year span (e.g. `Year 1 (2026–2027)`, `Year 2 (2027–2028)`).
  - `ruling_period`: Active Mahadasha Lord / Antardasha Lord during that year.
  - `title`: Complete period header.
  - `strategic_theme`: Parashari analysis of the Antardasha lord's natal house rulership and mutual distance from the Mahadasha lord.
  - `cautions`: Transition sandhi precautions, health and resource mitigation.
  - `vedic_remedy`: Specific Vedic Beej Mantra or classical ritual prescribed for that sub-period.

---

## 3. Contrastive Verification Evidence

Tested across distinct natal profiles:
- **Anand Sharma (Uttara Ashadha Nakshatra):** Born with Sun dasha balance; currently running **Rahu Mahadasha / Mercury Antardasha**.
  - *Year 1:* `Rahu Mahadasha / Mercury Antardasha` (House 2 and 11 activations, commercial expansion, analytical contracts).
- **Divya Mukherjee (Shatabhisha Nakshatra):** Born with Rahu dasha balance; currently running **Saturn Mahadasha / Ketu Antardasha**.
  - *Year 1:* `Saturn Mahadasha / Ketu Antardasha` (House 7 and 8 activations, introspective restructuring, rigorous patience).
- **Aarav Sharma (Dhanishta Nakshatra):** Born with Mars dasha balance; currently running **Jupiter Mahadasha / Mars Antardasha**.
  - *Year 1:* `Jupiter Mahadasha / Mars Antardasha` (House 1 and 8 activations, professional leadership consolidation, technical problem-solving).

---

## 4. Test Suite Certification

- **Pytest:** `test_mahadasha_requires_chart_even_in_universal_preview` **PASSED**.
- **Pytest:** `test_mahadasha_prediction_contrastive_differentiation` **PASSED**.
- **Browser Live Verification:** Executed and confirmed in live Chrome DevTools session.
- **Screenshot Evidence:** `screenshots/06_guidance_mahadasha_grounded.png`.
