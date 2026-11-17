# AstroVerse AI Vedic Panchang & Astronomical Calculation Methodology

**Document Version**: 1.0.0  
**Mathematical Core**: `services/kundli-engine/panchang_engine.py` & `transits_engine.py`  
**Precision Standard**: Swiss Ephemeris 2.10.03 Sidereal Chitrapaksha Lahiri (`swe.SIDM_LAHIRI`)  
**Reference Alignment**: India Meteorological Department (IMD) Rashtriya Panchang  
**Author**: Vedic Astronomy & Swiss Ephemeris Specialist Team (`worker_m5_docs`)  
**Status**: VERIFIED & BENCHMARKED  

---

## 1. Astronomical Foundation & Coordinate Systems

Vedic astrology (*Jyotish Shastra*) and traditional Hindu calendars rely upon the **Nirayana** (sidereal) zodiac. Unlike the tropical (*Sayana*) zodiac which is tied to the vernal equinox, the sidereal zodiac fixes the longitudes of celestial bodies relative to stationary background stars.

### 1.1 The Julian Day (JD) Conversion
Calculations begin by mapping Gregorian civil time to continuous Julian Days in Universal Time (UT):

$$\text{JD} = \text{julday}(Y, M, D, H + \frac{Min}{60} + \frac{Sec}{3600} + \frac{\mu s}{3.6 \times 10^9}, \text{GREG\_CAL})$$

Where $H, Min, Sec$ are in UTC. Inverse conversion back to localized calendar instants is performed via Swiss Ephemeris `revjul`:

$$(Y, M, D, H_{\text{fraction}}) = \text{revjul}(\text{JD}, \text{GREG\_CAL})$$

### 1.2 Chitrapaksha Lahiri Ayanamsha ($\Delta \psi$)
The difference between the tropical longitude ($\lambda_{\text{Sayana}}$) and sidereal longitude ($\lambda_{\text{Nirayana}}$) is the **Ayanamsha** ($\Delta \psi$):

$$\lambda_{\text{Nirayana}} = (\lambda_{\text{Sayana}} - \Delta \psi) \pmod{360^\circ}$$

AstroVerse adopts the **Lahiri Chitrapaksha Ayanamsha** (`swe.SIDM_LAHIRI`), designated by the Calendar Reform Committee of the Government of India (1955) and utilized by the India Meteorological Department's Positional Astronomy Centre (IMD PAC) in the *Rashtriya Panchang*. Under this system, the fixed star **Chitra** (*Spica*, $\alpha$ Virginis) is pinned exactly opposite the first point of Aries at sidereal longitude:

$$\lambda_{\text{Chitra}} = 180^\circ 00' 00''$$

The coincidence of the tropical and sidereal zodiac occurred at epoch **285 AD** ($T_0$). At the J2000.0 epoch (January 1, 2000, 12:00 TT), the Lahiri Ayanamsha value is:

$$\Delta \psi_{\text{J2000.0}} \approx 23^\circ 51' 25.5'' = 23.85708^\circ$$

The rate of general precession in longitude ($p$) is approximately $50.29''$ per tropical year ($0.01397^\circ / \text{year}$).

---

## 2. Mathematical Definition of the Five Panchang Angas

The word *Panchanga* derives from Sanskrit *Pancha* (five) and *Anga* (limbs). The five limbs represent distinct geometrical relationships between the Earth, Sun, and Moon.

```
+---------------------------------------------------------------------------------------+
|                                  THE FIVE VEDIC ANGAS                                 |
+---------+---------------------------------+------------------------+------------------+
| Anga    | Astronomical Governing Function | Span / Increment       | Total Divisions  |
+---------+---------------------------------+------------------------+------------------+
| Vaara   | Solar Sunrise-to-Sunrise Cycle  | 1 Solar Day (~24h)     | 7 Weekdays       |
| Tithi   | Moon - Sun Angular Separation   | 12° per Tithi          | 30 Tithis        |
| Nakshatra| Moon Sidereal Longitude        | 13°20' (800') per Nak. | 27 Nakshatras    |
| Yoga    | Sun + Moon Sidereal Longitude   | 13°20' (800') per Yoga | 27 Yogas         |
| Karana  | Half-Tithi Angular Separation   | 6° per Karana          | 60 Karanas/Month |
+---------+---------------------------------+------------------------+------------------+
```

### 2.1 Vaara (Solar Day & Planetary Lordship)
In classical Jyotish (*Surya Siddhanta* I.51–52), the Vedic civil day begins strictly at local **topocentric sunrise** ($T_{\text{rise}}$) and extends to the subsequent topocentric sunrise ($T_{\text{next\_rise}}$):

$$\text{Vedic Day}(t) = \begin{cases} D_{\text{civil}} & \text{if } t \ge T_{\text{rise}}(D_{\text{civil}}) \\ D_{\text{civil}} - 1 & \text{if } t < T_{\text{rise}}(D_{\text{civil}}) \end{cases}$$

The 7 weekdays are ruled by the physical Grahas according to their descending orbital velocity (Chaldean Order: Saturn $\to$ Jupiter $\to$ Mars $\to$ Sun $\to$ Venus $\to$ Mercury $\to$ Moon), where each day is named for the lord of its first hora at sunrise:
1. **Ravivara** (Sunday): Sun (*Surya*)
2. **Somavara** (Monday): Moon (*Chandra*)
3. **Mangalavara** (Tuesday): Mars (*Mangala*)
4. **Budhavara** (Wednesday): Mercury (*Budha*)
5. **Guruvara** (Thursday): Jupiter (*Brihaspati*)
6. **Shukravara** (Friday): Venus (*Shukra*)
7. **Shanivara** (Saturday): Saturn (*Shani*)

### 2.2 Tithi (Luni-Solar Elongation)
A Tithi is the time required for the apparent sidereal longitude of the Moon ($\lambda_M$) to advance $12^\circ$ ahead of the apparent sidereal longitude of the Sun ($\lambda_S$):

$$\theta_{\text{tithi}}(t) = (\lambda_M(t) - \lambda_S(t)) \pmod{360^\circ}$$

$$\text{Tithi Index } k = \left\lfloor \frac{\theta_{\text{tithi}}(t)}{12^\circ} \right\rfloor \in [0, 29]$$

- **Shukla Paksha** (Bright/Waxing Fortnight): $k \in [0, 14]$ (Pratipada to Purnima, $0^\circ \le \theta < 180^\circ$).
- **Krishna Paksha** (Dark/Waning Fortnight): $k \in [15, 29]$ (Pratipada to Amavasya, $180^\circ \le \theta < 360^\circ$).

### 2.3 Nakshatra (Lunar Mansion) & Pada
The sidereal zodiac is divided into 27 equal Nakshatra arcs of $13^\circ 20'$ ($800'$ or $13.333333^\circ$):

$$\text{Nakshatra Index } n = \left\lfloor \frac{\lambda_M(t)}{13^\circ 20'} \right\rfloor \in [0, 26]$$

Each Nakshatra is subdivided into 4 equal quarters known as **Padas** of $3^\circ 20'$ ($200'$ or $3.333333^\circ$):

$$\text{Pada Index } p = \left\lfloor \frac{\lambda_M(t) \pmod{13^\circ 20'}}{3^\circ 20'} \right\rfloor + 1 \in [1, 4]$$

The 108 Padas across 27 Nakshatras correspond symmetrically to the 108 Navamsha divisions of the Vedic zodiac ($12 \text{ Rashis} \times 9 \text{ Navamshas}$).

### 2.4 Yoga (Luni-Solar Combined Longitude)
A Yoga is the time required for the sum of the apparent sidereal longitudes of the Sun and Moon to advance by $13^\circ 20'$:

$$\theta_{\text{yoga}}(t) = (\lambda_S(t) + \lambda_M(t)) \pmod{360^\circ}$$

$$\text{Yoga Index } y = \left\lfloor \frac{\theta_{\text{yoga}}(t)}{13^\circ 20'} \right\rfloor \in [0, 26]$$

The 27 Yogas range from *Vishkambha* ($y = 0$) to *Vaidhriti* ($y = 26$). Certain Yogas (*Vyatipata*, *Vaidhriti*) denote inauspicious times for initiating material ventures.

### 2.5 Karana (Half-Tithi Intervals)
A Karana is one half of a Tithi, spanning exactly $6^\circ$ of luni-solar elongation:

$$\text{Karana Index } c = \left\lfloor \frac{\theta_{\text{tithi}}(t)}{6^\circ} \right\rfloor \in [0, 59]$$

The 60 Karanas within a lunar month are categorized into:
- **4 Sthira (Fixed) Karanas**: Occur only once per month during Krishna Paksha Chaturdashi and Amavasya:
  1. *Shakuni*: Karana index 57 ($342^\circ \le \theta < 348^\circ$)
  2. *Chatushpada*: Karana index 58 ($348^\circ \le \theta < 354^\circ$)
  3. *Naga*: Karana index 59 ($354^\circ \le \theta < 360^\circ$)
  4. *Kintughna*: Karana index 0 ($0^\circ \le \theta < 6^\circ$, 1st half of Shukla Pratipada)
- **7 Chara (Movable) Karanas**: Repeat cyclically 8 times across the remaining 56 half-tithis:
  1. *Bava*, 2. *Balava*, 3. *Kaulava*, 4. *Taitila*, 5. *Gara*, 6. *Vanija*, 7. *Vishti* (*Bhadra*)

---

## 3. Newton-Raphson Boundary Root-Finding Algorithm

Because celestial bodies move with variable orbital velocities due to Keplerian orbital eccentricity and perturbations, transition instants cannot be obtained by linear clock interpolation without introducing errors of several minutes.

AstroVerse employs a multi-dimensional **Newton-Raphson Root-Finding Solver** (`_solve_nr_boundary`) to find the exact instant $t^*$ at which an angular function $f(t)$ reaches target boundary degree $\theta^*$:

$$f(t^*) - \theta^* = 0$$

### 3.1 First-Derivative Formulation
The iteration step is defined by:

$$t_{k+1} = t_k - \frac{f(t_k) - \theta^*}{f'(t_k)}$$

Where the analytical first derivative $f'(t)$ is provided directly by Swiss Ephemeris instant angular speeds (`swe.FLG_SPEED`):

| Mode | Function $f(t)$ | Boundary $\theta^*$ | First Derivative $f'(t)$ | Typical Speed ($^\circ / \text{day}$) |
| :--- | :--- | :--- | :--- | :--- |
| **Tithi** | $(\lambda_M - \lambda_S) \pmod{360^\circ}$ | $k \times 12^\circ$ | $\omega_M(t) - \omega_S(t)$ | $\approx 11.5^\circ - 14.5^\circ / \text{day}$ |
| **Nakshatra**| $\lambda_M \pmod{360^\circ}$ | $n \times 13^\circ 20'$ | $\omega_M(t)$ | $\approx 11.8^\circ - 15.3^\circ / \text{day}$ |
| **Yoga** | $(\lambda_S + \lambda_M) \pmod{360^\circ}$ | $y \times 13^\circ 20'$ | $\omega_S(t) + \omega_M(t)$ | $\approx 12.8^\circ - 16.3^\circ / \text{day}$ |
| **Karana** | $(\lambda_M - \lambda_S) \pmod{360^\circ}$ | $c \times 6^\circ$ | $\omega_M(t) - \omega_S(t)$ | $\approx 11.5^\circ - 14.5^\circ / \text{day}$ |
| **Rashi** | $\lambda_M \pmod{360^\circ}$ | $r \times 30^\circ$ | $\omega_M(t)$ | $\approx 11.8^\circ - 15.3^\circ / \text{day}$ |

### 3.2 Convergence Criteria & Bisection Fallback
- **Angular Error Normalization**:
  $$\text{err} = (f(t_k) - \theta^* + 180^\circ) \pmod{360^\circ} - 180^\circ$$
- **Tolerance**: Absolute error $|\text{err}| < 10^{-6\circ}$ ($0.0036$ arc-seconds).
- **Time Convergence**: This spatial tolerance corresponds to temporal precision of $< 0.02$ seconds.
- **Iteration Bound**: Convergence is typically reached in 3–5 iterations; bounded at maximum 15 iterations.
- **Safety Fallback**: If $|f'(t_k)| < 10^{-4}$ (e.g. planetary station turning points), the solver falls back to bisection with empirical mean speed parameters ($12^\circ/\text{day}$ for Tithi, $13^\circ/\text{day}$ for Nakshatra).

---

## 4. Celestial Timings & Solar Noon Precision

### 4.1 Topocentric Sunrise and Sunset
Sunrise and sunset calculations strictly utilize topocentric coordinates (`swe.rise_trans`) incorporating:
1. **Atmospheric Refraction**: Standard standard sea-level refraction of $34'$ ($0.5667^\circ$).
2. **Solar Disc Semi-Diameter**: Visual sunrise occurs when the upper limb of the Sun touches the horizon; semi-diameter correction of $16'$ ($0.2667^\circ$).
3. **Total Horizon Dip**: Geometric zenith angle $z_0 = 90^\circ + 34' + 16' = 90^\circ 50' = 90.8333^\circ$.
4. **Observer Elevation Dip**: For elevation $h$ in meters:
   $$\text{dip} = 0.0293^\circ \sqrt{h}$$
   $$\text{Apparent Horizon Angle} = z_0 + \text{dip}$$

### 4.2 Exact Solar Noon (*Madhyahna*) via Meridian Transit
Conventional applications estimate Solar Noon as the arithmetic midpoint between sunrise and sunset:

$$T_{\text{noon, naive}} = T_{\text{rise}} + \frac{T_{\text{set}} - T_{\text{rise}}}{2}$$

Due to the changing solar declination between morning and evening and the Equation of Time, the midpoint can differ from true astronomical meridian transit by 15–45 seconds. AstroVerse computes exact Solar Noon using the Swiss Ephemeris meridian transit solver (`swe.CALC_MTRANSIT`):

$$T_{\text{solar\_noon}} = \text{swe.rise\_trans}(JD_{\text{midnight}}, \text{swe.SUN}, \text{CALC\_MTRANSIT}, (lon, lat, alt))[1][0]$$

---

## 5. Proportional Surya Siddhanta Muhurta Engine

In the *Surya Siddhanta* and classical Jyotish treatises (*Muhurta Chintamani*, *Brihat Samhita*), diurnal and nocturnal time spans are divided into proportional fractions rather than fixed 48-minute hours.

Let $D = T_{\text{sunset}} - T_{\text{sunrise}}$ be the total daytime duration in seconds.  
Let $N = T_{\text{next\_sunrise}} - T_{\text{sunset}}$ be the total nighttime duration in seconds.

### 5.1 The 15-Fold Diurnal and Nocturnal Divisions
Both daytime and nighttime are divided into 15 equal Muhurtas:

$$\Delta M_{\text{day}} = \frac{D}{15}, \quad \Delta M_{\text{night}} = \frac{N}{15}$$

```
+----------------------------------------------------------------------------------------+
|                            15-FOLD MUHURTAS OF SURYA SIDDHANTA                         |
+-----+----------------------+---------------------+-----+-------------------------------+
| #   | Diurnal Muhurta      | Starting Formula    | #   | Nocturnal Muhurta             |
+-----+----------------------+---------------------+-----+-------------------------------+
| 1   | Rudra                | T_rise + 0*ΔM_day   | 1   | Girisha (T_set + 0*ΔM_night)  |
| 2   | Ahi                  | T_rise + 1*ΔM_day   | 2   | Ajapada                       |
| 3   | Mitra                | T_rise + 2*ΔM_day   | 3   | Ahirbudhnya                   |
| 4   | Pitru                | T_rise + 3*ΔM_day   | 4   | Pushan                        |
| 5   | Vasu                 | T_rise + 4*ΔM_day   | 5   | Ashvi                         |
| 6   | Varaha               | T_rise + 5*ΔM_day   | 6   | Yama                          |
| 7   | Vishvedeva           | T_rise + 6*ΔM_day   | 7   | Agni                          |
| 8   | Abhijit (Auspicious) | T_rise + 7*ΔM_day   | 8   | Vidhatru                      |
| 9   | Vidhi                | T_rise + 8*ΔM_day   | 9   | Chanda                        |
| 10  | Sutamukhi            | T_rise + 9*ΔM_day   | 10  | Aditi                         |
| 11  | Puruhuta (Vijaya)    | T_rise + 10*ΔM_day  | 11  | Jiva                          |
| 12  | Vahni                | T_rise + 11*ΔM_day  | 12  | Vishnu                        |
| 13  | Naktanchara          | T_rise + 12*ΔM_day  | 13  | Yumyadyuti                    |
| 14  | Varuna               | T_rise + 13*ΔM_day  | 14  | Brahma Muhurta (Pre-Sunrise)  |
| 15  | Aryama               | T_rise + 14*ΔM_day  | 15  | Samudram                      |
+-----+----------------------+---------------------+-----+-------------------------------+
```

### 5.2 Brahma Muhurta
Brahma Muhurta is strictly the **14th nocturnal Muhurta** of the night preceding sunrise:

$$\text{Start}_{\text{Brahma}} = T_{\text{rise}} - 2 \cdot \Delta M_{\text{night}} = T_{\text{rise}} - 2 \cdot \frac{N}{15}$$

$$\text{End}_{\text{Brahma}} = T_{\text{rise}} - 1 \cdot \Delta M_{\text{night}} = T_{\text{rise}} - \frac{N}{15}$$

$$\text{Duration}_{\text{Brahma}} = \Delta M_{\text{night}} = \frac{N}{15}$$

*Equinoctial Baseline*: When $N = 12 \text{ hours} = 720 \text{ minutes}$, $\Delta M_{\text{night}} = 48 \text{ minutes}$, spanning from 96 minutes to 48 minutes before sunrise. In winter or extreme latitudes, duration expands or contracts proportionally.

### 5.3 Abhijit Muhurta
Abhijit is the **8th diurnal Muhurta**, centered symmetrically around true Solar Noon:

$$\text{Start}_{\text{Abhijit}} = T_{\text{rise}} + 7 \cdot \frac{D}{15}$$

$$\text{End}_{\text{Abhijit}} = T_{\text{rise}} + 8 \cdot \frac{D}{15}$$

On Wednesdays, Abhijit Muhurta is contaminated by Wednesday's *Durmuhurta* and is considered ineffective for auspicious initiations.

### 5.4 The 8-Fold Daytime Divisions: Rahu Kaal, Yamaganda & Gulika
The daytime duration $D$ is divided into 8 equal segments (*Ashtamsha*):

$$\Delta P = \frac{D}{8}$$

The inauspicious windows are indexed by weekday ($w \in [0, 6]$ where Monday=0, Sunday=6):

$$\text{Window}(w) = [T_{\text{rise}} + (p(w) - 1) \cdot \Delta P, \quad T_{\text{rise}} + p(w) \cdot \Delta P]$$

```
+-------------------------------------------------------------------------------+
|                      8-FOLD DAYTIME DIVISION PART INDICES                     |
+---------------------+-----+-----+-----+-----+-----+-----+---------------------+
| Window              | Mon | Tue | Wed | Thu | Fri | Sat | Sun                 |
+---------------------+-----+-----+-----+-----+-----+-----+---------------------+
| Rahu Kaal           | 2nd | 7th | 5th | 6th | 4th | 3rd | 8th                 |
| Yamaganda           | 4th | 3rd | 2nd | 1st | 7th | 6th | 5th                 |
| Gulika Kalam        | 6th | 5th | 4th | 3rd | 2nd | 1st | 7th                 |
+---------------------+-----+-----+-----+-----+-----+-----+---------------------+
```

---

## 6. Complete 16-Period Choghadiya System

*Choghadiya* (from *Chau-Ghadia*, spanning 4 Ghatikas = 96 minutes under equinoctial conditions) divides both daytime and nighttime into 8 equal periods each, yielding 16 distinct operational windows per 24-hour cycle.

Each period spans $\Delta P_{\text{day}} = D / 8$ or $\Delta P_{\text{night}} = N / 8$. The seven Choghadiya types rotate according to ancient weekday lordship sequences:

```
+-------------------------------------------------------------------------------+
|                       CHOGHADIYA CLASSIFICATION & NATURE                      |
+---------+-------------------+----------------+--------------------------------+
| Type    | Nature            | Ruling Graha   | Recommended Actions            |
+---------+-------------------+----------------+--------------------------------+
| Amrita  | Highly Auspicious | Moon (Chandra) | All auspicious works, health   |
| Shubha  | Auspicious        | Jupiter (Guru) | Ceremonies, weddings, dharma   |
| Labha   | Auspicious        | Mercury (Budha)| Trade, business, acquisitions  |
| Chara   | Neutral / Dynamic | Venus (Shukra) | Travel, vehicle journeys       |
| Udvega  | Inauspicious      | Sun (Surya)    | Government friction, tension   |
| Kala    | Inauspicious      | Saturn (Shani) | Losses, lethargy, delay        |
| Roga    | Inauspicious      | Mars (Mangala) | Illness, litigation, conflict  |
+---------+-------------------+----------------+--------------------------------+
```

### Day Choghadiya Sequences (8 Daytime Periods)
- **Monday**: Amrit $\to$ Kaal $\to$ Shubh $\to$ Rog $\to$ Udveg $\to$ Char $\to$ Labh $\to$ Amrit
- **Tuesday**: Rog $\to$ Udveg $\to$ Char $\to$ Labh $\to$ Amrit $\to$ Kaal $\to$ Shubh $\to$ Rog
- **Wednesday**: Labh $\to$ Amrit $\to$ Kaal $\to$ Shubh $\to$ Rog $\to$ Udveg $\to$ Char $\to$ Labh
- **Thursday**: Shubh $\to$ Rog $\to$ Udveg $\to$ Char $\to$ Labh $\to$ Amrit $\to$ Kaal $\to$ Shubh
- **Friday**: Char $\to$ Labh $\to$ Amrit $\to$ Kaal $\to$ Shubh $\to$ Rog $\to$ Udveg $\to$ Char
- **Saturday**: Kaal $\to$ Shubh $\to$ Rog $\to$ Udveg $\to$ Char $\to$ Labh $\to$ Amrit $\to$ Kaal
- **Sunday**: Udveg $\to$ Char $\to$ Labh $\to$ Amrit $\to$ Kaal $\to$ Shubh $\to$ Rog $\to$ Udveg

### Night Choghadiya Sequences (8 Nighttime Periods)
- **Monday**: Char $\to$ Rog $\to$ Kaal $\to$ Labh $\to$ Udveg $\to$ Shubh $\to$ Amrit $\to$ Char
- **Tuesday**: Kaal $\to$ Labh $\to$ Udveg $\to$ Shubh $\to$ Amrit $\to$ Char $\to$ Rog $\to$ Kaal
- **Wednesday**: Udveg $\to$ Shubh $\to$ Amrit $\to$ Char $\to$ Rog $\to$ Kaal $\to$ Labh $\to$ Udveg
- **Thursday**: Amrit $\to$ Char $\to$ Rog $\to$ Kaal $\to$ Labh $\to$ Udveg $\to$ Shubh $\to$ Amrit
- **Friday**: Rog $\to$ Kaal $\to$ Labh $\to$ Udveg $\to$ Shubh $\to$ Amrit $\to$ Char $\to$ Rog
- **Saturday**: Labh $\to$ Udveg $\to$ Shubh $\to$ Amrit $\to$ Char $\to$ Rog $\to$ Kaal $\to$ Labh
- **Sunday**: Shubh $\to$ Amrit $\to$ Char $\to$ Rog $\to$ Kaal $\to$ Labh $\to$ Udveg $\to$ Shubh

---

## 7. Lunar Month Conventions & Samvat Systems

### 7.1 Amanta vs. Purnimanta Month Systems
The naming of lunar months is anchored to the sidereal solar transit (*Sankranti*), determined by the zodiac sign occupied by the Sun at the moment of the New Moon (*Amavasya*).

$$\text{Month Index } m = \left\lfloor \frac{\lambda_S(t_{\text{Amavasya}})}{30^\circ} \right\rfloor \in [0, 11]$$

Where index 0 corresponds to *Chaitra* (Sun in Pisces/Aries boundary), 1 to *Vaishakha*, ..., 11 to *Phalguna*.

1. **Amanta System (Mukhya Mana)**:
   - Practiced predominantly in Southern and Western India (Maharashtra, Gujarat, Karnataka, Andhra Pradesh, Tamil Nadu, Kerala).
   - The month begins at the conclusion of Amavasya ($0^\circ$ elongation) and ends at the next Amavasya.
   - Fortnight sequence: **Shukla Paksha** followed by **Krishna Paksha**.
2. **Purnimanta System (Gauna Mana)**:
   - Practiced predominantly in Northern India (Uttar Pradesh, Bihar, Rajasthan, Madhya Pradesh, Haryana, Punjab).
   - The month begins at the conclusion of Purnima ($180^\circ$ elongation) and ends at the next Purnima.
   - Fortnight sequence: **Krishna Paksha** of month $m+1$ followed by **Shukla Paksha** of month $m+1$.
   - **Crucial Mathematical Rule for Adhika Masa**: During an intercalary month (*Adhika Masa*), both the Shukla and Krishna fortnights retain the identical Adhika name (e.g. *Adhika Shravana Krishna Paksha* followed by *Adhika Shravana Shukla Paksha*). The Purnimanta month does not skip to "Adhika Bhadrapada" during Krishna Paksha.

### 7.2 Adhika Masa (Intercalary Month) Detection
A lunar month with no Solar Sankranti (the Sun does not transit into a new sign during the period between two consecutive New Moons) is designated an **Adhika Masa** (*intercalary / leap month*):

$$\text{If } \left\lfloor \frac{\lambda_S(t_1)}{30^\circ} \right\rfloor = \left\lfloor \frac{\lambda_S(t_2)}{30^\circ} \right\rfloor \implies \text{Adhika Masa}$$

Conversely, if two Sankrantis occur within a single lunar month, it is designated a **Kshaya Masa** (*suppressed month*).

### 7.3 Samvat Calendrical Epochs
- **Shaka Samvat (National Indian Calendar)**:
  - Formally instituted 78 AD.
  - New Year begins on *Chaitra Shukla Pratipada*.
  - $\text{Shaka Year} = \text{Gregorian Year} - 78$ (for dates after Chaitra Sukladi).
- **Vikram Samvat (North Indian Chaitradi)**:
  - Formally instituted 57 BC.
  - New Year begins on *Chaitra Shukla Pratipada*.
  - $\text{Vikram Samvat (Chaitradi)} = \text{Gregorian Year} + 57$ (for dates after Chaitra Sukladi).
- **Vikram Samvat (Western Indian Kartikadi)**:
  - Practiced in Gujarat and parts of Rajasthan and Maharashtra.
  - New Year begins on *Kartika Shukla Pratipada* (day following Diwali).
  - Shifts by $+57$ or $+56$ relative to Gregorian year depending on Diwali date.
