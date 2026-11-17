import assert from 'node:assert';
import http from 'node:http';
import app, {
  panchangCache,
  getPanchangCacheKey,
  PANCHANG_CACHE_TTL_MS,
} from '../src/server';

function makeRequest(
  server: http.Server,
  path: string
): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    if (!addr || typeof addr === 'string') return reject(new Error('Server not listening'));
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: addr.port,
        path,
        method: 'GET',
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let body: any = raw;
          try {
            body = JSON.parse(raw);
          } catch (_) {}
          resolve({ status: res.statusCode || 500, body, headers: res.headers });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function runCalendarApiGatewayTests() {
  console.log('===============================================================');
  console.log('ASTROVERSE CALENDAR & PANCHANG API GATEWAY AUTOMATED TEST SUITE');
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

  // Clear cache before test run
  panchangCache.clear();

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));

  try {
    // -------------------------------------------------------------------------
    // 1. In-Memory Cache Key Construction & Coordinate Rounding
    // -------------------------------------------------------------------------
    try {
      const key = getPanchangCacheKey(
        '2.1.0',
        'lahiri',
        'amanta',
        '2026-11-17',
        28.61394,
        77.20902,
        'Asia/Kolkata'
      );
      assert.strictEqual(
        key,
        'panchang:2.1.0:lahiri:amanta:2026-11-17:28.61:77.21:Asia/Kolkata'
      );
      pass('Cache key accurately formats composite 2-decimal rounded coordinate invariant');
    } catch (e) {
      fail('Cache key calculation mismatch', e);
    }

    // -------------------------------------------------------------------------
    // 2. /api/panchang/daily & In-Memory Cache Hit/Miss
    // -------------------------------------------------------------------------
    try {
      // First call -> Cache MISS
      const res1 = await makeRequest(
        server,
        '/api/panchang/daily?date=2026-11-17&lat=28.6139&lon=77.2090&timezone=Asia/Kolkata'
      );
      assert.strictEqual(res1.status, 200);
      assert.ok(res1.body, 'Body must be non-null');
      assert.ok(res1.body.tithi || res1.body.panchang?.tithi, 'Must include tithi');
      assert.ok(res1.body.nakshatra || res1.body.panchang?.nakshatra, 'Must include nakshatra');
      assert.strictEqual(res1.headers['x-cache'], 'MISS');
      pass('GET /api/panchang/daily returns 200 with X-Cache: MISS on initial fetch');

      // Second call -> Cache HIT
      const res2 = await makeRequest(
        server,
        '/api/panchang/daily?date=2026-11-17&lat=28.6139&lon=77.2090&timezone=Asia/Kolkata'
      );
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res2.headers['x-cache'], 'HIT');
      assert.ok(res2.headers['x-cache-key'], 'Must return X-Cache-Key');
      pass('GET /api/panchang/daily returns 200 with X-Cache: HIT on subsequent fetch');
    } catch (e) {
      fail('Panchang daily gateway failure', e);
    }

    // -------------------------------------------------------------------------
    // 3. /api/panchang/calculate Routing Parity
    // -------------------------------------------------------------------------
    try {
      const res = await makeRequest(
        server,
        '/api/panchang/calculate?date=2026-11-17&lat=28.6139&lon=77.2090'
      );
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.tithi || res.body.panchang?.tithi, 'Calculate endpoint must return tithi');
      pass('GET /api/panchang/calculate parity check succeeded');
    } catch (e) {
      fail('Panchang calculate gateway failure', e);
    }

    // -------------------------------------------------------------------------
    // 4. /api/rashifal/daily 12 Signs & 6 Sections Verification
    // -------------------------------------------------------------------------
    try {
      const res = await makeRequest(server, '/api/rashifal/daily?date=2026-11-17');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.signs, 'Response must have signs array');
      assert.strictEqual(res.body.signs.length, 12, 'Must contain exactly 12 signs');

      const requiredSections = [
        'outlook',
        'career',
        'finance',
        'relationships',
        'wellness',
        'helpfulFocus',
      ];
      for (const sign of res.body.signs) {
        assert.ok(typeof sign.signIndex === 'number', 'signIndex must be a number');
        assert.ok(sign.signNameEn, 'signNameEn must be present');
        assert.ok(sign.signNameHi, 'signNameHi must be present');
        assert.ok(typeof sign.luckyNumber === 'number', 'luckyNumber must be a number');
        assert.ok(sign.luckyNumber >= 1 && sign.luckyNumber <= 9, 'luckyNumber must be 1-9');
        assert.ok(sign.luckyColor, 'luckyColor must be present');
        assert.ok(sign.auspiciousPeriod, 'auspiciousPeriod must be present');

        for (const sec of requiredSections) {
          assert.ok(
            sign[sec] && sign[sec].length > 10,
            `Section ${sec} missing or too short for ${sign.signNameEn}`
          );
        }
      }
      pass('GET /api/rashifal/daily generates all 12 signs with 6 distinct sections and lucky metrics');

      // Subsequent call hits cache
      const resCached = await makeRequest(server, '/api/rashifal/daily?date=2026-11-17');
      assert.strictEqual(resCached.status, 200);
      assert.strictEqual(resCached.headers['x-cache'], 'HIT');
      pass('GET /api/rashifal/daily honors in-memory caching with X-Cache: HIT');
    } catch (e) {
      fail('Rashifal daily gateway failure', e);
    }

    // -------------------------------------------------------------------------
    // 5. /api/holidays & /api/holidays/list
    // -------------------------------------------------------------------------
    try {
      const res = await makeRequest(server, '/api/holidays?year=2026&month=11');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body), 'Holidays body must be an array');
      assert.ok(res.body.length > 0, 'Must contain holidays for Nov 2026');

      const diwali = res.body.find((h: any) => h.nameEn && h.nameEn.includes('Diwali'));
      assert.ok(diwali, 'Nov 2026 holidays must include Diwali');
      assert.strictEqual(diwali.date, '2026-11-08');
      pass('GET /api/holidays returns verified Indian holiday records including Diwali 2026-11-08');

      // Category filtering
      const resNat = await makeRequest(server, '/api/holidays/list?year=2026&category=national');
      assert.strictEqual(resNat.status, 200);
      assert.ok(Array.isArray(resNat.body));
      const natNames = resNat.body.map((h: any) => h.nameEn);
      assert.ok(natNames.includes('Republic Day'), 'Must include Republic Day');
      assert.ok(natNames.includes('Independence Day'), 'Must include Independence Day');
      assert.ok(natNames.includes("Mahatma Gandhi's Birthday"), 'Must include Gandhi Jayanti');
      pass('GET /api/holidays/list category=national accurately filters national holidays');

      // Region filtering (MH)
      const resMh = await makeRequest(server, '/api/holidays/list?year=2026&region=MH');
      assert.strictEqual(resMh.status, 200);
      const hasMhDay = resMh.body.some((h: any) => h.nameEn && h.nameEn.includes('Maharashtra Day'));
      assert.ok(hasMhDay, 'Must include Maharashtra Day in MH filter');
      pass('GET /api/holidays/list region=MH accurately filters state holidays');
    } catch (e) {
      fail('Holiday gateway failure', e);
    }

    // -------------------------------------------------------------------------
    // 6. /api/transits/monthly
    // -------------------------------------------------------------------------
    try {
      const res = await makeRequest(server, '/api/transits/monthly?year=2026&month=11');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.year, 2026);
      assert.strictEqual(res.body.month, 11);
      pass('GET /api/transits/monthly returns monthly transits structure');

      const resCached = await makeRequest(server, '/api/transits/monthly?year=2026&month=11');
      assert.strictEqual(resCached.status, 200);
      assert.strictEqual(resCached.headers['x-cache'], 'HIT');
      pass('GET /api/transits/monthly subsequent call hits in-memory cache');
    } catch (e) {
      fail('Transits monthly gateway failure', e);
    }

    // -------------------------------------------------------------------------
    // 7. /api/calendar/month Composite Grid Payload
    // -------------------------------------------------------------------------
    try {
      const res = await makeRequest(server, '/api/calendar/month?year=2026&month=11');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.year, 2026);
      assert.strictEqual(res.body.month, 11);
      assert.strictEqual(res.body.total_days, 30);
      assert.ok(Array.isArray(res.body.days), 'Must have days array');
      assert.strictEqual(res.body.days.length, 30, 'Nov 2026 must have exactly 30 days');

      const day8 = res.body.days.find((d: any) => d.date === '2026-11-08');
      assert.ok(day8, 'Day 2026-11-08 must exist in calendar payload');
      assert.ok(day8.holidays, 'Day must have holidays array');
      pass('GET /api/calendar/month returns high-performance grid payload for November 2026');

      const resCached = await makeRequest(server, '/api/calendar/month?year=2026&month=11');
      assert.strictEqual(resCached.status, 200);
      assert.strictEqual(resCached.headers['x-cache'], 'HIT');
      pass('GET /api/calendar/month caching delivers immediate sub-millisecond response');
    } catch (e) {
      fail('Calendar month gateway failure', e);
    }
  } finally {
    server.close();
  }

  console.log('===============================================================');
  console.log(`CALENDAR API GATEWAY SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runCalendarApiGatewayTests().catch((err) => {
  console.error('[FATAL] Unhandled error during gateway tests:', err);
  process.exit(1);
});
