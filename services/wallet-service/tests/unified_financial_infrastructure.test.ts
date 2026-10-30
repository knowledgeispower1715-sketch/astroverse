process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_unified_finance_32chars';
process.env.DATABASE_STORAGE = 'memory';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import crypto from 'crypto';
import app, { reconcileCashfreeOrder, reconcileUserPendingOrders } from '../src/server';
import { db, Role, OrderStatus, EntryType } from '../src/db';
import {
  SubscriptionTier,
  BillingPeriod,
  SUBSCRIPTION_PLANS,
  REPORT_CATALOGUE
} from '../src/monetization/catalog';

function makeRequest(
  server: http.Server,
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as any;
    const req = http.request(
      {
        host: '127.0.0.1',
        port: addr.port,
        method,
        path,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      },
      res => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          let parsed: any;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode || 500, headers: res.headers, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

describe('ASTROVERSE UNIFIED FINANCIAL INFRASTRUCTURE & UNIVERSAL WALLET SUITE', () => {
  let server: http.Server;
  const aryanId = 'e4fb472b-f452-423d-bf4e-3ba210af7dbf';
  const aryanEmail = 'menex544@gmail.com';
  const aryanOrderId = 'cf_wal_f1bb9dc4d88c177f';
  const aryanPaymentId = '6875951578';
  let aryanToken: string;

  let subscriberId: string;
  let subscriberToken: string;

  let adminId: string;
  let adminToken: string;

  before(async () => {
    server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));

    // Setup Aryan session
    let aryan = await db.findUserById(aryanId);
    if (!aryan) {
      aryan = await db.createUser({
        id: aryanId,
        email: aryanEmail,
        displayName: 'Aryan',
        role: Role.USER,
        walletBalance: 0.00
      });
    } else {
      await db.updateUser(aryanId, { walletBalance: 0.00 });
    }
    const rawAryanToken = `aryan_token_${crypto.randomBytes(16).toString('hex')}`;
    const aryanHash = crypto.createHash('sha256').update(rawAryanToken).digest('hex');
    await db.createSession({
      userId: aryanId,
      tokenHash: aryanHash,
      expiresAt: new Date(Date.now() + 86400000)
    });
    aryanToken = rawAryanToken;

    // Clean up any old payment orders or ledgers for clean test isolation
    (db as any).data.paymentOrders = ((db as any).data.paymentOrders || []).filter(
      (o: any) => o.id !== aryanOrderId && o.providerOrderId !== aryanOrderId
    );
    (db as any).data.walletLedgers = ((db as any).data.walletLedgers || []).filter(
      (l: any) => l.referenceId !== aryanPaymentId && l.idempotencyKey !== `RECHARGE_${aryanPaymentId}`
    );

    // Setup Subscriber user
    subscriberId = 'sub-test-user-' + Date.now();
    await db.createUser({
      id: subscriberId,
      email: `subscriber_${Date.now()}@example.com`,
      displayName: 'Premium Seeker',
      role: Role.USER,
      walletBalance: 200.00 // Sufficient for PLUS (₹149), insufficient for PREMIUM (₹299)
    });
    const rawSubToken = `sub_token_${crypto.randomBytes(16).toString('hex')}`;
    const subHash = crypto.createHash('sha256').update(rawSubToken).digest('hex');
    await db.createSession({
      userId: subscriberId,
      tokenHash: subHash,
      expiresAt: new Date(Date.now() + 86400000)
    });
    subscriberToken = rawSubToken;

    // Setup Admin user
    adminId = 'admin-fin-lead-' + Date.now();
    await db.createUser({
      id: adminId,
      email: 'tiwari0028@gmail.com', // Recognized Owner
      displayName: 'Finance Lead',
      role: Role.OWNER,
      walletBalance: 0
    });
    const rawAdminToken = `admin_token_${crypto.randomBytes(16).toString('hex')}`;
    const adminHash = crypto.createHash('sha256').update(rawAdminToken).digest('hex');
    await db.createSession({
      userId: adminId,
      tokenHash: adminHash,
      expiresAt: new Date(Date.now() + 86400000)
    });
    adminToken = rawAdminToken;
  });

  after(() => {
    return new Promise<void>(resolve => server.close(() => resolve()));
  });

  describe('1. Aryan Recovery & Auto-Reconciliation on User/Wallet Endpoints', () => {
    it('1.1 Auto-reconciles pending order and credits ₹1.00 base amount without error', async () => {
      const recoveredCount = await reconcileUserPendingOrders(aryanId);
      assert.ok(recoveredCount >= 1, 'Should have recovered at least 1 order');

      const freshAryan = await db.findUserById(aryanId);
      assert.ok(freshAryan, 'Aryan must exist');
      assert.equal(freshAryan.walletBalance, 1.00, 'Aryan wallet balance must be updated from ₹0.00 to ₹1.00');

      const savedOrder = await db.findPaymentOrderByIdAsync(aryanOrderId);
      assert.ok(savedOrder, 'PaymentOrder must exist in database');
      assert.equal(savedOrder.status, OrderStatus.PAID, 'Order must be marked PAID');
      assert.equal(savedOrder.baseAmount, 1.00, 'Base credit must be ₹1.00');
      assert.equal(savedOrder.gstAmount, 0.18, 'GST amount must be ₹0.18');
    });

    it('1.2 Replay idempotency: Second sweep does not double-credit Aryan wallet', async () => {
      const recoveredCount = await reconcileUserPendingOrders(aryanId);
      assert.equal(recoveredCount, 0, 'No new pending orders should be recovered');

      const freshAryan = await db.findUserById(aryanId);
      assert.equal(freshAryan?.walletBalance, 1.00, 'Balance must remain ₹1.00 (no double credit)');
    });

    it('1.3 GET /api/wallet/me returns balance breakdown (paid vs promotional)', async () => {
      const res = await makeRequest(server, 'GET', '/api/wallet/me', {
        Authorization: `Bearer ${aryanToken}`
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.balance, 1.00);
      assert.equal(res.body.paidBalance, 1.00);
      assert.equal(res.body.promotionalBalance, 0);
      assert.ok(Array.isArray(res.body.statement));
    });

    it('1.4 POST /api/wallet/reconcile triggers customer-side reconciliation sweep', async () => {
      const res = await makeRequest(server, 'POST', '/api/wallet/reconcile', {
        Authorization: `Bearer ${aryanToken}`
      }, { orderId: aryanOrderId });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.balance, 1.00);
    });
  });

  describe('2. Universal Purchases via Wallet Balance (Subscriptions, Reports & Consultations)', () => {
    it('2.1 Rejects subscription purchase when wallet balance is insufficient with exact shortfall', async () => {
      // PREMIUM monthly is ₹299. Available: ₹200. Shortfall: ₹99.
      const res = await makeRequest(server, 'POST', '/api/subscriptions/purchase-with-wallet', {
        Authorization: `Bearer ${subscriberToken}`
      }, {
        tier: SubscriptionTier.PREMIUM,
        billingPeriod: BillingPeriod.MONTHLY
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'INSUFFICIENT_FUNDS');
      assert.equal(res.body.code, 'INSUFFICIENT_WALLET_BALANCE');
      assert.equal(res.body.requiredAmount, 299);
      assert.equal(res.body.currentBalance, 200);
      assert.equal(res.body.shortfall, 99);
    });

    it('2.2 Successfully purchases PLUS subscription via wallet balance', async () => {
      // PLUS monthly is ₹149. Available: ₹200. New balance: ₹51.
      const res = await makeRequest(server, 'POST', '/api/subscriptions/purchase-with-wallet', {
        Authorization: `Bearer ${subscriberToken}`
      }, {
        tier: SubscriptionTier.PLUS,
        billingPeriod: BillingPeriod.MONTHLY,
        idempotencyKey: `sub_wallet_test_${Date.now()}`
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.paidVia, 'WALLET');
      assert.equal(res.body.tier, SubscriptionTier.PLUS);
      assert.equal(res.body.status, 'ACTIVE');
      assert.equal(res.body.walletBalance, 51.00);
      assert.equal(res.body.amountDebited, 149);

      // Verify user DB record
      const freshUser = await db.findUserById(subscriberId);
      assert.equal(freshUser?.walletBalance, 51.00);
      assert.equal(freshUser?.subscriptionTier, SubscriptionTier.PLUS);
      assert.equal(freshUser?.subscriptionStatus, 'ACTIVE');

      // Verify wallet ledger entry
      const statement = await db.getWalletStatement(subscriberId);
      const purchaseEntry = statement.find(e => e.entryType === EntryType.STORE_PURCHASE);
      assert.ok(purchaseEntry, 'A STORE_PURCHASE ledger entry must be recorded');
      assert.equal(purchaseEntry.amount, -149);
    });

    it('2.3 POST /api/subscriptions/create-order delegates to wallet purchase when paymentMethod=WALLET', async () => {
      // Give user another ₹300 (total ₹351)
      await db.updateUser(subscriberId, { walletBalance: 351.00 });

      const res = await makeRequest(server, 'POST', '/api/subscriptions/create-order', {
        Authorization: `Bearer ${subscriberToken}`
      }, {
        tier: SubscriptionTier.PREMIUM,
        billingPeriod: BillingPeriod.MONTHLY,
        paymentMethod: 'WALLET'
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.paidVia, 'WALLET');
      assert.equal(res.body.tier, SubscriptionTier.PREMIUM);
      assert.equal(res.body.walletBalance, 52.00); // 351 - 299 = 52
    });

    it('2.4 Report Purchase via wallet returns INSUFFICIENT_FUNDS with shortfall when balance deficient', async () => {
      // Current balance: ₹52. Report bundle is ₹399.
      const testProfile = await db.createProfile({
        userId: subscriberId,
        profileName: 'Subject A',
        dateOfBirth: '1990-01-01',
        timeOfBirth: '10:00',
        birthplaceName: 'Delhi',
        latitude: 28.6139,
        longitude: 77.2090,
        timezone: 'Asia/Kolkata'
      });

      const res = await makeRequest(server, 'POST', '/api/reports/order', {
        Authorization: `Bearer ${subscriberToken}`
      }, {
        productId: 'report_bundle_kundli_varshphal',
        profileId: testProfile.id,
        paymentMethod: 'WALLET'
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'INSUFFICIENT_FUNDS');
      assert.equal(res.body.code, 'INSUFFICIENT_WALLET_BALANCE');
      assert.ok(res.body.shortfall > 0);
    });
  });

  describe('3. Administrative Wallet Adjustments & Reconciliation Suite', () => {
    const targetUserId = 'target-user-' + Date.now();

    before(async () => {
      await db.createUser({
        id: targetUserId,
        email: `target_${Date.now()}@example.com`,
        displayName: 'Target Customer',
        role: Role.USER,
        walletBalance: 50.00
      });
    });

    it('3.1 Rejects wallet adjustment with missing or short audit reason', async () => {
      const res = await makeRequest(server, 'POST', '/api/admin/wallet/adjust-balance', {
        Authorization: `Bearer ${adminToken}`
      }, {
        userId: targetUserId,
        amount: 25.00,
        type: 'CREDIT',
        reason: 'ok' // < 5 chars
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.error, 'REASON_REQUIRED');
    });

    it('3.2 Rejects wallet adjustment from non-admin user with 403 Forbidden', async () => {
      const nonAdminId = 'non-admin-' + Date.now();
      await db.createUser({
        id: nonAdminId,
        email: `nonadmin_${Date.now()}@example.com`,
        displayName: 'Normal User',
        role: Role.USER,
        walletBalance: 0
      });
      const rawNonAdminToken = `nonadmin_token_${crypto.randomBytes(16).toString('hex')}`;
      const nonAdminHash = crypto.createHash('sha256').update(rawNonAdminToken).digest('hex');
      await db.createSession({
        userId: nonAdminId,
        tokenHash: nonAdminHash,
        expiresAt: new Date(Date.now() + 86400000)
      });

      const res = await makeRequest(server, 'POST', '/api/admin/wallet/adjust-balance', {
        Authorization: `Bearer ${rawNonAdminToken}`
      }, {
        userId: targetUserId,
        amount: 50.00,
        type: 'CREDIT',
        reason: 'Hacking balance'
      });
      assert.equal(res.status, 403);
    });

    it('3.3 Successfully credits user wallet via admin balance adjustment with full audit trail', async () => {
      const res = await makeRequest(server, 'POST', '/api/admin/wallet/adjust-balance', {
        Authorization: `Bearer ${adminToken}`
      }, {
        userId: targetUserId,
        amount: 75.00,
        type: 'CREDIT',
        reason: 'Customer goodwill compensation for delay',
        category: 'COMPENSATION'
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.user.walletBalance, 125.00); // 50 + 75 = 125

      const targetFresh = await db.findUserById(targetUserId);
      assert.equal(targetFresh?.walletBalance, 125.00);
    });

    it('3.4 POST /api/admin/payments/reconcile runs proactive sweep and reports status', async () => {
      const res = await makeRequest(server, 'POST', '/api/admin/payments/reconcile', {
        Authorization: `Bearer ${adminToken}`
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.status === 'CLEAN_RECONCILED' || res.body.status === 'DISCREPANCIES_DETECTED');
      assert.equal(typeof res.body.totalOrdersChecked, 'number');
      assert.equal(typeof res.body.autoReconciledCount, 'number');
    });
  });
});
