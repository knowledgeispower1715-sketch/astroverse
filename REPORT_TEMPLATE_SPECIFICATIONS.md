# AstroVerse AI — Canonical Report Template Specifications

**Author:** Principal Engineering Lead  
**Document Reference:** Deliverable 5 / Document Engineering Specifications  
**Engine Implementations:**  
- Server: `services/wallet-service/src/monetization/reportGenerator.ts`  
- Client: `index.html` (`buildClientSideDemoReportDocument`, `generateAndDownloadReportPdf`)  
**Automated Verification:** `scripts/verify_pdf_engine_and_reader.mjs` (10/10 Products Verified, 100% Conformance)  
**Date:** October 30, 2026  
**Status:** Certified High-Fidelity Multi-Page Specifications  

---

## 1. Document Architecture & Mathematical Layout Invariants

Every AstroVerse report document follows a strict multi-page layout designed for publication-grade physical and digital reading:

1. **Page Dimensions & Resolution:** Standard international A4 format ($210\text{ mm} \times 297\text{ mm}$), rendered at $2\times$ canvas device pixel ratio (`scale: 2`), yielding crisp 300 DPI vector-quality typography and SVG line art.
2. **Page Containment Invariant:** Each physical page is wrapped inside `.pdf-page-container` ($794\text{ px} \times 1122\text{ px}$), strictly bounded with `overflow: hidden`, preventing vertical overflow or unwanted trailing empty pages.
3. **Typography & Styling:**
   - Display & Section Headers: *Cinzel* classical serif with `#881337` deep maroon styling.
   - Body & Analytical Prose: *Plus Jakarta Sans* geometric sans-serif with `#334155` slate tone for optimal contrast.
   - Sacred Mantras & Hindi Synthesis: *Noto Sans Devanagari* (`font-family: 'Noto Sans Devanagari', sans-serif`).
4. **Header & Footer Provenance:**
   - Header: Document title, native's name, calculation baseline (*Nirayana Chitra Paksha Lahiri*).
   - Footer: Digital verification reference (`AV-VERIFY-[8_CHAR_HEX]`), strict confidentiality notice, and dynamic page numbering (`Page X of Y`).
5. **Markup Cleansing Invariant:** Output text is strictly scrubbed of raw markdown syntax (`###`, `**`, `__`) and raw LaTeX delimiters (`\[...\]`, `\$`) before rendering.

---

## 2. Product Specifications Matrix

| # | Product ID | Canonical Title | Chapters | Generated Pages | File Size Range | Core Astrological Features |
| :-: | :--- | :--- | :---: | :---: | :---: | :--- |
| **1** | `report_janam_kundli_deep_dive` | Complete Janam Kundli Deep Dive | 7 | 10–13 | 3.8 – 4.2 MB | D1, D9, D10 diamond SVGs, 9-graha ephemeris, 337 SAV matrix, Shadbala, Vimshottari progression |
| **2** | `report_career_education` | Career & Education Report | 7 | 10 | 2.8 – 3.1 MB | D1 & D10 Dashamsha SVGs, 10th house lordship, 2nd/11th Dhana axes, career dasha windows |
| **3** | `report_relationship_marriage` | Relationship & Marriage Report | 6 | 9 | 2.3 – 2.5 MB | D1 & D9 Navamsha SVGs, 7th house Kalatra, Kuja Dosha audit & Swakshetra mitigation |
| **4** | `report_kundli_milan` | Detailed Kundli Milan (Synastry) | 4 | 7 | 2.2 – 2.4 MB | 36-Guna Ashtakoota matrix, Nadi/Bhakoot dosha checks, D9 cross-ascendant resonance |
| **5** | `report_one_month_forecast` | One-Month Personalized Forecast | 5 | 9 | 2.7 – 2.9 MB | Granular 30-day lunar transit windows, favorable vs caution dates, active dasha cadence |
| **6** | `report_twelve_month_varshphal` | Twelve-Month Varshphal (Annual Forecast) | 4 | 9–12 | 3.2 – 3.5 MB | Tajika solar return, Muntha analysis, 12 calendar month forecast cards across 4 life pillars |
| **7** | `report_three_year_roadmap` | Three-Year Personal Roadmap | 5 | 15 | 9.5 – 10.0 MB | 36-month macro horizon, Dasha shifts, Sade Sati phase transitions, 6-month chunked forecast cards |
| **8** | `report_bundle_kundli_varshphal` | Complete Kundli + Varshphal Master Bundle | 11 | 16 | 6.2 – 6.5 MB | Full Janam Kundli Deep Dive combined with complete 12-Month Annual Varshphal |
| **9** | `report_vedic_name_numerology` | Vedic Name Correction & Numerology Master Blueprint | 15 | 18 | 4.9 – 5.2 MB | Moolank, Bhagyank, Chaldean Naamank, compound vibrations, 5 name candidates, signature analysis |
| **10** | `report_remedial_gemstones` | Remedial Measures & Gemstone Blueprint | 7 | 10 | 4.1 – 4.4 MB | Functional benefics, Lagna-safe Ratna prescriptions, Devanagari Beej mantras, Yantras, Daana |

---

## 3. Detailed Specifications per Template

### 3.1. `report_janam_kundli_deep_dive`
- **Target Audience:** Serious astrological seekers seeking their foundational life blueprint.
- **Section Layout:**
  - Page 1: Formal Publication Cover & Astrological Provenance (Native name, birth data, coordinates, Ayanamsha).
  - Page 2: Natal Rashi (D1) Kundli & Planetary Ephemeris Positions (Graha longitudes, Nakshatras, dignities).
  - Page 3: Divisional Harmonic Kundlis (D9 Navamsha & D10 Dashamsha) & 337-Bindu Sarvashtakavarga matrix.
  - Page 4: Six-Fold Shadbala Potency & Planetary Strengths in Rupas.
  - Pages 5–10: Thematic Chapters:
    1. Chapter 1: The Rising Sign & Vital Temperament (Lagna Lordship & Physical Vitality).
    2. Chapter 2: Planetary Coordinates & Dignity Table (Exaltation, Combustion & Retrograde Velocity).
    3. Chapter 3: Shodashavarga Harmonic Matrix (Harmonic Divisions).
    4. Chapter 4: Ashtakavarga & House Vitality (337-Bindu Benefic Distribution).
    5. Chapter 5: Classical Parashari Yogas & Afflictions (Raja, Dhana, Gajakesari & Dosha evaluations).
    6. Chapter 6: Vimshottari Dasha Karmic Lifecycle Progression.
    7. Chapter 7: Personalized Shastric Remedial Protocol & Ethical Ephemeris Notice.

### 3.2. `report_career_education`
- **Target Audience:** Professionals planning promotions, pivots, executive leadership, or academic pursuits.
- **Section Layout:**
  - Page 1: Cover & Vocational Provenance.
  - Page 2: Classical Rashi (D1) & D10 Dashamsha Career Kundlis side-by-side with vocational ephemeris table.
  - Pages 3–9: Thematic Chapters:
    1. 10th House Karmasthana & Midheaven Planetary Potencies.
    2. D10 Dashamsha Stature, Authority, and Corporate Stature.
    3. 2nd & 11th House Wealth & Revenue Streams (Dhana Yogas).
    4. Active Vimshottari Dasha Career Acceleration Windows.
    5. High-Leverage Strategic Timing & Cautionary Transit Windows.
    6. Optimal Industries, Roles, and Entrepreneurial Alignment.
    7. Targeted Vocational Remedies & Mantra Sadhana for Professional Breakthroughs.

### 3.3. `report_relationship_marriage`
- **Target Audience:** Individuals seeking relationship clarity, partnership longevity, or matrimonial preparation.
- **Section Layout:**
  - Page 1: Cover & Matrimonial Astrological Baseline.
  - Page 2: Dual Rashi (D1) & D9 Navamsha Marriage Charts side-by-side with Kalatra ephemeris coordinates.
  - Pages 3–8: Thematic Chapters:
    1. 7th House Kalatra Diagnostics & Inherent Partnership Expectations.
    2. D9 Navamsha Soul Resonance & Lifelong Spouse Archetype.
    3. Multi-Reference Kuja Dosha (Manglik) Audit (Lagna, Moon, Venus) & Swakshetra Cancellation.
    4. Venusian & Jupiterian Dignity & Marital Harmony Evaluation.
    5. Favorable Marriage Timing Windows & Dasha Subperiods.
    6. Classical Remedial Measures for Marital Stability & Mutual Respect.

### 3.4. `report_kundli_milan`
- **Target Audience:** Two seekers evaluating traditional astrological synastry.
- **Section Layout:**
  - Page 1: Dual-Profile Synastry Cover (Partner A & Partner B birth coordinates and Ayanamsha).
  - Page 2: The Classical 36-Guna Ashtakoota Scorecard:
    - Varna (1), Vashya (2), Tara (3), Yoni (4), Graha Maitri (5), Gana (6), Bhakoot (7), Nadi (8).
  - Pages 3–6: Thematic Chapters:
    1. 36-Guna Detailed Category Evaluation & Numerical Tally.
    2. Nadi & Bhakoot Dosha Verification with Shastric Exceptions.
    3. Cross-Chart D9 Navamsha Harmony & Mutual Lagna Lord Resonance.
    4. Comprehensive Astrological Counselor Verdict & Spiritual Guidance.

### 3.5. `report_one_month_forecast`
- **Target Audience:** Active professionals seeking high-resolution 30-day tactical guidance.
- **Section Layout:**
  - Page 1: Cover & 30-Day Astrological Climate.
  - Page 2: Micro Strategic Focus & High-Resolution Timing Windows (Favorable vs Cautionary dates).
  - Pages 3–8: Thematic Chapters:
    1. Month Overview & Predominant Planetary Frequency.
    2. Active Vimshottari Antardasha & Pratyantardasha Influences.
    3. Lunar Transit Cadence Across 12 Bhavas.
    4. Four Weekly Strategic Focus Areas (Career, Relationships, Finances, Vitality).
    5. Favorable Action Windows (Contracts, Travel, Signings).
  - Page 9: High-Resolution 30-Day Day-by-Day Forecast Calendar Card.

### 3.6. `report_twelve_month_varshphal`
- **Target Audience:** Seekers planning their upcoming year.
- **Section Layout:**
  - Page 1: Cover & Annual Solar Return (Varshphal) Provenance.
  - Page 2: Macro Celestial Climate & Annual Ephemeris Table.
  - Pages 3–6: Thematic Chapters:
    1. Tajika Solar Return & Annual Governing Muntha.
    2. Saturn, Jupiter & Nodal Macro Transit Landscape.
    3. Annual Vimshottari Progression & Quarter-by-Quarter Cadence.
    4. Annual Remedial Protocol & Circadian Disciplines.
  - Pages 7–8: Month-by-Month Forecast Grid (12 comprehensive monthly cards covering Transit Highlights, Career Guidance, Relationship Guidance, Financial Reflection, and Auspicious/Cautionary Days).

### 3.7. `report_three_year_roadmap`
- **Target Audience:** Executives, entrepreneurs, and families planning 36-month strategic horizons.
- **Section Layout:**
  - Page 1: Cover & Multi-Year Strategic Horizon.
  - Page 2: Three-Year Strategic Theme & Macro Planetary Climate.
  - Page 3: Natal D1 & D9 Foundation Kundlis with Planetary Ephemeris Positions.
  - Pages 4–8: Thematic Chapters:
    1. Macro Karmic Arc (Years 1–3).
    2. Year 1: Foundational Focus & Stabilization.
    3. Year 2: Expansion, Strategic Mobility & Key Decisions.
    4. Year 3: Culmination, Milestones & Legacy.
    5. Major Karmic Turning Points & Sade Sati Lifecycle Phases.
  - Pages 9–14: Continuous 36-Month Forecast Grid (Rendered in 6-month distinct seasonal chunks).
  - Page 15: Philosophical Ephemeris Notice & Long-Term Spiritual Sadhana.

### 3.8. `report_bundle_kundli_varshphal`
- **Target Audience:** Seekers wanting both their foundational lifetime blueprint and their 12-month annual roadmap.
- **Section Layout:** Combines all 7 chapters and foundational charts of the Janam Kundli Deep Dive with the Tajika analysis and 12-month calendar cards of the Twelve-Month Varshphal (16 pages total).

### 3.9. `report_vedic_name_numerology`
- **Target Audience:** Seekers seeking phonosemantic name optimization, numerological harmony, or baby naming.
- **Section Layout:**
  - Page 1: Cover & Numerological Vibration Summary.
  - Page 2: Psychic (Moolank) & Destiny (Bhagyank) Foundational Matrix.
  - Pages 3–17: 15 Exhaustive Chapters:
    1. Numerological Executive Synthesis.
    2. Moolank (Psychic Number) Deep Dive.
    3. Bhagyank (Destiny Number) Life Path Analysis.
    4. Chaldean Letter-by-Letter Acoustic Matrix.
    5. Pythagorean Vibration Comparative Framework.
    6. Occult Double-Digit Compound Numbers (Cheiro System).
    7. Planetary Harmony & Friendly Numbers Matrix.
    8. Mathematical Harmony Score & Weighting Formula.
    9. **5 Personalized Name Correction Alternatives** with computed harmony scores and phonosemantic assessments.
    10. Birth Nakshatra Syllable Synthesis (Vedic Aksharas).
    11. Signature Graphology Blueprint (Ascending angle, grounding dots, underline).
    12. Business Name & Mobile Number Harmonic Optimization.
    13. Shastric Gemstones, Auspicious Colors & Weekdays.
    14. Practical Name Adoption & Ethical Non-Legal Guidance.
    15. Verification Appendix & Cryptographic Checksum.
  - Page 18: Ethical Disclaimer & Numerological Provenance.

### 3.10. `report_remedial_gemstones`
- **Target Audience:** Individuals experiencing planetary obstacles seeking authentic Shastric mitigation.
- **Section Layout:**
  - Page 1: Cover & Constitutional Astrological Dignities.
  - Page 2: Natal D1 Chart & Planetary Equilibrium ephemeris.
  - Pages 3–9: Thematic Chapters:
    1. Constitutional Vulnerabilities & Functional Benefics vs Malefics.
    2. **Lagna-Safe Gemstone Prescriptions & Strict Contraindications** (Warning against wearing gems for Maraka/Dusthana lords).
    3. Devanagari Beej Mantras with 108 Japa Rosary Protocols.
    4. Sacred Yantras & Geometric Altar Consecration.
    5. Sattvic Daana (Charity) Timing, Deities & Protocols.
    6. Circadian Vrata & Lifestyle Disciplines.
    7. Classical Parashari Purushartha Integration & Contemplative Notice.
  - Page 10: Ephemeris Provenance & Publication Verification.
