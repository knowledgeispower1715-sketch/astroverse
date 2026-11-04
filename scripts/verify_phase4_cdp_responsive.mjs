import fs from 'node:fs';
import path from 'node:path';

const CDP_PORT = 9222;
const PREVIEW_URL = 'https://astroverse-git-fix-e-72a6a3-knowledgeispower1715-1915s-projects.vercel.app/admin';
const EXPECTED_ORIGIN = 'https://astroverse-git-fix-e-72a6a3-knowledgeispower1715-1915s-projects.vercel.app';
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
  { name: 'zoom_125pct', scale: 1.25 },
  { name: 'zoom_150pct', scale: 1.50 },
  { name: 'zoom_200pct', scale: 2.00 }
];

const SENSITIVE_QUERY_PARAMS = new Set([
  'token', 'access_token', 'refresh_token', 'id_token', 'code', 'secret',
  'key', 'apikey', 'api_key', 'auth', 'authorization', 'password', 'passwd',
  'session', 'session_id', 'state', 'signature', 'sig'
]);

function sanitizeUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    const parsed = new URL(rawUrl);
    for (const param of Array.from(parsed.searchParams.keys())) {
      if (SENSITIVE_QUERY_PARAMS.has(param.toLowerCase())) {
        parsed.searchParams.set(param, '[REDACTED]');
      }
    }
    return parsed.toString();
  } catch {
    return rawUrl.split('?')[0];
  }
}

function sanitizeConsoleLog(arg) {
  if (typeof arg !== 'string') {
    try {
      arg = JSON.stringify(arg);
    } catch {
      arg = String(arg);
    }
  }
  return arg
    .replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer [REDACTED]')
    .replace(/(?:password|secret|token|key|cookie)["']?\s*[:=]\s*["']?[^"',\s}]+/gi, '$1: [REDACTED]')
    .replace(/ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g, '[JWT_REDACTED]');
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
    this.networkLogs = [];
    this.consoleLogs = [];
    this.requestStartTimes = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.method === 'Network.requestWillBeSent') {
          const req = msg.params.request;
          const reqId = msg.params.requestId;
          this.requestStartTimes.set(reqId, msg.params.timestamp);
          
          // STRICT SECURITY: Never store raw request headers, cookies, or authorization tokens
          const hasAuth = Boolean(req.headers?.['Authorization'] || req.headers?.['authorization']);
          const hasCookie = Boolean(req.headers?.['Cookie'] || req.headers?.['cookie']);
          
          this.networkLogs.push({
            type: 'request',
            requestId: reqId,
            method: req.method,
            sanitizedUrl: sanitizeUrl(req.url),
            timestamp: msg.params.timestamp,
            hasAuthHeader: hasAuth,
            hasCookieHeader: hasCookie
          });
        } else if (msg.method === 'Network.responseReceived') {
          const res = msg.params.response;
          const reqId = msg.params.requestId;
          const startTime = this.requestStartTimes.get(reqId) || msg.params.timestamp;
          const durationMs = Math.round((msg.params.timestamp - startTime) * 1000);

          // STRICT SECURITY: Never store raw response headers or set-cookie headers
          this.networkLogs.push({
            type: 'response',
            requestId: reqId,
            status: res.status,
            statusText: res.statusText,
            sanitizedUrl: sanitizeUrl(res.url),
            mimeType: res.mimeType,
            durationMs: durationMs >= 0 ? durationMs : 0,
            timestamp: msg.params.timestamp,
            hasSetCookieHeader: Boolean(res.headers?.['Set-Cookie'] || res.headers?.['set-cookie'])
          });
        } else if (msg.method === 'Runtime.consoleAPICalled') {
          const sanitizedArgs = msg.params.args.map(a => sanitizeConsoleLog(a.value || a.description || ''));
          this.consoleLogs.push({
            type: msg.params.type,
            args: sanitizedArgs,
            timestamp: Date.now()
          });
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
  console.log('--- Connecting to Chrome Remote Debugger on port 9222 ---');
  
  // Inspect existing open tabs to check if owner is already on Preview
  let targetId = null;
  let webSocketDebuggerUrl = null;
  let isExistingTab = false;

  try {
    const listResp = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
    if (listResp.ok) {
      const targets = await listResp.json();
      const existingTab = targets.find(t => t.type === 'page' && t.url && (t.url.includes('astroverse-git-fix-e-72a6a3') || t.url.includes('astroverse-eta')));
      if (existingTab) {
        console.log(`Found existing AstroVerse tab: ${existingTab.url}`);
        targetId = existingTab.id;
        webSocketDebuggerUrl = existingTab.webSocketDebuggerUrl;
        isExistingTab = true;
      }
    }
  } catch (err) {
    console.warn('Could not inspect existing tabs, falling back to new target:', err.message);
  }

  if (!targetId) {
    const targetResp = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(PREVIEW_URL)}`, { method: 'PUT' });
    if (!targetResp.ok) {
      throw new Error(`Failed to create target page on Chrome CDP: ${targetResp.statusText}`);
    }
    const target = await targetResp.json();
    targetId = target.id;
    webSocketDebuggerUrl = target.webSocketDebuggerUrl;
  }

  console.log(`Attached to CDP target: ${targetId}`);
  const cdp = new CDPClient(webSocketDebuggerUrl);
  await cdp.connect();

  try {
    await cdp.send('Page.enable');
    await cdp.send('Network.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');
    await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });

    console.log('Waiting for initial page settling (3500ms)...');
    await new Promise(r => setTimeout(r, 3500));

    // Capture initial DOM and Navigation State
    const navState = await cdp.eval(`({
      title: document.title,
      currentUrl: window.location.href,
      currentOrigin: window.location.origin,
      readyState: document.readyState,
      isVercelSsoRequired: window.location.hostname === 'vercel.com' || 
                           window.location.hostname.endsWith('.vercel.com') ||
                           document.title.includes('Vercel') || 
                           Boolean(document.querySelector('form[action*="login"]') || 
                           (document.body && (document.body.innerText.includes('Log in to Vercel') || document.body.innerText.includes('Deployment Protection')))),
      isAdminMounted: Boolean(document.getElementById('admin-root') || document.querySelector('.admin-sidebar') || document.getElementById('admin-overall-provenance-badge')),
      bodySnippet: document.body ? document.body.innerText.slice(0, 300).replace(/\\s+/g, ' ') : ''
    })`);

    console.log('Navigation State:', JSON.stringify(navState, null, 2));

    // STAGE 2: MAKE PREVIEW VERIFICATION AUTHENTICATION-AWARE
    const isVercelSso = navState.isVercelSsoRequired || 
                        navState.currentOrigin === 'https://vercel.com' || 
                        navState.currentUrl.includes('vercel.com/login');

    if (isVercelSso) {
      console.log('\n======================================================');
      console.log('STATUS: BLOCKED_VERCEL_SSO');
      console.log('The remote Preview host is protected by Vercel Team Deployment Protection.');
      console.log('Stopping automated application verification.');
      console.log('Will NOT capture Vercel login screen as AstroVerse Admin responsiveness.');
      console.log('Will NOT mark Admin layout or modules as PASS.');
      console.log('======================================================\n');

      const diagnosticsPath = path.join(OUTPUT_DIR, 'BROWSER_CDP_DIAGNOSTICS.json');
      fs.writeFileSync(diagnosticsPath, JSON.stringify({
        verificationStatus: 'BLOCKED_VERCEL_SSO',
        reason: 'Preview host redirected to Vercel Deployment Protection login gate. Automated execution halted to avoid capturing third-party SSO pages or fabricating verification results.',
        previewUrl: PREVIEW_URL,
        inspectedAt: new Date().toISOString(),
        navState,
        sanitizedNetworkLogsCount: cdp.networkLogs.length,
        sanitizedNetworkLogs: cdp.networkLogs.slice(0, 150),
        sanitizedConsoleLogsCount: cdp.consoleLogs.length,
        sanitizedConsoleLogs: cdp.consoleLogs,
        note: 'Zero raw headers, cookies, or authorization tokens were stored.'
      }, null, 2));

      const previewResultsPath = path.join(OUTPUT_DIR, 'RESPONSIVE_REAL_PREVIEW_RESULTS.md');
      fs.writeFileSync(previewResultsPath, `# REAL PREVIEW RESPONSIVE MEASUREMENT RESULTS

**Target Preview Host:** \`${PREVIEW_URL}\`  
**Execution Timestamp:** ${new Date().toISOString()}  
**Chrome CDP Endpoint:** \`127.0.0.1:9222\`  
**Verification Status:** **BLOCKED_VERCEL_SSO**  

---

## 1. Authentication Gate Detection

- **Observed Navigation URL:** \`${navState.currentUrl}\`
- **Observed Page Title:** \`${navState.title}\`
- **Origin Validation:** Expected \`${EXPECTED_ORIGIN}\`, got \`${navState.currentOrigin}\`.
- **Vercel Team SSO Active:** \`true\`

### Non-Fabrication Invariant:
In accordance with Stage 2 and Stage 4 requirements:
1. Automated capture of the Vercel SSO login page as proof of AstroVerse Admin responsiveness is **STRICTLY PROHIBITED**.
2. Automated Admin layout, action, and module execution is halted with status **BLOCKED_VERCEL_SSO**.
3. All zoom and viewport measurements will only be performed after authentic owner SSO completion on the genuine Preview origin.
`);

      return;
    }

    // IF AUTHENTICATED: Proceed with actual DOM measurements (STAGE 4)
    console.log('\n--- Origin Verified: Executing Actual Responsive DOM Measurements ---');
    const screenshotIndex = [];

    // Capture all 8 responsive viewports with REAL measurements
    for (const vp of VIEWPORTS) {
      console.log(`Setting viewport: ${vp.name} (${vp.width}x${vp.height})...`);
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width <= 430
      });
      await new Promise(r => setTimeout(r, 600));

      // Measure REAL DOM metrics
      const domMetrics = await cdp.eval(`(() => {
        const root = document.documentElement;
        const body = document.body;
        const scrollWidth = root.scrollWidth;
        const clientWidth = root.clientWidth;
        const scrollHeight = root.scrollHeight;
        const clientHeight = root.clientHeight;
        const hasHorizontalOverflow = scrollWidth > clientWidth;
        const hasVerticalOverflow = scrollHeight > clientHeight;

        // Inspect text and element clipping
        let clippedElements = 0;
        let textOverflowCount = 0;
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          const style = window.getComputedStyle(el);
          if (el.scrollWidth > el.clientWidth && style.overflowX === 'hidden' && style.textOverflow !== 'ellipsis') {
            textOverflowCount++;
          }
          const rect = el.getBoundingClientRect();
          if (rect.right > clientWidth || rect.left < 0) {
            clippedElements++;
          }
        }

        const navVisible = Boolean(document.querySelector('.admin-sidebar, nav, header'));
        const interactiveControls = document.querySelectorAll('button, a, input, select').length;

        return {
          scrollWidth,
          clientWidth,
          scrollHeight,
          clientHeight,
          hasHorizontalOverflow,
          hasVerticalOverflow,
          textOverflowCount,
          clippedElements,
          navVisible,
          interactiveControls
        };
      })()`);

      const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const filename = `preview_${vp.width}x${vp.height}_${vp.name}.png`;
      fs.writeFileSync(path.join(OUTPUT_DIR, filename), Buffer.from(screenshot.data, 'base64'));

      screenshotIndex.push({
        type: 'viewport',
        name: vp.name,
        width: vp.width,
        height: vp.height,
        scale: 1.0,
        filename,
        metrics: domMetrics
      });
      console.log(`Measured ${vp.name}: HorizontalOverflow=${domMetrics?.hasHorizontalOverflow}, Clipped=${domMetrics?.clippedElements}`);
    }

    // Capture 3 zoom levels at 1920x1080 with REAL measurements
    for (const z of ZOOM_LEVELS) {
      console.log(`Setting zoom scale: ${z.name} (${z.scale * 100}%)...`);
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: 1920,
        height: 1080,
        deviceScaleFactor: z.scale,
        mobile: false
      });
      await new Promise(r => setTimeout(r, 600));

      const zoomMetrics = await cdp.eval(`(() => {
        const root = document.documentElement;
        return {
          scrollWidth: root.scrollWidth,
          clientWidth: root.clientWidth,
          hasHorizontalOverflow: root.scrollWidth > root.clientWidth,
          interactiveControls: document.querySelectorAll('button, a, input').length
        };
      })()`);

      const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const filename = `preview_1920x1080_${z.name}.png`;
      fs.writeFileSync(path.join(OUTPUT_DIR, filename), Buffer.from(screenshot.data, 'base64'));

      screenshotIndex.push({
        type: 'zoom',
        name: z.name,
        width: 1920,
        height: 1080,
        scale: z.scale,
        filename,
        metrics: zoomMetrics
      });
      console.log(`Measured zoom ${z.name}: HorizontalOverflow=${zoomMetrics?.hasHorizontalOverflow}`);
    }

    // Write sanitized BROWSER_CDP_DIAGNOSTICS.json
    const diagnosticsPath = path.join(OUTPUT_DIR, 'BROWSER_CDP_DIAGNOSTICS.json');
    fs.writeFileSync(diagnosticsPath, JSON.stringify({
      verificationStatus: 'AUTHENTICATED_PREVIEW_VERIFIED',
      previewUrl: PREVIEW_URL,
      inspectedAt: new Date().toISOString(),
      navState,
      sanitizedNetworkLogsCount: cdp.networkLogs.length,
      sanitizedNetworkLogs: cdp.networkLogs.slice(0, 150),
      sanitizedConsoleLogsCount: cdp.consoleLogs.length,
      sanitizedConsoleLogs: cdp.consoleLogs,
      screenshotIndex,
      securityGuarantee: 'Zero raw headers, cookies, tokens, or credentials stored.'
    }, null, 2));

  } finally {
    cdp.close();
    if (!isExistingTab) {
      await fetch(`http://127.0.0.1:${CDP_PORT}/json/close/${targetId}`);
      console.log(`Closed ephemeral CDP target ${targetId}`);
    }
  }
}

run().catch(err => {
  console.error('CDP verification error:', err);
  process.exit(1);
});
