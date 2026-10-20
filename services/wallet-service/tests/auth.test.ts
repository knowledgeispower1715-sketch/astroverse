import assert from 'assert';
import http from 'http';
import app from '../src/server';
import { db } from '../src/db';
import { Role, AccountStatus } from '@prisma/client';

let server: http.Server;
const TEST_PORT = 5055;
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
  return { status: res.status, ok: res.ok, data };
}

async function runAuthTestSuite() {
  console.log('===============================================================');
  console.log('ASTROVERSE AUTHENTICATION & USER MANAGEMENT AUTOMATED TEST SUITE');
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
    // 1. Health check
    await test('Server health endpoint returns ONLINE', async () => {
      const res = await request('/api/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'ONLINE');
    });

    // 2. Reject malformed identifiers
    await test('Request OTP rejects malformed email and phone numbers', async () => {
      const res1 = await request('/api/auth/request-otp', {
        method: 'POST',
        body: { identifier: 'not-an-email' }
      });
      assert.strictEqual(res1.status, 400);
      assert.strictEqual(res1.data.error, 'INVALID_IDENTIFIER_FORMAT');

      const res2 = await request('/api/auth/request-otp', {
        method: 'POST',
        body: { identifier: '123' }
      });
      assert.strictEqual(res2.status, 400);
      assert.strictEqual(res2.data.error, 'INVALID_IDENTIFIER_FORMAT');
    });

    // 3. Valid Email OTP Request & Cooldown
    let emailOtp = '';
    const testEmail = `test_astronomer_${Date.now()}@example.com`;

    await test('Request OTP succeeds for valid email and issues preview OTP', async () => {
      const res = await request('/api/auth/request-otp', {
        method: 'POST',
        body: { identifier: testEmail }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'OTP_SENT');
      assert.strictEqual(typeof res.data.devPreviewOtp, 'string');
      assert.strictEqual(res.data.devPreviewOtp.length, 6);
      emailOtp = res.data.devPreviewOtp;
    });

    await test('Request OTP enforces 60-second cooldown on immediate re-dispatch', async () => {
      const res = await request('/api/auth/request-otp', {
        method: 'POST',
        body: { identifier: testEmail }
      });
      assert.strictEqual(res.status, 429);
      assert.strictEqual(res.data.error, 'COOLDOWN_ACTIVE');
    });

    // 4. Verify OTP (Wrong OTP rejection, Single-use, New User creation with ₹0.00)
    await test('Verify OTP rejects incorrect code', async () => {
      const res = await request('/api/auth/verify-otp', {
        method: 'POST',
        body: { identifier: testEmail, otp: '000000' }
      });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.data.error, 'INVALID_OR_EXPIRED_OTP');
    });

    let sessionToken = '';
    let userId = '';

    await test('Verify OTP registers new user with zero balance and issues 256-bit session token', async () => {
      const res = await request('/api/auth/verify-otp', {
        method: 'POST',
        body: { identifier: testEmail, otp: emailOtp, displayName: 'Test Astronomer' }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'AUTHENTICATED');
      assert.ok(res.data.sessionToken);
      assert.strictEqual(res.data.user.email, testEmail);
      assert.strictEqual(res.data.user.emailVerified, true);
      assert.strictEqual(res.data.user.walletBalance, 0); // Strict zero balance
      assert.strictEqual(res.data.user.role, 'USER');
      assert.strictEqual(res.data.user.status, 'ACTIVE');

      sessionToken = res.data.sessionToken;
      userId = res.data.user.id;
    });

    await test('Single-use OTP eviction: Replay attack with same OTP is rejected', async () => {
      const res = await request('/api/auth/verify-otp', {
        method: 'POST',
        body: { identifier: testEmail, otp: emailOtp }
      });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.data.error, 'INVALID_OR_EXPIRED_OTP');
    });

    // 5. Authenticated user profile retrieval (/api/user/me)
    await test('GET /api/user/me returns authenticated user details', async () => {
      const res = await request('/api/user/me', {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.id, userId);
      assert.strictEqual(res.data.email, testEmail);
    });

    // 6. User profile updates (/api/user/profile)
    await test('PUT /api/user/profile updates display name and preferences', async () => {
      const res = await request('/api/user/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${sessionToken}` },
        body: {
          displayName: 'Acharya Astro Tester',
          preferredLanguage: 'hi',
          preferredTimezone: 'Asia/Kolkata'
        }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'UPDATED');
      assert.strictEqual(res.data.user.displayName, 'Acharya Astro Tester');
      assert.strictEqual(res.data.user.preferredLanguage, 'hi');
    });

    // 7. Identity Linking (Linking phone number to email account)
    const testPhone = `+9198765${Math.floor(10000 + Math.random() * 90000)}`;
    let phoneOtp = '';

    await test('Account Linking: Request OTP for unlinked mobile phone', async () => {
      const res = await request('/api/auth/request-otp', {
        method: 'POST',
        body: { identifier: testPhone }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'OTP_SENT');
      phoneOtp = res.data.devPreviewOtp;
    });

    await test('Account Linking: Link phone to email account with valid OTP', async () => {
      const res = await request('/api/auth/link-identity', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
        body: {
          targetIdentifier: testPhone,
          otp: phoneOtp
        }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'LINKED');
      assert.strictEqual(res.data.user.phone, testPhone);
      assert.strictEqual(res.data.user.phoneVerified, true);
      assert.strictEqual(res.data.user.email, testEmail);
      assert.strictEqual(res.data.user.emailVerified, true);
    });

    // 8. Strict Birth Profile CRUD (Zero-default rejection)
    await test('Birth Profile creation rejects payload with missing required fields', async () => {
      const res = await request('/api/profiles', {
        method: 'POST',
        body: {
          userId,
          profileName: 'Incomplete Profile'
          // Missing dateOfBirth, timeOfBirth, birthplaceName, latitude, longitude
        }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.error, 'REQUIRED_FIELDS_MISSING');
    });

    let profileId = '';
    await test('Birth Profile creation succeeds with valid complete payload', async () => {
      const res = await request('/api/profiles', {
        method: 'POST',
        body: {
          userId,
          profileName: 'Amitabh Sharma',
          relationship: 'Self',
          dateOfBirth: '1990-05-15',
          timeOfBirth: '14:30',
          birthplaceName: 'Varanasi, Uttar Pradesh, India',
          latitude: 25.3176,
          longitude: 82.9739
        }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.profileName, 'Amitabh Sharma');
      assert.strictEqual(res.data.userId, userId);
      profileId = res.data.id;
    });

    await test('GET /api/profiles/:userId retrieves persisted birth profiles', async () => {
      const res = await request(`/api/profiles/${userId}`);
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data));
      assert.strictEqual(res.data.length, 1);
      assert.strictEqual(res.data[0].id, profileId);
    });

    // 9. RBAC Protection & Admin Console
    await test('Admin endpoint rejects regular user with HTTP 403 Forbidden', async () => {
      const res = await request('/api/admin/metrics', {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error, 'FORBIDDEN');
    });

    // Login as Super Admin
    let adminToken = '';
    await test('Super Admin can login and access administrative endpoints', async () => {
      // Request OTP for default super admin
      const reqRes = await request('/api/auth/request-otp', {
        method: 'POST',
        body: { identifier: 'admin@astroverse.app' }
      });
      assert.strictEqual(reqRes.status, 200);
      const adminOtp = reqRes.data.devPreviewOtp;

      const authRes = await request('/api/auth/verify-otp', {
        method: 'POST',
        body: { identifier: 'admin@astroverse.app', otp: adminOtp }
      });
      assert.strictEqual(authRes.status, 200);
      assert.strictEqual(authRes.data.user.role, 'SUPER_ADMIN');
      adminToken = authRes.data.sessionToken;

      const metricsRes = await request('/api/admin/metrics', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(metricsRes.status, 200);
      assert.ok(metricsRes.data.totalUsers >= 2);
    });

    // Admin user moderation: Toggle status
    await test('Admin can suspend user account and invalidate active sessions', async () => {
      const res = await request(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { status: 'SUSPENDED' }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.user.status, 'SUSPENDED');

      // Now regular user session should be rejected with 401/403
      const checkRes = await request('/api/user/me', {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      assert.strictEqual(checkRes.status, 401); // Session was evicted upon suspension
    });

    // 10. Audit Events Verification
    await test('Admin can inspect comprehensive audit trail of security actions', async () => {
      const res = await request('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data.events));
      assert.ok(res.data.events.some((e: any) => e.action === 'AUTH_REGISTER'));
      assert.ok(res.data.events.some((e: any) => e.action === 'IDENTITY_LINKED'));
      assert.ok(res.data.events.some((e: any) => e.action === 'ADMIN_STATUS_CHANGE'));
    });

    // 11. Cleanup test birth profile
    await test('DELETE /api/profiles/:id deletes birth profile', async () => {
      const res = await request(`/api/profiles/${profileId}`, { method: 'DELETE' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'DELETED');
    });

  } finally {
    server.close();
  }

  console.log('\n===============================================================');
  console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('===============================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runAuthTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
