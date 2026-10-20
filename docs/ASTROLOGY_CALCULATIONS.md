# Astronomical & Vedic Astrology Calculation Engine — Mathematical Specification

## 1. Mathematical Baseline & Ephemeris Integration

The Astroverse calculation engine (`services/kundli-engine`) uses high-precision Swiss Ephemeris C-bindings via `pyswisseph` (version 2.10.3.2). All planetary coordinates are calculated in the **Sidereal Zodiac (Nirayana)** using the **Chitra Paksha / Lahiri Ayanamsha** (`swe.SIDM_LAHIRI`).

### 1.1 Julian Day Calculation
For any Gregorian birth date and time $(Y, M, D, H, Min, Sec)$ at UTC offset $TZ$:
$$\text{UT} = H + \frac{Min}{60} + \frac{Sec}{3600} - TZ$$
$$\text{JD}_{\text{UT}} = \text{swe.julday}(Y, M, D, \text{UT}, \text{swe.GREG_CAL})$$

### 1.2 Sidereal Planetary Coordinates
1. Set the ayanamsha model: `swe.set_sid_mode(swe.SIDM_LAHIRI, 0, 0)`
2. Calculate the Lahiri Ayanamsha angle $\Delta\lambda_{\text{Lahiri}}$ for $\text{JD}_{\text{UT}}$.
3. Compute geocentric sidereal positions:
   $$\lambda_{\text{sidereal}} = \text{swe.calc_ut}(\text{JD}_{\text{UT}}, \text{Planet}, \text{swe.FLG_SIDEREAL} \mid \text{swe.FLG_SWIEPH})$$
4. **True Ketu Calculation**:
   Ketu is calculated mathematically in exact 180° opposition to the True Lunar Node (Rahu):
   $$\lambda_{\text{Ketu}} = (\lambda_{\text{Rahu}} + 180^\circ) \pmod{360^\circ}$$
5. **Retrograde Motion**:
   A planet is flagged as retrograde if its longitudinal daily speed is negative:
   $$\text{is\_retrograde} = (v_{\lambda} < 0)$$

---

## 2. Janam Panchang Derivation

The 5 limbs of the Vedic Panchang are computed dynamically:

1. **Tithi (Lunar Day)**:
   $$\text{arc}_{\text{Tithi}} = (\lambda_{\text{Moon}} - \lambda_{\text{Sun}}) \pmod{360^\circ}$$
   $$\text{Tithi Number} = \left\lfloor \frac{\text{arc}_{\text{Tithi}}}{12^\circ} \right\rfloor + 1$$
   - Numbers $1 \dots 15$: Shukla Paksha (Waxing Phase)
   - Numbers $16 \dots 30$: Krishna Paksha (Waning Phase)

2. **Vaar (Solar Day of Week)**:
   Determined from local sunrise. If the birth occurs before sunrise, the astrological Vaar belongs to the previous calendar day.
   $$\text{Vaar} \in \{\text{Ravivaar (Sun)}, \text{Somvaar (Moon)}, \text{Mangalvaar (Mars)}, \text{Budhvaar (Merc)}, \text{Guruvaar (Jup)}, \text{Shukravaar (Ven)}, \text{Shanivaar (Sat)}\}$$

3. **Nakshatra (Lunar Mansion)**:
   $$\text{arc}_{\text{Nakshatra}} = \lambda_{\text{Moon}} \pmod{360^\circ}$$
   $$\text{Nakshatra Index} = \left\lfloor \frac{\text{arc}_{\text{Nakshatra}}}{13^\circ 20'} \right\rfloor = \left\lfloor \frac{\lambda_{\text{Moon}}}{13.3333^\circ} \right\rfloor$$
   $$\text{Pada (Quarter)} = \left\lfloor \frac{\lambda_{\text{Moon}} \pmod{13^\circ 20'}}{3^\circ 20'} \right\rfloor + 1 \in \{1, 2, 3, 4\}$$

4. **Yoga**:
   $$\text{arc}_{\text{Yoga}} = (\lambda_{\text{Sun}} + \lambda_{\text{Moon}}) \pmod{360^\circ}$$
   $$\text{Yoga Index} = \left\lfloor \frac{\text{arc}_{\text{Yoga}}}{13^\circ 20'} \right\rfloor + 1 \in \{1 \dots 27\} \quad (\text{Vishkambha to Vaidhriti})$$

5. **Karana (Half-Tithi)**:
   $$\text{Karana Index} = \left\lfloor \frac{\text{arc}_{\text{Tithi}}}{6^\circ} \right\rfloor + 1 \in \{1 \dots 60\}$$
   Mapped to the 4 fixed Karanas (Shakuni, Chatushpada, Naga, Kintughna) and the 7 repeating movable Karanas (Bava, Balava, Kaulava, Taitila, Gara, Vanija, Vishti).

---

## 3. Divisional Charts (Varga Charts)

### 3.1 D1 Rashi Chart & Ascendant (Lagna)
Ascendant degree $\lambda_{\text{Asc}}$ is derived using geodetic latitude $\phi$, longitude $\theta$, and Julian Day via `swe.houses_ex(JD, lat, lon, b'P')`.
$$\text{Lagna Sign} = \left\lfloor \frac{\lambda_{\text{Asc}}}{30^\circ} \right\rfloor + 1$$
House numbers $H_1 \dots H_{12}$ follow the Whole Sign and Equal House schemes oriented from $\text{Lagna Sign}$.

### 3.2 D9 Navamsha Chart (Spouse, Dharma & Soul Purpose)
Each 30° zodiac sign is divided into 9 segments of $3^\circ 20'$ ($3.3333^\circ$):
$$\text{sign\_idx} = \left\lfloor \frac{\lambda}{30^\circ} \right\rfloor, \quad \text{deg\_in\_sign} = \lambda \pmod{30^\circ}, \quad \text{part} = \left\lfloor \frac{\text{deg\_in\_sign}}{3.3333^\circ} \right\rfloor$$
The starting sign of the Navamsha cycle depends on the element of the sign:
- **Fire Signs** (Aries, Leo, Sagittarius): Starts from Aries ($0$).
  $$\text{D9 Sign} = (\text{part}) \pmod{12}$$
- **Earth Signs** (Taurus, Virgo, Capricorn): Starts from Capricorn ($9$).
  $$\text{D9 Sign} = (9 + \text{part}) \pmod{12}$$
- **Air Signs** (Gemini, Libra, Aquarius): Starts from Libra ($6$).
  $$\text{D9 Sign} = (6 + \text{part}) \pmod{12}$$
- **Water Signs** (Cancer, Scorpio, Pisces): Starts from Cancer ($3$).
  $$\text{D9 Sign} = (3 + \text{part}) \pmod{12}$$

### 3.3 D10 Dashamsha Chart (Career, Status & Public Karma)
Each sign is divided into 10 segments of $3^\circ 00'$ ($3.0^\circ$):
$$\text{part} = \left\lfloor \frac{\text{deg\_in\_sign}}{3.0^\circ} \right\rfloor \in \{0 \dots 9\}$$
- **Odd Signs** (Aries, Gemini, Leo, Libra, Sagittarius, Aquarius): Count begins from the sign itself:
  $$\text{D10 Sign} = (\text{sign\_idx} + \text{part}) \pmod{12}$$
- **Even Signs** (Taurus, Cancer, Virgo, Scorpio, Capricorn, Pisces): Count begins from the 9th sign from the sign:
  $$\text{D10 Sign} = (\text{sign\_idx} + 8 + \text{part}) \pmod{12}$$

### 3.4 Moon Chart (Chandra Lagna)
Rotates the entire chart so that the Moon's natal sign becomes House 1. Houses $2 \dots 12$ are numbered cyclically from the Moon sign.

### 3.5 Bhava Chalit Cusp Math
Computes midpoints between adjacent house cusps $\text{Mid}_i = \frac{\text{Cusp}_i + \text{Cusp}_{i+1}}{2}$. A planet whose longitude falls across a midpoint boundary shifts into the adjacent Bhava (house), reflecting real astrological house occupancy.

---

## 4. 120-Year Vimshottari Dasha Engine

### 4.1 Planetary Period Allocation
The complete 120-year cycle follows the classical Parashari sequence:
| Ruler | Mahadasha Duration ($Y_i$) | Nakshatras Ruled |
| :--- | :--- | :--- |
| **Ketu** | 7 Years | Ashwini (0), Magha (9), Mula (18) |
| **Venus** | 20 Years | Bharani (1), Purva Phalguni (10), Purva Ashadha (19) |
| **Sun** | 6 Years | Krittika (2), Uttara Phalguni (11), Uttara Ashadha (20) |
| **Moon** | 10 Years | Rohini (3), Hasta (12), Shravana (21) |
| **Mars** | 7 Years | Mrigashira (4), Chitra (13), Dhanishta (22) |
| **Rahu** | 18 Years | Ardra (5), Swati (14), Shatabhisha (23) |
| **Jupiter** | 16 Years | Punarvasu (6), Vishakha (15), Purva Bhadrapada (24) |
| **Saturn** | 19 Years | Pushya (7), Anuradha (16), Uttara Bhadrapada (25) |
| **Mercury** | 17 Years | Ashlesha (8), Jyeshtha (17), Revati (26) |

### 4.2 Fractional Birth Balance
Let $\lambda_{\text{Moon\_rem}} = \lambda_{\text{Moon}} \pmod{13^\circ 20'}$.
The elapsed fraction of the birth Nakshatra is:
$$f_{\text{elapsed}} = \frac{\lambda_{\text{Moon\_rem}}}{13.333333^\circ}$$
$$f_{\text{balance}} = 1.0 - f_{\text{elapsed}}$$
$$\text{Remaining Years of First Mahadasha} = Y_{\text{start}} \times f_{\text{balance}}$$

### 4.3 Antardasha Sub-Period Calculation
Each Mahadasha of duration $Y_{\text{MD}}$ contains 9 Antardashas. The duration of an Antardasha of ruler $j$ inside Mahadasha $i$ is:
$$\text{Duration}_{\text{AD}} = \frac{Y_{\text{MD}_i} \times Y_{\text{MD}_j}}{120} \text{ years}$$
The start and end dates are generated sequentially and matched against the target query timestamp to identify the active planetary influence and progress percentage.

---

## 5. Classical Doshas & Planetary Rules

### 5.1 Parashari Manglik Dosha & Cancellation Rules
Mars produces Kuja Dosha if situated in Houses **1, 4, 7, 8, or 12** from the Lagna or Moon.
Astroverse implements **7 classical Parashari cancellation conditions**:
1. Mars is in its own sign (Aries or Scorpio).
2. Mars is exalted (Capricorn).
3. Mars is in the 1st house in Aries.
4. Mars is in the 4th house in Scorpio.
5. Mars is in the 7th house in Capricorn or Pisces.
6. Mars is in the 8th house in Sagittarius.
7. Benefic Jupiter aspects Mars or is conjunct with Mars.

### 5.2 Astronomical Kaal Sarp Dosha Check
True Kaal Sarp requires that **all 7 classical physical planets** (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn) be strictly hemmed within the Rahu-Ketu nodal arc.
- If all 7 planets are on one side of the nodal axis: **Full Kaal Sarp Dosha**.
- If 6 planets are within the arc and exactly 1 planet is outside: **Anshik (Partial) Kaal Sarp Dosha**.
- If 2 or more planets are outside the arc: **No Kaal Sarp Dosha**.
- The 12 classical varieties (Anant, Kulik, Vasuki, Shankhpal, Padma, Mahapadma, Takshak, Karkotak, Shankhachur, Ghatak, Vishdhar, Sheshnag) are determined by Rahu's house position ($1 \dots 12$).

### 5.3 Dynamic Shani Sade Sati Transit
Computes the sidereal transit of Saturn relative to the natal Moon sign:
- **Rising Phase (First Phase)**: Saturn transiting 12th house from natal Moon.
- **Peak Phase (Second Phase)**: Saturn transiting natal Moon sign.
- **Setting Phase (Third Phase)**: Saturn transiting 2nd house from natal Moon.
- **Kantaka Shani**: Saturn transiting 4th or 8th house (Ashtama Shani) from natal Moon.

---

## 6. 24-Hour Planetary Horas

Horas divide each day into 24 planetary hours using unequal diurnal and nocturnal intervals based on exact local sunrise and sunset:
1. **Daylight Hora Duration**: $T_{\text{day\_hora}} = \frac{T_{\text{sunset}} - T_{\text{sunrise}}}{12}$
2. **Nighttime Hora Duration**: $T_{\text{night\_hora}} = \frac{T_{\text{next\_sunrise}} - T_{\text{sunset}}}{12}$
3. **Chaldean Order**: Saturn $\to$ Jupiter $\to$ Mars $\to$ Sun $\to$ Venus $\to$ Mercury $\to$ Moon.
4. The first Hora at sunrise is ruled by the lord of the day.

---

## 7. Ashtakoota 36-Guna Matchmaking Matrix

The compatibility score evaluates 8 Kootas between Bride ($B$) and Groom ($G$):

| # | Koota | Max Score | Astrological Principle Evaluated |
| :- | :--- | :--- | :--- |
| 1 | **Varna** | 1.0 | Ego, spiritual temperament, and intellectual alignment |
| 2 | **Vashya** | 2.0 | Mutual attraction, magnetic compatibility, and dominance |
| 3 | **Tara** | 3.0 | Longevity, health, and karmic destiny harmony |
| 4 | **Yoni** | 4.0 | Biological affinity, physical intimacy, and sexual chemistry |
| 5 | **Graha Maitri** | 5.0 | Psychological outlook and emotional friendship of Moon sign lords |
| 6 | **Gana** | 6.0 | Temperament (Deva, Manushya, Rakshasa) |
| 7 | **Bhakoot** | 7.0 | Family welfare, longevity, and wealth (2/12, 6/8, 9/5 dosha check) |
| 8 | **Nadi** | 8.0 | Genetic compatibility, physiological health, and progeny (Adi, Madhya, Antya) |
| **Total** | | **36.0** | $\ge 18.0$ points is deemed auspicious for matrimonial alliance |
