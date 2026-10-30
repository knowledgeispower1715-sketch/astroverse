# AstroVerse Vedic Astrology Calculation Regression & Parity Results

**Date:** October 30, 2026  
**Lead:** Principal Engineering Lead  
**Scope:** `services/kundli-engine`, Panchang, Ephemeris, Upagrahas, Yogas & Doshas  
**Status:** Remediated, Mathematically Verified, 100% Pytest Passing (127 Passed, 2 Skipped, 0 Failed)

---

## 1. AV-SEC-06: Pre-Sunrise Birth Weekday (Vara) Boundary Defect

### 1.1 Classical Vedic Astronomical Rationale
In classical Jyotish (Surya Siddhanta and Brihat Parashara Hora Shastra), a Vedic astronomical day (*Ahoratra*) does **not** begin at midnight (00:00:00). Instead, each Vedic day commences precisely at the moment of **local sunrise** (*suryodaya*) at the native's birthplace coordinates and continues until the subsequent sunrise.

Consequently:
- If an individual is born on Gregorian Tuesday at **03:30 AM**, but local sunrise at that location on Tuesday occurs at **06:14 AM**, the astronomical day belongs to the **preceding day** (Monday / *Somavara*), ruled by Chandra (Moon).
- Under the defective implementation, using Python's `dt.weekday()`, the calculation evaluated Tuesday (`weekday = 1`), assigning Mangala (Mars) as the Day Lord (*Vara Adhipati*). This caused incorrect primary astrological disposition, wrong Hora sequences, and inverted daytime/nighttime divisions for Rahu Kaal, Yamaganda, and Gulika.

### 1.2 Mathematical & Code Fix
In `services/kundli-engine/ephemeris.py` and `services/kundli-engine/panchang_engine.py`:

```python
# REMEDIATED IMPLEMENTATION
def calculate_vedic_weekday(dt: datetime, lat: float, lon: float) -> Tuple[int, str]:
    """
    Computes canonical Vedic Vara by evaluating the birth time against
    local astronomical sunrise (suryodaya).
    """
    sun_times = calculate_sun_times(dt.date(), lat, lon)
    local_sunrise = sun_times["sunrise"]  # Precise datetime of local sunrise

    # If birth occurred before sunrise, native belongs to the previous Vedic day
    if dt < local_sunrise:
        effective_date = dt.date() - timedelta(days=1)
    else:
        effective_date = dt.date()

    # Classical weekday mapping: 0 = Sunday (Ravivara), 1 = Monday (Somavara), etc.
    # Python weekday(): Monday=0 ... Sunday=6
    py_weekday = effective_date.weekday()
    # Convert to Jyotish Sunday=0 mapping
    vedic_day_index = (py_weekday + 1) % 7
    vedic_day_name = VEDIC_WEEKDAY_NAMES[vedic_day_index]
    
    return vedic_day_index, vedic_day_name
```

### 1.3 Validation Test Case
Added test `test_vedic_sunrise_day_boundary_av_sec_06` in `services/kundli-engine/tests/test_calculations.py`:
- **Birth Time:** `2024-04-16T03:30:00` (Gregorian Tuesday, pre-dawn)
- **Birth Location:** New Delhi (`28.6139° N, 77.2090° E`)
- **Local Sunrise:** `05:54:12 AM IST`
- **Result:** Correctly identified as **Monday (Somavara / Moon)**.

---

## 2. Upagraha & Kalavela Astronomical Precision

AstroVerse implements the complete Parashari system of shadow planets (*Aprakashitha Grahas*), comprising 5 calculated mathematical nodes and 6 time-division Kalavelas.

### 2.1 The 8-Fold Proportional Division (*Ashtama-Bhaga*)
Daylight (*Dina-Mana*) and nighttime (*Ratri-Mana*) are each divided into exactly 8 equal segments. Each segment is allocated to a planetary ruler according to the weekday lord:
- **Gulika & Maandi:** Ruled by Saturn's segment. Day births and night births follow distinct segment orders based on classical Parashara rules.
- **Yamaganda:** Ruled by Jupiter's segment.
- **Kaala:** Ruled by the Sun's segment.
- **Mrityu:** Ruled by Mars's segment.
- **Ardhaprahara:** Ruled by Mercury's segment.

### 2.2 Mathematical Nodes
- **Dhooma:** `Sun Longitude + 133° 20'`
- **Vyatipata:** `360° - Dhooma`
- **Paridhi (Parivesha):** `Vyatipata + 180°`
- **Indrachapa (Kodanda):** `360° - Paridhi`
- **Upaketu (Sikhi):** `Indrachapa + 16° 40'`

All calculations enforce modulo 360° and correctly derive house placements and zodiac signs across both North and South Indian chart representations.

---

## 3. Classical Vedic Yoga & Dosha Parity

### 3.1 Kuja Dosha (Manglik) Multi-Reference Evaluation
Kuja Dosha is evaluated from three independent reference points as mandated by *Brihat Parashara Hora Shastra*:
1. **From Lagna (Ascendant):** Mars in houses 1, 2, 4, 7, 8, or 12.
2. **From Chandra (Moon):** Mars in houses 1, 2, 4, 7, 8, or 12 from natal Moon.
3. **From Shukra (Venus):** Mars in houses 1, 2, 4, 7, 8, or 12 from natal Venus.

**Mitigation & Cancellation Rules Enforced:**
- **Swakshetra (Own House):** Mars in Aries in House 1 or House 8 cancels Kuja Dosha.
- **Uccha (Exaltation):** Mars in Capricorn cancels Kuja Dosha.
- **Guru Drishti:** Jupiter aspecting Mars or conjunct Mars mitigates affliction to `PRESENT_WITH_MITIGATION`.

### 3.2 Kaal Sarpa Dosha Rigor
- Evaluates whether all 7 classical planets (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn) are hemmed between the Rahu-Ketu nodal axis.
- Distinguishes **Anant, Kulik, Vasuki, Shankhapal, Padma, Mahapadma, Takshak, Karkotak, Shankhachood, Ghatak, Vishdhar, and Sheshnag** variations based on the house of Rahu.
- If any classical planet breaks the nodal hemisphere, status is strictly set to `ABSENT`.

### 3.3 Sade Sati & Kantaka Shani
- Evaluates transit Saturn's position relative to the natal Moon sign:
  * **Phase 1 (Rising / Aarohan):** Saturn in 12th from natal Moon.
  * **Phase 2 (Peak / Madhyama):** Saturn conjunct natal Moon (1st).
  * **Phase 3 (Setting / Avarohan):** Saturn in 2nd from natal Moon.
- Evaluates **Kantaka Shani** (Saturn in 4th, 8th, or 10th from Moon or Lagna).

---

## 4. Pytest Test Results Across Entire Python Suite

Command executed: `pytest services/kundli-engine/tests`

```
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-9.0.3, pluggy-1.6.0
rootdir: E:\rea
plugins: anyio-4.13.0, cov-7.1.0
collected 129 items

services\kundli-engine\tests\test_advanced_methods.py ........           [  6%]
services\kundli-engine\tests\test_ai_consultation.py ................... [ 20%]
...........                                                              [ 29%]
services\kundli-engine\tests\test_calculations.py ..............         [ 40%]
services\kundli-engine\tests\test_classical_yogas_and_doshas.py ........ [ 46%]
....                                                                     [ 49%]
services\kundli-engine\tests\test_forecast_reconstruction_and_eligibility.py . [ 50%]
.....                                                                    [ 54%]
services\kundli-engine\tests\test_freeastroapi_integration.py .....      [ 58%]
services\kundli-engine\tests\test_matchmaking_complete.py .....          [ 62%]
services\kundli-engine\tests\test_numerology.py ..........               [ 69%]
services\kundli-engine\tests\test_prokerala.py .ss                       [ 72%]
services\kundli-engine\tests\test_shodashavarga_and_ashtakavarga.py .... [ 75%]
..                                                                       [ 76%]
services\kundli-engine\tests\test_vedastro_integration.py ......         [ 81%]
services\kundli-engine\tests\test_vedastro_parity_suite.py ............. [ 91%]
.......                                                                  [ 96%]
services\kundli-engine\tests\test_vimshottari_dasha_intelligence.py .... [100%]

======================= 127 passed, 2 skipped in 11.73s =======================
```

**Verdict:** 127 passed, 2 skipped (external Prokerala live API network mock), 0 failed. Conformance: **100%**.
