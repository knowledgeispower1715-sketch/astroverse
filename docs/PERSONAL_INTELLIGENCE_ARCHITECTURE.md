# AstroVerse Personal Intelligence Architecture

## 1. Overview & Vision

AstroVerse establishes personalized astrological intelligence as the core differentiator of the platform. Generic sun-sign horoscopes are relegated to secondary status, and users are greeted by **"Your Personal Astrological Guidance"** featured prominently across both web and native mobile interfaces.

Every prediction is mathematically grounded in authentic Vedic Parashari Jyotish rules and computed using high-precision Swiss Ephemeris (`pyswisseph 2.10.3.2` with Lahiri Sidereal Ayanamsha and KP Ayanamsha).

---

## 2. End-to-End Architectural Data Flow

```
[User Input / Saved Profile]
         |
         v
[Swiss Ephemeris Engine (services/kundli-engine)]
         |
  +------+------------------------------------------+-----------------------+
  |                                                 |                       |
  v                                                 v                       v
[Parashari Core]                            [Jaimini & KP Modules]    [Solar Hora & Panchang]
  - D1 Lagna & 9 Grahas                       - 7 Chara Karakas         - Topocentric Sunrise/Sunset
  - D9 Navamsha & D10 Dashamsha               - Arudha Lagna (AL/UL)    - 12 Diurnal + 12 Nocturnal Horas
  - 120-Year Vimshottari Dasha                - KP Placidus Cusps       - Rahu Kaal, Yamaganda, Gulika
  - Shadbala & Classical Yogas                - 249-Sub Lord Table      - Abhijit & Brahma Muhurtas
  |                                                 |                       |
  +----------------------+--------------------------+-----------------------+
                         |
                         v
          [AstroVerse Life Map Synthesizer]
            (ai_astrologer.py: generate_structured_prediction)
                         |
  +----------------------+--------------------------+
  |                      |                          |
  v                      v                          v
[Hourly Guidance]   [Weekly / Monthly Map]     [Yearly & 5-Year Dasha]
  - Active Hora       - 7-Day / 4-Week Cycles    - Tajika Varshaphal Solar Return
  - Transiting Moon   - Kendra/Trikona Axis      - 120-Year Vimshottari Timeline
  |                      |                          |
  +----------------------+--------------------------+
                         |
                         v
      [Standardized 9-Section Structured Prediction Report]
       (1) Executive Summary
       (2) Overall Outlook
       (3) Potentially Supportive Themes
       (4) Possible Challenges & Cautions
       (5) Key Time Windows
       (6) Relevant Chart Facts
       (7) Applicable Traditional Rules
       (8) Practical Reflection
       (9) Limitations & Epistemic Scope
                         |
  +----------------------+--------------------------+
  |                                                 |
  v                                                 v
[Interactive Homepage Card]              [Persistent Report Database]
  (Featured Top Guidance)                  (POST /api/reports/save)
                                           (GET /api/reports/:userId)
```

---

## 3. The AstroVerse Life Map & Topical Routing

The AstroVerse Life Map links micro-timing (Hourly) to macro-destiny (5-Year Mahadasha) into a single unified analytical continuum:

1. **Hourly (Diurnal Micro-Timing):** Active planetary hora interval, immediate cognitive focus, and tactical time windows.
2. **Daily (Solar-Lunar Gochara):** Solar transit and diurnal Moon nakshatra interaction with natal ascendant.
3. **Weekly (7-Day Lunar Cycle):** Moon progression across cardinal, succedent, and cadent houses.
4. **Monthly (Solar Ingress & Month Map):** Sun ingress into zodiac signs and major lunation cycles.
5. **Yearly (Tajika Varshaphal & Annual Transits):** Annual solar return instant, moving Muntha house, and Varsheshwara rulership.
6. **Mahadasha (Multi-Year Karmic Chapter):** 120-year Vimshottari Dasha progression and Antardasha sandhi transitions.

### Topical Indicator Routing Matrix
The synthesis engine dynamically adapts its focus based on query context:
- **Career & Authority:** Emphasizes 10th House (Karma Bhava), Dashamsha (D10), Jaimini Amatyakaraka (AmK), KP 10th Cusp Sub-Lord, and Sun/Mercury dignity.
- **Relationships & Alliances:** Emphasizes 7th House (Kalatra Bhava), Navamsha (D9), Upapada Lagna (UL), Jaimini Darakaraka (DK), KP 7th Cusp Sub-Lord, and Venus/Jupiter.
- **Wealth & Assets:** Emphasizes 2nd House (Dhana), 11th House (Labha), 4th House (Property), Dhana Yogas, and Jupiter/Mercury.
- **Vitality & Health:** Emphasizes 1st House (Lagna), 6th House (Ripu/Roga), 8th House (Ayu), Shadbala strength, and Mars/Sun vitality.

---

## 4. Standardized 9-Section Report Specification

Every generated personal report strictly implements the canonical 9-section Parashari format:

1. **Executive Summary (`executive_summary`):** Concise, 1–2 sentence essence of the forecast period.
2. **Overall Outlook (`overall_outlook`):** Detailed narrative synthesizing ascendant, lunar position, and transit influences.
3. **Potentially Supportive Themes (`supportive_themes`):** Specific areas of favorable planetary alignment.
4. **Possible Challenges and Cautions (`challenges_and_cautions`):** Sensitivities, impulsive tendencies, and transit frictions to navigate mindfully.
5. **Key Time Windows (`key_time_windows`):** Explicit time windows for action versus reflection.
6. **Relevant Chart Facts (`relevant_chart_facts`):** Transparent mathematical data (natal Lagna degree, Moon nakshatra, active dasha lords, Saturn transit phase).
7. **Applicable Traditional Rules (`applicable_traditional_rules`):** Grounded citation of the classical astrological rule governing the interpretation.
8. **Practical Reflection (`practical_reflection`):** Actionable, psychologically grounded guidance for daily agency.
9. **Limitations (`limitations`):** Explicit epistemic boundary reminding users that planetary cycles signify environmental predispositions, not fatalistic predetermined outcomes.

---

## 5. Persistence & Multi-Tenant Security

- **Server-Side Validation:** All generated reports are saved via `POST /api/reports/save` with strict authorization checks.
- **Tenant Isolation:** A user can only read or delete their own reports (`GET /api/reports/:id`). Any attempt to access a report belonging to another tenant returns `HTTP 403 Forbidden`.
- **Cross-Platform Sync:** Saved dossiers synchronize automatically across desktop web and mobile apps via JWT/Bearer authentication.
