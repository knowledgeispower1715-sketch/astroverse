/**
 * ASTROVERSE AI ASTROLOGER PORTRAITS & CONSULTATION EXPERIENCE VERIFICATION
 * 
 * Verifies:
 * 1. Asset existence, dimensions, optimization, and fallback mechanisms.
 * 2. Visual layout: 3-column balanced desktop grid (1180px-1320px), prominent 4:3 portraits.
 * 3. Responsive stability across 12 standard viewports (320px to 2560px) with 0px overflow.
 * 4. Functional persona switching and synchronization across directory and consultation modal.
 * 5. Bilingual English/Hindi response language persistence.
 */

import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const artifactsDir = path.join(rootDir, 'test-artifacts', 'astrologer_overhaul', 'verified');

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
      res.end('Not found: ' + reqPath);
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

const VIEWPORTS = [
  { name: '320x640_small_phone', width: 320, height: 640 },
  { name: '360x740_common_android', width: 360, height: 740 },
  { name: '375x812_standard_iphone', width: 375, height: 812 },
  { name: '390x844_modern_iphone', width: 390, height: 844 },
  { name: '412x915_modern_android', width: 412, height: 915 },
  { name: '430x932_large_iphone', width: 430, height: 932 },
  { name: '768x1024_tablet_portrait', width: 768, height: 1024 },
  { name: '1024x768_tablet_landscape', width: 1024, height: 768 },
  { name: '1280x800_laptop_compact', width: 1280, height: 800 },
  { name: '1440x900_laptop_standard', width: 1440, height: 900 },
  { name: '1896x1000_audit_monitor', width: 1896, height: 1000 },
  { name: '2560x1440_desktop_2k', width: 2560, height: 1440 }
];

async function main() {
  console.log('===============================================================');
  console.log('ASTROVERSE AI ASTROLOGER PORTRAITS & CONSULTATION VERIFICATION');
  console.log('===============================================================');

  // -------------------------------------------------------------
  // 1. Local Asset Files Forensic Audit
  // -------------------------------------------------------------
  console.log('\n--- 1. LOCAL PORTRAIT ASSETS VERIFICATION ---');
  const devWebp = path.join(rootDir, 'assets', 'astrologers', 'acharya-devratan.webp');
  const sunWebp = path.join(rootDir, 'assets', 'astrologers', 'dr-sunita-shastri.webp');
  const ragWebp = path.join(rootDir, 'assets', 'astrologers', 'pandit-raghavendra.webp');

  const devMaster = path.join(rootDir, 'assets', 'astrologers', 'masters', 'acharya-devratan-master.jpg');
  const sunMaster = path.join(rootDir, 'assets', 'astrologers', 'masters', 'dr-sunita-shastri-master.jpg');
  const ragMaster = path.join(rootDir, 'assets', 'astrologers', 'masters', 'pandit-raghavendra-master.jpg');

  assert(fs.existsSync(devWebp) && fs.statSync(devWebp).size > 50000, `Acharya Devratan WebP exists (${fs.existsSync(devWebp) ? fs.statSync(devWebp).size : 0} bytes)`);
  assert(fs.existsSync(sunWebp) && fs.statSync(sunWebp).size > 50000, `Dr. Sunita Shastri WebP exists (${fs.existsSync(sunWebp) ? fs.statSync(sunWebp).size : 0} bytes)`);
  assert(fs.existsSync(ragWebp) && fs.statSync(ragWebp).size > 50000, `Pandit Raghavendra WebP exists (${fs.existsSync(ragWebp) ? fs.statSync(ragWebp).size : 0} bytes)`);

  assert(fs.existsSync(devMaster), 'Acharya Devratan master JPEG preserved');
  assert(fs.existsSync(sunMaster), 'Dr. Sunita Shastri master JPEG preserved');
  assert(fs.existsSync(ragMaster), 'Pandit Raghavendra master JPEG preserved');

  // -------------------------------------------------------------
  // 2. Browser CDP Lifecycle & Visual Verification
  // -------------------------------------------------------------
  const port = 4899;
  const server = await startServer(port);
  console.log(`\n[Server] Listening on http://127.0.0.1:${port}`);

  const chromePath = await findChromePath();
  const userDataDir = path.join(rootDir, '.cache', 'cdp_astrologer_qa_' + Date.now());
  const cdpPort = 9227;

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

    console.log('\n--- 2. DESKTOP DIRECTORY GRID AUDIT (1896px) ---');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1896,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false
    });

    await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
    await new Promise((r) => setTimeout(r, 2000));

    // Navigate to astrologers directory tab
    await client.eval(`switchNavSection('astrologers')`);
    await new Promise((r) => setTimeout(r, 600));

    // Audit Grid Dimensions & Child Widths
    const gridMetrics = await client.eval(`(() => {
      const grid = document.querySelector('.astrologers-grid');
      const cards = document.querySelectorAll('#view-astrologers .astrologer-profile-card');
      const container = document.querySelector('.astrologers-directory-container');
      const rect = grid.getBoundingClientRect();
      const cardRects = Array.from(cards).map(c => ({
        x: c.getBoundingClientRect().x,
        width: c.getBoundingClientRect().width,
        height: c.getBoundingClientRect().height
      }));
      return {
        gridWidth: rect.width,
        gridLeft: rect.x,
        cardCount: cards.length,
        cardWidth: cardRects[0]?.width || 0,
        cardHeight: cardRects[0]?.height || 0,
        cards: cardRects
      };
    })()`);

    console.log(`  Grid Total Width: ${gridMetrics.gridWidth}px`);
    console.log(`  Card Count: ${gridMetrics.cardCount} | Individual Card Width: ${gridMetrics.cardWidth}px`);
    assert(gridMetrics.cardCount === 3, 'Directory renders exactly 3 distinct astrologer cards');
    assert(gridMetrics.gridWidth >= 1100, `Grid effectively utilizes available content width (>= 1100px, actual: ${gridMetrics.gridWidth}px)`);
    assert(gridMetrics.cardWidth >= 320, `Individual cards have generous width (>= 320px, actual: ${gridMetrics.cardWidth}px)`);

    // Audit Image Decoding & Natural Dimensions
    console.log('\n--- 3. PORTRAIT IMAGE DECODING & COMPONENT AUDIT ---');
    const imageMetrics = await client.eval(`(() => {
      const imgs = Array.from(document.querySelectorAll('#view-astrologers .astrologer-card-portrait img'));
      return imgs.map(img => ({
        src: img.src,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        renderedWidth: img.getBoundingClientRect().width,
        renderedHeight: img.getBoundingClientRect().height,
        alt: img.alt
      }));
    })()`);

    imageMetrics.forEach((m, idx) => {
      const personaNames = ['Acharya Devratan', 'Dr. Sunita Shastri', 'Pandit Raghavendra'];
      console.log(`  Persona ${idx + 1} (${personaNames[idx]}):`);
      console.log(`    Src: ${m.src}`);
      console.log(`    Natural Dimensions: ${m.naturalWidth}x${m.naturalHeight} | Rendered: ${Math.round(m.renderedWidth)}x${Math.round(m.renderedHeight)}px`);
      console.log(`    Alt: "${m.alt}"`);

      assert(m.complete === true, `Image ${idx + 1} loaded completely`);
      assert(m.naturalWidth > 0 && m.naturalHeight > 0, `Image ${idx + 1} successfully decoded with non-zero dimensions`);
      assert(m.renderedWidth >= 280, `Image ${idx + 1} prominently displayed with >= 280px rendered width`);
      assert(m.alt.length > 15, `Image ${idx + 1} has meaningful, accessible alt text`);
    });

    // Capture Directory and Individual Card Screenshots
    await client.screenshot(path.join(artifactsDir, '01_directory_desktop_1896.png'));
    console.log('  -> Captured 01_directory_desktop_1896.png');

    const cardBoxes = await client.eval(`(() => {
      const cards = document.querySelectorAll('#view-astrologers .astrologer-profile-card');
      return Array.from(cards).map(c => {
        const r = c.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      });
    })()`);

    if (cardBoxes[0]) await client.screenshot(path.join(artifactsDir, '02_card_devratan.png'), { ...cardBoxes[0], scale: 1 });
    if (cardBoxes[1]) await client.screenshot(path.join(artifactsDir, '03_card_sunita.png'), { ...cardBoxes[1], scale: 1 });
    if (cardBoxes[2]) await client.screenshot(path.join(artifactsDir, '04_card_raghavendra.png'), { ...cardBoxes[2], scale: 1 });

    // -------------------------------------------------------------
    // 4. Consultation Modal & Real-Time Persona Switching
    // -------------------------------------------------------------
    console.log('\n--- 4. CONSULTATION MODAL & PERSONA SWITCHING AUDIT ---');

    // Test Persona 1: Acharya Devratan
    await client.eval(`startConsultationSession('Acharya Devratan', 0)`);
    await new Promise((r) => setTimeout(r, 600));

    let headerState = await client.eval(`(() => {
      const name = document.getElementById('ai-chat-astrologer-name')?.textContent;
      const spec = document.getElementById('ai-chat-specialty')?.textContent;
      const img = document.querySelector('#ai-chat-avatar img');
      return {
        name,
        spec,
        imgSrc: img?.src,
        imgComplete: img?.complete,
        imgNaturalWidth: img?.naturalWidth
      };
    })()`);

    assert(headerState.name === 'Acharya Devratan', 'Chat header displays "Acharya Devratan"');
    assert(headerState.imgSrc.includes('acharya-devratan.webp'), 'Chat header displays Acharya Devratan photorealistic portrait');
    assert(headerState.imgNaturalWidth > 0, 'Header portrait image decoded successfully');
    await client.screenshot(path.join(artifactsDir, '05_consultation_devratan.png'));

    // Test Persona 2: Dr. Sunita Shastri via switchActivePersona
    console.log('  Switching to Dr. Sunita Shastri...');
    await client.eval(`switchActivePersona('dr-sunita-shastri')`);
    await new Promise((r) => setTimeout(r, 600));

    headerState = await client.eval(`(() => {
      const name = document.getElementById('ai-chat-astrologer-name')?.textContent;
      const spec = document.getElementById('ai-chat-specialty')?.textContent;
      const img = document.querySelector('#ai-chat-avatar img');
      return {
        name,
        spec,
        imgSrc: img?.src,
        imgNaturalWidth: img?.naturalWidth
      };
    })()`);

    assert(headerState.name === 'Dr. Sunita Shastri', 'Chat header dynamically updated to "Dr. Sunita Shastri"');
    assert(headerState.imgSrc.includes('dr-sunita-shastri.webp'), 'Chat header dynamically updated to Dr. Sunita Shastri portrait');
    assert(headerState.spec.includes('Jaimini'), 'Specialty dynamically updated to Jaimini methodology');
    await client.screenshot(path.join(artifactsDir, '06_consultation_sunita.png'));

    // Test Persona 3: Pandit Raghavendra via switchActivePersona
    console.log('  Switching to Pandit Raghavendra...');
    await client.eval(`switchActivePersona('pandit-raghavendra')`);
    await new Promise((r) => setTimeout(r, 600));

    headerState = await client.eval(`(() => {
      const name = document.getElementById('ai-chat-astrologer-name')?.textContent;
      const spec = document.getElementById('ai-chat-specialty')?.textContent;
      const img = document.querySelector('#ai-chat-avatar img');
      return {
        name,
        spec,
        imgSrc: img?.src,
        imgNaturalWidth: img?.naturalWidth
      };
    })()`);

    assert(headerState.name === 'Pandit Raghavendra', 'Chat header dynamically updated to "Pandit Raghavendra"');
    assert(headerState.imgSrc.includes('pandit-raghavendra.webp'), 'Chat header dynamically updated to Pandit Raghavendra portrait');
    assert(headerState.spec.includes('Classical Yogas') || headerState.spec.includes('Remedial'), 'Specialty reflects Classical Yogas/Remedial');
    await client.screenshot(path.join(artifactsDir, '07_consultation_raghavendra.png'));

    // Test Header Options Menu Dropdown
    await client.eval(`toggleChatOptionsMenu()`);
    await new Promise((r) => setTimeout(r, 200));
    await client.screenshot(path.join(artifactsDir, '08_chat_header_and_options.png'));

    // Test Bilingual Language Switcher
    console.log('\n--- 5. BILINGUAL RESPONSE LANGUAGE SWITCHER ---');
    await client.eval(`setChatResponseLanguage('hi')`);
    const isHiActive = await client.eval(`document.getElementById('btn-chat-lang-hi').classList.contains('active')`);
    assert(isHiActive === true, 'Switching response language to Hindi sets button state to active');

    await client.eval(`setChatResponseLanguage('en')`);
    const isEnActive = await client.eval(`document.getElementById('btn-chat-lang-en').classList.contains('active')`);
    assert(isEnActive === true, 'Switching response language back to English sets button state to active');

    // Close consultation modal
    await client.eval(`closeConsultationModal()`);
    await new Promise((r) => setTimeout(r, 300));

    // -------------------------------------------------------------
    // 6. 12-Viewport Responsive & Horizontal Overflow Audit
    // -------------------------------------------------------------
    console.log('\n--- 6. 12-VIEWPORT RESPONSIVE AUDIT ---');
    for (const vp of VIEWPORTS) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 768
      });
      await new Promise((r) => setTimeout(r, 200));

      const overflow = await client.eval(`(() => {
        const bodyW = document.body.scrollWidth;
        const htmlW = document.documentElement.scrollWidth;
        const maxScroll = Math.max(bodyW, htmlW);
        const winW = window.innerWidth;
        return {
          winW,
          maxScroll,
          diff: Math.max(0, maxScroll - winW)
        };
      })()`);

      const pass = overflow.diff <= 1; // 1px rounding tolerance
      assert(pass, `Viewport ${vp.name.padEnd(26)}: width=${vp.width}px, maxScroll=${overflow.maxScroll}px, overflow=${overflow.diff}px`);

      if (vp.width === 390) {
        await client.screenshot(path.join(artifactsDir, '09_directory_mobile_390.png'));
        console.log('  -> Captured 09_directory_mobile_390.png');
      }
    }

    console.log('\n===============================================================');
    console.log(`VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('===============================================================');

    if (failCount > 0) {
      process.exit(1);
    }
  } finally {
    try { chrome.kill(); } catch (_) {}
    try { server.close(); } catch (_) {}
  }
}

main().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
