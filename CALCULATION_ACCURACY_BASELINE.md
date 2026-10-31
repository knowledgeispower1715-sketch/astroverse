# ASTROVERSE AI — CALCULATION ACCURACY & NUMERICAL BASELINE

**CLASSIFICATION:** CANONICAL MATHEMATICAL AND ASTROLOGICAL NUMERICAL BASELINES  
**PROJECT:** AstroVerse AI  
**PRIMARY METHODOLOGY PROFILE:** `ASTROVERSE_PARASHARI_LAHIRI_DRIK`  
**AYANAMSHA:** Lahiri / Chitra Paksha (`swe.SIDM_LAHIRI`)  
**DEFAULT YEAR CONVENTION:** Gregorian Mean-Year (365.2425 days)  

---

## 1. EPHEMERIS NUMERICAL PRECISION & DRIFT LIMITS

### 1.1 Precision Hierarchy

AstroVerse AI distinguishes six distinct layers of precision to ensure transparency without falsely claiming unattainable accuracy:

1. **Ephemeris Numerical Precision:**
   * **Swiss Ephemeris JPL DE431 (`swe.FLG_SWIEPH`):** $\pm 0.001\text{ arcseconds}$ for planetary positions.
   * **Moshier Analytical Model (`swe.FLG_MOSEPH`):** Better than $0.1\text{ arcseconds}$ for planetary bodies (Sun through Saturn); approximately $3\text{ arcseconds}$ (RMS $\approx 1.5''$) for lunar coordinates relative to JPL DE406 over 3,000 BCE to 3,000 CE.
2. **Birth-Time Precision:**
   * An error of $\pm 4\text{ minutes}$ in recorded civil birth time shifts the Ascendant (Lagna) by approximately $1^\circ 00'$ ($60\text{ arcminutes}$).
   * In fine divisional charts (e.g., D60 Shashtiamsha), a division spans only $0^\circ 30'$ ($30\text{ arcminutes}$), which changes every $\approx 2\text{ minutes}$ of clock time.
3. **Geographic Coordinate Precision:**
   * $0.01^\circ$ in latitude or longitude corresponds to $\approx 1.1\text{ km}$ on Earth's surface, shifting the local RAMC / Lagna cusp by $< 2.4\text{ arcseconds}$.
4. **Display Rounding:**
   * Degrees in sign are formatted to $2\text{ decimal places}$ ($\approx 0.01^\circ = 36\text{ arcseconds}$).
   * Absolute longitudes are preserved internally as 64-bit IEEE 754 floating-point numbers.

---

## 2. VIMSHOTTARI DASHA YEAR-LENGTH CONVENTION COMPARISON MATRIX

Classical Jyotish texts describe several time measures (Saura, Savana, Nakshatra, Chandra). Different contemporary lineages adopt distinct year-length conventions for Vimshottari calculations. AstroVerse AI supports the **Gregorian Mean-Year Convention (365.2425 days)** as its primary profile and provides an explicit mathematical comparison with alternative conventions:

### 2.1 The Three Classical Conventions

1. **Gregorian Mean-Year (AstroVerse Primary):**
   $$\text{Days per Year} = 365.2425\text{ days}$$
   Matches contemporary civil calendar progressions and leap-year distributions.
2. **Julian Calendar Convention:**
   $$\text{Days per Year} = 365.25\text{ days}$$
   Historical ephemeris year basis ($365\text{ days } 6\text{ hours}$).
3. **Savana Year Convention (Traditional 360-Tithi / 360-Day Year):**
   $$\text{Days per Year} = 360.0\text{ days} \quad (12 \times 30\text{ days})$$
   Classical Parashari text tradition (BPHS Ch. 46).

### 2.2 Mathematical Drift Over a 120-Year Lifespan

| Dasha Duration (Years) | Gregorian Mean (365.2425 d) | Julian (365.25 d) | Difference vs Gregorian | Savana (360.0 d) | Difference vs Gregorian |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **Sun (6 y)** | 2,191.455 d | 2,191.500 d | $+0.045\text{ days}$ ($+1.1\text{ hrs}$) | 2,160.000 d | $-31.455\text{ days}$ |
| **Mars (7 y)** | 2,556.698 d | 2,556.750 d | $+0.052\text{ days}$ ($+1.3\text{ hrs}$) | 2,520.000 d | $-36.698\text{ days}$ |
| **Ketu (7 y)** | 2,556.698 d | 2,556.750 d | $+0.052\text{ days}$ ($+1.3\text{ hrs}$) | 2,520.000 d | $-36.698\text{ days}$ |
| **Moon (10 y)** | 3,652.425 d | 3,652.500 d | $+0.075\text{ days}$ ($+1.8\text{ hrs}$) | 3,600.000 d | $-52.425\text{ days}$ |
| **Jupiter (16 y)** | 5,843.880 d | 5,844.000 d | $+0.120\text{ days}$ ($+2.9\text{ hrs}$) | 5,760.000 d | $-83.880\text{ days}$ |
| **Mercury (17 y)** | 6,209.123 d | 6,209.250 d | $+0.127\text{ days}$ ($+3.1\text{ hrs}$) | 6,120.000 d | $-89.123\text{ days}$ |
| **Rahu (18 y)** | 6,574.365 d | 6,574.500 d | $+0.135\text{ days}$ ($+3.2\text{ hrs}$) | 6,480.000 d | $-94.365\text{ days}$ |
| **Saturn (19 y)** | 6,939.608 d | 6,939.750 d | $+0.142\text{ days}$ ($+3.4\text{ hrs}$) | 6,840.000 d | $-99.608\text{ days}$ |
| **Venus (20 y)** | 7,304.850 d | 7,305.000 d | $+0.150\text{ days}$ ($+3.6\text{ hrs}$) | 7,200.000 d | $-104.850\text{ days}$ |
| **Full 120-Year Cycle** | **43,829.100 d** | **43,830.000 d** | **$+0.900\text{ days}$ ($+21.6\text{ hrs}$)** | **43,200.000 d** | **$-629.100\text{ days}$ ($\approx -1.72\text{ years}$)** |

> [!IMPORTANT]
> The difference between **Gregorian Mean (365.2425 d)** and **Julian (365.25 d)** across an entire 120-year lifetime is less than $1\text{ day}$ ($21.6\text{ hours}$). Conversely, the **Savana 360-day convention** accumulates a difference of $629.1\text{ days}$ ($\approx 1.72\text{ years}$) over 120 years. 
> To preserve backward compatibility and prevent shifting existing customer life predictions, AstroVerse AI maintains `365.2425` as its documented default and exposes this transparently in the API metadata.

---

## 3. PARITY TOLERANCES BETWEEN PYTHON & TYPESCRIPT ENGINES

| Calculation Output | Canonical Engine (Python Swiss Ephemeris) | Local Fallback (TypeScript AstroCalculator) | Target Parity Tolerance | Verification Status |
| :--- | :--- | :--- | :---: | :---: |
| **Chitra Paksha Ayanamsha** | `swe.get_ayanamsa_ut(jd)` | $23.85307 + 1.396042 \times T$ | $\pm 0.005^\circ$ ($< 18\text{ arcsec}$) | **VERIFIED** |
| **Sun Sidereal Longitude** | `swe.calc_ut(jd, swe.SUN)` | Meeus solar series - ayanamsha | $\pm 0.01^\circ$ ($< 36\text{ arcsec}$) | **VERIFIED** |
| **Moon Sidereal Longitude** | `swe.calc_ut(jd, swe.MOON)` | Meeus 7-term series - ayanamsha | $\pm 0.05^\circ$ ($< 3\text{ arcmin}$) | **VERIFIED** |
| **Ascendant (Lagna)** | `swe.houses_ex(..., b'P')[1][0]` | RAMC + Obliquity formula | $\pm 0.05^\circ$ | **VERIFIED** |
| **Vimshottari Dasha Dates** | `dasha_engine.py` (365.2425 d) | `astroCalculator.ts` (365.2425 d) | $\pm 0.00\text{ days}$ ($0\text{ sec}$) | **EXACT MATCH** |
| **Antardasha Boundaries** | `dasha_engine.py` (81 Antars) | `astroCalculator.ts` (81 Antars) | $\pm 0.00\text{ days}$ | **EXACT MATCH** |
| **Pratyantardasha (PDS)** | `dasha_engine.py` (729 PDS) | `astroCalculator.ts` (729 PDS) | $\pm 0.00\text{ days}$ | **EXACT MATCH** |
| **SAV Bindus (Total = 337)** | `ashtakavarga_engine.py` | `astroCalculator.ts` | $0\text{ bindu diff}$ (Sum = 337) | **EXACT MATCH** |

---

## 4. MATHEMATICAL ZERO-DRIFT BOUNDARY ASSERTIONS

For any hierarchical interval $[T_{\text{start}}, T_{\text{end}})$ subdivided into 9 child periods $[t_k^{\text{start}}, t_k^{\text{end}})$ where $k \in \{1, \dots, 9\}$:

1. **Continuity:**
   $$t_1^{\text{start}} \equiv T_{\text{start}}$$
   $$t_{k+1}^{\text{start}} \equiv t_k^{\text{end}} \quad \forall k \in \{1, \dots, 8\}$$
2. **Strict Closure:**
   $$t_9^{\text{end}} \equiv T_{\text{end}}$$
3. **Partition Completeness:**
   $$\sum_{k=1}^9 \text{Duration}(t_k) \equiv \text{Duration}(T)$$
4. **Active Interval Invariant:**
   For any reference instant $t_{\text{ref}} \in [T_{\text{start}}, T_{\text{end}})$:
   $$\exists ! \, k \in \{1, \dots, 9\} \text{ such that } t_k^{\text{start}} \le t_{\text{ref}} < t_k^{\text{end}}$$
   The active interval MUST contain $t_{\text{ref}}$, progress MUST satisfy $0.0\% \le \text{Progress} \le 100.0\%$, and remaining days MUST satisfy $\text{Remaining} \ge 0.0$.
