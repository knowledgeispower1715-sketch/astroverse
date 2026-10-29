import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
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
    this.ws = new globalThis.WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', reject);
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval exception: ${res.exceptionDetails.text}`);
    }
    return res.result?.value;
  }
}

const TEST_VIEWPORTS = [
  { name: '320px (iPhone SE 1st gen)', width: 320, height: 568 },
  { name: '360px (Galaxy compact)', width: 360, height: 640 },
  { name: '375px (iPhone 8 / SE 2)', width: 375, height: 667 },
  { name: '390px (iPhone 12/13/14)', width: 390, height: 844 },
  { name: '393px (iPhone 14/15/16 Pro)', width: 393, height: 852 },
  { name: '414px (iPhone XR/11)', width: 414, height: 896 },
  { name: '430px (iPhone 15/16 Pro Max)', width: 430, height: 932 }
];

async function main() {
  console.log('======================================================================');
  console.log('ASTROVERSE MOBILE SPACING & HEADER COLLISION VERIFICATION TEST');
  console.log('======================================================================\n');

  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9260',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    `file:///${indexPath}`
  ]);

  let passedAll = true;
  let testCount = 0;
  let passCount = 0;

  function assert(label, condition) {
    testCount++;
    if (condition) {
      passCount++;
      console.log(`  [PASS] ${label}`);
    } else {
      passedAll = false;
      console.error(`  [FAIL] ${label}`);
    }
  }

  try {
    let connected = false;
    let targets = null;
    for (let i = 0; i < 30; i++) {
      try {
        targets = await getJson('http://127.0.0.1:9260/json/list');
        if (targets && targets.length > 0) {
          connected = true;
          break;
        }
      } catch (e) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    if (!connected) throw new Error('Could not connect to Chrome on port 9260');

    const pageTarget = targets.find((t) => t.type === 'page' && t.url.includes('index.html')) || targets.find((t) => t.type === 'page');
    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('DOM.enable');

    // Wait for document to be fully loaded
    for (let i = 0; i < 40; i++) {
      const ready = await client.eval(`document.readyState === 'complete' && !!document.getElementById('main-hero-banner') && !!document.getElementById('hero-live-hora-card')`);
      if (ready) break;
      await new Promise(r => setTimeout(r, 100));
    }
    await new Promise(r => setTimeout(r, 500));

    for (const vp of TEST_VIEWPORTS) {
      console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})...`);
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: true
      });
      await new Promise(r => setTimeout(r, 250));

      const m = await client.eval(`
        (function() {
          const header = document.querySelector('.main-navbar');
          const brandTitle = document.querySelector('.brand-title');
          const brandLogoWrap = document.querySelector('.brand-logo-wrap');
          const langToggle = document.getElementById('global-lang-btn');
          const walletChip = document.querySelector('.wallet-chip');
          const authBtn = document.getElementById('auth-state-btn');
          const hero = document.getElementById('main-hero-banner');
          const heroTextCol = document.querySelector('.cosmic-hero-text-col');
          const heroActions = document.querySelector('.cosmic-hero-actions');
          const heroHora = document.getElementById('hero-live-hora-card');
          const blueprint = document.getElementById('overview-active-chart-card');

          const getR = el => el ? el.getBoundingClientRect() : null;
          const br = getR(brandTitle);
          const lr = getR(langToggle);
          const hr = getR(hero);
          const tr = getR(heroTextCol);
          const ar = getR(heroActions);
          const cr = getR(heroHora);
          const bpr = getR(blueprint);

          return {
            brandRight: br ? br.right : null,
            langLeft: lr ? lr.left : null,
            brandVisible: brandTitle && window.getComputedStyle(brandTitle).display !== 'none',
            langVisible: langToggle && window.getComputedStyle(langToggle).display !== 'none',
            heroHeight: hr ? Math.round(hr.height) : null,
            heroTextColHeight: tr ? Math.round(tr.height) : null,
            heroHoraHeight: cr ? Math.round(cr.height) : null,
            crTop: cr ? Math.round(cr.top) : null,
            arBottom: ar ? Math.round(ar.bottom) : null,
            trBottom: tr ? Math.round(tr.bottom) : null,
            distanceButtonsToHora: (cr && ar) ? Math.round(cr.top - ar.bottom) : null,
            distanceHoraToBlueprint: (bpr && cr) ? Math.round(bpr.top - cr.bottom) : null,
            docScrollWidth: document.documentElement.scrollWidth,
            winWidth: window.innerWidth
          };
        })()
      `);

      // 1. Header collision check
      assert(
        `Brand title does not collide with language toggle (brand right: ${Math.round(m.brandRight)}px < lang left: ${Math.round(m.langLeft)}px, buffer: ${Math.round(m.langLeft - m.brandRight)}px)`,
        m.brandRight < m.langLeft
      );

      // 2. Zero horizontal overflow
      assert(
        `Document scrollWidth <= innerWidth (${m.docScrollWidth}px <= ${m.winWidth}px)`,
        m.docScrollWidth <= m.winWidth + 1
      );

      // 3. Hero content-driven height (was 910px!)
      assert(
        `Hero banner total height <= 500px (got ${m.heroHeight}px, was 910px)`,
        m.heroHeight <= 500
      );

      // 4. Hero text column height (was 540px!)
      assert(
        `Hero text column height <= 290px (got ${m.heroTextColHeight}px, was 540px)`,
        m.heroTextColHeight <= 290
      );

      // 5. Gap between buttons and Solar Hora (was 307px!)
      assert(
        `Spacing from buttons to Solar Hora is between 8px and 28px (got ${m.distanceButtonsToHora}px [crTop: ${m.crTop}, arBottom: ${m.arBottom}, trBottom: ${m.trBottom}], was 307px)`,
        m.distanceButtonsToHora <= 28 && m.distanceButtonsToHora >= 8
      );

      // 6. Solar Hora card height (was 320px!)
      assert(
        `Solar Hora card height <= 180px (got ${m.heroHoraHeight}px, was 320px)`,
        m.heroHoraHeight <= 180
      );

      // 7. Spacing to Blueprint section
      assert(
        `Spacing from Solar Hora to Blueprint card is clean and proportionate (got ${m.distanceHoraToBlueprint}px)`,
        m.distanceHoraToBlueprint >= 16 && m.distanceHoraToBlueprint <= 50
      );
    }

    console.log('\n======================================================================');
    console.log(`SUMMARY: ${passCount}/${testCount} ASSERTIONS PASSED (${passedAll ? '100% SUCCESS' : 'FAILURES OCCURRED'})`);
    console.log('======================================================================\n');

    if (!passedAll) process.exit(1);

  } finally {
    chromeProc.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
