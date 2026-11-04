process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_bootstrap_safety_32chars';
process.env.DATABASE_STORAGE = 'memory';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import crypto from 'crypto';
import app from '../src/server';
import { db, Role } from '../src/db';

function makeRequest(
  server: http.Server,
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body?: any
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const addr = server.address() as any;
    const req = http.request(
      {
        host: '127.0.0.1',
        port: addr.port,
        method,
        path,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      },
      res => {
        let raw = '';
        res.on('data', chunk => { raw += chunk; });
        res.on('end', () => {
          let parsed: any;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode || 500, headers: res.headers, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

describe('STAGE 6: ADMIN DATABASE BOOTSTRAP SAFETY & PRODUCTION DDL GUARDS', () => {
  let server: http.Server;
  let ownerToken: string;
  let adminToken: string;
  let userToken: string;

  before(async () => {
    server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));

    // Seed Owner
    const ownerId = `owner_${Date.now()}`;
    await db.createUser({
      id: ownerId,
      phone: '+919876543201',
      email: 'owner-bootstrap-test@astroverse.net',
      displayName: 'Platform Owner',
      role: Role.OWNER
    });
    ownerToken = `owner_tok_${crypto.randomBytes(16).toString('hex')}`;
    await db.createSession({
      userId: ownerId,
      tokenHash: crypto.createHash('sha256').update(ownerToken).digest('hex'),
      expiresAt: new Date(Date.now() + 3600000)
    });

    // Seed Security Admin
    const adminId = `admin_${Date.now()}`;
    await db.createUser({
      id: adminId,
      phone: '+919876543202',
      email: 'admin-bootstrap-test@astroverse.net',
      displayName: 'Sec Admin',
      role: Role.SECURITY_ADMIN
    });
    adminToken = `admin_tok_${crypto.randomBytes(16).toString('hex')}`;
    await db.createSession({
      userId: adminId,
      tokenHash: crypto.createHash('sha256').update(adminToken).digest('hex'),
      expiresAt: new Date(Date.now() + 3600000)
    });

    // Seed Normal User
    const userId = `user_${Date.now()}`;
    await db.createUser({
      id: userId,
      phone: '+919876543203',
      email: 'user-bootstrap-test@astroverse.net',
      displayName: 'Normal User',
      role: Role.USER
    });
    userToken = `user_tok_${crypto.randomBytes(16).toString('hex')}`;
    await db.createSession({
      userId: userId,
      tokenHash: crypto.createHash('sha256').update(userToken).digest('hex'),
      expiresAt: new Date(Date.now() + 3600000)
    });
  });

  after(async () => {
    delete process.env.ALLOW_HTTP_SCHEMA_BOOTSTRAP;
    process.env.NODE_ENV = 'test';
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  it('1. GET /api/admin/database/status returns read-only schema and connection status', async () => {
    const res = await makeRequest(server, 'GET', '/api/admin/database/status', {
      Authorization: `Bearer ${adminToken}`
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.mode, 'READ_ONLY_INSPECTION');
    assert.equal(res.body.ddlExecution, 'VERSION_CONTROLLED_MIGRATIONS_ONLY');
  });

  it('2. GET /api/admin/database/schema-status returns read-only table catalog', async () => {
    const res = await makeRequest(server, 'GET', '/api/admin/database/schema-status', {
      Authorization: `Bearer ${adminToken}`
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.status, 'READ_ONLY');
    assert.equal(res.body.migrationsManagedBy, 'CI_CD_VERSION_CONTROL');
  });

  it('3. POST /api/admin/database/bootstrap rejects unauthenticated requests with HTTP 401', async () => {
    const res = await makeRequest(server, 'POST', '/api/admin/database/bootstrap');
    assert.equal(res.status, 401);
  });

  it('4. POST /api/admin/database/bootstrap rejects ordinary customer role with HTTP 403', async () => {
    const res = await makeRequest(server, 'POST', '/api/admin/database/bootstrap', {
      Authorization: `Bearer ${userToken}`
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.error, 'FORBIDDEN_INSUFFICIENT_ROLE');
  });

  it('5. POST /api/admin/database/bootstrap rejects ordinary ADMIN role with HTTP 403 (Owner required)', async () => {
    const res = await makeRequest(server, 'POST', '/api/admin/database/bootstrap', {
      Authorization: `Bearer ${adminToken}`
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.error, 'FORBIDDEN_INSUFFICIENT_ROLE');
    assert.match(res.body.message, /Ordinary admin roles cannot trigger schema DDL/);
  });

  it('6. POST /api/admin/database/bootstrap rejects OWNER request if ALLOW_HTTP_SCHEMA_BOOTSTRAP is not set', async () => {
    delete process.env.ALLOW_HTTP_SCHEMA_BOOTSTRAP;
    const res = await makeRequest(server, 'POST', '/api/admin/database/bootstrap', {
      Authorization: `Bearer ${ownerToken}`
    });
    assert.equal(res.status, 403);
    assert.equal(res.body.error, 'BOOTSTRAP_MUTATION_DISABLED');
  });

  it('7. POST /api/admin/database/bootstrap unconditionally rejects in PRODUCTION even for OWNER', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_HTTP_SCHEMA_BOOTSTRAP = 'true';
    try {
      const res = await makeRequest(server, 'POST', '/api/admin/database/bootstrap', {
        Authorization: `Bearer ${ownerToken}`
      });
      assert.equal(res.status, 403);
      assert.equal(res.body.error, 'PRODUCTION_DDL_FORBIDDEN');
      assert.match(res.body.message, /permanently forbidden in production environments/);
    } finally {
      process.env.NODE_ENV = 'test';
      delete process.env.ALLOW_HTTP_SCHEMA_BOOTSTRAP;
    }
  });

  it('8. POST /api/admin/database/bootstrap succeeds in staging when OWNER and explicitly enabled', async () => {
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_HTTP_SCHEMA_BOOTSTRAP = 'true';
    try {
      const res = await makeRequest(server, 'POST', '/api/admin/database/bootstrap', {
        Authorization: `Bearer ${ownerToken}`
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.action, 'STAGING_BOOTSTRAP_EXECUTED');
    } finally {
      delete process.env.ALLOW_HTTP_SCHEMA_BOOTSTRAP;
    }
  });
});
