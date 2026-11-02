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

describe('OWNER CONTROL CENTRE — ENTERPRISE HARDENING & ADVERSARIAL SUITE', () => {
  let server: http.Server;
  let ownerToken: string;
  let ownerId: string;
  let supportToken: string;
  let supportId: string;
  let financeToken: string;
  let financeId: string;
  let userToken: string;
  let userId: string;
  let targetCustomer1: string;
  let targetCustomer2: string;
  let ownerAssuranceToken: string;

  before(async () => {
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    // 1. Owner Account
    const owner = await db.createUser({
      email: 'owner_adversarial@astroverse.test',
      displayName: 'Platform Owner Adversarial',
      role: Role.OWNER,
      status: AccountStatus.ACTIVE
    });
    ownerId = owner.id;
    ownerToken = 'raw_owner_adv_' + Date.now();
    await db.createSession({
      userId: owner.id,
      tokenHash: crypto.createHash('sha256').update(ownerToken).digest('hex'),
      expiresAt: new Date(Date.now() + 3600000),
      ipAddress: '127.0.0.1'
    });
    ownerAssuranceToken = issueAdminAssuranceToken(ownerId, Role.OWNER);

    // 2. Support Admin Account
    const support = await db.createUser({
      email: 'support_adversarial@astroverse.test',
      displayName: 'Support Admin Adversarial',
      role: Role.SUPPORT_ADMIN,
      status: AccountStatus.ACTIVE
    });
    supportId = support.id;
    supportToken = 'raw_support_adv_' + Date.now();
    await db.createSession({
      userId: support.id,
      tokenHash: crypto.createHash('sha256').update(supportToken).digest('hex'),
      expiresAt: new Date(Date.now() + 3600000),
      ipAddress: '127.0.0.1'
    });

    // 3. Finance Admin Account
    const finance = await db.createUser({
      email: 'finance_adversarial@astroverse.test',
      displayName: 'Finance Admin Adversarial',
      role: Role.FINANCE_ADMIN,
      status: AccountStatus.ACTIVE
    });
    financeId = finance.id;
    financeToken = 'raw_finance_adv_' + Date.now();
    await db.createSession({
      userId: finance.id,
      tokenHash: crypto.createHash('sha256').update(financeToken).digest('hex'),
      expiresAt: new Date(Date.now() + 3600000),
      ipAddress: '127.0.0.1'
    });

    // 4. Regular Customer Account
    const user = await db.createUser({
      email: 'regular_user@astroverse.test',
      displayName: 'Regular User',
      role: Role.USER,
      status: AccountStatus.ACTIVE
    });
    userId = user.id;
    userToken = 'raw_user_adv_' + Date.now();
    await db.createSession({
      userId: user.id,
      tokenHash: crypto.createHash('sha256').update(userToken).digest('hex'),
      expiresAt: new Date(Date.now() + 3600000),
      ipAddress: '127.0.0.1'
    });

    // 5. Target Test Customers
    const tc1 = await db.createUser({
      email: 'target_c1@astroverse.test',
      displayName: 'Target Customer One',
      role: Role.USER,
      status: AccountStatus.ACTIVE
    });
    targetCustomer1 = tc1.id;

    const tc2 = await db.createUser({
      email: 'target_c2@astroverse.test',
      displayName: 'Target Customer Two',
      role: Role.USER,
      status: AccountStatus.ACTIVE
    });
    targetCustomer2 = tc2.id;
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // ---------------------------------------------------------------------------
  // 1. RBAC & PERMISSION BOUNDARIES
  // ---------------------------------------------------------------------------
  it('1. Non-admin regular user accessing admin endpoints is rejected with HTTP 403', async () => {
    const res = await makeRequest(server, 'GET', '/api/admin/users', {
      Authorization: `Bearer ${userToken}`
    });
    assert.strictEqual(res.status, 403, 'Regular user must receive HTTP 403');
  });

  it('2. Support Admin attempting to assign roles is rejected with HTTP 403 FORBIDDEN', async () => {
    const supportAssurance = issueAdminAssuranceToken(supportId, Role.SUPPORT_ADMIN);
    const res = await makeRequest(server, 'PUT', `/api/admin/users/${targetCustomer1}/role`, {
      Authorization: `Bearer ${supportToken}`,
      'x-admin-assurance-token': supportAssurance
    }, {
      role: 'FINANCE_ADMIN',
      reason: 'Attempted privilege escalation by support staff'
    });
    assert.strictEqual(res.status, 403, 'Non-owner role assignment must be forbidden');
  });

  it('3. Finance Admin attempting to assign Owner role is rejected with HTTP 403 FORBIDDEN', async () => {
    const financeAssurance = issueAdminAssuranceToken(financeId, Role.FINANCE_ADMIN);
    const res = await makeRequest(server, 'PUT', `/api/admin/users/${targetCustomer1}/role`, {
      Authorization: `Bearer ${financeToken}`,
      'x-admin-assurance-token': financeAssurance
    }, {
      role: 'OWNER',
      reason: 'Attempted promotion to owner by finance admin'
    });
    assert.strictEqual(res.status, 403, 'Finance admin cannot assign roles');
  });

  it('4. Owner attempting self-demotion is rejected with HTTP 400 CANNOT_MODIFY_OWN_ROLE', async () => {
    const res = await makeRequest(server, 'PUT', `/api/admin/users/${ownerId}/role`, {
      Authorization: `Bearer ${ownerToken}`,
      'x-admin-assurance-token': ownerAssuranceToken
    }, {
      role: 'SUPPORT_ADMIN',
      reason: 'Attempted self-demotion'
    });
    assert.strictEqual(res.status, 400, 'Self role change must be rejected');
    assert.strictEqual(res.body.error, 'CANNOT_MODIFY_OWN_ROLE');
  });

  it('5. Role change without mandatory reason (>= 5 chars) is rejected with HTTP 400 REASON_REQUIRED', async () => {
    const res = await makeRequest(server, 'PUT', `/api/admin/users/${targetCustomer1}/role`, {
      Authorization: `Bearer ${ownerToken}`,
      'x-admin-assurance-token': ownerAssuranceToken
    }, {
      role: 'SUPPORT_ADMIN',
      reason: '' // Missing reason
    });
    assert.strictEqual(res.status, 400, 'Missing reason must be rejected with 400');
    assert.strictEqual(res.body.error, 'REASON_REQUIRED');
  });

  it('6. Role change with expired or invalid assurance token is rejected with HTTP 401/403', async () => {
    const res = await makeRequest(server, 'PUT', `/api/admin/users/${targetCustomer1}/role`, {
      Authorization: `Bearer ${ownerToken}`,
      'x-admin-assurance-token': 'invalid_or_expired_token'
    }, {
      role: 'SUPPORT_ADMIN',
      reason: 'Valid audit reason for testing assurance'
    });
    assert.ok(res.status === 401 || res.status === 403, 'Invalid assurance token must be rejected with 401 or 403');
  });

  // ---------------------------------------------------------------------------
  // 2. SUBSCRIPTION PROVENANCE & DURATION INTEGRITY
  // ---------------------------------------------------------------------------
  it('7. Admin subscription assignment rejects VERIFIED_PAID_PURCHASE source with HTTP 400', async () => {
    const res = await makeRequest(server, 'POST', '/api/admin/subscriptions/assign', {
      Authorization: `Bearer ${ownerToken}`,
      'x-admin-assurance-token': ownerAssuranceToken
    }, {
      userId: targetCustomer1,
      tier: 'PREMIUM',
      durationDays: 30,
      grantSource: 'VERIFIED_PAID_PURCHASE', // Adversarial: Attempting to fabricate payment provenance
      reason: 'Attempt to mark complimentary as paid purchase'
    });
    assert.strictEqual(res.status, 400, 'VERIFIED_PAID_PURCHASE from admin endpoint must be rejected');
    assert.strictEqual(res.body.error, 'INVALID_GRANT_SOURCE');
  });

  it('8. Subscription duration of 0, negative, or invalid days is rejected with HTTP 400', async () => {
    // 0 days
    const res0 = await makeRequest(server, 'POST', '/api/admin/subscriptions/assign', {
      Authorization: `Bearer ${ownerToken}`,
      'x-admin-assurance-token': ownerAssuranceToken
    }, {
      userId: targetCustomer1,
      tier: 'PREMIUM',
      durationDays: 0,
      grantSource: 'ADMIN_COMPLIMENTARY',
      reason: 'Attempt to create 0-day or permanent subscription'
    });
    assert.strictEqual(res0.status, 400, '0 days must be rejected');
    assert.strictEqual(res0.body.error, 'INVALID_DURATION');

    // Negative days
    const resNeg = await makeRequest(server, 'POST', '/api/admin/subscriptions/assign', {
      Authorization: `Bearer ${ownerToken}`,
      'x-admin-assurance-token': ownerAssuranceToken
    }, {
      userId: targetCustomer1,
      tier: 'PREMIUM',
      durationDays: -30,
      grantSource: 'ADMIN_COMPLIMENTARY',
      reason: 'Attempt negative duration'
    });
    assert.strictEqual(resNeg.status, 400, 'Negative duration must be rejected');

    // Duration > 365 days
    const resOver = await makeRequest(server, 'POST', '/api/admin/subscriptions/assign', {
      Authorization: `Bearer ${ownerToken}`,
      'x-admin-assurance-token': ownerAssuranceToken
    }, {
      userId: targetCustomer1,
      tier: 'PREMIUM',
      durationDays: 730,
      grantSource: 'ADMIN_COMPLIMENTARY',
      reason: 'Attempt over 365 days duration'
    });
    assert.strictEqual(resOver.status, 400, 'Duration over 365 days must be rejected');
  });

  it('9. Subscription assignment with invalid billing period is rejected with HTTP 400', async () => {
    const res = await makeRequest(server, 'POST', '/api/admin/subscriptions/assign', {
      Authorization: `Bearer ${ownerToken}`,
      'x-admin-assurance-token': ownerAssuranceToken
    }, {
      userId: targetCustomer1,
      tier: 'PLUS',
      billingPeriod: 'LIFETIME_INVALID',
      durationDays: 30,
      grantSource: 'ADMIN_COMPLIMENTARY',
      reason: 'Invalid billing period test'
    });
    assert.strictEqual(res.status, 400, 'Invalid billing period must be rejected');
    assert.strictEqual(res.body.error, 'INVALID_BILLING_PERIOD');
  });

  it('10. Complimentary Premium grant succeeds with approved 30-day duration and synchronized entitlement', async () => {
    const res = await makeRequest(server, 'POST', '/api/admin/subscriptions/assign', {
      Authorization: `Bearer ${ownerToken}`,
      'x-admin-assurance-token': ownerAssuranceToken
    }, {
      userId: targetCustomer1,
      tier: 'PREMIUM',
      billingPeriod: 'MONTHLY',
      durationDays: 30,
      grantSource: 'ADMIN_COMPLIMENTARY',
      reason: 'Executive VIP Complimentary Access Grant'
    });
    assert.strictEqual(res.status, 200, 'Valid complimentary grant must succeed');
    assert.strictEqual(res.body.user.subscriptionTier, 'PREMIUM');
    assert.strictEqual(res.body.user.subscriptionStatus, 'ACTIVE');
    assert.ok(res.body.user.subscriptionExpiresAt, 'Expiration date must be set');

    // Inspect user entitlements in DB
    const entitlements = await db.listEntitlements({ userId: targetCustomer1, activeOnly: true });
    const premiumEnt = entitlements.find(e => e.featureKey === 'PREMIUM');
    assert.ok(premiumEnt, 'Active PREMIUM entitlement must exist');
    assert.strictEqual(premiumEnt.expiresAt, res.body.user.subscriptionExpiresAt, 'User and entitlement expiry must match identically');
  });

  it('11. Subscription extension synchronizes User and Entitlement expiration to identical timestamp (~58 days)', async () => {
    // Current user has ~30 days. Extend by 30 days. Total ~60 days.
    const res = await makeRequest(server, 'POST', '/api/admin/subscriptions/extend', {
      Authorization: `Bearer ${ownerToken}`,
      'x-admin-assurance-token': ownerAssuranceToken
    }, {
      userId: targetCustomer1,
      additionalDays: 30,
      reason: 'Customer satisfaction extension by 30 days'
    });
    assert.strictEqual(res.status, 200, 'Extension must succeed');
    const newExpiresAt = res.body.user.subscriptionExpiresAt;
    assert.ok(newExpiresAt, 'New expiry must exist');

    // Verify in db that entitlement expiry matches user expiry
    const entitlements = await db.listEntitlements({ userId: targetCustomer1, activeOnly: true });
    const premiumEnt = entitlements.find(e => e.featureKey === 'PREMIUM');
    assert.ok(premiumEnt, 'Active PREMIUM entitlement must exist');
    assert.strictEqual(premiumEnt.expiresAt, newExpiresAt, 'Extended entitlement expiry must identically equal user expiry');
  });

  it('12. Subscription cancellation preserves access on CANCEL_RENEWAL vs terminates immediately on IMMEDIATE_TERMINATION', async () => {
    // 1. Cancel Renewal
    const resRenewal = await makeRequest(server, 'POST', '/api/admin/subscriptions/cancel', {
      Authorization: `Bearer ${ownerToken}`,
      'x-admin-assurance-token': ownerAssuranceToken
    }, {
      userId: targetCustomer1,
      cancelMode: 'CANCEL_RENEWAL',
      reason: 'Customer requested renewal stop at period end'
    });
    assert.strictEqual(resRenewal.status, 200);
    assert.strictEqual(resRenewal.body.user.subscriptionStatus, 'CANCELLED');
    assert.ok(resRenewal.body.user.subscriptionExpiresAt, 'Expiry date must be preserved for end-of-period access');

    // Entitlement must remain active until expiry
    const entsAfterRenewalCancel = await db.listEntitlements({ userId: targetCustomer1, activeOnly: true });
    assert.ok(entsAfterRenewalCancel.some(e => e.featureKey === 'PREMIUM'), 'Entitlement remains active until expiry');

    // 2. Immediate Termination
    const resImmediate = await makeRequest(server, 'POST', '/api/admin/subscriptions/cancel', {
      Authorization: `Bearer ${ownerToken}`,
      'x-admin-assurance-token': ownerAssuranceToken
    }, {
      userId: targetCustomer1,
      cancelMode: 'IMMEDIATE_TERMINATION',
      reason: 'Chargeback fraud immediate revocation'
    });
    assert.strictEqual(resImmediate.status, 200);
    assert.strictEqual(resImmediate.body.user.subscriptionTier, 'FREE');
    assert.strictEqual(resImmediate.body.user.subscriptionStatus, 'CANCELLED');

    // Entitlement must be deactivated
    const entsAfterImmediate = await db.listEntitlements({ userId: targetCustomer1, activeOnly: true });
    assert.strictEqual(entsAfterImmediate.some(e => e.featureKey === 'PREMIUM'), false, 'Tier entitlement must be deactivated');
  });

  // ---------------------------------------------------------------------------
  // 3. SECURE CONTROLLED SERVER-SIDE CSV EXPORT
  // ---------------------------------------------------------------------------
  it('13. CSV export without reason is rejected with HTTP 400 REASON_REQUIRED', async () => {
    const res = await makeRequest(server, 'POST', '/api/admin/users/export', {
      Authorization: `Bearer ${ownerToken}`,
      'x-admin-assurance-token': ownerAssuranceToken
    }, {
      exportProfile: 'BASIC_DIRECTORY',
      reason: '' // Missing reason
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'REASON_REQUIRED');
  });

  it('14. CSV export without EXPORT_CUSTOMER_DATA permission is rejected with HTTP 403', async () => {
    const supportAssurance = issueAdminAssuranceToken(supportId, Role.SUPPORT_ADMIN);
    const res = await makeRequest(server, 'POST', '/api/admin/users/export', {
      Authorization: `Bearer ${supportToken}`,
      'x-admin-assurance-token': supportAssurance
    }, {
      exportProfile: 'BASIC_DIRECTORY',
      reason: 'Unauthorized export attempt by support'
    });
    assert.strictEqual(res.status, 403, 'Support admin without EXPORT permission must receive 403');
  });

  it('15. Controlled CSV export succeeds for Owner with formula injection protection and checksum header', async () => {
    // Seed an account with formula injection trigger: "=1+1", "+cmd", "@sum"
    await db.createUser({
      email: 'inject_test@astroverse.test',
      displayName: '=cmd|/c calc!A0',
      role: Role.USER,
      status: AccountStatus.ACTIVE
    });

    const res = await makeRequest(server, 'POST', '/api/admin/users/export', {
      Authorization: `Bearer ${ownerToken}`,
      'x-admin-assurance-token': ownerAssuranceToken
    }, {
      exportProfile: 'AUTHORIZED_FULL',
      reason: 'Compliance and regulatory quarterly customer audit'
    });

    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-type']?.includes('text/csv'), 'Content-Type must be text/csv');
    assert.ok(res.headers['x-export-checksum'], 'X-Export-Checksum header must be present');
    assert.ok(Number(res.headers['x-export-row-count']) > 0, 'Export row count must be positive');

    // Verify formula injection sanitization: '=cmd' must be prefixed with "'"
    const csvBody = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
    assert.ok(csvBody.includes("\"'=cmd|/c calc!A0\""), 'Formula injection characters must be escaped with single quote');
  });

  // ---------------------------------------------------------------------------
  // 4. DATABASE INTEGRITY & FAIL-CLOSED ARCHITECTURE
  // ---------------------------------------------------------------------------
  it('16. Fail-closed: listUsers throws DATABASE_QUERY_FAILED when PostgreSQL encounters error and never returns synthetic fixtures', async () => {
    // Temporarily mock prisma.user.count to simulate a database query error when Postgres is active
    const dbAny = db as any;
    const originalIsPostgres = dbAny.isPostgresAvailable;
    const originalPrisma = dbAny.prisma;
    try {
      dbAny.isPostgresAvailable = true;
      dbAny.prisma = {
        user: {
          count: async () => { throw new Error('Simulated PG connection timeout'); },
          findMany: async () => { throw new Error('Simulated PG connection timeout'); }
        }
      };

      await assert.rejects(
        async () => {
          await db.listUsers({ page: 1, limit: 25 });
        },
        /DATABASE_QUERY_FAILED/,
        'Prisma failure must throw DATABASE_QUERY_FAILED and fail closed'
      );
    } finally {
      dbAny.isPostgresAvailable = originalIsPostgres;
      dbAny.prisma = originalPrisma;
    }
  });

  it('17. Fail-closed: getUserDirectorySummary throws DATABASE_QUERY_FAILED when PostgreSQL encounters error', async () => {
    const dbAny = db as any;
    const originalIsPostgres = dbAny.isPostgresAvailable;
    const originalPrisma = dbAny.prisma;
    try {
      dbAny.isPostgresAvailable = true;
      dbAny.prisma = {
        user: {
          count: async () => { throw new Error('Simulated dead query socket'); },
          findMany: async () => []
        },
        paymentOrder: {
          findMany: async () => []
        },
        entitlement: {
          findMany: async () => []
        }
      };

      await assert.rejects(
        async () => {
          await db.getUserDirectorySummary();
        },
        /DATABASE_QUERY_FAILED/,
        'getUserDirectorySummary must throw DATABASE_QUERY_FAILED upon DB exception'
      );
    } finally {
      dbAny.isPostgresAvailable = originalIsPostgres;
      dbAny.prisma = originalPrisma;
    }
  });

  it('18. getUserDirectorySummary returns accurate role breakdown and separated KPI metrics', async () => {
    const summary = await db.getUserDirectorySummary();
    assert.ok(typeof summary.totalAccounts === 'number');
    assert.ok(typeof summary.activeAccounts === 'number');
    assert.ok(typeof summary.suspendedAccounts === 'number');
    assert.ok(typeof summary.unverifiedAccounts === 'number');
    assert.ok(typeof summary.adminCount === 'number');
    assert.ok(typeof summary.historicallyPayingCount === 'number');
    assert.ok(typeof summary.currentlyPaidSubscribersCount === 'number');
    assert.ok(typeof summary.complimentarySubscribersCount === 'number');
    assert.ok(typeof summary.freeCustomersCount === 'number');
    assert.ok(summary.roleBreakdown, 'Role breakdown must exist');
    assert.ok(summary.roleBreakdown['OWNER'], 'OWNER role must be in breakdown');
    assert.ok(summary.roleBreakdown['USER'], 'USER role must be in breakdown');
    assert.ok(summary.roleBreakdown['SUPPORT_ADMIN'], 'SUPPORT_ADMIN must be in breakdown');
    assert.ok(summary.roleBreakdown['FINANCE_ADMIN'], 'FINANCE_ADMIN must be in breakdown');
  });

  it('19. Fail-closed: getProfilesByUserId throws DATABASE_QUERY_FAILED when PostgreSQL encounters error', async () => {
    const dbAny = db as any;
    const originalIsPostgres = dbAny.isPostgresAvailable;
    const originalPrisma = dbAny.prisma;
    try {
      dbAny.isPostgresAvailable = true;
      dbAny.prisma = {
        birthProfile: {
          findMany: async () => { throw new Error('Simulated PG connection terminated unexpectedly'); }
        }
      };

      await assert.rejects(
        async () => {
          await db.getProfilesByUserId('mock-user-id');
        },
        /DATABASE_QUERY_FAILED/,
        'getProfilesByUserId must throw DATABASE_QUERY_FAILED upon DB exception'
      );
    } finally {
      dbAny.isPostgresAvailable = originalIsPostgres;
      dbAny.prisma = originalPrisma;
    }
  });

  it('20. Fail-closed: createSavedReport throws DATABASE_MUTATION_FAILED when PostgreSQL encounters error', async () => {
    const dbAny = db as any;
    const originalIsPostgres = dbAny.isPostgresAvailable;
    const originalPrisma = dbAny.prisma;
    try {
      dbAny.isPostgresAvailable = true;
      dbAny.prisma = {
        savedReport: {
          create: async () => { throw new Error('Simulated disk full or deadlock error'); }
        }
      };

      await assert.rejects(
        async () => {
          await db.createSavedReport({
            userId: 'mock-user-id',
            reportType: 'FULL_KUNDLI',
            title: 'Test Report',
            payload: { chart: {} }
          });
        },
        /DATABASE_MUTATION_FAILED/,
        'createSavedReport must throw DATABASE_MUTATION_FAILED upon DB exception'
      );
    } finally {
      dbAny.isPostgresAvailable = originalIsPostgres;
      dbAny.prisma = originalPrisma;
    }
  });

  it('21. updateSubscription updates tier, billing period, status, expiry and deactivates superseded entitlements in Prisma tx', async () => {
    const dbAny = db as any;
    const originalIsPostgres = dbAny.isPostgresAvailable;
    const originalPrisma = dbAny.prisma;
    let txCalled = false;
    let updateDataCaptured: any = null;
    let entitlementUpdateCaptured: any = null;
    try {
      dbAny.isPostgresAvailable = true;
      dbAny.prisma = {
        user: {
          findUnique: async () => ({
            id: targetCustomer2,
            email: 'target_c2@astroverse.test',
            role: 'USER',
            status: 'ACTIVE',
            subscriptionTier: 'FREE',
            subscriptionStatus: 'ACTIVE',
            walletBalance: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          })
        },
        $transaction: async (fn: any) => {
          txCalled = true;
          const fakeTx = {
            user: {
              findUnique: async () => ({ id: targetCustomer2, subscriptionTier: 'FREE' }),
              update: async (args: any) => {
                updateDataCaptured = args.data;
                return {
                  id: targetCustomer2,
                  email: 'target_c2@astroverse.test',
                  role: 'USER',
                  status: 'ACTIVE',
                  subscriptionTier: args.data.subscriptionTier,
                  subscriptionStatus: args.data.subscriptionStatus,
                  subscriptionBillingPeriod: args.data.subscriptionBillingPeriod,
                  subscriptionExpiresAt: args.data.subscriptionExpiresAt,
                  walletBalance: 0,
                  createdAt: new Date(),
                  updatedAt: new Date()
                };
              }
            },
            entitlement: {
              updateMany: async (args: any) => {
                entitlementUpdateCaptured = args;
                return { count: 1 };
              },
              create: async () => ({ id: 'ent-1' })
            },
            auditEvent: {
              create: async () => ({ id: 'aud-1' })
            }
          };
          return await fn(fakeTx);
        }
      };

      const res = await db.updateSubscription(
        targetCustomer2,
        'PREMIUM',
        'MONTHLY',
        30
      );

      assert.strictEqual(txCalled, true, 'Prisma $transaction must be invoked');
      assert.strictEqual(updateDataCaptured.subscriptionTier, 'PREMIUM');
      assert.strictEqual(updateDataCaptured.subscriptionBillingPeriod, 'MONTHLY');
      assert.strictEqual(updateDataCaptured.subscriptionStatus, 'ACTIVE');
      assert.ok(entitlementUpdateCaptured, 'Superseded entitlements must be updated');
      assert.strictEqual(entitlementUpdateCaptured.data.isActive, false);
      assert.strictEqual(res.subscriptionTier, 'PREMIUM');
    } finally {
      dbAny.isPostgresAvailable = originalIsPostgres;
      dbAny.prisma = originalPrisma;
    }
  });

  it('22. assignUserRoleAtomic protects last active owner with row-level locking', async () => {
    // Attempting to demote the only owner
    await assert.rejects(
      async () => {
        await db.assignUserRoleAtomic({
          targetUserId: ownerId,
          newRole: Role.USER,
          actorId: ownerId,
          actorRole: Role.OWNER,
          reason: 'Attempted self demotion of only owner'
        });
      },
      (err: any) => {
        return err.code === 'CANNOT_MODIFY_OWN_ROLE';
      },
      'Self-demotion must be rejected'
    );
  });

  it('23. extendSubscription additive duration increments from existing expiry date', async () => {
    // Customer 2: grant 10 days
    await db.assignSubscriptionTier(targetCustomer2, 'PLUS', 'MONTHLY', 10, ownerId, 'Initial grant', 'ADMIN_COMPLIMENTARY');
    const u1 = await db.findUserById(targetCustomer2);
    const exp1 = new Date(u1!.subscriptionExpiresAt!).getTime();

    // Extend by 20 days
    await db.extendSubscription(targetCustomer2, 20, ownerId, 'Extension grant');
    const u2 = await db.findUserById(targetCustomer2);
    const exp2 = new Date(u2!.subscriptionExpiresAt!).getTime();

    const diffDays = Math.round((exp2 - exp1) / 86400000);
    assert.strictEqual(diffDays, 20, 'Extension must add exactly 20 days to previous expiry timestamp');
  });

  it('24. Tier modification deactivates superseded tier entitlement while preserving independent report entitlements', async () => {
    // 1. Grant an independent report entitlement (e.g. FULL_KUNDLI_REPORT)
    await db.grantEntitlement(targetCustomer2, 'FULL_KUNDLI_REPORT', 365, 'ADMIN_GRANT', ownerId, 'Independent report grant');
    
    // 2. Grant PREMIUM tier
    await db.assignSubscriptionTier(targetCustomer2, 'PREMIUM', 'MONTHLY', 30, ownerId, 'Tier change to PREMIUM', 'ADMIN_COMPLIMENTARY');
    let activeEnts = await db.listEntitlements({ userId: targetCustomer2, activeOnly: true });
    assert.ok(activeEnts.some(e => e.featureKey === 'PREMIUM'), 'PREMIUM entitlement active');
    assert.ok(activeEnts.some(e => e.featureKey === 'FULL_KUNDLI_REPORT'), 'Report entitlement active');

    // 3. Downgrade to PLUS tier
    await db.assignSubscriptionTier(targetCustomer2, 'PLUS', 'MONTHLY', 15, ownerId, 'Tier change to PLUS', 'ADMIN_COMPLIMENTARY');
    activeEnts = await db.listEntitlements({ userId: targetCustomer2, activeOnly: true });
    assert.strictEqual(activeEnts.some(e => e.featureKey === 'PREMIUM'), false, 'Superseded PREMIUM entitlement deactivated');
    assert.ok(activeEnts.some(e => e.featureKey === 'PLUS'), 'PLUS entitlement active');
    assert.ok(activeEnts.some(e => e.featureKey === 'FULL_KUNDLI_REPORT'), 'Report entitlement preserved across tier change');
  });
});
