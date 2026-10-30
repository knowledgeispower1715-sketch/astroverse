/**
 * AstroVerse Central Monetization & Report Product Catalogue
 * Stores authoritative server-side prices in integer paise, subscription tier definitions,
 * feature entitlement mappings, and required calculation capabilities.
 */

export enum SubscriptionTier {
  FREE = 'FREE',
  PLUS = 'PLUS',
  PREMIUM = 'PREMIUM'
}

export enum BillingPeriod {
  MONTHLY = 'MONTHLY',
  ANNUAL = 'ANNUAL'
}

export interface SubscriptionPlanDefinition {
  tier: SubscriptionTier;
  displayName: string;
  tagline: string;
  monthlyPricePaise: number;
  monthlyPriceRupees: number;
  annualPricePaise: number;
  annualPriceRupees: number;
  maxProfiles: number;
  dailyAiLimit: number;
  allowedDivisionalCharts: string[];
  dashaDepth: 'basic' | 'detailed' | 'advanced';
  allowedTools: string[];
  reportDiscountPercent: number;
  hasPersonalizedReportReader: boolean;
  features: string[];
}

export interface ReportProductDefinition {
  productId: string;
  displayName: string;
  shortDescription: string;
  fullDescription: string;
  pricePaise: number;
  priceRupees: number;
  requiredProfileInputs: string[];
  requiredCapabilities: string[];
  includedSections: string[];
  forecastPeriod: '1_month' | '12_months' | '36_months' | null;
  supportedLanguages: string[];
  onlineReaderOnly: boolean;
  sampleOutline: { title: string; subtitle: string; icon: string }[];
  disclaimer: string;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlanDefinition> = {
  [SubscriptionTier.FREE]: {
    tier: SubscriptionTier.FREE,
    displayName: 'AstroVerse Essentials',
    tagline: 'Foundational Vedic chart insights with essential daily guidance.',
    monthlyPricePaise: 0,
    monthlyPriceRupees: 0,
    annualPricePaise: 0,
    annualPriceRupees: 0,
    maxProfiles: 1,
    dailyAiLimit: 3,
    allowedDivisionalCharts: ['D1'],
    dashaDepth: 'basic',
    allowedTools: [
      'calculate_kundli_d1',
      'calculate_panchang',
      'calculate_horas_24h'
    ],
    reportDiscountPercent: 0,
    hasPersonalizedReportReader: false,
    features: [
      '1 Active Birth Profile',
      'Basic Janam Kundli (D1 Rashi Chart)',
      'Planetary Longitudes & Ascendant (Lagna)',
      'Moon Sign & Birth Nakshatra',
      'Daily Vedic Panchang & Planetary Horas',
      'Basic Current Vimshottari Mahadasha',
      'Basic Moolank & Bhagyank Calculator (1 Name Preview)',
      '3 Substantive AI Astrologer questions / day',
      'Free Report Previews & Table of Contents'
    ]
  },
  [SubscriptionTier.PLUS]: {
    tier: SubscriptionTier.PLUS,
    displayName: 'AstroVerse Plus',
    tagline: 'Deepened Parashari insights, D9/D10 analysis & personal monthly forecasting.',
    monthlyPricePaise: 14900, // ₹149.00
    monthlyPriceRupees: 149,
    annualPricePaise: 129900, // ₹1,299.00 (~₹108/mo)
    annualPriceRupees: 1299,
    maxProfiles: 3,
    dailyAiLimit: 15,
    allowedDivisionalCharts: ['D1', 'D9', 'D10'],
    dashaDepth: 'detailed',
    allowedTools: [
      'calculate_kundli_d1',
      'calculate_navamsha_d9',
      'calculate_dashamsha_d10',
      'calculate_vimshottari_dasha',
      'identify_planetary_yogas',
      'analyze_doshas_and_remedies',
      'calculate_panchang',
      'calculate_horas_24h',
      'match_kundli_36_gunas',
      'calculate_numerology_full'
    ],
    reportDiscountPercent: 10,
    hasPersonalizedReportReader: true,
    features: [
      'Up to 3 Authorized Birth Profiles',
      'D9 Navamsha (Marriage/Spiritual) & D10 Dashamsha (Career)',
      'Detailed Vimshottari Dasha with Antardashas',
      'Expanded Raja & Dhana Yoga Identifications',
      'Dosha Diagnostics (Manglik, Sade Sati, Kaal Sarp)',
      'Ashtakoota 36-Guna Compatibility Synastry',
      'Full Chaldean & Pythagorean Numerology with 3 Name Checks / day',
      '15 Substantive AI Astrologer questions / day',
      '10% Member Discount on all Individual Reports',
      'Persistent Cloud Consultation History'
    ]
  },
  [SubscriptionTier.PREMIUM]: {
    tier: SubscriptionTier.PREMIUM,
    displayName: 'AstroVerse Premium',
    tagline: 'The complete Vedic suite: Shodashavarga D1–D60, Ashtakavarga, Shadbala & BTR.',
    monthlyPricePaise: 29900, // ₹299.00
    monthlyPriceRupees: 299,
    annualPricePaise: 249900, // ₹2,499.00 (~₹208/mo)
    annualPriceRupees: 2499,
    maxProfiles: 5,
    dailyAiLimit: 30,
    allowedDivisionalCharts: ['D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60'],
    dashaDepth: 'advanced',
    allowedTools: ['*'], // All 20 tools enabled
    reportDiscountPercent: 20,
    hasPersonalizedReportReader: true,
    features: [
      'Up to 5 Authorized Birth Profiles',
      'Complete Shodashavarga (16 Divisional Charts D1 through D60)',
      'Full Ashtakavarga (BAV & SAV 337-Bindu Matrix)',
      'Shadbala (Six-Fold Planetary Potency in Rupas)',
      'Planetary Avasthas & 11 Classical Upagrahas',
      'Muhurta & Tamil Pancha Pakshi Biorhythms',
      'Horary Prashna Tantra with Tajika Aspects',
      'Birth-Time Rectification (BTR) Scanning',
      'Full Vedic Name Correction Studio, Signature Blueprint & Audio Narration',
      '30 Substantive AI Astrologer questions / day',
      '20% Member Discount on all Individual Reports',
      'Ad-Free Private Online Report Reader with Watermark'
    ]
  }
};

export const REPORT_CATALOGUE: Record<string, ReportProductDefinition> = {
  'report_janam_kundli_deep_dive': {
    productId: 'report_janam_kundli_deep_dive',
    displayName: 'Complete Janam Kundli Deep Dive',
    shortDescription: 'Comprehensive 25+ page life blueprint analyzing Lagna, D1–D60, Ashtakavarga, Shadbala & Dashas.',
    fullDescription: 'The definitive classical analysis of your soul trajectory based on Brihat Parashara Hora Shastra. Synthesizes natal planetary geometries, 16 harmonic vargas, 337-Bindu Ashtakavarga vitality, planetary dignity scores, and multi-decade Vimshottari karmic periods.',
    pricePaise: 19900, // ₹199.00
    priceRupees: 199,
    requiredProfileInputs: ['birth_profile'],
    requiredCapabilities: ['ephemeris', 'divisional_charts', 'ashtakavarga', 'shadbala', 'dasha'],
    includedSections: [
      'birth_summary',
      'panchang_baseline',
      'lagna_bhava_analysis',
      'planetary_dignities',
      'shodashavarga_breakdown',
      'ashtakavarga_bindu_map',
      'shadbala_potency',
      'classical_yogas_doshas',
      'vimshottari_lifecycle_dasha',
      'remedial_guidance',
      'methodology_appendix'
    ],
    forecastPeriod: null,
    supportedLanguages: ['en', 'hi'],
    onlineReaderOnly: true,
    sampleOutline: [
      { title: 'Chapter 1: The Rising Sign & Vital Temperament', subtitle: 'Lagna Lordship & Physical Vitality', icon: 'fa-sun' },
      { title: 'Chapter 2: Planetary Coordinates & Dignity Table', subtitle: 'Exaltation, Combustion & Retrograde Velocity', icon: 'fa-table-cells' },
      { title: 'Chapter 3: Shodashavarga Harmonic Matrix', subtitle: 'D1 to D60 Harmonic Divisions', icon: 'fa-compass' },
      { title: 'Chapter 4: Ashtakavarga & House Vitality', subtitle: '337-Bindu Benefic Distribution', icon: 'fa-braille' },
      { title: 'Chapter 5: Vimshottari Dasha Karmic Timeline', subtitle: 'Active Cycles & Subperiods', icon: 'fa-clock' }
    ],
    disclaimer: 'Astrological interpretations represent traditional symbolic wisdom and contemplative reflection. They do not constitute deterministic life predictions or medical/legal guarantees.'
  },

  'report_career_education': {
    productId: 'report_career_education',
    displayName: 'Career & Education Report',
    shortDescription: 'In-depth analysis of 10th House, D10 Dashamsha, professional authority & promotion timing.',
    fullDescription: 'Focuses strictly on your professional calling, occupational strengths, executive leadership potential, and income streams. Evaluates the 10th House Karma Bhava, 2nd & 11th House Dhana wealth axes, and the D10 Dashamsha varga.',
    pricePaise: 14900, // ₹149.00
    priceRupees: 149,
    requiredProfileInputs: ['birth_profile'],
    requiredCapabilities: ['ephemeris', 'divisional_charts', 'dasha', 'yogas'],
    includedSections: [
      'career_potential_summary',
      '10th_house_lordship',
      'dashamsha_d10_breakdown',
      'dhana_yoga_financial_axes',
      'active_dasha_career_timeline',
      'optimal_industries_roles',
      'remedies_for_professional_obstacles'
    ],
    forecastPeriod: null,
    supportedLanguages: ['en', 'hi'],
    onlineReaderOnly: true,
    sampleOutline: [
      { title: '10th House Karmasthana Diagnostics', subtitle: 'Planets influencing the midheaven', icon: 'fa-briefcase' },
      { title: 'D10 Dashamsha Career Blueprint', subtitle: 'Harmonic confirmation of professional stature', icon: 'fa-award' },
      { title: 'Promotion & Transition Timing', subtitle: 'Vimshottari subperiod alignment', icon: 'fa-chart-line' }
    ],
    disclaimer: 'Career guidance is derived from classical astrological archetypes and should be paired with practical career planning.'
  },

  'report_relationship_marriage': {
    productId: 'report_relationship_marriage',
    displayName: 'Relationship & Marriage Report',
    shortDescription: '7th House Kalatra evaluation, D9 Navamsha partner archetypes & marital harmony guidance.',
    fullDescription: 'Explores the romantic and marital dimensions of your chart through the 7th House of Kalatra, Venusian dignity, Jupiterian blessings, and the D9 Navamsha chart. Identifies relationship patterns, timing of significant partnerships, and classical remedies.',
    pricePaise: 14900, // ₹149.00
    priceRupees: 149,
    requiredProfileInputs: ['birth_profile'],
    requiredCapabilities: ['ephemeris', 'divisional_charts', 'dasha', 'doshas'],
    includedSections: [
      'relationship_temperament',
      '7th_house_kalatra_analysis',
      'navamsha_d9_partner_nature',
      'manglik_dosha_evaluation',
      'marriage_timing_windows',
      'vedic_remedies_marital_harmony'
    ],
    forecastPeriod: null,
    supportedLanguages: ['en', 'hi'],
    onlineReaderOnly: true,
    sampleOutline: [
      { title: '7th House & Venusian Placements', subtitle: 'Inherent relational expectations and baseline', icon: 'fa-heart' },
      { title: 'D9 Navamsha Partner Dynamics', subtitle: 'Inner character of your lifelong spouse', icon: 'fa-ring' },
      { title: 'Manglik & Affliction Auditing', subtitle: 'Dosha evaluations and traditional cancellations', icon: 'fa-shield-halved' }
    ],
    disclaimer: 'Relationship guidance offers psychological and spiritual perspectives; it does not replace communication and mutual respect.'
  },

  'report_kundli_milan': {
    productId: 'report_kundli_milan',
    displayName: 'Detailed Kundli Milan (Astrological Synastry)',
    shortDescription: 'Full 36-Guna Ashtakoota synastry matrix with cross-chart D9 Navamsha compatibility software calculation.',
    fullDescription: 'Two-chart classical Vedic astrological synastry evaluation. Computes the 8 Kutas (Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi) out of 36 points, tests for Manglik mutual pacification, and checks D9 cross-ascendant resonance based strictly on user-provided astronomical birth coordinates. This is an educational software calculation, not a matrimonial matchmaking service.',
    pricePaise: 14900, // ₹149.00
    priceRupees: 149,
    requiredProfileInputs: ['primary_profile', 'partner_profile'],
    requiredCapabilities: ['compatibility', 'ephemeris', 'divisional_charts'],
    includedSections: [
      'ashtakoota_summary_score',
      '8_kuta_detailed_breakdown',
      'nadi_and_bhakoot_dosha_check',
      'mutual_manglik_synastry',
      'd9_navamsha_harmony',
      'astrological_counselor_verdict'
    ],
    forecastPeriod: null,
    supportedLanguages: ['en', 'hi'],
    onlineReaderOnly: true,
    sampleOutline: [
      { title: '36-Guna Total Score & Verdict', subtitle: 'Categorization into Auspicious, Moderate, or Challenging', icon: 'fa-scale-balanced' },
      { title: 'Nadi & Health Compatibility', subtitle: 'Genetic and biological harmony (8 Points)', icon: 'fa-dna' },
      { title: 'Bhakoot & Emotional Resonance', subtitle: 'Mutual lunar disposition (7 Points)', icon: 'fa-people-arrows' }
    ],
    disclaimer: 'Kundli Milan is an ancient astrological calculation measuring classical planetary harmony for two birth charts. AstroVerse AI is a specialized astrology software platform and does not provide dating, matrimonial matchmaking, or partner introduction services.'
  },

  'report_one_month_forecast': {
    productId: 'report_one_month_forecast',
    displayName: 'One-Month Personalized Forecast',
    shortDescription: 'High-resolution 30-day forecast integrating active Vimshottari Antardasha and transits.',
    fullDescription: 'A granular day-by-day and week-by-week analysis for the upcoming calendar month. Aligns your personal chart with lunar transits, planetary horas, and active Vimshottari subperiods to highlight opportune moments for decisions.',
    pricePaise: 4900, // ₹49.00
    priceRupees: 49,
    requiredProfileInputs: ['birth_profile'],
    requiredCapabilities: ['ephemeris', 'dasha', 'panchang_and_horas'],
    includedSections: [
      'month_overview_theme',
      'active_dasha_influence',
      'lunar_transit_windows',
      'weekly_focus_breakdown',
      'auspicious_dates_and_caution_days'
    ],
    forecastPeriod: '1_month',
    supportedLanguages: ['en', 'hi'],
    onlineReaderOnly: true,
    sampleOutline: [
      { title: 'Month Overview & Predominant Energy', subtitle: 'Governing planetary frequencies for the 30-day cycle', icon: 'fa-calendar-day' },
      { title: 'Weekly Milestone Trajectories', subtitle: 'Week 1 through Week 4 focus areas', icon: 'fa-calendar-week' },
      { title: 'Favorable Timing Windows', subtitle: 'Optimal days for contracts, travel, and personal milestones', icon: 'fa-star' }
    ],
    disclaimer: 'Monthly forecasts describe symbolic celestial weather; individual discretion and initiative always remain paramount.'
  },

  'report_twelve_month_varshphal': {
    productId: 'report_twelve_month_varshphal',
    displayName: 'Twelve-Month Varshphal & Forecast',
    shortDescription: 'Comprehensive annual roadmap analyzing all 12 upcoming calendar months individually.',
    fullDescription: 'Our premier annual forecast. Evaluates the solar return (Varshphal), active Vimshottari subperiods, and major slow-moving transits (Saturn, Jupiter, Rahu-Ketu) month by month across Career, Finance, Relationships, and Vitality.',
    pricePaise: 24900, // ₹249.00
    priceRupees: 249,
    requiredProfileInputs: ['birth_profile'],
    requiredCapabilities: ['ephemeris', 'dasha', 'ashtakavarga'],
    includedSections: [
      'annual_governing_archetype',
      'annual_transit_landscape',
      'vimshottari_progression',
      'month_by_month_chapters_1_to_12',
      'annual_remedial_protocol'
    ],
    forecastPeriod: '12_months',
    supportedLanguages: ['en', 'hi'],
    onlineReaderOnly: true,
    sampleOutline: [
      { title: 'Annual Celestial Climate', subtitle: 'Major Saturn, Jupiter & Nodal shifts over 12 months', icon: 'fa-globe' },
      { title: 'Months 1 to 4: Quarter 1 & 2 Trajectory', subtitle: 'Detailed monthly chapters with specific themes', icon: 'fa-list-ol' },
      { title: 'Months 5 to 12: Maturation & Culmination', subtitle: 'Second half harmonic progression and timing', icon: 'fa-chart-pie' }
    ],
    disclaimer: 'Annual forecasts provide philosophical timing perspectives rather than deterministic event guarantees.'
  },

  'report_three_year_roadmap': {
    productId: 'report_three_year_roadmap',
    displayName: 'Three-Year Personal Roadmap',
    shortDescription: 'Strategic 36-month macro horizon mapping major Dasha shifts and planetary transitions.',
    fullDescription: 'A multi-year strategic compass designed for life planning, major career moves, relocation, and long-term milestones. Analyzes major Vimshottari Mahadasha changes, Sade Sati phases, and Jupiterian transit cycles across 3 continuous years.',
    pricePaise: 49900, // ₹499.00
    priceRupees: 499,
    requiredProfileInputs: ['birth_profile'],
    requiredCapabilities: ['ephemeris', 'dasha', 'ashtakavarga'],
    includedSections: [
      '3_year_strategic_theme',
      'year_1_foundational_focus',
      'year_2_expansion_phase',
      'year_3_culmination_and_legacy',
      'major_karmic_turning_points'
    ],
    forecastPeriod: '36_months',
    supportedLanguages: ['en', 'hi'],
    onlineReaderOnly: true,
    sampleOutline: [
      { title: 'Macro Karmic Arc (Years 1–3)', subtitle: 'Overarching dasha transitions and planetary eras', icon: 'fa-hourglass-half' },
      { title: 'Major Life Milestone Windows', subtitle: 'Optimal horizons for property, career pivots & relationships', icon: 'fa-map-pin' },
      { title: 'Long-Term Spiritual Discipline', subtitle: 'Mantra and lifestyle practices for sustained harmony', icon: 'fa-om' }
    ],
    disclaimer: 'Multi-year roadmaps highlight macro archetypal cycles and should be used as reflective guidance.'
  },

  'report_bundle_kundli_varshphal': {
    productId: 'report_bundle_kundli_varshphal',
    displayName: 'Complete Kundli + Twelve-Month Forecast Bundle',
    shortDescription: 'Best-value bundle combining the 25+ page Janam Kundli Deep Dive and 12-Month Annual Varshphal.',
    fullDescription: 'Saves ₹99 compared to purchasing separately. Gives you both the lifetime foundational blueprint (Janam Kundli Deep Dive) and the high-resolution 12-Month Month-by-Month Annual Forecast.',
    pricePaise: 39900, // ₹399.00 (Separately ₹199 + ₹249 = ₹448)
    priceRupees: 399,
    requiredProfileInputs: ['birth_profile'],
    requiredCapabilities: ['ephemeris', 'divisional_charts', 'ashtakavarga', 'shadbala', 'dasha'],
    includedSections: [
      'complete_janam_kundli_sections',
      'twelve_month_varshphal_sections'
    ],
    forecastPeriod: '12_months',
    supportedLanguages: ['en', 'hi'],
    onlineReaderOnly: true,
    sampleOutline: [
      { title: 'Part I: Foundational Natal Blueprint', subtitle: 'Full Janam Kundli Deep Dive (Chapters 1–5)', icon: 'fa-book-open' },
      { title: 'Part II: 12-Month Annual Forecast', subtitle: 'Month-by-month analysis across 12 calendar months', icon: 'fa-calendar-days' },
      { title: 'Part III: Unified Remedial Synthesis', subtitle: 'Harmonized mantras and spiritual practices', icon: 'fa-spa' }
    ],
    disclaimer: 'Combines two authoritative reports into a single unified digital reader publication.'
  },

  'report_vedic_name_numerology': {
    productId: 'report_vedic_name_numerology',
    displayName: 'Vedic Name Correction & Numerology Master Blueprint',
    shortDescription: 'Exhaustive 15+ page personal numerology blueprint covering Moolank, Bhagyank, Chaldean Naamank, compound vibrations, 5 custom name variations, and signature analysis.',
    fullDescription: 'The definitive classical Vedic & Chaldean numerological publication. Unveils your psychic root (Moolank), karmic life path (Bhagyank), social expression number (Naamank), occult Cheiro compound vibration, planetary harmony matrix, 5 personalized name correction alternatives with suitability scores, signature graphology, and practical Shastric remedies.',
    pricePaise: 19900, // ₹199.00
    priceRupees: 199,
    requiredProfileInputs: ['birth_profile'],
    requiredCapabilities: ['numerology_engine'],
    includedSections: [
      'numerology_executive_summary',
      'numerology_moolank_psychic',
      'numerology_bhagyank_destiny',
      'numerology_chaldean_breakdown',
      'numerology_pythagorean_comparison',
      'numerology_compound_vibrations',
      'numerology_planetary_relationship_matrix',
      'numerology_harmony_score_formula',
      'numerology_name_corrections_candidates',
      'numerology_nakshatra_syllable_synthesis',
      'numerology_signature_alignment_blueprint',
      'numerology_business_mobile_guidance',
      'numerology_shastric_remedies_gemstones',
      'numerology_practical_adoption_ethics',
      'numerology_appendix_verification_digest'
    ],
    forecastPeriod: null,
    supportedLanguages: ['en', 'hi'],
    onlineReaderOnly: false,
    sampleOutline: [
      { title: 'Psychic Root & Destiny Blueprint', subtitle: 'Moolank & Bhagyank analysis', icon: 'fa-compass' },
      { title: 'Chaldean & Pythagorean Letter Matrix', subtitle: 'Letter-by-letter vibration breakdown', icon: 'fa-spell-check' },
      { title: 'Occult Compound Vibrations', subtitle: 'Cheiro double-digit power numbers', icon: 'fa-gem' },
      { title: '5 Bounded Name Correction Candidates', subtitle: 'Ranked spelling alternatives with suitability scores', icon: 'fa-wand-magic-sparkles' },
      { title: 'Signature Optimization & Graphology', subtitle: 'Ascending slope, underline & grounding dots', icon: 'fa-signature' },
      { title: 'Shastric Remedies & Auspicious Colors', subtitle: 'Colors, weekdays & energized gemstones', icon: 'fa-shield-halved' }
    ],
    disclaimer: 'Numerology interpretations are intended for personal guidance and spiritual reflection. Traditional name variations do not mandate legal name changes.'
  },

  'report_basic_chart_summary': {
    productId: 'report_basic_chart_summary',
    displayName: 'Basic Chart Summary',
    shortDescription: 'Free foundational summary of your D1 Ascendant, Moon sign, and planetary coordinates.',
    fullDescription: 'Always free for all registered and guest users. Summarizes your Nirayana Lagna, Sun and Moon positions, birth Nakshatra, and basic Panchang.',
    pricePaise: 0, // Free
    priceRupees: 0,
    requiredProfileInputs: ['birth_profile'],
    requiredCapabilities: ['ephemeris'],
    includedSections: [
      'birth_summary',
      'lagna_overview',
      'core_planetary_table',
      'panchang_elements'
    ],
    forecastPeriod: null,
    supportedLanguages: ['en', 'hi'],
    onlineReaderOnly: true,
    sampleOutline: [
      { title: 'Ascendant (Lagna) & Vital Sign', subtitle: 'Foundational baseline', icon: 'fa-sun' },
      { title: 'Planetary Longitudes', subtitle: 'Nirayana Lahiri coordinates', icon: 'fa-table' }
    ],
    disclaimer: 'Free foundational summary. Upgrade to Complete Deep Dive for full harmonic analysis.'
  }
};

Object.defineProperty(REPORT_CATALOGUE, 'report_remedial_gemstones', {
  value: {
    productId: 'report_remedial_gemstones',
    displayName: 'Planetary Remedies, Gemstone & Mantra Blueprint',
    shortDescription: 'In-depth 12+ page remedial guide with Lagna-safe gemstone prescriptions, Beej mantras & Yantras.',
    fullDescription: 'Comprehensive classical remedial handbook synthesized under Brihat Parashara Hora Shastra. Features functional benefic/malefic analysis, Lagna-safe Ratna prescriptions (with strict contraindication warnings), authentic Devanagari Beej mantras with 108 japa protocol, sacred Yantra geometry, and Sattvic Daana guidelines.',
    pricePaise: 14900,
    priceRupees: 149,
    requiredProfileInputs: ['birth_profile'],
    requiredCapabilities: ['ephemeris', 'dasha', 'doshas'],
    includedSections: [
      'remedial_constitutional_vulnerabilities',
      'lagna_safe_gemstone_prescriptions',
      'beej_mantras_and_japa_sadhana',
      'sacred_yantras_and_altar_geometry',
      'satvik_daana_and_charity',
      'circadian_vrata_lifestyle_rituals',
      'purushartha_karmic_disclaimer'
    ],
    forecastPeriod: null,
    supportedLanguages: ['en', 'hi'],
    onlineReaderOnly: false,
    sampleOutline: [
      { title: 'Constitutional Vulnerabilities & Planetary Dignities', subtitle: 'Identifying functional benefics and malefics', icon: 'fa-shield-halved' },
      { title: 'Lagna-Safe Gemstone Prescriptions & Contraindications', subtitle: 'Strict Ratna selection and wearing protocols', icon: 'fa-gem' },
      { title: 'Devanagari Beej Mantras & 108 Japa Sadhana', subtitle: 'Acoustic resonance and rosary guidelines', icon: 'fa-om' },
      { title: 'Sacred Yantras & Geometric Architecture', subtitle: 'Altar placement and planetary consecration', icon: 'fa-square' },
      { title: 'Sattvic Daana & Purushartha Integration', subtitle: 'Charity timing, deity pacification & free will', icon: 'fa-hands-praying' }
    ],
    disclaimer: 'Vedic remedies, mantras, and gemstones provide traditional spiritual alignment and mental poise. They do not constitute deterministic life predictions or substitute for professional medical, legal, or financial counsel.'
  },
  enumerable: false,
  writable: true,
  configurable: true
});

/**
 * Helper to calculate final price in integer paise applying applicable subscription discounts.
 */
export function calculateReportPrice(productId: string, userTier: SubscriptionTier = SubscriptionTier.FREE): {
  productId: string;
  basePricePaise: number;
  discountPercent: number;
  discountPaise: number;
  finalPricePaise: number;
  finalPriceRupees: number;
} {
  const prod = REPORT_CATALOGUE[productId];
  if (!prod) {
    throw new Error(`Report product '${productId}' not found in catalogue.`);
  }

  const basePricePaise = prod.pricePaise;
  if (basePricePaise === 0) {
    return {
      productId,
      basePricePaise: 0,
      discountPercent: 0,
      discountPaise: 0,
      finalPricePaise: 0,
      finalPriceRupees: 0
    };
  }

  const plan = SUBSCRIPTION_PLANS[userTier] || SUBSCRIPTION_PLANS[SubscriptionTier.FREE];
  const discountPercent = plan.reportDiscountPercent || 0;
  const discountPaise = Math.round((basePricePaise * discountPercent) / 100);
  const finalPricePaise = basePricePaise - discountPaise;
  const finalPriceRupees = Number((finalPricePaise / 100).toFixed(2));

  return {
    productId,
    basePricePaise,
    discountPercent,
    discountPaise,
    finalPricePaise,
    finalPriceRupees
  };
}

/**
 * Authoritative AI Astrologer Consultation Rate Specification
 * Governs billing and session monetization across Parashari and Jaimini personas.
 */
export interface AiConsultationRateDefinition {
  serviceId: string;
  displayName: string;
  ratePerMinuteRupees: number;
  ratePerMinutePaise: number;
  billingMode: 'PER_STARTED_MINUTE';
  roundingPolicy: 'CEIL_MINUTE';
  currency: 'INR';
  disclaimer: string;
}

export const AI_CONSULTATION_SERVICE: AiConsultationRateDefinition = {
  serviceId: 'ai_astrologer_consultation',
  displayName: 'AI Vedic Astrologer Consultation',
  ratePerMinuteRupees: 15.00,
  ratePerMinutePaise: 1500,
  billingMode: 'PER_STARTED_MINUTE',
  roundingPolicy: 'CEIL_MINUTE',
  currency: 'INR',
  disclaimer: 'Billed in Indian Rupees at ₹15 per started minute after promotional free allowance.'
};

/**
 * ============================================================================
 * ASTROVERSE CENTRAL CANONICAL PRODUCT & PRICING CATALOGUE
 * Authoritative source of truth for all paid services across Public Website,
 * Admin Control Centre, Backend Order Validation, and Cashfree Payments.
 * ============================================================================
 */
export interface CanonicalProduct {
  id: string; // product_id / sku
  sku: string;
  name: string;
  category: 'SUBSCRIPTION' | 'REPORT' | 'WALLET_RECHARGE' | 'CONSULTATION';
  description: string;
  productType: string;
  billingModel: 'ONE_TIME' | 'RECURRING_PASS';
  currency: 'INR';
  amountPaise: number;
  amountRupees: number;
  billingInterval?: 'MONTHLY' | 'ANNUAL' | 'ONE_TIME';
  billingIntervalCount?: number;
  annualPricePaise?: number;
  annualPriceRupees?: number;
  discountPercent?: number;
  entitlementMapping: Record<string, any>;
  taxConfiguration?: {
    gstPercent: number;
    inclusive: boolean;
  };
  active: boolean;
  displayOrder: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export const CANONICAL_PRODUCT_CATALOGUE: Record<string, CanonicalProduct> = {
  // --- Subscriptions ---
  'sub_plus': {
    id: 'sub_plus',
    sku: 'AV-SUB-PLUS',
    name: 'AstroVerse Plus',
    category: 'SUBSCRIPTION',
    description: 'Up to 3 birth profiles, D9/D10 harmonic charts, detailed Vimshottari dasha, 15 AI consultations/day, 10% report discount.',
    productType: 'SUBSCRIPTION',
    billingModel: 'RECURRING_PASS',
    currency: 'INR',
    amountPaise: 14900,
    amountRupees: 149,
    billingInterval: 'MONTHLY',
    billingIntervalCount: 1,
    annualPricePaise: 129900,
    annualPriceRupees: 1299,
    discountPercent: 10,
    entitlementMapping: {
      tier: 'PLUS',
      maxProfiles: 3,
      dailyAiLimit: 15,
      allowedDivisionalCharts: ['D1', 'D9', 'D10'],
      dashaDepth: 'detailed',
      reportDiscountPercent: 10,
      hasPersonalizedReportReader: true
    },
    taxConfiguration: { gstPercent: 18, inclusive: true },
    active: true,
    displayOrder: 1,
    version: 1,
    createdAt: '2026-10-30T00:00:00.000Z',
    updatedAt: '2026-10-30T00:00:00.000Z'
  },
  'sub_premium': {
    id: 'sub_premium',
    sku: 'AV-SUB-PREMIUM',
    name: 'AstroVerse Premium',
    category: 'SUBSCRIPTION',
    description: 'Up to 5 birth profiles, full 16 Shodashavarga charts (D1-D60), 337-Bindu Ashtakavarga, 6-fold Shadbala, BTR, 30 AI consultations/day, 20% report discount, watermarked reader.',
    productType: 'SUBSCRIPTION',
    billingModel: 'RECURRING_PASS',
    currency: 'INR',
    amountPaise: 29900,
    amountRupees: 299,
    billingInterval: 'MONTHLY',
    billingIntervalCount: 1,
    annualPricePaise: 249900,
    annualPriceRupees: 2499,
    discountPercent: 20,
    entitlementMapping: {
      tier: 'PREMIUM',
      maxProfiles: 5,
      dailyAiLimit: 30,
      allowedDivisionalCharts: ['D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60'],
      dashaDepth: 'advanced',
      reportDiscountPercent: 20,
      hasPersonalizedReportReader: true
    },
    taxConfiguration: { gstPercent: 18, inclusive: true },
    active: true,
    displayOrder: 2,
    version: 1,
    createdAt: '2026-10-30T00:00:00.000Z',
    updatedAt: '2026-10-30T00:00:00.000Z'
  },

  // --- Individual Digital Reports ---
  'report_janam_kundli_deep_dive': {
    id: 'report_janam_kundli_deep_dive',
    sku: 'AV-REP-KUNDLI-DEEP',
    name: 'Complete Janam Kundli Deep Dive',
    category: 'REPORT',
    description: 'Comprehensive 25+ page life blueprint analyzing Lagna, D1–D60, Ashtakavarga, Shadbala & Dashas.',
    productType: 'REPORT',
    billingModel: 'ONE_TIME',
    currency: 'INR',
    amountPaise: 19900,
    amountRupees: 199,
    billingInterval: 'ONE_TIME',
    entitlementMapping: { reportType: 'report_janam_kundli_deep_dive', onlineReaderAccess: true, watermark: true },
    taxConfiguration: { gstPercent: 18, inclusive: true },
    active: true,
    displayOrder: 3,
    version: 1,
    createdAt: '2026-10-30T00:00:00.000Z',
    updatedAt: '2026-10-30T00:00:00.000Z'
  },
  'report_career_education': {
    id: 'report_career_education',
    sku: 'AV-REP-CAREER',
    name: 'Career & Education Report',
    category: 'REPORT',
    description: 'In-depth analysis of 10th House, D10 Dashamsha, professional authority & promotion timing.',
    productType: 'REPORT',
    billingModel: 'ONE_TIME',
    currency: 'INR',
    amountPaise: 14900,
    amountRupees: 149,
    billingInterval: 'ONE_TIME',
    entitlementMapping: { reportType: 'report_career_education', onlineReaderAccess: true, watermark: true },
    taxConfiguration: { gstPercent: 18, inclusive: true },
    active: true,
    displayOrder: 4,
    version: 1,
    createdAt: '2026-10-30T00:00:00.000Z',
    updatedAt: '2026-10-30T00:00:00.000Z'
  },
  'report_relationship_marriage': {
    id: 'report_relationship_marriage',
    sku: 'AV-REP-MARRIAGE',
    name: 'Relationship & Marriage Report',
    category: 'REPORT',
    description: '7th House Kalatra evaluation, D9 Navamsha partner archetypes & marital harmony guidance.',
    productType: 'REPORT',
    billingModel: 'ONE_TIME',
    currency: 'INR',
    amountPaise: 14900,
    amountRupees: 149,
    billingInterval: 'ONE_TIME',
    entitlementMapping: { reportType: 'report_relationship_marriage', onlineReaderAccess: true, watermark: true },
    taxConfiguration: { gstPercent: 18, inclusive: true },
    active: true,
    displayOrder: 5,
    version: 1,
    createdAt: '2026-10-30T00:00:00.000Z',
    updatedAt: '2026-10-30T00:00:00.000Z'
  },
  'report_kundli_milan': {
    id: 'report_kundli_milan',
    sku: 'AV-REP-MILAN',
    name: 'Detailed Kundli Milan (Astrological Synastry)',
    category: 'REPORT',
    description: 'Full 36-Guna Ashtakoota synastry matrix with cross-chart D9 Navamsha compatibility calculation.',
    productType: 'REPORT',
    billingModel: 'ONE_TIME',
    currency: 'INR',
    amountPaise: 14900,
    amountRupees: 149,
    billingInterval: 'ONE_TIME',
    entitlementMapping: { reportType: 'report_kundli_milan', onlineReaderAccess: true, watermark: true },
    taxConfiguration: { gstPercent: 18, inclusive: true },
    active: true,
    displayOrder: 6,
    version: 1,
    createdAt: '2026-10-30T00:00:00.000Z',
    updatedAt: '2026-10-30T00:00:00.000Z'
  },
  'report_one_month_forecast': {
    id: 'report_one_month_forecast',
    sku: 'AV-REP-1MO',
    name: 'One-Month Personalized Forecast',
    category: 'REPORT',
    description: 'High-resolution 30-day forecast integrating active Vimshottari Antardasha and transits.',
    productType: 'REPORT',
    billingModel: 'ONE_TIME',
    currency: 'INR',
    amountPaise: 4900,
    amountRupees: 49,
    billingInterval: 'ONE_TIME',
    entitlementMapping: { reportType: 'report_one_month_forecast', onlineReaderAccess: true, watermark: true },
    taxConfiguration: { gstPercent: 18, inclusive: true },
    active: true,
    displayOrder: 7,
    version: 1,
    createdAt: '2026-10-30T00:00:00.000Z',
    updatedAt: '2026-10-30T00:00:00.000Z'
  },
  'report_twelve_month_varshphal': {
    id: 'report_twelve_month_varshphal',
    sku: 'AV-REP-12MO',
    name: 'Twelve-Month Varshphal & Forecast',
    category: 'REPORT',
    description: 'Comprehensive annual roadmap analyzing all 12 upcoming calendar months individually.',
    productType: 'REPORT',
    billingModel: 'ONE_TIME',
    currency: 'INR',
    amountPaise: 24900,
    amountRupees: 249,
    billingInterval: 'ONE_TIME',
    entitlementMapping: { reportType: 'report_twelve_month_varshphal', onlineReaderAccess: true, watermark: true },
    taxConfiguration: { gstPercent: 18, inclusive: true },
    active: true,
    displayOrder: 8,
    version: 1,
    createdAt: '2026-10-30T00:00:00.000Z',
    updatedAt: '2026-10-30T00:00:00.000Z'
  },
  'report_three_year_roadmap': {
    id: 'report_three_year_roadmap',
    sku: 'AV-REP-3YR',
    name: 'Three-Year Personal Roadmap',
    category: 'REPORT',
    description: 'Strategic 36-month macro horizon mapping major Dasha shifts and planetary transitions.',
    productType: 'REPORT',
    billingModel: 'ONE_TIME',
    currency: 'INR',
    amountPaise: 49900,
    amountRupees: 499,
    billingInterval: 'ONE_TIME',
    entitlementMapping: { reportType: 'report_three_year_roadmap', onlineReaderAccess: true, watermark: true },
    taxConfiguration: { gstPercent: 18, inclusive: true },
    active: true,
    displayOrder: 9,
    version: 1,
    createdAt: '2026-10-30T00:00:00.000Z',
    updatedAt: '2026-10-30T00:00:00.000Z'
  },
  'report_bundle_kundli_varshphal': {
    id: 'report_bundle_kundli_varshphal',
    sku: 'AV-REP-BUNDLE',
    name: 'Complete Kundli + Twelve-Month Forecast Bundle',
    category: 'REPORT',
    description: 'Best-value bundle combining the 25+ page Janam Kundli Deep Dive and 12-Month Annual Varshphal.',
    productType: 'REPORT',
    billingModel: 'ONE_TIME',
    currency: 'INR',
    amountPaise: 39900,
    amountRupees: 399,
    billingInterval: 'ONE_TIME',
    entitlementMapping: { reportType: 'report_bundle_kundli_varshphal', onlineReaderAccess: true, watermark: true },
    taxConfiguration: { gstPercent: 18, inclusive: true },
    active: true,
    displayOrder: 10,
    version: 1,
    createdAt: '2026-10-30T00:00:00.000Z',
    updatedAt: '2026-10-30T00:00:00.000Z'
  },
  'report_vedic_name_numerology': {
    id: 'report_vedic_name_numerology',
    sku: 'AV-REP-NUMEROLOGY',
    name: 'Vedic Name Correction & Numerology Master Blueprint',
    category: 'REPORT',
    description: 'Exhaustive 15+ page personal numerology blueprint covering Moolank, Bhagyank, Chaldean Naamank, compound vibrations & signature analysis.',
    productType: 'REPORT',
    billingModel: 'ONE_TIME',
    currency: 'INR',
    amountPaise: 19900,
    amountRupees: 199,
    billingInterval: 'ONE_TIME',
    entitlementMapping: { reportType: 'report_vedic_name_numerology', onlineReaderAccess: true, watermark: true },
    taxConfiguration: { gstPercent: 18, inclusive: true },
    active: true,
    displayOrder: 11,
    version: 1,
    createdAt: '2026-10-30T00:00:00.000Z',
    updatedAt: '2026-10-30T00:00:00.000Z'
  },
  'report_remedial_gemstones': {
    id: 'report_remedial_gemstones',
    sku: 'AV-REP-REMEDIES',
    name: 'Planetary Remedies, Gemstone & Mantra Blueprint',
    category: 'REPORT',
    description: 'In-depth 12+ page remedial guide with Lagna-safe gemstone prescriptions, Beej mantras & Yantras.',
    productType: 'REPORT',
    billingModel: 'ONE_TIME',
    currency: 'INR',
    amountPaise: 14900,
    amountRupees: 149,
    billingInterval: 'ONE_TIME',
    entitlementMapping: { reportType: 'report_remedial_gemstones', onlineReaderAccess: true, watermark: true },
    taxConfiguration: { gstPercent: 18, inclusive: true },
    active: true,
    displayOrder: 12,
    version: 1,
    createdAt: '2026-10-30T00:00:00.000Z',
    updatedAt: '2026-10-30T00:00:00.000Z'
  },

  // --- Wallet Recharge Packs ---
  'wallet_pack_100': {
    id: 'wallet_pack_100',
    sku: 'AV-WAL-100',
    name: 'Wallet Recharge ₹100 (+₹10 Bonus)',
    category: 'WALLET_RECHARGE',
    description: 'Instant wallet recharge. Base ₹100 + 18% GST (Payable ₹118). Includes ₹10 complimentary bonus credits (Total credit: ₹110).',
    productType: 'WALLET_RECHARGE',
    billingModel: 'ONE_TIME',
    currency: 'INR',
    amountPaise: 11800, // Total payable with GST
    amountRupees: 118,
    billingInterval: 'ONE_TIME',
    entitlementMapping: { baseAmount: 100, bonusAmount: 10, totalCredit: 110 },
    taxConfiguration: { gstPercent: 18, inclusive: false },
    active: true,
    displayOrder: 13,
    version: 1,
    createdAt: '2026-10-30T00:00:00.000Z',
    updatedAt: '2026-10-30T00:00:00.000Z'
  },
  'wallet_pack_250': {
    id: 'wallet_pack_250',
    sku: 'AV-WAL-250',
    name: 'Wallet Recharge ₹250 (+₹35 Bonus)',
    category: 'WALLET_RECHARGE',
    description: 'Instant wallet recharge. Base ₹250 + 18% GST (Payable ₹295). Includes ₹35 complimentary bonus credits (Total credit: ₹285).',
    productType: 'WALLET_RECHARGE',
    billingModel: 'ONE_TIME',
    currency: 'INR',
    amountPaise: 29500, // Total payable with GST
    amountRupees: 295,
    billingInterval: 'ONE_TIME',
    entitlementMapping: { baseAmount: 250, bonusAmount: 35, totalCredit: 285 },
    taxConfiguration: { gstPercent: 18, inclusive: false },
    active: true,
    displayOrder: 14,
    version: 1,
    createdAt: '2026-10-30T00:00:00.000Z',
    updatedAt: '2026-10-30T00:00:00.000Z'
  },
  'wallet_pack_500': {
    id: 'wallet_pack_500',
    sku: 'AV-WAL-500',
    name: 'Wallet Recharge ₹500 (+₹100 Bonus)',
    category: 'WALLET_RECHARGE',
    description: 'Instant wallet recharge. Base ₹500 + 18% GST (Payable ₹590). Includes ₹100 complimentary bonus credits (Total credit: ₹600).',
    productType: 'WALLET_RECHARGE',
    billingModel: 'ONE_TIME',
    currency: 'INR',
    amountPaise: 59000, // Total payable with GST
    amountRupees: 590,
    billingInterval: 'ONE_TIME',
    entitlementMapping: { baseAmount: 500, bonusAmount: 100, totalCredit: 600 },
    taxConfiguration: { gstPercent: 18, inclusive: false },
    active: true,
    displayOrder: 15,
    version: 1,
    createdAt: '2026-10-30T00:00:00.000Z',
    updatedAt: '2026-10-30T00:00:00.000Z'
  }
};

export function getCanonicalProduct(id: string): CanonicalProduct | undefined {
  return CANONICAL_PRODUCT_CATALOGUE[id];
}

export function getAllCanonicalProducts(filterCategory?: string): CanonicalProduct[] {
  const all = Object.values(CANONICAL_PRODUCT_CATALOGUE);
  if (!filterCategory || filterCategory === 'ALL') {
    return all.sort((a, b) => a.displayOrder - b.displayOrder);
  }
  return all
    .filter(p => p.category === filterCategory)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export function updateCanonicalProductPrice(
  id: string,
  newAmountRupees: number,
  adminEmail: string,
  newAnnualRupees?: number
): CanonicalProduct {
  const prod = CANONICAL_PRODUCT_CATALOGUE[id];
  if (!prod) {
    throw new Error(`Product '${id}' not found in canonical catalogue.`);
  }

  if (!Number.isFinite(newAmountRupees) || newAmountRupees <= 0) {
    throw new Error('New price must be a positive number.');
  }

  const newPaise = Math.round(newAmountRupees * 100);
  prod.amountRupees = newAmountRupees;
  prod.amountPaise = newPaise;
  if (typeof newAnnualRupees === 'number' && newAnnualRupees > 0) {
    prod.annualPriceRupees = newAnnualRupees;
    prod.annualPricePaise = Math.round(newAnnualRupees * 100);
  }
  prod.version = (prod.version || 1) + 1;
  prod.updatedAt = new Date().toISOString();
  prod.updatedBy = adminEmail;

  // Also update corresponding SUBSCRIPTION_PLANS or REPORT_CATALOGUE if applicable
  if (id === 'sub_plus') {
    SUBSCRIPTION_PLANS[SubscriptionTier.PLUS].monthlyPriceRupees = newAmountRupees;
    SUBSCRIPTION_PLANS[SubscriptionTier.PLUS].monthlyPricePaise = newPaise;
    if (newAnnualRupees) {
      SUBSCRIPTION_PLANS[SubscriptionTier.PLUS].annualPriceRupees = newAnnualRupees;
      SUBSCRIPTION_PLANS[SubscriptionTier.PLUS].annualPricePaise = Math.round(newAnnualRupees * 100);
    }
  } else if (id === 'sub_premium') {
    SUBSCRIPTION_PLANS[SubscriptionTier.PREMIUM].monthlyPriceRupees = newAmountRupees;
    SUBSCRIPTION_PLANS[SubscriptionTier.PREMIUM].monthlyPricePaise = newPaise;
    if (newAnnualRupees) {
      SUBSCRIPTION_PLANS[SubscriptionTier.PREMIUM].annualPriceRupees = newAnnualRupees;
      SUBSCRIPTION_PLANS[SubscriptionTier.PREMIUM].annualPricePaise = Math.round(newAnnualRupees * 100);
    }
  } else if (REPORT_CATALOGUE[id]) {
    REPORT_CATALOGUE[id].priceRupees = newAmountRupees;
    REPORT_CATALOGUE[id].pricePaise = newPaise;
  }

  return prod;
}
