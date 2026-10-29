process.env.NODE_ENV = 'test';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import crypto from 'crypto';
import app from '../src/server';
import { db, Role, AccountStatus } from '../src/db';
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
});
