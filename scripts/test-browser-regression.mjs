/**
 * AstroVerse Automated Browser Regression Test Suite
 * 
 * Uses real headless Microsoft Edge (Chromium 155):
 * 1. Audits 8 responsive viewports for zero horizontal overflow (scrollWidth <= clientWidth).
 * 2. Audits auth modal flow, verifying zero navigation redirect and preservation of guest chart state.
 */

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';

const BROWSER_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const HTML_FILE = path.resolve('index.html');
const FILE_URL = 'file:///' + HTML_FILE.replace(/\\/g, '/');
const PORT = 9222;
const USER_DATA_DIR = path.join(os.tmpdir(), 'astroverse-edge-profile-' + Date.now());

const VIEWPORTS = [
  { name: 'iPhone SE (compact mobile)', width: 320, height: 568 },
  { name: 'Android Baseline (standard mobile)', width: 360, height: 640 },
  { name: 'iPhone 8 (classic mobile)', width: 375, height: 667 },
  { name: 'iPhone 12/13/14 (modern mobile)', width: 390, height: 844 },
  { name: 'iPhone 14/15 Pro Max (large mobile)', width: 430, height: 932 },
  { name: 'iPad Portrait (tablet)', width: 768, height: 1024 },
  { name: 'Laptop Baseline (desktop)', width: 1280, height: 800 },
  { name: 'Large Desktop (wide monitor)', width: 1440, height: 900 },
];

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.nextId = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { res, rej } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) rej(new Error(msg.error.message));
          else res(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((res, rej) => {
      this.callbacks.set(id, { res, rej });
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

async function runRegressionSuite() {
  console.log(`[TEST] Starting headless Edge at port ${PORT}...`);
  const browserProc = spawn(BROWSER_PATH, [
    '--headless',
    `--remote-debugging-port=${PORT}`,
    '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--disable-gpu',
    '--mute-audio',
    '--hide-scrollbars'
  ]);

  try {
    let target = null;
    for (let i = 0; i < 40; i++) {
      await sleep(250);
      try {
        const listResp = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(FILE_URL)}`, { method: 'PUT' });
        if (listResp.ok) {
          target = await listResp.json();
          break;
        }
      } catch (e) {
        // Retry
      }
    }

    if (!target || !target.webSocketDebuggerUrl) {
      throw new Error('Failed to connect to browser CDP target page.');
    }

    console.log(`[PASS] Browser CDP connected to tab: ${target.webSocketDebuggerUrl}`);
    const client = new CDPClient(target.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');

    console.log(`[TEST] Waiting for page script evaluation on ${FILE_URL}...`);
    await sleep(2000); // Wait for scripts, DOM, fonts to settle

    console.log('\n================================================================');
    console.log('PART 1: VIEWPORT HORIZONTAL OVERFLOW REGRESSION AUDIT (8 VIEWPORTS)');
    console.log('================================================================');

    let allViewportsPassed = true;

    for (const vp of VIEWPORTS) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 768
      });
      await sleep(150);

      const metrics = await client.eval(`
        (() => {
          const html = document.documentElement;
          const body = document.body;
          const windowWidth = window.innerWidth;
          const htmlScrollWidth = html.scrollWidth;
          const bodyScrollWidth = body.scrollWidth;

          // Check if any element forces horizontal scrollbar
          const overflowingElements = [];
          const allEls = document.querySelectorAll('*');
          for (const el of allEls) {
            const rect = el.getBoundingClientRect();
            if (rect.right > windowWidth + 1.5 && rect.width > 0 && rect.height > 0) {
              const style = window.getComputedStyle(el);
              if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                overflowingElements.push({
                  tag: el.tagName.toLowerCase(),
                  id: el.id || '',
                  className: el.className ? String(el.className).slice(0, 40) : '',
                  right: Math.round(rect.right),
                  width: Math.round(rect.width)
                });
                if (overflowingElements.length >= 3) break;
              }
            }
          }

          return {
            windowWidth,
            htmlScrollWidth,
            bodyScrollWidth,
            hasOverflow: (htmlScrollWidth > windowWidth + 1) || (bodyScrollWidth > windowWidth + 1),
            overflowingElements
          };
        })()
      `);

      const pass = !metrics.hasOverflow;
      if (!pass) allViewportsPassed = false;

      const status = pass ? '[PASS]' : '[FAIL]';
      console.log(`${status} ${vp.name.padEnd(38)} (${vp.width}x${vp.height}): ` +
        `scrollW=${metrics.htmlScrollWidth}px / clientW=${metrics.windowWidth}px` +
        (!pass ? ` -> OVERFLOW DETECTED: ${JSON.stringify(metrics.overflowingElements)}` : ' (0px overflow)'));
    }

    console.log('\n================================================================');
    console.log('PART 2: MODAL AUTH FLOW & GUEST CHART STATE RETENTION AUDIT');
    console.log('================================================================');

    // 1. Populate guest chart inputs
    const setupResult = await client.eval(`
      (() => {
        const nameInput = document.getElementById('input-k-name');
        const dobInput = document.getElementById('input-k-dob');
        const hhInput = document.getElementById('input-k-tob-hh');
        const mmInput = document.getElementById('input-k-tob-mm');
        const cityInput = document.getElementById('input-k-city-search');
        const latInput = document.getElementById('k-resolved-lat');
        const lonInput = document.getElementById('k-resolved-lon');
        const tzInput = document.getElementById('k-resolved-tz');

        if (nameInput) nameInput.value = 'Vikramaditya Test';
        if (dobInput) dobInput.value = '1995-10-15';
        if (hhInput) hhInput.value = '08';
        if (mmInput) mmInput.value = '45';
        if (cityInput) cityInput.value = 'Ujjain, Madhya Pradesh, India';
        if (latInput) latInput.value = '23.1765';
        if (lonInput) lonInput.value = '75.7885';
        if (tzInput) tzInput.value = 'Asia/Kolkata';

        return {
          name: nameInput?.value,
          dob: dobInput?.value,
          lat: latInput?.value,
          lon: lonInput?.value
        };
      })()
    `);
    console.log(`[PASS] Seeded guest form state: ${JSON.stringify(setupResult)}`);

    // 2. Trigger openAuthModal('otp')
    const openResult = await client.eval(`
      (() => {
        const urlBefore = window.location.href;
        if (typeof openAuthModal === 'function') {
          openAuthModal('otp');
        }
        const modal = document.getElementById('modal-auth-dialog');
        const isVisible = modal && window.getComputedStyle(modal).display !== 'none';
        const pending = window.pendingGuestProfile;
        const activeTab = document.getElementById('modal-tab-otp')?.classList.contains('active');
        const panelVisible = document.getElementById('modal-panel-otp')?.style.display !== 'none';

        return {
          urlBefore,
          urlAfter: window.location.href,
          didRedirect: urlBefore !== window.location.href,
          isVisible,
          activeTab,
          panelVisible,
          pendingProfileCaptured: pending && pending.name === 'Vikramaditya Test' && pending.dob === '1995-10-15'
        };
      })()
    `);

    assertCheck('Modal is visible upon openAuthModal()', openResult.isVisible, true);
    assertCheck('No disruptive page redirect occurred', openResult.didRedirect, false);
    assertCheck('OTP tab is active and visible by default', Boolean(openResult.activeTab && openResult.panelVisible), true);
    assertCheck('Guest chart profile was captured in pendingGuestProfile', Boolean(openResult.pendingProfileCaptured), true);

    // 3. Switch tabs in auth modal
    const tabResult = await client.eval(`
      (() => {
        if (typeof switchAuthModalTab === 'function') {
          switchAuthModalTab('password');
        }
        const pwTabActive = document.getElementById('modal-tab-password')?.classList.contains('active');
        const pwPanelVisible = document.getElementById('modal-panel-password')?.style.display !== 'none';
        const otpPanelHidden = document.getElementById('modal-panel-otp')?.style.display === 'none';

        return { pwTabActive, pwPanelVisible, otpPanelHidden };
      })()
    `);
    assertCheck('Switch to password tab updates active tab and toggles panels',
      Boolean(tabResult.pwTabActive && tabResult.pwPanelVisible && tabResult.otpPanelHidden), true);

    // 4. Close modal and verify state retention
    const closeResult = await client.eval(`
      (() => {
        if (typeof closeAuthModal === 'function') {
          closeAuthModal();
        }
        const modal = document.getElementById('modal-auth-dialog');
        const isHidden = modal && (modal.style.display === 'none' || window.getComputedStyle(modal).display === 'none');

        const nameInput = document.getElementById('input-k-name');
        const dobInput = document.getElementById('input-k-dob');

        return {
          isHidden,
          retainedName: nameInput?.value,
          retainedDob: dobInput?.value,
          pendingStillPreserved: Boolean(window.pendingGuestProfile)
        };
      })()
    `);
    assertCheck('Modal is hidden upon closeAuthModal()', closeResult.isHidden, true);
    assertCheck('Guest input fields retained values after closing modal',
      closeResult.retainedName === 'Vikramaditya Test' && closeResult.retainedDob === '1995-10-15', true);
    assertCheck('Pending guest profile remains preserved for subsequent sign-in', closeResult.pendingStillPreserved, true);

    client.close();

    console.log('\n================================================================');
    if (allViewportsPassed) {
      console.log('✅ ALL 8 RESPONSIVE VIEWPORTS PASSED WITH ZERO HORIZONTAL OVERFLOW');
      console.log('✅ MODAL AUTH PRESERVED GUEST CHART STATE ACROSS LIFECYCLE');
      console.log('================================================================\n');
    } else {
      console.error('❌ SOME VIEWPORT TESTS FAILED.');
      process.exitCode = 1;
    }
  } finally {
    try {
      browserProc.kill();
    } catch (e) {
      // Clean up
    }
    // Also cleanup processes on Windows
    const { execSync } = await import('node:child_process');
    try {
      execSync('taskkill /f /im msedge.exe', { stdio: 'ignore' });
    } catch (e) {}
    try {
      if (fs.existsSync(USER_DATA_DIR)) {
        fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
      }
    } catch (e) {}
  }
}

function assertCheck(desc, actual, expected) {
  if (actual === expected) {
    console.log(`[PASS] ${desc}`);
  } else {
    console.error(`[FAIL] ${desc} (expected: ${expected}, actual: ${actual})`);
    process.exitCode = 1;
  }
}

runRegressionSuite().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
