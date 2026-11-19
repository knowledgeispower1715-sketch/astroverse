import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import crypto from 'node:crypto';
import app, { KNOWN_COMPROMISED_INTERNAL_KEYS } from '../src/server';
import { db, Role } from '../src/db';

function makeRequest(
  server: http.Server,
  method: string,
  reqPath: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any; raw: string }> {
  return new Promise((resolve, reject) => {
    const port = (server.address() as any).port;
    const reqHeaders: Record<string, string> = { ...headers };
    let reqBody: string | undefined;

    if (body !== undefined) {
      reqBody = JSON.stringify(body);
      if (!reqHeaders['Content-Type']) reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = String(Buffer.byteLength(reqBody));
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: reqPath,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let parsed: any = null;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode || 500, headers: res.headers, body: parsed, raw });
        });
      }
    );

    req.on('error', reject);
    if (reqBody) req.write(reqBody);
    req.end();
  });
}

describe('CONSULTATION SETTLEMENT & INTERNAL SERVICE KEY SECURITY TEST MATRIX', () => {
  let server: http.Server;
  const TEST_INTERNAL_KEY = 'test_internal_service_key_consultation_2026';
  let customerUser: any;
  let adminUser: any;
  let customerToken: string;
  let adminToken: string;

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.INTERNAL_SERVICE_KEY = TEST_INTERNAL_KEY;

    customerUser = await db.createUser({
      email: `consult_user_${Date.now()}@example.com`,
      passwordHash: 'dummy_hash',
      role: Role.USER,
      walletBalance: 2000.0,
    });
    customerToken = `sess_cust_${Date.now()}`;
    await db.createSession({
      userId: customerUser.id,
      tokenHash: crypto.createHash('sha256').update(customerToken).digest('hex'),
      expiresAt: new Date(Date.now() + 3600000),
    });

    adminUser = await db.createUser({
      email: `consult_admin_${Date.now()}@example.com`,
      passwordHash: 'dummy_hash',
      role: Role.SUPER_ADMIN,
    });
    adminToken = `sess_adm_${Date.now()}`;
    await db.createSession({
      userId: adminUser.id,
      tokenHash: crypto.createHash('sha256').update(adminToken).digest('hex'),
      expiresAt: new Date(Date.now() + 3600000),
    });

    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  });

  after(async () => {
    delete process.env.INTERNAL_SERVICE_KEY;
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // 1. Unauthenticated rejection
  it('1. Unauthenticated request without headers is strictly rejected with HTTP 401', async () => {
    const res = await makeRequest(server, 'POST', '/api/wallet/settle-consultation', {}, {
      userId: customerUser.id,
      astrologerId: 'astro_001',
      sessionId: `sess_${Date.now()}`,
      totalDeduction: 100,
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'UNAUTHORIZED');
  });

  // 2. Invalid service key rejection
  it('2. Request with invalid X-Internal-Service-Key is strictly rejected with HTTP 401', async () => {
    const res = await makeRequest(server, 'POST', '/api/wallet/settle-consultation', {
      'X-Internal-Service-Key': 'forged_fake_secret_key_123',
    }, {
      userId: customerUser.id,
      astrologerId: 'astro_001',
      sessionId: `sess_${Date.now()}`,
      totalDeduction: 100,
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'UNAUTHORIZED');
  });

  // 3. Known compromised key rejection
  it('3. Request with known compromised fallback key is strictly rejected with HTTP 401', async () => {
    const compromisedKey = KNOWN_COMPROMISED_INTERNAL_KEYS
      ? Array.from(KNOWN_COMPROMISED_INTERNAL_KEYS)[0]
      : 'astroverse-internal-gateway-secret-2026';
    const res = await makeRequest(server, 'POST', '/api/wallet/settle-consultation', {
      'X-Internal-Service-Key': compromisedKey,
    }, {
      userId: customerUser.id,
      astrologerId: 'astro_001',
      sessionId: `sess_${Date.now()}`,
      totalDeduction: 100,
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'UNAUTHORIZED');
  });

  // 4. Missing required fields
  it('4. Valid internal key with missing sessionId or astrologerId returns HTTP 400 MISSING_FIELDS', async () => {
    const res = await makeRequest(server, 'POST', '/api/wallet/settle-consultation', {
      'X-Internal-Service-Key': TEST_INTERNAL_KEY,
    }, {
      userId: customerUser.id,
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'MISSING_FIELDS');
  });

  // 5. Missing target userId in internal service call
  it('5. Valid internal key without userId returns HTTP 400 MISSING_FIELDS', async () => {
    const res = await makeRequest(server, 'POST', '/api/wallet/settle-consultation', {
      'X-Internal-Service-Key': TEST_INTERNAL_KEY,
    }, {
      astrologerId: 'astro_001',
      sessionId: `sess_${Date.now()}`,
      totalDeduction: 100,
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'MISSING_FIELDS');
  });

  // 6. Non-existent astrologer
  it('6. Valid internal key with unknown astrologerId returns HTTP 404 ASTROLOGER_NOT_FOUND', async () => {
    const res = await makeRequest(server, 'POST', '/api/wallet/settle-consultation', {
      'X-Internal-Service-Key': TEST_INTERNAL_KEY,
    }, {
      userId: customerUser.id,
      astrologerId: 'astro_non_existent_9999',
      sessionId: `sess_${Date.now()}`,
      totalDeduction: 100,
    });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.error, 'ASTROLOGER_NOT_FOUND');
  });

  // 7. Non-existent user
  it('7. Valid internal key with unknown userId returns HTTP 404 USER_NOT_FOUND', async () => {
    const res = await makeRequest(server, 'POST', '/api/wallet/settle-consultation', {
      'X-Internal-Service-Key': TEST_INTERNAL_KEY,
    }, {
      userId: 'user_phantom_id_0000',
      astrologerId: 'astro_001',
      sessionId: `sess_${Date.now()}`,
      totalDeduction: 100,
    });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.error, 'USER_NOT_FOUND');
  });

  // 8. Insufficient user balance
  it('8. Valid internal key with deduction exceeding user balance returns HTTP 400 INSUFFICIENT_FUNDS', async () => {
    const res = await makeRequest(server, 'POST', '/api/wallet/settle-consultation', {
      'X-Internal-Service-Key': TEST_INTERNAL_KEY,
    }, {
      userId: customerUser.id,
      astrologerId: 'astro_001',
      sessionId: `sess_${Date.now()}`,
      totalDeduction: 5000.0, // Exceeds balance of 2000.0
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'INSUFFICIENT_FUNDS');
  });

  // 9. Successful settlement with deduction
  it('9. Valid internal key successfully deducts balance, credits astrologer, and returns SETTLED', async () => {
    const sessId = `sess_success_${Date.now()}`;
    const initialUser = await db.findUserById(customerUser.id);
    const initialBalance = initialUser!.walletBalance;
    const astro = await db.findAstrologerById('astro_001');
    const initialPayout = astro!.pendingPayout;

    const res = await makeRequest(server, 'POST', '/api/wallet/settle-consultation', {
      'X-Internal-Service-Key': TEST_INTERNAL_KEY,
    }, {
      userId: customerUser.id,
      astrologerId: 'astro_001',
      sessionId: sessId,
      totalDeduction: 150.0,
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'SETTLED');
    assert.strictEqual(res.body.totalDeduction, 150.0);
    assert.strictEqual(res.body.astroShare, 90.0); // 60%
    assert.strictEqual(res.body.platformShare, 60.0); // 40%
    assert.strictEqual(res.body.newBalance, initialBalance - 150.0);

    const updatedUser = await db.findUserById(customerUser.id);
    assert.strictEqual(updatedUser!.walletBalance, initialBalance - 150.0);

    const updatedAstro = await db.findAstrologerById('astro_001');
    assert.strictEqual(updatedAstro!.pendingPayout, initialPayout + 90.0);
  });

  // 10. Idempotency test (no double debit)
  it('10. Duplicate settlement call returns ALREADY_SETTLED without double deduction', async () => {
    const sessId = `sess_idempotent_${Date.now()}`;
    // First call
    const res1 = await makeRequest(server, 'POST', '/api/wallet/settle-consultation', {
      'X-Internal-Service-Key': TEST_INTERNAL_KEY,
    }, {
      userId: customerUser.id,
      astrologerId: 'astro_001',
      sessionId: sessId,
      totalDeduction: 50.0,
    });
    assert.strictEqual(res1.status, 200);
    const balanceAfterFirst = res1.body.newBalance;

    // Second duplicate call
    const res2 = await makeRequest(server, 'POST', '/api/wallet/settle-consultation', {
      'X-Internal-Service-Key': TEST_INTERNAL_KEY,
    }, {
      userId: customerUser.id,
      astrologerId: 'astro_001',
      sessionId: sessId,
      totalDeduction: 50.0,
    });
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.body.status, 'ALREADY_SETTLED');
    assert.strictEqual(res2.body.alreadySettled, true);
    assert.strictEqual(res2.body.newBalance, balanceAfterFirst);

    const checkUser = await db.findUserById(customerUser.id);
    assert.strictEqual(checkUser!.walletBalance, balanceAfterFirst);
  });

  // 11. Dual endpoint reachability (/api/consultation/settle)
  it('11. POST /api/consultation/settle works identically to /api/wallet/settle-consultation', async () => {
    const sessId = `sess_alias_${Date.now()}`;
    const res = await makeRequest(server, 'POST', '/api/consultation/settle', {
      'X-Internal-Service-Key': TEST_INTERNAL_KEY,
    }, {
      userId: customerUser.id,
      astrologerId: 'astro_001',
      sessionId: sessId,
      amount: 45.0, // Tests 'amount' alias as well
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'SETTLED');
  });

  // 12. Cross-user settlement prevention for regular users
  it('12. Regular user cannot settle for another user (HTTP 403 FORBIDDEN)', async () => {
    const otherUser = await db.createUser({
      email: `other_${Date.now()}@example.com`,
      passwordHash: 'dummy',
      role: Role.USER,
      walletBalance: 500,
    });
    const res = await makeRequest(server, 'POST', '/api/wallet/settle-consultation', {
      Authorization: `Bearer ${customerToken}`,
    }, {
      userId: otherUser.id,
      astrologerId: 'astro_001',
      sessionId: `sess_hack_${Date.now()}`,
      totalDeduction: 50,
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, 'FORBIDDEN');
  });

  // 13. Super Admin can settle for any user
  it('13. Super Admin Bearer token can settle consultation for a user account', async () => {
    const sessId = `sess_admin_${Date.now()}`;
    const res = await makeRequest(server, 'POST', '/api/wallet/settle-consultation', {
      Authorization: `Bearer ${adminToken}`,
    }, {
      userId: customerUser.id,
      astrologerId: 'astro_001',
      sessionId: sessId,
      totalDeduction: 20.0,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'SETTLED');
  });

  // 14. Alias header x-astroverse-internal-key verification
  it('14. Request with X-Astroverse-Internal-Key alias is accepted', async () => {
    const sessId = `sess_alias_header_${Date.now()}`;
    const res = await makeRequest(server, 'POST', '/api/wallet/settle-consultation', {
      'x-astroverse-internal-key': TEST_INTERNAL_KEY,
    }, {
      userId: customerUser.id,
      astrologerId: 'astro_001',
      sessionId: sessId,
      totalDeduction: 30.0,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'SETTLED');
  });

  // 15. Server-authoritative charge calculation based on duration
  it('15. Settle with duration calculates correct charge based on astrologer rate', async () => {
    const sessId = `sess_dur_${Date.now()}`;
    const res = await makeRequest(server, 'POST', '/api/wallet/settle-consultation', {
      'X-Internal-Service-Key': TEST_INTERNAL_KEY,
    }, {
      userId: customerUser.id,
      astrologerId: 'astro_001', // rate is 45.00/min
      sessionId: sessId,
      durationMinutes: 2, // 2 mins * 45 = 90
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.totalDeduction, 90.0);
  });

  // 16. Tampered under-deduction rejected
  it('16. Request with totalDeduction less than rate for duration is rejected (TAMPERED_CHARGE)', async () => {
    const sessId = `sess_tamper_${Date.now()}`;
    const res = await makeRequest(server, 'POST', '/api/wallet/settle-consultation', {
      'X-Internal-Service-Key': TEST_INTERNAL_KEY,
    }, {
      userId: customerUser.id,
      astrologerId: 'astro_001', // rate is 45.00/min
      sessionId: sessId,
      durationMinutes: 2, // minimum is 90
      totalDeduction: 10.0, // under-reporting
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'TAMPERED_CHARGE');
  });
});
