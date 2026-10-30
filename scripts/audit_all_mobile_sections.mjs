import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

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
      throw new Error(`Eval exception: ${res.exceptionDetails.text} (${JSON.stringify(res.exceptionDetails)})`);
    }
    return res.result?.value;
  }
}

const VIEWPORTS = [
  { name: 'iPhone SE / Small Phone', width: 320, height: 640 },
  { name: 'Common Android (Galaxy)', width: 360, height: 740 },
  { name: 'Standard iPhone (X/11/12/13 Mini)', width: 375, height: 812 },
  { name: 'Modern iPhone (12/13/14/15/16)', width: 390, height: 844 },
  { name: 'Pixel / Android Standard', width: 402, height: 874 },
  { name: 'iPhone Plus / Max Classic', width: 414, height: 896 },
  { name: 'iPhone Pro Max / Plus Modern', width: 430, height: 932 }
];

const SECTIONS = ['overview', 'kundli', 'horas', 'matchmaking', 'astrologers', 'horoscope', 'tools', 'dashboard'];
const MODALS = ['auth-modal', 'pricing-plans-modal', 'report-store-modal', 'wallet-modal'];

async function main() {
  console.log('======================================================================');
  console.log('ASTROVERSE DEEP FORENSIC MOBILE AUDIT ACROSS ALL SECTIONS & MODALS');
  console.log('======================================================================\n');

  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https: blob:; connect-src 'self' https://geocoding-api.open-meteo.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    const filePath = path.resolve('index.html');
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  const port = 8096;
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cdpPort = 9246;
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--window-size=1280,800',
    'about:blank'
  ]);

  let client;
  const findings = [];

  try {
    await new Promise((r) => setTimeout(r, 1200));
    const targets = await getJson(`http://127.0.0.1:${cdpPort}/json`);
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('DOM.enable');
    await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/` });
    await new Promise((r) => setTimeout(r, 1500));

    // Audit each viewport
    for (const vp of VIEWPORTS) {
      console.log(`\n>>> Testing Viewport: ${vp.name} (${vp.width}x${vp.height}px)`);
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: true
      });
      await new Promise((r) => setTimeout(r, 300));

      // 1. Audit Header & Navigation bar at this viewport
      const headerAudit = await client.eval(`(() => {
        const winW = window.innerWidth;
        const bodyW = document.body.scrollWidth;
        const docW = document.documentElement.scrollWidth;
        const brandLogo = document.querySelector('.brand-logo-wrap');
        const logoR = brandLogo ? brandLogo.getBoundingClientRect() : null;
        const authBtn = document.getElementById('auth-state-btn');
        const authR = authBtn ? authBtn.getBoundingClientRect() : null;
        const signupBtn = document.getElementById('nav-btn-signup');
        const signupR = signupBtn ? signupBtn.getBoundingClientRect() : null;
        const rightActions = document.querySelector('.nav-right-actions');
        const rightR = rightActions ? rightActions.getBoundingClientRect() : null;
        const promo = document.getElementById('top-promotional-banner');
        const promoR = promo ? promo.getBoundingClientRect() : null;

        return {
          winW, bodyW, docW,
          hasOverflow: bodyW > winW || docW > winW,
          overflowPx: Math.max(bodyW, docW) - winW,
          logoVisible: logoR && logoR.width > 0 && logoR.right <= winW,
          authVisible: authR && authR.width > 0 && authR.right <= winW,
          authRight: authR ? Math.round(authR.right) : null,
          signupVisible: signupR && signupR.width > 0,
          signupRight: signupR ? Math.round(signupR.right) : null,
          rightActionsRight: rightR ? Math.round(rightR.right) : null,
          promoHeight: promoR ? Math.round(promoR.height) : null
        };
      })()`);

      if (headerAudit.hasOverflow) {
        findings.push({
          viewport: vp.name,
          width: vp.width,
          component: 'Header / Navigation',
          defect: `Horizontal page overflow of ${headerAudit.overflowPx}px (body scrollWidth=${headerAudit.bodyW}px vs window=${headerAudit.winW}px).`,
          details: `nav-right-actions extends to ${headerAudit.rightActionsRight}px (overflows by ${headerAudit.rightActionsRight - headerAudit.winW}px). Sign Up button extends to ${headerAudit.signupRight}px.`,
          severity: 'CRITICAL'
        });
      }

      // 2. Audit each navigation section
      for (const sec of SECTIONS) {
        await client.eval(`switchNavSection('${sec}', false);`);
        await new Promise((r) => setTimeout(r, 200));

        const secAudit = await client.eval(`(() => {
          const winW = window.innerWidth;
          const bodyW = document.body.scrollWidth;
          const docW = document.documentElement.scrollWidth;
          const sectionEl = document.getElementById('section-${sec}') || document.querySelector('.section-${sec}');

          // Find specific overflowing child elements
          const all = document.querySelectorAll('#section-${sec} *');
          const offscreen = [];
          all.forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.right > winW + 2) {
              const cs = window.getComputedStyle(el);
              if (cs.display !== 'none' && cs.visibility !== 'hidden') {
                offscreen.push({ tag: el.tagName, id: el.id, cls: (el.className || '').toString().slice(0, 30), right: Math.round(r.right), width: Math.round(r.width) });
              }
            }
          });

          return {
            sec: '${sec}', bodyW, docW, winW,
            hasOverflow: bodyW > winW || docW > winW,
            overflowCount: offscreen.length,
            offscreenSample: offscreen.slice(0, 3)
          };
        })()`);

        if (secAudit.hasOverflow) {
          findings.push({
            viewport: vp.name,
            width: vp.width,
            component: `Section: ${sec}`,
            defect: `Horizontal overflow in section '${sec}': bodyScrollWidth=${secAudit.bodyW}px vs window=${secAudit.winW}px`,
            details: secAudit.offscreenSample,
            severity: 'HIGH'
          });
        }
      }

      // 3. Audit Modals at this viewport
      for (const modalId of MODALS) {
        const modalAudit = await client.eval(`(() => {
          const winW = window.innerWidth;
          const winH = window.innerHeight;
          const modal = document.getElementById('${modalId}');
          if (!modal) return { exists: false };

          // Temporarily show modal
          const prevDisplay = modal.style.display;
          modal.style.display = 'flex';
          const card = modal.querySelector('.auth-modal-card') || modal.querySelector('.report-store-card') || modal.querySelector('.astro-card') || modal.firstElementChild;
          const cardR = card ? card.getBoundingClientRect() : null;
          const closeBtn = modal.querySelector('.auth-modal-close') || modal.querySelector('.modal-close-btn') || modal.querySelector('button[onclick*="close"]');
          const closeR = closeBtn ? closeBtn.getBoundingClientRect() : null;

          const res = {
            exists: true,
            cardW: cardR ? Math.round(cardR.width) : null,
            cardFits: cardR ? cardR.right <= winW + 1 && cardR.left >= -1 : false,
            cardMaxW: cardR ? cardR.width : 0,
            closeVisible: closeR ? closeR.width > 0 && closeR.right <= winW && closeR.top >= 0 : false
          };
          modal.style.display = prevDisplay;
          return res;
        })()`);

        if (modalAudit.exists && !modalAudit.cardFits) {
          findings.push({
            viewport: vp.name,
            width: vp.width,
            component: `Modal: ${modalId}`,
            defect: `Modal card width (${modalAudit.cardW}px) exceeds or clips window (${vp.width}px)`,
            severity: 'HIGH'
          });
        }
      }
    }

    console.log('\n======================================================================');
    console.log(`FORENSIC AUDIT COMPLETE: ${findings.length} DEFECTS RECORDED`);
    console.log('======================================================================\n');
    console.log(JSON.stringify(findings, null, 2));

  } finally {
    if (client) {
      try { client.ws.close(); } catch (e) {}
    }
    chromeProc.kill('SIGKILL');
    server.close();
  }
}

main().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
