process.env.NODE_ENV = 'test';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import crypto from 'crypto';
import app from '../src/server';
import { db, Role, AccountStatus, OrderStatus } from '../src/db';
import { checkSchemaReadiness, APPLICATION_TABLES } from '../src/schemaBootstrap';
import { provisionAdmin, CANONICAL_ADMIN_ROLES } from '../src/scripts/provisionAdmin';
import { generateTotpSecret, generateTotpCode } from '../src/security/mfa';

function makeRequest(
  server: http.Server,
  method: string,
  reqPath: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const port = (server.address() as any).port;
    const reqHeaders: Record<string, string> = { ...headers };
    let reqBody: string | undefined;

    if (body !== undefined) {
      reqBody = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = String(Buffer.byteLength(reqBody));
    }

    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: reqPath,
        method,
        headers: reqHeaders
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          let parsed: any;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({ status: res.statusCode || 0, headers: res.headers, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (reqBody) {
      req.write(reqBody);
    }
    req.end();
  });
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

describe('ASTROVERSE ADMINISTRATIVE CONTROL CENTRE & DEDICATED LOGIN SUITE', () => {
  let server: http.Server;
  const ts = Date.now();
  const testOwnerEmail = `owner.control.${ts}@astroverse.app`;
  const testCustomerEmail = `customer.seeker.${ts}@astroverse.app`;
  const testMfaAdminEmail = `mfa.security.${ts}@astroverse.app`;
  const adminPassword = 'SuperSecretAdmin123!';
  const customerPassword = 'CustomerSecretPass123!';
  let mfaSecret: string;

  before(async () => {
    process.env.ASTROVERSE_BOOTSTRAP_SECRET = 'secure_bootstrap_token_987654321_alpha';
    process.env.ASTROVERSE_ADMIN_EMAILS = testOwnerEmail;

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });

    // 1. Seed Owner with Password
    const ownerSalt = crypto.randomBytes(16).toString('hex');
    await db.createUser({
      email: testOwnerEmail,
      displayName: 'Platform Owner',
      role: Role.OWNER,
      status: AccountStatus.ACTIVE,
      emailVerified: true,
      passwordSalt: ownerSalt,
      passwordHash: hashPassword(adminPassword, ownerSalt),
      walletBalance: 0.00
    });

    // 2. Seed Ordinary Customer with Password
    const customerSalt = crypto.randomBytes(16).toString('hex');
    await db.createUser({
      email: testCustomerEmail,
      displayName: 'Customer Seeker',
      role: Role.USER,
      status: AccountStatus.ACTIVE,
      emailVerified: true,
      passwordSalt: customerSalt,
      passwordHash: hashPassword(customerPassword, customerSalt),
      walletBalance: 0.00
    });

    // 3. Seed Admin with MFA
    const mfaSalt = crypto.randomBytes(16).toString('hex');
    mfaSecret = generateTotpSecret().secret;
    const mfaAdminUser = await db.createUser({
      email: testMfaAdminEmail,
      displayName: 'Security Admin',
      role: Role.SECURITY_ADMIN,
      status: AccountStatus.ACTIVE,
      emailVerified: true,
      passwordSalt: mfaSalt,
      passwordHash: hashPassword(adminPassword, mfaSalt),
      walletBalance: 0.00
    });
    await db.updateUser(mfaAdminUser.id, {
      mfaEnabled: true,
      mfaSecret
    });
  });

  after(async () => {
    delete process.env.ASTROVERSE_BOOTSTRAP_SECRET;
    delete process.env.ASTROVERSE_ADMIN_EMAILS;
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // Test 1: Validation
  it('1. POST /api/auth/admin-login rejects missing email or password', async () => {
    const res1 = await makeRequest(server, 'POST', '/api/auth/admin-login', {}, { email: '' });
    assert.strictEqual(res1.status, 400);
    assert.strictEqual(res1.body.error, 'FIELDS_REQUIRED');

    const res2 = await makeRequest(server, 'POST', '/api/auth/admin-login', {}, { email: testOwnerEmail });
    assert.strictEqual(res2.status, 400);
    assert.strictEqual(res2.body.error, 'FIELDS_REQUIRED');
  });

  // Test 2: Invalid credentials
  it('2. POST /api/auth/admin-login rejects incorrect password', async () => {
    const res = await makeRequest(server, 'POST', '/api/auth/admin-login', {}, {
      email: testOwnerEmail,
      password: 'WrongPassword999!'
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'INVALID_CREDENTIALS');
  });

  // Test 3: STRICT CUSTOMER ISOLATION
  it('3. POST /api/auth/admin-login rejects ordinary customer account (Role.USER) with HTTP 403', async () => {
    const res = await makeRequest(server, 'POST', '/api/auth/admin-login', {}, {
      email: testCustomerEmail,
      password: customerPassword
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, 'ADMIN_NOT_AUTHORIZED');
    assert.strictEqual(res.body.message, 'This account does not have administrative privileges.');
  });

  // Test 4: Successful Admin Login
  it('4. POST /api/auth/admin-login successfully authenticates authorized OWNER', async () => {
    const res = await makeRequest(server, 'POST', '/api/auth/admin-login', {}, {
      email: testOwnerEmail,
      password: adminPassword
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'AUTHENTICATED');
    assert.ok(res.body.sessionToken, 'Must issue 256-bit session token');
    assert.ok(res.body.assuranceToken, 'Must issue admin step-up assurance token');
    assert.strictEqual(res.body.user.role, 'OWNER');
    assert.ok(Array.isArray(res.body.permissions), 'Must return permission matrix');
    assert.ok(res.body.permissions.length > 10, 'Owner must receive full permissions');
  });

  // Test 5: Allowlist Enforcement
  it('5. POST /api/auth/admin-login rejects admin email missing from server allowlist', async () => {
    process.env.ASTROVERSE_ADMIN_EMAILS = 'other.owner@astroverse.app';
    const res = await makeRequest(server, 'POST', '/api/auth/admin-login', {}, {
      email: testOwnerEmail,
      password: adminPassword
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, 'ADMIN_NOT_AUTHORIZED');
    // Restore allowlist
    process.env.ASTROVERSE_ADMIN_EMAILS = `${testOwnerEmail}, ${testMfaAdminEmail}`;
  });

  // Test 6: MFA Step-Up Flow
  it('6. POST /api/auth/admin-login requires MFA code for MFA-enabled administrator', async () => {
    // Attempt without MFA code
    const res1 = await makeRequest(server, 'POST', '/api/auth/admin-login', {}, {
      email: testMfaAdminEmail,
      password: adminPassword
    });
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.body.status, 'MFA_REQUIRED');

    // Attempt with invalid MFA code
    const res2 = await makeRequest(server, 'POST', '/api/auth/admin-login', {}, {
      email: testMfaAdminEmail,
      password: adminPassword,
      mfaCode: '000000'
    });
    assert.strictEqual(res2.status, 401);
    assert.strictEqual(res2.body.error, 'INVALID_MFA_CODE');

    // Attempt with valid TOTP code
    const validCode = generateTotpCode(mfaSecret);
    const res3 = await makeRequest(server, 'POST', '/api/auth/admin-login', {}, {
      email: testMfaAdminEmail,
      password: adminPassword,
      mfaCode: validCode
    });
    assert.strictEqual(res3.status, 200);
    assert.strictEqual(res3.body.status, 'AUTHENTICATED');
    assert.strictEqual(res3.body.user.role, 'SECURITY_ADMIN');
  });

  // Test 7: Bootstrap Status API
  it('7. GET /api/admin/bootstrap-status accurately reports platform readiness', async () => {
    const res = await makeRequest(server, 'GET', '/api/admin/bootstrap-status');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ownerExists, true);
    assert.strictEqual(res.body.bootstrapConfigured, true);
    assert.strictEqual(res.body.cliProvisioningSupported, true);
  });

  // Test 8: First-Owner Bootstrap Closed Guard
  it('8. POST /api/admin/bootstrap-first-owner permanently rejects when active OWNER already exists', async () => {
    const res = await makeRequest(server, 'POST', '/api/admin/bootstrap-first-owner', {}, {
      bootstrapSecret: 'secure_bootstrap_token_987654321_alpha',
      email: 'intruder.owner@example.com',
      password: 'HackerPassword123!'
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, 'OWNER_ALREADY_EXISTS');
  });

  // Test 9: First-Owner Bootstrap Secret Validation
  it('9. POST /api/admin/bootstrap-first-owner fails closed on invalid secret', async () => {
    const res = await makeRequest(server, 'POST', '/api/admin/bootstrap-first-owner', {}, {
      bootstrapSecret: 'wrong_secret',
      email: 'new.owner@example.com',
      password: 'StrongPassword123!'
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'INVALID_BOOTSTRAP_SECRET');
  });

  // Test 10: CLI Provisioning Script Integrity
  it('10. provisionAdmin CLI script successfully provisions and updates roles', async () => {
    const cliEmail = `cli.audit.owner.${Date.now()}@astroverse.app`;
    const result = await provisionAdmin({
      email: cliEmail,
      role: 'OWNER',
      displayName: 'CLI Audit Owner'
    });
    assert.strictEqual(result.action, 'CREATED');
    assert.strictEqual(result.user.role, 'OWNER');
    assert.strictEqual(result.user.email, cliEmail);

    const recheck = await db.findUserByIdentifier(cliEmail);
    assert.ok(recheck);
    assert.strictEqual(recheck.role, Role.OWNER);
  });

  // Test 11: Real Cashfree Refund Workflow & Paid Status Check
  it('11. POST /api/admin/payments/refund processes refunds for paid orders and rejects unpaid orders', async () => {
    // Authenticate as owner to obtain tokens
    const loginRes = await makeRequest(server, 'POST', '/api/auth/admin-login', {}, {
      email: testOwnerEmail,
      password: adminPassword
    });
    const authHeaders = {
      Authorization: `Bearer ${loginRes.body.sessionToken}`,
      'x-admin-assurance-token': loginRes.body.assuranceToken
    };

    // Seed test unpaid order
    const unpaidOrder = await db.createPaymentOrder({
      userId: 'test_user_refund_1',
      amount: 199.00,
      currency: 'INR',
      cfOrderId: `cf_order_unpaid_${Date.now()}`
    });

    // Seed test paid order
    const paidOrder = await db.createPaymentOrder({
      userId: 'test_user_refund_2',
      amount: 499.00,
      currency: 'INR',
      cfOrderId: `cf_order_paid_${Date.now()}`
    });
    paidOrder.status = OrderStatus.PAID;

    // 1. Attempt refund on unpaid order -> must reject with 400 ORDER_NOT_PAID
    const resUnpaid = await makeRequest(server, 'POST', '/api/admin/payments/refund', authHeaders, {
      orderId: unpaidOrder.id,
      amount: 199.00,
      reason: 'Customer cancelled before payment'
    });
    assert.strictEqual(resUnpaid.status, 400);
    assert.strictEqual(resUnpaid.body.error, 'ORDER_NOT_PAID');

    // 2. Process refund on paid order -> must succeed and record Cashfree refund metadata
    const resPaid = await makeRequest(server, 'POST', '/api/admin/payments/refund', authHeaders, {
      orderId: paidOrder.id,
      amount: 499.00,
      reason: 'Customer satisfaction refund'
    });
    assert.strictEqual(resPaid.status, 200);
    assert.strictEqual(resPaid.body.success, true);
    assert.strictEqual(resPaid.body.order.status, OrderStatus.REFUNDED);
    assert.ok(resPaid.body.refund.cf_refund_id, 'Must contain Cashfree cf_refund_id');

    // 3. Duplicate refund attempt -> must reject with 400 ALREADY_REFUNDED
    const resDuplicate = await makeRequest(server, 'POST', '/api/admin/payments/refund', authHeaders, {
      orderId: paidOrder.id,
      amount: 499.00,
      reason: 'Duplicate attempt'
    });
    assert.strictEqual(resDuplicate.status, 400);
    assert.strictEqual(resDuplicate.body.error, 'ALREADY_REFUNDED');
  });

  // Test 12: Real Astrology Engine Calibration Assertions
  it('12. POST /api/admin/astrology/test-calculation runs live ephemeris assertions against reference baseline', async () => {
    const loginRes = await makeRequest(server, 'POST', '/api/auth/admin-login', {}, {
      email: testOwnerEmail,
      password: adminPassword
    });
    const authHeaders = {
      Authorization: `Bearer ${loginRes.body.sessionToken}`
    };

    const res = await makeRequest(server, 'POST', '/api/admin/astrology/test-calculation', authHeaders);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.calibrationStatus, 'CALIBRATED_PASSED');
    assert.strictEqual(res.body.toleranceThresholdDeg, 0.05);
    assert.strictEqual(res.body.livePositions.lagna.match, true);
    assert.strictEqual(res.body.livePositions.sun.match, true);
    assert.strictEqual(res.body.livePositions.moon.match, true);
    assert.strictEqual(res.body.livePositions.mars.match, true);
    assert.strictEqual(res.body.livePositions.jupiter.match, true);
  });

  // Test 13: External Integration Health Probes
  it('13. GET /api/admin/integrations reports health status for all 5 core external subsystems', async () => {
    const loginRes = await makeRequest(server, 'POST', '/api/auth/admin-login', {}, {
      email: testOwnerEmail,
      password: adminPassword
    });
    const authHeaders = {
      Authorization: `Bearer ${loginRes.body.sessionToken}`
    };

    const res = await makeRequest(server, 'GET', '/api/admin/integrations', authHeaders);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.integrations));
    assert.strictEqual(res.body.integrations.length, 5);

    const names = res.body.integrations.map((i: any) => i.name);
    assert.ok(names.includes('Cashfree Payment Gateway'));
    assert.ok(names.includes('Supabase Database & Auth'));
    assert.ok(names.includes('FastAPI Kundli Ephemeris'));
    assert.ok(names.includes('AI Consultation Pipeline'));
    assert.ok(names.includes('SMS Phone Gateway'));
  });

  // Test 14: Subscriptions Authoritative Statistics
  it('14. GET /api/admin/subscriptions returns accurate plan distribution and active subscriber counts', async () => {
    const loginRes = await makeRequest(server, 'POST', '/api/auth/admin-login', {}, {
      email: testOwnerEmail,
      password: adminPassword
    });
    const authHeaders = {
      Authorization: `Bearer ${loginRes.body.sessionToken}`
    };

    const res = await makeRequest(server, 'GET', '/api/admin/subscriptions', authHeaders);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.plans));
    assert.ok(res.body.distribution);
    assert.strictEqual(typeof res.body.distribution.FREE, 'number');
    assert.strictEqual(typeof res.body.distribution.PLUS, 'number');
    assert.strictEqual(typeof res.body.distribution.PREMIUM, 'number');
  });

  // Test 15: AI Quota Reconciliation & Stateful Overrides
  it('15. GET & PUT /api/admin/ai/quotas reconciles 30-query Premium limit and persists updates', async () => {
    const loginRes = await makeRequest(server, 'POST', '/api/auth/admin-login', {}, {
      email: testOwnerEmail,
      password: adminPassword
    });
    const authHeaders = {
      Authorization: `Bearer ${loginRes.body.sessionToken}`,
      'x-admin-assurance-token': loginRes.body.assuranceToken
    };

    // 1. Initial usage must return canonical 30 queries/day for Premium
    const usageRes1 = await makeRequest(server, 'GET', '/api/admin/ai/usage', authHeaders);
    assert.strictEqual(usageRes1.status, 200);
    assert.strictEqual(usageRes1.body.quotas.freeTierDailyQueries, 3);
    assert.strictEqual(usageRes1.body.quotas.plusTierDailyQueries, 15);
    assert.strictEqual(usageRes1.body.quotas.premiumTierDailyQueries, 30);

    // 2. Administrative quota update
    const putRes = await makeRequest(server, 'PUT', '/api/admin/ai/quotas', authHeaders, {
      freeLimit: 5,
      plusLimit: 20,
      premiumLimit: 40
    });
    assert.strictEqual(putRes.status, 200);
    assert.strictEqual(putRes.body.success, true);
    assert.strictEqual(putRes.body.quotas.premiumTierDailyQueries, 40);

    // 3. Verify updated quota persists on subsequent retrieval
    const usageRes2 = await makeRequest(server, 'GET', '/api/admin/ai/usage', authHeaders);
    assert.strictEqual(usageRes2.status, 200);
    assert.strictEqual(usageRes2.body.quotas.premiumTierDailyQueries, 40);

    // Reset back to canonical 30
    await makeRequest(server, 'PUT', '/api/admin/ai/quotas', authHeaders, {
      freeLimit: 3,
      plusLimit: 15,
      premiumLimit: 30
    });
  });

  // Test 16: Database RLS Readiness Fail-Closed Guard
  it('16. checkSchemaReadiness fails closed if any application table lacks Row Level Security', async () => {
    // Case A: Mock where User table lacks RLS
    const mockPrismaMissingRls = {
      $queryRawUnsafe: async () => {
        return APPLICATION_TABLES.map(t => ({
          table_name: t,
          rls_enabled: t !== 'User' // User table has RLS disabled
        }));
      }
    };
    const resMissingRls = await checkSchemaReadiness(mockPrismaMissingRls);
    assert.strictEqual(resMissingRls.isReady, false, 'Must not be ready if User lacks RLS');
    assert.strictEqual(resMissingRls.missingRlsTables.includes('User'), true);

    // Case B: All tables exist and all have RLS enabled
    const mockPrismaAllReady = {
      $queryRawUnsafe: async () => {
        return APPLICATION_TABLES.map(t => ({
          table_name: t,
          rls_enabled: true
        }));
      }
    };
    const resReady = await checkSchemaReadiness(mockPrismaAllReady);
    assert.strictEqual(resReady.isReady, true);
    assert.strictEqual(resReady.missingTables.length, 0);
    assert.strictEqual(resReady.missingRlsTables.length, 0);
  });
});
