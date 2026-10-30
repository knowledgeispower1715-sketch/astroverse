import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import app, { resolveGeocodeQuery } from '../src/server';

function makeRequest(server: http.Server, path: string): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    if (!addr || typeof addr === 'string') return reject(new Error('Server not listening'));
    const req = http.request({
      hostname: '127.0.0.1',
      port: addr.port,
      path,
      method: 'GET',
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        let body: any = raw;
        try { body = JSON.parse(raw); } catch (e) {}
        resolve({ status: res.statusCode || 500, body, headers: res.headers });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('ASTROVERSE GEOCODING & LOCATION RESOLUTION AUTOMATED SUITE');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;

  function pass(msg: string) {
    console.log(`[PASS] ${msg}`);
    passed++;
  }

  function fail(msg: string, err: any) {
    console.error(`[FAIL] ${msg}:`, err);
    failed++;
  }

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));

  try {
    // 1. Content Security Policy Header in Server
    try {
      const res = await makeRequest(server, '/api/health');
      const csp = res.headers['content-security-policy'] as string;
      assert.ok(csp, 'CSP header must be present');
      assert.ok(csp.includes('https://geocoding-api.open-meteo.com'), 'CSP must whitelist https://geocoding-api.open-meteo.com in connect-src');
      pass('Server CSP connect-src whitelists https://geocoding-api.open-meteo.com');
    } catch (e) {
      fail('Server CSP connect-src whitelists https://geocoding-api.open-meteo.com', e);
    }

    // 2. Content Security Policy Header in vercel.json
    try {
      const vercelJsonPath = path.resolve(__dirname, '../../../vercel.json');
      const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
      const globalHeaderRule = vercelJson.headers.find((h: any) => h.source === '/(.*)');
      assert.ok(globalHeaderRule, 'Global header rule must exist in vercel.json');
      const cspHeader = globalHeaderRule.headers.find((hdr: any) => hdr.key === 'Content-Security-Policy');
      assert.ok(cspHeader, 'CSP header must exist in vercel.json');
      assert.ok(cspHeader.value.includes('https://geocoding-api.open-meteo.com'), 'vercel.json CSP must include https://geocoding-api.open-meteo.com');
      pass('vercel.json CSP connect-src whitelists https://geocoding-api.open-meteo.com');
    } catch (e) {
      fail('vercel.json CSP connect-src whitelists https://geocoding-api.open-meteo.com', e);
    }

    // 3. /api/geocode validation: min_length check
    try {
      const res = await makeRequest(server, '/api/geocode?q=a');
      assert.strictEqual(res.status, 400);
      assert.ok(res.body.error, 'Short query should produce error');
      pass('GET /api/geocode rejects query with length < 2 with HTTP 400');
    } catch (e) {
      fail('GET /api/geocode rejects query with length < 2 with HTTP 400', e);
    }

    // 4. /api/geocode resolution for Indian cities (Delhi, Jabalpur)
    try {
      const res = await makeRequest(server, '/api/geocode?q=Delhi');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.query, 'Delhi');
      assert.ok(Array.isArray(res.body.results), 'results must be an array');
      assert.ok(res.body.results.length > 0, 'Delhi results should not be empty');
      const delhi = res.body.results[0];
      assert.ok(delhi.name.toLowerCase().includes('delhi'), 'Location name must match query');
      assert.strictEqual(delhi.timezone, 'Asia/Kolkata', 'Delhi timezone must be Asia/Kolkata');
      assert.ok(delhi.latitude >= 28 && delhi.latitude <= 29, `Delhi latitude should be ~28.6 (got ${delhi.latitude})`);
      assert.ok(delhi.longitude >= 77 && delhi.longitude <= 78, `Delhi longitude should be ~77.2 (got ${delhi.longitude})`);
      pass('GET /api/geocode resolves "Delhi" with WGS84 coordinates and Asia/Kolkata timezone');
    } catch (e) {
      fail('GET /api/geocode resolves "Delhi" with WGS84 coordinates and Asia/Kolkata timezone', e);
    }

    // 5. /api/geocode resolution for Jabalpur (the previous default fallback)
    try {
      const res = await makeRequest(server, '/api/geocode?q=Jabalpur');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.results.length > 0, 'Jabalpur results should not be empty');
      const jabalpur = res.body.results[0];
      assert.ok(jabalpur.name.toLowerCase().includes('jabalpur'), 'Location name must match query');
      assert.strictEqual(jabalpur.timezone, 'Asia/Kolkata', 'Jabalpur timezone must be Asia/Kolkata');
      assert.ok(Math.abs(jabalpur.latitude - 23.18) < 0.2, `Jabalpur latitude should be ~23.18 (got ${jabalpur.latitude})`);
      assert.ok(Math.abs(jabalpur.longitude - 79.98) < 0.2, `Jabalpur longitude should be ~79.98 (got ${jabalpur.longitude})`);
      pass('GET /api/geocode resolves "Jabalpur" with accurate coordinates');
    } catch (e) {
      fail('GET /api/geocode resolves "Jabalpur" with accurate coordinates', e);
    }

    // 6. /api/geocode international cities (London, New York, Tokyo)
    try {
      const res = await makeRequest(server, '/api/geocode?q=London');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.results.length > 0, 'London results should not be empty');
      const london = res.body.results.find((r: any) => r.country.toLowerCase().includes('united kingdom') || r.country_code === 'GB') || res.body.results[0];
      assert.strictEqual(london.timezone, 'Europe/London', 'London timezone must be Europe/London');
      assert.ok(Math.abs(london.latitude - 51.5) < 0.5, `London latitude should be ~51.5 (got ${london.latitude})`);
      assert.ok(Math.abs(london.longitude - (-0.12)) < 0.5, `London longitude should be ~-0.12 (got ${london.longitude})`);
      pass('GET /api/geocode resolves international city "London" with Europe/London timezone');
    } catch (e) {
      fail('GET /api/geocode resolves international city "London" with Europe/London timezone', e);
    }

    // 7. /api/geocode Canonical Location Data Model completeness
    try {
      const res = await makeRequest(server, '/api/geocode?q=Tokyo');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.results.length > 0);
      const tokyo = res.body.results[0];
      assert.ok(tokyo.id, 'id is required');
      assert.ok(tokyo.name, 'name is required');
      assert.ok(tokyo.display_name, 'display_name is required');
      assert.ok(typeof tokyo.latitude === 'number', 'latitude must be number');
      assert.ok(typeof tokyo.longitude === 'number', 'longitude must be number');
      assert.ok(tokyo.latitude >= -90 && tokyo.latitude <= 90, 'latitude must be in [-90, 90]');
      assert.ok(tokyo.longitude >= -180 && tokyo.longitude <= 180, 'longitude must be in [-180, 180]');
      assert.ok(tokyo.timezone, 'timezone is required');
      assert.ok(tokyo.source, 'source is required');
      assert.ok(tokyo.resolved_at, 'resolved_at timestamp is required');
      pass('Canonical Location schema contains all required attributes and bounded WGS84 coordinates');
    } catch (e) {
      fail('Canonical Location schema contains all required attributes and bounded WGS84 coordinates', e);
    }

    // 8. In-memory caching: second call is lightning fast and returns identical data
    try {
      const t1 = Date.now();
      const res1 = await makeRequest(server, '/api/geocode?q=Paris');
      const duration1 = Date.now() - t1;

      const t2 = Date.now();
      const res2 = await makeRequest(server, '/api/geocode?q=Paris');
      const duration2 = Date.now() - t2;

      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res2.status, 200);
      assert.deepStrictEqual(res1.body, res2.body, 'Cached response must match original response');
      assert.ok(duration2 <= duration1 + 20, 'Second call must be served from cache');
      pass('GET /api/geocode LRU cache serves identical payload with negligible latency');
    } catch (e) {
      fail('GET /api/geocode LRU cache serves identical payload with negligible latency', e);
    }

    // 9. Built-in gazetteer offline fallback
    try {
      const res = await resolveGeocodeQuery('bengaluru');
      assert.ok(res.results.length > 0, 'Bengaluru must be resolvable');
      const b = res.results[0];
      assert.strictEqual(b.timezone, 'Asia/Kolkata');
      assert.ok(Math.abs(b.latitude - 12.97) < 0.2);
      pass('resolveGeocodeQuery resolves Bengaluru with Asia/Kolkata timezone via gazetteer fallback');
    } catch (e) {
      fail('resolveGeocodeQuery resolves Bengaluru with Asia/Kolkata timezone via gazetteer fallback', e);
    }

    // 10. index.html static verification
    try {
      const indexPath = path.resolve(__dirname, '../../../index.html');
      const html = fs.readFileSync(indexPath, 'utf8');

      // Check required input and badge elements
      assert.ok(html.includes('id="input-k-city-search"'), 'input-k-city-search must exist');
      assert.ok(html.includes('id="location-spinner"'), 'location-spinner must exist');
      assert.ok(html.includes('id="location-suggestions-box"'), 'location-suggestions-box must exist');
      assert.ok(html.includes('id="k-location-resolved-badge"'), 'k-location-resolved-badge must exist');
      assert.ok(html.includes('id="k-resolved-lat"'), 'k-resolved-lat must exist');
      assert.ok(html.includes('id="k-resolved-lon"'), 'k-resolved-lon must exist');
      assert.ok(html.includes('id="k-resolved-tz"'), 'k-resolved-tz must exist');
      assert.ok(html.includes('id="k-manual-coords-box"'), 'k-manual-coords-box must exist');

      // Check Milan Kundli elements
      assert.ok(html.includes('id="milan-boy-city-search"'), 'milan-boy-city-search must exist');
      assert.ok(html.includes('id="milan-girl-city-search"'), 'milan-girl-city-search must exist');
      assert.ok(html.includes('id="milan-boy-city-suggestions"'), 'milan-boy-city-suggestions must exist');
      assert.ok(html.includes('id="milan-girl-city-suggestions"'), 'milan-girl-city-suggestions must exist');

      // Check that hardcoded Jabalpur fallback was eradicated from renderKundliResultUI
      assert.ok(!html.includes('lat: parseFloat(document.getElementById(\'k-resolved-lat\').value) || 23.1815'), 'Silent Jabalpur latitude default || 23.1815 must be removed');
      assert.ok(!html.includes('lon: parseFloat(document.getElementById(\'k-resolved-lon\').value) || 79.9864'), 'Silent Jabalpur longitude default || 79.9864 must be removed');

      // Check that proxy endpoint /api/geocode is called in handleLocationSearchInput
      assert.ok(html.includes('fetch(`/api/geocode?q=${encodeURIComponent(query)}`'), 'handleLocationSearchInput must query /api/geocode');

      // Check keyboard navigation logic
      assert.ok(html.includes("e.key === 'ArrowDown'"), 'handleLocationKeydown must handle ArrowDown');
      assert.ok(html.includes("e.key === 'ArrowUp'"), 'handleLocationKeydown must handle ArrowUp');
      assert.ok(html.includes("e.key === 'Enter'"), 'handleLocationKeydown must handle Enter');

      // Check that typing clears previous resolved coordinates
      assert.ok(html.includes("document.getElementById('k-resolved-lat').value = '';"), 'Typing must invalidate prior resolved latitude');
      assert.ok(html.includes("document.getElementById('k-resolved-lon').value = '';"), 'Typing must invalidate prior resolved longitude');

      pass('index.html verified: DOM elements, multi-tier search, keyboard navigation, and zero silent fallbacks');
    } catch (e) {
      fail('index.html static verification', e);
    }

  } finally {
    server.close();
  }

  console.log('===============================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal error running geocoding tests:', err);
  process.exit(1);
});
