---
name: parashari-jyotish-reasoning
description: Apply classical Maharishi Parashara Vedic astrology (Brihat Parashara Hora Shastra) methodology across natal charts, divisional charts, planetary dignities, dashas, and life domains.
---

# parashari-jyotish-reasoning

## 1. Purpose

Codify authentic, classical Parashari Jyotish principles (Brihat Parashara Hora Shastra, Phaladeepika, Saravali) for astrological reasoning in AstroVerse. Ensure consistent, rigorous interpretation of natal (D1), divisional (D9, D10), house lords, yogas, doshas, and Vimshottari dasha periods without fabricating Sanskrit verses, unsupported doctrines, or mixing incompatible systems silently.

## 2. When to Use

- Analyzing a seeker's birth chart for specific life queries (Marriage, Career, Wealth, Education, Health, Children, Property, Foreign Travel, Spiritual Path, Litigation).
- Evaluating planetary strengths (Uchcha/Neecha, Moolatrikona, Swakshetra, Mitra/Shatru kshetra, combustion, retrograde status).
- Assessing functional benefics and malefics based on the specific Lagna (Ascendant).
- Analyzing planetary aspects (Drishti): general 7th aspect, special aspects of Mars (4th, 8th), Jupiter (5th, 9th), and Saturn (3rd, 10th).
- Evaluating classical yogas (Raja Yoga, Dhana Yoga, Gajakesari, Pancha Mahapurusha) and doshas (Manglik, Kemadruma, Guru Chandal).
- Synthesizing D1 Rashi positions with D9 Navamsha confirmation and Vimshottari Mahadasha/Antardasha timing.

## 3. Scope

- **Divisional Charts**:
  - D1 (Rashi): Physical reality, broad life manifestation, lagna and all 12 houses.
  - D9 (Navamsha): Dharma, inner potential, marriage, spouse qualities, planetary strength confirmation (Vargottama).
  - D10 (Dashamsha): Profession, executive power, public achievements, career milestones.
- **House Lordship Dynamics**:
  - Kendras (1, 4, 7, 10): Pillars of action and vitality (Vishnu sthanas).
  - Trikonas (1, 5, 9): Houses of grace, fortune, and merit (Lakshmi sthanas).
  - Upachayas (3, 6, 10, 11): Houses of growth, effort, and progressive improvement.
  - Dusthanas / Trik Bhavas (6, 8, 12): Houses of obstacles, transformation, debt, illness, and release.
  - Marakas (2, 7): Transition and physical vulnerability markers.
- **Epistemological Distinction**:
  - _Calculated Chart Fact_: Raw planetary longitude, rashi, nakshatra, house placement, current dasha.
  - _Classical Rule_: Shloka or principle directly cited from Parashara/Phaladeepika.
  - _Interpretive Judgement_: Astrological synthesis contextualizing ancient rules to contemporary life.
  - _Modern Explanation_: Accessible vernacular translation for the seeker's practical decision-making.

## 4. Required Inputs

- Calculated birth chart JSON from `swiss-ephemeris-integration`:
  - Ascendant (Lagna) degree and rashi.
  - Longitudes, nakshatras, padas, dignities, and houses for all 9 grahas (Surya, Chandra, Mangala, Budha, Guru, Shukra, Shani, Rahu, Ketu).
  - Current active Vimshottari Mahadasha, Antardasha, and Pratyantardasha.
  - Key divisional placements (D9 Navamsha signs, D10 Dashamsha signs).
- Seeker's core life domain query.

## 5. Technical Workflow

```mermaid
flowchart TD
    A[Calculated Chart JSON] --> B[Identify Lagna & Functional Benefics/Malefics]
    B --> C[Locate Relevant Domain House & Karaka]
    C --> D[Assess House Lord Placement & Dignity]
    D --> E[Examine Aspectual Influences (Drishti)]
    E --> F[Check D9 Navamsha Confirmation]
    F --> G[Cross-Reference Active Vimshottari Dasha Lords]
    G --> H[Check Major Yogas and Potential Cancellations]
    H --> I[Synthesize Classical Parashari Judgement]
    I --> J[Translate into Empathetic Modern Guidance]
```

1. **Lagna Analysis**: Determine the Ascendant sign and identify Yogakarakas, functional benefics, and functional malefics for that specific rising sign:
   - _Example_: For Taurus Lagna, Saturn is Yogakaraka (lord of 9th and 10th); Jupiter is a functional malefic (lord of 8th and 11th).
2. **Domain Mapping**:
   - _Marriage / Relationships_: 7th house, 7th lord, Shukra (for men) / Guru (for women), D9 Navamsha 7th house and Venus.
   - _Career / Status_: 10th house, 10th lord, Surya, Budha, Saturn, D10 Dashamsha 10th house.
   - _Wealth / Finance_: 2nd house (accumulated wealth), 11th house (gains/income), 5th and 9th lords (Lakshmi yogas), Guru.
   - _Education_: 4th house (foundational education), 5th house (intelligence/higher learning), Budha, Guru.
   - _Health / Vitality_: 1st house/lord, 6th house (ailments), 8th house (longevity), Surya (vital force), Chandra (mind).
3. **Dasha Synthesis**: Check if the current Mahadasha or Antardasha lord connects to the domain house or house lord. Parashara states that life events crystallize during the periods of planets connected to the respective bhavas.
4. **Cancellations & Nuance**: Before declaring an affliction, always evaluate Neecha Bhanga (cancellation of debility), benefic aspects, or friendly dispositors that mitigate negative yogas.

## 6. Domain-Specific Rules

- **No System Blending**: Strictly maintain Parashari principles. Do not silently inject Jaimini Chara Karakas or KP sub-lords unless explicitly requested by the user.
- **Authentic Scripture Grounding**: Only cite genuine concepts from established Parashari texts. Never invent non-existent Sanskrit verses or attribute modern ideas to ancient rishis.
- **Empathetic Demystification**: Translate classical terminology into supportive psychological insight:
  - Explain _Sade Sati_ as a period of profound restructuring, discipline, and maturity, rather than pure destruction.
  - Explain _Manglik Dosha_ as high energy, courage, and need for equal passion/transparency in partnership, noting standard cancellations (Mars in own sign, Jupiter's aspect, age maturity past 28).

## 7. Integration Requirements

- Core reasoning engine in `services/wallet-service/src/server.ts` across all 12 domain evaluation blocks.
- Synchronized with client-side fallback `generateClientAstrologicalResponse` in `index.html`.
- Tested against `services/wallet-service/tests/ai_astrologer_acceptance_suite.test.ts`.

## 8. Failure Handling

- **Weak or Conflicting Planetary Signals**: When chart indicators are mixed (e.g., strong house lord but afflicted by Saturn's aspect), provide balanced counsel: highlight initial delays followed by enduring stability through patient effort.
- **Missing Birth Time**: If birth time is uncertain, evaluate Chandra Lagna (Moon chart) as an authoritative secondary reference while transparently notifying the seeker.

## 9. Security Considerations

- Keep Jyotish calculations deterministic and tamper-proof.
- Do not store raw birth data in unencrypted client caches.

## 10. Testing Methodology

- Test suite asserting correct functional benefic/malefic assignments for all 12 Lagnas.
- Test asserting correct Vimshottari dasha lord correlations with house rulership.
- Evaluation against the 12 domain test cases in `services/wallet-service/tests/ai_astrologer_acceptance_suite.test.ts`.

## 11. Acceptance Checklist

- [ ] D1, D9, and D10 charts are correctly utilized for their classical purposes.
- [ ] Functional benefics and malefics match the calculated Lagna.
- [ ] Yogas and doshas are verified against classical definitions before proclamation.
- [ ] Cancellations (Neecha Bhanga, Manglik cancellations) are evaluated.
- [ ] Distinguishes calculated facts, classical rules, and modern interpretations clearly.

## 12. Clear Prohibited Behaviours

- NEVER invent fictitious Sanskrit shlokas or non-existent planetary yogas.
- NEVER present a single negative placement in isolation without checking mitigating benefic aspects.
- NEVER mix KP or Western tropical zodiac concepts into sidereal Parashari readings.
- NEVER claim an unalterable curse (Shrapit) that can only be cured by paying money.

## 13. References to Relevant AstroVerse Architecture

- Backend Jyotish Logic: `services/wallet-service/src/server.ts`
- Client Jyotish Fallback: `index.html` (`generateClientAstrologicalResponse`)
- Related Skills: `swiss-ephemeris-integration`, `conversational-ai-engineering`, `astrology-remedies-knowledge-base`.
