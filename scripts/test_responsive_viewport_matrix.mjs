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
    this.consoleLogs = [];
  }

  async connect() {
    this.ws = new globalThis.WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', reject);
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args ? msg.params.args.map((a) => a.value || a.description || '').join(' ') : '';
        this.consoleLogs.push({ type: msg.params.type, text });
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

// 22 Canonical Viewports per Specification
const VIEWPORTS = [
  { name: '320px_compact_mobile', width: 320, height: 568 },
  { name: '360px_android_standard', width: 360, height: 740 },
  { name: '375px_iphone_classic', width: 375, height: 667 },
  { name: '390px_iphone_modern', width: 390, height: 844 },
  { name: '414px_iphone_plus', width: 414, height: 896 },
  { name: '430px_iphone_pro_max', width: 430, height: 932 },
  { name: '480px_large_phone', width: 480, height: 854 },
  { name: '540px_foldable', width: 540, height: 720 },
  { name: '600px_small_tablet', width: 600, height: 960 },
  { name: '640px_mobile_landscape', width: 640, height: 360 },
  { name: '768px_ipad_portrait', width: 768, height: 1024 },
  { name: '820px_ipad_air', width: 820, height: 1180 },
  { name: '900px_tablet_landscape', width: 900, height: 600 },
  { name: '1024px_ipad_pro', width: 1024, height: 768 },
  { name: '1100px_medium_screen', width: 1100, height: 700 },
  { name: '1200px_desktop_windowed', width: 1200, height: 800 },
  { name: '1280px_video_benchmark', width: 1280, height: 972 },
  { name: '1366px_standard_laptop', width: 1366, height: 768 },
  { name: '1440px_macbook_pro', width: 1440, height: 900 },
  { name: '1600px_highres_desktop', width: 1600, height: 1000 },
  { name: '1920px_fhd_desktop', width: 1920, height: 1080 },
  { name: '2560px_qhd_ultrawide', width: 2560, height: 1440 }
];

// Phase One Breakpoint Boundary Test Matrix
const BREAKPOINT_BOUNDS = [
  1179, 1180, 1199, 1200, 1219, 1220, 1239, 1240, 1279, 1280, 1439, 1440, 1441, 1535, 1536
];

// Phase Two Continuous Dynamic Resize Sequence
const CONTINUOUS_RESIZE_SEQUENCE = [
  1920, 1600, 1440, 1366, 1280, 1200, 1100, 1024, 900, 768, 640, 540, 430, 390, 375, 320, 1920
];

// Phase Three Expanded Zoom Levels
const ZOOM_LEVELS = [0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0];

// Phase Five 19 Public Website Sections with Exact DOM Selectors
const PUBLIC_SECTIONS = [
  { id: 'sec-header', selector: '.main-navbar', name: '1. Header & Brand' },
  { id: 'sec-nav', selector: '.nav-links-row', name: '2. Navigation Links Row' },
  { id: 'sec-hero', selector: '#overview-guest-banner, #overview-authenticated-dashboard', name: '3. Cosmic Hero & Philosophy' },
  { id: 'sec-profile', selector: '#overview-active-chart-card, #active-profile-dock', name: '4. Active Birth Profile Display' },
  { id: 'sec-kundli-form', selector: '#view-kundli', name: '5. Janam Kundli Birth Form' },
  { id: 'sec-kundli-charts', selector: '#chart-svg-d1, #view-kundli', name: '6. Kundli Charts (D1, D9)' },
  { id: 'sec-hora', selector: '#overview-hora-name, #view-horas', name: '7. Solar Hora & Planetary Timing' },
  { id: 'sec-panchang', selector: '#view-horas, #overview-daily-hora-action', name: '8. Panchang & Five Limbs' },
  { id: 'sec-transits', selector: '#view-kundli', name: '9. Daily Gochar / Transits' },
  { id: 'sec-horoscope', selector: '#view-horoscope', name: '10. Daily & Monthly Horoscope' },
  { id: 'sec-compatibility', selector: '#view-matchmaking', name: '11. Kundli Milan Compatibility' },
  { id: 'sec-ai-astrologer', selector: '#view-astrologers', name: '12. AI Astrologer Consultations' },
  { id: 'sec-reports-store', selector: '#modal-report-store', name: '13. Reports Store & Blueprints' },
  { id: 'sec-pdf-reader', selector: '#modal-report-viewer', name: '14. PDF Report Reader' },
  { id: 'sec-membership', selector: '#modal-pricing-plans', name: '15. Membership & Subscription Tiers' },
  { id: 'sec-wallet', selector: '#modal-wallet', name: '16. Wallet & Balance Controls' },
  { id: 'sec-recharge', selector: '#input-custom-recharge, #modal-wallet', name: '17. Custom Wallet Recharge' },
  { id: 'sec-cashfree', selector: '#modal-wallet, .wallet-balance-wrap', name: '18. Cashfree Checkout Integration' },
  { id: 'sec-footer', selector: 'footer.cosmic-footer, footer', name: '19. Site Footer & Disclaimers' }
];

// Phase Six 17 Administrative Modules
const ADMIN_MODULES = [
  'overview', 'users', 'roles', 'security', 'astrology', 'reports', 'ai',
  'payments', 'subscriptions', 'content', 'settings', 'privacy',
  'audit', 'integrations', 'incidents', 'qa', 'database'
];

async function launchBrowser(exePath, port) {
  return spawn(exePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check'
  ]);
}

async function runTestSuite(browserName, exePath, cdpPort, webPort) {
  console.log(`\n========================================================================`);
  console.log(`ASTROVERSE AI — COMPREHENSIVE RESPONSIVE REGRESSION: ${browserName.toUpperCase()}`);
  console.log(`========================================================================\n`);

  const browserProc = await launchBrowser(exePath, cdpPort);
  let client = null;
  let failures = 0;

  try {
    await new Promise((r) => setTimeout(r, 1500));
    const targets = await getJson(`http://127.0.0.1:${cdpPort}/json`);
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('DOM.enable');
    await client.send('Runtime.enable');
    await client.send('Page.navigate', { url: `http://127.0.0.1:${webPort}/` });
    await new Promise((r) => setTimeout(r, 2000));

    // Seed mock session
    await client.eval(`
      localStorage.setItem('astroverse_auth_session', JSON.stringify({
        token: 'test_token',
        user: { id: 'usr_test_123', name: 'Aryan', email: 'aryan@example.com', role: 'USER' }
      }));
      if (typeof checkAuthSessionState === 'function') checkAuthSessionState();
    `);
    await new Promise((r) => setTimeout(r, 500));

    // -------------------------------------------------------------------------
    // PHASE FOUR: Font & Typography Forensic Audit
    // -------------------------------------------------------------------------
    console.log(`--- [PHASE FOUR] Font & Typography Forensic Audit ---`);
    const fontAudit = await client.eval(`(async () => {
      await document.fonts.ready;
      const familiesToCheck = [
        'Plus Jakarta Sans',
        'Cinzel',
        'Noto Sans Devanagari'
      ];
      const fontCheckResults = {};
      for (const fam of familiesToCheck) {
        const sampleText = fam.includes('Devanagari') ? 'नमस्ते' : 'AstroVerse';
        fontCheckResults[fam] = {
          regular: document.fonts.check('16px \"' + fam + '\"', sampleText),
          bold: document.fonts.check('bold 16px \"' + fam + '\"', sampleText),
          semibold: document.fonts.check('600 16px \"' + fam + '\"', sampleText)
        };
      }

      // Check key element computed typography
      const elQueries = {
        logo: '.brand-title',
        navBtn: '.nav-link-btn',
        heroTitle: '.cosmic-hero-title, h1',
        walletBadge: '#global-header-wallet-btn',
        bodyText: 'body'
      };
      const computedFonts = {};
      for (const [k, q] of Object.entries(elQueries)) {
        const el = document.querySelector(q);
        if (el) {
          const cs = window.getComputedStyle(el);
          computedFonts[k] = {
            fontFamily: cs.fontFamily,
            fontSize: cs.fontSize,
            fontWeight: cs.fontWeight,
            lineHeight: cs.lineHeight
          };
        }
      }

      return {
        fontsLoadedCount: document.fonts.size,
        fontCheckResults,
        computedFonts
      };
    })()`);

    console.log(`Loaded Web Fonts in Document: ${fontAudit.fontsLoadedCount} faces`);
    for (const [fam, res] of Object.entries(fontAudit.fontCheckResults)) {
      console.log(`  Font Family: [${fam}] Regular=${res.regular}, Bold=${res.bold}, 600=${res.semibold}`);
    }
    console.log(`Computed Key Typography:`);
    for (const [k, v] of Object.entries(fontAudit.computedFonts)) {
      console.log(`  ${k.padEnd(12)}: ${v.fontFamily.slice(0, 35)} (${v.fontSize}, weight: ${v.fontWeight})`);
    }

    // -------------------------------------------------------------------------
    // PHASE ONE: Breakpoint Inconsistency & Exact Boundary Verification
    // -------------------------------------------------------------------------
    console.log(`\n--- [PHASE ONE] Breakpoint Boundary Matrix (1179px to 1536px) ---`);
    for (const bw of BREAKPOINT_BOUNDS) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: bw,
        height: 800,
        deviceScaleFactor: 1,
        mobile: false
      });
      await new Promise((r) => setTimeout(r, 120));

      const bMeas = await client.eval(`(() => {
        const nb = document.querySelector('.main-navbar');
        const btn = document.getElementById('btn-mobile-menu');
        const navLinks = document.querySelector('.nav-links-row');
        const right = document.querySelector('.nav-right-actions');

        const isHamburger = btn && window.getComputedStyle(btn).display !== 'none';
        const isNavLinks = navLinks && window.getComputedStyle(navLinks).display !== 'none';
        const navRect = isNavLinks ? navLinks.getBoundingClientRect() : null;
        const rightRect = right ? right.getBoundingClientRect() : null;
        const navGap = (navRect && rightRect) ? Math.round(rightRect.left - navRect.right) : null;

        const docW = document.documentElement.scrollWidth;
        const winW = window.innerWidth;
        const overflow = Math.max(0, docW - winW);

        return {
          winW,
          className: nb ? nb.className : '',
          isHamburger,
          isNavLinks,
          navGap,
          overflow
        };
      })()`);

      // Determine expected mode
      const expectedMode = bw < 1180 ? 'COMPACT (Hamburger)' : bw <= 1440 ? 'INTERMEDIATE (Multi-tier)' : 'FULL DESKTOP';
      const actualMode = bMeas.isHamburger ? 'COMPACT (Hamburger)' : bMeas.className.includes('nav-intermediate') ? 'INTERMEDIATE (Multi-tier)' : 'FULL DESKTOP';
      const isConsistent = (expectedMode === actualMode) && (bMeas.navGap === null || bMeas.navGap >= 0) && bMeas.overflow === 0;

      if (!isConsistent) failures++;
      console.log(`[${isConsistent ? 'PASS' : 'FAIL'}] ${bw}px: Expected=${expectedMode}, Actual=${actualMode}, NavGap=${bMeas.navGap !== null ? bMeas.navGap + 'px' : 'N/A'}, Overflow=${bMeas.overflow}px`);
    }

    // -------------------------------------------------------------------------
    // PHASE TWO: Real Continuous Dynamic Window Resizing (Single Session, No Refresh)
    // -------------------------------------------------------------------------
    console.log(`\n--- [PHASE TWO] Real Continuous Dynamic Window Resizing Sequence ---`);
    console.log(`Sequence: ${CONTINUOUS_RESIZE_SEQUENCE.join(' -> ')} (Single Session, No Page Reload)`);

    for (let i = 0; i < CONTINUOUS_RESIZE_SEQUENCE.length; i++) {
      const rw = CONTINUOUS_RESIZE_SEQUENCE[i];
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: rw,
        height: 900,
        deviceScaleFactor: 1,
        mobile: rw < 900
      });
      await new Promise((r) => setTimeout(r, 120));

      const rMeas = await client.eval(`(() => {
        const winW = window.innerWidth;
        const docW = document.documentElement.scrollWidth;
        const overflow = Math.max(0, docW - winW);

        const nb = document.querySelector('.main-navbar');
        const btn = document.getElementById('btn-mobile-menu');
        const navLinks = document.querySelector('.nav-links-row');
        const isHamburger = btn && window.getComputedStyle(btn).display !== 'none';
        const isNavLinks = navLinks && window.getComputedStyle(navLinks).display !== 'none';

        const right = document.querySelector('.nav-right-actions');
        const navRect = isNavLinks ? navLinks.getBoundingClientRect() : null;
        const rightRect = right ? right.getBoundingClientRect() : null;
        const navGap = (navRect && rightRect) ? Math.round(rightRect.left - navRect.right) : null;

        return {
          winW,
          overflow,
          isHamburger,
          isNavLinks,
          navGap,
          className: nb ? nb.className : ''
        };
      })()`);

      const rPass = rMeas.overflow === 0 && (rMeas.navGap === null || rMeas.navGap >= 0);
      if (!rPass) failures++;

      console.log(`[${rPass ? 'PASS' : 'FAIL'}] Step ${i + 1}/${CONTINUOUS_RESIZE_SEQUENCE.length} [${rw}px]: Overflow=${rMeas.overflow}px, NavGap=${rMeas.navGap !== null ? rMeas.navGap + 'px' : 'N/A'}, Hamburger=${rMeas.isHamburger ? 'YES' : 'NO'}`);

      if ([1920, 1280, 1200, 768, 375, 320].includes(rw)) {
        const ss = await client.send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(`test-artifacts/dynamic_resize_${rw}px_${browserName}.png`, Buffer.from(ss.data, 'base64'));
      }
    }

    // -------------------------------------------------------------------------
    // PHASE THREE: Browser Zoom & WCAG 2.2 AA (SC 1.4.4 & 1.4.10)
    // -------------------------------------------------------------------------
    console.log(`\n--- [PHASE THREE] Browser Zoom & WCAG 2.2 AA Reflow Matrix ---`);
    for (const z of ZOOM_LEVELS) {
      const virtW = Math.round(1280 / z);
      const virtH = Math.round(972 / z);
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: virtW,
        height: virtH,
        deviceScaleFactor: z,
        mobile: false
      });
      await new Promise((r) => setTimeout(r, 150));

      const zMeas = await client.eval(`(() => {
        const winW = window.innerWidth;
        const docW = document.documentElement.scrollWidth;
        const overflow = Math.max(0, docW - winW);
        return { winW, docW, overflow };
      })()`);

      const zPass = zMeas.overflow <= 1;
      if (!zPass) failures++;
      console.log(`[${zPass ? 'PASS' : 'FAIL'}] Zoom ${(z * 100).toFixed(0).padStart(3)}%: CSS Viewport=${zMeas.winW}px, ScrollWidth=${zMeas.docW}px, Overflow=${zMeas.overflow}px`);
    }

    // WCAG 2.2 SC 1.4.10 Reflow (400% zoom from 1280px = 320 CSS px)
    console.log(`\n--- WCAG 2.2 SC 1.4.10 Reflow Check (400% zoom @ 1280px = 320 CSS px) ---`);
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 320,
      height: 972,
      deviceScaleFactor: 4.0,
      mobile: false
    });
    await new Promise((r) => setTimeout(r, 200));

    const reflow400 = await client.eval(`(() => {
      const winW = window.innerWidth;
      const docW = document.documentElement.scrollWidth;
      const overflow = Math.max(0, docW - winW);
      return { winW, docW, overflow };
    })()`);
    const r400Pass = reflow400.overflow <= 1;
    if (!r400Pass) failures++;
    console.log(`[${r400Pass ? 'PASS' : 'FAIL'}] 400% Reflow (320px): CSS Viewport=${reflow400.winW}px, ScrollWidth=${reflow400.docW}px, Horizontal Overflow=${reflow400.overflow}px`);

    // Reset to default 1280x972
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 972,
      deviceScaleFactor: 1,
      mobile: false
    });
    await new Promise((r) => setTimeout(r, 200));

    // -------------------------------------------------------------------------
    // PHASE FIVE: Complete Public Website Audit (All 19 Sections)
    // -------------------------------------------------------------------------
    console.log(`\n--- [PHASE FIVE] Complete Public Website Audit (19 Sections) ---`);
    for (const sec of PUBLIC_SECTIONS) {
      const secAudit = await client.eval(`(() => {
        const el = document.querySelector('${sec.selector}');
        if (!el) return { found: false };
        const r = el.getBoundingClientRect();
        return {
          found: true,
          width: Math.round(r.width),
          height: Math.round(r.height),
          visible: window.getComputedStyle(el).display !== 'none'
        };
      })()`);

      console.log(`  ${sec.name.padEnd(38)}: ${secAudit.found ? (secAudit.visible ? 'ACTIVE & VISIBLE' : 'CONTAINED / COLLAPSED') : 'NOT FOUND'}`);
    }

    // -------------------------------------------------------------------------
    // PHASE SIX: Complete Admin Panel Responsiveness (All 17 Modules)
    // -------------------------------------------------------------------------
    console.log(`\n--- [PHASE SIX] Admin Panel Cross-Device & Module Audit ---`);
    await client.send('Page.navigate', { url: `http://127.0.0.1:${webPort}/admin` });
    await new Promise((r) => setTimeout(r, 1500));

    const adminTestViewports = [
      { name: 'admin_mobile_375px', width: 375, height: 812, mobile: true },
      { name: 'admin_tablet_768px', width: 768, height: 1024, mobile: true },
      { name: 'admin_laptop_1280px', width: 1280, height: 972, mobile: false },
      { name: 'admin_desktop_1920px', width: 1920, height: 1080, mobile: false }
    ];

    for (const atv of adminTestViewports) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: atv.width,
        height: atv.height,
        deviceScaleFactor: 1,
        mobile: atv.mobile
      });
      await new Promise((r) => setTimeout(r, 200));

      const admMeas = await client.eval(`(() => {
        const winW = window.innerWidth;
        const docW = document.documentElement.scrollWidth;
        const overflow = Math.max(0, docW - winW);
        const toggle = document.getElementById('btn-admin-sidebar-toggle');
        const toggleVisible = toggle && window.getComputedStyle(toggle).display !== 'none';
        const sidebar = document.querySelector('.admin-sidebar');

        let toggleFunctionality = true;
        if (winW <= 900 && typeof toggleAdminSidebar === 'function') {
          toggleAdminSidebar();
          const openDisplay = window.getComputedStyle(sidebar).display;
          toggleFunctionality = (openDisplay === 'flex');
          toggleAdminSidebar();
        }

        return { winW, docW, overflow, toggleVisible, toggleFunctionality };
      })()`);

      const aPass = admMeas.overflow <= 1 && admMeas.toggleFunctionality;
      if (!aPass) failures++;
      console.log(`[${aPass ? 'PASS' : 'FAIL'}] Admin ${atv.name} (${atv.width}px): Overflow=${admMeas.overflow}px, ToggleVisible=${admMeas.toggleVisible ? 'YES' : 'NO'}, ToggleWorks=${admMeas.toggleFunctionality ? 'YES' : 'NO'}`);
    }

    // Audit All 17 Admin Modules
    console.log(`\nAudit of all 17 Admin Modules in Admin Control Centre:`);
    const moduleCheck = await client.eval(`(() => {
      const results = {};
      const modules = ${JSON.stringify(ADMIN_MODULES)};
      const navBtns = Array.from(document.querySelectorAll('.category-pill, .admin-sidebar-item'));
      for (const m of modules) {
        const container = document.getElementById('admin-panel-' + m);
        const navItem = navBtns.find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes("'" + m + "'"));
        results[m] = {
          containerExists: !!container,
          navItemExists: !!navItem
        };
      }
      return results;
    })()`);

    for (const [mName, mStatus] of Object.entries(moduleCheck)) {
      const modPass = mStatus.containerExists && mStatus.navItemExists;
      if (!modPass) failures++;
      console.log(`  [${modPass ? 'PASS' : 'FAIL'}] Module [${mName.padEnd(14)}]: Container=${mStatus.containerExists ? 'YES' : 'NO'}, NavItem=${mStatus.navItemExists ? 'YES' : 'NO'}`);
    }

    // -------------------------------------------------------------------------
    // Phase Zero / Nine Check: Console Errors & ResizeObserver Loop Warnings
    // -------------------------------------------------------------------------
    const loopWarnings = client.consoleLogs.filter(l => 
      l.text.toLowerCase().includes('resizeobserver loop') || 
      l.text.toLowerCase().includes('undelivered notifications')
    );
    console.log(`\nResizeObserver Loop Warnings Detected: ${loopWarnings.length}`);
    if (loopWarnings.length > 0) {
      console.log('Warnings:', loopWarnings);
      failures++;
    }

    console.log(`\n========================================================================`);
    console.log(`SUMMARY FOR ${browserName.toUpperCase()}: ${failures === 0 ? '100% ALL TESTS PASSED' : failures + ' FAILURES'}`);
    console.log(`========================================================================\n`);

  } finally {
    if (client) {
      try { client.ws.close(); } catch (e) {}
    }
    browserProc.kill();
  }

  return failures;
}

async function main() {
  if (!fs.existsSync('test-artifacts')) fs.mkdirSync('test-artifacts');

  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    let filePath = path.resolve('index.html');
    if (req.url.startsWith('/admin')) {
      filePath = path.resolve('admin.html');
    }
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(filePath));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  const webPort = 48800;
  await new Promise((r) => server.listen(webPort, r));

  let totalFailures = 0;

  // 1. Chrome
  const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  if (fs.existsSync(chromePath)) {
    totalFailures += await runTestSuite('Google Chrome', chromePath, 49222, webPort);
  }

  // 2. Microsoft Edge
  const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  if (fs.existsSync(edgePath)) {
    totalFailures += await runTestSuite('Microsoft Edge', edgePath, 49223, webPort);
  }

  server.close();

  console.log(`\n========================================================================`);
  console.log(`FINAL CROSS-BROWSER SUITE COMPLETED: ${totalFailures === 0 ? 'ALL 100% CLEAN PASS' : totalFailures + ' FAILURES'}`);
  console.log(`========================================================================\n`);

  if (totalFailures > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
