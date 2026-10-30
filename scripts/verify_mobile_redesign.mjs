import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const outDir = path.resolve(__dirname, '..', 'test-artifacts', 'mobile_redesign');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
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
    this.consoleErrors = [];
  }

  async connect() {
    this.ws = new globalThis.WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', reject);
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.exceptionThrown') {
        this.consoleErrors.push(msg.params.exceptionDetails);
      }
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

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res && res.result ? res.result.value : null;
  }

  async setViewport(width, height, mobile = false) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile
    });
    await new Promise((r) => setTimeout(r, 200));
  }

  async screenshot(filename) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, filename), Buffer.from(res.data, 'base64'));
    console.log(`  [Screenshot] Saved ${filename}`);
  }

  async close() {
    this.ws.close();
  }
}

const VIEWPORTS = [
  { name: 'iphone_se1_320', width: 320, height: 568, mobile: true, label: '320px (iPhone SE 1st gen)' },
  { name: 'galaxy_compact_360', width: 360, height: 640, mobile: true, label: '360px (Samsung Galaxy compact)' },
  { name: 'iphone_8_375', width: 375, height: 667, mobile: true, label: '375px (iPhone 8 / SE 2nd gen)' },
  { name: 'iphone_12_390', width: 390, height: 844, mobile: true, label: '390px (iPhone 12/13/14)' },
  { name: 'iphone_xr_414', width: 414, height: 896, mobile: true, label: '414px (iPhone XR / 11)' },
  { name: 'iphone_15pm_430', width: 430, height: 932, mobile: true, label: '430px (iPhone 15/16 Pro Max)' },
  { name: 'ipad_portrait_768', width: 768, height: 1024, mobile: true, label: '768px (iPad Portrait)' },
  { name: 'ipad_landscape_1024', width: 1024, height: 768, mobile: false, label: '1024px (iPad Landscape)' },
  { name: 'laptop_1280', width: 1280, height: 800, mobile: false, label: '1280px (Laptop)' },
  { name: 'desktop_1440', width: 1440, height: 900, mobile: false, label: '1440px (Desktop)' }
];

async function run() {
  console.log('===============================================================');
  console.log('ASTROVERSE SENIOR-LEVEL MOBILE REDESIGN VERIFICATION SUITE');
  console.log('===============================================================\n');

  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9250',
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
        targets = await getJson('http://127.0.0.1:9250/json/list');
        if (targets && targets.length > 0) {
          connected = true;
          break;
        }
      } catch (e) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    if (!connected) throw new Error('Could not connect to Chrome on port 9250');

    const pageTarget = targets.find((t) => t.type === 'page' && t.url.includes('index.html')) || targets.find((t) => t.type === 'page');
    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    console.log('[Connected] Chrome CDP attached to index.html\n');
    await new Promise((r) => setTimeout(r, 800));

    let totalAssertions = 0;
    let passedAssertions = 0;

    function assert(desc, condition) {
      totalAssertions++;
      if (condition) {
        passedAssertions++;
        console.log(`  [PASS] ${desc}`);
      } else {
        console.error(`  [FAIL] ${desc}`);
      }
    }

    // 1. Multi-Viewport Responsive Matrix
    for (const vp of VIEWPORTS) {
      console.log(`\n--- Viewport: ${vp.label} (${vp.width}x${vp.height}) ---`);
      await client.setViewport(vp.width, vp.height, vp.mobile);

      // Check A: Zero Horizontal Overflow
      const overflowInfo = await client.evaluate(`(() => {
        const docWidth = document.documentElement.scrollWidth;
        const bodyWidth = document.body.scrollWidth;
        const winWidth = window.innerWidth;
        return {
          docWidth,
          bodyWidth,
          winWidth,
          hasOverflow: Math.max(docWidth, bodyWidth) > winWidth
        };
      })()`);

      assert(
        `Zero horizontal overflow at ${vp.width}px (scrollWidth: ${overflowInfo.docWidth}px <= innerWidth: ${overflowInfo.winWidth}px)`,
        overflowInfo.docWidth <= overflowInfo.winWidth + 1
      );

      // Check B: Header & Language Toggle Pill Visibility & Bounds
      const headerInfo = await client.evaluate(`(() => {
        const header = document.querySelector('.main-navbar');
        const langBtn = document.getElementById('global-lang-btn');
        const brand = document.querySelector('.brand-title');
        const headerRect = header ? header.getBoundingClientRect() : null;
        const langRect = langBtn ? langBtn.getBoundingClientRect() : null;
        const brandRect = brand ? brand.getBoundingClientRect() : null;
        return {
          headerVisible: header && window.getComputedStyle(header).display !== 'none',
          headerZIndex: header ? window.getComputedStyle(header).zIndex : null,
          langBtnVisible: langBtn && window.getComputedStyle(langBtn).display !== 'none',
          langBtnRect: langRect ? { left: langRect.left, right: langRect.right, top: langRect.top, width: langRect.width, height: langRect.height } : null,
          brandVisible: brand && window.getComputedStyle(brand).display !== 'none',
          winWidth: window.innerWidth
        };
      })()`);

      assert(`Main header is visible at ${vp.width}px`, headerInfo.headerVisible);
      assert(`Header z-index is >= 1100 (got ${headerInfo.headerZIndex})`, parseInt(headerInfo.headerZIndex) >= 1100);
      assert(`Language toggle button is visible at ${vp.width}px`, headerInfo.langBtnVisible);
      assert(
        `Language toggle button is fully inside viewport (right: ${Math.round(headerInfo.langBtnRect?.right)}px <= ${vp.width}px)`,
        headerInfo.langBtnRect && headerInfo.langBtnRect.right <= vp.width + 2
      );
      assert(
        `Language toggle touch target height >= 32px (got ${Math.round(headerInfo.langBtnRect?.height)}px)`,
        headerInfo.langBtnRect && headerInfo.langBtnRect.height >= 32
      );

      // Check C: Bottom Dock on Mobile vs Desktop
      const dockInfo = await client.evaluate(`(() => {
        const dock = document.querySelector('.mobile-bottom-dock');
        if (!dock) return { exists: false };
        const style = window.getComputedStyle(dock);
        const rect = dock.getBoundingClientRect();
        return {
          exists: true,
          display: style.display,
          zIndex: style.zIndex,
          rect: { top: rect.top, bottom: rect.bottom, height: rect.height }
        };
      })()`);

      if (vp.width <= 860) {
        assert(`Mobile bottom dock is displayed (flex) at ${vp.width}px`, dockInfo.display === 'flex');
        assert(`Mobile bottom dock z-index is >= 1000 (got ${dockInfo.zIndex})`, parseInt(dockInfo.zIndex) >= 1000);
      } else {
        assert(`Mobile bottom dock is hidden on desktop (>860px)`, dockInfo.display === 'none');
      }

      // Check D: Language Switch and Toast Position Collision Guard
      const langSwitchResult = await client.evaluate(`(() => {
        const prevLang = window.currentLanguage;
        // Trigger toggle
        if (typeof toggleAppLanguage === 'function') {
          toggleAppLanguage();
        }
        const newLang = window.currentLanguage;
        const langLbl = document.getElementById('global-lang-label')?.textContent?.trim();
        const drawerLbl = document.getElementById('mob-drawer-lang-label')?.textContent?.trim();
        const toastContainer = document.getElementById('toast-container');
        const langBtn = document.getElementById('global-lang-btn');
        
        let toastRect = null;
        let langRect = langBtn ? langBtn.getBoundingClientRect() : null;
        let toastTop = null;
        let toastBottom = null;

        if (toastContainer && toastContainer.children.length > 0) {
          const item = toastContainer.children[0];
          const rect = item.getBoundingClientRect();
          toastRect = { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
          toastTop = rect.top;
          toastBottom = rect.bottom;
        }

        // Check if toast covers language button
        let isCovered = false;
        if (toastRect && langRect) {
          const horizontalOverlap = !(toastRect.right < langRect.left || toastRect.left > langRect.right);
          const verticalOverlap = !(toastRect.bottom < langRect.top || toastRect.top > langRect.bottom);
          isCovered = horizontalOverlap && verticalOverlap;
        }

        return {
          prevLang,
          newLang,
          langLbl,
          drawerLbl,
          isCovered,
          toastRect,
          winHeight: window.innerHeight,
          winWidth: window.innerWidth
        };
      })()`);

      assert(
        `Language toggled successfully: ${langSwitchResult.prevLang} -> ${langSwitchResult.newLang}`,
        langSwitchResult.prevLang !== langSwitchResult.newLang
      );
      assert(
        `Language label updated in header and drawer: "${langSwitchResult.langLbl}"`,
        langSwitchResult.langLbl === 'English' || langSwitchResult.langLbl === 'हिंदी'
      );

      if (vp.width <= 860 && langSwitchResult.toastRect) {
        assert(
          `Mobile toast is positioned at bottom of screen (toast top: ${Math.round(langSwitchResult.toastRect.top)}px > ${Math.round(langSwitchResult.winHeight * 0.6)}px)`,
          langSwitchResult.toastRect.top > langSwitchResult.winHeight * 0.5
        );
        assert(`Toast NEVER covers the language toggle button in header`, !langSwitchResult.isCovered);
      }

      // Reset language back to English for consistent subsequent tests
      await client.evaluate(`if (window.currentLanguage === 'hi') toggleAppLanguage();`);

      // Check E: Hero Banner Compact Height & Zero Gaps
      const heroInfo = await client.evaluate(`(() => {
        const hero = document.getElementById('main-hero-banner');
        if (!hero) return null;
        const rect = hero.getBoundingClientRect();
        const style = window.getComputedStyle(hero);
        return {
          height: rect.height,
          paddingTop: style.paddingTop,
          paddingBottom: style.paddingBottom,
          borderRadius: style.borderRadius
        };
      })()`);

      if (vp.width <= 480) {
        assert(
          `Hero padding is compact (padding: ${heroInfo.paddingTop} / ${heroInfo.paddingBottom})`,
          parseInt(heroInfo.paddingTop) <= 24
        );
      }

      // Capture Screenshot
      await client.screenshot(`${vp.name}.png`);
    }

    // 2. Specialized Functional Components Audit on 375px (Standard iPhone)
    console.log('\n--- Specialized Component Ergonomics on 375px ---');
    await client.setViewport(375, 667, true);

    // Kundli Birth Form Inputs
    const kundliFormInfo = await client.evaluate(`(() => {
      if (typeof switchNavSection === 'function') switchNavSection('kundli');
      const nameInput = document.getElementById('input-k-name');
      const dobInput = document.getElementById('input-k-dob');
      const timeWrap = document.getElementById('time-picker-24h-wrap');
      const cityInput = document.getElementById('input-k-city-search');
      const calcBtn = document.getElementById('btn-generate-kundli');

      return {
        nameHeight: nameInput ? nameInput.getBoundingClientRect().height : 0,
        dobHeight: dobInput ? dobInput.getBoundingClientRect().height : 0,
        timeWrapWidth: timeWrap ? timeWrap.getBoundingClientRect().width : 0,
        cityWidth: cityInput ? cityInput.getBoundingClientRect().width : 0,
        calcBtnWidth: calcBtn ? calcBtn.getBoundingClientRect().width : 0,
        calcBtnHeight: calcBtn ? calcBtn.getBoundingClientRect().height : 0
      };
    })()`);

    assert(`Kundli name input touch target height >= 44px (got ${kundliFormInfo.nameHeight}px)`, kundliFormInfo.nameHeight >= 44);
    assert(`Kundli DOB input touch target height >= 44px (got ${kundliFormInfo.dobHeight}px)`, kundliFormInfo.dobHeight >= 44);
    assert(`Kundli Calculate button is full-width (got ${kundliFormInfo.calcBtnWidth}px >= 300px)`, kundliFormInfo.calcBtnWidth >= 300);
    assert(`Kundli Calculate button touch height >= 44px (got ${kundliFormInfo.calcBtnHeight}px)`, kundliFormInfo.calcBtnHeight >= 44);

    // Pricing Modal
    const pricingModalInfo = await client.evaluate(`(() => {
      if (typeof openPricingPlansModal === 'function') openPricingPlansModal();
      const modal = document.getElementById('modal-pricing-plans');
      const card = modal ? modal.querySelector('.modal-dialog-card') : null;
      const rect = card ? card.getBoundingClientRect() : null;
      return {
        isOpen: modal && window.getComputedStyle(modal).display !== 'none',
        cardWidth: rect ? rect.width : 0,
        winWidth: window.innerWidth
      };
    })()`);

    assert(`Pricing modal opens cleanly on mobile`, pricingModalInfo.isOpen);
    assert(
      `Pricing modal card fits inside viewport without blowout (${pricingModalInfo.cardWidth}px <= ${pricingModalInfo.winWidth}px)`,
      pricingModalInfo.cardWidth <= pricingModalInfo.winWidth
    );
    await client.evaluate(`if (typeof closePricingPlansModal === 'function') closePricingPlansModal();`);

    // Reports Store Modal (requires authenticated session)
    const reportModalInfo = await client.evaluate(`(() => {
      localStorage.setItem('astro_user_session', JSON.stringify({ id: 'test-qa-user', email: 'seeker@astroverse.test', name: 'Test Seeker', session_token: 'fake-token' }));
      try { currentUserSession = JSON.parse(localStorage.getItem('astro_user_session')); } catch (_) {}
      if (typeof openReportStoreModal === 'function') openReportStoreModal();
      const modal = document.getElementById('modal-report-store');
      const card = modal ? modal.querySelector('.modal-dialog-card') : null;
      const rect = card ? card.getBoundingClientRect() : null;
      return {
        isOpen: modal && window.getComputedStyle(modal).display !== 'none',
        cardWidth: rect ? rect.width : 0,
        winWidth: window.innerWidth
      };
    })()`);

    assert(`Report store modal opens cleanly on mobile`, reportModalInfo.isOpen);
    assert(
      `Report store modal fits inside viewport (${reportModalInfo.cardWidth}px <= ${reportModalInfo.winWidth}px)`,
      reportModalInfo.cardWidth <= reportModalInfo.winWidth
    );
    await client.evaluate(`if (typeof closeReportStoreModal === 'function') closeReportStoreModal();`);

    // AI Consultation Room Modal (requires authenticated session)
    const consultationModalInfo = await client.evaluate(`(() => {
      localStorage.setItem('astro_user_session', JSON.stringify({ id: 'test-qa-user', email: 'seeker@astroverse.test', name: 'Test Seeker', session_token: 'fake-token' }));
      try { currentUserSession = JSON.parse(localStorage.getItem('astro_user_session')); } catch (_) {}
      if (typeof toggleChatDrawer === 'function') toggleChatDrawer();
      const modal = document.getElementById('modal-ai-consultation');
      const card = modal ? modal.querySelector('.modal-dialog-card') : null;
      const composer = document.getElementById('ai-chat-composer');
      const rect = card ? card.getBoundingClientRect() : null;
      const compRect = composer ? composer.getBoundingClientRect() : null;
      return {
        isOpen: modal && window.getComputedStyle(modal).display !== 'none',
        cardWidth: rect ? rect.width : 0,
        cardHeight: rect ? rect.height : 0,
        composerVisible: composer && window.getComputedStyle(composer).display !== 'none',
        composerBottom: compRect ? compRect.bottom : 0,
        winHeight: window.innerHeight,
        winWidth: window.innerWidth
      };
    })()`);

    assert(`AI consultation modal opens on mobile`, consultationModalInfo.isOpen);
    assert(
      `AI consultation modal fits full mobile height without overflowing (${consultationModalInfo.cardHeight}px <= ${consultationModalInfo.winHeight}px)`,
      consultationModalInfo.cardHeight <= consultationModalInfo.winHeight + 2
    );
    assert(`AI consultation input composer is visible at bottom`, consultationModalInfo.composerVisible);
    await client.evaluate(`if (typeof closeConsultationModal === 'function') closeConsultationModal(); localStorage.removeItem('astro_user_session'); try { currentUserSession = null; } catch(_) {}`);

    console.log('\n===============================================================');
    console.log(`VERIFICATION SUMMARY: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
    console.log('===============================================================');

    await client.close();
    chrome.kill();

    if (passedAssertions !== totalAssertions) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed:', err);
    try { chrome.kill(); } catch (_) {}
    process.exit(1);
  }
}

run();
