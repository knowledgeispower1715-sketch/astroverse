process.env.NODE_ENV = 'test';
import assert from 'assert';
import http from 'http';
import crypto from 'crypto';
import app from '../src/server';
import { db, Role, AccountStatus } from '../src/db';

let server: http.Server;
let mockKundliServer: http.Server;
const TEST_PORT = 5093;
const MOCK_KUNDLI_PORT = 8103;
const BASE_URL = `http://localhost:${TEST_PORT}`;

process.env.KUNDLI_ENGINE_URL = `http://127.0.0.1:${MOCK_KUNDLI_PORT}`;
process.env.ASTROVERSE_INTERNAL_KEY = 'test_secure_internal_gateway_key_999888';

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
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'SUCCESS',
        is_personalized: true,
        preview: { is_preview: false, unlocked: true }
      }));
    });
    mockKundliServer.listen(MOCK_KUNDLI_PORT, () => resolve());
  });
}

async function runCrossUserIsolationSuite() {
  console.log('===============================================================');
  console.log('ASTROVERSE CROSS-USER ISOLATION & ADMIN PRIVILEGE AUDIT SUITE');
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
    // 1. Seed User A and User B
    const userA = await db.createUser({
      phone: '+919872221101',
      displayName: 'Alice Kundli Owner'
    });
    const sessionTokenA = 'token_alice_iso_' + crypto.randomBytes(16).toString('hex');
    await db.createSession({
      userId: userA.id,
      tokenHash: crypto.createHash('sha256').update(sessionTokenA).digest('hex'),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
    });

    const userB = await db.createUser({
      phone: '+919872221102',
      displayName: 'Bob Inquisitive'
    });
    const sessionTokenB = 'token_bob_iso_' + crypto.randomBytes(16).toString('hex');
    await db.createSession({
      userId: userB.id,
      tokenHash: crypto.createHash('sha256').update(sessionTokenB).digest('hex'),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
    });

    // Seed Admin User
    const adminUser = await db.createUser({
      phone: '+919872221199',
      displayName: 'Super Admin Officer',
      role: Role.SUPER_ADMIN
    });
    const sessionTokenAdmin = 'token_admin_iso_' + crypto.randomBytes(16).toString('hex');
    await db.createSession({
      userId: adminUser.id,
      tokenHash: crypto.createHash('sha256').update(sessionTokenAdmin).digest('hex'),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
    });

    // Profile for Alice
    const profileAlice = await db.createProfile({
      userId: userA.id,
      profileName: "Alice's Secret Natal Chart",
      relationship: 'Self',
      dateOfBirth: '1991-05-14',
      timeOfBirth: '11:22',
      birthplaceName: 'Pune',
      latitude: 18.5204,
      longitude: 73.8567,
      resolvedTimezone: 'Asia/Kolkata'
    });

    // Saved report for Alice
    const reportAlice = await db.createSavedReport({
      userId: userA.id,
      title: "Alice's Comprehensive Parashari Kundli",
      reportType: 'kundli_deep_dive',
      payload: { secret_analysis: 'Sensitive astrological guidance for Alice' }
    });

    // SECTION 1: PROFILE PRIVACY & ISOLATION
    await test("1. User B cannot read User A's profile via GET /api/profiles/item/:id (HTTP 403)", async () => {
      const res = await request(`/api/profiles/item/${profileAlice.id}`, {
        headers: { 'Authorization': `Bearer ${sessionTokenB}` }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error, 'FORBIDDEN');
    });

    await test("2. User B cannot list User A's profiles via GET /api/profiles/:userId (HTTP 403)", async () => {
      const res = await request(`/api/profiles/${userA.id}`, {
        headers: { 'Authorization': `Bearer ${sessionTokenB}` }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error, 'FORBIDDEN');
    });

    await test("3. User B cannot update User A's profile via PUT /api/profiles/:id (HTTP 403)", async () => {
      const res = await request(`/api/profiles/${profileAlice.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${sessionTokenB}` },
        body: { profileName: 'Tampered by Bob' }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error, 'FORBIDDEN');
    });

    await test("4. User B cannot delete User A's profile via DELETE /api/profiles/:id (HTTP 403)", async () => {
      const res = await request(`/api/profiles/${profileAlice.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionTokenB}` }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error, 'FORBIDDEN');
    });

    // SECTION 2: SAVED REPORT ISOLATION
    await test("5. User B cannot view User A's saved report via GET /api/reports/reader/:id (HTTP 403)", async () => {
      const res = await request(`/api/reports/reader/${reportAlice.id}`, {
        headers: { 'Authorization': `Bearer ${sessionTokenB}` }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error, 'FORBIDDEN');
    });

    await test("6. User B cannot list User A's saved reports via GET /api/reports/:userId (HTTP 403)", async () => {
      const res = await request(`/api/reports/${userA.id}`, {
        headers: { 'Authorization': `Bearer ${sessionTokenB}` }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error, 'FORBIDDEN');
    });

    await test("7. User B cannot delete User A's saved report via DELETE /api/reports/:id (HTTP 403)", async () => {
      const res = await request(`/api/reports/${reportAlice.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionTokenB}` }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error, 'FORBIDDEN');
    });

    // SECTION 3: PREDICTION GATEWAY OWNERSHIP
    await test("8. User B cannot trigger prediction generation using User A's profileId (HTTP 403)", async () => {
      const res = await request('/api/predictions/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionTokenB}` },
        body: { profileId: profileAlice.id, horizon: 'hourly' }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error, 'FORBIDDEN');
      assert.strictEqual(res.data.message, 'Access denied: You do not own this birth profile.');
    });

    await test("9. Admin cannot generate predictions against User A's profile via customer gateway (HTTP 403)", async () => {
      const res = await request('/api/predictions/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionTokenAdmin}` },
        body: { profileId: profileAlice.id, horizon: 'hourly' }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error, 'FORBIDDEN');
      assert.strictEqual(res.data.message, 'Access denied: You do not own this birth profile.');
    });

    // SECTION 4: ADMIN PRIVILEGED ACCESS & AUDIT LOGGING
    await test("10. Admin access to User A's profile without reason header is rejected (HTTP 400)", async () => {
      const res = await request(`/api/profiles/item/${profileAlice.id}`, {
        headers: {
          'Authorization': `Bearer ${sessionTokenAdmin}`,
          'x-admin-reason': ''
        }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.error, 'ADMIN_REASON_REQUIRED');
    });

    await test("11. Admin access to User A's profile with valid reason succeeds and logs immutable AuditEvent", async () => {
      const res = await request(`/api/profiles/item/${profileAlice.id}`, {
        headers: {
          'Authorization': `Bearer ${sessionTokenAdmin}`,
          'x-admin-reason': 'Customer ticket #7889 - investigating planetary transit calculation discrepancy'
        }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.id, profileAlice.id);

      // Verify AuditEvent was logged in DB
      const privilegedEvent = (db as any).data.auditEvents.find((e: any) => e.action === 'ADMIN_PRIVILEGED_PROFILE_VIEW' && e.targetId === profileAlice.id);
      assert(privilegedEvent, 'ADMIN_PRIVILEGED_PROFILE_VIEW AuditEvent must be recorded');
      assert.strictEqual(privilegedEvent.actorId, adminUser.id);
      assert.strictEqual(privilegedEvent.targetId, profileAlice.id);
      assert(privilegedEvent.reason?.includes('Customer ticket #7889'));
    });

    // SECTION 5: CREDENTIAL COLUMN SANITIZATION
    await test("12. User authentication responses strictly exclude all password and secret credentials", async () => {
      // Set secrets on Alice
      await db.updateUser(userA.id, {
        passwordHash: 'secret_sha256_hash_value',
        passwordSalt: 'salt_12345',
        mfaSecret: 'JBSWY3DPEHPK3PXP',
        mfaRecoveryCodes: ['rec_1', 'rec_2'],
        resetTokenHash: 'reset_hash_xyz',
        resetTokenExpiresAt: new Date(Date.now() + 3600000).toISOString()
      });

      // GET /api/user/me
      const resMe = await request('/api/user/me', {
        headers: { 'Authorization': `Bearer ${sessionTokenA}` }
      });
      assert.strictEqual(resMe.status, 200);
      assert.strictEqual(resMe.data.passwordHash, undefined, 'passwordHash must be omitted from /api/user/me');
      assert.strictEqual(resMe.data.passwordSalt, undefined, 'passwordSalt must be omitted from /api/user/me');
      assert.strictEqual(resMe.data.mfaSecret, undefined, 'mfaSecret must be omitted from /api/user/me');
      assert.strictEqual(resMe.data.mfaRecoveryCodes, undefined, 'mfaRecoveryCodes must be omitted from /api/user/me');
      assert.strictEqual(resMe.data.resetTokenHash, undefined, 'resetTokenHash must be omitted from /api/user/me');
      assert.strictEqual(resMe.data.resetTokenExpiresAt, undefined, 'resetTokenExpiresAt must be omitted from /api/user/me');

      // GET /api/user/profile
      const resProfile = await request('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${sessionTokenA}` }
      });
      assert.strictEqual(resProfile.status, 200);
      assert.strictEqual(resProfile.data.passwordHash, undefined);
      assert.strictEqual(resProfile.data.passwordSalt, undefined);
      assert.strictEqual(resProfile.data.mfaSecret, undefined);
      assert.strictEqual(resProfile.data.mfaRecoveryCodes, undefined);
      assert.strictEqual(resProfile.data.resetTokenHash, undefined);
      assert.strictEqual(resProfile.data.resetTokenExpiresAt, undefined);

      // PUT /api/user/profile
      const resPut = await request('/api/user/profile', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${sessionTokenA}` },
        body: { displayName: 'Alice Verified Profile' }
      });
      assert.strictEqual(resPut.status, 200);
      const putUser = resPut.data.user || resPut.data;
      assert.strictEqual(putUser.passwordHash, undefined);
      assert.strictEqual(putUser.passwordSalt, undefined);
      assert.strictEqual(putUser.mfaSecret, undefined);
      assert.strictEqual(putUser.mfaRecoveryCodes, undefined);
      assert.strictEqual(putUser.resetTokenHash, undefined);
      assert.strictEqual(putUser.resetTokenExpiresAt, undefined);
    });

    console.log(`\n===============================================================`);
    console.log(`CROSS-USER ISOLATION TESTS COMPLETE: ${passCount} passed, ${failCount} failed`);
    console.log(`===============================================================\n`);

    if (failCount > 0) {
      process.exit(1);
    }
  } finally {
    if (server) server.close();
    if (mockKundliServer) mockKundliServer.close();
  }
}

runCrossUserIsolationSuite().catch((err) => {
  console.error('Fatal error in cross-user isolation test suite:', err);
  process.exit(1);
});
