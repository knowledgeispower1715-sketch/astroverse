import { describe, it, before, after } from 'node:test';
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
  hasPermission,
  normalizeRole,
  isAnyAdmin
} from '../src/security/permissions';

function hashToken(t: string): string {
  return crypto.createHash('sha256').update(t).digest('hex');
}

let server: http.Server;
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

    const url = new URL(urlPath, baseUrl);
    const req = http.request(
      url,
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

describe('REQUIREMENT R3: RBAC ISOLATION & HTTP 428 PRECONDITION VERIFICATION', () => {
  const roles = [
    Role.OWNER,
    Role.SECURITY_ADMIN,
    Role.SUPPORT_ADMIN,
    Role.CONTENT_EDITOR,
    Role.FINANCE_ADMIN,
    Role.ASTROLOGY_OPS_ADMIN,
    Role.READONLY_ANALYST,
    Role.USER
  ];

  const userMap: Record<string, { user: any; token: string }> = {};

  before(async () => {
    process.env.NODE_ENV = 'test';
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // Create user accounts for each role
    for (const r of roles) {
      const email = `test_rbac_${r.toLowerCase()}_${Date.now()}@astroverse.app`;
      const user = await db.createUser({
        email,
        role: r,
        status: AccountStatus.ACTIVE,
        displayName: `Test ${r}`
      });
      await db.updateUser(user.id, { role: r, mfaEnabled: true });
      const rawToken = `token_${r.toLowerCase()}_${crypto.randomBytes(16).toString('hex')}`;
      await db.createSession({
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 3600 * 1000)
      });
      userMap[r] = { user, token: rawToken };
    }
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  // =========================================================================
  // SUB-SUITE 1: 7 Canonical Roles Definition & Permissions
  // =========================================================================
  it('1.1 Confirms all 7 canonical roles exist in permissions registry', () => {
    const canonicalRoles = [
      Role.OWNER,
      Role.SECURITY_ADMIN,
      Role.SUPPORT_ADMIN,
      Role.CONTENT_EDITOR,
      Role.FINANCE_ADMIN,
      Role.ASTROLOGY_OPS_ADMIN,
      Role.READONLY_ANALYST
    ];

    for (const r of canonicalRoles) {
      assert.strictEqual(normalizeRole(r), r);
      assert.strictEqual(isAnyAdmin(r), true);
      assert.ok(ROLE_PERMISSIONS[r], `ROLE_PERMISSIONS must be defined for ${r}`);
      assert.ok(ROLE_PERMISSIONS[r].length > 0, `${r} must have at least one permission`);
    }

    assert.strictEqual(isAnyAdmin(Role.USER), false);
    assert.strictEqual(ROLE_PERMISSIONS[Role.USER].length, 0);
  });

  // =========================================================================
  // SUB-SUITE 2: Protected Endpoints Isolation per Canonical Role
  // =========================================================================
  it('2.1 OWNER possesses unrestricted access to administrative endpoints', async () => {
    const token = userMap[Role.OWNER].token;
    const endpoints = [
      '/api/admin/overview',
      '/api/admin/users',
      '/api/admin/roles/matrix',
      '/api/admin/security/events',
      '/api/admin/astrology/health',
      '/api/admin/reports/diagnostics',
      '/api/admin/ai/quotas',
      '/api/admin/subscriptions',
      '/api/admin/content',
      '/api/admin/integrations',
      '/api/admin/monitoring/incidents',
      '/api/admin/database/status',
      '/api/admin/privacy/requests',
      '/api/admin/consultations'
    ];

    for (const ep of endpoints) {
      const res = await makeRequest('GET', ep, null, { Authorization: `Bearer ${token}` });
      assert.strictEqual(res.status, 200, `OWNER should access ${ep} with 200 OK, got ${res.status}`);
    }
  });

  it('2.2 SECURITY_ADMIN access control: security & users allowed, financial & content forbidden', async () => {
    const token = userMap[Role.SECURITY_ADMIN].token;

    // Allowed
    const allowed = ['/api/admin/overview', '/api/admin/users', '/api/admin/roles/matrix', '/api/admin/security/events', '/api/admin/database/status'];
    for (const ep of allowed) {
      const res = await makeRequest('GET', ep, null, { Authorization: `Bearer ${token}` });
      assert.strictEqual(res.status, 200, `SECURITY_ADMIN should access ${ep}`);
    }

    // Forbidden
    const forbidden: Array<{ path: string; method: string; body?: any }> = [
      { path: '/api/admin/content', method: 'GET' },
      { path: '/api/admin/astrology/health', method: 'GET' },
      { path: '/api/admin/wallet/adjust-balance', method: 'POST', body: { userId: 'u1', amountPaise: 100 } },
      { path: '/api/admin/payments/refund', method: 'POST', body: { orderId: 'ord1', amountPaise: 100 } }
    ];
    for (const target of forbidden) {
      const res = await makeRequest(target.method, target.path, target.body, { Authorization: `Bearer ${token}` });
      assert.strictEqual(res.status, 403, `SECURITY_ADMIN must be blocked from ${target.path}`);
      assert.strictEqual(res.body.error, 'FORBIDDEN');
    }
  });

  it('2.3 SUPPORT_ADMIN access control: users, 360, reports allowed; roles & wallet mutation forbidden', async () => {
    const token = userMap[Role.SUPPORT_ADMIN].token;

    // Allowed
    const allowed = ['/api/admin/overview', '/api/admin/users', '/api/admin/reports/diagnostics', '/api/admin/privacy/requests', '/api/admin/consultations'];
    for (const ep of allowed) {
      const res = await makeRequest('GET', ep, null, { Authorization: `Bearer ${token}` });
      assert.strictEqual(res.status, 200, `SUPPORT_ADMIN should access ${ep}`);
    }

    // Forbidden
    const forbidden: Array<{ path: string; method: string; body?: any }> = [
      { path: '/api/admin/roles/matrix', method: 'GET' },
      { path: '/api/admin/security/events', method: 'GET' },
      { path: '/api/admin/wallet/adjust-balance', method: 'POST', body: { userId: 'u1', amountPaise: 100 } },
      { path: '/api/admin/content', method: 'GET' }
    ];
    for (const target of forbidden) {
      const res = await makeRequest(target.method, target.path, target.body, { Authorization: `Bearer ${token}` });
      assert.strictEqual(res.status, 403, `SUPPORT_ADMIN must be blocked from ${target.path}`);
      assert.strictEqual(res.body.error, 'FORBIDDEN');
    }
  });

  it('2.4 CONTENT_EDITOR access control: content & promotions allowed; users & security forbidden', async () => {
    const token = userMap[Role.CONTENT_EDITOR].token;

    // Allowed
    const allowed = ['/api/admin/overview', '/api/admin/content'];
    for (const ep of allowed) {
      const res = await makeRequest('GET', ep, null, { Authorization: `Bearer ${token}` });
      assert.strictEqual(res.status, 200, `CONTENT_EDITOR should access ${ep}`);
    }

    // Forbidden
    const forbidden: Array<{ path: string; method: string; body?: any }> = [
      { path: '/api/admin/users', method: 'GET' },
      { path: '/api/admin/roles/matrix', method: 'GET' },
      { path: '/api/admin/security/events', method: 'GET' },
      { path: '/api/admin/wallet/adjust-balance', method: 'POST', body: { userId: 'u1', amountPaise: 100 } }
    ];
    for (const target of forbidden) {
      const res = await makeRequest(target.method, target.path, target.body, { Authorization: `Bearer ${token}` });
      assert.strictEqual(res.status, 403, `CONTENT_EDITOR must be blocked from ${target.path}`);
      assert.strictEqual(res.body.error, 'FORBIDDEN');
    }
  });

  it('2.5 FINANCE_ADMIN access control: subscriptions & pricing allowed; roles & astrology forbidden', async () => {
    const token = userMap[Role.FINANCE_ADMIN].token;

    // Allowed
    const allowed = ['/api/admin/overview', '/api/admin/subscriptions'];
    for (const ep of allowed) {
      const res = await makeRequest('GET', ep, null, { Authorization: `Bearer ${token}` });
      assert.strictEqual(res.status, 200, `FINANCE_ADMIN should access ${ep}`);
    }

    // Forbidden
    const forbidden: Array<{ path: string; method: string; body?: any }> = [
      { path: '/api/admin/roles/matrix', method: 'GET' },
      { path: '/api/admin/security/events', method: 'GET' },
      { path: '/api/admin/astrology/health', method: 'GET' },
      { path: '/api/admin/content', method: 'GET' }
    ];
    for (const target of forbidden) {
      const res = await makeRequest(target.method, target.path, target.body, { Authorization: `Bearer ${token}` });
      assert.strictEqual(res.status, 403, `FINANCE_ADMIN must be blocked from ${target.path}`);
      assert.strictEqual(res.body.error, 'FORBIDDEN');
    }
  });

  it('2.6 ASTROLOGY_OPS_ADMIN access control: astrology health & diagnostics allowed; wallet & security forbidden', async () => {
    const token = userMap[Role.ASTROLOGY_OPS_ADMIN].token;

    // Allowed
    const allowed = ['/api/admin/overview', '/api/admin/astrology/health', '/api/admin/reports/diagnostics', '/api/admin/consultations'];
    for (const ep of allowed) {
      const res = await makeRequest('GET', ep, null, { Authorization: `Bearer ${token}` });
      assert.strictEqual(res.status, 200, `ASTROLOGY_OPS_ADMIN should access ${ep}`);
    }

    // Forbidden
    const forbidden: Array<{ path: string; method: string; body?: any }> = [
      { path: '/api/admin/roles/matrix', method: 'GET' },
      { path: '/api/admin/security/events', method: 'GET' },
      { path: '/api/admin/wallet/adjust-balance', method: 'POST', body: { userId: 'u1', amountPaise: 100 } },
      { path: '/api/admin/subscriptions', method: 'GET' }
    ];
    for (const target of forbidden) {
      const res = await makeRequest(target.method, target.path, target.body, { Authorization: `Bearer ${token}` });
      assert.strictEqual(res.status, 403, `ASTROLOGY_OPS_ADMIN must be blocked from ${target.path}`);
      assert.strictEqual(res.body.error, 'FORBIDDEN');
    }
  });

  it('2.7 READONLY_ANALYST access control: read-only overview & analytics allowed; all mutations forbidden', async () => {
    const token = userMap[Role.READONLY_ANALYST].token;

    // Allowed Read-only
    const allowed = ['/api/admin/overview', '/api/admin/subscriptions', '/api/admin/ai/quotas', '/api/admin/astrology/health', '/api/admin/reports/diagnostics'];
    for (const ep of allowed) {
      const res = await makeRequest('GET', ep, null, { Authorization: `Bearer ${token}` });
      assert.strictEqual(res.status, 200, `READONLY_ANALYST should access ${ep}`);
    }

    // Forbidden Mutations and Admin Areas
    const forbidden: Array<{ path: string; method: string; body?: any }> = [
      { path: '/api/admin/users', method: 'GET' },
      { path: '/api/admin/roles/matrix', method: 'GET' },
      { path: '/api/admin/security/events', method: 'GET' },
      { path: '/api/admin/wallet/adjust-balance', method: 'POST', body: { userId: 'u1', amountPaise: 100 } },
      { path: '/api/admin/payments/refund', method: 'POST', body: { orderId: 'ord1', amountPaise: 100 } }
    ];
    for (const target of forbidden) {
      const res = await makeRequest(target.method, target.path, target.body, { Authorization: `Bearer ${token}` });
      assert.strictEqual(res.status, 403, `READONLY_ANALYST must be blocked from ${target.path}`);
      assert.strictEqual(res.body.error, 'FORBIDDEN');
    }
  });

  it('2.8 Ordinary consumer (Role.USER) is unconditionally barred with HTTP 403 FORBIDDEN', async () => {
    const token = userMap[Role.USER].token;
    const res = await makeRequest('GET', '/api/admin/overview', null, { Authorization: `Bearer ${token}` });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, 'FORBIDDEN');
  });

  // =========================================================================
  // SUB-SUITE 3: HTTP 428 Precondition Required (MFA_ASSURANCE_REQUIRED)
  // =========================================================================
  const sensitiveMutations = [
    {
      name: 'Role Assignment (PUT /api/admin/users/:id/role)',
      method: 'PUT',
      path: () => `/api/admin/users/${userMap[Role.USER].user.id}/role`,
      body: () => ({ role: 'SUPPORT_ADMIN', reason: 'Elevation test for testing assurance gate' }),
      role: Role.OWNER
    },
    {
      name: 'Wallet Adjustment (POST /api/admin/wallet/adjust-balance)',
      method: 'POST',
      path: () => '/api/admin/wallet/adjust-balance',
      body: () => ({ userId: userMap[Role.USER].user.id, amountPaise: 500, reason: 'Assurance token test' }),
      role: Role.OWNER
    },
    {
      name: 'Pricing SKU Update (PUT /api/admin/products/:id)',
      method: 'PUT',
      path: () => '/api/admin/products/sku_kundli_detailed',
      body: () => ({ pricePaise: 29900 }),
      role: Role.OWNER
    },
    {
      name: 'Gateway Credentials Update (POST /api/admin/gateway-credentials)',
      method: 'POST',
      path: () => '/api/admin/gateway-credentials',
      body: () => ({ appId: '14962482c27cb93db2c6bc6e4af8426941', secretKey: 'cfsk_ma_prod_testkey00000', env: 'production' }),
      role: Role.OWNER
    },
    {
      name: 'Subscription Assignment (POST /api/admin/subscriptions/assign)',
      method: 'POST',
      path: () => '/api/admin/subscriptions/assign',
      body: () => ({ userId: userMap[Role.USER].user.id, tier: 'PLUS', durationDays: 30 }),
      role: Role.OWNER
    },
    {
      name: 'Entitlements Override (POST /api/admin/entitlements/grant)',
      method: 'POST',
      path: () => '/api/admin/entitlements/grant',
      body: () => ({ userId: userMap[Role.USER].user.id, featureKey: 'FEATURE_AI_UNLIMITED', durationDays: 7 }),
      role: Role.OWNER
    },
    {
      name: 'Platform Settings Feature Flag (PUT /api/admin/settings/flags/:key)',
      method: 'PUT',
      path: () => '/api/admin/settings/flags/ENABLE_CHAT_STREAMING',
      body: () => ({ enabled: true }),
      role: Role.OWNER
    },
    {
      name: 'Incident Declaration (POST /api/admin/monitoring/incidents)',
      method: 'POST',
      path: () => '/api/admin/monitoring/incidents',
      body: () => ({ title: 'Test Precondition Incident', severity: 'LOW', summary: 'Verifying assurance gate' }),
      role: Role.OWNER
    }
  ];

  for (const op of sensitiveMutations) {
    it(`3.1 Assert HTTP 428 on ${op.name} when submitted without assurance token`, async () => {
      const token = userMap[op.role].token;
      const res = await makeRequest(op.method, op.path(), op.body(), {
        Authorization: `Bearer ${token}`
      });
      assert.strictEqual(
        res.status,
        428,
        `Expected HTTP 428 Precondition Required for ${op.name}, got ${res.status}: ${JSON.stringify(res.body)}`
      );
      assert.strictEqual(
        res.body.error,
        'MFA_ASSURANCE_REQUIRED',
        `Expected error to be MFA_ASSURANCE_REQUIRED for ${op.name}`
      );
    });

    it(`3.2 Operation ${op.name} succeeds or passes assurance check when valid assurance token is supplied`, async () => {
      const ownerUser = userMap[op.role].user;
      const token = userMap[op.role].token;
      const validAssurance = issueAdminAssuranceToken(ownerUser.id, op.role);

      const res = await makeRequest(op.method, op.path(), op.body(), {
        Authorization: `Bearer ${token}`,
        'x-admin-assurance-token': validAssurance
      });

      // Must not be 428 (it can be 200 OK, or 400 for business validation, but precondition is satisfied)
      assert.notStrictEqual(
        res.status,
        428,
        `Should NOT return 428 when valid assurance token is provided for ${op.name}`
      );
      assert.ok(
        res.status === 200 || res.status === 400 || res.status === 404,
        `Expected status 200/400/404, got ${res.status} for ${op.name}`
      );
    });

    it(`3.3 Operation ${op.name} fails closed when presented with expired assurance token`, async () => {
      const ownerUser = userMap[op.role].user;
      const token = userMap[op.role].token;

      // Construct expired assurance token
      const expiredPayload = {
        userId: ownerUser.id,
        role: op.role,
        scope: 'ADMIN_MUTATION',
        iat: Math.floor(Date.now() / 1000) - 2000,
        exp: Math.floor(Date.now() / 1000) - 100
      };
      const secret = process.env.JWT_SECRET || 'astroverse_jwt_fallback_secret_production';
      const b64 = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
      const sig = crypto.createHmac('sha256', secret).update(b64).digest('base64url');
      const expiredToken = `${b64}.${sig}`;

      const res = await makeRequest(op.method, op.path(), op.body(), {
        Authorization: `Bearer ${token}`,
        'x-admin-assurance-token': expiredToken
      });

      assert.ok(
        res.status === 401 || res.status === 428 || res.status === 403,
        `Expired assurance token must fail closed with 401 or 428, got ${res.status}`
      );
      assert.ok(
        res.body.error === 'MFA_ASSURANCE_INVALID_OR_EXPIRED' || res.body.error === 'MFA_ASSURANCE_REQUIRED',
        `Expected error indicator for expired token, got ${res.body.error}`
      );
    });

    it(`3.4 Operation ${op.name} fails closed when presented with identity-mismatched assurance token`, async () => {
      const token = userMap[op.role].token;
      // Issue assurance token for a DIFFERENT user ID
      const foreignUserId = crypto.randomUUID();
      const mismatchedAssurance = issueAdminAssuranceToken(foreignUserId, op.role);

      const res = await makeRequest(op.method, op.path(), op.body(), {
        Authorization: `Bearer ${token}`,
        'x-admin-assurance-token': mismatchedAssurance
      });

      assert.ok(
        res.status === 401 || res.status === 428 || res.status === 403,
        `Identity mismatched assurance token must fail closed with 401/428, got ${res.status}`
      );
      assert.ok(
        res.body.error === 'MFA_ASSURANCE_IDENTITY_MISMATCH' || res.body.error === 'MFA_ASSURANCE_REQUIRED',
        `Expected error indicator for mismatched identity, got ${res.body.error}`
      );
    });
  }
});
