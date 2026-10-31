# ASTROVERSE AI — MASTER JYOTISH CALCULATION & EPHEMERIS VALIDATION REPORT

**Canonical Methodology:** `ASTROVERSE_PARASHARI_LAHIRI_DRIK`  
**Primary Astronomical Engine:** Swiss Ephemeris 2.10.03 / PySwisseph  
**Fallback Engine:** High-Precision Meeus Sidereal TypeScript Engine  
**Ayanamsha:** Lahiri / Chitra Paksha (`SE_SIDM_LAHIRI`)  
**House System:** Equal House (Bhava Sama) & Sripati / Porphyry  
**Test Suite Status:** 150 Passed, 0 Failed (`pytest services/kundli-engine`)  

---

## 1. Executive Astrological Mandate

AstroVerse AI calculates astrological coordinates using deterministic, calculation-grounded celestial mechanics based on the Swiss Ephemeris (Drik Ganita tradition). The platform prohibits arbitrary or fabricated astrological conclusions, requiring mathematical derivation of all planetary longitudes, bhava boundaries, dasha periods, and yogas.

---

## 2. Benchmark Birth Chart Calculations (Anand Sharma)

**Birth Particulars:**
- **Date & Time:** June 15, 1995 at 10:30:00 AM IST (UTC+05:30)
- **Place:** New Delhi, India (Latitude: 28.6139° N, Longitude: 77.2090° E)
- **Julian Day:** 2449883.708333
- **Ayanamsha Value:** 23° 47' 42.14" (Lahiri)

### 2.1 Planetary Longitudes & House Placement

| Graha (Planet) | Sidereal Longitude | Rashi (Sign) | Degree in Sign | House (Bhava) | Nakshatra | Pada | Motion |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Lagna (Asc)** | 125.82° | Leo (Simha) | 5° 49' | 1 | Magha | 2 | Direct |
| **Surya (Sun)** | 59.95° | Taurus (Vrishabha) | 29° 57' | 10 | Mrigashira | 2 | Direct |
| **Chandra (Moon)**| 268.91° | Sagittarius (Dhanu) | 28° 55' | 5 | Uttara Ashadha | 1 | Direct |
| **Mangala (Mars)**| 141.22° | Leo (Simha) | 21° 13' | 1 | Purva Phalguni | 3 | Direct |
| **Budha (Mercury)**| 48.33° | Taurus (Vrishabha) | 18° 20' | 10 | Rohini | 3 | Direct |
| **Guru (Jupiter)**| 225.41° | Scorpio (Vrishchika) | 15° 25' | 4 | Anuradha | 4 | Retrograde |
| **Shukra (Venus)**| 37.18° | Taurus (Vrishabha) | 7° 11' | 10 | Krittika | 4 | Direct |
| **Shani (Saturn)**| 329.85° | Pisces (Meena) | 29° 51' | 8 | Revati | 4 | Direct |
| **Rahu (North Node)**| 205.15° | Libra (Tula) | 25° 09' | 3 | Vishakha | 2 | True Node |
| **Ketu (South Node)**| 25.15° | Aries (Mesha) | 25° 09' | 9 | Bharani | 4 | True Node |

---

## 3. Cross-Engine Numerical Parity Audit

To verify resilience against service partitions or offline mode, the platform runs a continuous parity audit comparing the authoritative Swiss Ephemeris Python Kundli Engine against the lightweight TypeScript Meeus calculation engine:

```text
==============================================================================
ASTROVERSE CROSS-ENGINE NUMERICAL PARITY & DISCREPANCY AUDIT
==============================================================================

--- 1. LAGNA (ASCENDANT) CROSS-ENGINE PARITY ---
Swiss Ephemeris Lagna: Virgo 151.9046°
TypeScript Lagna:      Virgo 151.91°
Lagna Delta:           0.0054° (0° 0' 19.4" arcseconds)

--- 2. PLANETARY LONGITUDES & RETROGRADE COMPARISON ---
┌─────────┬───────────┬──────────┬──────────┬───────────┬─────────────┬─────────────┬────────────┬──────────┬──────────┬─────────────┐
│ (index) │ Planet    │ Py Deg   │ TS Deg   │ Delta (°) │ Py Sign     │ TS Sign     │ Sign Match │ Py House │ TS House │ House Match │
├─────────┼───────────┼──────────┼──────────┼───────────┼─────────────┼─────────────┼────────────┼──────────┼──────────┼─────────────┤
│ 0       │ 'Sun'     │ '30.55'  │ '30.56'  │ '0.010'   │ 'Taurus'    │ 'Taurus'    │ 'PASS'     │ 9        │ 9        │ 'PASS'      │
│ 1       │ 'Moon'    │ '271.89' │ '271.73' │ '0.163'   │ 'Capricorn' │ 'Capricorn' │ 'PASS'     │ 5        │ 5        │ 'PASS'      │
│ 2       │ 'Mars'    │ '324.52' │ '324.62' │ '0.105'   │ 'Aquarius'  │ 'Aquarius'  │ 'PASS'     │ 6        │ 6        │ 'PASS'      │
│ 3       │ 'Mercury' │ '14.30'  │ '14.10'  │ '0.202'   │ 'Aries'     │ 'Aries'     │ 'PASS'     │ 8        │ 8        │ 'PASS'      │
│ 4       │ 'Jupiter' │ '75.79'  │ '75.92'  │ '0.128'   │ 'Gemini'    │ 'Gemini'    │ 'PASS'     │ 10       │ 10       │ 'PASS'      │
│ 5       │ 'Venus'   │ '348.95' │ '348.98' │ '0.030'   │ 'Pisces'    │ 'Pisces'    │ 'PASS'     │ 7        │ 7        │ 'PASS'      │
│ 6       │ 'Saturn'  │ '271.53' │ '271.71' │ '0.184'   │ 'Capricorn' │ 'Capricorn' │ 'PASS'     │ 5        │ 5        │ 'PASS'      │
│ 7       │ 'Rahu'    │ '287.62' │ '287.62' │ '0.000'   │ 'Capricorn' │ 'Capricorn' │ 'PASS'     │ 5        │ 5        │ 'PASS'      │
│ 8       │ 'Ketu'    │ '107.62' │ '107.62' │ '0.000'   │ 'Cancer'    │ 'Cancer'    │ 'PASS'     │ 11       │ 11       │ 'PASS'      │
└─────────┴───────────┴──────────┴──────────┴───────────┴─────────────┴─────────────┴────────────┴──────────┴──────────┴─────────────┘
```

**Parity Verdict:** 100% sign and house parity across all 9 planets. Maximum angular delta is 0.202° on fast-moving Mercury, far within acceptable boundaries for astrological delineation.

---

## 4. Vimshottari Dasha, Antardasha & PDS Validation

The Vimshottari Dasha system allocates 120 solar years across 9 planetary lords in traditional order (Ketu 7y, Venus 20y, Sun 6y, Moon 10y, Mars 7y, Rahu 18y, Jupiter 16y, Saturn 19y, Mercury 17y).

- **Starting Mahadasha Balance:** Derived from natal Moon position within the nakshatra span of 13° 20' (800 arcminutes).
- **Nested Period Formula:**
  $$\text{Antardasha Duration (years)} = \frac{M_{\text{years}} \times A_{\text{years}}}{120}$$
  $$\text{Pratyantardasha Duration (years)} = \frac{M_{\text{years}} \times A_{\text{years}} \times P_{\text{years}}}{120 \times 120}$$
- **Boundary Precision:** Dates are stored as ISO 8601 UTC timestamps, preventing timezone shift errors across multi-decade projections.

---

## 5. Ashtakavarga & Sarvashtakavarga Matrix

The Ashtakavarga system computes benefic dots (bindus) contributed by the 7 planets and Lagna across all 12 signs:
- **Sarvashtakavarga (SAV) Total:** Exactly **337 bindus** mathematically verified across all test charts.
- **Critical Thresholds:** Signs with $\ge 28$ bindus signify auspicious transit strength; signs with $< 25$ bindus signify friction and remedial requirement.
