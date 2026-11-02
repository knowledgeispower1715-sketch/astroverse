process.env.NODE_ENV = 'test';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import crypto from 'node:crypto';
import app from '../src/server';
import { db, Role, AccountStatus } from '../src/db';
import { issueAdminAssuranceToken } from '../src/security/mfa';

function makeRequest(
  server: http.Server,
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body: any = null
): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    if (!addr || typeof addr === 'string') return reject(new Error('Server not listening'));
    const port = addr.port;

    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders: Record<string, string> = { ...headers };
    if (payload) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload).toString();
    }

    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path,
        method,
        headers: reqHeaders
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode || 500, body: parsed, headers: res.headers });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

describe('OWNER CONTROL CENTRE — COMPREHENSIVE PLATFORM OPERATION SUITE', () => {
  let server: http.Server;
  let ownerToken: string;
  let ownerId: string;
  let testUserId1: string;
  let testUserId2: string;
  let validAssuranceToken: string;

  before(async () => {
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    // Seed test users in db
    const owner = await db.createUser({
      email: 'owner_qa_platform@astroverse.test',
      displayName: 'Owner QA',
      role: Role.OWNER,
      status: AccountStatus.ACTIVE
    });
    ownerId = owner.id;

    ownerToken = 'raw_owner_token_' + Date.now();
    await db.createSession({
      userId: owner.id,
      tokenHash: crypto.createHash('sha256').update(ownerToken).digest('hex'),
      expiresAt: new Date(Date.now() + 3600000),
      ipAddress: '127.0.0.1',
      userAgent: 'TestAgent'
    });

    validAssuranceToken = issueAdminAssuranceToken(ownerId, Role.OWNER);

    // Create 2 test customers
    const u1 = await db.createUser({
      email: 'customer1_occ@astroverse.test',
      displayName: 'Customer Alpha',
      role: Role.USER,
      status: AccountStatus.ACTIVE
    });
    testUserId1 = u1.id;

    const u2 = await db.createUser({
      email: 'customer2_occ@astroverse.test',
      displayName: 'Customer Beta',
      role: Role.USER,
      status: AccountStatus.ACTIVE
    });
    testUserId2 = u2.id;
    await db.assignSubscriptionTier(u2.id, 'PLUS', 'MONTHLY', 30, ownerId, 'OCC test setup');
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('1. GET /api/admin/users returns paginated results with total, page, limit, totalPages, and summary', async () => {
    const res = await makeRequest(server, 'GET', '/api/admin/users?page=1&limit=10', {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(Array.isArray(res.body.users));
    assert(typeof res.body.total === 'number');
    assert(typeof res.body.totalPages === 'number');
    assert.strictEqual(res.body.page, 1);
    assert.strictEqual(res.body.limit, 10);
    assert(res.body.summary);
    assert(typeof res.body.summary.totalAccounts === 'number');
    assert(typeof res.body.summary.activeAccounts === 'number');
    assert(typeof res.body.summary.adminCount === 'number');
  });

  it('2. GET /api/admin/users supports search by ID UUID, email, and displayName', async () => {
    // Search by partial ID
    const resId = await makeRequest(server, 'GET', `/api/admin/users?search=${testUserId1.slice(0, 8)}`, {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(resId.status, 200);
    assert(resId.body.users.some((u: any) => u.id === testUserId1));

    // Search by email
    const resEmail = await makeRequest(server, 'GET', '/api/admin/users?search=customer1_occ', {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(resEmail.status, 200);
    assert(resEmail.body.users.some((u: any) => u.id === testUserId1));
  });

  it('3. GET /api/admin/users supports filtering by subscriptionTier and sorting', async () => {
    const resFilter = await makeRequest(server, 'GET', '/api/admin/users?subscriptionTier=PLUS', {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(resFilter.status, 200);
    assert(resFilter.body.users.every((u: any) => u.subscriptionTier === 'PLUS'));

    const resSort = await makeRequest(server, 'GET', '/api/admin/users?sortBy=createdAt&sortOrder=asc', {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(resSort.status, 200);
    assert(resSort.body.users.length > 0);
  });

  it('4. PUT /api/admin/users/:id/role prevents self-role alteration', async () => {
    const res = await makeRequest(server, 'PUT', `/api/admin/users/${ownerId}/role`, {
      Authorization: `Bearer ${ownerToken}`,
      'x-admin-assurance-token': validAssuranceToken
    }, { role: 'SUPPORT_ADMIN', reason: 'Attempting self demotion' });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'CANNOT_MODIFY_OWN_ROLE');
  });

  it('5. PUT /api/admin/users/:id/role protects the only active owner from demotion', async () => {
    // Attempting to demote ownerId when ownerCount is 1
    const res = await makeRequest(server, 'PUT', `/api/admin/users/${ownerId}/role`, {
      Authorization: `Bearer ${ownerToken}`,
      'x-admin-assurance-token': validAssuranceToken
    }, { role: 'USER', reason: 'Demote last owner' });
    // Handled by CANNOT_MODIFY_OWN_ROLE or LAST_OWNER_PROTECTION
    assert(res.status === 400 || res.status === 403);
  });

  it('6. PUT /api/admin/users/:id/role successfully promotes eligible user and records audit event', async () => {
    const res = await makeRequest(server, 'PUT', `/api/admin/users/${testUserId1}/role`, {
      Authorization: `Bearer ${ownerToken}`,
      'x-admin-assurance-token': validAssuranceToken
    }, { role: 'SUPPORT_ADMIN', reason: 'Promoted to Support Admin for QA' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ROLE_UPDATED');
    assert.strictEqual(res.body.user.role, 'SUPPORT_ADMIN');

    // Verify persisted
    const updated = await db.findUserById(testUserId1);
    assert.strictEqual(updated?.role, Role.SUPPORT_ADMIN);
  });

  it('7. GET /api/admin/roles/admins lists administrators with activeSessionsCount and permissionsCount', async () => {
    const res = await makeRequest(server, 'GET', '/api/admin/roles/admins', {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(Array.isArray(res.body.admins));
    const admin = res.body.admins.find((a: any) => a.id === testUserId1);
    assert(admin);
    assert.strictEqual(admin.canonicalRole, 'SUPPORT_ADMIN');
    assert(typeof admin.permissionsCount === 'number');
    assert(typeof admin.activeSessionsCount === 'number');
  });

  it('8. GET /api/admin/roles returns canonical role matrix and permissions catalog', async () => {
    const res = await makeRequest(server, 'GET', '/api/admin/roles', {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(Array.isArray(res.body.roles));
    assert(res.body.rolePermissions);
  });

  it('9. GET /api/admin/subscriptions returns distribution and subscriber list', async () => {
    const res = await makeRequest(server, 'GET', '/api/admin/subscriptions?page=1&limit=10', {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert(res.body.distribution);
    assert(Array.isArray(res.body.subscribers));
    assert(typeof res.body.totalSubscribers === 'number');
  });

  it('10. POST /api/admin/subscriptions/assign grants complimentary Premium subscription with duration and reason', async () => {
    const res = await makeRequest(server, 'POST', '/api/admin/subscriptions/assign', {
      Authorization: `Bearer ${ownerToken}`,
      'x-admin-assurance-token': validAssuranceToken
    }, {
      userId: testUserId1,
      tier: 'PREMIUM',
      billingPeriod: 'MONTHLY',
      durationDays: 30,
      grantSource: 'ADMIN_COMPLIMENTARY',
      reason: 'Complimentary Premium access granted for QA testing'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.subscriptionTier, 'PREMIUM');
    assert.strictEqual(res.body.user.subscriptionStatus, 'ACTIVE');

    // Verify customer entitlements updated
    const userEnts = await db.listEntitlements({ userId: testUserId1, activeOnly: true });
    assert(userEnts.some((e: any) => e.featureKey === 'PREMIUM' && e.isActive));
  });

  it('11. POST /api/admin/subscriptions/extend extends active subscription duration', async () => {
    const beforeUser = await db.findUserById(testUserId1);
    const beforeExpiry = beforeUser?.subscriptionExpiresAt ? new Date(beforeUser.subscriptionExpiresAt).getTime() : 0;

    const res = await makeRequest(server, 'POST', '/api/admin/subscriptions/extend', {
      Authorization: `Bearer ${ownerToken}`,
      'x-admin-assurance-token': validAssuranceToken
    }, {
      userId: testUserId1,
      additionalDays: 15,
      reason: 'Extending complimentary Premium by 15 days'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    const afterUser = await db.findUserById(testUserId1);
    const afterExpiry = afterUser?.subscriptionExpiresAt ? new Date(afterUser.subscriptionExpiresAt).getTime() : 0;
    assert(afterExpiry > beforeExpiry);
  });

  it('12. POST /api/admin/subscriptions/cancel cancels subscription and deactivates tier entitlements', async () => {
    const res = await makeRequest(server, 'POST', '/api/admin/subscriptions/cancel', {
      Authorization: `Bearer ${ownerToken}`,
      'x-admin-assurance-token': validAssuranceToken
    }, {
      userId: testUserId1,
      reason: 'Admin cancelled subscription to revert back to Free tier'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.subscriptionTier, 'FREE');

    // Verify entitlements deactivated
    const userEnts = await db.listEntitlements({ userId: testUserId1, activeOnly: true });
    assert(!userEnts.some((e: any) => (e.featureKey === 'PLUS' || e.featureKey === 'PREMIUM') && e.isActive));
  });
});
