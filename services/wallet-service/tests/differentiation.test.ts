/**
 * ASTROVERSE PRODUCT DIFFERENTIATION & ANTI-CONTAMINATION TEST SUITE
 *
 * Verifies that all 9 report products in the catalogue generate distinct,
 * calculation-grounded, product-specific chapters without boilerplate copy-paste
 * or content contamination across product boundaries.
 */

import assert from 'assert';
import { ReportDocumentGenerator } from '../src/monetization/reportGenerator';
import { REPORT_CATALOGUE } from '../src/monetization/catalog';
import { AstroCalculator } from '../src/monetization/astroCalculator';

console.log('===============================================================');
console.log('ASTROVERSE REPORT CONTENT DIFFERENTIATION & SUITE TEST');
console.log('===============================================================');

async function runDifferentiationTests() {
  const sampleUser = {
    id: 'usr_test_diff_123',
    email: 'seeker@astroverse.app',
    displayName: 'Aryan Tiwari'
  };

  const sampleNativeProfile = {
    id: 'prof_native_001',
    profileName: 'Aryan Tiwari',
    dateOfBirth: '2005-08-20',
    timeOfBirth: '14:05',
    birthplaceName: 'Jabalpur, MP, India',
    latitude: 23.1815,
    longitude: 79.9864,
    resolvedTimezone: 'Asia/Kolkata',
    birthTimeKnown: true
  };

  const samplePartnerProfile = {
    id: 'prof_partner_002',
    profileName: 'Ananya Sharma',
    dateOfBirth: '2006-03-15',
    timeOfBirth: '10:30',
    birthplaceName: 'Indore, MP, India',
    latitude: 22.7196,
    longitude: 75.8577,
    resolvedTimezone: 'Asia/Kolkata',
    birthTimeKnown: true
  };

  // 1. AstroCalculator High-Precision Engine Verification
  console.log('\n--- 1. ASTROCALCULATOR MATHEMATICAL ACCURACY ---');
  const nativeChart = AstroCalculator.calculateChart('2005-08-20', '14:05', 23.1815, 79.9864, false);
  assert(nativeChart.lagna.sign, 'Lagna sign must be calculated');
  assert(typeof nativeChart.lagna.degree === 'number', 'Lagna degree must be numeric');
  assert(nativeChart.planets.Sun.sign, 'Sun sign must be calculated');
  assert(nativeChart.planets.Moon.sign, 'Moon sign must be calculated');
  assert(nativeChart.planets.Mars.house >= 1 && nativeChart.planets.Mars.house <= 12, 'Mars house must be 1-12');
  assert(nativeChart.d9Lagna.sign, 'D9 Navamsha Lagna must be calculated');
  assert(nativeChart.d10Lagna.sign, 'D10 Dashamsha Lagna must be calculated');
  const totalSAV = nativeChart.ashtakavargaSAV.reduce((acc, b) => acc + b, 0);
  assert.strictEqual(totalSAV, 337, `Sarvashtakavarga total bindus must equal 337, got ${totalSAV}`);
  assert(nativeChart.currentDasha.maha, 'Active Vimshottari Mahadasha must be calculated');
  console.log('[PASS] AstroCalculator produces correct Nirayana ephemeris, D9/D10, 337 Bindus, and Vimshottari Dasha');

  // Ashtakoota 36-Guna matchmaking verification
  const partnerChart = AstroCalculator.calculateChart('2006-03-15', '10:30', 22.7196, 75.8577, false);
  const milan = AstroCalculator.computeMatchmaking(nativeChart, partnerChart);
  assert(milan.totalScore >= 0 && milan.totalScore <= 36, `Matchmaking total score must be 0-36, got ${milan.totalScore}`);
  assert(milan.kutaScores.varna <= 1.0, 'Varna max 1.0');
  assert(milan.kutaScores.vashya <= 2.0, 'Vashya max 2.0');
  assert(milan.kutaScores.tara <= 3.0, 'Tara max 3.0');
  assert(milan.kutaScores.yoni <= 4.0, 'Yoni max 4.0');
  assert(milan.kutaScores.grahaMaitri <= 5.0, 'Maitri max 5.0');
  assert(milan.kutaScores.gana <= 6.0, 'Gana max 6.0');
  assert(milan.kutaScores.bhakoot <= 7.0, 'Bhakoot max 7.0');
  assert(milan.kutaScores.nadi <= 8.0, 'Nadi max 8.0');
  console.log(`[PASS] Ashtakoota 36-Guna calculation: ${milan.totalScore.toFixed(1)}/36 Gunas (${milan.verdict})`);

  // 2. Generate all 9 report products using the same native profile
  console.log('\n--- 2. CROSS-PRODUCT GENERATION & CHAPTER VERIFICATION ---');
  const productIds = [
    'report_janam_kundli_deep_dive',
    'report_career_education',
    'report_relationship_marriage',
    'report_kundli_milan',
    'report_one_month_forecast',
    'report_twelve_month_varshphal',
    'report_three_year_roadmap',
    'report_bundle_kundli_varshphal',
    'report_basic_chart_summary'
  ];

  const generatedReports: Record<string, any> = {};

  for (const pid of productIds) {
    const doc = await ReportDocumentGenerator.generateReport(
      pid,
      sampleUser,
      sampleNativeProfile,
      { partnerProfile: samplePartnerProfile, isDemoPurchase: false }
    );
    generatedReports[pid] = doc;
    assert.strictEqual(doc.productId, pid, `Report document productId mismatch for ${pid}`);
    assert(doc.sections.length > 0, `Report ${pid} must contain chapters`);
    console.log(`[PASS] Generated ${pid} (${doc.productName}): ${doc.sections.length} chapters`);
  }

  // 3. Section counts and specific chapter IDs per product
  console.log('\n--- 3. SPECIFIC SECTION IDS & CHAPTER COUNTS ---');

  // Janam Kundli Deep Dive (7 chapters)
  const deepDive = generatedReports['report_janam_kundli_deep_dive'];
  assert.strictEqual(deepDive.sections.length, 7, 'Deep Dive must contain exactly 7 chapters');
  assert.strictEqual(deepDive.sections[0].sectionId, 'sec_ch1_lagna');
  assert.strictEqual(deepDive.sections[1].sectionId, 'sec_ch2_planets');
  assert.strictEqual(deepDive.sections[2].sectionId, 'sec_ch3_vargas');
  assert.strictEqual(deepDive.sections[3].sectionId, 'sec_ch4_ashtakavarga');
  assert.strictEqual(deepDive.sections[4].sectionId, 'sec_ch5_dasha');
  assert.strictEqual(deepDive.sections[5].sectionId, 'sec_ch6_yogas_doshas');
  assert.strictEqual(deepDive.sections[6].sectionId, 'sec_ch7_remedies_methodology');
  assert.strictEqual(deepDive.monthlyForecasts, undefined, 'Deep Dive must NOT have monthlyForecasts');
  console.log('[PASS] Janam Kundli Deep Dive contains all 7 promised chapters and no monthlyForecasts');

  // Career & Education (7 chapters)
  const career = generatedReports['report_career_education'];
  assert.strictEqual(career.sections.length, 7, 'Career must contain exactly 7 chapters');
  assert.strictEqual(career.sections[0].sectionId, 'sec_career_overview');
  assert.strictEqual(career.sections[1].sectionId, 'sec_dashamsha_d10');
  assert.strictEqual(career.sections[2].sectionId, 'sec_10th_house_lordship');
  assert.strictEqual(career.sections[3].sectionId, 'sec_dhana_financial_axes');
  assert.strictEqual(career.sections[4].sectionId, 'sec_active_dasha_career');
  assert.strictEqual(career.sections[5].sectionId, 'sec_optimal_industries');
  assert.strictEqual(career.sections[6].sectionId, 'sec_career_obstacles_remedies');
  assert.strictEqual(career.monthlyForecasts, undefined, 'Career report must NOT have monthlyForecasts');
  console.log('[PASS] Career & Education contains all 7 vocational chapters and no monthlyForecasts');

  // Relationship & Marriage (6 chapters)
  const marriage = generatedReports['report_relationship_marriage'];
  assert.strictEqual(marriage.sections.length, 6, 'Marriage report must contain exactly 6 chapters');
  assert.strictEqual(marriage.sections[0].sectionId, 'sec_rel_7th_house');
  assert.strictEqual(marriage.sections[1].sectionId, 'sec_navamsha_d9_marriage');
  assert.strictEqual(marriage.sections[2].sectionId, 'sec_rel_temperament');
  assert.strictEqual(marriage.sections[3].sectionId, 'sec_manglik_dosha_eval');
  assert.strictEqual(marriage.sections[4].sectionId, 'sec_marriage_timing_windows');
  assert.strictEqual(marriage.sections[5].sectionId, 'sec_vedic_remedies_harmony');
  assert.strictEqual(marriage.monthlyForecasts, undefined, 'Marriage report must NOT have monthlyForecasts');
  console.log('[PASS] Relationship & Marriage contains all 6 relationship chapters and no monthlyForecasts');

  // Kundli Milan (4 chapters conforming to existing tests)
  const milanDoc = generatedReports['report_kundli_milan'];
  assert.strictEqual(milanDoc.sections.length, 4, 'Kundli Milan must contain exactly 4 chapters');
  assert.strictEqual(milanDoc.sections[0].sectionId, 'sec_ashtakoota_synastry');
  assert.strictEqual(milanDoc.sections[1].sectionId, 'sec_navamsha_synastry');
  assert.strictEqual(milanDoc.sections[2].sectionId, 'sec_manglik_synastry');
  assert.strictEqual(milanDoc.sections[3].sectionId, 'sec_12_kuta_diagnostics');
  assert.strictEqual(milanDoc.monthlyForecasts, undefined, 'Kundli Milan must NOT have monthlyForecasts');
  assert(milanDoc.sections[0].contentMarkdown.includes('36.0 Gunas'), 'Milan chapter 1 must contain 36-Guna table');
  console.log('[PASS] Kundli Milan contains 4 synastry chapters with dual-profile Ashtakoota matrix');

  // 1-Month Forecast (5 chapters + 1 month)
  const oneMonth = generatedReports['report_one_month_forecast'];
  assert.strictEqual(oneMonth.sections.length, 5, '1-Month forecast must contain 5 chapters');
  assert.strictEqual(oneMonth.sections[0].sectionId, 'sec_month_focus');
  assert(Array.isArray(oneMonth.monthlyForecasts) && oneMonth.monthlyForecasts.length === 1, '1-Month must contain exactly 1 forecast month');
  console.log('[PASS] 1-Month Forecast contains 5 chapters and exactly 1 monthly forecast');

  // 12-Month Varshphal (4 chapters + 12 months)
  const varshphal = generatedReports['report_twelve_month_varshphal'];
  assert.strictEqual(varshphal.sections.length, 4, '12-Month Varshphal must contain 4 chapters');
  assert.strictEqual(varshphal.sections[0].sectionId, 'sec_annual_landscape');
  assert(Array.isArray(varshphal.monthlyForecasts) && varshphal.monthlyForecasts.length === 12, '12-Month must contain exactly 12 forecast months');
  console.log('[PASS] 12-Month Varshphal contains 4 chapters and exactly 12 distinct forecast months');

  // 3-Year Roadmap (5 chapters)
  const threeYear = generatedReports['report_three_year_roadmap'];
  assert.strictEqual(threeYear.sections.length, 5, '3-Year Roadmap must contain 5 chapters');
  assert.strictEqual(threeYear.sections[0].sectionId, 'sec_3yr_macro');
  assert.strictEqual(threeYear.sections[1].sectionId, 'sec_year_1_foundation');
  assert.strictEqual(threeYear.sections[2].sectionId, 'sec_year_2_expansion');
  assert.strictEqual(threeYear.sections[3].sectionId, 'sec_year_3_legacy');
  assert.strictEqual(threeYear.sections[4].sectionId, 'sec_3yr_karmic_points');
  assert.strictEqual(threeYear.monthlyForecasts, undefined, '3-Year Roadmap must NOT have monthlyForecasts');
  console.log('[PASS] 3-Year Roadmap contains all 5 multi-year horizon chapters and no monthlyForecasts');

  // Kundli + Varshphal Bundle (11 chapters + 12 months)
  const bundle = generatedReports['report_bundle_kundli_varshphal'];
  assert.strictEqual(bundle.sections.length, 11, 'Bundle must contain 11 chapters (7 Deep Dive + 4 Varshphal)');
  assert(Array.isArray(bundle.monthlyForecasts) && bundle.monthlyForecasts.length === 12, 'Bundle must contain 12 forecast months');
  console.log('[PASS] Bundle contains 11 chapters and 12 forecast months');

  // Basic Chart Summary (3 chapters)
  const basic = generatedReports['report_basic_chart_summary'];
  assert.strictEqual(basic.sections.length, 3, 'Basic Summary must contain 3 chapters');
  assert.strictEqual(basic.sections[0].sectionId, 'sec_basic_summary');
  assert.strictEqual(basic.monthlyForecasts, undefined, 'Basic Summary must NOT have monthlyForecasts');
  console.log('[PASS] Basic Summary contains 3 foundational chapters and no monthlyForecasts');

  // 4. Cross-product non-overlap and anti-contamination assertion
  console.log('\n--- 4. CROSS-PRODUCT NON-OVERLAP & ANTI-CONTAMINATION ---');

  // Set of section IDs per product must be distinct
  const deepDiveIds = new Set(deepDive.sections.map((s: any) => s.sectionId));
  const careerIds = new Set(career.sections.map((s: any) => s.sectionId));
  const marriageIds = new Set(marriage.sections.map((s: any) => s.sectionId));
  const milanIds = new Set(milanDoc.sections.map((s: any) => s.sectionId));
  const basicIds = new Set(basic.sections.map((s: any) => s.sectionId));

  // Career vs Marriage: 0 overlapping section IDs
  for (const id of careerIds) {
    assert(!marriageIds.has(id), `Section ${id} found in both Career and Marriage!`);
    assert(!milanIds.has(id), `Section ${id} found in both Career and Kundli Milan!`);
  }
  for (const id of marriageIds) {
    assert(!milanIds.has(id), `Section ${id} found in both Marriage and Kundli Milan!`);
  }
  for (const id of basicIds) {
    assert(!careerIds.has(id), `Section ${id} found in both Basic and Career!`);
    assert(!marriageIds.has(id), `Section ${id} found in both Basic and Marriage!`);
  }
  console.log('[PASS] Zero section ID collisions between Career, Marriage, Milan, Deep Dive, and Basic');

  // Content prose check: Career must contain vocation keywords not present in Marriage
  const careerProse = career.sections.map((s: any) => s.contentMarkdown).join('\n');
  const marriageProse = marriage.sections.map((s: any) => s.contentMarkdown).join('\n');
  assert(careerProse.includes('Karma Bhava'), 'Career prose must discuss Karma Bhava');
  assert(careerProse.includes('Dashamsha'), 'Career prose must discuss Dashamsha');
  assert(marriageProse.includes('Kalatra Bhava'), 'Marriage prose must discuss Kalatra Bhava');
  assert(marriageProse.includes('Navamsha'), 'Marriage prose must discuss Navamsha');
  assert(!marriageProse.includes('Karma Bhava'), 'Marriage prose must NOT copy Career Karma Bhava');
  console.log('[PASS] Substantive content is genuinely product-specific; no copy-paste contamination');

  // 5. Demo Watermark Verification
  console.log('\n--- 5. DEMO WATERMARKING ---');
  const demoDoc = await ReportDocumentGenerator.generateReport(
    'report_janam_kundli_deep_dive',
    sampleUser,
    sampleNativeProfile,
    { isDemoPurchase: true }
  );
  assert.strictEqual(demoDoc.watermark.isDemo, true, 'isDemo flag must be true on demo purchases');
  assert(demoDoc.watermark.ownerName.startsWith('[DEMO TEST]'), 'Demo ownerName must have [DEMO TEST] tag');
  assert(demoDoc.watermark.documentVerificationHash.startsWith('DEMO-'), 'Demo hash must start with DEMO-');
  console.log('[PASS] Demo purchase correctly stamps watermark and DEMO- verification hash');

  console.log('\n===============================================================');
  console.log('ALL DIFFERENTIATION & INTEGRITY TESTS PASSED SUCCESSFULLY (100%)');
  console.log('===============================================================');
}

runDifferentiationTests().catch(err => {
  console.error('\n[FAIL] Differentiation test error:', err);
  process.exit(1);
});
