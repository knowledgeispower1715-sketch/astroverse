import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

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

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      console.error('Console logs:', this.consoleLogs);
      throw new Error(`Eval exception: ${res.exceptionDetails.text} (${JSON.stringify(res.exceptionDetails)})`);
    }
    return res.result?.value;
  }
}

async function main() {
  console.log('======================================================================');
  console.log('ASTROVERSE REAL BROWSER (CDP) GEOCODING & LOCATION RESOLUTION VERIFICATION');
  console.log('======================================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assertPass(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${message}`);
      failedCount++;
    }
  }

  // 1. Static mock/proxy HTTP server simulating production Vercel & Express proxy
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https: blob:; connect-src 'self' https://geocoding-api.open-meteo.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      return res.end();
    }

    const parsedUrl = new URL(req.url, 'http://127.0.0.1:8095');

    // /api/geocode endpoint (simulating wallet-service / kundli-engine)
    if (parsedUrl.pathname === '/api/geocode') {
      const q = (parsedUrl.searchParams.get('q') || '').trim();
      if (q.length < 2) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Query too short', results: [] }));
      }
      // Built-in gazetteer for deterministic fast responses
      const gazetteer = [
        { id: 'gaz-delhi', name: 'Delhi', display_name: 'Delhi, NCT, India', latitude: 28.6519, longitude: 77.2315, country: 'India', country_code: 'IN', region: 'NCT', timezone: 'Asia/Kolkata', precision: 'city', source: 'gazetteer' },
        { id: 'gaz-new-delhi', name: 'New Delhi', display_name: 'New Delhi, Delhi, India', latitude: 28.6139, longitude: 77.2090, country: 'India', country_code: 'IN', region: 'Delhi', timezone: 'Asia/Kolkata', precision: 'city', source: 'gazetteer' },
        { id: 'gaz-jabalpur', name: 'Jabalpur', display_name: 'Jabalpur, Madhya Pradesh, India', latitude: 23.1815, longitude: 79.9864, country: 'India', country_code: 'IN', region: 'Madhya Pradesh', district: 'Jabalpur', timezone: 'Asia/Kolkata', precision: 'city', source: 'gazetteer' },
        { id: 'gaz-london', name: 'London', display_name: 'London, Greater London, United Kingdom', latitude: 51.5074, longitude: -0.1278, country: 'United Kingdom', country_code: 'GB', region: 'England', timezone: 'Europe/London', precision: 'city', source: 'gazetteer' },
        { id: 'gaz-tokyo', name: 'Tokyo', display_name: 'Tokyo, Tokyo, Japan', latitude: 35.6762, longitude: 139.6503, country: 'Japan', country_code: 'JP', region: 'Tokyo', timezone: 'Asia/Tokyo', precision: 'city', source: 'gazetteer' }
      ];
      const qLower = q.toLowerCase();
      const matches = gazetteer.filter(g => g.name.toLowerCase().includes(qLower) || g.display_name.toLowerCase().includes(qLower));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ query: q, results: matches }));
    }

    if (parsedUrl.pathname === '/api/ready') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: 'READY', persistence: 'SUPABASE_CLOUD' }));
    }

    if (parsedUrl.pathname === '/api/config') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ cashfreeAppId: '', isCashfreeConfigured: false }));
    }

    if (parsedUrl.pathname === '/api/complete-kundli') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        d1_rashi_chart: {
          lagna: { sign: 'Taurus', degree: 14.5 },
          planets: {
            Sun: { sign: 'Gemini', degree: 1.2, house: 2 },
            Moon: { sign: 'Capricorn', degree: 22.8, house: 9, nakshatra: 'Shravana', pada: 4 }
          }
        }
      }));
    }

    const filePath = path.resolve('index.html');
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  const serverPort = 8095;
  await new Promise((resolve) => server.listen(serverPort, '127.0.0.1', resolve));

  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
  ];
  const chromePath = chromePaths.find(p => fs.existsSync(p));
  if (!chromePath) {
    console.error('Google Chrome not found in standard paths.');
    server.close();
    process.exit(1);
  }

  const cdpPort = 9245;
  const chromeProc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${cdpPort}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--window-size=1280,800',
    'about:blank'
  ]);

  let cdp;
  try {
    let targets = null;
    for (let i = 0; i < 30; i++) {
      try {
        targets = await getJson(`http://127.0.0.1:${cdpPort}/json`);
        if (targets && targets.length > 0) break;
      } catch (e) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    if (!targets || !targets[0]) throw new Error('Chrome remote debugging did not initialize');

    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    cdp = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');

    // Navigate to homepage
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${serverPort}/` });
    await new Promise((r) => setTimeout(r, 1200));

    // Verify page loaded
    const pageTitle = await cdp.eval('document.title');
    assertPass(pageTitle.includes('AstroVerse'), `Page loaded with title: "${pageTitle}"`);

    // Switch to kundli section
    await cdp.eval(`switchNavSection('kundli');`);
    await new Promise((r) => setTimeout(r, 300));

    // Check DOM elements exist
    const domCheck = await cdp.eval(`({
      input: Boolean(document.getElementById('input-k-city-search')),
      spinner: Boolean(document.getElementById('location-spinner')),
      box: Boolean(document.getElementById('location-suggestions-box')),
      badge: Boolean(document.getElementById('k-location-resolved-badge')),
      resolvedLat: Boolean(document.getElementById('k-resolved-lat')),
      resolvedLon: Boolean(document.getElementById('k-resolved-lon')),
      resolvedTz: Boolean(document.getElementById('k-resolved-tz')),
      manualBox: Boolean(document.getElementById('k-manual-coords-box'))
    })`);
    assertPass(domCheck.input && domCheck.spinner && domCheck.box && domCheck.badge && domCheck.resolvedLat && domCheck.manualBox,
      'All required Janam Kundli location inputs, badges, and coordinate fields present in DOM');

    // TEST 1: Typing "de" triggers search and displays suggestions dropdown
    await cdp.eval(`
      const input = document.getElementById('input-k-city-search');
      input.value = 'de';
      handleLocationSearchInput({ target: input });
    `);
    // Wait for debounce and fetch
    await new Promise((r) => setTimeout(r, 600));

    const suggestionsState1 = await cdp.eval(`({
      display: document.getElementById('location-suggestions-box').style.display,
      itemCount: document.getElementById('location-suggestions-box').querySelectorAll('.location-suggestion-item').length,
      html: document.getElementById('location-suggestions-box').innerText
    })`);
    assertPass(suggestionsState1.display === 'block' && suggestionsState1.itemCount > 0,
      `Typing "de" successfully rendered suggestion dropdown with ${suggestionsState1.itemCount} items`);
    assertPass(suggestionsState1.html.includes('Delhi'),
      `Suggestions box contains "Delhi" (found: ${suggestionsState1.html.replace(/\n/g, ' | ')})`);

    // TEST 2: Keyboard Navigation (ArrowDown and Enter)
    await cdp.eval(`
      handleLocationKeydown({ key: 'ArrowDown', preventDefault: () => {} });
    `);
    const activeSelected = await cdp.eval(`
      Boolean(document.querySelector('.location-suggestion-item.selected'))
    `);
    assertPass(activeSelected, 'ArrowDown keyboard event highlights active suggestion with .selected class');

    await cdp.eval(`
      handleLocationKeydown({ key: 'Enter', preventDefault: () => {} });
    `);
    const resolvedState = await cdp.eval(`({
      inputValue: document.getElementById('input-k-city-search').value,
      lat: document.getElementById('k-resolved-lat').value,
      lon: document.getElementById('k-resolved-lon').value,
      tz: document.getElementById('k-resolved-tz').value,
      badgeDisplay: document.getElementById('k-location-resolved-badge').style.display,
      badgeText: document.getElementById('k-location-resolved-text').textContent,
      boxDisplay: document.getElementById('location-suggestions-box').style.display
    })`);
    assertPass(resolvedState.boxDisplay === 'none', 'Enter selection closes suggestions dropdown');
    assertPass(resolvedState.badgeDisplay === 'flex', 'Enter selection displays verified location badge');
    assertPass(parseFloat(resolvedState.lat) >= 28 && parseFloat(resolvedState.lat) <= 29, `Latitude populated correctly: ${resolvedState.lat}`);
    assertPass(parseFloat(resolvedState.lon) >= 77 && parseFloat(resolvedState.lon) <= 78, `Longitude populated correctly: ${resolvedState.lon}`);
    assertPass(resolvedState.tz === 'Asia/Kolkata', `Timezone populated correctly: ${resolvedState.tz}`);

    // TEST 3: Invalidation on query modification
    await cdp.eval(`{
      const input = document.getElementById('input-k-city-search');
      input.value = 'Delhi changed';
      handleLocationSearchInput({ target: input });
    }`);
    const invalidatedState = await cdp.eval(`({
      lat: document.getElementById('k-resolved-lat').value,
      lon: document.getElementById('k-resolved-lon').value,
      badgeDisplay: document.getElementById('k-location-resolved-badge').style.display
    })`);
    assertPass(invalidatedState.lat === '' && invalidatedState.lon === '' && invalidatedState.badgeDisplay === 'none',
      'Editing birthplace input instantly invalidates prior coordinates and hides resolved badge (anti-stale protection)');

    // TEST 4: Clearing input (< 2 chars) closes dropdown
    await cdp.eval(`{
      const input = document.getElementById('input-k-city-search');
      input.value = '';
      handleLocationSearchInput({ target: input });
    }`);
    const clearedState = await cdp.eval(`
      document.getElementById('location-suggestions-box').style.display
    `);
    assertPass(clearedState === 'none', 'Clearing search input immediately hides suggestion dropdown');

    // TEST 5: Jabalpur Search (specific regression test from user recording)
    await cdp.eval(`{
      const input = document.getElementById('input-k-city-search');
      input.value = 'Jabalpur';
      handleLocationSearchInput({ target: input });
    }`);
    await new Promise((r) => setTimeout(r, 600));

    const jabalpurState = await cdp.eval(`({
      display: document.getElementById('location-suggestions-box').style.display,
      firstItemText: document.querySelector('.location-suggestion-item strong')?.textContent
    })`);
    assertPass(jabalpurState.display === 'block' && jabalpurState.firstItemText === 'Jabalpur',
      'Typing "Jabalpur" correctly displays selectable "Jabalpur" suggestion');

    // Select Jabalpur
    await cdp.eval(`
      document.querySelector('.location-suggestion-item').click();
    `);
    const jabalpurResolved = await cdp.eval(`({
      lat: parseFloat(document.getElementById('k-resolved-lat').value),
      lon: parseFloat(document.getElementById('k-resolved-lon').value),
      tz: document.getElementById('k-resolved-tz').value
    })`);
    assertPass(Math.abs(jabalpurResolved.lat - 23.1815) < 0.1 && Math.abs(jabalpurResolved.lon - 79.9864) < 0.1,
      `Jabalpur resolves to accurate coordinates (${jabalpurResolved.lat}, ${jabalpurResolved.lon}) with timezone ${jabalpurResolved.tz}`);

    // TEST 6: International location (London)
    await cdp.eval(`{
      const input = document.getElementById('input-k-city-search');
      input.value = 'London';
      handleLocationSearchInput({ target: input });
    }`);
    await new Promise((r) => setTimeout(r, 600));

    await cdp.eval(`
      document.querySelector('.location-suggestion-item').click();
    `);
    const londonResolved = await cdp.eval(`({
      lat: parseFloat(document.getElementById('k-resolved-lat').value),
      lon: parseFloat(document.getElementById('k-resolved-lon').value),
      tz: document.getElementById('k-resolved-tz').value
    })`);
    assertPass(Math.abs(londonResolved.lat - 51.5074) < 0.1 && londonResolved.tz === 'Europe/London',
      `International city "London" resolves with Europe/London timezone (${londonResolved.lat}, ${londonResolved.lon})`);

    // TEST 7: Manual Coordinates entry fallback
    await cdp.eval(`{
      toggleManualLocation();
      document.getElementById('k-manual-lat').value = '40.7128';
      document.getElementById('k-manual-lon').value = '-74.0060';
      document.getElementById('k-manual-tz').value = 'America/New_York';
      applyManualCoords();
    }`);
    const manualResolved = await cdp.eval(`({
      lat: parseFloat(document.getElementById('k-resolved-lat').value),
      lon: parseFloat(document.getElementById('k-resolved-lon').value),
      tz: document.getElementById('k-resolved-tz').value,
      badgeText: document.getElementById('k-location-resolved-text').textContent
    })`);
    assertPass(Math.abs(manualResolved.lat - 40.7128) < 0.001 && Math.abs(manualResolved.lon - (-74.0060)) < 0.001 && manualResolved.tz === 'America/New_York',
      `Manual Coordinates Fallback correctly sets WGS84 coordinates and America/New_York timezone`);

    // TEST 8: Milan Kundli Search (Partner Boy & Girl)
    await cdp.eval(`
      switchNavSection('milan');
    `);
    await new Promise((r) => setTimeout(r, 300));

    await cdp.eval(`
      const bInp = document.getElementById('milan-boy-city-search');
      bInp.value = 'Delhi';
      handleMilanCitySearch('boy', { target: bInp });
    `);
    await new Promise((r) => setTimeout(r, 600));

    const milanBoyState = await cdp.eval(`({
      display: document.getElementById('milan-boy-city-suggestions').style.display,
      itemCount: document.getElementById('milan-boy-city-suggestions').querySelectorAll('.location-suggestion-item').length
    })`);
    assertPass(milanBoyState.display === 'block' && milanBoyState.itemCount > 0,
      `Milan Kundli Boy city search renders ${milanBoyState.itemCount} selectable suggestions`);

    await cdp.eval(`
      document.querySelector('#milan-boy-city-suggestions .location-suggestion-item').click();
    `);
    const milanBoyResolved = await cdp.eval(`({
      lat: document.getElementById('milan-boy-lat').value,
      badgeDisplay: document.getElementById('milan-boy-loc-badge').style.display
    })`);
    assertPass(Boolean(milanBoyResolved.lat) && milanBoyResolved.badgeDisplay === 'flex',
      `Milan Kundli Boy selection populates coordinates and shows verified badge`);

  } finally {
    if (cdp) {
      try {
        cdp.ws.close();
      } catch (e) {}
    }
    chromeProc.kill('SIGKILL');
    server.close();
  }

  console.log('\n======================================================================');
  console.log(`BROWSER CDP VERIFICATION: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('======================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('CDP runner failed with error:', err);
  process.exit(1);
});
