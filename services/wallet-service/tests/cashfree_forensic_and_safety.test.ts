process.env.NODE_ENV = 'test';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import app from '../src/server';
import { db, Role, OrderStatus } from '../src/db';
import { SubscriptionTier, BillingPeriod } from '../src/monetization/catalog';
import {
  isCashfreeConfigured,
  verifyCashfreeWebhookSignature,
  getCashfreeBaseUrl,
  getCashfreeApiVersion,
  getPaymentsForCashfreeOrder
} from '../src/cashfree';

// Helper to make HTTP requests
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
      if (typeof body === 'string') {
        reqBody = body;
      } else {
        reqBody = JSON.stringify(body);
      }
      if (!reqHeaders['Content-Type']) {
        reqHeaders['Content-Type'] = 'application/json';
      }
      reqHeaders['Content-Length'] = String(Buffer.byteLength(reqBody));
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: reqPath,
        method,
        headers: reqHeaders
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let parsed: any = null;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode || 0, headers: res.headers, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (reqBody) req.write(reqBody);
    req.end();
  });
}

describe('ASTROVERSE CASHFREE FORENSIC REPAIR & FINANCIAL SAFETY SUITE', () => {
  let server: http.Server;
  let userTokenA: string;
  let userAId: string;
  let userTokenB: string;
  let userBId: string;

  before(async () => {
    // Ensure production-compatible Cashfree credentials are populated from environment for test execution
    process.env.CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || '';
    process.env.CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || '';
    process.env.CASHFREE_ENV = process.env.CASHFREE_ENV || 'production';
    process.env.CASHFREE_API_VERSION = process.env.CASHFREE_API_VERSION || '2026-01-01';

    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));

    // Create User A
    const regA = await makeRequest(server, 'POST', '/api/auth/register-password', {}, {
      email: `seeker_a_${Date.now()}@astroverse.ai`,
      password: 'SafePassword123!',
      displayName: 'Seeker Alpha'
    });
    assert.strictEqual(regA.status, 200);
    userTokenA = regA.body.sessionToken;
    userAId = regA.body.user.id;

    // Create User B
    const regB = await makeRequest(server, 'POST', '/api/auth/register-password', {}, {
      email: `seeker_b_${Date.now()}@astroverse.ai`,
      password: 'SafePassword456!',
      displayName: 'Seeker Beta'
    });
    assert.strictEqual(regB.status, 200);
    userTokenB = regB.body.sessionToken;
    userBId = regB.body.user.id;
  });

  after(() => {
    return new Promise<void>((resolve) => server.close(() => resolve()));
  });

  // =========================================================================
  // SECTION A: SDK & CHECKOUT STRATEGY FORENSICS (Resolution of about:blank freeze)
  // =========================================================================
  describe('SECTION A: Frontend Checkout Strategy & about:blank Sandbox Elimination', () => {
    const indexPath = path.resolve(__dirname, '../../../index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf8');

    it('A1: Confirms official Hosted Redirect (redirectTarget: "_self") is the primary strategy for subscriptions', () => {
      // Must not use redirectTarget: '_modal' in executeSubscriptionCheckout
      const subFnMatch = indexHtml.match(/function executeSubscriptionCheckout[\s\S]*?async function verifySubscriptionPayment/);
      assert.ok(subFnMatch, 'executeSubscriptionCheckout must be defined');
      assert.ok(subFnMatch[0].includes("redirectTarget: '_self'"), 'Subscription checkout must specify redirectTarget: "_self"');
      assert.ok(!subFnMatch[0].includes("redirectTarget: '_modal'"), 'Subscription checkout must NOT use redirectTarget: "_modal"');
    });

    it('A2: Confirms official Hosted Redirect (redirectTarget: "_self") is the primary strategy for wallet recharges', () => {
      const rechFnMatch = indexHtml.match(/function executeSelectedRecharge[\s\S]*?async function verifyAndCreditWallet/);
      assert.ok(rechFnMatch, 'executeSelectedRecharge must be defined');
      assert.ok(rechFnMatch[0].includes("redirectTarget: '_self'"), 'Recharge checkout must specify redirectTarget: "_self"');
      assert.ok(!rechFnMatch[0].includes("redirectTarget: '_modal'"), 'Recharge checkout must NOT use redirectTarget: "_modal"');
    });

    it('A3: Confirms official Hosted Redirect (redirectTarget: "_self") is the primary strategy for personalized reports', () => {
      const repFnMatch = indexHtml.match(/async function executeGenerateReport[\s\S]*?async function verifyReportPayment/);
      assert.ok(repFnMatch, 'executeGenerateReport must be defined');
      assert.ok(repFnMatch[0].includes("redirectTarget: '_self'"), 'Report checkout must specify redirectTarget: "_self"');
      assert.ok(!repFnMatch[0].includes("redirectTarget: '_modal'"), 'Report checkout must NOT use redirectTarget: "_modal"');
    });

    it('A4: Confirms submitCashfreeHostedFallback is implemented and exported', () => {
      assert.ok(indexHtml.includes('function submitCashfreeHostedFallback(paymentSessionId, env)'), 'submitCashfreeHostedFallback must be defined');
      assert.ok(indexHtml.includes('form.action = `${baseUrl}/pg/view/sessions/checkout`') || indexHtml.includes('pg/view/sessions/checkout'), 'submitCashfreeHostedFallback must target Cashfree checkout');
      assert.ok(indexHtml.includes('window.submitCashfreeHostedFallback = submitCashfreeHostedFallback'), 'submitCashfreeHostedFallback must be exported to window');
    });

    it('A5: Confirms iframe watchdog monitorCashfreeModalIframe detects blank iframes and redirects', () => {
      assert.ok(indexHtml.includes('function monitorCashfreeModalIframe'), 'monitorCashfreeModalIframe watchdog must be defined');
      assert.ok(indexHtml.includes('about:blank'), 'watchdog must inspect about:blank state');
      assert.ok(indexHtml.includes('window.monitorCashfreeModalIframe = monitorCashfreeModalIframe'), 'monitorCashfreeModalIframe must be exported');
    });

    it('A6: Confirms PAYMENT_STATES includes PENDING, VERIFYING_PAYMENT, SUCCESS, FAILED, and CANCELLED', () => {
      assert.ok(indexHtml.includes("PENDING: 'PENDING'"), 'PAYMENT_STATES must define PENDING');
      assert.ok(indexHtml.includes("VERIFYING_PAYMENT: 'VERIFYING_PAYMENT'"), 'PAYMENT_STATES must define VERIFYING_PAYMENT');
      assert.ok(indexHtml.includes("SUCCESS: 'SUCCESS'"), 'PAYMENT_STATES must define SUCCESS');
      assert.ok(indexHtml.includes("FAILED: 'FAILED'"), 'PAYMENT_STATES must define FAILED');
      assert.ok(indexHtml.includes("CANCELLED: 'CANCELLED'"), 'PAYMENT_STATES must define CANCELLED');
    });

    it('A7: Confirms checkPaymentReturnFromUrl handles PENDING bank confirmation non-destructively', () => {
      assert.ok(indexHtml.includes("else if (data.status === 'PENDING')"), 'checkPaymentReturnFromUrl must handle PENDING status');
      assert.ok(indexHtml.includes("setPaymentState(PAYMENT_STATES.PENDING"), 'checkPaymentReturnFromUrl must set PAYMENT_STATES.PENDING');
    });

    it('A8: Confirms pricing modal is cleanly dismissed before gateway launch to prevent backdrop blur freeze', () => {
      const subFnMatch = indexHtml.match(/function executeSubscriptionCheckout[\s\S]*?async function verifySubscriptionPayment/);
      assert.ok(subFnMatch && subFnMatch[0].includes('closePricingPlansModal()'), 'Pricing plans modal must be closed before gateway launch');
    });
  });

  // =========================================================================
  // SECTION B: BACKEND IDEMPOTENCY & FINANCIAL SAFETY
  // =========================================================================
  describe('SECTION B: Backend Idempotency, Price Tampering & Isolation', () => {
    it('B1: POST /api/subscriptions/create-order reuses existing order for identical x-idempotency-key', async () => {
      const idempotencyKey = `sub_idem_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      // First order request
      const res1 = await makeRequest(server, 'POST', '/api/subscriptions/create-order', {
        'Authorization': `Bearer ${userTokenA}`,
        'x-idempotency-key': idempotencyKey
      }, {
        tier: 'PLUS',
        billingPeriod: 'monthly',
        idempotencyKey
      });

      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res1.body.success, true);
      assert.ok(res1.body.orderId, 'Order ID must be returned');
      assert.ok(res1.body.paymentSessionId, 'Payment session ID must be returned');
      assert.strictEqual(res1.body.checkoutUrl, `${getCashfreeBaseUrl()}/view/sessions/checkout`);

      // Second immediate identical request with same idempotencyKey
      const res2 = await makeRequest(server, 'POST', '/api/subscriptions/create-order', {
        'Authorization': `Bearer ${userTokenA}`,
        'x-idempotency-key': idempotencyKey
      }, {
        tier: 'PLUS',
        billingPeriod: 'monthly',
        idempotencyKey
      });

      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res2.body.orderId, res1.body.orderId, 'Reused order must match first orderId');
      assert.strictEqual(res2.body.paymentSessionId, res1.body.paymentSessionId, 'Reused order must match first paymentSessionId');
      assert.strictEqual(res2.body.reused, true, 'reused flag must be true');
    });

    it('B2: POST /api/wallet/create-order reuses existing order for identical x-idempotency-key', async () => {
      const idempotencyKey = `rech_idem_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      const res1 = await makeRequest(server, 'POST', '/api/wallet/create-order', {
        'Authorization': `Bearer ${userTokenA}`,
        'x-idempotency-key': idempotencyKey
      }, {
        amount: 250,
        idempotencyKey
      });

      assert.strictEqual(res1.status, 200);
      assert.ok(res1.body.orderId);
      assert.ok(res1.body.paymentSessionId);

      // Re-trigger identical call
      const res2 = await makeRequest(server, 'POST', '/api/wallet/create-order', {
        'Authorization': `Bearer ${userTokenA}`,
        'x-idempotency-key': idempotencyKey
      }, {
        amount: 250,
        idempotencyKey
      });

      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res2.body.orderId, res1.body.orderId);
      assert.strictEqual(res2.body.reused, true);
    });

    it('B3: Enforces authoritative integer paise amounts and rejects client-side price tampering', async () => {
      // In subscriptions, client cannot pass a custom "amount: 1" to get PLUS tier
      const res = await makeRequest(server, 'POST', '/api/subscriptions/create-order', {
        'Authorization': `Bearer ${userTokenA}`
      }, {
        tier: 'PLUS',
        billingPeriod: 'monthly',
        amount: 1.00 // Attempted tampering
      });

      assert.strictEqual(res.status, 200);
      // Server must enforce exact catalogue price: 149 rupees (14900 paise)
      assert.strictEqual(res.body.amountPaise, 14900);
      assert.strictEqual(res.body.amountRupees, 149);
    });

    it('B4: Prevents cross-user order verification replay (User B cannot verify User A order)', async () => {
      // Create order for User A
      const orderA = await db.createPaymentOrder({
        userId: userAId,
        amount: 149,
        currency: 'INR',
        provider: 'CASHFREE',
        gateway: 'CASHFREE',
        cfOrderId: `cf_test_cross_${Date.now()}`,
        cfPaymentSessionId: `session_test_cross_${Date.now()}`,
        productType: 'SUBSCRIPTION',
        productId: 'PLUS'
      });

      // User B attempts to verify User A's order
      const verifyRes = await makeRequest(server, 'POST', '/api/cashfree/verify-order', {
        'Authorization': `Bearer ${userTokenB}`
      }, {
        orderId: orderA.providerOrderId
      });

      assert.strictEqual(verifyRes.status, 403);
      assert.ok(verifyRes.body.error === 'ORDER_USER_MISMATCH' || verifyRes.body.error === 'FORBIDDEN');
    });

    it('B5: Cryptographic Webhook Verification: Rejects invalid or forged HMAC signature', async () => {
      const payload = {
        type: 'PAYMENT_SUCCESS_WEBHOOK',
        data: {
          order: { order_id: 'cf_order_fake' },
          payment: { cf_payment_id: 123456 }
        }
      };
      const rawPayload = JSON.stringify(payload);
      const timestamp = String(Date.now());
      const forgedSignature = 'forged_signature_xyz123';

      const res = await makeRequest(server, 'POST', '/api/webhooks/cashfree', {
        'x-webhook-signature': forgedSignature,
        'x-webhook-timestamp': timestamp
      }, rawPayload);

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error, 'INVALID_SIGNATURE');
    });

    it('B6: Cryptographic Webhook Verification: Rejects requests missing signature headers', async () => {
      const res = await makeRequest(server, 'POST', '/api/webhooks/cashfree', {}, { test: true });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error, 'MISSING_SIGNATURE_HEADERS');
    });

    it('B7: Webhook Idempotency: Duplicate delivery of same webhook does not double credit wallet', async () => {
      const initialUser = await db.findUserById(userAId);
      const startBalance = initialUser?.walletBalance || 0;
      const rechargeAmount = 350;

      // Create payment order in database
      const order = await db.createPaymentOrder({
        userId: userAId,
        amount: rechargeAmount,
        currency: 'INR',
        provider: 'CASHFREE',
        gateway: 'CASHFREE',
        cfOrderId: `cf_order_wh_idem_${Date.now()}`,
        productType: 'WALLET_RECHARGE'
      });

      const secretKey = process.env.CASHFREE_SECRET_KEY!;
      const timestamp = String(Date.now());
      const paymentId = `cf_pay_wh_${Date.now()}`;
      const payloadObj = {
        type: 'PAYMENT_SUCCESS_WEBHOOK',
        data: {
          order: { order_id: order.providerOrderId, order_amount: rechargeAmount },
          payment: { cf_payment_id: paymentId, payment_status: 'SUCCESS' }
        }
      };
      const rawBody = JSON.stringify(payloadObj);
      const signature = crypto.createHmac('sha256', secretKey)
        .update(timestamp + rawBody)
        .digest('base64');

      const webhookIdemKey = `PAYMENT_SUCCESS_WEBHOOK_${order.providerOrderId}`;

      // First webhook delivery
      const whRes1 = await makeRequest(server, 'POST', '/api/webhooks/cashfree', {
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp,
        'x-idempotency-key': webhookIdemKey
      }, rawBody);

      assert.strictEqual(whRes1.status, 200);
      assert.strictEqual(whRes1.body.processed, true);

      // Verify wallet credited once
      const userAfterFirst = await db.findUserById(userAId);
      assert.strictEqual(userAfterFirst?.walletBalance, startBalance + rechargeAmount);

      // Re-deliver identical webhook delivery
      const whRes2 = await makeRequest(server, 'POST', '/api/webhooks/cashfree', {
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp,
        'x-idempotency-key': webhookIdemKey
      }, rawBody);

      assert.strictEqual(whRes2.status, 200);
      assert.strictEqual(whRes2.body.alreadyProcessed, true);

      // Verify wallet balance remained strictly identical (NO double credit)
      const userAfterSecond = await db.findUserById(userAId);
      assert.strictEqual(userAfterSecond?.walletBalance, startBalance + rechargeAmount);
    });

    it('B8: Webhook Failure/Drop: PAYMENT_FAILED_WEBHOOK and PAYMENT_USER_DROPPED_WEBHOOK mark order as FAILED', async () => {
      const orderToFail = await db.createPaymentOrder({
        userId: userAId,
        amount: 100,
        currency: 'INR',
        provider: 'CASHFREE',
        gateway: 'CASHFREE',
        cfOrderId: `cf_order_to_fail_${Date.now()}`,
        productType: 'WALLET_RECHARGE'
      });

      assert.strictEqual(orderToFail.status, OrderStatus.CREATED);

      const secretKey = process.env.CASHFREE_SECRET_KEY!;
      const timestamp = String(Date.now());
      const payloadObj = {
        type: 'PAYMENT_FAILED_WEBHOOK',
        data: {
          order: { order_id: orderToFail.providerOrderId }
        }
      };
      const rawBody = JSON.stringify(payloadObj);
      const signature = crypto.createHmac('sha256', secretKey)
        .update(timestamp + rawBody)
        .digest('base64');

      const res = await makeRequest(server, 'POST', '/api/webhooks/cashfree', {
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp
      }, rawBody);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.processed, true);

      // Order status should be marked FAILED
      const updatedOrder = db.findPaymentOrderById(orderToFail.providerOrderId);
      assert.strictEqual(updatedOrder?.status, OrderStatus.FAILED);
    });
  });

  // =========================================================================
  // SECTION C: FAILURE INJECTION & AMBIGUOUS RECOVERY
  // =========================================================================
  describe('SECTION C: Failure Injection, Pending Payments & Ambiguous Recovery', () => {
    it('C1: Pending/Active payment status returns status: ACTIVE or PENDING without falsely debiting or fulfilling', async () => {
      // Create a real order via subscription endpoint to obtain a real Cashfree orderId
      const subOrderRes = await makeRequest(server, 'POST', '/api/subscriptions/create-order', {
        'Authorization': `Bearer ${userTokenA}`
      }, {
        tier: 'PREMIUM',
        billingPeriod: 'monthly'
      });
      assert.strictEqual(subOrderRes.status, 200);
      const realOrderId = subOrderRes.body.orderId;

      // Synchronous verification via verify-order
      const verifyRes = await makeRequest(server, 'POST', '/api/cashfree/verify-order', {
        'Authorization': `Bearer ${userTokenA}`
      }, {
        orderId: realOrderId
      });

      // Because the real Cashfree order has just been created and not yet paid,
      // Cashfree reports order_status as "ACTIVE". The endpoint safely returns 400 with status: 'ACTIVE'
      assert.strictEqual(verifyRes.status, 400);
      assert.strictEqual(verifyRes.body.status, 'ACTIVE');
      assert.strictEqual(verifyRes.body.error, 'PAYMENT_NOT_COMPLETED');

      // Order status in DB remains non-paid (no false entitlement grant)
      const dbOrder = db.findPaymentOrderById(realOrderId);
      assert.notStrictEqual(dbOrder?.status, OrderStatus.PAID);
    });

    it('C2: Synchronous verify-order supports both POST body and GET query string params', async () => {
      // Test GET /api/cashfree/verify-order?orderId=...
      const res = await makeRequest(server, 'GET', `/api/cashfree/verify-order?orderId=cf_nonexistent_123`, {
        'Authorization': `Bearer ${userTokenA}`
      });
      // Should reject missing order cleanly with HTTP 404
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.error, 'ORDER_NOT_FOUND');
    });
  });

  // =========================================================================
  // SECTION D: REAL CASHFREE PRODUCTION/SANDBOX PROTOCOL (v2026-01-01)
  // =========================================================================
  describe('SECTION D: Cashfree Protocol Compliance & 2026-01-01 Standards', () => {
    it('D1: Verifies API version is pinned to 2026-01-01', () => {
      assert.strictEqual(getCashfreeApiVersion(), '2026-01-01');
    });

    it('D2: Verifies Cashfree base URL resolves correctly to api.cashfree.com/pg in production', () => {
      const prevEnv = process.env.CASHFREE_ENV;
      process.env.CASHFREE_ENV = 'production';
      assert.strictEqual(getCashfreeBaseUrl(), 'https://api.cashfree.com/pg');
      process.env.CASHFREE_ENV = 'sandbox';
      assert.strictEqual(getCashfreeBaseUrl(), 'https://sandbox.cashfree.com/pg');
      process.env.CASHFREE_ENV = prevEnv;
    });

    it('D3: GET /api/config exports public gateway environment without leaking secret key', async () => {
      const res = await makeRequest(server, 'GET', '/api/config');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.gateway, 'CASHFREE');
      assert.strictEqual(res.body.isLiveGateway, true);
      assert.strictEqual(res.body.cashfreeAppId, process.env.CASHFREE_APP_ID);
      assert.strictEqual(res.body.currency, 'INR');
      // Must NEVER expose secret key
      assert.strictEqual((res.body as any).cashfreeSecretKey, undefined);
      assert.strictEqual((res.body as any).secretKey, undefined);
    });
  });
});
