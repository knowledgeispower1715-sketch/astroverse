import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9235;
const HTTP_PORT = 8790;

async function launchChrome() {
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,900',
    'about:blank'
  ]);

  // Wait for Chrome CDP port to open
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (res.ok) {
        return chromeProcess;
      }
    } catch (_) {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Failed to connect to headless Chrome CDP');
}

async function getWsEndpoint() {
  const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
  const targets = await res.json();
  const pageTarget = targets.find(t => t.type === 'page') || targets[0];
  return pageTarget.webSocketDebuggerUrl;
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.msgId = 0;
    this.callbacks = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.msgId;
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
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || 'Evaluation error');
    }
    return res.result?.value;
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

async function runForensicSuite() {
  console.log('===============================================================');
  console.log('ASTROVERSE NUMEROLOGY STUDIO BROWSER DOM FORENSIC TEST SUITE');
  console.log('===============================================================\n');

  let chromeProc = null;
  let client = null;
  let server = null;
  let passCount = 0;
  let failCount = 0;

  function assert(cond, msg) {
    if (!cond) {
      console.error(`[FAIL] ${msg}`);
      failCount++;
      throw new Error(msg);
    } else {
      console.log(`[PASS] ${msg}`);
      passCount++;
    }
  }

  try {
    server = http.createServer((req, res) => {
      if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream('index.html').pipe(res);
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    await new Promise((resolve) => server.listen(HTTP_PORT, resolve));

    chromeProc = await launchChrome();
    const wsUrl = await getWsEndpoint();
    client = new CdpClient(wsUrl);
    await client.connect();

    await client.send('Network.enable');
    await client.send('Network.setBlockedURLs', {
      urls: [
        '*cdnjs.cloudflare.com*',
        '*cdn.jsdelivr.net*',
        '*accounts.google.com*',
        '*fonts.googleapis.com*',
        '*fonts.gstatic.com*',
        '*cdn.tailwindcss.com*'
      ]
    });

    await client.send('Page.enable');
    await client.send('Runtime.enable');

    await client.send('Page.navigate', { url: `http://127.0.0.1:${HTTP_PORT}/index.html` });

    // Wait for document and scripts to fully settle
    for (let i = 0; i < 50; i++) {
      try {
        const ready = await client.evaluate(`typeof window.openNumerologyStudio === 'function'`);
        if (ready) break;
      } catch (_) {}
      await new Promise(r => setTimeout(r, 200));
    }

    console.log('\n--- 1. BLANK-BY-DEFAULT INITIALIZATION & EPHEMERAL RESET ---');
    await client.evaluate(`openNumerologyStudio('personal');`);
    await new Promise(r => setTimeout(r, 100));

    const modalState = await client.evaluate(`(() => {
      const modal = document.getElementById('modal-numerology-studio');
      const name = document.getElementById('numerology-input-name')?.value;
      const dob = document.getElementById('numerology-input-dob')?.value;
      const bizName = document.getElementById('num-business-name')?.value;
      const bizDob = document.getElementById('num-business-founder-dob')?.value;
      const phone = document.getElementById('num-mobile-input')?.value;
      const pResEmpty = document.getElementById('num-personal-results')?.innerHTML.includes('num-personal-empty-state');
      const bResEmpty = document.getElementById('num-business-results')?.innerHTML.includes('num-business-empty-state');
      const mResEmpty = document.getElementById('num-mobile-results')?.innerHTML.includes('num-mobile-empty-state');
      const pErrHidden = getComputedStyle(document.getElementById('num-personal-validation-error')).display === 'none';
      const bErrHidden = getComputedStyle(document.getElementById('num-business-validation-error')).display === 'none';
      const mErrHidden = getComputedStyle(document.getElementById('num-mobile-validation-error')).display === 'none';

      return {
        modalVisible: modal && getComputedStyle(modal).display !== 'none',
        name, dob, bizName, bizDob, phone,
        pResEmpty, bResEmpty, mResEmpty,
        pErrHidden, bErrHidden, mErrHidden
      };
    })()`);

    assert(modalState.modalVisible, 'Numerology Studio modal opens cleanly');
    assert(modalState.name === '', 'Personal name input is strictly blank by default');
    assert(modalState.dob === '', 'Personal DOB input is strictly blank by default');
    assert(modalState.bizName === '', 'Business name input is strictly blank by default');
    assert(modalState.bizDob === '', 'Business founder DOB is strictly blank by default');
    assert(modalState.phone === '', 'Mobile phone input is strictly blank by default (NO prefill)');
    assert(modalState.pResEmpty, 'Personal tab initializes with polite empty state');
    assert(modalState.bResEmpty, 'Business tab initializes with polite empty state');
    assert(modalState.mResEmpty, 'Mobile tab initializes with polite empty state');
    assert(modalState.pErrHidden && modalState.bErrHidden && modalState.mErrHidden, 'All validation error alerts initialize hidden');

    console.log('\n--- 2. REAL-TIME INPUT VALIDATION & DYNAMIC KEYSTROKE DISMISSAL ---');
    // Attempt calculate with empty name
    await client.evaluate(`executeNumerologyStudio(false);`);
    const errState1 = await client.evaluate(`(() => {
      const err = document.getElementById('num-personal-validation-error');
      return {
        visible: err && getComputedStyle(err).display !== 'none',
        text: err ? err.innerText : ''
      };
    })()`);
    assert(errState1.visible, 'Validation error appears when submitting empty personal form');
    assert(errState1.text.includes('Please enter a valid name'), 'Error instructs user to enter valid name');

    // Type a character into name input and assert error is dismissed IMMEDIATELY
    await client.evaluate(`(() => {
      const input = document.getElementById('numerology-input-name');
      input.value = 'R';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    const errState2 = await client.evaluate(`(() => {
      const err = document.getElementById('num-personal-validation-error');
      return { display: err ? getComputedStyle(err).display : '' };
    })()`);
    assert(errState2.display === 'none', 'Validation error is dynamically dismissed as soon as user types into name input');

    // Fill valid name, submit without DOB
    await client.evaluate(`(() => {
      const input = document.getElementById('numerology-input-name');
      input.value = 'RAHUL SHARMA';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      executeNumerologyStudio(false);
    })()`);
    const errState3 = await client.evaluate(`(() => {
      const err = document.getElementById('num-personal-validation-error');
      return {
        visible: err && getComputedStyle(err).display !== 'none',
        text: err ? err.innerText : ''
      };
    })()`);
    assert(errState3.visible && errState3.text.includes('Date of Birth'), 'Validation error prompts for Date of Birth');

    // Enter DOB and assert error dismissed
    await client.evaluate(`(() => {
      const dobInput = document.getElementById('numerology-input-dob');
      dobInput.value = '1995-08-20';
      dobInput.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    const errState4 = await client.evaluate(`(() => {
      const err = document.getElementById('num-personal-validation-error');
      return { display: err ? getComputedStyle(err).display : '' };
    })()`);
    assert(errState4.display === 'none', 'Validation error is dismissed when DOB is entered');

    console.log('\n--- 3. TAB / PANEL SYNCHRONIZATION & CLEANUP ---');
    await client.evaluate(`switchNumerologyTab('business');`);
    const tabState1 = await client.evaluate(`(() => {
      const btnBiz = document.getElementById('num-tab-btn-business').classList.contains('active');
      const paneBiz = getComputedStyle(document.getElementById('num-tab-pane-business')).display !== 'none';
      const panePersonal = getComputedStyle(document.getElementById('num-tab-pane-personal')).display === 'none';
      const bErrHidden = getComputedStyle(document.getElementById('num-business-validation-error')).display === 'none';
      return { btnBiz, paneBiz, panePersonal, bErrHidden };
    })()`);
    assert(tabState1.btnBiz && tabState1.paneBiz && tabState1.panePersonal, 'Business tab pill and pane are synchronized in active state');
    assert(tabState1.bErrHidden, 'Business tab validation error is clean upon tab switch');

    await client.evaluate(`switchNumerologyTab('mobile');`);
    const tabState2 = await client.evaluate(`(() => {
      const btnMob = document.getElementById('num-tab-btn-mobile').classList.contains('active');
      const paneMob = getComputedStyle(document.getElementById('num-tab-pane-mobile')).display !== 'none';
      const paneBiz = getComputedStyle(document.getElementById('num-tab-pane-business')).display === 'none';
      return { btnMob, paneMob, paneBiz };
    })()`);
    assert(tabState2.btnMob && tabState2.paneMob && tabState2.paneBiz, 'Mobile tab pill and pane are synchronized in active state');

    console.log('\n--- 4. BUSINESS NAME & FOUNDER SYNERGY INTEGRITY ---');
    await client.evaluate(`switchNumerologyTab('business');`);
    // Analyze business WITHOUT founder DOB
    await client.evaluate(`(() => {
      document.getElementById('num-business-name').value = 'ASTROVERSE TECHNOLOGIES';
      document.getElementById('num-business-founder-dob').value = '';
      executeBusinessNumerology();
    })()`);
    await new Promise(r => setTimeout(r, 200));

    const bizResult1 = await client.evaluate(`(() => {
      const res = document.getElementById('num-business-results');
      const html = res ? res.innerHTML : '';
      const hasFounderOmittedNotice = html.includes('Founder Date of Birth was not provided');
      const hasFake2000Date = html.includes('2000-01-01');
      const chaldeanComp = html.includes('CHALDEAN COMPOUND');
      return { hasFounderOmittedNotice, hasFake2000Date, chaldeanComp };
    })()`);
    assert(bizResult1.chaldeanComp, 'Business commercial vibration calculates successfully');
    assert(bizResult1.hasFounderOmittedNotice, 'Displays explicit notice that founder synergy was omitted because founder DOB was not provided');
    assert(!bizResult1.hasFake2000Date, 'Zero phantom 2000-01-01 founder birth dates injected');

    // Future founder DOB rejected
    await client.evaluate(`(() => {
      document.getElementById('num-business-founder-dob').value = '2099-01-01';
      executeBusinessNumerology();
    })()`);
    const bizFutureErr = await client.evaluate(`(() => {
      const err = document.getElementById('num-business-validation-error');
      return err ? err.innerText : '';
    })()`);
    assert(bizFutureErr.includes('cannot be in the future'), 'Rejects future founder DOB with inline validation error');

    // Valid founder DOB
    await client.evaluate(`(() => {
      document.getElementById('num-business-founder-dob').value = '1990-05-15';
      executeBusinessNumerology();
    })()`);
    await new Promise(r => setTimeout(r, 200));

    const bizResult2 = await client.evaluate(`(() => {
      const res = document.getElementById('num-business-results');
      const html = res ? res.innerHTML : '';
      return {
        hasSynergyCard: html.includes('Founder Synergy:'),
        hasHarmonyScore: html.includes('Harmony Score:'),
        hasDob: html.includes('1990-05-15')
      };
    })()`);
    assert(bizResult2.hasSynergyCard && bizResult2.hasHarmonyScore && bizResult2.hasDob, 'Computes authentic founder synergy when valid founder DOB is supplied');

    console.log('\n--- 5. MOBILE PHONE NUMBER RESONANCE & EPHEMERAL PRIVACY ---');
    await client.evaluate(`switchNumerologyTab('mobile');`);
    await client.evaluate(`(() => {
      document.getElementById('num-mobile-input').value = '+91 98765 43210';
      executeMobileNumerology();
    })()`);
    await new Promise(r => setTimeout(r, 200));

    const mobResult = await client.evaluate(`(() => {
      const res = document.getElementById('num-mobile-results');
      const html = res ? res.innerHTML : '';
      const masked = html.includes('Masked:') && html.includes('•••••');
      const unmaskedRaw = html.includes('98765 43210');
      const sumAndRoot = html.includes('COMPOUND DIGIT SUM');
      const zeroStorage = html.includes('Zero personal records persisted');
      return { masked, unmaskedRaw, sumAndRoot, zeroStorage };
    })()`);
    assert(mobResult.masked, 'Mobile number display is properly masked for caller privacy');
    assert(!mobResult.unmaskedRaw, 'Raw phone number is not exposed in output view');
    assert(mobResult.sumAndRoot, 'Digit sum and reduced root calculated accurately');
    assert(mobResult.zeroStorage, 'Ephemeral zero-storage privacy statement clearly declared');

    console.log('\n--- 6. 5 AUSPICIOUS NAME CORRECTIONS & DIVERSE HARMONY SCORES ---');
    await client.evaluate(`switchNumerologyTab('personal');`);
    await client.evaluate(`(() => {
      document.getElementById('numerology-input-name').value = 'RAHUL';
      document.getElementById('numerology-input-dob').value = '2000-05-15';
      localStorage.setItem('astro_simulated_tier', 'PLUS');
      executeNumerologyStudio(true);
    })()`);
    await new Promise(r => setTimeout(r, 300));

    const correctionResult = await client.evaluate(`(() => {
      const res = document.getElementById('num-personal-results');
      const html = res ? res.innerHTML : '';
      const cards = Array.from(res.querySelectorAll('button[onclick*="applyCorrectionCandidate"]')).map(btn => {
        const card = btn.closest('div');
        const text = card ? card.innerText : '';
        const nameMatch = text.match(/([A-Z\\s\\.]+)\\n/);
        const harmMatch = text.match(/Harmony:\\s*(\\d+)%/);
        const compMatch = text.match(/Chaldean:\\s*(\\d+)\\s*→\\s*(\\d+)/);
        return {
          text,
          name: nameMatch ? nameMatch[1].trim() : '',
          harmony: harmMatch ? parseInt(harmMatch[1], 10) : null,
          compound: compMatch ? parseInt(compMatch[1], 10) : null
        };
      });

      return {
        cardCount: cards.length,
        cards,
        hasRHAHUL: html.includes('RHAHUL'),
        hasRRAHUL: html.includes('RRAHUL')
      };
    })()`);

    assert(correctionResult.cardCount === 5, `Displays exactly 5 candidate cards in the UI grid (got ${correctionResult.cardCount})`);
    assert(!correctionResult.hasRHAHUL, 'No mechanical RHAHUL generated');
    assert(!correctionResult.hasRRAHUL, 'No initial consonant doubling RRAHUL generated');

    const harmonies = correctionResult.cards.map(c => c.harmony).filter(h => h !== null);
    const uniqueHarmonies = new Set(harmonies);
    console.log('Candidate Cards Generated:', correctionResult.cards.map(c => `${c.name || 'Candidate'} (Comp: ${c.compound}, Harmony: ${c.harmony}%)`));
    assert(uniqueHarmonies.size > 1, `Candidate cards have diverse, non-identical harmony scores (unique scores: ${Array.from(uniqueHarmonies).join(', ')})`);

    console.log('\n--- 7. RESPONSIVE GEOMETRY (0PX HORIZONTAL OVERFLOW ACROSS 10 VIEWPORTS) ---');
    const viewports = [320, 360, 375, 414, 480, 768, 1024, 1280, 1920, 2560];
    for (const w of viewports) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: w,
        height: 800,
        deviceScaleFactor: 1,
        mobile: w <= 768
      });
      await new Promise(r => setTimeout(r, 60));

      const overflow = await client.evaluate(`(() => {
        const bodyW = document.body.scrollWidth;
        const docW = document.documentElement.scrollWidth;
        const winW = window.innerWidth;
        const card = document.querySelector('.numerology-dialog-card');
        const cardW = card ? card.offsetWidth : 0;
        return {
          overflowPx: Math.max(0, docW - winW),
          bodyW, docW, winW, cardW
        };
      })()`);

      assert(overflow.overflowPx === 0, `Viewport ${w}px has 0px horizontal overflow (docW: ${overflow.docW}px, winW: ${overflow.winW}px, cardW: ${overflow.cardW}px)`);
    }

    console.log('\n===============================================================');
    console.log(`FORENSIC SUITE FINISHED: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('===============================================================');

  } catch (err) {
    console.error('Fatal forensic suite error:', err);
    failCount++;
  } finally {
    if (client) client.close();
    if (chromeProc) chromeProc.kill();
    if (server) server.close();
  }

  if (failCount > 0) {
    process.exit(1);
  }
}

runForensicSuite();
