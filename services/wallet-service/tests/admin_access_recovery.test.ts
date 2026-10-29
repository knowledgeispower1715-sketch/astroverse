process.env.NODE_ENV = 'test';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import app from '../src/server';
import { db, Role, AccountStatus } from '../src/db';
import { EntitlementManager } from '../src/monetization/entitlements';
import { SubscriptionTier } from '../src/monetization/catalog';
import { provisionAdmin, CANONICAL_ADMIN_ROLES } from '../src/scripts/provisionAdmin';
import {
  isAuthorizedAdminEmail,
  getAuthorizedAdminEmails,
  isAdminPreviewEnabled
} from '../src/security/permissions';

function makeRequest(
  server: http.Server,
  method: string,
  reqPath: string,
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
        path: reqPath,
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

describe('ASTROVERSE ADMIN ACCESS RECOVERY & SECURITY SPECIFICATION MATRIX', () => {
  let server: http.Server;
  let regularUserToken: string;
  let regularUserId: string;
  let allowlistedOwnerToken: string;
  let allowlistedOwnerId: string;
  const allowlistEmail = 'owner.vip@astroverse.app';

  before(async () => {
    process.env.ASTROVERSE_ADMIN_EMAILS = allowlistEmail;
    process.env.ASTROVERSE_ADMIN_PREVIEW_ENABLED = 'true';

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => resolve());
    });

    // Seed regular user (Role.USER)
    const regUser = await db.createUser({
      email: 'regular.seeker@example.com',
      displayName: 'Regular Seeker',
      role: Role.USER,
      emailVerified: true,
      walletBalance: 0.00
    });
    regularUserId = regUser.id;
    regularUserToken = 'token_regular_' + Date.now();
    await db.createSession({
      userId: regUser.id,
      tokenHash: hashToken(regularUserToken),
      expiresAt: new Date(Date.now() + 86400000)
    });

    // Seed allowlisted owner (Role.OWNER)
    const ownerUser = await db.createUser({
      email: allowlistEmail,
      displayName: 'Authorized Owner',
      role: Role.OWNER,
      emailVerified: true,
      walletBalance: 0.00
    });
    allowlistedOwnerId = ownerUser.id;
    allowlistedOwnerToken = 'token_owner_' + Date.now();
    await db.createSession({
      userId: ownerUser.id,
      tokenHash: hashToken(allowlistedOwnerToken),
      expiresAt: new Date(Date.now() + 86400000)
    });
  });

  after(async () => {
    delete process.env.ASTROVERSE_ADMIN_EMAILS;
    delete process.env.ASTROVERSE_ADMIN_PREVIEW_ENABLED;
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // Actor 1
  it('Actor 1: Unauthenticated Visitor -> Admin API returns 401 Unauthorized', async () => {
    const res = await makeRequest(server, 'GET', '/api/admin/overview');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'UNAUTHORIZED');
  });

  // Actor 2
  it('Actor 2: Ordinary Authenticated User (Role.USER) -> Admin API returns 403 Forbidden', async () => {
    const res = await makeRequest(server, 'GET', '/api/admin/overview', {
      Authorization: `Bearer ${regularUserToken}`
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, 'FORBIDDEN');
  });

  // Actor 3
  it('Actor 3: Public User Attempting Admin Tier Simulator -> returns 403 Forbidden', async () => {
    const res = await makeRequest(server, 'POST', '/api/admin/preview/set-tier', {
      Authorization: `Bearer ${regularUserToken}`
    }, { tier: 'PREMIUM' });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error, 'FORBIDDEN');
  });

  // Actor 4
  it('Actor 4: Allowlist Bootstrap via Email Allowlist Helper -> accurately normalizes and detects', () => {
    assert.strictEqual(isAuthorizedAdminEmail(allowlistEmail), true);
    assert.strictEqual(isAuthorizedAdminEmail('OWNER.VIP@ASTROVERSE.APP'), true);
    assert.strictEqual(isAuthorizedAdminEmail('attacker@evil.com'), false);
    assert.strictEqual(isAuthorizedAdminEmail(undefined), false);
    assert.deepStrictEqual(getAuthorizedAdminEmails(), [allowlistEmail]);
  });

  // Actor 5
  it('Actor 5: Allowlist Bootstrap via Database User Creation -> auto-promotes to Role.OWNER', async () => {
    const freshAllowlistedEmail = 'co_owner@astroverse.app';
    process.env.ASTROVERSE_ADMIN_EMAILS = `${allowlistEmail}, ${freshAllowlistedEmail}`;

    const created = await db.createUser({
      email: freshAllowlistedEmail,
      displayName: 'Co Owner',
      role: Role.USER // should be overridden by allowlist
    });

    assert.strictEqual(created.role, Role.OWNER, 'Allowlisted user must be created as OWNER');
  });

  // Actor 6
  it('Actor 6: Allowlist Bootstrap via Supabase Sync -> assigns Role.OWNER', async () => {
    const supaEmail = 'supa_admin@astroverse.app';
    process.env.ASTROVERSE_ADMIN_EMAILS = `${allowlistEmail}, ${supaEmail}`;

    const synced = await db.syncSupabaseUser({
      id: 'supa_usr_' + Date.now(),
      email: supaEmail,
      user_metadata: { full_name: 'Supabase Admin' }
    });

    assert.strictEqual(synced.role, Role.OWNER, 'Supabase synced allowlisted user must have Role.OWNER');
  });

  // Actor 7
  it('Actor 7: Existing User Login Promotion -> promoting Role.USER to Role.OWNER if in allowlist', async () => {
    const testEmail = 'promoted_owner@astroverse.app';
    // Create as USER when not in allowlist
    process.env.ASTROVERSE_ADMIN_EMAILS = allowlistEmail;
    const existing = await db.createUser({
      email: testEmail,
      role: Role.USER
    });
    assert.strictEqual(existing.role, Role.USER);

    // Now add to allowlist and simulate Supabase/login sync
    process.env.ASTROVERSE_ADMIN_EMAILS = `${allowlistEmail}, ${testEmail}`;
    const synced = await db.syncSupabaseUser({
      id: existing.id,
      email: testEmail
    });
    assert.strictEqual(synced.role, Role.OWNER, 'Existing user must be promoted to OWNER upon allowlist match');
  });

  // Actor 8
  it('Actor 8: CLI Provisioning New Admin -> creates active administrator with specified role', async () => {
    const cliEmail = `cli_admin_${Date.now()}@astroverse.app`;
    const res = await provisionAdmin({
      email: cliEmail,
      role: 'OWNER',
      displayName: 'CLI Super Admin'
    });

    assert.strictEqual(res.action, 'CREATED');
    assert.strictEqual(res.user.email, cliEmail);
    assert.strictEqual(res.user.role, Role.OWNER);
    assert.strictEqual(res.user.status, AccountStatus.ACTIVE);
  });

  // Actor 9
  it('Actor 9: CLI Provisioning Idempotency & Role Update -> updates existing user role', async () => {
    const cliEmail = `cli_update_${Date.now()}@astroverse.app`;
    await provisionAdmin({ email: cliEmail, role: 'OWNER' });

    // Re-run with SECURITY_ADMIN
    const res = await provisionAdmin({ email: cliEmail, role: 'SECURITY_ADMIN' });
    assert.strictEqual(res.action, 'PROMOTED');
    assert.strictEqual(res.user.role, Role.SECURITY_ADMIN);
  });

  // Actor 10
  it('Actor 10: Server Preview Flag Guard (Disabled) -> fails closed with 403 ADMIN_PREVIEW_DISABLED', async () => {
    // Temporarily disable preview
    const oldVal = process.env.ASTROVERSE_ADMIN_PREVIEW_ENABLED;
    const oldNodeEnv = process.env.NODE_ENV;
    process.env.ASTROVERSE_ADMIN_PREVIEW_ENABLED = 'false';
    process.env.NODE_ENV = 'production';

    try {
      const res = await makeRequest(server, 'POST', '/api/admin/preview/set-tier', {
        Authorization: `Bearer ${allowlistedOwnerToken}`
      }, { tier: 'PREMIUM' });

      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.error, 'ADMIN_PREVIEW_DISABLED');
    } finally {
      process.env.ASTROVERSE_ADMIN_PREVIEW_ENABLED = oldVal;
      process.env.NODE_ENV = oldNodeEnv;
    }
  });

  // Actor 11
  it('Actor 11: Server Preview Flag Guard (Enabled) -> activates preview session for admin', async () => {
    process.env.ASTROVERSE_ADMIN_PREVIEW_ENABLED = 'true';
    process.env.ASTROVERSE_ADMIN_EMAILS = allowlistEmail;

    const res = await makeRequest(server, 'POST', '/api/admin/preview/set-tier', {
      Authorization: `Bearer ${allowlistedOwnerToken}`
    }, { tier: 'PREMIUM', syntheticProfileId: 'synth_aryan_tiwari' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.previewSession.simulatedTier, 'PREMIUM');
    assert.strictEqual(res.body.previewSession.syntheticProfileId, 'synth_aryan_tiwari');
  });

  // Actor 12
  it('Actor 12: Preview Tier Switching (FREE -> PLUS -> PREMIUM) -> EntitlementManager resolves tier', async () => {
    process.env.ASTROVERSE_ADMIN_PREVIEW_ENABLED = 'true';

    // Switch to PLUS
    const resPlus = await makeRequest(server, 'POST', '/api/admin/preview/set-tier', {
      Authorization: `Bearer ${allowlistedOwnerToken}`
    }, { tier: 'PLUS' });
    assert.strictEqual(resPlus.status, 200);

    // Verify user simulated tier in EntitlementManager
    const ownerRecord = await db.findUserById(allowlistedOwnerId);
    assert.ok(ownerRecord);
    const entitlementsPlus = EntitlementManager.resolveEffectiveTier(ownerRecord);
    assert.strictEqual(entitlementsPlus.tier, SubscriptionTier.PLUS);

    // Switch to PREMIUM
    const resPrem = await makeRequest(server, 'POST', '/api/admin/preview/set-tier', {
      Authorization: `Bearer ${allowlistedOwnerToken}`
    }, { tier: 'PREMIUM' });
    assert.strictEqual(resPrem.status, 200);

    const entitlementsPrem = EntitlementManager.resolveEffectiveTier(ownerRecord);
    assert.strictEqual(entitlementsPrem.tier, SubscriptionTier.PREMIUM);
  });

  // Actor 13
  it('Actor 13: Financial & Data Isolation -> Demo wallet credit & reset never touch real customer balance', async () => {
    process.env.ASTROVERSE_ADMIN_PREVIEW_ENABLED = 'true';

    // Credit 500 demo rupees
    const creditRes = await makeRequest(server, 'POST', '/api/admin/demo-wallet/credit', {
      Authorization: `Bearer ${allowlistedOwnerToken}`
    }, { amount: 500 });
    assert.strictEqual(creditRes.status, 200);
    assert.strictEqual(creditRes.body.newDemoBalance, 500);

    // Real wallet balance on user record must remain strictly 0.00
    const ownerRecord = await db.findUserById(allowlistedOwnerId);
    assert.ok(ownerRecord);
    assert.strictEqual(ownerRecord.walletBalance, 0.00, 'Real wallet balance must remain untouched');

    // Reset demo wallet
    const resetRes = await makeRequest(server, 'POST', '/api/admin/demo-wallet/reset', {
      Authorization: `Bearer ${allowlistedOwnerToken}`
    });
    assert.strictEqual(resetRes.status, 200);
    assert.strictEqual(resetRes.body.newDemoBalance, 0.00);

    // Exit preview mode
    const exitRes = await makeRequest(server, 'POST', '/api/admin/preview/exit', {
      Authorization: `Bearer ${allowlistedOwnerToken}`
    });
    assert.strictEqual(exitRes.status, 200);
    assert.strictEqual(exitRes.body.success, true);
  });

  // Actor 14
  it('Actor 14: Allowlist Revocation -> removed admin from allowlist fails closed with 403 Forbidden', async () => {
    // Current allowlist contains only a different email
    process.env.ASTROVERSE_ADMIN_EMAILS = 'different_admin@astroverse.app';

    // The previously authorized owner token should now be rejected because their email is not in the active allowlist
    const res = await makeRequest(server, 'GET', '/api/admin/overview', {
      Authorization: `Bearer ${allowlistedOwnerToken}`
    });

    assert.strictEqual(res.status, 403, 'Revoked administrator must receive 403 Forbidden');
    assert.strictEqual(res.body.error, 'FORBIDDEN');
    assert.ok(res.body.message.includes('revoked from the server allowlist'));
  });
});
