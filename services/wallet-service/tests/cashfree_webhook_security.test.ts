import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import crypto from 'crypto';
import app from '../src/server';
import { db, Role, OrderStatus } from '../src/db';
import { SubscriptionTier } from '../src/monetization/catalog';
import {
  verifyCashfreeWebhookSignature,
  generateCashfreeWebhookSignature,
  CANONICAL_CASHFREE_APP_ID
} from '../src/cashfree';

function makeRequest(
  server: http.Server,
  method: string,
  reqPath: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any; raw: string }> {
  return new Promise((resolve, reject) => {
    const port = (server.address() as any).port;
    const reqHeaders: Record<string, string> = { ...headers };
    let reqBody: string | Buffer | undefined;

    if (body !== undefined) {
      if (Buffer.isBuffer(body)) {
        reqBody = body;
        if (!reqHeaders['Content-Type']) {
          reqHeaders['Content-Type'] = 'application/json';
        }
        reqHeaders['Content-Length'] = String(body.length);
      } else if (typeof body === 'string') {
        reqBody = body;
        if (!reqHeaders['Content-Type']) {
          reqHeaders['Content-Type'] = 'application/json';
        }
        reqHeaders['Content-Length'] = String(Buffer.byteLength(reqBody));
      } else {
        reqBody = JSON.stringify(body);
        if (!reqHeaders['Content-Type']) {
          reqHeaders['Content-Type'] = 'application/json';
        }
        reqHeaders['Content-Length'] = String(Buffer.byteLength(reqBody));
      }
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
          resolve({ status: res.statusCode || 500, headers: res.headers, body: parsed, raw });
        });
      }
    );

    req.on('error', reject);
    if (reqBody) {
      req.write(reqBody);
    }
    req.end();
  });
}

describe('PHASE 6 — CASHFREE WEBHOOK SECURITY & INTEGRATION TEST MATRIX', () => {
  let server: http.Server;
  const TEST_SECRET = 'cfsk_ma_test_security_matrix_secret_key_998877';
  let testUserId: string;
  let authToken: string;

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.CASHFREE_SECRET_KEY = TEST_SECRET;
    process.env.CASHFREE_APP_ID = CANONICAL_CASHFREE_APP_ID;

    // Create a verified test user
    const user = await db.createUser({
      email: `webhook_test_${Date.now()}@astroverse.app`,
      passwordHash: 'dummy_hash',
      role: Role.USER
    });
    testUserId = user.id;

    // Start ephemeral server
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  });

  after(async () => {
    delete process.env.CASHFREE_SECRET_KEY;
    delete process.env.CASHFREE_APP_ID;
    delete process.env.CASHFREE_WEBHOOK_SECRET;
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // 1. Browser GET without token
  it('1. Browser GET without token returns HTTP 200 informational reachability response', async () => {
    const res = await makeRequest(server, 'GET', '/api/wallet/webhook');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'REACHABLE');
    assert.strictEqual(res.body.endpoint, 'cashfree_webhook');
    assert.strictEqual(res.body.acceptedMethod, 'POST');
    assert.strictEqual(res.body.authentication, 'CASHFREE_SIGNATURE');
    // Ensure no secrets leaked
    assert.strictEqual(res.raw.includes(TEST_SECRET), false);
    assert.strictEqual(res.raw.includes('secret'), false);
  });

  // 2. HEAD without token
  it('2. HEAD without token returns HTTP 200 without sensitive body', async () => {
    const res = await makeRequest(server, 'HEAD', '/api/wallet/webhook');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.raw, '');
  });

  // 3. Unsupported method
  it('3. Unsupported method (e.g. PUT, DELETE) returns HTTP 405 with Allow header', async () => {
    const putRes = await makeRequest(server, 'PUT', '/api/wallet/webhook', {}, { test: 1 });
    assert.strictEqual(putRes.status, 405);
    assert.strictEqual(putRes.body.error, 'METHOD_NOT_ALLOWED');
    assert.ok(putRes.headers.allow);
    assert.ok(putRes.headers.allow.includes('POST'));
    assert.ok(putRes.headers.allow.includes('GET'));

    const delRes = await makeRequest(server, 'DELETE', '/api/wallet/webhook');
    assert.strictEqual(delRes.status, 405);
    assert.strictEqual(delRes.body.error, 'METHOD_NOT_ALLOWED');
  });

  // 4. OPTIONS request
  it('4. OPTIONS returns HTTP 204 with Allow header', async () => {
    const res = await makeRequest(server, 'OPTIONS', '/api/wallet/webhook');
    assert.ok(res.status === 204 || res.status === 200);
    assert.ok(res.headers.allow);
    assert.ok(res.headers.allow.includes('POST'));
    assert.ok(res.headers.allow.includes('GET'));
  });

  // 5. POST without signature
  it('5. POST without signature header is rejected with HTTP 400', async () => {
    const res = await makeRequest(
      server,
      'POST',
      '/api/wallet/webhook',
      { 'x-webhook-timestamp': String(Date.now()) },
      { type: 'PAYMENT_SUCCESS_WEBHOOK' }
    );
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'MISSING_SIGNATURE_HEADERS');
  });

  // 6. POST without timestamp
  it('6. POST without timestamp header is rejected with HTTP 400', async () => {
    const res = await makeRequest(
      server,
      'POST',
      '/api/wallet/webhook',
      { 'x-webhook-signature': 'dummy_sig' },
      { type: 'PAYMENT_SUCCESS_WEBHOOK' }
    );
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'MISSING_SIGNATURE_HEADERS');
  });

  // 7. POST with invalid signature
  it('7. POST with invalid signature is rejected with HTTP 401', async () => {
    const res = await makeRequest(
      server,
      'POST',
      '/api/wallet/webhook',
      {
        'x-webhook-signature': 'completely_forged_base64_sig==',
        'x-webhook-timestamp': String(Date.now())
      },
      { type: 'PAYMENT_SUCCESS_WEBHOOK' }
    );
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'INVALID_SIGNATURE');
  });

  // 8. POST with modified body
  it('8. POST with modified body is rejected with HTTP 401 (HMAC tamper detection)', async () => {
    const timestamp = String(Date.now());
    const originalPayload = JSON.stringify({
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: { order: { order_id: 'ord_tamper_1', order_amount: 100 } }
    });
    // Signature computed on original payload
    const signature = generateCashfreeWebhookSignature(originalPayload, timestamp, TEST_SECRET);

    // Attacker modifies the payload to 1000
    const tamperedPayload = JSON.stringify({
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: { order: { order_id: 'ord_tamper_1', order_amount: 1000 } }
    });

    const res = await makeRequest(
      server,
      'POST',
      '/api/wallet/webhook',
      {
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp
      },
      tamperedPayload
    );
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'INVALID_SIGNATURE');
  });

  // 9. POST with incorrect secret
  it('9. POST signed with incorrect secret is rejected with HTTP 401', async () => {
    const timestamp = String(Date.now());
    const payload = JSON.stringify({
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: { order: { order_id: 'ord_wrong_sec', order_amount: 100 } }
    });
    const wrongSig = generateCashfreeWebhookSignature(payload, timestamp, 'completely_wrong_secret_key');

    const res = await makeRequest(
      server,
      'POST',
      '/api/wallet/webhook',
      {
        'x-webhook-signature': wrongSig,
        'x-webhook-timestamp': timestamp
      },
      payload
    );
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'INVALID_SIGNATURE');
  });

  // 10. POST with valid signature
  it('10. POST with valid signature is accepted and fulfills order correctly', async () => {
    const rechargeAmount = 250;
    const userBefore = await db.findUserById(testUserId);
    const startBalance = userBefore?.walletBalance || 0;

    const order = await db.createPaymentOrder({
      userId: testUserId,
      amount: rechargeAmount,
      currency: 'INR',
      provider: 'CASHFREE',
      gateway: 'CASHFREE',
      productType: 'WALLET_RECHARGE'
    });

    const timestamp = String(Date.now());
    const paymentId = `cf_pay_val_${Date.now()}`;
    const payload = JSON.stringify({
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: {
        order: { order_id: order.providerOrderId, order_amount: rechargeAmount, order_currency: 'INR' },
        payment: { cf_payment_id: paymentId, payment_status: 'SUCCESS', payment_amount: rechargeAmount }
      }
    });
    const signature = generateCashfreeWebhookSignature(payload, timestamp, TEST_SECRET);

    const res = await makeRequest(
      server,
      'POST',
      '/api/wallet/webhook',
      {
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp
      },
      payload
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.received, true);

    // Verify wallet balance was credited
    const userAfter = await db.findUserById(testUserId);
    assert.strictEqual(userAfter?.walletBalance, startBalance + rechargeAmount);

    // Verify order marked PAID
    const orderAfter = await db.findPaymentOrderByIdAsync(order.providerOrderId!);
    assert.strictEqual(orderAfter?.status, OrderStatus.PAID);
  });

  // 11. POST with malformed JSON
  it('11. POST with malformed JSON body is rejected with HTTP 400', async () => {
    const timestamp = String(Date.now());
    const badJson = '{"type": "PAYMENT_SUCCESS_WEBHOOK", unquoted_broken...';
    const signature = generateCashfreeWebhookSignature(badJson, timestamp, TEST_SECRET);

    const res = await makeRequest(
      server,
      'POST',
      '/api/wallet/webhook',
      {
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp
      },
      badJson
    );
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'MALFORMED_JSON');
  });

  // 12. Oversized payload
  it('12. Oversized payload (>512KB) is rejected with HTTP 413', async () => {
    const timestamp = String(Date.now());
    const hugePadding = 'x'.repeat(550 * 1024); // 550 KB
    const hugePayload = JSON.stringify({ type: 'TEST', padding: hugePadding });
    const signature = generateCashfreeWebhookSignature(hugePayload, timestamp, TEST_SECRET);

    const res = await makeRequest(
      server,
      'POST',
      '/api/wallet/webhook',
      {
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp
      },
      hugePayload
    );
    assert.strictEqual(res.status, 413);
    assert.strictEqual(res.body.error, 'PAYLOAD_TOO_LARGE');
  });

  // 13. Valid repeated event
  it('13. Valid repeated event is acknowledged without duplicate financial fulfilment', async () => {
    const rechargeAmount = 150;
    const userBefore = await db.findUserById(testUserId);
    const startBalance = userBefore?.walletBalance || 0;

    const order = await db.createPaymentOrder({
      userId: testUserId,
      amount: rechargeAmount,
      currency: 'INR',
      provider: 'CASHFREE',
      gateway: 'CASHFREE',
      productType: 'WALLET_RECHARGE'
    });

    const timestamp = String(Date.now());
    const paymentId = `cf_pay_dup_${Date.now()}`;
    const payload = JSON.stringify({
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: {
        order: { order_id: order.providerOrderId, order_amount: rechargeAmount, order_currency: 'INR' },
        payment: { cf_payment_id: paymentId, payment_status: 'SUCCESS', payment_amount: rechargeAmount }
      }
    });
    const signature = generateCashfreeWebhookSignature(payload, timestamp, TEST_SECRET);
    const idempotencyKey = `wh_dup_test_${order.providerOrderId}`;

    // Delivery 1
    const res1 = await makeRequest(
      server,
      'POST',
      '/api/wallet/webhook',
      {
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp,
        'x-idempotency-key': idempotencyKey
      },
      payload
    );
    assert.strictEqual(res1.status, 200);

    const userMid = await db.findUserById(testUserId);
    assert.strictEqual(userMid?.walletBalance, startBalance + rechargeAmount);

    // Delivery 2 (Duplicate replay)
    const res2 = await makeRequest(
      server,
      'POST',
      '/api/wallet/webhook',
      {
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp,
        'x-idempotency-key': idempotencyKey
      },
      payload
    );
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.body.alreadyProcessed, true);

    // Balance must remain strictly unchanged
    const userFinal = await db.findUserById(testUserId);
    assert.strictEqual(userFinal?.walletBalance, startBalance + rechargeAmount);
  });

  // 14. Concurrent duplicate events
  it('14. Concurrent duplicate events result in exactly one financial fulfilment', async () => {
    const rechargeAmount = 300;
    const userBefore = await db.findUserById(testUserId);
    const startBalance = userBefore?.walletBalance || 0;

    const order = await db.createPaymentOrder({
      userId: testUserId,
      amount: rechargeAmount,
      currency: 'INR',
      provider: 'CASHFREE',
      gateway: 'CASHFREE',
      productType: 'WALLET_RECHARGE'
    });

    const timestamp = String(Date.now());
    const paymentId = `cf_pay_conc_${Date.now()}`;
    const payload = JSON.stringify({
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: {
        order: { order_id: order.providerOrderId, order_amount: rechargeAmount, order_currency: 'INR' },
        payment: { cf_payment_id: paymentId, payment_status: 'SUCCESS', payment_amount: rechargeAmount }
      }
    });
    const signature = generateCashfreeWebhookSignature(payload, timestamp, TEST_SECRET);
    const idempotencyKey = `wh_conc_test_${order.providerOrderId}`;

    // Dispatch 3 concurrent requests simultaneously
    const [resA, resB, resC] = await Promise.all([
      makeRequest(
        server,
        'POST',
        '/api/wallet/webhook',
        { 'x-webhook-signature': signature, 'x-webhook-timestamp': timestamp, 'x-idempotency-key': idempotencyKey },
        payload
      ),
      makeRequest(
        server,
        'POST',
        '/api/wallet/webhook',
        { 'x-webhook-signature': signature, 'x-webhook-timestamp': timestamp, 'x-idempotency-key': idempotencyKey },
        payload
      ),
      makeRequest(
        server,
        'POST',
        '/api/wallet/webhook',
        { 'x-webhook-signature': signature, 'x-webhook-timestamp': timestamp, 'x-idempotency-key': idempotencyKey },
        payload
      )
    ]);

    // All must receive HTTP 200 (either fulfilled or alreadyProcessed)
    assert.strictEqual(resA.status, 200);
    assert.strictEqual(resB.status, 200);
    assert.strictEqual(resC.status, 200);

    // Verify balance was credited EXACTLY once
    const userFinal = await db.findUserById(testUserId);
    assert.strictEqual(userFinal?.walletBalance, startBalance + rechargeAmount);
  });

  // 15. Wrong order identifier
  it('15. Wrong order identifier results in no fulfilment and HTTP 404', async () => {
    const timestamp = String(Date.now());
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const payload = JSON.stringify({
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: {
        order: { order_id: `cf_order_nonexistent_${Date.now()}_${randomSuffix}`, order_amount: 100, order_currency: 'INR' },
        payment: { cf_payment_id: `cf_pay_nonexistent_${Date.now()}_${randomSuffix}`, payment_status: 'SUCCESS', payment_amount: 100 }
      }
    });
    const signature = generateCashfreeWebhookSignature(payload, timestamp, TEST_SECRET);

    const res = await makeRequest(
      server,
      'POST',
      '/api/wallet/webhook',
      {
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp
      },
      payload
    );
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.error, 'ORDER_NOT_FOUND');
  });

  // 16. Wrong payment identifier
  it('16. Missing or invalid payment identifier results in no fulfilment and HTTP 400', async () => {
    const order = await db.createPaymentOrder({
      userId: testUserId,
      amount: 100,
      currency: 'INR',
      provider: 'CASHFREE',
      gateway: 'CASHFREE',
      productType: 'WALLET_RECHARGE'
    });

    const timestamp = String(Date.now());
    const payload = JSON.stringify({
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: {
        order: { order_id: order.providerOrderId, order_amount: 100, order_currency: 'INR' },
        payment: { payment_status: 'SUCCESS', payment_amount: 100 } // cf_payment_id omitted!
      }
    });
    const signature = generateCashfreeWebhookSignature(payload, timestamp, TEST_SECRET);

    const res = await makeRequest(
      server,
      'POST',
      '/api/wallet/webhook',
      {
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp
      },
      payload
    );
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'MISSING_PAYMENT_ID');
  });

  // 17. Amount mismatch
  it('17. Amount mismatch between webhook and server order is rejected with HTTP 400', async () => {
    const order = await db.createPaymentOrder({
      userId: testUserId,
      amount: 500, // Server expects 500
      currency: 'INR',
      provider: 'CASHFREE',
      gateway: 'CASHFREE',
      productType: 'WALLET_RECHARGE'
    });

    const timestamp = String(Date.now());
    // Webhook reports paid only 50
    const payload = JSON.stringify({
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: {
        order: { order_id: order.providerOrderId, order_amount: 50, order_currency: 'INR' },
        payment: { cf_payment_id: 'cf_pay_mismatch', payment_status: 'SUCCESS', payment_amount: 50 }
      }
    });
    const signature = generateCashfreeWebhookSignature(payload, timestamp, TEST_SECRET);

    const res = await makeRequest(
      server,
      'POST',
      '/api/wallet/webhook',
      {
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp
      },
      payload
    );
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'AMOUNT_MISMATCH');
  });

  // 18. Currency mismatch
  it('18. Currency mismatch is rejected with HTTP 400', async () => {
    const order = await db.createPaymentOrder({
      userId: testUserId,
      amount: 200,
      currency: 'INR',
      provider: 'CASHFREE',
      gateway: 'CASHFREE',
      productType: 'WALLET_RECHARGE'
    });

    const timestamp = String(Date.now());
    const payload = JSON.stringify({
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: {
        order: { order_id: order.providerOrderId, order_amount: 200, order_currency: 'USD' },
        payment: { cf_payment_id: 'cf_pay_curr_mis', payment_status: 'SUCCESS', payment_amount: 200, payment_currency: 'USD' }
      }
    });
    const signature = generateCashfreeWebhookSignature(payload, timestamp, TEST_SECRET);

    const res = await makeRequest(
      server,
      'POST',
      '/api/wallet/webhook',
      {
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp
      },
      payload
    );
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'CURRENCY_MISMATCH');
  });

  // 19. Failed payment status
  it('19. Failed payment status (PAYMENT_FAILED_WEBHOOK) marks order failed and performs no credit', async () => {
    const userBefore = await db.findUserById(testUserId);
    const startBalance = userBefore?.walletBalance || 0;

    const order = await db.createPaymentOrder({
      userId: testUserId,
      amount: 100,
      currency: 'INR',
      provider: 'CASHFREE',
      gateway: 'CASHFREE',
      productType: 'WALLET_RECHARGE'
    });

    const timestamp = String(Date.now());
    const payload = JSON.stringify({
      type: 'PAYMENT_FAILED_WEBHOOK',
      data: {
        order: { order_id: order.providerOrderId, order_amount: 100, order_currency: 'INR' },
        payment: { cf_payment_id: 'cf_pay_failed_1', payment_status: 'FAILED', payment_message: 'Bank declined' }
      }
    });
    const signature = generateCashfreeWebhookSignature(payload, timestamp, TEST_SECRET);

    const res = await makeRequest(
      server,
      'POST',
      '/api/wallet/webhook',
      {
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp
      },
      payload
    );
    assert.strictEqual(res.status, 200);

    // Balance must not change
    const userAfter = await db.findUserById(testUserId);
    assert.strictEqual(userAfter?.walletBalance, startBalance);

    // Order status must be FAILED
    const orderAfter = await db.findPaymentOrderByIdAsync(order.providerOrderId!);
    assert.strictEqual(orderAfter?.status, OrderStatus.FAILED);
  });

  // 20. Database transaction failure leaves event recoverable
  it('20. Database transaction failure returns HTTP 500 and leaves event retryable', async () => {
    const order = await db.createPaymentOrder({
      userId: testUserId,
      amount: 100,
      currency: 'INR',
      provider: 'CASHFREE',
      gateway: 'CASHFREE',
      productType: 'WALLET_RECHARGE'
    });

    const timestamp = String(Date.now());
    const errPayId = `cf_pay_err_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const payload = JSON.stringify({
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      data: {
        order: { order_id: order.providerOrderId, order_amount: 100, order_currency: 'INR' },
        payment: { cf_payment_id: errPayId, payment_status: 'SUCCESS', payment_amount: 100 }
      }
    });
    const signature = generateCashfreeWebhookSignature(payload, timestamp, TEST_SECRET);
    const idempotencyKey = `wh_tx_fail_${order.providerOrderId}`;

    // Temporarily mock db.rechargeWallet to simulate transient DB outage
    const origRecharge = db.rechargeWallet.bind(db);
    (db as any).rechargeWallet = async () => {
      throw new Error('SIMULATED_TRANSIENT_POSTGRES_DEADLOCK');
    };

    try {
      const res = await makeRequest(
        server,
        'POST',
        '/api/wallet/webhook',
        {
          'x-webhook-signature': signature,
          'x-webhook-timestamp': timestamp,
          'x-idempotency-key': idempotencyKey
        },
        payload
      );
      assert.strictEqual(res.status, 500);
      assert.strictEqual(res.body.error, 'TRANSACTION_FAILURE');

      // Restore normal DB functionality
      (db as any).rechargeWallet = origRecharge;

      // Retry should now succeed when database is recovered
      const retryRes = await makeRequest(
        server,
        'POST',
        '/api/wallet/webhook',
        {
          'x-webhook-signature': signature,
          'x-webhook-timestamp': timestamp,
          'x-idempotency-key': idempotencyKey
        },
        payload
      );
      assert.strictEqual(retryRes.status, 200);
      assert.strictEqual(retryRes.body.status, 'ok');
    } finally {
      (db as any).rechargeWallet = origRecharge;
    }
  });

  // 21. Unauthorized unrelated API GET
  it('21. Unauthorized unrelated API GET (/api/admin/users) is still denied with 401', async () => {
    const res = await makeRequest(server, 'GET', '/api/admin/users');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'UNAUTHORIZED');
  });

  // 22. Unauthorized unrelated API POST
  it('22. Unauthorized unrelated API POST (/api/wallet/create-order) is still denied with 401', async () => {
    const res = await makeRequest(server, 'POST', '/api/wallet/create-order', {}, { amount: 100 });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'UNAUTHORIZED');
  });

  // 23. Webhook secret missing -> Fail closed
  it('23. Webhook secret missing fails closed with HTTP 401', async () => {
    const origSecret = process.env.CASHFREE_SECRET_KEY;
    const origWhSecret = process.env.CASHFREE_WEBHOOK_SECRET;
    process.env.CASHFREE_SECRET_KEY = 'FORCE_EMPTY';
    delete process.env.CASHFREE_WEBHOOK_SECRET;

    try {
      const timestamp = String(Date.now());
      const payload = JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK' });
      const signature = 'any_signature';

      const res = await makeRequest(
        server,
        'POST',
        '/api/wallet/webhook',
        {
          'x-webhook-signature': signature,
          'x-webhook-timestamp': timestamp
        },
        payload
      );
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error, 'INVALID_SIGNATURE');
    } finally {
      process.env.CASHFREE_SECRET_KEY = origSecret;
      if (origWhSecret) process.env.CASHFREE_WEBHOOK_SECRET = origWhSecret;
    }
  });

  // 24. Cashfree Sandbox event integration behavior
  it('24. Cashfree Sandbox payload structure is parsed and fulfilled identically', async () => {
    const order = await db.createPaymentOrder({
      userId: testUserId,
      amount: 499,
      currency: 'INR',
      provider: 'CASHFREE',
      gateway: 'CASHFREE',
      productType: 'SUBSCRIPTION',
      productId: SubscriptionTier.PLUS,
      billingPeriod: 'MONTHLY'
    });

    const timestamp = String(Date.now());
    const cfPaymentId = `cf_sandbox_pay_${Date.now()}`;
    const sandboxPayload = JSON.stringify({
      data: {
        order: {
          order_id: order.providerOrderId,
          order_amount: 499.00,
          order_currency: 'INR',
          order_tags: { type: 'subscription', tier: 'PLUS' }
        },
        payment: {
          cf_payment_id: cfPaymentId,
          payment_status: 'SUCCESS',
          payment_amount: 499.00,
          payment_currency: 'INR',
          payment_message: 'Transaction successful',
          payment_time: new Date().toISOString(),
          payment_method: { upi: { channel: 'collect', upi_id: 'test@okaxis' } }
        },
        customer_details: {
          customer_id: testUserId,
          customer_name: 'Sandbox Cosmic Explorer',
          customer_email: 'explorer@astroverse.app',
          customer_phone: '9999999999'
        }
      },
      event_time: new Date().toISOString(),
      type: 'PAYMENT_SUCCESS_WEBHOOK'
    });

    const signature = generateCashfreeWebhookSignature(sandboxPayload, timestamp, TEST_SECRET);

    const res = await makeRequest(
      server,
      'POST',
      '/api/wallet/webhook',
      {
        'x-webhook-signature': signature,
        'x-webhook-timestamp': timestamp
      },
      sandboxPayload
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');

    // Confirm order fulfilled
    const orderAfter = await db.findPaymentOrderByIdAsync(order.providerOrderId!);
    assert.strictEqual(orderAfter?.status, OrderStatus.PAID);
  });
});
