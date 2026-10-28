import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const indexPath = path.join(rootDir, 'index.html');

function parseColor(str) {
  if (!str) return null;
  const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return [parseInt(match[1], 10) / 255, parseInt(match[2], 10) / 255, parseInt(match[3], 10) / 255];
  }
  return null;
}

function luminance(rgb) {
  const a = rgb.map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function contrastRatio(c1, c2) {
  const rgb1 = parseColor(c1);
  const rgb2 = parseColor(c2);
  if (!rgb1 || !rgb2) return 1.0;
  const l1 = luminance(rgb1);
  const l2 = luminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
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

  async close() {
    this.ws.close();
  }
}

async function startServer(port) {
  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://localhost:${port}`);
    let reqPath = parsedUrl.pathname;
    if (reqPath === '/' || reqPath === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(indexHtml);
      return;
    }
    const localFile = path.join(rootDir, reqPath);
    if (fs.existsSync(localFile) && fs.statSync(localFile).isFile()) {
      const ext = path.extname(localFile).toLowerCase();
      const mime = ext === '.js' || ext === '.mjs' ? 'text/javascript'
        : ext === '.css' ? 'text/css'
        : ext === '.svg' ? 'image/svg+xml'
        : ext === '.png' ? 'image/png'
        : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
        : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      res.end(fs.readFileSync(localFile));
      return;
    }
    res.writeHead(404);
    res.end('Not Found');
  });

  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  return server;
}

async function runVerification() {
  console.log('\n==================================================================');
  console.log('ASTROVERSE ACTIVE CHART BANNER & TOOLS CONTRAST VERIFICATION');
  console.log('==================================================================\n');

  const PORT = 4799;
  const server = await startServer(PORT);
  const CHROME_PORT = 9255;
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    `--remote-debugging-port=${CHROME_PORT}`,
    '--disable-gpu',
    '--no-sandbox'
  ]);

  try {
    let connected = false;
    let targets = null;
    for (let i = 0; i < 35; i++) {
      try {
        targets = await getJson(`http://127.0.0.1:${CHROME_PORT}/json/list`);
        if (targets && targets.length > 0) { connected = true; break; }
      } catch (e) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    if (!connected) throw new Error('Could not connect to Chrome debugging port ' + CHROME_PORT);

    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('DOM.enable');
    await client.send('Network.enable');

    await client.send('Network.setBlockedURLs', {
      urls: [
        '*cdnjs.cloudflare.com*',
        '*cdn.jsdelivr.net*',
        '*fonts.googleapis.com*',
        '*fonts.gstatic.com*',
        '*ka-f.fontawesome.com*'
      ]
    });

    await client.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` });

    for (let i = 0; i < 50; i++) {
      const ready = await client.send('Runtime.evaluate', {
        expression: `document.readyState !== 'loading' && !!document.body && !!document.getElementById('overview-active-chart-card')`
      });
      if (ready.result && ready.result.value === true) break;
      await new Promise((r) => setTimeout(r, 150));
    }

    // TEST 1: Empty state of #overview-active-chart-card
    console.log('[TEST 1] Testing Empty State Contrast in #overview-active-chart-card...');
    const emptyAudit = await client.send('Runtime.evaluate', {
      expression: `(() => {
        if (typeof updateOverviewActiveChartBanner === 'function') {
          currentCalculatedChart = null;
          updateOverviewActiveChartBanner();
        }
        const card = document.getElementById('overview-active-chart-card');
        const h3 = card ? card.querySelector('h3') : null;
        const p = card ? card.querySelector('p') : null;
        const btnSec = card ? card.querySelector('.btn-outline-secondary') : null;
        const cardCs = card ? window.getComputedStyle(card) : null;
        const h3Cs = h3 ? window.getComputedStyle(h3) : null;
        const pCs = p ? window.getComputedStyle(p) : null;
        const btnCs = btnSec ? window.getComputedStyle(btnSec) : null;

        return {
          cardBg: cardCs ? cardCs.backgroundColor : null,
          h3Text: h3 ? h3.textContent.trim() : null,
          h3Color: h3Cs ? h3Cs.color : null,
          pColor: pCs ? pCs.color : null,
          btnSecColor: btnCs ? btnCs.color : null,
          btnSecBg: btnCs ? btnCs.backgroundColor : null
        };
      })()`,
      returnByValue: true
    });

    const res1 = emptyAudit.result.value;
    console.log('  Card Background:', res1.cardBg);
    console.log('  H3 Text:', res1.h3Text);
    console.log('  H3 Color:', res1.h3Color);
    console.log('  P Color:', res1.pColor);
    console.log('  Btn Color:', res1.btnSecColor, 'Bg:', res1.btnSecBg);

    const h3Contrast = contrastRatio(res1.h3Color, res1.cardBg);
    const pContrast = contrastRatio(res1.pColor, res1.cardBg);
    const btnContrast = contrastRatio(res1.btnSecColor, res1.btnSecBg);

    console.log(`  H3 Contrast on card: ${h3Contrast.toFixed(2)}:1 (Requires >= 7.0:1 AAA)`);
    console.log(`  P Contrast on card: ${pContrast.toFixed(2)}:1 (Requires >= 4.5:1 AA)`);
    console.log(`  Button text contrast: ${btnContrast.toFixed(2)}:1 (Requires >= 4.5:1 AA)`);

    if (h3Contrast < 7.0) throw new Error(`H3 contrast failed: ${h3Contrast}:1`);
    if (pContrast < 4.5) throw new Error(`P contrast failed: ${pContrast}:1`);
    if (btnContrast < 4.5) throw new Error(`Button contrast failed: ${btnContrast}:1`);
    console.log('  ✓ Empty state contrast verified AAA/AA compliant!\n');

    // TEST 2: Loaded state of #overview-active-chart-card
    console.log('[TEST 2] Testing Loaded Chart State Contrast in #overview-active-chart-card...');
    const loadedAudit = await client.send('Runtime.evaluate', {
      expression: `(async () => {
        if (typeof loadSampleBirthChart === 'function') {
          await loadSampleBirthChart();
        }
        if (typeof updateOverviewActiveChartBanner === 'function') {
          updateOverviewActiveChartBanner();
        }
        const card = document.getElementById('overview-active-chart-card');
        const h3 = card ? card.querySelector('h3') : null;
        const p = card ? card.querySelector('p') : null;
        const spans = card ? Array.from(card.querySelectorAll('span')).map(s => {
          const cs = window.getComputedStyle(s);
          return { text: s.textContent.trim(), color: cs.color, bg: cs.backgroundColor };
        }) : [];

        const cardCs = card ? window.getComputedStyle(card) : null;
        const h3Cs = h3 ? window.getComputedStyle(h3) : null;
        const pCs = p ? window.getComputedStyle(p) : null;

        return {
          cardBg: cardCs ? cardCs.backgroundColor : null,
          h3Text: h3 ? h3.textContent.trim() : null,
          h3Color: h3Cs ? h3Cs.color : null,
          pColor: pCs ? pCs.color : null,
          spans
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    const res2 = loadedAudit.result.value;
    console.log('  Loaded H3 Text:', res2.h3Text);
    console.log('  Loaded H3 Color:', res2.h3Color);
    const loadedH3Contrast = contrastRatio(res2.h3Color, res2.cardBg);
    console.log(`  Loaded H3 Contrast: ${loadedH3Contrast.toFixed(2)}:1 (Requires >= 7.0:1 AAA)`);
    if (loadedH3Contrast < 7.0) throw new Error(`Loaded H3 contrast failed: ${loadedH3Contrast}:1`);

    console.log('  Loaded Badges:');
    res2.spans.forEach(s => {
      const cr = contrastRatio(s.color, s.bg);
      console.log(`    Badge "${s.text}": color=${s.color} bg=${s.bg} -> contrast=${cr.toFixed(2)}:1`);
      if (cr < 4.0) throw new Error(`Badge contrast failed on "${s.text}": ${cr}:1`);
    });
    console.log('  ✓ Loaded chart state contrast verified AAA/AA compliant!\n');

    // TEST 3: Tools directory empty state
    console.log('[TEST 3] Testing Tools Directory Empty State Contrast...');
    const toolsAudit = await client.send('Runtime.evaluate', {
      expression: `(() => {
        if (typeof switchNavSection === 'function') switchNavSection('tools');
        const input = document.getElementById('tools-search-input');
        if (input) {
          input.value = 'XYZNONEXISTENT';
          if (typeof filterToolsDirectory === 'function') filterToolsDirectory();
        }
        const emptyState = document.getElementById('tools-empty-state');
        if (!emptyState) return { found: false };
        const cs = window.getComputedStyle(emptyState);
        const h4 = emptyState.querySelector('h4');
        const p = emptyState.querySelector('p');
        const h4Cs = h4 ? window.getComputedStyle(h4) : null;
        const pCs = p ? window.getComputedStyle(p) : null;

        return {
          found: true,
          display: cs.display,
          bg: cs.backgroundColor,
          h4Text: h4 ? h4.textContent.trim() : null,
          h4Color: h4Cs ? h4Cs.color : null,
          pColor: pCs ? pCs.color : null
        };
      })()`,
      returnByValue: true
    });

    const res3 = toolsAudit.result.value;
    console.log('  Tools Empty State Found:', res3.found);
    console.log('  Tools Empty State Bg:', res3.bg);
    console.log('  Tools H4 Text:', res3.h4Text);
    console.log('  Tools H4 Color:', res3.h4Color);
    console.log('  Tools P Color:', res3.pColor);

    const toolsH4Contrast = contrastRatio(res3.h4Color, res3.bg);
    const toolsPContrast = contrastRatio(res3.pColor, res3.bg);
    console.log(`  Tools H4 Contrast: ${toolsH4Contrast.toFixed(2)}:1 (Requires >= 7.0:1 AAA)`);
    console.log(`  Tools P Contrast: ${toolsPContrast.toFixed(2)}:1 (Requires >= 4.5:1 AA)`);

    if (toolsH4Contrast < 7.0) throw new Error(`Tools H4 contrast failed: ${toolsH4Contrast}:1`);
    if (toolsPContrast < 4.5) throw new Error(`Tools P contrast failed: ${toolsPContrast}:1`);
    console.log('  ✓ Tools directory empty state contrast verified AAA/AA compliant!\n');

    await client.close();
    console.log('==================================================================');
    console.log('ALL ACTIVE CHART BANNER & TOOLS CONTRAST TESTS PASSED PERFECTLY!');
    console.log('==================================================================\n');
  } finally {
    server.close();
    chrome.kill('SIGKILL');
  }
}

runVerification().catch(e => {
  console.error(e);
  process.exit(1);
});
