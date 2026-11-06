process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_astroverse_recharge_audit_key_32chars';
process.env.DATABASE_STORAGE = 'memory';
process.env.CASHFREE_APP_ID = 'TEST10000000000000000000000000';
process.env.CASHFREE_SECRET_KEY = 'cfsk_ma_test_000000000000000000000000000000';
process.env.CASHFREE_ENV = 'sandbox';

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createCashfreeOrder,
  getCashfreeOrderStatus,
  getPaymentsForCashfreeOrder,
  getCashfreeApiVersion,
  getCashfreeBaseUrl
} from '../src/cashfree';

describe('PHASE 4: CASHFREE BACKEND ORDER CREATION & HARDENING SPECIFICATION', () => {

  it('4.1 Enforces correct official Cashfree API version (2026-01-01)', () => {
    const version = getCashfreeApiVersion();
    assert.strictEqual(version, '2026-01-01');
  });

  it('4.2 Rejects non-numeric, below-minimum (<1.00), and above-maximum (>50000) amounts', async () => {
    const invalidAmounts = [0, 0.5, 0.99, -10, NaN, 50001, 100000];
    for (const amt of invalidAmounts) {
      await assert.rejects(
        async () => {
          await createCashfreeOrder({
            orderId: 'cf_test_invalid_amt_' + Date.now(),
            orderAmount: amt as any,
            customer: { customer_id: 'usr_test', customer_phone: '9876543210' }
          });
        },
        (err: any) => err.message.includes('INVALID_ORDER_AMOUNT')
      );
    }
  });

  it('4.3 Rejects precision exceeding two decimal places (e.g. 1.005, 10.999)', async () => {
    const invalidPrecisions = [1.005, 10.999, 250.123];
    for (const amt of invalidPrecisions) {
      await assert.rejects(
        async () => {
          await createCashfreeOrder({
            orderId: 'cf_test_invalid_prec_' + Date.now(),
            orderAmount: amt,
            customer: { customer_id: 'usr_test', customer_phone: '9876543210' }
          });
        },
        (err: any) => err.message.includes('INVALID_AMOUNT_PRECISION')
      );
    }
  });

  it('4.4 Creates order successfully with valid 10-digit Indian phone number', async () => {
    const order = await createCashfreeOrder({
      orderId: 'cf_test_valid_order_' + Date.now(),
      orderAmount: 295.00,
      customer: {
        customer_id: 'usr_test_valid',
        customer_phone: '+91 98765 43210',
        customer_name: 'Test Customer',
        customer_email: 'customer@astroverse.ai'
      }
    });

    assert.ok(order.order_id);
    assert.strictEqual(order.order_amount, 295.00);
    assert.strictEqual(order.order_currency, 'INR');
    assert.ok(order.payment_session_id);
  });

  it('4.5 Normalizes Indian phone numbers with country code (+91 / 91)', async () => {
    const phones = ['+919876543210', '919876543210', '9876543210'];
    for (const phone of phones) {
      const order = await createCashfreeOrder({
        orderId: 'cf_test_phone_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        orderAmount: 118.00,
        customer: {
          customer_id: 'usr_test_phone',
          customer_phone: phone
        }
      });
      assert.strictEqual(order.order_status, 'ACTIVE');
    }
  });

  it('4.6 Rejects non-existent order status lookups gracefully', async () => {
    await assert.rejects(
      async () => {
        await getCashfreeOrderStatus('cf_wal_nonexistent_order_id_123');
      },
      (err: any) => err.message.includes('CASHFREE_LOOKUP_FAILED')
    );
  });

  it('4.7 In sandbox/test environment, defaults missing phone to test phone without failing', async () => {
    const order = await createCashfreeOrder({
      orderId: 'cf_test_no_phone_' + Date.now(),
      orderAmount: 1.18,
      customer: {
        customer_id: 'usr_test_nophone',
        customer_phone: ''
      }
    });
    assert.ok(order.payment_session_id);
  });
});
