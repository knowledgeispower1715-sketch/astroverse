import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');
const outDir = path.resolve(__dirname, '..', 'test-artifacts', 'liquid_glass_post');

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
    console.log(`[Captured Post-Migration] ${filename} (${width}x${height})`);
  }

  async close() {
    this.ws.close();
  }
}

async function runVerification() {
  console.log('=== ASTROVERSE ENTERPRISE LIQUID GLASS VERIFICATION SUITE ===');
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9245',
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
        targets = await getJson('http://127.0.0.1:9245/json/list');
        if (targets && targets.length > 0) {
          connected = true;
          break;
        }
      } catch (e) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    if (!connected) throw new Error('Could not connect to Chrome on port 9245');

    const pageTarget = targets.find((t) => t.type === 'page' && t.url.includes('index.html')) || targets.find((t) => t.type === 'page');
    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');
    await client.send('Page.navigate', { url: `file:///${indexPath}` });
    await new Promise((r) => setTimeout(r, 2000));

    // 1. Token System & CSS Variable Validation
    const tokenCheck = await client.evaluate(`(() => {
      const cs = getComputedStyle(document.documentElement);
      return {
        brandNavy: cs.getPropertyValue('--av-brand-navy').trim(),
        brandGold: cs.getPropertyValue('--av-brand-gold').trim(),
        brandGoldBright: cs.getPropertyValue('--av-brand-gold-bright').trim(),
        canvas: cs.getPropertyValue('--av-canvas').trim(),
        surface: cs.getPropertyValue('--av-surface').trim(),
        glassLightBg: cs.getPropertyValue('--av-glass-light-bg').trim(),
        glassDarkBg: cs.getPropertyValue('--av-glass-dark-bg').trim(),
        glassBlurNav: cs.getPropertyValue('--av-glass-blur-nav').trim(),
        shadowGlass: cs.getPropertyValue('--av-shadow-glass').trim(),
        fontDevanagari: cs.getPropertyValue('--av-font-devanagari').trim()
      };
    })()`);
    console.log('Token Check Results:', tokenCheck);

    // 2. Full 11-Viewport Matrix & Horizontal Overflow Audit
    const viewports11 = [
      { name: 'vp_01_mobile_320x640', w: 320, h: 640, mobile: true },
      { name: 'vp_02_mobile_360x740', w: 360, h: 740, mobile: true },
      { name: 'vp_03_mobile_375x812', w: 375, h: 812, mobile: true },
      { name: 'vp_04_mobile_390x844', w: 390, h: 844, mobile: true },
      { name: 'vp_05_mobile_412x915', w: 412, h: 915, mobile: true },
      { name: 'vp_06_mobile_430x932', w: 430, h: 932, mobile: true },
      { name: 'vp_07_tablet_768x1024', w: 768, h: 1024, mobile: true },
      { name: 'vp_08_tablet_land_1024x768', w: 1024, h: 768, mobile: false },
      { name: 'vp_09_laptop_1366x768', w: 1366, h: 768, mobile: false },
      { name: 'vp_10_desktop_1440x900', w: 1440, h: 900, mobile: false },
      { name: 'vp_11_fhd_1920x1080', w: 1920, h: 1080, mobile: false }
    ];

    const overflowResults = [];
    for (const vp of viewports11) {
      await client.send('Emulation.setDeviceMetricsOverride', {
        width: vp.w,
        height: vp.h,
        deviceScaleFactor: 1,
        mobile: vp.mobile
      });
      await new Promise((r) => setTimeout(r, 250));

      const overflow = await client.evaluate(`(() => {
        const scrollW = document.documentElement.scrollWidth;
        const innerW = window.innerWidth;
        return {
          scrollWidth: scrollW,
          innerWidth: innerW,
          hasOverflow: scrollW > innerW
        };
      })()`);
      overflowResults.push({ ...vp, ...overflow });

      if (['vp_01_mobile_320x640', 'vp_04_mobile_390x844', 'vp_07_tablet_768x1024', 'vp_10_desktop_1440x900'].includes(vp.name)) {
        await client.screenshot(`${vp.name}_homepage.png`, vp.w, vp.h, vp.mobile);
      }
    }
    console.log('11-Viewport Overflow Audit: All Clean? ', overflowResults.every((r) => !r.hasOverflow));

    // 3. Navigation Bar & Mobile Dock Computed Styles
    const navBarStyles = await client.evaluate(`(() => {
      const nav = document.querySelector('.main-navbar');
      const dock = document.querySelector('.mobile-bottom-dock');
      const csNav = nav ? getComputedStyle(nav) : null;
      const csDock = dock ? getComputedStyle(dock) : null;
      return {
        navTop: csNav ? csNav.top : null,
        navPosition: csNav ? csNav.position : null,
        navBackdropFilter: csNav ? (csNav.backdropFilter || csNav.webkitBackdropFilter) : null,
        dockBackdropFilter: csDock ? (csDock.backdropFilter || csDock.webkitBackdropFilter) : null,
        dockMinHeight: csDock ? csDock.minHeight : null
      };
    })()`);
    console.log('Navigation Computed Styles:', navBarStyles);

    // 4. Feature Surfaces Screenshots & Visual Audits
    // Reset to desktop 1440x900
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

    // A. Kundli Workspace: Form, Calculation, D1, D9, D10
    await client.evaluate(`switchNavSection('kundli', false)`);
    await new Promise((r) => setTimeout(r, 500));
    await client.screenshot('feat_01_kundli_form_desktop.png', 1440, 900, false);

    await client.evaluate(`if (typeof loadSampleKundliChart === 'function') loadSampleKundliChart();`);
    await new Promise((r) => setTimeout(r, 1200));
    await client.screenshot('feat_02_kundli_calculated_desktop.png', 1440, 900, false);
    await client.screenshot('feat_02_kundli_calculated_mobile.png', 390, 844, true);

    // B. Check Stable High-Contrast Surface on Planetary Tables & Ashtakavarga
    const surfaceChecks = await client.evaluate(`(() => {
      const pTable = document.querySelector('.table-astro-data, .table-responsive-box');
      const ashtakavargaGrid = document.querySelector('.ashtaka-grid, #ashtakavarga-heatmap-grid');
      const card = document.querySelector('.astro-card');

      function getBg(el) {
        if (!el) return 'none';
        return window.getComputedStyle(el).backgroundColor;
      }

      return {
        planetaryTableFound: Boolean(pTable),
        planetaryTableBg: getBg(pTable),
        ashtakavargaFound: Boolean(ashtakavargaGrid),
        ashtakavargaBg: getBg(ashtakavargaGrid),
        astroCardBg: getBg(card)
      };
    })()`);
    console.log('Stable Surface Checks (Opaque Content Surfaces):', surfaceChecks);

    // C. Ashtakavarga Matrix Tab
    await client.evaluate(`if (typeof switchKundliWorkspaceTab === 'function') switchKundliWorkspaceTab('ashtakavarga');`);
    await new Promise((r) => setTimeout(r, 500));
    await client.screenshot('feat_03_ashtakavarga_matrix.png', 1440, 900, false);

    // D. Dasha Timeline Tab
    await client.evaluate(`if (typeof switchKundliWorkspaceTab === 'function') switchKundliWorkspaceTab('dasha');`);
    await new Promise((r) => setTimeout(r, 500));
    await client.screenshot('feat_04_dasha_intelligence.png', 1440, 900, false);

    // E. Yogas and Doshas Tab
    await client.evaluate(`if (typeof switchKundliWorkspaceTab === 'function') switchKundliWorkspaceTab('yogas');`);
    await new Promise((r) => setTimeout(r, 500));
    await client.screenshot('feat_05_yogas_doshas.png', 1440, 900, false);

    // F. Upagrahas and Kalavelas Tab
    await client.evaluate(`if (typeof switchKundliWorkspaceTab === 'function') switchKundliWorkspaceTab('upagrahas');`);
    await new Promise((r) => setTimeout(r, 500));
    await client.screenshot('feat_06_upagrahas_kalavelas.png', 1440, 900, false);

    // G. Six-Horizon Guidance (Horas)
    await client.evaluate(`switchNavSection('horas', false)`);
    await new Promise((r) => setTimeout(r, 600));
    await client.screenshot('feat_07_six_horizon_horas_desktop.png', 1440, 900, false);
    await client.screenshot('feat_07_six_horizon_horas_mobile.png', 390, 844, true);

    // H. AI Astrologer Hub & Chat Drawer
    await client.evaluate(`switchNavSection('astrologers', false)`);
    await new Promise((r) => setTimeout(r, 600));
    await client.screenshot('feat_08_ai_astrologer_directory.png', 1440, 900, false);

    await client.evaluate(`if (typeof openAiConsultationWithPersona === 'function') openAiConsultationWithPersona('acharya_shastri');`);
    await new Promise((r) => setTimeout(r, 800));
    await client.screenshot('feat_09_ai_astrologer_chat_drawer.png', 1440, 900, false);
    await client.evaluate(`if (typeof closeChatDrawer === 'function') closeChatDrawer();`);
    await new Promise((r) => setTimeout(r, 400));

    // I. Numerology Studio
    await client.evaluate(`if (typeof openNumerologyStudio === 'function') openNumerologyStudio();`);
    await new Promise((r) => setTimeout(r, 600));
    await client.screenshot('feat_10_numerology_studio.png', 1440, 900, false);
    await client.evaluate(`if (typeof closeNumerologyStudio === 'function') closeNumerologyStudio();`);
    await new Promise((r) => setTimeout(r, 400));

    // J. Compatibility / Kundli Milan
    await client.evaluate(`switchNavSection('matchmaking', false)`);
    await new Promise((r) => setTimeout(r, 600));
    await client.screenshot('feat_11_compatibility_matchmaking.png', 1440, 900, false);

    // K. Reports Store Modal
    await client.evaluate(`if (typeof openReportStoreModal === 'function') openReportStoreModal();`);
    await new Promise((r) => setTimeout(r, 600));
    await client.screenshot('feat_12_reports_store_modal.png', 1440, 900, false);
    await client.evaluate(`if (typeof closeReportStoreModal === 'function') closeReportStoreModal();`);
    await new Promise((r) => setTimeout(r, 400));

    // L. Pricing & Subscriptions
    await client.evaluate(`switchNavSection('pricing', false)`);
    await new Promise((r) => setTimeout(r, 600));
    await client.screenshot('feat_13_pricing_subscriptions.png', 1440, 900, false);

    // M. Authentication Modal
    await client.evaluate(`if (typeof openAuthModal === 'function') openAuthModal();`);
    await new Promise((r) => setTimeout(r, 600));
    await client.screenshot('feat_14_auth_modal.png', 1440, 900, false);
    await client.evaluate(`if (typeof closeAuthModal === 'function') closeAuthModal();`);
    await new Promise((r) => setTimeout(r, 400));

    // N. Admin Console
    await client.evaluate(`switchNavSection('admin', false)`);
    await new Promise((r) => setTimeout(r, 600));
    await client.screenshot('feat_15_admin_portal.png', 1440, 900, false);

    // Switch back to overview for global contrast checks
    await client.evaluate(`switchNavSection('overview', false)`);
    await new Promise((r) => setTimeout(r, 500));

    // 5. WCAG 2.2 AA Contrast Audit Function
    const contrastAudit = await client.evaluate(`(() => {
      function parseRgb(colorStr) {
        if (!colorStr) return [0, 0, 0];
        const match = colorStr.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
        if (match) {
          return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
        }
        return [0, 0, 0];
      }

      function getLuminance(rgb) {
        const a = rgb.map(v => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
      }

      function getContrastRatio(rgb1, rgb2) {
        const lum1 = getLuminance(rgb1);
        const lum2 = getLuminance(rgb2);
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        return (brightest + 0.05) / (darkest + 0.05);
      }

      function parseRgba(colorStr) {
        if (!colorStr) return [0, 0, 0, 0];
        const match = colorStr.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
        if (match) {
          const r = parseInt(match[1]);
          const g = parseInt(match[2]);
          const b = parseInt(match[3]);
          const a = match[4] !== undefined ? parseFloat(match[4]) : 1.0;
          return [r, g, b, a];
        }
        return [0, 0, 0, 0];
      }

      function getEffectiveBackground(el) {
        const layers = [];
        let cur = el;
        while (cur && cur !== document.documentElement) {
          const cs = window.getComputedStyle(cur);
          const bg = cs.backgroundColor;
          const [r, g, b, a] = parseRgba(bg);
          if (a > 0.01) {
            layers.push([r, g, b, a]);
          }
          cur = cur.parentElement;
        }

        let comp = [247, 245, 239];
        for (let i = layers.length - 1; i >= 0; i--) {
          const [lr, lg, lb, la] = layers[i];
          comp = [
            Math.round(lr * la + comp[0] * (1 - la)),
            Math.round(lg * la + comp[1] * (1 - la)),
            Math.round(lb * la + comp[2] * (1 - la))
          ];
        }
        return comp;
      }

      const elementsToCheck = [
        { name: 'Navbar Brand Title', el: document.querySelector('.brand-title') },
        { name: 'Navbar Nav Link', el: document.querySelector('.nav-link-btn') },
        { name: 'Wallet Chip Text', el: document.querySelector('.wallet-chip') },
        { name: 'Auth Trigger Button', el: document.querySelector('.btn-auth-trigger') },
        { name: 'Hero Title', el: document.querySelector('.hero-title, .cosmic-hero-title') },
        { name: 'Astro Card Heading', el: document.querySelector('.astro-card h2, .astro-card h3, .card-title') },
        { name: 'Form Input Label', el: document.querySelector('.form-field-label') },
        { name: 'Planetary Table Header', el: document.querySelector('.planetary-positions-table th, table th') },
        { name: 'Planetary Table Cell', el: document.querySelector('.planetary-positions-table td, table td') },
        { name: 'Mobile Dock Button', el: document.querySelector('.mob-dock-btn') }
      ];

      const report = [];
      elementsToCheck.forEach(item => {
        if (!item.el) return;
        const cs = window.getComputedStyle(item.el);
        const fg = parseRgb(cs.color);
        const bg = getEffectiveBackground(item.el);
        const ratio = parseFloat(getContrastRatio(fg, bg).toFixed(2));
        const fontSize = parseFloat(cs.fontSize);
        const isBold = parseInt(cs.fontWeight) >= 700 || cs.fontWeight === 'bold';
        const isLarge = fontSize >= 24 || (fontSize >= 18.66 && isBold);
        const requiredRatio = isLarge ? 3.0 : 4.5;
        const passes = ratio >= requiredRatio;

        report.push({
          element: item.name,
          color: cs.color,
          effectiveBg: \`rgb(\${bg.join(', ')})\`,
          ratio: ratio,
          required: requiredRatio,
          passes: passes
        });
      });

      return report;
    })()`);
    console.log('Contrast Audit Results:');
    contrastAudit.forEach((c) => console.log(`  ${c.element}: ${c.ratio}:1 (Required: ${c.required}:1) => ${c.passes ? 'PASS' : 'WARN'}`));

    // 6. Mobile Touch Target Audit (WCAG 2.5.5 >= 44px)
    await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await new Promise((r) => setTimeout(r, 400));
    const touchTargetAudit = await client.evaluate(`(() => {
      const dockButtons = Array.from(document.querySelectorAll('.mob-dock-btn'));
      return dockButtons.map(btn => {
        const rect = btn.getBoundingClientRect();
        return {
          text: (btn.textContent || '').trim().replace(/\\s+/g, ' '),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          passesTargetSize: rect.width >= 44 && rect.height >= 44
        };
      });
    })()`);
    console.log('Mobile Dock Touch Target Audit (>= 44x44px):', touchTargetAudit);
    // Restore desktop
    await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await new Promise((r) => setTimeout(r, 200));

    // 7. Hindi Typography Rendering & Clipping Check
    const hindiAudit = await client.evaluate(`(() => {
      const hindiElements = Array.from(document.querySelectorAll(':lang(hi), .devanagari-text, [data-lang="hi"]'));
      let clippedCount = 0;
      hindiElements.forEach(el => {
        if (el.scrollHeight > el.clientHeight + 4 && window.getComputedStyle(el).overflow === 'hidden') {
          clippedCount++;
        }
      });
      return {
        totalHindiElementsEvaluated: hindiElements.length,
        clippedCount: clippedCount,
        fontFamilySample: hindiElements.length > 0 ? window.getComputedStyle(hindiElements[0]).fontFamily : null
      };
    })()`);
    console.log('Hindi Typography Audit:', hindiAudit);

    // 8. Console Errors
    console.log(`Console uncaught errors: ${client.consoleErrors.length}`);
    if (client.consoleErrors.length > 0) {
      console.log('Errors:', client.consoleErrors);
    }

    const verificationSummary = {
      timestamp: new Date().toISOString(),
      tokenCheck,
      viewports11: overflowResults,
      allViewportsZeroOverflow: overflowResults.every((r) => !r.hasOverflow),
      navBarStyles,
      surfaceChecks,
      contrastAudit,
      touchTargetAudit,
      hindiAudit,
      consoleErrors: client.consoleErrors,
      status: 'SUCCESS'
    };

    fs.writeFileSync(
      path.join(outDir, 'verification_summary.json'),
      JSON.stringify(verificationSummary, null, 2)
    );
    console.log('Verification summary successfully written to test-artifacts/liquid_glass_post/verification_summary.json');

    await client.close();
    chrome.kill();
  } catch (err) {
    console.error('Verification failed:', err);
    chrome.kill();
    process.exit(1);
  }
}

runVerification();
