# AstroVerse — Explainable Multi-Method Astrological Comparison

**Date:** October 21, 2026  
**Auditor:** Principal Software Architect, Vedic Systems Engineer & Forensic QA Lead  
**Engine Base:** `services/kundli-engine/multi_method_engine.py`

---

## 1. Architectural Philosophy: Distinct Systems, Zero Forced Harmonization

A primary flaw in commercial astrology software is the silent conflation of incompatible astrological systems. Different traditions (Parashari, Jaimini, KP, Tajika) rely on distinct coordinate frameworks, ayanamshas, house cusp definitions, and aspectual mechanics.

AstroVerse enforces the following architectural principles:
1. **Purity of Mechanics:** Each system is computed using its authentic classical conventions.
2. **No Fabricated Average Scores:** The system never averages incompatible scores across systems (e.g. averaging a Parashari Shadbala score with a KP sub-lord significator).
3. **Transparent Divergence Explanations:** When two systems arrive at different perspectives, the technical rationale is explicitly presented to the user.
4. **Epistemic Boundaries:** Agreement between multiple traditions does not constitute proof that an individual event is fatalistically guaranteed.

---

## 2. Comparative Matrix of Supported Methodologies

| Dimension | Classical Parashari | Jaimini Astrology | Krishnamurti Padhdhati (KP) | Tajika Varshaphal |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Text** | *Brihat Parashara Hora Shastra* | *Jaimini Upadesha Sutras* | *KP Readers (K.S. Krishnamurti)* | *Tajika Neelakanthi* |
| **Ayanamsha** | Lahiri (`swe.SIDM_LAHIRI`) | Lahiri (`swe.SIDM_LAHIRI`) | KP (`swe.SIDM_KRISHNAMURTI`) | Lahiri (`swe.SIDM_LAHIRI`) |
| **House Division** | Whole Sign (Equal Rashi Bhavas) | Rashi Bhavas & Arudha Padas | Placidus Semi-Arc Unequal Cusps | Solar Return Rashi Bhavas |
| **Primary Timing Cycle** | Vimshottari 120-Year (Moon) | Chara Dasha (Sign-based) | Vimshottari mapped to Sub-Lords | Annual Solar Return & Muntha |
| **Aspect Mechanics** | Graha Drishti (Planetary rays) | Rashi Drishti (Sign-based) | Western Angle Aspects & Sub-Lords | Tajika Aspects & Deeptamsha Orbs |
| **Focal Indicators** | Kendra/Trikona Lords, Yogas | Atmakaraka (AK), Amatyakaraka (AmK) | Cusp Sub-Lords (1st, 7th, 10th) | Varsheshwara, Sahams (Punya/Vidya) |
| **Primary Question** | "What is my lifetime karmic constitution?" | "What is my soul's longing and social status?" | "Will this specific event materialize and when?" | "What is the operational theme of this year?" |

---

## 3. Technical Rationale for Divergences

### Divergence 1: House Cusps & Boundary Placements
- **The Divergence:** Parashari assigns every planet in Scorpio to House 1 if Scorpio is the Ascendant. In KP, if the 1st House cusp is at 24° Scorpio, a planet at 5° Scorpio falls into the 12th House.
- **Technical Explanation:** Parashari employs Whole Sign / Rashi-equal houses where sign and house coincide. KP employs the Placidus semi-arc system, which divides the diurnal and nocturnal arcs between the meridian and horizon based on the geographic latitude.

### Divergence 2: Aspectual Geometry (Graha Drishti vs. Rashi Drishti)
- **The Divergence:** Under Parashari, Mars aspects the 4th, 7th, and 8th houses from its position. Under Jaimini, Mars aspects whichever signs its sign aspects (e.g. if Mars is in Scorpio, a Fixed sign, it aspects all Movable signs except Libra).
- **Technical Explanation:** Parashari measures direct energetic rays cast by physical grahas. Jaimini treats signs as active energetic vessels that hold permanent resonance regardless of planetary occupancy.

### Divergence 3: Timing Mechanics (Vimshottari vs. Chara Dasha vs. Tajika)
- **The Divergence:** A native experiencing Rahu Mahadasha under Parashari might simultaneously be in a Taurus Chara Dasha under Jaimini and a Jupiter Varsheshwara year under Tajika.
- **Technical Explanation:** These cycles measure different analytical dimensions:
  - Vimshottari measures internal psychological and karmic unfoldment initiated at birth.
  - Chara Dasha measures macro structural stages of life progression.
  - Tajika measures immediate 12-month solar returns from birthday to birthday.

---

## 4. API Specification: `POST /api/astrology/multi-method-comparison`

### Sample Request
```json
{
  "dob": "2005-08-20T14:05:00",
  "lat": 23.1815,
  "lon": 79.9864,
  "timezone": "Asia/Kolkata",
  "target_year": 2026
}
```

### Sample Response Structure
```json
{
  "title": "Explainable Multi-Method Astrological Comparison",
  "profile_evaluated": {
    "lagna": "Scorpio",
    "moon_sign": "Aquarius",
    "active_mahadasha": "Jupiter"
  },
  "methods": [ ... ],
  "points_of_agreement": [ ... ],
  "points_of_divergence": [ ... ],
  "epistemic_statement": "..."
}
```
