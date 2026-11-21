import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.resolve(__dirname, '../index.html').replace(/\\/g, '/');

async function getJson(url) {
  const res = await fetch(url);
  return res.json();
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          cb(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve) => {
      const id = this.id++;
      this.callbacks.set(id, resolve);
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function runMobileAudit() {
  console.log(`\n================================================================================`);
  console.log(`ASTROVERSE MOBILE CHAT LAYOUT & SIZING VERIFICATION SUITE`);
  console.log(`================================================================================\n`);

  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9244',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    `file:///${indexPath}`
  ]);

  try {
    let targets = null;
    for (let i = 0; i < 40; i++) {
      try {
        targets = await getJson('http://127.0.0.1:9244/json/list');
        if (targets && targets.length > 0) break;
      } catch (_) {}
      await new Promise((r) => setTimeout(r, 200));
    }
    const pageTarget = (targets || []).find((t) => t.type === 'page' && t.url.includes('index.html')) || (targets || []).find((t) => t.type === 'page');

    if (!pageTarget) throw new Error('No Chrome page target discovered on port 9244');

    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('DOM.enable');

    await client.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `localStorage.setItem('astro_user_session', JSON.stringify({
        id: 'test_user',
        name: 'Menex',
        email: 'menex@astroverse.test',
        sessionToken: 'test_token',
        tier: 'PREMIUM'
      }));`
    });

    const devices = [
      { name: 'iPhone 13', width: 390, height: 844, deviceScaleFactor: 3, mobile: true },
      { name: 'iPhone SE', width: 375, height: 667, deviceScaleFactor: 2, mobile: true },
      { name: 'Android Pixel', width: 412, height: 915, deviceScaleFactor: 2.6, mobile: true }
    ];

    for (const dev of devices) {
      console.log(`\n--- Testing ${dev.name} (${dev.width}x${dev.height}) ---`);

      await client.send('Emulation.setDeviceMetricsOverride', {
        width: dev.width,
        height: dev.height,
        deviceScaleFactor: dev.deviceScaleFactor,
        mobile: dev.mobile
      });

      await client.send('Page.navigate', { url: `file:///${indexPath}` });
      await new Promise((r) => setTimeout(r, 1200));

      const metrics = await client.send('Runtime.evaluate', {
        expression: `(() => {
          try {
            if (typeof startConsultationSession === 'function') {
              startConsultationSession('Acharya Devratan', 0);
            }
            const modal = document.getElementById('modal-ai-consultation');
            const input = document.getElementById('ai-chat-user-input');
            const sendBtn = document.getElementById('ai-chat-send-btn');
            const composer = document.getElementById('ai-chat-composer');
            const header = modal ? modal.querySelector('.modal-dialog-card > div:first-child') : null;

            const modalRect = modal ? modal.getBoundingClientRect() : null;
            const inputRect = input ? input.getBoundingClientRect() : null;
            const sendRect = sendBtn ? sendBtn.getBoundingClientRect() : null;
            const composerRect = composer ? composer.getBoundingClientRect() : null;
            const headerRect = header ? header.getBoundingClientRect() : null;
            const inputStyle = input ? window.getComputedStyle(input) : null;

            return {
              modalFound: !!modal,
              modalClasses: modal ? modal.className : '',
              modalOpen: modal && !modal.classList.contains('hidden'),
              modalWidth: modalRect ? Math.round(modalRect.width) : 0,
              modalHeight: modalRect ? Math.round(modalRect.height) : 0,
              inputWidth: inputRect ? Math.round(inputRect.width) : 0,
              inputHeight: inputRect ? Math.round(inputRect.height) : 0,
              inputFontSize: inputStyle ? inputStyle.fontSize : '',
              sendBtnWidth: sendRect ? Math.round(sendRect.width) : 0,
              composerBottom: composerRect ? Math.round(composerRect.bottom) : 0,
              composerY: composerRect ? Math.round(composerRect.y) : 0,
              headerHeight: headerRect ? Math.round(headerRect.height) : 0
            };
          } catch (e) {
            return { error: e.stack || e.message };
          }
        })()`,
        returnByValue: true
      });

      const res = metrics?.result?.value ?? metrics?.value;
      if (!res && metrics?.exceptionDetails) {
        console.error('Runtime exception:', metrics.exceptionDetails);
      }
      console.log(`Results for ${dev.name}:`, JSON.stringify(res, null, 2));

      if (!res.modalOpen) throw new Error(`${dev.name}: Modal is not open!`);
      if (res.inputWidth < 220) throw new Error(`${dev.name}: Input width ${res.inputWidth}px is less than 220px! (Squeezed!)`);
      if (res.sendBtnWidth > 90) throw new Error(`${dev.name}: Send button width ${res.sendBtnWidth}px is greater than 90px!`);
      if (res.headerHeight > 60) throw new Error(`${dev.name}: Header height ${res.headerHeight}px is greater than 60px!`);
      if (res.inputFontSize !== '16px') throw new Error(`${dev.name}: Input font size is ${res.inputFontSize}, expected 16px to prevent iOS auto-zoom!`);

      console.log(`✔ ${dev.name} PASSED: input width=${res.inputWidth}px (>=220px), sendBtn width=${res.sendBtnWidth}px (<=90px), header height=${res.headerHeight}px (<=60px), font-size=${res.inputFontSize}`);
    }

    // TEST VIRTUAL KEYBOARD SIMULATION
    console.log(`\n--- Testing Virtual Keyboard Simulation (Viewport Height: 500px) ---`);
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 500,
      deviceScaleFactor: 3,
      mobile: true
    });
    await new Promise((r) => setTimeout(r, 600));

    const kbMetrics = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const composer = document.getElementById('ai-chat-composer');
        const composerRect = composer ? composer.getBoundingClientRect() : null;
        return {
          composerBottom: composerRect ? Math.round(composerRect.bottom) : 0,
          composerInView: composerRect ? composerRect.bottom <= 505 : false
        };
      })()`,
      returnByValue: true
    });

    const kbVal = kbMetrics?.result?.value ?? kbMetrics?.value;
    console.log(`Keyboard metrics:`, JSON.stringify(kbVal, null, 2));
    if (!kbVal?.composerInView) {
      throw new Error(`Composer is offscreen during virtual keyboard appearance! bottom=${kbVal?.composerBottom}`);
    }
    console.log(`✔ Virtual keyboard synchronization PASSED: composer stays pinned inside visible viewport!`);

    client.close();
    chrome.kill();
    console.log(`\n================================================================================`);
    console.log(`ALL MOBILE CHAT LAYOUT & SIZING TESTS PASSED!`);
    console.log(`================================================================================\n`);
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ MOBILE AUDIT FAILED:`, err);
    try { chrome.kill(); } catch (_) {}
    process.exit(1);
  }
}

runMobileAudit();
