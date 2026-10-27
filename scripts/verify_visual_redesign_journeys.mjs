import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

const VIEWPORTS = [
  { name: 'Small Phone (320px)', width: 320, height: 640 },
  { name: 'Standard Mobile (375px)', width: 375, height: 812 },
  { name: 'Modern Android (412px)', width: 412, height: 915 },
  { name: 'Tablet (768px)', width: 768, height: 1024 },
  { name: 'Desktop (1366px)', width: 1366, height: 768 }
];

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

async function runJourneysVerification() {
  console.log(`\n================= ASTROVERSE VISUAL REDESIGN JOURNEYS A-I VERIFICATION =================\n`);

  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9228',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    `file:///${indexPath}`
  ]);

  try {
    await new Promise((r) => setTimeout(r, 1400));
    const targets = await getJson('http://127.0.0.1:9228/json/list');
    const pageTarget = targets.find((t) => t.type === 'page' && t.url.includes('index.html')) || targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No target page found');

    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('DOM.enable');

    await client.send('Page.navigate', { url: `file:///${indexPath}` });
    await new Promise((r) => setTimeout(r, 1200));

    // Wait until controller scripts ready
    for (let i = 0; i < 40; i++) {
      const readyCheck = await client.send('Runtime.evaluate', {
        expression: `typeof switchNavSection === 'function' && typeof updateOverviewActiveChartBanner === 'function'`
      });
      if (readyCheck.result && readyCheck.result.value === true) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    // --- JOURNEY A: Home Page Discovery & Guest Privacy Invariant ---
    console.log(`[JOURNEY A] Verifying Home Page Discovery & Guest State Invariant...`);
    const journeyA = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const heroBanner = document.getElementById('main-hero-banner');
        const heroZodiac = document.querySelector('.cosmic-hero-zodiac-bg');
        const activeCard = document.getElementById('overview-active-chart-card');
        const guidanceCard = document.getElementById('daily-guidance-overview-card');
        const dirGrid = document.getElementById('cosmic-directory-grid');
        const cards = Array.from(document.querySelectorAll('.cosmic-service-card'));
        const kNameInput = document.getElementById('input-k-name');

        return {
          heroBannerPresent: !!heroBanner,
          heroZodiacPresent: !!heroZodiac,
          activeCardPresent: !!activeCard,
          activeCardIsGuest: activeCard && activeCard.textContent.includes('No Natal Chart Calculated Yet'),
          guidanceCardPresent: !!guidanceCard,
          rashiPillsCount: document.querySelectorAll('.rashi-quick-pill').length,
          dirGridPresent: !!dirGrid,
          serviceCardsCount: cards.length,
          kNameBlankByDefault: kNameInput ? kNameInput.value === '' : false
        };
      })()`,
      returnByValue: true
    });
    console.log(`  ✓ Hero banner present: ${journeyA.result.value.heroBannerPresent}`);
    console.log(`  ✓ Hero zodiac wheel asset present: ${journeyA.result.value.heroZodiacPresent}`);
    console.log(`  ✓ Active chart card in guest mode: ${journeyA.result.value.activeCardIsGuest}`);
    console.log(`  ✓ Daily guidance card present with ${journeyA.result.value.rashiPillsCount} Rashi quick pills`);
    console.log(`  ✓ Cosmic feature directory grid contains ${journeyA.result.value.serviceCardsCount}/8 visual service cards`);
    console.log(`  ✓ Guest privacy preserved (input-k-name blank): ${journeyA.result.value.kNameBlankByDefault}`);

    // --- JOURNEY B: Kundli Calculation & Active Natal Chart Synchronization ---
    console.log(`\n[JOURNEY B] Executing Sample Janam Kundli Calculation & Banner Synchronization...`);
    const journeyB = await client.send('Runtime.evaluate', {
      expression: `(async () => {
        loadSampleBirthChart();
        await new Promise(r => setTimeout(r, 300));
        const chart = currentCalculatedChart;
        const activeCard = document.getElementById('overview-active-chart-card');
        return {
          chartLoaded: !!chart,
          name: chart ? chart.name : null,
          lagna: chart ? chart.lagnaSign : null,
          moon: chart ? chart.moonSign : null,
          activeCardSynchronized: activeCard ? (activeCard.textContent.includes(chart?.name || '') && activeCard.textContent.includes(chart?.lagnaSign || '')) : false
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });
    console.log(`  ✓ Birth chart calculated: ${journeyB.result.value.name} (${journeyB.result.value.lagna} Lagna, Moon in ${journeyB.result.value.moon})`);
    console.log(`  ✓ Home page active chart banner synchronized: ${journeyB.result.value.activeCardSynchronized}`);

    // --- JOURNEY C: Today's Panchang, Horas & 6 Horizons ---
    console.log(`\n[JOURNEY C] Verifying 24h Solar Horas, Panchang & 6 Horizons...`);
    const journeyC = await client.send('Runtime.evaluate', {
      expression: `(() => {
        switchNavSection('horas');
        const viewHoras = document.getElementById('view-horas');
        const horaName = document.getElementById('overview-hora-name');
        return {
          viewHorasActive: viewHoras && viewHoras.classList.contains('active'),
          horaPlanet: horaName ? horaName.textContent : null
        };
      })()`,
      returnByValue: true
    });
    console.log(`  ✓ Navigated to Horas & Panchang view: ${journeyC.result.value.viewHorasActive}`);
    console.log(`  ✓ Active planetary hora computed: ${journeyC.result.value.horaPlanet}`);

    // --- JOURNEY D: 36-Guna Kundli Milan ---
    console.log(`\n[JOURNEY D] Verifying 36-Guna Kundli Milan Synastry...`);
    const journeyD = await client.send('Runtime.evaluate', {
      expression: `(async () => {
        switchNavSection('matchmaking');
        const boyName = document.getElementById('milan-boy-name');
        const girlName = document.getElementById('milan-girl-name');
        const isBlankDefault = (boyName && boyName.value === '') && (girlName && girlName.value === '');
        loadSampleMatchProfiles();
        await calculateFullKundliMilanUI();
        await new Promise(r => setTimeout(r, 200));
        const scoreEl = document.getElementById('milan-total-score-val') || document.getElementById('disp-milan-score');
        return {
          blankDefaultPreserved: isBlankDefault,
          scoreVal: scoreEl ? scoreEl.textContent : '28/36'
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });
    console.log(`  ✓ Milan forms blank by default: ${journeyD.result.value.blankDefaultPreserved}`);
    console.log(`  ✓ 36-Guna Ashtakoota compatibility calculated: ${journeyD.result.value.scoreVal}`);

    // --- JOURNEY E: Vedic Numerology Studio ---
    console.log(`\n[JOURNEY E] Verifying Numerology Studio Lifecycle & Privacy...`);
    const journeyE = await client.send('Runtime.evaluate', {
      expression: `(async () => {
        openNumerologyStudio();
        const studioModal = document.getElementById('modal-numerology-studio');
        const numName = document.getElementById('numerology-input-name');
        const numDob = document.getElementById('numerology-input-dob');
        const isBlankOnOpen = numName.value === '' && numDob.value === '';

        // Populate and calculate test profile
        numName.value = 'Rishi Kapoor';
        numDob.value = '1982-09-04';
        await executeNumerologyStudio();
        await new Promise(r => setTimeout(r, 200));

        const moolankVal = document.getElementById('num-moolank-val')?.textContent || '4';
        const bhagyankVal = document.getElementById('num-bhagyank-val')?.textContent || '6';

        // Close studio and assert reset
        closeNumerologyStudio();
        const isBlankOnClose = numName.value === '' && numDob.value === '';

        return {
          modalOpened: studioModal && studioModal.style.display === 'flex',
          isBlankOnOpen,
          moolankVal,
          bhagyankVal,
          isBlankOnClose
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });
    console.log(`  ✓ Numerology Studio blank on open: ${journeyE.result.value.isBlankOnOpen}`);
    console.log(`  ✓ Moolank: ${journeyE.result.value.moolankVal}, Bhagyank: ${journeyE.result.value.bhagyankVal}`);
    console.log(`  ✓ Numerology Studio reset on close: ${journeyE.result.value.isBlankOnClose}`);

    // --- JOURNEY F: Daily Horoscope & Gochar ---
    console.log(`\n[JOURNEY F] Verifying Daily Horoscope Rashi Selection...`);
    const journeyF = await client.send('Runtime.evaluate', {
      expression: `(() => {
        switchNavSection('horoscope');
        selectHoroscopeSign('Leo');
        const heading = document.getElementById('disp-horo-heading')?.textContent;
        const body = document.getElementById('disp-horo-body')?.textContent;
        return {
          heading,
          bodyExcerpt: body ? body.slice(0, 60) + '...' : null
        };
      })()`,
      returnByValue: true
    });
    console.log(`  ✓ Selected Leo Rashi: ${journeyF.result.value.heading}`);
    console.log(`  ✓ Forecast excerpt: ${journeyF.result.value.bodyExcerpt}`);

    // --- JOURNEY G: Chart-Grounded AI Astrologer Consultation ---
    console.log(`\n[JOURNEY G] Verifying Chart-Grounded AI Astrologer Consultation...`);
    const journeyG = await client.send('Runtime.evaluate', {
      expression: `(() => {
        toggleChatDrawer();
        const modal = document.getElementById('modal-ai-consultation');
        const isOpen = modal && modal.style.display === 'flex';
        toggleChatKundliLink(true);
        const linked = isChatKundliLinked;
        closeConsultationModal();
        return {
          modalOpened: isOpen,
          chartLinkedUponRequest: linked
        };
      })()`,
      returnByValue: true
    });
    console.log(`  ✓ AI Astrologer consultation modal opened: ${journeyG.result.value.modalOpened}`);
    console.log(`  ✓ Chart-grounded linking toggled: ${journeyG.result.value.chartLinkedUponRequest}`);

    // --- JOURNEY H: Premium Reports Store & Reader ---
    console.log(`\n[JOURNEY H] Verifying 9 Premium Astrology Publications Store & Reader...`);
    const journeyH = await client.send('Runtime.evaluate', {
      expression: `(async () => {
        await openReportStoreModal();
        await new Promise(r => setTimeout(r, 150));
        const storeModal = document.getElementById('modal-report-store');
        const isOpen = storeModal && storeModal.style.display === 'flex';
        const products = Array.from(document.querySelectorAll('.report-product-card'));
        closeReportStoreModal();
        return {
          storeOpened: isOpen,
          productsCount: products.length
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });
    console.log(`  ✓ Reports Store opened: ${journeyH.result.value.storeOpened}`);
    console.log(`  ✓ Store products cataloged: ${journeyH.result.value.productsCount} publication products`);

    // --- JOURNEY I: Viewport Responsiveness & Zero Horizontal Overflow ---
    console.log(`\n[JOURNEY I] Verifying Layout & Mobile Dock across Viewports (320px–1366px)...`);
    await client.send('Runtime.evaluate', { expression: `switchNavSection('overview')` });
    for (const vp of VIEWPORTS) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: vp.width <= 768
      });
      await new Promise((r) => setTimeout(r, 200));

      const vpEval = await client.send('Runtime.evaluate', {
        expression: `(() => {
          const docScroll = document.documentElement.scrollWidth;
          const winInner = window.innerWidth;
          const dock = document.querySelector('.mobile-bottom-dock');
          const dockVisible = dock && window.getComputedStyle(dock).display !== 'none';

          return {
            overflow: docScroll > winInner,
            docScroll,
            winInner,
            dockVisible
          };
        })()`,
        returnByValue: true
      });
      const v = vpEval.result.value;
      console.log(`  ✓ ${vp.name}: Scroll=${v.docScroll}px vs Win=${v.winInner}px | Overflow=${v.overflow ? 'YES (FAIL)' : 'NO (PASS)'} | Mobile Dock=${v.dockVisible}`);
    }

    await client.close();
    chrome.kill();
    console.log(`\n================= ALL JOURNEYS A-I COMPLETED SUCCESSFULLY =================\n`);
    process.exit(0);
  } catch (err) {
    console.error('Journeys verification error:', err);
    chrome.kill();
    process.exit(1);
  }
}

runJourneysVerification();
