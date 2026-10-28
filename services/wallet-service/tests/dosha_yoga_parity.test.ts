/**
 * AstroVerse Classical Vedic Dosha & Yoga Parity Test Suite
 * =========================================================
 * Verifies calculation integrity, eliminates false positives on reference chart,
 * ensures source-validated classical Parashari rules, and confirms report generation
 * consistency across PDF and in-app reader.
 */

import { AstroCalculator, CalculatedChart } from '../src/monetization/astroCalculator';
import { YogaDoshaRegistryTS } from '../src/monetization/yogaDoshaRegistry';
import { ReportDocumentGenerator } from '../src/monetization/reportGenerator';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

console.log('===============================================================');
console.log('ASTROVERSE CLASSICAL VEDIC YOGA & DOSHA PARITY TEST SUITE');
console.log('===============================================================\n');

// -----------------------------------------------------------------------------
// 1. ASTRONOMICAL POSITIONS ON REFERENCE CHART (Aryan Tiwari Fixture)
// 2005-08-20, 14:05 IST, Jabalpur (23.17° N, 79.95° E)
// -----------------------------------------------------------------------------
console.log('--- 1. REFERENCE CHART ASTRONOMICAL EPHEMERIS POSITIONS ---');

const chart = AstroCalculator.calculateChart(
  '2005-08-20',
  '14:05',
  23.17,
  79.95,
  false
);

assert(chart.lagna.sign === 'Scorpio', `Lagna must be Scorpio (got: ${chart.lagna.sign})`);
assert(Math.abs(chart.lagna.degree - 24.16) < 1.0, `Lagna degree must be ~24.16° (got: ${chart.lagna.degree}°)`);
assert(chart.planets.Moon.sign === 'Aquarius', `Moon must be Aquarius (got: ${chart.planets.Moon.sign})`);
assert(chart.planets.Moon.house === 4, `Moon must be in House 4 (got: ${chart.planets.Moon.house})`);
assert(chart.planets.Sun.sign === 'Leo', `Sun must be Leo (got: ${chart.planets.Sun.sign})`);
assert(chart.planets.Sun.house === 10, `Sun must be in House 10 (got: ${chart.planets.Sun.house})`);
assert(chart.planets.Mars.sign === 'Aries', `Mars must be Aries (got: ${chart.planets.Mars.sign})`);
assert(chart.planets.Mars.house === 6, `Mars must be in House 6 (got: ${chart.planets.Mars.house})`);
assert(chart.planets.Mercury.sign === 'Cancer', `Mercury must be Cancer (got: ${chart.planets.Mercury.sign})`);
assert(chart.planets.Mercury.house === 9, `Mercury must be in House 9 (got: ${chart.planets.Mercury.house})`);
assert(chart.planets.Jupiter.sign === 'Virgo', `Jupiter must be Virgo (got: ${chart.planets.Jupiter.sign})`);
assert(chart.planets.Jupiter.house === 11, `Jupiter must be in House 11 (got: ${chart.planets.Jupiter.house})`);
assert(chart.planets.Venus.sign === 'Virgo', `Venus must be Virgo (got: ${chart.planets.Venus.sign})`);
assert(chart.planets.Venus.house === 11, `Venus must be in House 11 (got: ${chart.planets.Venus.house})`);
assert(chart.planets.Saturn.sign === 'Cancer', `Saturn must be Cancer (got: ${chart.planets.Saturn.sign})`);
assert(chart.planets.Saturn.house === 9, `Saturn must be in House 9 (got: ${chart.planets.Saturn.house})`);
assert(chart.planets.Rahu.sign === 'Pisces', `Rahu must be Pisces (got: ${chart.planets.Rahu.sign})`);
assert(chart.planets.Ketu.sign === 'Virgo', `Ketu must be Virgo (got: ${chart.planets.Ketu.sign})`);

// -----------------------------------------------------------------------------
// 2. YOGA EVALUATION & FALSE-POSITIVE ELIMINATION
// -----------------------------------------------------------------------------
console.log('\n--- 2. YOGA EVALUATION & FALSE-POSITIVE ELIMINATION ---');

const yogas = chart.yogas || [];
assert(yogas.length >= 15, `Evaluated yogas registry must contain at least 15 classical rules (got: ${yogas.length})`);

// Gajakesari Yoga: MUST BE ABSENT (Jupiter in Virgo is 8th from Moon in Aquarius, Dusthana)
const gajakesari = yogas.find(y => y.rule_id === 'YOGA_GAJAKESARI');
assert(gajakesari !== undefined, 'Gajakesari rule must be in registry');
assert(gajakesari!.status === 'ABSENT', `Gajakesari Yoga must be ABSENT (got: ${gajakesari!.status})`);
assert(gajakesari!.evidence_text_en.includes('8th') || gajakesari!.evidence_text_en.includes('Virgo'), 'Gajakesari evidence must cite 8th house / Virgo from Moon');

// Budhaditya Yoga: MUST BE ABSENT (Sun in Leo, Mercury in Cancer -> different signs)
const budhaditya = yogas.find(y => y.rule_id === 'YOGA_BUDHADITYA');
assert(budhaditya !== undefined, 'Budhaditya rule must be in registry');
assert(budhaditya!.status === 'ABSENT', `Budhaditya Yoga must be ABSENT (got: ${budhaditya!.status})`);
assert(budhaditya!.evidence_text_en.includes('different') || budhaditya!.evidence_text_en.includes('adjacent') || budhaditya!.evidence_text_en.includes('Leo'), 'Budhaditya evidence must cite separate signs');

// Amala Yoga: MUST BE ABSENT (10th from Lagna is Leo with Sun; 10th from Moon is Scorpio/empty)
const amala = yogas.find(y => y.rule_id === 'YOGA_AMALA');
assert(amala !== undefined, 'Amala rule must be in registry');
assert(amala!.status === 'ABSENT', `Amala Yoga must be ABSENT (got: ${amala!.status})`);

// Dharma-Karmadhipati Raja Yoga: MUST BE PRESENT (9th lord Moon in H4, 10th lord Sun in H10 in mutual 7th aspect)
const dkr = yogas.find(y => y.rule_id === 'YOGA_DHARMA_KARMADHIPATI');
assert(dkr !== undefined, 'Dharma-Karmadhipati rule must be in registry');
assert(dkr!.status === 'PRESENT', `Dharma-Karmadhipati Raja Yoga must be PRESENT (got: ${dkr!.status})`);
assert(dkr!.relationship_type === 'Mutual 7th Aspect (Samasaptaka)', `DKR relationship type must be Mutual 7th Aspect (Samasaptaka) (got: ${dkr!.relationship_type})`);

// -----------------------------------------------------------------------------
// 3. DOSHA EVALUATION: MULTI-REFERENCE MANGLIK, KAAL SARP & SADE SATI
// -----------------------------------------------------------------------------
console.log('\n--- 3. DOSHA EVALUATION: MULTI-REFERENCE MANGLIK, KAAL SARP & SADE SATI ---');

const doshas = chart.doshas || {};
const manglik = doshas.manglik;
assert(manglik !== undefined, 'Manglik dosha must be evaluated');
assert(manglik.status === 'PRESENT_WITH_MITIGATION', `Manglik status must be PRESENT_WITH_MITIGATION (got: ${manglik.status})`);
assert(manglik.mitigations_applied.some(m => m.includes('Aries') || m.includes('Swakshetra')), 'Manglik must apply Aries Swakshetra mitigation');
assert(manglik.tested_references.from_lagna.qualifies === false, 'From Lagna: Mars in H6 is NOT met');
assert(manglik.tested_references.from_moon.qualifies === false, 'From Moon: Mars in H3 is NOT met');
assert(manglik.tested_references.from_venus.qualifies === true, 'From Venus: Mars in H8 is met');

// Chart kujaDosha summary property
assert(chart.kujaDosha.hasDosha === false, 'chart.kujaDosha.hasDosha must be false (mitigated)');
assert(chart.kujaDosha.isCancelled === true, 'chart.kujaDosha.isCancelled must be true');

// Kaal Sarpa Dosha: MUST BE ABSENT
const kalsarp = doshas.kaal_sarp || doshas.kalsarp;
assert(kalsarp !== undefined, 'Kaal Sarpa dosha must be evaluated');
assert(kalsarp.status === 'ABSENT', `Kaal Sarpa status must be ABSENT (got: ${kalsarp.status})`);
assert(kalsarp.has_dosha === false, 'Kaal Sarpa has_dosha must be false');

// Shani Sade Sati: MUST BE PRESENT (Phase 3: Setting)
const transits = chart.transits!;
assert(transits.sade_sati !== undefined, 'Sade Sati must be evaluated');
assert(transits.sade_sati.status === 'PRESENT', `Sade Sati status must be PRESENT (got: ${transits.sade_sati.status})`);
assert(transits.sade_sati.phase_en.includes('Phase 3'), `Sade Sati phase must be Phase 3 (got: ${transits.sade_sati.phase_en})`);

// Kantaka Shani: MUST BE ABSENT
assert(transits.kantaka_shani.status === 'ABSENT', `Kantaka Shani must be ABSENT (got: ${transits.kantaka_shani.status})`);
assert(transits.kantaka_shani.is_active === false, 'Kantaka Shani must be inactive');

// -----------------------------------------------------------------------------
// 4. REPORT GENERATOR CONSISTENCY (Chapter 6 & Chapter 7)
// -----------------------------------------------------------------------------
console.log('\n--- 4. REPORT GENERATOR CONSISTENCY (JANAM KUNDLI DEEP DIVE) ---');

const profile = {
  id: 'prof_test_aryan',
  profileName: 'Aryan Tiwari',
  dateOfBirth: '2005-08-20',
  timeOfBirth: '14:05',
  birthplaceName: 'Jabalpur, Madhya Pradesh, India',
  latitude: 23.17,
  longitude: 79.95,
  resolvedTimezone: 'Asia/Kolkata',
  birthTimeKnown: true
};

const user = {
  id: 'usr_test_user',
  displayName: 'Aryan Tiwari',
  email: 'aryan.tiwari@example.com'
};

async function runTests() {
  const generatedDoc = await ReportDocumentGenerator.generateReport(
    'report_janam_kundli_deep_dive',
    user,
    profile,
    { isDemoPurchase: false }
  );

  assert(generatedDoc.sections.length === 7, `Janam Kundli Deep Dive must have 7 chapters (got: ${generatedDoc.sections.length})`);

  const ch6 = generatedDoc.sections.find((s: any) => s.chapterNumber === 6);
  assert(ch6 !== undefined, 'Chapter 6 must exist');
  const ch6Content = ch6!.contentMarkdown;

  // Must display Dharma-Karmadhipati Raja Yoga
  assert(ch6Content.includes('Dharma-Karmadhipati Raja Yoga'), 'Chapter 6 must include Dharma-Karmadhipati Raja Yoga');
  assert(ch6Content.includes('ACTIVE'), 'Chapter 6 must show active status for DKR');
  assert(ch6Content.includes('Brihat Parashara Hora Shastra'), 'Chapter 6 must cite BPHS');

  // Must display evaluated absent yogas
  assert(ch6Content.includes('Gajakesari Yoga'), 'Chapter 6 must include Gajakesari Yoga audit');
  assert(ch6Content.includes('ABSENT UNDER CLASSICAL RULES'), 'Chapter 6 must state absent under classical rules');
  assert(ch6Content.includes('Budhaditya Yoga'), 'Chapter 6 must include Budhaditya Yoga audit');
  assert(ch6Content.includes('Amala Yoga'), 'Chapter 6 must include Amala Yoga audit');

  // Must display multi-reference Kuja Dosha check
  assert(ch6Content.includes('From Lagna'), 'Chapter 6 must audit from Lagna');
  assert(ch6Content.includes('From Chandra'), 'Chapter 6 must audit from Chandra');
  assert(ch6Content.includes('From Shukra'), 'Chapter 6 must audit from Shukra');
  assert(ch6Content.includes('Swakshetra in Aries') || ch6Content.includes('Mitigation Verified'), 'Chapter 6 must document Aries Swakshetra mitigation');

  // Must display Kaal Sarp and Sade Sati
  assert(ch6Content.includes('Kaal Sarpa Dosha Verification'), 'Chapter 6 must verify Kaal Sarpa');
  assert(ch6Content.includes('Phase 3') && ch6Content.includes('Setting'), 'Chapter 6 must display Sade Sati Phase 3 Setting');

  // Chapter 7: Remedies
  const ch7 = generatedDoc.sections.find((s: any) => s.chapterNumber === 7);
  assert(ch7 !== undefined, 'Chapter 7 must exist');
  const ch7Content = ch7!.contentMarkdown;
  assert(ch7Content.includes('Prescription Integrity Guarantee'), 'Chapter 7 must guarantee prescription integrity');
  assert(!ch7Content.includes('Kaal Sarpa Nivaran Puja'), 'Chapter 7 must NOT prescribe Kaal Sarp remedies when absent');

  // -----------------------------------------------------------------------------
  // 5. RELATIONSHIP & MARRIAGE REPORT KUJA DOSHA CHAPTER
  // -----------------------------------------------------------------------------
  console.log('\n--- 5. RELATIONSHIP & MARRIAGE REPORT CHAPTER 4 ---');

  const relDoc = await ReportDocumentGenerator.generateReport(
    'report_relationship_marriage',
    user,
    profile,
    { isDemoPurchase: false }
  );

  const relCh4 = relDoc.sections.find((s: any) => s.chapterNumber === 4);
  assert(relCh4 !== undefined, 'Relationship report Chapter 4 must exist');
  assert(relCh4!.contentMarkdown.includes('Multi-Reference Audit'), 'Relationship Ch4 must include multi-reference audit');
  assert(relCh4!.contentMarkdown.includes('Mitigated / Pacified'), 'Relationship Ch4 must document mitigation');

  console.log('\n===============================================================');
  console.log('CLASSICAL VEDIC YOGA & DOSHA PARITY TEST SUITE: ALL PASSED!');
  console.log('===============================================================');
}

runTests().catch(err => {
  console.error('[UNCAUGHT ERROR]', err);
  process.exit(1);
});
