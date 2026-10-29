import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.resolve(__dirname, '..', 'index.html').replace(/\\/g, '/');

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
  }

  async connect() {
    this.ws = new globalThis.WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', reject);
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
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
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result.value;
  }
}

async function main() {
  console.log('======================================================================');
  console.log('ASTROVERSE — VERIFY SIX FORECAST MODES STRICT GATING & GROUNDING');
  console.log('======================================================================\n');

  // Launch local static HTTP server for index.html
  const server = http.createServer((req, res) => {
    let filePath = path.resolve(__dirname, '..', req.url.replace(/^\//, '').split('?')[0]);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.resolve(__dirname, '..', 'index.html');
    }
    const ext = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.svg': 'image/svg+xml'
    };
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });

  const port = 8089;
  await new Promise((resolve) => server.listen(port, resolve));
  console.log(`Local test server running on http://127.0.0.1:${port}`);

  // Launch Chrome
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const cdpPort = 9239;
  const chromeProc = spawn(chromePath, [
    `--remote-debugging-port=${cdpPort}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=1280,900',
    `http://127.0.0.1:${port}/index.html#/kundli`
  ]);

  let passedAll = true;
  let testCount = 0;
  let passCount = 0;

  function assert(title, condition, detail = '') {
    testCount++;
    if (condition) {
      passCount++;
      console.log(`  [PASS] #${testCount} - ${title}`);
    } else {
      passedAll = false;
      console.error(`  [FAIL] #${testCount} - ${title} ${detail ? `(${detail})` : ''}`);
    }
  }

  try {
    // Wait for Chrome CDP endpoint
    let versionInfo = null;
    for (let i = 0; i < 40; i++) {
      try {
        versionInfo = await getJson(`http://127.0.0.1:${cdpPort}/json/version`);
        break;
      } catch (_) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }

    if (!versionInfo) throw new Error('Chrome CDP endpoint failed to respond.');

    const targets = await getJson(`http://127.0.0.1:${cdpPort}/json/list`);
    const pageTarget = targets.find((t) => t.type === 'page');
    const cdp = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('DOM.enable');
    await cdp.send('Runtime.enable');

    // Wait for DOM ready & AstroVerse initialized
    for (let i = 0; i < 30; i++) {
      const ready = await cdp.eval(`typeof switchNavSection === 'function' && typeof selectGuidanceHorizon === 'function'`);
      if (ready) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    await new Promise((r) => setTimeout(r, 300));

    // Ensure Kundli section is active and state is initial NO_PROFILE
    await cdp.eval(`
      switchNavSection('kundli');
      currentCalculatedChart = null;
      setGuidanceState('NO_PROFILE');
    `);
    await new Promise((r) => setTimeout(r, 200));

    console.log('\n--- TEST SUITE 1: Strict Gating Across All 6 Horizons with No Birth Chart ---');
    const horizons = [
      { id: 'hourly', expectedTitle: 'Personalized Hourly (Hora) Guidance Requires Your Birth Chart', allowUniversal: true },
      { id: 'daily', expectedTitle: 'Personalized Daily Forecast Requires Your Birth Chart', allowUniversal: true },
      { id: 'weekly', expectedTitle: 'Personalized Weekly (7 Days) Forecast Requires Your Birth Chart', allowUniversal: true },
      { id: 'monthly', expectedTitle: 'Personalized Monthly (4 Weeks) Analysis Requires Your Birth Chart', allowUniversal: true },
      { id: 'yearly', expectedTitle: 'Personalized Yearly (12 Months) Outlook Requires Your Birth Chart', allowUniversal: true },
      { id: 'mahadasha', expectedTitle: 'Vimshottari Mahadasha Timeline Strictly Requires Your Birth Chart', allowUniversal: false }
    ];

    for (const h of horizons) {
      await cdp.eval(`selectGuidanceHorizon('${h.id}')`);
      await new Promise((r) => setTimeout(r, 150));

      const state = await cdp.eval(`window.astroGuidanceState`);
      const onboardingVisible = await cdp.eval(`document.getElementById('guidance-onboarding-view')?.style.display !== 'none'`);
      const sectionsHidden = await cdp.eval(`document.getElementById('guidance-sections-wrap')?.style.display === 'none'`);
      const cardTitle = await cdp.eval(`document.querySelector('.guidance-onboarding-hero h3')?.textContent?.trim()`);
      const hasCalcBtn = await cdp.eval(`!!document.querySelector('.guidance-onboarding-hero .btn-gold-primary')`);
      const hasPreviewBtn = await cdp.eval(`!!document.querySelector('.guidance-onboarding-hero .btn-outline-secondary')`);

      assert(`${h.id.toUpperCase()}: astroGuidanceState remains 'NO_PROFILE'`, state === 'NO_PROFILE', `got ${state}`);
      assert(`${h.id.toUpperCase()}: Onboarding view is visible`, onboardingVisible);
      assert(`${h.id.toUpperCase()}: Forecast sections wrap is completely hidden`, sectionsHidden);
      assert(`${h.id.toUpperCase()}: Displays expected chart required heading`, cardTitle === h.expectedTitle, `got "${cardTitle}"`);
      assert(`${h.id.toUpperCase()}: "Calculate My Kundli" CTA is present`, hasCalcBtn);

      if (h.allowUniversal) {
        assert(`${h.id.toUpperCase()}: "Explore General Transit Preview" option is available`, hasPreviewBtn);
      } else {
        assert(`${h.id.toUpperCase()}: General transit preview is STRICTLY PROHIBITED for Mahadasha`, !hasPreviewBtn);
      }
    }

    console.log('\n--- TEST SUITE 2: Zero Ungrounded Predictions, Zero Fake Houses in NO_PROFILE ---');
    const fakeHouseMentions = await cdp.eval(`
      (() => {
        const wrap = document.getElementById('guidance-sections-wrap');
        if (!wrap || wrap.style.display === 'none') return 0;
        const text = wrap.textContent || '';
        const match = text.match(/natal House \\d+/gi);
        return match ? match.length : 0;
      })()
    `);
    assert('Zero fake natal house claims visible when no birth chart exists', fakeHouseMentions === 0, `found ${fakeHouseMentions}`);

    console.log('\n--- TEST SUITE 3: Explicit Universal Transit Preview Mode ---');
    // Opt-in to universal preview for Weekly
    await cdp.eval(`enterGeneralTransitPreview('weekly')`);
    await new Promise((r) => setTimeout(r, 300));

    const universalState = await cdp.eval(`window.astroGuidanceState`);
    const universalSectionsVisible = await cdp.eval(`document.getElementById('guidance-sections-wrap')?.style.display !== 'none'`);
    const transitBannerVisible = await cdp.eval(`document.getElementById('guidance-transit-banner')?.style.display !== 'none'`);
    const badgeText = await cdp.eval(`document.getElementById('guidance-grounding-badge')?.textContent?.trim()`);

    assert('Explicit opt-in sets state to GENERAL_TRANSIT_PREVIEW', universalState === 'GENERAL_TRANSIT_PREVIEW');
    assert('Forecast sections wrap is shown in universal preview', universalSectionsVisible);
    assert('Universal transit disclaimer banner is displayed', transitBannerVisible);
    assert('Badge indicates General Solar Transit Guidance', badgeText.includes('General Solar Transit'));

    // Check Weekly period cards: must not claim fake natal houses
    const clientItems = await cdp.eval(`
      (() => {
        const items = buildClientPeriodItems('weekly', '2026-10-29', false, false, false, null, null);
        return items.items;
      })()
    `);
    assert('Weekly items generated 7 day cards in universal preview', Array.isArray(clientItems) && clientItems.length === 7);
    const hasFakeNatalHouses = clientItems.some(item => item.activated_house !== null && item.activated_house !== undefined);
    assert('All 7 weekly cards have activated_house: null (No fake natal house claims)', !hasFakeNatalHouses);

    // If user clicks Mahadasha tab while in GENERAL_TRANSIT_PREVIEW:
    // It must refuse universal mode and immediately fall back to chart-required NO_PROFILE!
    await cdp.eval(`selectGuidanceHorizon('mahadasha')`);
    await new Promise((r) => setTimeout(r, 200));

    const mahadashaFallbackState = await cdp.eval(`window.astroGuidanceState`);
    const mahadashaSectionsHidden = await cdp.eval(`document.getElementById('guidance-sections-wrap')?.style.display === 'none'`);
    const mahadashaHeading = await cdp.eval(`document.querySelector('.guidance-onboarding-hero h3')?.textContent?.trim()`);

    assert('Mahadasha refused universal preview and restored NO_PROFILE state', mahadashaFallbackState === 'NO_PROFILE');
    assert('Mahadasha hid sections wrap', mahadashaSectionsHidden);
    assert('Mahadasha displayed strict chart-required heading', mahadashaHeading.includes('Vimshottari Mahadasha Timeline Strictly Requires'));

    console.log('\n--- TEST SUITE 4: Chart Loaded / Personalized State (100% Natal Grounding) ---');
    // Simulate loading a real chart: "Anand Sharma"
    await cdp.eval(`
      currentCalculatedChart = {
        name: "Anand Sharma",
        gender: "male",
        dob: "1995-06-15",
        tob: "10:30",
        city: "New Delhi, Delhi, India",
        lat: 28.6139,
        lon: 77.2090,
        timezone: "Asia/Kolkata",
        lagnaSign: "Leo",
        moonSign: "Sagittarius",
        nakName: "Uttara Ashadha",
        pada: 1,
        sunSign: "Taurus",
        fullData: {
          vimshottari_dasha: {
            active_now: {
              maha_dasha: "Rahu",
              antar_dasha: "Mercury",
              pratyantar_dasha: "Venus",
              start_date: "2024-03-12",
              end_date: "2026-09-30"
            }
          },
          doshas_and_remedies: {
            sade_sati: { is_active: false, phase: "No Sade Sati" },
            dhaiya: { is_active: false, phase: "No Dhaiya" }
          }
        }
      };
      setGuidanceState('PERSONALIZED_READY', { chart: currentCalculatedChart });
    `);
    await new Promise((r) => setTimeout(r, 300));

    const readyState = await cdp.eval(`window.astroGuidanceState`);
    const readySectionsVisible = await cdp.eval(`document.getElementById('guidance-sections-wrap')?.style.display !== 'none'`);
    const readyBadgeText = await cdp.eval(`document.getElementById('guidance-grounding-badge')?.textContent?.trim()`);
    const activeProfileBarText = await cdp.eval(`document.getElementById('guidance-active-profile-bar')?.textContent?.trim()`);

    assert('Guidance state is PERSONALIZED_READY', readyState === 'PERSONALIZED_READY');
    assert('Sections wrap is visible for personalized chart', readySectionsVisible);
    assert('Badge shows "Chart-Grounded • Leo Lagna • Moon in Sagittarius"', readyBadgeText.includes('Chart-Grounded') && readyBadgeText.includes('Leo Lagna') && readyBadgeText.includes('Moon in Sagittarius'));
    assert('Active profile bar displays Anand Sharma and active Dasha Rahu-Mercury', activeProfileBarText.includes('Anand Sharma') && activeProfileBarText.includes('Rahu-Mercury'));

    // Check personalized weekly period cards: must calculate exact natal houses from Leo Lagna
    const personalizedWeeklyItems = await cdp.eval(`
      (() => {
        const items = buildClientPeriodItems('weekly', '2026-10-29', false, true, true, 'Leo', 'Sagittarius');
        return items.items;
      })()
    `);
    assert('Personalized weekly generates 7 cards', Array.isArray(personalizedWeeklyItems) && personalizedWeeklyItems.length === 7);
    const validHouses = personalizedWeeklyItems.every(i => typeof i.activated_house === 'number' && i.activated_house >= 1 && i.activated_house <= 12);
    assert('All 7 personalized cards have authentic natal house numbers 1-12 calculated from Leo Lagna', validHouses);

    // Check personalized Mahadasha: must return 5-year timeline without requires_chart
    const personalizedMahadasha = await cdp.eval(`
      (() => {
        const items = buildClientPeriodItems('mahadasha', '2026-10-29', false, true, true, 'Leo', 'Sagittarius');
        return items;
      })()
    `);
    assert('Personalized Mahadasha has requires_chart = undefined/false', !personalizedMahadasha.requires_chart);
    assert('Personalized Mahadasha generates 5-year timeline items', Array.isArray(personalizedMahadasha.items) && personalizedMahadasha.items.length === 5);

    console.log('\n--- TEST SUITE 5: Chart Reset Restores Strict Gating Across All Horizons ---');
    await cdp.eval(`
      currentCalculatedChart = null;
      setGuidanceState('NO_PROFILE');
      selectGuidanceHorizon('daily');
    `);
    await new Promise((r) => setTimeout(r, 200));

    const resetState = await cdp.eval(`window.astroGuidanceState`);
    const resetSectionsHidden = await cdp.eval(`document.getElementById('guidance-sections-wrap')?.style.display === 'none'`);
    const resetOnboarding = await cdp.eval(`document.getElementById('guidance-onboarding-view')?.style.display !== 'none'`);

    assert('Resetting chart immediately re-engages NO_PROFILE', resetState === 'NO_PROFILE');
    assert('Forecast sections wrap is hidden after chart reset', resetSectionsHidden);
    assert('Onboarding gating view is restored after chart reset', resetOnboarding);

  } catch (err) {
    console.error('Test execution error:', err);
    passedAll = false;
  } finally {
    try {
      chromeProc.kill('SIGKILL');
      server.close();
    } catch (_) {}
  }

  console.log('\n======================================================================');
  console.log(`RESULTS: ${passCount} / ${testCount} assertions passed.`);
  console.log('======================================================================\n');

  if (!passedAll || passCount !== testCount) {
    process.exit(1);
  }
}

main();
