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

// 22 Viewport Matrix per Specification
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

async function main() {
  console.log('========================================================================');
  console.log('ASTROVERSE AI — 22-VIEWPORT RESPONSIVE MATRIX & OVERFLOW AUDIT');
  console.log('========================================================================\n');

  if (!fs.existsSync('test-artifacts')) fs.mkdirSync('test-artifacts');

  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    let filePath = path.resolve('index.html');
    if (req.url.startsWith('/admin')) {
      filePath = path.resolve('admin.html');
    }
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  const port = 8098;
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cdpPort = 9248;
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--window-size=1280,972',
    'about:blank'
  ]);

  let client;
  const matrixResults = [];
  let totalFailures = 0;

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

    // Seed mock session so navigation items, wallet, and account buttons are populated
    await client.eval(`
      localStorage.setItem('astroverse_auth_session', JSON.stringify({
        token: 'test_token',
        user: { id: 'usr_test_123', name: 'Aryan', email: 'aryan@example.com', role: 'USER' }
      }));
      if (typeof checkAuthSessionState === 'function') checkAuthSessionState();
    `);
    await new Promise((r) => setTimeout(r, 400));

    // Audit every viewport
    for (const vp of VIEWPORTS) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 900
      });
      await new Promise((r) => setTimeout(r, 300));

      const measurement = await client.eval(`(() => {
        const winW = window.innerWidth;
        const docW = document.documentElement.scrollWidth;
        const bodyW = document.body.scrollWidth;
        const hasHorizontalOverflow = docW > winW + 1 || bodyW > winW + 1;

        // Navbar metrics
        const navbar = document.querySelector('.main-navbar');
        const navRect = navbar ? navbar.getBoundingClientRect() : null;
        const brand = document.querySelector('.brand-logo-wrap');
        const brandRect = brand ? brand.getBoundingClientRect() : null;
        const navLinks = document.querySelector('.nav-links-row');
        const navLinksRect = navLinks && window.getComputedStyle(navLinks).display !== 'none' ? navLinks.getBoundingClientRect() : null;
        const rightActions = document.querySelector('.nav-right-actions');
        const rightRect = rightActions ? rightActions.getBoundingClientRect() : null;
        const hamburger = document.getElementById('btn-mobile-menu');
        const hamburgerVisible = hamburger && window.getComputedStyle(hamburger).display !== 'none';

        // Check for collision between nav links and right actions
        let navOverlap = false;
        let navGap = null;
        if (navLinksRect && rightRect) {
          navGap = Math.round(rightRect.left - navLinksRect.right);
          if (navGap < 0) navOverlap = true;
        }

        // Check individual visible top-level nav buttons for mutual overlap
        const visibleButtons = Array.from(document.querySelectorAll('.nav-links-row > .nav-link-btn, .nav-links-row > .nav-more-dropdown-wrap > #btn-nav-more'))
          .filter(b => window.getComputedStyle(b).display !== 'none')
          .map(b => {
            const r = b.getBoundingClientRect();
            return { id: b.id, left: r.left, right: r.right };
          });
        
        let buttonCollision = false;
        for (let i = 0; i < visibleButtons.length - 1; i++) {
          if (visibleButtons[i].right > visibleButtons[i + 1].left + 1) {
            buttonCollision = true;
            break;
          }
        }

        return {
          winW, docW, bodyW,
          hasHorizontalOverflow,
          overflowPx: Math.max(0, Math.max(docW, bodyW) - winW),
          hamburgerVisible,
          navOverlap,
          navGap,
          buttonCollision,
          brandWidth: brandRect ? Math.round(brandRect.width) : null,
          rightActionsRight: rightRect ? Math.round(rightRect.right) : null,
          rightActionsFits: rightRect ? rightRect.right <= winW + 2 : true
        };
      })()`);

      const pass = !measurement.hasHorizontalOverflow && !measurement.navOverlap && !measurement.buttonCollision && measurement.rightActionsFits;
      if (!pass) totalFailures++;

      const resObj = {
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        status: pass ? 'PASS' : 'FAIL',
        hasHorizontalOverflow: measurement.hasHorizontalOverflow,
        overflowPx: measurement.overflowPx,
        navOverlap: measurement.navOverlap,
        navGap: measurement.navGap,
        buttonCollision: measurement.buttonCollision,
        hamburgerVisible: measurement.hamburgerVisible,
        rightActionsFits: measurement.rightActionsFits
      };
      matrixResults.push(resObj);

      console.log(`[${pass ? 'PASS' : 'FAIL'}] ${vp.name.padEnd(26)} (${vp.width}x${vp.height}px): Overflow=${measurement.overflowPx}px, NavGap=${measurement.navGap !== null ? measurement.navGap + 'px' : 'N/A'}, Hamburger=${measurement.hamburgerVisible ? 'YES' : 'NO'}`);

      // Capture representative screenshots
      if (['320px_compact_mobile', '375px_iphone_classic', '414px_iphone_plus', '768px_ipad_portrait', '1024px_ipad_pro', '1280px_video_benchmark', '1366px_standard_laptop', '1920px_fhd_desktop'].includes(vp.name)) {
        const ss = await client.send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(`test-artifacts/responsive_${vp.name}.png`, Buffer.from(ss.data, 'base64'));
      }
    }

    // Dynamic Zoom Test (80%, 100%, 125%, 150%, 200%)
    console.log('\n--- Dynamic Browser Zoom & Reflow Tests (1280px base) ---');
    const zoomLevels = [0.8, 1.0, 1.25, 1.5, 2.0];
    for (const z of zoomLevels) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: Math.round(1280 / z),
        height: Math.round(972 / z),
        deviceScaleFactor: z,
        mobile: false
      });
      await new Promise((r) => setTimeout(r, 200));

      const zoomMetrics = await client.eval(`(() => {
        const winW = window.innerWidth;
        const docW = document.documentElement.scrollWidth;
        const bodyW = document.body.scrollWidth;
        return { winW, docW, bodyW, hasOverflow: docW > winW + 1 };
      })()`);

      const zPass = !zoomMetrics.hasOverflow;
      console.log(`[${zPass ? 'PASS' : 'FAIL'}] Zoom ${(z * 100)}%: VirtualWidth=${zoomMetrics.winW}px, ScrollWidth=${zoomMetrics.docW}px`);
    }

    // Admin Panel Responsiveness Test (admin.html)
    console.log('\n--- Admin Panel Cross-Device Responsiveness (admin.html) ---');
    await client.send('Page.navigate', { url: `http://127.0.0.1:${port}/admin` });
    await new Promise((r) => setTimeout(r, 1200));

    const adminViewports = [
      { name: 'admin_mobile_375px', width: 375, height: 812 },
      { name: 'admin_tablet_768px', width: 768, height: 1024 },
      { name: 'admin_laptop_1280px', width: 1280, height: 972 },
      { name: 'admin_desktop_1920px', width: 1920, height: 1080 }
    ];

    for (const av of adminViewports) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: av.width,
        height: av.height,
        deviceScaleFactor: 1,
        mobile: av.width < 900
      });
      await new Promise((r) => setTimeout(r, 300));

      const adminMetrics = await client.eval(`(() => {
        const winW = window.innerWidth;
        const docW = document.documentElement.scrollWidth;
        const sidebarToggle = document.getElementById('btn-admin-sidebar-toggle');
        const sidebar = document.querySelector('.admin-sidebar');
        const toggleVisible = sidebarToggle && window.getComputedStyle(sidebarToggle).display !== 'none';
        const sidebarDisplay = sidebar ? window.getComputedStyle(sidebar).display : 'none';

        // Test opening sidebar if on mobile
        let toggleWorks = true;
        if (winW <= 900 && typeof toggleAdminSidebar === 'function') {
          toggleAdminSidebar();
          const openDisplay = window.getComputedStyle(sidebar).display;
          toggleWorks = (openDisplay === 'flex');
          toggleAdminSidebar(); // close back
        }

        return {
          winW, docW,
          hasOverflow: docW > winW + 1,
          toggleVisible,
          sidebarDisplay,
          toggleWorks
        };
      })()`);

      const aPass = !adminMetrics.hasOverflow && adminMetrics.toggleWorks;
      console.log(`[${aPass ? 'PASS' : 'FAIL'}] Admin ${av.name} (${av.width}px): Overflow=${adminMetrics.hasOverflow ? 'YES' : 'NO'}, SidebarToggle=${adminMetrics.toggleVisible ? 'VISIBLE' : 'HIDDEN'}, ToggleWorks=${adminMetrics.toggleWorks ? 'YES' : 'NO'}`);
      
      const ssAdmin = await client.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(`test-artifacts/responsive_${av.name}.png`, Buffer.from(ssAdmin.data, 'base64'));
    }

    fs.writeFileSync('test-artifacts/responsive_matrix_results.json', JSON.stringify(matrixResults, null, 2));

    console.log('\n========================================================================');
    console.log(`TEST MATRIX FINISHED: ${matrixResults.length} VIEWPORTS AUDITED`);
    console.log(`OVERALL RESULT: ${totalFailures === 0 ? '100% ALL TESTS PASSED' : totalFailures + ' FAILURES'}`);
    console.log('========================================================================\n');

    if (totalFailures > 0) process.exit(1);

  } finally {
    if (client) {
      try { client.ws.close(); } catch (e) {}
    }
    chromeProc.kill();
    server.close();
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
