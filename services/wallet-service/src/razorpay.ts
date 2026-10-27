import dotenv from 'dotenv';
dotenv.config();
import Razorpay from 'razorpay';
import crypto from 'crypto';

export const TEST_RAZORPAY_SECRET = 'test_secret_for_automated_regression_suite_hmac256';

export function isRazorpayConfigured(): boolean {
  if (process.env.NODE_ENV === 'test') {
    return false;
  }
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return Boolean(
    keyId &&
    keySecret &&
    !keyId.includes('placeholder') &&
    !keySecret.includes('placeholder') &&
    !keyId.includes('your_') &&
    !keySecret.includes('your_')
  );
}

export function getRazorpaySecret(): string {
  if (process.env.NODE_ENV === 'test') {
    return TEST_RAZORPAY_SECRET;
  }
  if (isRazorpayConfigured()) {
    return process.env.RAZORPAY_KEY_SECRET!;
  }
  return '';
}

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder'
});

/**
 * Timing-safe cryptographic HMAC-SHA256 signature verification.
 * Enforces exact match between Razorpay callback signature and order|payment digest.
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!orderId || !paymentId || !signature) {
    return false;
  }

  const secret = getRazorpaySecret();
  if (!secret) {
    return false;
  }

  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const genBuf = Buffer.from(generatedSignature, 'utf8');
  const sigBuf = Buffer.from(signature, 'utf8');

  if (genBuf.length !== sigBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(genBuf, sigBuf);
}

/**
 * Helper to compute an authentic test signature for automated regression suites.
 * Restricted strictly to NODE_ENV === 'test'.
 */
export function generateTestPaymentSignature(orderId: string, paymentId: string): string {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Test signature generation is only permitted in test environment.');
  }
  return crypto
    .createHmac('sha256', TEST_RAZORPAY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

export const TEST_RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret_hmac256_astroverse';

export function getRazorpayWebhookSecret(): string {
  if (process.env.NODE_ENV === 'test') {
    return TEST_RAZORPAY_WEBHOOK_SECRET;
  }
  if (process.env.RAZORPAY_WEBHOOK_SECRET && !process.env.RAZORPAY_WEBHOOK_SECRET.includes('placeholder')) {
    return process.env.RAZORPAY_WEBHOOK_SECRET;
  }
  return '';
}

/**
 * Timing-safe cryptographic HMAC-SHA256 signature verification for Razorpay Webhooks.
 * Validates the raw request payload buffer against the signature sent in `x-razorpay-signature`.
 */
export function verifyRazorpayWebhookSignature(
  rawBody: Buffer | string,
  signature: string,
  customSecret?: string
): boolean {
  if (!rawBody || !signature) {
    return false;
  }

  const secret = customSecret || getRazorpayWebhookSecret();
  if (!secret) {
    return false;
  }

  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const genBuf = Buffer.from(generatedSignature, 'utf8');
  const sigBuf = Buffer.from(signature, 'utf8');

  if (genBuf.length !== sigBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(genBuf, sigBuf);
}

/**
 * Helper to generate a valid test webhook signature for automated regression tests.
 */
export function generateTestWebhookSignature(payload: Buffer | string, secret = TEST_RAZORPAY_WEBHOOK_SECRET): string {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Test webhook signature generation is only permitted in test environment.');
  }
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}
