# Professional Chart Visualization & Astrological Summary

**Project**: Astroverse  
**Module**: North Indian Diamond Chart (SVG), Divisional Vargas, and Diagnostic Summaries  
**Supported Charts**: D1 (Rashi), D9 (Navamsha), D10 (Dashamsha), Moon Chart (Chandra Lagna), Bhava Chalit  
**Audit Scope**: SVG Coordinate Fidelity, Subchart Switching, and Diagnostic Badges  

---

## 1. Classical North Indian Diamond Chart (Kundli) Architecture

The Astroverse chart visualization renders the authoritative North Indian Diamond Kundli format via a lightweight, scalable SVG canvas. In this format:
* The 12 houses remain spatially fixed.
* House 1 (Lagna / Ascendant) sits permanently at the top-center diamond.
* Houses 1, 4, 7, and 10 form the central Kendra diamonds.
* The remaining houses (2, 3, 5, 6, 8, 9, 11, 12) surround the Kendras as triangles.
* House numbering rotates counter-clockwise based on the calculated Lagna Rashi index ($1 = \text{Aries}, \dots, 12 = \text{Pisces}$).

```
                     / \
                    / H1\
                   /     \
             /----/       \----\
            / H12 \  (Top) / H2 \
           /       \      /      \
          /---------\----/--------\
         / \       / \  / \      / \
        /   \ H11 /   \/   \ H3 /   \
       / H10 \   / H4  /\ H7\  / H4  \
      /       \ /     /  \   \/       \
      \       / \    /    \  /\       /
       \  H9 /   \  /  H8  \/  \  H5 /
        \   /     \/       /    \   /
         \ /       \      /      \ /
          \---------\----/--------/
           \       /      \      /
            \ H8  / (Bottom\ H6 /
             \---/    H7    \---/
                  \        /
                   \      /
                    \    /
                     \  /
```

### 1.1 Dynamic SVG House Binding
Each house contains two dynamic SVG text elements:
1. `svg-h{1..12}-sign`: Binds the calculated zodiac sign number for that house.
   $$\text{Sign Number} = ((\text{LagnaIndex} + (H - 1)) \pmod{12}) + 1$$
2. `svg-h{1..12}-planets`: Binds standard two-letter Graha abbreviations (`Su`, `Mo`, `Ma`, `Me`, `Ju`, `Ve`, `Sa`, `Ra`, `Ke`) occupying that house.

---

## 2. Multi-Divisional Varga Support

The user interface provides instant, client-rendered switching across the core divisional charts without page reload:

```mermaid
flowchart TD
    User([User Clicks Subtab]) --> Switch[switchKundliSubChart(type)]
    Switch --> Check{Chart Type}
    Check -->|D1| R1[Render D1 Rashi Chart]
    Check -->|D9| R2[Render D9 Navamsha Chart]
    Check -->|D10| R3[Render D10 Dashamsha Chart]
    Check -->|Moon| R4[Render Chandra Lagna Chart]
    Check -->|Chalit| R5[Render Bhava Chalit Chart]
    R1 --> Draw[renderDiamondChart: Updates SVG Sign Numbers & Planet Occupancy]
    R2 --> Draw
    R3 --> Draw
    R4 --> Draw
    R5 --> Draw
```

### 2.1 Divisional Chart Mathematical Derivations

#### 1. D1 Rashi Chart
* **Purpose**: Primary physical reality, physical body, constitution, and core life circumstances.
* **Derivation**: Direct sidereal longitudes of planets and Ascendant.

#### 2. D9 Navamsha Chart
* **Purpose**: Dharma, spouse, inner potential, soul purpose, and fruits of second half of life.
* **Derivation**: Each 30° sign is divided into 9 segments of $3^\circ 20'$ ($3.3333^\circ$).
  $$\text{Navamsha Sign Index} = \lfloor \lambda_{\text{total}} / 3.33333^\circ \rfloor \pmod{12}$$
  $$\text{D9 House} = ((\text{Navamsha Sign} - \text{D9 Lagna Sign} + 12) \pmod{12}) + 1$$

#### 3. D10 Dashamsha Chart
* **Purpose**: Career, executive authority, societal status, and professional legacy.
* **Derivation**: Each 30° sign is divided into 10 segments of $3^\circ 00'$.
  For odd signs ($1, 3, 5, 7, 9, 11$), counting starts from the sign itself; for even signs ($2, 4, 6, 8, 10, 12$), counting starts from the 9th sign from it.

#### 4. Moon Chart (Chandra Kundli)
* **Purpose**: Emotional mind, subconscious inclinations, mental perceptions, and psycho-somatic health.
* **Derivation**: Rotates the D1 chart such that the Moon sign becomes House 1:
  $$\text{Moon House} = ((\text{PlanetSign} - \text{MoonSign} + 12) \pmod{12}) + 1$$

#### 5. Bhava Chalit Chart
* **Purpose**: Actual planetary house placement based on unequal house cusp midpoints (Sripati / Porphyry), reflecting planets that have shifted into adjacent houses despite remaining in the same sign.

---

## 3. Executive Astrological Summary Cards

The summary section presents verified astrological facts in high-contrast cards:

### 3.1 Primary Attribute Badges
* **Lagna**: Displayed with sign and degree (e.g. `Scorpio (24.2°)`). If birth time is unknown, clearly marked as `Indeterminate (Surya Lagna)`.
* **Moon Sign**: Displayed with sign and degree (e.g. `Aquarius (12.2°)`).
* **Nakshatra**: Displayed with Pada and Lord (e.g. `Shatabhisha (2) • Lord: Rahu`).
* **Sun Sign**: Displayed with sign and degree (e.g. `Leo (3.5°)`).

### 3.2 Planetary Position Table
Includes all 9 Grahas with:
1. **Graha Name**: Classical Sanskrit / English naming.
2. **Sign**: Sidereal sign placement.
3. **Degree**: Precise degree and minute.
4. **House**: Occupied house number ($1 \dots 12$).
5. **Nakshatra & Pada**: Nakshatra name and 1–4 quarter.
6. **Chara Karakas**: Jaimini karaka assignments based on descending planetary degrees (Atmakaraka, Amatyakaraka, Bhratrikaraka, Matrikaraka, Pitrikaraka, Gnatikaraka, Darakaraka).

### 3.3 Vimshottari Dasha Visualizer
* Displays current Mahadasha and Antardasha.
* Start Date and End Date dynamically calculated against current date.
* Progress bar showing completion percentage of the active Antardasha.
* Guarantees that expired dashas (e.g. ending in 2026-09-22) are never shown as active in October 2026.

### 3.4 Classical Dosha Diagnostics
* **Manglik (Kuja Dosha)**: Evaluates Mars in houses 1, 4, 7, 8, 12 from Lagna, Moon, and Venus, with verified classical cancellation clauses (e.g. Mars in own sign, Jupiter aspect, favorable placement).
* **Kaal Sarp Dosha**: Analyzes whether all 7 planets are hemmed between the Rahu-Ketu nodal axis.
* **Shani Sade Sati**: Evaluates transiting Saturn in Pisces relative to natal Moon sign, identifying Phase 1 (Rising, 12th from Moon), Phase 2 (Peak, 1st from Moon), or Phase 3 (Setting, 2nd from Moon).
