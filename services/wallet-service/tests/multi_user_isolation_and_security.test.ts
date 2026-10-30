process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_multi_user_isolation_32chars';
process.env.DATABASE_STORAGE = 'memory';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import crypto from 'crypto';
import app from '../src/server';
import { db, Role, OrderStatus, EntryType } from '../src/db';
import {
  SubscriptionTier,
  BillingPeriod
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

describe('ASTROVERSE MULTI-USER ISOLATION, RLS, WALLET SECURITY & CONCURRENCY SUITE', () => {
  let server: http.Server;

  let customerAId: string;
  let customerAToken: string;

  let customerBId: string;
  let customerBToken: string;

  let customerCId: string;
  let customerCToken: string;

  let adminId: string;
  let adminToken: string;

  let profileBId: string;
  let reportBId: string;
  let orderBId: string;

  before(async () => {
    server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));

    // 1. Setup Customer A
    customerAId = 'cust-a-' + Date.now();
    await db.createUser({
      id: customerAId,
      email: `customer_a_${Date.now()}@example.com`,
      displayName: 'Customer Alpha',
      role: Role.USER,
      walletBalance: 150.00
    });
    const rawTokenA = `token_a_${crypto.randomBytes(16).toString('hex')}`;
    const hashA = crypto.createHash('sha256').update(rawTokenA).digest('hex');
    await db.createSession({ userId: customerAId, tokenHash: hashA, expiresAt: new Date(Date.now() + 86400000) });
    customerAToken = rawTokenA;

    // 2. Setup Customer B
    customerBId = 'cust-b-' + Date.now();
    await db.createUser({
      id: customerBId,
      email: `customer_b_${Date.now()}@example.com`,
      displayName: 'Customer Beta',
      role: Role.USER,
      walletBalance: 500.00
    });
    const rawTokenB = `token_b_${crypto.randomBytes(16).toString('hex')}`;
    const hashB = crypto.createHash('sha256').update(rawTokenB).digest('hex');
    await db.createSession({ userId: customerBId, tokenHash: hashB, expiresAt: new Date(Date.now() + 86400000) });
    customerBToken = rawTokenB;

    // 3. Setup Customer C
    customerCId = 'cust-c-' + Date.now();
    await db.createUser({
      id: customerCId,
      email: `customer_c_${Date.now()}@example.com`,
      displayName: 'Customer Gamma',
      role: Role.USER,
      walletBalance: 0.00
    });
    const rawTokenC = `token_c_${crypto.randomBytes(16).toString('hex')}`;
    const hashC = crypto.createHash('sha256').update(rawTokenC).digest('hex');
    await db.createSession({ userId: customerCId, tokenHash: hashC, expiresAt: new Date(Date.now() + 86400000) });
    customerCToken = rawTokenC;

    // 4. Setup Administrator
    adminId = 'admin-audit-' + Date.now();
    await db.createUser({
      id: adminId,
      email: 'tiwari0028@gmail.com', // Recognized super admin
      displayName: 'Security Admin',
      role: Role.OWNER,
      walletBalance: 0
    });
    const rawAdminToken = `token_admin_${crypto.randomBytes(16).toString('hex')}`;
    const hashAdmin = crypto.createHash('sha256').update(rawAdminToken).digest('hex');
    await db.createSession({ userId: adminId, tokenHash: hashAdmin, expiresAt: new Date(Date.now() + 86400000) });
    adminToken = rawAdminToken;

    // 5. Provision Customer B Resources (BirthProfile, SavedReport, PaymentOrder)
    const profB = await db.createProfile({
      userId: customerBId,
      profileName: 'Beta Birth Chart',
      dateOfBirth: '1992-05-15',
      timeOfBirth: '14:30',
      birthplaceName: 'Mumbai',
      latitude: 19.0760,
      longitude: 72.8777,
      resolvedTimezone: 'Asia/Kolkata'
    });
    profileBId = profB.id;

    const repB = await db.createSavedReport({
      userId: customerBId,
      title: 'Beta Confidential Kundli Report',
      reportType: 'report_janam_kundli_deep_dive',
      payload: { secretAnalysis: 'Confidential planetary aspects for Customer B only' }
    });
    reportBId = repB.id;

    orderBId = `cf_ord_beta_${Date.now()}`;
    await db.createPaymentOrder({
      userId: customerBId,
      amount: 295.00,
      currency: 'INR',
      provider: 'CASHFREE',
      providerOrderId: orderBId,
      gateway: 'CASHFREE',
      productType: 'WALLET_RECHARGE',
      baseAmount: 250,
      gstAmount: 45,
      bonusAmount: 35,
      creditAmount: 285
    });
  });

  after(() => {
    return new Promise<void>(resolve => server.close(() => resolve()));
  });

  describe('SECTION 1: Strict Multi-User Isolation & Anti-IDOR Protections', () => {
    it('1.1 Customer A cannot read Customer B wallet balance via /api/wallet/:userId', async () => {
      const res = await makeRequest(server, 'GET', `/api/wallet/${customerBId}`, {
        Authorization: `Bearer ${customerAToken}`
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.error, 'FORBIDDEN');
    });

    it('1.2 Customer A cannot access Customer B birth profiles via /api/profiles/:userId', async () => {
      const res = await makeRequest(server, 'GET', `/api/profiles/${customerBId}`, {
        Authorization: `Bearer ${customerAToken}`
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.error, 'FORBIDDEN');
    });

    it('1.3 Customer A cannot update Customer B birth profile via PUT /api/profiles/:id', async () => {
      const res = await makeRequest(server, 'PUT', `/api/profiles/${profileBId}`, {
        Authorization: `Bearer ${customerAToken}`
      }, {
        profileName: 'Tampered Profile'
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.error, 'FORBIDDEN');
    });

    it('1.4 Customer A cannot delete Customer B birth profile via DELETE /api/profiles/:id', async () => {
      const res = await makeRequest(server, 'DELETE', `/api/profiles/${profileBId}`, {
        Authorization: `Bearer ${customerAToken}`
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.error, 'FORBIDDEN');
    });

    it('1.5 Customer A cannot access Customer B private report reader via /api/reports/reader/:id', async () => {
      const res = await makeRequest(server, 'GET', `/api/reports/reader/${reportBId}`, {
        Authorization: `Bearer ${customerAToken}`
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.error, 'FORBIDDEN');
    });

    it('1.6 Customer A cannot view Customer B saved reports list via /api/reports/:userId', async () => {
      const res = await makeRequest(server, 'GET', `/api/reports/${customerBId}`, {
        Authorization: `Bearer ${customerAToken}`
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.error, 'FORBIDDEN');
    });

    it('1.7 Customer A cannot delete Customer B saved report via DELETE /api/reports/:id', async () => {
      const res = await makeRequest(server, 'DELETE', `/api/reports/${reportBId}`, {
        Authorization: `Bearer ${customerAToken}`
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.error, 'FORBIDDEN');
    });

    it('1.8 Customer A cannot generate a report using Customer B birth profile', async () => {
      const res = await makeRequest(server, 'POST', '/api/reports/order', {
        Authorization: `Bearer ${customerAToken}`
      }, {
        productId: 'report_one_month_forecast',
        profileId: profileBId,
        paymentMethod: 'WALLET'
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.error, 'FORBIDDEN');
    });

    it('1.9 Customer A cannot verify or claim Customer B payment order', async () => {
      const res = await makeRequest(server, 'POST', '/api/wallet/verify-payment', {
        Authorization: `Bearer ${customerAToken}`
      }, {
        orderId: orderBId,
        paymentId: 'fake_payment_123'
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.error, 'FORBIDDEN');
    });

    it('1.10 Customer A cannot settle consultation for Customer B account', async () => {
      const res = await makeRequest(server, 'POST', '/api/wallet/settle-consultation', {
        Authorization: `Bearer ${customerAToken}`
      }, {
        userId: customerBId,
        astrologerId: 'astro_raghavendra',
        sessionId: 'sess_unauthorized_123',
        durationMinutes: 5
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.error, 'FORBIDDEN');
    });

    it('1.11 Customer A cannot execute administrative balance adjustments', async () => {
      const res = await makeRequest(server, 'POST', '/api/admin/wallet/adjust-balance', {
        Authorization: `Bearer ${customerAToken}`
      }, {
        userId: customerAId,
        amount: 500,
        type: 'CREDIT',
        reason: 'Unauthorized self credit'
      });
      assert.equal(res.status, 403);
    });

    it('1.12 Customer A cannot execute administrative payment reconciliation', async () => {
      const res = await makeRequest(server, 'POST', '/api/admin/payments/reconcile', {
        Authorization: `Bearer ${customerAToken}`
      });
      assert.equal(res.status, 403);
    });
  });

  describe('SECTION 2: Concurrency, Double Spending & Atomic Integrity', () => {
    it('2.1 Concurrent Debits: Customer with ₹150 cannot double-purchase two ₹149 subscriptions simultaneously', async () => {
      // Customer A has ₹150. Launch two concurrent purchases of PLUS (₹149 each).
      const [req1, req2] = await Promise.all([
        makeRequest(server, 'POST', '/api/subscriptions/purchase-with-wallet', {
          Authorization: `Bearer ${customerAToken}`,
          'x-idempotency-key': `conc_sub_1_${Date.now()}`
        }, {
          tier: SubscriptionTier.PLUS,
          billingPeriod: BillingPeriod.MONTHLY
        }),
        makeRequest(server, 'POST', '/api/subscriptions/purchase-with-wallet', {
          Authorization: `Bearer ${customerAToken}`,
          'x-idempotency-key': `conc_sub_2_${Date.now()}`
        }, {
          tier: SubscriptionTier.PLUS,
          billingPeriod: BillingPeriod.MONTHLY
        })
      ]);

      const successCount = [req1, req2].filter(r => r.status === 200).length;
      const failureCount = [req1, req2].filter(r => r.status === 400).length;

      assert.equal(successCount, 1, 'Exactly one concurrent debit must succeed');
      assert.equal(failureCount, 1, 'Second concurrent debit must be rejected with INSUFFICIENT_FUNDS');

      const userFresh = await db.findUserById(customerAId);
      assert.ok(userFresh);
      assert.equal(userFresh.walletBalance, 1.00, 'Balance must drop from 150 to 1.00 (never negative)');
    });

    it('2.2 Concurrent Webhooks: Duplicate delivery of same Cashfree payment ID credits wallet exactly once', async () => {
      const testPaymentId = `cf_pay_conc_${Date.now()}`;
      const testOrderId = `cf_ord_conc_${Date.now()}`;

      await db.createPaymentOrder({
        userId: customerBId,
        amount: 118,
        currency: 'INR',
        provider: 'CASHFREE',
        providerOrderId: testOrderId,
        gateway: 'CASHFREE',
        productType: 'WALLET_RECHARGE',
        baseAmount: 100,
        gstAmount: 18,
        bonusAmount: 10,
        creditAmount: 110
      });

      const initialBal = (await db.findUserById(customerBId))!.walletBalance;

      // Deliver 3 simultaneous recharges with same paymentId
      const [r1, r2, r3] = await Promise.all([
        db.rechargeWallet(customerBId, 118, testPaymentId, testOrderId, 'CASHFREE').catch(err => err),
        db.rechargeWallet(customerBId, 118, testPaymentId, testOrderId, 'CASHFREE').catch(err => err),
        db.rechargeWallet(customerBId, 118, testPaymentId, testOrderId, 'CASHFREE').catch(err => err)
      ]);

      const finalBal = (await db.findUserById(customerBId))!.walletBalance;
      assert.equal(finalBal, initialBal + 110, 'Wallet must be credited exactly once by ₹110');
    });

    it('2.3 Rejects paymentId reuse across different orders', async () => {
      const reusedPaymentId = `pay_reused_${Date.now()}`;
      const order1 = `ord_first_${Date.now()}`;
      const order2 = `ord_second_${Date.now()}`;

      await db.createPaymentOrder({
        userId: customerBId,
        amount: 118,
        providerOrderId: order1,
        gateway: 'CASHFREE',
        productType: 'WALLET_RECHARGE',
        baseAmount: 100,
        gstAmount: 18,
        creditAmount: 100
      });

      await db.createPaymentOrder({
        userId: customerCId,
        amount: 118,
        providerOrderId: order2,
        gateway: 'CASHFREE',
        productType: 'WALLET_RECHARGE',
        baseAmount: 100,
        gstAmount: 18,
        creditAmount: 100
      });

      // Settle first order
      await db.rechargeWallet(customerBId, 118, reusedPaymentId, order1, 'CASHFREE');

      // Attempt to reuse same paymentId for order2
      await assert.rejects(
        () => db.rechargeWallet(customerCId, 118, reusedPaymentId, order2, 'CASHFREE'),
        /PAYMENT_ID_ALREADY_USED/
      );
    });
  });

  describe('SECTION 3: Credential Isolation & Environment Protection', () => {
    it('3.1 GET /api/config exports only browser-safe parameters without leaking secret keys', async () => {
      const res = await makeRequest(server, 'GET', '/api/config');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'CONFIG_READY');
      assert.equal(res.body.paymentsConfigured, true);
      assert.equal(res.body.gateway, 'CASHFREE');

      // Verify no secrets leaked in body
      const rawText = JSON.stringify(res.body);
      assert.equal(rawText.includes('secret'), false, 'Response body must not contain the word secret');
      assert.equal(rawText.includes('service_role'), false, 'Response body must not contain service_role');
      assert.equal(rawText.includes('DATABASE_URL'), false, 'Response body must not contain DATABASE_URL');
      assert.ok(res.body.cashfreeAppIdMasked, 'Must provide masked app ID');
    });

    it('3.2 Diagnostic endpoints fail-closed when unauthenticated', async () => {
      const res = await makeRequest(server, 'GET', '/api/admin/payment-readiness');
      assert.equal(res.status, 401, 'Unauthenticated access to admin payment readiness must be rejected');
    });
  });
});
