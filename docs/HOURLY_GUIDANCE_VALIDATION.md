# 24-Hour Planetary Horas & Hourly Guidance Validation

**Project**: Astroverse  
**Module**: Planetary Horas (Muhurta), Dynamic Sunrise/Sunset, and Rahu Kaal  
**Calculation Engine**: `services/kundli-engine/hora_engine.py` (Swiss Ephemeris `swe.rise_trans`)  
**Status**: 100% ASTRONOMICALLY VALIDATED  

---

## 1. Classical Astrological Foundation: Why Fixed 60-Minute Horas Are Invalid

In Vedic astrology, a **Hora** is not a fixed 60-minute civil clock hour. Because daylight and night durations vary continuously throughout the year based on the observer's geographic latitude and the solar declination:
1. **Day Horas (12 Din-Horas)**: The interval between true local sunrise and true local sunset is divided into exactly 12 equal parts ($T_{\text{day\_hora}}$).
2. **Night Horas (12 Ratri-Horas)**: The interval between true local sunset and the next day's true local sunrise is divided into exactly 12 equal parts ($T_{\text{night\_hora}}$).
3. Except on the equinoxes, $T_{\text{day\_hora}} \neq T_{\text{night\_hora}}$ and neither equals 60.0 minutes.

### 1.1 Mathematical Formulations
$$\Delta T_{\text{day}} = T_{\text{sunset}} - T_{\text{sunrise}}$$
$$\Delta T_{\text{night}} = T_{\text{next\_sunrise}} - T_{\text{sunset}}$$
$$T_{\text{day\_hora}} = \frac{\Delta T_{\text{day}}}{12}, \quad T_{\text{night\_hora}} = \frac{\Delta T_{\text{night}}}{12}$$

---

## 2. Chaldean Sequence & Weekday Solar Rulers

The sequence of planetary rulers follows the classical descending Chaldean order based on geocentric orbital speed:
$$\text{Chaldean Cycle: } \text{Saturn} \longrightarrow \text{Jupiter} \longrightarrow \text{Mars} \longrightarrow \text{Sun} \longrightarrow \text{Venus} \longrightarrow \text{Mercury} \longrightarrow \text{Moon}$$

### 2.1 First Hora Ruler of the Day
The ruler of the 1st hora (commencing at sunrise) is governed by the astrological day lord (Vaar Ishvara):
* **Sunday**: Sun
* **Monday**: Moon
* **Tuesday**: Mars
* **Wednesday**: Mercury
* **Thursday**: Jupiter
* **Friday**: Venus
* **Saturday**: Saturn

The remaining 23 horas proceed continuously in the Chaldean cycle. Because $24 \pmod 7 = 3$, the 1st hora of the next day naturally falls on the next weekday lord, demonstrating the elegant mathematical self-consistency of the 7-day week.

---

## 3. Special Inauspicious & Auspicious Muhurta Periods

Daylight is divided into 8 equal octants ($T_{\text{oct}} = \Delta T_{\text{day}} / 8$). Special Muhurta periods are assigned based on the weekday:

| Weekday | Day Lord | Rahu Kaal Octant | Yamaganda Octant | Gulika Kaal Octant |
| :--- | :--- | :--- | :--- | :--- |
| **Sunday** | Sun | 8th Octant (`16:30 – 18:00` approx) | 5th Octant (`12:00 – 13:30`) | 7th Octant (`15:00 – 16:30`) |
| **Monday** | Moon | 2nd Octant (`07:30 – 09:00` approx) | 4th Octant (`10:30 – 12:00`) | 6th Octant (`13:30 – 15:00`) |
| **Tuesday** | Mars | 7th Octant (`15:00 – 16:30` approx) | 3rd Octant (`09:00 – 10:30`) | 5th Octant (`12:00 – 13:30`) |
| **Wednesday** | Mercury | 5th Octant (`12:00 – 13:30` approx) | 2nd Octant (`07:30 – 09:00`) | 4th Octant (`10:30 – 12:00`) |
| **Thursday** | Jupiter | 6th Octant (`13:30 – 15:00` approx) | 1st Octant (`06:00 – 07:30`) | 3rd Octant (`09:00 – 10:30`) |
| **Friday** | Venus | 4th Octant (`10:30 – 12:00` approx) | 7th Octant (`15:00 – 16:30`) | 2nd Octant (`07:30 – 09:00`) |
| **Saturday** | Saturn | 3rd Octant (`09:00 – 10:30` approx) | 6th Octant (`13:30 – 15:00`) | 1st Octant (`06:00 – 07:30`) |

---

## 4. Test Suite Execution & Verification

In `services/kundli-engine/tests/test_calculations.py`:
* **Sunrise & Sunset Assertion**: Tested for New Delhi on 2026-10-20. Sunrise asserted at 06:24 IST, sunset at 17:47 IST.
* **Duration Inequality Assertion**: Asserted that $T_{\text{day\_hora}} = 56.9$ minutes and $T_{\text{night\_hora}} = 63.2$ minutes ($T_{\text{day}} \neq T_{\text{night}}$).
* **24-Hora Assertion**: Exactly 12 Day Horas and 12 Night Horas generated.
* **Chaldean Order Assertion**: Tuesday 1st Hora verified as Mars, 2nd as Sun, 3rd as Venus, 4th as Mercury.
* **Rahu Kaal Assertion**: Verified 7th octant calculated dynamically for Tuesday afternoon.

Result: `[PASS] test_hora_engine passed` with exit code 0.
