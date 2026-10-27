/**
 * AstroVerse Pure Numerology Calculation Engine (TypeScript / Wallet Service)
 * Fully aligned with Python numerology_engine.py:
 * - Digit root 1 to 9
 * - Moolank (day 1-31 root)
 * - Bhagyank (full date root 1-9)
 * - Chaldean and Pythagorean letter breakdowns and roots
 * - Cheiro compound number classification
 * - 9x9 Planetary relationship matrix (Mitra-Sama-Shatru)
 * - Transparent weighted harmony formula
 * - Bounded Name Correction candidate generator (3 to 5 realistic alternatives)
 * - Signature guidance blueprint
 */

export const CHALDEAN_MAP: Record<string, number> = {
  A: 1, I: 1, J: 1, Q: 1, Y: 1,
  B: 2, K: 2, R: 2,
  C: 3, G: 3, L: 3, S: 3,
  D: 4, M: 4, T: 4,
  E: 5, H: 5, N: 5, X: 5,
  U: 6, V: 6, W: 6,
  O: 7, Z: 7,
  F: 8, P: 8
};

export const PYTHAGOREAN_MAP: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9,
  J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9,
  S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8
};

export const PLANET_DATA: Record<number, {
  planetEn: string;
  planetHi: string;
  archetypeEn: string;
  archetypeHi: string;
  elementEn: string;
  elementHi: string;
  qualitiesEn: string[];
  qualitiesHi: string[];
  luckyColorsEn: string[];
  luckyColorsHi: string[];
  luckyDaysEn: string[];
  luckyDaysHi: string[];
  luckyGemEn: string;
  luckyGemHi: string;
}> = {
  1: {
    planetEn: 'Sun (Surya)',
    planetHi: 'सूर्य (Surya)',
    archetypeEn: 'The Sovereign / Pioneer',
    archetypeHi: 'प्रणेता / मार्गदर्शक',
    elementEn: 'Fire',
    elementHi: 'अग्नि (Fire)',
    qualitiesEn: ['Leadership', 'Authority', 'Visionary', 'Self-reliance', 'Ambition'],
    qualitiesHi: ['नेतृत्व', 'प्रभुत्व', 'दूरदृष्टि', 'स्वावलंबन', 'महत्वाकांक्षा'],
    luckyColorsEn: ['Gold', 'Copper', 'Orange', 'Yellow'],
    luckyColorsHi: ['स्वर्णिम', 'ताम्र', 'नारंगी', 'पीला'],
    luckyDaysEn: ['Sunday', 'Monday'],
    luckyDaysHi: ['रविवार', 'सोमवार'],
    luckyGemEn: 'Ruby (Manikya)',
    luckyGemHi: 'माणिक्य (Ruby)'
  },
  2: {
    planetEn: 'Moon (Chandra)',
    planetHi: 'चंद्र (Chandra)',
    archetypeEn: 'The Nurturer / Intuitive',
    archetypeHi: 'संवेदनशील / शांतिदूत',
    elementEn: 'Water',
    elementHi: 'जल (Water)',
    qualitiesEn: ['Intuition', 'Empathy', 'Diplomacy', 'Imagination', 'Grace'],
    qualitiesHi: ['सहज ज्ञान', 'सहानुभूति', 'कूटनीति', 'कल्पनाशीलता', 'सौम्यता'],
    luckyColorsEn: ['Pearl White', 'Silver', 'Sea Green'],
    luckyColorsHi: ['श्वेत', 'चांदी', 'हल्का हरा'],
    luckyDaysEn: ['Monday', 'Friday'],
    luckyDaysHi: ['सोमवार', 'शुक्रवार'],
    luckyGemEn: 'Pearl (Moti) / Moonstone',
    luckyGemHi: 'मोती (Pearl)'
  },
  3: {
    planetEn: 'Jupiter (Guru / Brihaspati)',
    planetHi: 'बृहस्पति (Guru)',
    archetypeEn: 'The Sage / Master Mentor',
    archetypeHi: 'विद्वान / देवगुरु',
    elementEn: 'Ether (Akasha)',
    elementHi: 'आकाश (Ether)',
    qualitiesEn: ['Wisdom', 'Optimism', 'Counsel', 'Spirituality', 'Expansion'],
    qualitiesHi: ['ज्ञान', 'सकारात्मकता', 'परामर्श', 'आध्यात्मिकता', 'विस्तार'],
    luckyColorsEn: ['Bright Yellow', 'Saffron', 'Golden Yellow'],
    luckyColorsHi: ['पीला', 'केसरिया', 'स्वर्णिम पीला'],
    luckyDaysEn: ['Thursday', 'Tuesday'],
    luckyDaysHi: ['गुरुवार', 'मंगलवार'],
    luckyGemEn: 'Yellow Sapphire (Pukhraj)',
    luckyGemHi: 'पुखराज (Yellow Sapphire)'
  },
  4: {
    planetEn: 'Rahu (North Node)',
    planetHi: 'राहु (Rahu)',
    archetypeEn: 'The Catalyst / Reformer',
    archetypeHi: 'क्रांतिकारी / तकनीकी अन्वेषक',
    elementEn: 'Earth / Shadow',
    elementHi: 'पृथ्वी / छाया',
    qualitiesEn: ['Unconventionality', 'Technical Intellect', 'Strategy', 'Resilience'],
    qualitiesHi: ['अपरंपरागत', 'रणनीति', 'तकनीकी दक्षता', 'साहसिक निर्णय'],
    luckyColorsEn: ['Electric Blue', 'Steel Grey', 'Smoky Shades'],
    luckyColorsHi: ['नीला', 'स्लेटी', 'धूम्र वर्ण'],
    luckyDaysEn: ['Saturday', 'Sunday'],
    luckyDaysHi: ['शनिवार', 'रविवार'],
    luckyGemEn: 'Hessonite Garnet (Gomed)',
    luckyGemHi: 'गोमेद (Gomed)'
  },
  5: {
    planetEn: 'Mercury (Budha)',
    planetHi: 'बुध (Budha)',
    archetypeEn: 'The Communicator / Merchant',
    archetypeHi: 'बुद्धिमान / संचारक',
    elementEn: 'Air / Earth',
    elementHi: 'वायु / पृथ्वी',
    qualitiesEn: ['Versatility', 'Commerce', 'Analytical Mind', 'Eloquence', 'Adaptability'],
    qualitiesHi: ['वाकपटुता', 'व्यापारिक विवेक', 'विश्लेषण', 'तीव्र बुद्धि', 'अनुकूलन'],
    luckyColorsEn: ['Emerald Green', 'Turquoise', 'Mint Green'],
    luckyColorsHi: ['पन्ना हरा', 'फिरोजी', 'हल्का हरा'],
    luckyDaysEn: ['Wednesday', 'Friday'],
    luckyDaysHi: ['बुधवार', 'शुक्रवार'],
    luckyGemEn: 'Emerald (Panna)',
    luckyGemHi: 'पन्ना (Emerald)'
  },
  6: {
    planetEn: 'Venus (Shukra)',
    planetHi: 'शुक्र (Shukra)',
    archetypeEn: 'The Harmonizer / Artist',
    archetypeHi: 'कलाकार / सौंदर्य संरक्षक',
    elementEn: 'Water / Earth',
    elementHi: 'जल / पृथ्वी',
    qualitiesEn: ['Aesthetics', 'Luxury', 'Charisma', 'Harmony', 'Devotion'],
    qualitiesHi: ['सौंदर्य', 'आकर्षण', 'कला', 'वैवाहिक सुख', 'सौहार्द'],
    luckyColorsEn: ['Diamond White', 'Pastel Pink', 'Sky Blue'],
    luckyColorsHi: ['श्वेत', 'गुलाबी', 'हल्का नीला'],
    luckyDaysEn: ['Friday', 'Wednesday'],
    luckyDaysHi: ['शुक्रवार', 'बुधवार'],
    luckyGemEn: 'Diamond (Heera) / White Opal',
    luckyGemHi: 'हीरा (Diamond) / ओपल'
  },
  7: {
    planetEn: 'Ketu (South Node)',
    planetHi: 'केतु (Ketu)',
    archetypeEn: 'The Mystic / Researcher',
    archetypeHi: 'तपस्वी / गूढ़ अनुसंधानी',
    elementEn: 'Water / Ether',
    elementHi: 'जल / आकाश',
    qualitiesEn: ['Spiritual Insight', 'Metaphysics', 'Research', 'Detachment', 'Originality'],
    qualitiesHi: ['गूढ़ ज्ञान', 'अनुसंधान', 'वैराग्य', 'आत्मिक गहराई', 'मौलिकता'],
    luckyColorsEn: ['Sea Green', 'Light Yellow', 'Off-White'],
    luckyColorsHi: ['हल्का हरा', 'हल्का पीला', 'धूमिल श्वेत'],
    luckyDaysEn: ['Tuesday', 'Sunday'],
    luckyDaysHi: ['मंगलवार', 'रविवार'],
    luckyGemEn: "Cat's Eye (Lehsuniya)",
    luckyGemHi: 'लहसुनिया (Cat\'s Eye)'
  },
  8: {
    planetEn: 'Saturn (Shani)',
    planetHi: 'शनि (Shani)',
    archetypeEn: 'The Karmic Master / Builder',
    archetypeHi: 'कर्मफलदाता / न्यायप्रिय',
    elementEn: 'Air / Earth',
    elementHi: 'वायु / पृथ्वी',
    qualitiesEn: ['Discipline', 'Endurance', 'Justice', 'Organizational Mastery', 'Patience'],
    qualitiesHi: ['अनुशासन', 'धैर्य', 'न्यायप्रियता', 'कठिन परिश्रम', 'संगठन शक्ति'],
    luckyColorsEn: ['Navy Blue', 'Dark Violet', 'Charcoal Grey'],
    luckyColorsHi: ['गहरा नीला', 'बैंगनी', 'काला'],
    luckyDaysEn: ['Saturday', 'Wednesday'],
    luckyDaysHi: ['शनिवार', 'बुधवार'],
    luckyGemEn: 'Blue Sapphire (Neelam) / Amethyst',
    luckyGemHi: 'नीलम (Blue Sapphire) / जामुनिया'
  },
  9: {
    planetEn: 'Mars (Mangala)',
    planetHi: 'मंगल (Mangala)',
    archetypeEn: 'The Warrior / Protector',
    archetypeHi: 'योद्धा / सेनापति',
    elementEn: 'Fire',
    elementHi: 'अग्नि (Fire)',
    qualitiesEn: ['Valor', 'Drive', 'Dynamic Energy', 'Protective Instinct', 'Directness'],
    qualitiesHi: ['साहस', 'ऊर्जा', 'तेजस्विता', 'रक्षक भाव', 'दृढ़ संकल्प'],
    luckyColorsEn: ['Coral Red', 'Crimson', 'Rose'],
    luckyColorsHi: ['लाल', 'सिंदूरी', 'गुलाबी'],
    luckyDaysEn: ['Tuesday', 'Thursday'],
    luckyDaysHi: ['मंगलवार', 'गुरुवार'],
    luckyGemEn: 'Red Coral (Moonga)',
    luckyGemHi: 'मूंगा (Red Coral)'
  }
};

export const RELATIONSHIP_MATRIX: Record<number, Record<number, 'friendly' | 'neutral' | 'enemy'>> = {
  1: { 1: 'friendly', 2: 'friendly', 3: 'friendly', 4: 'neutral', 5: 'friendly', 6: 'enemy', 7: 'neutral', 8: 'enemy', 9: 'friendly' },
  2: { 1: 'friendly', 2: 'friendly', 3: 'neutral', 4: 'enemy', 5: 'friendly', 6: 'enemy', 7: 'neutral', 8: 'enemy', 9: 'enemy' },
  3: { 1: 'friendly', 2: 'friendly', 3: 'friendly', 4: 'enemy', 5: 'neutral', 6: 'enemy', 7: 'neutral', 8: 'enemy', 9: 'friendly' },
  4: { 1: 'neutral', 2: 'enemy', 3: 'enemy', 4: 'neutral', 5: 'friendly', 6: 'friendly', 7: 'friendly', 8: 'friendly', 9: 'enemy' },
  5: { 1: 'friendly', 2: 'neutral', 3: 'neutral', 4: 'neutral', 5: 'friendly', 6: 'friendly', 7: 'neutral', 8: 'neutral', 9: 'neutral' },
  6: { 1: 'enemy', 2: 'neutral', 3: 'enemy', 4: 'friendly', 5: 'friendly', 6: 'friendly', 7: 'neutral', 8: 'friendly', 9: 'enemy' },
  7: { 1: 'neutral', 2: 'neutral', 3: 'neutral', 4: 'friendly', 5: 'friendly', 6: 'neutral', 7: 'friendly', 8: 'neutral', 9: 'enemy' },
  8: { 1: 'enemy', 2: 'enemy', 3: 'enemy', 4: 'friendly', 5: 'friendly', 6: 'friendly', 7: 'neutral', 8: 'neutral', 9: 'enemy' },
  9: { 1: 'friendly', 2: 'friendly', 3: 'friendly', 4: 'enemy', 5: 'neutral', 6: 'enemy', 7: 'neutral', 8: 'enemy', 9: 'friendly' }
};

export const PREFERRED_COMPOUND_NUMBERS = new Set([14, 19, 21, 23, 24, 27, 32, 33, 37, 41, 42, 45, 46, 50]);
export const CHALLENGING_COMPOUND_NUMBERS = new Set([12, 16, 18, 26, 28]);

export function digitRoot1To9(value: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error('Value must be a non-negative finite integer');
  }
  const intVal = Math.floor(value);
  if (intVal === 0) return 0;
  return 1 + ((intVal - 1) % 9);
}

export function calculateMoolank(day: number): number {
  if (typeof day !== 'number' || day < 1 || day > 31) {
    throw new Error(`Invalid day: ${day}. Must be between 1 and 31.`);
  }
  return digitRoot1To9(day);
}

export function calculateBhagyank(dobStr: string): { destinyNumber: number; totalSum: number; dob: string; masterNumber: number | null } {
  const cleanDate = dobStr.trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cleanDate);
  if (!match) {
    throw new Error(`Invalid date format '${dobStr}'. Expected strict YYYY-MM-DD.`);
  }
  const digits = cleanDate.replace(/\D/g, '').split('').map(Number);
  if (digits.length !== 8) {
    throw new Error('Date must contain exactly 8 digits');
  }
  const totalSum = digits.reduce((acc, d) => acc + d, 0);
  const root = digitRoot1To9(totalSum);

  let masterNum: number | null = null;
  let curr = totalSum;
  while (curr > 9) {
    if (curr === 11 || curr === 22 || curr === 33) {
      masterNum = curr;
      break;
    }
    curr = String(curr).split('').reduce((acc, d) => acc + Number(d), 0);
  }

  return { destinyNumber: root, totalSum, dob: cleanDate, masterNumber: masterNum };
}

export function calculateNaamank(name: string): {
  normalizedName: string;
  chaldean: { compoundTotal: number; naamank: number; breakdown: { letter: string; value: number }[]; governingPlanet: string; isPreferred: boolean; isChallenging: boolean };
  pythagorean: { compoundTotal: number; naamank: number; breakdown: { letter: string; value: number }[]; governingPlanet: string };
} {
  const upper = name.trim().toUpperCase();
  const letters = upper.replace(/[^A-Z]/g, '');
  if (!letters) {
    throw new Error('Name must contain at least one valid Latin letter (A-Z).');
  }

  const chaldeanBreakdown: { letter: string; value: number }[] = [];
  const pythagoreanBreakdown: { letter: string; value: number }[] = [];
  let chaldeanSum = 0;
  let pythagoreanSum = 0;

  for (const ch of letters) {
    const cVal = CHALDEAN_MAP[ch] || 0;
    const pVal = PYTHAGOREAN_MAP[ch] || 0;
    chaldeanBreakdown.push({ letter: ch, value: cVal });
    pythagoreanBreakdown.push({ letter: ch, value: pVal });
    chaldeanSum += cVal;
    pythagoreanSum += pVal;
  }

  const chaldeanRoot = digitRoot1To9(chaldeanSum);
  const pythagoreanRoot = digitRoot1To9(pythagoreanSum);

  return {
    normalizedName: upper.replace(/\s+/g, ' '),
    chaldean: {
      compoundTotal: chaldeanSum,
      naamank: chaldeanRoot,
      breakdown: chaldeanBreakdown,
      governingPlanet: PLANET_DATA[chaldeanRoot]?.planetEn || 'Unknown',
      isPreferred: PREFERRED_COMPOUND_NUMBERS.has(chaldeanSum),
      isChallenging: CHALLENGING_COMPOUND_NUMBERS.has(chaldeanSum)
    },
    pythagorean: {
      compoundTotal: pythagoreanSum,
      naamank: pythagoreanRoot,
      breakdown: pythagoreanBreakdown,
      governingPlanet: PLANET_DATA[pythagoreanRoot]?.planetEn || 'Unknown'
    }
  };
}

export function calculateHarmonyScore(moolank: number, bhagyank: number, chaldeanCompound: number): {
  score: number;
  alignmentTierEn: string;
  alignmentTierHi: string;
  moolankRel: string;
  bhagyankRel: string;
} {
  const naamank = digitRoot1To9(chaldeanCompound);
  const relM = RELATIONSHIP_MATRIX[moolank]?.[naamank] || 'neutral';
  const relB = RELATIONSHIP_MATRIX[bhagyank]?.[naamank] || 'neutral';

  const scoreM = relM === 'friendly' ? 100 : relM === 'enemy' ? 30 : 65;
  const scoreB = relB === 'friendly' ? 100 : relB === 'enemy' ? 30 : 65;
  const scoreC = PREFERRED_COMPOUND_NUMBERS.has(chaldeanCompound) ? 100 : CHALLENGING_COMPOUND_NUMBERS.has(chaldeanCompound) ? 30 : 65;

  const finalScore = Math.round(0.40 * scoreM + 0.40 * scoreB + 0.20 * scoreC);

  let tierEn = 'Moderate Synergy (Favorable)';
  let tierHi = 'उत्तम सामंजस्य (अनुकूल)';
  if (finalScore >= 85) {
    tierEn = 'High Synergy (Highly Auspicious)';
    tierHi = 'अति उत्तम सामंजस्य (परम शुभ)';
  } else if (finalScore < 50) {
    tierEn = 'Planetary Friction (Correction Recommended)';
    tierHi = 'ग्रहीय विरोध (नाम सुधार अनुशंसित)';
  }

  return {
    score: finalScore,
    alignmentTierEn: tierEn,
    alignmentTierHi: tierHi,
    moolankRel: relM,
    bhagyankRel: relB
  };
}

export function levenshteinDistance(s1: string, s2: string): number {
  if (s1.length < s2.length) return levenshteinDistance(s2, s1);
  if (s2.length === 0) return s1.length;
  let previousRow = Array.from({ length: s2.length + 1 }, (_, i) => i);
  for (let i = 0; i < s1.length; i++) {
    const currentRow = [i + 1];
    for (let j = 0; j < s2.length; j++) {
      const insertions = previousRow[j + 1] + 1;
      const deletions = currentRow[j] + 1;
      const substitutions = previousRow[j] + (s1[i] !== s2[j] ? 1 : 0);
      currentRow.push(Math.min(insertions, deletions, substitutions));
    }
    previousRow = currentRow;
  }
  return previousRow[previousRow.length - 1];
}

export interface NameCorrectionCandidate {
  proposedName: string;
  editDistance: number;
  transformationNote: string;
  chaldeanCompound: number;
  chaldeanRoot: number;
  harmonyScore: number;
  suitabilityScore: number;
  compositeRank: number;
  governingPlanet: string;
  isPreferredCompound: boolean;
}

export function generateNameCorrectionCandidates(
  fullName: string,
  moolank: number,
  bhagyank: number,
  targetCount: number = 5
): NameCorrectionCandidate[] {
  const upper = fullName.trim().toUpperCase().replace(/\s+/g, ' ');
  const words = upper.split(' ');
  const firstName = words[0];
  const surname = words.slice(1).join(' ');

  const candidatesSet = new Set<string>();
  const rawVariations: { name: string; note: string }[] = [];

  // Helper to add candidate safely
  function addVariation(candName: string, note: string) {
    const formatted = candName.trim().toUpperCase().replace(/\s+/g, ' ');
    if (formatted !== upper && !candidatesSet.has(formatted)) {
      candidatesSet.add(formatted);
      rawVariations.push({ name: formatted, note });
    }
  }

  // 1. Classical Vedic Vowel Extensions (A -> AA, I -> EE, E -> EE, U -> OO)
  const vowelTransformations: [string, string, string][] = [
    ['A', 'AA', 'Classical Sanskrit vowel lengthening (A -> AA)'],
    ['I', 'EE', 'Phonetic vowel harmonizer (I -> EE)'],
    ['E', 'EE', 'Extended solar resonance (E -> EE)'],
    ['U', 'OO', 'Deep resonance acoustic vowel alignment (U -> OO)']
  ];
  for (const [origV, newV, note] of vowelTransformations) {
    if (firstName.includes(origV)) {
      const idx = firstName.indexOf(origV);
      const variant = firstName.slice(0, idx) + newV + firstName.slice(idx + origV.length);
      addVariation(variant + (surname ? ' ' + surname : ''), note);
    }
  }

  // 2. Classical Sanskrit Aspirated Consonants (S -> SH, K -> KH, D -> DH, T -> TH, G -> GH, B -> BH, C -> CH, P -> PH)
  // Note: 'R' is not aspirable in Indian phonology; avoid 'RH'.
  const aspiratedPairs: [string, string, string][] = [
    ['S', 'SH', "Sanskrit sibilant elevation ('S' -> 'SH')"],
    ['K', 'KH', "Devanagari aspirated resonant ('K' -> 'KH')"],
    ['D', 'DH', "Vedic soft-aspirate harmonizer ('D' -> 'DH')"],
    ['T', 'TH', "Phonetic dental aspirate ('T' -> 'TH')"],
    ['G', 'GH', "Throat chakra velar aspirate ('G' -> 'GH')"],
    ['B', 'BH', "Auspicious Jupiterian aspirate ('B' -> 'BH')"],
    ['C', 'CH', "Phonetic palatal reinforcement ('C' -> 'CH')"],
    ['P', 'PH', "Phonetic labial aspirate ('P' -> 'PH')"]
  ];
  for (const [origC, newC, note] of aspiratedPairs) {
    if (firstName.includes(origC) && !firstName.includes(origC + 'H')) {
      const idx = firstName.indexOf(origC);
      const variant = firstName.slice(0, idx) + newC + firstName.slice(idx + 1);
      addVariation(variant + (surname ? ' ' + surname : ''), note);
    }
  }

  // 3. Resonant doubling of internal or terminal consonants (NEVER at index 0)
  const doubleConsonants = ['L', 'N', 'M', 'T', 'R', 'S', 'D', 'K', 'P'];
  for (const c of doubleConsonants) {
    // Check if letter exists after the first character
    const idx = firstName.indexOf(c, 1);
    if (idx > 0 && !firstName.includes(c + c)) {
      const variant = firstName.slice(0, idx) + c + c + firstName.slice(idx + 1);
      addVariation(variant + (surname ? ' ' + surname : ''), `Resonant acoustic doubling of internal '${c}'`);
    }
    // Also check if last character matches and wasn't already caught at idx
    if (firstName.endsWith(c) && !firstName.endsWith(c + c)) {
      const variant = firstName + c;
      addVariation(variant + (surname ? ' ' + surname : ''), `Terminal resonant consonant reinforcement ('${c}')`);
    }
  }

  // 4. Classical Sanskrit nominative/harmonic terminal vowel ('A') or Visarga ('H')
  if (!firstName.endsWith('A') && !firstName.endsWith('H')) {
    addVariation(`${firstName}A` + (surname ? ' ' + surname : ''), "Classical Sanskrit terminal 'A' harmonic");
  } else if (firstName.endsWith('A')) {
    addVariation(`${firstName}H` + (surname ? ' ' + surname : ''), "Classical soft-visarga terminal 'H'");
  }

  // 5. Combined harmonic adjustments (edit distance = 2) for rich vibration optimization
  if (firstName.includes('A') && firstName.length > 2) {
    const lastChar = firstName.slice(-1);
    if (['L', 'N', 'T', 'M', 'R', 'S'].includes(lastChar) && !firstName.endsWith(lastChar + lastChar)) {
      const idxA = firstName.indexOf('A');
      const doubled = firstName.slice(0, idxA) + 'AA' + firstName.slice(idxA + 1) + lastChar;
      addVariation(doubled + (surname ? ' ' + surname : ''), `Harmonic vowel-consonant resonance coupling (A->AA, ${lastChar}->${lastChar}${lastChar})`);
    }
  }

  // 6. Astrological Family / Karmic Initial (Standard Indian Professional Numerology Practice)
  // Appends an auspicious initial (e.g. K., S., V., A., R., M.) to harmonize total compound
  const auspiciousInitials = ['K.', 'V.', 'S.', 'A.', 'R.', 'M.', 'D.', 'N.'];
  for (const init of auspiciousInitials) {
    const withInit = `${firstName} ${init}` + (surname ? ' ' + surname : '');
    addVariation(withInit, `Auspicious harmonic initial anchor (${init})`);
  }

  // Score candidates
  const scored: NameCorrectionCandidate[] = [];
  for (const { name, note } of rawVariations) {
    try {
      const calc = calculateNaamank(name);
      const comp = calc.chaldean.compoundTotal;
      const root = calc.chaldean.naamank;
      const harm = calculateHarmonyScore(moolank, bhagyank, comp);
      const dist = levenshteinDistance(upper, name);
      if (dist > 2) continue; // enforce max edit distance <= 2

      const isPref = PREFERRED_COMPOUND_NUMBERS.has(comp);
      const isChall = CHALLENGING_COMPOUND_NUMBERS.has(comp);
      const prefBonus = isPref ? 15 : isChall ? -15 : 0;
      const compositeRank = harm.score + prefBonus - dist * 4;

      scored.push({
        proposedName: name,
        editDistance: dist,
        transformationNote: note,
        chaldeanCompound: comp,
        chaldeanRoot: root,
        harmonyScore: harm.score,
        suitabilityScore: Math.min(100, Math.max(20, harm.score + (isPref ? 8 : isChall ? -12 : 0))),
        compositeRank,
        governingPlanet: PLANET_DATA[root]?.planetEn || 'Unknown',
        isPreferredCompound: isPref
      });
    } catch {
      // skip invalid name candidates
    }
  }

  // Deduplicate by proposedName
  const uniqueScored: NameCorrectionCandidate[] = [];
  const seenNames = new Set<string>();
  for (const item of scored) {
    if (!seenNames.has(item.proposedName)) {
      seenNames.add(item.proposedName);
      uniqueScored.push(item);
    }
  }

  uniqueScored.sort((a, b) => b.compositeRank - a.compositeRank || b.harmonyScore - a.harmonyScore || a.editDistance - b.editDistance);
  return uniqueScored.slice(0, targetCount);
}

export function getSignatureGuidance(moolank: number, name: string): {
  recommendedSlope: string;
  underlineRule: string;
  dotRule: string;
  initialLetterRule: string;
  guidanceEn: Record<string, string>;
  guidanceHi: Record<string, string>;
} {
  return {
    recommendedSlope: '+15° to +25° (Upward Ascending)',
    underlineRule: 'Clean, continuous straight underline beneath the signature without crossing descending letter loops.',
    dotRule: 'Place two distinct, stable dots beneath the underline to ground personal authority and financial stability.',
    initialLetterRule: 'Keep the initial letter prominently formed and slightly larger than the rest to project natural leadership.',
    guidanceEn: {
      slope: 'Ascending slope of +15° to +25° projects optimism, ambition, and continuous elevation.',
      underline: 'Single solid underline anchors confidence and stability in worldly affairs.',
      dots: 'Two dots ground wealth and prevent dissipation of creative energy.',
      legibility: 'Ensure clean legibility; avoid strikes or crossing through the name.'
    },
    guidanceHi: {
      slope: 'बाएं से दाएं +15° से +25° का आरोही झुकाव निरंतर प्रगति और आशा का प्रतीक है।',
      underline: 'नीचे एक स्पष्ट अखंड रेखा आत्मविश्वास और स्थिरता को मजबूत करती है।',
      dots: 'रेखा के नीचे दो बिंदु धन और स्थायित्व को सुदृढ़ करते हैं।',
      legibility: 'हस्ताक्षर स्पष्ट और पठनीय होना चाहिए; अपने नाम को काटने से बचें।'
    }
  };
}

export function analyzeBusinessName(name: string, industry: string = 'General', ownerMoolank?: number, ownerBhagyank?: number) {
  const calc = calculateNaamank(name);
  const comp = calc.chaldean.compoundTotal;
  const root = calc.chaldean.naamank;
  let ownerSynergy: any = null;

  if (ownerMoolank && ownerBhagyank) {
    const harm = calculateHarmonyScore(ownerMoolank, ownerBhagyank, comp);
    ownerSynergy = {
      ownerMoolank,
      ownerBhagyank,
      harmonyScore: harm.score,
      alignmentTierEn: harm.alignmentTierEn,
      alignmentTierHi: harm.alignmentTierHi
    };
  }

  return {
    normalizedName: calc.normalizedName,
    industry,
    chaldeanCompound: comp,
    chaldeanRoot: root,
    pythagoreanCompound: calc.pythagorean.compoundTotal,
    pythagoreanRoot: calc.pythagorean.naamank,
    isPreferredCompound: PREFERRED_COMPOUND_NUMBERS.has(comp),
    governingPlanet: PLANET_DATA[root]?.planetEn || 'Unknown',
    ownerAlignment: ownerSynergy
  };
}

export function analyzeMobileNumber(phoneStr: string, moolank?: number, bhagyank?: number) {
  const digits = phoneStr.replace(/\D/g, '').split('').map(Number);
  if (digits.length === 0) {
    throw new Error('Mobile number must contain valid digits.');
  }
  const calcDigits = digits.length >= 10 ? digits.slice(-10) : digits;
  const sum = calcDigits.reduce((acc, d) => acc + d, 0);
  const root = digitRoot1To9(sum);
  const masked = phoneStr.length > 5 ? phoneStr.slice(0, 3) + '-XXXXX-' + phoneStr.slice(-5) : phoneStr;

  return {
    masked,
    digitCount: calcDigits.length,
    digitSum: sum,
    root,
    governingPlanet: PLANET_DATA[root]?.planetEn || 'Unknown',
    qualities: PLANET_DATA[root]?.qualitiesEn || []
  };
}

export const NumerologyCalculator = {
  digitRoot1To9,
  calculateMoolank: (input: string | number) => {
    if (typeof input === 'string') {
      const clean = input.trim().slice(0, 10);
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean);
      if (!match) throw new Error(`Invalid date format '${input}'.`);
      const day = parseInt(match[3], 10);
      return calculateMoolank(day);
    }
    return calculateMoolank(input);
  },
  calculateBhagyank: (dobStr: string) => {
    const res = calculateBhagyank(dobStr);
    return { sum: res.totalSum, bhagyank: res.destinyNumber, masterNumber: res.masterNumber };
  },
  calculateNaamank: (name: string, system: 'chaldean' | 'pythagorean' = 'chaldean') => {
    const calc = calculateNaamank(name);
    if (system === 'pythagorean') {
      return {
        compound: calc.pythagorean.compoundTotal,
        root: calc.pythagorean.naamank,
        breakdown: calc.pythagorean.breakdown,
        planet: calc.pythagorean.governingPlanet
      };
    }
    return {
      compound: calc.chaldean.compoundTotal,
      root: calc.chaldean.naamank,
      breakdown: calc.chaldean.breakdown,
      planet: calc.chaldean.governingPlanet,
      isPreferred: calc.chaldean.isPreferred,
      isChallenging: calc.chaldean.isChallenging
    };
  },
  getPlanetaryRelationship: (num1: number, num2: number) => {
    const root1 = digitRoot1To9(num1);
    const root2 = digitRoot1To9(num2);
    const rel = RELATIONSHIP_MATRIX[root1]?.[root2] || 'neutral';
    const score = rel === 'friendly' ? 100 : rel === 'enemy' ? 30 : 65;
    return { relation: rel, score };
  },
  calculateHarmonyScore: (moolank: number, bhagyank: number, naamank: number, chaldeanCompound: number) => {
    const harm = calculateHarmonyScore(moolank, bhagyank, chaldeanCompound);
    return {
      score: harm.score,
      status: harm.score >= 80 ? 'excellent' : harm.score >= 60 ? 'good' : 'friction'
    };
  },
  generateNameCorrectionCandidates: (name: string, moolank: number, bhagyank: number, targetCount: number = 5) => {
    return generateNameCorrectionCandidates(name, moolank, bhagyank, targetCount);
  },
  getSignatureGuidance,
  analyzeBusinessName,
  analyzeMobileNumber
};
