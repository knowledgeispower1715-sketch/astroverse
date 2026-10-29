import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

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
      throw new Error(`Eval exception: ${res.exceptionDetails.text}`);
    }
    return res.result?.value;
  }
}

async function main() {
  console.log('======================================================================');
  console.log('ASTROVERSE PERSONALIZED GREETING & COMMAND CENTER VERIFICATION');
  console.log('======================================================================\n');

  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9262',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    `file:///${indexPath}`
  ]);

  let passedAll = true;
  let testCount = 0;
  let passCount = 0;

  function assert(label, condition) {
    testCount++;
    if (condition) {
      passCount++;
      console.log(`  [PASS] ${label}`);
    } else {
      passedAll = false;
      console.error(`  [FAIL] ${label}`);
    }
  }

  try {
    let connected = false;
    let targets = null;
    for (let i = 0; i < 30; i++) {
      try {
        targets = await getJson('http://127.0.0.1:9262/json/list');
        if (targets && targets.length > 0) {
          connected = true;
          break;
        }
      } catch (e) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    if (!connected) throw new Error('Could not connect to Chrome on port 9262');

    const pageTarget = targets.find((t) => t.type === 'page');
    const cdp = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');

    // Wait for DOMContentLoaded & shell init
    await new Promise((r) => setTimeout(r, 1200));

    console.log('--- TEST SUITE 1: Zero Mentions of Static Generic Fallbacks ---');
    const rawHtml = await cdp.eval(`document.body.innerHTML`);
    assert('No "Namaste, User" text in DOM', !rawHtml.includes('Namaste, User'));
    assert('No "No Chart Selected" text in DOM', !rawHtml.includes('No Chart Selected'));
    assert('Default avatar is sacred Om (ॐ)', await cdp.eval(`document.getElementById('auth-avatar-initial')?.textContent`) === 'ॐ');

    console.log('\n--- TEST SUITE 2: Dynamic Live Input Personalization ("Pooja Verma") ---');
    await cdp.eval(`
      const input = document.getElementById('input-k-name');
      input.value = 'Pooja Verma';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    `);
    await new Promise((r) => setTimeout(r, 200));

    const typedGreeting = await cdp.eval(`document.getElementById('auth-greeting-heading')?.textContent`);
    const typedAvatar = await cdp.eval(`document.getElementById('auth-avatar-initial')?.textContent`);
    const typedChip = await cdp.eval(`document.getElementById('auth-active-chart-name')?.textContent`);
    const typedDashVisible = await cdp.eval(`document.getElementById('overview-authenticated-dashboard')?.style.display`);

    assert('Heading reflects typed name "Namaste, Pooja Verma"', typedGreeting === 'Namaste, Pooja Verma');
    assert('Monogram computes authentic initials "PV"', typedAvatar === 'PV');
    assert('Active chip reflects draft profile "Draft Profile: Pooja Verma"', typedChip.includes('Pooja Verma'));
    assert('Overview command center is visible (block)', typedDashVisible === 'block');

    console.log('\n--- TEST SUITE 3: Full Natal Chart Calculation Personalization ("Anand Sharma") ---');
    await cdp.eval(`loadSampleBirthChart()`);
    await new Promise((r) => setTimeout(r, 1000));

    const chartGreeting = await cdp.eval(`document.getElementById('auth-greeting-heading')?.textContent`);
    const chartAvatar = await cdp.eval(`document.getElementById('auth-avatar-initial')?.textContent`);
    const chartLabel = await cdp.eval(`document.getElementById('auth-greeting-label')?.textContent`);
    const chartSub = await cdp.eval(`document.getElementById('auth-greeting-sub')?.textContent`);
    const chartChipName = await cdp.eval(`document.getElementById('auth-active-chart-name')?.textContent`);
    const chartBtnHtml = await cdp.eval(`document.getElementById('btn-auth-view-kundli')?.innerHTML`);
    const headerPill = await cdp.eval(`document.getElementById('header-profile-label')?.textContent`);

    assert('Greeting heading is "Namaste, Anand Sharma"', chartGreeting === 'Namaste, Anand Sharma');
    assert('Initials avatar is "AS"', chartAvatar === 'AS');
    assert('Greeting label is "Active Vedic Profile"', chartLabel === 'Active Vedic Profile');
    assert('Subtitle includes "Leo Lagna (H1)" and "Moon in Sagittarius"', chartSub.includes('Leo Lagna') && chartSub.includes('Moon in Sagittarius'));
    assert('Chip displays "Active Chart: Anand Sharma (Leo Lagna)"', chartChipName.includes('Anand Sharma') && chartChipName.includes('Leo Lagna'));
    assert('Button displays "View Full Kundli"', chartBtnHtml.includes('View Full Kundli'));
    assert('Header pill synchronized with Anand Sharma', headerPill.includes('Anand Sharma') && headerPill.includes('Leo Lagna'));

    console.log('\n--- TEST SUITE 4: Authenticated User Session ("Aryan") with Loaded Chart ---');
    // Set active session for user "Aryan" while chart is loaded (User's exact screenshot scenario!)
    await cdp.eval(`
      currentUserSession = {
        id: 'usr_test_aryan',
        name: 'Aryan',
        identifier: 'aryan@example.com',
        role: 'user'
      };
      updateUserSessionUI();
    `);
    await new Promise((r) => setTimeout(r, 200));

    const combinedGreeting = await cdp.eval(`document.getElementById('auth-greeting-heading')?.textContent`);
    const combinedAvatar = await cdp.eval(`document.getElementById('auth-avatar-initial')?.textContent`);
    const combinedChip = await cdp.eval(`document.getElementById('auth-active-chart-name')?.textContent`);
    const combinedAuthText = await cdp.eval(`document.getElementById('auth-btn-text')?.textContent`);

    assert('Top nav displays logged-in user "Aryan"', combinedAuthText === 'Aryan');
    assert('Active chart subject "Anand Sharma" honored in greeting', combinedGreeting === 'Namaste, Anand Sharma');
    assert('Avatar displays chart initials "AS"', combinedAvatar === 'AS');
    assert('Active chart chip displays "Active Chart: Anand Sharma (Leo Lagna)"', combinedChip.includes('Anand Sharma'));

    console.log('\n--- TEST SUITE 5: Authenticated User Session ("Aryan") with NO Chart ---');
    await cdp.eval(`
      currentCalculatedChart = null;
      document.getElementById('input-k-name').value = '';
      updateOverviewActiveChartBanner();
    `);
    await new Promise((r) => setTimeout(r, 200));

    const noChartGreeting = await cdp.eval(`document.getElementById('auth-greeting-heading')?.textContent`);
    const noChartAvatar = await cdp.eval(`document.getElementById('auth-avatar-initial')?.textContent`);
    const noChartLabel = await cdp.eval(`document.getElementById('auth-greeting-label')?.textContent`);
    const noChartChip = await cdp.eval(`document.getElementById('auth-active-chart-name')?.textContent`);
    const noChartBtn = await cdp.eval(`document.getElementById('btn-auth-view-kundli')?.innerHTML`);

    assert('Heading falls back to session name "Namaste, Aryan"', noChartGreeting === 'Namaste, Aryan');
    assert('Avatar displays session initial "AR"', noChartAvatar === 'AR');
    assert('Label displays "Welcome Back"', noChartLabel === 'Welcome Back');
    assert('Chip displays "No Natal Chart Loaded"', noChartChip === 'No Natal Chart Loaded');
    assert('Button displays "Calculate Free Kundli"', noChartBtn.includes('Calculate Free Kundli'));

    console.log('\n--- TEST SUITE 6: Multi-Viewport Responsive Layout & Overflow Audit ---');
    const viewports = [
      { name: 'Mobile 375px', width: 375, height: 667 },
      { name: 'Mobile 390px', width: 390, height: 844 },
      { name: 'Mobile 430px', width: 430, height: 932 },
      { name: 'Tablet 768px', width: 768, height: 1024 },
      { name: 'Desktop 1280px', width: 1280, height: 800 }
    ];

    for (const vp of viewports) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: vp.width < 768
      });
      await new Promise((r) => setTimeout(r, 100));

      const overflow = await cdp.eval(`document.documentElement.scrollWidth <= ${vp.width} + 1`);
      const cardRect = await cdp.eval(`
        (() => {
          const el = document.getElementById('overview-authenticated-dashboard');
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { width: r.width, visible: r.width > 0 && r.height > 0 };
        })()
      `);

      assert(`${vp.name}: Zero horizontal overflow (scrollWidth <= ${vp.width})`, overflow);
      assert(`${vp.name}: Command center properly rendered & visible`, cardRect && cardRect.visible && cardRect.width <= vp.width);
    }

  } catch (err) {
    console.error('Test execution error:', err);
    passedAll = false;
  } finally {
    try {
      chromeProc.kill('SIGKILL');
    } catch (_) {}
  }

  console.log('\n======================================================================');
  console.log(`RESULTS: ${passCount} / ${testCount} assertions passed.`);
  console.log('======================================================================\n');

  if (!passedAll || passCount !== testCount) {
    process.exit(1);
  }
}

main();
