# ASTROVERSE PARASHARI INTERPRETATION RULES & FUNCTIONAL DIGNITIES

**Canonical Standard:** Brihat Parashara Hora Shastra (BPHS) & Phaladeepika  
**Ephemeris Mode:** Sidereal Lahiri / Chitra Paksha  
**Implementation Source:** `services/kundli-engine/personalization_engine.py`  

---

## 1. Functional Dignities Across All 12 Ascendants (Lagnas)

In Parashari astrology, natural benefics (Jupiter, Venus) or malefics (Saturn, Mars) change functional status based on the houses they rule from the Ascendant (Kendra, Trikona, Dusthana, Trishadaya, or Maraka).

| Ascendant (Lagna) | Lagna Lord | Yogakaraka (Kendra + Trikona) | Functional Benefics | Functional Malefics | Marakas (2, 7) |
|---|---|---|---|---|---|
| **Aries (Mesha)** | Mars | None | Mars, Sun, Jupiter | Mercury, Venus, Saturn | Venus, Mercury |
| **Taurus (Vrishabha)** | Venus | **Saturn** (Rules 4, 5) | Saturn, Mercury, Venus | Jupiter, Moon, Mars | Mars, Jupiter |
| **Gemini (Mithuna)** | Mercury | None | Venus, Mercury | Mars, Sun, Jupiter | Jupiter, Mars |
| **Cancer (Karka)** | Moon | **Mars** (Rules 5, 10) | Mars, Jupiter, Moon | Mercury, Venus, Saturn | Saturn, Venus |
| **Leo (Simha)** | Sun | **Mars** (Rules 4, 9) | Mars, Jupiter, Sun | Saturn, Venus, Mercury | Saturn, Venus |
| **Virgo (Kanya)** | Mercury | None | Venus, Mercury | Mars, Jupiter, Moon | Mars, Jupiter |
| **Libra (Tula)** | Venus | **Saturn** (Rules 4, 5) | Saturn, Mercury, Venus | Jupiter, Sun, Mars | Mars, Jupiter |
| **Scorpio (Vrischika)** | Mars | None | Jupiter, Sun, Moon | Mercury, Venus, Saturn | Venus, Mercury |
| **Sagittarius (Dhanu)** | Jupiter | None | Sun, Mars, Jupiter | Venus, Mercury, Saturn | Venus, Saturn |
| **Capricorn (Makara)** | Saturn | **Venus** (Rules 5, 10) | Venus, Mercury, Saturn | Mars, Jupiter, Moon | Mars, Jupiter |
| **Aquarius (Kumbha)** | Saturn | **Venus** (Rules 4, 9) | Venus, Saturn, Mercury | Jupiter, Moon, Mars | Mars, Jupiter |
| **Pisces (Meena)** | Jupiter | None | Moon, Mars, Jupiter | Sun, Venus, Mercury, Saturn | Mercury, Venus |

---

## 2. Tara Bala (Navatara) Calculation Matrix

Tara Bala is evaluated from the natal Moon Nakshatra (index $N_{natal} \in 0..26$) to the transit Moon Nakshatra ($N_{transit} \in 0..26$):

$$\Delta N = (N_{transit} - N_{natal} + 27) \pmod{27}$$
$$\text{Tara Number} = (\Delta N \pmod{9}) + 1$$

| Tara # | Sanskrit Name | Auspiciousness | Classical Meaning | Engine Interpretation |
|---|---|---|---|---|
| 1 | **Janma** | Challenging / Poise | Identity, physical stamina, raw focus | Direct focus, avoid overexertion |
| 2 | **Sampat** | Highly Auspicious | Wealth, liquid gains, resource acquisition | Commercial negotiations, closing deals |
| 3 | **Vipat** | Challenging / Guarded | Obstacles, unforeseen friction, hazards | Avoid unvetted speculative proposals |
| 4 | **Kshema** | Highly Auspicious | Well-being, security, domestic comfort | Steady productivity, long-term foundation |
| 5 | **Pratyak** | Challenging / Friction | Opposition, disputes, conflicting interests| Patient listening, defer confrontation |
| 6 | **Sadhana** | Highly Auspicious | Accomplishment, spiritual/practical success| High-leverage execution, strategic breakthroughs |
| 7 | **Naidhana** | Challenging / Protective | Vulnerability, severe change, exhaustion | Restorative recovery, avoid major risks |
| 8 | **Mitra** | Highly Auspicious | Companionship, alliance, friendly assistance| Collaborative consensus, networking |
| 9 | **Parama Mitra** | Highly Auspicious | Supreme ally, highest mentorship, providential| Executive sponsorship, visionary planning |

---

## 3. Chandra Bala (Lunar Distance from Natal Moon)

Evaluated as:
$$H_{moon} = ((S_{transit} - S_{natal\_moon} + 12) \pmod{12}) + 1$$

- **Highly Favorable:** Houses 1, 3, 6, 7, 10, 11
- **Neutral / Moderate:** Houses 2, 5, 9
- **Vulnerable / Cautionary:** Houses 4, 8, 12
  - **House 8 = Chandrashtama:** Mental unrest, heightened vulnerability to rash actions; calls for devotional remedies (Shiva / Chandra mantra) and deferring speculative risks.

---

## 4. Vimshottari Dasha-Antardasha Sambandha (Mutual Relationship)

Evaluated as the mutual distance between the Mahadasha Lord's sign and the Antardasha Lord's sign in the natal D1 chart:

| House Distance | Classical Category | Favorable? | Operational Guidance |
|---|---|---|---|
| **5 / 9** | **Navapanchama** (Trine) | Auspicious | Creative synergy, fortunate ease, high collaborative achievement. |
| **3 / 11** | **Labhabhava** (Growth) | Auspicious | Commercial compounding, enterprise, communication momentum. |
| **1 / 7** | **Kendra Alignment** | Auspicious | Direct executive accountability, partnerships, visible milestones. |
| **1 / 1** | **Conjunction** | Auspicious | Unified drive, focused energetic intensity. |
| **6 / 8** | **Shadashthaka** (Friction) | Challenging | Unforeseen delays, health sensitivity, administrative bottlenecks. |
| **2 / 12** | **Dwidwadasha** (Expenditure)| Guarded | Resource reallocation, relocations, managing outflows. |
