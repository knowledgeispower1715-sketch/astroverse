process.env.NODE_ENV = 'test';
import assert from 'assert';
import http from 'http';
import crypto from 'crypto';
import app from '../src/server';
import { db } from '../src/db';

let server: http.Server;
let mockKundliServer: http.Server;
const TEST_PORT = 5092;
const MOCK_KUNDLI_PORT = 8102;
const BASE_URL = `http://localhost:${TEST_PORT}`;

process.env.KUNDLI_ENGINE_URL = `http://127.0.0.1:${MOCK_KUNDLI_PORT}`;
process.env.ASTROVERSE_INTERNAL_KEY = 'test_secure_internal_gateway_key_999888';

let lastReceivedUpstreamPayload: any = null;

async function request(path: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

function startMockKundliServer(): Promise<void> {
  return new Promise((resolve) => {
    mockKundliServer = http.createServer((req, res) => {
      let bodyStr = '';
      req.on('data', chunk => { bodyStr += chunk; });
      req.on('end', () => {
        try {
          lastReceivedUpstreamPayload = JSON.parse(bodyStr);
        } catch (_) {
          lastReceivedUpstreamPayload = null;
        }

        const isUnknown = lastReceivedUpstreamPayload?.birth_time_status === 'UNKNOWN';
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'SUCCESS',
          horizon: lastReceivedUpstreamPayload?.horizon || 'daily',
          is_personalized: true,
          birth_time_status: isUnknown ? 'UNKNOWN' : 'EXACT',
          chart_evidence: {
            lagna: isUnknown ? 'Indeterminate (Birth Time Unknown)' : 'Leo',
            lagna_degree: isUnknown ? null : 14.52,
            moon_sign: 'Aries',
            reference_frame: isUnknown ? 'CHANDRA_LAGNA' : 'UDAYA_LAGNA'
          },
          sections: {
            executive_summary: isUnknown 
              ? 'Predictions evaluated from Chandra Lagna (natal Moon in Aries) due to unconfirmed birth time.' 
              : 'Predictions evaluated from natal Leo Lagna.',
            limitations: isUnknown 
              ? 'Exact ascendant (Lagna) and house cusps are withheld because birth time is unknown. House-sensitive divisional charts (D9 Navamsha, D10 Dashamsha) are withheld.' 
              : 'Standard Ephemeris accuracy limits apply.'
          }
        }));
      });
    });
    mockKundliServer.listen(MOCK_KUNDLI_PORT, () => resolve());
  });
}

async function runUnknownBirthTimeIntegritySuite() {
  console.log('===============================================================');
  console.log('ASTROVERSE UNKNOWN BIRTH-TIME INTEGRITY & EPHEMERIS GOVERNANCE');
  console.log('===============================================================\n');

  await startMockKundliServer();
  server = app.listen(TEST_PORT);

  let passCount = 0;
  let failCount = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passCount++;
    } catch (err: any) {
      console.error(`[FAIL] ${name}:`, err.message);
      failCount++;
    }
  }

  try {
    // Setup test user
    const testUser = await db.createUser({
      phone: '+919871112233',
      displayName: 'Devi Seeker'
    });
    const sessionToken = 'token_devi_' + crypto.randomBytes(16).toString('hex');
    await db.createSession({
      userId: testUser.id,
      tokenHash: crypto.createHash('sha256').update(sessionToken).digest('hex'),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
    });

    // 1. Create profile with UNKNOWN birth time
    let unknownProfileId = '';
    await test('1. Profile created without timeOfBirth is marked UNKNOWN and never defaults to noon (12:00:00)', async () => {
      const res = await request('/api/profiles', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}` },
        body: {
          profileName: 'Unknown Time Profile',
          relationship: 'Self',
          dateOfBirth: '1994-08-15',
          birthTimeStatus: 'UNKNOWN',
          birthplaceName: 'Varanasi',
          latitude: 25.3176,
          longitude: 82.9739,
          resolvedTimezone: 'Asia/Kolkata'
        }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.birthTimeStatus, 'UNKNOWN');
      assert.strictEqual(res.data.timeOfBirth, null, 'timeOfBirth must remain null, never silently replaced with 12:00:00');
      assert.strictEqual(res.data.birthTimeConfirmed, false);
      unknownProfileId = res.data.id;
    });

    // 2. Fetch created UNKNOWN profile
    await test('2. GET /api/profiles/item/:id preserves birthTimeStatus UNKNOWN and null timeOfBirth', async () => {
      const res = await request(`/api/profiles/item/${unknownProfileId}`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.birthTimeStatus, 'UNKNOWN');
      assert.strictEqual(res.data.timeOfBirth, null);
      assert.strictEqual(res.data.birthTimeConfirmed, false);
    });

    // 3. Create profile with APPROXIMATE birth time and window
    let approxProfileId = '';
    await test('3. Profile created with APPROXIMATE time preserves window metadata and approximateTimeRange', async () => {
      const res = await request('/api/profiles', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}` },
        body: {
          profileName: 'Approximate Time Profile',
          relationship: 'Father',
          dateOfBirth: '1965-03-22',
          timeOfBirth: '10:30',
          birthTimeStatus: 'APPROXIMATE',
          approximateWindowMinutes: 45,
          approximateTimeRange: 'Between 10:00 AM and 11:15 AM',
          birthplaceName: 'Kolkata',
          latitude: 22.5726,
          longitude: 88.3639,
          resolvedTimezone: 'Asia/Kolkata'
        }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.birthTimeStatus, 'APPROXIMATE');
      assert.strictEqual(res.data.approximateWindowMinutes, 45);
      assert.strictEqual(res.data.approximateTimeRange, 'Between 10:00 AM and 11:15 AM');
      assert.strictEqual(res.data.birthTimeConfirmed, false);
      approxProfileId = res.data.id;
    });

    // 4. Create profile with EXACT birth time
    await test('4. Profile created with EXACT time preserves exact status and confirmed flag', async () => {
      const res = await request('/api/profiles', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}` },
        body: {
          profileName: 'Exact Time Profile',
          relationship: 'Mother',
          dateOfBirth: '1970-11-10',
          timeOfBirth: '06:15',
          birthTimeStatus: 'EXACT',
          birthplaceName: 'Jaipur',
          latitude: 26.9124,
          longitude: 75.7873,
          resolvedTimezone: 'Asia/Kolkata'
        }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.birthTimeStatus, 'EXACT');
      assert.strictEqual(res.data.timeOfBirth, '06:15');
      assert.strictEqual(res.data.birthTimeConfirmed, true);
    });

    // 5. Prediction generation with UNKNOWN birth time passes status upstream without midday overwrite
    await test('5. Prediction generation against UNKNOWN profile passes birth_time_status UNKNOWN upstream', async () => {
      const res = await request('/api/predictions/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}` },
        body: {
          profileId: unknownProfileId,
          horizon: 'daily'
        }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(lastReceivedUpstreamPayload.birth_time_status, 'UNKNOWN');
      assert.strictEqual(lastReceivedUpstreamPayload.time_of_birth, null, 'Upstream must receive null time_of_birth');
      assert.strictEqual(res.data.chart_evidence.lagna, 'Indeterminate (Birth Time Unknown)');
      assert.strictEqual(res.data.chart_evidence.reference_frame, 'CHANDRA_LAGNA');
      assert(res.data.sections.limitations.includes('Exact ascendant (Lagna) and house cusps are withheld'));
    });

    // 6. Update profile from UNKNOWN to confirmed EXACT time
    await test('6. PUT /api/profiles/:id allows updating from UNKNOWN to confirmed EXACT birth time', async () => {
      const res = await request(`/api/profiles/${unknownProfileId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${sessionToken}` },
        body: {
          timeOfBirth: '14:25',
          birthTimeStatus: 'EXACT',
          birthTimeConfirmed: true
        }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.birthTimeStatus, 'EXACT');
      assert.strictEqual(res.data.timeOfBirth, '14:25');
      assert.strictEqual(res.data.birthTimeConfirmed, true);
    });

    console.log(`\n===============================================================`);
    console.log(`UNKNOWN BIRTH-TIME INTEGRITY TESTS COMPLETE: ${passCount} passed, ${failCount} failed`);
    console.log(`===============================================================\n`);

    if (failCount > 0) {
      process.exit(1);
    }
  } finally {
    if (server) server.close();
    if (mockKundliServer) mockKundliServer.close();
  }
}

runUnknownBirthTimeIntegritySuite().catch((err) => {
  console.error('Fatal error in unknown birth-time test suite:', err);
  process.exit(1);
});
