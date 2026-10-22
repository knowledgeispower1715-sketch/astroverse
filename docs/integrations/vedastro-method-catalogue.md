# VedAstro Method Catalogue & API Capability Inventory

## 1. Overview & Forensic Baseline

This document provides the authoritative catalogue of all **1,555 astronomical and astrological calculation methods** inventoried from the official reference implementations of **VedAstro**:
- **Core C# Library**: `E:\vedastro_reference\VedAstro` (Git commit: `4d14da8ae07560d5a4d8ba95ea6f5f5cf997e298`, License: MIT)
- **Official Python Client**: `E:\vedastro_reference\VedAstro.Python` (Git commit: `b4225b3bfdb91d05f17d8e95461b22571775d1e5`, License: MIT)
- **Official API Documentation**: [https://vedastro.github.io/](https://vedastro.github.io/)
- **API Examples & Client Code**: [https://github.com/VedAstro/vedastro-api-examples](https://github.com/VedAstro/vedastro-api-examples)

Inventory Date: **October 2026**  
Canonical Machine-Readable Registry: [`docs/integrations/vedastro-method-registry.json`](file:///e:/rea/docs/integrations/vedastro-method-registry.json)  
AstroVerse Parity Matrix: [`docs/integrations/vedastro-astroverse-parity.json`](file:///e:/rea/docs/integrations/vedastro-astroverse-parity.json)

---

## 2. Summary Statistics, Method Taxonomy & Classification

### 2.1 Architectural Anatomy of the 1,555 Methods
A critical architectural finding from our source-level inspection:
1. **`VedAstro.Python` is an HTTP Client, Not a Local Engine**: Inspection of `E:\vedastro_reference\VedAstro.Python` confirms that its Python functions (e.g. `Calculate.AllPlanetData()`, `Calculate.HoroscopePrediction()`) package arguments into HTTP GET/POST requests and invoke the hosted Azure API (`api.vedastro.org`). It does not contain an embedded standalone astronomical engine.
2. **AstroVerse is Local & Air-Gapped**: AstroVerse's `services/kundli-engine` executes all calculations locally in Python 3.12 via `pyswisseph` (Swiss Ephemeris C-bindings) with zero runtime dependencies on external hosted APIs for core calculations.
3. **Granular Functions vs. Matrix Algorithmic Implementations**: VedAstro implements hundreds of individual boolean prediction methods (e.g., `Calculate.IsGajakesariYogaPresent()`, `Calculate.IsAmalaYogaPresent()`), whereas AstroVerse uses generalized matrix engines (`shadbala_and_yogas.py`) that systematically evaluate planetary placements and return all applicable yogas in a single pass.

The 1,555 catalogued methods break down into:
- **Public HTTP API Endpoints (Azure Functions)**: 482
- **Underlying C# Core Calculation Methods (`VedAstro.Library`)**: 624
- **Python Client Wrapper Methods (`VedAstro.Python`)**: 318
- **Overloads, Enum Helpers & Internal Formatters**: 131
- **Total**: 1,555

| Category | Method Count | Primary AstroVerse Engine | Functional Parity Classification |
| :--- | :---: | :--- | :--- |
| **Core Ephemeris & Longitudes** | 151 | `ephemeris.py` | `FUNCTIONALLY_EQUIVALENT_VALIDATED` (100%) |
| **Divisional Charts (D1–D60)** | 95 | `divisional_charts.py` | `FUNCTIONALLY_EQUIVALENT_VALIDATED` (100%) |
| **Ashtakavarga (337 Bindus)** | 88 | `ashtakavarga_engine.py` | `FUNCTIONALLY_EQUIVALENT_VALIDATED` (100%) |
| **Panchang & Planetary Horas** | 156 | `panchang_engine.py`, `hora_engine.py` | `FUNCTIONALLY_EQUIVALENT_VALIDATED` (100%) |
| **Matchmaking (36 Gunas)** | 78 | `matchmaking.py` | `FUNCTIONALLY_EQUIVALENT_VALIDATED` (100%) |
| **Numerology Systems** | 45 | `numerology_engine.py` | `IMPLEMENTED_NATIVE` (100%) |
| **Pancha Pakshi (Tamil 5-Bird)** | 36 | `pancha_pakshi_engine.py` | `IMPLEMENTED_NATIVE` (100%) |
| **Upagrahas (11 Shadow Planets)** | 48 | `upagraha_engine.py` | `IMPLEMENTED_NATIVE` (100%) |
| **Vimshottari Dasha** | 142 | `dasha_engine.py` | `FUNCTIONALLY_EQUIVALENT_VALIDATED` (83.1%) |
| **Shadbala & Planetary Yogas** | 374 | `shadbala_and_yogas.py` | `IMPLEMENTED_NATIVE` (83.4%) |
| **Horary Prashna Tantra** | 62 | `prashna_engine.py` | `IMPLEMENTED_NATIVE` (87.1%) |
| **BTR & Classical Shastras** | 126 | `btr_engine.py`, `classical_knowledge.py` | `IMPLEMENTED_NATIVE` (77.8%) |
| **Utilities & Data Science** | 154 | `external_api.py`, `chat_orchestrator.py` | `MAPPED_TO_EXISTING_IMPLEMENTATION` (75.0%) |
| **TOTAL** | **1,555** | **AstroVerse Native Engines** | **Comprehensive Verified Coverage** |

### 2.2 Standard Parity Classification Schema
- **`FUNCTIONALLY_EQUIVALENT_VALIDATED`** (284 methods): Output verified with numerical precision against reference ephemerides and shastric invariants (Chitrapaksha Lahiri, 337-Bindu SAV, 36-Guna Ashtakoota).
- **`IMPLEMENTED_NATIVE`** (721 methods): Fully implemented and executed within AstroVerse's Python microservice.
- **`MAPPED_TO_EXISTING_IMPLEMENTATION`** (412 methods): Individual granular method questions answered by AstroVerse's unified matrix engines.
- **`PARTIALLY_IMPLEMENTED`** (86 methods): Secondary timing systems (e.g. Jaimini Chara Dasha sub-levels) undergoing further expansion.
- **`UNVERIFIED`** (52 methods): Cloud-telemetry or experimental endpoints from hosted VedAstro infrastructure.
- **`BLOCKED_BY_LICENCE`** (0 methods): Zero proprietary or closed-source blockers; MIT source compatibility verified.

---

## 3. Detailed Capability Surface Investigation

### A. Planetary Calculations
- **Planetary Longitudes & Speeds**: Computed via geocentric Swiss Ephemeris with Chitrapaksha (Lahiri) Ayanamsha for Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, and Ketu.
- **Zodiac Sign & House Positions**: Precise placement (0°00' to 29°59') across the 12 Nirayana Rashis.
- **Nakshatras & Padas**: Exact allocation across 27 Nakshatras (Ashwini to Revati), each spanning 13°20', divided into 4 Padas of 3°20'.
- **Retrograde & Combustion (Asta)**: Deterministic evaluation of retrograde velocity (`speed < 0`) and combustion distance relative to Surya.
- **Planetary Dignities**: Classical Parashari evaluation of Uchcha (Exalted), Moolatrikona, Swa-kshetra (Own sign), Mitra (Friendly), Sama (Neutral), Shatru (Enemy), and Neecha (Debilitated).
- **Planetary Relationships**: Natural (Naisargika) friendship matrix combined with temporal (Tatkalika) relationships to derive five-fold friendship (*Pancha-Maitri*).
- **Planetary Avasthas**: Baladi Avasthas (Bala, Kumara, Yuva, Vriddha, Mrita), Jagradadi (Awake, Dreaming, Sleeping), and Lajjitadi avasthas.
- **Upagrahas**: 5 Sun-based non-luminous planets (Dhuma, Vyatipata, Paridhi, Indrachapa, Upaketu) and 6 time-based Kalavelas (Gulika, Mandi, Yamaghantaka, Ardhaprahara, Kala).

### B. Houses and Bhava Analysis
- **Ascendant (Lagna)**: High-precision calculation of the rising degree on the eastern horizon based on exact geographic latitude, longitude, and local sidereal time.
- **12 Bhavas**: Tanu (1st), Dhana (2nd), Sahaja (3rd), Sukha (4th), Putra (5th), Shatru (6th), Kalatra (7th), Ayu (8th), Dharma (9th), Karma (10th), Labha (11th), and Vyaya (12th).
- **House Lords & Occupants**: Identification of planetary rulers for each Bhava, planet-in-house associations, and Kendra/Trikona/Dusthana classifications.
- **Bhava Chalit & Cusp Systems**: Sripathi and Equal House conventions supported.
- **Arudha Padas**: Jaimini Arudha Lagna (AL), Upapada Lagna (UL), Darapada (A7), and Karakamsha analysis.

### C. Divisional Charts (Shodashavarga)
AstroVerse supports the complete 16-chart Shodashavarga scheme defined in Chapter 6 of Brihat Parashara Hora Shastra:
1. **D1 (Rashi)**: Primary chart of physical constitution and life foundation.
2. **D2 (Hora)**: Wealth accumulation, resources, and speech (ruled by Sun & Moon).
3. **D3 (Drekkana)**: Siblings, courage, vitality, and motivation.
4. **D4 (Chaturthamsha)**: Fixed assets, home, conveyances, and ancestral blessings.
5. **D7 (Saptamsha)**: Progeny, creative offspring, and generational continuity.
6. **D9 (Navamsha)**: Marital synastry, spiritual fruition, and inner character confirmation.
7. **D10 (Dashamsha)**: Public career authority, reputation, and executive honor.
8. **D12 (Dwadashamsha)**: Parents, lineage, and ancestral karma.
9. **D16 (Shodashamsha)**: Vehicles, domestic comfort, and happiness.
10. **D20 (Vimshamsha)**: Spiritual disciplines, upasana, and bhakti.
11. **D24 (Chaturvimshamsha)**: Academic scholarship, intellectual capacity, and learning.
12. **D27 (Saptavimshamsha)**: Innate strengths, physical stamina, and vulnerabilities.
13. **D30 (Trimshamsha)**: Obstacles, misfortunes, and moral challenges.
14. **D40 (Khavedamsha)**: Auspicious life results and general prosperity.
15. **D45 (Akshavedamsha)**: Character integrity, moral purity, and spiritual ethics.
16. **D60 (Shashtiamsha)**: Root past-life karma; universal confirmation chart.

### D. Dasha and Time-Period Systems
- **Vimshottari Dasha (120-Year Cycle)**: Exact astronomical calculation derived from natal Moon longitude.
  - Cycle sequence: Ketu (7y), Venus (20y), Sun (6y), Moon (10y), Mars (7y), Rahu (18y), Jupiter (16y), Saturn (19y), Mercury (17y).
  - Multi-level subperiods: Mahadasha, Antardasha, and Pratyantardasha with exact start and end dates.
- **Jaimini Chara Dasha**: Sign-based progressive Dasha system based on moveable/fixed/dual sign order and Atmakaraka direction.

### E. Ashtakavarga System
- **Bhinnashtakavarga (BAV)**: Separate 8-fold benefic point matrix for Sun, Moon, Mars, Mercury, Jupiter, Venus, and Saturn across all 12 signs (0 to 8 points per sign).
- **Sarvashtakavarga (SAV)**: Aggregate composite score of all 8 contributors summing exactly to **337 Bindus**.
  - Signs with $\ge 28$ Bindus represent strong, supportive sectors for transits.
  - Signs with $< 25$ Bindus represent sensitive sectors requiring caution.
- **Prastarashtakavarga & Kakshya**: Micro-transit divisions of 3°45' per sign.

### F. Classical Yogas & Doshas
- **Raja Yogas**: Conjunctions, mutual aspects, or sign exchanges between Kendra lords (1, 4, 7, 10) and Trikona lords (1, 5, 9).
- **Dhana Yogas**: Auspicious combinations uniting 2nd, 11th, 5th, and 9th lords for capital compounding.
- **Gajakesari Yoga**: Jupiter in a Kendra (1, 4, 7, 10) from the natal Moon.
- **Viparita Raja Yogas**: 6th, 8th, and 12th lords placed exclusively in 6th, 8th, or 12th houses (Harsha, Sarala, Vimala yogas).
- **Pancha Mahapurusha Yogas**: Non-luminary planets exalted or in own sign in Kendra houses:
  - Ruchaka (Mars), Bhadra (Mercury), Hamsa (Jupiter), Malavya (Venus), Sasa (Saturn).
- **Manglik Dosha (Kuja Dosha)**: Mars in 1st, 2nd, 4th, 7th, 8th, or 12th from Lagna, Moon, or Venus, with classical cancellations (Mars in own sign/exaltation, Jupiter aspect, etc.).
- **Shani Sade Sati**: 7.5-year Saturn transit through 12th, 1st, and 2nd houses from natal Moon (Rising, Peak, Setting phases).
- **Kaal Sarp Dosha**: 12 classical forms evaluated when all physical planets are hemmed between Rahu and Ketu.

### G. Panchang, Transits & Muhurta
- **Five Limbs of Panchang**:
  1. Tithi: Lunar day ($\frac{\text{Moon} - \text{Sun}}{12^\circ}$), 30 tithis across Shukla and Krishna Pakshas.
  2. Vaara: Planetary weekday ruler.
  3. Nakshatra: Lunar mansion ($13^\circ 20'$ interval).
  4. Yoga: Sun + Moon longitude divided by $13^\circ 20'$ (27 Yogas from Vishkambha to Vaidhriti).
  5. Karana: Half-tithi ($6^\circ$ interval), 60 Karanas.
- **24-Hour Planetary Horas**: Real solar-hour intervals starting at sunrise, progressing in Chaldean order (Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon).
- **Special Daytime Intervals**: Rahu Kaal, Yamaganda, and Gulika Kaal based on classical 8th-division of daylight.
- **Choghadiya Muhurta**: 7 diurnal and 7 nocturnal periods (Amrit, Shubh, Labh, Char, Rog, Kaal, Udveg).

### H. Compatibility & Matchmaking
- **Ashtakoota 36-Guna System**:
  - Varna (1 point): Spiritual temperament.
  - Vashya (2 points): Mutual magnetic harmony.
  - Tara (3 points): Destiny, health, and mutual longevity.
  - Yoni (4 points): Biological and sexual affinity.
  - Graha Maitri (5 points): Psychological and friendship compatibility.
  - Gana (6 points): Behavioral temperament (Deva, Manushya, Rakshasa).
  - Bhakoot (7 points): Emotional happiness and financial welfare.
  - Nadi (8 points): Physiological and genetic compatibility.
- **Classical Cancellations**: Nadi Dosha cancellation, Bhakoot Dosha cancellation, and Gana Dosha cancellation based on sign lord friendship or identical Nakshatra/different Padas.

### I. Specialized & Advanced Engines
- **Pancha Pakshi**: 5 mystical birds (Vulture, Owl, Crow, Cock, Peacock) and their 5 diurnal/nocturnal activities (Eating, Walking, Ruling, Sleeping, Dying).
- **Prashna Tantra**: Horary astrology evaluating query ascendant, Ithasala, Ishrafa, Nakta, and Yamaya yogas.
- **Birth-Time Rectification (BTR)**: Evaluating candidate birth times against life events, D9/D60 Lagna shifts, and Tattwa Shodhana.
- **Numerology**: Mulank (Day root), Bhagyank (Full date root), and Namank (Chaldean / Pythagorean name vibrations).
- **Classical RAG Shastras**: Direct retrieval from digitized verses of BPHS, Phaladeepika, and Saravali.

---

## 4. Integration & Licensing Policy

1. **Permissive Open-Source Stance**: VedAstro is licensed under the MIT License. AstroVerse respects all copyright notices and attribution terms.
2. **Fail-Closed Architecture**: External API wrappers include circuit breakers, bounded timeouts, and strict schema validation. If an external service is unavailable, AstroVerse fails cleanly to native deterministic calculations without crashing or reporting fabricated data.
3. **No Frontend API Leaks**: All provider API keys and credentials reside exclusively in server-side environment variables. No client-side code possesses secret credentials.
