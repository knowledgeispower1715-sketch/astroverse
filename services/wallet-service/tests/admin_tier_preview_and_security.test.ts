process.env.NODE_ENV = 'test';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import app from '../src/server';
import { db, Role, AccountStatus } from '../src/db';
import { isAnyAdmin, CANONICAL_ADMIN_ROLES } from '../src/security/permissions';

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

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

describe('ASTROVERSE ADMIN TIER PREVIEW & SECURITY ISOLATION SUITE', () => {
  let server: http.Server;
  let ownerToken: string;
  let ownerId: string;
  let regularUserToken: string;
  let regularUserId: string;

  it('1. Initializes test server and authenticated actors', async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });

    // 1. Create Platform Owner (Admin)
    const owner = await db.createUser({
      email: `owner_test_${Date.now()}@astroverse.app`,
      phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`,
      displayName: 'Platform Owner'
    });
    await db.updateUser(owner.id, { role: Role.OWNER });
    ownerId = owner.id;
    ownerToken = 'test_owner_token_' + Date.now();
    await db.createSession({
      userId: owner.id,
      tokenHash: hashToken(ownerToken),
      expiresAt: new Date(Date.now() + 86400000)
    });

    // 2. Create Regular Customer (Non-Admin, Free Tier)
    const regular = await db.createUser({
      email: `customer_test_${Date.now()}@example.com`,
      phone: `+9195${Math.floor(10000000 + Math.random() * 90000000)}`,
      displayName: 'Regular Seeker'
    });
    regularUserId = regular.id;
    regularUserToken = 'test_regular_token_' + Date.now();
    await db.createSession({
      userId: regular.id,
      tokenHash: hashToken(regularUserToken),
      expiresAt: new Date(Date.now() + 86400000)
    });

    assert.ok(ownerId, 'Owner ID created');
    assert.ok(regularUserId, 'Regular user ID created');
  });

  it('2. Public DOM Verification: Tier simulator & demo wallet buttons removed from public markup', () => {
    const htmlPath = path.resolve(__dirname, '../../../index.html');
    assert.ok(fs.existsSync(htmlPath), 'index.html exists');
    const html = fs.readFileSync(htmlPath, 'utf-8');

    // Desktop header simulator is eliminated
    assert.strictEqual(
      html.includes('id="header-tier-simulator"'),
      false,
      'id="header-tier-simulator" must not exist in public HTML'
    );
    assert.strictEqual(
      html.includes('id="sim-tier-free"'),
      false,
      '#sim-tier-free must not exist in public HTML'
    );
    assert.strictEqual(
      html.includes('id="sim-tier-plus"'),
      false,
      '#sim-tier-plus must not exist in public HTML'
    );
    assert.strictEqual(
      html.includes('id="sim-tier-premium"'),
      false,
      '#sim-tier-premium must not exist in public HTML'
    );

    // Mobile drawer simulator and demo box are eliminated
    assert.strictEqual(
      html.includes('class="mobile-drawer-sim-box"'),
      false,
      '.mobile-drawer-sim-box must not exist in mobile drawer'
    );
    assert.strictEqual(
      html.includes('class="mobile-drawer-demo-box"'),
      false,
      '.mobile-drawer-demo-box must not exist in mobile drawer'
    );

    // Public wallet modal testing panel is eliminated
    assert.strictEqual(
      html.includes('id="wallet-demo-mode-panel"'),
      false,
      '#wallet-demo-mode-panel must not exist in public wallet modal'
    );
    assert.strictEqual(
      html.includes('QA DEMO ENVIRONMENT ACTIVE'),
      false,
      'QA DEMO ENVIRONMENT banner must not exist in public wallet modal'
    );

    // Admin module 16 is properly integrated inside #admin-dashboard-content
    assert.ok(
      html.includes('id="admin-panel-qa"'),
      '#admin-panel-qa must exist inside administrative console'
    );
    assert.ok(
      html.includes('switchAdminModule(\'qa\')'),
      'Module 16 navigation pill must exist in admin console'
    );

    // Floating preview banner is defined and initially hidden
    assert.ok(
      html.includes('id="admin-preview-floating-banner"'),
      '#admin-preview-floating-banner must exist'
    );
  });

  it('3. Non-admin authorization rejection: Unauthenticated requests return 401', async () => {
    const endpoints = [
      { method: 'POST', path: '/api/admin/preview/set-tier', body: { tier: 'PREMIUM' } },
      { method: 'GET', path: '/api/admin/preview/status' },
      { method: 'POST', path: '/api/admin/preview/exit' },
      { method: 'POST', path: '/api/admin/demo-wallet/credit', body: { amount: 500 } },
      { method: 'POST', path: '/api/admin/demo-wallet/reset' },
      { method: 'POST', path: '/api/subscriptions/simulate-tier', body: { tier: 'PREMIUM' } }
    ];

    for (const ep of endpoints) {
      const res = await makeRequest(server, ep.method, ep.path, {}, ep.body);
      assert.strictEqual(res.status, 401, `Anonymous request to ${ep.path} must return 401`);
    }
  });

  it('4. Non-admin authorization rejection: Regular users return 403 FORBIDDEN on all preview & simulation endpoints', async () => {
    const endpoints = [
      { method: 'POST', path: '/api/admin/preview/set-tier', body: { tier: 'PREMIUM' } },
      { method: 'GET', path: '/api/admin/preview/status' },
      { method: 'POST', path: '/api/admin/preview/exit' },
      { method: 'POST', path: '/api/admin/demo-wallet/credit', body: { amount: 500 } },
      { method: 'POST', path: '/api/admin/demo-wallet/reset' },
      { method: 'POST', path: '/api/subscriptions/simulate-tier', body: { tier: 'PREMIUM' } },
      { method: 'POST', path: '/api/demo/set-tier', body: { tier: 'PREMIUM' } },
      { method: 'POST', path: '/api/demo/credit', body: { amount: 500 } },
      { method: 'POST', path: '/api/demo/reset' }
    ];

    for (const ep of endpoints) {
      const res = await makeRequest(
        server,
        ep.method,
        ep.path,
        { Authorization: `Bearer ${regularUserToken}` },
        ep.body
      );
      assert.strictEqual(res.status, 403, `Regular user calling ${ep.path} must receive 403 FORBIDDEN`);
      assert.strictEqual(res.body.error, 'FORBIDDEN');
    }
  });

  it('5. Anti-tampering: Regular user passing x-simulated-tier header is strictly ignored', async () => {
    // Regular user calls AI quota endpoint passing spoofed header 'x-simulated-tier: PREMIUM'
    const res = await makeRequest(
      server,
      'POST',
      '/api/ai-astrologer/consume-quota',
      {
        Authorization: `Bearer ${regularUserToken}`,
        'x-simulated-tier': 'PREMIUM'
      }
    );

    assert.strictEqual(res.status, 200);
    // Regular user is Free tier; Free daily AI limit is exactly 3 queries, NOT 30!
    assert.strictEqual(
      res.body.totalAllowed,
      3,
      'Server must ignore x-simulated-tier for non-admin callers and enforce Free tier limit of 3'
    );
  });

  it('6. Anti-tampering: Regular user cannot unlock Numerology Studio business analysis with simulated header', async () => {
    const res = await makeRequest(
      server,
      'POST',
      '/api/numerology/analyze',
      {
        Authorization: `Bearer ${regularUserToken}`,
        'x-simulated-tier': 'PREMIUM'
      },
      {
        name: 'AstroTech Enterprise',
        analysisTarget: 'business_name'
      }
    );

    assert.strictEqual(res.status, 403, 'Business name analysis must be rejected for non-admin Free user');
    assert.ok(
      ['UPGRADE_REQUIRED', 'PREMIUM_TIER_REQUIRED'].includes(res.body.error),
      `Expected error code to indicate tier upgrade required, got: ${res.body.error}`
    );
  });

  it('7. Admin Preview Lifecycle: Authenticated Administrator activates Premium preview mode', async () => {
    const res = await makeRequest(
      server,
      'POST',
      '/api/admin/preview/set-tier',
      { Authorization: `Bearer ${ownerToken}` },
      {
        tier: 'PREMIUM',
        demoBalance: 1000,
        syntheticProfileId: 'synth_aryan_tiwari'
      }
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.previewSession.simulatedTier, 'PREMIUM');
    assert.strictEqual(res.body.previewSession.isActive, true);
    assert.strictEqual(res.body.previewSession.adminUserId, ownerId);
    assert.ok(res.body.previewSession.expiresAt, 'ExpiresAt is set');
  });

  it('8. Admin Preview Status: GET /api/admin/preview/status returns active session', async () => {
    const res = await makeRequest(
      server,
      'GET',
      '/api/admin/preview/status',
      { Authorization: `Bearer ${ownerToken}` }
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.isPreviewActive, true);
    assert.strictEqual(res.body.previewSession.simulatedTier, 'PREMIUM');
  });

  it('9. Entitlement snapshot reflects simulated Premium tier during admin preview', async () => {
    const res = await makeRequest(
      server,
      'GET',
      '/api/entitlements/me',
      { Authorization: `Bearer ${ownerToken}` }
    );

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.tier, 'PREMIUM');
    assert.strictEqual(res.body.dailyAiQuotaTotal, 30, 'Premium tier daily AI quota is 30');
    assert.strictEqual(res.body.reportDiscountPercent, 20, 'Premium tier report discount is 20%');
  });

  it('10. Admin calls AI quota and Numerology under active preview session', async () => {
    // AI quota allows 30 under Premium
    const aiRes = await makeRequest(
      server,
      'POST',
      '/api/ai-astrologer/consume-quota',
      { Authorization: `Bearer ${ownerToken}` }
    );
    assert.strictEqual(aiRes.status, 200);
    assert.strictEqual(aiRes.body.totalAllowed, 30, 'Admin preview resolves 30 allowed queries');

    // Numerology allows business name analysis under Premium preview
    const numRes = await makeRequest(
      server,
      'POST',
      '/api/numerology/analyze',
      { Authorization: `Bearer ${ownerToken}` },
      {
        name: 'AstroTech Solutions',
        analysisTarget: 'business_name'
      }
    );
    assert.strictEqual(numRes.status, 200);
    assert.strictEqual(numRes.body.success, true);
    assert.ok(numRes.body.nameNumbers || numRes.body.target === 'business_name', 'Business name analysis returned for simulated Premium');
  });

  it('11. Financial Isolation: Demo wallet credits mutate demo balance only, leaving real wallet balance at 0.00', async () => {
    const credRes = await makeRequest(
      server,
      'POST',
      '/api/admin/demo-wallet/credit',
      { Authorization: `Bearer ${ownerToken}` },
      { amount: 500 }
    );

    assert.strictEqual(credRes.status, 200);
    assert.strictEqual(credRes.body.success, true);
    assert.ok(credRes.body.newDemoBalance >= 500, 'Demo wallet balance credited');

    // Check real wallet balance: must be exactly 0.00
    const realWalletRes = await makeRequest(
      server,
      'GET',
      '/api/wallet/balance',
      { Authorization: `Bearer ${ownerToken}` }
    );
    assert.strictEqual(realWalletRes.status, 200);
    assert.strictEqual(realWalletRes.body.balance, 0, 'Real customer wallet balance must remain 0.00');
  });

  it('12. Exit Preview Mode: Terminating preview restores genuine customer entitlements', async () => {
    const exitRes = await makeRequest(
      server,
      'POST',
      '/api/admin/preview/exit',
      { Authorization: `Bearer ${ownerToken}` }
    );

    assert.strictEqual(exitRes.status, 200);
    assert.strictEqual(exitRes.body.success, true);

    // Verify status returns inactive
    const statusRes = await makeRequest(
      server,
      'GET',
      '/api/admin/preview/status',
      { Authorization: `Bearer ${ownerToken}` }
    );
    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.body.isPreviewActive, false);
    assert.strictEqual(statusRes.body.previewSession, null);

    // Verify entitlements return to genuine Free tier
    const entRes = await makeRequest(
      server,
      'GET',
      '/api/entitlements/me',
      { Authorization: `Bearer ${ownerToken}` }
    );
    assert.strictEqual(entRes.status, 200);
    assert.strictEqual(entRes.body.tier, 'FREE');
    assert.strictEqual(entRes.body.dailyAiQuotaTotal, 3);
    assert.strictEqual(entRes.body.reportDiscountPercent, 0);
  });

  it('13. Audit trail records preview activation and termination events', async () => {
    const { events } = await db.listAuditEvents();
    const activatedEvent = events.find((e: any) => e.action === 'ADMIN_TIER_PREVIEW_ACTIVATED' && e.userId === ownerId);
    const exitedEvent = events.find((e: any) => e.action === 'ADMIN_TIER_PREVIEW_EXITED' && e.userId === ownerId);

    assert.ok(activatedEvent, 'ADMIN_TIER_PREVIEW_ACTIVATED audit event must be recorded');
    assert.strictEqual(activatedEvent.metadata?.simulatedTier, 'PREMIUM');
    assert.ok(exitedEvent, 'ADMIN_TIER_PREVIEW_EXITED audit event must be recorded');
  });

  it('14. Teardown test server', async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
