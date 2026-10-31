# ASTROVERSE MONTHLY GUIDANCE VALIDATION REPORT

**Horizon:** Monthly Personal Analysis  
**Calculation Module:** `services/kundli-engine/personalization_engine.py` (`generate_monthly_guidance`)  
**Methodology:** 4-Week Strategic Lunar Arc Across Full Calendar Month  

---

## 1. Architectural & Calendar Grounding

The monthly forecast maps the full month (supporting 28, 29, 30, or 31 days based on the target month) across 4 structured strategic phases:
- **Week 1 (Days 1–7):** Initiative & Resource Foundation (Houses traversed by Moon during initial quarter).
- **Week 2 (Days 8–14):** Enterprise, Communication & Domestic Grounding.
- **Week 3 (Days 15–21):** Strategic Deliberations, Partnerships & Vocational Expansion.
- **Week 4 (Days 22–End of Month):** Long-Term Gains, Audit, Consolidation & Restorative Preparation.

Each card provides:
- `week_number`: 1 to 4.
- `start_date` / `end_date`: Exact calendar ISO dates (`YYYY-MM-DD`).
- `start_day` / `end_day`: Exact day bounds (e.g. `Day 1 – Day 7`, `Day 22 – Day 30`).
- `phase_name`: Clear astrological phase title.
- `key_transits`: Specific transits occurring within that week.
- `focal_houses`: Natal houses energized during the week's lunar transit.
- `focus_guidance`: Personalized strategic direction tailored to the user's Lagna.

---

## 2. Anti-Repetition Quality Certification

Each of the 4 weeks provides distinct strategic guidance grounded in the progression of the Moon through the user's natal quadrants (Kendra, Trikona, Dusthana):
- All 4 weekly guidance paragraphs are verified distinct:
  $$\text{len}(\text{set}(\text{m\_guidance})) = 4$$
- The end date of Week 4 dynamically matches the exact calendar month length (e.g., October 31, November 30, February 28/29).

---

## 3. Test Suite Certification

- **Pytest:** `test_forecast_reconstruction_and_eligibility.py` (Assertion that monthly forecast has exactly 4 progression cards covering all calendar dates) **PASSED**.
- **Pytest:** `test_anti_repetition_across_forecast_periods` **PASSED**.
- **Browser Live Verification:** Executed and confirmed in live Chrome DevTools session.
- **Screenshot Evidence:** `screenshots/04_guidance_monthly_grounded.png`.
