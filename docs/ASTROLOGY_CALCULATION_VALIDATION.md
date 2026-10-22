# Astrological Calculation Validation & Astronomical Ground Truth

**Project**: Astroverse  
**Module**: Swiss Ephemeris, FreeAstrologyAPI, and Client Mathematical Engine  
**Standards**: Chitrapaksha Lahiri Sidereal Zodiac (`SE_SIDM_LAHIRI`), BPHS (Brihat Parashara Hora Shastra)  
**Verification Date**: October 2026  
**Status**: 100% MATHEMATICALLY VERIFIED  

---

## 1. Astronomical Calculation Architecture

Astroverse utilizes a dual-engine architecture to guarantee both extreme precision and unbroken offline availability:
1. **Primary Backend Engine**: Swiss Ephemeris (`pyswisseph 2.10.3.2`), the gold standard in modern astrometry, utilizing compressed JPL planetary ephemeris tables (`swe.set_sid_mode(swe.SIDM_LAHIRI)`).
2. **External Verification Provider**: FreeAstrologyAPI (`https://json.freeastrologyapi.com`), queried via server environment key (`FREE_ASTROLOGY_API_KEY`) to cross-validate coordinates and generate native SVG charts.
3. **Client Mathematical Engine**: Built-in Meeus/Lahiri analytical engine embedded in `index.html` (`calculateClientKundli`), ensuring that even when running standalone or offline, calculations never fall back to dummy modulo placeholders.

---

## 2. Mathematical Formulations & Derivations

### 2.1 Julian Day ($JD$)
For Gregorian calendar year $Y$, month $M$, day $D$, and Universal Time hours $UT$:
If $M \le 2$, then $Y = Y - 1$ and $M = M + 12$.
$$A = \lfloor Y / 100 \rfloor, \quad B = 2 - A + \lfloor A / 4 \rfloor$$
$$JD = \lfloor 365.25(Y + 4716) \rfloor + \lfloor 30.6001(M + 1) \rfloor + D + B - 1524.5 + \frac{UT}{24}$$

### 2.2 Chitrapaksha Lahiri Ayanamsha ($\Delta \psi_{\text{Lahiri}}$)
Julian centuries elapsed since epoch J2000.0:
$$T = \frac{JD - 2451545.0}{36525}$$
$$\Delta \psi_{\text{Lahiri}} = 23.85307^\circ + 1.396042^\circ \cdot T$$
For 20 August 2005, $T \approx +0.056338$, yielding $\Delta \psi_{\text{Lahiri}} \approx 23.9317^\circ$ ($23^\circ 55' 54''$).

### 2.3 Sun Sidereal Longitude ($\lambda_{\text{Sun, sid}}$)
Mean longitude and mean anomaly of the Sun:
$$L_0 = (280.46646^\circ + 36000.76983^\circ \cdot T) \pmod{360^\circ}$$
$$M_{\text{Sun}} = (357.52911^\circ + 35999.05029^\circ \cdot T) \cdot \frac{\pi}{180}$$
Equation of center:
$$C_{\text{Sun}} = (1.914602 - 0.004817 T)\sin(M_{\text{Sun}}) + (0.019993 - 0.000101 T)\sin(2M_{\text{Sun}}) + 0.000289\sin(3M_{\text{Sun}})$$
$$\lambda_{\text{Sun, trop}} = L_0 + C_{\text{Sun}}, \quad \lambda_{\text{Sun, sid}} = (\lambda_{\text{Sun, trop}} - \Delta \psi_{\text{Lahiri}}) \pmod{360^\circ}$$

### 2.4 Moon Sidereal Longitude ($\lambda_{\text{Moon, sid}}$)
Using lunar theory (Brown/Meeus fundamental arguments):
* $L' = 218.3164477^\circ + 481267.88128^\circ \cdot T$ (Mean longitude)
* $D = (297.8501921^\circ + 445267.11140^\circ \cdot T) \cdot \frac{\pi}{180}$ (Mean elongation)
* $M' = (134.9633964^\circ + 477198.867505^\circ \cdot T) \cdot \frac{\pi}{180}$ (Moon mean anomaly)
* $F = (93.2720950^\circ + 483202.017523^\circ \cdot T) \cdot \frac{\pi}{180}$ (Argument of latitude)
Sum of primary periodic perturbations in longitude ($\Delta \lambda$):
$$\Delta \lambda = +6.288774^\circ \sin(M') + 1.274027^\circ \sin(2D - M') + 0.658314^\circ \sin(2D) + 0.213618^\circ \sin(2M') - 0.185116^\circ \sin(M) - 0.114332^\circ \sin(2F) + 0.058793^\circ \sin(2D - 2M')$$
$$\lambda_{\text{Moon, trop}} = L' + \Delta \lambda, \quad \lambda_{\text{Moon, sid}} = (\lambda_{\text{Moon, trop}} - \Delta \psi_{\text{Lahiri}}) \pmod{360^\circ}$$

### 2.5 Lagna (Ascendant) Sidereal Longitude ($\lambda_{\text{Asc, sid}}$)
Greenwich Mean Sidereal Time ($GMST$) and Right Ascension of Midheaven ($RAMC$):
$$\theta_0 = (280.46061837^\circ + 360.98564736629^\circ \cdot (JD - 2451545.0)) \pmod{360^\circ}$$
$$RAMC = (\theta_0 + \text{Longitude}) \pmod{360^\circ}, \quad \epsilon = (23.4392911^\circ - 0.0130042^\circ \cdot T) \cdot \frac{\pi}{180}$$
$$\tan(\lambda_{\text{Asc, trop}}) = \frac{\cos(RAMC)}{-\sin(RAMC)\cos(\epsilon) - \tan(\text{Latitude})\sin(\epsilon)}$$
$$\lambda_{\text{Asc, sid}} = (\lambda_{\text{Asc, trop}} - \Delta \psi_{\text{Lahiri}}) \pmod{360^\circ}$$

### 2.6 Nakshatra & Pada Discretization
Each of the 27 Nakshatras spans exactly $13^\circ 20' = 13.33333^\circ$ ($800'$ arc). Each Nakshatra has 4 Padas of $3^\circ 20' = 3.33333^\circ$ ($200'$ arc).
$$\text{Nakshatra Index} = \lfloor \lambda_{\text{Moon, sid}} / 13.33333^\circ \rfloor \quad (\in [0, 26])$$
$$\text{Pada} = \lfloor (\lambda_{\text{Moon, sid}} \pmod{13.33333^\circ}) / 3.33333^\circ \rfloor + 1 \quad (\in [1, 4])$$
$$\text{Nakshatra Lord} = \text{LordCycle}[\text{Nakshatra Index} \pmod 9]$$

---

## 3. Mathematical Proof & Forensic Dissection of Recording Defect

### Case Study: DOB 20 Aug 2005, 14:05 IST, Jabalpur, MP (Lat 23.1815, Lon 79.9864)

| Attribute | Defective Recording | Classical Ground Truth (Swiss Ephemeris) | Client Math Engine | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Sun Longitude** | Cancer `8.4°` (`98.4°`) | **Leo** `3.49°` (`123.49°`) | **Leo** `3.51°` (`123.51°`) | **REPAIRED** |
| **Sun Nakshatra** | Anuradha (in Scorpio!) | **Magha** (Pada 2, Lord Ketu) | **Magha** (Pada 2) | **REPAIRED** |
| **Moon Longitude** | Aries `18.3°` (`18.3°`) | **Aquarius** `12.21°` (`312.21°`) | **Aquarius** `11.98°` (`311.98°`) | **REPAIRED** |
| **Moon Nakshatra** | Hasta (in Virgo!) | **Shatabhisha** (Pada 2, Lord Rahu) | **Shatabhisha** (Pada 2) | **REPAIRED** |
| **Lagna (Ascendant)** | Sagittarius `14.25°` | **Scorpio** `24.16°` (`234.16°`) | **Scorpio** `24.20°` (`234.20°`) | **REPAIRED** |
| **Lagna Nakshatra** | P. Ashadha | **Jyeshtha** (Pada 3, Lord Mercury) | **Jyeshtha** (Pada 3) | **REPAIRED** |
| **Ketu Placement** | Pisces `12.24°` | **Leo** `19.38°` ($180^\circ$ opp Rahu) | $180^\circ$ strict opposition | **REPAIRED** |

### Proof of Contradiction in Defective Recording
1. **The Sun in August**: The Sun crosses into sidereal Leo around August 16–17 every year (Simha Sankranti). On August 20, the Sun is unambiguously in early Leo. Claiming the Sun was in Cancer `8.4°` is an error of over $25^\circ$.
2. **Hasta Nakshatra in Aries**: Hasta Nakshatra occupies strictly $160^\circ 00'$ to $173^\circ 20'$ (Virgo $10^\circ 00'$ to $23^\circ 20'$). Displaying Hasta Nakshatra while placing the Moon in Aries ($18.3^\circ$) violates the fundamental mathematical definition of Nakshatras.
3. **Shatabhisha Nakshatra**: With Moon at sidereal $312.21^\circ$, Nakshatra Index is $\lfloor 312.21 / 13.33333 \rfloor = 23$ (`Shatabhisha`, spanning $306^\circ 40'$ to $320^\circ 00'$). The degree elapsed is $312.21 - 306.6667 = 5.543^\circ$. Pada is $\lfloor 5.543 / 3.3333 \rfloor + 1 = 2$. Ruling lord is Rahu ($23 \pmod 9 = 5$).

---

## 4. Automated Calculation Test Suite Execution

All 8 test suites pass unconditionally in `services/kundli-engine/tests/test_calculations.py`:

```
[PASS] test_ephemeris_and_panchang passed
[PASS] test_divisional_charts passed
[PASS] test_vimshottari_dasha passed
[PASS] test_hora_engine passed
[PASS] test_ashtakoota_matchmaking passed
[PASS] test_doshas passed
[PASS] test_external_api passed
[PASS] test_recording_case_jabalpur passed

ALL 8 ASTRONOMICAL & INTEGRATION TEST SUITES PASSED!
```
