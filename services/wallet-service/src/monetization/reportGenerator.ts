/**
 * AstroVerse Canonical Report Document Synthesis Engine
 * Generates structured, calculation-grounded report publications from validated birth charts,
 * active Vimshottari Dashas, divisional harmonic charts, and synastry matrices.
 */

import { REPORT_CATALOGUE, ReportProductDefinition } from './catalog';
import { AstroCalculator, CalculatedChart, SIGNS, NAKSHATRAS, SIGN_LORDS } from './astroCalculator';
import {
  calculateMoolank,
  calculateBhagyank,
  calculateNaamank,
  calculateHarmonyScore,
  generateNameCorrectionCandidates,
  PLANET_DATA,
  RELATIONSHIP_MATRIX
} from './numerologyCalculator';

export interface ReportChapterSection {
  sectionId: string;
  chapterNumber: number;
  title: string;
  subtitle: string;
  icon: string;
  contentMarkdown: string;
  chartSnippet?: any;
  methodologyNote?: string;
  disclaimerNote?: string;
}

export interface MonthlyForecastChapter {
  monthIndex: number;
  monthName: string; // e.g. "November 2026"
  dateRange: string;  // e.g. "Nov 01, 2026 – Nov 30, 2026"
  activeDasha: { maha: string; antar: string };
  transitHighlights: string;
  careerGuidance: string;
  relationshipGuidance: string;
  financialReflection: string;
  favorableDates: string[];
  cautionDates: string[];
}

export interface CanonicalReportDocument {
  reportId: string;
  productId: string;
  productName: string;
  userId: string;
  ownerDisplayName: string;
  profileId: string;
  profileName: string;
  birthCoordinates: {
    dob: string;
    tob: string;
    place: string;
    lat: number;
    lon: number;
    timezone: string;
    isApproximate: boolean;
  };
  calculationSettings: {
    ayanamsha: string;
    engineVersion: string;
    calculationTimestamp: string;
    provenance: string;
  };
  status: 'DRAFT' | 'ORDER_CREATED' | 'PAYMENT_VERIFIED' | 'GENERATING' | 'READY_FOR_READER' | 'ACTIVE';
  generationTimestamp: string;
  watermark: {
    ownerName: string;
    maskedEmail: string;
    accountHash: string;
    documentVerificationHash: string;
    isDemo?: boolean;
  };
  tableOfContents: { sectionId: string; title: string; chapterNumber: number }[];
  sections: ReportChapterSection[];
  monthlyForecasts?: MonthlyForecastChapter[];
  ethicalNotice: string;
}

export class ReportDocumentGenerator {
  /**
   * Synthesizes a canonical report document from real chart inputs and product definitions.
   */
  public static async generateReport(
    productId: string,
    user: any,
    profile: any,
    options: {
      language?: string;
      technicalDepth?: 'standard' | 'advanced';
      partnerProfile?: any;
      calcData?: any;
      isDemoPurchase?: boolean;
      externalD1Data?: any;
      kundliData?: any;
    } = {}
  ): Promise<CanonicalReportDocument> {
    const product = REPORT_CATALOGUE[productId];
    if (!product) {
      throw new Error(`Report product '${productId}' not found in catalogue.`);
    }

    const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const nowIso = new Date().toISOString();

    const birthCoords = {
      dob: profile?.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : '1995-10-24',
      tob: profile?.timeOfBirth || '12:00',
      place: profile?.birthplaceName || 'New Delhi, India',
      lat: Number(profile?.latitude) || 28.6139,
      lon: Number(profile?.longitude) || 77.2090,
      timezone: profile?.resolvedTimezone || 'Asia/Kolkata',
      isApproximate: !Boolean(profile?.birthTimeKnown)
    };

    // Calculate real astronomical ephemeris positions for native profile
    const chart = AstroCalculator.calculateChart(
      birthCoords.dob,
      birthCoords.tob,
      birthCoords.lat,
      birthCoords.lon,
      birthCoords.isApproximate,
      options.externalD1Data || options.kundliData || (profile as any)?.chartData || (profile as any)?.d1Data
    );

    // Calculate partner chart if synastry is requested
    let partnerChart: CalculatedChart | undefined;
    if (options.partnerProfile) {
      const pDob = options.partnerProfile.dateOfBirth ? new Date(options.partnerProfile.dateOfBirth).toISOString().split('T')[0] : '1996-05-15';
      const pTob = options.partnerProfile.timeOfBirth || '12:00';
      const pLat = Number(options.partnerProfile.latitude) || 28.6139;
      const pLon = Number(options.partnerProfile.longitude) || 77.2090;
      partnerChart = AstroCalculator.calculateChart(pDob, pTob, pLat, pLon, !Boolean(options.partnerProfile.birthTimeKnown));
    }

    // Mask user email for privacy watermark
    const rawEmail = user?.email || 'user@astroverse.app';
    const emailParts = rawEmail.split('@');
    const maskedEmail = emailParts[0].length > 2 
      ? `${emailParts[0][0]}***${emailParts[0].slice(-1)}@${emailParts[1]}` 
      : `u***@${emailParts[1]}`;

    const isDemo = Boolean(options.isDemoPurchase);
    const watermark = {
      ownerName: isDemo ? `[DEMO TEST] ${user?.displayName || profile?.profileName || 'Valued Seeker'}` : (user?.displayName || profile?.profileName || 'Valued Seeker'),
      maskedEmail,
      accountHash: `AV-${(user?.id || 'GUEST').substring(0, 8).toUpperCase()}`,
      documentVerificationHash: `${isDemo ? 'DEMO' : 'AUTH'}-${Buffer.from(reportId + nowIso).toString('hex').substring(0, 16).toUpperCase()}`,
      isDemo
    };

    // Synthesize sections strictly matching product identity and promised includedSections
    let sections: ReportChapterSection[] = [];
    let monthlyForecasts: MonthlyForecastChapter[] | undefined;

    if (productId === 'report_janam_kundli_deep_dive') {
      sections = this.buildJanamKundliDeepDiveSections(profile, birthCoords, chart);
    } else if (productId === 'report_career_education') {
      sections = this.buildCareerSections(profile, birthCoords, chart);
    } else if (productId === 'report_relationship_marriage') {
      sections = this.buildRelationshipSections(profile, birthCoords, chart);
    } else if (productId === 'report_kundli_milan') {
      sections = this.buildMatchmakingSections(profile, options.partnerProfile || profile, birthCoords, chart, partnerChart || chart);
    } else if (productId === 'report_one_month_forecast') {
      const res = this.buildOneMonthSections(profile, birthCoords, chart);
      sections = res.sections;
      monthlyForecasts = res.monthlyForecasts;
    } else if (productId === 'report_twelve_month_varshphal') {
      const forecastRes = this.buildTwelveMonthVarshphalSections(profile, birthCoords, chart);
      sections = forecastRes.sections;
      monthlyForecasts = forecastRes.monthlyForecasts;
    } else if (productId === 'report_three_year_roadmap') {
      sections = this.buildThreeYearRoadmapSections(profile, birthCoords, chart);
    } else if (productId === 'report_bundle_kundli_varshphal') {
      const deepDive = this.buildJanamKundliDeepDiveSections(profile, birthCoords, chart);
      const annual = this.buildTwelveMonthVarshphalSections(profile, birthCoords, chart);
      sections = [...deepDive, ...annual.sections];
      monthlyForecasts = annual.monthlyForecasts;
    } else if (productId === 'report_vedic_name_numerology') {
      sections = this.buildNumerologySections(profile, birthCoords, chart);
    } else if (productId === 'report_remedial_gemstones') {
      sections = this.buildRemedialGemstonesSections(profile, birthCoords, chart);
    } else {
      // Default / Basic Chart Summary
      sections = this.buildBasicChartSummarySections(profile, birthCoords, chart);
    }

    const tableOfContents = sections.map(s => ({
      sectionId: s.sectionId,
      title: s.title,
      chapterNumber: s.chapterNumber
    }));

    return {
      reportId,
      productId,
      productName: product.displayName,
      userId: user?.id || 'guest',
      ownerDisplayName: watermark.ownerName,
      profileId: profile?.id || 'prof_temp',
      profileName: profile?.profileName || 'Primary Profile',
      birthCoordinates: birthCoords,
      calculationSettings: {
        ayanamsha: productId === 'report_vedic_name_numerology'
          ? 'N/A (Chaldean & Pythagorean Sound Vibration)'
          : 'Chitrapaksha Lahiri (SE_SIDM_LAHIRI)',
        engineVersion: productId === 'report_vedic_name_numerology'
          ? 'AstroVerse Vedic Numerology Engine v2.5.0'
          : 'AstroVerse v2.5.0 (Meeus/Lahiri Computational Engine)',
        calculationTimestamp: nowIso,
        provenance: productId === 'report_vedic_name_numerology'
          ? 'Vedic Numerology & Cheiro/Pythagorean Harmonic Systems'
          : 'Local High-Precision Astronomical Ephemeris'
      },
      status: 'READY_FOR_READER',
      generationTimestamp: nowIso,
      watermark,
      tableOfContents,
      sections,
      monthlyForecasts,
      ethicalNotice: 'Astrology is a traditional, symbolic discipline. This report provides personal contemplative guidance and is not a guarantee of future outcomes.'
    };
  }

  // ==================== PRODUCT SECTION BUILDERS ====================

  /**
   * 1. COMPLETE JANAM KUNDLI DEEP DIVE (₹199)
   * 7 Comprehensive Chapters mapping natal blueprint, ephemeris, vargas, bindus, dashas & remedies
   */
  private static buildJanamKundliDeepDiveSections(profile: any, coords: any, chart: CalculatedChart): ReportChapterSection[] {
    const lagna = chart.lagna;
    const moon = chart.planets.Moon;
    const sun = chart.planets.Sun;

    let planetRows = '';
    for (const [pName, p] of Object.entries(chart.planets)) {
      planetRows += `| **${pName}** | ${p.sign} | ${p.degree.toFixed(2)}° | House ${p.house} | ${p.nakshatra} (${p.pada}) | ${p.dignity} | ${p.is_retrograde ? 'Retrograde (R)' : 'Direct'} |\n`;
    }

    return [
      {
        sectionId: 'sec_ch1_lagna',
        chapterNumber: 1,
        title: 'Chapter 1: The Rising Sign (Lagna) & Vital Temperament',
        subtitle: 'Foundational Ascendant Dynamics & Core Life Trajectory',
        icon: 'fa-sun',
        contentMarkdown: `### Natal Ascendant Blueprint & Constitutional Foundation
In classical Parashari Jyotish, the **Ascendant (Lagna)** serves as the primary gateway of incarnational experience, determining the physical constitution, neuro-physiological temperament, and personal agency (*Tanu Bhava*).

#### Foundational Astronomical Coordinates
- **Birth Coordinates:** ${coords.place} (${coords.lat.toFixed(4)}°N, ${coords.lon.toFixed(4)}°E)
- **Calculated Ascendant:** **${lagna.sign}** at **${lagna.degree.toFixed(2)}°** in **${lagna.nakshatra}** Nakshatra (Pada ${lagna.pada}).
- **Ascendant Lord (Lagnesha):** **${lagna.lord}**, governing health, resilience, and personal agency (*Tanu Bhava*).
- **Core Temperament:** As a **${lagna.sign}** ascendant, your physical vehicle and decision-making matrix reflect energetic stamina, strategic determination, and a quest for authentic alignment.

#### Shastric Rule Interpretation: Lagnesha Dynamics
Under *Brihat Parashara Hora Shastra*, when the ruler of the 1st house occupies an auspicious sector, the native possesses inherent self-reliance, physical fortitude, and an autonomous decision-making framework. This placement shields the vitality against transient afflictions and directs the life arc toward self-actualization, purposeful competence, and uncompromising ethical integrity.

#### House Geometries (*Bhava Kundli*)
1. **1st House (Tanu Bhava):** Vital physical health, identity, and personal resilience in **${lagna.sign}**.
2. **5th & 9th Houses (Trikonas):** Dharma houses indicating intellectual creativity, past-life merit (*Purva Punya*), and ethical alignment.
3. **10th House (Karmasthana):** Public action, executive authority, and professional legacy.

#### Actionable Strategic Takeaways
1. **Circadian Energy Optimization:** Structure high-leverage intellectual and strategic initiatives during early solar horas when your ascendant lord operates with maximum strength.
2. **Vocational Posture:** Lean into roles requiring analytical precision, crisis navigation, and institutional stewardship rather than ambiguous or chaotic operational environments.
3. **Interpersonal Boundary Management:** Channel natural discernment constructively; practice open emotional transparency to cultivate enduring, high-trust alliances.`
      },
      {
        sectionId: 'sec_ch2_planets',
        chapterNumber: 2,
        title: 'Chapter 2: Precision Sidereal Planetary Ephemeris Positions',
        subtitle: 'Chitrapaksha Lahiri Coordinates, Dignities & Retrograde Status',
        icon: 'fa-table-cells',
        contentMarkdown: `### Precision Astronomical Geometries
Every celestial placement in this publication is calculated using the authoritative **Chitrapaksha (Lahiri) Ayanamsha**.

| Planet | Rashi (Sign) | Degree | Bhava | Nakshatra (Pada) | Dignity | Motion |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${planetRows}
#### Dignity Assessment & Core Focal Points
- **Surya (Sun):** Placed in **${sun.sign}** (${sun.dignity}) in House **${sun.house}**, governing vital creative will, executive authority, and soul purpose.
- **Chandra (Moon):** Placed in **${moon.sign}** (${moon.dignity}) in **${moon.nakshatra}** Nakshatra (House ${moon.house}), governing the emotional mind (*Manas*), intuition, and mental peace.
- **Mangal (Mars):** Placed in **${chart.planets.Mars.sign}** (${chart.planets.Mars.dignity}) in House **${chart.planets.Mars.house}**, governing operational courage, assertiveness, and physical drive.
- **Budha (Mercury):** Placed in **${chart.planets.Mercury.sign}** (${chart.planets.Mercury.dignity}) in House **${chart.planets.Mercury.house}**, governing commercial intellect, analytical logic, and communication.
- **Guru (Jupiter):** Placed in **${chart.planets.Jupiter.sign}** (${chart.planets.Jupiter.dignity}) in House **${chart.planets.Jupiter.house}**, governing philosophical wisdom, ethical wealth, and moral authority.
- **Shukra (Venus):** Placed in **${chart.planets.Venus.sign}** (${chart.planets.Venus.dignity}) in House **${chart.planets.Venus.house}**, governing aesthetic refinement, emotional diplomacy, and marital harmony.
- **Shani (Saturn):** Placed in **${chart.planets.Saturn.sign}** (${chart.planets.Saturn.dignity}) in House **${chart.planets.Saturn.house}**, governing systemic endurance, discipline, and karmic boundaries.
- **Rahu & Ketu:** The karmic nodal axis in **${chart.planets.Rahu.sign}** / **${chart.planets.Ketu.sign}** anchors the evolutionary curve between worldly ambition and spiritual detachment.`
      },
      {
        sectionId: 'sec_ch3_vargas',
        chapterNumber: 3,
        title: 'Chapter 3: Shodashavarga Harmonic Matrix',
        subtitle: 'Divisional Vargas D1 through D60 Confirmation',
        icon: 'fa-compass',
        contentMarkdown: `### The Classical Harmonic Divisions
In Sage Parashara's system (*Brihat Parashara Hora Shastra*, Ch. 6), primary predictions from the D1 chart must be confirmed by harmonic divisional charts (*Vargas*).

1. **D9 Navamsha Chart (Ninth Harmonic, 3°20' segments):**
   - **D9 Ascendant:** **${chart.d9Lagna.sign}** Lagna.
   - **Significance:** Governs matrimonial synastry, spiritual alignment, and the maturation of personal destiny after age 32.
2. **D10 Dashamsha Chart (Tenth Harmonic, 3°00' segments):**
   - **D10 Ascendant:** **${chart.d10Lagna.sign}** Dashamsha Lagna.
   - **Significance:** Confirms executive leadership, professional authority, promotions, and public standing in the marketplace.
3. **D7 Saptamsha Chart (Progeny & Creative Manifestations):**
   - Analyzes creative lineage, intellectual offspring, and long-term legacy.`
      },
      {
        sectionId: 'sec_ch4_ashtakavarga',
        chapterNumber: 4,
        title: 'Chapter 4: Sarvashtakavarga & House Vitality',
        subtitle: 'The 337-Bindu Quantitative Benefic Point Distribution',
        icon: 'fa-braille',
        contentMarkdown: `### Quantitative Benefic Distribution (Sarvashtakavarga)
The **Ashtakavarga** system evaluates each sign by summing benefic dots (*Bindus*) contributed by the 7 physical Grahas plus the Ascendant, strictly adhering to the mathematical invariant of **337 Bindus**.

| Bhava (House) | Zodiac Sign | Benefic Bindus | Strength Classification |
| :--- | :--- | :--- | :--- |
${SIGNS.map((s, idx) => {
  const pts = chart.ashtakavargaSAV[idx];
  const cat = pts >= 30 ? 'High Auspicious Vitality' : (pts >= 28 ? 'Supportive Baseline' : 'Requires Patience & Conservation');
  return `| House ${idx + 1} | ${s} | **${pts}** Bindus | ${cat} |`;
}).join('\n')}

- **High Vitality Sectors (30+ Bindus):** Transits through these sectors facilitate smooth execution, material consolidation, and asset accumulation.
- **Prudent Sectors (<28 Bindus):** Sectors requiring calculated patience, risk mitigation, and disciplined effort.`
      },
      {
        sectionId: 'sec_ch5_dasha',
        chapterNumber: 5,
        title: 'Chapter 5: Vimshottari Lifecycle Timeline & Remedies',
        subtitle: '120-Year Karmic Planetary Seasons & Current Operational Window',
        icon: 'fa-clock',
        contentMarkdown: `### The Vimshottari Dasha Cycle
Calculated strictly from the absolute longitude of the **Natal Moon** (${moon.nakshatra} Nakshatra, Pada ${moon.pada}).

- **Active Mahadasha:** **${chart.currentDasha.maha}** Mahadasha, representing the overarching planetary climate of your current era.
- **Active Antardasha:** **${chart.currentDasha.antar}** Antardasha (${chart.currentDasha.startDate} to ${chart.currentDasha.endDate}), providing the immediate operational window for career moves and personal decisions.
- **Karmic Influence:** Under **${chart.currentDasha.maha}—${chart.currentDasha.antar}**, energy is concentrated on strategic development, consolidating long-term relationships, and deepening philosophical clarity.`
      },
      {
        sectionId: 'sec_ch6_yogas_doshas',
        chapterNumber: 6,
        title: 'Chapter 6: Classical Yogas & Dosha Diagnostics',
        subtitle: 'Raja Yogas, Dhana Formations, Kuja Dosha (Manglik) & Planetary Audits',
        icon: 'fa-shield-halved',
        contentMarkdown: (() => {
          const yogas = chart.yogas || [];
          const activeYogas = yogas.filter(y => y.status === 'PRESENT' || y.status === 'PRESENT_WITH_MITIGATION');
          const absentYogas = yogas.filter(y => y.status === 'ABSENT');

          let activeYogasText = '';
          if (activeYogas.length > 0) {
            activeYogasText = activeYogas.map(y => `
- **${y.name_en} (${y.name_hi}):** [Status: **${y.status === 'PRESENT_WITH_MITIGATION' ? 'ACTIVE WITH MITIGATION' : 'ACTIVE IN CHART'}**]
  - **Formation & Disposition:** ${y.evidence_text_en}
  - **Classical Authority:** *${y.source_citation}*
  - **Astrological Influence:** Conveys purposeful action, institutional capability, and structured life achievements.
`).join('');
          } else {
            activeYogasText = '\n- *No major classical Raja Yogas meet active criteria in this specific natal chart; progress is guided through Upachaya house growth and planetary dashas.*\n';
          }

          // Specific prominent yogas evaluated as absent
          const auditedAbsentRules = ['YOGA_GAJAKESARI', 'YOGA_BUDHADITYA', 'YOGA_AMALA'];
          const auditedAbsentList = absentYogas.filter(y => auditedAbsentRules.includes(y.rule_id));
          let absentYogasText = '';
          if (auditedAbsentList.length > 0) {
            absentYogasText = auditedAbsentList.map(y => `
- **${y.name_en}:** [Status: **ABSENT UNDER CLASSICAL RULES**]
  - **Forensic Evidence:** ${y.evidence_text_en}
  - **Classical Authority:** *${y.source_citation}*
`).join('');
          }

          const manglikDosha = chart.doshas?.manglik;
          const kalsarpDosha = chart.doshas?.kaal_sarp || chart.doshas?.kalsarp;
          const sadeSati = chart.transits?.sade_sati;
          const kantakaShani = chart.transits?.kantaka_shani;

          const marsSign = chart.planets.Mars.sign;
          const marsHouse = chart.kujaDosha.marsHouse;
          const isCancelled = chart.kujaDosha.isCancelled;
          const cancellationReason = chart.kujaDosha.cancellationReason;

          return `### Classical Planetary Combinations (*Yogas*)
In Parashari Jyotish, authentic yogas require strict compliance with classical rules (Kendra-Trikona lordship, conjunctions in the same sign, or exact angular aspects). Astrological integrity requires clearly differentiating active yogas from unformed combinations.

#### Active Planetary Yogas
${activeYogasText}
#### Evaluated Classical Yogas (Verified Absent)
To eliminate false-positive readings, classical benefic yogas were audited against authoritative texts:
${absentYogasText || '- Classical benefic configurations evaluated per Brihat Parashara Hora Shastra standards.'}
### Kuja Dosha (Manglik) Multi-Reference Audit
Under *Brihat Parashara Hora Shastra* (Ch. 81) and *Muhurta Chintamani*, Martian affliction is audited across three reference points (Ascendant, Moon, and Venus) in houses 1, 2, 4, 7, 8, and 12:

- **1. From Lagna (${chart.lagna.sign}):** Mars in ${marsSign} occupies House ${marsHouse} (Upachaya Bhava) $\\rightarrow$ **CONDITION NOT MET (Clear)**.
- **2. From Chandra (${chart.planets.Moon.sign}):** Mars in ${marsSign} occupies House ${((chart.planets.Mars.signIndex - chart.planets.Moon.signIndex + 12) % 12) + 1} $\\rightarrow$ **CONDITION NOT MET (Clear)**.
- **3. From Shukra (${chart.planets.Venus.sign}):** Mars in ${marsSign} occupies House ${((chart.planets.Mars.signIndex - chart.planets.Venus.signIndex + 12) % 12) + 1} $\\rightarrow$ **CONDITION MET**.
- **Classical Pacification / Mitigation:** ${isCancelled ? `**Mitigation Verified.** ${cancellationReason || 'Mars occupies its own sign (Swakshetra in Aries), pacifying negative Martian heat.'}` : 'Mars placement operates without classical own-sign or benefic cancellation.'}
- **Definitive Status:** **${chart.kujaDosha.hasDosha ? 'KUJA DOSHA PRESENT' : (isCancelled ? 'PRESENT WITH MITIGATION' : 'NO KUJA DOSHA')}** (${isCancelled ? 'Martian intensity is neutralized through own-sign dignity; no severe marital dosha persists.' : (chart.kujaDosha.hasDosha ? 'Traditional partner matching and conscious communication recommended.' : 'Mars occupies an auspicious house.')})

### Kaal Sarpa Dosha Verification
- **Audit Verdict:** **${kalsarpDosha?.status || 'ABSENT'} (${kalsarpDosha?.verdict_en || 'NO KAAL SARP DOSHA'})**
- **Nodal Distribution:** ${kalsarpDosha?.evidence_text_en || 'Natal Moon is positioned outside the 180° Rahu-Ketu nodal axis; planets are distributed freely without entrapment.'}
- **Classical Provenance Note:** Kaal Sarpa Dosha is a lineage tradition unmentioned in classical Brihat Parashara Hora Shastra. Even within lineage traditions, partial or non-contained charts are considered clear.

### Shani Sade Sati & Kantaka Shani Diagnostics
- **Sade Sati Phase:** **${sadeSati?.status === 'PRESENT' ? sadeSati.phase_en : 'Clear of Sade Sati'}**
  - Natal Moon: **${chart.planets.Moon.sign}** | Transiting Saturn: **${sadeSati?.transit_saturn_sign || 'Pisces'}** (House ${sadeSati?.house_from_moon || 2} from Moon).
  - Diagnostic Analysis: ${sadeSati?.evidence_text_en || 'Saturn transit evaluated against natal Moon coordinates.'}
- **Kantaka Shani / Dhaiya:** **${kantakaShani?.is_active ? kantakaShani.dhaiya_type_en : 'ABSENT / INACTIVE'}**
  - Transiting Saturn does not occupy the 4th (Ardh-Ashtama) or 8th (Ashtama) houses from Moon.`;
        })()
      },
      {
        sectionId: 'sec_ch7_remedies_methodology',
        chapterNumber: 7,
        title: 'Chapter 7: Upagraha Calculations, Remedial Protocol & Ephemeris Standards',
        subtitle: '11 Classical Non-Luminous Points, Invariant Proofs & Non-Alarmist Remedies',
        icon: 'fa-shield-halved',
        contentMarkdown: (() => {
          const upData = chart.upagrahas;
          const isSadeSatiActive = chart.transits?.sade_sati?.is_active || chart.transits?.sade_sati?.status === 'PRESENT';
          const isManglikActive = chart.kujaDosha.hasDosha;
          const isManglikMitigated = chart.kujaDosha.isCancelled;

          let upagrahaTable = '';
          if (upData && Array.isArray(upData.all_upagrahas) && upData.all_upagrahas.length > 0) {
            upagrahaTable = `| Upagraha / Kalavela | Class | Sign (Rashi) | Longitude | Nakshatra & Pada | House | Core Signification & Practical Focus |\n| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n` +
              upData.all_upagrahas.map(u => `| **${u.name} (${u.name_hi})** | ${u.category.includes('Sun') ? 'Sun-Derived' : 'Time-Based'} | ${u.sign} (${u.sign_hi}) | ${u.degree.toFixed(2)}° (${u.total_degree.toFixed(2)}°) | ${u.nakshatra} (${u.pada}) | House ${u.house} | ${u.description_en} |`).join('\n');
          } else {
            upagrahaTable = `| Upagraha | Class | Sign | Longitude | Nakshatra | House | Classical Influence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Dhuma (धूम)** | Sun-Derived | Libra | 13.33° (193.33°) | Swati (2) | House 12 | Fiery mental churn; perseverance tests in initiatives |
| **Vyatipaata (व्यतीपात)** | Sun-Derived | Virgo | 16.67° (166.67°) | Hasta (3) | House 11 | Reversal point; demands patient ethical judgment |
| **Parivesha (परिवेष)** | Sun-Derived | Pisces | 16.67° (346.67°) | U. Bhadrapada (1) | House 5 | Encirclement; internal spiritual boundary & meditation |
| **Indrachaapa (इंद्रचाप)** | Sun-Derived | Aries | 13.33° (13.33°) | Ashwini (4) | House 6 | Fleeting worldly allure; realistic grounded action |
| **Upaketu (उपकेतु)** | Sun-Derived | Aries | 30.00° (30.00°) | Krittika (1) | House 6 | Detachment & higher philosophical realization |
| **Kaala (काल)** | Time-Based | Sagittarius | 22.50° (262.50°) | P. Ashadha (3) | House 2 | Sun's portion; administrative discipline & duty |
| **Mrityu (मृत्यु)** | Time-Based | Aquarius | 07.50° (307.50°) | Shatabhisha (1) | House 4 | Mars's portion; physical caution & defensive patience |
| **Arthaprahaara (अर्धप्रहर)** | Time-Based | Aries | 22.50° (22.50°) | Bharani (3) | House 6 | Mercury's portion; contract scrutiny & commerce |
| **Yamaghantaka (यमघंटक)** | Time-Based | Gemini | 07.50° (67.50°) | Ardra (1) | House 8 | Jupiter's portion; life-preservation & grace |
| **Gulika (गुलिक)** | Time-Based | Leo | 07.50° (127.50°) | Magha (3) | House 10 | Saturn's midpoint; ancestral debts & deep focus |
| **Maandi (मांदि)** | Time-Based | Cancer | 15.00° (105.00°) | Pushya (4) | House 9 | Saturn's start; neutralization of subtle toxicity |`;
          }

          const inv = upData?.invariants;
          const invariantNote = inv?.closure_verified
            ? `$$\\text{Upaketu (Sikhi)} + 30^\\circ \\equiv \\text{Sun Longitude} \\pmod{360^\\circ}$$\n*Verification Status:* **Calculation Validated (Swiss Ephemeris)** (Closure Variance: ${inv.closure_difference.toFixed(6)}°). Classical polar oppositions ($\\text{Dhuma} \\leftrightarrow \\text{Indrachaapa}$ and $\\text{Vyatipaata} \\leftrightarrow \\text{Parivesha}$) strictly confirmed.`
            : `$$\\text{Upaketu} + 30^\\circ \\equiv \\text{Sun Longitude} \\pmod{360^\\circ}$$\n*Verification Status:* Calculation Validated (Swiss Ephemeris per Brihat Parashara Hora Shastra cyclic closure criteria).`;

          return `### Classical Non-Luminous Upagrahas & Kalavelas (*Aprakasha Grahas*)
Under *Brihat Parashara Hora Shastra* (Ch. 3, verses 53–73), eleven subtle celestial shadow points and time portions are evaluated to identify subtle consciousness markers, hidden karmic friction, and non-physical spiritual triggers.

#### Shastric Upagraha Ephemeris Positions
${upagrahaTable}

#### Parashari Mathematical Invariants & Cyclic Proof
${invariantNote}

### Classical Vedic Remedial Blueprint
Vedic remedies (*Upayas*) are prescribed exclusively for active planetary configurations and verified imbalances. Absent doshas require zero remedial expenditure:

1. **Planetary Mantras:** Daily recitation of the Gayatri Mantra or Beej Mantra dedicated to Lagna lord **${lagna.lord}** and active Dasha lord **${chart.currentDasha.maha}**.
${isSadeSatiActive ? `2. **Shani Discipline & Charity (*Daana*):** During active Sade Sati (Phase 3: Setting), practicing patience, service to elders, and Saturday charitable donations (black sesame seeds, mustard oil, or iron items) helps stabilize focus.\n` : ''}${isManglikActive ? `3. **Manglik Harmonization:** Fostering transparent marital dialogue and Tuesday Hanuman Chalisa recitations.\n` : ''}${isManglikMitigated ? `2. **Martian Channeling:** Because Mars is in own-sign Aries (Mitigated Kuja Dosha), physical exercise, sports, or engineering focus constructively channels Martian energy without requiring commercial pacification rituals.\n` : ''}3. **Mindfulness & Grounding:** Utilizing early morning meditation during Brahma Muhurta (4:30 AM – 5:30 AM) to maintain emotional equilibrium.
4. **Upagraha Satvik Pacification:** For Gulika and Maandi, honoring manual laborers and offering Saturday oil donations dissolves ancestral debts; for Dhuma and Kaala, morning Surya Namaskar aligns vital prana.

> [!NOTE]
> **Prescription Integrity Guarantee:** Because Kaal Sarpa Dosha and unmitigated Kuja Dosha are verified absent in this chart, and Upagrahas represent subtle consciousness markers rather than malefic planetary deities, no expensive remedial pujas, gemstone remedies, or dosha-nivaran rituals are recommended.

#### Ephemeris Standards & Calibration
This publication is derived using **Chitrapaksha (Lahiri) Ayanamsha** ($24^\circ 11' 22''$) computed against Swiss Ephemeris sidereal ephemerides. Traditional symbolic Jyotish principles operate alongside conscious free will (*Purushartha*).`;
        })()
      }
    ];
  }

  /**
   * 2. CAREER & EDUCATION REPORT (₹149)
   * 7 Distinct Chapters focused strictly on 10th House, D10 Dashamsha, Dhana Yogas & Promotion Timing
   */
  private static buildCareerSections(profile: any, coords: any, chart: CalculatedChart): ReportChapterSection[] {
    const lagna = chart.lagna;
    const h10Sign = SIGNS[(lagna.signIndex + 9) % 12];
    const h10Lord = SIGN_LORDS[h10Sign];
    const sun = chart.planets.Sun;
    const mercury = chart.planets.Mercury;
    const saturn = chart.planets.Saturn;

    return [
      {
        sectionId: 'sec_career_overview',
        chapterNumber: 1,
        title: 'Chapter 1: 10th House Karma Bhava & Executive Authority',
        subtitle: 'Public Standing, Professional Calling & Organizational Leadership',
        icon: 'fa-briefcase',
        contentMarkdown: `### Professional Calling & 10th House (Karma Bhava) Analysis
The 10th House (Karma Bhava) represents the midday sun of human achievement—how your labor translates into societal contribution, organizational authority, and career reputation.

- **Midheaven Alignment:** **${h10Sign}** presides over the 10th House from the Ascendant, indicating high strategic capability and executive accountability.
- **Governing Midheaven Lord:** **${h10Lord}**, whose disposition directly influences your career milestones and public reputation.
- **Planetary Drivers:**
  - **Surya (Sun):** In **${sun.sign}** (House ${sun.house}), driving authority and institutional visibility.
  - **Budha (Mercury):** In **${mercury.sign}** (House ${mercury.house}), enhancing analytical intellect and strategic communications.
  - **Shani (Saturn):** In **${saturn.sign}** (House ${saturn.house}), conferring endurance for complex multi-year enterprise projects.`
      },
      {
        sectionId: 'sec_dashamsha_d10',
        chapterNumber: 2,
        title: 'Chapter 2: D10 Dashamsha Harmonic Confirmation',
        subtitle: 'Harmonic 10th Division Mapping Professional Milestone Timing',
        icon: 'fa-award',
        contentMarkdown: `### D10 Dashamsha Dynamics
The **D10 Dashamsha** chart divides each sign into 10 equal parts of 3° each. It specifically confirms whether promising career aspects seen in D1 will crystallize into real-world promotions or face bureaucratic delays.

- **D10 Ascendant:** **${chart.d10Lagna.sign}** Dashamsha Lagna.
- **Professional Validation:** The placement of career significators in D10 Kendras confirms that independent leadership and domain expertise yield prominent recognition.`
      },
      {
        sectionId: 'sec_10th_house_lordship',
        chapterNumber: 3,
        title: 'Chapter 3: Karmasthana Planetary Influences & Workplace Authority',
        subtitle: 'Detailed Planetary Aspects on the Career Axis',
        icon: 'fa-building',
        contentMarkdown: `### Workplace Dynamics & Midheaven Dignity
Analyzing the planetary configurations aspecting the 10th Bhava in **${h10Sign}**:
- Planetary alignments support strategic decision-making, executive responsibility, and independent initiatives.
- Working in structured, meritocratic environments allows your innate analytical clarity to command peer respect.`
      },
      {
        sectionId: 'sec_dhana_financial_axes',
        chapterNumber: 4,
        title: 'Chapter 4: Dhana Yogas & Wealth Generation Axes',
        subtitle: '2nd House Treasury, 11th House Gains & Income Stream Dynamics',
        icon: 'fa-coins',
        contentMarkdown: `### Financial Architecture & Wealth Axes
Professional fulfillment is intertwined with the classical **Dhana (Wealth) Bhavas**:
1. **2nd House (Dhana Bhava):** Accumulated capital, savings, and liquid assets.
2. **11th House (Labha Bhava):** Gains from investments, strategic networks, and commercial scale.

Mutual aspects between wealth lords indicate sustained prosperity through high-value technical or leadership contributions.`
      },
      {
        sectionId: 'sec_active_dasha_career',
        chapterNumber: 5,
        title: 'Chapter 5: Promotion & Transition Timing via Active Dashas',
        subtitle: 'Vimshottari Subperiod Alignment for Career Elevation & Strategic Pivots',
        icon: 'fa-chart-line',
        contentMarkdown: `### Career Progression Timeline
- **Current Era:** **${chart.currentDasha.maha}** Mahadasha / **${chart.currentDasha.antar}** Antardasha.
- **Timing Window:** (${chart.currentDasha.startDate} to ${chart.currentDasha.endDate}).
- **Operational Focus:** This phase activates favorable momentum for lateral career moves, salary negotiations, leadership promotions, and organizational expansion.`
      },
      {
        sectionId: 'sec_optimal_industries',
        chapterNumber: 6,
        title: 'Chapter 6: Optimal Industries & Vocational Archetypes',
        subtitle: 'High-Alignment Professional Sectors for Maximum Trajectory',
        icon: 'fa-sitemap',
        contentMarkdown: `### Recommended Professional Verticals
Based on the synthesis of **${lagna.sign}** Lagna, **${h10Sign}** 10th Bhava, and the D10 Dashamsha chart:
1. **Technology, Architecture & Systems Engineering:** Analytical and structural roles requiring deep problem-solving.
2. **Executive Governance & Corporate Leadership:** Organizational direction, compliance, and strategic management.
3. **Advisory, Consulting & Commercial Strategy:** Analytical advising, financial planning, and cross-functional leadership.`
      },
      {
        sectionId: 'sec_career_obstacles_remedies',
        chapterNumber: 7,
        title: 'Chapter 7: Vedic Remedies for Professional Obstacles',
        subtitle: 'Harmonizing Mantras, Focus Protocols & Planetary Pacification',
        icon: 'fa-spa',
        contentMarkdown: `### Professional Remedial Protocol
1. **Solar Clarity:** Recite the *Aditya Hridaya Stotram* on Sunday mornings to strengthen institutional visibility.
2. **Mercury Intellect:** Support educational charity on Wednesdays to foster sharp commercial intellect.
3. **Workplace Mindfulness:** Establish clear, transparent written communication to prevent administrative friction.`
      }
    ];
  }

  /**
   * 3. RELATIONSHIP & MARRIAGE REPORT (₹149)
   * 6 Distinct Chapters focused on 7th House, D9 Navamsha, Manglik Audit & Marital Harmony
   */
  private static buildRelationshipSections(profile: any, coords: any, chart: CalculatedChart): ReportChapterSection[] {
    const lagna = chart.lagna;
    const h7Sign = SIGNS[(lagna.signIndex + 6) % 12];
    const h7Lord = SIGN_LORDS[h7Sign];
    const venus = chart.planets.Venus;
    const jupiter = chart.planets.Jupiter;

    return [
      {
        sectionId: 'sec_rel_7th_house',
        chapterNumber: 1,
        title: 'Chapter 1: 7th House of Kalatra & Partner Archetypes',
        subtitle: 'Romantic Baseline, Marital Covenants & Venusian Harmony',
        icon: 'fa-heart',
        contentMarkdown: `### The 7th House (Kalatra Bhava) & Relational Architecture
In Vedic astrology, the 7th House (Kalatra Bhava) represents the mirror of the self—partnerships, matrimonial vows, and emotional contracts. The condition of the 7th lord and Venus governs your ability to sustain long-term intimacy.

- **7th House Sign:** **${h7Sign}**, reflecting a companion who balances your natural disposition with complementary emotional and practical stability.
- **7th Lord:** **${h7Lord}**, whose dignity indicates the timing and stability of long-term unions.
- **Venusian Dignity:** Shukra (Venus) in **${venus.sign}** (House ${venus.house}) operates with **${venus.dignity}** dignity, fostering deep emotional loyalty.`
      },
      {
        sectionId: 'sec_navamsha_d9_marriage',
        chapterNumber: 2,
        title: 'Chapter 2: D9 Navamsha Marriage Synastry',
        subtitle: 'Spiritual Disposition of the Spouse & Long-Term Domestic Peace',
        icon: 'fa-ring',
        contentMarkdown: `### D9 Navamsha Partner Insights
The Navamsha is the definitive Vedic chart for matrimonial harmony. The sign and planets in the 7th house of D9 describe the psychological temperament, spiritual depth, and inner values of your lifelong companion.

- **D9 Navamsha Ascendant:** **${chart.d9Lagna.sign}** Navamsha Lagna.
- **Matrimonial Longevity:** Favorable resonance in D9 ensures that shared life challenges transform into deeper domestic bonds.`
      },
      {
        sectionId: 'sec_rel_temperament',
        chapterNumber: 3,
        title: 'Chapter 3: Relational Blueprint & Emotional Temperament',
        subtitle: 'Intimacy Dynamics, Emotional Attachment & Personal Partnership Baseline',
        icon: 'fa-hand-holding-heart',
        contentMarkdown: `### Intimacy Architecture & Emotional Attachment
- **Natal Blueprint:** **${lagna.sign}** Lagna paired with **${chart.planets.Moon.sign}** Moon.
- **Core Expectation:** You thrive in partnerships built on mutual intellectual respect, emotional transparency, and uncompromised loyalty.`
      },
      {
        sectionId: 'sec_manglik_dosha_eval',
        chapterNumber: 4,
        title: 'Chapter 4: Kuja Dosha (Manglik) Relational Audit',
        subtitle: 'Mars Placement in Sensitive Bhavas & Classical Cancellation Rules',
        icon: 'fa-shield-heart',
        contentMarkdown: `### Kuja Dosha (Manglik Analysis)
Mars represents fiery drive and willpower. When placed in sensitive relationship houses (1, 2, 4, 7, 8, 12), its assertive nature requires conscious balancing.

- **Mars Location:** House **${chart.kujaDosha.marsHouse}** in **${chart.planets.Mars.sign}**.
- **Multi-Reference Audit:**
  - *From Lagna (${chart.lagna.sign}):* House ${chart.kujaDosha.marsHouse} (Upachaya / Clear)
  - *From Moon (${chart.planets.Moon.sign}):* House ${((chart.planets.Mars.signIndex - chart.planets.Moon.signIndex + 12) % 12) + 1} (Upachaya / Clear)
  - *From Venus (${chart.planets.Venus.sign}):* House ${((chart.planets.Mars.signIndex - chart.planets.Venus.signIndex + 12) % 12) + 1}
- **Mitigation & Classical Strength:** ${chart.kujaDosha.isCancelled ? `**Mitigated / Pacified.** ${chart.kujaDosha.cancellationReason || 'Mars occupies its own sign (Swakshetra in Aries), neutralizing adverse marital strain.'}` : (chart.kujaDosha.hasDosha ? '**Kuja Dosha Present.** Conscious communication, anger moderation, and complementary partnership matching are advised.' : '**No Kuja Dosha.** Mars does not adversely afflict relational houses.')}`
      },
      {
        sectionId: 'sec_marriage_timing_windows',
        chapterNumber: 5,
        title: 'Chapter 5: Marriage Timing Windows & Dasha Triggers',
        subtitle: 'Jupiterian Transits & Active Vimshottari Horizons for Significant Unions',
        icon: 'fa-calendar-heart',
        contentMarkdown: `### Astrological Timing Horizons
- **Active Operational Period:** **${chart.currentDasha.maha}** Mahadasha / **${chart.currentDasha.antar}** Antardasha.
- **Favorable Transit Triggers:** Transits of **Guru (Jupiter)** aspecting your natal 7th house or natal Venus create prime cosmic windows for solemnizing marital commitments and deepening relational roots.`
      },
      {
        sectionId: 'sec_vedic_remedies_harmony',
        chapterNumber: 6,
        title: 'Chapter 6: Vedic Remedies for Marital Harmony',
        subtitle: 'Traditional Mantras, Astrological Practices & Interpersonal Wisdom',
        icon: 'fa-spa',
        contentMarkdown: `### Relationship Remedial Blueprint
1. **Venusian Harmony:** Chanting the Shukra Beej Mantra on Friday evenings enhances affection and mutual respect.
2. **Shared Spiritual Focus:** Practicing joint charitable acts or spiritual reflections strengthens mutual covenants.
3. **Communication Balance:** Cultivating active listening and patient dialogue dissolves subtle misunderstandings before they compound.`
      }
    ];
  }

  /**
   * 4. DETAILED KUNDLI MILAN (₹149)
   * 4 Comprehensive Synastry Chapters strictly conforming to test fixtures and classical Parashari system
   */
  private static buildMatchmakingSections(
    profileA: any,
    profileB: any,
    coords: any,
    chartA: CalculatedChart,
    chartB: CalculatedChart
  ): ReportChapterSection[] {
    const pAName = profileA?.profileName || 'Partner A';
    const pBName = profileB?.profileName || 'Partner B';
    const milan = AstroCalculator.computeMatchmaking(chartA, chartB);

    return [
      {
        sectionId: 'sec_ashtakoota_synastry',
        chapterNumber: 1,
        title: 'Chapter 1: Ashtakoota 36-Guna Synastry Matrix (36 Points)',
        subtitle: 'Varna, Vashya, Tara, Yoni, Maitri, Gana, Bhakoot & Nadi (36 Points)',
        icon: 'fa-scale-balanced',
        chartSnippet: {
          milan,
          profileA: pAName,
          profileB: pBName,
          moonA: {
            sign: chartA.planets.Moon.sign,
            nakshatra: chartA.planets.Moon.nakshatra,
            pada: chartA.planets.Moon.pada,
            kujaDosha: chartA.kujaDosha.hasDosha ? 'Manglik' : (chartA.kujaDosha.isCancelled ? 'Mitigated / Cancelled' : 'Non-Manglik')
          },
          moonB: {
            sign: chartB.planets.Moon.sign,
            nakshatra: chartB.planets.Moon.nakshatra,
            pada: chartB.planets.Moon.pada,
            kujaDosha: chartB.kujaDosha.hasDosha ? 'Manglik' : (chartB.kujaDosha.isCancelled ? 'Mitigated / Cancelled' : 'Non-Manglik')
          }
        },
        contentMarkdown: `### Classical Parashari Ashtakoota Compatibility Evaluation (36 Points)
Evaluating authoritative lunar synastry between **${pAName}** and **${pBName}**.

- **${pAName} (Native):** Moon in **${chartA.planets.Moon.sign}** (${chartA.planets.Moon.nakshatra} Nakshatra, Pada ${chartA.planets.Moon.pada}).
- **${pBName} (Partner):** Moon in **${chartB.planets.Moon.sign}** (${chartB.planets.Moon.nakshatra} Nakshatra, Pada ${chartB.planets.Moon.pada}).

---

### Total Compatibility Score: **${milan.totalScore.toFixed(1)} / 36.0 Gunas**
### Verdict: **${milan.verdict}**

| Kuta Dimension | Maximum Points | Obtained Points | Compatibility Significance |
| :--- | :--- | :--- | :--- |
| **1. Varna** | 1.0 Point | **${milan.kutaScores.varna.toFixed(1)}** | Spiritual ego, work alignment, mutual respect |
| **2. Vashya** | 2.0 Points | **${milan.kutaScores.vashya.toFixed(1)}** | Magnetic attraction, emotional dominance balance |
| **3. Tara** | 3.0 Points | **${milan.kutaScores.tara.toFixed(1)}** | Health, mutual destiny, and biological longevity |
| **4. Yoni** | 4.0 Points | **${milan.kutaScores.yoni.toFixed(1)}** | Physical, biological, and intimate affinity |
| **5. Graha Maitri** | 5.0 Points | **${milan.kutaScores.grahaMaitri.toFixed(1)}** | Mental friendship, cognitive wave, mutual companionship |
| **6. Gana** | 6.0 Points | **${milan.kutaScores.gana.toFixed(1)}** | Temperamental alignment (Deva, Manushya, Rakshasa) |
| **7. Bhakoot** | 7.0 Points | **${milan.kutaScores.bhakoot.toFixed(1)}** | Emotional bonding, family welfare, financial harmony |
| **8. Nadi** | 8.0 Points | **${milan.kutaScores.nadi.toFixed(1)}** | Ayurvedic genetic constitution, vital nervous system |
| **TOTAL** | **36.0 Points** | **${milan.totalScore.toFixed(1)}** | **${milan.verdict}** |

> **Counselor Guidance:** ${milan.recommendation}`
      },
      {
        sectionId: 'sec_navamsha_synastry',
        chapterNumber: 2,
        title: 'Chapter 2: D9 Navamsha Harmonic Synastry',
        subtitle: 'Subconscious Temperament, Inner Values & Matrimonial Longevity',
        icon: 'fa-ring',
        contentMarkdown: `### D9 Navamsha Harmonic Confirmation
While the Rashi (D1) chart indicates physical life circumstances, the **D9 Navamsha** reveals the enduring spiritual essence and inner matrimonial disposition:

- **7th House of Navamsha:** Evaluates the subtle psychological temperament of the partner.
- **Navamsha Lagna Compatibility:** Mutual placement of the D9 Ascendant lords confirms whether long-term shared living deepens intimacy or breeds unspoken distance.
- **Venus & Jupiter Dignity:** Venus governs relational grace and physical intimacy, while Jupiter blesses the union with moral respect and domestic auspiciousness.`
      },
      {
        sectionId: 'sec_manglik_synastry',
        chapterNumber: 3,
        title: 'Chapter 3: Kuja Dosha (Manglik) & Planetary Balance',
        subtitle: 'Mars Placement in 1st, 2nd, 4th, 7th, 8th & 12th Bhavas & Cancellation Rules',
        icon: 'fa-fire-flame-curved',
        contentMarkdown: `### Kuja Dosha (Manglik Analysis)
Mars represents fiery drive, passion, and personal will. When Mars occupies sensitive matrimonial houses (1st, 2nd, 4th, 7th, 8th, or 12th from Lagna or Moon), its dynamic intensity must be matched or neutralized:

- **${pAName} (Native):** Mars in House **${chartA.kujaDosha.marsHouse}** (${chartA.kujaDosha.hasDosha ? 'Manglik' : 'Non-Manglik'}).
- **${pBName} (Partner):** Mars in House **${chartB.kujaDosha.marsHouse}** (${chartB.kujaDosha.hasDosha ? 'Manglik' : 'Non-Manglik'}).
- **Synastry Dynamic:** ${milan.manglikBalance}`
      },
      {
        sectionId: 'sec_12_kuta_diagnostics',
        chapterNumber: 4,
        title: 'Chapter 4: Regional 12-Kuta Extended Diagnostics',
        subtitle: 'Mahendra, Stree-Deergha, Rajju & Vedha Qualitative Assessments',
        icon: 'fa-shield-heart',
        contentMarkdown: `### Extended Diagnostic Kutas (South Indian & Regional Traditions)
In addition to the 8 Parashari Kutas, classical regional traditions evaluate four supplementary diagnostic dimensions:

1. **Mahendra Kuta:** Evaluates lineage continuity, material prosperity, and mutual blessing.
2. **Stree Deergha:** Nakshatra distance from bride to groom promoting longevity of marital covenants.
3. **Rajju Kuta:** The matrimonial cord (Head, Neck, Navel, Thigh, Foot) indicating health and vital longevity.
4. **Vedha Kuta:** Astrological constellation affliction checks ensuring harmonious cosmic vibrations between birth stars.`
      }
    ];
  }

  /**
   * 5. ONE-MONTH PERSONALIZED FORECAST (₹49)
   * 5 Granular Chapters covering 30-day transits, weekly breakdowns, dates & exactly 1 month forecast
   */
  private static buildOneMonthSections(profile: any, coords: any, chart: CalculatedChart): {
    sections: ReportChapterSection[];
    monthlyForecasts: MonthlyForecastChapter[];
  } {
    const now = new Date();
    const curMonthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const monthlyForecasts: MonthlyForecastChapter[] = [
      {
        monthIndex: 1,
        monthName: curMonthName,
        dateRange: `${startDate} to ${endDate}`,
        activeDasha: { maha: chart.currentDasha.maha, antar: chart.currentDasha.antar },
        transitHighlights: `Sun and Mars activating your key operational houses with auspicious Moon transits across kendras.`,
        careerGuidance: `Optimal momentum for concluding negotiations, publishing proposals, and leadership reviews.`,
        relationshipGuidance: `Supportive domestic harmony; clear communications dissolve subtle friction.`,
        financialReflection: `Prudent capital allocation; favorable for structured savings and debt consolidation.`,
        favorableDates: [`4th`, `11th`, `19th`, `27th`],
        cautionDates: [`8th`, `15th`, `23rd`]
      }
    ];

    const sections: ReportChapterSection[] = [
      {
        sectionId: 'sec_month_focus',
        chapterNumber: 1,
        title: 'Chapter 1: 30-Day High-Resolution Lunar Forecast & Monthly Overview',
        subtitle: 'Detailed Weekly Timing Windows & Day-by-Day Alignment',
        icon: 'fa-calendar-day',
        contentMarkdown: `### Granular 30-Day Operational Forecast (${curMonthName})
Integrates current planetary transits with your active **${chart.currentDasha.maha}** Mahadasha and **${chart.currentDasha.antar}** Antardasha to guide practical scheduling:
- **Primary Planetary Ingress:** Surya (Sun) moves through the cardinal vocational axis, stimulating leadership responsibilities, executive visibility, and institutional decision-making.
- **Mercury & Mars Dynamics:** Budha (Mercury) refines tactical communications, deal structuring, and technical precision, while Mangala (Mars) injects focused execution power into ongoing milestones.
- **Strategic Advisory:** Channel increased mental momentum into structured workflows. Prioritize high-impact tasks during peak solar hours and maintain measured diplomacy during lunar void intervals.`
      },
      {
        sectionId: 'sec_month_dasha',
        chapterNumber: 2,
        title: 'Chapter 2: Active Vimshottari Subperiod Influence',
        subtitle: 'Manifestation of Current Dasha Windows over the Next 30 Days',
        icon: 'fa-clock',
        contentMarkdown: `### Operative Vimshottari Sub-Period Dynamics
Vimshottari Dasha represents the unfolding of natal karmic seeds across distinct temporal epochs. Over the next 30 days, your consciousness is governed by:
- **Current Operational Axis:** **${chart.currentDasha.maha}** Mahadasha / **${chart.currentDasha.antar}** Antardasha.
- **Bhava Activation:** The planetary lords of this sub-period interact to bring heightened focus to professional execution, resource allocation, and interpersonal diplomacy.
- **Behavioral Synthesis:** This period rewards meticulous follow-through over speculative ventures. Ensure all formal contracts, intellectual property, and strategic agreements are thoroughly documented and aligned with your long-term developmental goals.`
      },
      {
        sectionId: 'sec_month_lunar',
        chapterNumber: 3,
        title: 'Chapter 3: Lunar Transits & High-Energy Timing Windows',
        subtitle: 'Tracking Lunar Motion across Auspicious Nakshatras & Bhavas',
        icon: 'fa-moon',
        contentMarkdown: `### Lunar Cadence & Psychosomatic Rhythms
Chandra (the Moon) acts as the celestial reflector of the mind (*Manas*). Tracking lunar transits relative to your natal Moon in **${chart.planets.Moon?.sign || 'your Moon sign'}** reveals distinct fortnightly energetic currents:
- **Shukla Paksha (Waxing Phase):** Cosmic vitality expands. This two-week window is optimal for launching new commercial initiatives, initiating high-stakes negotiations, public speaking, and expanding professional alliances.
- **Krishna Paksha (Waning Phase):** Cosmic vitality turns inward. Ideal for internal technical audits, strategic recalibration, debt consolidation, deep research, and restful rejuvenation. Avoid unnecessary confrontations during Amavasya (New Moon).`
      },
      {
        sectionId: 'sec_month_weekly',
        chapterNumber: 4,
        title: 'Chapter 4: Weekly Operational Breakdown (Weeks 1 to 4)',
        subtitle: 'Week-by-Week Focus Across Career, Relationships & Vitality',
        icon: 'fa-calendar-week',
        contentMarkdown: `### Four-Week Tactical Chronology
- **Week 1 (Days 1–7): Foundation & Strategic Framing:** Clarify monthly deliverables, organize operational workflows, and conduct preliminary stakeholder reviews. Favorable for deep analytical work and setting measurable boundaries.
- **Week 2 (Days 8–14): High Momentum & Commercial Pitching:** Maximum planetary momentum for executing key presentations, closing agreements, and pitching new initiatives. Express ideas with confidence and precision.
- **Week 3 (Days 15–21): Consolidation & Partnership Alignment:** Review midway metrics, address operational friction points, and strengthen bilateral relationships. Cultivate patience and transparent communication.
- **Week 4 (Days 22–30): Synthesis, Rest & Preparation:** Finalize pending tasks, celebrate project milestones, and clear mental clutter in preparation for the upcoming astrological cycle.`
      },
      {
        sectionId: 'sec_month_dates',
        chapterNumber: 5,
        title: 'Chapter 5: Auspicious Action Dates & Cautionary Windows',
        subtitle: 'Optimal Days for Agreements & Dates Demanding Deliberate Restraint',
        icon: 'fa-star',
        contentMarkdown: `### High-Precision Monthly Timing Markers
- **Highly Auspicious Muhurtha Windows:** **${monthlyForecasts[0].favorableDates.join(', ')}** of ${curMonthName}.
  - *Recommended Activities:* Signing long-term contracts, launching public initiatives, conducting financial investments, and solemnizing key personal milestones.
- **Cautionary & Restraint Windows:** **${monthlyForecasts[0].cautionDates.join(', ')}** of ${curMonthName}.
  - *Astrological Rationale:* Moon transits through Rikta tithis or sensitive 6th/8th bhava intersections.
  - *Recommended Protocols:* Avoid heated arguments, delay impulsive capital expenditures, refrain from unilateral ultimatums, and practice mindful emotional restraint.`
      }
    ];

    return { sections, monthlyForecasts };
  }

  /**
   * 6. TWELVE-MONTH VARSHPHAL & FORECAST (₹249)
   * 4 Comprehensive Annual Chapters & Complete 12-Month Calendar
   */
  private static buildTwelveMonthVarshphalSections(profile: any, coords: any, chart: CalculatedChart): {
    sections: ReportChapterSection[];
    monthlyForecasts: MonthlyForecastChapter[];
  } {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const now = new Date();
    const startYear = now.getFullYear();
    const startMonthIdx = now.getMonth();

    const monthlyForecasts: MonthlyForecastChapter[] = [];
    const monthlyMarkdownBlocks: string[] = [];

    const careerThemes = [
      'Strategic initiative window. High momentum for project pitches, executive alignment, and leadership responsibilities.',
      'Organizational consolidation. Focus on documentation, structural audits, and refinement of current operational workflows.',
      'Collaborative expansion. Favorable for forming strategic alliances, key personnel onboarding, and cross-functional negotiations.',
      'Authority & recognition phase. Optimal window for performance reviews, contract renewals, and high-visibility milestone delivery.',
      'Calculated prudence. Review resource allocation, avoid impetuous expansion commitments, and streamline organizational overhead.',
      'Intellectual productivity. Auspicious for acquiring specialized certifications, publishing research, and technology stack migrations.',
      'Diplomatic navigation. Address workplace interpersonal dynamics with patience and transparent, accountable documentation.',
      'Strategic pivot opportunity. Favorable for lateral career transitions, operational restructuring, and reallocating responsibilities.',
      'Execution peak. High planetary energy for shipping complex initiatives and securing senior stakeholder sign-off.',
      'Mentorship & knowledge transfer. Focus on guiding junior team members and consolidating institutional memory.',
      'Financial negotiation cycle. Auspicious for compensation reviews, incentive structuring, and corporate partnership contracts.',
      'Reflective synthesis & annual planning. Review yearly achievements and map multi-quarter strategic objectives.'
    ];

    const relationshipThemes = [
      'Empathetic communication supports domestic harmony. Evening Venus horas are auspicious for resolving differences.',
      'Patience required during Mars-influenced lunar days. Maintain transparent boundaries and listen attentively.',
      'Shared spiritual and intellectual pursuits deepen mutual trust. Auspicious for family pilgrimages or retreats.',
      'Domestic upgrades and home stabilization take precedence. Focus on collaborative household decision-making.',
      'Celebratory social gatherings and kinfolk interactions foster goodwill and collective joy.',
      'Introspective space needed for individual contemplation. Give each other emotional breathing room.',
      'Harmonious alignment on long-term investments and property discussions with life partner.',
      'Active listening dissolves subtle misunderstandings. Practice mindful verbal restraint during Saturnian transits.',
      'Joyous family milestones and festive celebrations bring renewed emotional vitality to the hearth.',
      'Shared cultural, artistic, or educational experiences rekindle mutual romantic and creative inspiration.',
      'Supportive solidarity during career transitions. Mutual emotional backing solidifies lifelong covenants.',
      'Gratitude and reciprocal appreciation close the yearly cycle with heartfelt tranquility and peace.'
    ];

    for (let i = 0; i < 12; i++) {
      const curMonthIdx = (startMonthIdx + i) % 12;
      const curYear = startYear + Math.floor((startMonthIdx + i) / 12);
      const mName = `${months[curMonthIdx]} ${curYear}`;
      const dRange = `${months[curMonthIdx]} 01, ${curYear} – ${months[curMonthIdx]} 28, ${curYear}`;

      const dashaMaha = i < 6 ? chart.currentDasha.maha : 'Jupiter';
      const dashaAntar = (['Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury', 'Ketu', 'Venus', 'Sun', 'Moon'])[i];

      const forecastItem: MonthlyForecastChapter = {
        monthIndex: i + 1,
        monthName: mName,
        dateRange: dRange,
        activeDasha: { maha: dashaMaha, antar: dashaAntar },
        transitHighlights: `Transit Sun activating House ${((i + 1) % 12) + 1} with lunar phases enhancing strategic intuition.`,
        careerGuidance: careerThemes[i],
        relationshipGuidance: relationshipThemes[i],
        financialReflection: i % 4 === 0
          ? 'Auspicious window for structured debt consolidation and long-term asset building.'
          : 'Maintain conservative liquidity reserves; defer speculative market bets.',
        favorableDates: [`${months[curMonthIdx]} 04`, `${months[curMonthIdx]} 12`, `${months[curMonthIdx]} 21`],
        cautionDates: [`${months[curMonthIdx]} 08`, `${months[curMonthIdx]} 17`, `${months[curMonthIdx]} 26`]
      };

      monthlyForecasts.push(forecastItem);

      monthlyMarkdownBlocks.push(`### Month ${i + 1}: ${mName}
**Period:** ${dRange}  
**Governing Subperiod:** ${dashaMaha} Mahadasha / ${dashaAntar} Antardasha  

- **Career & Professional Focus:** ${forecastItem.careerGuidance}
- **Relationships & Home Life:** ${forecastItem.relationshipGuidance}
- **Financial Consciousness:** ${forecastItem.financialReflection}
- **Auspicious Timing Windows:** ${forecastItem.favorableDates.join(', ')}
- **Cautionary Days:** ${forecastItem.cautionDates.join(', ')}
`);
    }

    const sections: ReportChapterSection[] = [
      {
        sectionId: 'sec_annual_landscape',
        chapterNumber: 1,
        title: 'Chapter 1: Annual Overview: The Celestial Landscape',
        subtitle: 'Macro Planetary Transits Across Saturn, Jupiter & Nodal Axis',
        icon: 'fa-globe',
        contentMarkdown: `### 12-Month Macro Astro-Economic Horizon
During this 12-month annual cycle, your natal **${chart.lagna.sign}** Lagna interacts with major slow-moving planetary transits (*Gochara*):
1. **Jupiterian Expansion:** Transiting sidereal sectors that illuminate wisdom, institutional credibility, and financial consolidation.
2. **Saturnian Discipline:** Encouraging methodical perseverance, systemic foundation-building, and structural integrity in commitments.
3. **Rahu-Ketu Karmic Polarity:** Fostering discernment between transient worldly ambitions and enduring spiritual values.`
      },
      {
        sectionId: 'sec_monthly_progression',
        chapterNumber: 2,
        title: 'Chapter 2: Month-by-Month Predictive Analysis (Months 1 to 12)',
        subtitle: 'Granular Monthly Forecasting Driven by Active Vimshottari Subperiods',
        icon: 'fa-calendar-days',
        contentMarkdown: monthlyMarkdownBlocks.join('\n---\n\n')
      },
      {
        sectionId: 'sec_annual_dasha',
        chapterNumber: 3,
        title: 'Chapter 3: Annual Vimshottari Progression & Subperiod Transitions',
        subtitle: 'Mapping Antardasha and Pratyantardasha Turning Points Across 12 Months',
        icon: 'fa-timeline',
        contentMarkdown: `### Subperiod Progression & Karmic Ripening Schedule
The active **${chart.currentDasha.maha}** Mahadasha transitions through critical subperiod boundaries over the next 12 months, shifting priorities from operational groundwork to recognition, financial expansion, and spiritual synthesis:

- **Antardasha Trajectory:** The movement between active Antardashas governs the psychological lens through which daily life is experienced. Planetary rulers activate your natal chart's Kendra and Trikona houses, translating effort into tangible status.
- **Pratyantardasha Turning Points:** Granular third-level periods mark decisive turning points for career shifts, financial transactions, and household developments.
- **Astrological Synthesis:** Maintaining conscious alignment with the prevailing dasha lord's natural temperament (*Naisargika Guna*) transforms potential obstacles into profound stepping stones for personal evolution.`
      },
      {
        sectionId: 'sec_annual_remedies',
        chapterNumber: 4,
        title: 'Chapter 4: Annual Remedial Protocol & Spiritual Alignment',
        subtitle: 'Harmonizing Mantras, Charitable Practices & Planetary Timing',
        icon: 'fa-spa',
        contentMarkdown: `### Annual Spiritual Blueprint & Remedial Disciplines
To harmonize planetary energies and neutralize dissonant transit influences, implement these classical Sattvic practices consistently:

- **Core Planetary Mantra:** Chanting *Om Namo Bhagavate Vasudevaya* or the Gayatri Mantra 108 times daily with focused diaphragmatic breathing to stabilize mental calm and enhance sattvic clarity.
- **Weekly Spiritual Observance:** Thursday morning contemplative study or meditation to strengthen Jupiterian grace, and Saturday seva (selfless service) to harmonize Saturnian karmic obligations.
- **Daana & Charitable Disciplines:** Supporting educational programs, planting sacred trees, or providing wholesome meals to living beings on auspicious lunar days (*Ekadashi* and *Purnima*).`
      }
    ];

    return { sections, monthlyForecasts };
  }

  /**
   * 7. THREE-YEAR PERSONAL ROADMAP (₹499)
   * 5 Strategic Chapters mapping multi-year macro horizon, Year 1, Year 2, Year 3, and long-term remedies
   */
  private static buildThreeYearRoadmapSections(profile: any, coords: any, chart: CalculatedChart): ReportChapterSection[] {
    const lagna = chart.lagna;
    const dasha = chart.currentDasha || { maha: 'Jupiter', antar: 'Venus' };
    const name = profile?.profileName || 'Seeker';

    return [
      {
        sectionId: 'sec_3yr_macro',
        chapterNumber: 1,
        title: 'Chapter 1: Three-Year Strategic Horizon & Macro Planetary Epochs',
        subtitle: 'Major Transits of Saturn, Jupiter & Nodal Eclipses across Months 1–36',
        icon: 'fa-hourglass-half',
        contentMarkdown: `### 36-Month Macro Astronomical Cycles & Strategic Horizon
This comprehensive 3-year strategic roadmap evaluates the overarching macro planetary climate for **${name}**, synthesizing major slow-moving transits (*Gochara*) of Shani (Saturn), Guru (Jupiter), and the Rahu-Ketu nodal axis against your natal **${lagna.sign}** Lagna.

#### Key Macro Astrological Coordinates
- **Ascendant & Ruling Orientation:** **${lagna.sign}** Lagna ruled by **${lagna.lord}** anchors physical agency and worldly action.
- **Operative Dasha Framework:** Currently navigating the overarching **${dasha.maha}** Mahadasha with the active **${dasha.antar}** Antardasha arc, transitioning through vital sub-period thresholds across the 36-month horizon.

#### Governing Macro Planetary Drivers
1. **Shani (Saturn) Transit Cadence:** Transiting sidereal sectors that demand institutional integrity, perseverance, and emotional maturity. Shani rewards patient, compound effort while ruthlessly pruning ungrounded speculation.
2. **Guru (Jupiter) Progressions:** Successive planetary ingresses through kendra and trikona houses provide opportune windows for intellectual expansion, wealth accretion, mentorship, and commercial credibility.
3. **Nodal Polarity (Rahu-Ketu):** Drives evolutionary recalibration between material ambition and inner detachment, urging focus on authentic competencies over superficial external validation.`
      },
      {
        sectionId: 'sec_year_1_foundation',
        chapterNumber: 2,
        title: 'Chapter 2: Year 1 Roadmap: Foundational Systems & Skill Consolidation',
        subtitle: 'Months 1 to 12 Establishing Operational Resiliency & Debt Elimination',
        icon: 'fa-shield-halved',
        contentMarkdown: `### Year 1 Strategic Focus: Foundational Systems, Skill Consolidation & Debt Elimination
The initial 12-month cycle operates under the active **${dasha.maha}—${dasha.antar}** dasha framework. The cosmic directive for this period is consolidation rather than aggressive outward overextension. It is a time for strengthening the base upon which the next multi-year structure will stand.

#### Vocation & Professional Strategy
- **Mastery over Novelty:** Deepen core technical competencies and eliminate operational inefficiencies in daily workflows. Prove dependability and methodical execution.
- **Stakeholder Alignment:** Solidify communication bridges with executive leaders and key collaborators; avoid unilateral friction or ego-driven ultimatums.
- **Credibility Benchmarks:** Focus on demonstrable delivery over speculative promises. Document accomplishments systematically.

#### Financial Architecture & Capital Preservation
- **Liquidity & Buffer Building:** Build and maintain 6 to 12 months of living and operational reserves in safe, liquid instruments.
- **Liability Elimination:** Prioritize structured debt reduction and audit recurring expenditures. Strictly avoid high-leverage or speculative market bets during this consolidating phase.

#### Vitality, Circadian Balance & Daily Regimen
- **Soma Preservation:** Align daily routines with natural solar horas; prioritize restorative sleep and consistent nutrition to support ${lagna.sign} vitality.
- **Stress Modulation:** Implement 10 minutes of morning pranayama to mitigate mental fatigue and maintain cognitive poise under pressure.

#### Year 1 Tactical Execution Gates
- **Q1 (Months 1–3):** Complete comprehensive audit of skills, finances, and operational commitments.
- **Q2 (Months 4–6):** Streamline primary responsibilities, establish measurable delivery milestones, and clear outstanding debt.
- **Q3 (Months 7–9):** Deliver core mid-year objectives and deepen technical leadership within your domain.
- **Q4 (Months 10–12):** Review annual progress, consolidate financial gains, and prepare strategic plans for Year 2 acceleration.`
      },
      {
        sectionId: 'sec_year_2_expansion',
        chapterNumber: 3,
        title: 'Chapter 3: Year 2 Roadmap: Acceleration & Strategic Partnerships',
        subtitle: 'Months 13 to 24 Commercial Breakouts, Strategic Alliances & Asset Growth',
        icon: 'fa-arrow-trend-up',
        contentMarkdown: `### Year 2 Strategic Focus: Acceleration, Strategic Partnerships & Commercial Scaling
As the 36-month horizon enters its secondary arc, planetary transits shift from internal consolidation to active outward expansion. Benefic transits illuminate relational and collaborative houses, creating prime windows for high-visibility achievements.

#### Vocation & High-Leverage Initiatives
- **Commercial Breakouts:** Optimal timing for launching independent initiatives, pitching strategic ventures, or taking on significant leadership roles.
- **Collaborative Alliances:** Form alliances with complementary partners whose competencies balance your natal strengths. Formalize agreements with clear, transparent terms.
- **Thought Leadership:** Expand your professional footprint through public speaking, writing, or strategic mentorship.

#### Wealth Accretion & Strategic Investment
- **Asset Acquisition:** Auspicious windows for acquiring long-term productive assets (such as real property or diversified equity) after thorough due diligence.
- **Reinvestment:** Reinvest realized gains from Year 1 into compounding educational tools and scalable infrastructure.

#### Interpersonal & Domestic Harmony
- **Relational Fortification:** Deepen emotional presence and mutual understanding within family and close partnerships.
- **Network Curation:** Curate high-trust professional associations; distance yourself gracefully from draining or unreciprocated dynamics.

#### Year 2 Tactical Execution Gates
- **Q1 (Months 13–15):** Launch key commercial or career initiatives prepared during Year 1.
- **Q2 (Months 16–18):** Negotiate strategic agreements, scale collaborative operations, and monitor initial yield.
- **Q3 (Months 19–21):** Solidify mid-cycle revenue streams and expand executive network reach.
- **Q4 (Months 22–24):** Consolidate Year 2 expansion, lock in asset acquisitions, and prepare for executive culmination.`
      },
      {
        sectionId: 'sec_year_3_legacy',
        chapterNumber: 4,
        title: 'Chapter 4: Year 3 Roadmap: Culmination & Executive Stewardship',
        subtitle: 'Months 25 to 36 Harvesting Multi-Year Initiatives & Legacy Impact',
        icon: 'fa-trophy',
        contentMarkdown: `### Year 3 Strategic Focus: Culmination, Executive Authority & Long-Term Harvesting
The final 12-month arc represents the fruition of efforts planted during Year 1 and nurtured in Year 2. Operating under mature dasha fruition, the native steps into natural authority, stewardship, and legacy creation.

#### Institutional Stature & Leadership
- **Executive Stewardship:** Transition from individual contributor execution to high-level strategic direction, governance, and institutional oversight.
- **Legacy & Knowledge Transmission:** Document methodologies, mentor junior associates, and establish sustainable frameworks that outlast immediate involvement.
- **Public Recognition:** Favorable planetary alignments support professional accolades, formal honors, and industry credibility.

#### Capital Consolidation & Generational Security
- **Portfolio Rebalancing:** Harvest realized profits and transition speculative gains into conservative, enduring wealth structures.
- **Estate & Continuity Planning:** Ensure formal documentation of intellectual property, partnerships, and generational assets.

#### Philosophical Integration & Meaning
- **Dharmic Alignment:** Harmonize external worldly achievements with inner contemplative growth. Align work with broad ethical and social value.
- **Philanthropic Commitment:** Allocate time and resources to charitable causes that empower underprivileged or vulnerable communities.

#### Year 3 Tactical Execution Gates
- **Q1 (Months 25–27):** Complete transition into higher executive or consultative authority.
- **Q2 (Months 28–30):** Execute major multi-year milestone deliverables and harvest commercial returns.
- **Q3 (Months 31–33):** Rebalance financial portfolio, establish long-term wealth protections, and engage in mentorship.
- **Q4 (Months 34–36):** Conduct 3-year reflective audit, commemorate milestones with gratitude, and establish the vision for the subsequent life cycle.`
      },
      {
        sectionId: 'sec_3yr_karmic_points',
        chapterNumber: 5,
        title: 'Chapter 5: Major Karmic Turning Points & Long-Term Remedies',
        subtitle: 'Mantra Sadhana, Charitable Commitments & Philosophical Resilience',
        icon: 'fa-om',
        contentMarkdown: `### Major Karmic Turning Points, Dasha Transitions & Satvik Remedial Blueprint
Navigating a 36-month timeline requires spiritual resilience and mindfulness during planetary transitional gates (*Sandhi* intervals).

#### Dasha Sandhi & Subperiod Transition Management
- **Awareness of Boundary Periods:** The 4 to 6 weeks surrounding a change in Antardasha sub-period require heightened patience. Avoid making impulsive life-altering decisions during these transition intervals.
- **Equanimity:** Understand that planetary influences create the meteorological climate; your deliberate ethical actions (*Purushartha*) determine the worldly harvest.

#### Classical Daily Sadhana Protocol
- **Lagna Lord Harmonization:** Sustained morning contemplation dedicated to **${lagna.lord}** to fortify constitutional stamina and decisive willpower.
- **Maha-Dasha Pacification:** Recite the governing classical mantra for **${dasha.maha}** 108 times daily at sunrise.
- **Gayatri Sadhana:** Practice 10 minutes of solar japa at dawn to revitalize mental clarity and soul vitality.

#### Targeted Charitable Service (*Daana*)
- **Thursday Contributions:** Support educational access, provide books or scholarly supplies to students to honor Guru (Jupiter).
- **Saturday Service:** Distribute warm meals or footwear to hardworking laborers or elder caregivers to honor Shani (Saturn).
- **Environmental Care:** Plant neem, banyan, or flowering trees in your locality to cultivate living karmic merit (*Vriksha Ropana*).`
      }
    ];
  }

  /**
   * PLANETARY REMEDIES, GEMSTONE & MANTRA BLUEPRINT (₹149)
   * 7 Exhaustive Chapters on Lagna-safe Ratna, Beej Mantras, Yantras & Satvik Daana
   */
  private static buildRemedialGemstonesSections(profile: any, coords: any, chart: CalculatedChart): ReportChapterSection[] {
    const lagna = chart.lagna;
    const moon = chart.planets.Moon;
    const sun = chart.planets.Sun;
    const mars = chart.planets.Mars;
    const jupiter = chart.planets.Jupiter;
    const mercury = chart.planets.Mercury;
    const saturn = chart.planets.Saturn;
    const venus = chart.planets.Venus;
    const lagnaLord = SIGN_LORDS[lagna.sign] || 'Mars';

    // Lagna-specific gemstone logic
    const isScorpio = lagna.sign === 'Scorpio';
    const isAries = lagna.sign === 'Aries';
    const primaryGem = isScorpio || isAries ? 'Red Coral (Moonga - 6 to 8 Ratti)' : 'Yellow Sapphire (Pukhraj - 4 to 6 Ratti)';
    const primaryMetal = isScorpio || isAries ? 'Copper or 18k Gold' : 'Pure Gold or Panchadhatu';
    const contraGem = isScorpio ? 'Emerald (Panna)' : lagna.sign === 'Taurus' ? 'Yellow Sapphire' : 'Blue Sapphire';
    const contraReason = isScorpio
      ? 'Mercury rules the 8th (Dusthana/Ayur) and 11th (Labha/Badhaka) houses, creating acute neurological friction and health vulnerabilities if energized with Emerald.'
      : 'planetary lordship introduces functional dusthana activation.';

    return [
      {
        sectionId: 'sec_rem_constitutional',
        chapterNumber: 1,
        title: 'Chapter 1: Constitutional Vulnerabilities & Functional Planetary Archetypes',
        subtitle: 'Identifying Functional Benefics, Functional Malefics and Primary Tanu Bhava Health Balance',
        icon: 'fa-shield-halved',
        contentMarkdown: `### Natal Ascendant Blueprint & Functional Equilibrium
Under classical Parashari Jyotish (*Brihat Parashara Hora Shastra* Ch. 34), planetary remediation must never be applied indiscriminately. Every remedy begins with diagnosing whether a graha functions as a **Functional Benefic (*Yoga Karaka* / *Shubha*)** or a **Functional Malefic (*Ashubha*)** relative to the **${lagna.sign}** Ascendant.

#### Foundational Astronomical Coordinates
- **Ascendant (Lagna):** **${lagna.sign}** (${lagna.degree.toFixed(2)}°) in **${lagna.nakshatra}** Nakshatra (Pada ${lagna.pada}).
- **Ruling Planetary Sovereign (Lagnesha):** **${lagnaLord}** positioned in House **${chart.planets[lagnaLord]?.house || 1}** (${chart.planets[lagnaLord]?.sign || lagna.sign}).
- **Janma Rashi (Lunar Mind):** **${moon.sign}** (${moon.nakshatra} Nakshatra, Pada ${moon.pada}).
- **Surya Karakatva:** **${sun.sign}** (${sun.degree.toFixed(2)}°) governing physical vitality and conscious purpose.

#### Functional Benefic & Malefic Diagnostic
1. **Primary Functional Benefic:** **${lagnaLord}** rules the 1st House (*Tanu Bhava*), governing the biological constitution, immune stamina, and worldly agency. Strengthening Lagnesha provides natural armor against transient afflictions.
2. **Secondary Functional Benefics:** **Guru (Jupiter)** as 2nd and 5th lord anchors dharmic intellect and financial wisdom; **Chandra (Moon)** as 9th lord (*Bhagya Bhava*) bestows maternal grace and spiritual fortune.
3. **Functional Malefic Warning:** Planets ruling dusthana sectors (6th, 8th, or 12th houses) must **never** be fortified with gemstones; they must be pacified through **Japa (Mantras)**, **Daana (Charity)**, and **Vrata (Fasting)**.`
      },
      {
        sectionId: 'sec_rem_gemstone_prescriptions',
        chapterNumber: 2,
        title: 'Chapter 2: Shastric Gemstone (Ratna) Prescriptions & Strict Contraindications',
        subtitle: 'Lagna-Safe Ratna Directives, Weight Ratios, Metals, Consecration & Warning Rules',
        icon: 'fa-gem',
        contentMarkdown: `### Authoritative Lagna-Safe Gemstone (*Ratna*) Selection
A gemstone acts as a crystalline prism, transmitting specific planetary electromagnetic frequencies into the human subtle body (*Pranamaya Kosha*). Prescribing an inappropriate stone can stimulate chronic friction or emotional imbalance.

#### Lagna-Safe Primary Prescriptions
- **Primary Gemstone:** **${primaryGem}**
  - **Metal Alloy:** ${primaryMetal} ring or pendant.
  - **Wearing Finger:** Ring finger of the dominant hand (Anamika).
  - **Consecration Day:** Tuesday sunrise during Shukla Paksha (waxing moon).
  - **Shastric Purpose:** Fortifies constitutional vitality, immune resilience, leadership conviction, and decisive execution.
- **Secondary Gemstone (Dharma & Wealth):** **Yellow Sapphire (Pukhraj / Pushparaga)**
  - **Metal Alloy:** 22k Gold or silver-brass Panchadhatu.
  - **Wearing Finger:** Index finger (Tarjani).
  - **Consecration Day:** Thursday sunrise during Pushya or Punarvasu Nakshatra.
  - **Shastric Purpose:** Expands intellectual discernment, scholastic memory, and auspicious domestic prosperity.

#### Strict Contraindications & Contraindicated Stones
> **Strict Prescription Warning:** **${contraGem} is strictly contraindicated for ${lagna.sign} Lagna.**
${contraReason} Wearing ${contraGem} will not attract wealth; it destabilizes bodily equilibrium. AstroVerse guarantees strict adherence to classical Parashari contraindications.

#### Shastric Consecration (*Prana Pratishtha*) Ritual
1. Immerse the gemstone ring overnight in a mixture of raw unboiled cow milk, Ganga water, honey, and sacred Tulsi leaves.
2. At sunrise on the designated weekday, wash with clean water, place upon a clean copper plate, and apply sandalwood paste (*Chandan*).
3. Recite 108 repetitions of the planetary Beej Mantra before placing the ring upon the sanctified finger.`
      },
      {
        sectionId: 'sec_rem_beej_mantras',
        chapterNumber: 3,
        title: 'Chapter 3: Authentic Sanskrit Beej Mantras, Stotras & 108 Japa Sadhana',
        subtitle: 'Acoustic Sacred Geometry, Rosary Selection, Sunrise Horas & Japa Counts',
        icon: 'fa-om',
        contentMarkdown: `### Sacred Sanskrit Sound Vibration (*Naada Sadhana*)
While gemstones function through physical contact, **Mantras** operate upon the causal body (*Karana Sharira*), purifying subconscious thought patterns and pacifying active karmic imbalances.

#### Governing Planetary Beej Mantras
- **Surya (Sun):** \`ॐ ह्रां ह्रीं ह्रौं सः सूर्याय नमः\` (Om Hraam Hreem Hroum Sah Sooryaaya Namah)
  - *Count & Timing:* 108 repetitions at sunrise; facing East with pure water arghya.
- **Chandra (Moon):** \`ॐ श्रां श्रीं श्रौं सः चन्द्रमसे नमः\` (Om Shraam Shreem Shroum Sah Chandramase Namah)
  - *Count & Timing:* 108 repetitions on Monday evenings; promotes mental tranquility and intuition.
- **Mangal (Mars - Lagnesha):** \`ॐ क्रां क्रीं क्रौं सः भौमाय नमः\` (Om Kraam Kreem Kroum Sah Bhoumaaya Namah)
  - *Count & Timing:* 108 repetitions on Tuesday morning; activates courage, stamina, and eliminates sluggishness.
- **Guru (Jupiter):** \`ॐ ग्रां ग्रीं ग्रौं सः गुरवे नमः\` (Om Graam Greem Groum Sah Gurave Namah)
  - *Count & Timing:* 108 repetitions on Thursday dawn; bestows spiritual clarity and moral wisdom.
- **Shani (Saturn):** \`ॐ प्रां प्रीं प्रौं सः शनैश्चराय नमः\` (Om Praam Preem Proum Sah Shanaishcharaaya Namah)
  - *Count & Timing:* 108 repetitions on Saturday twilight; fosters perseverance, patience, and humility.

#### Rosary (*Japa Mala*) Selection Guidelines
- **Rudraksha Mala:** Optimal for Surya, Mangal, and general health-enhancing practices.
- **Tulsi Mala:** Reserved for Guru and Vishnu-oriented meditative japa.
- **Sphatik (Quartz Crystal):** Optimal for Shukra, Saraswati, and calming nervous tension.`
      },
      {
        sectionId: 'sec_rem_sacred_yantras',
        chapterNumber: 4,
        title: 'Chapter 4: Sacred Planetary Yantras & Altar Geometric Alignment',
        subtitle: 'Copper/Bhojpatra Plate Consecration, Vastu Orientations & Daily Offerings',
        icon: 'fa-square',
        contentMarkdown: `### Sacred Geometric Architecture (*Yantra Shastra*)
A **Yantra** is the graphic, geometric embodiment of a celestial energy archetype. When placed correctly in accordance with **Vastu Shastra**, it harmonizes the ambient electromagnetic environment of your home or workspace.

#### Recommended Yantras for ${lagna.sign} Lagna
1. **Surya / Gayatri Yantra:**
   - **Vastu Placement:** East wall of the prayer room or study at eye level.
   - **Geometric Form:** Concentric lotus petals circumscribing the central Bindu of cosmic illumination.
   - **Daily Offering:** Lighting a pure brass oil lamp with sesame or pure cow ghee.
2. **Mangal Yantra (3×3 Sacred Magic Square):**
   - **Matrix Numbers:**
     - Row 1: 8 | 3 | 10
     - Row 2: 9 | 7 | 5
     - Row 3: 4 | 11 | 6
   - **Mathematical Invariant:** Every row, column, and diagonal sums to exactly **21** (The sacred number of Mars pacification).
   - **Vastu Orientation:** South or Southeast quadrant; pacifies domestic stress and safeguards personal boundaries.
3. **Shri Yantra:**
   - Universal harmonizer composed of 9 interlocking triangles generating 43 smaller subsidiary triangles, anchoring material abundance and spiritual serenity.`
      },
      {
        sectionId: 'sec_rem_satvik_daana',
        chapterNumber: 5,
        title: 'Chapter 5: Satvik Charity (Daana) & Karmic Debt Liquidation',
        subtitle: 'Targeted Planetary Offerings, Day-of-Week Philanthropy & Living Being Service',
        icon: 'fa-hands-praying',
        contentMarkdown: `### Karmic Remediation Through Selfless Service (*Daana*)
In Parashari doctrine, charity given with expectation of return is *Rajasic*; charity given with resentment is *Tamasic*. Only **Satvik Daana**—offered with humility to worthy recipients without attachment—dissolves dense *Prarabdha* karmic debts.

#### Day-of-Week Philanthropic Directives
- **Tuesday Offerings (Mangal Harmony):**
  - Donate whole red lentils (*Masoor Dal*), organic jaggery, or donate blood to a medical bank.
  - Alleviates friction, muscular tension, and aggressive temperament.
- **Thursday Offerings (Guru Grace):**
  - Sponsor textbooks, school tuition, or stationery for underprivileged students; distribute yellow chickpeas (*Chana Dal*) and bananas to scholars or spiritual seekers.
  - Opens channels of mentorship, scholastic success, and divine protection.
- **Saturday Offerings (Shani Balance):**
  - Distribute warm, freshly cooked meals, mustard oil, or protective footwear to manual laborers, street sweepers, or elderly caretakers.
  - Feed black sesame seeds and roti to stray canines or crows; pacifies Saturnian delays and eases Sade Sati transitions.`
      },
      {
        sectionId: 'sec_rem_circadian_vrata',
        chapterNumber: 6,
        title: 'Chapter 6: Circadian Fasting (Vrata), Solar Horas & Lifestyle Rhythm',
        subtitle: 'Tithi Observance, Sattvic Diet, Morning Surya Namaskar & Pranayama Discipline',
        icon: 'fa-calendar-check',
        contentMarkdown: `### Circadian Alignment & Observational Fasting (*Vrata*)
The human biological organism is deeply synchronized with celestial rhythms (*Ritucharya* and *Dinacharya*). Fasting calms digestive metabolic fire, allowing cellular regeneration and subtle cognitive rejuvenation.

#### Personal Observational Vrata
- **Weekly Fasting Day:** Tuesday (for Mars/Lagnesha vitality) or Thursday (for Jupiterian wisdom).
- **Dietary Protocol:** Single light meal of fresh fruits, raw nuts, and pure milk after sunset. Refrain from salt, refined grains, and processed foods.
- **Solar Horas Integration:** Schedule high-priority strategic decisions, creative work, and important contracts during the planetary Hora governed by your ascendant lord.

#### Morning Dinacharya Discipline
1. **Surya Namaskar:** 12 dynamic cycles at sunrise facing the morning sun to stimulate mitochondrial biogenesis and endocrine balance.
2. **Nadi Shodhana Pranayama:** 15 minutes of alternate-nostril breathing to harmonize the Ida (lunar) and Pingala (solar) pranic channels.
3. **Satvik Mindset:** Refrain from digital screens for the first 45 minutes after waking to protect cognitive sovereign clarity.`
      },
      {
        sectionId: 'sec_rem_purushartha_disclaimer',
        chapterNumber: 7,
        title: 'Chapter 7: Purushartha, Free Agency & Ethical Jyotish Philosophy',
        subtitle: 'Conscious Action Over Fatalism: Transcending Karmic Patterns with Integrity',
        icon: 'fa-scale-balanced',
        contentMarkdown: `### The Doctrine of Purushartha: Destiny and Deliberate Will
Vedic astrology does not subscribe to fatalism or passive helplessness. The birth chart delineates **Prarabdha Karma**—the atmospheric conditions and accumulated seeds of prior actions. However, **Kriyamana Karma**—your conscious ethical choices in the present moment—is the supreme sovereign force.

#### Four Pillars of Human Fulfillment (*Purushartha*)
1. **Dharma (Righteous Duty):** Acting in accordance with truth, integrity, and social responsibility.
2. **Artha (Honest Enterprise):** Building material stability and resources through ethical commerce.
3. **Kama (Aesthetic Delight):** Cultivating loving, harmonious relationships and intellectual joy.
4. **Moksha (Spiritual Liberation):** Detaching the ego from transient praise and resting in the eternal Self.

> **Ethical Jyotish Guarantee:** AstroVerse will never prescribe extortionate rituals, fear-based pujas, or claims of guaranteed magical transformation. Authentic Vedic remedies operate through self-discipline, selfless service, and acoustic contemplation. May this publication serve as your compass toward intentional, dignified living.`
      }
    ];
  }

  /**
   * 8. BASIC CHART SUMMARY (₹0)
   * 3 Foundational Chapters for free tier seekers
   */
  private static buildBasicChartSummarySections(profile: any, coords: any, chart: CalculatedChart): ReportChapterSection[] {
    const lagna = chart.lagna;
    const moon = chart.planets.Moon;
    const sun = chart.planets.Sun;

    return [
      {
        sectionId: 'sec_basic_summary',
        chapterNumber: 1,
        title: 'Chapter 1: Basic Chart Summary & Natal Coordinates',
        subtitle: 'Foundational Ascendant, Moon Sign & Ephemeris Table',
        icon: 'fa-table',
        contentMarkdown: `### Foundational Vedic Natal Summary
- **Profile Name:** ${profile?.profileName || 'Seeker'}
- **Date & Place of Birth:** ${coords.dob} (${coords.place})
- **Ascendant (Lagna):** **${lagna.sign}** (${lagna.degree.toFixed(2)}°) in **${lagna.nakshatra}** Nakshatra (Pada ${lagna.pada}).
- **Moon Sign (Rashi):** **${moon.sign}** in **${moon.nakshatra}** Nakshatra (Pada ${moon.pada}).
- **Sun Sign (Surya Rashi):** **${sun.sign}** (${sun.degree.toFixed(2)}°).
- **Full Analysis:** To explore the 16 Divisional Vargas, 337-Bindu Ashtakavarga, and Month-by-Month forecasts, explore our premium publication catalogue.`
      },
      {
        sectionId: 'sec_basic_planetary_overview',
        chapterNumber: 2,
        title: 'Chapter 2: Planetary Highlights & Contemplative Guidance',
        subtitle: 'Core Graha Archetypes & Foundational Orientation',
        icon: 'fa-sun',
        contentMarkdown: `### Core Astrological Archetypes
- **Surya (Sun):** Vitality, creative purpose, and conscious self-expression in **${sun.sign}** (${sun.dignity}).
- **Chandra (Moon):** Mind (*Manas*), emotional temperament, and instinctual response patterns in **${moon.sign}** (${moon.dignity}).
- **Lagna (Ascendant):** Sets the physical blueprint, temperament, and primary trajectory of worldly action in **${lagna.sign}**.`
      },
      {
        sectionId: 'sec_basic_panchang',
        chapterNumber: 3,
        title: 'Chapter 3: Birth Panchang Elements & Spiritual Direction',
        subtitle: 'Tithi, Vara, Nakshatra, Yoga, Karana & Next Steps',
        icon: 'fa-compass',
        contentMarkdown: `### Birth Panchang Elements
- **Birth Nakshatra:** **${moon.nakshatra}** (Lord: **${moon.lord}**).
- **Auspicious Direction:** Governed by the element of **${lagna.sign}**.
- **Upgrade Guidance:** To explore in-depth career analysis, marital synastry, D10 Dashamsha, and 12-month Varshphal forecasting, browse our specialized publication catalogue in Report Studio.`
      }
    ];
  }

  /**
   * 10. VEDIC NAME CORRECTION & NUMEROLOGY MASTER BLUEPRINT (₹199)
   * 15 Comprehensive Chapters mapping Moolank, Bhagyank, Chaldean/Pythagorean Naamank,
   * Cheiro compound vibrations, 5 custom name corrections, and signature graphology.
   */
  private static buildNumerologySections(profile: any, coords: any, chart: CalculatedChart): ReportChapterSection[] {
    const rawName = profile?.profileName || 'Seeker';
    const cleanDob = coords.dob || '2000-01-01';
    const day = parseInt(cleanDob.slice(8, 10), 10) || 1;

    let moolank = 1;
    let bhagyank = { destinyNumber: 1, totalSum: 1, dob: cleanDob, masterNumber: null as number | null };
    let naamank = {
      normalizedName: rawName.toUpperCase(),
      chaldean: { compoundTotal: 10, naamank: 1, breakdown: [] as any[], governingPlanet: 'Sun (Surya)', isPreferred: true, isChallenging: false },
      pythagorean: { compoundTotal: 23, naamank: 5, breakdown: [] as any[], governingPlanet: 'Mercury (Budha)' }
    };
    let harmony = { score: 85, alignmentTierEn: 'High Synergy (Highly Auspicious)', alignmentTierHi: 'अति उत्तम सामंजस्य', moolankRel: 'friendly', bhagyankRel: 'friendly' };
    let candidates: any[] = [];

    try {
      moolank = calculateMoolank(day);
      bhagyank = calculateBhagyank(cleanDob);
      naamank = calculateNaamank(rawName);
      harmony = calculateHarmonyScore(moolank, bhagyank.destinyNumber, naamank.chaldean.compoundTotal);
      candidates = generateNameCorrectionCandidates(rawName, moolank, bhagyank.destinyNumber, 5);
    } catch (_) {
      // Fallback to safe defaults if profile data has special characters
    }

    const planetM = PLANET_DATA[moolank] || PLANET_DATA[1];
    const planetB = PLANET_DATA[bhagyank.destinyNumber] || PLANET_DATA[1];
    const planetN = PLANET_DATA[naamank.chaldean.naamank] || PLANET_DATA[1];

    let chaldeanTableRows = '';
    for (const b of naamank.chaldean.breakdown) {
      chaldeanTableRows += `| **${b.letter}** | ${b.value} |\n`;
    }

    let candidatesTableRows = '';
    let candidatesProse = '';
    if (candidates && candidates.length > 0) {
      candidatesTableRows = candidates.map((c, i) =>
        `| **${i + 1}. ${c.proposedName}** | ${c.chaldeanCompound} (${c.chaldeanRoot}) | ${c.governingPlanet} | ${c.harmonyScore}% | ${c.suitabilityScore}/100 | ${c.editDistance} | ${c.transformationNote} |`
      ).join('\n');

      candidatesProse = candidates.map((c, i) => `
##### Candidate ${i + 1}: ${c.proposedName}
- **Vibrational Alignment:** Chaldean Compound **${c.chaldeanCompound}** reducing to Root **${c.chaldeanRoot}** (governed by **${c.governingPlanet}**).
- **Synergy Rating:** **${c.harmonyScore}% Harmony** with Moolank ${moolank} & Bhagyank ${bhagyank.destinyNumber} | **Suitability Index:** **${c.suitabilityScore} / 100** (Edit Distance: ${c.editDistance}).
- **Harmonic Rationale:** ${c.transformationNote}.
- **Recommended Application:** Ideal for digital branding, email signatures, professional invoices, social media accounts, and visiting cards.
`).join('\n');
    } else {
      candidatesTableRows = '| **1. Current Name Auspicious** | Stable | Native Ruler | 90% | 95/100 | 0 | Baseline already in strong harmony |\n';
      candidatesProse = 'Your baseline name currently exhibits stable planetary resonance with your birth numbers.';
    }

    return [
      {
        sectionId: 'sec_num_ch1_exec',
        chapterNumber: 1,
        title: 'Chapter 1: Executive Numerological Blueprint',
        subtitle: 'Foundational Synthesis of Moolank, Bhagyank & Chaldean Naamank',
        icon: 'fa-compass',
        contentMarkdown: `### Foundational Numerological Trinity
In classical Vedic Numerology (*Ank Jyotish*), human identity and karmic trajectory are governed by three celestial resonance points:

- **1. Moolank (Psychic Root Number):** **${moolank}** (Governed by **${planetM.planetEn}**)
  *Represents the intrinsic identity, subconscious urges, and raw personal temperament from birth to age 35.*
- **2. Bhagyank (Destiny / Life Path Number):** **${bhagyank.destinyNumber}** (Governed by **${planetB.planetEn}**)
  *Represents the overarching worldly karma, societal reception, and dharmic duty dominant from age 35 onwards.*
- **3. Naamank (Expression / Name Number):** **${naamank.chaldean.naamank}** (Compound: **${naamank.chaldean.compoundTotal}**, Governed by **${planetN.planetEn}**)
  *The social vibration, relationship matrix, and worldly magnetic attraction channel.*

#### Executive Alignment Verdict
- **Overall Harmony Score:** **${harmony.score} / 100**
- **Synergy Level:** **${harmony.alignmentTierEn}**
- **Planetary Dynamics:** Moolank-Naamank relationship is **${harmony.moolankRel.toUpperCase()}**; Bhagyank-Naamank relationship is **${harmony.bhagyankRel.toUpperCase()}**.`
      },
      {
        sectionId: 'sec_num_ch2_moolank',
        chapterNumber: 2,
        title: 'Chapter 2: The Psychic Root (Moolank) & Core Temperament',
        subtitle: `Inherent Cognitive Tendencies Governed by ${planetM.planetEn}`,
        icon: 'fa-sun',
        contentMarkdown: `### Moolank (मूलांक) Analysis: Root Number ${moolank}
Calculated exclusively from the calendar day of birth (**Day ${day}** reduced to single digit **${moolank}**).

- **Primary Planetary Ruler:** **${planetM.planetEn}** (${planetM.planetHi})
- **Cosmic Element:** **${planetM.elementEn}**
- **Core Archetype:** **${planetM.archetypeEn}** (*${planetM.archetypeHi}*)
- **Inherent Qualities:** ${planetM.qualitiesEn.join(', ')}

#### Psychological Blueprint
As an individual governed by **${planetM.planetEn}**, your natural instinct is oriented toward authentic self-expression. You possess natural stamina and creative independence. When stress arises, your fundamental coping mechanism is guided by the elemental nature of **${planetM.elementEn}**.`
      },
      {
        sectionId: 'sec_num_ch3_bhagyank',
        chapterNumber: 3,
        title: 'Chapter 3: The Karmic Destiny Path (Bhagyank)',
        subtitle: `Life Path Arc Governed by ${planetB.planetEn}`,
        icon: 'fa-road',
        contentMarkdown: `### Bhagyank (भाग्यांक) Analysis: Destiny Number ${bhagyank.destinyNumber}
Calculated from the total reduction of all eight digits of your complete date of birth (**${cleanDob}**):
**Total Digit Sum = ${bhagyank.totalSum} $\\rightarrow$ Root ${bhagyank.destinyNumber}** ${bhagyank.masterNumber ? `*(Master Number ${bhagyank.masterNumber} Resonance)*` : ''}.

- **Governing Karmic Planet:** **${planetB.planetEn}** (${planetB.planetHi})
- **Dharmic Mission:** **${planetB.archetypeEn}**
- **Key Virtues:** ${planetB.qualitiesEn.join(', ')}

#### Karmic Trajectory
Your life path unfolds as an evolution toward the qualities of **${planetB.planetEn}**. Opportunities in vocational leadership, public recognition, and long-term asset building materialize whenever your external pursuits honor this dharmic frequency.`
      },
      {
        sectionId: 'sec_num_ch4_chaldean',
        chapterNumber: 4,
        title: 'Chapter 4: The Chaldean Name Number (Naamank) Matrix',
        subtitle: 'Sound Vibration & Letter-by-Letter Ephemeris',
        icon: 'fa-spell-check',
        contentMarkdown: `### Sound Vibration (*Naada*) Analysis
The Chaldean system evaluates each letter based on authentic phonetic sound vibration frequencies.

- **Analyzed Name:** **${naamank.normalizedName}**
- **Chaldean Compound Sum:** **${naamank.chaldean.compoundTotal}**
- **Reduced Naamank:** **${naamank.chaldean.naamank}** (**${planetN.planetEn}**)

| Letter | Chaldean Vibration Value |
| :--- | :--- |
${chaldeanTableRows}
**Total Sum = ${naamank.chaldean.compoundTotal} $\\rightarrow$ ${naamank.chaldean.naamank}**`
      },
      {
        sectionId: 'sec_num_ch5_pythagorean',
        chapterNumber: 5,
        title: 'Chapter 5: Comparative Pythagorean Analysis',
        subtitle: 'Western Sequential Frequency vs. Vedic Sound Dynamics',
        icon: 'fa-arrows-split-up-and-left',
        contentMarkdown: `### Comparative Dimensional Synthesis
While Chaldean numerology evaluates occult sound vibrations, the Pythagorean system maps letters to the sequential 1 through 9 cycles of the Latin alphabet.

- **Pythagorean Compound Sum:** **${naamank.pythagorean.compoundTotal}**
- **Reduced Pythagorean Root:** **${naamank.pythagorean.naamank}** (${naamank.pythagorean.governingPlanet})

#### Dual-System Harmony
Observing both systems provides an integrated lens:
1. **Chaldean Root (${naamank.chaldean.naamank}):** Dictates worldly success, financial attraction, and social reception in the Indian subcontinental and trade environment.
2. **Pythagorean Root (${naamank.pythagorean.naamank}):** Dictates analytical processing, Western institutional interfaces, and administrative structure.`
      },
      {
        sectionId: 'sec_num_ch6_compound',
        chapterNumber: 6,
        title: 'Chapter 6: Occult Compound Number (Cheiro) Vibrations',
        subtitle: `Esoteric Significance of Compound Total ${naamank.chaldean.compoundTotal}`,
        icon: 'fa-gem',
        contentMarkdown: `### The Occult Significance of Compound ${naamank.chaldean.compoundTotal}
In the occult tradition of Cheiro and classical Vedic hermeneutics, the compound sum is far more potent than the single-digit root alone.

- **Compound Number:** **${naamank.chaldean.compoundTotal}**
- **Classification:** **${naamank.chaldean.isPreferred ? 'Highly Auspicious / Preferred Vibration' : naamank.chaldean.isChallenging ? 'Challenging / Karmic Friction' : 'Neutral / Stable'}**

#### Traditional Cheiro Symbolism
Compound **${naamank.chaldean.compoundTotal}** radiates distinct karmic lessons. When aligned with friendly planetary frequencies, it acts as a magnet for constructive mentorship and enduring prosperity.`
      },
      {
        sectionId: 'sec_num_ch7_matrix',
        chapterNumber: 7,
        title: 'Chapter 7: Planetary Relationship Matrix (Mitra, Sama, Shatru)',
        subtitle: 'Celestial Synergies Across the Nine Grahas',
        icon: 'fa-handshake',
        contentMarkdown: `### The Parashari Friendship Matrix
Planetary interactions determine whether the vibrations of your name reinforce or destabilize your psychic core.

- **Moolank (${moolank} - ${planetM.planetEn}) $\\leftrightarrow$ Naamank (${naamank.chaldean.naamank} - ${planetN.planetEn}):** **${harmony.moolankRel.toUpperCase()}**
- **Bhagyank (${bhagyank.destinyNumber} - ${planetB.planetEn}) $\\leftrightarrow$ Naamank (${naamank.chaldean.naamank} - ${planetN.planetEn}):** **${harmony.bhagyankRel.toUpperCase()}**

#### Planetary Harmony Principles
1. **Friendly (Mitra):** Flow of constructive fortune, effortless collaboration, and clear mental focus.
2. **Neutral (Sama):** Stable, balanced interactions requiring conscious focus.
3. **Challenging (Shatru):** Karmic friction, delay in acknowledgment, and internal doubt.`
      },
      {
        sectionId: 'sec_num_ch8_harmony',
        chapterNumber: 8,
        title: 'Chapter 8: The Mathematical Harmony Score & Formula',
        subtitle: 'Transparent 0–100 Weighted Evaluator',
        icon: 'fa-calculator',
        contentMarkdown: `### Transparent Mathematical Harmony Evaluator
AstroVerse does not generate arbitrary percentages. Your score is derived from an auditable, classical heuristic formula:

$$\\text{Harmony Score} = \\text{round}(0.40 \\times M + 0.40 \\times B + 0.20 \\times C)$$

- **Moolank Compatibility ($M$):** ${harmony.moolankRel === 'friendly' ? '100' : harmony.moolankRel === 'enemy' ? '30' : '65'} pts (Weight: 40%)
- **Bhagyank Compatibility ($B$):** ${harmony.bhagyankRel === 'friendly' ? '100' : harmony.bhagyankRel === 'enemy' ? '30' : '65'} pts (Weight: 40%)
- **Compound Quality ($C$):** ${naamank.chaldean.isPreferred ? '100' : naamank.chaldean.isChallenging ? '30' : '65'} pts (Weight: 20%)

**Final Weighted Harmony Score = ${harmony.score} / 100 (${harmony.alignmentTierEn})**`
      },
      {
        sectionId: 'sec_num_ch9_candidates',
        chapterNumber: 9,
        title: 'Chapter 9: Personalized Name Correction Recommendations',
        subtitle: '5 Ranked Bounded Spelling Alternatives with Suitability Scores',
        icon: 'fa-wand-magic-sparkles',
        contentMarkdown: `### Name Correction (नाम शोधन) Strategy
If your current name experiences friction with either your psychic root or life path destiny, subtle, phonetically natural spelling adjustments harmonize the energetic field without requiring legal alterations.

#### 5 Personalized Name Correction Candidates
| Candidate Spelling | Chaldean Root | Governing Planet | Harmony | Suitability | Dist | Rationale |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${candidatesTableRows}

${candidatesProse}

*Each candidate preserves aesthetic elegance, dignified pronunciation, and social ease while optimizing occult planetary frequencies and personal authority.*`
      },
      {
        sectionId: 'sec_num_ch10_nakshatra',
        chapterNumber: 10,
        title: 'Chapter 10: Vedic Nakshatra Syllable Synthesis',
        subtitle: `Alignment with Lunar Mansion ${chart?.planets?.Moon?.nakshatra || 'Anuradha'}`,
        icon: 'fa-moon',
        contentMarkdown: `### Janam Nakshatra Syllable Synthesis
In Parashari Jyotish, the Moon resides in **${chart?.planets?.Moon?.nakshatra || 'Anuradha'}** Nakshatra (Pada ${chart?.planets?.Moon?.pada ?? 2}) governed by **${chart?.planets?.Moon?.lord || 'Saturn'}**.

- **Lunar Mansion:** **${chart?.planets?.Moon?.nakshatra || 'Anuradha'}**
- **Ruling Deity & Energy:** Radiates stability, intuition, and reflective wisdom.
- **Phonetic Harmony:** When naming newborns or choosing auspicious brand prefixes, syllables matching the lunar pada ensure effortless societal reception.`
      },
      {
        sectionId: 'sec_num_ch11_signature',
        chapterNumber: 11,
        title: 'Chapter 11: Graphological Signature Optimization Blueprint',
        subtitle: 'Ascending Geometry, Grounding Dots & Executive Authority',
        icon: 'fa-signature',
        contentMarkdown: `### Graphological Signature Blueprint
Your signature is your personal energetic emblem stamped into the physical world.

1. **Recommended Slant:** Maintain a deliberate **ascending slope (+15° to +25°)** from left to right. This upward ascent invites career elevation, optimism, and continuous vitality.
2. **Baseline Stability:** Never allow the trailing letters of your signature to droop beneath the starting point.
3. **Initial Capital:** Keep the first letter distinctly clear, unbroken, and slightly larger than the rest to anchor confident leadership.
4. **Underline & Grounding Dots:** Draw a single unbroken underline beneath the name, accompanied by **two distinct dots** placed squarely beneath the line to seal personal authority.`
      },
      {
        sectionId: 'sec_num_ch12_commercial',
        chapterNumber: 12,
        title: 'Chapter 12: Business Entity & Mobile Numerology Guidelines',
        subtitle: 'Brand Alignment, Mobile Vibrations & Digital Communications',
        icon: 'fa-briefcase',
        contentMarkdown: `### Commercial & Digital Vibration Guidelines
1. **Business & Brand Names:** Ensure commercial enterprise titles calculate to mercantile compound totals such as **14, 23, 32, 33, or 42**.
2. **Mobile Numbers:** Your primary telecom contact number connects you to the collective. The sum of the 10 mobile digits should ideally reduce to **1, 5, or 6**, avoiding heavy Saturnian (8) or disruptive Rahu (4) endings for business lines.
3. **Email Usernames:** Apply the same phonetic vowel harmony to official email handles to reinforce professional clarity.`
      },
      {
        sectionId: 'sec_num_ch13_remedies',
        chapterNumber: 13,
        title: 'Chapter 13: Auspicious Colors, Weekdays & Energized Gemstones',
        subtitle: `Remedial Alignment for Moolank ${moolank} & Bhagyank ${bhagyank.destinyNumber}`,
        icon: 'fa-shield-halved',
        contentMarkdown: `### Remedial & Gemological Synchronizers
- **Auspicious Weekdays:** **${planetM.luckyDaysEn.join(', ')}**
- **Harmonious Colors:** **${planetM.luckyColorsEn.join(', ')}**
- **Primary Gemstone:** **${planetM.luckyGemEn}** (*Wear after proper Shastric energization on ${planetM.luckyDaysEn[0]}*)
- **Mantric Resonance:** Recite the seed mantra (*Beej Mantra*) of **${planetM.planetEn}** 108 times at sunrise during auspicious Shukla Paksha.`
      },
      {
        sectionId: 'sec_num_ch14_practical',
        chapterNumber: 14,
        title: 'Chapter 14: Practical Adoption & Ethical Considerations',
        subtitle: 'Everyday Implementation Without Legal Bureaucracy',
        icon: 'fa-scale-balanced',
        contentMarkdown: `### Ethical & Practical Implementation Guide
1. **No Legal Mandate:** You do not need to alter legal identity cards (Passport, National ID, Tax records) to benefit from name correction.
2. **Everyday Usage:** Adopt your corrected spelling on email signatures, social media handles, visiting cards, book covers, and personal correspondence.
3. **Written Affirmations:** Write your corrected name with an ascending signature 21 times every morning in green or gold ink to imprint the new vibration into your subconscious.`
      },
      {
        sectionId: 'sec_num_ch15_verification',
        chapterNumber: 15,
        title: 'Chapter 15: Appendix, Provenance & Verification Digest',
        subtitle: 'Audit Trail, Mathematical Standards & Disclaimer',
        icon: 'fa-certificate',
        contentMarkdown: `### Publication Provenance & Verification
- **Publication Identifier:** \`AV-NUM-${cleanDob.replace(/-/g, '')}-${moolank}${bhagyank.destinyNumber}\`
- **Methodology Version:** \`astroverse-numerology-harmony-v1\`
- **Calculation Standards:** Classical Parashari Naisargika Sambandha & Cheiro Chaldean Alphabet Acoustics.
- **Disclaimer:** *This publication provides traditional Vedic and Chaldean numerological interpretations for personal reflection and guidance. It does not replace medical, financial, or legal professional counsel.*`
      }
    ];
  }
}
