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

async function runDiagnosis() {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9224',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    `file:///${indexPath}`
  ]);

  try {
    await new Promise((r) => setTimeout(r, 1200));
    const targets = await getJson('http://127.0.0.1:9224/json/list');
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    if (!pageTarget) throw new Error('No target page found');

    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('DOM.enable');

    console.log(`\n================= MOBILE & RESPONSIVE LAYOUT AUDIT =================\n`);

    for (const vp of VIEWPORTS) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: vp.width <= 768
      });

      // Allow reflow
      await new Promise((r) => setTimeout(r, 200));

      const evalRes = await client.send('Runtime.evaluate', {
        expression: `(() => {
          const docScroll = document.documentElement.scrollWidth;
          const docClient = document.documentElement.clientWidth;
          const bodyScroll = document.body.scrollWidth;
          const winInner = window.innerWidth;

          // Check overflowing elements
          const allEls = Array.from(document.querySelectorAll('*'));
          const overflowing = [];
          for (const el of allEls) {
            // Ignore script, style, head, modals that are hidden
            if (['SCRIPT', 'STYLE', 'HEAD', 'META', 'TITLE'].includes(el.tagName)) continue;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') continue;
            // Check if inside a horizontal scroll container
            let parent = el.parentElement;
            let inScroll = false;
            while (parent && parent !== document.body) {
              const ps = window.getComputedStyle(parent);
              if (['auto', 'scroll'].includes(ps.overflowX)) {
                inScroll = true;
                break;
              }
              parent = parent.parentElement;
            }
            if (inScroll) continue;

            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.right > winInner + 1) {
              overflowing.push({
                tag: el.tagName,
                id: el.id || '',
                className: (typeof el.className === 'string' ? el.className : '').slice(0, 40),
                width: Math.round(r.width),
                right: Math.round(r.right),
                overflowPx: Math.round(r.right - winInner)
              });
            }
          }

          // Check auth button
          const authBtn = document.getElementById('auth-state-btn');
          const authBtnRect = authBtn ? {
            visible: window.getComputedStyle(authBtn).display !== 'none',
            left: Math.round(authBtn.getBoundingClientRect().left),
            right: Math.round(authBtn.getBoundingClientRect().right),
            width: Math.round(authBtn.getBoundingClientRect().width),
            fitsInWindow: authBtn.getBoundingClientRect().right <= winInner
          } : null;

          // Check birth inputs
          const inputs = ['input-k-name', 'input-k-dob', 'input-k-tob-hh', 'input-k-tob-mm', 'input-k-city-search', 'btn-generate-kundli'].map(id => {
            const el = document.getElementById(id);
            if (!el) return { id, exists: false };
            const r = el.getBoundingClientRect();
            const cs = window.getComputedStyle(el);
            return {
              id,
              exists: true,
              fontSize: cs.fontSize,
              right: Math.round(r.right),
              fits: r.right <= winInner
            };
          });

          // Check AI Astrologer section existence
          const aiGate = document.getElementById('ai-personalization-gate');
          const aiQuery = document.getElementById('input-ai-user-query');
          const aiBox = document.getElementById('ai-response-box');
          const aiHeading = Array.from(document.querySelectorAll('h2, h3, h4')).find(h => h.textContent.includes('AI Astrologer Guru & Parashari Intelligence'));

          return {
            winInner,
            docScroll,
            docClient,
            bodyScroll,
            hasDocOverflow: docScroll > winInner,
            hasBodyOverflow: bodyScroll > winInner,
            authBtnRect,
            inputs,
            overflowingCount: overflowing.length,
            sampleOverflowing: overflowing.slice(0, 5),
            aiSectionPresent: !!(aiGate || aiQuery || aiBox || aiHeading)
          };
        })()`,
        returnByValue: true
      });

      const res = evalRes.result.value;
      console.log(`Viewport: ${vp.name} (${vp.width}x${vp.height})`);
      console.log(`  - docScroll: ${res.docScroll}px vs window: ${res.winInner}px (Overflow: ${res.hasDocOverflow ? 'YES' : 'NO'})`);
      console.log(`  - bodyScroll: ${res.bodyScroll}px (Overflow: ${res.hasBodyOverflow ? 'YES' : 'NO'})`);
      console.log(`  - Auth button fits: ${res.authBtnRect?.fitsInWindow} (Right edge: ${res.authBtnRect?.right}px / ${res.winInner}px, visible: ${res.authBtnRect?.visible})`);
      const nonFittingInputs = res.inputs.filter(i => !i.fits);
      console.log(`  - Birth inputs fitting: ${nonFittingInputs.length === 0 ? 'ALL FIT' : nonFittingInputs.map(i => i.id + ' right=' + i.right).join(', ')}`);
      const smallFontInputs = res.inputs.filter(i => i.fontSize && parseFloat(i.fontSize) < 16);
      console.log(`  - Birth input font-sizes >= 16px: ${smallFontInputs.length === 0 ? 'YES' : 'FAIL: ' + smallFontInputs.map(i => i.id + '=' + i.fontSize).join(', ')}`);
      console.log(`  - AI section present in DOM: ${res.aiSectionPresent}`);
      if (res.overflowingCount > 0) {
        console.log(`  - Total elements exceeding viewport width: ${res.overflowingCount}`);
        console.log(`  - Sample overflowing elements:`, res.sampleOverflowing);
      }
      console.log('----------------------------------------------------');
    }

    await client.close();
  } finally {
    chrome.kill();
  }
}

runDiagnosis().catch(err => {
  console.error('Diagnosis failed:', err);
  process.exit(1);
});
