process.env.NODE_ENV = 'test';
import assert from 'assert';
import http from 'http';
import crypto from 'crypto';
import app from '../src/server';
import { db, Role, AccountStatus } from '../src/db';
import { SubscriptionTier } from '../src/monetization/catalog';

let server: http.Server;
let mockKundliServer: http.Server;
const TEST_PORT = 5088;
const MOCK_KUNDLI_PORT = 8099;
const BASE_URL = `http://localhost:${TEST_PORT}`;

process.env.KUNDLI_ENGINE_URL = `http://127.0.0.1:${MOCK_KUNDLI_PORT}`;
process.env.ASTROVERSE_INTERNAL_KEY = 'test_secure_internal_gateway_key_999888';

let lastReceivedUpstreamPayload: any = null;
let lastReceivedUpstreamHeaders: any = null;

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
        lastReceivedUpstreamHeaders = req.headers;
        try {
          lastReceivedUpstreamPayload = JSON.parse(bodyStr);
        } catch (_) {
          lastReceivedUpstreamPayload = null;
        }

        const isUnlocked = lastReceivedUpstreamPayload?.is_unlocked ?? false;
        const horizon = lastReceivedUpstreamPayload?.horizon || 'hourly';

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'SUCCESS',
          horizon: horizon,
          is_personalized: true,
          preview: {
            is_preview: !isUnlocked,
            unlocked: isUnlocked
          },
          sections: {
            executive_summary: `Forecast for ${horizon}`,
            overall_outlook: 'Sample outlook',
            why_this_applies: 'Chart evidence',
            practical_reflection: 'Reflection guidance',
            limitations: 'Ephemeris limits'
          },
          period_items: {
            items: [
              { index: 0, title: 'Period 1', is_locked: false },
              { index: 1, title: 'Period 2', is_locked: false },
              { index: 2, title: 'Period 3', is_locked: !isUnlocked }
            ]
          }
        }));
      });
    });
    mockKundliServer.listen(MOCK_KUNDLI_PORT, () => resolve());
  });
}

async function runEntitlementAndIsolationSuite() {
  console.log('===============================================================');
  console.log('ASTROVERSE P0 ENTITLEMENT SECURITY & PROFILE ISOLATION TEST SUITE');
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
    // 0. Seed test users
    const userA = await db.createUser({
      phone: '+919876543201',
      displayName: 'Alice Seeker'
    });
    const sessionTokenA = 'token_alice_' + crypto.randomBytes(16).toString('hex');
    await db.createSession({
      userId: userA.id,
      tokenHash: crypto.createHash('sha256').update(sessionTokenA).digest('hex'),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
    });

    const userB = await db.createUser({
      phone: '+919876543202',
      displayName: 'Bob Consultant'
    });
    const sessionTokenB = 'token_bob_' + crypto.randomBytes(16).toString('hex');
    await db.createSession({
      userId: userB.id,
      tokenHash: crypto.createHash('sha256').update(sessionTokenB).digest('hex'),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
    });

    const profileAlice = await db.createProfile({
      userId: userA.id,
      profileName: 'Alice Natal Chart',
      relationship: 'Self',
      dateOfBirth: '1992-04-12',
      timeOfBirth: '08:30',
      birthplaceName: 'Delhi',
      latitude: 28.6139,
      longitude: 77.2090,
      resolvedTimezone: 'Asia/Kolkata'
    });

    const profileBob = await db.createProfile({
      userId: userB.id,
      profileName: 'Bob Natal Chart',
      relationship: 'Self',
      dateOfBirth: '1988-11-20',
      timeOfBirth: '17:45',
      birthplaceName: 'Mumbai',
      latitude: 19.0760,
      longitude: 72.8777,
      resolvedTimezone: 'Asia/Kolkata'
    });

    // =========================================================================
    // SECTION 1: PHASE 1 — P0 ENTITLEMENT INTEGRITY & TAMPER-RESISTANCE
    // =========================================================================
    console.log('--- SECTION 1: P0 ENTITLEMENT INTEGRITY & TAMPER-RESISTANCE ---');

    // 1. Anonymous caller sending is_unlocked: true is strictly locked
    await test('Anonymous request with is_unlocked: true is FORCIBLY STRIPPED & LOCKED', async () => {
      lastReceivedUpstreamPayload = null;
      lastReceivedUpstreamHeaders = null;

      const res = await request('/api/predictions/generate', {
        method: 'POST',
        body: {
          horizon: 'monthly',
          dob: '1990-01-01T12:00:00',
          lat: 28.61,
          lon: 77.20,
          is_unlocked: true,              // ATTACK PAYLOAD
          preview_tier: 'PREMIUM'         // ATTACK PAYLOAD
        }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.server_authoritative, true);
      assert.strictEqual(res.data.authoritative_unlocked, false);
      assert.strictEqual(res.data.effective_tier, 'FREE');

      // Verify what was forwarded upstream to Python engine
      assert.strictEqual(lastReceivedUpstreamPayload.is_unlocked, false, 'Upstream must receive is_unlocked: false');
      assert.strictEqual(lastReceivedUpstreamPayload.preview_tier, 'FREE', 'Upstream must receive preview_tier: FREE');
      assert.strictEqual(
        lastReceivedUpstreamHeaders['x-astroverse-internal-key'],
        'test_secure_internal_gateway_key_999888',
        'Upstream must receive authorized internal service header'
      );
    });

    // Test: Compromised legacy credential is strictly rejected by gateway
    await test('Compromised legacy credential is rejected by gateway', async () => {
      const originalKey = process.env.ASTROVERSE_INTERNAL_KEY;
      try {
        process.env.ASTROVERSE_INTERNAL_KEY = 'astroverse-internal-gateway-secret-2026';
        const res = await request('/api/predictions/generate', {
          method: 'POST',
          body: {
            horizon: 'hourly',
            dob: '1990-01-01T12:00:00',
            lat: 28.61,
            lon: 77.20
          }
        });
        assert.strictEqual(res.status, 500);
        assert.strictEqual(res.data.error, 'GATEWAY_CONFIGURATION_ERROR');
      } finally {
        process.env.ASTROVERSE_INTERNAL_KEY = originalKey;
      }
    });

    // 2. Anonymous caller sending preview_tier: "PREMIUM" is strictly locked
    await test('Anonymous request with preview_tier: PREMIUM is FORCIBLY OVERRIDDEN to FREE', async () => {
      const res = await request('/api/predictions/generate', {
        method: 'POST',
        body: {
          horizon: 'yearly',
          dob: '1990-01-01T12:00:00',
          lat: 28.61,
          lon: 77.20,
          preview_tier: 'PREMIUM'
        }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.authoritative_unlocked, false);
      assert.strictEqual(res.data.effective_tier, 'FREE');
      assert.strictEqual(lastReceivedUpstreamPayload.is_unlocked, false);
      assert.strictEqual(lastReceivedUpstreamPayload.preview_tier, 'FREE');
    });

    // 3. Authenticated FREE user asking for Weekly with is_unlocked: true is strictly locked
    await test('Authenticated FREE user with is_unlocked: true for Weekly is strictly locked', async () => {
      const res = await request('/api/predictions/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionTokenA}` },
        body: {
          horizon: 'weekly',
          dob: '1992-04-12T08:30:00',
          lat: 28.61,
          lon: 77.20,
          is_unlocked: true
        }
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.authoritative_unlocked, false);
      assert.strictEqual(res.data.effective_tier, 'FREE');
      assert.strictEqual(lastReceivedUpstreamPayload.is_unlocked, false);
    });

    // 4. Authenticated FREE user for Hourly and Daily is unlocked (Standard Free Tier)
    await test('Authenticated FREE user gets Hourly and Daily unlocked by default', async () => {
      const resHourly = await request('/api/predictions/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionTokenA}` },
        body: { horizon: 'hourly', dob: '1992-04-12T08:30:00', lat: 28.61, lon: 77.20 }
      });
      assert.strictEqual(resHourly.data.authoritative_unlocked, true);
      assert.strictEqual(lastReceivedUpstreamPayload.is_unlocked, true);

      const resDaily = await request('/api/predictions/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionTokenA}` },
        body: { horizon: 'daily', dob: '1992-04-12T08:30:00', lat: 28.61, lon: 77.20 }
      });
      assert.strictEqual(resDaily.data.authoritative_unlocked, true);
      assert.strictEqual(lastReceivedUpstreamPayload.is_unlocked, true);
    });

    // 5. PLUS subscriber gets Weekly unlocked, but Monthly and Yearly locked
    await test('PLUS subscriber gets Weekly unlocked, but Monthly/Yearly remain locked', async () => {
      await db.assignSubscriptionTier(userA.id, 'PLUS', 'MONTHLY', 30, 'admin_system', 'Test grant');

      // Weekly: should be unlocked for Plus
      const resWeekly = await request('/api/predictions/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionTokenA}` },
        body: { horizon: 'weekly', dob: '1992-04-12T08:30:00', lat: 28.61, lon: 77.20 }
      });
      assert.strictEqual(resWeekly.data.effective_tier, 'PLUS');
      assert.strictEqual(resWeekly.data.authoritative_unlocked, true);
      assert.strictEqual(lastReceivedUpstreamPayload.is_unlocked, true);

      // Monthly: should be locked for Plus
      const resMonthly = await request('/api/predictions/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionTokenA}` },
        body: { horizon: 'monthly', dob: '1992-04-12T08:30:00', lat: 28.61, lon: 77.20 }
      });
      assert.strictEqual(resMonthly.data.authoritative_unlocked, false);
      assert.strictEqual(lastReceivedUpstreamPayload.is_unlocked, false);

      // Yearly: should be locked for Plus
      const resYearly = await request('/api/predictions/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionTokenA}` },
        body: { horizon: 'yearly', dob: '1992-04-12T08:30:00', lat: 28.61, lon: 77.20 }
      });
      assert.strictEqual(resYearly.data.authoritative_unlocked, false);
      assert.strictEqual(lastReceivedUpstreamPayload.is_unlocked, false);
    });

    // 6. PREMIUM subscriber gets all six horizons unlocked
    await test('PREMIUM subscriber gets Monthly, Yearly, and Mahadasha fully unlocked', async () => {
      await db.assignSubscriptionTier(userB.id, 'PREMIUM', 'MONTHLY', 30, 'admin_system', 'Test grant');

      const resMonthly = await request('/api/predictions/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionTokenB}` },
        body: { horizon: 'monthly', dob: '1988-11-20T17:45:00', lat: 19.07, lon: 72.87 }
      });
      assert.strictEqual(resMonthly.data.effective_tier, 'PREMIUM');
      assert.strictEqual(resMonthly.data.authoritative_unlocked, true);
      assert.strictEqual(lastReceivedUpstreamPayload.is_unlocked, true);

      const resYearly = await request('/api/predictions/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionTokenB}` },
        body: { horizon: 'yearly', dob: '1988-11-20T17:45:00', lat: 19.07, lon: 72.87 }
      });
      assert.strictEqual(resYearly.data.authoritative_unlocked, true);
      assert.strictEqual(lastReceivedUpstreamPayload.is_unlocked, true);

      const resMahadasha = await request('/api/predictions/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionTokenB}` },
        body: { horizon: 'mahadasha', dob: '1988-11-20T17:45:00', lat: 19.07, lon: 72.87 }
      });
      assert.strictEqual(resMahadasha.data.authoritative_unlocked, true);
      assert.strictEqual(lastReceivedUpstreamPayload.is_unlocked, true);
    });

    // 7. Expired Premium reverts to locked state
    await test('Expired Premium subscription immediately reverts to locked state', async () => {
      // Create user with expired entitlement
      const userExpired = await db.createUser({
        phone: '+919876543209',
        displayName: 'Expired Customer'
      });
      const sessionExpired = 'token_expired_' + crypto.randomBytes(16).toString('hex');
      await db.createSession({
        userId: userExpired.id,
        tokenHash: crypto.createHash('sha256').update(sessionExpired).digest('hex'),
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
      });

      // Grant expired entitlement directly in db records
      await db.grantEntitlement(
        userExpired.id,
        'subscription_premium',
        -1, // expired
        'ADMIN_GRANT',
        'admin_system',
        'Expired test'
      );

      const res = await request('/api/predictions/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionExpired}` },
        body: { horizon: 'monthly', dob: '1990-01-01T12:00:00', lat: 28.61, lon: 77.20 }
      });
      assert.strictEqual(res.data.effective_tier, 'FREE');
      assert.strictEqual(res.data.authoritative_unlocked, false);
      assert.strictEqual(lastReceivedUpstreamPayload.is_unlocked, false);
    });

    // 8. Suspended account returns HTTP 403 ACCOUNT_INACTIVE
    await test('Suspended account is rejected with HTTP 403 ACCOUNT_INACTIVE', async () => {
      const userSuspended = await db.createUser({
        phone: '+919876543210',
        displayName: 'Suspended Bad Actor',
        status: AccountStatus.SUSPENDED
      });
      const sessionSuspended = 'token_suspended_' + crypto.randomBytes(16).toString('hex');
      await db.createSession({
        userId: userSuspended.id,
        tokenHash: crypto.createHash('sha256').update(sessionSuspended).digest('hex'),
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
      });

      const res = await request('/api/predictions/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionSuspended}` },
        body: { horizon: 'daily', dob: '1990-01-01T12:00:00', lat: 28.61, lon: 77.20 }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error, 'ACCOUNT_INACTIVE');
    });

    // =========================================================================
    // SECTION 2: PHASE 2 — CROSS-TENANT PROFILE & RESOURCE ISOLATION
    // =========================================================================
    console.log('\n--- SECTION 2: CROSS-TENANT PROFILE & RESOURCE ISOLATION ---');

    // 9. Unauthenticated request with profileId is rejected with HTTP 401
    await test('Unauthenticated request with profileId is rejected with HTTP 401', async () => {
      const res = await request('/api/predictions/generate', {
        method: 'POST',
        body: {
          profileId: profileAlice.id,
          horizon: 'hourly'
        }
      });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.data.error, 'AUTHENTICATION_REQUIRED');
    });

    // 10. User B attempting to generate prediction using User A's profile ID is blocked (HTTP 403)
    await test("User B cannot access or run predictions against User A's profile (HTTP 403 Forbidden)", async () => {
      const res = await request('/api/predictions/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionTokenB}` },
        body: {
          profileId: profileAlice.id, // Alice's profile
          horizon: 'hourly'
        }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error, 'FORBIDDEN');
      assert.strictEqual(res.data.message, 'Access denied: You do not own this birth profile.');
    });

    // 11. User A successfully generates predictions using own profile ID with DB grounding
    await test("User A successfully generates prediction using own profile ID grounded in canonical DB values", async () => {
      const res = await request('/api/predictions/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionTokenA}` },
        body: {
          profileId: profileAlice.id,
          horizon: 'hourly'
        }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(lastReceivedUpstreamPayload.profile_id, profileAlice.id);
      assert.strictEqual(lastReceivedUpstreamPayload.profile_name, 'Alice Natal Chart');
      assert.strictEqual(lastReceivedUpstreamPayload.lat, 28.6139);
      assert.strictEqual(lastReceivedUpstreamPayload.lon, 77.2090);
    });

    // 12. Tampered birth particulars are superseded by canonical DB values for saved profile
    await test('Tampered client coordinates are overridden by canonical DB profile coordinates', async () => {
      const res = await request('/api/predictions/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionTokenA}` },
        body: {
          profileId: profileAlice.id,
          horizon: 'hourly',
          lat: 0.0,            // TAMPERED ATTEMPT
          lon: 0.0,            // TAMPERED ATTEMPT
          dob: '2000-01-01'    // TAMPERED ATTEMPT
        }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(lastReceivedUpstreamPayload.lat, 28.6139, 'Must use DB latitude');
      assert.strictEqual(lastReceivedUpstreamPayload.lon, 77.2090, 'Must use DB longitude');
      assert.strictEqual(lastReceivedUpstreamPayload.dob, '1992-04-12T08:30:00', 'Must use DB birth timestamp');
    });

    // 13. Non-existent profile returns HTTP 404 PROFILE_NOT_FOUND
    await test('Non-existent profile ID returns HTTP 404 PROFILE_NOT_FOUND', async () => {
      const res = await request('/api/predictions/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionTokenA}` },
        body: {
          profileId: 'prof_nonexistent_xyz999',
          horizon: 'hourly'
        }
      });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.data.error, 'PROFILE_NOT_FOUND');
    });

    // 14. User B cannot fetch User A's profile via GET /api/profiles/item/:id
    await test("User B cannot inspect User A's profile via GET /api/profiles/item/:id (HTTP 403)", async () => {
      const res = await request(`/api/profiles/item/${profileAlice.id}`, {
        headers: { 'Authorization': `Bearer ${sessionTokenB}` }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error, 'FORBIDDEN');
    });

    // 15. User A can inspect own profile via GET /api/profiles/item/:id
    await test("User A can inspect own profile via GET /api/profiles/item/:id (HTTP 200)", async () => {
      const res = await request(`/api/profiles/item/${profileAlice.id}`, {
        headers: { 'Authorization': `Bearer ${sessionTokenA}` }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.id, profileAlice.id);
      assert.strictEqual(res.data.profileName, 'Alice Natal Chart');
    });

    // 16. User A lists own profiles via GET /api/profiles
    await test('User A retrieves only own profiles via GET /api/profiles', async () => {
      const res = await request('/api/profiles', {
        headers: { 'Authorization': `Bearer ${sessionTokenA}` }
      });
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.data));
      assert(res.data.every((p: any) => p.userId === userA.id));
      assert(res.data.some((p: any) => p.id === profileAlice.id));
      assert(!res.data.some((p: any) => p.id === profileBob.id));
    });

    // =========================================================================
    // SECTION 3: ONE-OFF REPORT UNLOCK INTEGRITY
    // =========================================================================
    console.log('\n--- SECTION 3: ONE-OFF REPORT UNLOCK INTEGRITY ---');

    // 17. Free user with one-off report purchase gets that specific horizon unlocked
    await test('Free user who purchased Kundli Deep Dive report gets Yearly forecast unlocked', async () => {
      // Free user C
      const userC = await db.createUser({
        phone: '+919876543203',
        displayName: 'Charlie Seeker'
      });
      const sessionTokenC = 'token_charlie_' + crypto.randomBytes(16).toString('hex');
      await db.createSession({
        userId: userC.id,
        tokenHash: crypto.createHash('sha256').update(sessionTokenC).digest('hex'),
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
      });

      // Before purchase: Yearly is locked
      const beforeRes = await request('/api/predictions/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionTokenC}` },
        body: { horizon: 'yearly', dob: '1995-06-25T10:00:00', lat: 26.84, lon: 80.94 }
      });
      assert.strictEqual(beforeRes.data.authoritative_unlocked, false);

      // Save a verified purchased report of type 'kundli_deep_dive'
      await db.createSavedReport({
        userId: userC.id,
        title: 'Personalized Janam Kundli & Varshphal',
        reportType: 'kundli_deep_dive',
        payload: { summary: 'Purchased Janam Kundli Deep Dive' }
      });

      // After purchase: Yearly is authoritatively unlocked
      const afterRes = await request('/api/predictions/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionTokenC}` },
        body: { horizon: 'yearly', dob: '1995-06-25T10:00:00', lat: 26.84, lon: 80.94 }
      });
      assert.strictEqual(afterRes.data.authoritative_unlocked, true);
      assert.strictEqual(lastReceivedUpstreamPayload.is_unlocked, true);
    });

  } finally {
    server.close();
    mockKundliServer.close();
  }

  console.log('\n===============================================================');
  console.log(`ENTITLEMENT & ISOLATION SUITE COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('===============================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runEntitlementAndIsolationSuite().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
