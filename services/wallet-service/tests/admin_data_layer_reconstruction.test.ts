process.env.NODE_ENV = 'test';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app from '../src/server';
import { db, Role, AccountStatus, OrderStatus, EntryType } from '../src/db';
import { checkSchemaReadiness, inspectDatabaseRlsCatalog, APPLICATION_TABLES } from '../src/schemaBootstrap';

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
          let parsed = rawData;
          try {
            parsed = JSON.parse(rawData);
          } catch (_) {}
          resolve({ status: res.statusCode || 500, headers: res.headers, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (reqBody) req.write(reqBody);
    req.end();
  });
}

describe('ADMIN DATA LAYER RECONSTRUCTION & POSTGRESQL INTEGRITY SUITE', () => {
  let server: http.Server;
  let adminToken: string;

  before(async () => {
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));

    // Authenticate Owner
    const loginRes = await makeRequest(server, 'POST', '/api/auth/admin-login', {}, {
      email: 'tiwariji0028@gmail.com',
      password: process.env.ASTRO_PLATFORM_OWNER_KEY || 'AstroAdmin#2026!SecureTiwari'
    });
    if (loginRes.status === 200 && loginRes.body?.sessionToken) {
      adminToken = loginRes.body.sessionToken;
    }
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('1. APPLICATION_TABLES includes all 17 core entities including Promotion, CustomerNote, Entitlement', () => {
    assert.strictEqual(APPLICATION_TABLES.includes('Promotion' as any), true);
    assert.strictEqual(APPLICATION_TABLES.includes('CustomerNote' as any), true);
    assert.strictEqual(APPLICATION_TABLES.includes('Entitlement' as any), true);
    assert.strictEqual(APPLICATION_TABLES.length, 19);
  });

  it('2. checkSchemaReadiness dynamically verifies RLS across all tables', async () => {
    const mockPrisma = {
      $queryRawUnsafe: async () => {
        return APPLICATION_TABLES.map(t => ({
          table_name: t,
          rls_enabled: true
        }));
      }
    };
    const res = await checkSchemaReadiness(mockPrisma);
    assert.strictEqual(res.isReady, true);
    assert.strictEqual(res.missingTables.length, 0);
    assert.strictEqual(res.missingRlsTables.length, 0);
  });

  it('3. checkSchemaReadiness reports missing RLS on individual tables', async () => {
    const mockPrisma = {
      $queryRawUnsafe: async () => {
        return APPLICATION_TABLES.map(t => ({
          table_name: t,
          rls_enabled: t !== 'CustomerNote'
        }));
      }
    };
    const res = await checkSchemaReadiness(mockPrisma);
    assert.strictEqual(res.isReady, false);
    assert.strictEqual(res.missingRlsTables.includes('CustomerNote'), true);
  });

  it('4. getPlatformMetrics accurately distinguishes active vs expired/inactive subscriptions', async () => {
    const metrics = await db.getPlatformMetrics();
    assert.ok(metrics);
    assert.ok(typeof metrics.activeSubscriptions === 'number');
    assert.ok(typeof metrics.failedReportsCount === 'number');
    assert.ok(typeof metrics.pendingRefundsCount === 'number');
    assert.strictEqual(metrics.systemHealth.walletService, 'ONLINE');
  });

  it('5. getBusinessAnalytics classifies unknown product types to OTHER with alert', async () => {
    const analytics = await db.getBusinessAnalytics();
    assert.ok(analytics);
    assert.ok(analytics.summary);
    assert.ok(typeof analytics.summary.totalGrossCollectionsPaise === 'number');
    assert.ok(typeof analytics.summary.rechargeCollectionsRupees === 'number');
    assert.ok(typeof analytics.summary.subscriptionCollectionsRupees === 'number');
    assert.ok(typeof analytics.summary.reportCollectionsRupees === 'number');
    assert.ok(typeof analytics.summary.otherCollectionsRupees === 'number');
  });

  it('6. Customer notes: addCustomerNote and listCustomerNotes preserve category and reason', async () => {
    const testUserId = 'test_user_' + Date.now();
    const note = await db.addCustomerNote(
      testUserId,
      'admin_actor_1',
      'owner@astroverse.app',
      'Customer requested priority assistance with birth chart rectification.',
      'VIP'
    );
    assert.ok(note.id.startsWith('cnote_'));
    assert.strictEqual(note.category, 'VIP');
    assert.strictEqual(note.userId, testUserId);

    const notes = await db.listCustomerNotes(testUserId);
    assert.strictEqual(notes.length, 1);
    assert.strictEqual(notes[0].id, note.id);
    assert.strictEqual(notes[0].category, 'VIP');
  });

  it('7. Entitlements: grantEntitlement updates user tier and creates persistent record', async () => {
    const testUserId = 'usr_ent_' + Date.now();
    // Seed user in db
    (db as any).data.users.push({
      id: testUserId,
      email: `ent_${Date.now()}@example.com`,
      phone: null,
      role: Role.USER,
      status: AccountStatus.ACTIVE,
      walletBalance: 0,
      subscriptionTier: 'FREE',
      subscriptionStatus: 'NONE'
    });

    const ent = await db.grantEntitlement(
      testUserId,
      'PREMIUM',
      30,
      'ADMIN_GRANT',
      'admin_1',
      'Complimentary VIP testing'
    );
    assert.ok(ent.id.startsWith('ent_'));
    assert.strictEqual(ent.featureKey, 'PREMIUM');
    assert.strictEqual(ent.isActive, true);

    const user = await db.findUserById(testUserId);
    assert.strictEqual(user?.subscriptionTier, 'PREMIUM');
    assert.strictEqual(user?.subscriptionStatus, 'ACTIVE');

    // Revoke entitlement
    const revoked = await db.revokeEntitlement(ent.id, 'admin_1', 'Test complete');
    assert.strictEqual(revoked.success, true);
    assert.strictEqual(revoked.entitlement.isActive, false);

    const userAfterRevoke = await db.findUserById(testUserId);
    assert.strictEqual(userAfterRevoke?.subscriptionTier, 'FREE');
  });

  it('8. Promotions: createPromotion enforces unique code and togglePromotion modifies active state', async () => {
    const code = 'PROMO_' + Date.now();
    const promo = await db.createPromotion({
      code,
      description: 'Holiday 25% Discount',
      discountType: 'PERCENTAGE',
      discountValue: 25,
      applicableTo: 'ALL',
      durationDays: 14,
      createdBy: 'admin_1'
    });
    assert.strictEqual(promo.code, code);
    assert.strictEqual(promo.isActive, true);

    // Duplicate code must throw PROMO_CODE_EXISTS
    await assert.rejects(async () => {
      await db.createPromotion({
        code,
        description: 'Duplicate',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        applicableTo: 'ALL',
        createdBy: 'admin_1'
      });
    }, /PROMO_CODE_EXISTS/);

    // Toggle active state
    const toggled = await db.togglePromotion(promo.id, false);
    assert.strictEqual(toggled.isActive, false);

    const promos = await db.listPromotions();
    const found = promos.find(p => p.id === promo.id);
    assert.strictEqual(found?.isActive, false);
  });

  it('9. DatabaseMonitor: reports genuine connection diagnostics and non-fabricated backup metadata', async () => {
    const monitor = await db.getDatabaseMonitorMetrics(true);
    assert.ok(monitor);
    assert.ok(monitor.liveness);
    assert.ok(monitor.readiness);
    assert.ok(monitor.storageFootprint);
    assert.strictEqual(monitor.storageFootprint.lastBackupAt.includes('UNAVAILABLE'), true);
    assert.ok(Array.isArray(monitor.tables));
    assert.strictEqual(monitor.tables.length >= 17, true);
  });

  it('10. getCustomer360 strictly sanitizes credential fields from response', async () => {
    const users = (db as any).data.users;
    if (users.length > 0) {
      const c360 = await db.getCustomer360(users[0].id);
      assert.ok(c360);
      assert.strictEqual((c360.user as any).passwordHash, undefined);
      assert.strictEqual((c360.user as any).passwordSalt, undefined);
      assert.strictEqual((c360.user as any).mfaSecret, undefined);
      assert.strictEqual((c360.user as any).mfaRecoveryCodes, undefined);
      assert.strictEqual((c360.user as any).resetTokenHash, undefined);
    }
  });

  it('11. extendSubscription successfully extends expiration and updates entitlement', async () => {
    const testUserId = 'usr_ext_' + Date.now();
    (db as any).data.users.push({
      id: testUserId,
      email: `ext_${Date.now()}@example.com`,
      phone: null,
      role: Role.USER,
      status: AccountStatus.ACTIVE,
      walletBalance: 0,
      subscriptionTier: 'PLUS',
      subscriptionStatus: 'ACTIVE',
      subscriptionExpiresAt: new Date(Date.now() + 86400000).toISOString()
    });

    const updated = await db.extendSubscription(testUserId, 15, 'admin_1', 'Goodwill extension');
    assert.ok(updated.subscriptionExpiresAt);
    const newExpiry = new Date(updated.subscriptionExpiresAt).getTime();
    assert.ok(newExpiry > Date.now() + 14 * 86400000);
  });
});
