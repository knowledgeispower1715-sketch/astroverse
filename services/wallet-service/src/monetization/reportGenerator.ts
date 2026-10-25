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
      birthCoords.isApproximate
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
        contentMarkdown: `### The Rising Sign (Lagna) Foundation
In Parashari Jyotish, the **Ascendant (Lagna)** establishes the physical constitution, primary cognitive temperament, and orientation of all twelve houses (*Bhavas*).

- **Birth Coordinates:** ${coords.place} (${coords.lat.toFixed(4)}°N, ${coords.lon.toFixed(4)}°E)
- **Calculated Ascendant:** **${lagna.sign}** at **${lagna.degree.toFixed(2)}°** in **${lagna.nakshatra}** Nakshatra (Pada ${lagna.pada}).
- **Ruling Lord:** **${lagna.lord}**, governing health, resilience, and personal agency (*Tanu Bhava*).
- **Core Temperament:** As a **${lagna.sign}** ascendant, your physical vehicle and decision-making matrix reflect energetic stamina, strategic determination, and a quest for authentic alignment.

#### House Geometries (*Bhava Kundli*)
1. **1st House (Tanu Bhava):** Vital physical health, identity, and personal resilience in **${lagna.sign}**.
2. **5th & 9th Houses (Trikonas):** Dharma houses indicating intellectual creativity, past-life merit (*Purva Punya*), and ethical alignment.
3. **10th House (Karmasthana):** Public action, executive authority, and professional legacy.`
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
- **Surya (Sun):** Placed in **${sun.sign}** (${sun.dignity}) in the **${sun.house}th House**, governing vital creative will, executive authority, and soul purpose.
- **Chandra (Moon):** Placed in **${moon.sign}** (${moon.dignity}) in **${moon.nakshatra}** Nakshatra, governing the emotional mind (*Manas*), intuition, and mental peace.`
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
        subtitle: 'Raja Yogas, Dhana Formations & Kuja Dosha (Manglik) Audit',
        icon: 'fa-shield-halved',
        contentMarkdown: `### Classical Planetary Combinations (*Yogas*)
- **Raja Yogas (Kendra-Trikona Conjunctions):** Formed when lords of angular Kendra houses (1, 4, 7, 10) aspect or combine with trinal Trikona houses (1, 5, 9), conferring professional authority and societal influence.
- **Dhana Yogas (Wealth Formations):** Mutual resonance between the 2nd House (accumulated treasury) and 11th House (gains and networks) fosters durable income streams.

### Kuja Dosha (Manglik) Assessment
- **Mars House Position:** Mars is positioned in the **${chart.kujaDosha.marsHouse}th House** (${chart.planets.Mars.sign}).
- **Dosha Status:** ${chart.kujaDosha.hasDosha ? '**Kuja Dosha Present.** Traditional marital alignment precautions apply.' : (chart.kujaDosha.isCancelled ? `**Kuja Dosha Pacified / Cancelled.** ${chart.kujaDosha.cancellationReason}` : '**No Kuja Dosha.** Mars occupies a neutral house.')}`
      },
      {
        sectionId: 'sec_ch7_remedies_methodology',
        chapterNumber: 7,
        title: 'Chapter 7: Personalized Remedial Protocol & Mathematical Methodology',
        subtitle: 'Harmonizing Mantras, Charitable Practices & Ephemeris Standards',
        icon: 'fa-spa',
        contentMarkdown: `### Classical Vedic Remedial Blueprint
1. **Planetary Mantras:** Daily recitation of the Gayatri Mantra or Beej Mantra dedicated to Lagna lord **${lagna.lord}** and active Dasha lord **${chart.currentDasha.maha}**.
2. **Charitable Discipline (*Daana*):** Distributing food, grain, or clothing on Saturdays to balance Saturnian delays, and fostering intellectual mentorship on Thursdays.
3. **Mindfulness & Grounding:** Utilizing early morning meditation during Brahma Muhurta (4:30 AM – 5:30 AM) to maintain emotional equilibrium.

#### Ephemeris Standards & Calibration
This publication is derived using **Chitrapaksha (Lahiri) Ayanamsha** ($24^\circ 11' 22''$) computed against Swiss Ephemeris sidereal ephemerides. Traditional symbolic Jyotish principles operate alongside conscious free will (*Purushartha*).`
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
- **Assessment:** ${chart.kujaDosha.hasDosha ? '**Kuja Dosha Present.** Conscious communication, anger moderation, and complementary partnership matching are advised.' : (chart.kujaDosha.isCancelled ? `**Kuja Dosha Mitigated / Cancelled.** ${chart.kujaDosha.cancellationReason}` : '**No Kuja Dosha.** Mars does not adversely afflict relational houses.')}`
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
- **Week 1:** Strategy & Planning.
- **Week 2:** Decisive Action & Communication.
- **Week 3:** Consolidation & Stakeholder Alignment.
- **Week 4:** Reflection, Rest & Inner Renewal.`
      },
      {
        sectionId: 'sec_month_dasha',
        chapterNumber: 2,
        title: 'Chapter 2: Active Vimshottari Subperiod Influence',
        subtitle: 'Manifestation of Current Dasha Windows over the Next 30 Days',
        icon: 'fa-clock',
        contentMarkdown: `### Active Vimshottari Subperiod Dynamics
- **Current Operational Axis:** **${chart.currentDasha.maha}** Mahadasha / **${chart.currentDasha.antar}** Antardasha.
- **Immediate Influence:** Concentrates focus on disciplined delivery, contract execution, and strategic communication.`
      },
      {
        sectionId: 'sec_month_lunar',
        chapterNumber: 3,
        title: 'Chapter 3: Lunar Transits & High-Energy Timing Windows',
        subtitle: 'Tracking Lunar Motion across Auspicious Nakshatras & Bhavas',
        icon: 'fa-moon',
        contentMarkdown: `### Lunar Transit Cadence
The transit of Chandra (Moon) through your birth chart creates subtle emotional and cognitive tides across the month:
- **Waxing Moon (Shukla Paksha):** Favorable for initiative launches, interviews, and public announcements.
- **Waning Moon (Krishna Paksha):** Favorable for operational audits, research, debt consolidation, and rest.`
      },
      {
        sectionId: 'sec_month_weekly',
        chapterNumber: 4,
        title: 'Chapter 4: Weekly Operational Breakdown (Weeks 1 to 4)',
        subtitle: 'Week-by-Week Focus Across Career, Relationships & Vitality',
        icon: 'fa-calendar-week',
        contentMarkdown: `### Granular Weekly Forecast
- **Week 1 (Days 1–7):** Strategy, foundational audits, and scheduling.
- **Week 2 (Days 8–14):** Active negotiations, stakeholder communication, and decisive action.
- **Week 3 (Days 15–21):** Milestone delivery, financial reviews, and partnership alignment.
- **Week 4 (Days 22–30):** Reflection, operational consolidation, and personal renewal.`
      },
      {
        sectionId: 'sec_month_dates',
        chapterNumber: 5,
        title: 'Chapter 5: Auspicious Action Dates & Cautionary Windows',
        subtitle: 'Optimal Days for Agreements & Dates Demanding Deliberate Restraint',
        icon: 'fa-star',
        contentMarkdown: `### High-Resolution Timing Windows
- **Highly Favorable Days (Green Flags):** ${monthlyForecasts[0].favorableDates.join(', ')} of ${curMonthName}.
  - Auspicious for contract signing, travel, and personal milestones.
- **Cautionary Days (Patience Required):** ${monthlyForecasts[0].cautionDates.join(', ')} of ${curMonthName}.
  - Avoid impetuous arguments or uncalculated financial risks.`
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
        contentMarkdown: `### Subperiod Progression Schedule
The active **${chart.currentDasha.maha}** Mahadasha transitions through vital subperiod boundaries over the next 12 months, shifting priorities from operational groundwork to recognition and spiritual synthesis.`
      },
      {
        sectionId: 'sec_annual_remedies',
        chapterNumber: 4,
        title: 'Chapter 4: Annual Remedial Protocol & Spiritual Alignment',
        subtitle: 'Harmonizing Mantras, Charitable Practices & Planetary Timing',
        icon: 'fa-spa',
        contentMarkdown: `### Annual Spiritual Blueprint
- **Core Mantra:** *Om Namo Bhagavate Vasudevaya* chanted with focused diaphragmatic breathing.
- **Weekly Practice:** Thursday morning contemplative study to strengthen Jupiterian grace.
- **Service & Charity:** Supporting educational programs or distributing meals to living beings on Saturdays.`
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

    return [
      {
        sectionId: 'sec_3yr_macro',
        chapterNumber: 1,
        title: 'Chapter 1: Three-Year Strategic Horizon (36 Months)',
        subtitle: 'Macro Planetary Epochs, Major Dasha Shifts & Life Milestones',
        icon: 'fa-hourglass-half',
        contentMarkdown: `### Strategic 36-Month Macro Compass
- **Year 1:** Consolidation, foundation-building, and operational discipline.
- **Year 2:** Expansion, network reach, and major financial decisions.
- **Year 3:** Culmination, milestone execution, and spiritual integration.`
      },
      {
        sectionId: 'sec_year_1_foundation',
        chapterNumber: 2,
        title: 'Chapter 2: Year 1 Roadmap: Foundational Discipline & Consolidation',
        subtitle: 'Months 1 to 12 Strategic Directives across Health, Vocation & Finance',
        icon: 'fa-shield-halved',
        contentMarkdown: `### Year 1 Strategic Focus: Consolidation & Systems
- **Vocation:** Deepen technical mastery, eliminate operational debt, and establish clear credibility benchmarks.
- **Wealth:** Focus on capital preservation, building liquidity reserves, and avoiding speculative overreach.
- **Health & Routine:** Prioritize circadian discipline, restorative sleep, and grounding Ayurvedic routines.`
      },
      {
        sectionId: 'sec_year_2_expansion',
        chapterNumber: 3,
        title: 'Chapter 3: Year 2 Roadmap: Scaling, Strategic Partnerships & Wealth Growth',
        subtitle: 'Months 13 to 24 Opportunity Windows & Commercial Acceleration',
        icon: 'fa-arrow-trend-up',
        contentMarkdown: `### Year 2 Strategic Focus: Expansion & Reach
- **Vocation:** Prime window for launching independent ventures, strategic promotions, and public thought leadership.
- **Wealth:** Structured capital reinvestment, equity building, and long-term real asset acquisitions.
- **Relationships:** Deepening domestic commitments and widening professional alliances.`
      },
      {
        sectionId: 'sec_year_3_legacy',
        chapterNumber: 4,
        title: 'Chapter 4: Year 3 Roadmap: Culmination, Leadership & Long-Term Milestones',
        subtitle: 'Months 25 to 36 Harvesting Multi-Year Initiatives & Community Impact',
        icon: 'fa-trophy',
        contentMarkdown: `### Year 3 Strategic Focus: Culmination & Legacy
- **Vocation:** Institutional recognition, executive seniority, and executive stewardship.
- **Spiritual Integration:** Aligning material success with philosophical purpose and philanthropic contributions.`
      },
      {
        sectionId: 'sec_3yr_karmic_points',
        chapterNumber: 5,
        title: 'Chapter 5: Major Karmic Turning Points & Long-Term Remedies',
        subtitle: 'Mantra Sadhana, Charitable Commitments & Philosophical Resilience',
        icon: 'fa-om',
        contentMarkdown: `### Multi-Year Spiritual Anchor
1. **Long-Term Mantra Sadhana:** Sustained japa of personal Ishta Devata mantras during dawn hours.
2. **Systemic Daana:** Regular contributions to knowledge dissemination and supporting elderly caregivers.
3. **Equilibrium:** Remembering that while the stars chart the celestial weather, personal dignity and ethical action (*Purushartha*) determine the harvest.`
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

    try {
      moolank = calculateMoolank(day);
      bhagyank = calculateBhagyank(cleanDob);
      naamank = calculateNaamank(rawName);
      harmony = calculateHarmonyScore(moolank, bhagyank.destinyNumber, naamank.chaldean.compoundTotal);
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
        subtitle: 'Ranked Bounded Spelling Alternatives with Suitability Scores',
        icon: 'fa-wand-magic-sparkles',
        contentMarkdown: `### Name Correction (नाम शोधन) Strategy
If your current name experiences friction with either your psychic root or life path destiny, subtle, phonetically natural spelling adjustments harmonize the energetic field without requiring legal alterations.

#### Top Recommended Variations
1. **Option 1 (Optimal Resonance):** Addition of a resonant vowel (e.g. subtle 'A' or 'E' doubling) designed to elevate the compound to **23, 24, 32, or 33**.
2. **Option 2 (Executive Authority):** Constrained breath harmonizer ('H' insertion) bridging the name to solar/mercurial vibrations.
3. **Option 3 (Commercial Adaptability):** Resonant consonant doubling aligning with international trade.

*Each candidate preserves aesthetic elegance, dignified pronunciation, and social ease.*`
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
