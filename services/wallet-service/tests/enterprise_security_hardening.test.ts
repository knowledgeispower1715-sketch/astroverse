import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import crypto from 'crypto';
import app, { globalApiLimiter, authLimiter, adminLimiter } from '../src/server';
import { db } from '../src/db';
import { Role } from '../src/security/permissions';
import { AccountStatus } from '../src/db';
import {
  setMockJwksForTesting,
  verifyCloudflareAccessJwt,
  getCloudflareAccessConfig
} from '../src/security/cloudflareAccess';

describe('ASTROVERSE ENTERPRISE SECURITY HARDENING & CLOUDFLARE ACCESS ISOLATION', () => {
  let server: http.Server;
  let port: number;
  let baseUrl: string;

  // Test RSA Key Pair for Cloudflare Access JWT Simulation
  const keyPair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const testKid = 'test-cf-access-key-2026';

  function createSignedCfAccessJwt(payload: any, kid = testKid, privateKey = keyPair.privateKey): string {
    const header = { alg: 'RS256', kid, typ: 'JWT' };
    const hB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const pB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const dataToSign = Buffer.from(`${hB64}.${pB64}`, 'utf8');
    const signature = crypto.sign('RSA-SHA256', dataToSign, privateKey).toString('base64url');
    return `${hB64}.${pB64}.${signature}`;
  }

  before(async () => {
    // Register synthetic JWK in Cloudflare Access module
    setMockJwksForTesting([
      { kid: testKid, publicKey: keyPair.publicKey }
    ]);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        port = addr.port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    setMockJwksForTesting(null);
    delete process.env.CLOUDFLARE_ACCESS_REQUIRED;
    delete process.env.CLOUDFLARE_ACCESS_AUD;
    delete process.env.CLOUDFLARE_ACCESS_TEAM_NAME;
    delete process.env.ASTROVERSE_ADMIN_EMAILS;

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('1. GET /api/admin/gateway-status returns security gateway readiness', async () => {
    const res = await fetch(`${baseUrl}/api/admin/gateway-status`);
    assert.strictEqual(res.status, 200);
    const data: any = await res.json();
    assert.strictEqual(data.status, 'ONLINE');
    assert.strictEqual(typeof data.cloudflareAccess, 'object');
    assert.strictEqual(typeof data.originProtection, 'string');
  });

  it('2. Security Headers: Verifies HSTS, CSP, X-Frame-Options, Nosniff and Permissions-Policy', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(res.headers.get('x-frame-options'), 'DENY');
    assert.strictEqual(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.ok(res.headers.get('strict-transport-security')?.includes('max-age=63072000'));
    assert.ok(res.headers.get('strict-transport-security')?.includes('includeSubDomains'));
    assert.ok(res.headers.get('strict-transport-security')?.includes('preload'));
    assert.ok(res.headers.get('permissions-policy')?.includes('camera=()'));

    const csp = res.headers.get('content-security-policy') || '';
    assert.ok(csp.includes("default-src 'self'"), 'CSP must restrict default-src');
    assert.ok(csp.includes("frame-ancestors 'none'"), 'CSP must prevent iframe framing');
    assert.ok(csp.includes('sdk.cashfree.com'), 'CSP must allow official payment SDK');
  });

  it('3. Cache-Control: Sensitive endpoints strictly return no-store and no-cache', async () => {
    const res = await fetch(`${baseUrl}/api/admin/gateway-status`);
    const cc = res.headers.get('cache-control') || '';
    assert.ok(cc.includes('no-store'), 'Must include no-store');
    assert.ok(cc.includes('no-cache'), 'Must include no-cache');
    assert.ok(cc.includes('must-revalidate'), 'Must include must-revalidate');
    assert.strictEqual(res.headers.get('pragma'), 'no-cache');
    assert.strictEqual(res.headers.get('expires'), '0');
  });

  it('4. CORS: Exposes required Cloudflare Access & Admin Step-Up headers in preflight', async () => {
    const res = await fetch(`${baseUrl}/api/admin/gateway-status`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://astroverse-eta.vercel.app',
        'Access-Control-Request-Method': 'GET'
      }
    });
    assert.strictEqual(res.status, 200);
    const allowHeaders = res.headers.get('access-control-allow-headers') || '';
    assert.ok(allowHeaders.includes('Cf-Access-Jwt-Assertion'), 'Must permit Cf-Access-Jwt-Assertion');
    assert.ok(allowHeaders.includes('X-Admin-Assurance-Token'), 'Must permit X-Admin-Assurance-Token');
    assert.ok(allowHeaders.includes('X-Admin-Mfa-Token'), 'Must permit X-Admin-Mfa-Token');
  });

  it('5. Cloudflare Access JWT: Cryptographic validation succeeds for valid RS256 assertion', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = createSignedCfAccessJwt({
      aud: 'test-admin-aud-12345',
      email: 'tiwariji0028@gmail.com',
      exp: now + 3600,
      iat: now,
      iss: 'https://astroverse-team.cloudflareaccess.com',
      sub: 'user-uuid-1'
    });

    const result = await verifyCloudflareAccessJwt(token, {
      aud: 'test-admin-aud-12345',
      expectedIssuer: 'https://astroverse-team.cloudflareaccess.com'
    });

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.claims?.email, 'tiwariji0028@gmail.com');
  });

  it('6. Cloudflare Access JWT: Rejects expired assertion', async () => {
    const past = Math.floor(Date.now() / 1000) - 300;
    const token = createSignedCfAccessJwt({
      aud: 'test-admin-aud-12345',
      email: 'tiwariji0028@gmail.com',
      exp: past,
      iat: past - 3600,
      iss: 'https://astroverse-team.cloudflareaccess.com',
      sub: 'user-uuid-1'
    });

    const result = await verifyCloudflareAccessJwt(token, {
      aud: 'test-admin-aud-12345',
      expectedIssuer: 'https://astroverse-team.cloudflareaccess.com'
    });

    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.error, 'TOKEN_EXPIRED');
  });

  it('7. Cloudflare Access JWT: Rejects audience mismatch (prevents cross-app replay)', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = createSignedCfAccessJwt({
      aud: 'foreign-app-aud-99999',
      email: 'tiwariji0028@gmail.com',
      exp: now + 3600,
      iat: now,
      iss: 'https://astroverse-team.cloudflareaccess.com',
      sub: 'user-uuid-1'
    });

    const result = await verifyCloudflareAccessJwt(token, {
      aud: 'test-admin-aud-12345',
      expectedIssuer: 'https://astroverse-team.cloudflareaccess.com'
    });

    assert.strictEqual(result.valid, false);
    assert.ok(result.error?.includes('AUDIENCE_MISMATCH'));
  });

  it('8. Cloudflare Access JWT: Rejects forged/tampered signature', async () => {
    const otherKeyPair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const now = Math.floor(Date.now() / 1000);
    const forgedToken = createSignedCfAccessJwt(
      {
        aud: 'test-admin-aud-12345',
        email: 'tiwariji0028@gmail.com',
        exp: now + 3600,
        iat: now,
        iss: 'https://astroverse-team.cloudflareaccess.com',
        sub: 'user-uuid-1'
      },
      testKid,
      otherKeyPair.privateKey // Signed with attacker key!
    );

    const result = await verifyCloudflareAccessJwt(forgedToken, {
      aud: 'test-admin-aud-12345',
      expectedIssuer: 'https://astroverse-team.cloudflareaccess.com'
    });

    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.error, 'SIGNATURE_VERIFICATION_FAILED');
  });

  it('9. Direct-Origin Bypass Protection: Fails closed when Cloudflare Access is enforced', async () => {
    process.env.CLOUDFLARE_ACCESS_REQUIRED = 'true';
    process.env.CLOUDFLARE_ACCESS_AUD = 'test-admin-aud-12345';
    process.env.CLOUDFLARE_ACCESS_TEAM_NAME = 'astroverse-team';

    // Direct request hitting Vercel URL without Cloudflare Access assertion
    const res = await fetch(`${baseUrl}/api/admin/metrics`);
    assert.strictEqual(res.status, 403);
    const data: any = await res.json();
    assert.strictEqual(data.error, 'DIRECT_ORIGIN_ACCESS_DENIED');
    assert.ok(data.message.includes('Direct origin access'));

    // Reset env
    delete process.env.CLOUDFLARE_ACCESS_REQUIRED;
  });

  it('10. Cloudflare Access Gateway: Grants transit with valid assertion to application-layer auth', async () => {
    process.env.CLOUDFLARE_ACCESS_REQUIRED = 'true';
    process.env.CLOUDFLARE_ACCESS_AUD = 'test-admin-aud-12345';
    process.env.CLOUDFLARE_ACCESS_TEAM_NAME = 'astroverse-team';
    process.env.ASTROVERSE_ADMIN_EMAILS = 'tiwariji0028@gmail.com';

    const now = Math.floor(Date.now() / 1000);
    const validToken = createSignedCfAccessJwt({
      aud: 'test-admin-aud-12345',
      email: 'tiwariji0028@gmail.com',
      exp: now + 3600,
      iat: now,
      iss: 'https://astroverse-team.cloudflareaccess.com',
      sub: 'admin-1'
    });

    // Request with valid CF Access JWT header but without application bearer token
    const res = await fetch(`${baseUrl}/api/admin/metrics`, {
      headers: {
        'Cf-Access-Jwt-Assertion': validToken
      }
    });

    // Successfully passed Cloudflare Access layer! Reached application-layer auth (HTTP 401 Unauthorized for missing bearer token)
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.headers.get('x-origin-security-gateway'), 'Cloudflare-Access-Verified');

    // Reset env
    delete process.env.CLOUDFLARE_ACCESS_REQUIRED;
    delete process.env.CLOUDFLARE_ACCESS_AUD;
    delete process.env.CLOUDFLARE_ACCESS_TEAM_NAME;
    delete process.env.ASTROVERSE_ADMIN_EMAILS;
  });
});
