# VedAstro Source Code and Architectural Audit

**Audit Date**: 2026-10-22  
**Auditor**: AstroVerse Core Architecture Team  
**Reference Revision**:
- **VedAstro Core (C#)**: Commit `4d14da8ae07560d5a4d8ba95ea6f5f5cf997e298` (Branch `master`, local path: `E:\vedastro_reference\VedAstro`)
- **VedAstro.Python**: Commit `b4225b3bfdb91d05f17d8e95461b22571775d1e5` (v1.23.30, local path: `E:\vedastro_reference\VedAstro.Python`)

---

## 1. Executive Summary

This forensic source audit examines the complete architecture, calculation methodologies, API conventions, and client libraries of VedAstro to inform AstroVerse's native Vedic astrology platform expansion. 

Key structural findings:
1. **Core Calculation Engine**: Written in C# (.NET 7/8) under `Library/Logic/Calculate/`, encapsulating celestial algorithms, divisional harmonic mappings (D1–D60), Parashari Ashtakavarga, Shadbala, Vimshottari/Chara Dasa, and specialized traditions (Pancha Pakshi, Numerology, Upagrahas).
2. **OpenAPI Method Registry**: Maintained via `Library/Data/OpenAPIStaticTable.cs`, exposing 477 structured OpenAPI calculation methods with reflection-based metadata and line-number references into `Calculate/Core.cs`.
3. **Python Client Characterization**: Forensic inspection of `VedAstro.Python/vedastro/calculate.py` (8,870 lines) reveals that it is **strictly an HTTP client wrapper** issuing POST requests to `https://vedastro.zaishi.net/api/Calculate/<MethodName>`. It contains zero local calculation algorithms. Consequently, **importing `VedAstro.Python` does not grant offline calculation capabilities** and would introduce catastrophic external network dependencies and latency. AstroVerse therefore adopts native Python implementations of all compatible algorithms directly inside `services/kundli-engine/`.
4. **Licensing**: VedAstro is distributed under the permissive **MIT License** (`Copyright (c) 2014–2022 VedAstro @ VedAstro.org`). Commercial and architectural reuse, algorithmic adaptation, and translation into AstroVerse's native Python runtime are legally authorized with appropriate copyright attribution.

---

## 2. Architectural Decomposition of Reference Repositories

### 2.1 VedAstro Core Library Structure (`Library/`)
```
Library/
├── Logic/
│   ├── Calculate/
│   │   ├── Core.cs             # Primary calculation entry points (477+ OpenAPI methods)
│   │   ├── Ashtakavarga.cs     # BAV, SAV, Prastaraka, Kakshas, Vedhanka
│   │   ├── Muhurtha.cs         # Electional rules, event timing, panchang filters (501 KB)
│   │   ├── Vargas.cs           # D1 through D60 mathematical mappings (247 KB)
│   │   ├── VimshottariDasa.cs  # Multi-tier Dasha hierarchy calculations (91 KB)
│   │   ├── Numerology.cs       # Chaldean/Pythagorean birth, destiny, name numbers (77 KB)
│   │   ├── PanchaPakshi.cs     # Tamil 5-bird system, yama periods, activities (64 KB)
│   │   ├── LocationManager.cs  # Geolocation, timezone conversions, coordinates (90 KB)
│   │   └── ChatAPI.cs          # LLM horoscope prompting & RAG embedding helpers (103 KB)
│   └── Tools.cs                # Ephemeris coordinate conversions, LMT, Julian Day (171 KB)
└── Data/
    ├── OpenAPIStaticTable.cs   # Static metadata table of 477 API methods
    ├── HoroscopeDataListStatic.cs # 226 KB static prediction interpretations
    ├── EventDataListStatic.cs     # 469 KB classical event definition rules
    └── Bhinnashtakavarga.cs, Sarvashtakavarga.cs, Prastaraka.cs # Ashtakavarga data structures
```

### 2.2 Client Library Audit (`VedAstro.Python`)
- **Inspection Finding**: `vedastro/calculate.py` defines class `Calculate` with classmethods wrapping every calculation endpoint:
  ```python
  # Snippet from E:\vedastro_reference\VedAstro.Python\vedastro\calculate.py
  class Calculate:
      base_url = "https://vedastro.zaishi.net/api/Calculate"
      # Sends requests.post(f"{cls.base_url}/{endpoint_name}", json=payload)
  ```
- **Architectural Decision**: AstroVerse rejects hosted remote calculation reliance. All astrological math is executed locally in `services/kundli-engine/` using `pyswisseph` and pure Python mathematical routines, ensuring zero latency, 100% offline uptime, deterministic test reproducibility, and privacy protection for sensitive birth records.

---

## 3. Detailed Algorithmic Domain Breakdown

| Domain | Reference Source | Algorithmic Rules & Conventions | AstroVerse Implementation Plan |
| :--- | :--- | :--- | :--- |
| **Planetary Calculations** | `Core.cs`, `Tools.cs` | Swiss Ephemeris (`swe_calc_ut`), Lahiri Ayanamsa, Nirayana longitude, speed, latitude, retrograde, combustion limits | `services/kundli-engine/ephemeris.py` (Local Swiss Ephemeris) |
| **Houses & Bhava** | `Core.cs` | Sripathi, Placidus, Whole Sign, Bhava Chalit midpoints, House Sandhis, House lords | `services/kundli-engine/ephemeris.py` |
| **Divisional Charts** | `Vargas.cs` | D1–D60 harmonic mappings (D1, D2, D3, D4, D7, D9, D10, D12, D16, D20, D24, D27, D30, D40, D45, D60) with odd/even sign handling | `services/kundli-engine/divisional_charts.py` |
| **Dasha Systems** | `VimshottariDasa.cs` | Vimshottari 120-year cycle (Ketu 7, Venus 20, Sun 6, Moon 10, Mars 7, Rahu 18, Jupiter 16, Saturn 19, Mercury 17); Jaimini Chara Dasa | `services/kundli-engine/dasha_engine.py`, `jaimini_engine.py` |
| **Ashtakavarga** | `Ashtakavarga.cs` | 8-source bindus across 12 signs, 337 total SAV points, Prastaraka, Kakshas, Gochara transits, Vedhanka | `services/kundli-engine/ashtakavarga_engine.py`, `timing_tools.py` |
| **Shadbala** | `Core.cs` (lines 8130–10370) | Sthana, Dig, Kala, Chesta, Naisargika, Drik Bala; Bhava Bala; Ishta & Kashta Phala formulas from BV Raman | `services/kundli-engine/shadbala_and_yogas.py` |
| **Matchmaking** | `Core.cs` (lines 495–500), `Muhurtha.cs` | 12-Kutas (Dina, Gana, Mahendra, Stree-Deergha, Yoni, Rasi, Rasyadhipathi, Vasya, Varna, Vedha, Rajju, Nadi), Ashtakuta 36-point | `services/kundli-engine/matchmaking.py` |
| **Panchang & Timing** | `Core.cs`, `Muhurtha.cs` | Tithi, Vara, Nakshatra, Yoga, Karana, Rahu Kaalam, Yamaganda, Gulika, Abhijit Muhurta, Disha Shool, Chandramana | `services/kundli-engine/panchang_engine.py` |
| **Muhurta** | `Muhurtha.cs` | Choghadiya, Gowri Panchangam, Hora timing, Tarabala (9 Taras), Chandrabala, Panchaka Dosha | `services/kundli-engine/muhurta_engine.py` |
| **Horary / Prashna** | `Core.cs` (Tajika / KP query methods) | Query-time chart casting, Lagnesha & Karyesha aspect analysis (Ithasala, Ishrafa, Nakta, Yamaya) | `services/kundli-engine/prashna_engine.py` (New Native Module) |
| **Numerology** | `Numerology.cs` | Chaldean & Pythagorean number vibration mappings, Mulank (Birth No), Bhagyank (Destiny No), Namank (Name No) | `services/kundli-engine/numerology_engine.py` (New Native Module) |
| **Pancha Pakshi** | `PanchaPakshi.cs` | Tamil Five-Bird system (Vulture, Owl, Crow, Cock, Peacock), waxing/waning cycles, 5 Yamas, 5 diurnal activities | `services/kundli-engine/pancha_pakshi_engine.py` (New Native Module) |
| **Upagrahas** | `Core.cs` (lines 4558–4850) | Dhuma, Vyatipaata, Parivesha, Indrachaapa, Upaketu; Kaala, Mrityu, Arthaprahaara, Yamaghantaka, Gulika, Maandi | `services/kundli-engine/upagraha_engine.py` (New Native Module) |
| **Birth Time Rectification**| `Core.cs` (lines 94–140) | Window scan (+/- precision hours), D1/D9/D60 Lagna transition boundaries, Moon nakshatra shifts, event matching | `services/kundli-engine/btr_engine.py` (New Native Module) |
| **Classical Knowledge** | `HoroscopeDataListStatic.cs` | Structured Sanskrit sloka citations (BPHS, Phaladeepika, Saravali, Uttara Kalamrita) | `services/kundli-engine/classical_knowledge.py` (New Native Module) |

---

## 4. License and Attribution Audit

- **VedAstro License**: MIT License
- **Copyright Owner**: VedAstro @ VedAstro.org (2014–2022)
- **Compliance Status**: Compliant. All algorithms adapted from VedAstro's open-source repositories preserve proper copyright attribution notices in source headers and documentation without requiring reciprocal open-source licensing of the broader AstroVerse proprietary platform.
