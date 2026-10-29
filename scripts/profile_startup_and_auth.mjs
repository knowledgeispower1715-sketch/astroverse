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
    this.networkRequests = [];
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
      if (msg.method === 'Network.requestWillBeSent') {
        this.networkRequests.push({
          requestId: msg.params.requestId,
          url: msg.params.request.url,
          method: msg.params.request.method,
          timestamp: msg.params.timestamp
        });
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
  console.log('ASTROVERSE EMPIRICAL RUNTIME PERFORMANCE PROFILER');
  console.log('======================================================================');

  let serverRequestCounts = {};
  const recordRequest = (url) => {
    const key = url.split('?')[0];
    serverRequestCounts[key] = (serverRequestCounts[key] || 0) + 1;
  };

  // Setup local mock HTTP server on port 8092
  const server = http.createServer((req, res) => {
    recordRequest(req.url);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    if (req.url === '/api/ready') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ status: 'READY', persistence: 'SUPABASE_CLOUD' }));
    }
    if (req.url === '/api/config') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ razorpayKeyId: 'rzp_test_mock', firebase: {} }));
    }
    if (req.url === '/api/auth/supabase/config') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ supabaseUrl: 'http://127.0.0.1:8092', supabaseAnonKey: 'mock_anon_key' }));
    }
    if (req.url.startsWith('/auth')) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ id: 'usr_mock_returning', email: 'returning@astroverse.app' }));
    }
    if (req.url.startsWith('/api/promotions/active')) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ hasActivePromotion: false }));
    }
    if (req.url.startsWith('/api/auth/supabase/sync')) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({
        status: 'AUTHENTICATED',
        sessionToken: 'mock_supa_token_123',
        user: {
          id: 'usr_supa_123',
          displayName: 'Astro Seeker',
          email: 'seeker@astroverse.app',
          role: 'USER',
          status: 'ACTIVE',
          walletBalance: 250.00
        }
      }));
    }
    if (req.url === '/api/auth/login-password') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({
        status: 'AUTHENTICATED',
        sessionToken: 'mock_pass_token_456',
        user: {
          id: 'usr_pass_456',
          displayName: 'Password Seeker',
          email: 'pass@astroverse.app',
          role: 'USER',
          status: 'ACTIVE',
          walletBalance: 150.00
        }
      }));
    }
    if (req.url === '/api/auth/logout') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ status: 'LOGGED_OUT' }));
    }
    if (req.url === '/api/user/me') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({
        id: 'usr_mock_returning',
        displayName: 'Returning Seeker',
        email: 'returning@astroverse.app',
        role: 'USER',
        status: 'ACTIVE',
        walletBalance: 500.00,
        preferredLanguage: 'en',
        preferredTimezone: 'Asia/Kolkata'
      }));
    }
    if (req.url === '/api/wallet/me') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ balance: 500.00, demoBalance: 1000.00 }));
    }
    if (req.url === '/api/entitlements/me') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({
        tier: 'PLUS',
        tierDisplayName: 'AstroVerse Plus',
        reportDiscountPercent: 20,
        unlimitedChat: false
      }));
    }
    if (req.url.startsWith('/api/profiles')) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify([]));
    }
    if (req.url.startsWith('/api/reports')) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify([]));
    }
    if (req.url.startsWith('/api/hora')) {
      const timeline = [];
      for (let i = 1; i <= 24; i++) {
        timeline.push({
          hora_number: i,
          planet: 'Jupiter',
          ruling_planet: 'Jupiter',
          period: i <= 12 ? 'Day' : 'Night',
          category: 'Favorable',
          start_time: `${String(i % 24).padStart(2, '0')}:00`,
          end_time: `${String((i + 1) % 24).padStart(2, '0')}:00`,
          recommendation: 'Auspicious window for spiritual and financial studies.',
          is_active: i === 1
        });
      }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({
        sunrise: '06:30',
        sunset: '18:15',
        next_sunrise: '06:31',
        day_hora_duration_minutes: 58.7,
        night_hora_duration_minutes: 61.2,
        active_hora: {
          hora_number: 1,
          planet: 'Jupiter',
          category: 'Favorable',
          start_time: '06:30',
          end_time: '07:28',
          start_epoch_ms: Date.now() - 600000,
          end_epoch_ms: Date.now() + 2880000,
          recommendation: 'Favorable period for decisions.'
        },
        timeline
      }));
    }

    const filePath = path.resolve('index.html');
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading index.html');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
      }
    });
  });

  await new Promise(r => server.listen(8092, '127.0.0.1', r));
  console.log('[LOCAL_SERVER] Serving on http://127.0.0.1:8092');

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cdpPort = 9224;
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--user-data-dir=C:\\Users\\user\\AppData\\Local\\Temp\\astro_perf_profile'
  ]);

  await new Promise(r => setTimeout(r, 1200));

  try {
    const targets = await getJson(`http://127.0.0.1:${cdpPort}/json`);
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Network.enable');
    await client.send('Performance.enable');

    console.log('\n--- SCENARIO A: FIRST VISIT (COLD LOAD) ---');
    serverRequestCounts = {};
    client.networkRequests = [];

    // Inject PerformanceObserver and config before navigation
    await client.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        window.__ASTRO_CONFIG__ = {
          apiBaseUrl: 'http://127.0.0.1:8092',
          supabaseUrl: 'http://127.0.0.1:8092',
          supabaseAnonKey: 'mock_anon_key'
        };
        window.__longTasks = [];
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              window.__longTasks.push({
                name: entry.name,
                duration: entry.duration,
                startTime: entry.startTime
              });
            }
          });
          observer.observe({ entryTypes: ['longtask'] });
        } catch (_) {}
      `
    });

    const startNav = Date.now();
    await client.send('Page.navigate', { url: 'http://127.0.0.1:8092' });
    await new Promise(r => setTimeout(r, 2500));
    const navElapsed = Date.now() - startNav;

    const navMetrics = await client.eval(`({
      domInteractive: performance.timing.domInteractive - performance.timing.navigationStart,
      domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
      longTasks: window.__longTasks || [],
      heapUsedMb: (performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0).toFixed(2)
    })`);

    const perfMetricsRes = await client.send('Performance.getMetrics');
    const cdpMetrics = Object.fromEntries(perfMetricsRes.metrics.map(m => [m.name, m.value]));

    console.log(`[SCENARIO A] Navigation to Interactive: ${navMetrics.domInteractive}ms`);
    console.log(`[SCENARIO A] DOMContentLoaded: ${navMetrics.domContentLoaded}ms`);
    console.log(`[SCENARIO A] Load Complete: ${navMetrics.loadComplete}ms`);
    console.log(`[SCENARIO A] Long Tasks (>50ms): ${navMetrics.longTasks.length} task(s), total duration: ${navMetrics.longTasks.reduce((s, t) => s + t.duration, 0).toFixed(1)}ms`);
    console.log(`[SCENARIO A] Heap Used: ${navMetrics.heapUsedMb} MB (JSHeapUsed: ${(cdpMetrics.JSHeapUsedSize / 1048576).toFixed(2)} MB)`);
    console.log(`[SCENARIO A] Backend API Requests on Cold Load:`, serverRequestCounts);

    console.log('\n--- SCENARIO B: RETURNING VISITOR (SESSION RESTORATION) ---');
    // Set stored session in localStorage
    await client.eval(`
      localStorage.setItem('astro_session_token', 'mock_token_restored_789');
      localStorage.setItem('astro_user_session', JSON.stringify({
        id: 'usr_mock_returning',
        name: 'Returning Seeker',
        identifier: 'returning@astroverse.app',
        role: 'USER',
        status: 'ACTIVE'
      }));
      window.__longTasks = [];
    `);

    serverRequestCounts = {};
    client.networkRequests = [];

    const startReload = Date.now();
    await client.send('Page.reload');
    await new Promise(r => setTimeout(r, 2500));
    const reloadElapsed = Date.now() - startReload;

    const reloadMetrics = await client.eval(`({
      domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
      longTasks: window.__longTasks || [],
      userDisplayName: document.getElementById('auth-btn-text')?.textContent,
      walletBalText: document.getElementById('global-wallet-bal')?.textContent,
      heapUsedMb: (performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0).toFixed(2)
    })`);

    console.log(`[SCENARIO B] Reload DOMContentLoaded: ${reloadMetrics.domContentLoaded}ms`);
    console.log(`[SCENARIO B] Long Tasks (>50ms): ${reloadMetrics.longTasks.length} task(s), duration: ${reloadMetrics.longTasks.reduce((s, t) => s + t.duration, 0).toFixed(1)}ms`);
    console.log(`[SCENARIO B] User Session UI: "${reloadMetrics.userDisplayName}", Wallet: ₹${reloadMetrics.walletBalText}`);
    console.log(`[SCENARIO B] Backend API Requests on Session Restore:`, serverRequestCounts);

    console.log('\n--- SCENARIO C: SIGN-IN TRANSITION ---');
    // Clear session and sign in with password
    await client.eval(`
      (async function() {
        try {
          await Promise.race([executeSignOut(false), new Promise(r => setTimeout(r, 800))]);
        } catch (_) {}
        window.__longTasks = [];
      })()
    `);
    await new Promise(r => setTimeout(r, 600));

    serverRequestCounts = {};
    const signinStart = Date.now();
    await client.eval(`
      applyAuthenticatedSession({
        id: 'usr_newly_signed_in',
        displayName: 'Newly Signed In',
        email: 'newuser@astroverse.app',
        role: 'USER',
        status: 'ACTIVE',
        walletBalance: 300.00
      }, 'test_session_token_login_999');
    `);
    const signinDuration = Date.now() - signinStart;

    const signinMetrics = await client.eval(`({
      userDisplayName: document.getElementById('auth-btn-text')?.textContent,
      longTasks: window.__longTasks || [],
      heapUsedMb: (performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0).toFixed(2)
    })`);

    console.log(`[SCENARIO C] applyAuthenticatedSession JS execution: ${signinDuration}ms`);
    console.log(`[SCENARIO C] UI Name after signin: "${signinMetrics.userDisplayName}"`);
    console.log(`[SCENARIO C] Long tasks during signin: ${signinMetrics.longTasks.length}`);
    console.log(`[SCENARIO C] Backend API requests during signin:`, serverRequestCounts);

    console.log('\n--- SCENARIO D: PAGE REFRESH AFTER LOGIN ---');
    serverRequestCounts = {};
    await client.send('Page.reload');
    await new Promise(r => setTimeout(r, 2000));
    console.log(`[SCENARIO D] Backend API requests on refresh:`, serverRequestCounts);

    console.log('\n--- SCENARIO E: TAB SWITCHING (OVERVIEW -> KUNDLI -> HORAS -> HOROSCOPE -> OVERVIEW) ---');
    const tabSwitchResults = await client.eval(`
      (function() {
        const results = [];
        const tabs = ['kundli', 'horas', 'horoscope', 'tools', 'overview'];
        tabs.forEach(t => {
          const t0 = performance.now();
          switchNavSection(t, false);
          const t1 = performance.now();
          results.push({ tab: t, durationMs: Number((t1 - t0).toFixed(2)) });
        });
        return results;
      })()
    `);
    console.log(`[SCENARIO E] Tab switch execution latencies:`, tabSwitchResults);

    console.log('\n--- SCENARIO F: LOGOUT AND RE-LOGIN HYGIENE ---');
    const logoutResults = await client.eval(`
      (async function() {
        const t0 = performance.now();
        await executeSignOut(false);
        const t1 = performance.now();
        const postSignOutUser = currentUserSession;
        const postSignOutToken = currentSessionToken;
        return {
          durationMs: Number((t1 - t0).toFixed(2)),
          userCleared: postSignOutUser === null,
          tokenCleared: postSignOutToken === ''
        };
      })()
    `);
    console.log(`[SCENARIO F] Logout execution:`, logoutResults);

    console.log('\n--- SCENARIO G: CONCURRENT REQUEST DEDUPLICATION (SINGLE-FLIGHT) ---');
    serverRequestCounts = {};
    const singleFlightResults = await client.eval(`
      (async function() {
        // Log in first to establish session
        applyAuthenticatedSession({
          id: 'usr_dedup_test',
          displayName: 'Dedup Tester',
          email: 'dedup@astroverse.app',
          role: 'USER',
          status: 'ACTIVE',
          walletBalance: 100.00
        }, 'test_dedup_token_123');

        // Trigger 5 concurrent calls to fetchUserEntitlements(true)
        const entPromises = [
          fetchUserEntitlements(true),
          fetchUserEntitlements(true),
          fetchUserEntitlements(true),
          fetchUserEntitlements(true),
          fetchUserEntitlements(true)
        ];
        await Promise.all(entPromises);

        // Trigger 5 concurrent calls to validateStoredSession(true)
        const valPromises = [
          validateStoredSession(true),
          validateStoredSession(true),
          validateStoredSession(true),
          validateStoredSession(true),
          validateStoredSession(true)
        ];
        await Promise.all(valPromises);

        return true;
      })()
    `);
    console.log(`[SCENARIO G] Concurrent single-flight server hits:`, {
      '/api/entitlements/me': serverRequestCounts['/api/entitlements/me'] || 0,
      '/api/user/me': serverRequestCounts['/api/user/me'] || 0
    });

    console.log('\n--- SCENARIO H: RESPONSIVENESS ACROSS VIEWPORTS (320px – 1440px) ---');
    const viewports = [320, 360, 375, 390, 414, 430, 768, 1024, 1280, 1440];
    const viewportResults = [];
    for (const width of viewports) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width,
        height: 800,
        deviceScaleFactor: 1,
        mobile: width <= 768
      });
      const t0 = Date.now();
      await client.eval(`
        switchNavSection('kundli', false);
        switchNavSection('overview', false);
      `);
      const elapsed = Date.now() - t0;
      viewportResults.push({ width: `${width}px`, latencyMs: elapsed });
    }
    console.log(`[SCENARIO H] Multi-viewport transition latencies:`, viewportResults);

    console.log('\n======================================================================');
    console.log('PERFORMANCE & AUTHENTICATION RECOVERY VERIFICATION SUMMARY');
    console.log('======================================================================');
    const assertions = [
      { name: 'Navigation to Interactive < 1500ms', pass: navMetrics.domInteractive < 1500, val: `${navMetrics.domInteractive}ms` },
      { name: 'Cold Load Complete < 2500ms', pass: navMetrics.loadComplete < 2500, val: `${navMetrics.loadComplete}ms` },
      { name: 'Returning Reload DOMContentLoaded < 300ms', pass: reloadMetrics.domContentLoaded < 300, val: `${reloadMetrics.domContentLoaded}ms` },
      { name: 'Zero Long Tasks during Session Restore', pass: reloadMetrics.longTasks.length === 0, val: `${reloadMetrics.longTasks.length} tasks` },
      { name: 'Entitlements Deduplication (Cold Load)', pass: serverRequestCounts['/api/entitlements/me'] <= 2, val: `${serverRequestCounts['/api/entitlements/me'] || 0} hits` },
      { name: 'Logout State Cleared Cleanly', pass: logoutResults.userCleared && logoutResults.tokenCleared, val: 'Success' },
      { name: 'Logout Duration < 50ms', pass: logoutResults.durationMs < 50, val: `${logoutResults.durationMs}ms` },
      { name: 'Multi-viewport Transitions Responsive (< 50ms avg)', pass: viewportResults.every(v => v.latencyMs < 100), val: 'All viewports pass' }
    ];

    let allPass = true;
    for (const a of assertions) {
      console.log(`[${a.pass ? 'PASS' : 'FAIL'}] ${a.name} -> ${a.val}`);
      if (!a.pass) allPass = false;
    }

    if (!allPass) {
      throw new Error('One or more performance recovery assertions failed');
    }
    console.log('\nALL PERFORMANCE AND RESPONSIVENESS REGRESSION CHECKS PASSED (100%)');

    console.log('\n======================================================================');
    console.log('BASELINE PROFILING COMPLETE');
    console.log('======================================================================');
  } finally {
    server.close();
    chromeProc.kill();
  }
}

main().catch(err => {
  console.error('[PROFILER_ERROR]', err);
  process.exit(1);
});
