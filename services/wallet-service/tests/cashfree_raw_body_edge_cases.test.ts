import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app from '../src/server';
import { db, Role } from '../src/db';
import {
  generateCashfreeWebhookSignature,
  CANONICAL_CASHFREE_APP_ID
} from '../src/cashfree';

function makeRawRequest(
  server: http.Server,
  path: string,
  headers: Record<string, string>,
  rawBuffer: Buffer
): Promise<{ status: number; body: any; raw: string }> {
  return new Promise((resolve, reject) => {
    const port = (server.address() as any).port;
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'Content-Length': String(rawBuffer.length),
      ...headers
    };

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method: 'POST',
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
          resolve({ status: res.statusCode || 500, body: parsed, raw });
        });
      }
    );

    req.on('error', reject);
    req.write(rawBuffer);
    req.end();
  });
}

describe('CASHFREE WEBHOOK RAW BODY & HMAC EDGE CASES EMPIRICAL HARNESS', () => {
  let server: http.Server;
  const TEST_SECRET = 'cfsk_ma_test_raw_body_secret_key_123456';
  let testUserId: string;

  before(async () => {
    process.env.NODE_ENV = 'test';
    process.env.CASHFREE_SECRET_KEY = TEST_SECRET;
    process.env.CASHFREE_APP_ID = CANONICAL_CASHFREE_APP_ID;

    const user = await db.createUser({
      email: `raw_body_test_${Date.now()}@astroverse.app`,
      passwordHash: 'dummy_hash',
      role: Role.USER
    });
    testUserId = user.id;

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

  it('EC-1: Pretty-printed JSON with irregular whitespace and newlines preserves raw bytes for HMAC', async () => {
    const rechargeAmount = 100;
    const order = await db.createPaymentOrder({
      userId: testUserId,
      amount: rechargeAmount,
      currency: 'INR',
      provider: 'CASHFREE',
      gateway: 'CASHFREE',
      productType: 'WALLET_RECHARGE'
    });

    const prettyJson = `{\n  "type": "PAYMENT_SUCCESS_WEBHOOK",\n  "event_time": "2026-11-13T12:00:00Z",\n  "data": {\n    "order": {\n      "order_id": "${order.providerOrderId}",\n      "order_amount": 100,\n      "order_currency": "INR"\n    },\n    "payment": {\n      "cf_payment_id": "cf_pay_pretty_${Date.now()}",\n      "payment_status": "SUCCESS",\n      "payment_amount": 100,\n      "payment_currency": "INR",\n      "payment_time": "2026-11-13T12:00:00Z"\n    }\n  }\n}\n`;
    const rawBuffer = Buffer.from(prettyJson, 'utf8');
    const timestamp = String(Date.now());

    // Generate valid HMAC on rawBuffer
    const validSignature = generateCashfreeWebhookSignature(rawBuffer, timestamp, TEST_SECRET);

    // Call webhook with rawBuffer
    const res = await makeRawRequest(
      server,
      '/api/webhooks/cashfree',
      {
        'x-webhook-signature': validSignature,
        'x-webhook-timestamp': timestamp
      },
      rawBuffer
    );

    assert.strictEqual(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body.received, true);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.processed, true);
  });

  it('EC-2: Unsorted keys and JSON key permutations are verified without stringify reordering', async () => {
    const rechargeAmount = 250;
    const order = await db.createPaymentOrder({
      userId: testUserId,
      amount: rechargeAmount,
      currency: 'INR',
      provider: 'CASHFREE',
      gateway: 'CASHFREE',
      productType: 'WALLET_RECHARGE'
    });

    // Keys deliberately reversed / unsorted
    const rawPayload = JSON.stringify({
      version: '2026-01-01',
      data: {
        payment: {
          payment_time: '2026-11-13T12:00:00Z',
          payment_currency: 'INR',
          payment_amount: 250,
          payment_status: 'SUCCESS',
          cf_payment_id: `cf_pay_unsorted_${Date.now()}`
        },
        order: {
          order_currency: 'INR',
          order_amount: 250,
          order_id: order.providerOrderId
        }
      },
      type: 'PAYMENT_SUCCESS_WEBHOOK'
    });

    const rawBuffer = Buffer.from(rawPayload, 'utf8');
    const timestamp = String(Date.now());
    const validSignature = generateCashfreeWebhookSignature(rawBuffer, timestamp, TEST_SECRET);

    const res = await makeRawRequest(
      server,
      '/api/webhooks/cashfree',
      {
        'x-webhook-signature': validSignature,
        'x-webhook-timestamp': timestamp
      },
      rawBuffer
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.received, true);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.processed, true);
  });

  it('EC-3: UTF-8 Devanagari characters and emojis in payload maintain byte-exact HMAC integrity', async () => {
    const rechargeAmount = 501;
    const order = await db.createPaymentOrder({
      userId: testUserId,
      amount: rechargeAmount,
      currency: 'INR',
      provider: 'CASHFREE',
      gateway: 'CASHFREE',
      productType: 'WALLET_RECHARGE'
    });

    const unicodePayload = JSON.stringify({
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      notes: 'श्री गणेशाय नमः — नवग्रह शांति पूजा 🪐✨🪔',
      data: {
        order: {
          order_id: order.providerOrderId,
          order_amount: 501,
          order_currency: 'INR',
          customer_details: {
            customer_name: 'आर्यभट्ट शर्मा'
          }
        },
        payment: {
          cf_payment_id: `cf_pay_unicode_${Date.now()}`,
          payment_status: 'SUCCESS',
          payment_amount: 501,
          payment_currency: 'INR',
          payment_time: '2026-11-13T12:00:00Z'
        }
      }
    });

    const rawBuffer = Buffer.from(unicodePayload, 'utf8');
    const timestamp = String(Date.now());
    const validSignature = generateCashfreeWebhookSignature(rawBuffer, timestamp, TEST_SECRET);

    const res = await makeRawRequest(
      server,
      '/api/webhooks/cashfree',
      {
        'x-webhook-signature': validSignature,
        'x-webhook-timestamp': timestamp
      },
      rawBuffer
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.received, true);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.processed, true);
  });

  it('EC-4: Re-stringified signature mismatch: proof that raw bytes, not JSON.stringify, are required', async () => {
    // Construct a payload where JSON.stringify changes formatting
    const rawString = '{\n   "type":  "PAYMENT_SUCCESS_WEBHOOK",\n   "data": {\n      "order": {"order_id": "ord_mismatch"}\n   }\n}';
    const rawBuffer = Buffer.from(rawString, 'utf8');
    const timestamp = String(Date.now());

    // Generate signature on standard normalized JSON stringify (as a naive server would do)
    const normalizedObject = JSON.parse(rawString);
    const brokenSignature = generateCashfreeWebhookSignature(
      JSON.stringify(normalizedObject),
      timestamp,
      TEST_SECRET
    );

    // When the raw buffer arrives with irregular whitespace, signature computed on normalized JSON MUST fail
    const res = await makeRawRequest(
      server,
      '/api/webhooks/cashfree',
      {
        'x-webhook-signature': brokenSignature,
        'x-webhook-timestamp': timestamp
      },
      rawBuffer
    );

    // Must be rejected with 401 INVALID_SIGNATURE because raw bytes were signed by sender
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'INVALID_SIGNATURE');
  });

  it('EC-5: Timestamp drift beyond 300 seconds is rejected even with valid raw body HMAC', async () => {
    const expiredTimestamp = String(Date.now() - 350 * 1000); // 350 seconds ago
    const payload = JSON.stringify({ type: 'PAYMENT_SUCCESS_WEBHOOK' });
    const rawBuffer = Buffer.from(payload, 'utf8');
    const sig = generateCashfreeWebhookSignature(rawBuffer, expiredTimestamp, TEST_SECRET);

    const res = await makeRawRequest(
      server,
      '/api/webhooks/cashfree',
      {
        'x-webhook-signature': sig,
        'x-webhook-timestamp': expiredTimestamp,
        'x-enforce-timestamp-window': 'true'
      },
      rawBuffer
    );

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'TIMESTAMP_EXPIRED');
  });
});
