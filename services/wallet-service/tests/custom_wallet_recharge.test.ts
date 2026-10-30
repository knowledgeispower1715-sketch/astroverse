process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_astroverse_recharge_audit_key_32chars';
process.env.DATABASE_STORAGE = 'memory';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import crypto from 'crypto';
import app, {
  validateRechargeAmount,
  calculateWalletRechargePricing,
  MIN_RECHARGE_AMOUNT,
  MAX_RECHARGE_AMOUNT,
  RECHARGE_GST_RATE,
  APPROVED_RECHARGE_PACKAGES
} from '../src/server';
import { db, EntryType, OrderStatus } from '../src/db';

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
        let data = '';
        res.on('data', chunk => {
          data += chunk;
        });
        res.on('end', () => {
          let parsed = data;
          try {
            parsed = JSON.parse(data);
          } catch {
            // Keep as string
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

describe('ASTROVERSE CUSTOM WALLET RECHARGE & FINANCIAL INTEGRITY SUITE', () => {
  let server: http.Server;
  let testUserId: string;
  let authToken: string;

  before(async () => {
    server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));

    const reg = await makeRequest(server, 'POST', '/api/auth/register-password', {}, {
      email: `recharge_tester_${Date.now()}@astroverse.ai`,
      password: 'SafePassword123!',
      displayName: 'Astro Recharge Seeker'
    });
    assert.strictEqual(reg.status, 200);
    authToken = reg.body.sessionToken;
    testUserId = reg.body.user.id;
  });

  after(() => {
    return new Promise<void>(resolve => server.close(() => resolve()));
  });

  // =========================================================================
  // SECTION 1: MANDATORY BOUNDARY & AMOUNT VALIDATION (PHASE 5 & 13)
  // =========================================================================
  describe('SECTION 1: Amount Validation & Boundary Enforcement', () => {
    it('1.1 Rejects amounts strictly below ₹1.00 (0, 0.01, 0.50, 0.99)', () => {
      const belowMinimum = [0, 0.01, 0.5, 0.99, '0', '0.01', '0.99'];
      for (const amt of belowMinimum) {
        const res = validateRechargeAmount(amt);
        assert.strictEqual(res.valid, false, `Expected ${amt} to be rejected as below minimum`);
        assert.ok(res.error?.includes('Minimum recharge amount is ₹1.00'));
      }
    });

    it('1.2 Accepts ₹1.00 minimum boundary and decimal amounts with up to 2 decimal places', () => {
      const validAmounts = [1.00, 1.01, 1.50, 5.00, 10.00, 27.50, 100.00, 250.00, 750.00, 1250.00, 50000.00];
      for (const amt of validAmounts) {
        const res = validateRechargeAmount(amt);
        assert.strictEqual(res.valid, true, `Expected ${amt} to be valid`);
        assert.strictEqual(res.normalizedAmount, amt);
      }
    });

    it('1.3 Rejects amounts exceeding configured maximum of ₹50,000.00', () => {
      const aboveMax = [50000.01, 50001, 100000, '50000.50'];
      for (const amt of aboveMax) {
        const res = validateRechargeAmount(amt);
        assert.strictEqual(res.valid, false, `Expected ${amt} to be rejected as above maximum`);
        assert.ok(res.error?.includes('Maximum recharge amount is ₹50000'));
      }
    });

    it('1.4 Rejects precision exceeding two decimal places (e.g. 1.005, 10.999)', () => {
      const excessiveDecimals = [1.005, 10.123, 250.999, '1.005', '10.9999'];
      for (const amt of excessiveDecimals) {
        const res = validateRechargeAmount(amt);
        assert.strictEqual(res.valid, false, `Expected ${amt} to be rejected for exceeding 2 decimal places`);
        assert.ok(res.error?.includes('2 decimal places'));
      }
    });

    it('1.5 Rejects negative numbers, non-numeric values, NaN, Infinity, and scientific notation', () => {
      const invalidValues = [-1, -100, '-50', NaN, Infinity, -Infinity, '1e4', '2.5e3', 'not_a_number', '', null, undefined];
      for (const val of invalidValues) {
        const res = validateRechargeAmount(val);
        assert.strictEqual(res.valid, false, `Expected ${val} to be rejected`);
      }
    });
  });

  // =========================================================================
  // SECTION 2: INTEGER PAISE ARITHMETIC & 18% STATUTORY GST (PHASE 6)
  // =========================================================================
  describe('SECTION 2: Authoritative Financial Math & GST Calculations', () => {
    it('2.1 ₹1.00 custom recharge: 100 paise base + 18 paise GST = 118 paise (₹1.18 payable, ₹1.00 credit)', () => {
      const pricing = calculateWalletRechargePricing(1.00);
      assert.strictEqual(pricing.valid, true);
      assert.strictEqual(pricing.baseAmount, 1.00);
      assert.strictEqual(pricing.basePaise, 100);
      assert.strictEqual(pricing.gstAmount, 0.18);
      assert.strictEqual(pricing.gstPaise, 18);
      assert.strictEqual(pricing.totalPayableAmount, 1.18);
      assert.strictEqual(pricing.totalPayablePaise, 118);
      assert.strictEqual(pricing.bonusAmount, 0.00);
      assert.strictEqual(pricing.bonusPaise, 0);
      assert.strictEqual(pricing.creditAmount, 1.00);
      assert.strictEqual(pricing.creditPaise, 100);
    });

    it('2.2 ₹1.50 custom recharge: 150 paise base + 27 paise GST = 177 paise (₹1.77 payable, ₹1.50 credit)', () => {
      const pricing = calculateWalletRechargePricing(1.50);
      assert.strictEqual(pricing.valid, true);
      assert.strictEqual(pricing.baseAmount, 1.50);
      assert.strictEqual(pricing.basePaise, 150);
      assert.strictEqual(pricing.gstAmount, 0.27);
      assert.strictEqual(pricing.gstPaise, 27);
      assert.strictEqual(pricing.totalPayableAmount, 1.77);
      assert.strictEqual(pricing.totalPayablePaise, 177);
      assert.strictEqual(pricing.creditAmount, 1.50);
    });

    it('2.3 ₹100 preset pack: ₹100 base + ₹18 GST = ₹118 payable, +₹10 bonus = ₹110 wallet credit', () => {
      const pricing = calculateWalletRechargePricing(100);
      assert.strictEqual(pricing.valid, true);
      assert.strictEqual(pricing.baseAmount, 100.00);
      assert.strictEqual(pricing.gstAmount, 18.00);
      assert.strictEqual(pricing.totalPayableAmount, 118.00);
      assert.strictEqual(pricing.bonusAmount, 10.00);
      assert.strictEqual(pricing.creditAmount, 110.00);
    });

    it('2.4 ₹250 preset pack: ₹250 base + ₹45 GST = ₹295 payable, +₹35 bonus = ₹285 wallet credit', () => {
      const pricing = calculateWalletRechargePricing(250);
      assert.strictEqual(pricing.valid, true);
      assert.strictEqual(pricing.baseAmount, 250.00);
      assert.strictEqual(pricing.gstAmount, 45.00);
      assert.strictEqual(pricing.totalPayableAmount, 295.00);
      assert.strictEqual(pricing.bonusAmount, 35.00);
      assert.strictEqual(pricing.creditAmount, 285.00);
    });

    it('2.5 ₹500 preset pack: ₹500 base + ₹90 GST = ₹590 payable, +₹100 bonus = ₹600 wallet credit', () => {
      const pricing = calculateWalletRechargePricing(500);
      assert.strictEqual(pricing.valid, true);
      assert.strictEqual(pricing.baseAmount, 500.00);
      assert.strictEqual(pricing.gstAmount, 90.00);
      assert.strictEqual(pricing.totalPayableAmount, 590.00);
      assert.strictEqual(pricing.bonusAmount, 100.00);
      assert.strictEqual(pricing.creditAmount, 600.00);
    });

    it('2.6 Custom amounts without configured promo receive ₹0 bonus and pay exact 18% GST', () => {
      const customAmounts = [10.00, 750.00, 1250.00];
      for (const amt of customAmounts) {
        const pricing = calculateWalletRechargePricing(amt);
        assert.strictEqual(pricing.valid, true);
        assert.strictEqual(pricing.baseAmount, amt);
        assert.strictEqual(pricing.bonusAmount, 0.00);
        assert.strictEqual(pricing.creditAmount, amt);
        const expectedGst = Math.round(amt * 100 * 0.18) / 100;
        assert.strictEqual(pricing.gstAmount, expectedGst);
        assert.strictEqual(pricing.totalPayableAmount, Math.round((amt + expectedGst) * 100) / 100);
      }
    });
  });

  // =========================================================================
  // SECTION 3: ORDER CREATION & CASHFREE PROTOCOL (PHASE 8)
  // =========================================================================
  describe('SECTION 3: Cashfree Order Creation & Idempotency', () => {
    it('3.1 POST /api/wallet/create-order creates order with total payable amount including GST', async () => {
      const res = await makeRequest(server, 'POST', '/api/wallet/create-order', {
        Authorization: `Bearer ${authToken}`
      }, {
        amount: 1.00
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.baseAmount, 1.00);
      assert.strictEqual(res.body.gstAmount, 0.18);
      assert.strictEqual(res.body.amount, 1.18, 'Cashfree order amount charged must include statutory 18% GST');
      assert.strictEqual(res.body.creditAmount, 1.00);
      assert.ok(res.body.orderId);
      assert.ok(res.body.paymentSessionId);
    });

    it('3.2 POST /api/wallet/create-order for preset ₹250 pack charges ₹295.00 and provisions ₹285.00 credit', async () => {
      const res = await makeRequest(server, 'POST', '/api/wallet/create-order', {
        Authorization: `Bearer ${authToken}`
      }, {
        packageId: 'pack_250'
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.baseAmount, 250.00);
      assert.strictEqual(res.body.gstAmount, 45.00);
      assert.strictEqual(res.body.amount, 295.00);
      assert.strictEqual(res.body.bonusAmount, 35.00);
      assert.strictEqual(res.body.creditAmount, 285.00);
    });

    it('3.3 POST /api/wallet/create-order reuses active order for identical x-idempotency-key', async () => {
      const idemKey = `idem_custom_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const res1 = await makeRequest(server, 'POST', '/api/wallet/create-order', {
        Authorization: `Bearer ${authToken}`,
        'x-idempotency-key': idemKey
      }, {
        amount: 10.00,
        idempotencyKey: idemKey
      });

      assert.strictEqual(res1.status, 200);
      const res2 = await makeRequest(server, 'POST', '/api/wallet/create-order', {
        Authorization: `Bearer ${authToken}`,
        'x-idempotency-key': idemKey
      }, {
        amount: 10.00,
        idempotencyKey: idemKey
      });

      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res2.body.orderId, res1.body.orderId);
      assert.strictEqual(res2.body.reused, true);
    });

    it('3.4 POST /api/wallet/create-order rejects below-minimum amount (₹0.50)', async () => {
      const res = await makeRequest(server, 'POST', '/api/wallet/create-order', {
        Authorization: `Bearer ${authToken}`
      }, {
        amount: 0.50
      });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error, 'INVALID_AMOUNT');
    });
  });

  // =========================================================================
  // SECTION 4: WALLET LEDGER, BALANCE SAFETY & BONUS SEPARATION (PHASE 7)
  // =========================================================================
  describe('SECTION 4: Wallet Ledger & Balance Crediting Safety', () => {
    it('4.1 Recharging ₹250 pack credits exactly ₹285.00 to user wallet balance', async () => {
      const startBalance = (await db.findUserById(testUserId))!.walletBalance;
      const order = await db.createPaymentOrder({
        userId: testUserId,
        amount: 295.00,
        currency: 'INR',
        provider: 'CASHFREE',
        providerOrderId: `cf_order_test_250_${Date.now()}`,
        productType: 'WALLET_RECHARGE',
        baseAmount: 250.00,
        gstAmount: 45.00,
        bonusAmount: 35.00,
        creditAmount: 285.00
      });

      const paymentId = `cf_pay_test_250_${Date.now()}`;
      const updatedUser = await db.rechargeWallet(
        testUserId,
        295.00,
        paymentId,
        order.providerOrderId,
        'CASHFREE'
      );

      const expectedNewBalance = Math.round((startBalance + 285.00) * 100) / 100;
      assert.strictEqual(updatedUser.walletBalance, expectedNewBalance);

      // Verify separate ledger records exist for paid principal and promotional bonus
      const ledgers = ((db as any).data.walletLedgers || []).filter((l: any) => l.userId === testUserId);
      const paidEntry = ledgers.find((l: any) => l.referenceId === paymentId && l.amount === 250.00);
      const bonusEntry = ledgers.find((l: any) => l.referenceId === paymentId && l.amount === 35.00);

      assert.ok(paidEntry, 'Paid principal ledger entry must exist for ₹250.00');
      assert.ok(bonusEntry, 'Promotional bonus ledger entry must exist for ₹35.00');
      assert.strictEqual(paidEntry.entryType, EntryType.WALLET_RECHARGE);
      assert.ok(paidEntry.description?.includes('Wallet recharge of ₹250.00'));
      assert.ok(bonusEntry.description?.includes('Promotional bonus credit of ₹35.00'));
    });

    it('4.2 Recharging ₹1.00 custom amount credits exactly ₹1.00 to user wallet balance', async () => {
      const startBalance = (await db.findUserById(testUserId))!.walletBalance;
      const order = await db.createPaymentOrder({
        userId: testUserId,
        amount: 1.18,
        currency: 'INR',
        provider: 'CASHFREE',
        providerOrderId: `cf_order_test_1_${Date.now()}`,
        productType: 'WALLET_RECHARGE',
        baseAmount: 1.00,
        gstAmount: 0.18,
        bonusAmount: 0.00,
        creditAmount: 1.00
      });

      const paymentId = `cf_pay_test_1_${Date.now()}`;
      const updatedUser = await db.rechargeWallet(
        testUserId,
        1.18,
        paymentId,
        order.providerOrderId,
        'CASHFREE'
      );

      const expectedNewBalance = Math.round((startBalance + 1.00) * 100) / 100;
      assert.strictEqual(updatedUser.walletBalance, expectedNewBalance);
    });

    it('4.3 Idempotency: Re-executing recharge with same paymentId does not double-credit', async () => {
      const userBefore = (await db.findUserById(testUserId))!;
      const existingLedger = ((db as any).data.walletLedgers || []).find((l: any) => l.userId === testUserId);
      assert.ok(existingLedger);

      const existingOrder = ((db as any).data.paymentOrders || []).find((o: any) => o.userId === testUserId);
      assert.ok(existingOrder);

      const resUser = await db.rechargeWallet(
        testUserId,
        existingOrder.amount,
        existingLedger.referenceId!,
        existingOrder.providerOrderId,
        'CASHFREE'
      );

      assert.strictEqual(resUser.walletBalance, userBefore.walletBalance, 'Balance must remain unchanged on replay');
    });

    it('4.4 Direct database tampering with altered amount is rejected with AMOUNT_MISMATCH', async () => {
      const order = await db.createPaymentOrder({
        userId: testUserId,
        amount: 118.00,
        currency: 'INR',
        provider: 'CASHFREE',
        providerOrderId: `cf_order_tamper_${Date.now()}`,
        productType: 'WALLET_RECHARGE',
        baseAmount: 100.00,
        gstAmount: 18.00,
        creditAmount: 110.00
      });

      await assert.rejects(
        () => db.rechargeWallet(testUserId, 500.00, `cf_tamper_pay_${Date.now()}`, order.providerOrderId, 'CASHFREE'),
        { message: 'AMOUNT_MISMATCH' }
      );
    });
  });

  // =========================================================================
  // SECTION 5: CENTRALIZED CONFIG & QUOTE ENDPOINTS (PHASE 4)
  // =========================================================================
  describe('SECTION 5: Centralized Configuration & Quote Endpoints', () => {
    it('5.1 GET /api/wallet/config exposes authoritative minimum ₹1.00 and 18% GST', async () => {
      const res = await makeRequest(server, 'GET', '/api/wallet/config');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.currency, 'INR');
      assert.strictEqual(res.body.currencySymbol, '₹');
      assert.strictEqual(res.body.minAmount, 1.00);
      assert.strictEqual(res.body.maxAmount, 50000.00);
      assert.strictEqual(res.body.customRechargeEnabled, true);
      assert.strictEqual(res.body.gst.percentage, 18);
      assert.ok(Array.isArray(res.body.packages));
      assert.strictEqual(res.body.packages.length, 6);
    });

    it('5.2 POST /api/wallet/quote dynamically calculates authoritative quote for custom amount', async () => {
      const res = await makeRequest(server, 'POST', '/api/wallet/quote', {}, {
        amount: 27.50
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.valid, true);
      assert.strictEqual(res.body.baseAmount, 27.50);
      assert.strictEqual(res.body.basePaise, 2750);
      assert.strictEqual(res.body.gstAmount, 4.95); // 2750 * 0.18 = 495 paise = 4.95
      assert.strictEqual(res.body.totalPayableAmount, 32.45); // 27.50 + 4.95 = 32.45
      assert.strictEqual(res.body.creditAmount, 27.50);
    });
  });
});
