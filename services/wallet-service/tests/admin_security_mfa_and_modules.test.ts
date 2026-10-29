import { describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import crypto from 'crypto';
import app from '../src/server';
import { db, Role, AccountStatus, OrderStatus } from '../src/db';
import {
  generateTotpSecret,
  generateTotpCode,
  verifyTotpCode,
  generateMfaRecoveryCodes,
  verifyAndConsumeRecoveryCode,
  issueAdminAssuranceToken,
  verifyAdminAssuranceToken
} from '../src/security/mfa';
import {
  AdminPermission,
  ROLE_PERMISSIONS,
  hasPermission,
  normalizeRole,
  isAnyAdmin
} from '../src/security/permissions';

// Test harness helper
function makeRequest(
  server: http.Server,
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const port = (server.address() as any).port;
    const reqHeaders: Record<string, string> = { ...headers };
    let reqBody: string | undefined;

    if (body !== undefined) {
      reqBody = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = String(Buffer.byteLength(reqBody));
    }

    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path,
        method,
        headers: reqHeaders
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          let parsed: any;
          try {
            parsed = JSON.parse(rawData);
          } catch {
            parsed = rawData;
          }
          resolve({ status: res.statusCode || 0, headers: res.headers, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (reqBody) {
      req.write(reqBody);
    }
    req.end();
  });
}

describe('ASTROVERSE PRODUCTION LAUNCH SECURITY & ADMIN HARDENING', () => {
  let server: http.Server;
  let ownerToken: string;
  let ownerId: string;
  let securityAdminToken: string;
  let securityAdminId: string;
  let financeAdminToken: string;
  let financeAdminId: string;
  let regularUserToken: string;
  let regularUserId: string;

  it('Initializes test server and test identities', async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });

    // 1. Create Owner User
    const owner = await db.createUser({
      email: `owner_${Date.now()}@astroverse.app`,
      phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      displayName: 'Platform Owner'
    });
    await db.updateUser(owner.id, { role: Role.OWNER });
    ownerId = owner.id;
    ownerToken = 'raw_owner_' + Date.now();
    await db.createSession({
      userId: owner.id,
      tokenHash: crypto.createHash('sha256').update(ownerToken).digest('hex'),
      expiresAt: new Date(Date.now() + 86400000)
    });

    // 2. Create Security Admin
    const sec = await db.createUser({
      email: `sec_${Date.now()}@astroverse.app`,
      phone: `+9197${Math.floor(10000000 + Math.random() * 90000000)}`,
      displayName: 'Security Admin'
    });
    await db.updateUser(sec.id, { role: Role.SECURITY_ADMIN });
    securityAdminId = sec.id;
    securityAdminToken = 'raw_sec_' + Date.now();
    await db.createSession({
      userId: sec.id,
      tokenHash: crypto.createHash('sha256').update(securityAdminToken).digest('hex'),
      expiresAt: new Date(Date.now() + 86400000)
    });

    // 3. Create Finance Admin
    const fin = await db.createUser({
      email: `fin_${Date.now()}@astroverse.app`,
      phone: `+9196${Math.floor(10000000 + Math.random() * 90000000)}`,
      displayName: 'Finance Admin'
    });
    await db.updateUser(fin.id, { role: Role.FINANCE_ADMIN });
    financeAdminId = fin.id;
    financeAdminToken = 'raw_fin_' + Date.now();
    await db.createSession({
      userId: fin.id,
      tokenHash: crypto.createHash('sha256').update(financeAdminToken).digest('hex'),
      expiresAt: new Date(Date.now() + 86400000)
    });

    // 4. Create Regular User
    const reg = await db.createUser({
      email: `reg_${Date.now()}@example.com`,
      phone: `+9195${Math.floor(10000000 + Math.random() * 90000000)}`,
      displayName: 'Regular Seeker'
    });
    regularUserId = reg.id;
    regularUserToken = 'raw_reg_' + Date.now();
    await db.createSession({
      userId: reg.id,
      tokenHash: crypto.createHash('sha256').update(regularUserToken).digest('hex'),
      expiresAt: new Date(Date.now() + 86400000)
    });

    assert.ok(ownerId);
    assert.ok(regularUserId);
  });

  // ---------------------------------------------------------------------------
  // 1. RBAC & 7 ROLES PERMISSION MATRIX
  // ---------------------------------------------------------------------------
  it('Validates canonical 7-role permission matrix', () => {
    assert.strictEqual(normalizeRole('OWNER'), Role.OWNER);
    assert.strictEqual(normalizeRole('SUPER_ADMIN'), Role.OWNER);
    assert.strictEqual(normalizeRole('SUPPORT'), Role.SUPPORT_ADMIN);
    assert.strictEqual(normalizeRole('OPERATIONS'), Role.ASTROLOGY_OPS_ADMIN);
    assert.strictEqual(normalizeRole('ANALYST'), Role.READONLY_ANALYST);
    assert.strictEqual(normalizeRole('USER'), Role.USER);

    // Permission checks
    assert.strictEqual(hasPermission(Role.OWNER, AdminPermission.MANAGE_ROLES), true);
    assert.strictEqual(hasPermission(Role.OWNER, AdminPermission.MANAGE_REFUNDS), true);

    // Security Admin has security but NOT refund authority
    assert.strictEqual(hasPermission(Role.SECURITY_ADMIN, AdminPermission.VIEW_SECURITY_EVENTS), true);
    assert.strictEqual(hasPermission(Role.SECURITY_ADMIN, AdminPermission.MANAGE_REFUNDS), false);

    // Finance Admin has refunds but NOT role management
    assert.strictEqual(hasPermission(Role.FINANCE_ADMIN, AdminPermission.MANAGE_REFUNDS), true);
    assert.strictEqual(hasPermission(Role.FINANCE_ADMIN, AdminPermission.MANAGE_ROLES), false);

    // Readonly Analyst cannot mutate status
    assert.strictEqual(hasPermission(Role.READONLY_ANALYST, AdminPermission.MANAGE_USER_STATUS), false);
    assert.strictEqual(hasPermission(Role.READONLY_ANALYST, AdminPermission.VIEW_OVERVIEW), true);

    // Ordinary user has zero admin permissions
    assert.strictEqual(hasPermission(Role.USER, AdminPermission.VIEW_OVERVIEW), false);
  });

  // ---------------------------------------------------------------------------
  // 2. PRIVILEGE ESCALATION PREVENTION
  // ---------------------------------------------------------------------------
  it('Rejects ordinary user attempting to access administrative portal with 403 FORBIDDEN', async () => {
    const res = await makeRequest(server, 'GET', '/api/admin/overview', {
      Authorization: `Bearer ${regularUserToken}`
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, 'FORBIDDEN');
  });

  it('Prevents ordinary user from self-escalating role via PUT /api/user/profile', async () => {
    const res = await makeRequest(server, 'PUT', '/api/user/profile', {
      Authorization: `Bearer ${regularUserToken}`
    }, {
      role: 'SUPER_ADMIN',
      walletBalance: 999999
    });
    assert.strictEqual(res.status, 200);
    // User record must NOT have adopted SUPER_ADMIN role or mutated balance
    const user = await db.findUserById(regularUserId);
    assert.strictEqual(user?.role, Role.USER);
    assert.strictEqual(user?.walletBalance, 0);
  });

  // ---------------------------------------------------------------------------
  // 3. ADMIN MULTI-FACTOR AUTHENTICATION (TOTP ENGINE)
  // ---------------------------------------------------------------------------
  it('Executes TOTP MFA secret generation, token verification, and step-up assurance', async () => {
    // A. Generate secret
    const { secret, otpauthUrl } = generateTotpSecret();
    assert.ok(secret);
    assert.ok(otpauthUrl('admin@astroverse.app').includes('secret='));

    // B. Generate code and verify
    const token = generateTotpCode(secret);
    assert.strictEqual(token.length, 6);
    assert.strictEqual(verifyTotpCode(secret, token), true);

    // C. Verify clock drift window (+/- 30s)
    const pastToken = generateTotpCode(secret, Date.now() - 25000);
    assert.strictEqual(verifyTotpCode(secret, pastToken), true);

    // D. Reject invalid token
    assert.strictEqual(verifyTotpCode(secret, '000000' === token ? '111111' : '000000'), false);

    // E. Recovery codes generation and single-use consumption
    const { plaintextCodes, hashedCodes } = generateMfaRecoveryCodes(4);
    assert.strictEqual(plaintextCodes.length, 4);
    assert.strictEqual(hashedCodes.length, 4);

    const firstCode = plaintextCodes[0];
    const consumed = verifyAndConsumeRecoveryCode(hashedCodes, firstCode);
    assert.strictEqual(consumed.valid, true);
    assert.strictEqual(consumed.remainingHashedCodes.length, 3);

    // Single-use replay attack must fail
    const replay = verifyAndConsumeRecoveryCode(consumed.remainingHashedCodes, firstCode);
    assert.strictEqual(replay.valid, false);

    // F. Step-up assurance token issuance and verification
    const assuranceToken = issueAdminAssuranceToken(ownerId, Role.OWNER);
    assert.ok(assuranceToken);
    const verifiedPayload = verifyAdminAssuranceToken(assuranceToken);
    assert.ok(verifiedPayload);
    assert.strictEqual(verifiedPayload?.userId, ownerId);
    assert.strictEqual(verifiedPayload?.role, Role.OWNER);
  });

  it('Enforces MFA setup and challenge endpoints on server', async () => {
    // 1. Setup MFA for owner
    const setupRes = await makeRequest(server, 'POST', '/api/admin/mfa/setup', {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(setupRes.status, 200);
    assert.ok(setupRes.body.secret);

    // 2. Verify with valid TOTP code
    const validCode = generateTotpCode(setupRes.body.secret);
    const verifyRes = await makeRequest(server, 'POST', '/api/admin/mfa/verify', {
      Authorization: `Bearer ${ownerToken}`
    }, { code: validCode });
    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.body.success, true);
    assert.strictEqual(verifyRes.body.recoveryCodes.length, 8);
    assert.ok(verifyRes.body.assuranceToken);

    // User record must now reflect mfaEnabled: true
    const updatedOwner = await db.findUserById(ownerId);
    assert.strictEqual(updatedOwner?.mfaEnabled, true);

    // 3. Challenge verification with code
    const challengeRes = await makeRequest(server, 'POST', '/api/admin/mfa/challenge', {
      Authorization: `Bearer ${ownerToken}`
    }, { code: validCode });
    assert.strictEqual(challengeRes.status, 200);
    assert.ok(challengeRes.body.assuranceToken);
  });

  it('Requires MFA step-up assurance token for high-impact mutations when MFA is active', async () => {
    // Attempting role change without assurance token must return 428 MFA_ASSURANCE_REQUIRED
    const blockedRes = await makeRequest(server, 'PUT', `/api/admin/users/${regularUserId}/role`, {
      Authorization: `Bearer ${ownerToken}`
    }, { role: 'CONTENT_EDITOR' });
    assert.strictEqual(blockedRes.status, 428);
    assert.strictEqual(blockedRes.body.error, 'MFA_ASSURANCE_REQUIRED');

    // Supplying valid assurance token allows operation to proceed
    const validAssurance = issueAdminAssuranceToken(ownerId, Role.OWNER);
    const successRes = await makeRequest(server, 'PUT', `/api/admin/users/${regularUserId}/role`, {
      Authorization: `Bearer ${ownerToken}`,
      'x-admin-assurance-token': validAssurance
    }, { role: 'CONTENT_EDITOR' });
    assert.strictEqual(successRes.status, 200);
    assert.strictEqual(successRes.body.status, 'ROLE_UPDATED');

    // Reset back to USER
    await makeRequest(server, 'PUT', `/api/admin/users/${regularUserId}/role`, {
      Authorization: `Bearer ${ownerToken}`,
      'x-admin-assurance-token': validAssurance
    }, { role: 'USER' });
  });

  // ---------------------------------------------------------------------------
  // 4. THE 15 ADMIN MODULES VERIFICATION
  // ---------------------------------------------------------------------------
  it('Module 1: Platform Overview & Service Health returns metrics and health', async () => {
    const res = await makeRequest(server, 'GET', '/api/admin/overview', {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.metrics.totalUsers >= 4);
    assert.ok(res.body.metrics.systemHealth);
  });

  it('Module 2: User Lifecycle & Moderation lists users and details', async () => {
    const res = await makeRequest(server, 'GET', '/api/admin/users', {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.users));

    const detailRes = await makeRequest(server, 'GET', `/api/admin/users/${regularUserId}/details`, {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(detailRes.status, 200);
    assert.strictEqual(detailRes.body.user.id, regularUserId);
  });

  it('Module 3: Administrative Roles & Permission Management matrix', async () => {
    const res = await makeRequest(server, 'GET', '/api/admin/roles/matrix', {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.roles.length, 8);
    assert.strictEqual(res.body.modules.length, 15);
  });

  it('Module 4: Security Events audit stream', async () => {
    const res = await makeRequest(server, 'GET', '/api/admin/security/events', {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.events));
  });

  it('Module 5: Astrology Engine Health check', async () => {
    const res = await makeRequest(server, 'GET', '/api/admin/astrology/health', {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.ayanamshaStandard.includes('Lahiri'));
  });

  it('Module 6: Report Diagnostics catalogue inspection', async () => {
    const res = await makeRequest(server, 'GET', '/api/admin/reports/diagnostics', {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.catalogueSize >= 9);
  });

  it('Module 7: AI Provider Usage & Quotas', async () => {
    const res = await makeRequest(server, 'GET', '/api/admin/ai/usage', {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.personas.length, 3);
  });

  it('Module 8: Payment Reconciliation tool', async () => {
    const res = await makeRequest(server, 'POST', '/api/admin/payments/reconcile', {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.status.includes('RECONCILED') || res.body.status.includes('CLEAN'));
  });

  it('Module 9: Subscriptions Distribution', async () => {
    const res = await makeRequest(server, 'GET', '/api/admin/subscriptions', {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.plans.length >= 2);
  });

  it('Module 10: Content Banners Management', async () => {
    const res = await makeRequest(server, 'GET', '/api/admin/content', {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.banners));
  });

  it('Module 11: Feature Flags & Safe Settings (Zero Plaintext Secrets Exposed)', async () => {
    const res = await makeRequest(server, 'GET', '/api/admin/settings/safe', {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(res.status, 200);
    const cfg = res.body.configurationStatus;
    // Must NOT reveal raw secrets
    assert.strictEqual(typeof cfg.RAZORPAY_KEY_SECRET, 'string');
    assert.ok(!cfg.RAZORPAY_KEY_SECRET.includes('live_'));
    assert.ok(!cfg.RAZORPAY_KEY_SECRET.includes('secret_'));

    const flagsRes = await makeRequest(server, 'GET', '/api/admin/settings/flags', {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(flagsRes.status, 200);
    assert.ok(flagsRes.body.flags.length >= 6);
  });

  it('Module 12: Support & Privacy Requests (GDPR / India DPDP Act User Data Export)', async () => {
    const res = await makeRequest(server, 'GET', `/api/user/data-export`, {
      Authorization: `Bearer ${regularUserToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.id, regularUserId);
    assert.ok(res.body.exportMetadata.compliance.includes('DPDP'));
    // Passwords and secrets must be redacted
    assert.strictEqual(res.body.user.passwordHash, undefined);
    assert.strictEqual(res.body.user.mfaSecret, undefined);
  });

  it('Module 13: Audit Trail Search with structured query filters', async () => {
    const res = await makeRequest(server, 'GET', '/api/admin/audit-logs?limit=10', {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.events));
  });

  it('Module 14: External Integrations Health Status', async () => {
    const res = await makeRequest(server, 'GET', '/api/admin/integrations', {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.integrations.length >= 5);
  });

  it('Module 15: Incident Management & Declaration', async () => {
    const assuranceToken = issueAdminAssuranceToken(ownerId, Role.OWNER);
    const createRes = await makeRequest(server, 'POST', '/api/admin/monitoring/incidents', {
      Authorization: `Bearer ${ownerToken}`,
      'x-admin-assurance-token': assuranceToken
    }, {
      title: 'Routine Database Maintenance Check',
      severity: 'INFO',
      summary: 'Sanity validation of database replica synchronization.'
    });
    assert.strictEqual(createRes.status, 200);
    assert.ok(createRes.body.incident.id);

    const listRes = await makeRequest(server, 'GET', '/api/admin/monitoring/incidents', {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.strictEqual(listRes.status, 200);
    assert.ok(listRes.body.incidents.length >= 1);
  });

  it('Cleans up server', async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
