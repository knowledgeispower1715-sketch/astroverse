process.env.NODE_ENV = 'test';
import assert from 'assert';
import http from 'http';
import app from '../src/server';
import { db, Role, AccountStatus, UserRecord } from '../src/db';
import { generateTestPaymentSignature } from '../src/razorpay';
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
    await test('GET /api/reports/catalogue returns all 9 distinct reports with integer paise pricing', async () => {
      const res = await request('/api/reports/catalogue');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.catalogue.length, 9);

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

    let subOrderId = '';
    await test('POST /api/subscriptions/create-order creates valid Razorpay order for Plus monthly', async () => {
      const res = await request('/api/subscriptions/create-order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: { tier: 'PLUS', billingPeriod: 'monthly' }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.amount, 14900);
      assert.strictEqual(res.data.tier, 'PLUS');
      assert.strictEqual(res.data.billingPeriod.toUpperCase(), 'MONTHLY');
      assert(res.data.orderId.startsWith('order_sub_'));
      subOrderId = res.data.orderId;
    });

    await test('POST /api/subscriptions/verify-payment rejects forged cryptographic signature', async () => {
      const res = await request('/api/subscriptions/verify-payment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: {
          orderId: subOrderId,
          paymentId: 'pay_sub_fake_123',
          signature: 'forged_invalid_signature_hex'
        }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.error, 'INVALID_PAYMENT_SIGNATURE');
    });

    await test('POST /api/subscriptions/verify-payment activates Plus subscription upon verified signature', async () => {
      const fakePaymentId = `pay_sub_${Date.now()}`;
      const validSig = generateTestPaymentSignature(subOrderId, fakePaymentId);

      const res = await request('/api/subscriptions/verify-payment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: {
          orderId: subOrderId,
          paymentId: fakePaymentId,
          signature: validSig
        }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.subscriptionTier, 'PLUS');
      assert.strictEqual(res.data.subscriptionStatus, 'ACTIVE');
      assert(res.data.subscriptionExpiresAt, 'Must set subscription expiration date');

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
    await db.createPaymentOrder({
      userId: userA.id,
      amount: 250.0,
      currency: 'INR',
      razorpayOrderId: 'order_test_topup_123'
    });
    await db.rechargeWallet(userA.id, 250.0, 'pay_test_topup_123', 'order_test_topup_123');

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
