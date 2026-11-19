# AstroVerse AI Calendar Data Sources & Holiday Governance Specification

**Document Version**: 1.0.0  
**Implementation Modules**: `services/kundli-engine/festival_engine.py`, `services/wallet-service/src/server.ts`  
**Data Standards**: Government of India Gazetted Schedules, IMD Rashtriya Panchang, Swiss Ephemeris 2.10.03  
**Author**: Calendar Data & Holiday Engineering Team (`worker_m5_docs`)  
**Status**: APPROVED & ACTIVE  

---

## 1. Executive Summary & Governance Objectives

The AstroVerse Calendar Data Service is built on three pillars of strict data governance:
1. **Separation of Civil Law and Religious Observance**: Distinguishing statutory civil holidays (closures enforceable under the Negotiable Instruments Act or Central Civil Service rules) from sacred astronomical observances (*Vrats*, *Jayantis*, and *Utsavas*).
2. **Deterministic Astronomical Observance Rules**: Grounding festival dates in exact Dharma Shastra tithi-prevailing algorithms (*Udaya Tithi*, *Madhyahna*, *Nishita*, *Pradosha*) rather than rough Gregorian day heuristics.
3. **Transparent Provenance & Tentative Status Tracking**: Providing verifiable source citations (official Government of India gazette notifications, state circulars, astronomical ephemeris) and explicitly marking moon-sighting dependent holidays (*Eid-ul-Fitr*, *Eid-ul-Adha*, *Muharram*) as **Tentative** until official confirmation.

---

## 2. Astronomical Data Provenance

```
+---------------------------------------------------------------------------------------+
|                            ASTRONOMICAL PROVENANCE PIPELINE                           |
+--------------------------+------------------------------+-----------------------------+
| Layer                    | Primary Authority            | Role & Application          |
+--------------------------+------------------------------+-----------------------------+
| Planetary Coordinates    | Swiss Ephemeris 2.10.03      | Sub-second planetary vectors|
|                          | Astrodienst AG / NASA JPL    | DE431 numerical integration |
+--------------------------+------------------------------+-----------------------------+
| National Reference       | Positional Astronomy Centre  | Benchmark golden truth for  |
|                          | IMD, Govt. of India          | Indian latitudes & longitudes|
+--------------------------+------------------------------+-----------------------------+
| Topocentric Corrections  | IERS Conventions             | Atmospheric refraction (34')|
|                          |                              | Solar semi-diameter (16')   |
|                          |                              | Topocentric horizon dip     |
+--------------------------+------------------------------+-----------------------------+
| Sidereal Zero-Point      | Lahiri Committee (1955)      | Chitrapaksha Spica at 180°  |
|                          | Calendar Reform Committee    | Epoch 285 AD coincidence    |
+--------------------------+------------------------------+-----------------------------+
```

### 2.1 Swiss Ephemeris (Astrodienst AG / NASA JPL)
- **Engine Version**: `pyswisseph 2.10.03`
- **Ephemeris Base**: Swiss Ephemeris compressed files (`sweph`) based on NASA Jet Propulsion Laboratory (JPL) planetary and lunar ephemerides DE431.
- **Precision**: Sub-second arc accuracy for Sun, Moon, and planets over 3,000 BCE to 3,000 CE.
- **Sidereal Mode Selection**: Strictly configured at runtime via `swe.set_sid_mode(swe.SIDM_LAHIRI)`.

### 2.2 India Meteorological Department (IMD) Rashtriya Panchang Alignment
The *Rashtriya Panchang* (National Panchang of India) is published annually by the Positional Astronomy Centre, India Meteorological Department, Ministry of Earth Sciences, Government of India. AstroVerse benchmarks its calculation engine across 5 primary reference hubs representing cardinal regions of the subcontinent:
1. **New Delhi** ($28.6139^\circ\text{ N}, 77.2090^\circ\text{ E}$): National Capital Territory & Central Government standard.
2. **Jabalpur** ($23.1815^\circ\text{ N}, 79.9864^\circ\text{ E}$): Reference Indian Standard Longitude ($82.5^\circ\text{ E}$ proximity) and zero-divergence testbed.
3. **Mumbai** ($19.0760^\circ\text{ N}, 72.8777^\circ\text{ E}$): Western coastal maritime twilight and high commercial relevance.
4. **Chennai** ($13.0827^\circ\text{ N}, 80.2707^\circ\text{ E}$): Southern peninsular lower-latitude baseline.
5. **Kolkata** ($22.5726^\circ\text{ N}, 88.3639^\circ\text{ E}$): Eastern meridian earlier sunrise benchmark.

---

## 3. Holiday Categories & Taxonomy

The service catalogs all records under 7 mutually exclusive categories:

```
+---------------------------------------------------------------------------------------+
|                              7-TIER HOLIDAY TAXONOMY                                  |
+----+---------------+-------------------------+----------------------------------------+
| #  | Category Tag  | Classification Title    | Statutory Authority / Source           |
+----+---------------+-------------------------+----------------------------------------+
| 1  | national      | National Holidays       | Compulsory nationwide statutory holiday|
|    |               | (3 Statutory Days)      | Central & State Governments, Banks     |
+----+---------------+-------------------------+----------------------------------------+
| 2  | gazetted      | Central Govt. Gazetted  | DoPT Office Memorandum, Ministry of    |
|    |               | Public Holidays         | Personnel, Public Grievances & Pensions|
+----+---------------+-------------------------+----------------------------------------+
| 3  | restricted    | Central Govt. Restricted| DoPT Optional/Restricted Holiday List  |
|    |               | (Optional) Holidays     | (Employees choose 2 per year)          |
+----+---------------+-------------------------+----------------------------------------+
| 4  | state         | State & UT Holidays     | Official State Government Gazettes     |
|    |               |                         | (Region-specific e.g. MH, TN, WB)      |
+----+---------------+-------------------------+----------------------------------------+
| 5  | regional      | Regional & Cultural     | Traditional cultural festivals         |
|    |               | Observances             | (Chhath Puja, Pongal, Bihu, Onam)      |
+----+---------------+-------------------------+----------------------------------------+
| 6  | vrat          | Sacred Fasting Days     | Dharma Shastra & Tithi Observance      |
|    |               | & Religious Vrats       | (Ekadashis, Pradosha, Shivratri)       |
+----+---------------+-------------------------+----------------------------------------+
| 7  | bank          | Banking Holidays        | Section 25, Negotiable Instruments Act |
|    |               |                         | 1881 & RBI Circulars (2nd/4th Sat)     |
+----+---------------+-------------------------+----------------------------------------+
```

---

## 4. Dharma Shastra Festival Observance Rules

Assigning a Hindu festival strictly to the date on which a Tithi begins is incorrect. Vedic festivals are tied to specific daily time windows (*Kaalas*) during which the required Tithi must prevail.

```
                  DAYTIME (Diurnal)                        NIGHTTIME (Nocturnal)
  Sunrise               Noon                Sunset               Midnight            Next Sunrise
     |-------------------|--------------------|-------------------|--------------------|
     |   Udaya Tithi     |     Madhyahna      |     Pradosha      |      Nishita       |
     | (Sunrise instant) | (11:00 - 13:30)    | (Post-Sunset ~2h) | (11:45 - 00:45)    |
```

### 4.1 The Udaya Tithi Rule (`udaya_tithi`)
- **Principle**: The Tithi prevailing at the exact moment of local topocentric sunrise ($T_{\text{rise}}$) governs the religious day.
- **Application**: The universal default for Smartas and Vaishnavas for general *Utsavas* and *Vrats*, including:
  - *Dussehra / Vijaya Dashami* (Ashvina Shukla Dashami)
  - *Rama Navami* (Chaitra Shukla Navami)
  - *Holi / Holika Dahan* (Phalguna Purnima)
  - *All 24 Ekadashis* (Smarta & Vaishnava Nimitta)
  - *Maha Navami, Durga Ashtami*
- **Algorithmic Evaluation**:
  ```python
  def evaluate_udaya_tithi(target_tithi_idx, date_obj, lat, lon):
      jd_sunrise = get_sunrise_jd(date_obj, lat, lon)
      tithi_at_sunrise = get_tithi_at_jd(jd_sunrise)
      return tithi_at_sunrise == target_tithi_idx
  ```

### 4.2 The Madhyahna Rule (`madhyahna`)
- **Principle**: The Tithi must prevail during the solar midday period (*Madhyahna Kaal*), defined as the middle third of the daytime duration (typically 11:00 AM to 1:30 PM local solar time).
- **Application**:
  - *Ganesh Chaturthi*: Observed on the day when Bhadrapada Shukla Chaturthi prevails during Madhyahna. If Chaturthi prevails at sunrise but terminates before Madhyahna, the prior day or subsequent day is chosen based on Madhyahna span.
  - *Rama Navami*: Birth celebrated at Madhyahna (noon).

### 4.3 The Nishita Kaal Rule (`nishita`)
- **Principle**: The Tithi must prevail during the midnight window (*Nishita Kaal*), defined as the 8th nocturnal Muhurta centered around astronomical local solar midnight.
- **Application**:
  - *Maha Shivratri*: Observed on the day when Phalguna (or Magha) Krishna Chaturdashi prevails during Nishita Kaal. Even if Trayodashi is present at sunrise, if Chaturdashi touches midnight, that night is Maha Shivratri.
  - *Krishna Janmashtami*: Observed on Bhadrapada Krishna Ashtami when Ashtami (and preferably Rohini Nakshatra) prevails at midnight.

### 4.4 The Pradosha Kaal Rule (`pradosha`)
- **Principle**: The Tithi must prevail during the twilight window (*Pradosha Kaal*), defined as the first 2 Ghatikas (approx. 48 to 72 minutes) immediately following local topocentric sunset.
- **Application**:
  - *Diwali (Lakshmi Puja)*: Observed on the day when Ashvina (or Kartika) Amavasya prevails during Pradosha Kaal. If Amavasya touches Pradosha on Day 1 but ends before sunset on Day 2, Day 1 is selected for Lakshmi Puja regardless of Day 2's sunrise Tithi.
  - *Pradosh Vrats*: Fast observed on Shukla/Krishna Trayodashi prevailing at Pradosha Kaal.

### 4.5 The Aparahna Rule (`aparahna`)
- **Principle**: The Tithi must prevail during the late afternoon window (the 4th division of a 5-fold diurnal day).
- **Application**: *Pitru Paksha Shraddha* and *Mahalaya Amavasya*.

---

## 5. Bank Holidays Engine & Statutory Basis

AstroVerse automates banking holiday computation in compliance with Reserve Bank of India guidelines and statutory civil statutes:

1. **Second and Fourth Saturdays**: Every second and fourth Saturday of every Gregorian month is automatically designated as a banking closure:
   ```python
   def is_bank_saturday(year: int, month: int, day: int) -> bool:
       first_weekday, num_days = calendar.monthrange(year, month)
       saturdays = [d for d in range(1, num_days + 1) if (d + first_weekday - 1) % 7 == 5]
       return day in (saturdays[1], saturdays[3]) if len(saturdays) >= 4 else False
   ```
2. **Annual Commercial Bank Account Closing (April 1)**: Statutory bank closure under Section 25 of the Negotiable Instruments Act 1881 across all public and commercial banks.
3. **National Gazetted Days**: January 26 (Republic Day), August 15 (Independence Day), and October 2 (Mahatma Gandhi Jayanti).

---

## 6. Tentative Holiday Updating & Lifecycle Governance

### 6.1 Moon-Sighting Dependent Islamic Holidays
Holidays dependent on physical visual crescent sighting (*Ru'yat-e-Hilal*) cannot be fixed with absolute certainty years in advance. These include:
- *Id-ul-Fitr* (1st Shawwal)
- *Id-ul-Adha* / *Bakrid* (10th Dhul Hijjah)
- *Muharram* / *Ashura* (10th Muharram)
- *Milad-un-Nabi* / *Id-e-Milad* (12th Rabi-ul-Awwal)

### 6.2 Governance Schema & Audit Trail
In AstroVerse data schemas, every record incorporates lifecycle flags:
```typescript
interface HolidayRecord {
  id: string;
  nameEn: string;
  nameHi: string;
  date: string;          // ISO YYYY-MM-DD
  category: string;      // national, gazetted, restricted, state, vrat, bank
  regions: string[];     // ["ALL"] or state ISO codes ["MH", "DL", "KA"]
  isOfficial: boolean;   // Declared by government authority
  isTentative: boolean;  // True for moon-sighting dependent dates
  source: string;        // Explicit publication citation
  observanceRule?: string; // udaya_tithi, madhyahna, nishita, pradosha
  revisionHistory?: {
    revisedAt: string;
    previousDate: string;
    authorityOrderNo: string;
    updatedBy: string;
  }[];
}
```

### 6.3 Annual & Real-Time Administrative Updating Workflow
1. **Preliminary Schedule Publication**: In November/December of year $Y-1$, Central Government DoPT published schedules are ingested. Tentative dates are flagged `isTentative: true`.
2. **State Gazette Merging**: Regional State Government holiday circulars (e.g. Maharashtra General Administration Dept, Tamil Nadu Public Dept) are processed to tag region codes (`regions: ["MH", "TN"]`).
3. **Moon-Sighting Confirmation**: 24–48 hours prior to tentative dates, official Central Hilal Committees and State Government notifications are monitored.
4. **Administrative Patch**: The authorized administrator submits a verified update via the Admin Control Centre with the official notification order number.
5. **Immediate Cache Invalidation**: The API Gateway evicts cache entries matching `panchang:*:*:${year}-${month}*`, broadcasting instant updates across clients.
