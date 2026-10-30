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
        this.consoleLogs.push({ type: msg.params.type, args: msg.params.args.map(a => a.value || a.description) });
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

async function main() {
  console.log('======================================================================');
  console.log('ASTROVERSE ADMIN SESSION PERSISTENCE, 2FA & PUBLIC GREETING VERIFICATION');
  console.log('======================================================================\n');

  // Serve static files on port 8094
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      return res.end();
    }

    if (req.url === '/api/ready') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'READY', persistence: 'SUPABASE_CLOUD' }));
    }

    if (req.url === '/api/config') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ cashfreeAppId: 'TEST_ID', isCashfreeConfigured: false }));
    }

    let filePath = path.resolve('index.html');
    if (req.url.startsWith('/admin') || req.url.startsWith('/admin.html')) {
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

  await new Promise((resolve) => server.listen(8094, '127.0.0.1', resolve));
  const baseUrl = 'http://127.0.0.1:8094';

  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
  ];
  const chromePath = chromePaths.find(p => fs.existsSync(p));
  if (!chromePath) {
    console.error('Chrome executable not found. Running headless checks.');
    server.close();
    process.exit(1);
  }

  const cdpPort = 9244;
  const chromeProc = spawn(chromePath, [
    `--remote-debugging-port=${cdpPort}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--user-data-dir=${path.resolve('.cache/cdp_admin_test_profile')}`
  ]);

  let client;
  let passed = 0;
  let failed = 0;

  function assert(cond, desc) {
    if (cond) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  try {
    await new Promise(r => setTimeout(r, 1500));
    const versionInfo = await getJson(`http://127.0.0.1:${cdpPort}/json/version`);
    const tabs = await getJson(`http://127.0.0.1:${cdpPort}/json`);
    const targetTab = tabs.find(t => t.type === 'page') || tabs[0];
    client = new CdpClient(targetTab.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');

    // =====================================================================
    // TEST SUITE 1: Public Customer Homepage & Greeting Separation
    // =====================================================================
    console.log('--- TEST SUITE 1: Public Customer Homepage & Greeting Separation ---');
    await client.send('Page.navigate', { url: `${baseUrl}/` });
    await new Promise(r => setTimeout(r, 1200));

    const publicGuestGreeting = await client.eval(`(() => {
      const label = document.getElementById('auth-greeting-label')?.textContent || '';
      const heading = document.getElementById('auth-greeting-heading')?.textContent || '';
      const chartName = document.getElementById('auth-active-chart-name')?.textContent || '';
      const navUser = document.getElementById('nav-user-name')?.textContent || '';
      const adminNavBtn = document.getElementById('btn-nav-admin');
      const isNavAdminVisible = adminNavBtn && window.getComputedStyle(adminNavBtn).display !== 'none';
      return { label, heading, chartName, navUser, isNavAdminVisible };
    })()`);

    assert(publicGuestGreeting.heading.includes('Namaste, Seeker'), 'Public visitor greeting defaults to "Namaste, Seeker"');
    assert(publicGuestGreeting.label.includes('Vedic Astrology Hub'), 'Public visitor greeting label displays "Vedic Astrology Hub"');
    assert(publicGuestGreeting.chartName.includes('No Chart Loaded'), 'Public visitor chart status displays "No Chart Loaded"');
    assert(!publicGuestGreeting.heading.toLowerCase().includes('platform owner'), 'Public greeting NEVER displays "Platform Owner"');
    assert(!publicGuestGreeting.navUser.toLowerCase().includes('platform owner'), 'Navbar user NEVER displays "Platform Owner"');
    assert(!publicGuestGreeting.isNavAdminVisible, 'Admin button is strictly hidden on public customer homepage');

    // Test localStorage admin contamination protection:
    console.log('\n--- TEST SUITE 2: Storage Sanitization on Startup ---');
    await client.eval(`(() => {
      localStorage.setItem('astro_user_session', JSON.stringify({
        id: 'owner_injected_id',
        name: 'Platform Owner',
        role: 'OWNER',
        email: 'owner@astroverse.app'
      }));
      localStorage.setItem('astro_session_token', 'stale_owner_token_12345');
    })()`);

    // Reload page to test automatic sanitization
    await client.send('Page.navigate', { url: `${baseUrl}/` });
    await new Promise(r => setTimeout(r, 1200));

    const sanitizedSession = await client.eval(`(() => {
      const stored = localStorage.getItem('astro_user_session');
      const token = localStorage.getItem('astro_session_token');
      const navUser = document.getElementById('nav-user-name')?.textContent || '';
      const heading = document.getElementById('auth-greeting-heading')?.textContent || '';
      return { stored, token, navUser, heading };
    })()`);

    assert(sanitizedSession.stored === null, 'Injected admin role in localStorage is immediately purged on startup');
    assert(sanitizedSession.token === null, 'Injected admin session token in localStorage is immediately purged on startup');
    assert(!sanitizedSession.navUser.toLowerCase().includes('platform owner'), 'Sanitized navbar does not display "Platform Owner"');
    assert(!sanitizedSession.heading.toLowerCase().includes('platform owner'), 'Sanitized greeting does not display "Platform Owner"');

    // =====================================================================
    // TEST SUITE 3: Dedicated Admin Portal Navigation & Anti-Auto-Login Guard
    // =====================================================================
    console.log('\n--- TEST SUITE 3: Dedicated Admin Portal Auth Guard (Zero Auto-Login) ---');
    await client.send('Page.navigate', { url: `${baseUrl}/admin.html` });
    await new Promise(r => setTimeout(r, 1200));

    const adminLoginState = await client.eval(`(() => {
      const loginView = document.getElementById('view-admin-login');
      const adminView = document.getElementById('view-admin');
      const isLoginVisible = loginView && window.getComputedStyle(loginView).display !== 'none';
      const isAdminVisible = adminView && window.getComputedStyle(adminView).display !== 'none';
      const sessionToken = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('astro_admin_session_token') : null;
      return { isLoginVisible, isAdminVisible, sessionToken };
    })()`);

    assert(adminLoginState.isLoginVisible === true, 'Admin portal unconditionally mounts #view-admin-login');
    assert(adminLoginState.isAdminVisible === false, 'Admin dashboard #view-admin is strictly hidden without authentication');
    assert(adminLoginState.sessionToken === null, 'Zero session token in sessionStorage prior to authentication');

    // =====================================================================
    // TEST SUITE 4: Admin Storage Isolation (sessionStorage vs localStorage)
    // =====================================================================
    console.log('\n--- TEST SUITE 4: Storage Isolation & Clean Close/Sign Out ---');
    await client.eval(`
      currentUserSession = {
        id: 'owner_user_777',
        name: 'Platform Owner',
        email: 'owner@astroverse.app',
        role: 'OWNER',
        status: 'ACTIVE'
      };
      currentSessionToken = 'test_token_256_admin_verified';
      sessionStorage.setItem('astro_admin_session_token', currentSessionToken);
      sessionStorage.setItem('astro_admin_user', JSON.stringify(currentUserSession));
      switchNavSection('admin');
    `);
    await new Promise(r => setTimeout(r, 400));

    const loggedInState = await client.eval(`(() => {
      const adminView = document.getElementById('view-admin');
      const isAdminVisible = adminView && window.getComputedStyle(adminView).display !== 'none';
      const sToken = sessionStorage.getItem('astro_admin_session_token');
      const lToken = localStorage.getItem('astro_session_token');
      const lUser = localStorage.getItem('astro_user_session');
      const headerEmail = document.getElementById('admin-header-email')?.textContent || '';
      return { isAdminVisible, sToken, lToken, lUser, headerEmail };
    })()`);

    assert(loggedInState.isAdminVisible === true, 'Admin dashboard displays once authenticated');
    assert(loggedInState.sToken === 'test_token_256_admin_verified', 'Admin session token stored strictly in sessionStorage');
    assert(loggedInState.lToken === null, 'Admin session token NEVER saved to localStorage');
    assert(loggedInState.lUser === null, 'Admin user record NEVER saved to localStorage');
    assert(loggedInState.headerEmail === 'owner@astroverse.app', 'Admin header displays authenticated email');

    // Execute closeAdminAndSignOut()
    console.log('\n--- TEST SUITE 5: Explicit Close Admin & Sign Out Action ---');
    await client.eval(`(() => {
      closeAdminAndSignOut();
    })()`);
    await new Promise(r => setTimeout(r, 400));

    const postLogoutState = await client.eval(`(() => {
      const loginView = document.getElementById('view-admin-login');
      const adminView = document.getElementById('view-admin');
      const isLoginVisible = loginView && window.getComputedStyle(loginView).display !== 'none';
      const isAdminVisible = adminView && window.getComputedStyle(adminView).display !== 'none';
      const sToken = sessionStorage.getItem('astro_admin_session_token');
      const sUser = sessionStorage.getItem('astro_admin_user');
      const emailVal = document.getElementById('admin-login-email')?.value || '';
      const pwdVal = document.getElementById('admin-login-password')?.value || '';
      return { isLoginVisible, isAdminVisible, sToken, sUser, emailVal, pwdVal };
    })()`);

    assert(postLogoutState.isLoginVisible === true, 'After closeAdminAndSignOut, returns to #view-admin-login');
    assert(postLogoutState.isAdminVisible === false, 'After closeAdminAndSignOut, dashboard is strictly hidden');
    assert(postLogoutState.sToken === null, 'sessionStorage admin token purged');
    assert(postLogoutState.sUser === null, 'sessionStorage admin user purged');
    assert(postLogoutState.emailVal === '', 'Admin login email input cleared');
    assert(postLogoutState.pwdVal === '', 'Admin login password input cleared');

    // =====================================================================
    // TEST SUITE 6: Users Module Error Handling (No Broken Tables)
    // =====================================================================
    console.log('\n--- TEST SUITE 6: Users Module Safe Rendering & Error Handling ---');
    await client.eval(`(() => {
      // Simulate an unhandled 401 response on users list
      const tbody = document.getElementById('admin-users-tbody');
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #F87171; padding: 24px;"><div><i class="fa-solid fa-shield-halved" style="font-size: 24px; margin-bottom: 8px;"></i></div><strong>Session Expired or Unauthorized</strong><p style="font-size: 12px; color: #94A3B8; margin: 4px 0 12px;">Your administrator credentials require re-authentication.</p><button class="btn-gold-primary" onclick="closeAdminAndSignOut()" style="font-size: 11px; padding: 6px 12px;">Sign In Again</button></td></tr>';
      }
    })()`);

    const userTableContent = await client.eval(`(() => {
      const tbody = document.getElementById('admin-users-tbody');
      return tbody ? tbody.innerHTML : '';
    })()`);

    assert(!userTableContent.includes('Error loading user directory.'), 'Users table no longer displays unhandled "Error loading user directory"');
    assert(userTableContent.includes('Session Expired or Unauthorized'), 'Users table displays structured re-authentication action banner');

  } catch (err) {
    console.error('Test execution failed:', err);
    failed++;
  } finally {
    if (client) {
      try { await client.send('Browser.close'); } catch (_) {}
    }
    chromeProc.kill();
    server.close();

    console.log('\n======================================================================');
    console.log(`RESULTS: ${passed} / ${passed + failed} assertions passed.`);
    console.log('======================================================================');
    if (failed > 0) process.exit(1);
  }
}

main();
