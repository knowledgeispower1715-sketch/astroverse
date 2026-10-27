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

async function runGuidanceVerification() {
  console.log(`\n================= ASTROVERSE SIX-HORIZON GUIDANCE FORENSIC VERIFICATION =================\n`);

  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9229',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    `file:///${indexPath}`
  ]);

  try {
    await new Promise((r) => setTimeout(r, 1400));
    const targets = await getJson('http://127.0.0.1:9229/json/list');
    const pageTarget = targets.find((t) => t.type === 'page' && t.url.includes('index.html')) || targets.find((t) => t.type === 'page');

    if (!pageTarget) throw new Error('No Chrome page target discovered on port 9229');

    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('DOM.enable');

    // -------------------------------------------------------------
    // TEST 1: Initial Blank State & Six-Horizon Onboarding Invariant
    // -------------------------------------------------------------
    console.log(`[TEST 1] Verifying Blank State Invariant & Discovery Onboarding Experience...`);
    const test1 = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const onboardingView = document.getElementById('guidance-onboarding-view');
        const sectionsWrap = document.getElementById('guidance-sections-wrap');
        const transitBanner = document.getElementById('guidance-transit-banner');
        const headerTitle = document.getElementById('guidance-header-title');
        const badge = document.getElementById('guidance-grounding-badge');
        const nameInput = document.getElementById('input-k-name');
        const cards = document.querySelectorAll('.guidance-discovery-card');

        return {
          state: window.astroGuidanceState,
          chartLoaded: !!window.currentCalculatedChart,
          kNameBlank: nameInput ? nameInput.value === '' : false,
          onboardingVisible: onboardingView ? (window.getComputedStyle(onboardingView).display !== 'none') : false,
          sectionsHidden: sectionsWrap ? (window.getComputedStyle(sectionsWrap).display === 'none') : false,
          transitBannerHidden: transitBanner ? (window.getComputedStyle(transitBanner).display === 'none') : false,
          discoveryCardsCount: cards.length,
          headerTitleText: headerTitle ? headerTitle.textContent.trim() : '',
          badgeText: badge ? badge.textContent.trim() : ''
        };
      })()`,
      returnByValue: true
    });

    const t1 = test1.result.value;
    console.log(`  ✓ State is NO_PROFILE: ${t1.state === 'NO_PROFILE'} (${t1.state})`);
    console.log(`  ✓ Chart is null (no false prefill): ${!t1.chartLoaded}`);
    console.log(`  ✓ Kundli name input is blank: ${t1.kNameBlank}`);
    console.log(`  ✓ Onboarding view is visible: ${t1.onboardingVisible}`);
    console.log(`  ✓ Predictions section is hidden: ${t1.sectionsHidden}`);
    console.log(`  ✓ Transit banner is hidden: ${t1.transitBannerHidden}`);
    console.log(`  ✓ 6 Visual Discovery cards rendered: ${t1.discoveryCardsCount}/6`);
    console.log(`  ✓ Header title: "${t1.headerTitleText}"`);
    console.log(`  ✓ Grounding badge: "${t1.badgeText}"`);

    if (t1.state !== 'NO_PROFILE' || !t1.onboardingVisible || !t1.sectionsHidden || t1.discoveryCardsCount !== 6) {
      throw new Error(`TEST 1 Failed: Expected blank NO_PROFILE state with 6 onboarding cards.`);
    }

    // -------------------------------------------------------------
    // TEST 2: General Transit Preview Mode & Explicit Labeling
    // -------------------------------------------------------------
    console.log(`\n[TEST 2] Verifying General Transit Preview Mode & Disclaimers...`);
    const test2 = await client.send('Runtime.evaluate', {
      expression: `(async () => {
        enterGeneralTransitPreview('hourly');
        await new Promise(r => setTimeout(r, 600));
        const onboardingView = document.getElementById('guidance-onboarding-view');
        const sectionsWrap = document.getElementById('guidance-sections-wrap');
        const transitBanner = document.getElementById('guidance-transit-banner');
        const headerTitle = document.getElementById('guidance-header-title');
        const badge = document.getElementById('guidance-grounding-badge');
        const summary = document.getElementById('guidance-disp-summary');
        const outlook = document.getElementById('guidance-disp-outlook');
        const factsPills = document.getElementById('guidance-disp-profile-metrics');

        return {
          state: window.astroGuidanceState,
          onboardingHidden: onboardingView ? (window.getComputedStyle(onboardingView).display === 'none') : false,
          sectionsVisible: sectionsWrap ? (window.getComputedStyle(sectionsWrap).display !== 'none') : false,
          transitBannerVisible: transitBanner ? (window.getComputedStyle(transitBanner).display !== 'none') : false,
          headerTitleText: headerTitle ? headerTitle.textContent.trim() : '',
          badgeText: badge ? badge.textContent.trim() : '',
          summaryText: summary ? summary.textContent.trim() : '',
          outlookText: outlook ? outlook.textContent.trim() : '',
          factsText: factsPills ? factsPills.textContent.trim() : '',
          isDistinctSummary: summary && outlook ? (summary.textContent.trim() !== outlook.textContent.trim()) : false
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    const t2 = test2.result.value;
    console.log(`  ✓ State transitioned to GENERAL_TRANSIT_PREVIEW: ${t2.state === 'GENERAL_TRANSIT_PREVIEW'}`);
    console.log(`  ✓ Onboarding view hidden: ${t2.onboardingHidden}`);
    console.log(`  ✓ Prediction sections visible: ${t2.sectionsVisible}`);
    console.log(`  ✓ Transit disclaimer banner displayed: ${t2.transitBannerVisible}`);
    console.log(`  ✓ Header title: "${t2.headerTitleText}"`);
    console.log(`  ✓ Grounding badge: "${t2.badgeText}"`);
    console.log(`  ✓ Facts explicitly state "Not Loaded": ${t2.factsText.includes('Not Loaded')}`);
    console.log(`  ✓ Executive summary is strictly distinct from overall outlook: ${t2.isDistinctSummary}`);

    if (t2.state !== 'GENERAL_TRANSIT_PREVIEW' || !t2.transitBannerVisible || !t2.isDistinctSummary) {
      throw new Error(`TEST 2 Failed: General Transit Preview mode failed requirements.`);
    }

    // -------------------------------------------------------------
    // TEST 3: Mahadasha Requirement Card & Unpersonalized Paywall
    // -------------------------------------------------------------
    console.log(`\n[TEST 3] Verifying Mahadasha Chart Requirement & Unpersonalized Paywall Safeguards...`);
    const test3 = await client.send('Runtime.evaluate', {
      expression: `(async () => {
        selectGuidanceHorizon('mahadasha');
        await new Promise(r => setTimeout(r, 600));
        const reqCard = document.querySelector('.guidance-chart-required-card');
        const lockedPeriods = document.querySelectorAll('.guidance-period-card.is-locked-card');
        const ctaBox = document.getElementById('guidance-premium-cta-box');

        return {
          chartRequiredCardPresent: !!reqCard,
          chartRequiredText: reqCard ? reqCard.textContent.trim() : '',
          fakePeriodsCount: lockedPeriods.length,
          ctaBoxVisible: ctaBox ? (window.getComputedStyle(ctaBox).display !== 'none') : false,
          ctaBoxDirectsToFreeKundli: ctaBox ? ctaBox.textContent.includes('Calculate Free Kundli First') : false
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    const t3 = test3.result.value;
    console.log(`  ✓ Mahadasha chart requirement card rendered: ${t3.chartRequiredCardPresent}`);
    console.log(`  ✓ Zero fake dasha subperiods fabricated: ${t3.fakePeriodsCount === 0}`);
    console.log(`  ✓ Paywall directs user to calculate free Kundli first: ${t3.ctaBoxDirectsToFreeKundli}`);

    if (!t3.chartRequiredCardPresent || t3.fakePeriodsCount > 0 || !t3.ctaBoxDirectsToFreeKundli) {
      throw new Error(`TEST 3 Failed: Mahadasha must require chart and paywall must not charge for guest data.`);
    }

    // -------------------------------------------------------------
    // TEST 4: Kundli Calculation & Personalized Chart Grounding
    // -------------------------------------------------------------
    console.log(`\n[TEST 4] Calculating Janam Kundli and Verifying Personalized Chart Grounding...`);
    const test4 = await client.send('Runtime.evaluate', {
      expression: `(async () => {
        await loadSampleBirthChart();
        await new Promise(r => setTimeout(r, 600));
        selectGuidanceHorizon('hourly');

        const state = window.astroGuidanceState;
        const chart = window.currentCalculatedChart;
        const onboardingView = document.getElementById('guidance-onboarding-view');
        const sectionsWrap = document.getElementById('guidance-sections-wrap');
        const transitBanner = document.getElementById('guidance-transit-banner');
        const headerTitle = document.getElementById('guidance-header-title');
        const badge = document.getElementById('guidance-grounding-badge');
        const factsPills = document.getElementById('guidance-disp-profile-metrics');

        return {
          state: state,
          chartLoaded: !!chart,
          chartName: chart?.name,
          lagnaSign: chart?.lagnaSign,
          moonSign: chart?.moonSign,
          onboardingHidden: onboardingView ? (window.getComputedStyle(onboardingView).display === 'none') : false,
          sectionsVisible: sectionsWrap ? (window.getComputedStyle(sectionsWrap).display !== 'none') : false,
          transitBannerHidden: transitBanner ? (window.getComputedStyle(transitBanner).display === 'none') : false,
          headerTitleText: headerTitle ? headerTitle.textContent.trim() : '',
          badgeText: badge ? badge.textContent.trim() : '',
          factsText: factsPills ? factsPills.textContent.trim() : ''
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    const t4 = test4.result.value;
    console.log(`  ✓ State is PERSONALIZED_READY: ${t4.state === 'PERSONALIZED_READY'} (${t4.state})`);
    console.log(`  ✓ Chart loaded for: ${t4.chartName} (${t4.lagnaSign} Lagna, Moon in ${t4.moonSign})`);
    console.log(`  ✓ Onboarding view hidden: ${t4.onboardingHidden}`);
    console.log(`  ✓ Personalized sections visible: ${t4.sectionsVisible}`);
    console.log(`  ✓ Transit banner hidden: ${t4.transitBannerHidden}`);
    console.log(`  ✓ Header title includes name: "${t4.headerTitleText}"`);
    console.log(`  ✓ Grounding badge includes Lagna and Moon: "${t4.badgeText}"`);
    console.log(`  ✓ Facts metrics reflect natal data: "${t4.factsText}"`);

    if (t4.state !== 'PERSONALIZED_READY' || !t4.headerTitleText.includes('Anand Sharma') || !t4.badgeText.includes('Leo')) {
      throw new Error(`TEST 4 Failed: Personalized chart grounding failed.`);
    }

    // -------------------------------------------------------------
    // TEST 5: Lifecycle & Sign-Out Invariant
    // -------------------------------------------------------------
    console.log(`\n[TEST 5] Verifying Sign-Out / Reset Lifecycle Invariant...`);
    const test5 = await client.send('Runtime.evaluate', {
      expression: `(() => {
        executeSignOut(false);
        const onboardingView = document.getElementById('guidance-onboarding-view');
        const sectionsWrap = document.getElementById('guidance-sections-wrap');
        const chart = window.currentCalculatedChart;

        return {
          state: window.astroGuidanceState,
          chartIsNull: chart === null,
          onboardingRestored: onboardingView ? (window.getComputedStyle(onboardingView).display !== 'none') : false,
          sectionsHidden: sectionsWrap ? (window.getComputedStyle(sectionsWrap).display === 'none') : false
        };
      })()`,
      returnByValue: true
    });

    const t5 = test5.result.value;
    console.log(`  ✓ State reset to NO_PROFILE: ${t5.state === 'NO_PROFILE'} (${t5.state})`);
    console.log(`  ✓ Chart purged from memory: ${t5.chartIsNull}`);
    console.log(`  ✓ Onboarding discovery view restored: ${t5.onboardingRestored}`);
    console.log(`  ✓ Predictions section hidden: ${t5.sectionsHidden}`);

    if (t5.state !== 'NO_PROFILE' || !t5.chartIsNull || !t5.onboardingRestored || !t5.sectionsHidden) {
      throw new Error(`TEST 5 Failed: Sign-out lifecycle must restore clean NO_PROFILE state.`);
    }

    await client.close();
    chrome.kill();
    console.log(`\n================= ALL 5 GUIDANCE INVARIANTS VERIFIED SUCCESSFULLY (PASS) =================\n`);
  } catch (err) {
    chrome.kill();
    console.error(`Guidance verification error:`, err);
    process.exit(1);
  }
}

runGuidanceVerification();
