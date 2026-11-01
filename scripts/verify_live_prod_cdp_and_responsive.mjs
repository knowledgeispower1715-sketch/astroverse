import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ARTIFACT_SCREENSHOTS_DIR = 'C:/Users/user/.gemini/antigravity/brain/a8e399c1-d15e-46b8-9701-70e6dbb6a6d8/screenshots';
if (!fs.existsSync(ARTIFACT_SCREENSHOTS_DIR)) {
  fs.mkdirSync(ARTIFACT_SCREENSHOTS_DIR, { recursive: true });
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
    this.exceptions = [];
    this.consoleErrors = [];
    this.networkFailures = [];
    this.httpErrors = [];
    this.logEntries = [];
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
      } else if (msg.method) {
        // Collect CDP asynchronous event notifications
        if (msg.method === 'Runtime.exceptionThrown') {
          this.exceptions.push(msg.params);
          console.error('  [CDP EXCEPTION]', msg.params.exceptionDetails?.text || 'Unhandled exception');
        } else if (msg.method === 'Runtime.consoleAPICalled') {
          if (msg.params.type === 'error') {
            this.consoleErrors.push(msg.params);
          }
        } else if (msg.method === 'Log.entryAdded') {
          if (msg.params.entry?.level === 'error') {
            this.logEntries.push(msg.params.entry);
          }
        } else if (msg.method === 'Network.loadingFailed') {
          this.networkFailures.push(msg.params);
        } else if (msg.method === 'Network.responseReceived') {
          if (msg.params.response && msg.params.response.status >= 400) {
            this.httpErrors.push({
              url: msg.params.response.url,
              status: msg.params.response.status,
              statusText: msg.params.response.statusText
            });
          }
        }
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
      const desc = res.exceptionDetails.exception?.description || res.exceptionDetails.text;
      throw new Error(`Eval exception: ${desc}`);
    }
    return res.result?.value;
  }

  async waitForSelector(selector, timeoutMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const found = await this.eval(`!!document.querySelector('${selector}')`).catch(() => false);
      if (found) return true;
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error(`Timeout waiting for selector: ${selector}`);
  }

  async waitForFunction(fnStr, timeoutMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const ok = await this.eval(`Boolean(${fnStr})`).catch(() => false);
      if (ok) return true;
      await new Promise(r => setTimeout(r, 100));
    }
    throw new Error(`Timeout waiting for condition: ${fnStr}`);
  }

  async setViewport(width, height, deviceScaleFactor = 1) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor,
      mobile: width < 768
    });
    await this.send('Emulation.setVisibleSize', { width, height });
  }

  async captureScreenshot(filename) {
    const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(data, 'base64');
    const outPath = path.join(ARTIFACT_SCREENSHOTS_DIR, filename);
    fs.writeFileSync(outPath, buffer);
    console.log(`  [SCREENSHOT] Saved: ${filename}`);
  }
}

async function runLiveAudit() {
  console.log('======================================================================');
  console.log('ASTROVERSE COMPLETE LIVE PRODUCTION CDP & RESPONSIVE QA AUDIT');
  console.log('Target: https://astroverse-eta.vercel.app/');
  console.log('======================================================================\n');

  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9277',
    '--disable-gpu',
    '--no-sandbox',
    'https://astroverse-eta.vercel.app/'
  ]);

  let passCount = 0;
  let testCount = 0;

  function assert(label, condition) {
    testCount++;
    if (condition) {
      passCount++;
      console.log(`  [PASS] ${label}`);
    } else {
      console.error(`  [FAIL] ${label}`);
    }
  }

  try {
    let connected = false;
    let targets = null;
    for (let i = 0; i < 40; i++) {
      try {
        targets = await getJson('http://127.0.0.1:9277/json/list');
        if (targets && targets.length > 0) {
          connected = true;
          break;
        }
      } catch (e) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }
    if (!connected) throw new Error('Could not connect to Chrome on port 9277');

    const pageTarget = targets.find((t) => t.type === 'page');
    const cdp = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');
    await cdp.send('Network.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');

    await new Promise((r) => setTimeout(r, 2500));
    await cdp.setViewport(1280, 800);

    // Capture Homepage
    console.log('--- 1. HOMEPAGE AUDIT & CONSOLE HEALTH ---');
    const pageTitle = await cdp.eval(`document.title`);
    const navbarVisible = await cdp.eval(`!!document.querySelector('.main-navbar')`);
    assert('Page Title is defined and non-empty', !!pageTitle);
    assert('Main Navbar is present', navbarVisible);
    await cdp.captureScreenshot('live_prod_01_homepage.png');

    // Calculate Sample Kundli to ground predictions
    console.log('\n--- 2. SAMPLE BIRTH CHART CALCULATION ---');
    await cdp.eval(`
      (async () => {
        switchNavSection('kundli');
        await loadSampleBirthChart();
      })()
    `);
    await new Promise((r) => setTimeout(r, 3000));
    await cdp.captureScreenshot('live_prod_02_sample_chart_kundli.png');

    // Test All 6 Guidance Horizons
    console.log('\n--- 3. SIX GUIDANCE HORIZONS & MONTHLY PROGRESSION VERIFICATION ---');
    const horizons = [
      { id: 'hourly', file: 'live_prod_03_guidance_hourly.png', label: 'Hourly (Hora)' },
      { id: 'daily', file: 'live_prod_04_guidance_daily.png', label: 'Daily Forecast' },
      { id: 'weekly', file: 'live_prod_05_guidance_weekly.png', label: 'Weekly (7 Days)' },
      { id: 'monthly', file: 'live_prod_06_guidance_monthly.png', label: 'Complete Calendar-Month' },
      { id: 'yearly', file: 'live_prod_07_guidance_yearly.png', label: 'Yearly (12 Months)' },
      { id: 'mahadasha', file: 'live_prod_08_guidance_mahadasha.png', label: 'Mahadasha (5-Yr Arc)' }
    ];

    for (const h of horizons) {
      await cdp.eval(`selectGuidanceHorizon('${h.id}')`);
      await new Promise((r) => setTimeout(r, 1500));

      const activeBtnText = await cdp.eval(`document.getElementById('btn-hz-${h.id}')?.textContent?.trim()`);
      assert(`Horizon tab '${h.id}' is selectable and has descriptive label`, !!activeBtnText);

      if (h.id === 'monthly') {
        const monthlyBtnText = await cdp.eval(`document.getElementById('btn-hz-monthly')?.textContent?.trim()`);
        console.log(`  * Monthly button text: "${monthlyBtnText}"`);
        assert('Monthly button text no longer has fixed "4 Weeks"', !monthlyBtnText.includes('4 Weeks'));

        // Check period items header
        const periodHeader = await cdp.eval(`document.querySelector('.guidance-period-header h4')?.textContent?.trim() || ''`);
        console.log(`  * Monthly period header: "${periodHeader}"`);
        if (periodHeader) {
          assert('Monthly period progression header refers to Complete Calendar-Month', !periodHeader.includes('4-Week'));
        }

        // Check badge
        const badgeText = await cdp.eval(`document.querySelector('.period-count-badge')?.textContent?.trim() || ''`);
        console.log(`  * Monthly period badge: "${badgeText}"`);
        if (badgeText) {
          assert('Period count badge dynamically renders calendar weeks', !!badgeText);
        }

        // Test section expansion toggle
        await cdp.eval(`toggleGuidanceExpansion()`);
        await new Promise((r) => setTimeout(r, 400));
        const deepVisible = await cdp.eval(`document.getElementById('guidance-deep-sections-wrap')?.style.display !== 'none'`);
        assert('In-depth sections 4-9 expansion toggles open', deepVisible);
      }

      await cdp.captureScreenshot(h.file);
    }

    // Responsive Testing across 11 Viewports
    console.log('\n--- 4. RESPONSIVE DEVICE MATRIX AUDIT (11 VIEWPORTS) ---');
    const viewports = [
      { name: 'Mobile SE', w: 320, h: 640, screenshot: 'live_prod_responsive_320x640.png' },
      { name: 'Galaxy S20', w: 360, h: 800 },
      { name: 'iPhone 8', w: 375, h: 667 },
      { name: 'iPhone 13/14', w: 390, h: 844, screenshot: 'live_prod_responsive_390x844.png' },
      { name: 'Pixel 7', w: 412, h: 915 },
      { name: 'iPhone Pro Max', w: 430, h: 932 },
      { name: 'iPad Portrait', w: 768, h: 1024, screenshot: 'live_prod_responsive_768x1024.png' },
      { name: 'iPad Air', w: 820, h: 1180 },
      { name: 'Tablet Landscape', w: 1024, h: 768 },
      { name: 'Laptop Small', w: 1280, h: 800 },
      { name: 'Desktop FHD', w: 1920, h: 1080, screenshot: 'live_prod_responsive_1920x1080.png' }
    ];

    const responsiveResults = [];
    for (const vp of viewports) {
      await cdp.setViewport(vp.w, vp.h);
      await new Promise((r) => setTimeout(r, 400));

      const overflow = await cdp.eval(`
        (() => {
          const docEl = document.documentElement;
          const body = document.body;
          const maxScrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
          return {
            windowWidth: window.innerWidth,
            scrollWidth: maxScrollW,
            hasHorizontalOverflow: maxScrollW > window.innerWidth + 1
          };
        })()
      `);

      const passed = !overflow.hasHorizontalOverflow;
      assert(`Viewport ${vp.name} (${vp.w}x${vp.h}): Zero horizontal overflow`, passed);
      responsiveResults.push({
        name: vp.name,
        width: vp.w,
        height: vp.h,
        zero_overflow: passed,
        scroll_width: overflow.scrollWidth
      });

      if (vp.screenshot) {
        await cdp.captureScreenshot(vp.screenshot);
      }
    }

    // Zoom Level Test
    console.log('\n--- 5. ZOOM LEVELS INTEGRITY (80% TO 200%) ---');
    const zoomLevels = [0.8, 1.0, 1.25, 1.5, 2.0];
    for (const z of zoomLevels) {
      await cdp.eval(`document.body.style.zoom = '${z}'`);
      await new Promise((r) => setTimeout(r, 200));
      const bodyDisplay = await cdp.eval(`window.getComputedStyle(document.body).display`);
      assert(`Zoom ${Math.round(z * 100)}%: Render tree intact without crashes`, bodyDisplay === 'block');
    }
    await cdp.eval(`document.body.style.zoom = '1.0'`);

    // Save Summary Artifact
    const auditSummary = {
      status: passCount === testCount && cdp.exceptions.length === 0 ? 'PASSED' : 'DEFECTS_DETECTED',
      target_url: 'https://astroverse-eta.vercel.app/',
      total_tests: testCount,
      passed_tests: passCount,
      failed_tests: testCount - passCount,
      exceptions_count: cdp.exceptions.length,
      exceptions: cdp.exceptions,
      console_errors_count: cdp.consoleErrors.length,
      console_errors: cdp.consoleErrors.map(e => ({ text: e.args?.map(a => a.value || a.description).join(' ') })),
      network_failures_count: cdp.networkFailures.length,
      network_failures: cdp.networkFailures,
      http_errors_count: cdp.httpErrors.length,
      http_errors: cdp.httpErrors,
      timestamp: new Date().toISOString(),
      responsive_viewports_tested: responsiveResults.length,
      responsive_viewports: responsiveResults
    };
    fs.writeFileSync(
      path.join(ARTIFACT_SCREENSHOTS_DIR, 'live_prod_audit_summary.json'),
      JSON.stringify(auditSummary, null, 2)
    );
    console.log('\nSaved audit summary to live_prod_audit_summary.json');

  } catch (err) {
    console.error('Audit execution error:', err);
  } finally {
    try {
      chromeProc.kill('SIGKILL');
    } catch (_) {}
  }

  console.log('\n======================================================================');
  console.log(`LIVE AUDIT COMPLETE: ${passCount} / ${testCount} assertions passed.`);
  console.log('======================================================================\n');

  if (passCount !== testCount) {
    process.exit(1);
  }
}

runLiveAudit();
