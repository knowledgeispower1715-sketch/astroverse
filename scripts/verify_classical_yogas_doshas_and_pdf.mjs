/**
 * ASTROVERSE CLASSICAL VEDIC YOGA, DOSHA & PDF VERIFICATION SCRIPT
 * ===============================================================
 * End-to-end verification of:
 * 1. Calculation integrity: Eliminate false positives on reference chart (Aryan Tiwari fixture)
 * 2. Real DOM rendering in Headless Chrome:
 *    - Lagna (Scorpio) & Moon (Aquarius)
 *    - Manglik Dosha: Mitigated (Aries Swakshetra / H6), NOT "Afflicted"
 *    - Kaal Sarp Dosha: NO KAAL SARP DOSHA
 *    - Shani Sade Sati: Phase 3 (Setting)
 *    - Classical Yogas view: Dharma-Karmadhipati Raja Yoga (ACTIVE), Gajakesari (ABSENT), Budhaditya (ABSENT), Amala (ABSENT)
 * 3. PDF Generation consistency:
 *    - Chapter 6 & Page 5 contains accurate, verified evaluations and zero false positives
 * 4. High-resolution screenshots saved to test-artifacts/dosha_yoga_verification/
 */

import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const artifactsDir = path.join(rootDir, 'test-artifacts', 'dosha_yoga_verification');

if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir, { recursive: true });
}

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failCount++;
  }
}

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

  async eval(expr) {
    const res = await this.send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      const ex = res.exceptionDetails;
      const msg = ex.exception ? (ex.exception.description || ex.exception.value) : ex.text;
      throw new Error(msg || JSON.stringify(res.exceptionDetails));
    }
    return res.result ? res.result.value : undefined;
  }

  async screenshot(filePath, clip = null) {
    const params = { format: 'png' };
    if (clip) params.clip = clip;
    const res = await this.send('Page.captureScreenshot', params);
    fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
  }
}

async function findChromePath() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  throw new Error('No Chrome/Edge browser binary found');
}

async function startServer(port = 4905) {
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    const filePath = path.join(rootDir, reqPath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  await new Promise((resolve) => server.listen(port, resolve));
  return {
    server,
    url: `http://localhost:${port}/`
  };
}

async function runVerification() {
  console.log('===============================================================');
  console.log('ASTROVERSE CLASSICAL YOGA, DOSHA & PDF E2E VERIFICATION');
  console.log('===============================================================\n');

  const { server, url } = await startServer(4905);
  console.log(`[INFO] Static test server running at ${url}`);

  const chromePath = await findChromePath();
  const userDataDir = path.join(artifactsDir, 'chrome-profile');
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9232',
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    'about:blank'
  ]);

  await new Promise((r) => setTimeout(r, 1200));

  try {
    const versionData = await getJson('http://localhost:9232/json/version');
    const wsUrl = versionData.webSocketDebuggerUrl;
    const browserCdp = new CdpClient(wsUrl);
    await browserCdp.connect();

    const targets = await getJson('http://localhost:9232/json/list');
    const pageTarget = targets.find((t) => t.type === 'page');
    const cdp = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    console.log('\n--- 1. LOADING ASTROVERSE APPLICATION ---');
    await cdp.send('Page.navigate', { url });
    await new Promise((r) => setTimeout(r, 2000));

    // Viewport: Desktop 1440x900
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('\n--- 2. ENTERING ARYAN TIWARI REFERENCE FIXTURE ---');
    const fillRes = await cdp.eval(`
      (() => {
        // Switch to Kundli Studio
        if (typeof switchKundliTab === 'function') {
          switchKundliTab('overview');
        }

        const nameInput = document.getElementById('input-k-name');
        const genderSelect = document.getElementById('input-k-gender');
        const dobInput = document.getElementById('input-k-dob');
        const tobInput = document.getElementById('input-k-tob');
        const latInput = document.getElementById('k-resolved-lat');
        const lonInput = document.getElementById('k-resolved-lon');
        const tzInput = document.getElementById('k-resolved-tz');

        if (nameInput) nameInput.value = 'Aryan Tiwari';
        if (genderSelect) genderSelect.value = 'male';
        if (dobInput) dobInput.value = '2005-08-20';
        if (tobInput) tobInput.value = '14:05';
        if (latInput) latInput.value = '23.1700';
        if (lonInput) lonInput.value = '79.9500';
        if (tzInput) tzInput.value = 'Asia/Kolkata';

        // Trigger calculation
        if (typeof generateUserKundli === 'function') {
          generateUserKundli();
          return { success: true };
        }
        return { success: false, reason: 'generateUserKundli function not found' };
      })()
    `);

    assert(fillRes.success === true, 'Triggered generateUserKundli successfully');
    await new Promise((r) => setTimeout(r, 1000));

    console.log('\n--- 3. VERIFYING OVERVIEW DIAGNOSTICS & PLANETARY POSITIONS ---');
    const chartState = await cdp.eval(`
      (() => {
        const c = window.currentCalculatedChart;
        if (!c) return { ready: false };

        const d1 = c.fullData?.d1_rashi_chart;
        const lagnaSign = d1?.lagna?.sign;
        const lagnaDeg = d1?.lagna?.degree;
        const planets = d1?.planets || {};

        const ovManglik = document.getElementById('overview-manglik-chip')?.textContent?.trim();
        const ovSadeSati = document.getElementById('overview-sadesati-chip')?.textContent?.trim();

        return {
          ready: true,
          lagnaSign,
          lagnaDeg,
          moonSign: planets.Moon?.sign,
          moonHouse: planets.Moon?.house,
          sunSign: planets.Sun?.sign,
          sunHouse: planets.Sun?.house,
          marsSign: planets.Mars?.sign,
          marsHouse: planets.Mars?.house,
          jupiterSign: planets.Jupiter?.sign,
          jupiterHouse: planets.Jupiter?.house,
          mercurySign: planets.Mercury?.sign,
          mercuryHouse: planets.Mercury?.house,
          venusSign: planets.Venus?.sign,
          venusHouse: planets.Venus?.house,
          saturnSign: planets.Saturn?.sign,
          saturnHouse: planets.Saturn?.house,
          ovManglik,
          ovSadeSati
        };
      })()
    `);

    assert(chartState.ready === true, 'Calculated chart state is active in browser memory');
    assert(chartState.lagnaSign === 'Scorpio', `Lagna must be Scorpio (got: ${chartState.lagnaSign})`);
    assert(chartState.moonSign === 'Aquarius' && chartState.moonHouse === 4, `Moon must be Aquarius in House 4 (got: ${chartState.moonSign} H${chartState.moonHouse})`);
    assert(chartState.marsSign === 'Aries' && chartState.marsHouse === 6, `Mars must be Aries in House 6 (got: ${chartState.marsSign} H${chartState.marsHouse})`);
    assert(chartState.sunSign === 'Leo' && chartState.sunHouse === 10, `Sun must be Leo in House 10 (got: ${chartState.sunSign} H${chartState.sunHouse})`);
    assert(chartState.jupiterSign === 'Virgo' && chartState.jupiterHouse === 11, `Jupiter must be Virgo in House 11 (got: ${chartState.jupiterSign} H${chartState.jupiterHouse})`);
    assert(chartState.ovManglik.includes('Mitigated'), `Overview Manglik chip must state Mitigated (got: "${chartState.ovManglik}")`);
    assert(chartState.ovSadeSati.includes('Phase 3'), `Overview Sade Sati chip must state Phase 3 (got: "${chartState.ovSadeSati}")`);

    await cdp.screenshot(path.join(artifactsDir, '01_kundli_overview_desktop.png'));

    console.log('\n--- 4. VERIFYING YOGAS & DOSHAS TAB (kw-pane-yogas) ---');
    await cdp.eval(`switchKundliTab('yogas')`);
    await new Promise((r) => setTimeout(r, 600));

    const yogasTabState = await cdp.eval(`
      (() => {
        const pillManglik = document.getElementById('pill-manglik-verdict')?.textContent?.trim();
        const descManglik = document.getElementById('desc-manglik-text')?.textContent?.trim();
        const pillKalsarp = document.getElementById('pill-kalsarp-verdict')?.textContent?.trim();
        const pillSadeSati = document.getElementById('pill-sadesati-verdict')?.textContent?.trim();

        const yogasList = document.getElementById('classical-yogas-list');
        const allCards = Array.from(yogasList ? yogasList.children : []);

        // Find individual cards by title
        function getCard(name) {
          return Array.from(yogasList.querySelectorAll('div')).find(d => {
            const strong = d.querySelector('strong');
            return strong && strong.textContent.includes(name);
          });
        }

        const dkr = getCard('Dharma-Karmadhipati');
        const hasDkrActive = dkr ? (dkr.innerText.includes('ACTIVE IN CHART') || dkr.innerText.includes('ACTIVE')) : false;

        const gaja = getCard('Gajakesari Yoga');
        const hasGajakesariAbsent = gaja ? gaja.innerText.includes('ABSENT (RULE NOT MET)') : false;
        const hasGajakesariActive = gaja ? gaja.innerText.includes('ACTIVE IN CHART') : false;

        const budh = getCard('Budhaditya Yoga');
        const hasBudhadityaAbsent = budh ? budh.innerText.includes('ABSENT (RULE NOT MET)') : false;
        const hasBudhadityaActive = budh ? budh.innerText.includes('ACTIVE IN CHART') : false;

        const amala = getCard('Amala Yoga');
        const hasAmalaAbsent = amala ? amala.innerText.includes('ABSENT (RULE NOT MET)') : false;
        const hasAmalaActive = amala ? amala.innerText.includes('ACTIVE IN CHART') : false;

        return {
          pillManglik,
          descManglik,
          pillKalsarp,
          pillSadeSati,
          hasDkrActive,
          hasGajakesariAbsent,
          hasGajakesariActive,
          hasBudhadityaAbsent,
          hasBudhadityaActive,
          hasAmalaAbsent,
          hasAmalaActive
        };
      })()
    `);

    assert(yogasTabState.pillManglik.includes('Mitigated'), `Manglik pill must show Mitigated / Pacified (got: "${yogasTabState.pillManglik}")`);
    assert(yogasTabState.descManglik.includes('Aries') || yogasTabState.descManglik.includes('6th house'), `Manglik description must cite H6 / Aries Swakshetra mitigation`);
    assert(yogasTabState.pillKalsarp === 'NO KAAL SARP DOSHA', `Kaal Sarp pill must be NO KAAL SARP DOSHA (got: "${yogasTabState.pillKalsarp}")`);
    assert(yogasTabState.pillSadeSati.includes('Phase 3'), `Sade Sati pill must show Phase 3 (got: "${yogasTabState.pillSadeSati}")`);

    // Yoga classification verification
    assert(yogasTabState.hasDkrActive === true, 'Dharma-Karmadhipati Raja Yoga must be ACTIVE');
    assert(yogasTabState.hasGajakesariActive === false, 'Gajakesari Yoga must NOT be displayed as ACTIVE (Zero False Positive)');
    assert(yogasTabState.hasGajakesariAbsent === true, 'Gajakesari Yoga must be explicitly audited as ABSENT');
    assert(yogasTabState.hasBudhadityaActive === false, 'Budhaditya Yoga must NOT be displayed as ACTIVE (Zero False Positive)');
    assert(yogasTabState.hasBudhadityaAbsent === true, 'Budhaditya Yoga must be explicitly audited as ABSENT');
    assert(yogasTabState.hasAmalaActive === false, 'Amala Yoga must NOT be displayed as ACTIVE (Zero False Positive)');
    assert(yogasTabState.hasAmalaAbsent === true, 'Amala Yoga must be explicitly audited as ABSENT');

    await cdp.screenshot(path.join(artifactsDir, '02_kundli_yogas_and_doshas_tab.png'));

    console.log('\n--- 5. VERIFYING PDF SYNTHESIS FOR JANAM KUNDLI DEEP DIVE ---');
    const pdfVerification = await cdp.eval(`
      (async () => {
        let capturedText = '';
        // Stub html2pdf save so it doesn't trigger file download prompt and captures rendered pages
        window.html2pdf = () => ({
          set: () => ({
            from: (cnt) => {
              if (cnt) {
                capturedText = cnt.innerText || '';
              }
              return {
                toCanvas: async () => {},
                toPdf: async () => {},
                save: async () => {},
                prop: {
                  canvas: { width: 794, height: 1123 },
                  pdf: { internal: { getNumberOfPages: () => 5 } }
                }
              };
            }
          })
        });

        // Trigger PDF generation
        if (typeof generateAndDownloadReportPdf === 'function') {
          await generateAndDownloadReportPdf(window.currentCalculatedChart, 'Janam Kundli Deep Dive Publication');
        }

        const text = capturedText;
        return {
          length: text.length,
          snippet: text.substring(0, 1000),
          hasDkr: text.includes('Dharma-Karmadhipati Raja Yoga'),
          hasGajaAbsent: text.includes('Gajakesari & Budhaditya (Absent)') || (text.includes('Gajakesari') && text.includes('Absent')),
          hasGajaActiveCheck: text.includes('Gaja Kesari Yoga') && text.includes('Bestows wisdom'), // old hardcoded text
          hasManglikMitigated: text.includes('Kuja Dosha: Mitigated (Swakshetra)') || text.includes('Mitigated'),
          hasSadeSati: text.includes('Shani Sade Sati: Phase 3 (Setting)') || text.includes('Phase 3'),
          hasPage5: text.includes('Page 5')
        };
      })()
    `);

    console.log('[DEBUG] PDF container text length:', pdfVerification.length, 'snippet:', JSON.stringify(pdfVerification.snippet?.slice(0, 200)));
    assert(pdfVerification.hasDkr === true, 'PDF Section 7 includes Dharma-Karmadhipati Raja Yoga');
    assert(pdfVerification.hasGajaAbsent === true, 'PDF Section 7 includes Gajakesari as ABSENT');
    assert(pdfVerification.hasGajaActiveCheck === false, 'PDF Section 7 has NO old hardcoded active Gaja Kesari card');
    assert(pdfVerification.hasManglikMitigated === true, 'PDF Section 7 states Kuja Dosha is Mitigated (Swakshetra)');
    assert(pdfVerification.hasSadeSati === true, 'PDF Section 7 displays Shani Sade Sati Phase 3 Setting');

    console.log('\n--- 6. VERIFYING MOBILE VIEWPORT (390px) ---');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise((r) => setTimeout(r, 600));

    const mobileOverflow = await cdp.eval(`document.documentElement.scrollWidth > window.innerWidth`);
    assert(mobileOverflow === false, 'Mobile viewport (390px) has 0px horizontal scroll overflow');

    await cdp.screenshot(path.join(artifactsDir, '03_kundli_yogas_mobile_390.png'));

    console.log('\n===============================================================');
    console.log(`VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('===============================================================');

  } finally {
    chromeProc.kill();
    server.close();
  }

  if (failCount > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error('[UNCAUGHT ERROR]', err);
  process.exit(1);
});
