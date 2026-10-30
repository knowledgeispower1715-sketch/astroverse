process.env.NODE_ENV = 'test';
import assert from 'assert';
import http from 'http';
import app from '../src/server';
import { db, Role, AccountStatus, UserRecord, OrderStatus } from '../src/db';
import {
  generateTestWebhookSignature,
  verifyRazorpayWebhookSignature,
  getRazorpayWebhookSecret
} from '../src/razorpay';
import { REPORT_CATALOGUE, calculateReportPrice, SubscriptionTier } from '../src/monetization/catalog';

let server: http.Server;
const TEST_PORT = 5062;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function request(path: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body !== undefined
      ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
      : undefined
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, headers: res.headers, data };
}

async function runRazorpayComplianceTestSuite() {
  console.log('===============================================================');
  console.log('ASTROVERSE RAZORPAY COMPLIANCE, WEBHOOKS & BILLING TEST SUITE');
  console.log('===============================================================\n');

  server = app.listen(TEST_PORT);
  let passCount = 0;
  let failCount = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passCount++;
    } catch (err: any) {
      console.error(`[FAIL] ${name}:`, err.message);
      failCount++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // 1. CRYPTOGRAPHIC SIGNATURE & REPLAY RESISTANCE
    // -------------------------------------------------------------------------
    console.log('--- 1. CRYPTOGRAPHIC WEBHOOK SIGNATURE VERIFICATION ---');

    await test('Webhook signature matches authentic HMAC-SHA256 of payload', async () => {
      const payload = JSON.stringify({
        event: 'order.paid',
        payload: { payment: { entity: { id: 'pay_123', amount: 49900 } } }
      });
      const signature = generateTestWebhookSignature(payload);
      const isValid = verifyRazorpayWebhookSignature(payload, signature);
      assert.strictEqual(isValid, true, 'Valid signature should verify true');
    });

    await test('Webhook signature fails when payload is tampered', async () => {
      const payload = JSON.stringify({
        event: 'order.paid',
        payload: { payment: { entity: { id: 'pay_123', amount: 49900 } } }
      });
      const tamperedPayload = JSON.stringify({
        event: 'order.paid',
        payload: { payment: { entity: { id: 'pay_123', amount: 99900 } } }
      });
      const signature = generateTestWebhookSignature(payload);
      const isValid = verifyRazorpayWebhookSignature(tamperedPayload, signature);
      assert.strictEqual(isValid, false, 'Tampered payload should fail verification');
    });

    await test('Webhook signature fails with incorrect secret', async () => {
      const payload = JSON.stringify({ event: 'order.paid' });
      const signature = generateTestWebhookSignature(payload, 'wrong_webhook_secret_key');
      const isValid = verifyRazorpayWebhookSignature(payload, signature);
      assert.strictEqual(isValid, false, 'Signature with wrong secret should fail');
    });

    // -------------------------------------------------------------------------
    // 2. GATEWAY RETIREMENT & FAIL-CLOSED PROTECTION TESTS
    // -------------------------------------------------------------------------
    console.log('\n--- 2. RAZORPAY GATEWAY RETIREMENT & REJECTION TESTS ---');

    await test('POST /api/webhooks/razorpay returns HTTP 410 GATEWAY_RETIRED for incoming webhook events', async () => {
      const payload = { event: 'order.paid' };
      const res = await request('/api/webhooks/razorpay', {
        method: 'POST',
        headers: { 'x-razorpay-signature': 'sig_123' },
        body: payload
      });
      assert.strictEqual(res.status, 410);
      assert.strictEqual(res.data?.error, 'GATEWAY_RETIRED');
      assert.strictEqual(res.data?.message, 'Razorpay webhooks are retired. Use Cashfree.');
    });

    // Create a real test user and session via register-password
    const testEmail = 'compliance_test_' + Date.now() + '@example.com';
    const regRes = await request('/api/auth/register-password', {
      method: 'POST',
      body: {
        email: testEmail,
        password: 'Password123!',
        displayName: 'Compliance Test User'
      }
    });
    assert.strictEqual(regRes.status, 200);
    const testUser = regRes.data.user;
    const sessionToken = regRes.data.sessionToken;
    const authHeaders = { Authorization: 'Bearer ' + sessionToken };

    const orderIdStr = 'order_rzp_comp_' + Date.now();
    await db.createPaymentOrder({
      userId: testUser.id,
      amount: 500,
      currency: 'INR',
      razorpayOrderId: orderIdStr
    });

    await test('POST /api/wallet/verify-payment rejects legacy Razorpay payment submission with HTTP 410', async () => {
      const res = await request('/api/wallet/verify-payment', {
        method: 'POST',
        headers: authHeaders,
        body: {
          orderId: orderIdStr,
          paymentId: 'pay_rzp_legacy_' + Date.now(),
          signature: 'legacy_signature_hex'
        }
      });
      assert.strictEqual(res.status, 410);
      assert.strictEqual(res.data?.error, 'PAYMENT_PROVIDER_RETIRED');
    });

    await test('POST /api/subscriptions/verify-payment rejects legacy Razorpay payment submission with HTTP 410', async () => {
      const res = await request('/api/subscriptions/verify-payment', {
        method: 'POST',
        headers: authHeaders,
        body: {
          orderId: orderIdStr,
          paymentId: 'pay_rzp_sub_' + Date.now(),
          signature: 'legacy_signature_hex'
        }
      });
      assert.strictEqual(res.status, 410);
      assert.strictEqual(res.data?.error, 'PAYMENT_PROVIDER_RETIRED');
    });

    await test('POST /api/reports/verify-and-generate rejects legacy Razorpay payment submission with HTTP 410', async () => {
      const res = await request('/api/reports/verify-and-generate', {
        method: 'POST',
        headers: authHeaders,
        body: {
          orderId: orderIdStr,
          paymentId: 'pay_rzp_rep_' + Date.now(),
          signature: 'legacy_signature_hex',
          productId: 'report_janam_kundli_deep_dive'
        }
      });
      assert.strictEqual(res.status, 410);
      assert.strictEqual(res.data?.error, 'PAYMENT_PROVIDER_RETIRED');
    });

    await test('Historical Razorpay transaction in database remains queryable and verifiable', async () => {
      const found = db.findPaymentOrderById(orderIdStr);
      assert.ok(found);
      assert.strictEqual(found.userId, testUser.id);
      assert.strictEqual(found.amount, 500);
    });

    // -------------------------------------------------------------------------
    // 2B. CROSS-PRODUCT & CROSS-TIER REPLAY PREVENTION (AV-SEC-02)
    // -------------------------------------------------------------------------
    console.log('\n--- 2B. CROSS-PRODUCT REPLAY PREVENTION TESTS (AV-SEC-02) ---');

    const walletOrderId = 'cf_wal_replay_' + Date.now();
    await db.createPaymentOrder({
      userId: testUser.id,
      amount: 149,
      currency: 'INR',
      provider: 'CASHFREE',
      providerOrderId: walletOrderId,
      productType: 'WALLET_RECHARGE'
    });

    await test('AV-SEC-02: /api/subscriptions/verify-payment rejects WALLET_RECHARGE order with HTTP 400 INVALID_ORDER_TYPE', async () => {
      const res = await request('/api/subscriptions/verify-payment', {
        method: 'POST',
        headers: authHeaders,
        body: {
          orderId: walletOrderId,
          paymentId: 'cf_pay_test_' + Date.now(),
          tier: 'PLUS'
        }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data?.error, 'INVALID_ORDER_TYPE');
    });

    await test('AV-SEC-02: /api/reports/verify-and-generate rejects WALLET_RECHARGE order with HTTP 400 INVALID_ORDER_TYPE', async () => {
      const res = await request('/api/reports/verify-and-generate', {
        method: 'POST',
        headers: authHeaders,
        body: {
          orderId: walletOrderId,
          paymentId: 'cf_pay_test_' + Date.now(),
          productId: 'report_janam_kundli_deep_dive'
        }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data?.error, 'INVALID_ORDER_TYPE');
    });

    const subOrderId = 'cf_sub_replay_' + Date.now();
    await db.createPaymentOrder({
      userId: testUser.id,
      amount: 149,
      currency: 'INR',
      provider: 'CASHFREE',
      providerOrderId: subOrderId,
      productType: 'SUBSCRIPTION',
      productId: 'PLUS'
    });

    await test('AV-SEC-02: /api/wallet/verify-payment rejects SUBSCRIPTION order with HTTP 400 INVALID_ORDER_TYPE', async () => {
      const res = await request('/api/wallet/verify-payment', {
        method: 'POST',
        headers: authHeaders,
        body: {
          orderId: subOrderId,
          paymentId: 'cf_pay_test_' + Date.now()
        }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data?.error, 'INVALID_ORDER_TYPE');
    });

    await test('AV-SEC-02: /api/subscriptions/verify-payment rejects tier mismatch with HTTP 400 TIER_MISMATCH', async () => {
      const res = await request('/api/subscriptions/verify-payment', {
        method: 'POST',
        headers: authHeaders,
        body: {
          orderId: subOrderId,
          paymentId: 'cf_pay_test_' + Date.now(),
          tier: 'PREMIUM'
        }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data?.error, 'TIER_MISMATCH');
    });

    const repOrderId = 'cf_rep_replay_' + Date.now();
    await db.createPaymentOrder({
      userId: testUser.id,
      amount: 149,
      currency: 'INR',
      provider: 'CASHFREE',
      providerOrderId: repOrderId,
      productType: 'REPORT',
      productId: 'report_career_education'
    });

    await test('AV-SEC-02: /api/reports/verify-and-generate rejects product mismatch with HTTP 400 PRODUCT_MISMATCH', async () => {
      const res = await request('/api/reports/verify-and-generate', {
        method: 'POST',
        headers: authHeaders,
        body: {
          orderId: repOrderId,
          paymentId: 'cf_pay_test_' + Date.now(),
          productId: 'report_janam_kundli_deep_dive'
        }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data?.error, 'PRODUCT_MISMATCH');
    });

    // -------------------------------------------------------------------------
    // 3. BILLING ENDPOINTS (STATUS & HISTORY)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. BILLING ENDPOINTS (GET /api/billing/*) ---');

    await test('GET /api/billing/status rejects unauthenticated request with HTTP 401', async () => {
      const res = await request('/api/billing/status');
      assert.strictEqual(res.status, 401);
    });

    await test('GET /api/billing/status returns complete active tier, balance & entitlements', async () => {
      const res = await request('/api/billing/status', {
        headers: authHeaders
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data?.userId, testUser.id);
      assert.strictEqual(res.data?.currency, 'INR');
      assert.ok(res.data?.entitlements, 'Entitlements snapshot must be present');
      assert.strictEqual(typeof res.data?.walletBalance, 'number');
    });

    await test('GET /api/billing/history rejects unauthenticated request with HTTP 401', async () => {
      const res = await request('/api/billing/history');
      assert.strictEqual(res.status, 401);
    });

    await test('GET /api/billing/history returns orders and ledger with user isolation', async () => {
      const res = await request('/api/billing/history', {
        headers: authHeaders
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data?.userId, testUser.id);
      assert.ok(Array.isArray(res.data?.orders), 'orders should be an array');
      assert.ok(Array.isArray(res.data?.ledger), 'ledger should be an array');
      assert.ok(res.data?.totalOrders >= 1, 'Should include previously created order');
    });

    // -------------------------------------------------------------------------
    // 4. COMPLIANCE & CATALOG INTEGRITY CHECKS
    // -------------------------------------------------------------------------
    console.log('\n--- 4. COMPLIANCE, MCC & CATALOG POSITIONING INTEGRITY ---');

    await test('Kundli Milan catalog item is classified as Astrological Synastry with explicit disclaimer', async () => {
      const milanProduct = REPORT_CATALOGUE['report_kundli_milan'];
      assert.ok(milanProduct, 'report_kundli_milan must exist in catalog');
      assert.ok(
        milanProduct.displayName.includes('Astrological Synastry'),
        'Display name must specify Astrological Synastry'
      );
      assert.ok(
        milanProduct.shortDescription.toLowerCase().includes('not a matrimonial') ||
        milanProduct.shortDescription.toLowerCase().includes('software calculation'),
        'Description must state software calculation / non-matrimonial'
      );
    });

    await test('All 10 catalog products have explicit INR pricing and valid chapter structures', async () => {
      const allReports = Object.values(REPORT_CATALOGUE);
      assert.strictEqual(allReports.length, 10, 'Expected exactly 10 report products');
      for (const prod of allReports) {
        assert.ok(prod.pricePaise >= 0, `${prod.productId} pricePaise must be >= 0`);
        assert.ok(prod.includedSections.length > 0, `${prod.productId} must have defined sections`);
      }
    });

    console.log('\n===============================================================');
    console.log(`RAZORPAY COMPLIANCE SUITE COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('===============================================================');

    if (failCount > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
  }
}

runRazorpayComplianceTestSuite().catch((err) => {
  console.error('Compliance test fatal error:', err);
  process.exit(1);
});
