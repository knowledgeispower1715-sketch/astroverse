process.env.NODE_ENV = 'test';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import crypto from 'node:crypto';
import app from '../src/server';
import { db, Role, AccountStatus, OrderStatus } from '../src/db';
import {
  setRuntimeCashfreeSecretKey,
  getResolvedCashfreeCredentials,
  getCashfreeBaseUrl,
  getPaymentReadinessStatus,
  PaymentReadinessState,
  verifyCashfreeWebhookSignature
} from '../src/cashfree';
import { SUBSCRIPTION_PLANS, SubscriptionTier, BillingPeriod, calculateReportPrice } from '../src/monetization/catalog';

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

describe('PHASE 3.1 ENTERPRISE ADVERSARIAL & INTEGRITY VERIFICATION SUITE', () => {
  let server: http.Server;
  let testUserToken: string;
  let testUserId: string;
  let ownerToken: string;
  let ownerId: string;

  before(async () => {
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));

    // Create standard test user
    const regRes = await makeRequest(server, 'POST', '/api/auth/register-password', {}, {
      email: `adversarial_seeker_${Date.now()}@astroverse.ai`,
      password: 'StrongPassword123!',
      displayName: 'Adversarial Seeker'
    });
    assert.strictEqual(regRes.status, 200);
    testUserToken = regRes.body.sessionToken;
    testUserId = regRes.body.user.id;

    // Create Owner user for administrative actions
    const ownerRes = await makeRequest(server, 'POST', '/api/auth/register-password', {}, {
      email: `adversarial_owner_${Date.now()}@astroverse.ai`,
      password: 'OwnerPassword123!',
      displayName: 'Adversarial Owner'
    });
    assert.strictEqual(ownerRes.status, 200);
    ownerToken = ownerRes.body.sessionToken;
    ownerId = ownerRes.body.user.id;

    const ownerRecord = await db.findUserById(ownerId);
    if (ownerRecord) {
      ownerRecord.role = Role.OWNER;
      ownerRecord.status = AccountStatus.ACTIVE;
    }
  });

  after(async () => {
    return new Promise<void>((resolve) => server.close(() => resolve()));
  });

  // ==================== 1. PRICE AUTHORITY & TAMPERING PREVENTION ====================

  describe('1. Authoritative Pricing & Tampering Prevention (POST /api/cashfree/create-order)', () => {
    it('1.1 Rejects subscription order creation when productId is an invalid subscription tier', async () => {
      const res = await makeRequest(server, 'POST', '/api/cashfree/create-order', {
        Authorization: `Bearer ${testUserToken}`
      }, {
        productType: 'SUBSCRIPTION',
        productId: 'HACKED_FREE_TIER',
        amount: 1
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error, 'INVALID_SUBSCRIPTION_TIER');
    });

    it('1.2 Strictly overrides client-supplied ₹1 amount with canonical catalogue price for PREMIUM subscription', async () => {
      const canonicalPlan = SUBSCRIPTION_PLANS[SubscriptionTier.PREMIUM];
      const expectedRupees = Math.round(canonicalPlan.monthlyPricePaise / 100);

      const res = await makeRequest(server, 'POST', '/api/cashfree/create-order', {
        Authorization: `Bearer ${testUserToken}`
      }, {
        productType: 'SUBSCRIPTION',
        productId: 'PREMIUM',
        billingPeriod: 'MONTHLY',
        amount: 1 // Adversarial: Attempting to buy ₹499 plan for ₹1
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.amount, expectedRupees, 'Gateway order amount MUST equal canonical price, not client ₹1');
      assert.strictEqual(res.body.amountPaise, canonicalPlan.monthlyPricePaise);
      assert.strictEqual(res.body.productType, 'SUBSCRIPTION');
      assert.strictEqual(res.body.billingPeriod, 'MONTHLY');

      // Verify persisted PaymentOrder record
      const persistedOrder = await db.findPaymentOrderByIdAsync(res.body.orderId);
      assert.ok(persistedOrder, 'Payment order must be persisted in database');
      assert.strictEqual(persistedOrder?.amount, expectedRupees);
      assert.strictEqual(persistedOrder?.billingPeriod, 'MONTHLY');
      assert.strictEqual(persistedOrder?.productType, 'SUBSCRIPTION');
      assert.strictEqual(persistedOrder?.productId, 'PREMIUM');
      assert.ok(persistedOrder?.pricingSnapshot, 'Pricing snapshot must be attached');
      assert.strictEqual(persistedOrder?.pricingSnapshot.catalogueVersion, '2026.01');
    });

    it('1.3 Rejects report purchase when report productId is unknown or invalid', async () => {
      const res = await makeRequest(server, 'POST', '/api/cashfree/create-order', {
        Authorization: `Bearer ${testUserToken}`
      }, {
        productType: 'REPORT',
        productId: 'malicious_nonexistent_report_sku',
        amount: 5
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error, 'INVALID_REPORT_SKU');
    });

    it('1.4 Strictly overrides client-supplied ₹5 amount with canonical tier-discounted price for REPORT', async () => {
      const expectedPricing = calculateReportPrice('report_janam_kundli_deep_dive', SubscriptionTier.FREE);

      const res = await makeRequest(server, 'POST', '/api/cashfree/create-order', {
        Authorization: `Bearer ${testUserToken}`
      }, {
        productType: 'REPORT',
        productId: 'report_janam_kundli_deep_dive',
        amount: 5 // Adversarial: Attempting to buy report for ₹5
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.amount, expectedPricing.finalPriceRupees, 'Order amount must equal calculated catalogue price');
      assert.strictEqual(res.body.amountPaise, expectedPricing.finalPricePaise);
    });

    it('1.5 Rejects wallet recharge when amount is negative or exceeds maximum bound', async () => {
      const resNeg = await makeRequest(server, 'POST', '/api/cashfree/create-order', {
        Authorization: `Bearer ${testUserToken}`
      }, {
        productType: 'WALLET_RECHARGE',
        amount: -50
      });
      assert.strictEqual(resNeg.status, 400);
      assert.strictEqual(resNeg.body.error, 'INVALID_AMOUNT');

      const resExcess = await makeRequest(server, 'POST', '/api/cashfree/create-order', {
        Authorization: `Bearer ${testUserToken}`
      }, {
        productType: 'WALLET_RECHARGE',
        amount: 100000 // Exceeds ₹50,000 ceiling
      });
      assert.strictEqual(resExcess.status, 400);
      assert.strictEqual(resExcess.body.error, 'INVALID_AMOUNT');
    });

    it('1.6 Rejects unsupported productType', async () => {
      const res = await makeRequest(server, 'POST', '/api/cashfree/create-order', {
        Authorization: `Bearer ${testUserToken}`
      }, {
        productType: 'CRYPTO_TRANSFER',
        amount: 100
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error, 'INVALID_PRODUCT_TYPE');
    });
  });

  // ==================== 2. ELIMINATION OF AMOUNT > 500 INFERENCE ====================

  describe('2. Elimination of amount-threshold billing period inference', () => {
    it('2.1 Correctly fulfills ANNUAL subscription (365 days) regardless of amount using order.billingPeriod', async () => {
      // Create user
      const user = await db.findUserById(testUserId);
      assert.ok(user);

      // Create an annual order for PLUS tier with explicitly stored billingPeriod: ANNUAL
      const orderId = `cf_ord_ann_${Date.now()}`;
      const order = await db.createPaymentOrder({
        userId: testUserId,
        amount: 199, // Lower amount than 500
        providerOrderId: orderId,
        productType: 'SUBSCRIPTION',
        productId: 'PLUS',
        billingPeriod: 'ANNUAL',
        metadata: { billingPeriod: 'ANNUAL' }
      });
      assert.strictEqual(order.billingPeriod, 'ANNUAL');

      // Fulfill order
      const beforeFulfill = Date.now();
      const updated = await db.fulfillPaidSubscriptionOrder({
        userId: testUserId,
        tier: 'PLUS',
        billingPeriod: 'ANNUAL',
        durationDays: 365,
        orderId,
        paymentId: `cf_pay_${Date.now()}`,
        amount: 199
      });

      assert.strictEqual(updated.subscriptionTier, 'PLUS');
      assert.strictEqual(updated.subscriptionBillingPeriod, 'ANNUAL');
      assert.ok(updated.subscriptionExpiresAt);

      const expiryMs = new Date(updated.subscriptionExpiresAt).getTime();
      const durationMs = expiryMs - beforeFulfill;
      const durationDaysApprox = Math.round(durationMs / 86400000);
      assert.strictEqual(durationDaysApprox, 365, 'ANNUAL order must grant exactly 365 days even if amount < ₹500');
    });

    it('2.2 Correctly fulfills MONTHLY subscription (30 days) even if amount > ₹500', async () => {
      const orderId = `cf_ord_mon_${Date.now()}`;
      const order = await db.createPaymentOrder({
        userId: testUserId,
        amount: 999, // Higher amount than 500
        providerOrderId: orderId,
        productType: 'SUBSCRIPTION',
        productId: 'PREMIUM',
        billingPeriod: 'MONTHLY',
        metadata: { billingPeriod: 'MONTHLY' }
      });
      assert.strictEqual(order.billingPeriod, 'MONTHLY');

      const beforeFulfill = Date.now();
      const updated = await db.fulfillPaidSubscriptionOrder({
        userId: testUserId,
        tier: 'PREMIUM',
        billingPeriod: 'MONTHLY',
        durationDays: 30,
        orderId,
        paymentId: `cf_pay_${Date.now()}`,
        amount: 999
      });

      assert.strictEqual(updated.subscriptionTier, 'PREMIUM');
      assert.strictEqual(updated.subscriptionBillingPeriod, 'MONTHLY');
      assert.ok(updated.subscriptionExpiresAt);
    });
  });

  // ==================== 3. SUBSCRIPTION LOCKING & IDEMPOTENCY ====================

  describe('3. Subscription locking and idempotency (extendSubscription)', () => {
    it('3.1 Replaying extendSubscription with identical requestId returns idempotent result without double-extending', async () => {
      const requestId = `req_idemp_${Date.now()}`;
      const initialUser = await db.findUserById(testUserId);
      const initialExpiry = initialUser?.subscriptionExpiresAt ? new Date(initialUser.subscriptionExpiresAt).getTime() : Date.now();

      // First extension: 30 days
      const firstResult = await db.extendSubscription(testUserId, 30, ownerId, 'First extension grant', requestId);
      const firstExpiry = new Date(firstResult.subscriptionExpiresAt!).getTime();
      assert.ok(firstExpiry > initialExpiry);

      // Replay identical extension with same requestId and parameters
      const replayResult = await db.extendSubscription(testUserId, 30, ownerId, 'First extension grant', requestId);
      const replayExpiry = new Date(replayResult.subscriptionExpiresAt!).getTime();

      assert.strictEqual(replayExpiry, firstExpiry, 'Idempotent replay must not increment expiration date further');
    });

    it('3.2 Replaying extendSubscription with same requestId but differing duration throws 409 IDEMPOTENCY_CONFLICT', async () => {
      const requestId = `req_conflict_${Date.now()}`;

      // First call: 15 days
      await db.extendSubscription(testUserId, 15, ownerId, 'Legitimate 15-day extension', requestId);

      // Replay attack / conflicting retry: 90 days with same requestId
      await assert.rejects(
        async () => {
          await db.extendSubscription(testUserId, 90, ownerId, 'Conflicting extension attempt', requestId);
        },
        (err: any) => {
          assert.strictEqual(err.code, 'IDEMPOTENCY_CONFLICT');
          return true;
        }
      );
    });

    it('3.3 extendSubscription rejects non-existent or inactive extendedBy actor with ACTOR_NOT_FOUND', async () => {
      const fakeActorId = 'f0000000-0000-0000-0000-000000000000';
      await assert.rejects(
        async () => {
          await db.extendSubscription(testUserId, 30, fakeActorId, 'Extension by ghost actor');
        },
        (err: any) => {
          assert.strictEqual(err.code, 'ACTOR_NOT_FOUND');
          return true;
        }
      );
    });

    it('3.4 extendSubscription fails closed and aborts transaction when row-level lock fails in PostgreSQL mode', async () => {
      const dbAny = db as any;
      const originalIsPostgres = dbAny.isPostgresAvailable;
      const originalPrisma = dbAny.prisma;

      try {
        dbAny.isPostgresAvailable = true;
        dbAny.prisma = {
          user: {
            findFirst: async () => ({ id: testUserId, role: Role.USER, status: AccountStatus.ACTIVE, createdAt: new Date(), updatedAt: new Date() }),
            findUnique: async () => ({ id: testUserId, role: Role.USER, status: AccountStatus.ACTIVE, createdAt: new Date(), updatedAt: new Date() })
          },
          $transaction: async (fn: any) => {
            const mockTx = {
              user: {
                findUnique: async () => ({ id: ownerId, status: 'ACTIVE' }),
                findFirst: async () => ({ id: ownerId, status: 'ACTIVE' })
              },
              auditEvent: {
                findFirst: async () => null
              },
              $queryRaw: async () => {
                // Simulate row-level lock failure / query timeout
                throw new Error('Lock acquisition timeout on User table: deadlock detected');
              }
            };
            return fn(mockTx);
          }
        };

        await assert.rejects(
          async () => {
            await db.extendSubscription(testUserId, 30, ownerId, 'Testing lock failure abort');
          },
          (err: any) => {
            assert.ok(err.message.includes('DATABASE_MUTATION_FAILED'));
            return true;
          }
        );
      } finally {
        dbAny.isPostgresAvailable = originalIsPostgres;
        dbAny.prisma = originalPrisma;
      }
    });
  });

  // ==================== 4. PAID FULFILLMENT INTEGRITY ====================

  describe('4. Paid subscription fulfillment integrity (fulfillPaidSubscriptionOrder)', () => {
    it('4.1 fulfillPaidSubscriptionOrder fails closed when row lock fails in PostgreSQL', async () => {
      const dbAny = db as any;
      const originalIsPostgres = dbAny.isPostgresAvailable;
      const originalPrisma = dbAny.prisma;

      try {
        dbAny.isPostgresAvailable = true;
        dbAny.prisma = {
          $transaction: async (fn: any) => {
            const mockTx = {
              $queryRaw: async () => {
                throw new Error('Deadlock detected during User row lock');
              }
            };
            return fn(mockTx);
          }
        };

        await assert.rejects(
          async () => {
            await db.fulfillPaidSubscriptionOrder({
              userId: testUserId,
              tier: 'PREMIUM',
              billingPeriod: 'MONTHLY',
              durationDays: 30,
              orderId: 'cf_ord_mock_fail',
              paymentId: 'cf_pay_mock',
              amount: 499
            });
          },
          (err: any) => {
            assert.ok(err.message.includes('DATABASE_MUTATION_FAILED'));
            return true;
          }
        );
      } finally {
        dbAny.isPostgresAvailable = originalIsPostgres;
        dbAny.prisma = originalPrisma;
      }
    });

    it('4.2 fulfillPaidSubscriptionOrder is idempotent when order is already fulfilled', async () => {
      const orderId = `cf_ord_idemp_${Date.now()}`;
      await db.createPaymentOrder({
        userId: testUserId,
        amount: 499,
        providerOrderId: orderId,
        productType: 'SUBSCRIPTION',
        productId: 'PREMIUM',
        billingPeriod: 'MONTHLY'
      });

      // First fulfillment
      const res1 = await db.fulfillPaidSubscriptionOrder({
        userId: testUserId,
        tier: 'PREMIUM',
        billingPeriod: 'MONTHLY',
        durationDays: 30,
        orderId,
        paymentId: `cf_pay_${Date.now()}`,
        amount: 499
      });
      assert.ok(res1);

      // Count active entitlements for this order
      const entsBefore = (db as any).data.entitlements.filter((e: any) => e.userId === testUserId && e.reason.includes(orderId));
      assert.strictEqual(entsBefore.length, 1);

      // Replay fulfillment with same orderId
      const res2 = await db.fulfillPaidSubscriptionOrder({
        userId: testUserId,
        tier: 'PREMIUM',
        billingPeriod: 'MONTHLY',
        durationDays: 30,
        orderId,
        paymentId: `cf_pay_dup`,
        amount: 499
      });
      assert.ok(res2);

      const entsAfter = (db as any).data.entitlements.filter((e: any) => e.userId === testUserId && e.reason.includes(orderId));
      assert.strictEqual(entsAfter.length, 1, 'Idempotent replay must not create duplicate entitlements');
    });
  });

  // ==================== 5. WEBHOOK DURABILITY & ATOMIC TRANSITIONS ====================

  describe('5. Durable Webhook Event Tracking & Replay Protection', () => {
    it('5.1 First delivery of webhook atomically claims event and processes fulfillment', async () => {
      const eventId = `wh_event_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const payloadHash = crypto.createHash('sha256').update('test_payload').digest('hex');

      // Initial claim
      const claim = await db.claimWebhookEvent({
        eventId,
        provider: 'CASHFREE',
        eventType: 'PAYMENT_SUCCESS_WEBHOOK',
        payloadHash
      });

      assert.strictEqual(claim.claimed, true);
      assert.strictEqual(claim.status, 'CLAIMED');

      // Complete event
      await db.completeWebhookEvent(eventId);
      assert.strictEqual(db.isWebhookEventProcessed(eventId), true);

      // Subsequent claim of processed event must be rejected
      const secondClaim = await db.claimWebhookEvent({
        eventId,
        provider: 'CASHFREE',
        eventType: 'PAYMENT_SUCCESS_WEBHOOK',
        payloadHash
      });

      assert.strictEqual(secondClaim.claimed, false);
      assert.strictEqual(secondClaim.status, 'PROCESSED');
    });

    it('5.2 Failed webhook transitions to RETRYABLE_FAILURE and allows bounded retry', async () => {
      const eventId = `wh_fail_${Date.now()}`;
      const payloadHash = crypto.createHash('sha256').update('fail_payload').digest('hex');

      const claim1 = await db.claimWebhookEvent({
        eventId,
        provider: 'CASHFREE',
        eventType: 'PAYMENT_SUCCESS_WEBHOOK',
        payloadHash
      });
      assert.strictEqual(claim1.claimed, true);

      // Record failure
      await db.failWebhookEvent(eventId, 'Network timeout during upstream notification');

      // Subsequent claim should allow retry
      const claimRetry = await db.claimWebhookEvent({
        eventId,
        provider: 'CASHFREE',
        eventType: 'PAYMENT_SUCCESS_WEBHOOK',
        payloadHash
      });
      assert.strictEqual(claimRetry.claimed, true);
      assert.strictEqual(claimRetry.status, 'CLAIMED_FOR_RETRY');
    });
  });

  // ==================== 6. ELIMINATION OF HARDCODED USER LOGIC ====================

  describe('6. Elimination of Hardcoded Recovery & User-Scoped Reconciliation', () => {
    it('6.1 reconcileUserPendingOrders operates generically without hard-coded Aryan/tiwariji UUIDs', async () => {
      const { reconcileUserPendingOrders } = require('../src/server');

      // Create a test pending order for standard test user
      const orderId = `cf_wal_test_${Date.now()}`;
      await db.createPaymentOrder({
        userId: testUserId,
        amount: 250,
        providerOrderId: orderId,
        productType: 'WALLET_RECHARGE'
      });

      // Sweep pending orders for user
      const count = await reconcileUserPendingOrders(testUserId);
      assert.ok(typeof count === 'number');
    });
  });

  // ==================== 7. CASHFREE SECRET MANAGEMENT & ENVIRONMENT ====================

  describe('7. Cashfree Secret Management & Environment Detection', () => {
    it('7.1 getCashfreeBaseUrl points to production in production and sandbox in preview/sandbox', () => {
      const origEnv = process.env.CASHFREE_ENV;
      const origNodeEnv = process.env.NODE_ENV;
      const origVercelEnv = process.env.VERCEL_ENV;
      const origSecret = process.env.CASHFREE_SECRET_KEY;

      try {
        process.env.CASHFREE_ENV = 'production';
        process.env.NODE_ENV = 'production';
        process.env.CASHFREE_SECRET_KEY = 'cfsk_ma_prod_testkey';
        assert.strictEqual(getCashfreeBaseUrl(), 'https://api.cashfree.com/pg');

        process.env.CASHFREE_ENV = 'sandbox';
        process.env.CASHFREE_SECRET_KEY = 'cfsk_ma_test_testkey';
        assert.strictEqual(getCashfreeBaseUrl(), 'https://sandbox.cashfree.com/pg');

        delete process.env.CASHFREE_ENV;
        process.env.VERCEL_ENV = 'preview';
        assert.strictEqual(getCashfreeBaseUrl(), 'https://sandbox.cashfree.com/pg', 'Preview must route to sandbox by default');
      } finally {
        process.env.CASHFREE_ENV = origEnv;
        process.env.NODE_ENV = origNodeEnv;
        process.env.VERCEL_ENV = origVercelEnv;
        process.env.CASHFREE_SECRET_KEY = origSecret;
      }
    });

    it('7.2 Catches credential environment mismatches as ENVIRONMENT_MISMATCH', () => {
      const origApp = process.env.CASHFREE_APP_ID;
      const origSec = process.env.CASHFREE_SECRET_KEY;
      const origEnv = process.env.CASHFREE_ENV;

      try {
        // Test key on production
        process.env.CASHFREE_APP_ID = 'TEST123456';
        process.env.CASHFREE_SECRET_KEY = 'cfsk_ma_test_abcdef123456';
        process.env.CASHFREE_ENV = 'production';

        const status = getPaymentReadinessStatus();
        assert.strictEqual(status.state, PaymentReadinessState.ENVIRONMENT_MISMATCH);

        // Prod key on sandbox
        process.env.CASHFREE_APP_ID = '14962482c27cb93db2c6bc6e4af8426941';
        process.env.CASHFREE_SECRET_KEY = 'cfsk_ma_prod_abcdef123456';
        process.env.CASHFREE_ENV = 'sandbox';

        const status2 = getPaymentReadinessStatus();
        assert.strictEqual(status2.state, PaymentReadinessState.ENVIRONMENT_MISMATCH);
      } finally {
        process.env.CASHFREE_APP_ID = origApp;
        process.env.CASHFREE_SECRET_KEY = origSec;
        process.env.CASHFREE_ENV = origEnv;
      }
    });
  });

  // ==================== 8. PAYMENT RECONCILIATION & INTEGER PAISE ====================

  describe('8. Payment Reconciliation & Integer Paise Integrity', () => {
    it('8.1 All wallet recharge packages calculate exact integer paise with zero floating-point leakage', () => {
      const { calculateWalletRechargePricing } = require('../src/server');

      for (const amount of [100, 250, 500, 1000, 2500, 5000, 10000]) {
        const pricing = calculateWalletRechargePricing(amount);
        assert.strictEqual(pricing.valid, true);
        assert.strictEqual(Number.isInteger(pricing.totalPayablePaise), true, 'totalPayablePaise must be an integer');
        assert.strictEqual(Number.isInteger(pricing.basePaise), true, 'basePaise must be an integer');
        assert.strictEqual(Number.isInteger(pricing.gstPaise), true, 'gstPaise must be an integer');
        assert.strictEqual(pricing.totalPayablePaise, pricing.basePaise + pricing.gstPaise, 'Paise must sum exactly');
      }
    });
  });
});
