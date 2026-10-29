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
  console.log('ASTROVERSE ADMIN PORTAL SEPARATION & AUTHENTICATION AUDIT');
  console.log('======================================================================\n');

  const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9263',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    `file:///${indexPath}#/admin-login`
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
        targets = await getJson('http://127.0.0.1:9263/json/list');
        if (targets && targets.length > 0) {
          connected = true;
          break;
        }
      } catch (e) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    if (!connected) throw new Error('Could not connect to Chrome on port 9263');

    const pageTarget = targets.find((t) => t.type === 'page');
    const cdp = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');

    await new Promise((r) => setTimeout(r, 1200));

    console.log('--- TEST SUITE 1: Dedicated Administrator Login UI & Zero Google Auth ---');
    const adminLoginVisible = await cdp.eval(`
      (() => {
        const el = document.getElementById('view-admin-login');
        return el && el.classList.contains('active');
      })()
    `);
    assert('#view-admin-login is active on #/admin-login route', adminLoginVisible);

    const adminLoginHtml = await cdp.eval(`document.getElementById('view-admin-login')?.innerHTML || ''`);
    assert('Admin login card contains "AstroVerse Admin Portal"', adminLoginHtml.includes('AstroVerse Admin Portal'));
    assert('Admin login card contains Administrator Email field', await cdp.eval(`Boolean(document.getElementById('admin-login-email'))`));
    assert('Admin login card contains Password field', await cdp.eval(`Boolean(document.getElementById('admin-login-password'))`));
    assert('Admin login card contains Password toggle', await cdp.eval(`Boolean(document.getElementById('admin-pwd-toggle-icon'))`));
    assert('Admin login card contains Sign In button', await cdp.eval(`Boolean(document.getElementById('btn-admin-login-submit'))`));

    // CRITICAL REQUIREMENT: ZERO GOOGLE AUTH ON ADMIN LOGIN
    const googleButtonExists = await cdp.eval(`
      Boolean(document.querySelector('#view-admin-login button[onclick*="Google"], #view-admin-login .btn-google, #view-admin-login [id*="google"]'))
    `);
    assert('Admin login contains ZERO Google OAuth buttons', !googleButtonExists && !adminLoginHtml.includes('Continue with Google'));

    console.log('\n--- TEST SUITE 2: Customer Mobile Bottom Dock Hidden on Admin Pages ---');
    const dockDisplay = await cdp.eval(`
      (() => {
        const dock = document.querySelector('.mob-bottom-dock');
        return dock ? window.getComputedStyle(dock).display : 'none';
      })()
    `);
    assert('Customer bottom navigation dock is hidden on admin login', dockDisplay === 'none');

    console.log('\n--- TEST SUITE 3: Unauthorized Access Guard on /admin ---');
    // Clear any active session and attempt to navigate to #/admin
    await cdp.eval(`
      currentUserSession = null;
      currentSessionToken = null;
      switchNavSection('admin');
    `);
    await new Promise((r) => setTimeout(r, 200));

    const activeAfterAdminAttempt = await cdp.eval(`
      (() => {
        const adminSec = document.getElementById('view-admin');
        const loginSec = document.getElementById('view-admin-login');
        return {
          adminActive: adminSec?.classList.contains('active'),
          loginActive: loginSec?.classList.contains('active'),
          authModalOpen: document.getElementById('modal-auth')?.style.display === 'flex'
        };
      })()
    `);

    assert('Unauthenticated user cannot access #view-admin', !activeAfterAdminAttempt.adminActive);
    assert('Unauthenticated user redirected to #view-admin-login', activeAfterAdminAttempt.loginActive);
    assert('Customer login modal (#modal-auth) is NEVER opened for admin route', !activeAfterAdminAttempt.authModalOpen);

    console.log('\n--- TEST SUITE 4: Role-Based Denial for Ordinary Customer ---');
    await cdp.eval(`
      currentUserSession = {
        id: 'usr_customer_123',
        name: 'Regular Customer',
        role: 'USER',
        status: 'ACTIVE'
      };
      switchNavSection('admin');
    `);
    await new Promise((r) => setTimeout(r, 200));

    const customerAccessResult = await cdp.eval(`
      (() => {
        const adminSec = document.getElementById('view-admin');
        const loginSec = document.getElementById('view-admin-login');
        return {
          adminActive: adminSec?.classList.contains('active'),
          loginActive: loginSec?.classList.contains('active')
        };
      })()
    `);
    assert('Customer (Role.USER) denied access to #view-admin and redirected to admin login', !customerAccessResult.adminActive && customerAccessResult.loginActive);

    console.log('\n--- TEST SUITE 5: Authorized Administrator Portal Experience ---');
    await cdp.eval(`
      currentUserSession = {
        id: 'usr_owner_123',
        name: 'Platform Owner',
        email: 'owner@astroverse.app',
        role: 'OWNER',
        status: 'ACTIVE'
      };
      currentSessionToken = 'admin_session_test_token';
      switchNavSection('admin');
    `);
    await new Promise((r) => setTimeout(r, 200));

    const adminAuthorizedResult = await cdp.eval(`
      (() => {
        const adminSec = document.getElementById('view-admin');
        const roleBadge = document.getElementById('admin-role-badge')?.textContent;
        const emailDisp = document.getElementById('admin-header-email')?.textContent;
        const contentBox = document.getElementById('admin-dashboard-content');
        return {
          adminActive: adminSec?.classList.contains('active'),
          role: roleBadge,
          email: emailDisp,
          contentVisible: contentBox && contentBox.style.display !== 'none'
        };
      })()
    `);

    assert('Authorized OWNER activates #view-admin', adminAuthorizedResult.adminActive);
    assert('Admin dashboard content is visible', adminAuthorizedResult.contentVisible);
    assert('Admin header displays role OWNER', adminAuthorizedResult.role === 'OWNER');
    assert('Admin header displays email owner@astroverse.app', adminAuthorizedResult.email.includes('owner@astroverse.app'));

    console.log('\n--- TEST SUITE 6: Secure Administrator Sign Out ---');
    await cdp.eval(`adminLogout()`);
    await new Promise((r) => setTimeout(r, 200));

    const loggedOutState = await cdp.eval(`
      (() => {
        return {
          currentUserSession,
          currentSessionToken,
          loginActive: document.getElementById('view-admin-login')?.classList.contains('active'),
          adminActive: document.getElementById('view-admin')?.classList.contains('active')
        };
      })()
    `);

    assert('Admin logout clears currentUserSession', loggedOutState.currentUserSession === null);
    assert('Admin logout clears currentSessionToken', loggedOutState.currentSessionToken === null);
    assert('Admin logout transitions to #view-admin-login', loggedOutState.loginActive);
    assert('Admin logout exits #view-admin', !loggedOutState.adminActive);

    console.log('\n--- TEST SUITE 7: Customer App Navigation Integrity ---');
    await cdp.eval(`switchNavSection('overview')`);
    await new Promise((r) => setTimeout(r, 200));

    const overviewState = await cdp.eval(`
      (() => {
        const overview = document.getElementById('view-overview');
        const dock = document.querySelector('.mob-bottom-dock');
        return {
          overviewActive: overview?.classList.contains('active'),
          dockStyleCleared: dock ? dock.style.display === '' : true
        };
      })()
    `);

    assert('Public customer overview active', overviewState.overviewActive);
    assert('Customer bottom navigation dock override cleared on customer pages', overviewState.dockStyleCleared);

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
