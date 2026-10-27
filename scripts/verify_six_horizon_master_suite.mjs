import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async close() {
    this.ws.close();
  }
}

async function runMasterVerification() {
  console.log(`\n================================================================================`);
  console.log(`ASTROVERSE SIX-HORIZON TEMPORAL FORECASTING MASTER VERIFICATION SUITE`);
  console.log(`================================================================================\n`);

  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9230',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    `file:///${indexPath}`
  ]);

  try {
    let targets = null;
    for (let i = 0; i < 40; i++) {
      try {
        targets = await getJson('http://127.0.0.1:9230/json/list');
        if (targets && targets.length > 0) break;
      } catch (_) {}
      await new Promise((r) => setTimeout(r, 200));
    }
    const pageTarget = (targets || []).find((t) => t.type === 'page' && t.url.includes('index.html')) || (targets || []).find((t) => t.type === 'page');

    if (!pageTarget) throw new Error('No Chrome page target discovered on port 9230');

    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('DOM.enable');

    await client.send('Page.navigate', { url: `file:///${indexPath}` });
    await new Promise((r) => setTimeout(r, 1500));

    // Wait until controller scripts and DOM are ready
    for (let i = 0; i < 80; i++) {
      const readyCheck = await client.send('Runtime.evaluate', {
        expression: `typeof window.astroGuidanceState !== 'undefined' && window.astroGuidanceState === 'NO_PROFILE' && document.querySelectorAll('.guidance-discovery-card').length === 6`
      });
      if (readyCheck.result && readyCheck.result.value === true) break;
      await new Promise((r) => setTimeout(r, 200));
    }

    // -------------------------------------------------------------
    // TEST 1: Initial Blank State & Active Profile Grounding Bar (Phase 1)
    // -------------------------------------------------------------
    console.log(`[TEST 1] Verifying Initial Blank State & #guidance-active-profile-bar (NO_PROFILE)...`);
    const test1 = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const bar = document.getElementById('guidance-active-profile-bar');
        const noProfileBar = bar ? bar.querySelector('.no-profile-bar') : null;
        const btnEnterDetails = bar ? bar.querySelector('button[onclick*="switchNavSection"]') : null;
        const selProfile = document.getElementById('guidance-bar-profile-select');
        const btnTransitPreview = bar ? bar.querySelector('button[onclick*="enterGeneralTransitPreview"]') : null;

        return {
          barExists: !!bar,
          noProfileBarRendered: !!noProfileBar,
          hasEnterDetailsBtn: !!btnEnterDetails && btnEnterDetails.textContent.includes('Enter My Birth Details'),
          hasProfileSelect: !!selProfile,
          hasTransitPreviewBtn: !!btnTransitPreview && btnTransitPreview.textContent.includes('General Transit Preview'),
          state: window.astroGuidanceState
        };
      })()`,
      returnByValue: true
    });

    const t1 = test1.result.value;
    console.log(`  ✓ Grounding bar exists in DOM: ${t1.barExists}`);
    console.log(`  ✓ Renders .no-profile-bar: ${t1.noProfileBarRendered}`);
    console.log(`  ✓ Contains 'Enter My Birth Details' action button: ${t1.hasEnterDetailsBtn}`);
    console.log(`  ✓ Contains saved profile dropdown: ${t1.hasProfileSelect}`);
    console.log(`  ✓ Contains 'Explore General Transit Preview' button: ${t1.hasTransitPreviewBtn}`);
    console.log(`  ✓ State is strictly NO_PROFILE: ${t1.state === 'NO_PROFILE'}`);

    if (!t1.barExists || !t1.noProfileBarRendered || !t1.hasEnterDetailsBtn || !t1.hasTransitPreviewBtn) {
      throw new Error(`TEST 1 Failed: Profile Grounding Bar in NO_PROFILE state failed requirements.`);
    }

    // -------------------------------------------------------------
    // TEST 2: General Transit Preview Mode & Ephemeris Provenance
    // -------------------------------------------------------------
    console.log(`\n[TEST 2] Verifying General Transit Preview Mode & Disclaimers...`);
    const test2 = await client.send('Runtime.evaluate', {
      expression: `(async () => {
        enterGeneralTransitPreview('hourly');
        await new Promise(r => setTimeout(r, 600));
        const badge = document.getElementById('guidance-grounding-badge');
        const factsPills = document.getElementById('guidance-disp-profile-metrics');
        const remCard = document.getElementById('guidance-remedies-card');
        const precCard = document.getElementById('guidance-precautions-card');

        return {
          state: window.astroGuidanceState,
          badgeText: badge ? badge.textContent.trim() : '',
          factsText: factsPills ? factsPills.textContent.trim() : '',
          hasRemediesCard: !!remCard,
          hasPrecautionsCard: !!precCard,
          remediesText: remCard ? remCard.textContent.trim() : '',
          precautionsText: precCard ? precCard.textContent.trim() : ''
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    const t2 = test2.result.value;
    console.log(`  ✓ State is GENERAL_TRANSIT_PREVIEW: ${t2.state === 'GENERAL_TRANSIT_PREVIEW'}`);
    console.log(`  ✓ Badge text: "${t2.badgeText}"`);
    console.log(`  ✓ Ephemeris provenance indicated in facts: ${t2.factsText.includes('Swiss Ephemeris')}`);
    console.log(`  ✓ Personal Lagna labeled "Not Loaded": ${t2.factsText.includes('Not Loaded')}`);
    console.log(`  ✓ Dedicated Remedies card rendered: ${t2.hasRemediesCard}`);
    console.log(`  ✓ Dedicated Precautions card rendered: ${t2.hasPrecautionsCard}`);

    if (t2.state !== 'GENERAL_TRANSIT_PREVIEW' || !t2.hasRemediesCard || !t2.hasPrecautionsCard) {
      throw new Error(`TEST 2 Failed: General transit preview or remedies/precautions cards missing.`);
    }

    // -------------------------------------------------------------
    // TEST 3: Sample Chart Isolation & Persistent Amber Demonstration Banner (Phase 2)
    // -------------------------------------------------------------
    console.log(`\n[TEST 3] Loading Sample Chart and Verifying Strict Demo Isolation Banner...`);
    const test3 = await client.send('Runtime.evaluate', {
      expression: `(async () => {
        await loadSampleBirthChart();
        await new Promise(r => setTimeout(r, 800));

        const chart = window.currentCalculatedChart;
        const bar = document.getElementById('guidance-active-profile-bar');
        const sampleBar = bar ? bar.querySelector('.sample-bar') : null;
        const bannerText = sampleBar ? sampleBar.textContent : '';

        return {
          chartLoaded: !!chart,
          isSampleChart: Boolean(chart && chart.isSampleChart),
          provenance: chart ? chart.provenance : null,
          sampleBarRendered: !!sampleBar,
          hasWarningBadge: bannerText.includes('SAMPLE CHART — NOT YOUR PERSONAL PROFILE'),
          hasRealBirthDetailsBtn: bannerText.includes('Enter Your Real Birth Details')
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    const t3 = test3.result.value;
    console.log(`  ✓ Sample chart loaded: ${t3.chartLoaded}`);
    console.log(`  ✓ Flagged with isSampleChart = true: ${t3.isSampleChart}`);
    console.log(`  ✓ Provenance set to SAMPLE_DEMO: ${t3.provenance === 'SAMPLE_DEMO'}`);
    console.log(`  ✓ Renders .sample-bar amber container: ${t3.sampleBarRendered}`);
    console.log(`  ✓ Displays uppercase warning 'SAMPLE CHART — NOT YOUR PERSONAL PROFILE': ${t3.hasWarningBadge}`);
    console.log(`  ✓ Contains button to 'Enter Your Real Birth Details': ${t3.hasRealBirthDetailsBtn}`);

    if (!t3.isSampleChart || !t3.sampleBarRendered || !t3.hasWarningBadge) {
      throw new Error(`TEST 3 Failed: Sample chart isolation and warning banner verification failed.`);
    }

    // -------------------------------------------------------------
    // TEST 4: Weekly 7-Day Forecast & Repeated Auspicious Window Elimination (Phase 6)
    // -------------------------------------------------------------
    console.log(`\n[TEST 4] Verifying Weekly 7-Day Forecast & Auspicious Window Diversity...`);
    const test4 = await client.send('Runtime.evaluate', {
      expression: `(async () => {
        selectGuidanceHorizon('weekly');
        await new Promise(r => setTimeout(r, 600));

        const periodCards = document.querySelectorAll('.guidance-period-card');
        const windows = [];
        periodCards.forEach(c => {
          const w = c.querySelector('.guidance-period-auspicious')?.textContent.trim() || '';
          if (w) windows.push(w);
        });

        const repeatedCount = windows.filter(w => w.includes('09:30 AM – 11:15 AM')).length;
        const uniqueWindows = Array.from(new Set(windows));

        return {
          totalCards: periodCards.length,
          windows: windows,
          uniqueWindowsCount: uniqueWindows.length,
          hardcodedRepeatedCount: repeatedCount
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    const t4 = test4.result.value;
    console.log(`  ✓ Weekly cards rendered: ${t4.totalCards}/7`);
    console.log(`  ✓ Auspicious windows captured across 7 days:`);
    t4.windows.forEach((w, i) => console.log(`      Day ${i + 1}: ${w}`));
    console.log(`  ✓ Unique calculated windows count: ${t4.uniqueWindowsCount}`);
    console.log(`  ✓ Hardcoded repeated '09:30 AM – 11:15 AM' count: ${t4.hardcodedRepeatedCount} (must be <= 1)`);

    if (t4.totalCards !== 7 || t4.hardcodedRepeatedCount > 1 || t4.uniqueWindowsCount < 4) {
      throw new Error(`TEST 4 Failed: Auspicious windows are either repeated or not properly diversified.`);
    }

    // -------------------------------------------------------------
    // TEST 5: Dedicated Remedies & Precautions Content Integrity (Phase 9)
    // -------------------------------------------------------------
    console.log(`\n[TEST 5] Verifying Dedicated Remedies & Precautions Cards Integrity...`);
    const test5 = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const remCard = document.getElementById('guidance-remedies-card');
        const precCard = document.getElementById('guidance-precautions-card');

        const remText = remCard ? remCard.textContent : '';
        const precText = precCard ? precCard.textContent : '';

        return {
          remCardHasMantra: remText.includes('Vedic Beej Mantra') || remText.includes('ॐ'),
          remCardHas108Count: remText.includes('108') || remText.includes('१०८'),
          remCardHasTiming: remText.includes('Practice Timing') || remText.includes('साधना काल'),
          remCardHasCharity: remText.includes('Sattvic Charity') || remText.includes('सात्विक दान'),
          remCardHasGemstoneCaveat: remText.includes('Gemstone Directive') || remText.includes('रत्न संबंधी परामर्श'),
          precCardHasRahuKaal: precText.includes('Rahu Kaal') || precText.includes('राहुकाल'),
          precCardHasYamaganda: precText.includes('Yamaganda') || precText.includes('यमगंड'),
          precCardHasDisclaimer: precText.includes('qualitative atmospheric tendencies') || precText.includes('ज्योतिषीय सावधानियां')
        };
      })()`,
      returnByValue: true
    });

    const t5 = test5.result.value;
    console.log(`  ✓ Remedies card contains Beej Mantra: ${t5.remCardHasMantra}`);
    console.log(`  ✓ Remedies card specifies 108 japa count: ${t5.remCardHas108Count}`);
    console.log(`  ✓ Remedies card specifies practice timing: ${t5.remCardHasTiming}`);
    console.log(`  ✓ Remedies card specifies sattvic charity (Daan): ${t5.remCardHasCharity}`);
    console.log(`  ✓ Remedies card contains strict gemstone caveat: ${t5.remCardHasGemstoneCaveat}`);
    console.log(`  ✓ Precautions card contains Rahu Kaal guidance: ${t5.precCardHasRahuKaal}`);
    console.log(`  ✓ Precautions card contains Yamaganda period: ${t5.precCardHasYamaganda}`);
    console.log(`  ✓ Precautions card contains ethical non-alarmist disclaimer: ${t5.precCardHasDisclaimer}`);

    if (!t5.remCardHasMantra || !t5.remCardHas108Count || !t5.remCardHasGemstoneCaveat || !t5.precCardHasRahuKaal) {
      throw new Error(`TEST 5 Failed: Remedies or precautions cards missing required classical guidance elements.`);
    }

    // -------------------------------------------------------------
    // TEST 6: Split Saturn Statuses (Sade Sati & Kantaka Shani Separate Badges) (Phase 10)
    // -------------------------------------------------------------
    console.log(`\n[TEST 6] Verifying Split Saturn Statuses (Sade Sati vs Kantaka Shani)...`);
    const test6 = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const factsPills = document.getElementById('guidance-disp-profile-metrics');
        const pillsText = factsPills ? factsPills.textContent : '';

        // Check whether Sade Sati and Dhaiya are distinct items
        const hasSadeSatiPill = pillsText.includes('Sade Sati:') || pillsText.includes('साढ़े साती:');
        const hasDhaiyaPill = pillsText.includes('Dhaiya:') || pillsText.includes('ढैया:');
        const hasMergedString = pillsText.includes('Clear of Sade Sati (Kantaka Shani 4th House Dhaiya Active)');

        return {
          hasSadeSatiPill,
          hasDhaiyaPill,
          hasMergedString,
          pillsText
        };
      })()`,
      returnByValue: true
    });

    const t6 = test6.result.value;
    console.log(`  ✓ Contains distinct Sade Sati metric pill: ${t6.hasSadeSatiPill}`);
    console.log(`  ✓ Contains distinct Dhaiya metric pill: ${t6.hasDhaiyaPill}`);
    console.log(`  ✓ Zero occurrence of old merged string: ${!t6.hasMergedString}`);

    if (!t6.hasSadeSatiPill || !t6.hasDhaiyaPill || t6.hasMergedString) {
      throw new Error(`TEST 6 Failed: Saturn statuses must be split into distinct Sade Sati and Dhaiya badges.`);
    }

    // -------------------------------------------------------------
    // TEST 7: Yearly 12-Month Forecast & No Stale Monthly Text During Loading
    // -------------------------------------------------------------
    console.log(`\n[TEST 7] Verifying Yearly 12-Month Forecast & Loading State Isolation...`);
    const test7 = await client.send('Runtime.evaluate', {
      expression: `(async () => {
        // Trigger Yearly horizon
        selectGuidanceHorizon('yearly');
        
        // Immediately check that summary shows loading and NOT stale monthly content
        const summaryElem = document.getElementById('guidance-disp-summary');
        const outlookElem = document.getElementById('guidance-disp-outlook');
        const loadingInitial = (summaryElem ? summaryElem.textContent : '') + (outlookElem ? outlookElem.textContent : '');
        const hasSpinner = loadingInitial.includes('Synthesizing') || loadingInitial.includes('Computing');

        // Wait for yearly resolution
        await new Promise(r => setTimeout(r, 600));

        const periodCards = document.querySelectorAll('.guidance-period-card');
        const cardTitles = Array.from(periodCards).map(c => c.querySelector('span')?.textContent.trim() || '');

        return {
          loadingShowsSpinner: hasSpinner,
          totalYearlyCards: periodCards.length,
          firstCardTitle: cardTitles[0] || '',
          twelfthCardTitle: cardTitles[11] || ''
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    const t7 = test7.result.value;
    console.log(`  ✓ Yearly selection shows fresh loading state (no stale text): ${t7.loadingShowsSpinner}`);
    console.log(`  ✓ Total yearly month cards rendered: ${t7.totalYearlyCards}/12`);
    console.log(`  ✓ First month card title: "${t7.firstCardTitle}"`);
    console.log(`  ✓ Twelfth month card title: "${t7.twelfthCardTitle}"`);

    if (t7.totalYearlyCards !== 12 || !t7.loadingShowsSpinner) {
      throw new Error(`TEST 7 Failed: Expected exactly 12 distinct monthly cards and immediate loading spinner.`);
    }

    // -------------------------------------------------------------
    // TEST 8: Bilingual Localization (Hindi Language Mode)
    // -------------------------------------------------------------
    console.log(`\n[TEST 8] Switching to Hindi and Verifying Complete Bilingual Parity...`);
    const test8 = await client.send('Runtime.evaluate', {
      expression: `(async () => {
        setAppLanguage('hi');
        await new Promise(r => setTimeout(r, 800));

        const headerTitle = document.getElementById('guidance-header-title')?.textContent.trim() || '';
        const remediesHeading = document.getElementById('guidance-remedies-card')?.querySelector('h4')?.textContent.trim() || '';
        const precautionsHeading = document.getElementById('guidance-precautions-card')?.querySelector('h4')?.textContent.trim() || '';
        const barText = document.getElementById('guidance-active-profile-bar')?.textContent || '';

        return {
          lang: currentLanguage,
          headerTitle,
          remediesHeading,
          precautionsHeading,
          barTextHasHindiWarning: barText.includes('नमूना चार्ट — यह आपकी व्यक्तिगत प्रोफाइल नहीं है') || barText.includes('कुंडली आधारित फलादेश'),
          remediesIsHindi: remediesHeading.includes('शुभ वैदिक उपाय एवं मंत्र साधना'),
          precautionsIsHindi: precautionsHeading.includes('ज्योतिषीय सावधानियां एवं गोचर चेतावनी')
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    const t8 = test8.result.value;
    console.log(`  ✓ Language switched to Hindi: ${t8.lang === 'hi'}`);
    console.log(`  ✓ Header title translated: "${t8.headerTitle}"`);
    console.log(`  ✓ Remedies heading translated: "${t8.remediesHeading}"`);
    console.log(`  ✓ Precautions heading translated: "${t8.precautionsHeading}"`);
    console.log(`  ✓ Profile bar rendered in Hindi: ${t8.barTextHasHindiWarning}`);

    if (!t8.remediesIsHindi || !t8.precautionsIsHindi) {
      throw new Error(`TEST 8 Failed: Hindi translation missing on guidance components.`);
    }

    // Reset language back to English
    await client.send('Runtime.evaluate', { expression: `setAppLanguage('en');` });
    await new Promise(r => setTimeout(r, 400));

    // -------------------------------------------------------------
    // TEST 9: 12-Viewport Responsive QA (320px to 2560px)
    // -------------------------------------------------------------
    console.log(`\n[TEST 9] Verifying 12 Responsive Viewports for 0px Horizontal Overflow...`);
    const viewports = [
      { name: 'Mobile Ultra-Narrow', width: 320, height: 600 },
      { name: 'Mobile Small', width: 360, height: 740 },
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPhone 12/13/14', width: 390, height: 844 },
      { name: 'Pixel 7', width: 412, height: 915 },
      { name: 'iPhone Pro Max', width: 430, height: 932 },
      { name: 'Phablet / Foldable', width: 640, height: 900 },
      { name: 'iPad Mini / Tablet', width: 768, height: 1024 },
      { name: 'iPad Pro / Laptop', width: 1024, height: 1366 },
      { name: 'MacBook Air / HD', width: 1280, height: 800 },
      { name: 'Full HD Desktop', width: 1440, height: 900 },
      { name: 'QHD / 4K Ultrawide', width: 2560, height: 1440 }
    ];

    let overflowViolations = 0;
    for (const vp of viewports) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 768
      });
      await new Promise(r => setTimeout(r, 150));

      const ovCheck = await client.send('Runtime.evaluate', {
        expression: `(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const overflow = Math.max(0, docEl.scrollWidth - docEl.clientWidth, body.scrollWidth - body.clientWidth);
          return {
            overflow,
            scrollWidth: docEl.scrollWidth,
            clientWidth: docEl.clientWidth
          };
        })()`,
        returnByValue: true
      });

      const res = ovCheck.result.value;
      const pass = res.overflow === 0;
      if (!pass) overflowViolations++;
      console.log(`  ${pass ? '✓' : '✗'} [${vp.width}px] ${vp.name.padEnd(22)}: Overflow = ${res.overflow}px (scroll: ${res.scrollWidth}px, client: ${res.clientWidth}px)`);
    }

    if (overflowViolations > 0) {
      throw new Error(`TEST 9 Failed: ${overflowViolations} viewports exhibited horizontal overflow.`);
    }

    await client.close();
    chrome.kill();
    console.log(`\n================================================================================`);
    console.log(`ALL 9 VERIFICATION PHASES PASSED WITH ZERO ERRORS (100% SUCCESS)`);
    console.log(`================================================================================\n`);
    process.exit(0);
  } catch (err) {
    chrome.kill();
    console.error(`Verification Suite Error:`, err);
    process.exit(1);
  }
}

runMasterVerification();
