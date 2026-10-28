import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const baselineDir = path.join(rootDir, 'test-artifacts', 'astrologer_overhaul', 'baseline');

if (!fs.existsSync(baselineDir)) {
  fs.mkdirSync(baselineDir, { recursive: true });
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
      throw new Error(res.exceptionDetails.text || JSON.stringify(res.exceptionDetails));
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

async function startServer(port = 4899) {
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.json': 'application/json'
  };

  const server = http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    const filePath = path.join(rootDir, reqPath);
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function main() {
  const port = 4899;
  const server = await startServer(port);
  console.log(`[1] Server listening on http://127.0.0.1:${port}`);

  const chromePath = await findChromePath();
  const userDataDir = path.join(rootDir, '.cache', 'cdp_baseline_' + Date.now());
  const cdpPort = 9226;

  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars'
  ]);

  await new Promise((r) => setTimeout(r, 1500));

  try {
    const targets = await getJson(`http://127.0.0.1:${cdpPort}/json`);
    const pageTarget = targets.find((t) => t.type === 'page');
    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('DOM.enable');

    // 1. Desktop baseline (1896x1000)
    console.log('[2] Capturing desktop 1896px baseline...');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1896,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false
    });

    await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
    await new Promise((r) => setTimeout(r, 2000));

    // Navigate to astrologers tab
    await client.eval(`switchNavSection('astrologers')`);
    await new Promise((r) => setTimeout(r, 600));

    // Screenshot 1: Full AI Astrologer directory view
    await client.screenshot(path.join(baselineDir, '01_directory_desktop_1896.png'));
    console.log('  -> Captured 01_directory_desktop_1896.png');

    // Screenshot 2: Acharya Devratan's card
    const devCardBox = await client.eval(`(() => {
      const cards = document.querySelectorAll('.astrologer-profile-card');
      if (!cards[0]) return null;
      const r = cards[0].getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    })()`);
    if (devCardBox) {
      await client.screenshot(path.join(baselineDir, '02_card_devratan.png'), { ...devCardBox, scale: 1 });
      console.log('  -> Captured 02_card_devratan.png');
    }

    // Screenshot 3: Dr. Sunita Shastri's card
    const sunitaCardBox = await client.eval(`(() => {
      const cards = document.querySelectorAll('.astrologer-profile-card');
      if (!cards[1]) return null;
      const r = cards[1].getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    })()`);
    if (sunitaCardBox) {
      await client.screenshot(path.join(baselineDir, '03_card_sunita.png'), { ...sunitaCardBox, scale: 1 });
      console.log('  -> Captured 03_card_sunita.png');
    }

    // Screenshot 4: Pandit Raghavendra's card
    const raghCardBox = await client.eval(`(() => {
      const cards = document.querySelectorAll('.astrologer-profile-card');
      if (!cards[2]) return null;
      const r = cards[2].getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    })()`);
    if (raghCardBox) {
      await client.screenshot(path.join(baselineDir, '04_card_raghavendra.png'), { ...raghCardBox, scale: 1 });
      console.log('  -> Captured 04_card_raghavendra.png');
    }

    // 5. Open Acharya Devratan Consultation
    console.log('[3] Opening Acharya Devratan consultation modal...');
    await client.eval(`startConsultationSession('Acharya Devratan', 0)`);
    await new Promise((r) => setTimeout(r, 600));
    await client.screenshot(path.join(baselineDir, '05_consultation_devratan.png'));
    console.log('  -> Captured 05_consultation_devratan.png');

    // Header & Language selector close-up
    const headerBox = await client.eval(`(() => {
      const hdr = document.querySelector('#modal-ai-consultation .modal-dialog-card > div:first-child');
      if (!hdr) return null;
      const r = hdr.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    })()`);
    if (headerBox) {
      await client.screenshot(path.join(baselineDir, '06_chat_header_and_lang.png'), { ...headerBox, scale: 1 });
      console.log('  -> Captured 06_chat_header_and_lang.png');
    }

    // Close and open Dr. Sunita Shastri
    await client.eval(`closeConsultationModal()`);
    await new Promise((r) => setTimeout(r, 300));
    await client.eval(`startConsultationSession('Dr. Sunita Shastri', 0)`);
    await new Promise((r) => setTimeout(r, 600));
    await client.screenshot(path.join(baselineDir, '07_consultation_sunita.png'));
    console.log('  -> Captured 07_consultation_sunita.png');

    // Close and open Pandit Raghavendra
    await client.eval(`closeConsultationModal()`);
    await new Promise((r) => setTimeout(r, 300));
    await client.eval(`startConsultationSession('Pandit Raghavendra', 0)`);
    await new Promise((r) => setTimeout(r, 600));
    await client.screenshot(path.join(baselineDir, '08_consultation_raghavendra.png'));
    console.log('  -> Captured 08_consultation_raghavendra.png');

    await client.eval(`closeConsultationModal()`);
    await new Promise((r) => setTimeout(r, 300));

    // 9. Mobile directory viewport (390x844)
    console.log('[4] Capturing mobile 390px baseline...');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise((r) => setTimeout(r, 500));
    await client.screenshot(path.join(baselineDir, '09_directory_mobile_390.png'));
    console.log('  -> Captured 09_directory_mobile_390.png');

    console.log('\n[SUCCESS] All 9 baseline screenshots captured in test-artifacts/astrologer_overhaul/baseline/');
  } finally {
    try { chrome.kill(); } catch (_) {}
    try { server.close(); } catch (_) {}
  }
}

main().catch((err) => {
  console.error('Fatal error capturing baseline:', err);
  process.exit(1);
});
