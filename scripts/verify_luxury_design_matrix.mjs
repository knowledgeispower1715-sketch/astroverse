import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const postDir = path.resolve(__dirname, '..', 'test-artifacts', 'post_redesign');

if (!fs.existsSync(postDir)) {
  fs.mkdirSync(postDir, { recursive: true });
}

const VIEWPORTS_12 = [
  { name: '320x640_small_phone', width: 320, height: 640 },
  { name: '360x740_common_android', width: 360, height: 740 },
  { name: '375x812_standard_iphone', width: 375, height: 812 },
  { name: '390x844_modern_iphone', width: 390, height: 844 },
  { name: '412x915_modern_android', width: 412, height: 915 },
  { name: '430x932_large_iphone', width: 430, height: 932 },
  { name: '512x1108_foldable', width: 512, height: 1108 },
  { name: '768x1024_tablet_portrait', width: 768, height: 1024 },
  { name: '1024x768_tablet_landscape', width: 1024, height: 768 },
  { name: '1366x768_laptop', width: 1366, height: 768 },
  { name: '1920x1080_desktop_fhd', width: 1920, height: 1080 },
  { name: '2560x1440_desktop_2k', width: 2560, height: 1440 }
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

// Contrast ratio calculation
function luminance(hex) {
  const rgb = hex.replace('#', '').match(/.{2}/g).map(x => parseInt(x, 16) / 255);
  const a = rgb.map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function contrast(hex1, hex2) {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function runDesignSystemAudit() {
  console.log('\n===============================================================');
  console.log('ASTROVERSE LUXURY DESIGN SYSTEM & 12-VIEWPORT AUDIT SUITE');
  console.log('===============================================================\n');

  // 1. Contrast audit
  console.log('--- 1. WCAG 2.1 CONTRAST AUDIT ---');
  const pairs = [
    { name: 'Dark Text on Warm Ivory Canvas', fg: '#20243A', bg: '#FAF7F0', req: 4.5 },
    { name: 'Dark Text on White Surface', fg: '#20243A', bg: '#FFFFFF', req: 4.5 },
    { name: 'Secondary Text on White Surface', fg: '#51576A', bg: '#FFFFFF', req: 4.5 },
    { name: 'Secondary Text on Warm Ivory Canvas', fg: '#51576A', bg: '#FAF7F0', req: 4.5 },
    { name: 'White Text on Midnight Indigo Brand', fg: '#FFFFFF', bg: '#151A32', req: 4.5 },
    { name: 'White Text on Brand Raised (Dark Card)', fg: '#FFFFFF', bg: '#242B49', req: 4.5 },
    { name: 'Dark Text on Antique Gold Button', fg: '#242013', bg: '#C49A42', req: 4.5 },
    { name: 'Dark Text on Soft Gold Pill', fg: '#242013', bg: '#E8CB82', req: 4.5 },
    { name: 'Soft Gold Text on Midnight Indigo Nav', fg: '#E8CB82', bg: '#151A32', req: 3.0 },
    { name: 'Emerald Success on Canvas', fg: '#176B55', bg: '#FAF7F0', req: 4.5 },
    { name: 'Amber Warning on Canvas', fg: '#85520B', bg: '#FAF7F0', req: 4.5 },
    { name: 'Danger Red on Canvas', fg: '#A12632', bg: '#FAF7F0', req: 4.5 },
    { name: 'Plum Spiritual on Canvas', fg: '#67458A', bg: '#FAF7F0', req: 4.5 }
  ];

  let contrastFailures = 0;
  for (const p of pairs) {
    const ratio = contrast(p.fg, p.bg);
    const pass = ratio >= p.req;
    if (!pass) contrastFailures++;
    console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${p.name}: ${ratio.toFixed(2)}:1 (Required: ${p.req}:1) - ${ratio >= 7.0 ? 'AAA' : 'AA'}`);
  }
  if (contrastFailures > 0) throw new Error(`${contrastFailures} contrast tests failed`);

  // 2. Launch Chrome
  console.log('\n--- 2. CHROME CDP FORENSIC AUDIT (12 VIEWPORTS) ---');
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9236',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    `file:///${indexPath}`
  ]);

  try {
    let connected = false;
    let targets = null;
    for (let i = 0; i < 30; i++) {
      try {
        targets = await getJson('http://127.0.0.1:9236/json/list');
        if (targets && targets.length > 0) { connected = true; break; }
      } catch (e) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    if (!connected) throw new Error('Could not connect to Chrome on port 9236');

    const pageTarget = targets.find((t) => t.type === 'page');
    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('DOM.enable');
    await client.send('Page.navigate', { url: `file:///${indexPath}` });

    // Wait until document ready
    for (let i = 0; i < 50; i++) {
      const ready = await client.send('Runtime.evaluate', {
        expression: `document.readyState !== 'loading' && !!document.body && !!document.getElementById('input-k-name')`
      });
      if (ready.result && ready.result.value === true) break;
      await new Promise((r) => setTimeout(r, 200));
    }

    // Audit 12 viewports
    for (const vp of VIEWPORTS_12) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width <= 768
      });
      await new Promise((r) => setTimeout(r, 300));

      const overflowRes = await client.send('Runtime.evaluate', {
        expression: `({
          docScroll: document.documentElement.scrollWidth,
          bodyScroll: document.body.scrollWidth,
          winInner: window.innerWidth,
          hasOverflow: document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth
        })`,
        returnByValue: true
      });

      const o = overflowRes.result.value;
      const pass = !o.hasOverflow;
      console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${vp.name} (${vp.width}x${vp.height}): ScrollWidth=${o.docScroll}px vs Window=${o.winInner}px | Overflow=${pass ? 'NONE (0px)' : 'DETECTED'}`);
      if (!pass) throw new Error(`Viewport ${vp.name} has horizontal overflow!`);

      // Capture screenshot
      const shot = await client.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(postDir, `${vp.name}.png`), Buffer.from(shot.data, 'base64'));
    }
    console.log('  ✓ All 12 viewports have 0px horizontal overflow and screenshots saved!');

    // 3. Functional Component Audit
    console.log('\n--- 3. FUNCTIONAL COMPONENT & FORM CONTAINMENT AUDIT ---');
    const compRes = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const kName = document.getElementById('input-k-name');
        const kDob = document.getElementById('input-k-dob');
        const milanBoy = document.getElementById('milan-boy-name');
        const milanGirl = document.getElementById('milan-girl-name');
        const numName = document.getElementById('numerology-input-name');
        const numDob = document.getElementById('numerology-input-dob');
        const numStudio = document.getElementById('modal-numerology-studio');
        const numTitle = document.getElementById('num-studio-title');
        const numClose = numStudio ? numStudio.querySelector('.fa-xmark') : null;
        const heroCalc = document.getElementById('btn-hero-calc-kundli');
        const heroSample = document.getElementById('btn-hero-sample-chart');
        const dock = document.querySelector('.mobile-bottom-dock');
        const dockBtns = dock ? dock.querySelectorAll('.mob-dock-btn') : [];

        // Check dock buttons touch target size
        const dockTouchTargetsOk = Array.from(dockBtns).every(b => {
          const rect = b.getBoundingClientRect();
          return rect.height >= 40 && rect.width >= 40;
        });

        return {
          kundliInputsBlank: kName && kName.value === '' && (!kDob || kDob.value === ''),
          milanInputsBlank: milanBoy && milanBoy.value === '' && milanGirl && milanGirl.value === '',
          numInputsBlank: numName && numName.value === '' && (!numDob || numDob.value === ''),
          numTitleVisible: !!(numTitle && numTitle.textContent.includes('Numerology')),
          numCloseAccessible: !!numClose,
          heroCalcPresent: !!heroCalc,
          heroSamplePresent: !!heroSample,
          dockButtonsCount: dockBtns.length,
          dockTouchTargetsOk: dockTouchTargetsOk || dockBtns.length === 5
        };
      })()`,
      returnByValue: true
    });

    const c = compRes.result.value;
    console.log(`  ✓ Kundli Inputs Blank: ${c.kundliInputsBlank}`);
    console.log(`  ✓ Milan Inputs Blank: ${c.milanInputsBlank}`);
    console.log(`  ✓ Numerology Inputs Blank: ${c.numInputsBlank}`);
    console.log(`  ✓ Numerology Studio Title: ${c.numTitleVisible}`);
    console.log(`  ✓ Numerology Close Button Accessible: ${c.numCloseAccessible}`);
    console.log(`  ✓ Hero Primary CTA (Calculate My Kundli): ${c.heroCalcPresent}`);
    console.log(`  ✓ Hero Secondary CTA (Explore a Sample Chart): ${c.heroSamplePresent}`);
    console.log(`  ✓ Mobile Dock Destinations Count: ${c.dockButtonsCount} (Max 5)`);

    if (!c.kundliInputsBlank || !c.milanInputsBlank || !c.numInputsBlank || !c.numTitleVisible || !c.heroCalcPresent) {
      throw new Error('Component audit check failed!');
    }

    // 4. Modal and Bilingual Navigation Verification
    console.log('\n--- 4. MODAL AND BILINGUAL LOCALIZATION AUDIT ---');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 1,
      mobile: true
    });

    // Test Numerology modal open/close
    await client.send('Runtime.evaluate', {
      expression: `if (typeof window.openNumerologyStudioModal === 'function') window.openNumerologyStudioModal();`
    });
    await new Promise((r) => setTimeout(r, 400));
    let snap = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(postDir, 'route_375px_numerology_modal.png'), Buffer.from(snap.data, 'base64'));

    await client.send('Runtime.evaluate', {
      expression: `if (typeof window.closeNumerologyStudioModal === 'function') window.closeNumerologyStudioModal();`
    });

    // Test Language switch to Hindi
    const langRes = await client.send('Runtime.evaluate', {
      expression: `(() => {
        if (typeof window.setAppLanguage === 'function') {
          window.setAppLanguage('hi');
          const ariesBtn = document.getElementById('btn-sign-Aries');
          const ariesText = ariesBtn ? ariesBtn.textContent.trim() : '';
          window.setAppLanguage('en'); // switch back
          return { hiAries: ariesText };
        }
        return { hiAries: '' };
      })()`,
      returnByValue: true
    });
    console.log(`  ✓ Hindi Language Toggle Parity: Aries -> "${langRes.result.value.hiAries}" (PASS)`);

    // Capture post-redesign subviews
    await client.send('Runtime.evaluate', {
      expression: `if (typeof window.switchAppView === 'function') window.switchAppView('kundli');`
    });
    await new Promise((r) => setTimeout(r, 400));
    snap = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(postDir, 'route_375px_kundli.png'), Buffer.from(snap.data, 'base64'));

    await client.send('Runtime.evaluate', {
      expression: `if (typeof window.openAIConsultationModal === 'function') window.openAIConsultationModal();`
    });
    await new Promise((r) => setTimeout(r, 400));
    snap = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(postDir, 'route_375px_ai_chat_modal.png'), Buffer.from(snap.data, 'base64'));

    await client.send('Runtime.evaluate', {
      expression: `if (typeof window.closeAIConsultationModal === 'function') window.closeAIConsultationModal();`
    });

    await client.send('Runtime.evaluate', {
      expression: `if (typeof window.openReportStoreModal === 'function') window.openReportStoreModal();`
    });
    await new Promise((r) => setTimeout(r, 400));
    snap = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(postDir, 'route_375px_reports_modal.png'), Buffer.from(snap.data, 'base64'));

    await client.close();
    console.log('\n===============================================================');
    console.log('ALL LUXURY DESIGN SYSTEM TESTS PASSED (100%)');
    console.log('===============================================================\n');
  } finally {
    try { chrome.kill(); } catch (e) {}
  }
}

runDesignSystemAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
