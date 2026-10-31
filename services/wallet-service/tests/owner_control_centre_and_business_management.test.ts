import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import crypto from 'crypto';
import app from '../src/server';
import { db, Role, AccountStatus, OrderStatus, EntryType } from '../src/db';
import { issueAdminAssuranceToken } from '../src/security/mfa';

let server: http.Server;
let baseUrl: string;
let ownerSessionToken: string;
let ownerUserId: string;
let testCustomerId: string;
let assuranceToken: string;

test.before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  // Ensure owner user exists
  ownerUserId = 'usr_test_owner_' + Date.now();
  const ownerEmail = 'tiwari0028@gmail.com';
  const owner = await db.createUser({
    id: ownerUserId,
    email: ownerEmail,
    role: Role.OWNER,
    status: AccountStatus.ACTIVE,
    phone: '+919876543210'
  } as any);

  // Create session for owner
  const rawToken = 'test_owner_sess_' + crypto.randomBytes(16).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  await db.createSession({
    id: 'sess_' + crypto.randomBytes(8).toString('hex'),
    userId: owner.id,
    tokenHash,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  } as any);
  ownerSessionToken = rawToken;

  assuranceToken = issueAdminAssuranceToken(owner.id, Role.OWNER);

  // Create test customer
  testCustomerId = 'usr_cust_360_' + Date.now();
  await db.createUser({
    id: testCustomerId,
    email: 'customer360@example.com',
    phone: '+919123456789',
    displayName: 'Aryan Sharma',
    role: Role.USER,
    status: AccountStatus.ACTIVE,
    walletBalance: 250.00,
    paidWalletBalance: 200.00,
    promotionalWalletBalance: 50.00,
    subscriptionTier: 'FREE',
    subscriptionStatus: 'NONE'
  } as any);

  // Seed birth profile for customer
  await db.createProfile({
    userId: testCustomerId,
    profileName: 'Aryan Sharma',
    relationship: 'Self',
    dateOfBirth: '1995-05-15',
    timeOfBirth: '14:30',
    birthplaceName: 'New Delhi, India',
    latitude: 28.6139,
    longitude: 77.2090,
    resolvedTimezone: 'Asia/Kolkata'
  });

  // Seed paid order for customer
  const orderIdStr = 'cf_ord_' + Date.now();
  await db.createPaymentOrder({
    userId: testCustomerId,
    amount: 295.00,
    currency: 'INR',
    provider: 'CASHFREE',
    providerOrderId: orderIdStr,
    productType: 'WALLET_RECHARGE',
    baseAmount: 250,
    gstAmount: 45,
    bonusAmount: 35,
    creditAmount: 285
  });
  await db.rechargeWallet(testCustomerId, 295, 'cf_pay_' + Date.now(), orderIdStr, 'CASHFREE');

  // Settle a 15-rupee consultation debit
  await db.settleConsultation(testCustomerId, 'astro_001', 'cs_test_' + Date.now(), 15.00);
});

test.after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('1. GET /api/admin/customers/:id/360 returns comprehensive customer 360 profile', async () => {
  const res = await fetch(`${baseUrl}/api/admin/customers/${testCustomerId}/360`, {
    headers: {
      Authorization: `Bearer ${ownerSessionToken}`
    }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.customer);
  assert.equal(data.customer.user.id, testCustomerId);
  assert.equal(data.customer.user.displayName, 'Aryan Sharma');
  assert.ok(data.customer.birthProfiles.length >= 1);
  assert.ok(data.customer.wallet.totalDepositedRupees >= 295);
  assert.ok(data.customer.wallet.totalSpentRupees >= 15);
  assert.equal(data.customer.wallet.ordersCount >= 1, true);
});

test('2. GET /api/admin/customers/:id/360 rejects unauthenticated request with HTTP 401', async () => {
  const res = await fetch(`${baseUrl}/api/admin/customers/${testCustomerId}/360`);
  assert.equal(res.status, 401);
});

test('3. POST /api/admin/customers/:id/notes records internal administrative support note', async () => {
  const res = await fetch(`${baseUrl}/api/admin/customers/${testCustomerId}/notes`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ownerSessionToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: 'Customer requested assistance with Kundli Milan report. Verified birth details.',
      category: 'SUPPORT'
    })
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.note.id.startsWith('cnote_'));
  assert.equal(data.note.userId, testCustomerId);
  assert.equal(data.note.category, 'SUPPORT');

  // Verify note appears in Customer 360
  const c360Res = await fetch(`${baseUrl}/api/admin/customers/${testCustomerId}/360`, {
    headers: { Authorization: `Bearer ${ownerSessionToken}` }
  });
  const c360Data = await c360Res.json();
  assert.ok(c360Data.customer.notes.some((n: any) => n.id === data.note.id));
});

test('4. POST /api/admin/entitlements/grant grants PLUS feature entitlement and updates tier', async () => {
  const res = await fetch(`${baseUrl}/api/admin/entitlements/grant`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ownerSessionToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: testCustomerId,
      featureKey: 'PLUS',
      durationDays: 30,
      source: 'ADMIN_GRANT',
      reason: 'Complimentary 30-day VIP trial grant by Platform Owner'
    })
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.entitlement.featureKey, 'PLUS');
  assert.equal(data.entitlement.source, 'ADMIN_GRANT');
  assert.equal(data.entitlement.isActive, true);

  // Check user subscriptionTier upgraded to PLUS
  const user = await db.findUserById(testCustomerId);
  assert.equal(user?.subscriptionTier, 'PLUS');
  assert.equal(user?.subscriptionStatus, 'ACTIVE');
  assert.ok(user?.subscriptionExpiresAt);
});

test('5. POST /api/admin/entitlements/revoke revokes entitlement and recalculates tier', async () => {
  // First list entitlements
  const listRes = await fetch(`${baseUrl}/api/admin/entitlements?userId=${testCustomerId}`, {
    headers: { Authorization: `Bearer ${ownerSessionToken}` }
  });
  const listData = await listRes.json();
  assert.ok(listData.entitlements.length > 0);
  const entId = listData.entitlements[0].id;

  const revokeRes = await fetch(`${baseUrl}/api/admin/entitlements/revoke`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ownerSessionToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      entitlementId: entId,
      reason: 'Testing admin revocation'
    })
  });

  assert.equal(revokeRes.status, 200);
  const revokeData = await revokeRes.json();
  assert.equal(revokeData.success, true);
  assert.equal(revokeData.entitlement.isActive, false);

  // Check tier reverted to FREE
  const user = await db.findUserById(testCustomerId);
  assert.equal(user?.subscriptionTier, 'FREE');
});

test('6. POST /api/admin/subscriptions/assign directly assigns PREMIUM tier with duration', async () => {
  const res = await fetch(`${baseUrl}/api/admin/subscriptions/assign`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ownerSessionToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: testCustomerId,
      tier: 'PREMIUM',
      billingPeriod: 'ANNUAL',
      durationDays: 365,
      reason: 'Owner assigned annual Premium plan'
    })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.user.subscriptionTier, 'PREMIUM');
  assert.equal(data.user.subscriptionBillingPeriod, 'ANNUAL');
  assert.equal(data.user.subscriptionStatus, 'ACTIVE');
});

test('7. POST /api/admin/subscriptions/extend extends active subscription by 30 days', async () => {
  const userBefore = await db.findUserById(testCustomerId);
  const beforeExpiryMs = new Date(userBefore!.subscriptionExpiresAt!).getTime();

  const res = await fetch(`${baseUrl}/api/admin/subscriptions/extend`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ownerSessionToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: testCustomerId,
      additionalDays: 30,
      reason: 'Loyalty bonus extension'
    })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);

  const userAfter = await db.findUserById(testCustomerId);
  const afterExpiryMs = new Date(userAfter!.subscriptionExpiresAt!).getTime();
  assert.ok(afterExpiryMs > beforeExpiryMs);
  const daysDiff = Math.round((afterExpiryMs - beforeExpiryMs) / (86400000));
  assert.equal(daysDiff, 30);
});

test('8. GET /api/admin/analytics/overview returns accurate business KPIs and collections breakdown', async () => {
  const res = await fetch(`${baseUrl}/api/admin/analytics/overview`, {
    headers: { Authorization: `Bearer ${ownerSessionToken}` }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.summary.totalGrossCollectionsRupees > 0);
  assert.ok(data.summary.totalRegisteredUsers >= 2);
  assert.ok(data.summary.activeSubscribers >= 1);
  assert.ok(Array.isArray(data.recentPaidOrders));
});

test('9. Promotions Management: List, create, and toggle status', async () => {
  // List promotions
  const listRes = await fetch(`${baseUrl}/api/admin/promotions`, {
    headers: { Authorization: `Bearer ${ownerSessionToken}` }
  });
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.equal(listData.success, true);
  assert.ok(listData.promotions.length >= 1);

  // Create new promotion
  const promoCode = 'TESTPROMO_' + Date.now();
  const createRes = await fetch(`${baseUrl}/api/admin/promotions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ownerSessionToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      code: promoCode,
      description: 'Test ₹50 discount coupon',
      discountType: 'FLAT_DISCOUNT',
      discountValue: 50,
      applicableTo: 'REPORTS',
      minOrderAmount: 199,
      maxUses: 100
    })
  });
  assert.equal(createRes.status, 201);
  const createData = await createRes.json();
  assert.equal(createData.success, true);
  assert.equal(createData.promotion.code, promoCode);

  // Toggle promotion status to inactive
  const toggleRes = await fetch(`${baseUrl}/api/admin/promotions/${createData.promotion.id}/status`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${ownerSessionToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ isActive: false })
  });
  assert.equal(toggleRes.status, 200);
  const toggleData = await toggleRes.json();
  assert.equal(toggleData.promotion.isActive, false);
});

test('10. Astrologers & Consultations APIs return valid data and allow verification toggle', async () => {
  // List astrologers
  const astroRes = await fetch(`${baseUrl}/api/admin/astrologers`, {
    headers: { Authorization: `Bearer ${ownerSessionToken}` }
  });
  assert.equal(astroRes.status, 200);
  const astroData = await astroRes.json();
  assert.equal(astroData.success, true);
  assert.ok(astroData.astrologers.length >= 1);
  const firstAstro = astroData.astrologers[0];

  // Toggle astrologer verification
  const verifyRes = await fetch(`${baseUrl}/api/admin/astrologers/${firstAstro.id}/verify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ownerSessionToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ isVerified: true })
  });
  assert.equal(verifyRes.status, 200);
  const verifyData = await verifyRes.json();
  assert.equal(verifyData.success, true);
  assert.equal(verifyData.astrologer.isVerified, true);

  // List consultations
  const consultRes = await fetch(`${baseUrl}/api/admin/consultations`, {
    headers: { Authorization: `Bearer ${ownerSessionToken}` }
  });
  assert.equal(consultRes.status, 200);
  const consultData = await consultRes.json();
  assert.equal(consultData.success, true);
  assert.ok(Array.isArray(consultData.sessions));
});
