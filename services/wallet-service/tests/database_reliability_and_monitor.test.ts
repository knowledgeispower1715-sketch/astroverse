process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_database_monitor_32chars';
process.env.DATABASE_STORAGE = 'memory';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import app from '../src/server';
import { db, Role } from '../src/db';
import { createRateLimiter } from '../src/security/rateLimiter';

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

describe('ASTROVERSE ENTERPRISE DATABASE RELIABILITY & MONITORING SUITE', () => {
  let server: http.Server;
  let adminToken: string;
  let customerToken: string;
  const adminId = `admin_${Date.now()}`;
  const customerId = `cust_${Date.now()}`;

  before(async () => {
    server = http.createServer(app);
    await new Promise<void>(resolve => server.listen(0, resolve));

    // Create Admin User & Session
    await db.createUser({
      id: adminId,
      email: `admin_${Date.now()}@astroverse.ai`,
      displayName: 'System Admin',
      role: Role.SUPER_ADMIN
    });
    adminToken = `adm_tok_${crypto.randomBytes(16).toString('hex')}`;
    const adminTokenHash = crypto.createHash('sha256').update(adminToken).digest('hex');
    await db.createSession({
      userId: adminId,
      tokenHash: adminTokenHash,
      expiresAt: new Date(Date.now() + 3600000)
    });

    // Create Standard Customer User & Session
    await db.createUser({
      id: customerId,
      email: `customer_${Date.now()}@astroverse.ai`,
      displayName: 'Customer Native',
      role: Role.USER
    });
    customerToken = `cust_tok_${crypto.randomBytes(16).toString('hex')}`;
    const custTokenHash = crypto.createHash('sha256').update(customerToken).digest('hex');
    await db.createSession({
      userId: customerId,
      tokenHash: custTokenHash,
      expiresAt: new Date(Date.now() + 3600000)
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  // =========================================================================
  // SECTION 1: Telemetry Health Dimensions, Table Inventory & Safeguards
  // =========================================================================
  describe('SECTION 1: Database Telemetry Contract & Health Dimensions', () => {
    it('1.1 GET /api/admin/database/monitor returns comprehensive live telemetry', async () => {
      const res = await makeRequest(server, 'GET', '/api/admin/database/monitor?fresh=true', {
        Authorization: `Bearer ${adminToken}`
      });

      assert.strictEqual(res.status, 200, 'Monitor endpoint must return HTTP 200 for admin');
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.status, 'ONLINE');
      assert.strictEqual(res.body.health, 'HEALTHY');
      assert.ok(typeof res.body.pingMs === 'number', 'pingMs must be numeric');
      assert.ok(res.body.engine, 'engine description must be present');
      assert.ok(res.body.mode, 'mode descriptor must be present');

      // Verify separate health dimensions
      assert.ok(res.body.liveness, 'liveness dimension must exist');
      assert.strictEqual(res.body.liveness.status, 'UP');
      assert.ok(res.body.readiness, 'readiness dimension must exist');
      assert.strictEqual(res.body.readiness.status, 'READY');
      assert.strictEqual(res.body.readiness.readOnlyOperations, 'FUNCTIONAL');

      assert.ok(res.body.writePath, 'writePath dimension must exist');
      assert.strictEqual(res.body.writePath.status, 'HEALTHY');
      assert.ok(res.body.writePath.durabilityStrategy.length > 0);
      assert.ok(res.body.writePath.integerPaiseAccounting.includes('ENFORCED'));

      assert.ok(res.body.connectionPool, 'connectionPool dimension must exist');
      assert.strictEqual(res.body.connectionPool.maxPoolSize, 20);

      assert.ok(res.body.storageFootprint, 'storageFootprint must exist');
      assert.ok(typeof res.body.storageFootprint.totalRecords === 'number');
      assert.ok(res.body.storageFootprint.totalTablesMonitored >= 10);
    });

    it('1.2 Verifies table inventory covers all 14 core tables with metadata', async () => {
      const res = await makeRequest(server, 'GET', '/api/admin/database/monitor', {
        Authorization: `Bearer ${adminToken}`
      });

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.tables), 'tables must be an array');
      assert.ok(res.body.tables.length >= 10, 'Should monitor at least 10 core tables');

      const tableNames = res.body.tables.map((t: any) => t.name);
      assert.ok(tableNames.includes('User'), 'User table must be monitored');
      assert.ok(tableNames.includes('UserSession'), 'UserSession table must be monitored');
      assert.ok(tableNames.includes('BirthProfile'), 'BirthProfile table must be monitored');
      assert.ok(tableNames.includes('SavedReport'), 'SavedReport table must be monitored');
      assert.ok(tableNames.includes('PaymentOrder'), 'PaymentOrder table must be monitored');
      assert.ok(tableNames.includes('WalletLedger'), 'WalletLedger table must be monitored');
      assert.ok(tableNames.includes('AuditEvent'), 'AuditEvent table must be monitored');
      assert.ok(tableNames.includes('PlatformIncident'), 'PlatformIncident table must be monitored');
      assert.ok(tableNames.includes('FeatureFlag'), 'FeatureFlag table must be monitored');
      assert.ok(tableNames.includes('PrivacyRequest'), 'PrivacyRequest table must be monitored');

      // Verify metadata schema on each table
      for (const table of res.body.tables) {
        assert.ok(table.name, 'Table must have a name');
        assert.ok(table.primaryKey, 'Table must declare its primary key');
        assert.ok(typeof table.records === 'number', 'Table must have numeric record count');
        assert.ok(table.description, 'Table must have a descriptive label');
        assert.strictEqual(table.status, 'HEALTHY');
        assert.strictEqual(table.rlsEnabled, true, 'Every monitored table must have RLS enabled');
      }
    });

    it('1.3 Verifies dynamic safeguards report actual test-backed health checks', async () => {
      const res = await makeRequest(server, 'GET', '/api/admin/database/monitor', {
        Authorization: `Bearer ${adminToken}`
      });

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.safeguards), 'safeguards must be an array');
      assert.strictEqual(res.body.safeguards.length, 4, 'Must have 4 primary security safeguards');

      const safeguardNames = res.body.safeguards.map((s: any) => s.name);
      assert.ok(safeguardNames.includes('Database Authentication & RBAC'));
      assert.ok(safeguardNames.includes('Customer Data Isolation & Supabase RLS'));
      assert.ok(safeguardNames.includes('Privileged Credential Exposure Shield'));
      assert.ok(safeguardNames.includes('Write-Ahead Financial Durability'));

      for (const sg of res.body.safeguards) {
        assert.strictEqual(sg.status, 'PASSED', 'Safeguard status must be PASSED');
        assert.ok(sg.description && sg.description.length > 5, 'Safeguard must have descriptive label');
        assert.ok(sg.evidence && sg.evidence.length > 0, 'Safeguard must cite verification evidence');
        assert.ok(sg.lastExecutedAt, 'Safeguard must have execution timestamp');
      }
    });

    it('1.4 Server-side telemetry caching: returns cached response within 5-second TTL', async () => {
      // First request (primes cache)
      const res1 = await makeRequest(server, 'GET', '/api/admin/database/monitor', {
        Authorization: `Bearer ${adminToken}`
      });
      assert.strictEqual(res1.status, 200);

      // Second immediate request without fresh=true should return cached
      const res2 = await makeRequest(server, 'GET', '/api/admin/database/monitor', {
        Authorization: `Bearer ${adminToken}`
      });
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res2.body.cached, true, 'Subsequent request within TTL must return cached: true');

      // Request with fresh=true must bypass cache
      const res3 = await makeRequest(server, 'GET', '/api/admin/database/monitor?fresh=true', {
        Authorization: `Bearer ${adminToken}`
      });
      assert.strictEqual(res3.status, 200);
      assert.strictEqual(res3.body.cached, false, 'fresh=true must bypass cache and recompute');
    });

    it('1.5 POST /api/admin/database/ping measures live roundtrip and record verification', async () => {
      const res = await makeRequest(server, 'POST', '/api/admin/database/ping', {
        Authorization: `Bearer ${adminToken}`
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'PONG');
      assert.ok(typeof res.body.pingMs === 'number' && res.body.pingMs >= 0);
      assert.ok(typeof res.body.recordsVerified === 'number');
      assert.ok(res.body.timestamp);
    });
  });

  // =========================================================================
  // SECTION 2: Access Control, Authentication & RBAC Guardrails
  // =========================================================================
  describe('SECTION 2: Access Control & Authorization Guardrails', () => {
    it('2.1 Rejects unauthenticated request to /api/admin/database/monitor with HTTP 401', async () => {
      const res = await makeRequest(server, 'GET', '/api/admin/database/monitor');
      assert.strictEqual(res.status, 401, 'Unauthenticated request must return 401');
      assert.strictEqual(res.body.error, 'UNAUTHORIZED');
    });

    it('2.2 Rejects standard customer (USER role) with HTTP 403 Forbidden', async () => {
      const res = await makeRequest(server, 'GET', '/api/admin/database/monitor', {
        Authorization: `Bearer ${customerToken}`
      });
      assert.strictEqual(res.status, 403, 'Customer role must be denied with 403');
      assert.strictEqual(res.body.error, 'FORBIDDEN');
    });

    it('2.3 Rejects unauthenticated POST /api/admin/database/ping with HTTP 401', async () => {
      const res = await makeRequest(server, 'POST', '/api/admin/database/ping');
      assert.strictEqual(res.status, 401);
    });

    it('2.4 Rejects standard customer POST /api/admin/database/ping with HTTP 403', async () => {
      const res = await makeRequest(server, 'POST', '/api/admin/database/ping', {
        Authorization: `Bearer ${customerToken}`
      });
      assert.strictEqual(res.status, 403);
    });
  });

  // =========================================================================
  // SECTION 3: Rate Limiting, HTTP 429 & Retry-After Semantics
  // =========================================================================
  describe('SECTION 3: Rate Limiting, HTTP 429 & Retry-After Semantics', () => {
    it('3.1 Rate limiter returns HTTP 429, Retry-After header, and rate limit telemetry when threshold exceeded', async () => {
      const testLimiter = createRateLimiter({
        windowMs: 1000,
        max: 2,
        message: 'Throttled for testing',
        skip: () => false
      });

      const mockReq = {
        headers: {},
        socket: { remoteAddress: '192.168.1.100' },
        ip: '192.168.1.100'
      } as any;

      const headers: Record<string, any> = {};
      let status = 200;
      let body: any = null;

      const mockRes = {
        setHeader(k: string, v: any) { headers[k.toLowerCase()] = v; },
        status(s: number) { status = s; return this; },
        json(b: any) { body = b; return this; }
      } as any;

      // Req 1: OK
      let called = false;
      testLimiter(mockReq, mockRes, () => { called = true; });
      assert.strictEqual(called, true);
      assert.strictEqual(headers['ratelimit-remaining'], 1);

      // Req 2: OK
      called = false;
      testLimiter(mockReq, mockRes, () => { called = true; });
      assert.strictEqual(called, true);
      assert.strictEqual(headers['ratelimit-remaining'], 0);

      // Req 3: Throttled (HTTP 429)
      called = false;
      testLimiter(mockReq, mockRes, () => { called = true; });
      assert.strictEqual(called, false);
      assert.strictEqual(status, 429);
      assert.strictEqual(body?.error, 'RATE_LIMIT_EXCEEDED');
      assert.ok(typeof headers['retry-after'] === 'number' && headers['retry-after'] >= 1);
      assert.ok(typeof body?.retryAfterSeconds === 'number' && body.retryAfterSeconds >= 1);

      // Request from another IP passes cleanly
      const otherIpReq = {
        headers: { 'x-forwarded-for': '192.168.1.200' },
        socket: { remoteAddress: '192.168.1.200' },
        ip: '192.168.1.200'
      } as any;

      called = false;
      testLimiter(otherIpReq, mockRes, () => { called = true; });
      assert.strictEqual(called, true, 'Distinct client IP is tracked in independent bucket');
    });

    it('3.2 Admin rate limiter threshold is calibrated to 120 reqs/min for high-throughput dashboard operation', () => {
      const serverCode = fs.readFileSync(path.resolve(__dirname, '../src/server.ts'), 'utf8');
      assert.ok(
        serverCode.includes('export const adminLimiter = createRateLimiter({\n  windowMs: 60 * 1000,\n  max: 120,'),
        'adminLimiter must be calibrated to max: 120'
      );
    });
  });

  // =========================================================================
  // SECTION 4: Frontend Contract & Resilience Verification
  // =========================================================================
  describe('SECTION 4: Frontend Contract & In-Flight Resilience Verification', () => {
    it('4.1 admin.html and apps/admin/index.html are byte-identical and contain resilience logic', () => {
      const adminPath = path.resolve(__dirname, '../../../admin.html');
      const appsAdminPath = path.resolve(__dirname, '../../../apps/admin/index.html');

      const adminHtml = fs.readFileSync(adminPath, 'utf8');
      const appsAdminHtml = fs.readFileSync(appsAdminPath, 'utf8');

      assert.strictEqual(adminHtml === appsAdminHtml, true, 'admin.html and apps/admin/index.html must be identical');

      // Verify Module 17 DOM elements
      assert.ok(adminHtml.includes('id="admin-db-status-badge-container"'), 'Status badge container must exist');
      assert.ok(adminHtml.includes('id="admin-db-status-badge"'), 'Status badge span must exist');
      assert.ok(adminHtml.includes('id="admin-db-ping-btn"'), 'Ping button ID must exist');
      assert.ok(adminHtml.includes('id="admin-db-telemetry-banner"'), 'Telemetry alert banner must exist');
      assert.ok(adminHtml.includes('id="admin-db-safeguards-grid"'), 'Safeguards grid must exist');

      // Verify resilience & cooldown functions
      assert.ok(adminHtml.includes('startDbRetryCooldown'), 'startDbRetryCooldown function must exist');
      assert.ok(adminHtml.includes('isDbMonitorLoading'), 'isDbMonitorLoading in-flight guard must exist');
      assert.ok(adminHtml.includes('lastDbTelemetryData'), 'lastDbTelemetryData cache must exist');
      assert.ok(adminHtml.includes('startAdminDbMonitorPolling'), 'startAdminDbMonitorPolling must exist');
      assert.ok(adminHtml.includes('stopAdminDbMonitorPolling'), 'stopAdminDbMonitorPolling must exist');
      assert.ok(adminHtml.includes('visibilitychange'), 'visibilitychange listener must exist');
    });

    it('4.2 Gateway badge clarifies direct origin routing when Cloudflare tunnel is in standby', () => {
      const adminPath = path.resolve(__dirname, '../../../admin.html');
      const adminHtml = fs.readFileSync(adminPath, 'utf8');

      assert.ok(adminHtml.includes('Origin Standby Gateway'), 'Badge text must be preserved');
      assert.ok(
        adminHtml.includes('Direct Vercel Origin Routing (Cloudflare Access in Standby)'),
        'Descriptive tooltip explaining direct Vercel origin must exist'
      );
    });
  });
});
