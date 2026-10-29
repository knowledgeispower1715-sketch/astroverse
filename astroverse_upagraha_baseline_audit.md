# AstroVerse Upagraha & Kalavela Baseline Engineering Audit
**Date**: October 29, 2026
**Auditor**: Principal Vedic Astrology Systems Architect & Staff Full-Stack Verification Lead
**Scope**: 11 Non-Luminous Upagrahas & Kalavelas (5 Sun-Derived, 6 Time-Based), Parashari Invariants, UI Workspace, PDF Reporting, and Test Matrices.

---

## 1. Classical Jyotish Authority & Mathematical Formulations

Per *Brihat Parashara Hora Shastra* (BPHS) Chapter 3 (*Aprakasha Graha Adhyaya*), eleven non-luminous secondary points (*Upagrahas* and *Kalavelas*) are evaluated to identify subtle karmic pressures and temporal friction:

### 1.1 Five Sun-Derived Upagrahas (Surya-Janya Aprakasha Grahas)

1. **Dhuma (धूम)**:
   $$\text{Dhuma} = (\text{Sun Longitude} + 133^\circ20') \bmod 360^\circ$$
   *Signification*: First offspring of Mars; denotes mental heat, turbulent starts, and relentless ambition requiring patient cultivation.

2. **Vyatipaata (व्यतीपात)**:
   $$\text{Vyatipaata} = (360^\circ - \text{Dhuma}) \bmod 360^\circ$$
   *Signification*: Mirror-image calamity point; signifies structural shocks and karmic reversals that demand ethical rectitude.

3. **Parivesha / Paridhi (परिवेष)**:
   $$\text{Parivesha} = (\text{Vyatipaata} + 180^\circ) \bmod 360^\circ$$
   *Signification*: Luminous halo around Sun/Moon; marks internal boundaries, psychic vulnerability, and spiritual protective fences.

4. **Indrachaapa / Kodhika (इंद्रचाप)**:
   $$\text{Indrachaapa} = (360^\circ - \text{Parivesha}) \bmod 360^\circ$$
   *Signification*: Cosmic rainbow; symbolizes dazzling but fleeting worldly allure, status illusions, and creative idealism.

5. **Upaketu / Sikhi (उपकेतु)**:
   $$\text{Upaketu} = (\text{Indrachaapa} + 16^\circ40') \bmod 360^\circ$$
   *Signification*: Tail of smoke / celestial comet; marks points of sudden detachment, spiritual renunciation, and ego dissolution.

### 1.2 Mathematical Invariants & Structural Proofs

#### Theorem 1: The Cyclic Closure Invariant
For any arbitrary Sun longitude $\lambda_{\odot} \in [0^\circ, 360^\circ)$:
$$(\text{Upaketu} + 30^\circ) \bmod 360^\circ \equiv \lambda_{\odot}$$

*Proof*:
1. $\text{Dhuma} = \lambda_{\odot} + 133^\circ 20'$
2. $\text{Vyatipaata} = 360^\circ - (\lambda_{\odot} + 133^\circ 20') = 226^\circ 40' - \lambda_{\odot}$
3. $\text{Parivesha} = (226^\circ 40' - \lambda_{\odot}) + 180^\circ = 406^\circ 40' - \lambda_{\odot} \equiv 46^\circ 40' - \lambda_{\odot}$
4. $\text{Indrachaapa} = 360^\circ - (46^\circ 40' - \lambda_{\odot}) = 313^\circ 20' + \lambda_{\odot}$
5. $\text{Upaketu} = (313^\circ 20' + \lambda_{\odot}) + 16^\circ 40' = 330^\circ 00' + \lambda_{\odot}$
6. $\text{Upaketu} + 30^\circ = (330^\circ 00' + \lambda_{\odot}) + 30^\circ = 360^\circ 00' + \lambda_{\odot} \equiv \lambda_{\odot} \pmod{360^\circ}$. $\blacksquare$

#### Theorem 2: Classical Polar Oppositions
1. **Dhuma & Indrachaapa Opposition**:
   $$\text{Indrachaapa} = \lambda_{\odot} + 313^\circ 20' = (\lambda_{\odot} + 133^\circ 20') + 180^\circ = \text{Dhuma} + 180^\circ$$
   *Conclusion*: Dhuma and Indrachaapa always form an exact $180^\circ$ opposition (Saptama drishti).
2. **Vyatipaata & Parivesha Opposition**:
   By explicit definition: $\text{Parivesha} = (\text{Vyatipaata} + 180^\circ) \bmod 360^\circ$.
   *Conclusion*: Vyatipaata and Parivesha are in mutual exact opposition.

---

## 2. Six Time-Based Kalavelas (Kala-Janya Upagrahas)

Per BPHS 3.61-73, daytime and nighttime are divided into 8 equal portions (*Khandas*):
- **Daytime**: Sunrise to Sunset / 8 ($1.5$ hours under standard 12-hour day).
- **Nighttime**: Sunset to Sunrise / 8 ($1.5$ hours under standard 12-hour night).
- **Day Sequence**: Begins with the Weekday Lord (Sun $\rightarrow$ Moon $\rightarrow$ Mars $\rightarrow$ Mercury $\rightarrow$ Jupiter $\rightarrow$ Venus $\rightarrow$ Saturn).
- **Night Sequence**: Begins with the 5th lord from the Weekday Lord.
- The 8th portion has no planetary lord (*Niradhipati*).

### Upagraha Assignment:
- **Kaala (काल)**: Ascendant at Sun's portion midpoint.
- **Mrityu (मृत्यु)**: Ascendant at Mars's portion midpoint.
- **Arthaprahaara (अर्धप्रहर)**: Ascendant at Mercury's portion midpoint.
- **Yamaghantaka (यमघंटक)**: Ascendant at Jupiter's portion midpoint.
- **Gulika (गुलिक)**: Ascendant at Saturn's portion midpoint ($0.5$).
- **Maandi (मांदि)**: Ascendant at Saturn's portion beginning ($0.0$).

---

## 3. Current Baseline Implementation Status

1. **`index.html`**:
   - `calculateClientUpagrahas(sunTotalDeg, lagnaTotalDeg, dobStr, tobStr, lat, lon)` implements the 11 points and returns `all_upagrahas`.
   - `formatZodiacPosition(deg)` normalizes $29.999^\circ$ to $0.00^\circ$ of next sign.
   - `#tbody-upagrahas-workspace` displays a 5-column table.
2. **Automated Verification Suites Passing (Baseline)**:
   - `services/kundli-engine/tests`: 120 passed, 2 skipped (100%).
   - `services/wallet-service/tests/`: 19 suites passed (100%).
3. **Identified Gaps to Complete**:
   - **Gap 1: Summary-First Executive Synthesis**: `#tab-upagrahas` currently jumps directly into the tabular grid without the required educational context ("What was calculated?", "Key findings", "What this means", "Satvik practical reflections").
   - **Gap 2: Responsive Stacked Cards**: On mobile screens ($< 768\text{px}$), the 5-column table causes horizontal text wrapping. A responsive card-based layout with interactive technical calculation drawers is required.
   - **Gap 3: Bilingual Devanagari Terminology**: Hindi mode must include classical names (धूम, व्यतीपात, परिवेष, इंद्रचाप, उपकेतु, काल, मृत्यु, अर्धप्रहर, यमघंटक, गुलिक, मांदि).
   - **Gap 4: Complete Kundli PDF Chapter**: A dedicated Upagrahas & Kalavelas section (`sec_ch7_upagrahas`) with tabular and interpretive depth must be rendered in `reportGenerator.ts` and `index.html`.

---
