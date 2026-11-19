# AstroVerse AI Calendar & Panchang API Reference Manual

**Document Version**: 1.0.0  
**Base URL**: `https://astroverse-eta.vercel.app` (Production) / `http://localhost:3000` (Local)  
**Gateway Router**: `services/wallet-service/src/server.ts`  
**Microservice Target**: `services/kundli-engine/main.py` (`http://localhost:8000`)  
**Author**: Full-Stack & API Gateway Team (`worker_m5_docs`)  
**Status**: ACTIVE & VERIFIED  

---

## 1. Architectural Overview & Caching Semantics

The AstroVerse Calendar API Gateway coordinates high-precision astronomical computation with an enterprise-grade caching tier designed to eliminate redundant CPU-heavy Swiss Ephemeris root-finding iterations.

```
 Client Request (Web SPA, Mobile, Third-Party)
                    |
                    v
  +-------------------------------------+
  | Express Gateway (services/wallet)   |
  +-------------------------------------+
                    |
      Is Key in In-Memory Cache?
           /                 \
         YES                  NO
         /                     \
        v                       v
Return 200 JSON         Proxy to Python FastAPI
X-Cache: HIT            (services/kundli-engine)
Sub-millisecond latency         |
                        Swiss Ephemeris 2.10.03
                        Newton-Raphson Solver
                                |
                                v
                        Store in LRU Cache (1h TTL)
                        Return 200 JSON
                        X-Cache: MISS
```

### 1.1 In-Memory LRU Cache Key Specification
Cache keys enforce the **2-Decimal Coordinate Cluster Invariant**. Rounding latitude and longitude to 2 decimal places clusters users within approximately $\pm 1.1\text{ km}$ ($0.01^\circ \approx 1.11\text{ km}$), ensuring that users in the same neighborhood share identical celestial sunrise/tithi results without cache pollution.

$$\text{Cache Key} = \text{panchang}:\{\text{version}\}:\{\text{ayanamsha}\}:\{\text{convention}\}:\{\text{date}\}:\{\text{round}(\text{lat}, 2)\}:\{\text{round}(\text{lon}, 2)\}:\{\text{tz}\}$$

- **`version`**: Calculation core semantic release (e.g. `2.1.0`).
- **`ayanamsha`**: Sidereal calculation standard (`lahiri`).
- **`convention`**: Lunar month convention (`amanta` or `purnimanta`).
- **`date`**: ISO civil date string (`YYYY-MM-DD` or `YYYY-MM`).
- **`round(lat, 2)` & `round(lon, 2)`**: Coordinates formatted strictly via `toFixed(2)` (e.g. `28.61`, `77.21`).
- **`tz`**: IANA timezone identifier (e.g. `Asia/Kolkata`).

### 1.2 Response Headers
Every calendar API response includes operational cache telemetry:
- `X-Cache`: `HIT` when served directly from memory cache; `MISS` when computed by the backend.
- `X-Cache-Key`: The exact composite cache key utilized for storage and lookup.
- `Cache-Control`: `public, max-age=3600, stale-while-revalidate=600`.

---

## 2. API Endpoints

```
+---------------------------------------------------------------------------------------+
|                               API ENDPOINT SUMMARY MATRIX                             |
+--------------------------+--------+---------------------------------------------------+
| Endpoint Path            | Method | Purpose                                           |
+--------------------------+--------+---------------------------------------------------+
| /api/calendar/month      | GET    | Full composite month grid, tithis, and holidays   |
| /api/panchang/daily      | GET    | Complete 5-Anga Panchang with transition instants |
| /api/panchang/calculate  | GET    | Parity alias for daily Panchang calculation       |
| /api/rashifal/daily      | GET    | 12-sign daily horoscope batch with 6 dimensions   |
| /api/holidays            | GET    | Filterable master Indian holidays & sacred vrats  |
| /api/holidays/list       | GET    | Alias for holidays with category/region filtering |
| /api/transits/monthly    | GET    | 9 Grahas Gochar, ingress, stations & lunar phases |
+--------------------------+--------+---------------------------------------------------+
```

---

### 2.1 GET `/api/calendar/month`
Generates the composite month calendar payload for high-performance grid rendering, containing daily tithi names, nakshatra chips, lunar phases, bank holiday flags, and festival badges.

#### Query Parameters
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `year` | integer | No | Current Year (UTC) | Gregorian calendar year (e.g. `2026`). |
| `month` | integer | No | Current Month (1-12) | Gregorian calendar month (e.g. `11`). |
| `lat` | float | No | `28.6139` | Topocentric latitude in decimal degrees. |
| `lon` | float | No | `77.2090` | Topocentric longitude in decimal degrees. |
| `tz` / `timezone`| string | No | `Asia/Kolkata` | IANA timezone string. |
| `convention`| string | No | `purnimanta` | Lunar month tradition (`purnimanta` \| `amanta`). |
| `region` | string | No | `ALL` | State filter (`ALL`, `DL`, `MH`, `TN`, etc.). |

#### Example Request
```bash
curl -X GET "https://astroverse-eta.vercel.app/api/calendar/month?year=2026&month=11&lat=28.6139&lon=77.2090&tz=Asia/Kolkata&convention=purnimanta" \
  -H "Accept: application/json"
```

#### Example Response (200 OK)
```json
{
  "year": 2026,
  "month": 11,
  "convention": "purnimanta",
  "region": "ALL",
  "total_days": 30,
  "days": [
    {
      "date": "2026-11-01",
      "day": 1,
      "tithi_name": "Krishna Saptami",
      "tithi_index": 21,
      "nakshatra_name": "Pushya",
      "moon_rashi": "Cancer",
      "holidays": [],
      "is_bank_holiday": false
    },
    {
      "date": "2026-11-08",
      "day": 8,
      "tithi_name": "Krishna Amavasya",
      "tithi_index": 29,
      "nakshatra_name": "Swati",
      "moon_rashi": "Libra",
      "holidays": [
        {
          "id": "diwali-2026",
          "nameEn": "Diwali (Deepavali & Lakshmi Puja)",
          "nameHi": "दीपावली / लक्ष्मी पूजा",
          "category": "gazetted",
          "isOfficial": true
        }
      ],
      "is_bank_holiday": true
    }
  ],
  "is_fallback": false
}
```

---

### 2.2 GET `/api/panchang/daily` & `/api/panchang/calculate`
Computes the complete mathematically rigorous 5-Anga Panchang for a specific date and location, providing exact sub-minute transition boundaries, planetary lords, celestial timings, and proportional Surya Siddhanta Muhurtas.

#### Query Parameters
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `date` | string | No | Today (`YYYY-MM-DD`)| Civil calendar date. |
| `lat` | float | No | `28.6139` | Topocentric latitude. |
| `lon` | float | No | `77.2090` | Topocentric longitude. |
| `altitude_m` | float | No | `0.0` | Elevation above sea level in meters. |
| `tz` / `timezone`| string | No | `Asia/Kolkata` | IANA timezone string. |
| `convention`| string | No | `amanta` | Month convention (`amanta` \| `purnimanta`). |

#### Example Response (200 OK)
```json
{
  "date": "2026-11-17",
  "vaar": {
    "name_en": "Tuesday",
    "name_hi": "मंगलवार",
    "name_sa": "मङ्गलवासरः",
    "lord": "Mars",
    "is_pre_sunrise": false
  },
  "tithi": {
    "index": 7,
    "name_en": "Shukla Ashtami",
    "name_hi": "शुक्ल अष्टमी",
    "name_sa": "शुक्लाष्टमी",
    "paksha": "Shukla",
    "start_time_iso": "2026-11-16T18:42:15+05:30",
    "end_time_iso": "2026-11-17T17:14:32+05:30",
    "percentage_elapsed": 82.4,
    "next_tithi": {
      "index": 8,
      "name_en": "Shukla Navami"
    }
  },
  "nakshatra": {
    "index": 22,
    "name_en": "Dhanishta",
    "name_hi": "धनिष्ठा",
    "name_sa": "धनिष्ठा",
    "pada": 2,
    "lord": "Mars",
    "start_time_iso": "2026-11-16T22:10:05+05:30",
    "end_time_iso": "2026-11-17T21:45:18+05:30"
  },
  "yoga": {
    "index": 11,
    "name_en": "Dhruva",
    "name_hi": "ध्रुव",
    "name_sa": "ध्रुव",
    "start_time_iso": "2026-11-17T04:12:00+05:30",
    "end_time_iso": "2026-11-18T03:55:12+05:30"
  },
  "karana": {
    "index": 14,
    "name_en": "Vishti (Bhadra)",
    "name_hi": "विष्टि (भद्रा)",
    "name_sa": "विष्टिः",
    "is_fixed": false,
    "start_time_iso": "2026-11-17T06:02:11+05:30",
    "end_time_iso": "2026-11-17T17:14:32+05:30"
  },
  "celestial": {
    "sunrise_iso": "2026-11-17T06:45:12+05:30",
    "sunset_iso": "2026-11-17T17:28:44+05:30",
    "solar_noon_iso": "2026-11-17T12:06:58+05:30",
    "moonrise_iso": "2026-11-17T12:48:10+05:30",
    "moonset_iso": "2026-11-18T00:15:22+05:30",
    "day_hours": 10.7256,
    "night_hours": 13.2744
  },
  "lunar_month": {
    "name_en": "Kartika",
    "name_hi": "कार्तिक",
    "name_sa": "कार्तिकः",
    "paksha": "Shukla",
    "is_adhika": false,
    "vikram_samvat": 2083,
    "shaka_samvat": 1948
  },
  "muhurats": {
    "brahma_muhurta": {
      "start_iso": "2026-11-17T04:59:12+05:30",
      "end_iso": "2026-11-17T05:52:12+05:30",
      "duration_minutes": 53.0
    },
    "abhijit": {
      "start_iso": "2026-11-17T11:45:32+05:30",
      "end_iso": "2026-11-17T12:28:24+05:30"
    },
    "rahu_kaal": {
      "start_iso": "2026-11-17T14:47:51+05:30",
      "end_iso": "2026-11-17T16:08:18+05:30"
    }
  },
  "moon_rashi": {
    "rashi_en": "Capricorn",
    "rashi_hi": "मकर",
    "rashi_sa": "मकरः",
    "lord": "Saturn"
  }
}
```

---

### 2.3 GET `/api/rashifal/daily`
Generates comprehensive daily astrological forecasts for all 12 Rashis (*Mesha* to *Meen*) evaluated against the transiting Moon house position, sign lord relationships, and Chandrashtama states.

#### Query Parameters
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `date` | string | No | Today (`YYYY-MM-DD`)| Forecast target date. |
| `lat` | float | No | `28.6139` | Topocentric latitude. |
| `lon` | float | No | `77.2090` | Topocentric longitude. |
| `tz` | string | No | `Asia/Kolkata` | Local timezone. |

#### Example Response (200 OK)
```json
{
  "date": "2026-11-17",
  "signs": [
    {
      "signIndex": 0,
      "signNameEn": "Aries",
      "signNameHi": "मेष",
      "rashiLord": "Mars",
      "moonHouse": 10,
      "moonRashiPresent": false,
      "isChandrashtama": false,
      "outlook": "The Moon illuminates your 10th house of profession and authority, amplifying leadership initiatives...",
      "career": "Strategic focus and decisive execution yield praise from superiors. High-impact negotiations succeed.",
      "finance": "Favorable planetary transits encourage prudent long-term investments; avoid speculative intraday trades.",
      "relationships": "Clear, grounded communication resolves domestic misunderstandings. Evening brings shared joy.",
      "wellness": "High vitality supports physical exercise. Maintain hydration and guard against mild shoulder tension.",
      "helpfulFocus": "Chant 'Om Angarakaya Namaha' during sunrise; focus on clarity in leadership tasks.",
      "luckyNumber": 9,
      "luckyColor": "Crimson Red",
      "auspiciousPeriod": "09:15 AM - 10:45 AM"
    },
    {
      "signIndex": 2,
      "signNameEn": "Gemini",
      "signNameHi": "मिथुन",
      "rashiLord": "Mercury",
      "moonHouse": 8,
      "moonRashiPresent": false,
      "isChandrashtama": true,
      "outlook": "Caution: The transiting Moon enters your 8th house, activating Chandrashtama. Maintain mental tranquility...",
      "career": "Postpone major contract signatures and high-stakes meetings. Focus on routine documentation.",
      "finance": "Exercise strict financial restraint. Avoid lending money or executing substantial capital investments.",
      "relationships": "Cultivate patience; resist the impulse to engage in reactive arguments with partners.",
      "wellness": "Prioritize restorative rest, meditation, and light sattvic meals. Avoid strenuous late-night travel.",
      "helpfulFocus": "Recite the Maha Mrityunjaya Mantra; wear silver and practice reflective mindfulness.",
      "luckyNumber": 5,
      "luckyColor": "Emerald Green",
      "auspiciousPeriod": "02:30 PM - 03:45 PM"
    }
  ]
}
```

---

### 2.4 GET `/api/holidays` & `/api/holidays/list`
Returns filterable records of national holidays, gazetted closures, optional/restricted holidays, state observances, religious festivals, and bank holidays.

#### Query Parameters
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `year` | integer | No | `2026` | Calendar year. |
| `month` | integer | No | All months | Specific month (1-12). |
| `category` | string | No | All | Filter by taxonomy (`national`, `gazetted`, `restricted`, `state`, `vrat`, `bank`). |
| `region` | string | No | `ALL` | State code (`DL`, `MH`, `TN`, `KA`, `WB`, etc.). |

#### Example Response (200 OK)
```json
[
  {
    "id": "republic-day-2026",
    "nameEn": "Republic Day",
    "nameHi": "गणतंत्र दिवस",
    "nameSa": "प्रजातन्त्रदिनम्",
    "date": "2026-01-26",
    "category": "national",
    "regions": ["ALL"],
    "isOfficial": true,
    "isTentative": false,
    "source": "Ministry of Personnel, Public Grievances and Pensions, Govt of India",
    "descriptionEn": "Honors the date on which the Constitution of India came into effect in 1950."
  },
  {
    "id": "diwali-2026",
    "nameEn": "Diwali (Deepavali & Lakshmi Puja)",
    "nameHi": "दीपावली / लक्ष्मी पूजा",
    "nameSa": "दीपावली",
    "date": "2026-11-08",
    "category": "gazetted",
    "regions": ["ALL"],
    "isOfficial": true,
    "isTentative": false,
    "source": "Ministry of Personnel, Public Grievances and Pensions, Govt of India",
    "observanceRule": "pradosha",
    "descriptionEn": "Festival of Lights celebrated on Ashvina/Kartika Amavasya during Pradosha Kaal."
  }
]
```

---

### 2.5 GET `/api/transits/monthly`
Calculates planetary Gochar positions for all 9 Navagrahas, identifies exact sign ingress timestamps, retrograde turning points, lunar phases, and planetary conjunctions.

#### Query Parameters
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `year` | integer | No | Current Year | Calendar year. |
| `month` | integer | No | Current Month| Calendar month (1-12). |
| `ayanamsha` | string | No | `lahiri` | Ayanamsha system (`lahiri`). |

#### Example Response (200 OK)
```json
{
  "year": 2026,
  "month": 11,
  "ayanamsha": "Lahiri Chitrapaksha (swe.SIDM_LAHIRI)",
  "lunar_phases": [
    {
      "phase": "Third Quarter",
      "date": "2026-11-01T21:40:12+05:30",
      "illumination_pct": 50.1
    },
    {
      "phase": "New Moon (Amavasya)",
      "date": "2026-11-09T09:44:28+05:30",
      "illumination_pct": 0.0
    },
    {
      "phase": "First Quarter",
      "date": "2026-11-17T14:18:02+05:30",
      "illumination_pct": 50.0
    },
    {
      "phase": "Full Moon (Purnima)",
      "date": "2026-11-24T19:54:10+05:30",
      "illumination_pct": 100.0
    }
  ],
  "planets": {
    "Sun": {
      "rashi": "Scorpio",
      "degree_in_rashi": 2.14,
      "nakshatra": "Vishakha",
      "pada": 4,
      "is_retrograde": false
    },
    "Jupiter": {
      "rashi": "Gemini",
      "degree_in_rashi": 24.38,
      "nakshatra": "Punarvasu",
      "pada": 2,
      "is_retrograde": true
    },
    "Saturn": {
      "rashi": "Pisces",
      "degree_in_rashi": 28.12,
      "nakshatra": "Revati",
      "pada": 4,
      "is_retrograde": false
    }
  },
  "ingresses": [
    {
      "graha": "Sun",
      "from_rashi": "Libra",
      "to_rashi": "Scorpio",
      "ingress_iso": "2026-11-16T17:34:10+05:30"
    }
  ]
}
```

---

## 3. HTTP Error Codes & Client Resilience

```
+---------------------------------------------------------------------------------------+
|                               HTTP STATUS CODE TAXONOMY                               |
+------+-----------------------+--------------------------------------------------------+
| Code | Error Meaning         | Client Mitigation Behavior                             |
+------+-----------------------+--------------------------------------------------------+
| 200  | Success               | Parse and render JSON response                         |
| 304  | Not Modified          | Retain cached client DOM representation                |
| 400  | Bad Request           | Parameter invalid (e.g. month=13, lat > 90); show UI  |
| 429  | Too Many Requests     | Rate limit exceeded (100 req/min); backoff & retry     |
| 500  | Internal Server Error | Gateway automatically fails over to local client Meeus |
|      |                       | and analytical Lahiri engine; zero UI disruption       |
+------+-----------------------+--------------------------------------------------------+
```
