# ASTROVERSE WEEKLY GUIDANCE VALIDATION REPORT

**Horizon:** Weekly Personal Forecast (7-Day Parashari Cycle)  
**Calculation Module:** `services/kundli-engine/personalization_engine.py` (`generate_weekly_guidance`)  
**Methodology:** 7-Day Sidereal Moon Progression, Dynamic House Energization, and Tara Bala Tracking  

---

## 1. Architectural & Calculation Grounding

The weekly forecast models the transiting Moon as it travels through sidereal constellations over a full 7-day progression from the target date:
- **Card Count:** Exactly 7 daily cards, each representing one calendar day ($D+0$ to $D+6$).
- **Day Properties:**
  - `date`: ISO calendar date (`YYYY-MM-DD`).
  - `day_name`: Day of week (Sunday through Saturday).
  - `ruler`: Weekday ruler (Vaar lord).
  - `moon_sign`: Sidereal zodiac sign traversed by Moon on that date.
  - `activated_house`: Natal house energized from the user's specific Lagna ($1..12$).
  - `tarabala`: Personalized Tara Bala evaluated against the user's birth Moon Nakshatra.
  - `chandrabala`: House distance from birth Moon ($1..12$).
  - `is_favorable`: Boolean indicator of day auspiciousness.
  - `guidance`: Completely distinct strategic focus for each day.

---

## 2. Dynamic House Progression Across Zodiac Lagnas

Because the Moon traverses approximately $13.2^\circ$ per day, it shifts signs every 2.25 to 2.5 days. The energized house changes continuously and is mathematically unique to each Lagna.

### Mathematical Proof of Lagna Grounding: Aries vs. Libra
Aries and Libra are situated exactly $180^\circ$ (6 signs) apart. For any given transit Moon position, their activated houses must be exactly 6 houses apart:
- If Moon is in Cancer: Aries activates House 4; Libra activates House 10 ($\Delta = 6$).
- If Moon moves to Leo: Aries activates House 5; Libra activates House 11 ($\Delta = 6$).
- If Moon moves to Virgo: Aries activates House 6; Libra activates House 12 ($\Delta = 6$).

This strict mathematical relationship was tested and certified across all 7 days in `test_weekly_prediction_contrastive_house_activation`:
```python
for day in range(7):
    diff = abs(aries_houses[day] - libra_houses[day])
    assert diff == 6  # 100% verified across all 7 days!
```

---

## 3. Anti-Repetition Quality Certification

In the legacy engine, weekly guidance cards repeated static template sentences. Under `personalization_engine.py`:
- All 7 guidance paragraphs in the weekly forecast are verified unique:
  $$\text{len}(\text{set}(\text{guidances})) = 7$$
- Every day specifies its unique energized house, domain significations, and tailored Tara Bala advice.

---

## 4. Test Suite Certification

- **Pytest:** `test_weekly_prediction_contrastive_house_activation` and `test_anti_repetition_across_forecast_periods` **PASSED**.
- **Browser Live Verification:** Executed and confirmed in live Chrome DevTools session.
- **Screenshot Evidence:** `screenshots/03_guidance_weekly_grounded.png`.
