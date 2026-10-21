import Razorpay from 'razorpay';
import crypto from 'crypto';

export const TEST_RAZORPAY_SECRET = 'test_secret_for_automated_regression_suite_hmac256';

export function isRazorpayConfigured(): boolean {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return Boolean(
    keyId &&
    keySecret &&
    !keyId.includes('placeholder') &&
    !keySecret.includes('placeholder')
  );
}

export function getRazorpaySecret(): string {
  if (isRazorpayConfigured()) {
    return process.env.RAZORPAY_KEY_SECRET!;
  }
  if (process.env.NODE_ENV === 'test') {
    return TEST_RAZORPAY_SECRET;
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
