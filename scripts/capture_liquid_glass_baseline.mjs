import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const outDir = path.resolve(__dirname, '..', 'test-artifacts', 'liquid_glass_baseline');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

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
    this.events = [];
    this.consoleErrors = [];
  }

  async connect() {
    this.ws = new globalThis.WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', reject);
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.exceptionThrown') {
        this.consoleErrors.push(msg.params.exceptionDetails);
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

  async screenshot(filename, width = 1440, height = 900, mobile = false) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile
    });
    await new Promise((r) => setTimeout(r, 400));
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, filename), Buffer.from(res.data, 'base64'));
    console.log(`[Captured] ${filename} (${width}x${height})`);
  }

  async close() {
    this.ws.close();
  }
}

async function runBaselineAudit() {
  console.log('=== ASTROVERSE LIQUID GLASS BASELINE AUDIT ===');
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9244',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    `file:///${indexPath}`
  ]);

  try {
    let connected = false;
    let targets = null;
    for (let i = 0; i < 30; i++) {
      try {
        targets = await getJson('http://127.0.0.1:9244/json/list');
        if (targets && targets.length > 0) {
          connected = true;
          break;
        }
      } catch (e) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    if (!connected) throw new Error('Could not connect to Chrome on port 9244');

    const pageTarget = targets.find((t) => t.type === 'page' && t.url.includes('index.html')) || targets.find((t) => t.type === 'page');
    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');
    await client.send('Page.navigate', { url: `file:///${indexPath}` });
    await new Promise((r) => setTimeout(r, 2000));

    // 1. Initial State Check
    const initialCheck = await client.evaluate(`({
      title: document.title,
      hasNavigation: Boolean(document.getElementById('main-nav-bar') || document.querySelector('header')),
      currentActiveNavSection: window.currentActiveNavSection || 'overview',
      themeTokensLoaded: Boolean(getComputedStyle(document.documentElement).getPropertyValue('--av-brand-gold') || getComputedStyle(document.documentElement).getPropertyValue('--brand-gold'))
    })`);
    console.log('Initial page state:', initialCheck);

    // 2. Capture Viewports for Homepage (Overview)
    const viewports = [
      { name: '01_homepage_desktop_1440.png', w: 1440, h: 900, mobile: false },
      { name: '01_homepage_laptop_1024.png', w: 1024, h: 768, mobile: false },
      { name: '01_homepage_tablet_768.png', w: 768, h: 1024, mobile: true },
      { name: '01_homepage_mobile_390.png', w: 390, h: 844, mobile: true },
      { name: '01_homepage_mobile_360.png', w: 360, h: 740, mobile: true },
      { name: '01_homepage_mobile_320.png', w: 320, h: 640, mobile: true }
    ];

    for (const vp of viewports) {
      await client.screenshot(vp.name, vp.w, vp.h, vp.mobile);
    }

    // 3. Capture Navigation Chrome (Header & Mobile Dock)
    await client.screenshot('02_navigation_desktop_header.png', 1440, 400, false);
    await client.screenshot('02_navigation_mobile_dock.png', 390, 844, true);

    // 4. Kundli Tab - Input & Form
    await client.evaluate(`switchNavSection('kundli', false)`);
    await new Promise((r) => setTimeout(r, 500));
    await client.screenshot('03_kundli_input_form_desktop.png', 1440, 900, false);
    await client.screenshot('03_kundli_input_form_mobile.png', 390, 844, true);

    // Calculate Sample Kundli
    await client.evaluate(`if (typeof loadSampleKundliChart === 'function') loadSampleKundliChart();`);
    await new Promise((r) => setTimeout(r, 1200));
    await client.screenshot('04_kundli_calculated_result_desktop.png', 1440, 900, false);
    await client.screenshot('04_kundli_calculated_result_mobile.png', 390, 844, true);

    // Kundli Divisional Charts & Ashtakavarga
    await client.evaluate(`if (typeof switchKundliWorkspaceTab === 'function') switchKundliWorkspaceTab('ashtakavarga');`);
    await new Promise((r) => setTimeout(r, 500));
    await client.screenshot('05_kundli_ashtakavarga_matrix.png', 1440, 900, false);

    // Kundli Dasha Timeline
    await client.evaluate(`if (typeof switchKundliWorkspaceTab === 'function') switchKundliWorkspaceTab('dasha');`);
    await new Promise((r) => setTimeout(r, 500));
    await client.screenshot('06_kundli_dasha_timeline.png', 1440, 900, false);

    // Kundli Yogas and Doshas
    await client.evaluate(`if (typeof switchKundliWorkspaceTab === 'function') switchKundliWorkspaceTab('yogas');`);
    await new Promise((r) => setTimeout(r, 500));
    await client.screenshot('07_kundli_yogas_and_doshas.png', 1440, 900, false);

    // Kundli Upagrahas & Kalavelas
    await client.evaluate(`if (typeof switchKundliWorkspaceTab === 'function') switchKundliWorkspaceTab('upagrahas');`);
    await new Promise((r) => setTimeout(r, 500));
    await client.screenshot('08_kundli_upagrahas_kalavelas.png', 1440, 900, false);

    // 5. Six-Horizon Guidance
    await client.evaluate(`switchNavSection('horas', false)`);
    await new Promise((r) => setTimeout(r, 600));
    await client.screenshot('09_guidance_horas_desktop.png', 1440, 900, false);
    await client.screenshot('09_guidance_horas_mobile.png', 390, 844, true);

    // 6. AI Astrologer Hub & Chat
    await client.evaluate(`switchNavSection('astrologers', false)`);
    await new Promise((r) => setTimeout(r, 600));
    await client.screenshot('10_ai_astrologer_directory_desktop.png', 1440, 900, false);
    await client.screenshot('10_ai_astrologer_directory_mobile.png', 390, 844, true);

    // Open AI Chat Drawer
    await client.evaluate(`if (typeof openAiConsultationWithPersona === 'function') openAiConsultationWithPersona('acharya_shastri');`);
    await new Promise((r) => setTimeout(r, 800));
    await client.screenshot('11_ai_astrologer_chat_drawer_desktop.png', 1440, 900, false);
    await client.screenshot('11_ai_astrologer_chat_drawer_mobile.png', 390, 844, true);
    await client.evaluate(`if (typeof closeChatDrawer === 'function') closeChatDrawer();`);
    await new Promise((r) => setTimeout(r, 400));

    // 7. Numerology Studio
    await client.evaluate(`if (typeof openNumerologyStudio === 'function') openNumerologyStudio();`);
    await new Promise((r) => setTimeout(r, 600));
    await client.screenshot('12_numerology_studio_desktop.png', 1440, 900, false);
    await client.screenshot('12_numerology_studio_mobile.png', 390, 844, true);
    await client.evaluate(`if (typeof closeNumerologyStudio === 'function') closeNumerologyStudio();`);
    await new Promise((r) => setTimeout(r, 400));

    // 8. Compatibility / Kundli Milan
    await client.evaluate(`switchNavSection('matchmaking', false)`);
    await new Promise((r) => setTimeout(r, 600));
    await client.screenshot('13_compatibility_matchmaking_desktop.png', 1440, 900, false);
    await client.screenshot('13_compatibility_matchmaking_mobile.png', 390, 844, true);

    // 9. Reports Store Modal
    await client.evaluate(`if (typeof openReportStoreModal === 'function') openReportStoreModal();`);
    await new Promise((r) => setTimeout(r, 600));
    await client.screenshot('14_reports_store_modal_desktop.png', 1440, 900, false);
    await client.screenshot('14_reports_store_modal_mobile.png', 390, 844, true);
    await client.evaluate(`if (typeof closeReportStoreModal === 'function') closeReportStoreModal();`);
    await new Promise((r) => setTimeout(r, 400));

    // 10. Pricing & Subscriptions
    await client.evaluate(`switchNavSection('pricing', false)`);
    await new Promise((r) => setTimeout(r, 600));
    await client.screenshot('15_pricing_subscriptions_desktop.png', 1440, 900, false);

    // 11. Authentication Modal
    await client.evaluate(`if (typeof openAuthModal === 'function') openAuthModal();`);
    await new Promise((r) => setTimeout(r, 600));
    await client.screenshot('16_authentication_modal_desktop.png', 1440, 900, false);
    await client.screenshot('16_authentication_modal_mobile.png', 390, 844, true);
    await client.evaluate(`if (typeof closeAuthModal === 'function') closeAuthModal();`);
    await new Promise((r) => setTimeout(r, 400));

    // 12. Admin Console
    await client.evaluate(`switchNavSection('admin', false)`);
    await new Promise((r) => setTimeout(r, 600));
    await client.screenshot('17_admin_portal_desktop.png', 1440, 900, false);

    // 13. Audit horizontal overflow and style defects
    const styleAudit = await client.evaluate(`(() => {
      const defects = [];
      const viewportsToAudit = [1440, 768, 390, 320];

      // Check current scrollWidth vs innerWidth
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      const hasHOverflow = docW > winW;

      // Check all buttons for zero size or missing text
      const buttons = Array.from(document.querySelectorAll('button, .btn, a.btn-gold-primary'));
      let unreadableButtons = 0;
      buttons.forEach(b => {
        const text = (b.textContent || '').trim();
        const rect = b.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && !text && !b.querySelector('i, svg, img')) {
          unreadableButtons++;
        }
      });

      return {
        hasHorizontalOverflow: hasHOverflow,
        documentScrollWidth: docW,
        windowInnerWidth: winW,
        totalButtonsChecked: buttons.length,
        unreadableButtonsCount: unreadableButtons,
        uncaughtErrorsCount: window.__astroErrors ? window.__astroErrors.length : 0
      };
    })()`);
    console.log('Style & Overflow Audit Results:', styleAudit);

    console.log(`Console uncaught errors: ${client.consoleErrors.length}`);
    if (client.consoleErrors.length > 0) {
      console.log('Errors:', client.consoleErrors);
    }

    const baselineData = {
      timestamp: new Date().toISOString(),
      initialCheck,
      styleAudit,
      consoleErrors: client.consoleErrors,
      capturedScreenshotsCount: 28
    };

    fs.writeFileSync(
      path.join(outDir, 'baseline_summary.json'),
      JSON.stringify(baselineData, null, 2)
    );
    console.log('Baseline summary written to baseline_summary.json');

    await client.close();
    chrome.kill();
  } catch (err) {
    console.error('Audit failed:', err);
    chrome.kill();
    process.exit(1);
  }
}

runBaselineAudit();
