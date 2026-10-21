process.env.NODE_ENV = 'test';
import assert from 'assert';
import http from 'http';
import app from '../src/server';
import { db, Role, AccountStatus } from '../src/db';
import { generateTestPaymentSignature } from '../src/razorpay';

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

    // 8. Strict Birth Profile CRUD & Ownership Security
    await test('POST /api/profiles rejects unauthenticated request with HTTP 401', async () => {
      const res = await request('/api/profiles', {
        method: 'POST',
        body: {
          profileName: 'Unauthenticated Profile',
          relationship: 'Self',
          dateOfBirth: '1990-05-15',
          timeOfBirth: '14:30',
          birthplaceName: 'Varanasi',
          latitude: 25.3176,
          longitude: 82.9739
        }
      });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.data.error, 'UNAUTHORIZED');
    });

    await test('POST /api/profiles rejects invalid/expired token with HTTP 401', async () => {
      const res = await request('/api/profiles', {
        method: 'POST',
        headers: { Authorization: 'Bearer bad_expired_token_12345' },
        body: {
          profileName: 'Invalid Token Profile',
          relationship: 'Self',
          dateOfBirth: '1990-05-15',
          timeOfBirth: '14:30',
          birthplaceName: 'Varanasi',
          latitude: 25.3176,
          longitude: 82.9739
        }
      });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.data.error, 'INVALID_OR_EXPIRED_SESSION');
    });

    await test('Birth Profile creation rejects payload with missing required fields', async () => {
      const res = await request('/api/profiles', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
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
    await test('Birth Profile creation succeeds with valid complete payload deriving owner ID from session', async () => {
      const res = await request('/api/profiles', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
        body: {
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

    await test('Idempotency & Concurrent Retries: duplicate creation returns existing profile', async () => {
      const payload = {
        profileName: 'Amitabh Sharma',
        relationship: 'Self',
        dateOfBirth: '1990-05-15',
        timeOfBirth: '14:30',
        birthplaceName: 'Varanasi, Uttar Pradesh, India',
        latitude: 25.3176,
        longitude: 82.9739
      };
      // Concurrent execution simulating network retries
      const [r1, r2] = await Promise.all([
        request('/api/profiles', { method: 'POST', headers: { Authorization: `Bearer ${sessionToken}` }, body: payload }),
        request('/api/profiles', { method: 'POST', headers: { Authorization: `Bearer ${sessionToken}` }, body: payload })
      ]);
      assert.strictEqual(r1.status, 200);
      assert.strictEqual(r2.status, 200);
      assert.strictEqual(r1.data.id, profileId);
      assert.strictEqual(r2.data.id, profileId);
    });

    await test('GET /api/profiles/:userId retrieves persisted birth profiles', async () => {
      const res = await request(`/api/profiles/${userId}`, {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.data));
      assert.strictEqual(res.data.length, 1);
      assert.strictEqual(res.data[0].id, profileId);
    });

    // 8.1 Password Authentication Test Suite
    const pwdEmail = `astro_pwd_${Date.now()}@example.com`;
    const strongPassword = 'VedicPass2026!';
    let pwdToken = '';
    let pwdUserId = '';

    await test('POST /api/auth/register-password rejects weak passwords', async () => {
      const res = await request('/api/auth/register-password', {
        method: 'POST',
        body: { email: pwdEmail, password: 'short' }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.error, 'WEAK_PASSWORD');
    });

    await test('POST /api/auth/register-password registers user and returns session', async () => {
      const res = await request('/api/auth/register-password', {
        method: 'POST',
        body: { email: pwdEmail, password: strongPassword, displayName: 'Password User' }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'AUTHENTICATED');
      assert.strictEqual(res.data.user.email, pwdEmail);
      assert.strictEqual(res.data.user.passwordHash, undefined); // Never leaked to client
      assert.strictEqual(typeof res.data.sessionToken, 'string');
      pwdToken = res.data.sessionToken;
      pwdUserId = res.data.user.id;
    });

    await test('POST /api/auth/login-password rejects incorrect password', async () => {
      const res = await request('/api/auth/login-password', {
        method: 'POST',
        body: { identifier: pwdEmail, password: 'WrongPassword123' }
      });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.data.error, 'INVALID_CREDENTIALS');
    });

    await test('POST /api/auth/login-password authenticates valid credentials', async () => {
      const res = await request('/api/auth/login-password', {
        method: 'POST',
        body: { identifier: pwdEmail, password: strongPassword }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'AUTHENTICATED');
      assert.strictEqual(res.data.user.id, pwdUserId);
      assert.strictEqual(typeof res.data.sessionToken, 'string');
    });

    // 8.2 Password Reset Flow
    let resetCode = '';
    await test('POST /api/auth/forgot-password issues reset code for registered account', async () => {
      const res = await request('/api/auth/forgot-password', {
        method: 'POST',
        body: { identifier: pwdEmail }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'RESET_CODE_SENT');
      assert.strictEqual(typeof res.data.devResetCode, 'string');
      resetCode = res.data.devResetCode;
    });

    await test('POST /api/auth/reset-password resets password and allows login with new password', async () => {
      const newPassword = 'NewSecret2026!';
      const res = await request('/api/auth/reset-password', {
        method: 'POST',
        body: { identifier: pwdEmail, resetCode, newPassword }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'PASSWORD_RESET_SUCCESS');

      // Login with new password
      const loginRes = await request('/api/auth/login-password', {
        method: 'POST',
        body: { identifier: pwdEmail, password: newPassword }
      });
      assert.strictEqual(loginRes.status, 200);
      assert.strictEqual(loginRes.data.status, 'AUTHENTICATED');
      pwdToken = loginRes.data.sessionToken;
    });

    // 8.3 Tenant Isolation & Authorization (BOLA/IDOR Defense)
    await test('User A cannot create a profile under User B account (HTTP 403 Forbidden)', async () => {
      // pwdUser attempts to create a profile under original test user's account
      const res = await request('/api/profiles', {
        method: 'POST',
        headers: { Authorization: `Bearer ${pwdToken}` },
        body: {
          userId: userId, // Target user B's id
          profileName: 'Illegitimate Cross-User Profile',
          relationship: 'Friend',
          dateOfBirth: '1992-08-10',
          timeOfBirth: '09:15',
          birthplaceName: 'Mumbai',
          latitude: 19.0760,
          longitude: 72.8777
        }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error, 'FORBIDDEN');
    });

    await test('User A cannot retrieve User B birth profiles (HTTP 403 Forbidden)', async () => {
      // pwdUser attempts to access original test user's profiles
      const res = await request(`/api/profiles/${userId}`, {
        headers: { Authorization: `Bearer ${pwdToken}` }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error, 'FORBIDDEN');
    });

    await test('User A cannot retrieve User B saved reports (HTTP 403 Forbidden)', async () => {
      const res = await request(`/api/reports/${userId}`, {
        headers: { Authorization: `Bearer ${pwdToken}` }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error, 'FORBIDDEN');
    });

    let savedReportId = '';
    await test('User can save a multi-horizon structured prediction report', async () => {
      const res = await request('/api/reports/save', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
        body: {
          title: 'Hourly Personal Guidance: Jupiter Hora',
          reportType: 'PREDICTION_HOURLY',
          payload: {
            report_title: 'Hourly Personal Guidance: Jupiter Hora',
            time_horizon: 'hourly',
            sections: {
              overall_outlook: 'Favorable strategic window for analytical execution.',
              supportive_developments: ['High focus for negotiations'],
              challenges_and_cautions: ['Avoid hasty speech'],
              relevant_time_windows: ['Active interval: Jupiter Hora'],
              why_this_applies: 'Grounded in Aries Lagna and Jupiter Mahadasha.',
              practical_reflection: 'Focus on high-leverage execution.',
              limitations: 'Qualitative guidance only.'
            }
          }
        }
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.id);
      assert.strictEqual(res.data.userId, userId);
      savedReportId = res.data.id;
    });

    await test('User can fetch their saved report by ID', async () => {
      const res = await request(`/api/reports/detail/${savedReportId}`, {
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.id, savedReportId);
      assert.strictEqual(res.data.reportType, 'PREDICTION_HOURLY');
    });

    await test('User A cannot fetch User B saved report by ID (HTTP 403 Forbidden)', async () => {
      const res = await request(`/api/reports/detail/${savedReportId}`, {
        headers: { Authorization: `Bearer ${pwdToken}` }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error, 'FORBIDDEN');
    });

    await test('User can delete their own saved report', async () => {
      const res = await request(`/api/reports/${savedReportId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionToken}` }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'DELETED');
    });

    await test('Unauthenticated profile request is rejected with HTTP 401', async () => {
      const res = await request(`/api/profiles/${userId}`);
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.data.error, 'UNAUTHORIZED');
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

    // Super Admin authorized cross-account profile creation
    let adminCreatedProfileId = '';
    await test('Super Admin can create a profile under another user account', async () => {
      const res = await request('/api/profiles', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          userId: userId, // Target user
          profileName: 'Admin Managed Profile',
          relationship: 'Client',
          dateOfBirth: '1985-04-20',
          timeOfBirth: '11:00',
          birthplaceName: 'Jaipur',
          latitude: 26.9124,
          longitude: 75.7873
        }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.userId, userId);
      assert.strictEqual(res.data.profileName, 'Admin Managed Profile');
      adminCreatedProfileId = res.data.id;
    });

    // 11. Cleanup test birth profiles (Super Admin authority)
    await test('DELETE /api/profiles/:id deletes birth profile', async () => {
      const res = await request(`/api/profiles/${profileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'DELETED');
    });

    if (adminCreatedProfileId) {
      await test('DELETE /api/profiles/:id deletes admin-created birth profile', async () => {
        const res = await request(`/api/profiles/${adminCreatedProfileId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.status, 'DELETED');
      });
    }

    // 12. Security & Log Redaction Regression Test (Blocker 2)
    await test('Security: Production log redaction never exposes OTP or password reset tokens', async () => {
      const capturedLogs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        capturedLogs.push(args.map(a => String(a)).join(' '));
      };

      try {
        const testIdent = `sec_audit_${Date.now()}@example.com`;
        const otpRes = await request('/api/auth/request-otp', {
          method: 'POST',
          body: { identifier: testIdent }
        });
        assert.strictEqual(otpRes.status, 200);
        const secretOtp = String(otpRes.data.devPreviewOtp);
        assert.ok(secretOtp && secretOtp.length === 6, 'Expected 6-digit test preview OTP');

        const combinedLogs = capturedLogs.join('\n');
        // Assert secret OTP is NOT in any log line
        assert.ok(!combinedLogs.includes(secretOtp), `Security breach: Log contains raw OTP: ${secretOtp}`);
        // Assert raw full identifier is masked in logs
        assert.ok(!combinedLogs.includes(testIdent), `Privacy breach: Log contains unmasked identifier: ${testIdent}`);
        // Assert masked format present in logs
        assert.ok(combinedLogs.includes('@example.com'), 'Expected masked identifier format in log output');
      } finally {
        console.log = originalLog;
      }
    });

    // ===============================================================
    // 13. FINANCIAL INTEGRITY, PAYMENT GATEWAY & CONSULTATION TESTS
    // ===============================================================

    // Setup fresh buyer user and attacker user
    const buyerEmail = `buyer_${Date.now()}@example.com`;
    const buyerOtpRes = await request('/api/auth/request-otp', { method: 'POST', body: { identifier: buyerEmail } });
    const buyerAuth = await request('/api/auth/verify-otp', {
      method: 'POST',
      body: { identifier: buyerEmail, otp: buyerOtpRes.data.devPreviewOtp }
    });
    const buyerToken = buyerAuth.data.sessionToken;
    const buyerId = buyerAuth.data.user.id;

    const attackerEmail = `attacker_${Date.now()}@example.com`;
    const attackerOtpRes = await request('/api/auth/request-otp', { method: 'POST', body: { identifier: attackerEmail } });
    const attackerAuth = await request('/api/auth/verify-otp', {
      method: 'POST',
      body: { identifier: attackerEmail, otp: attackerOtpRes.data.devPreviewOtp }
    });
    const attackerToken = attackerAuth.data.sessionToken;
    const attackerId = attackerAuth.data.user.id;

    // A. Order Creation Tests
    await test('POST /api/wallet/create-order rejects unauthenticated request with HTTP 401', async () => {
      const res = await request('/api/wallet/create-order', {
        method: 'POST',
        body: { amount: 500 }
      });
      assert.strictEqual(res.status, 401);
    });

    await test('POST /api/wallet/create-order rejects cross-user order creation with HTTP 403', async () => {
      const res = await request('/api/wallet/create-order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${attackerToken}` },
        body: { userId: buyerId, amount: 500 }
      });
      assert.strictEqual(res.status, 403);
    });

    await test('POST /api/wallet/create-order rejects zero, negative, non-finite, and out-of-range amounts', async () => {
      const invalidAmounts = [0, -100, NaN, Infinity, 25, 60000, 100.555, 'not-a-number'];
      for (const amt of invalidAmounts) {
        const res = await request('/api/wallet/create-order', {
          method: 'POST',
          headers: { Authorization: `Bearer ${buyerToken}` },
          body: { amount: amt }
        });
        assert.strictEqual(res.status, 400, `Expected 400 for amount ${amt}, got ${res.status}`);
      }
    });

    let validOrderId = '';
    const rechargeAmount = 500;
    await test('POST /api/wallet/create-order succeeds for authenticated user and persists pending order', async () => {
      const res = await request('/api/wallet/create-order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${buyerToken}` },
        body: { amount: rechargeAmount }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.amount, rechargeAmount);
      assert.strictEqual(res.data.currency, 'INR');
      assert.ok(res.data.orderId.startsWith('order_test_') || res.data.orderId.startsWith('order_'));
      validOrderId = res.data.orderId;

      // Verify order is persisted in db
      const persisted = db.findPaymentOrderByRazorpayId(validOrderId);
      assert.ok(persisted);
      assert.strictEqual(persisted.userId, buyerId);
      assert.strictEqual(persisted.amount, rechargeAmount);
      assert.strictEqual(persisted.status, 'CREATED');
    });

    // B. Payment Verification Tests
    await test('POST /api/wallet/verify-payment rejects unauthenticated request with HTTP 401', async () => {
      const res = await request('/api/wallet/verify-payment', {
        method: 'POST',
        body: { orderId: validOrderId, paymentId: 'pay_test_123', signature: 'sig' }
      });
      assert.strictEqual(res.status, 401);
    });

    await test('POST /api/wallet/verify-payment rejects non-existent order with HTTP 404', async () => {
      const res = await request('/api/wallet/verify-payment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${buyerToken}` },
        body: { orderId: 'order_non_existent_99999', paymentId: 'pay_test_123', signature: 'sig' }
      });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.data.error, 'ORDER_NOT_FOUND');
    });

    await test('POST /api/wallet/verify-payment rejects cross-user order verification with HTTP 403', async () => {
      const fakePaymentId = 'pay_test_attacker_001';
      const fakeSig = generateTestPaymentSignature(validOrderId, fakePaymentId);
      const res = await request('/api/wallet/verify-payment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${attackerToken}` },
        body: { orderId: validOrderId, paymentId: fakePaymentId, signature: fakeSig }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error, 'FORBIDDEN');
    });

    await test('POST /api/wallet/verify-payment rejects invalid or forged cryptographic signature with HTTP 400', async () => {
      const fakePaymentId = 'pay_test_buyer_001';
      const forgedSig = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const res = await request('/api/wallet/verify-payment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${buyerToken}` },
        body: { orderId: validOrderId, paymentId: fakePaymentId, signature: forgedSig }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.error, 'INVALID_PAYMENT_SIGNATURE');
    });

    const realPaymentId = `pay_rzp_${Date.now()}_test`;
    await test('POST /api/wallet/verify-payment verifies authentic payment, credits wallet balance, and creates ledger entry', async () => {
      const validSig = generateTestPaymentSignature(validOrderId, realPaymentId);
      const res = await request('/api/wallet/verify-payment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${buyerToken}` },
        body: { orderId: validOrderId, paymentId: realPaymentId, signature: validSig }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'SUCCESS');
      assert.strictEqual(res.data.newBalance, rechargeAmount);

      // Verify DB record
      const buyerRecord = await db.findUserById(buyerId);
      assert.strictEqual(buyerRecord?.walletBalance, rechargeAmount);

      const orderRecord = db.findPaymentOrderByRazorpayId(validOrderId);
      assert.strictEqual(orderRecord?.status, 'PAID');
      assert.strictEqual(orderRecord?.razorpayPaymentId, realPaymentId);
    });

    await test('POST /api/wallet/verify-payment is idempotent: duplicate payment callback returns existing balance without double-crediting', async () => {
      const validSig = generateTestPaymentSignature(validOrderId, realPaymentId);
      const res = await request('/api/wallet/verify-payment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${buyerToken}` },
        body: { orderId: validOrderId, paymentId: realPaymentId, signature: validSig }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.newBalance, rechargeAmount); // Still 500, NOT 1000!
      assert.strictEqual(res.data.alreadySettled, true);

      const buyerRecord = await db.findUserById(buyerId);
      assert.strictEqual(buyerRecord?.walletBalance, rechargeAmount);
    });

    await test('POST /api/wallet/verify-payment rejects reusing same payment identifier on a different order with HTTP 409', async () => {
      // Create second order for buyer
      const secondOrderRes = await request('/api/wallet/create-order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${buyerToken}` },
        body: { amount: 200 }
      });
      assert.strictEqual(secondOrderRes.status, 200);
      const secondOrderId = secondOrderRes.data.orderId;

      // Try to verify second order with already-used realPaymentId
      const sig = generateTestPaymentSignature(secondOrderId, realPaymentId);
      const res = await request('/api/wallet/verify-payment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${buyerToken}` },
        body: { orderId: secondOrderId, paymentId: realPaymentId, signature: sig }
      });
      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.data.error, 'DUPLICATE_PAYMENT');
    });

    // C. Wallet Statements & Privacy
    await test('GET /api/wallet/:userId rejects unauthenticated request with HTTP 401', async () => {
      const res = await request(`/api/wallet/${buyerId}`);
      assert.strictEqual(res.status, 401);
    });

    await test('GET /api/wallet/:userId rejects cross-user statement access with HTTP 403', async () => {
      const res = await request(`/api/wallet/${buyerId}`, {
        headers: { Authorization: `Bearer ${attackerToken}` }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error, 'FORBIDDEN');
    });

    await test('GET /api/wallet/me returns authenticated user wallet statement and balance', async () => {
      const res = await request('/api/wallet/me', {
        headers: { Authorization: `Bearer ${buyerToken}` }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.balance, rechargeAmount);
      assert.ok(Array.isArray(res.data.statement));
      assert.ok(res.data.statement.some((l: any) => l.referenceId === realPaymentId && l.amount === rechargeAmount));
    });

    await test('Super Admin can inspect user wallet statement via GET /api/wallet/:userId', async () => {
      const res = await request(`/api/wallet/${buyerId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.balance, rechargeAmount);
      assert.ok(Array.isArray(res.data.statement));
    });

    // D. Consultation Settlement Tests
    const sessionId = `test_consult_${Date.now()}`;
    const deduction = 150;

    await test('POST /api/wallet/settle-consultation rejects unauthenticated request with HTTP 401', async () => {
      const res = await request('/api/wallet/settle-consultation', {
        method: 'POST',
        body: { astrologerId: 'astro_001', sessionId, totalDeduction: deduction }
      });
      assert.strictEqual(res.status, 401);
    });

    await test('POST /api/wallet/settle-consultation rejects cross-user settlement attempt with HTTP 403', async () => {
      const res = await request('/api/wallet/settle-consultation', {
        method: 'POST',
        headers: { Authorization: `Bearer ${attackerToken}` },
        body: { userId: buyerId, astrologerId: 'astro_001', sessionId, totalDeduction: deduction }
      });
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.data.error, 'FORBIDDEN');
    });

    await test('POST /api/wallet/settle-consultation rejects non-existent astrologer with HTTP 404', async () => {
      const res = await request('/api/wallet/settle-consultation', {
        method: 'POST',
        headers: { Authorization: `Bearer ${buyerToken}` },
        body: { astrologerId: 'astro_fake_999', sessionId, totalDeduction: deduction }
      });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.data.error, 'ASTROLOGER_NOT_FOUND');
    });

    await test('POST /api/wallet/settle-consultation rejects zero or negative deduction with HTTP 400', async () => {
      const invalidDeductions = [0, -50, -1000, NaN, Infinity];
      for (const d of invalidDeductions) {
        const res = await request('/api/wallet/settle-consultation', {
          method: 'POST',
          headers: { Authorization: `Bearer ${buyerToken}` },
          body: { astrologerId: 'astro_001', sessionId: `${sessionId}_inv`, totalDeduction: d }
        });
        assert.strictEqual(res.status, 400);
      }
    });

    await test('POST /api/wallet/settle-consultation rejects deduction exceeding user balance with HTTP 400 INSUFFICIENT_FUNDS', async () => {
      const excessiveDeduction = rechargeAmount + 5000;
      const res = await request('/api/wallet/settle-consultation', {
        method: 'POST',
        headers: { Authorization: `Bearer ${buyerToken}` },
        body: { astrologerId: 'astro_001', sessionId: `${sessionId}_insuf`, totalDeduction: excessiveDeduction }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.error, 'INSUFFICIENT_FUNDS');
      assert.strictEqual(res.data.currentBalance, rechargeAmount);
    });

    await test('POST /api/wallet/settle-consultation successfully deducts user balance, credits astrologer payout, and records dual ledger entries', async () => {
      const res = await request('/api/wallet/settle-consultation', {
        method: 'POST',
        headers: { Authorization: `Bearer ${buyerToken}` },
        body: { astrologerId: 'astro_001', sessionId, totalDeduction: deduction }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'SETTLED');
      assert.strictEqual(res.data.totalDeduction, deduction);
      assert.strictEqual(res.data.astroShare, 90); // 60% of 150 = 90
      assert.strictEqual(res.data.platformShare, 60); // 40% of 150 = 60
      assert.strictEqual(res.data.newBalance, rechargeAmount - deduction); // 500 - 150 = 350

      const buyerRecord = await db.findUserById(buyerId);
      assert.strictEqual(buyerRecord?.walletBalance, 350);

      const astroRecord = await db.findAstrologerById('astro_001');
      assert.ok(astroRecord && astroRecord.pendingPayout >= 90);
    });

    await test('POST /api/wallet/settle-consultation is idempotent: duplicate session settlement returns existing record without double-deduction', async () => {
      const res = await request('/api/wallet/settle-consultation', {
        method: 'POST',
        headers: { Authorization: `Bearer ${buyerToken}` },
        body: { astrologerId: 'astro_001', sessionId, totalDeduction: deduction }
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.alreadySettled, true);
      assert.strictEqual(res.data.newBalance, 350); // Still 350, NOT 200!

      const buyerRecord = await db.findUserById(buyerId);
      assert.strictEqual(buyerRecord?.walletBalance, 350);
    });

    // ===============================================================
    // 14. PRODUCTION PERSISTENCE & DEPRECATED ENDPOINT SAFEGUARDS
    // ===============================================================

    await test('POST /api/wallet/recharge rejects unauthenticated requests with HTTP 401', async () => {
      const res = await request('/api/wallet/recharge', {
        method: 'POST',
        body: { amount: 100 }
      });
      assert.strictEqual(res.status, 401);
    });

    await test('POST /api/wallet/recharge blocks direct balance inflation with HTTP 400 DEPRECATED_ENDPOINT', async () => {
      const res = await request('/api/wallet/recharge', {
        method: 'POST',
        headers: { Authorization: `Bearer ${buyerToken}` },
        body: { amount: 500 }
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.data.error, 'DEPRECATED_ENDPOINT');
      assert.ok(res.data.message.includes('create-order'));
    });

    await test('GET /api/ready reports server readiness and persistence mode', async () => {
      const res = await request('/api/ready');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'READY');
      assert.ok(res.data.persistence);
    });

    await test('GET /api/health exposes persistence status and durability metadata', async () => {
      const res = await request('/api/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'ONLINE');
      assert.ok(res.data.persistence);
      assert.strictEqual(typeof res.data.persistence.durable, 'boolean');
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
