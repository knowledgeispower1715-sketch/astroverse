import test from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app from '../src/server';
import { db } from '../src/db';
import {
  getPaymentReadinessStatus,
  PaymentReadinessState
} from '../src/cashfree';
import {
  CANONICAL_PRODUCT_CATALOGUE,
  SUBSCRIPTION_PLANS,
  SubscriptionTier,
  getAllCanonicalProducts,
  getCanonicalProduct,
  updateCanonicalProductPrice
} from '../src/monetization/catalog';

const TEST_PORT = 5089;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function request(path: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, headers: res.headers, body: data };
}

test('ASTROVERSE CASHFREE PAYMENT ACTIVATION & PRICING SYNCHRONIZATION SUITE', async (t) => {
  let server: http.Server;

  t.before(() => {
    server = app.listen(TEST_PORT);
  });

  t.after(() => {
    if (server) server.close();
  });

  await t.test('1. Diagnostic Readiness Resolver & Status States', async () => {
    const origAppId = process.env.CASHFREE_APP_ID;
    const origSecret = process.env.CASHFREE_SECRET_KEY;
    const origEnv = process.env.CASHFREE_ENV;

    try {
      // 1.1 Missing credentials state
      delete process.env.CASHFREE_APP_ID;
      delete process.env.CASHFREE_SECRET_KEY;
      const missingStatus = getPaymentReadinessStatus();
      assert.strictEqual(missingStatus.state, PaymentReadinessState.MISSING_SERVER_CREDENTIALS);
      assert.strictEqual(missingStatus.configured, false);
      assert.strictEqual(missingStatus.appIdMasked, 'NOT_CONFIGURED');
      assert(missingStatus.customerMessage.includes('Online payment gateway is undergoing configuration'));

      // 1.2 Environment mismatch: production env with sandbox key
      process.env.CASHFREE_APP_ID = 'TEST10001';
      process.env.CASHFREE_SECRET_KEY = 'cfsk_ma_test_1234567890abcdef_12345678';
      process.env.CASHFREE_ENV = 'production';
      const mismatchStatus1 = getPaymentReadinessStatus();
      assert.strictEqual(mismatchStatus1.state, PaymentReadinessState.ENVIRONMENT_MISMATCH);
      assert.strictEqual(mismatchStatus1.configured, false);
      assert(mismatchStatus1.adminExplanation.includes('Environment mismatch'));

      // 1.3 Environment mismatch: sandbox env with production key
      process.env.CASHFREE_APP_ID = origAppId || '14962482c27cb93db2c6bc6e4af8426941';
      process.env.CASHFREE_SECRET_KEY = origSecret || 'cfsk_ma_prod_mock_for_mismatch_test';
      process.env.CASHFREE_ENV = 'sandbox';
      const mismatchStatus2 = getPaymentReadinessStatus();
      assert.strictEqual(mismatchStatus2.state, PaymentReadinessState.ENVIRONMENT_MISMATCH);
      assert.strictEqual(mismatchStatus2.configured, false);

      // 1.4 Feature flag disabled
      process.env.CASHFREE_ENV = 'production';
      const disabledStatus = getPaymentReadinessStatus({ featureFlagEnabled: false });
      assert.strictEqual(disabledStatus.state, PaymentReadinessState.DISABLED_BY_MERCHANT_CONFIGURATION);
      assert.strictEqual(disabledStatus.configured, false);

      // 1.5 Ready state (production env with production key)
      const readyStatus = getPaymentReadinessStatus();
      assert.strictEqual(readyStatus.state, PaymentReadinessState.READY);
      assert.strictEqual(readyStatus.configured, true);
      assert.strictEqual(readyStatus.environment, 'production');
      assert.strictEqual(readyStatus.appIdMasked.length > 0, true);
    } finally {
      if (origAppId) process.env.CASHFREE_APP_ID = origAppId;
      if (origSecret) process.env.CASHFREE_SECRET_KEY = origSecret;
      if (origEnv) process.env.CASHFREE_ENV = origEnv;
    }
  });

  await t.test('2. Authoritative Canonical Product & Pricing Catalogue Reconciliation', async () => {
    // 2.1 Subscriptions must strictly match public baseline
    const plus = getCanonicalProduct('sub_plus');
    assert(plus, 'sub_plus must exist in canonical catalogue');
    assert.strictEqual(plus.amountRupees, 149, 'AstroVerse Plus monthly must be ₹149');
    assert.strictEqual(plus.amountPaise, 14900, 'AstroVerse Plus monthly must be 14900 paise');
    assert.strictEqual(plus.annualPriceRupees, 1299, 'AstroVerse Plus annual must be ₹1,299');
    assert.strictEqual(plus.annualPricePaise, 129900, 'AstroVerse Plus annual must be 129900 paise');

    const premium = getCanonicalProduct('sub_premium');
    assert(premium, 'sub_premium must exist in canonical catalogue');
    assert.strictEqual(premium.amountRupees, 299, 'AstroVerse Premium monthly must be ₹299');
    assert.strictEqual(premium.amountPaise, 29900, 'AstroVerse Premium monthly must be 29900 paise');
    assert.strictEqual(premium.annualPriceRupees, 2499, 'AstroVerse Premium annual must be ₹2,499');
    assert.strictEqual(premium.annualPricePaise, 249900, 'AstroVerse Premium annual must be 249900 paise');

    // 2.2 Individual digital reports
    const expectedReports = [
      { id: 'report_janam_kundli_deep_dive', rupees: 199 },
      { id: 'report_career_education', rupees: 149 },
      { id: 'report_relationship_marriage', rupees: 149 },
      { id: 'report_kundli_milan', rupees: 149 },
      { id: 'report_one_month_forecast', rupees: 49 },
      { id: 'report_twelve_month_varshphal', rupees: 249 },
      { id: 'report_three_year_roadmap', rupees: 499 },
      { id: 'report_bundle_kundli_varshphal', rupees: 399 },
      { id: 'report_vedic_name_numerology', rupees: 199 },
      { id: 'report_remedial_gemstones', rupees: 149 }
    ];

    for (const er of expectedReports) {
      const prod = getCanonicalProduct(er.id);
      assert(prod, `Report '${er.id}' must exist in canonical catalogue`);
      assert.strictEqual(prod.amountRupees, er.rupees, `${er.id} price must match ₹${er.rupees}`);
      assert.strictEqual(prod.amountPaise, er.rupees * 100, `${er.id} paise must be ${er.rupees * 100}`);
    }

    // 2.3 Wallet recharge packs
    const w100 = getCanonicalProduct('wallet_pack_100');
    assert(w100, 'wallet_pack_100 must exist');
    assert.strictEqual(w100.amountRupees, 118, '₹100 base + 18% GST = ₹118 total payable');
    assert.strictEqual(w100.entitlementMapping.bonusAmount, 10);
    assert.strictEqual(w100.entitlementMapping.totalCredit, 110);

    const w250 = getCanonicalProduct('wallet_pack_250');
    assert(w250, 'wallet_pack_250 must exist');
    assert.strictEqual(w250.amountRupees, 295, '₹250 base + 18% GST = ₹295 total payable');
    assert.strictEqual(w250.entitlementMapping.bonusAmount, 35);
    assert.strictEqual(w250.entitlementMapping.totalCredit, 285);

    const w500 = getCanonicalProduct('wallet_pack_500');
    assert(w500, 'wallet_pack_500 must exist');
    assert.strictEqual(w500.amountRupees, 590, '₹500 base + 18% GST = ₹590 total payable');
    assert.strictEqual(w500.entitlementMapping.bonusAmount, 100);
    assert.strictEqual(w500.entitlementMapping.totalCredit, 600);

    // 2.4 Filter by category
    const subs = getAllCanonicalProducts('SUBSCRIPTION');
    assert.strictEqual(subs.length, 2);
    const reps = getAllCanonicalProducts('REPORT');
    assert.strictEqual(reps.length, 10);
    const wals = getAllCanonicalProducts('WALLET_RECHARGE');
    assert.strictEqual(wals.length, 3);
  });

  await t.test('3. Public Endpoints: GET /api/config & GET /api/catalog/products', async () => {
    // 3.1 GET /api/config
    const confRes = await request('/api/config');
    assert.strictEqual(confRes.status, 200);
    assert.strictEqual(confRes.body.status, 'CONFIG_READY');
    assert.strictEqual(confRes.body.gateway, 'CASHFREE');
    assert.strictEqual(typeof confRes.body.paymentsConfigured, 'boolean');
    assert.strictEqual(typeof confRes.body.readinessState, 'string');
    assert.strictEqual(typeof confRes.body.readinessMessage, 'string');
    assert.strictEqual(typeof confRes.body.cashfreeAppIdMasked, 'string');

    // 3.2 GET /api/catalog/products
    const catRes = await request('/api/catalog/products');
    assert.strictEqual(catRes.status, 200);
    assert.strictEqual(catRes.body.success, true);
    assert.strictEqual(catRes.body.currency, 'INR');
    assert(Array.isArray(catRes.body.products));
    assert(catRes.body.products.length >= 15);
  });

  await t.test('4. Admin Pricing Synchronization: Preview & Update Endpoints', async () => {
    // Create an admin user session
    const adminEmail = `admin_pricing_${Date.now()}@astroverse.app`;
    const regRes = await request('/api/auth/register-password', {
      method: 'POST',
      body: { email: adminEmail, password: 'AdminSecure#2026_Key', name: 'Pricing Admin' }
    });
    assert.strictEqual(regRes.status, 200);
    const adminToken = regRes.body.sessionToken;

    // Promote to SUPER_ADMIN
    const userRecord = await db.findUserById(regRes.body.user.id);
    if (userRecord) userRecord.role = 'SUPER_ADMIN' as any;

    // 4.1 GET /api/admin/products
    const adminProdRes = await request('/api/admin/products', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminProdRes.status, 200);
    assert(adminProdRes.body.products.length >= 15);

    // 4.2 POST /api/admin/products/preview
    const prevRes = await request('/api/admin/products/preview', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        id: 'report_career_education',
        proposedAmountRupees: 169
      }
    });
    assert.strictEqual(prevRes.status, 200);
    assert.strictEqual(prevRes.body.currentPriceRupees, 149);
    assert.strictEqual(prevRes.body.proposedPriceRupees, 169);
    assert.strictEqual(prevRes.body.diffRupees, 20);
    assert.strictEqual(prevRes.body.diffPercent, 13.4);

    // 4.3 PUT /api/admin/products/:id (Rejects invalid non-positive price)
    const badUpdate = await request('/api/admin/products/report_career_education', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { amountRupees: -50 }
    });
    assert.strictEqual(badUpdate.status, 400);

    // 4.4 Non-admin user cannot edit price
    const regularUserRes = await request('/api/auth/register-password', {
      method: 'POST',
      body: { email: `regular_${Date.now()}@example.com`, password: 'Regular#Password123' }
    });
    const regularToken = regularUserRes.body.sessionToken;

    const unauthUpdate = await request('/api/admin/products/report_career_education', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${regularToken}` },
      body: { amountRupees: 199 }
    });
    assert.strictEqual(unauthUpdate.status, 403);

    // 4.5 GET /api/admin/payment-readiness
    const readyRes = await request('/api/admin/payment-readiness', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(readyRes.status, 200);
    assert.strictEqual(readyRes.body.activeGateway, 'CASHFREE');
    assert.strictEqual(readyRes.body.apiVersion, '2026-01-01');
  });

  await t.test('5. Fail-Closed Error Contract with Specific Diagnostic State', async () => {
    const origAppId = process.env.CASHFREE_APP_ID;
    const origSecret = process.env.CASHFREE_SECRET_KEY;
    delete process.env.CASHFREE_APP_ID;
    delete process.env.CASHFREE_SECRET_KEY;

    try {
      const userRes = await request('/api/auth/register-password', {
        method: 'POST',
        body: { email: `failclosed_${Date.now()}@example.com`, password: 'TestSecurePass#123' }
      });
      const token = userRes.body.sessionToken;

      const orderRes = await request('/api/subscriptions/create-order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { tier: 'PLUS', billingPeriod: 'monthly' }
      });

      assert.strictEqual(orderRes.status, 503);
      assert.strictEqual(orderRes.body.error, 'PAYMENTS_NOT_CONFIGURED');
      assert.strictEqual(orderRes.body.readinessState, PaymentReadinessState.MISSING_SERVER_CREDENTIALS);
      assert.strictEqual(orderRes.body.gateway, 'CASHFREE');
      assert(orderRes.body.message.includes('Online payment gateway is undergoing configuration'));
    } finally {
      if (origAppId) process.env.CASHFREE_APP_ID = origAppId;
      if (origSecret) process.env.CASHFREE_SECRET_KEY = origSecret;
    }
  });

  await t.test('6. Webhook Endpoint Reachability & Probe Handler (GET /api/webhooks/cashfree)', async () => {
    // 6.1 GET /api/webhooks/cashfree returns 200 ONLINE
    const getRes = await request('/api/webhooks/cashfree');
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.body.status, 'ONLINE');
    assert.strictEqual(getRes.body.endpoint, '/api/webhooks/cashfree');
    assert.strictEqual(getRes.body.provider, 'Cashfree Payments');
    assert.strictEqual(getRes.body.apiVersion, '2026-01-01');
    assert.strictEqual(getRes.body.protocol, 'HTTP POST');
    assert(Array.isArray(getRes.body.supportedEvents));

    // 6.2 GET /api/cashfree/webhook alias returns 200 ONLINE
    const aliasRes = await request('/api/cashfree/webhook');
    assert.strictEqual(aliasRes.status, 200);
    assert.strictEqual(aliasRes.body.status, 'ONLINE');

    // 6.3 HEAD /api/webhooks/cashfree returns 200
    const headRes = await request('/api/webhooks/cashfree', { method: 'HEAD' });
    assert.strictEqual(headRes.status, 200);

    // 6.4 POST /api/webhooks/cashfree without signatures still rejects with HTTP 400
    const postNoSig = await request('/api/webhooks/cashfree', {
      method: 'POST',
      body: { type: 'TEST_EVENT' }
    });
    assert.strictEqual(postNoSig.status, 400);
    assert.strictEqual(postNoSig.body.error, 'MISSING_SIGNATURE_HEADERS');
  });

});
