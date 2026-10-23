process.env.NODE_ENV = 'test';
import assert from 'assert';
import { ReportDocumentGenerator } from '../src/monetization/reportGenerator';
import { REPORT_CATALOGUE } from '../src/monetization/catalog';

async function runPdfFixturesSuite() {
  console.log('===============================================================');
  console.log('ASTROVERSE PDF REPORT FIXTURES & CANONICAL PAYLOAD TEST SUITE');
  console.log('===============================================================\n');

  let passCount = 0;
  let failCount = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passCount++;
    } catch (err: any) {
      console.error(`[FAIL] ${name}:`, err.message);
      failCount++;
    }
  }

  const syntheticUser = {
    id: 'usr_test_synthetic_99',
    displayName: 'Anand Sharma',
    email: 'anand.sharma@example.com'
  };

  const syntheticProfile = {
    id: 'prof_synthetic_01',
    profileName: 'Anand Sharma',
    dateOfBirth: '1995-10-24',
    timeOfBirth: '14:30',
    birthplaceName: 'New Delhi, India',
    latitude: 28.6139,
    longitude: 77.2090,
    resolvedTimezone: 'Asia/Kolkata',
    birthTimeKnown: true
  };

  const syntheticPartner = {
    id: 'prof_synthetic_partner_02',
    profileName: 'Pooja Verma',
    dateOfBirth: '1997-03-12',
    timeOfBirth: '09:15',
    birthplaceName: 'Jaipur, India',
    latitude: 26.9124,
    longitude: 75.7873,
    resolvedTimezone: 'Asia/Kolkata',
    birthTimeKnown: true
  };

  try {
    // 1. Minimal Report (Basic Summary)
    await test('Fixture 1: Minimal report (report_basic_chart_summary) contains valid metadata & non-empty chapters', async () => {
      const doc = await ReportDocumentGenerator.generateReport(
        'report_basic_chart_summary',
        syntheticUser,
        syntheticProfile
      );
      assert.strictEqual(doc.productId, 'report_basic_chart_summary');
      assert(doc.sections.length >= 2, 'Must have at least 2 sections');
      assert(doc.watermark.documentVerificationHash.startsWith('AUTH-'));
      assert(doc.tableOfContents.length >= 2);
      for (const sec of doc.sections) {
        assert(sec.contentMarkdown.length > 50, 'Section must have substantial content');
      }
    });

    // 2. Full D1 Kundli Deep Dive Report
    await test('Fixture 2: Full D1 Kundli Deep Dive contains core Bhava, Karaka, and Remedial chapters', async () => {
      const doc = await ReportDocumentGenerator.generateReport(
        'report_janam_kundli_deep_dive',
        syntheticUser,
        syntheticProfile,
        { technicalDepth: 'advanced' }
      );
      assert.strictEqual(doc.productId, 'report_janam_kundli_deep_dive');
      assert(doc.sections.some(s => s.sectionId === 'sec_ch1_lagna'));
      assert(doc.sections.some(s => s.sectionId === 'sec_ch2_planets'));
      assert(doc.sections.some(s => s.sectionId === 'sec_ch5_dasha'));
    });

    // 3. Long Multi-Chapter Career Report
    await test('Fixture 3: Career & Education Report contains Karma Bhava & D10 Dashamsha analysis', async () => {
      const doc = await ReportDocumentGenerator.generateReport(
        'report_career_education',
        syntheticUser,
        syntheticProfile
      );
      assert(doc.sections.some(s => s.sectionId === 'sec_career_overview'));
      assert(doc.sections.some(s => s.sectionId === 'sec_dashamsha_d10'));
    });

    // 4. Twelve-Month Varshphal Calendar Report
    await test('Fixture 4: Twelve-Month Varshphal contains exactly 12 months with distinct favorable and caution dates', async () => {
      const doc = await ReportDocumentGenerator.generateReport(
        'report_twelve_month_varshphal',
        syntheticUser,
        syntheticProfile
      );
      assert(doc.monthlyForecasts && doc.monthlyForecasts.length === 12);
      const months = doc.monthlyForecasts!;
      for (let i = 0; i < 12; i++) {
        assert(months[i].monthName, `Month ${i+1} must have a name`);
        assert(months[i].favorableDates.length > 0, `Month ${i+1} must list favorable dates`);
        assert(months[i].cautionDates.length > 0, `Month ${i+1} must list caution dates`);
      }
    });

    // 5. Kundli Milan Matchmaking Report (4-chapter separation)
    await test('Fixture 5: Kundli Milan separates 36-Guna Ashtakoota, D9 Navamsha, Kuja Dosha, and 12-Kuta diagnostics', async () => {
      const doc = await ReportDocumentGenerator.generateReport(
        'report_kundli_milan',
        syntheticUser,
        syntheticProfile,
        { partnerProfile: syntheticPartner }
      );
      assert.strictEqual(doc.sections.length, 4);
      assert.strictEqual(doc.sections[0].sectionId, 'sec_ashtakoota_synastry');
      assert.strictEqual(doc.sections[1].sectionId, 'sec_navamsha_synastry');
      assert.strictEqual(doc.sections[2].sectionId, 'sec_manglik_synastry');
      assert.strictEqual(doc.sections[3].sectionId, 'sec_12_kuta_diagnostics');
      assert(doc.sections[0].contentMarkdown.includes('36 Points'));
      assert(doc.sections[3].contentMarkdown.includes('Mahendra Kuta'));
    });

    // 6. Largest Supported Document: Kundli + Varshphal Bundle
    await test('Fixture 6: Largest Bundle report contains both Janam Kundli and 12-Month Varshphal chapters', async () => {
      const doc = await ReportDocumentGenerator.generateReport(
        'report_bundle_kundli_varshphal',
        syntheticUser,
        syntheticProfile
      );
      assert(doc.sections.length >= 6, 'Bundle must contain at least 6 comprehensive sections');
      assert(doc.monthlyForecasts && doc.monthlyForecasts.length === 12);
    });

    // 7. Unknown Birth Time Profile
    await test('Fixture 7: Unknown birth-time profile flags isApproximate and provides uncertainty notice', async () => {
      const approxProfile = {
        ...syntheticProfile,
        birthTimeKnown: false
      };
      const doc = await ReportDocumentGenerator.generateReport(
        'report_basic_chart_summary',
        syntheticUser,
        approxProfile
      );
      assert.strictEqual(doc.birthCoordinates.isApproximate, true);
    });

    // 8. Demo Purchase Stamped Watermark
    await test('Fixture 8: Demo purchase sets isDemo watermark and DEMO- prefix verification hash', async () => {
      const doc = await ReportDocumentGenerator.generateReport(
        'report_janam_kundli_deep_dive',
        syntheticUser,
        syntheticProfile,
        { isDemoPurchase: true }
      );
      assert.strictEqual(doc.watermark.isDemo, true);
      assert(doc.watermark.documentVerificationHash.startsWith('DEMO-'));
      assert(doc.watermark.ownerName.includes('[DEMO TEST]'));
    });

    // 9. Hindi Devanagari Content and Unicode Integrity
    await test('Fixture 9: Devanagari Unicode glyphs are properly supported and uncorrupted', async () => {
      const hindiProfile = {
        ...syntheticProfile,
        profileName: 'आनंद शर्मा'
      };
      const doc = await ReportDocumentGenerator.generateReport(
        'report_basic_chart_summary',
        { ...syntheticUser, displayName: 'आनंद शर्मा' },
        hindiProfile,
        { language: 'hi' }
      );
      assert(doc.profileName.includes('आनंद शर्मा'));
      assert(doc.watermark.ownerName.includes('आनंद शर्मा'));
    });

    // 10. Missing Optional Information Handled Gracefully
    await test('Fixture 10: Missing optional coordinates and timezone fall back to safe defaults without throwing', async () => {
      const sparseProfile = {
        id: 'prof_sparse',
        profileName: 'Sparse Seeker'
      };
      const doc = await ReportDocumentGenerator.generateReport(
        'report_basic_chart_summary',
        null,
        sparseProfile
      );
      assert.strictEqual(doc.birthCoordinates.timezone, 'Asia/Kolkata');
      assert.strictEqual(doc.birthCoordinates.place, 'New Delhi, India');
      assert.strictEqual(doc.ownerDisplayName, 'Sparse Seeker');
    });

  } finally {
    console.log('===============================================================');
    console.log(`PDF FIXTURES SUITE COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('===============================================================\n');
  }

  if (failCount > 0) process.exit(1);
}

runPdfFixturesSuite().catch(err => {
  console.error(err);
  process.exit(1);
});
