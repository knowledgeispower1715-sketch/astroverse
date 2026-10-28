/**
 * AstroVerse Versioned Classical Vedic Yoga & Dosha Rule Registry (TypeScript)
 * ===========================================================================
 * Exact parity with Python yoga_dosha_registry.py.
 * Authoritative implementation of classical Parashari rules from BPHS,
 * Phaladeepika, Jataka Parijata, and Muhurta Chintamani.
 */

export const REGISTRY_VERSION = '2.0.0';

export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

export const SIGNS_HI = [
  'मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या',
  'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुंभ', 'मीन'
];

export const SIGN_LORDS: Record<string, string> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter'
};

export type YogaDoshaStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'PRESENT_WITH_MITIGATION'
  | 'CONDITIONAL'
  | 'INDETERMINATE'
  | 'NOT_EVALUATED'
  | 'DISPUTED_METHOD';

export interface EvaluatedRemedy {
  mantra_sanskrit: string;
  mantra_transliteration: string;
  meaning_en: string;
  meaning_hi: string;
  daana_en: string;
  daana_hi: string;
  ritual_note_en?: string;
  limitations?: string;
}

export interface EvaluatedYoga {
  rule_id: string;
  rule_version: string;
  name: string;
  name_en: string;
  name_hi: string;
  category: string;
  tradition: string;
  status: YogaDoshaStatus;
  is_active: boolean;
  relationship_type?: string;
  planets_involved: string[];
  tested_references: Record<string, any>;
  conditions_satisfied: string[];
  conditions_not_satisfied: string[];
  mitigations_applied: string[];
  evidence_text_en: string;
  evidence_text_hi: string;
  source_citation: string;
}

export interface EvaluatedDosha {
  rule_id: string;
  rule_version: string;
  name_en: string;
  name_hi: string;
  category: string;
  tradition: string;
  status: YogaDoshaStatus;
  has_dosha: boolean;
  verdict_en: string;
  verdict_hi: string;
  tested_references: Record<string, any>;
  conditions_satisfied: string[];
  conditions_not_satisfied: string[];
  mitigations_applied: string[];
  evidence_text_en: string;
  evidence_text_hi: string;
  source_citation: string;
  remedy: EvaluatedRemedy | null;
}

export interface EvaluatedTransits {
  sade_sati: {
    rule_id: string;
    name_en: string;
    name_hi: string;
    status: YogaDoshaStatus;
    is_active: boolean;
    phase_en: string;
    phase_hi: string;
    transit_saturn_sign: string;
    natal_moon_sign: string;
    house_from_moon: number;
    evidence_text_en: string;
    evidence_text_hi: string;
    reference_date: string;
    remedy: EvaluatedRemedy | null;
  };
  kantaka_shani: {
    rule_id: string;
    name_en: string;
    name_hi: string;
    status: YogaDoshaStatus;
    is_active: boolean;
    dhaiya_type_en: string;
    dhaiya_type_hi: string;
    house_from_moon: number;
    evidence_text_en: string;
    evidence_text_hi: string;
    remedy: EvaluatedRemedy | null;
  };
}

export class YogaDoshaRegistryTS {
  public static readonly VERSION = REGISTRY_VERSION;
  public static readonly DEFAULT_TRANSIT_SATURN = 'Pisces';

  public static evaluateAll(
    planets: Record<string, { sign: string; degree: number; total_degree?: number; house?: number }>,
    lagnaSign: string,
    isUnknownTime: boolean = false,
    transitSaturnSign: string = YogaDoshaRegistryTS.DEFAULT_TRANSIT_SATURN,
    referenceDate?: string
  ): {
    registry_version: string;
    yogas: EvaluatedYoga[];
    doshas: Record<string, EvaluatedDosha>;
    transits: EvaluatedTransits;
    summary: {
      active_yogas_count: number;
      active_doshas_count: number;
      sade_sati_active: boolean;
    };
  } {
    const yogas = this.evaluateYogas(planets, lagnaSign, isUnknownTime);
    const doshas = this.evaluateDoshas(planets, lagnaSign, isUnknownTime);
    const transits = this.evaluateTransits(planets, transitSaturnSign, referenceDate);

    return {
      registry_version: this.VERSION,
      yogas,
      doshas,
      transits,
      summary: {
        active_yogas_count: yogas.filter(y => y.status === 'PRESENT' || y.status === 'PRESENT_WITH_MITIGATION').length,
        active_doshas_count: Object.values(doshas).filter(d => d.status === 'PRESENT' || d.status === 'PRESENT_WITH_MITIGATION').length,
        sade_sati_active: transits.sade_sati.status === 'PRESENT'
      }
    };
  }

  // --------------------------------------------------------------------------
  // DOSHAS
  // --------------------------------------------------------------------------

  public static evaluateDoshas(
    planets: Record<string, { sign: string; degree: number; total_degree?: number; house?: number }>,
    lagnaSign: string,
    isUnknownTime: boolean
  ): Record<string, EvaluatedDosha> {
    return {
      manglik: this.evalManglik(planets, lagnaSign, isUnknownTime),
      kaal_sarp: this.evalKaalSarp(planets),
      guru_chandal: this.evalGuruChandal(planets),
      grahan: this.evalGrahan(planets)
    };
  }

  public static evalManglik(
    planets: Record<string, { sign: string; degree: number; total_degree?: number; house?: number }>,
    lagnaSign: string,
    isUnknownTime: boolean
  ): EvaluatedDosha {
    const mars = planets.Mars || { sign: '', degree: 0 };
    const moon = planets.Moon || { sign: '', degree: 0 };
    const venus = planets.Venus || { sign: '', degree: 0 };
    const jupiter = planets.Jupiter || { sign: '', degree: 0 };

    const marsSign = mars.sign;
    const marsIdx = SIGNS.indexOf(marsSign);
    const lagnaIdx = SIGNS.indexOf(lagnaSign);
    const moonIdx = SIGNS.indexOf(moon.sign);
    const venusIdx = SIGNS.indexOf(venus.sign);

    const hLagna = marsIdx >= 0 && lagnaIdx >= 0 ? ((marsIdx - lagnaIdx + 12) % 12) + 1 : 0;
    const hMoon = marsIdx >= 0 && moonIdx >= 0 ? ((marsIdx - moonIdx + 12) % 12) + 1 : 0;
    const hVenus = marsIdx >= 0 && venusIdx >= 0 ? ((marsIdx - venusIdx + 12) % 12) + 1 : 0;

    const manglikHouses = [1, 2, 4, 7, 8, 12];
    const checkLagna = manglikHouses.includes(hLagna) && !isUnknownTime;
    const checkMoon = manglikHouses.includes(hMoon);
    const checkVenus = manglikHouses.includes(hVenus);

    const mitigations: string[] = [];
    const isOwnSign = marsSign === 'Aries' || marsSign === 'Scorpio';
    const isExalted = marsSign === 'Capricorn';

    if (isOwnSign) {
      mitigations.push('Mars occupies its own sign (Swakshetra in Aries/Scorpio), naturally pacifying aggressive Kuja tension.');
    }
    if (isExalted) {
      mitigations.push('Mars is exalted in Capricorn (Uchcha), transforming martial friction into structured discipline.');
    }

    if (hLagna === 2 && ['Gemini', 'Virgo'].includes(marsSign)) mitigations.push("Mars in 2nd house in Mercury's sign cancels Manglik Dosha.");
    if (hLagna === 4 && ['Aries', 'Scorpio'].includes(marsSign)) mitigations.push('Mars in 4th house in own sign cancels domestic discord.');
    if (hLagna === 7 && ['Cancer', 'Capricorn'].includes(marsSign)) mitigations.push('Mars in 7th house in Cancer (Neecha) or Capricorn (Uchcha) cancels Kuja Dosha.');
    if (hLagna === 8 && ['Sagittarius', 'Pisces'].includes(marsSign)) mitigations.push("Mars in 8th house in Jupiter's sign confers divine protection.");
    if (hLagna === 12 && ['Taurus', 'Libra'].includes(marsSign)) mitigations.push("Mars in 12th house in Venus's sign neutralizes bedtime discord.");

    const jupIdx = SIGNS.indexOf(jupiter.sign);
    if (jupIdx >= 0 && marsIdx >= 0) {
      const jupDist = ((marsIdx - jupIdx + 12) % 12) + 1;
      if ([1, 5, 7, 9].includes(jupDist)) {
        mitigations.push(`Benefic aspect or conjunction of Guru (Jupiter in house ${jupDist} from Mars) provides spiritual pacification.`);
      }
    }

    const hasPrimary = checkLagna || checkMoon;
    const hasVenusOnly = checkVenus && !hasPrimary;

    let status: YogaDoshaStatus = 'ABSENT';
    let verdictEn = 'No Manglik Dosha (Kuja Dosha Free)';
    let verdictHi = 'मांगलिक दोष रहित (दोष मुक्त)';

    if (isUnknownTime && !checkMoon && !checkVenus) {
      status = 'INDETERMINATE';
      verdictEn = 'Indeterminate (Requires Known Birth Time for Lagna)';
      verdictHi = 'अनिर्णायक (सटीक जन्म समय आवश्यक है)';
    } else if (hasPrimary) {
      if (mitigations.length > 0) {
        status = 'PRESENT_WITH_MITIGATION';
        verdictEn = 'Manglik Placement Mitigated / Cancelled';
        verdictHi = 'मांगलिक प्रभाव शमित / निरस्त';
      } else {
        status = 'PRESENT';
        verdictEn = 'Purna Manglik Dosha Active';
        verdictHi = 'पूर्ण मांगलिक दोष सक्रिय';
      }
    } else if (hasVenusOnly) {
      status = mitigations.length > 0 ? 'PRESENT_WITH_MITIGATION' : 'CONDITIONAL';
      verdictEn = mitigations.length > 0 ? 'Venus-Only Manglik (Minor / Mitigated by Own Sign)' : 'Venus-Based Manglik Check (Secondary Tradition)';
      verdictHi = mitigations.length > 0 ? 'केवल शुक्र-आधारित मांगलिक (स्वराशि द्वारा शमित)' : 'शुक्र-आधारित मांगलिक (गौण परंपरा)';
    }

    const refDetails: string[] = [
      isUnknownTime ? 'From Lagna: Indeterminate (birth time unknown)' : `From Lagna (${lagnaSign}): House ${hLagna} (${checkLagna ? 'Afflicted' : 'Not present under standard 1, 2, 4, 7, 8, 12 rule'})`,
      `From Moon (${moon.sign}): House ${hMoon} (${checkMoon ? 'Afflicted' : 'Not present'})`,
      `From Venus (${venus.sign}): House ${hVenus} (${checkVenus ? 'Placement detected under secondary Venus check' : 'Not present'})`
    ];

    let evidenceEn = refDetails.join(' | ');
    if (mitigations.length > 0) evidenceEn += ' | Mitigation: ' + mitigations.join(' ');

    let evidenceHi = `लग्न (${lagnaSign}) से: भाव ${hLagna} (${checkLagna ? 'दोष' : 'दोष मुक्त'}) | चंद्र (${moon.sign}) से: भाव ${hMoon} (${checkMoon ? 'दोष' : 'दोष मुक्त'}) | शुक्र (${venus.sign}) से: भाव ${hVenus} (${checkVenus ? 'दोष' : 'दोष मुक्त'})`;
    if (mitigations.length > 0) evidenceHi += ' | शमन कारक: ' + mitigations.join(' ');

    let remedy: EvaluatedRemedy | null = null;
    if (status === 'PRESENT' || status === 'PRESENT_WITH_MITIGATION' || status === 'CONDITIONAL') {
      remedy = {
        mantra_sanskrit: 'ॐ भौमाय नमः || ॐ क्रां क्रीं क्रौं सः भौमाय नमः',
        mantra_transliteration: 'Om Bhaumaya Namah || Om Kraam Kreem Kroum Sah Bhaumaya Namah',
        meaning_en: 'Reverence to Mars (Mangala), dispenser of courage, strength, and righteous action.',
        meaning_hi: 'मंगल देव को नमन, जो साहस, शक्ति और धर्मनिष्ठ कर्म के प्रदाता हैं।',
        daana_en: 'Voluntary donation of red lentils (masoor dal), jaggery, or copper utensils on Tuesdays.',
        daana_hi: 'मंगलवार को लाल मसूर दाल, गुड़ अथवा तांबे के बर्तनों का सात्विक दान।',
        ritual_note_en: 'Classical Kumbh Vivah or matching with an equally balanced partner is traditionally advised if solemnizing marriage covenants.',
        limitations: 'Astrological balances are spiritual disciplines and do not replace legal, psychological, or mutual relational compatibility.'
      };
    }

    return {
      rule_id: 'DOSHA_MANGLIK',
      rule_version: this.VERSION,
      name_en: 'Manglik Dosha (Kuja Dosha)',
      name_hi: 'मांगलिक दोष (भौम दोष)',
      category: 'DOSHA',
      tradition: 'Classical Parashari (BPHS Ch. 81) & Muhurta Chintamani',
      status,
      has_dosha: status === 'PRESENT' || status === 'PRESENT_WITH_MITIGATION',
      verdict_en: verdictEn,
      verdict_hi: verdictHi,
      tested_references: {
        mars_sign: marsSign,
        from_lagna: { house: hLagna, qualifies: checkLagna },
        from_moon: { house: hMoon, qualifies: checkMoon },
        from_venus: { house: hVenus, qualifies: checkVenus }
      },
      conditions_satisfied: refDetails.filter(r => r.includes('Afflicted') || r.includes('detected')),
      conditions_not_satisfied: refDetails.filter(r => r.includes('Not present')),
      mitigations_applied: mitigations,
      evidence_text_en: evidenceEn,
      evidence_text_hi: evidenceHi,
      source_citation: 'Brihat Parashara Hora Shastra, Ch. 81, Sloka 47; Muhurta Chintamani, Vivaha Prakarana',
      remedy
    };
  }

  public static evalKaalSarp(planets: Record<string, { sign: string; degree: number; total_degree?: number }>): EvaluatedDosha {
    const rahu = planets.Rahu || { sign: 'Aries', degree: 0 };
    const seven = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

    const rahuDeg = (SIGNS.indexOf(rahu.sign) * 30.0) + rahu.degree;
    let sideA = 0;
    let sideB = 0;

    for (const p of seven) {
      const pData = planets[p] || { sign: 'Aries', degree: 0 };
      const pDeg = (SIGNS.indexOf(pData.sign) * 30.0) + pData.degree;
      const relDeg = (pDeg - rahuDeg + 360.0) % 360.0;
      if (relDeg >= 0.0 && relDeg < 180.0) sideA++;
      else sideB++;
    }

    const hasFull = sideA === 7 || sideB === 7;
    const hasPartial = sideA === 6 || sideB === 6;

    let status: YogaDoshaStatus = 'ABSENT';
    let verdictEn = 'No Kaal Sarp Dosha';
    let verdictHi = 'कालसर्प दोष अनुपस्थित';
    let evidenceEn = `Planets are distributed on both sides of the nodal axis (Side A: ${sideA}, Side B: ${sideB}). Natal Moon is free from nodal entrapment.`;
    let evidenceHi = `ग्रह राहु-केतु अक्ष के दोनों ओर स्वतंत्र रूप से वितरित हैं (पार्श्व A: ${sideA}, पार्श्व B: ${sideB})। चंद्रमा नोडल बंधन से सर्वथा मुक्त है।`;

    if (hasFull) {
      status = 'PRESENT';
      verdictEn = 'Purna Kaal Sarp Yoga Present';
      verdictHi = 'पूर्ण कालसर्प योग उपस्थित';
      evidenceEn = 'All 7 physical planets are enclosed within one side of the Rahu-Ketu nodal axis.';
      evidenceHi = 'सभी सातों ग्रह राहु-केतु अक्ष के एक ही पार्श्व में आबद्ध हैं।';
    } else if (hasPartial) {
      status = 'CONDITIONAL';
      verdictEn = 'Anshik (Partial) Kaal Sarp Yoga';
      verdictHi = 'आंशिक कालसर्प योग';
      evidenceEn = 'One planet breaks the nodal encirclement, significantly mitigating the formation.';
      evidenceHi = 'एक ग्रह नोडल अक्ष के घेरे से बाहर है, जिससे दोष का प्रभाव अत्यंत क्षीण हो जाता है।';
    }

    let remedy: EvaluatedRemedy | null = null;
    if (status === 'PRESENT' || status === 'CONDITIONAL') {
      remedy = {
        mantra_sanskrit: 'ॐ नमः शिवाय || ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम् | उर्वारुकमिव बन्धनान्मृत्योर्मुक्षीय माऽमृतात् ||',
        mantra_transliteration: 'Om Namah Shivaya || Om Tryambakam Yajamahe Sugandhim Pushtivardhanam | Urvarukamiva Bandhanan Mrityor Mukshiya Maamritat ||',
        meaning_en: 'Maha Mrityunjaya Mantra invoking Lord Shiva for health, clarity, and dissolution of karmic bondages.',
        meaning_hi: 'भगवान शिव का महामृत्युंजय मंत्र जो स्वास्थ्य, मानसिक शांति और कर्म-बंधनों से मुक्ति प्रदान करता है।',
        daana_en: 'Offering water or milk to a Shiva Lingam on Mondays, and caring for stray animals.',
        daana_hi: 'सोमवार को शिवलिंग पर जलाभिषेक अथवा दुग्धाभिषेक, एवं मूक पशुओं की सेवा।'
      };
    }

    return {
      rule_id: 'DOSHA_KAAL_SARP',
      rule_version: this.VERSION,
      name_en: 'Kaal Sarp Dosha',
      name_hi: 'कालसर्प दोष',
      category: 'DOSHA',
      tradition: 'Popular / Lineage Tradition (Non-Parashari; absent in BPHS)',
      status,
      has_dosha: status === 'PRESENT' || status === 'CONDITIONAL',
      verdict_en: verdictEn,
      verdict_hi: verdictHi,
      tested_references: { sideA, sideB },
      conditions_satisfied: hasFull ? ['All 7 planets enclosed'] : (hasPartial ? ['6 of 7 planets enclosed'] : []),
      conditions_not_satisfied: hasFull ? [] : ['Planets distributed freely across both sides'],
      mitigations_applied: hasPartial ? ['One planet breaks nodal enclosure'] : [],
      evidence_text_en: evidenceEn,
      evidence_text_hi: evidenceHi,
      source_citation: 'Modern Jyotish Lineages; treated as popular tradition (unattested in classical Brihat Parashara Hora Shastra)',
      remedy
    };
  }

  public static evalGuruChandal(planets: Record<string, { sign: string }>): EvaluatedDosha {
    const jup = planets.Jupiter?.sign || '';
    const rahu = planets.Rahu?.sign || '';
    const isConjunct = jup === rahu && Boolean(jup);
    const status: YogaDoshaStatus = isConjunct ? 'PRESENT' : 'ABSENT';

    return {
      rule_id: 'DOSHA_GURU_CHANDAL',
      rule_version: this.VERSION,
      name_en: 'Guru Chandal Dosha',
      name_hi: 'गुरु चांडाल दोष',
      category: 'DOSHA',
      tradition: 'Classical Parashari',
      status,
      has_dosha: isConjunct,
      verdict_en: isConjunct ? 'Guru Chandal Present' : 'No Guru Chandal Dosha',
      verdict_hi: isConjunct ? 'गुरु चांडाल दोष उपस्थित' : 'गुरु चांडाल दोष अनुपस्थित',
      tested_references: { jupiter_sign: jup, rahu_sign: rahu },
      conditions_satisfied: isConjunct ? ['Jupiter and Rahu in same sign'] : [],
      conditions_not_satisfied: isConjunct ? [] : ['Jupiter and Rahu in separate signs'],
      mitigations_applied: [],
      evidence_text_en: `Jupiter in ${jup} and Rahu in ${rahu} ${isConjunct ? 'share the same sign (conjunction)' : 'are in separate signs; no conjunction exists.'}`,
      evidence_text_hi: `गुरु ${jup} और राहु ${rahu} ${isConjunct ? 'एक ही राशि में हैं' : 'अलग-अलग राशियों में हैं; युति अनुपस्थित है।'}`,
      source_citation: 'Classical Parashari Principles',
      remedy: null
    };
  }

  public static evalGrahan(planets: Record<string, { sign: string }>): EvaluatedDosha {
    const sun = planets.Sun?.sign || '';
    const moon = planets.Moon?.sign || '';
    const rahu = planets.Rahu?.sign || '';
    const ketu = planets.Ketu?.sign || '';

    const isGrahan = (sun === rahu || sun === ketu || moon === rahu || moon === ketu) && Boolean(sun);
    const status: YogaDoshaStatus = isGrahan ? 'PRESENT' : 'ABSENT';

    return {
      rule_id: 'DOSHA_GRAHAN',
      rule_version: this.VERSION,
      name_en: 'Grahan Dosha (Eclipse Affliction)',
      name_hi: 'ग्रहण दोष',
      category: 'DOSHA',
      tradition: 'Classical Parashari',
      status,
      has_dosha: isGrahan,
      verdict_en: isGrahan ? 'Grahan Dosha Present' : 'No Grahan Dosha',
      verdict_hi: isGrahan ? 'ग्रहण दोष उपस्थित' : 'ग्रहण दोष अनुपस्थित',
      tested_references: { sun_sign: sun, moon_sign: moon, rahu_sign: rahu, ketu_sign: ketu },
      conditions_satisfied: isGrahan ? ['Luminary conjunct lunar node'] : [],
      conditions_not_satisfied: isGrahan ? [] : ['Luminaries free from nodal conjunction'],
      mitigations_applied: [],
      evidence_text_en: `Sun in ${sun}, Moon in ${moon}; Rahu in ${rahu}, Ketu in ${ketu}. ${isGrahan ? 'Luminaries afflicted by nodal conjunction' : 'Neither Sun nor Moon is conjunct the lunar nodes.'}`,
      evidence_text_hi: `सूर्य ${sun}, चंद्र ${moon}; राहु ${rahu}, केतु ${ketu}। ${isGrahan ? 'सूर्य या चंद्र नोड्स से ग्रस्त हैं' : 'सूर्य और चंद्र दोनों राहु-केतु युति से पूर्णतः मुक्त हैं।'}`,
      source_citation: 'Classical Parashari Principles',
      remedy: null
    };
  }

  // --------------------------------------------------------------------------
  // YOGAS
  // --------------------------------------------------------------------------

  public static evaluateYogas(
    planets: Record<string, { sign: string; degree: number; total_degree?: number; house?: number }>,
    lagnaSign: string,
    isUnknownTime: boolean
  ): EvaluatedYoga[] {
    const list: EvaluatedYoga[] = [];

    // 1. Gajakesari
    list.push(this.evalGajakesari(planets));

    // 2. Budhaditya
    list.push(this.evalBudhaditya(planets));

    // 3. Amala
    list.push(this.evalAmala(planets, lagnaSign, isUnknownTime));

    // 4. Dharma-Karmadhipati
    list.push(this.evalDharmaKarmadhipati(planets, lagnaSign, isUnknownTime));

    // 5. Chandra-Mangala
    list.push(this.evalChandraMangala(planets));

    // 6. Guru-Mangala
    list.push(this.evalGuruMangala(planets));

    // 7. Pancha Mahapurusha
    list.push(...this.evalPanchaMahapurusha(planets, lagnaSign, isUnknownTime));

    // 8. Viparita Raja
    list.push(...this.evalViparitaRaja(planets, lagnaSign, isUnknownTime));

    // 9. Kemadruma
    list.push(this.evalKemadruma(planets, lagnaSign, isUnknownTime));

    return list;
  }

  public static evalGajakesari(planets: Record<string, { sign: string; degree: number }>): EvaluatedYoga {
    const moonSign = planets.Moon?.sign || '';
    const jupSign = planets.Jupiter?.sign || '';
    const mIdx = SIGNS.indexOf(moonSign);
    const jIdx = SIGNS.indexOf(jupSign);

    const houseFromMoon = mIdx >= 0 && jIdx >= 0 ? ((jIdx - mIdx + 12) % 12) + 1 : 0;
    const isKendra = [1, 4, 7, 10].includes(houseFromMoon);
    const isDebilitated = jupSign === 'Capricorn';

    const status: YogaDoshaStatus = isKendra ? (isDebilitated ? 'PRESENT_WITH_MITIGATION' : 'PRESENT') : 'ABSENT';
    const evidenceEn = isKendra
      ? `Jupiter in ${jupSign} is seated in house ${houseFromMoon} (Kendra) from natal Moon in ${moonSign}.${isDebilitated ? ' Note: Jupiter is debilitated in Capricorn, requiring Neecha Bhanga mitigation.' : ''}`
      : `Jupiter in ${jupSign} occupies house ${houseFromMoon} from natal Moon in ${moonSign}, which is not a Kendra (1, 4, 7, 10). Standard Kendra condition is not satisfied.`;
    const evidenceHi = isKendra
      ? `गुरु ${jupSign} राशि में, चंद्रमा ${moonSign} से भाव ${houseFromMoon} (केंद्र) में स्थित हैं।`
      : `गुरु ${jupSign} में चंद्रमा (${moonSign}) से ${houseFromMoon}वें भाव में हैं, जो केंद्र (1, 4, 7, 10) नहीं है। अतः यह योग अनुपस्थित है।`;

    return {
      rule_id: 'YOGA_GAJAKESARI',
      rule_version: this.VERSION,
      name: 'Gajakesari Yoga',
      name_en: 'Gajakesari Yoga',
      name_hi: 'गजकेसरी योग',
      category: 'Raja Yoga / Prosperity',
      tradition: 'Classical Parashari (BPHS Ch. 35)',
      status,
      is_active: status === 'PRESENT' || status === 'PRESENT_WITH_MITIGATION',
      planets_involved: ['Moon', 'Jupiter'],
      tested_references: { moon_sign: moonSign, jupiter_sign: jupSign, house_from_moon: houseFromMoon, is_kendra: isKendra },
      conditions_satisfied: isKendra ? [`Jupiter in house ${houseFromMoon} from Moon`] : [],
      conditions_not_satisfied: isKendra ? [] : [`Jupiter must occupy Kendra from Moon (found in ${houseFromMoon}th house)`],
      mitigations_applied: isKendra && isDebilitated ? ['Debilitated Jupiter in Capricorn'] : [],
      evidence_text_en: evidenceEn,
      evidence_text_hi: evidenceHi,
      source_citation: 'Brihat Parashara Hora Shastra, Ch. 35, Sloka 3-4; Phaladeepika, Ch. 6, Sloka 2'
    };
  }

  public static evalBudhaditya(planets: Record<string, { sign: string; degree: number }>): EvaluatedYoga {
    const sunSign = planets.Sun?.sign || '';
    const mercSign = planets.Mercury?.sign || '';
    const isConjunct = sunSign === mercSign && Boolean(sunSign);

    const sunDeg = planets.Sun?.degree || 0;
    const mercDeg = planets.Mercury?.degree || 0;
    const diff = Math.round(Math.abs(sunDeg - mercDeg) * 100) / 100;
    const isCombust = isConjunct && diff < 14.0;

    const status: YogaDoshaStatus = isConjunct ? 'PRESENT' : 'ABSENT';
    const evidenceEn = isConjunct
      ? `Sun and Mercury are conjunct in ${sunSign} separated by ${diff}°.${isCombust ? ` Mercury is within combustion orb (${diff}° < 14°), which tempers independent delivery but preserves intellectual sharpness.` : ''}`
      : `Sun occupies ${sunSign} and Mercury occupies ${mercSign}; they are in adjacent or separate signs, not conjunct in the same sign.`;
    const evidenceHi = isConjunct
      ? `सूर्य और बुध ${sunSign} राशि में ${diff}° के अंतर पर युति में हैं।`
      : `सूर्य ${sunSign} और बुध ${mercSign} में स्थित हैं; दोनों अलग-अलग राशियों में होने के कारण युति नहीं बनाते।`;

    return {
      rule_id: 'YOGA_BUDHADITYA',
      rule_version: this.VERSION,
      name: 'Budhaditya Yoga',
      name_en: 'Budhaditya Yoga',
      name_hi: 'बुधादित्य योग',
      category: 'Intellectual / Administrative',
      tradition: 'Classical Parashari & Saravali',
      status,
      is_active: status === 'PRESENT',
      planets_involved: ['Sun', 'Mercury'],
      tested_references: { sun_sign: sunSign, mercury_sign: mercSign, same_sign: isConjunct },
      conditions_satisfied: isConjunct ? ['Sun and Mercury share same sign'] : [],
      conditions_not_satisfied: isConjunct ? [] : ['Sun and Mercury must occupy the same sign'],
      mitigations_applied: [],
      evidence_text_en: evidenceEn,
      evidence_text_hi: evidenceHi,
      source_citation: 'Saravali, Ch. 15, Sloka 1; Phaladeepika, Ch. 6, Sloka 3'
    };
  }

  public static evalAmala(
    planets: Record<string, { sign: string }>,
    lagnaSign: string,
    isUnknownTime: boolean
  ): EvaluatedYoga {
    const lagnaIdx = SIGNS.indexOf(lagnaSign);
    const moonIdx = SIGNS.indexOf(planets.Moon?.sign || '');

    const h10LagnaSign = lagnaIdx >= 0 && !isUnknownTime ? SIGNS[(lagnaIdx + 9) % 12] : null;
    const h10MoonSign = moonIdx >= 0 ? SIGNS[(moonIdx + 9) % 12] : null;

    const benefics = ['Jupiter', 'Venus', 'Mercury'];
    const lagnaBenefics = benefics.filter(b => planets[b]?.sign === h10LagnaSign);
    const moonBenefics = benefics.filter(b => planets[b]?.sign === h10MoonSign);

    const hasAmala = lagnaBenefics.length > 0 || moonBenefics.length > 0;
    const status: YogaDoshaStatus = hasAmala ? 'PRESENT' : 'ABSENT';

    const activeRefs: string[] = [];
    if (lagnaBenefics.length > 0) activeRefs.push(`${lagnaBenefics.join(', ')} in 10th from Lagna (${h10LagnaSign})`);
    if (moonBenefics.length > 0) activeRefs.push(`${moonBenefics.join(', ')} in 10th from Moon (${h10MoonSign})`);

    const evidenceEn = hasAmala
      ? `Natural benefic seated in 10th house: ${activeRefs.join('; ')}.`
      : `No natural benefic (Jupiter, Venus, Mercury) occupies the 10th house from Lagna (${h10LagnaSign || 'Indeterminate'}) or Moon (${h10MoonSign}).`;
    const evidenceHi = hasAmala
      ? `दशम भाव में शुभ ग्रह स्थित: ${activeRefs.join('; ')}।`
      : `लग्न से दशम (${h10LagnaSign || 'अनिर्णायक'}) अथवा चंद्र से दशम (${h10MoonSign}) में कोई नैसर्गिक शुभ ग्रह स्थित नहीं है।`;

    return {
      rule_id: 'YOGA_AMALA',
      rule_version: this.VERSION,
      name: 'Amala Yoga',
      name_en: 'Amala Yoga',
      name_hi: 'अमला योग',
      category: 'Reputation & Character',
      tradition: 'Classical Parashari (BPHS Ch. 35) & Phaladeepika',
      status,
      is_active: hasAmala,
      planets_involved: hasAmala ? [...lagnaBenefics, ...moonBenefics] : ['Jupiter', 'Venus', 'Mercury'],
      tested_references: { h10LagnaSign, h10MoonSign, lagnaBenefics, moonBenefics },
      conditions_satisfied: hasAmala ? ['Natural benefic in 10th house'] : [],
      conditions_not_satisfied: hasAmala ? [] : ['Natural benefic must occupy 10th from Lagna or Moon'],
      mitigations_applied: [],
      evidence_text_en: evidenceEn,
      evidence_text_hi: evidenceHi,
      source_citation: 'Brihat Parashara Hora Shastra, Ch. 35, Sloka 10-11; Phaladeepika, Ch. 6, Sloka 21'
    };
  }

  public static evalDharmaKarmadhipati(
    planets: Record<string, { sign: string; house?: number }>,
    lagnaSign: string,
    isUnknownTime: boolean
  ): EvaluatedYoga {
    if (isUnknownTime) {
      return {
        rule_id: 'YOGA_DHARMA_KARMADHIPATI',
        rule_version: this.VERSION,
        name: 'Dharma-Karmadhipati Raja Yoga',
        name_en: 'Dharma-Karmadhipati Raja Yoga',
        name_hi: 'धर्मा-कर्माधिपति राजयोग',
        category: 'Raja Yoga / Higher Purpose',
        tradition: 'Classical Parashari (BPHS Ch. 35)',
        status: 'INDETERMINATE',
        is_active: false,
        planets_involved: [],
        tested_references: {},
        conditions_satisfied: [],
        conditions_not_satisfied: ['Lagna houses cannot be resolved with certainty when birth time is unknown.'],
        mitigations_applied: [],
        evidence_text_en: 'Lagna houses cannot be resolved with certainty when birth time is unknown.',
        evidence_text_hi: 'जन्म समय अज्ञात होने पर लग्न भावों का निर्धारण संभव नहीं है।',
        source_citation: 'Brihat Parashara Hora Shastra, Ch. 35'
      };
    }

    const lagnaIdx = SIGNS.indexOf(lagnaSign);
    const h9Sign = SIGNS[(lagnaIdx + 8) % 12];
    const h10Sign = SIGNS[(lagnaIdx + 9) % 12];

    const lord9 = SIGN_LORDS[h9Sign];
    const lord10 = SIGN_LORDS[h10Sign];

    const sign9 = planets[lord9]?.sign || '';
    const sign10 = planets[lord10]?.sign || '';
    const h9 = planets[lord9]?.house || (((SIGNS.indexOf(sign9) - lagnaIdx + 12) % 12) + 1);
    const h10 = planets[lord10]?.house || (((SIGNS.indexOf(sign10) - lagnaIdx + 12) % 12) + 1);

    const isConjunction = sign9 === sign10 && Boolean(sign9);
    const isExchange = sign9 === h10Sign && sign10 === h9Sign;

    const idx9 = SIGNS.indexOf(sign9);
    const idx10 = SIGNS.indexOf(sign10);
    const signDist = idx9 >= 0 && idx10 >= 0 ? ((idx10 - idx9 + 12) % 12) + 1 : 0;
    const isMutual7th = signDist === 7;

    const isFormed = isConjunction || isExchange || isMutual7th;
    const relType = isConjunction ? 'Conjunction' : (isExchange ? 'Parivartana (Exchange)' : (isMutual7th ? 'Mutual 7th Aspect (Samasaptaka)' : 'None'));

    const status: YogaDoshaStatus = isFormed ? 'PRESENT' : 'ABSENT';
    const evidenceEn = isFormed
      ? `9th Lord (${lord9} ruling ${h9Sign}, seated in ${sign9} / House ${h9}) and 10th Lord (${lord10} ruling ${h10Sign}, seated in ${sign10} / House ${h10}) form a classical Dharma-Karmadhipati connection via ${relType}.`
      : `9th Lord (${lord9} in ${sign9}) and 10th Lord (${lord10} in ${sign10}) have no conjunction, mutual aspect, or exchange.`;
    const evidenceHi = isFormed
      ? `नवमेश ${lord9} (${sign9} / भाव ${h9}) और दशमेश ${lord10} (${sign10} / भाव ${h10}) के मध्य ${relType} द्वारा प्रतिष्ठित धर्मा-कर्माधिपति राजयोग निर्मित होता है।`
      : `नवमेश (${lord9} in ${sign9}) और दशमेश (${lord10} in ${sign10}) के मध्य युति, दृष्टि अथवा राशि-परिवर्तन का संबंध नहीं है।`;

    return {
      rule_id: 'YOGA_DHARMA_KARMADHIPATI',
      rule_version: this.VERSION,
      name: 'Dharma-Karmadhipati Raja Yoga',
      name_en: 'Dharma-Karmadhipati Raja Yoga',
      name_hi: 'धर्मा-कर्माधिपति राजयोग',
      category: 'Raja Yoga / Higher Purpose',
      tradition: 'Classical Parashari (BPHS Ch. 35)',
      status,
      is_active: isFormed,
      relationship_type: relType,
      planets_involved: [lord9, lord10],
      tested_references: { lagna: lagnaSign, h9Sign, lord9, h10Sign, lord10, sign9, sign10, relType },
      conditions_satisfied: isFormed ? [`Connection between 9th and 10th lords: ${relType}`] : [],
      conditions_not_satisfied: isFormed ? [] : ['No conjunction, aspect, or exchange between 9th and 10th lords'],
      mitigations_applied: [],
      evidence_text_en: evidenceEn,
      evidence_text_hi: evidenceHi,
      source_citation: 'Brihat Parashara Hora Shastra, Ch. 35, Sloka 25-28; Jataka Parijata, Ch. 7, Sloka 31'
    };
  }

  public static evalChandraMangala(planets: Record<string, { sign: string }>): EvaluatedYoga {
    const mSign = planets.Moon?.sign || '';
    const maSign = planets.Mars?.sign || '';
    const isConjunct = mSign === maSign && Boolean(mSign);
    const status: YogaDoshaStatus = isConjunct ? 'PRESENT' : 'ABSENT';

    return {
      rule_id: 'YOGA_CHANDRA_MANGALA',
      rule_version: this.VERSION,
      name: 'Chandra-Mangala Yoga',
      name_en: 'Chandra-Mangala Yoga',
      name_hi: 'चन्द्र-मंगल योग',
      category: 'Dhana / Wealth Enterprise',
      tradition: 'Classical Parashari & Phaladeepika',
      status,
      is_active: isConjunct,
      planets_involved: ['Moon', 'Mars'],
      tested_references: { moon_sign: mSign, mars_sign: maSign },
      conditions_satisfied: isConjunct ? ['Moon and Mars conjunct'] : [],
      conditions_not_satisfied: isConjunct ? [] : ['Moon and Mars in separate signs'],
      mitigations_applied: [],
      evidence_text_en: `Moon in ${mSign} and Mars in ${maSign} ${isConjunct ? 'share the same sign (conjunct)' : 'are in separate signs'}.`,
      evidence_text_hi: `चंद्र ${mSign} और मंगल ${maSign} ${isConjunct ? 'एक ही राशि में युतिबद्ध हैं' : 'अलग-अलग राशियों में स्थित हैं'}।`,
      source_citation: 'Phaladeepika, Ch. 6, Sloka 5'
    };
  }

  public static evalGuruMangala(planets: Record<string, { sign: string }>): EvaluatedYoga {
    const jSign = planets.Jupiter?.sign || '';
    const maSign = planets.Mars?.sign || '';
    const jIdx = SIGNS.indexOf(jSign);
    const maIdx = SIGNS.indexOf(maSign);

    const dist = jIdx >= 0 && maIdx >= 0 ? ((maIdx - jIdx + 12) % 12) + 1 : 0;
    const isActive = [1, 4, 7, 10].includes(dist);
    const status: YogaDoshaStatus = isActive ? 'PRESENT' : 'ABSENT';

    return {
      rule_id: 'YOGA_GURU_MANGALA',
      rule_version: this.VERSION,
      name: 'Guru-Mangala Yoga',
      name_en: 'Guru-Mangala Yoga',
      name_hi: 'गुरु-मंगल योग',
      category: 'Executive / Leadership',
      tradition: 'Classical Parashari',
      status,
      is_active: isActive,
      planets_involved: ['Jupiter', 'Mars'],
      tested_references: { jupiter_sign: jSign, mars_sign: maSign, relative_house: dist },
      conditions_satisfied: isActive ? ['Mutual Kendra relationship'] : [],
      conditions_not_satisfied: isActive ? [] : ['Not in mutual Kendra (1, 4, 7, 10)'],
      mitigations_applied: [],
      evidence_text_en: `Jupiter in ${jSign} and Mars in ${maSign} are in relative house distance ${dist} (${isActive ? 'Kendra relationship' : 'not in mutual Kendra'}).`,
      evidence_text_hi: `गुरु (${jSign}) और मंगल (${maSign}) परस्पर ${dist}वें भाव में हैं (${isActive ? 'केंद्र संबंध' : 'केंद्र संबंध नहीं है'})।`,
      source_citation: 'Brihat Parashara Hora Shastra'
    };
  }

  public static evalPanchaMahapurusha(
    planets: Record<string, { sign: string }>,
    lagnaSign: string,
    isUnknownTime: boolean
  ): EvaluatedYoga[] {
    if (isUnknownTime) return [];

    const lagnaIdx = SIGNS.indexOf(lagnaSign);
    const configs = [
      { p: 'Mars', titleEn: 'Ruchaka Yoga', titleHi: 'रुचक महापुरुष योग', id: 'YOGA_RUCHAKA', own: ['Aries', 'Scorpio'], exalt: 'Capricorn' },
      { p: 'Mercury', titleEn: 'Bhadra Yoga', titleHi: 'भद्र महापुरुष योग', id: 'YOGA_BHADRA', own: ['Gemini', 'Virgo'], exalt: 'Virgo' },
      { p: 'Jupiter', titleEn: 'Hamsa Yoga', titleHi: 'हंस महापुरुष योग', id: 'YOGA_HAMSA', own: ['Sagittarius', 'Pisces'], exalt: 'Cancer' },
      { p: 'Venus', titleEn: 'Malavya Yoga', titleHi: 'मालव्य महापुरुष योग', id: 'YOGA_MALAVYA', own: ['Taurus', 'Libra'], exalt: 'Pisces' },
      { p: 'Saturn', titleEn: 'Sasa Yoga', titleHi: 'शश महापुरुष योग', id: 'YOGA_SASA', own: ['Capricorn', 'Aquarius'], exalt: 'Libra' }
    ];

    return configs.map(c => {
      const pSign = planets[c.p]?.sign || '';
      const pIdx = SIGNS.indexOf(pSign);
      const h = pIdx >= 0 && lagnaIdx >= 0 ? ((pIdx - lagnaIdx + 12) % 12) + 1 : 0;
      const isKendra = [1, 4, 7, 10].includes(h);
      const isDignified = c.own.includes(pSign) || pSign === c.exalt;
      const isActive = isKendra && isDignified;
      const status: YogaDoshaStatus = isActive ? 'PRESENT' : 'ABSENT';

      const evidenceEn = isActive
        ? `${c.p} occupies Kendra (House ${h}) in its ${pSign === c.exalt ? 'exalted' : 'own'} sign (${pSign}).`
        : `${c.p} in ${pSign} (House ${h}) does not meet the Kendra-plus-own/exaltation criteria.`;
      const evidenceHi = isActive
        ? `${c.p} केंद्र (भाव ${h}) में अपनी ${pSign === c.exalt ? 'उच्च' : 'स्व'} राशि (${pSign}) में स्थित है।`
        : `${c.p} ${pSign} (भाव ${h}) में केंद्र एवं स्व/उच्च राशि की शर्त पूर्ण नहीं करता।`;

      return {
        rule_id: c.id,
        rule_version: this.VERSION,
        name: c.titleEn,
        name_en: c.titleEn,
        name_hi: c.titleHi,
        category: 'Pancha Mahapurusha Yoga',
        tradition: 'Classical Parashari (BPHS Ch. 35)',
        status,
        is_active: isActive,
        planets_involved: [c.p],
        tested_references: { sign: pSign, house: h, isKendra, isDignified },
        conditions_satisfied: isActive ? ['Planet in Kendra in own/exaltation sign'] : [],
        conditions_not_satisfied: isActive ? [] : ['Planet must occupy Kendra (1, 4, 7, 10) in own or exaltation sign'],
        mitigations_applied: [],
        evidence_text_en: evidenceEn,
        evidence_text_hi: evidenceHi,
        source_citation: 'Brihat Parashara Hora Shastra, Ch. 35, Sloka 5-9'
      };
    });
  }

  public static evalViparitaRaja(
    planets: Record<string, { sign: string }>,
    lagnaSign: string,
    isUnknownTime: boolean
  ): EvaluatedYoga[] {
    if (isUnknownTime) return [];

    const lagnaIdx = SIGNS.indexOf(lagnaSign);
    const configs = [
      { hNum: 6, titleEn: 'Harsha Viparita Raja Yoga', titleHi: 'हर्ष विपरीत राजयोग', id: 'YOGA_HARSHA_VIPARITA' },
      { hNum: 8, titleEn: 'Sarala Viparita Raja Yoga', titleHi: 'सरल विपरीत राजयोग', id: 'YOGA_SARALA_VIPARITA' },
      { hNum: 12, titleEn: 'Vimala Viparita Raja Yoga', titleHi: 'विमल विपरीत राजयोग', id: 'YOGA_VIMALA_VIPARITA' }
    ];

    return configs.map(c => {
      const lord = SIGN_LORDS[SIGNS[(lagnaIdx + c.hNum - 1) % 12]];
      const lordSign = planets[lord]?.sign || '';
      const lordSignIdx = SIGNS.indexOf(lordSign);
      const placedHouse = lordSignIdx >= 0 && lagnaIdx >= 0 ? ((lordSignIdx - lagnaIdx + 12) % 12) + 1 : 0;
      const isInDusthana = [6, 8, 12].includes(placedHouse);
      const isLagnaLord = lord === SIGN_LORDS[lagnaSign];
      const isActive = isInDusthana && !isLagnaLord;
      const status: YogaDoshaStatus = isActive ? 'PRESENT' : 'ABSENT';

      const reason = (isInDusthana && isLagnaLord)
        ? 'it also serves as the Lagna Lord (self-empowering rather than Viparita)'
        : `it occupies House ${placedHouse} (not 6, 8, or 12)`;

      const evidenceEn = isActive
        ? `${c.hNum}th Lord ${lord} is placed in Dusthana House ${placedHouse} without Lagna Lord conflict.`
        : `${c.hNum}th Lord ${lord} does not form ${c.titleEn} because ${reason}.`;
      const evidenceHi = isActive
        ? `${c.hNum}वें भाव के स्वामी ${lord} दुस्थान भाव ${placedHouse} में स्थित हैं।`
        : `${c.hNum}वें भाव के स्वामी ${lord} यह योग नहीं बनाते क्योंकि ${reason}।`;

      return {
        rule_id: c.id,
        rule_version: this.VERSION,
        name: c.titleEn,
        name_en: c.titleEn,
        name_hi: c.titleHi,
        category: 'Viparita Raja Yoga',
        tradition: 'Phaladeepika Ch. 6 & BPHS',
        status,
        is_active: isActive,
        planets_involved: [lord],
        tested_references: { lord, lordSign, placedHouse, isInDusthana, isLagnaLord },
        conditions_satisfied: isActive ? ['Dusthana lord situated in Dusthana without Lagna Lord conflict'] : [],
        conditions_not_satisfied: isActive ? [] : [reason],
        mitigations_applied: [],
        evidence_text_en: evidenceEn,
        evidence_text_hi: evidenceHi,
        source_citation: 'Phaladeepika, Ch. 6, Sloka 57-61'
      };
    });
  }

  public static evalKemadruma(
    planets: Record<string, { sign: string }>,
    lagnaSign: string,
    isUnknownTime: boolean
  ): EvaluatedYoga {
    const moonSign = planets.Moon?.sign || '';
    const mIdx = SIGNS.indexOf(moonSign);

    const h2Sign = SIGNS[(mIdx + 1) % 12];
    const h12Sign = SIGNS[(mIdx + 11) % 12];

    const qualifying = ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
    const surrounding: string[] = [];
    for (const p of qualifying) {
      const s = planets[p]?.sign;
      if (s === h2Sign || s === h12Sign) surrounding.push(`${p} in ${s}`);
    }

    const rawKemadruma = surrounding.length === 0 && mIdx >= 0;
    const cancellations: string[] = [];

    if (rawKemadruma && !isUnknownTime) {
      const lagnaIdx = SIGNS.indexOf(lagnaSign);
      if (lagnaIdx >= 0) {
        const kendraSigns = [SIGNS[lagnaIdx], SIGNS[(lagnaIdx + 3) % 12], SIGNS[(lagnaIdx + 6) % 12], SIGNS[(lagnaIdx + 9) % 12]];
        const occupants = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].filter(p => kendraSigns.includes(planets[p]?.sign));
        if (occupants.length > 0) {
          cancellations.push(`Kemadruma Bhanga: Kendras from Lagna occupied by ${occupants.join(', ')}`);
        }
      }
    }

    let status: YogaDoshaStatus = 'ABSENT';
    let evidenceEn = `No Kemadruma: Flanked by ${surrounding.join(', ')} in adjacent houses from Moon.`;
    let evidenceHi = `चंद्रमा के समीपवर्ती भावों में ग्रहों की उपस्थिति: ${surrounding.join(', ')}।`;

    if (rawKemadruma) {
      if (cancellations.length > 0) {
        status = 'PRESENT_WITH_MITIGATION';
        evidenceEn = `Raw Kemadruma present (no planet in 2nd/12th from Moon), but mitigated/cancelled by: ${cancellations.join('; ')}.`;
        evidenceHi = `केंद्राधिपतियों की शुभ स्थिति से केमद्रुम भंग राजयोग निर्मित होता है।`;
      } else {
        status = 'PRESENT';
        evidenceEn = `Kemadruma Yoga is formed: 2nd (${h2Sign}) and 12th (${h12Sign}) from natal Moon are devoid of physical planets.`;
        evidenceHi = `चंद्रमा से द्वितीय (${h2Sign}) एवं द्वादश (${h12Sign}) भाव में कोई भौतिक ग्रह उपस्थित नहीं है।`;
      }
    }

    return {
      rule_id: 'YOGA_KEMADRUMA',
      rule_version: this.VERSION,
      name: 'Kemadruma Yoga (and Kemadruma Bhanga)',
      name_en: 'Kemadruma Yoga (and Kemadruma Bhanga)',
      name_hi: 'केमद्रुम योग (एवं केमद्रुम भंग)',
      category: 'Lunar Affliction / Bhanga',
      tradition: 'Classical Parashari (BPHS Ch. 35)',
      status,
      is_active: status === 'PRESENT' || status === 'PRESENT_WITH_MITIGATION',
      planets_involved: ['Moon'],
      tested_references: { h2Sign, h12Sign, surrounding, cancellations },
      conditions_satisfied: rawKemadruma ? ['2nd and 12th from Moon vacant'] : [],
      conditions_not_satisfied: rawKemadruma ? [] : ['Planets present in adjacent houses from Moon'],
      mitigations_applied: cancellations,
      evidence_text_en: evidenceEn,
      evidence_text_hi: evidenceHi,
      source_citation: 'Brihat Parashara Hora Shastra, Ch. 35'
    };
  }

  // --------------------------------------------------------------------------
  // TRANSITS
  // --------------------------------------------------------------------------

  public static evaluateTransits(
    planets: Record<string, { sign: string }>,
    transitSaturnSign: string = YogaDoshaRegistryTS.DEFAULT_TRANSIT_SATURN,
    referenceDate?: string
  ): EvaluatedTransits {
    const moonSign = planets.Moon?.sign || '';
    const mIdx = SIGNS.indexOf(moonSign);
    const sIdx = SIGNS.indexOf(transitSaturnSign);

    const diff = mIdx >= 0 && sIdx >= 0 ? ((sIdx - mIdx + 12) % 12) + 1 : 0;
    const isSadeSati = [12, 1, 2].includes(diff);
    const isDhaiya = [4, 8].includes(diff);

    let ssPhase = 'Clear of Sade Sati';
    let ssPhaseHi = 'साढ़ेसाती से मुक्त';
    let ssDescEn = `Transiting Saturn in ${transitSaturnSign} occupies house ${diff} from natal Moon (${moonSign}), safely outside the Sade Sati zone (houses 12, 1, 2).`;
    let ssDescHi = `गोचरीय शनि ${transitSaturnSign} में चंद्रमा से ${diff}वें भाव में हैं, जो साढ़ेसाती क्षेत्र से पूर्णतः बाहर है।`;

    if (diff === 12) {
      ssPhase = 'Phase 1: Rising (Aarohan) — 12th from Moon';
      ssPhaseHi = 'प्रथम चरण: आरोहण — चंद्रमा से द्वादश भाव';
      ssDescEn = `Saturn in ${transitSaturnSign} transits the 12th house from natal Moon (${moonSign}). Demands lifestyle discipline, emotional consolidation, and prudent resource management.`;
      ssDescHi = `शनिदेव ${transitSaturnSign} में जन्म चंद्र (${moonSign}) से द्वादश भाव में गोचर कर रहे हैं।`;
    } else if (diff === 1) {
      ssPhase = 'Phase 2: Peak (Madhya / Janma Shani) — Over Natal Moon';
      ssPhaseHi = 'द्वितीय चरण: मध्य (जन्म शनि) — चंद्रमा के ऊपर';
      ssDescEn = `Saturn transits directly over natal Moon in ${moonSign}. Peak window of psychological resilience, duty, and deep introspection.`;
      ssDescHi = `शनिदेव जन्म चंद्र (${moonSign}) पर प्रत्यक्ष गोचर कर रहे हैं। मानसिक धैर्य और कर्तव्यनिष्ठा का काल।`;
    } else if (diff === 2) {
      ssPhase = 'Phase 3: Setting (Avarohan) — 2nd from Moon';
      ssPhaseHi = 'तृतीय चरण: अवरोहण — चंद्रमा से द्वितीय भाव';
      ssDescEn = `Saturn in ${transitSaturnSign} transits the 2nd house from natal Moon (${moonSign}). Financial stabilization, family responsibilities, and gradual liberation from heavy burdens.`;
      ssDescHi = `शनिदेव ${transitSaturnSign} में जन्म चंद्र (${moonSign}) से द्वितीय भाव में गोचर कर रहे हैं। पारिवारिक दायित्व और वित्तीय स्थिरता का काल।`;
    }

    let dhName = 'Inactive (No Active Dhaiya)';
    let dhNameHi = 'निष्क्रिय (कोई ढैया सक्रिय नहीं)';
    let dhDescEn = `Saturn occupies house ${diff} from Moon, free from 4th and 8th house Dhaiya transits.`;
    let dhDescHi = `शनिदेव चंद्रमा से ${diff}वें भाव में हैं; कोई ढैया सक्रिय नहीं है।`;

    if (diff === 4) {
      dhName = 'Kantaka Shani (4th House Dhaiya)';
      dhNameHi = 'कंटक शनि (चतुर्थ भाव ढैया)';
      dhDescEn = `Saturn in ${transitSaturnSign} transits the 4th house from natal Moon (${moonSign}), requiring domestic patience and mother's health mindfulness.`;
      dhDescHi = `शनिदेव चतुर्थ भाव में गोचरस्थ हैं; पारिवारिक धैर्य अपेक्षित है।`;
    } else if (diff === 8) {
      dhName = 'Ashtama Shani (8th House Dhaiya)';
      dhNameHi = 'अष्टम शनि (अष्टम भाव ढैया)';
      dhDescEn = `Saturn in ${transitSaturnSign} transits the 8th house from natal Moon (${moonSign}), counseling against speculative haste.`;
      dhDescHi = `शनिदेव अष्टम भाव में गोचरस्थ हैं; सट्टा व उतावलेपन से बचाव आवश्यक है।`;
    }

    let remedy: EvaluatedRemedy | null = null;
    if (isSadeSati || isDhaiya) {
      remedy = {
        mantra_sanskrit: 'ॐ शं शनैश्चराय नमः || ॐ प्रां प्रीं प्रौं सः शनैश्चराय नमः',
        mantra_transliteration: 'Om Sham Shanaishcharaya Namah || Om Praam Preem Proum Sah Shanaishcharaya Namah',
        meaning_en: 'Salutations to Lord Shani, dispenser of justice, patience, and karmic alignment.',
        meaning_hi: 'न्याय, धैर्य और कर्म-शोधन के अधिष्ठाता शनिदेव को सादर नमन।',
        daana_en: 'Feeding black dogs or crows, lighting a mustard oil lamp under a Peepal tree on Saturday evenings, and serving laborers.',
        daana_hi: 'शनिवार संध्या को पीपल के वृक्ष के नीचे सरसों के तेल का दीपक, काले श्वान या पक्षियों को आहार, एवं श्रमजीवियों का सत्कार।'
      };
    }

    return {
      sade_sati: {
        rule_id: 'TRANSIT_SADE_SATI',
        name_en: 'Shani Sade Sati',
        name_hi: 'शनि साढ़ेसाती',
        status: isSadeSati ? 'PRESENT' : 'ABSENT',
        is_active: isSadeSati,
        phase_en: ssPhase,
        phase_hi: ssPhaseHi,
        transit_saturn_sign: transitSaturnSign,
        natal_moon_sign: moonSign,
        house_from_moon: diff,
        evidence_text_en: ssDescEn,
        evidence_text_hi: ssDescHi,
        reference_date: referenceDate || new Date().toISOString().split('T')[0],
        remedy: isSadeSati ? remedy : null
      },
      kantaka_shani: {
        rule_id: 'TRANSIT_KANTAKA_SHANI',
        name_en: 'Kantaka Shani / Ashtama Dhaiya',
        name_hi: 'कंटक शनि / अष्टम ढैया',
        status: isDhaiya ? 'PRESENT' : 'ABSENT',
        is_active: isDhaiya,
        dhaiya_type_en: dhName,
        dhaiya_type_hi: dhNameHi,
        house_from_moon: diff,
        evidence_text_en: dhDescEn,
        evidence_text_hi: dhDescHi,
        remedy: isDhaiya ? remedy : null
      }
    };
  }
}
