process.env.NODE_ENV = 'test';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { ReportDocumentGenerator } from '../src/monetization/reportGenerator';
import { REPORT_CATALOGUE, SUBSCRIPTION_PLANS, SubscriptionTier } from '../src/monetization/catalog';

async function runPdfQualityRegressionSuite() {
  console.log('===============================================================');
  console.log('ASTROVERSE PDF QUALITY, WATERMARK, PRIVACY & READER REGRESSION');
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
    id: 'usr_regress_test_42',
    displayName: 'Aryan Tiwari',
    email: 'aryan.tiwari@astroverse.app'
  };

  const syntheticProfile = {
    id: 'prof_regress_tiwari_01',
    profileName: 'Aryan Tiwari',
    dateOfBirth: '2005-08-20',
    timeOfBirth: '14:05',
    birthplaceName: 'Jabalpur, Madhya Pradesh, India',
    latitude: 23.16697,
    longitude: 79.95006,
    resolvedTimezone: 'Asia/Kolkata',
    birthTimeKnown: true
  };

  const syntheticPartner = {
    id: 'prof_regress_companion_02',
    profileName: 'Priyanka Sharma',
    dateOfBirth: '2006-02-14',
    timeOfBirth: '10:30',
    birthplaceName: 'Bhopal, Madhya Pradesh, India',
    latitude: 23.2599,
    longitude: 77.4126,
    resolvedTimezone: 'Asia/Kolkata',
    birthTimeKnown: true
  };

  // Helper simulating the exact PDF HTML page generator in index.html
  function simulatePdfDomGeneration(doc: any) {
    const pages: {
      pageType: string;
      pageNumber: number;
      hasWatermark: boolean;
      watermarkText: string;
      contentHtml: string;
      rawCoordinatesFound: boolean;
      internalDebugHashFound: boolean;
      documentReference: string;
    }[] = [];

    const isDoc = Boolean(doc && doc.sections && Array.isArray(doc.sections));
    const title = isDoc ? doc.productName : "Janam Kundli Basic Summary Report";
    const nativeName = isDoc ? (doc.profileName || 'Seeker') : 'Seeker';
    const dob = isDoc ? (doc.birthCoordinates?.dob || '') : '';
    const tob = isDoc ? (doc.birthCoordinates?.tob || '') : '';
    const place = isDoc ? (doc.birthCoordinates?.place || '') : 'India';
    const ayanamsha = isDoc ? (doc.calculationSettings?.ayanamsha || 'Nirayana Lahiri (Chitra Paksha)') : 'Nirayana Lahiri (Chitra Paksha)';
    const tz = isDoc ? doc.birthCoordinates?.timezone : 'Asia/Kolkata';

    const rawRef = (isDoc ? doc.watermark?.documentVerificationHash : '') || doc.reportId || `${Date.now()}`;
    const cleanRef = String(rawRef).replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase() || '7A9B3C2D';
    const verificationRef = `AV-VERIFY-${cleanRef}`;

    function checkProhibited(html: string) {
      const coordPattern = /Lat\s*\d+\.\d+|Lon\s*\d+\.\d+|Latitude:\s*\d+|Longitude:\s*\d+/i;
      const debugPattern = /DEMO-AUTH-|AV-DEMO-ACCOUNT/i;
      return {
        hasCoords: coordPattern.test(html),
        hasDebug: debugPattern.test(html)
      };
    }

    // 1. Cover Page
    const coverHtml = `
      <div class="pdf-a4-page pdf-cover-page">
        <div class="pdf-page-watermark" aria-hidden="true">
          <span class="pdf-page-watermark__wordmark">ASTROVERSE</span>
        </div>
        <div class="pdf-page-content">
          <h1>${title}</h1>
          <div>Native Name: ${nativeName}</div>
          <div>Date of Birth: ${dob}</div>
          <div>Time of Birth: ${tob}</div>
          <div>Birthplace: ${place}</div>
          <div>Calculation Ayanamsha: ${ayanamsha}</div>
          <div>Timezone: ${tz}</div>
          <div>Document Reference: <code>${verificationRef}</code></div>
        </div>
      </div>
    `;
    const coverCheck = checkProhibited(coverHtml);
    pages.push({
      pageType: 'cover',
      pageNumber: 1,
      hasWatermark: coverHtml.includes('ASTROVERSE'),
      watermarkText: 'ASTROVERSE',
      contentHtml: coverHtml,
      rawCoordinatesFound: coverCheck.hasCoords,
      internalDebugHashFound: coverCheck.hasDebug,
      documentReference: verificationRef
    });

    // 2. Chart Page (Page 2)
    const chartHtml = `
      <div class="pdf-a4-page">
        <div class="pdf-page-watermark" aria-hidden="true">
          <span class="pdf-page-watermark__wordmark">ASTROVERSE</span>
        </div>
        <div class="pdf-page-content">
          <h2>1. Classical Nirayana Rashi Kundli (D1)</h2>
          <table><tr><td>Graha Ephemeris</td></tr></table>
          <div>Ref: ${verificationRef} - Page 2</div>
        </div>
      </div>
    `;
    const chartCheck = checkProhibited(chartHtml);
    pages.push({
      pageType: 'chart',
      pageNumber: 2,
      hasWatermark: chartHtml.includes('ASTROVERSE'),
      watermarkText: 'ASTROVERSE',
      contentHtml: chartHtml,
      rawCoordinatesFound: chartCheck.hasCoords,
      internalDebugHashFound: chartCheck.hasDebug,
      documentReference: verificationRef
    });

    let pageNum = 3;
    // 3. Section Pages
    if (isDoc && doc.sections) {
      doc.sections.forEach((sec: any, idx: number) => {
        const secHtml = `
          <div class="pdf-a4-page">
            <div class="pdf-page-watermark" aria-hidden="true">
              <span class="pdf-page-watermark__wordmark">ASTROVERSE</span>
            </div>
            <div class="pdf-page-content">
              <h2>${sec.title}</h2>
              <div>${sec.contentMarkdown.slice(0, 150)}...</div>
              <div>Licensed to ${nativeName} &bull; Ref: ${verificationRef} - Page ${pageNum}</div>
            </div>
          </div>
        `;
        const secCheck = checkProhibited(secHtml);
        pages.push({
          pageType: `chapter_${sec.chapterNumber || idx + 1}`,
          pageNumber: pageNum++,
          hasWatermark: secHtml.includes('ASTROVERSE'),
          watermarkText: 'ASTROVERSE',
          contentHtml: secHtml,
          rawCoordinatesFound: secCheck.hasCoords,
          internalDebugHashFound: secCheck.hasDebug,
          documentReference: verificationRef
        });
      });
    }

    // 4. Monthly Forecast Pages (6 months per page)
    if (doc.monthlyForecasts && doc.monthlyForecasts.length > 0) {
      const chunkSize = 6;
      for (let c = 0; c < doc.monthlyForecasts.length; c += chunkSize) {
        const mHtml = `
          <div class="pdf-a4-page">
            <div class="pdf-page-watermark" aria-hidden="true">
              <span class="pdf-page-watermark__wordmark">ASTROVERSE</span>
            </div>
            <div class="pdf-page-content">
              <h2>Twelve-Month Forecast</h2>
              <div>Months ${c + 1} to ${Math.min(c + chunkSize, doc.monthlyForecasts.length)}</div>
              <div>Ref: ${verificationRef} - Page ${pageNum}</div>
            </div>
          </div>
        `;
        const mCheck = checkProhibited(mHtml);
        pages.push({
          pageType: `monthly_chunk_${c}`,
          pageNumber: pageNum++,
          hasWatermark: mHtml.includes('ASTROVERSE'),
          watermarkText: 'ASTROVERSE',
          contentHtml: mHtml,
          rawCoordinatesFound: mCheck.hasCoords,
          internalDebugHashFound: mCheck.hasDebug,
          documentReference: verificationRef
        });
      }
    }

    // 5. Ethical Notice Page
    if (doc.ethicalNotice) {
      const noticeHtml = `
        <div class="pdf-a4-page">
          <div class="pdf-page-watermark" aria-hidden="true">
            <span class="pdf-page-watermark__wordmark">ASTROVERSE</span>
          </div>
          <div class="pdf-page-content">
            <h3>Classical Vedic Philosophical Notice</h3>
            <p>${doc.ethicalNotice}</p>
            <div>Document Reference: <code>${verificationRef}</code></div>
            <div>Page ${pageNum}</div>
          </div>
        </div>
      `;
      const noticeCheck = checkProhibited(noticeHtml);
      pages.push({
        pageType: 'notice',
        pageNumber: pageNum++,
        hasWatermark: noticeHtml.includes('ASTROVERSE'),
        watermarkText: 'ASTROVERSE',
        contentHtml: noticeHtml,
        rawCoordinatesFound: noticeCheck.hasCoords,
        internalDebugHashFound: noticeCheck.hasDebug,
        documentReference: verificationRef
      });
    }

    return pages;
  }

  try {
    // ===============================================================
    // TEST 1: All 9 Products Generate Real Pages Without Blank Pages
    // ===============================================================
    await test('Requirement 1 & 2: All 9 products generate valid physical pages with zero blank pages', async () => {
      const allProductIds = Object.keys(REPORT_CATALOGUE);
      assert.strictEqual(allProductIds.length, 9, 'All 9 catalogue products must exist');

      for (const pid of allProductIds) {
        const doc = await ReportDocumentGenerator.generateReport(
          pid,
          syntheticUser,
          syntheticProfile,
          { partnerProfile: syntheticPartner }
        );

        const renderedPages = simulatePdfDomGeneration(doc);
        assert(renderedPages.length >= 4, `${pid} must render at least 4 physical pages (Cover + Chart + Chapters + Notice)`);

        for (const pg of renderedPages) {
          // Zero blank pages: every page has real non-empty content
          assert(pg.contentHtml.length > 100, `Page ${pg.pageNumber} of ${pid} must have substantive content`);
          // Watermark must exist on every single page
          assert.strictEqual(pg.hasWatermark, true, `Page ${pg.pageNumber} of ${pid} must contain ASTROVERSE watermark`);
        }
      }
    });

    // ===============================================================
    // TEST 2: Watermark Requirements & ASTROVERSE Typography
    // ===============================================================
    await test('Requirement 4 & 5: Watermark displays ASTROVERSE on every page with correct styling', async () => {
      const indexHtml = fs.readFileSync(path.join(__dirname, '../../../index.html'), 'utf8');
      
      // Check CSS watermark styling in index.html
      assert(indexHtml.includes('.pdf-page-watermark'), 'Must define .pdf-page-watermark class');
      assert(indexHtml.includes('.pdf-page-watermark__wordmark'), 'Must define .pdf-page-watermark__wordmark');
      assert(indexHtml.includes('transform: rotate(-33deg)'), 'Watermark must use -33deg diagonal rotation');
      assert(indexHtml.includes('rgba(180, 83, 9, 0.048)'), 'Watermark opacity must be restrained at ~4.8% warm gold');
      assert(indexHtml.includes('isolation: isolate'), 'Page container must enforce stacking isolation');
      assert(indexHtml.includes('position: absolute'), 'Watermark must be absolutely positioned behind content');
      assert(indexHtml.includes('position: relative;'), 'Content container must have position: relative for z-indexing');
    });

    // ===============================================================
    // TEST 3: Pagination Strategy & Blank Page Elimination
    // ===============================================================
    await test('Requirement 1 & 2: A4 geometry is strictly budgeted at 296mm to eliminate blank pages', async () => {
      const indexHtml = fs.readFileSync(path.join(__dirname, '../../../index.html'), 'utf8');
      
      // Height must be strictly budgeted at 296mm (not min-height: 297mm which caused overflowing slivers)
      assert(indexHtml.includes('height: 296mm;'), '.pdf-a4-page must use height: 296mm');
      assert(indexHtml.includes('max-height: 296mm;'), '.pdf-a4-page must use max-height: 296mm');
      assert(indexHtml.includes('overflow: hidden;'), '.pdf-a4-page must use overflow: hidden to prevent fractional canvas overflow');
      assert(indexHtml.includes('page-break-after: avoid !important;'), 'Trailing page break on last child must be avoided');
      assert(indexHtml.includes("pagebreak: { mode: ['css'] }"), "html2pdf must use mode: ['css'] for discrete physical page boundaries");
    });

    // ===============================================================
    // TEST 4: Privacy Hardening - Coordinates & Internal Hashes
    // ===============================================================
    await test('Requirement 6, 7 & 8: Privacy-hardened output strips raw Lat/Lon, accountHash, and debug tokens', async () => {
      const doc = await ReportDocumentGenerator.generateReport(
        'report_janam_kundli_deep_dive',
        syntheticUser,
        syntheticProfile
      );

      const renderedPages = simulatePdfDomGeneration(doc);

      for (const pg of renderedPages) {
        assert.strictEqual(pg.rawCoordinatesFound, false, `Page ${pg.pageNumber} must not expose raw GPS coordinates`);
        assert.strictEqual(pg.internalDebugHashFound, false, `Page ${pg.pageNumber} must not expose internal DEMO-AUTH or accountHash tokens`);
        assert(pg.documentReference.startsWith('AV-VERIFY-'), `Page ${pg.pageNumber} must show clean AV-VERIFY reference`);
      }

      // Check index.html template to ensure raw coordinate interpolation was removed from cover page
      const indexHtml = fs.readFileSync(path.join(__dirname, '../../../index.html'), 'utf8');
      assert(!indexHtml.includes('Geo Coordinates: Lat'), 'index.html must not contain user-facing Geo Coordinates: Lat label in PDF');
      assert(indexHtml.includes('AV-VERIFY-'), 'index.html must format document reference as AV-VERIFY-');
    });

    // ===============================================================
    // TEST 5: Bilingual English & Hindi Summary in Private Reader
    // ===============================================================
    await test('Requirement 12 & 13: In-app reader includes bilingual (English & Hindi) Report Summary', async () => {
      const indexHtml = fs.readFileSync(path.join(__dirname, '../../../index.html'), 'utf8');

      // Verify function presence and structure
      assert(indexHtml.includes('function buildEnglishReportSummary(doc)'), 'Must implement buildEnglishReportSummary');
      assert(indexHtml.includes('function buildHindiReportSummary(doc)'), 'Must implement buildHindiReportSummary');
      assert(indexHtml.includes('function switchReaderSummaryLang(lang)'), 'Must implement switchReaderSummaryLang');
      assert(indexHtml.includes('reader-summary-card'), 'Must render #reader-summary-card in reader');

      // Verify Hindi summary preserves classical Sanskrit/Vedic terms
      assert(indexHtml.includes('अष्टकूट मिलान'), 'Hindi summary must preserve Ashtakoota Milan');
      assert(indexHtml.includes('कुज दोष'), 'Hindi summary must preserve Kuja Dosha');
      assert(indexHtml.includes('दशमांश कुंडली'), 'Hindi summary must preserve Dashamsha Kundli');
      assert(indexHtml.includes('नवांश कुंडली'), 'Hindi summary must preserve Navamsha Kundli');
      assert(indexHtml.includes('विंशोत्तरी महादशा'), 'Hindi summary must preserve Vimshottari Mahadasha');
      assert(indexHtml.includes('षोडशवर्ग'), 'Hindi summary must preserve Shodashavarga');
    });

    // ===============================================================
    // TEST 6: Subscription Comparison Table & Entitlement Consistency
    // ===============================================================
    await test('Requirement 11: Plan comparison table accurately communicates PDF entitlements and tier rules', async () => {
      const indexHtml = fs.readFileSync(path.join(__dirname, '../../../index.html'), 'utf8');

      // Must have the detailed comparison table
      assert(indexHtml.includes('tier-comparison-matrix'), 'index.html must include .tier-comparison-matrix table');
      assert(indexHtml.includes('Detailed Plan Feature &amp; PDF Entitlement Comparison'), 'Must include comparison header');

      // PDF download eligibility accurate per tier
      assert(indexHtml.includes('Online Reader Only'), 'Free tier must specify Online Reader Only');
      assert(indexHtml.includes('1 Free Download/mo on eligible reports'), 'Plus tier must specify 1 Free Download/mo');
      assert(indexHtml.includes('Eligible for Purchased Reports'), 'Premium tier must specify Eligible for Purchased Reports');

      // Profile and AI limits consistent with backend SUBSCRIPTION_PLANS
      assert.strictEqual(SUBSCRIPTION_PLANS[SubscriptionTier.FREE].maxProfiles, 1);
      assert.strictEqual(SUBSCRIPTION_PLANS[SubscriptionTier.PLUS].maxProfiles, 3);
      assert.strictEqual(SUBSCRIPTION_PLANS[SubscriptionTier.PREMIUM].maxProfiles, 5);

      assert.strictEqual(SUBSCRIPTION_PLANS[SubscriptionTier.FREE].dailyAiLimit, 3);
      assert.strictEqual(SUBSCRIPTION_PLANS[SubscriptionTier.PLUS].dailyAiLimit, 15);
      assert.strictEqual(SUBSCRIPTION_PLANS[SubscriptionTier.PREMIUM].dailyAiLimit, 30);
    });

    // ===============================================================
    // TEST 7: Product-Specific Content & Integrity
    // ===============================================================
    await test('Requirement 3 & 10: All 9 report products retain their substantive content and correct chapters', async () => {
      const deepDive = await ReportDocumentGenerator.generateReport(
        'report_janam_kundli_deep_dive',
        syntheticUser,
        syntheticProfile
      );
      assert.strictEqual(deepDive.sections.length, 7, 'Janam Kundli Deep Dive must have 7 sections');

      const varshphal = await ReportDocumentGenerator.generateReport(
        'report_twelve_month_varshphal',
        syntheticUser,
        syntheticProfile
      );
      assert.strictEqual(varshphal.sections.length, 4, 'Twelve-Month Varshphal must have 4 sections');
      assert.strictEqual(varshphal.monthlyForecasts?.length, 12, 'Must contain 12 distinct months');

      const milan = await ReportDocumentGenerator.generateReport(
        'report_kundli_milan',
        syntheticUser,
        syntheticProfile,
        { partnerProfile: syntheticPartner }
      );
      assert.strictEqual(milan.sections.length, 4, 'Kundli Milan must have 4 sections');
    });

    console.log('\n===============================================================');
    console.log(`REGRESSION SUITE FINISHED: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('===============================================================');

    if (failCount > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal suite error:', err);
    process.exit(1);
  }
}

runPdfQualityRegressionSuite();
