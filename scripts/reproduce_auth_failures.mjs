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
      if (msg.method === 'Runtime.exceptionThrown') {
        this.consoleLogs.push({ type: 'error', exception: msg.params.exceptionDetails });
      }
      if (msg.method === 'Network.responseReceived') {
        this.networkRequests.push({
          url: msg.params.response.url,
          status: msg.params.response.status,
          statusText: msg.params.response.statusText
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

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res && res.result ? res.result.value : null;
  }

  async close() {
    this.ws.close();
  }
}

async function reproduce() {
  console.log('=== REPRODUCING AUTHENTICATION BEHAVIOR ON LIVE DEPLOYED SITE ===');
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9250',
    '--disable-gpu',
    '--no-sandbox'
  ]);

  try {
    let connected = false;
    let targets = null;
    for (let i = 0; i < 30; i++) {
      try {
        targets = await getJson('http://127.0.0.1:9250/json/list');
        if (targets && targets.length > 0) {
          connected = true;
          break;
        }
      } catch (e) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    if (!connected) throw new Error('Could not connect to Chrome on port 9250');

    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Network.enable');

    console.log('Navigating to https://astroverse-eta.vercel.app/ ...');
    await client.send('Page.navigate', { url: 'https://astroverse-eta.vercel.app/' });
    await new Promise((r) => setTimeout(r, 3500));

    // 1. Check initial Supabase client state and readiness
    const initialAuthInspection = await client.evaluate(`(() => {
      return {
        supabaseSdkLoaded: typeof window.supabase !== 'undefined',
        supabaseClientInitialized: Boolean(window.supabaseClient),
        isSupabaseConfigured: Boolean(window.isSupabaseConfigured),
        authModalStatusText: document.getElementById('auth-status-text')?.textContent,
        authDbNoticeDisplay: document.getElementById('auth-db-notice')?.style?.display,
        authDbNoticeVisible: window.getComputedStyle(document.getElementById('auth-db-notice')).display
      };
    })()`);
    console.log('Initial Auth Inspection:', initialAuthInspection);

    // 2. Open Auth Modal
    console.log('Opening auth modal...');
    await client.evaluate(`openAuthModal()`);
    await new Promise((r) => setTimeout(r, 2000));

    const modalState = await client.evaluate(`(() => {
      const modal = document.getElementById('auth-modal');
      const notice = document.getElementById('auth-db-notice');
      const statusPill = document.getElementById('auth-status-pill');
      return {
        modalDisplay: modal?.style?.display,
        modalVisible: modal ? window.getComputedStyle(modal).display : 'none',
        statusPillText: statusPill?.textContent?.trim(),
        noticeDisplay: notice?.style?.display,
        noticeComputedDisplay: notice ? window.getComputedStyle(notice).display : 'none',
        noticeHtml: notice?.innerHTML
      };
    })()`);
    console.log('Auth Modal State:', modalState);

    // 3. Test Registration Attempt
    console.log('Attempting test registration...');
    await client.evaluate(`switchAuthModalTab('register')`);
    await new Promise((r) => setTimeout(r, 500));

    const regTestResult = await client.evaluate(`(async () => {
      document.getElementById('modal-reg-name').value = 'Test User';
      document.getElementById('modal-reg-email').value = 'synthetic_test_user_98765@example.com';
      document.getElementById('modal-reg-pwd').value = 'SecureP@ssw0rd2026!';
      
      const beforeSubmit = {
        name: document.getElementById('modal-reg-name').value,
        email: document.getElementById('modal-reg-email').value,
        phone: document.getElementById('modal-reg-phone').value,
      };

      // Trigger registration
      handleModalRegister();

      // Wait 3 seconds
      await new Promise(r => setTimeout(r, 3000));

      const errEl = document.getElementById('modal-reg-error');
      const notice = document.getElementById('auth-db-notice');

      return {
        beforeSubmit,
        errorElementDisplay: errEl?.style?.display,
        errorElementHtml: errEl?.innerHTML,
        errorElementText: errEl?.textContent,
        noticeDisplay: notice?.style?.display,
        currentUserSession: window.currentUserSession,
        currentSessionToken: Boolean(window.currentSessionToken)
      };
    })()`);
    console.log('Registration Test Result:', regTestResult);

    // 4. Test Password Sign In Attempt
    console.log('Attempting test sign-in...');
    await client.evaluate(`switchAuthModalTab('password')`);
    await new Promise((r) => setTimeout(r, 500));

    const loginTestResult = await client.evaluate(`(async () => {
      document.getElementById('modal-pwd-ident').value = 'synthetic_test_user_98765@example.com';
      document.getElementById('modal-pwd-val').value = 'SecureP@ssw0rd2026!';

      handleModalPasswordLogin();

      await new Promise(r => setTimeout(r, 3000));

      const errEl = document.getElementById('modal-pwd-error');
      return {
        errorElementDisplay: errEl?.style?.display,
        errorElementHtml: errEl?.innerHTML,
        errorElementText: errEl?.textContent,
        currentUserSession: window.currentUserSession,
        currentSessionToken: Boolean(window.currentSessionToken)
      };
    })()`);
    console.log('Login Test Result:', loginTestResult);

    // 5. Test Google OAuth initiation
    console.log('Testing Google OAuth button handler...');
    const googleAuthResult = await client.evaluate(`(() => {
      return {
        hasGoogleButton: Boolean(document.getElementById('btn-unified-google-login')),
        onclickAttr: document.getElementById('btn-unified-google-login')?.getAttribute('onclick'),
        isSupabaseConfigured: Boolean(window.isSupabaseConfigured)
      };
    })()`);
    console.log('Google Auth Config:', googleAuthResult);

    console.log('\n--- Console Logs Recorded ---');
    client.consoleLogs.forEach(l => console.log(l));

    console.log('\n--- Network Requests Recorded ---');
    client.networkRequests.filter(r => r.url.includes('/api/')).forEach(r => console.log(`${r.status} ${r.url}`));

    await client.close();
    chrome.kill();
  } catch (err) {
    console.error('Reproduction failed:', err);
    chrome.kill();
  }
}

reproduce();
