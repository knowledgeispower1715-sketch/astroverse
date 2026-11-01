process.env.NODE_ENV = 'test';
import assert from 'assert';
import http from 'http';
import app, { authorizeUserForForecastHorizon } from '../src/server';
import { db, OrderStatus } from '../src/db';
import { SubscriptionTier } from '../src/monetization/catalog';

let server: http.Server;
let mockKundliServer: http.Server;
const TEST_PORT = 5091;
const MOCK_KUNDLI_PORT = 8101;

process.env.KUNDLI_ENGINE_URL = `http://127.0.0.1:${MOCK_KUNDLI_PORT}`;
process.env.ASTROVERSE_INTERNAL_KEY = 'test_secure_internal_gateway_key_999888';

let lastReceivedUpstreamPayload: any = null;

function startMockKundliServer(): Promise<void> {
  return new Promise((resolve) => {
    mockKundliServer = http.createServer((req, res) => {
      let bodyStr = '';
      req.on('data', chunk => { bodyStr += chunk; });
      req.on('end', () => {
        try {
          lastReceivedUpstreamPayload = JSON.parse(bodyStr);
        } catch (_) {
          lastReceivedUpstreamPayload = null;
        }

        const isUnlocked = lastReceivedUpstreamPayload?.is_unlocked ?? false;
        const horizon = lastReceivedUpstreamPayload?.horizon || 'hourly';

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'SUCCESS',
          horizon: horizon,
          is_personalized: true,
          preview: {
            is_preview: !isUnlocked,
            unlocked: isUnlocked
          },
          sections: {
            executive_summary: `Forecast for ${horizon}`
          }
        }));
      });
    });
    mockKundliServer.listen(MOCK_KUNDLI_PORT, () => resolve());
  });
}

async function runSkuSpecificEntitlementsSuite() {
  console.log('===============================================================');
  console.log('ASTROVERSE SKU-SPECIFIC ENTITLEMENTS & SUBSCRIPTION LIFECYCLE');
  console.log('===============================================================\n');

  await startMockKundliServer();
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
    // 1. Universally free horizons (hourly and daily)
    await test('1. Hourly and daily horizons are universally unlocked for guests and free users', async () => {
      const resGuestHourly = await authorizeUserForForecastHorizon(null, 'hourly');
      assert.strictEqual(resGuestHourly.isAuthorized, true);
      assert.strictEqual(resGuestHourly.reason, 'HORIZON_UNIVERSALLY_FREE');

      const resGuestDaily = await authorizeUserForForecastHorizon(null, 'daily');
      assert.strictEqual(resGuestDaily.isAuthorized, true);
      assert.strictEqual(resGuestDaily.reason, 'HORIZON_UNIVERSALLY_FREE');
    });

    // 2. Unauthenticated guests are locked for paid horizons
    await test('2. Unauthenticated guests are strictly locked for weekly, monthly, yearly, mahadasha', async () => {
      for (const h of ['weekly', 'monthly', 'yearly', 'mahadasha']) {
        const res = await authorizeUserForForecastHorizon(null, h);
        assert.strictEqual(res.isAuthorized, false);
        assert.strictEqual(res.reason, 'AUTHENTICATION_REQUIRED');
      }
    });

    // 3. Create test users
    const freeUser = await db.createUser({
      phone: '+919870000001',
      displayName: 'Free User'
    });

    // 4. Free user without purchases
    await test('3. Free user without purchases is locked for weekly, monthly, yearly, mahadasha', async () => {
      for (const h of ['weekly', 'monthly', 'yearly', 'mahadasha']) {
        const res = await authorizeUserForForecastHorizon(freeUser, h);
        assert.strictEqual(res.isAuthorized, false);
      }
    });

    // 5. Subscription tiers
    await test('4. PLUS subscriber has weekly unlocked, but monthly, yearly, mahadasha locked', async () => {
      let plusUser = await db.createUser({
        phone: '+919870000002',
        displayName: 'Plus User'
      });
      plusUser = await db.updateUser(plusUser.id, {
        subscriptionTier: 'PLUS',
        subscriptionExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString()
      });

      const resWeekly = await authorizeUserForForecastHorizon(plusUser, 'weekly');
      assert.strictEqual(resWeekly.isAuthorized, true);
      assert.strictEqual(resWeekly.reason, 'SUBSCRIPTION_PLUS');

      const resMonthly = await authorizeUserForForecastHorizon(plusUser, 'monthly');
      assert.strictEqual(resMonthly.isAuthorized, false);

      const resYearly = await authorizeUserForForecastHorizon(plusUser, 'yearly');
      assert.strictEqual(resYearly.isAuthorized, false);

      const resMaha = await authorizeUserForForecastHorizon(plusUser, 'mahadasha');
      assert.strictEqual(resMaha.isAuthorized, false);
    });

    await test('5. PREMIUM subscriber has all horizons unlocked', async () => {
      let premiumUser = await db.createUser({
        phone: '+919870000003',
        displayName: 'Premium User'
      });
      premiumUser = await db.updateUser(premiumUser.id, {
        subscriptionTier: 'PREMIUM',
        subscriptionExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString()
      });

      for (const h of ['hourly', 'daily', 'weekly', 'monthly', 'yearly', 'mahadasha']) {
        const res = await authorizeUserForForecastHorizon(premiumUser, h);
        assert.strictEqual(res.isAuthorized, true);
      }
    });

    // 6. One-off purchase: monthly_forecast unlocks ONLY monthly
    await test('6. Purchasing monthly_forecast unlocks monthly only, NOT yearly or mahadasha', async () => {
      const buyerMonthly = await db.createUser({
        phone: '+919870000004',
        displayName: 'Monthly Buyer'
      });

      const order = await db.createPaymentOrder({
        userId: buyerMonthly.id,
        amount: 49,
        currency: 'INR',
        productId: 'monthly_forecast'
      });
      await db.markPaymentOrderPaid(order.id, 'pay_monthly_123');

      const resMonthly = await authorizeUserForForecastHorizon(buyerMonthly, 'monthly');
      assert.strictEqual(resMonthly.isAuthorized, true);
      assert.strictEqual(resMonthly.matchedSku, 'report_one_month_forecast');

      const resYearly = await authorizeUserForForecastHorizon(buyerMonthly, 'yearly');
      assert.strictEqual(resYearly.isAuthorized, false);

      const resMaha = await authorizeUserForForecastHorizon(buyerMonthly, 'mahadasha');
      assert.strictEqual(resMaha.isAuthorized, false);
    });

    // 7. One-off purchase: yearly_varshphal unlocks ONLY yearly
    await test('7. Purchasing yearly_varshphal unlocks yearly only, NOT monthly or mahadasha', async () => {
      const buyerYearly = await db.createUser({
        phone: '+919870000005',
        displayName: 'Yearly Buyer'
      });

      const order = await db.createPaymentOrder({
        userId: buyerYearly.id,
        amount: 149,
        currency: 'INR',
        productId: 'yearly_varshphal'
      });
      await db.markPaymentOrderPaid(order.id, 'pay_yearly_123');

      const resYearly = await authorizeUserForForecastHorizon(buyerYearly, 'yearly');
      assert.strictEqual(resYearly.isAuthorized, true);
      assert.strictEqual(resYearly.matchedSku, 'report_twelve_month_varshphal');

      const resMonthly = await authorizeUserForForecastHorizon(buyerYearly, 'monthly');
      assert.strictEqual(resMonthly.isAuthorized, false);

      const resMaha = await authorizeUserForForecastHorizon(buyerYearly, 'mahadasha');
      assert.strictEqual(resMaha.isAuthorized, false);
    });

    // 8. One-off purchase: kundli_deep_dive unlocks ONLY mahadasha
    await test('8. Purchasing kundli_deep_dive unlocks mahadasha only, NOT monthly or yearly', async () => {
      const buyerDeepDive = await db.createUser({
        phone: '+919870000006',
        displayName: 'Deep Dive Buyer'
      });

      const order = await db.createPaymentOrder({
        userId: buyerDeepDive.id,
        amount: 299,
        currency: 'INR',
        productId: 'kundli_deep_dive'
      });
      await db.markPaymentOrderPaid(order.id, 'pay_deepdive_123');

      const resMaha = await authorizeUserForForecastHorizon(buyerDeepDive, 'mahadasha');
      assert.strictEqual(resMaha.isAuthorized, true);
      assert.strictEqual(resMaha.matchedSku, 'report_janam_kundli_deep_dive');

      const resMonthly = await authorizeUserForForecastHorizon(buyerDeepDive, 'monthly');
      assert.strictEqual(resMonthly.isAuthorized, false);

      const resYearly = await authorizeUserForForecastHorizon(buyerDeepDive, 'yearly');
      assert.strictEqual(resYearly.isAuthorized, false);
    });

    // 9. One-off purchase: all_reports_bundle unlocks monthly, yearly, and mahadasha
    await test('9. Purchasing all_reports_bundle unlocks monthly, yearly, and mahadasha', async () => {
      const buyerBundle = await db.createUser({
        phone: '+919870000007',
        displayName: 'Bundle Buyer'
      });

      const order = await db.createPaymentOrder({
        userId: buyerBundle.id,
        amount: 499,
        currency: 'INR',
        productId: 'all_reports_bundle'
      });
      await db.markPaymentOrderPaid(order.id, 'pay_bundle_123');

      for (const h of ['hourly', 'daily', 'weekly', 'monthly', 'yearly', 'mahadasha']) {
        const res = await authorizeUserForForecastHorizon(buyerBundle, h);
        assert.strictEqual(res.isAuthorized, true, `Horizon ${h} should be authorized by bundle`);
      }
    });

    // 10. Refunded order does not grant access
    await test('10. Refunded orders (status: REFUNDED) strictly deny access', async () => {
      const refundedUser = await db.createUser({
        phone: '+919870000008',
        displayName: 'Refunded User'
      });

      const order = await db.createPaymentOrder({
        userId: refundedUser.id,
        amount: 149,
        currency: 'INR',
        productId: 'yearly_varshphal'
      });
      await db.markPaymentOrderPaid(order.id, 'pay_ref_123');
      // Update order status to REFUNDED
      order.status = OrderStatus.REFUNDED;

      const res = await authorizeUserForForecastHorizon(refundedUser, 'yearly');
      assert.strictEqual(res.isAuthorized, false, 'Refunded order must not grant access');
    });

    // 11. Expired order does not grant access
    await test('11. Expired orders past SKU validity period strictly deny access', async () => {
      const expiredUser = await db.createUser({
        phone: '+919870000009',
        displayName: 'Expired Order User'
      });

      const ancientDate = new Date(Date.now() - 400 * 86400000); // 400 days ago (validity is 365 days)
      const order = await db.createPaymentOrder({
        userId: expiredUser.id,
        amount: 149,
        currency: 'INR',
        productId: 'yearly_varshphal'
      });
      await db.markPaymentOrderPaid(order.id, 'pay_exp_123');
      // Override createdAt in DB record to past
      order.createdAt = ancientDate.toISOString();

      const res = await authorizeUserForForecastHorizon(expiredUser, 'yearly');
      assert.strictEqual(res.isAuthorized, false, 'Expired order must not grant access');
    });

    // 12. Cancelled subscription retains access until expiry, but revokes after expiry
    await test('12. Cancelled subscription retains access until paid-through expiry, then lapses to FREE', async () => {
      // User with subscription still within paid period
      let cancelledActiveUser = await db.createUser({
        phone: '+919870000010',
        displayName: 'Cancelled Active User'
      });
      cancelledActiveUser = await db.updateUser(cancelledActiveUser.id, {
        subscriptionTier: 'PREMIUM',
        subscriptionStatus: 'CANCELLED',
        subscriptionExpiresAt: new Date(Date.now() + 5 * 86400000).toISOString()
      });

      const resActive = await authorizeUserForForecastHorizon(cancelledActiveUser, 'yearly');
      assert.strictEqual(resActive.isAuthorized, true, 'Paid-through subscription must remain active');

      // User with subscription whose expiry date has passed
      let lapsedUser = await db.createUser({
        phone: '+919870000011',
        displayName: 'Lapsed User'
      });
      lapsedUser = await db.updateUser(lapsedUser.id, {
        subscriptionTier: 'PREMIUM',
        subscriptionExpiresAt: new Date(Date.now() - 2 * 86400000).toISOString()
      });

      const resLapsed = await authorizeUserForForecastHorizon(lapsedUser, 'yearly');
      assert.strictEqual(resLapsed.isAuthorized, false, 'Lapsed subscription must lapse to FREE');
    });

    console.log(`\n===============================================================`);
    console.log(`SKU ENTITLEMENT TESTS COMPLETE: ${passCount} passed, ${failCount} failed`);
    console.log(`===============================================================\n`);

    if (failCount > 0) {
      process.exit(1);
    }
  } finally {
    if (server) server.close();
    if (mockKundliServer) mockKundliServer.close();
  }
}

runSkuSpecificEntitlementsSuite().catch((err) => {
  console.error('Fatal error in SKU entitlement test suite:', err);
  process.exit(1);
});
