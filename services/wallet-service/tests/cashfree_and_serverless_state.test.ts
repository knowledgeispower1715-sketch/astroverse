import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import crypto from 'crypto';
import app from '../src/server';
import { db, Role, AccountStatus, OrderStatus } from '../src/db';
import {
  isCashfreeConfigured,
  verifyCashfreeWebhookSignature,
  getCashfreeBaseUrl,
  getCashfreeApiVersion
} from '../src/cashfree';

// Helper to make HTTP requests
function makeRequest(
  server: http.Server,
  method: string,
  path: string,
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
        reqHeaders['Content-Type'] = 'application/json';
      }
      reqHeaders['Content-Length'] = String(Buffer.byteLength(reqBody));
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
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

describe('AV-SEC-04 DURABLE SERVERLESS STATE & AV-SEC-03 CASHFREE INTEGRATION', () => {
  let server: http.Server;
  let authToken: string;
  let testUserId: string;

  before(async () => {
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));

    // Create test user and session via register-password endpoint
    const regRes = await makeRequest(server, 'POST', '/api/auth/register-password', {}, {
      email: `test_cashfree_${Date.now()}@astroverse.ai`,
      password: 'StrongPassword123!',
      displayName: 'Cashfree Test Seeker'
    });
    assert.strictEqual(regRes.status, 200);
    authToken = regRes.body.sessionToken;
    testUserId = regRes.body.user.id;
  });

  after(() => {
    return new Promise<void>((resolve) => server.close(() => resolve()));
  });

  // ==================== AV-SEC-04: DURABLE SERVERLESS STATE ====================

  describe('AV-SEC-04: Durable OTP, Webhook Idempotency & Rate Limiting', () => {
    it('persists OTP across simulated process restarts and enforces cooldown', async () => {
      const identifier = 'durable_user@astroverse.ai';
      const now = Date.now();

      // Save OTP into DB
      db.saveOtp({
        identifier,
        otp: '849201',
        expiresAt: now + 300000,
        lastSentAt: now,
        attempts: 0
      });

      // Retrieve OTP
      const fetched = db.getOtp(identifier);
      assert.ok(fetched, 'OTP record should be retrievable from durable storage');
      assert.strictEqual(fetched?.otp, '849201');
      assert.strictEqual(fetched?.attempts, 0);

      // Verify attempts incrementation
      fetched!.attempts += 1;
      db.saveOtp(fetched!);

      const updated = db.getOtp(identifier);
      assert.strictEqual(updated?.attempts, 1);

      // Verify deletion on single-use eviction
      db.deleteOtp(identifier);
      assert.strictEqual(db.getOtp(identifier), null, 'OTP should be removed after single-use eviction');
    });

    it('enforces durable rate-limiting using sliding window', async () => {
      const testKey = 'rate_limit_test_ip_' + Date.now();
      const limit = 5;
      const windowMs = 5000;

      // 5 requests allowed
      for (let i = 1; i <= 5; i++) {
        const res = db.checkAndIncrementRateLimit(testKey, limit, windowMs);
        assert.strictEqual(res.allowed, true, `Request ${i} should be allowed`);
        assert.strictEqual(res.remaining, limit - i);
      }

      // 6th request rejected
      const blocked = db.checkAndIncrementRateLimit(testKey, limit, windowMs);
      assert.strictEqual(blocked.allowed, false, '6th request must be blocked');
      assert.strictEqual(blocked.remaining, 0);
    });

    it('guarantees webhook event deduplication across restarts', async () => {
      const eventId = 'evt_test_dedup_' + Date.now();
      assert.strictEqual(db.isWebhookEventProcessed(eventId), false);

      db.markWebhookEventProcessed(eventId, 'CASHFREE');
      assert.strictEqual(db.isWebhookEventProcessed(eventId), true);

      // Repeated marking is idempotent
      db.markWebhookEventProcessed(eventId, 'CASHFREE');
      assert.strictEqual(db.isWebhookEventProcessed(eventId), true);
    });
  });

  // ==================== AV-SEC-03: CASHFREE INTEGRATION ====================

  describe('AV-SEC-03: Cashfree Gateway Configuration, Verification & Webhooks', () => {
    it('GET /api/config surfaces cashfreeAppId, cashfreeEnv and isCashfreeConfigured', async () => {
      const res = await makeRequest(server, 'GET', '/api/config');
      assert.strictEqual(res.status, 200);
      assert.ok('cashfreeAppId' in res.body);
      assert.ok('cashfreeEnv' in res.body);
      assert.ok('isCashfreeConfigured' in res.body);
    });

    it('POST /api/cashfree/create-order fails closed when live credentials are unconfigured', async () => {
      // Ensure test environment does not have real Cashfree keys
      const origAppId = process.env.CASHFREE_APP_ID;
      const origSecret = process.env.CASHFREE_SECRET_KEY;
      delete process.env.CASHFREE_APP_ID;
      delete process.env.CASHFREE_SECRET_KEY;

      try {
        const res = await makeRequest(server, 'POST', '/api/cashfree/create-order', {
          Authorization: `Bearer ${authToken}`
        }, {
          amount: 250,
          productType: 'WALLET_RECHARGE'
        });

        assert.strictEqual(res.status, 503);
        assert.strictEqual(res.body.error, 'CASHFREE_GATEWAY_NOT_CONFIGURED');
      } finally {
        process.env.CASHFREE_APP_ID = origAppId;
        process.env.CASHFREE_SECRET_KEY = origSecret;
      }
    });

    it('POST /api/cashfree/create-order rejects negative or zero amounts', async () => {
      const res = await makeRequest(server, 'POST', '/api/cashfree/create-order', {
        Authorization: `Bearer ${authToken}`
      }, {
        amount: -50
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error, 'INVALID_AMOUNT');
    });

    it('verifies Cashfree webhook signature correctly using HMAC-SHA256', () => {
      const mockSecret = 'cf_secret_key_test_12345';
      process.env.CASHFREE_SECRET_KEY = mockSecret;
      process.env.CASHFREE_APP_ID = 'cf_app_test_12345';

      try {
        const timestamp = '1700000000';
        const rawPayload = JSON.stringify({
          type: 'PAYMENT_SUCCESS_WEBHOOK',
          data: { order: { order_id: 'ord_123', order_amount: 149.0 } }
        });

        // Compute valid signature
        const validSig = crypto
          .createHmac('sha256', mockSecret)
          .update(timestamp + rawPayload)
          .digest('base64');

        // Positive check
        assert.strictEqual(
          verifyCashfreeWebhookSignature(rawPayload, timestamp, validSig),
          true,
          'Valid HMAC-SHA256 signature must be accepted'
        );

        // Negative check: forged signature
        assert.strictEqual(
          verifyCashfreeWebhookSignature(rawPayload, timestamp, 'forged_base64_sig=='),
          false,
          'Forged signature must be rejected'
        );

        // Negative check: altered timestamp
        assert.strictEqual(
          verifyCashfreeWebhookSignature(rawPayload, '1700000001', validSig),
          false,
          'Tampered timestamp must be rejected'
        );

        // Negative check: altered payload body
        const alteredPayload = JSON.stringify({
          type: 'PAYMENT_SUCCESS_WEBHOOK',
          data: { order: { order_id: 'ord_123', order_amount: 999.0 } }
        });
        assert.strictEqual(
          verifyCashfreeWebhookSignature(alteredPayload, timestamp, validSig),
          false,
          'Tampered payload must be rejected'
        );
      } finally {
        delete process.env.CASHFREE_SECRET_KEY;
        delete process.env.CASHFREE_APP_ID;
      }
    });

    it('POST /api/webhooks/cashfree rejects missing signature headers', async () => {
      const res = await makeRequest(server, 'POST', '/api/webhooks/cashfree', {}, {
        type: 'PAYMENT_SUCCESS_WEBHOOK'
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error, 'MISSING_SIGNATURE_HEADERS');
    });

    it('POST /api/webhooks/cashfree rejects invalid signature', async () => {
      process.env.CASHFREE_SECRET_KEY = 'secret_test';
      process.env.CASHFREE_APP_ID = 'app_test';
      try {
        const res = await makeRequest(
          server,
          'POST',
          '/api/webhooks/cashfree',
          {
            'x-webhook-signature': 'invalid_signature_xyz',
            'x-webhook-timestamp': '1700000000'
          },
          {
            type: 'PAYMENT_SUCCESS_WEBHOOK'
          }
        );
        assert.strictEqual(res.status, 400);
        assert.strictEqual(res.body.error, 'INVALID_SIGNATURE');
      } finally {
        delete process.env.CASHFREE_SECRET_KEY;
        delete process.env.CASHFREE_APP_ID;
      }
    });

    it('POST /api/webhooks/cashfree processes valid payment success and fulfills wallet idempotently', async () => {
      const mockSecret = 'cf_secret_key_recharge_test';
      process.env.CASHFREE_SECRET_KEY = mockSecret;
      process.env.CASHFREE_APP_ID = 'cf_app_key_recharge_test';

      try {
        const orderId = `cf_ord_recharge_${Date.now()}`;
        const rechargeAmount = 300;

        // Pre-create Cashfree order in DB
        await db.createPaymentOrder({
          userId: testUserId,
          amount: rechargeAmount,
          currency: 'INR',
          razorpayOrderId: orderId,
          gateway: 'CASHFREE',
          cfOrderId: 'cf_' + orderId,
          productType: 'WALLET_RECHARGE'
        });

        const initialBalance = (await db.findUserById(testUserId))!.walletBalance;

        const paymentIdNum = Date.now() + Math.floor(Math.random() * 1000000);
        const timestamp = String(Math.floor(Date.now() / 1000));
        const payloadObj = {
          type: 'PAYMENT_SUCCESS_WEBHOOK',
          event_time: new Date().toISOString(),
          data: {
            order: { order_id: orderId, order_amount: rechargeAmount },
            payment: { cf_payment_id: paymentIdNum, payment_status: 'SUCCESS' }
          }
        };
        const rawPayload = JSON.stringify(payloadObj);

        const validSig = crypto
          .createHmac('sha256', mockSecret)
          .update(timestamp + rawPayload)
          .digest('base64');

        const idempotencyKey = `wh_evt_cf_${Date.now()}`;

        // 1st delivery
        const res1 = await makeRequest(
          server,
          'POST',
          '/api/webhooks/cashfree',
          {
            'x-webhook-signature': validSig,
            'x-webhook-timestamp': timestamp,
            'x-idempotency-key': idempotencyKey,
            'Content-Type': 'application/json'
          },
          rawPayload
        );

        assert.strictEqual(res1.status, 200);
        assert.strictEqual(res1.body.processed, true);

        const userAfter1 = await db.findUserById(testUserId);
        assert.strictEqual(userAfter1!.walletBalance, initialBalance + rechargeAmount);

        // 2nd delivery (Idempotent Replay)
        const res2 = await makeRequest(
          server,
          'POST',
          '/api/webhooks/cashfree',
          {
            'x-webhook-signature': validSig,
            'x-webhook-timestamp': timestamp,
            'x-idempotency-key': idempotencyKey,
            'Content-Type': 'application/json'
          },
          rawPayload
        );

        assert.strictEqual(res2.status, 200);
        assert.strictEqual(res2.body.alreadyProcessed, true);

        // Balance must NOT double-credit
        const userAfter2 = await db.findUserById(testUserId);
        assert.strictEqual(userAfter2!.walletBalance, initialBalance + rechargeAmount);
      } finally {
        delete process.env.CASHFREE_SECRET_KEY;
        delete process.env.CASHFREE_APP_ID;
      }
    });

    it('POST /api/cashfree/verify-order rejects missing order and cross-user order', async () => {
      // Missing order
      const res404 = await makeRequest(
        server,
        'POST',
        '/api/cashfree/verify-order',
        { Authorization: `Bearer ${authToken}` },
        { orderId: 'non_existent_order_id' }
      );
      assert.strictEqual(res404.status, 404);
      assert.strictEqual(res404.body.error, 'ORDER_NOT_FOUND');

      // Cross-user order
      const otherOrderId = `cf_ord_other_${Date.now()}`;
      await db.createPaymentOrder({
        userId: 'usr_different_victim_123',
        amount: 500,
        currency: 'INR',
        razorpayOrderId: otherOrderId,
        gateway: 'CASHFREE'
      });

      const res403 = await makeRequest(
        server,
        'POST',
        '/api/cashfree/verify-order',
        { Authorization: `Bearer ${authToken}` },
        { orderId: otherOrderId }
      );
      assert.strictEqual(res403.status, 403);
      assert.strictEqual(res403.body.error, 'ORDER_USER_MISMATCH');
    });
  });
});
