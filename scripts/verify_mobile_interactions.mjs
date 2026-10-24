import { spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

const VIEWPORTS = [
  { name: 'Small Phone', width: 320, height: 640 },
  { name: 'Common Android', width: 360, height: 740 },
  { name: 'Standard iPhone', width: 375, height: 812 },
  { name: 'Modern iPhone', width: 390, height: 844 },
  { name: 'Large iPhone', width: 430, height: 932 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Desktop', width: 1366, height: 768 }
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

async function runInteractiveVerification() {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9226',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    `file:///${indexPath}`
  ]);

  try {
    await new Promise((r) => setTimeout(r, 1200));
    const targets = await getJson('http://127.0.0.1:9226/json/list');
    const pageTarget = targets.find((t) => t.type === 'page' && t.url.includes('index.html')) || targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No target page found');

    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('DOM.enable');

    // Wait until scripts are ready
    for (let i = 0; i < 40; i++) {
      const readyCheck = await client.send('Runtime.evaluate', {
        expression: `typeof switchNavSection === 'function'`
      });
      if (readyCheck.result && readyCheck.result.value === true) {
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    console.log(`\n================= ASTROVERSE INTERACTION & WORKFLOW VERIFICATION =================\n`);

    for (const vp of VIEWPORTS) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: vp.width <= 768
      });
      await new Promise((r) => setTimeout(r, 250));

      console.log(`Testing Viewport: ${vp.name} (${vp.width}x${vp.height})`);

      // 1. Initial State Check
      const initial = await client.send('Runtime.evaluate', {
        expression: `(() => {
          return {
            winInner: window.innerWidth,
            docScroll: document.documentElement.scrollWidth,
            bodyScroll: document.body.scrollWidth,
            authBtnFits: document.getElementById('auth-state-btn').getBoundingClientRect().right <= window.innerWidth,
            aiSectionExists: !!document.getElementById('ai-personalization-gate') || !!document.getElementById('input-ai-user-query')
          };
        })()`,
        returnByValue: true
      });
      console.log(`  [1. Initial State] bodyScroll: ${initial.result.value.bodyScroll}px | Auth fits: ${initial.result.value.authBtnFits} | AI Section present: ${initial.result.value.aiSectionExists}`);

      // 2. Test Mobile Drawer (if mobile)
      if (vp.width <= 1100) {
        const drawerCheck = await client.send('Runtime.evaluate', {
          expression: `(() => {
            toggleMobileNavDrawer();
            const drawer = document.getElementById('mobile-nav-drawer');
            const isOpen = drawer.classList.contains('open');
            const drawerRight = drawer.getBoundingClientRect().right;
            closeMobileNavDrawer();
            return { isOpen, drawerRight, closed: !drawer.classList.contains('open') };
          })()`,
          returnByValue: true
        });
        console.log(`  [2. Mobile Drawer] Toggle open: ${drawerCheck.result.value.isOpen} | Drawer right: ${drawerCheck.result.value.drawerRight}px <= ${vp.width}px | Close: ${drawerCheck.result.value.closed}`);
      }

      // 3. Test Auth Modal Open & Fit
      const authModalCheck = await client.send('Runtime.evaluate', {
        expression: `(() => {
          openAuthModal();
          const modal = document.getElementById('modal-auth-dialog');
          const card = modal.querySelector('.auth-modal-card');
          const cardRect = card.getBoundingClientRect();
          const isVisible = window.getComputedStyle(modal).display !== 'none';
          const cardFits = cardRect.right <= window.innerWidth && cardRect.left >= 0;
          const otpInput = document.getElementById('modal-otp-phone');
          const otpFontSize = otpInput ? window.getComputedStyle(otpInput).fontSize : '';
          closeAuthModal();
          return {
            isVisible,
            cardLeft: Math.round(cardRect.left),
            cardRight: Math.round(cardRect.right),
            cardWidth: Math.round(cardRect.width),
            cardFits,
            otpFontSize
          };
        })()`,
        returnByValue: true
      });
      console.log(`  [3. Auth Modal] Visible: ${authModalCheck.result.value.isVisible} | Card width: ${authModalCheck.result.value.cardWidth}px [${authModalCheck.result.value.cardLeft}-${authModalCheck.result.value.cardRight}] fits: ${authModalCheck.result.value.cardFits} | OTP input font: ${authModalCheck.result.value.otpFontSize}`);

      // 4. Test Kundli Birth Form Calculation
      const kundliCalcCheck = await client.send('Runtime.evaluate', {
        expression: `(async () => {
          // Switch to Kundli tab
          switchNavSection('kundli');
          // Fill sample birth chart
          loadSampleBirthChart();
          await new Promise(r => setTimeout(r, 150));
          // Check result display
          const activeContent = document.getElementById('kundli-active-content');
          const isResultShown = activeContent && window.getComputedStyle(activeContent).display !== 'none';
          const bodyScrollAfterCalc = document.body.scrollWidth;
          const chartName = document.getElementById('header-profile-label')?.textContent || '';
          return {
            isResultShown,
            bodyScrollAfterCalc,
            chartName,
            overflowAfterCalc: bodyScrollAfterCalc > window.innerWidth
          };
        })()`,
        awaitPromise: true,
        returnByValue: true
      });
      console.log(`  [4. Kundli Calculation] Result Shown: ${kundliCalcCheck.result.value.isResultShown} | Profile: "${kundliCalcCheck.result.value.chartName.slice(0, 30)}..." | bodyScroll after calc: ${kundliCalcCheck.result.value.bodyScrollAfterCalc}px (Overflow: ${kundliCalcCheck.result.value.overflowAfterCalc ? 'YES' : 'NO'})`);

      // 5. Test Kundli Result Subtabs
      const subtabsCheck = await client.send('Runtime.evaluate', {
        expression: `(() => {
          const subtabs = ['d1', 'vargas', 'shadbala', 'ashtakavarga', 'dashas', 'yogas', 'upagrahas'];
          const maxScrolls = [];
          for (const st of subtabs) {
            switchKundliTab(st);
            maxScrolls.push({
              tab: st,
              bodyScroll: document.body.scrollWidth,
              overflow: document.body.scrollWidth > window.innerWidth
            });
          }
          // Reset to overview
          switchKundliTab('overview');
          return maxScrolls;
        })()`,
        returnByValue: true
      });
      const subtabOverflows = subtabsCheck.result.value.filter(s => s.overflow);
      console.log(`  [5. Subtabs 7/7 Toggled] Subtab Overflows: ${subtabOverflows.length === 0 ? 'NONE (ALL FIT)' : JSON.stringify(subtabOverflows)}`);

      console.log('----------------------------------------------------');
    }

    await client.close();
    console.log('\nAll Interactive Workflow Tests Completed Successfully!\n');
  } finally {
    chrome.kill();
  }
}

runInteractiveVerification().catch((err) => {
  console.error('Interactive verification failed:', err);
  process.exit(1);
});
