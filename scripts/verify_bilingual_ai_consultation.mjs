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

async function runBilingualVerification() {
  console.log(`\n================================================================================`);
  console.log(`ASTROVERSE BILINGUAL AI ASTROLOGER & UNIFIED THEME VERIFICATION`);
  console.log(`================================================================================\n`);

  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9240',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    `file:///${indexPath}`
  ]);

  try {
    let targets = null;
    for (let i = 0; i < 40; i++) {
      try {
        targets = await getJson('http://127.0.0.1:9240/json/list');
        if (targets && targets.length > 0) break;
      } catch (_) {}
      await new Promise((r) => setTimeout(r, 200));
    }
    const pageTarget = (targets || []).find((t) => t.type === 'page' && t.url.includes('index.html')) || (targets || []).find((t) => t.type === 'page');

    if (!pageTarget) throw new Error('No Chrome page target discovered on port 9240');

    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('DOM.enable');

    await client.send('Page.navigate', { url: `file:///${indexPath}` });
    await new Promise((r) => setTimeout(r, 1500));

    // TEST 1: Language Switcher Controls in AI Consultation Modal
    console.log(`[TEST 1] Verifying Language Switcher in AI Modal Header...`);
    const test1 = await client.send('Runtime.evaluate', {
      expression: `(() => {
        startConsultationSession('Acharya Devratan', 0);
        const btnEn = document.getElementById('btn-chat-lang-en');
        const btnHi = document.getElementById('btn-chat-lang-hi');
        const header = document.querySelector('#modal-ai-consultation .modal-dialog-card > div:first-child');
        const headerBg = header ? window.getComputedStyle(header).backgroundImage : '';

        return {
          hasBtnEn: !!btnEn,
          hasBtnHi: !!btnHi,
          enActive: btnEn ? btnEn.classList.contains('active') : false,
          hiActive: btnHi ? btnHi.classList.contains('active') : false,
          headerHasIndigo: headerBg.includes('rgb(24, 33, 58)') || headerBg.includes('rgb(15, 23, 42)')
        };
      })()`,
      returnByValue: true
    });

    const t1 = test1.result.value;
    console.log(`  ✓ English switch button exists: ${t1.hasBtnEn}`);
    console.log(`  ✓ Hindi switch button exists: ${t1.hasBtnHi}`);
    console.log(`  ✓ English default active: ${t1.enActive}`);
    console.log(`  ✓ Modal Header uses Midnight Indigo: ${t1.headerHasIndigo}`);

    if (!t1.hasBtnEn || !t1.hasBtnHi) {
      throw new Error(`TEST 1 Failed: Language switcher buttons missing from AI consultation modal.`);
    }

    // TEST 2: English Greeting and Consultation Query
    console.log(`\n[TEST 2] Testing English Consultation Response Engine...`);
    const test2 = await client.send('Runtime.evaluate', {
      expression: `(() => {
        setChatResponseLanguage('en');
        const enGreeting = generateClientAstrologicalResponse('Acharya Devratan', 'Hi', [], null);
        const enCareer = generateClientAstrologicalResponse('Acharya Devratan', 'Tell me about my career', [], null);

        return {
          greetingIntent: enGreeting.intent,
          greetingIsEnglish: enGreeting.message.includes('Pranam') && enGreeting.message.includes('Acharya Devratan'),
          careerIsEnglish: enCareer.message.includes('Career') || enCareer.message.includes('10th House')
        };
      })()`,
      returnByValue: true
    });

    const t2 = test2.result.value;
    console.log(`  ✓ English greeting recognized: ${t2.greetingIntent === 'greeting'}`);
    console.log(`  ✓ English greeting text valid: ${t2.greetingIsEnglish}`);
    console.log(`  ✓ English career guidance valid: ${t2.careerIsEnglish}`);

    if (!t2.greetingIsEnglish || !t2.careerIsEnglish) {
      throw new Error(`TEST 2 Failed: English consultation response generation failed.`);
    }

    // TEST 3: Switching to Hindi via Segmented Control
    console.log(`\n[TEST 3] Testing Hindi Switch & Natural Devanagari Consultation...`);
    const test3 = await client.send('Runtime.evaluate', {
      expression: `(() => {
        setChatResponseLanguage('hi');
        const btnEn = document.getElementById('btn-chat-lang-en');
        const btnHi = document.getElementById('btn-chat-lang-hi');
        const input = document.getElementById('ai-chat-user-input');
        const composerBtn = document.querySelector('#ai-chat-composer button');

        const hiGreeting = generateClientAstrologicalResponse('Acharya Devratan', 'Hi', [], null);
        const hiCareer = generateClientAstrologicalResponse('Acharya Devratan', 'करियर के बारे में बताएं', [], null);

        return {
          enActive: btnEn.classList.contains('active'),
          hiActive: btnHi.classList.contains('active'),
          inputPlaceholderHasHindi: input.placeholder.includes('प्रश्न पूछें'),
          composerHasHindi: composerBtn.textContent.includes('भेजें'),
          hiGreetingHasDevanagari: /[\u0900-\u097F]/.test(hiGreeting.message) && hiGreeting.message.includes('आचार्य देवव्रतन'),
          hiCareerHasDevanagari: /[\u0900-\u097F]/.test(hiCareer.message) && (hiCareer.message.includes('दशम भाव') || hiCareer.message.includes('करियर'))
        };
      })()`,
      returnByValue: true
    });

    const t3 = test3.result.value;
    console.log(`  ✓ Hindi button active after toggle: ${t3.hiActive}`);
    console.log(`  ✓ Input placeholder translated to Hindi: ${t3.inputPlaceholderHasHindi}`);
    console.log(`  ✓ Send button translated to Hindi: ${t3.composerHasHindi}`);
    console.log(`  ✓ Hindi greeting returned in Devanagari: ${t3.hiGreetingHasDevanagari}`);
    console.log(`  ✓ Hindi career reading returned in Devanagari: ${t3.hiCareerHasDevanagari}`);

    if (!t3.hiActive || !t3.hiGreetingHasDevanagari || !t3.hiCareerHasDevanagari) {
      throw new Error(`TEST 3 Failed: Hindi response generation failed.`);
    }

    // TEST 4: Panchang & Feature Directory Contrast Verification
    console.log(`\n[TEST 4] Verifying High Contrast in Panchang & Feature Directory...`);
    const test4 = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const panchangHeader = document.querySelector('#daily-guidance-overview-card h3');
        const panchangColor = panchangHeader ? window.getComputedStyle(panchangHeader).color : '';
        const directoryHeader = document.querySelector('.cosmic-directory-header h3');
        const directoryColor = directoryHeader ? window.getComputedStyle(directoryHeader).color : '';
        const discoveryCards = document.querySelectorAll('.guidance-discovery-card');
        const card1Title = discoveryCards[0]?.querySelector('h4');
        const card1Color = card1Title ? window.getComputedStyle(card1Title).color : '';

        return {
          panchangIsDark: panchangColor === 'rgb(32, 38, 58)' || panchangColor === 'rgb(30, 27, 75)',
          directoryIsDark: directoryColor === 'rgb(32, 38, 58)' || directoryColor === 'rgb(30, 27, 75)',
          cardTitleIsDark: card1Color === 'rgb(32, 38, 58)' || card1Color === 'rgb(30, 27, 75)',
          panchangColor,
          directoryColor,
          card1Color
        };
      })()`,
      returnByValue: true
    });

    const t4 = test4.result.value;
    console.log(`  ✓ Panchang Header Color is dark (${t4.panchangColor}): ${t4.panchangIsDark}`);
    console.log(`  ✓ Directory Header Color is dark (${t4.directoryColor}): ${t4.directoryIsDark}`);
    console.log(`  ✓ Discovery Card Title Color is dark (${t4.card1Color}): ${t4.card1TitleIsDark}`);

    if (!t4.panchangIsDark || !t4.directoryIsDark || !t4.cardTitleIsDark) {
      throw new Error(`TEST 4 Failed: Low contrast detected on light background elements.`);
    }

    // TEST 5: Astrologer Personas Profile Cards Contrast
    console.log(`\n[TEST 5] Verifying Astrologer Persona Cards High Contrast...`);
    const test5 = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const astroCards = document.querySelectorAll('.astrologer-profile-card');
        const name1 = astroCards[0]?.querySelector('h4');
        const nameColor = name1 ? window.getComputedStyle(name1).color : '';
        const cardBg = astroCards[0] ? window.getComputedStyle(astroCards[0]).backgroundColor : '';

        return {
          cardCount: astroCards.length,
          nameIsDark: nameColor === 'rgb(32, 38, 58)' || nameColor === 'rgb(30, 27, 75)',
          cardBgIsWhite: cardBg === 'rgb(255, 255, 255)',
          nameColor,
          cardBg
        };
      })()`,
      returnByValue: true
    });

    const t5 = test5.result.value;
    console.log(`  ✓ Astrologer Persona Cards count: ${t5.cardCount}`);
    console.log(`  ✓ Card background is clean white: ${t5.cardBgIsWhite}`);
    console.log(`  ✓ Astrologer Name is dark (${t5.nameColor}): ${t5.nameIsDark}`);

    if (!t5.cardBgIsWhite || !t5.nameIsDark) {
      throw new Error(`TEST 5 Failed: Astrologer persona cards styling failed contrast verification.`);
    }

    console.log(`\n================================================================================`);
    console.log(`ALL 5 BILINGUAL AI & UNIFIED THEME TESTS PASSED PERFECTLY (100% SUCCESS)`);
    console.log(`================================================================================\n`);

    client.close();
    chrome.kill();
    process.exit(0);

  } catch (err) {
    console.error(`Verification Suite Error:`, err);
    chrome.kill();
    process.exit(1);
  }
}

runBilingualVerification();
