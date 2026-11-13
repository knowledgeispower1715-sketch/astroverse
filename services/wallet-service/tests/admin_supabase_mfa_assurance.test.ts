import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import crypto from 'crypto';
import app from '../src/server';
import { db, Role, AccountStatus } from '../src/db';
import {
  issueAdminAssuranceToken,
  verifyAdminAssuranceToken
} from '../src/security/mfa';
import {
  AdminPermission,
  ROLE_PERMISSIONS,
  isAnyAdmin
} from '../src/security/permissions';
import {
  setMockUserMfaFactorsProvider,
  clearMockUserMfaFactorsProvider
} from '../src/supabase';

function hashToken(t: string): string {
  return crypto.createHash('sha256').update(t).digest('hex');
}

let server: http.Server;
let port: number;
let baseUrl: string;

function makeRequest(
  method: string,
  urlPath: string,
  body: any = null,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...headers
    };
    if (payload) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(payload).toString();
    }

    const req = http.request(
      `${baseUrl}${urlPath}`,
      { method, headers: reqHeaders },
      (res) => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          let parsed: any = null;
          try {
            parsed = JSON.parse(raw);
          } catch (_) {
            parsed = raw;
          }
          resolve({ status: res.statusCode || 500, body: parsed, headers: res.headers });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

describe('PHASE 8 — ADMIN SUPABASE MFA & AAL2 ASSURANCE REGRESSION TEST SUITE', () => {
  let adminUser: any;
  let adminSessionToken: string;
  let consumerUser: any;
  let consumerSessionToken: string;

  before(async () => {
    process.env.NODE_ENV = 'test';
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = (server.address() as any).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    // Create test Admin User (tiwariji0028@gmail.com - Owner)
    adminUser = await db.findUserByEmail('tiwariji0028@gmail.com');
    if (!adminUser) {
      adminUser = await db.createUser({
        email: 'tiwariji0028@gmail.com',
        role: Role.OWNER,
        status: AccountStatus.ACTIVE,
        displayName: 'AstroVerse Owner'
      });
    }

    const rawAdminSession = crypto.randomBytes(32).toString('hex');
    adminSessionToken = rawAdminSession;
    await db.createSession({
      userId: adminUser.id,
      tokenHash: hashToken(rawAdminSession),
      expiresAt: new Date(Date.now() + 3600 * 1000)
    });

    // Create test Consumer User
    consumerUser = await db.createUser({
      email: 'consumer_mfa_test@example.com',
      role: Role.USER,
      status: AccountStatus.ACTIVE,
      displayName: 'Normal Consumer'
    });

    const rawConsumerSession = crypto.randomBytes(32).toString('hex');
    consumerSessionToken = rawConsumerSession;
    await db.createSession({
      userId: consumerUser.id,
      tokenHash: hashToken(rawConsumerSession),
      expiresAt: new Date(Date.now() + 3600 * 1000)
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('1. GET /api/admin/mfa/status unauthenticated returns HTTP 401', async () => {
    const res = await makeRequest('GET', '/api/admin/mfa/status');
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/admin/mfa/status as consumer (Role.USER) returns HTTP 403', async () => {
    const res = await makeRequest('GET', '/api/admin/mfa/status', null, {
      Authorization: `Bearer ${consumerSessionToken}`
    });
    assert.strictEqual(res.status, 403);
  });

  it('3. POST /api/auth/admin-supabase-session without Authorization header returns HTTP 401', async () => {
    const res = await makeRequest('POST', '/api/auth/admin-supabase-session', {});
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'UNAUTHORIZED');
  });

  it('4. POST /api/auth/admin-supabase-session with malformed JWT returns HTTP 401', async () => {
    const res = await makeRequest('POST', '/api/auth/admin-supabase-session', {}, {
      Authorization: 'Bearer invalid.token.value'
    });
    assert.strictEqual(res.status, 401);
  });

  it('5. POST /api/auth/admin-supabase-session with consumer user JWT (not admin) returns HTTP 403', async () => {
    const res = await makeRequest('POST', '/api/auth/admin-supabase-session', {}, {
      Authorization: 'Bearer test_supabase_token_user_consumer@example.com_c001'
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, 'ADMIN_NOT_AUTHORIZED');
  });

  it('6. POST /api/auth/admin-supabase-session with un-enrolled admin at AAL1 returns MFA_ENROLLMENT_REQUIRED', async () => {
    // tiwariji0028@gmail.com has no enrolled factors initially
    await db.updateUser(adminUser.id, { mfaEnabled: false });
    const res = await makeRequest('POST', '/api/auth/admin-supabase-session', {}, {
      Authorization: 'Bearer test_supabase_token_user_tiwariji0028@gmail.com_a001'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'MFA_ENROLLMENT_REQUIRED');
    assert.strictEqual(res.body.currentLevel, 'aal1');
  });

  it('7. POST /api/auth/admin-supabase-session with enrolled admin at AAL1 returns MFA_CHALLENGE_REQUIRED', async () => {
    // When admin user has verified factors
    setMockUserMfaFactorsProvider(async () => ({
      factors: [{ id: 'test_totp_factor_id', status: 'verified', factor_type: 'totp' }],
      error: null
    }));
    await db.updateUser(adminUser.id, { mfaEnabled: true });
    const res = await makeRequest('POST', '/api/auth/admin-supabase-session', {}, {
      Authorization: 'Bearer test_supabase_token_user_tiwariji0028@gmail.com_a001'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'MFA_CHALLENGE_REQUIRED');
    assert.strictEqual(res.body.nextLevel, 'aal2');
    clearMockUserMfaFactorsProvider();
  });

  it('8. POST /api/auth/admin-supabase-session with verified AAL2 JWT returns AUTHENTICATED with assuranceToken', async () => {
    const res = await makeRequest('POST', '/api/auth/admin-supabase-session', {}, {
      Authorization: 'Bearer test_supabase_token_user_tiwariji0028@gmail.com_a001_aal2'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'AUTHENTICATED');
    assert.ok(res.body.sessionToken);
    assert.ok(res.body.assuranceToken);
    assert.strictEqual(res.body.aal, 'aal2');
  });

  it('9. POST /api/auth/admin-supabase-session with action: ENROLLMENT_COMPLETED marks mfaEnabled: true', async () => {
    await db.updateUser(adminUser.id, { mfaEnabled: false });
    const res = await makeRequest('POST', '/api/auth/admin-supabase-session', {
      action: 'ENROLLMENT_COMPLETED'
    }, {
      Authorization: 'Bearer test_supabase_token_user_tiwariji0028@gmail.com_a001_aal2'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'AUTHENTICATED');
    assert.ok(res.body.sessionToken);

    const updatedUser = await db.findUserById(adminUser.id);
    assert.strictEqual(updatedUser?.mfaEnabled, true);
  });

  it('10. POST /api/admin/mfa/challenge-failed logs ADMIN_MFA_CHALLENGE_FAILED audit event', async () => {
    const res = await makeRequest('POST', '/api/admin/mfa/challenge-failed', {
      email: 'tiwariji0028@gmail.com',
      reason: 'Invalid 6-digit TOTP entered'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    const { events } = await db.listAuditEvents({ limit: 5 });
    const challengeFailedEvent = events.find((e: any) => e.action === 'ADMIN_MFA_CHALLENGE_FAILED');
    assert.ok(challengeFailedEvent);
    assert.strictEqual(challengeFailedEvent.outcome, 'FAILED');
  });

  it('11. POST /api/admin/mfa/enrollment-started logs ADMIN_MFA_ENROLLMENT_STARTED audit event', async () => {
    const res = await makeRequest('POST', '/api/admin/mfa/enrollment-started', {
      email: 'tiwariji0028@gmail.com'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    const { events } = await db.listAuditEvents({ limit: 5 });
    const enrollmentEvent = events.find((e: any) => e.action === 'ADMIN_MFA_ENROLLMENT_STARTED');
    assert.ok(enrollmentEvent);
  });

  it('12. POST /api/admin/mfa/enrollment-cancelled logs ADMIN_MFA_ENROLLMENT_CANCELLED audit event', async () => {
    const res = await makeRequest('POST', '/api/admin/mfa/enrollment-cancelled', {
      email: 'tiwariji0028@gmail.com'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    const { events } = await db.listAuditEvents({ limit: 5 });
    const cancelEvent = events.find((e: any) => e.action === 'ADMIN_MFA_ENROLLMENT_CANCELLED');
    assert.ok(cancelEvent);
    assert.strictEqual(cancelEvent.outcome, 'FAILED');
  });

  it('13. POST /api/admin/mfa/unenroll-audit unauthenticated returns HTTP 401', async () => {
    const res = await makeRequest('POST', '/api/admin/mfa/unenroll-audit', {});
    assert.strictEqual(res.status, 401);
  });

  it('14. POST /api/admin/mfa/unenroll-audit authenticated as Admin disables MFA and logs ADMIN_MFA_DISABLED', async () => {
    await db.updateUser(adminUser.id, { mfaEnabled: true });
    const res = await makeRequest('POST', '/api/admin/mfa/unenroll-audit', {}, {
      Authorization: `Bearer ${adminSessionToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    const userAfter = await db.findUserById(adminUser.id);
    assert.strictEqual(userAfter?.mfaEnabled, false);

    const { events } = await db.listAuditEvents({ limit: 5 });
    const disabledEvent = events.find((e: any) => e.action === 'ADMIN_MFA_DISABLED');
    assert.ok(disabledEvent);
  });

  it('15. requireAdminAssurance rejects sensitive requests without assurance token', async () => {
    // POST /api/admin/gateway-credentials requires requireAdminAssurance
    const res = await makeRequest('POST', '/api/admin/gateway-credentials', {
      secretKey: 'cfsk_ma_prod_testkeyfortesting00000',
      appId: '14962482c27cb93db2c6bc6e4af8426941',
      env: 'production'
    }, {
      Authorization: `Bearer ${adminSessionToken}`,
      'x-admin-require-mfa': 'true'
    });
    assert.ok(res.status === 428 || res.status === 403);
    assert.strictEqual(res.body.error, 'MFA_ASSURANCE_REQUIRED');
  });

  it('16. requireAdminAssurance accepts valid AAL2 assurance token', async () => {
    const assuranceToken = issueAdminAssuranceToken(adminUser.id, Role.OWNER, 'gateway:credentials');
    const res = await makeRequest('POST', '/api/admin/gateway-credentials', {
      secretKey: 'cfsk_ma_prod_validproductiontestkey12345678',
      appId: '14962482c27cb93db2c6bc6e4af8426941',
      env: 'production'
    }, {
      Authorization: `Bearer ${adminSessionToken}`,
      'x-admin-assurance-token': assuranceToken
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  it('17. requireAdminAssurance rejects expired assurance token', async () => {
    // Generate an expired assurance token
    const expiredPayload = {
      userId: adminUser.id,
      role: Role.OWNER,
      scope: 'gateway:credentials',
      iat: Math.floor(Date.now() / 1000) - 1000,
      exp: Math.floor(Date.now() / 1000) - 100 // Expired 100s ago
    };
    const secret = process.env.JWT_SECRET || 'astroverse_jwt_fallback_secret_production';
    const hmac = crypto.createHmac('sha256', secret);
    const b64 = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
    const sig = hmac.update(b64).digest('base64url');
    const expiredToken = `${b64}.${sig}`;

    const res = await makeRequest('POST', '/api/admin/gateway-credentials', {
      secretKey: 'cfsk_ma_prod_validproductiontestkey12345678',
      appId: '14962482c27cb93db2c6bc6e4af8426941'
    }, {
      Authorization: `Bearer ${adminSessionToken}`,
      'x-admin-assurance-token': expiredToken
    });
    assert.ok(res.status === 401 || res.status === 403);
    assert.ok(res.body.error === 'MFA_ASSURANCE_INVALID_OR_EXPIRED' || res.body.error === 'MFA_ASSURANCE_REQUIRED');
  });

  it('18. GET /api/admin/mfa/status returns live MFA configuration report for authenticated Admin', async () => {
    const res = await makeRequest('GET', '/api/admin/mfa/status', null, {
      Authorization: `Bearer ${adminSessionToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.user);
    assert.strictEqual(res.body.user.email, 'tiwariji0028@gmail.com');
  });

  it('19. Customer account isolation: customer cannot access /api/admin/mfa/status (HTTP 403)', async () => {
    const res = await makeRequest('GET', '/api/admin/mfa/status', null, {
      Authorization: `Bearer ${consumerSessionToken}`
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, 'FORBIDDEN');
  });

  it('20. Other administrator isolation: non-owner admin does not receive forced owner MFA requirement', async () => {
    // Create secondary admin without MFA enabled
    let secondaryAdmin = await db.findUserByEmail('staff.admin@astroverse.ai');
    if (!secondaryAdmin) {
      secondaryAdmin = await db.createUser({
        email: 'staff.admin@astroverse.ai',
        role: Role.SUPPORT_ADMIN,
        status: AccountStatus.ACTIVE,
        displayName: 'Staff Admin'
      });
    }
    const rawStaffSession = crypto.randomBytes(32).toString('hex');
    await db.createSession({
      userId: secondaryAdmin.id,
      tokenHash: hashToken(rawStaffSession),
      expiresAt: new Date(Date.now() + 3600 * 1000)
    });

    const res = await makeRequest('GET', '/api/admin/mfa/status', null, {
      Authorization: `Bearer ${rawStaffSession}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.email, 'staff.admin@astroverse.ai');
    assert.strictEqual(res.body.mfaEnabled, false);
  });

  it('21. Designated owner AAL1 rejection: sensitive mutations reject without assurance token (HTTP 428)', async () => {
    const res = await makeRequest('POST', '/api/admin/gateway-credentials', {
      secretKey: 'cfsk_ma_prod_validproductiontestkey12345678',
      appId: '14962482c27cb93db2c6bc6e4af8426941'
    }, {
      Authorization: `Bearer ${adminSessionToken}`
    });
    assert.strictEqual(res.status, 428);
    assert.strictEqual(res.body.error, 'MFA_ASSURANCE_REQUIRED');
  });

  it('22. Designated owner AAL2 acceptance: sensitive mutations succeed with valid assurance token (HTTP 200)', async () => {
    const validAssurance = issueAdminAssuranceToken(adminUser.id, Role.OWNER, 'gateway:credentials');
    const res = await makeRequest('POST', '/api/admin/gateway-credentials', {
      secretKey: 'cfsk_ma_prod_validproductiontestkey12345678',
      appId: '14962482c27cb93db2c6bc6e4af8426941'
    }, {
      Authorization: `Bearer ${adminSessionToken}`,
      'x-admin-assurance-token': validAssurance
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  it('23. Session refresh retains policy bounds and returns new expiry timestamp', async () => {
    const res = await makeRequest('POST', '/api/auth/admin-refresh', null, {
      Authorization: `Bearer ${adminSessionToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'RENEWED');
    assert.ok(res.body.expiresAt);
    assert.ok(res.body.remainingSeconds > 0);
  });

  it('24. Owner factor authority: Supabase factor VERIFIED -> MFA_CHALLENGE_REQUIRED', async () => {
    setMockUserMfaFactorsProvider(async () => ({
      factors: [{ id: 'test_totp_factor_id', status: 'verified', factor_type: 'totp' }],
      error: null
    }));
    await db.updateUser(adminUser.id, { mfaEnabled: false });
    const res = await makeRequest('POST', '/api/auth/admin-supabase-session', {}, {
      Authorization: 'Bearer test_supabase_token_user_tiwariji0028@gmail.com_a001'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'MFA_CHALLENGE_REQUIRED');
    clearMockUserMfaFactorsProvider();
  });

  it('25. Owner factor authority: Supabase factor UNVERIFIED -> MFA_ENROLLMENT_REQUIRED', async () => {
    setMockUserMfaFactorsProvider(async () => ({
      factors: [{ id: 'test_unverified_factor', status: 'unverified', factor_type: 'totp' }],
      error: null
    }));
    await db.updateUser(adminUser.id, { mfaEnabled: false });
    const res = await makeRequest('POST', '/api/auth/admin-supabase-session', {}, {
      Authorization: 'Bearer test_supabase_token_user_tiwariji0028@gmail.com_a001'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'MFA_ENROLLMENT_REQUIRED');
    clearMockUserMfaFactorsProvider();
  });

  it('26. Owner factor authority: No Supabase factor -> MFA_ENROLLMENT_REQUIRED', async () => {
    setMockUserMfaFactorsProvider(async () => ({
      factors: [],
      error: null
    }));
    await db.updateUser(adminUser.id, { mfaEnabled: false });
    const res = await makeRequest('POST', '/api/auth/admin-supabase-session', {}, {
      Authorization: 'Bearer test_supabase_token_user_tiwariji0028@gmail.com_a001'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'MFA_ENROLLMENT_REQUIRED');
    clearMockUserMfaFactorsProvider();
  });

  it('27. Owner factor authority: Supabase factor lookup failure -> HTTP 503 MFA_PROVIDER_UNAVAILABLE', async () => {
    setMockUserMfaFactorsProvider(async () => ({
      factors: [],
      error: 'THROW_SUPABASE_LOOKUP_FAILED'
    }));
    const res = await makeRequest('POST', '/api/auth/admin-supabase-session', {}, {
      Authorization: 'Bearer test_supabase_token_user_tiwariji0028@gmail.com_a001'
    });
    assert.strictEqual(res.status, 503);
    assert.strictEqual(res.body.error, 'MFA_PROVIDER_UNAVAILABLE');
    clearMockUserMfaFactorsProvider();
  });

  it('28. Owner factor authority: Local mfaEnabled: true with no verified Supabase factor -> MFA_ENROLLMENT_REQUIRED', async () => {
    setMockUserMfaFactorsProvider(async () => ({
      factors: [],
      error: null
    }));
    await db.updateUser(adminUser.id, { mfaEnabled: true });
    const res = await makeRequest('POST', '/api/auth/admin-supabase-session', {}, {
      Authorization: 'Bearer test_supabase_token_user_tiwariji0028@gmail.com_a001'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'MFA_ENROLLMENT_REQUIRED');
    clearMockUserMfaFactorsProvider();
  });

  it('29. Owner factor authority: Local mfaEnabled: false with verified Supabase factor -> MFA_CHALLENGE_REQUIRED', async () => {
    setMockUserMfaFactorsProvider(async () => ({
      factors: [{ id: 'test_totp_factor_id', status: 'verified', factor_type: 'totp' }],
      error: null
    }));
    await db.updateUser(adminUser.id, { mfaEnabled: false });
    const res = await makeRequest('POST', '/api/auth/admin-supabase-session', {}, {
      Authorization: 'Bearer test_supabase_token_user_tiwariji0028@gmail.com_a001'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'MFA_CHALLENGE_REQUIRED');
    clearMockUserMfaFactorsProvider();
  });
});
