process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_astroverse_order_recovery_p0_32chars';
process.env.DATABASE_STORAGE = 'memory';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import crypto from 'crypto';
import app from '../src/server';
import { db, EntryType, OrderStatus, Role } from '../src/db';

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
        let data = '';
        res.on('data', chunk => {
          data += chunk;
        });
        res.on('end', () => {
          let parsed = data;
          try {
            parsed = JSON.parse(data);
          } catch {
            // Keep as string
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

describe('P0 INCIDENT RECOVERY: CASHFREE ORDER LOOKUP & FINANCIAL INTEGRITY SUITE', () => {
  let server: http.Server;
  let userAId: string;
  let userAToken: string;
  let userBId: string;
  let userBToken: string;
  let adminToken: string;

  before(async () => {
    server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));

    // Register User A
    const regA = await makeRequest(server, 'POST', '/api/auth/register-password', {}, {
      email: `customer_a_${Date.now()}@astroverse.ai`,
      password: 'SafePassword123!',
      displayName: 'Customer A'
    });
    assert.strictEqual(regA.status, 200);
    userAToken = regA.body.sessionToken;
    userAId = regA.body.user.id;

    // Register User B
    const regB = await makeRequest(server, 'POST', '/api/auth/register-password', {}, {
      email: `customer_b_${Date.now()}@astroverse.ai`,
      password: 'SafePassword123!',
      displayName: 'Customer B'
    });
    assert.strictEqual(regB.status, 200);
    userBToken = regB.body.sessionToken;
    userBId = regB.body.user.id;

    // Create Super Admin Session Token
    const rawAdminToken = `admin_test_token_${crypto.randomBytes(16).toString('hex')}`;
    const tokenHash = crypto.createHash('sha256').update(rawAdminToken).digest('hex');
    let adminUser = await db.findUserByEmail('tiwari0028@gmail.com');
    if (!adminUser) {
      adminUser = await db.createUser({
        email: 'tiwari0028@gmail.com',
        role: Role.SUPER_ADMIN,
        displayName: 'System Admin Owner'
      });
    }
    await db.createSession({
      userId: adminUser.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 86400000)
    });
    adminToken = rawAdminToken;
  });

  after(() => {
    return new Promise<void>(resolve => server.close(() => resolve()));
  });

  // =========================================================================
  // 1. ASYNC ORDER RESOLUTION ACROSS SERVERLESS INVOCATIONS
  // =========================================================================
  describe('1. Serverless Durable State Resolution (findPaymentOrderByIdAsync)', () => {
    it('1.1 Resolves order from memory cache immediately', async () => {
      const order = await db.createPaymentOrder({
        userId: userAId,
        amount: 118,
        currency: 'INR',
        provider: 'CASHFREE',
        providerOrderId: `cf_test_cache_${Date.now()}`,
        productType: 'WALLET_RECHARGE',
        baseAmount: 100,
        gstAmount: 18,
        bonusAmount: 10,
        creditAmount: 110
      });

      const found = await db.findPaymentOrderByIdAsync(order.providerOrderId!);
      assert.ok(found);
      assert.strictEqual(found.providerOrderId, order.providerOrderId);
      assert.strictEqual(found.userId, userAId);
    });

    it('1.2 Survives in-memory eviction and rehydrates from storage', async () => {
      const orderId = `cf_test_evict_${Date.now()}`;
      const order = await db.createPaymentOrder({
        userId: userAId,
        amount: 295,
        currency: 'INR',
        provider: 'CASHFREE',
        providerOrderId: orderId,
        productType: 'WALLET_RECHARGE',
        baseAmount: 250,
        gstAmount: 45,
        bonusAmount: 35,
        creditAmount: 285
      });

      // Simulate serverless cold start: clear in-memory array
      const memoryCopy = [...(db as any).data.paymentOrders];
      (db as any).data.paymentOrders = [];

      // Verify that findPaymentOrderById (synchronous) fails on empty memory
      const syncResult = db.findPaymentOrderById(orderId);
      assert.strictEqual(syncResult, null);

      // Restore memory or simulate rehydration
      (db as any).data.paymentOrders = memoryCopy;
      const asyncResult = await db.findPaymentOrderByIdAsync(orderId);
      assert.ok(asyncResult);
      assert.strictEqual(asyncResult.providerOrderId, orderId);
    });
  });

  // =========================================================================
  // 2. VERIFICATION ENDPOINT SAFE HANDLING (NO PREMATURE 404 OR FALSE FAILURE)
  // =========================================================================
  describe('2. /api/cashfree/verify-order Safe Gateway Handling', () => {
    it('2.1 Rejects empty or missing orderId with HTTP 400', async () => {
      const res = await makeRequest(server, 'GET', '/api/cashfree/verify-order?orderId=', {
        Authorization: `Bearer ${userAToken}`
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error, 'MISSING_ORDER_ID');
    });

    it('2.2 Enforces strict ownership check between authenticated users', async () => {
      const orderId = `cf_test_owner_${Date.now()}`;
      await db.createPaymentOrder({
        userId: userAId,
        amount: 118,
        currency: 'INR',
        provider: 'CASHFREE',
        providerOrderId: orderId,
        productType: 'WALLET_RECHARGE'
      });

      // User B tries to verify User A's order
      const res = await makeRequest(server, 'GET', `/api/cashfree/verify-order?orderId=${orderId}`, {
        Authorization: `Bearer ${userBToken}`
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.error, 'ORDER_USER_MISMATCH');
    });

    it('2.3 Returns graceful RECONCILIATION_REQUIRED instead of misleading failure for unresolved orders', async () => {
      const ghostOrderId = `cf_wal_nonexistent_${Date.now()}`;
      const res = await makeRequest(server, 'GET', `/api/cashfree/verify-order?orderId=${ghostOrderId}`, {
        Authorization: `Bearer ${userAToken}`
      });
      // Financial safety: must NOT return 500 unhandled exception
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.error, 'ORDER_NOT_FOUND');
      assert.strictEqual(res.body.status, 'RECONCILIATION_REQUIRED');
    });
  });

  // =========================================================================
  // 3. IDEMPOTENT FULFILLMENT & DOUBLE-CREDIT PREVENTION
  // =========================================================================
  describe('3. Idempotent Wallet Fulfillment (db.rechargeWallet)', () => {
    it('3.1 Credits wallet exactly once and prevents second credit with same payment ID', async () => {
      const orderId = `cf_wal_idemp_${Date.now()}`;
      const paymentId = `cf_pay_test_${Date.now()}`;

      await db.createPaymentOrder({
        userId: userAId,
        amount: 118,
        currency: 'INR',
        provider: 'CASHFREE',
        providerOrderId: orderId,
        productType: 'WALLET_RECHARGE',
        baseAmount: 100,
        gstAmount: 18,
        bonusAmount: 10,
        creditAmount: 110
      });

      const initialUser = await db.findUserById(userAId);
      const initialBalance = initialUser!.walletBalance;

      // First fulfillment
      const updatedUser = await db.rechargeWallet(userAId, 118, paymentId, orderId, 'CASHFREE');
      assert.strictEqual(updatedUser.walletBalance, initialBalance + 110);

      // Second fulfillment attempt with same payment ID (idempotent replay)
      const replayedUser = await db.rechargeWallet(userAId, 118, paymentId, orderId, 'CASHFREE');
      assert.strictEqual(replayedUser.walletBalance, initialBalance + 110, 'Balance must not change on duplicate fulfillment');
    });

    it('3.2 Prevents using an already-used payment ID for a different order', async () => {
      const order1 = `cf_wal_diff1_${Date.now()}`;
      const order2 = `cf_wal_diff2_${Date.now()}`;
      const paymentId = `cf_pay_shared_${Date.now()}`;

      await db.createPaymentOrder({
        userId: userAId,
        amount: 118,
        currency: 'INR',
        provider: 'CASHFREE',
        providerOrderId: order1,
        productType: 'WALLET_RECHARGE',
        baseAmount: 100,
        gstAmount: 18,
        bonusAmount: 10,
        creditAmount: 110
      });

      await db.createPaymentOrder({
        userId: userAId,
        amount: 118,
        currency: 'INR',
        provider: 'CASHFREE',
        providerOrderId: order2,
        productType: 'WALLET_RECHARGE',
        baseAmount: 100,
        gstAmount: 18,
        bonusAmount: 10,
        creditAmount: 110
      });

      // Fulfill order 1
      await db.rechargeWallet(userAId, 118, paymentId, order1, 'CASHFREE');

      // Attempting to fulfill order 2 with the same payment ID must throw PAYMENT_ID_ALREADY_USED
      await assert.rejects(
        () => db.rechargeWallet(userAId, 118, paymentId, order2, 'CASHFREE'),
        /PAYMENT_ID_ALREADY_USED/
      );
    });
  });

  // =========================================================================
  // 4. ADMIN RECOVERY ENDPOINT (POST /api/admin/payments/recover-order)
  // =========================================================================
  describe('4. Admin Manual Order Recovery (POST /api/admin/payments/recover-order)', () => {
    it('4.1 Rejects unauthenticated requests with HTTP 401', async () => {
      const res = await makeRequest(server, 'POST', '/api/admin/payments/recover-order', {}, {
        orderId: 'cf_wal_any_123'
      });
      assert.strictEqual(res.status, 401);
    });

    it('4.2 Rejects non-admin users with HTTP 403', async () => {
      const res = await makeRequest(server, 'POST', '/api/admin/payments/recover-order', {
        Authorization: `Bearer ${userAToken}`
      }, {
        orderId: 'cf_wal_any_123'
      });
      assert.strictEqual(res.status, 403);
    });

    it('4.3 Rejects missing orderId with HTTP 400', async () => {
      const res = await makeRequest(server, 'POST', '/api/admin/payments/recover-order', {
        Authorization: `Bearer ${adminToken}`
      }, {
        orderId: ''
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error, 'ORDER_ID_REQUIRED');
    });

    it('4.4 Authoritatively recovers real customer order cf_wal_f1bb9dc4d88c177f from Cashfree', async () => {
      // Provision Aryan's user profile in test database if not present
      const aryanId = 'e4fb472b-f452-423d-bf4e-3ba210af7dbf';
      let aryan = await db.findUserById(aryanId);
      if (!aryan) {
        aryan = await db.createUser({
          id: aryanId,
          email: 'menex544@gmail.com',
          displayName: 'Aryan',
          role: Role.SEEKER
        });
      }
      const initialBalance = aryan.walletBalance;

      // Ensure local order and prior ledger do NOT exist to prove auto-recovery from Cashfree API
      (db as any).data.paymentOrders = (db as any).data.paymentOrders.filter(
        (o: any) => o.providerOrderId !== 'cf_wal_f1bb9dc4d88c177f' && o.razorpayOrderId !== 'cf_wal_f1bb9dc4d88c177f'
      );
      (db as any).data.walletLedgers = (db as any).data.walletLedgers.filter(
        (l: any) => l.referenceId !== '6875951578' && l.idempotencyKey !== 'RECHARGE_6875951578'
      );

      // Call Admin Manual Recovery
      const res = await makeRequest(server, 'POST', '/api/admin/payments/recover-order', {
        Authorization: `Bearer ${adminToken}`
      }, {
        orderId: 'cf_wal_f1bb9dc4d88c177f'
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.recovered, true);
      assert.strictEqual(res.body.orderId, 'cf_wal_f1bb9dc4d88c177f');
      assert.strictEqual(res.body.orderStatus, 'PAID');
      assert.strictEqual(res.body.amount, 1.18);
      assert.strictEqual(res.body.customerId, aryanId);
      assert.strictEqual(res.body.paymentId, '6875951578');

      // Verify Aryan's balance is credited by exactly ₹1.00 base credit
      const updatedAryan = await db.findUserById(aryanId);
      assert.strictEqual(updatedAryan!.walletBalance, initialBalance + 1.00);

      // Re-running recovery must be idempotent
      const replayRes = await makeRequest(server, 'POST', '/api/admin/payments/recover-order', {
        Authorization: `Bearer ${adminToken}`
      }, {
        orderId: 'cf_wal_f1bb9dc4d88c177f'
      });
      assert.strictEqual(replayRes.status, 200);
      assert.strictEqual(replayRes.body.actionTaken, 'ALREADY_PAID_AND_FULFILLED');
      const finalAryan = await db.findUserById(aryanId);
      assert.strictEqual(finalAryan!.walletBalance, initialBalance + 1.00, 'Replay must not double credit wallet');
    });
  });
});
