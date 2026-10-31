# ASTROVERSE AI — JYOTISH CALCULATION RULE & SOURCE REGISTRY

**CLASSIFICATION:** CANONICAL JYOTISH SOURCE CITATION AND MATHEMATICAL SPECIFICATION  
**PROJECT:** AstroVerse AI  
**PRIMARY METHODOLOGY PROFILE:** `ASTROVERSE_PARASHARI_LAHIRI_DRIK`  
**AYANAMSHA:** Lahiri / Chitra Paksha (`swe.SIDM_LAHIRI`, $Spica \approx 180^\circ$)  
**ZODIAC:** Sidereal (Nirayana)  
**HOUSES:** Whole-Sign Rashi Houses (Primary Parashari Standard); Shripati / Porphyry / Equal Bhava Chalit (Explicit Secondary Option)  

---

## 1. SOURCE HIERARCHY & AUTHORITY MATRIX

The AstroVerse AI Jyotish calculation engine prioritizes classical, peer-reviewed astrological texts and astronomical algorithms according to the following strict hierarchy:

| Rank | Authority / Source Text | Author / Origin | Primary Subject Domain | Edition / Translation Reference |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Bṛhat Parāśara Horā Śāstra (BPHS)** | Maharishi Parāśara | Fundamental principles, Vimshottari Dasha, Shodashavarga, Ashtakavarga, Shadbala, Classical Yogas | R. Santhanam translation (Ranjan Publications, New Delhi, 1984); Girish Chand Sharma (Sagar Publications) |
| **2** | **Phaladīpikā** | Mantreswara (c. 13th-16th cent.) | Planetary states (Avasthas), Gochara (Transits), Bhava results, Sade Sati & Ashtama Shani rules | Dr. G.S. Kapoor translation (Ranjan Publications, 2004); V. Subrahmanya Sastri (1937) |
| **3** | **Sārāvalī** | Kalyāna Varma (c. 800 CE) | Planetary dignities, mutual planetary relationships, Nabhasa Yogas, Raja & Dhana Yogas | R. Santhanam translation (Ranjan Publications, 1983) |
| **4** | **Jātaka Pārijāta** | Vaidyanatha Dikshita (c. 14th cent.) | Planetary strengths, Bhava analysis, Yogas, Nakshatra characteristics | V. Subrahmanya Sastri translation (1932) |
| **5** | **Muhūrta Chintāmaṇi** | Daivajna Acharya Ramadayalu | Panchanga (Tithi, Vara, Nakshatra, Yoga, Karana), Hora calculation, Shubha/Ashubha Muhurtas | Pandit Kedar Dutt Joshi commentary (Motilal Banarsidass) |
| **6** | **Swiss Ephemeris Documentation** | Dr. Alois Treindl & Dieter Koch (Astrodienst AG) | High-precision astronomical algorithms, Julian Day conversion, Topocentric vs Geocentric coordinates, Planetary speed | Swiss Ephemeris Programmer's Manual v2.10 (Astrodienst AG, Zürich, 2023) |
| **7** | **Astronomical Algorithms** | Jean Meeus | Fundamental astronomical formulas, Julian Day ephemeris time offsets, trigonometric series approximations | 2nd Edition (Willmann-Bell, Richmond, VA, 1998) |

---

## 2. DETAILED RULE REGISTRY BY CALCULATION MODULE

### 2.1 Vimshottari Dasha Engine

* **Concept:** Vimshottari Dasha 120-Year Lifespan Allocation  
  * **Classical Source:** BPHS, Chapter 46 (Dasha Paddhati), Verses 12–15.  
  * **Rule:** The 120-year cycle is allotted across the 9 Grahas: Sun (6y), Moon (10y), Mars (7y), Rahu (18y), Jupiter (16y), Saturn (19y), Mercury (17y), Ketu (7y), Venus (20y). Total = $120.0\text{ years}$.  
  * **Birth Balance Calculation:** $\text{Balance} = \text{Allotted Years} \times \left(1.0 - \frac{\lambda_{\text{Moon}} \pmod{13^\circ 20'}}{13^\circ 20'}\right)$.  
  * **Implementation:** [`services/kundli-engine/dasha_engine.py`](file:///e:/rea/services/kundli-engine/dasha_engine.py) (`calculate_vimshottari_dasha`), [`services/wallet-service/src/monetization/astroCalculator.ts`](file:///e:/rea/services/wallet-service/src/monetization/astroCalculator.ts) (`calculateVimshottariDasha`).  
  * **Test Identifier:** `test_vimshottari_120_year_cycle_and_balance`.

* **Concept:** Antardasha (Sub-Period) Formulation  
  * **Classical Source:** BPHS, Chapter 46, Verses 20–22.  
  * **Rule:** $\text{Duration}_{\text{Antar}}(M, A) = \text{Years}(M) \times \frac{\text{Years}(A)}{120} \times \text{DaysPerYear}$.  
  * **Implementation:** `calculate_antardashas`.  
  * **Test Identifier:** `test_all_81_antardasha_boundaries`.

* **Concept:** Pratyantardasha (PDS / Sub-Sub-Period) Formulation  
  * **Classical Source:** BPHS, Chapter 46, Verses 23–25; Phaladeepika, Chapter 20, Verses 1–5.  
  * **Rule:** $\text{Duration}_{\text{PDS}}(M, A, P) = \text{Duration}_{\text{Antar}}(M, A) \times \frac{\text{Years}(P)}{120}$.  
  * **Boundary Invariant:** The 9th PDS interval end date is clamped to the parent Antardasha end date with residual day balancing to ensure 0 gap, 0 overlap, and 0 cumulative drift across all 729 sub-periods.  
  * **Implementation:** `calculate_pratyantardashas`, `calculate_antardasha_pds`.  
  * **Test Identifier:** `test_full_729_pds_hierarchy_and_zero_drift`.

---

### 2.2 Gochara (Live Planetary Transits) & Diagnostics

* **Concept:** Parashari Gochara Auspicious Houses from Natal Moon  
  * **Classical Source:** Phaladeepika, Chapter 26 (Gochara Phala), Verses 1–10; BPHS, Chapter 66.  
  * **Rule Matrix (Houses from Natal Moon):**
    * Sun: 3, 6, 10, 11
    * Moon: 1, 3, 6, 7, 10, 11
    * Mars: 3, 6, 11
    * Mercury: 2, 4, 6, 8, 10, 11
    * Jupiter: 2, 5, 7, 9, 11
    * Venus: 1, 2, 3, 4, 5, 8, 9, 11, 12
    * Saturn: 3, 6, 11
    * Rahu: 3, 6, 11
    * Ketu: 3, 6, 11
  * **Implementation:** [`dasha_engine.py`](file:///e:/rea/services/kundli-engine/dasha_engine.py) (`calculate_live_transits`).  
  * **Test Identifier:** `test_live_transits_calculation_and_classical_diagnostics`.

* **Concept:** Shani Sāḍhē Sātī (Seven-and-a-Half-Year Saturn Cycle)  
  * **Classical Source:** Phaladeepika, Chapter 26; Jataka Parijata, Chapter 15.  
  * **Rule:** Saturn transiting:
    * 12th sign from natal Janma Rashi (Moon sign) = Phase 1 (Rising / Aroha)
    * 1st sign (Janma Rashi itself) = Phase 2 (Peak / Janma Shani)
    * 2nd sign from natal Janma Rashi = Phase 3 (Setting / Avaroha)
  * **Distinction Requirement:** Sāḍhē Sātī is strictly evaluated relative to the natal **Moon sign**, never from Lagna.  
  * **Implementation:** `dasha_engine.py` (`sade_sati` diagnostic).  
  * **Test Identifier:** `test_sade_sati_phases_and_boundaries`.

* **Concept:** Aṣṭama Shani & Kaṇṭaka Shani  
  * **Classical Source:** Phaladeepika, Chapter 26, Verse 22; Saravali, Chapter 48.  
  * **Rule:**
    * **Ashtama Shani:** Saturn transiting the 8th sign from natal Moon. Considered a sensitive transformational transit.
    * **Kantaka / Ardhashtama Shani:** Saturn transiting the 4th sign from natal Moon (often termed Ardhashtama Shani) or 10th/7th/4th in differing lineages. In AstroVerse primary profile, 4th house is identified as Ardhashtama / Kantaka with explicit lineage notation.  
  * **Implementation:** `dasha_engine.py` (`kantaka_shani` diagnostic).  
  * **Test Identifier:** `test_kantaka_ardhashtama_shani_diagnostics`.

* **Concept:** Chandrāṣṭama  
  * **Classical Source:** Jataka Parijata, Chapter 14; Muhurta Chintamani.  
  * **Rule:** Transiting Moon transiting through the 8th sidereal sign from the natal Moon sign. Spans approximately 2.25 days ($\approx 54\text{ hours}$).  
  * **Epistemic Constraint:** Traditional texts recommend introspection, avoiding rash high-stakes conflict, and postponing non-urgent negotiations; it must NEVER be displayed as a fatalistic medical warning or guaranteed misfortune.  
  * **Implementation:** `dasha_engine.py` (`chandrashtama` diagnostic).  
  * **Test Identifier:** `test_chandrashtama_moon_8th_house_detection`.

---

### 2.3 Ashtakavarga Engine

* **Concept:** Bhinnāṣṭakavarga (BAV) & Sarvāṣṭakavarga (SAV)  
  * **Classical Source:** BPHS, Chapters 66–72 (Ashtakavarga Adhyaya); Ashtakavarga System of Prediction by B.V. Raman (1972).  
  * **Rule:** Benefic bindu points contributed by the 7 Grahas and Lagna into the charts of the 7 planets across all 12 signs.  
  * **Universal Mathematical Invariant:** The sum of all benefic bindus across all 12 signs in Parashari Sarvashtakavarga is **strictly and invariant 337 points**:
    $$\sum_{\text{sign}=1}^{12} \text{SAV}(\text{sign}) \equiv 337$$
  * **Rahu/Ketu Exclusion:** Classical Parashari Ashtakavarga does not assign bindus to Rahu and Ketu.  
  * **Interpretive Thresholds:** Signs with $\ge 28$ bindus represent robust foundational support; signs with $< 25$ bindus represent areas where conscious effort and patience are indicated.  
  * **Implementation:** [`services/kundli-engine/ashtakavarga_engine.py`](file:///e:/rea/services/kundli-engine/ashtakavarga_engine.py) (`calculate_ashtakavarga`).  
  * **Test Identifier:** `test_ashtakavarga_337_invariant_and_bav_contributions`.

---

### 2.4 Panchanga & Muhurta Engine

* **Concept:** The Five Limbs (Pañca-Aṅga)  
  * **Classical Source:** Surya Siddhanta, Chapter 14; Muhurta Chintamani, Prakarana 1.  
  * **Rules:**
    1. **Vāra (Solar Weekday):** Governed by the planetary day-lord calculated from **local sunrise**, not midnight. Weekday lords follow: Sunday (Sun), Monday (Moon), Tuesday (Mars), Wednesday (Mercury), Thursday (Jupiter), Friday (Venus), Saturday (Saturn).
    2. **Tithi (Lunar Day):** $\text{Tithi Index} = \lfloor \frac{(\lambda_{\text{Moon}} - \lambda_{\text{Sun}} + 360^\circ) \pmod{360^\circ}}{12^\circ} \rfloor$. Exactly 30 Tithis (15 Shukla, 15 Krishna).
    3. **Nakṣatra (Asterism):** $\text{Nakshatra Index} = \lfloor \frac{\lambda_{\text{Moon}}}{13^\circ 20'} \rfloor$. 27 equal divisions of $13^\circ 20'$.
    4. **Yoga (Solar-Lunar Sum):** $\text{Yoga Index} = \lfloor \frac{(\lambda_{\text{Sun}} + \lambda_{\text{Moon}}) \pmod{360^\circ}}{13^\circ 20'} \rfloor$. 27 Yogas from Vishkambha to Vaidhriti.
    5. **Karaṇa (Half-Tithi):** $6^\circ$ arc segments. 4 fixed Karanas (Shakuni, Chatushpada, Naga, Kintughna) and 7 repeating Karanas (Bava through Vishti/Bhadra).  
  * **Implementation:** [`services/kundli-engine/panchang_engine.py`](file:///e:/rea/services/kundli-engine/panchang_engine.py) (`calculate_full_panchang`).  
  * **Test Identifier:** `test_panchanga_five_limbs_and_sunrise_boundaries`.

---

### 2.5 Planetary Hora Engine

* **Concept:** Planetary Horas (Kala Hora)  
  * **Classical Source:** BPHS, Chapter 4 (Graha Guna Swaroopa Adhyaya), Verses 15–18; Muhurta Chintamani.  
  * **Rule:**
    * Daytime from sunrise to sunset is divided into **12 equal diurnal Horas**.
    * Nighttime from sunset to next sunrise is divided into **12 equal nocturnal Horas**.
    * The first daytime Hora of any day is ruled by that day's **Vara Lord**.
    * Subsequent Horas follow the descending **Chaldean Order**:
      $$\text{Saturn} \to \text{Jupiter} \to \text{Mars} \to \text{Sun} \to \text{Venus} \to \text{Mercury} \to \text{Moon}$$
    * Diurnal and nocturnal Horas vary in length throughout the year based on local latitude and solar declination; they are **unequal to 60 clock minutes** except at the equinox on the equator.  
  * **Implementation:** [`services/kundli-engine/hora_engine.py`](file:///e:/rea/services/kundli-engine/hora_engine.py) (`calculate_horas_for_day`).  
  * **Test Identifier:** `test_hora_chaldean_sequence_and_unequal_durations`.

---

### 2.6 Shodashavarga (16 Divisional Charts)

* **Concept:** Parashari Shodashavarga Suite (D1 to D60)  
  * **Classical Source:** BPHS, Chapters 6 & 7 (Shodashavarga Adhyaya).  
  * **Divisions Implemented:**
    * **D1 (Rāśi):** Natal chart ($30^\circ$ Whole Sign houses)
    * **D2 (Horā):** Wealth ($15^\circ$ divisions: Odd sign: Sun 0-15°, Moon 15-30°; Even sign: Moon 0-15°, Sun 15-30°)
    * **D3 (Drekkāṇa):** Siblings & courage ($10^\circ$ divisions: 1st, 5th, 9th sign from it)
    * **D4 (Caturthāṁśa):** Assets & fortune ($7^\circ 30'$ divisions: 1st, 4th, 7th, 10th sign)
    * **D7 (Saptāṁśa):** Progeny ($4^\circ 17' 08.57''$: Odd starts from sign; Even from 7th)
    * **D9 (Navāṁśa):** Marriage & spiritual dharma ($3^\circ 20'$: Fire starts Aries, Earth starts Cap, Air starts Libra, Water starts Cancer)
    * **D10 (Daśāṁśa):** Career & profession ($3^\circ$: Odd starts from sign; Even starts 9th from sign)
    * **D12 (Dvādaśāṁśa):** Lineage & parents ($2^\circ 30'$: starts from sign itself)
    * **D16 (Ṣoḍaśāṁśa):** Conveyances & happiness ($1^\circ 52' 30''$: Movable Aries, Fixed Leo, Dual Sag)
    * **D20 (Viṁśāṁśa):** Upasana & spiritual devotion ($1^\circ 30'$: Movable Aries, Fixed Sag, Dual Leo)
    * **D24 (Caturviṁśāṁśa):** Higher learning & knowledge ($1^\circ 15'$: Odd Leo, Even Cancer)
    * **D27 (Saptaviṁśāṁśa):** Strengths & subconscious ($1^\circ 06' 40''$: Fire Aries, Earth Cancer, Air Libra, Water Cap)
    * **D30 (Triṁśāṁśa):** Misfortunes & character flaws (Unequal Parashari degree allocations)
    * **D40 (Khavedāṁśa):** Maternal karma ($0^\circ 45'$: Odd Aries, Even Libra)
    * **D45 (Akṣavedāṁśa):** General ethical potential ($0^\circ 40'$: Movable Aries, Fixed Leo, Dual Sag)
    * **D60 (Ṣaṣṭyāṁśa):** Subtle karmic imprint ($0^\circ 30'$: Odd starts from sign; Even from 7th)  
  * **Implementation:** [`services/kundli-engine/divisional_charts.py`](file:///e:/rea/services/kundli-engine/divisional_charts.py).  
  * **Test Identifier:** `test_shodashavarga_boundary_matrix`.

---

### 2.7 Shadbala & Planetary Strengths

* **Concept:** Sixfold Planetary Strength (Ṣaḍbala)  
  * **Classical Source:** BPHS, Chapters 27–29 (Shadbala Adhyaya).  
  * **Components:**
    1. **Sthāna Bala (Positional Strength):** Uchhabala, Saptavargaja Bala, Ojhayugmarashyamsha Bala, Kendradi Bala, Drekkana Bala.
    2. **Dig Bala (Directional Strength):** Jupiter/Mercury in 1st (East), Sun/Mars in 10th (South), Saturn in 7th (West), Moon/Venus in 4th (North).
    3. **Kāla Bala (Temporal Strength):** Nathonnatha Bala, Paksha Bala, Tribhaga Bala, Abda/Masa/Vara/Hora Bala, Ayana Bala.
    4. **Ceṣṭā Bala (Motional Strength):** Planetary speed, station, and retrograde empowerment.
    5. **Naisargika Bala (Natural Permanent Strength):** Fixed classical weights (Sun 60.0 down to Saturn 8.57).
    6. **Dṛk Bala (Aspectual Strength):** Sum of benefic vs malefic drishti on the planet.  
  * **Required Minimums in Virupas (BPHS Ch. 29):**
    Sun: 390, Moon: 360, Mars: 300, Mercury: 420, Jupiter: 390, Venus: 330, Saturn: 300.  
  * **Implementation:** [`services/kundli-engine/shadbala_and_yogas.py`](file:///e:/rea/services/kundli-engine/shadbala_and_yogas.py) (`calculate_shadbala`).  
  * **Test Identifier:** `test_shadbala_sixfold_components_and_minimums`.
