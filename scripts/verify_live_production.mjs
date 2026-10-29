import { spawn } from 'child_process';
import http from 'http';

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

async function runLiveVerification() {
  console.log('======================================================================');
  console.log('ASTROVERSE LIVE PRODUCTION DEPLOYMENT VERIFICATION (VERCEL)');
  console.log('URL: https://astroverse-eta.vercel.app/');
  console.log('======================================================================\n');

  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9265',
    '--disable-gpu',
    '--no-sandbox',
    'https://astroverse-eta.vercel.app/#/overview'
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
    for (let i = 0; i < 30; i++) {
      try {
        targets = await getJson('http://127.0.0.1:9265/json/list');
        if (targets && targets.length > 0) {
          connected = true;
          break;
        }
      } catch (e) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    if (!connected) throw new Error('Could not connect to Chrome on port 9265');

    const pageTarget = targets.find((t) => t.type === 'page');
    const cdp = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');

    await new Promise((r) => setTimeout(r, 2000));

    console.log('--- TEST SUITE 1: Public Homepage Experience (https://astroverse-eta.vercel.app/#/overview) ---');
    const overviewCheck = await cdp.eval(`
      (() => {
        const adminLogin = document.getElementById('view-admin-login');
        const adminDash = document.getElementById('view-admin');
        const footer = document.querySelector('.astro-main-footer');
        const navbar = document.querySelector('.main-navbar');
        return {
          adminLoginDisplay: adminLogin ? window.getComputedStyle(adminLogin).display : 'none',
          adminDashDisplay: adminDash ? window.getComputedStyle(adminDash).display : 'none',
          footerDisplay: footer ? window.getComputedStyle(footer).display : 'none',
          navbarDisplay: navbar ? window.getComputedStyle(navbar).display : 'none',
          bodyHasAdminMode: document.body.classList.contains('admin-mode')
        };
      })()
    `);

    assert('Public Overview: Admin login section is strictly hidden (display: none)', overviewCheck.adminLoginDisplay === 'none');
    assert('Public Overview: Admin dashboard section is strictly hidden (display: none)', overviewCheck.adminDashDisplay === 'none');
    assert('Public Overview: Public footer is visible', overviewCheck.footerDisplay !== 'none');
    assert('Public Overview: Public navbar is visible', overviewCheck.navbarDisplay !== 'none');
    assert('Public Overview: document.body does not have admin-mode class', !overviewCheck.bodyHasAdminMode);

    console.log('\n--- TEST SUITE 2: Transition to Dedicated Admin Login (/#/admin-login) ---');
    await cdp.eval(`window.location.hash = '#/admin-login'`);
    await new Promise((r) => setTimeout(r, 1000));

    const adminLoginCheck = await cdp.eval(`
      (() => {
        const adminLogin = document.getElementById('view-admin-login');
        const adminDash = document.getElementById('view-admin');
        const footer = document.querySelector('.astro-main-footer');
        const navbar = document.querySelector('.main-navbar');
        const dock = document.querySelector('.mob-bottom-dock');
        const emailInput = document.getElementById('admin-login-email');
        const pwdInput = document.getElementById('admin-login-password');
        return {
          adminLoginActive: adminLogin?.classList.contains('active'),
          adminLoginDisplay: adminLogin ? window.getComputedStyle(adminLogin).display : 'none',
          footerDisplay: footer ? window.getComputedStyle(footer).display : 'none',
          navbarDisplay: navbar ? window.getComputedStyle(navbar).display : 'none',
          dockDisplay: dock ? window.getComputedStyle(dock).display : 'none',
          bodyHasAdminMode: document.body.classList.contains('admin-mode'),
          emailPlaceholder: emailInput?.placeholder,
          pwdPlaceholder: pwdInput?.placeholder
        };
      })()
    `);

    assert('Admin Login Route: #view-admin-login is active', adminLoginCheck.adminLoginActive);
    assert('Admin Login Route: #view-admin-login is flex-rendered', adminLoginCheck.adminLoginDisplay === 'flex');
    assert('Admin Login Route: Customer public footer is strictly hidden (display: none)', adminLoginCheck.footerDisplay === 'none');
    assert('Admin Login Route: Customer navbar is strictly hidden (display: none)', adminLoginCheck.navbarDisplay === 'none');
    assert('Admin Login Route: Customer mobile dock is strictly hidden (display: none)', adminLoginCheck.dockDisplay === 'none');
    assert('Admin Login Route: document.body has admin-mode class active', adminLoginCheck.bodyHasAdminMode);
    assert('Admin Login Route: Email placeholder is descriptive', adminLoginCheck.emailPlaceholder === 'Enter administrator email');
    assert('Admin Login Route: Password placeholder is clean without misleading dots', adminLoginCheck.pwdPlaceholder === 'Enter administrator password');

    console.log('\n--- TEST SUITE 3: Transition Back to Public Homepage (/#/overview) ---');
    await cdp.eval(`switchNavSection('overview')`);
    await new Promise((r) => setTimeout(r, 500));

    const restoredCheck = await cdp.eval(`
      (() => {
        const adminLogin = document.getElementById('view-admin-login');
        const footer = document.querySelector('.astro-main-footer');
        const navbar = document.querySelector('.main-navbar');
        return {
          adminLoginDisplay: adminLogin ? window.getComputedStyle(adminLogin).display : 'none',
          footerDisplay: footer ? window.getComputedStyle(footer).display : 'none',
          navbarDisplay: navbar ? window.getComputedStyle(navbar).display : 'none',
          bodyHasAdminMode: document.body.classList.contains('admin-mode')
        };
      })()
    `);

    assert('Restored Homepage: Admin login section is immediately hidden (display: none)', restoredCheck.adminLoginDisplay === 'none');
    assert('Restored Homepage: Public footer is immediately restored', restoredCheck.footerDisplay !== 'none');
    assert('Restored Homepage: Public navbar is immediately restored', restoredCheck.navbarDisplay !== 'none');
    assert('Restored Homepage: admin-mode class removed from document.body', !restoredCheck.bodyHasAdminMode);

  } catch (err) {
    console.error('Live verification error:', err);
  } finally {
    try {
      chromeProc.kill('SIGKILL');
    } catch (_) {}
  }

  console.log('\n======================================================================');
  console.log(`LIVE VERCEL RESULTS: ${passCount} / ${testCount} assertions passed.`);
  console.log('======================================================================\n');

  if (passCount !== testCount) {
    process.exit(1);
  }
}

runLiveVerification();
