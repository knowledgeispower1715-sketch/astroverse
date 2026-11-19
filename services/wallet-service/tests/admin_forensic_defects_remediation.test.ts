import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import http from 'http';
import app from '../src/server';
import { db, Role, AccountStatus } from '../src/db';

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
      {
        method,
        headers: reqHeaders
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed: any;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
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

describe('Milestone M4 Defect Remediation Regression Suite', () => {
  before(async () => {
    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  describe('DEFECT-01 & Parity: showAdminDashboard DOM View Isolation', () => {
    const rootAdminPath = path.resolve(__dirname, '../../../admin.html');
    const appsAdminPath = path.resolve(__dirname, '../../../apps/admin/index.html');

    it('should maintain exact 100% byte parity between admin.html and apps/admin/index.html', () => {
      assert.ok(fs.existsSync(rootAdminPath), 'admin.html must exist');
      assert.ok(fs.existsSync(appsAdminPath), 'apps/admin/index.html must exist');
      const rootContent = fs.readFileSync(rootAdminPath, 'utf8');
      const appsContent = fs.readFileSync(appsAdminPath, 'utf8');
      assert.strictEqual(
        rootContent,
        appsContent,
        'admin.html and apps/admin/index.html must have exact file parity'
      );
    });

    it('should hide view-admin-mfa-challenge and view-admin-mfa-enrollment in showAdminDashboard()', () => {
      const content = fs.readFileSync(rootAdminPath, 'utf8');
      
      // Verify showAdminDashboard contains challengeView and enrollView hiding logic
      assert.ok(
        content.includes("document.getElementById('view-admin-mfa-challenge')"),
        'Must select view-admin-mfa-challenge in admin.html'
      );
      assert.ok(
        content.includes("document.getElementById('view-admin-mfa-enrollment')"),
        'Must select view-admin-mfa-enrollment in admin.html'
      );
      assert.ok(
        content.includes("challengeView.style.display = 'none'"),
        'Must set challengeView.style.display = none'
      );
      assert.ok(
        content.includes("enrollView.style.display = 'none'"),
        'Must set enrollView.style.display = none'
      );
      assert.ok(
        content.includes("challengeView.classList.remove('active')"),
        'Must remove active class from challengeView'
      );
      assert.ok(
        content.includes("enrollView.classList.remove('active')"),
        'Must remove active class from enrollView'
      );
    });
  });

  describe('DEFECT-04: closeAdminAndSignOut Session Storage Purge', () => {
    const rootAdminPath = path.resolve(__dirname, '../../../admin.html');

    it('should purge astro_admin_assurance_token and admin_mfa_token alongside astro_admin_assurance', () => {
      const content = fs.readFileSync(rootAdminPath, 'utf8');
      
      assert.ok(
        content.includes("'astro_admin_assurance_token'"),
        'adminSessionKeys must include astro_admin_assurance_token'
      );
      assert.ok(
        content.includes("'admin_mfa_token'"),
        'adminSessionKeys must include admin_mfa_token'
      );
      assert.ok(
        content.includes("'astro_admin_assurance'"),
        'adminSessionKeys must include astro_admin_assurance'
      );
    });
  });

  describe('DEFECT-02 & DEFECT-03: ConsultationSession Queries (startedAt vs createdAt)', () => {
    const dbSourcePath = path.resolve(__dirname, '../src/db.ts');

    it('should verify ConsultationSession queries in db.ts use startedAt instead of createdAt', () => {
      const content = fs.readFileSync(dbSourcePath, 'utf8');
      
      const consultationCalls = content.match(/consultationSession\.findMany\([\s\S]*?\)\s*[,;]/g) || [];
      assert.ok(consultationCalls.length >= 2, 'Must find at least 2 consultationSession.findMany calls in db.ts');
      for (const call of consultationCalls) {
        assert.strictEqual(
          call.includes('createdAt'),
          false,
          `consultationSession.findMany call must not reference createdAt: ${call}`
        );
        assert.ok(
          call.includes('startedAt'),
          `consultationSession.findMany call must reference startedAt: ${call}`
        );
      }
    });

    it('should successfully invoke listConsultationSessions() via db abstraction', async () => {
      const sessions = await db.listConsultationSessions(10);
      assert.ok(Array.isArray(sessions), 'listConsultationSessions must return an array');
    });

    it('should successfully query getCustomer360() without throwing Prisma column mismatch', async () => {
      // Find or use any user ID from database
      const summary = await db.listUsers({ page: 1, limit: 1 });
      const testUserId = summary.users[0]?.id || 'f152a198-2998-4f2e-811e-bd5f9190b896';
      
      const c360 = await db.getCustomer360(testUserId);
      assert.ok(c360, 'Customer 360 payload must be returned');
      assert.ok(Array.isArray(c360.consultationSessions), 'consultationSessions must be an array');
    });
  });

  describe('DEFECT-05: User Directory Summary Optimization & Caching', () => {
    it('should return complete user directory summary with all expected KPI fields', async () => {
      const summary = await db.getUserDirectorySummary(true); // forceFresh
      assert.ok(typeof summary.totalAccounts === 'number', 'totalAccounts must be a number');
      assert.ok(typeof summary.activeAccounts === 'number', 'activeAccounts must be a number');
      assert.ok(typeof summary.adminCount === 'number', 'adminCount must be a number');
      assert.ok(typeof summary.accountsAwaitingReview === 'number', 'accountsAwaitingReview must be a number');
      assert.ok(typeof summary.roleBreakdown === 'object', 'roleBreakdown must be an object');
      assert.ok(summary.roleBreakdown['USER'], 'roleBreakdown must contain USER');
      assert.ok(summary.roleBreakdown['OWNER'], 'roleBreakdown must contain OWNER');
    });

    it('should serve cached summary on subsequent call within TTL', async () => {
      const start = Date.now();
      const s1 = await db.getUserDirectorySummary(false);
      const s2 = await db.getUserDirectorySummary(false);
      const elapsed = Date.now() - start;
      
      assert.strictEqual(s1.totalAccounts, s2.totalAccounts);
      assert.ok(elapsed < 200, `Cached call must be fast (<200ms), took ${elapsed}ms`);
    });
  });

  describe('DEFECT-06: Package.json Test Scripts Completeness', () => {
    const pkgPath = path.resolve(__dirname, '../package.json');

    it('should include all 8 previously omitted test suites in package.json scripts.test', () => {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const testScript = pkg.scripts.test;

      const mandatedSuites = [
        'tests/admin_assurance_key_resilience.test.ts',
        'tests/cashfree_order_recovery_p0.test.ts',
        'tests/cashfree_raw_body_edge_cases.test.ts',
        'tests/database_reliability_and_monitor.test.ts',
        'tests/enterprise_backend_hardening_and_resilience.test.ts',
        'tests/multi_user_isolation_and_security.test.ts',
        'tests/routing_resilience.test.ts',
        'tests/unified_financial_infrastructure.test.ts'
      ];

      for (const suite of mandatedSuites) {
        assert.ok(
          testScript.includes(suite),
          `package.json test script must include ${suite}`
        );
      }
    });
  });
});
