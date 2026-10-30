process.env.NODE_ENV = 'test';
import assert from 'assert';
import http from 'http';
import app from '../src/server';
import { db, Role, AccountStatus, UserRecord } from '../src/db';
import { REPORT_CATALOGUE, SUBSCRIPTION_PLANS, calculateReportPrice, SubscriptionTier } from '../src/monetization/catalog';
import { EntitlementManager } from '../src/monetization/entitlements';
import { ReportDocumentGenerator } from '../src/monetization/reportGenerator';

let server: http.Server;
const TEST_PORT = 5058;
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
  return { status: res.status, ok: res.ok, headers: res.headers, data };
}

async function runMonetizationTestSuite() {
  console.log('===============================================================');
  console.log('ASTROVERSE MONETIZATION, SUBSCRIPTIONS & REPORTS AUTOMATED SUITE');
  console.log('===============================================================\n');

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
    // -------------------------------------------------------------------------
    // 1. Catalogue Integrity Tests
    // -------------------------------------------------------------------------
    await test('GET /api/reports/catalogue returns all 10 distinct reports with integer paise pricing', async () => {
      const res = await request('/api/reports/catalogue');
      if (res.status !== 200) console.log('VERIFY_RES_FAIL:', res.status, res.data);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.catalogue.length, 10);

      // Verify every report has required canonical fields
      for (const item of res.data.catalogue) {
        assert(item.productId, 'Report must have a productId');
        assert(item.displayName, 'Report must have a displayName');
        assert(Number.isInteger(item.pricePaise), 'Report price must be integer paise');
        assert(item.includedSections && item.includedSections.length > 0, 'Report must describe sections');
      }

      // Check specific expected prices
      const basic = res.data.catalogue.find((r: any) => r.productId === 'report_basic_chart_summary');
      assert.strictEqual(basic.pricePaise, 0);

      const kundli = res.data.catalogue.find((r: any) => r.productId === 'report_janam_kundli_deep_dive');
      assert.strictEqual(kundli.pricePaise, 19900); // ₹199

      const yearVarsh = res.data.catalogue.find((r: any) => r.productId === 'report_twelve_month_varshphal');
      assert.strictEqual(yearVarsh.pricePaise, 24900); // ₹249

      const numerology = res.data.catalogue.find((r: any) => r.productId === 'report_vedic_name_numerology');
      assert(numerology, 'report_vedic_name_numerology must exist in catalogue');
      assert.strictEqual(numerology.pricePaise, 19900); // ₹199
      assert.strictEqual(numerology.includedSections.length, 15);
    });

    await test('GET /api/subscriptions/plans returns Essentials, Plus, and Premium tiers', async () => {
      const res = await request('/api/subscriptions/plans');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.plans.length, 3);

      const free = res.data.plans.find((p: any) => p.tier === 'FREE');
      assert.strictEqual(free.monthlyPricePaise, 0);
      assert.strictEqual(free.annualPricePaise, 0);

      const plus = res.data.plans.find((p: any) => p.tier === 'PLUS');
      assert.strictEqual(plus.monthlyPricePaise, 14900); // ₹149
      assert.strictEqual(plus.annualPricePaise, 129900); // ₹1,299

      const premium = res.data.plans.find((p: any) => p.tier === 'PREMIUM');
      assert.strictEqual(premium.monthlyPricePaise, 29900); // ₹299
      assert.strictEqual(premium.annualPricePaise, 249900); // ₹2,499
    });

    await test('Pricing engine accurately applies member discounts (Free 0%, Plus 10%, Premium 20%)', async () => {
      // 19900 paise report
      const freePrice = calculateReportPrice('report_janam_kundli_deep_dive', SubscriptionTier.FREE);
      assert.strictEqual(freePrice.finalPricePaise, 19900);
      assert.strictEqual(freePrice.discountPercent, 0);

      const plusPrice = calculateReportPrice('report_janam_kundli_deep_dive', SubscriptionTier.PLUS);
      // 19900 * 0.90 = 17910
      assert.strictEqual(plusPrice.finalPricePaise, 17910);
      assert.strictEqual(plusPrice.discountPercent, 10);

      const premiumPrice = calculateReportPrice('report_janam_kundli_deep_dive', SubscriptionTier.PREMIUM);
      // 19900 * 0.80 = 15920
      assert.strictEqual(premiumPrice.finalPricePaise, 15920);
      assert.strictEqual(premiumPrice.discountPercent, 20);

      // Free report is always 0
      const freeReport = calculateReportPrice('report_basic_chart_summary', SubscriptionTier.PREMIUM);
      assert.strictEqual(freeReport.finalPricePaise, 0);
    });

    // -------------------------------------------------------------------------
    // 2. User Setup and Entitlements
    // -------------------------------------------------------------------------
    const emailA = `monetize.userA.${Date.now()}@example.com`;
    const regResA = await request('/api/auth/register-password', {
      method: 'POST',
      body: { email: emailA, password: 'StrongPassword123!', displayName: 'User Alpha' }
    });
    assert.strictEqual(regResA.status, 200);
    const tokenA = regResA.data.sessionToken;
    const userA = regResA.data.user;

    const emailB = `monetize.userB.${Date.now()}@example.com`;
    const regResB = await request('/api/auth/register-password', {
      method: 'POST',
      body: { email: emailB, password: 'StrongPassword123!', displayName: 'User Beta' }
    });
    assert.strictEqual(regResB.status, 200);
    const tokenB = regResB.data.sessionToken;
    const userB = regResB.data.user;

    await test('GET /api/entitlements/me rejects unauthenticated request with HTTP 401', async () => {
      const res = await request('/api/entitlements/me');
      assert.strictEqual(res.status, 401);
    });

    await test('GET /api/entitlements/me returns correct Essentials defaults for fresh user', async () => {
      const res = await request('/api/entitlements/me', {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.tier, 'FREE');
      assert.strictEqual(res.data.tierDisplayName, 'AstroVerse Essentials');
      assert.strictEqual(res.data.maxProfilesAllowed, 1);
      assert.strictEqual(res.data.currentProfilesCount, 0);
      assert.strictEqual(res.data.canCreateMoreProfiles, true);
      assert.strictEqual(res.data.dailyAiQuotaTotal, 3);
      assert.strictEqual(res.data.reportDiscountPercent, 0);
    });

    // Create birth profiles for testing
    const profileResA = await request('/api/profiles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        profileName: 'Alpha Natal',
        dateOfBirth: '1992-08-24',
        timeOfBirth: '14:35',
        birthplaceName: 'Varanasi, UP, India',
        latitude: 25.3176,
        longitude: 82.9739,
        relationship: 'Self'
      }
    });
    assert.strictEqual(profileResA.status, 200);
    const profileA = profileResA.data;

    const profileResB = await request('/api/profiles', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
      body: {
        profileName: 'Beta Natal',
        dateOfBirth: '1994-11-12',
        timeOfBirth: '08:15',
        birthplaceName: 'Pune, Maharashtra, India',
        latitude: 18.5204,
        longitude: 73.8567,
        relationship: 'Self'
      }
    });
    assert.strictEqual(profileResB.status, 200);
    const profileB = profileResB.data;

    await test('Profile quota restricts Free tier to 1 birth profile', async () => {
      const snapshot = EntitlementManager.getEntitlementSnapshot(userA, 1);
      assert.strictEqual(snapshot.canCreateMoreProfiles, false);
      assert.strictEqual(snapshot.currentProfilesCount, 1);
      assert.strictEqual(snapshot.maxProfilesAllowed, 1);
    });

    // -------------------------------------------------------------------------
    // 3. Subscription Order & Activation
    // -------------------------------------------------------------------------
    await test('POST /api/subscriptions/create-order rejects invalid tier', async () => {
      const res = await request('/api/subscriptions/create-order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: { tier: 'DIAMOND', billingPeriod: 'monthly' }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.error, 'INVALID_TIER');
    });

    await test('POST /api/subscriptions/create-order fails closed with 503 PAYMENTS_NOT_CONFIGURED when live provider is not configured', async () => {
      const res = await request('/api/subscriptions/create-order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: { tier: 'PLUS', billingPeriod: 'monthly' }
      });
      assert.strictEqual(res.status, 503);
      assert.strictEqual(res.data.error, 'PAYMENTS_NOT_CONFIGURED');
    });

    await test('POST /api/subscriptions/verify-payment rejects legacy Razorpay signature submission with HTTP 410 PAYMENT_PROVIDER_RETIRED', async () => {
      const res = await request('/api/subscriptions/verify-payment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: {
          orderId: 'order_legacy_sub_123',
          paymentId: 'pay_sub_fake_123',
          signature: 'legacy_signature_hex'
        }
      });
      assert.strictEqual(res.status, 410);
      assert.strictEqual(res.data.error, 'PAYMENT_PROVIDER_RETIRED');
    });

    await test('POST /api/subscriptions/verify-payment rejects unrecorded order with HTTP 404 ORDER_NOT_FOUND', async () => {
      const res = await request('/api/subscriptions/verify-payment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: {
          orderId: 'cf_sub_nonexistent_99999',
          paymentId: 'cf_pay_123'
        }
      });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.data.error, 'ORDER_NOT_FOUND');
    });

    await test('POST /api/subscriptions/verify-payment fails closed with HTTP 503 PAYMENTS_NOT_CONFIGURED for recorded order without active provider', async () => {
      const existingOrderId = `cf_sub_${Date.now()}`;
      await db.createPaymentOrder({
        userId: userA.id,
        amount: 149,
        currency: 'INR',
        provider: 'CASHFREE',
        providerOrderId: existingOrderId,
        productType: 'SUBSCRIPTION',
        productId: 'sub_plus_monthly'
      });
      const res = await request('/api/subscriptions/verify-payment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: {
          orderId: existingOrderId,
          paymentId: 'cf_pay_123'
        }
      });
      assert.strictEqual(res.status, 503);
      assert.strictEqual(res.data.error, 'PAYMENTS_NOT_CONFIGURED');
    });

    await test('Subscription activation and entitlement verification for Plus tier', async () => {
      // Direct activation for testing downstream Plus entitlements
      await db.updateUser(userA.id, {
        subscriptionTier: 'PLUS',
        subscriptionStatus: 'ACTIVE',
        subscriptionExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString()
      });

      // Check entitlements endpoint reflects upgrade
      const entRes = await request('/api/entitlements/me', {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(entRes.data.tier, 'PLUS');
      assert.strictEqual(entRes.data.maxProfilesAllowed, 3);
      assert.strictEqual(entRes.data.dailyAiQuotaTotal, 15);
      assert.strictEqual(entRes.data.reportDiscountPercent, 10);
      assert.strictEqual(entRes.data.canCreateMoreProfiles, true); // 1 used out of 3
    });

    await test('POST /api/subscriptions/cancel marks active subscription as CANCELLED but retains access till expiry', async () => {
      const cancelRes = await request('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(cancelRes.status, 200);
      assert.strictEqual(cancelRes.data.success, true);
      assert.strictEqual(cancelRes.data.status, 'CANCELLED');

      // Still has PLUS access until expiresAt
      const entRes = await request('/api/entitlements/me', {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(entRes.data.tier, 'PLUS');
      assert.strictEqual(entRes.data.subscriptionStatus, 'CANCELLED');
    });

    await test('EntitlementManager automatically downgrades expired subscription to FREE', async () => {
      const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
      const mockExpiredUser: any = {
        subscriptionTier: 'PREMIUM',
        subscriptionExpiresAt: pastDate,
        subscriptionStatus: 'ACTIVE'
      };
      const { tier, status } = EntitlementManager.resolveEffectiveTier(mockExpiredUser);
      assert.strictEqual(tier, SubscriptionTier.FREE);
      assert.strictEqual(status, 'EXPIRED');
    });

    // -------------------------------------------------------------------------
    // 4. Report Ordering, Discounts & Generation
    // -------------------------------------------------------------------------
    await test('Generating report with cross-user profile is strictly rejected with HTTP 403', async () => {
      // User B attempts to generate report using User A's profile
      const res = await request('/api/reports/order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: {
          productId: 'report_janam_kundli_deep_dive',
          profileId: profileA.id,
          paymentMethod: 'wallet'
        }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error, 'FORBIDDEN');
    });

    await test('Generating report with cross-user partnerProfileId is strictly rejected with HTTP 403', async () => {
      // User B attempts to sneak User A's profile as partnerProfileId
      const res = await request('/api/reports/order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: {
          productId: 'report_kundli_milan',
          profileId: profileB.id,
          partnerProfileId: profileA.id,
          paymentMethod: 'wallet'
        }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error, 'FORBIDDEN');
      assert(res.data.message.includes('partner profile'));
    });

    await test('Generating Kundli Milan with self as partner is rejected with HTTP 400 SELF_AS_PARTNER_INVALID', async () => {
      const res = await request('/api/reports/order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: {
          productId: 'report_kundli_milan',
          profileId: profileB.id,
          partnerProfileId: profileB.id,
          paymentMethod: 'wallet'
        }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.error, 'SELF_AS_PARTNER_INVALID');
      assert(res.data.message.includes('cannot be identical'));
    });

    await test('Generating Kundli Milan without partner profile is rejected with HTTP 400 MISSING_PARTNER_PROFILE', async () => {
      const res = await request('/api/reports/order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: {
          productId: 'report_kundli_milan',
          profileId: profileB.id,
          paymentMethod: 'wallet'
        }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.error, 'MISSING_PARTNER_PROFILE');
    });

    await test('Generating Relationship & Marriage report succeeds as single-profile without partner', async () => {
      await db.addDemoCredits(userB.id, 500);
      const res = await request('/api/reports/order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: {
          productId: 'report_relationship_marriage',
          profileId: profileB.id,
          paymentMethod: 'DEMO_WALLET'
        }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.document.productId, 'report_relationship_marriage');
      assert.strictEqual(res.data.document.profileName, profileB.profileName);
      // Clean up demo credits so subsequent tests have pristine baseline
      await db.resetDemoWallet(userB.id);
    });

    await test('Inline profileData with out-of-bounds coordinates is rejected with HTTP 400 INVALID_COORDINATES', async () => {
      const res = await request('/api/reports/order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: {
          productId: 'report_basic_chart_summary',
          profileData: {
            profileName: 'Invalid Coords Test',
            dateOfBirth: '1990-05-15',
            timeOfBirth: '14:30',
            latitude: 95.5, // Invalid: > 90
            longitude: 77.2
          }
        }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.error, 'INVALID_COORDINATES');
    });

    await test('Inline profileData with invalid date or time format is rejected with HTTP 400 INVALID_BIRTH_DATA', async () => {
      const res = await request('/api/reports/order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: {
          productId: 'report_basic_chart_summary',
          profileData: {
            profileName: 'Invalid Dob Test',
            dateOfBirth: 'not-a-valid-date',
            timeOfBirth: '25:99', // Invalid hour
            latitude: 28.61,
            longitude: 77.2
          }
        }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.error, 'INVALID_BIRTH_DATA');
    });

    let freeReportId = '';
    await test('Free report (report_basic_chart_summary) generates immediately at 0 paise and returns canonical structure', async () => {
      const res = await request('/api/reports/order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: {
          productId: 'report_basic_chart_summary',
          profileId: profileA.id,
          paymentMethod: 'wallet'
        }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.paidAmountPaise, 0);
      assert(res.data.reportId, 'Must return generated reportId');
      freeReportId = res.data.reportId;

      const doc = res.data.document;
      assert.strictEqual(doc.productId, 'report_basic_chart_summary');
      assert(doc.calculationSettings, 'Must contain astrological calculation settings');
      assert(doc.calculationSettings.ayanamsha, 'Calculation settings must specify ayanamsha');
      assert(doc.sections.length > 0, 'Document must have structured sections');
      assert(doc.watermark, 'Document must have personalized watermark');
    });

    // Credit User A wallet with sufficient funds to test wallet purchase with 10% Plus discount
    // report_janam_kundli_deep_dive is 19900 paise = ₹199. With Plus 10% discount: 17910 paise = ₹179.10
    const topupOrderId = `order_test_topup_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const topupPaymentId = `pay_test_topup_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    await db.createPaymentOrder({
      userId: userA.id,
      amount: 250.0,
      currency: 'INR',
      razorpayOrderId: topupOrderId
    });
    await db.rechargeWallet(userA.id, 250.0, topupPaymentId, topupOrderId);

    let paidReportId = '';
    await test('Wallet report purchase applies 10% Plus member discount, debits wallet, and creates ledger entry with proper Report description', async () => {
      const res = await request('/api/reports/order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: {
          productId: 'report_janam_kundli_deep_dive',
          profileId: profileA.id,
          paymentMethod: 'wallet',
          options: {
            technicalDepth: 'advanced'
          }
        }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.paidAmountPaise, 17910); // 10% discount applied
      assert.strictEqual(res.data.discountPercent, 10);
      assert(res.data.reportId);
      paidReportId = res.data.reportId;

      // Verify wallet was debited exactly ₹179.10 (250.00 - 179.10 = 70.90)
      const walletRes = await request('/api/wallet/me', {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(walletRes.data.balance, 70.9);

      // Verify ledger description starts with 'Report Purchase:' instead of 'Vedic Puja Booking:'
      const latestEntry = walletRes.data.statement[0];
      assert(latestEntry.description.startsWith('Report Purchase:'), `Expected 'Report Purchase:' but got '${latestEntry.description}'`);
      assert(!latestEntry.description.includes('Vedic Puja Booking'), 'Ledger entry must not be mislabeled as Puja Booking');
    });

    await test('POST /api/reports/order with paymentMethod gateway fails closed with 503 PAYMENTS_NOT_CONFIGURED when live provider is not configured', async () => {
      const orderRes = await request('/api/reports/order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: {
          productId: 'report_janam_kundli_deep_dive',
          profileId: profileA.id,
          paymentMethod: 'gateway'
        }
      });
      assert.strictEqual(orderRes.status, 503);
      assert.strictEqual(orderRes.data.error, 'PAYMENTS_NOT_CONFIGURED');
    });

    await test('POST /api/reports/verify-and-generate rejects legacy Razorpay signature with HTTP 410 PAYMENT_PROVIDER_RETIRED', async () => {
      const res = await request('/api/reports/verify-and-generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: {
          orderId: 'order_fake_rep_99999',
          paymentId: 'pay_fake_rep_99999',
          signature: 'legacy_sig_123',
          productId: 'report_janam_kundli_deep_dive',
          profileId: profileA.id
        }
      });
      assert.strictEqual(res.status, 410);
      assert.strictEqual(res.data.error, 'PAYMENT_PROVIDER_RETIRED');
    });

    await test('POST /api/reports/verify-and-generate rejects unrecorded order with HTTP 404 ORDER_NOT_FOUND', async () => {
      const res = await request('/api/reports/verify-and-generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: {
          orderId: 'cf_rep_nonexistent_99999',
          paymentId: 'cf_pay_123',
          productId: 'report_janam_kundli_deep_dive',
          profileId: profileA.id
        }
      });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.data.error, 'ORDER_NOT_FOUND');
    });

    await test('POST /api/reports/verify-and-generate fails closed with HTTP 503 PAYMENTS_NOT_CONFIGURED for recorded order without active provider', async () => {
      const existingOrderId = `cf_rep_${Date.now()}`;
      await db.createPaymentOrder({
        userId: userA.id,
        amount: 199,
        currency: 'INR',
        provider: 'CASHFREE',
        providerOrderId: existingOrderId,
        productType: 'REPORT',
        productId: 'report_janam_kundli_deep_dive'
      });
      const res = await request('/api/reports/verify-and-generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: {
          orderId: existingOrderId,
          paymentId: 'cf_pay_123',
          productId: 'report_janam_kundli_deep_dive',
          profileId: profileA.id
        }
      });
      assert.strictEqual(res.status, 503);
      assert.strictEqual(res.data.error, 'PAYMENTS_NOT_CONFIGURED');
    });

    await test('POST /api/reports/order allows free report generation even when payment gateway is unconfigured', async () => {
      const freeRes = await request('/api/reports/order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: {
          productId: 'report_basic_chart_summary',
          profileId: profileA.id,
          paymentMethod: 'free'
        }
      });
      assert.strictEqual(freeRes.status, 200);
      assert.strictEqual(freeRes.data.success, true);
      assert.strictEqual(freeRes.data.paidAmountPaise, 0);
      assert(freeRes.data.reportId, 'Must generate and return reportId for free report');
      assert.strictEqual(freeRes.data.document.allowPdfDownload, true, 'Free report must allow PDF download');
    });

    await test('Kundli Milan report generates comprehensive 4-chapter synastry including Ashtakoota and 12-Kuta diagnostics', async () => {
      const fullUser = await db.findUserById(userA.id);
      const milanDoc = await ReportDocumentGenerator.generateReport(
        'report_kundli_milan',
        fullUser,
        profileA,
        { partnerProfile: profileA }
      );
      assert.strictEqual(milanDoc.productId, 'report_kundli_milan');
      assert.strictEqual(milanDoc.sections.length, 4);
      assert.strictEqual(milanDoc.sections[0].sectionId, 'sec_ashtakoota_synastry');
      assert.strictEqual(milanDoc.sections[1].sectionId, 'sec_navamsha_synastry');
      assert.strictEqual(milanDoc.sections[2].sectionId, 'sec_manglik_synastry');
      assert.strictEqual(milanDoc.sections[3].sectionId, 'sec_12_kuta_diagnostics');
    });

    // -------------------------------------------------------------------------
    // 5. Multi-Month Personalized Forecasting Generation Tests
    // -------------------------------------------------------------------------
    await test('Twelve-Month Varshphal generates 12 distinct months with individual transits and non-boilerplate text', async () => {
      // Direct generator verification
      const fullUser = await db.findUserById(userA.id);
      const varshphalDoc = await ReportDocumentGenerator.generateReport(
        'report_twelve_month_varshphal',
        fullUser,
        profileA,
        { technicalDepth: 'advanced' }
      );

      assert.strictEqual(varshphalDoc.productId, 'report_twelve_month_varshphal');
      assert(varshphalDoc.monthlyForecasts, 'Monthly forecasts array must exist');
      assert.strictEqual(varshphalDoc.monthlyForecasts.length, 12, 'Must generate exactly 12 calendar months');

      const seenThemes = new Set<string>();
      for (const m of varshphalDoc.monthlyForecasts) {
        assert(m.monthName, 'Month must have a valid calendar name');
        assert(m.careerGuidance, 'Month must have career guidance');
        assert(m.relationshipGuidance, 'Month must have relationship guidance');
        assert(m.favorableDates && m.favorableDates.length > 0, 'Month must have favorable dates');
        assert(m.cautionDates && m.cautionDates.length > 0, 'Month must have caution dates');
        seenThemes.add(m.careerGuidance);
      }

      // Assert months are not identical duplicated boilerplate
      assert(seenThemes.size >= 4, 'Forecast must provide distinct dynamic thematic cycles');
    });

    // -------------------------------------------------------------------------
    // 6. Private Report Reader Authorization & Security Headers
    // -------------------------------------------------------------------------
    await test('GET /api/reports/reader/:id rejects unauthenticated access with HTTP 401', async () => {
      const res = await request(`/api/reports/reader/${paidReportId}`);
      assert.strictEqual(res.status, 401);
    });

    await test('GET /api/reports/reader/:id rejects cross-user access (User B accessing User A report) with HTTP 403', async () => {
      const res = await request(`/api/reports/reader/${paidReportId}`, {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error, 'FORBIDDEN');
    });

    await test('GET /api/reports/reader/:id serves private report to owner with anti-download security headers', async () => {
      const res = await request(`/api/reports/reader/${paidReportId}`, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.reportId, paidReportId);

      // Verify anti-download cache control
      const cacheControl = res.headers.get('cache-control');
      assert(cacheControl && cacheControl.includes('no-store'), 'Must enforce no-store cache control');
      assert(cacheControl.includes('no-cache'), 'Must enforce no-cache header');
      assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');

      // Verify digital watermark
      assert(res.data.document.watermark.accountHash, 'Document must embed owner accountHash in watermark');
      assert(res.data.document.ethicalNotice, 'Must include ethical notice');
    });

    // -------------------------------------------------------------------------
    // 7. Daily AI Consultation Quota Enforcement
    // -------------------------------------------------------------------------
    await test('POST /api/ai-astrologer/consume-quota rejects unauthenticated request with HTTP 401', async () => {
      const res = await request('/api/ai-astrologer/consume-quota', { method: 'POST' });
      assert.strictEqual(res.status, 401);
    });

    await test('Free tier user consumes exactly 3 queries, and 4th query is blocked with HTTP 429', async () => {
      // User B is on FREE tier (limit 3)
      const q1 = await request('/api/ai-astrologer/consume-quota', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(q1.status, 200);
      assert.strictEqual(q1.data.consumedToday, 1);
      assert.strictEqual(q1.data.remainingToday, 2);

      const q2 = await request('/api/ai-astrologer/consume-quota', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(q2.status, 200);
      assert.strictEqual(q2.data.consumedToday, 2);
      assert.strictEqual(q2.data.remainingToday, 1);

      const q3 = await request('/api/ai-astrologer/consume-quota', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(q3.status, 200);
      assert.strictEqual(q3.data.consumedToday, 3);
      assert.strictEqual(q3.data.remainingToday, 0);

      // 4th query must be rejected
      const q4 = await request('/api/ai-astrologer/consume-quota', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(q4.status, 429);
      assert.strictEqual(q4.data.error, 'DAILY_AI_QUOTA_EXCEEDED');
      assert.strictEqual(q4.data.allowedLimit, 3);
    });

    await test('Upgraded Plus user can consume up to 15 queries', async () => {
      // User A is on PLUS tier (limit 15)
      const qA1 = await request('/api/ai-astrologer/consume-quota', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert.strictEqual(qA1.status, 200);
      assert.strictEqual(qA1.data.allowedLimit, 15);
      assert.strictEqual(qA1.data.remainingToday, 14);
    });

    // -------------------------------------------------------------------------
    // 7. Controlled Demo Mode & Isolated Test Credit Operations
    // -------------------------------------------------------------------------
    await test('GET /api/demo/status confirms demo mode active in non-production test environment', async () => {
      const res = await request('/api/demo/status');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.demoModeActive, true);
    });

    await test('POST /api/demo/credit rejects unauthenticated requests with HTTP 401', async () => {
      const res = await request('/api/demo/credit', {
        method: 'POST',
        body: { amount: 500 }
      });
      assert.strictEqual(res.status, 401);
    });

    // Elevate userB to administrator for isolated admin demo wallet and simulation operations
    await db.updateUser(userB.id, { role: Role.OWNER });

    await test('POST /api/demo/credit rejects invalid demo amounts with HTTP 400', async () => {
      const res = await request('/api/demo/credit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: { amount: 250 } // only 100, 500, 1000 allowed
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.error, 'INVALID_DEMO_AMOUNT');
    });

    await test('POST /api/demo/credit credits demoWalletBalance without modifying real walletBalance', async () => {
      const initialWallet = await request('/api/wallet/me', {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      const realBalBefore = initialWallet.data.balance;

      const res = await request('/api/demo/credit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: { amount: 500 }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.addedAmount, 500);
      assert.strictEqual(res.data.newDemoBalance, 500);
      assert.strictEqual(res.data.isDemo, true);

      // Verify real balance was completely untouched
      const afterWallet = await request('/api/wallet/me', {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(afterWallet.data.balance, realBalBefore);
      assert.strictEqual(afterWallet.data.demoBalance, 500);
      assert.strictEqual(afterWallet.data.isDemoMode, true);
    });

    await test('Demo report purchase fails with HTTP 400 when demo balance is insufficient', async () => {
      // User B has ₹500 demo credits. Attempt to buy bundle costing ₹399 * 2 = insufficient if price was ₹600, or reset first:
      await request('/api/demo/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` }
      });

      const res = await request('/api/reports/order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: {
          productId: 'report_janam_kundli_deep_dive',
          profileId: profileB.id,
          paymentMethod: 'DEMO_WALLET'
        }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.error, 'INSUFFICIENT_FUNDS');
      assert.strictEqual(res.data.isDemo, true);
    });

    let demoReportId = '';
    await test('Demo report purchase succeeds, debits demo balance, leaves real wallet intact, and stamps demo watermark', async () => {
      // Add ₹500 demo credits
      await request('/api/demo/credit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: { amount: 500 }
      });

      // report_janam_kundli_deep_dive is ₹199
      const res = await request('/api/reports/order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: {
          productId: 'report_janam_kundli_deep_dive',
          profileId: profileB.id,
          paymentMethod: 'DEMO_WALLET'
        }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.paidVia, 'DEMO_WALLET');
      assert.strictEqual(res.data.deduction, 199);
      assert.strictEqual(res.data.newDemoBalance, 301);
      assert.strictEqual(res.data.isDemo, true);
      assert(res.data.reportId);
      demoReportId = res.data.reportId;

      const doc = res.data.document;
      assert.strictEqual(doc.watermark.isDemo, true);
      assert(doc.watermark.documentVerificationHash.startsWith('DEMO-'), 'Watermark must indicate DEMO mode');
      assert(doc.watermark.ownerName.includes('[DEMO TEST]'));

      // Verify real wallet statement has no leakage of real debit
      const walletRes = await request('/api/wallet/me', {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(walletRes.data.demoBalance, 301);
      const demoLedger = walletRes.data.statement.find((s: any) => s.entryType === 'DEMO_REPORT_PURCHASE');
      assert(demoLedger, 'Must log DEMO_REPORT_PURCHASE in statement');
      assert(demoLedger.description.includes('[DEMO SIMULATION]'));
    });

    await test('POST /api/demo/set-tier simulates Plus subscription and applies 10% discount to demo purchases', async () => {
      const tierRes = await request('/api/demo/set-tier', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: { tier: 'PLUS' }
      });
      assert.strictEqual(tierRes.status, 200);
      assert.strictEqual(tierRes.data.simulatedTier, 'PLUS');

      // Purchase another report: report_career_education is ₹149. With Plus 10% discount: 13410 paise = ₹134.10
      const res = await request('/api/reports/order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: {
          productId: 'report_career_education',
          profileId: profileB.id,
          paymentMethod: 'DEMO_WALLET'
        }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.paidAmountPaise, 13410);
      assert.strictEqual(res.data.discountPercent, 10);
      assert.strictEqual(res.data.deduction, 134.10);
    });

    await test('Duplicate demo purchase with identical clientKey is idempotent', async () => {
      const fixedKey = `DEMO_KEY_IDEMPOTENT_${Date.now()}`;
      // Add credits first
      await request('/api/demo/credit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: { amount: 1000 }
      });

      const res1 = await request('/api/reports/order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: {
          productId: 'report_career_education',
          profileId: profileB.id,
          paymentMethod: 'DEMO_WALLET',
          clientKey: fixedKey
        }
      });
      assert.strictEqual(res1.status, 200);
      const balAfterFirst = res1.data.newDemoBalance;

      // Duplicate request with same clientKey
      const res2 = await request('/api/reports/order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: {
          productId: 'report_career_education',
          profileId: profileB.id,
          paymentMethod: 'DEMO_WALLET',
          clientKey: fixedKey
        }
      });
      assert.strictEqual(res2.status, 200);
      // Balance must NOT be deducted again
      const currentWallet = await request('/api/wallet/me', {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(currentWallet.data.demoBalance, balAfterFirst);
    });

    await test('POST /api/demo/reset sets demo balance to 0 and records DEMO_REVERSAL', async () => {
      const res = await request('/api/demo/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.newDemoBalance, 0);

      const walletRes = await request('/api/wallet/me', {
        headers: { Authorization: `Bearer ${tokenB}` }
      });
      assert.strictEqual(walletRes.data.demoBalance, 0);
    });

    await test('Production fail-closed guard: demo operations are blocked when simulated production environment is set', async () => {
      const prevNodeEnv = process.env.NODE_ENV;
      const prevVercelEnv = process.env.VERCEL_ENV;
      const prevDemoMode = process.env.DEMO_MODE;

      try {
        process.env.NODE_ENV = 'production';
        process.env.VERCEL_ENV = 'production';
        delete process.env.DEMO_MODE;

        const creditRes = await request('/api/demo/credit', {
          method: 'POST',
          headers: { Authorization: `Bearer ${tokenB}` },
          body: { amount: 500 }
        });
        assert.strictEqual(creditRes.status, 403);
        assert.strictEqual(creditRes.data.error, 'DEMO_MODE_DISABLED');

        const orderRes = await request('/api/reports/order', {
          method: 'POST',
          headers: { Authorization: `Bearer ${tokenB}` },
          body: {
            productId: 'report_janam_kundli_deep_dive',
            profileId: profileB.id,
            paymentMethod: 'DEMO_WALLET'
          }
        });
        assert.strictEqual(orderRes.status, 403);
        assert.strictEqual(orderRes.data.error, 'DEMO_MODE_DISABLED');
      } finally {
        process.env.NODE_ENV = prevNodeEnv;
        if (prevVercelEnv) process.env.VERCEL_ENV = prevVercelEnv; else delete process.env.VERCEL_ENV;
        if (prevDemoMode) process.env.DEMO_MODE = prevDemoMode; else delete process.env.DEMO_MODE;
      }
    });

  } finally {
    server.close();
  }

  console.log('\n===============================================================');
  console.log(`MONETIZATION SUITE COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('===============================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runMonetizationTestSuite().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
