# Planetary Hora & Vedic Hourly Timing Methodology

## 1. Forensic Problem Statement & Audit

Legacy implementations frequently render planetary horas as fixed 60-minute calendar hours (e.g. `00:00–01:00`, `01:00–02:00`, `02:00–03:00`), alongside unverified "auspiciousness percentages" (e.g. 90%, 88%, 75%, 35%). Simultaneously, the application marketing claimed that horas were calculated from astronomical sunrise and sunset.

These claims are mathematically incompatible with fixed 60-minute intervals. In authentic Vedic astrology (Jyotish), the daylight and nocturnal intervals vary significantly across seasons and geographic latitudes.

---

## 2. Mathematical Definition of Traditional Planetary Hora

Astroverse implements the classical 24-Hora system dividing each solar day into **12 Daylight Horas** and **12 Nighttime Horas**:

```mermaid
flowchart LR
    Sunrise["Local Astronomical Sunrise (swe.rise_trans)"] -->|Daylight Interval (T_sunset - T_sunrise)| DayHoras["12 Equal Diurnal Horas<br/>Duration = T_day / 12"]
    Sunset["Local Astronomical Sunset (swe.rise_trans)"] -->|Nocturnal Interval (T_next_rise - T_sunset)| NightHoras["12 Equal Nocturnal Horas<br/>Duration = T_night / 12"]
    NextSunrise["Next Day Sunrise (swe.rise_trans)"] --> NextDay["Next Civil Day Sunrise"]
```

### 2.1 Formulae for Hora Durations
Let $T_{\text{sunrise}}$ and $T_{\text{sunset}}$ be the local solar rise and set times for the given date, and $T_{\text{next\_sunrise}}$ be the sunrise time of the following civil day.

1. **Diurnal Hora Duration**:
   $$D_{\text{day\_hora}} = \frac{T_{\text{sunset}} - T_{\text{sunrise}}}{12}$$
2. **Nocturnal Hora Duration**:
   $$D_{\text{night\_hora}} = \frac{T_{\text{next\_sunrise}} - T_{\text{sunset}}}{12}$$

### 2.2 Concrete Example (New Delhi, October 20, 2026)
* Sunrise: `06:24:40 AM IST`
* Sunset: `05:46:57 PM IST`
* Next Sunrise: `06:25:18 AM IST`
* **Daylight Duration**: 11 hours 22 minutes 17 seconds (682.28 minutes)
  $$D_{\text{day\_hora}} = \frac{682.28}{12} = \mathbf{56.86 \text{ minutes}}$$
* **Nocturnal Duration**: 12 hours 38 minutes 21 seconds (758.35 minutes)
  $$D_{\text{night\_hora}} = \frac{758.35}{12} = \mathbf{63.20 \text{ minutes}}$$

This illustrates why fixed 60-minute blocks are an astronomical impossibility under authentic Jyotish rules.

---

## 3. Chaldean Planetary Order & Progression

### 3.1 Chaldean Sequence
Horas follow the ancient geocentric sequence ordered by increasing orbital velocity (decreasing distance from Earth):
$$\text{Saturn} \longrightarrow \text{Jupiter} \longrightarrow \text{Mars} \longrightarrow \text{Sun} \longrightarrow \text{Venus} \longrightarrow \text{Mercury} \longrightarrow \text{Moon}$$

### 3.2 First Hora Ruler
The first Hora at sunrise is governed by the lord of the civil weekday:
* **Sunday**: Sun
* **Monday**: Moon
* **Tuesday**: Mars
* **Wednesday**: Mercury
* **Thursday**: Jupiter
* **Friday**: Venus
* **Saturday**: Saturn

### 3.3 Mathematical Continuity Invariant
Because 24 horas are completed in a civil day:
$$24 \pmod 7 = 3 \text{ positions in the Chaldean sequence}$$
Advancing by 3 positions from any day ruler automatically lands on the ruler of the next day:
* Sun (idx 3) $+ 3 \to$ Moon (idx 6) $\to$ **Monday**
* Moon (idx 6) $+ 3 \to 9 \equiv 2$ (Mars) $\to$ **Tuesday**
* Mars (idx 2) $+ 3 \to 5$ (Mercury) $\to$ **Wednesday**
* Mercury (idx 5) $+ 3 \to 8 \equiv 1$ (Jupiter) $\to$ **Thursday**
* Jupiter (idx 1) $+ 3 \to 4$ (Venus) $\to$ **Friday**
* Venus (idx 4) $+ 3 \to 7 \equiv 0$ (Saturn) $\to$ **Saturday**
* Saturn (idx 0) $+ 3 \to 3$ (Sun) $\to$ **Sunday**

The calculation guarantees 100% cyclical continuity across multiple days without arbitrary restarts.

---

## 4. Elimination of Fabricated Auspiciousness Percentages

Astroverse eliminates arbitrary numbers (e.g. "94% Auspicious") that have no mathematical or classical lineage. Instead, traditional Parashari productivity categories are assigned:

| Planetary Ruler | Sanskrit | Traditional Classification | Actionable Astrological Guidance |
| :--- | :--- | :--- | :--- |
| **Jupiter** | *Guru* | **Highly Favorable** | Major financial contracts, investments, higher learning, auspicious rituals |
| **Venus** | *Shukra* | **Favorable** | Creative arts, design, luxury shopping, social reconciliation, presentations |
| **Mercury** | *Budha* | **Favorable** | Commercial trade, analytics, accounting, technical writing, trade agreements |
| **Moon** | *Chandra* | **Moderate** | Public relations, domestic affairs, food, wellness, home improvements |
| **Sun** | *Surya* | **Authoritative** | Leadership meetings, administrative governance, executive promotions |
| **Mars** | *Mangal* | **Rigorous / Caution** | Physical athletics, surgery, engineering; avoid signing partnerships |
| **Saturn** | *Shani* | **Restrictive / Groundwork** | Routine maintenance, clearing backlogs, agriculture; avoid speculative starts |

---

## 5. Distinction from Rahu Kaal, Yamaganda, and Gulika Kaal

Planetary Horas are distinct from the classical **8-fold daylight divisions (Ashtama Bhaga)**:
$$\text{Part Duration} = \frac{T_{\text{sunset}} - T_{\text{sunrise}}}{8}$$

| Weekday | Rahu Kaal (Inauspicious) | Yamaganda Kaal (Inauspicious) | Gulika Kaal (Routine Work) |
| :--- | :--- | :--- | :--- |
| **Monday** | 2nd Part (approx. 07:30–09:00) | 4th Part (approx. 10:30–12:00) | 6th Part (approx. 13:30–15:00) |
| **Tuesday** | 7th Part (approx. 15:00–16:30) | 3rd Part (approx. 09:00–10:30) | 5th Part (approx. 12:00–13:30) |
| **Wednesday** | 5th Part (approx. 12:00–13:30) | 2nd Part (approx. 07:30–09:00) | 4th Part (approx. 10:30–12:00) |
| **Thursday** | 6th Part (approx. 13:30–15:00) | 1st Part (approx. 06:00–07:30) | 3rd Part (approx. 09:00–10:30) |
| **Friday** | 4th Part (approx. 10:30–12:00) | 7th Part (approx. 15:00–16:30) | 2nd Part (approx. 07:30–09:00) |
| **Saturday** | 3rd Part (approx. 09:00–10:30) | 6th Part (approx. 13:30–15:00) | 1st Part (approx. 06:00–07:30) |
| **Sunday** | 8th Part (approx. 16:30–18:00) | 5th Part (approx. 12:00–13:30) | 7th Part (approx. 15:00–16:30) |

Astroverse calculates each period's exact start and end timestamps dynamically based on the local solar sunrise and sunset.
