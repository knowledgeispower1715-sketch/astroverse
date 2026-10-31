# ASTROVERSE YEARLY GUIDANCE VALIDATION REPORT

**Horizon:** Yearly 12-Month Parashari Outlook  
**Calculation Module:** `services/kundli-engine/personalization_engine.py` (`generate_yearly_guidance`)  
**Methodology:** 12-Month Solar Ingress Progression + Outer Planet Transits + 4 Quarters  

---

## 1. Architectural & Astronomical Structure

The yearly prediction maps the transit of the sidereal Sun through all 12 signs of the zodiac, activating houses $1$ to $12$ relative to the user's natal Ascendant, modulated by the major outer planet transits (Saturn, Jupiter, Rahu-Ketu):
- **12 Monthly Cards:** Each card maps one calendar month:
  - `month_index`: 1 to 12.
  - `month_name`: Month label with year (e.g. `Nov 2026`, `Dec 2026`).
  - `solar_sign`: Sidereal zodiac sign traversed by Sun.
  - `sun_house_from_lagna`: Specific natal house energized ($1..12$).
  - `major_transits`: Outer planet transit influences (Saturn, Jupiter, Rahu).
  - `focus_theme`: The central Parashari theme of that house.
  - `guidance`: Personalized strategic directives.
- **4 Strategic Quarters:**
  - `Q1`: Foundation & Strategic Realignment
  - `Q2`: Enterprise & Collaborative Partnerships
  - `Q3`: Vocational Visibility & Milestone Realization
  - `Q4`: Consolidation, Audit & Forward Planning

---

## 2. Anti-Repetition Quality Certification

In `personalization_engine.py`:
- All 12 monthly guidance paragraphs are completely unique across the annual cycle:
  $$\text{len}(\text{set}(\text{y\_guidance})) = 12$$
- Each month's guidance is derived from the Sun's position relative to the user's natal Lagna (e.g., Month when Sun traverses House 1 focuses on health and self-expression, Month when Sun traverses House 10 focuses on career authority and milestones).

---

## 3. Test Suite Certification

- **Pytest:** `test_forecast_reconstruction_and_eligibility.py` (Asserts 12 monthly cards and 4 quarters) **PASSED**.
- **Pytest:** `test_anti_repetition_across_forecast_periods` **PASSED**.
- **Browser Live Verification:** Executed and confirmed in live Chrome DevTools session.
- **Screenshot Evidence:** `screenshots/05_guidance_yearly_grounded.png`.
