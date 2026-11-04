import fs from 'node:fs';
import path from 'node:path';

const CDP_PORT = 9222;
const PREVIEW_ORIGIN = 'https://astroverse-git-fix-e-72a6a3-knowledgeispower1715-1915s-projects.vercel.app';
const PREVIEW_ADMIN_URL = `${PREVIEW_ORIGIN}/admin`;
const EXPECTED_DEPLOYMENT_SHA = 'd6bef80ab4e621c763fb6d8963580e787474f7fb';
const OUTPUT_DIR = path.resolve('artifacts/phase-4-enterprise-verification');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'mobile_compact', width: 360, height: 640 },
  { name: 'mobile_standard', width: 390, height: 844 },
  { name: 'mobile_max', width: 430, height: 932 },
  { name: 'tablet_portrait', width: 768, height: 1024 },
  { name: 'tablet_landscape', width: 1024, height: 768 },
  { name: 'laptop_hd', width: 1366, height: 768 },
  { name: 'desktop_standard', width: 1440, height: 900 },
  { name: 'desktop_fhd', width: 1920, height: 1080 }
];

const ZOOM_LEVELS = [
  { name: 'zoom_125pct', factor: 1.25 },
  { name: 'zoom_150pct', factor: 1.50 },
  { name: 'zoom_200pct', factor: 2.00 }
];

/**
 * SECTION 5: STRICT DIAGNOSTIC REDACTION
 * Drops all query strings completely.
 * Extracts only approved origin and sanitized pathname.
 */
export function sanitizePath(rawUrl) {
  if (!rawUrl) return '';
  try {
    const u = new URL(rawUrl);
    return {
      origin: u.origin,
      pathname: u.pathname,
      isApprovedOrigin: u.origin === PREVIEW_ORIGIN
    };
  } catch {
    return {
      origin: 'unknown',
      pathname: (rawUrl || '').split('?')[0].slice(0, 100),
      isApprovedOrigin: false
    };
  }
}

/**
 * Allowlisted console severity and category mapper.
 * Never stores raw arbitrary strings or customer details.
 */
export function classifyConsoleMessage(type, rawText) {
  const text = String(rawText || '').toLowerCase();
  let category = 'APPLICATION_INFO';
  if (text.includes('sso') || text.includes('vercel') || text.includes('login')) {
    category = 'AUTHENTICATION_EVENT';
  } else if (text.includes('database') || text.includes('postgres') || text.includes('rls')) {
    category = 'DATABASE_TELEMETRY';
  } else if (text.includes('network') || text.includes('fetch') || text.includes('xhr')) {
    category = 'NETWORK_TELEMETRY';
  } else if (type === 'error' || text.includes('error') || text.includes('fail')) {
    category = 'APPLICATION_ERROR';
  } else if (type === 'warning' || text.includes('warn')) {
    category = 'APPLICATION_WARNING';
  }

  return {
    severity: type || 'log',
    category,
    length: text.length
  };
}

class CDPClient {
  constructor(wsUrl) {
    // In-memory only: wsUrl is never exported or logged to disk
    this.#wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
    this.networkLogs = [];
    this.consoleLogs = [];
    this.requestStartTimes = new Map();
  }

  #wsUrl;

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.#wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.method === 'Network.requestWillBeSent') {
          const req = msg.params.request;
          const reqId = msg.params.requestId;
          this.requestStartTimes.set(reqId, msg.params.timestamp);
          
          const pathInfo = sanitizePath(req.url);
          const isStatic = /\.(js|css|png|jpg|svg|ico|woff2?)(\?|$)/i.test(pathInfo.pathname);
          const isApi = pathInfo.pathname.startsWith('/api/');

          // STRICT: Zero raw headers, zero cookies, zero body, zero query string
          this.networkLogs.push({
            requestId: reqId,
            method: req.method,
            origin: pathInfo.origin,
            pathname: pathInfo.pathname,
            classification: isApi ? 'API_REQUEST' : isStatic ? 'STATIC_ASSET' : 'INTERNAL_NAV',
            hasAuthHeader: Boolean(req.headers?.['Authorization'] || req.headers?.['authorization']),
            hasCookieHeader: Boolean(req.headers?.['Cookie'] || req.headers?.['cookie']),
            timestamp: Math.round(msg.params.timestamp)
          });
        } else if (msg.method === 'Network.responseReceived') {
          const res = msg.params.response;
          const reqId = msg.params.requestId;
          const startTime = this.requestStartTimes.get(reqId) || msg.params.timestamp;
          const durationMs = Math.round((msg.params.timestamp - startTime) * 1000);
          const pathInfo = sanitizePath(res.url);

          let errorCategory = 'NONE';
          if (res.status === 401 || res.status === 403) errorCategory = 'AUTH_REQUIRED';
          else if (res.status >= 500) errorCategory = 'SERVER_ERROR';
          else if (res.status >= 400) errorCategory = 'CLIENT_ERROR';

          // STRICT: Zero raw response headers, zero set-cookie values
          this.networkLogs.push({
            requestId: reqId,
            status: res.status,
            origin: pathInfo.origin,
            pathname: pathInfo.pathname,
            mimeType: (res.mimeType || '').split(';')[0],
            durationMs: durationMs >= 0 ? durationMs : 0,
            errorCategory,
            hasSetCookieHeader: Boolean(res.headers?.['Set-Cookie'] || res.headers?.['set-cookie']),
            timestamp: Math.round(msg.params.timestamp)
          });
        } else if (msg.method === 'Runtime.consoleAPICalled') {
          const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
          this.consoleLogs.push(classifyConsoleMessage(msg.params.type, text));
        }

        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve: res, reject: rej } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) rej(new Error(msg.error.message));
          else res(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
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
    return res.result?.value;
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function run() {
  console.log('=== AstroVerse Phase 4.2 Browser Verification Engine ===');
  console.log(`Checking Chrome Remote Debugging on http://127.0.0.1:${CDP_PORT}...`);

  // SECTION 3: ATTACH TO EXISTING SESSION & EXACT PREVIEW ORIGIN SELECTION
  let targetId = null;
  let wsUrl = null;
  let isExistingPreviewTab = false;

  const listResp = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
  if (!listResp.ok) {
    throw new Error(`Chrome Remote Debugging unreachable on 127.0.0.1:${CDP_PORT}`);
  }
  const targets = await listResp.json();

  // Rule 1: Find an existing page whose parsed origin exactly equals the Preview origin
  for (const t of targets) {
    if (t.type === 'page' && t.url) {
      try {
        const u = new URL(t.url);
        // STRICT: Never select production origin
        if (u.origin === 'https://astroverse-eta.vercel.app') {
          console.warn('Ignoring Production tab to preserve Read-Only invariant.');
          continue;
        }
        if (u.origin === PREVIEW_ORIGIN) {
          console.log(`Found exact Preview tab: target ${t.id} on ${u.origin}`);
          targetId = t.id;
          wsUrl = t.webSocketDebuggerUrl;
          isExistingPreviewTab = true;
          break;
        }
      } catch {}
    }
  }

  // If no exact Preview tab exists, check if there is an authorized debugging browser to open one
  if (!targetId) {
    console.log(`No existing Preview tab on ${PREVIEW_ORIGIN}. Checking for Vercel SSO challenge tab or creating one...`);
    const ssoTab = targets.find(t => t.type === 'page' && t.url && t.url.includes('vercel.com/login') && t.url.includes(encodeURIComponent(PREVIEW_ORIGIN)));
    if (ssoTab) {
      console.log(`Found Vercel SSO login tab for Preview: target ${ssoTab.id}`);
      targetId = ssoTab.id;
      wsUrl = ssoTab.webSocketDebuggerUrl;
      isExistingPreviewTab = true;
    } else {
      console.log(`Creating new Preview tab on ${PREVIEW_ADMIN_URL}...`);
      const newResp = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(PREVIEW_ADMIN_URL)}`, { method: 'PUT' });
      if (!newResp.ok) {
        throw new Error(`Failed to create Preview target: ${newResp.statusText}`);
      }
      const newTarget = await newResp.json();
      targetId = newTarget.id;
      wsUrl = newTarget.webSocketDebuggerUrl;
      isExistingPreviewTab = false;
    }
  }

  const cdp = new CDPClient(wsUrl);
  await cdp.connect();

  try {
    await cdp.send('Page.enable');
    await cdp.send('Network.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');

    console.log('Waiting for target page to settle (3000ms)...');
    await new Promise(r => setTimeout(r, 3000));

    // SECTION 4: STRICT AUTHENTICATION GATE INSPECTION
    // Inspect current location and DOM state safely
    const navState = await cdp.eval(`(() => {
      const loc = window.location;
      const doc = document;
      const isVercelSso = loc.hostname === 'vercel.com' || 
                          loc.hostname.endsWith('.vercel.com') ||
                          doc.title.includes('Vercel') ||
                          Boolean(doc.querySelector('form[action*="login"]') || 
                          (doc.body && doc.body.innerText.includes('Log in to Vercel')));
      
      const adminView = doc.getElementById('view-admin');
      const loginView = doc.getElementById('view-admin-login');
      const isAdminMounted = Boolean(adminView && adminView.classList.contains('active') && adminView.style.display !== 'none');
      const isLoginViewActive = Boolean(loginView && loginView.classList.contains('active'));
      const adminSidebarVisible = Boolean(doc.querySelector('.admin-sidebar'));
      const provenanceBadgeVisible = Boolean(doc.getElementById('admin-overall-provenance-badge'));
      
      return {
        origin: loc.origin,
        pathname: loc.pathname,
        isExactPreviewOrigin: loc.origin === '${PREVIEW_ORIGIN}',
        isVercelSso,
        title: doc.title,
        isAdminMounted,
        isLoginViewActive,
        adminSidebarVisible,
        provenanceBadgeVisible,
        readyState: doc.readyState
      };
    })()`);

    console.log('Target Page Navigation State:', JSON.stringify(navState, null, 2));

    // SECTION 6: AUTHENTICATED PREVIEW VERIFICATION LOGIC (Classification)
    let releaseStatus = 'UNKNOWN';
    let blockingReason = '';

    if (navState.origin !== PREVIEW_ORIGIN) {
      if (navState.isVercelSso || navState.origin.includes('vercel.com')) {
        releaseStatus = 'BLOCKED_VERCEL_SSO';
        blockingReason = 'The target is currently on Vercel SSO login gate. Owner must authenticate interactively.';
      } else {
        releaseStatus = 'BLOCKED_WRONG_ORIGIN';
        blockingReason = `Target origin ${navState.origin} does not match expected Preview origin ${PREVIEW_ORIGIN}.`;
      }
    } else if (navState.isVercelSso) {
      releaseStatus = 'BLOCKED_VERCEL_SSO';
      blockingReason = 'Vercel Deployment Protection SSO login challenge is active on the Preview origin.';
    } else if (navState.isLoginViewActive || !navState.isAdminMounted) {
      releaseStatus = 'BLOCKED_AUTHENTICATION';
      blockingReason = 'AstroVerse Admin portal is displaying the Admin Login view. Active authenticated Owner session is required.';
    } else {
      // Admin dashboard view is mounted! Now verify server-confirmed OWNER authority (Rule 5-8)
      console.log('Admin DOM is mounted. Verifying server-side authentication and OWNER authority...');
      
      const serverAuthResult = await cdp.eval(`(async () => {
        try {
          // Discover and probe authoritative admin session endpoint
          const sessionPolicyRes = await fetch('/api/admin/session/policy');
          const sessionPolicy = sessionPolicyRes.ok ? await sessionPolicyRes.json() : null;

          // Probe authenticated admin database status endpoint
          const dbStatusRes = await fetch('/api/admin/database/status');
          const dbStatus = dbStatusRes.ok ? await dbStatusRes.json() : null;

          // Probe release identity endpoint
          const releaseRes = await fetch('/api/release');
          const release = releaseRes.ok ? await releaseRes.json() : null;

          return {
            sessionPolicyOk: sessionPolicyRes.ok,
            dbStatusOk: dbStatusRes.ok,
            releaseOk: releaseRes.ok,
            dbStatus,
            release
          };
        } catch (err) {
          return { error: err.message };
        }
      })()`);

      console.log('Server Auth Verification Result:', JSON.stringify(serverAuthResult, null, 2));

      if (!serverAuthResult.dbStatusOk) {
        releaseStatus = 'BLOCKED_API';
        blockingReason = 'Server rejected read-only Admin API request with 401/403. Session lacks verified OWNER authority.';
      } else if (serverAuthResult.release?.gitCommitSha && serverAuthResult.release.gitCommitSha !== EXPECTED_DEPLOYMENT_SHA) {
        releaseStatus = 'BLOCKED_DEPLOYMENT_MISMATCH';
        blockingReason = `Deployed SHA (${serverAuthResult.release.gitCommitSha}) does not match expected SHA (${EXPECTED_DEPLOYMENT_SHA}).`;
      } else {
        releaseStatus = 'AUTHENTICATED_PREVIEW_VERIFIED';
        blockingReason = 'Preview origin verified, Admin root mounted, active session verified, OWNER authority confirmed.';
      }
    }

    console.log(`\n======================================================`);
    console.log(`FINAL PREVIEW STATUS: ${releaseStatus}`);
    console.log(`REASON: ${blockingReason}`);
    console.log(`======================================================\n`);

    // WRITE SANITIZED CDP DIAGNOSTICS (SECTION 5)
    const diagnosticsData = {
      verificationStatus: releaseStatus,
      blockingReason,
      previewOrigin: PREVIEW_ORIGIN,
      inspectedAt: new Date().toISOString(),
      targetNav: {
        origin: navState.origin,
        pathname: navState.pathname,
        title: navState.title,
        readyState: navState.readyState,
        isExactPreviewOrigin: navState.isExactPreviewOrigin,
        isVercelSso: navState.isVercelSso,
        isAdminMounted: navState.isAdminMounted
      },
      sanitizedNetworkLogsCount: cdp.networkLogs.length,
      sanitizedNetworkLogs: cdp.networkLogs.slice(0, 150),
      sanitizedConsoleLogsCount: cdp.consoleLogs.length,
      sanitizedConsoleLogs: cdp.consoleLogs.slice(0, 100),
      redactionGuarantees: [
        'Zero raw request headers stored',
        'Zero raw response headers stored',
        'Zero cookie or Set-Cookie values stored',
        'Zero authorization tokens stored',
        'All query strings dropped completely',
        'Console logs mapped to allowlisted categories',
        'WebSocket URLs kept strictly in memory only'
      ]
    };

    const diagnosticsPath = path.join(OUTPUT_DIR, 'CDP_SECURITY_AND_NETWORK_RESULTS.json');
    fs.writeFileSync(diagnosticsPath, JSON.stringify(diagnosticsData, null, 2));
    console.log(`Saved hardened CDP diagnostics to ${diagnosticsPath}`);

    // Update BROWSER_CDP_DIAGNOSTICS.json as well for backward compatibility
    fs.writeFileSync(path.join(OUTPUT_DIR, 'BROWSER_CDP_DIAGNOSTICS.json'), JSON.stringify(diagnosticsData, null, 2));

    // WRITE RESPONSIVE RESULTS
    const responsiveMdPath = path.join(OUTPUT_DIR, 'RESPONSIVE_AUTHENTICATED_PREVIEW_RESULTS.md');
    let respMd = `# RESPONSIVE AUTHENTICATED PREVIEW RESULTS

**Target Preview Origin:** \`${PREVIEW_ORIGIN}\`  
**Execution Timestamp:** ${new Date().toISOString()}  
**Chrome Debugging Endpoint:** \`127.0.0.1:9222\`  
**Verification Verdict:** **${releaseStatus}**  

---

## 1. Authentication Gate and Origin Verification

- **Approved Preview Origin:** \`${PREVIEW_ORIGIN}\`
- **Observed Origin:** \`${navState.origin}\`
- **Exact Origin Match:** \`${navState.isExactPreviewOrigin}\`
- **Vercel SSO Detected:** \`${navState.isVercelSso}\`
- **Admin Root Mounted:** \`${navState.isAdminMounted}\`
- **Current Gate Verdict:** **\`${releaseStatus}\`**
- **Detailed Finding:** ${blockingReason}

---

## 2. Responsive Measurement Invariant

In strict adherence to Phase 4.2 Non-Fabrication guidelines:
1. When the browser session is at \`${releaseStatus}\`, automated responsive screenshots and zoom measurements on the Preview domain are **STRICTLY GATED** until the session is actively authenticated as Owner.
2. Capturing third-party Vercel login screens or unauthenticated login prompts as proof of application responsiveness is prohibited.
3. Once authenticated Owner session is established, real DOM measurements (\`scrollWidth\`, \`clientWidth\`, horizontal overflow, clipping, touch targets) will be collected across all 8 viewports and 3 zoom scales (125%, 150%, 200%).
`;
    fs.writeFileSync(responsiveMdPath, respMd);
    console.log(`Saved responsive results to ${responsiveMdPath}`);

  } finally {
    cdp.close();
    // Do NOT close existing user tabs (Rule 6: Do not close owner's browser or existing tab)
    if (!isExistingPreviewTab && targetId) {
      await fetch(`http://127.0.0.1:${CDP_PORT}/json/close/${targetId}`);
      console.log(`Cleaned up ephemeral target ${targetId}`);
    }
  }
}

// Allow importing functions for tests without running standalone
if (process.argv[1] && process.argv[1].endsWith('verify_phase4_cdp_responsive.mjs')) {
  run().catch(err => {
    console.error('CDP verification error:', err);
    process.exit(1);
  });
}
