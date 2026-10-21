# AstroVerse Personal Intelligence Architecture

## 1. Overview & Vision

AstroVerse establishes personalized astrological intelligence as the core differentiator of the platform. Generic sun-sign horoscopes are relegated to secondary status, and users are greeted by **"Your Personal Astrological Guidance"** featured prominently at the top of the application.

Every prediction is mathematically grounded in authentic Vedic Parashari Jyotish rules and computed using high-precision Swiss Ephemeris (`pyswisseph 2.10.3.2` with Lahiri Sidereal Ayanamsha).

---

## 2. End-to-End Architectural Data Flow

```
[User Input / Saved Profile]
         |
         v
[Swiss Ephemeris Engine (services/kundli-engine)]
         |
  +------+------------------------------------------+
  |                                                 |
  v                                                 v
[Natal Chart Computation]                 [Solar Hora Engine]
  - D1 Lagna Sign & Degree                  - True Solar Sunrise/Sunset
  - Moon Sign & Nakshatra Pada              - 12 Diurnal + 12 Nocturnal Horas
  - Sun Placement                           - Active Planetary Ruler
  - 120-Year Vimshottari Dasha              - Rahu Kaal & Yamaganda
  - Sade Sati & Manglik Doshas
  |                                                 |
  +----------------------+--------------------------+
                         |
                         v
          [Parashari Prediction Synthesizer]
            (ai_astrologer.py: generate_structured_prediction)
                         |
  +----------------------+--------------------------+
  |                      |                          |
  v                      v                          v
[Hourly Guidance]   [Weekly Forecast]      [Monthly / Yearly Analysis]
  - Active Hora       - 7-Day Lunar Cycle    - 4-Week Gochara Synthesis
  - Transiting Moon   - Kendra/Trikona Axis  - Jupiter/Saturn Cycles
  |                      |                          |
  +----------------------+--------------------------+
                         |
                         v
      [7-Section Structured Prediction Report]
       (A) Overall Outlook
       (B) Supportive Developments
       (C) Possible Challenges & Cautions
       (D) Relevant Time Windows
       (E) Why This Applies (Grounding)
       (F) Practical Reflection
       (G) Limitations & Epistemic Scope
                         |
  +----------------------+--------------------------+
  |                                                 |
  v                                                 v
[Interactive Homepage Card]              [Persistent Report Database]
  (Featured Top Guidance)                  (POST /api/reports/save)
                                           (GET /api/reports/:userId)
```

---

## 3. Astrological Grounding Parameters

Every personalized prediction is strictly grounded in the following astronomical parameters:
1. **Natal Ascendant (Lagna)**: Establishes house lordships, functional benefics, and functional malefics.
2. **Chandra Lagna (Moon Sign & Nakshatra)**: Dictates mental temperament, lunar transit sensitivity, and emotional resilience.
3. **Active Vimshottari Dasha**: Identifies the primary planetary ruler (Mahadasha) and secondary operator (Antardasha) governing the current life chapter.
4. **Current Planetary Hora**: Computes the active Chaldean planetary ruler of the current solar hour interval.
5. **Transiting Gochara Alignment**: Integrates current transit positions of Saturn (Sade Sati status) and Jupiter (functional expansiveness).

---

## 4. API Specification: `POST /api/predictions/generate`

- **Endpoint**: `/api/predictions/generate`
- **Method**: `POST`
- **Controller**: `services/kundli-engine/main.py:generate_prediction_endpoint`

### Request Payload
```json
{
  "horizon": "hourly",
  "target_date": "2026-10-21",
  "dob": "1996-11-24T14:30:00",
  "lat": 28.6139,
  "lon": 77.2090,
  "timezone": "Asia/Kolkata",
  "active_hora_planet": "Moon",
  "hora_window": "02:30 PM - 03:30 PM",
  "category": "general"
}
```

### Modes of Operation
1. **Chart-Grounded Mode (`mode: "PERSONALIZED_CHART_GROUNDED"`)**:
   - Triggered when `dob`, `lat`, and `lon` are supplied (or profile loaded).
   - Generates predictions tailored to the individual's exact natal chart and active dasha.
2. **Guest Mode (`mode: "GENERAL_TRANSIT_UNPERSONALIZED"`)**:
   - Triggered when browsing as a guest without birth parameters.
   - Computes solar Hora timings based on local sunrise/sunset and outputs general qualitative tendencies accompanied by a prominent CTA to register and calculate Janam Kundli.

---

## 5. Report Persistence & Dashboard Reopening

Users can persist any multi-horizon prediction report directly to their account:
1. Client calls `POST /api/reports/save` with auth token.
2. Stored in `SavedReportRecord` in `astroverse_db.json`.
3. Rendered in **My Dashboard** under **Saved Prediction Reports**.
4. Full interactive viewing via the dedicated **Report Viewer Modal** (`#modal-report-viewer`), preserving all 7 standard sections and astrological grounding provenance.
