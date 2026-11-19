import { test, expect } from '@playwright/test';
import { injectAdminSession, clearAllStorage } from './fixtures/admin_auth_helpers';

test.describe('Tier 1 & Tier 2: Gateway Status and Session Policy Endpoints', () => {
  test('TC-E2E-GATEWAY-001: Gateway status API endpoint returns authoritative origin protection and cloudflare configuration', async ({ request }) => {
    const res = await request.get('/api/admin/gateway-status');
    expect(res.status()).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('ONLINE');
    expect(data.cloudflareAccess).toBeDefined();
    expect(typeof data.cloudflareAccess.enforced).toBe('boolean');
    expect(data.originProtection).toBeDefined();
  });

  test('TC-E2E-GATEWAY-002: Navbar gateway status badge is displayed and reflects online state', async ({ page }) => {
    await page.goto('/admin');
    await clearAllStorage(page);
    await page.reload();

    const gatewayBadge = page.locator('#admin-gateway-badge');
    await expect(gatewayBadge).toBeVisible();
    await expect(gatewayBadge).toContainText(/Online|Protected|Gateway/i);
  });

  test('TC-E2E-GATEWAY-003: Session policy API endpoint returns authoritative timeout limits and MFA requirement', async ({ request }) => {
    const res = await request.get('/api/admin/session/policy');
    expect(res.status()).toBe(200);

    const policy = await res.json();
    expect(policy.idleTimeoutMinutes).toBe(10);
    expect(policy.absoluteCapMinutes).toBe(60);
    expect(policy.mfaRequired).toBe(true);
  });

  test('TC-E2E-GATEWAY-004: Supabase authentication config endpoint returns public client parameters with zero secrets', async ({ request }) => {
    const res = await request.get('/api/auth/supabase/config');
    expect(res.status()).toBe(200);

    const config = await res.json();
    expect(config.configured).toBe(true);
    expect(config.supabaseUrl).toBeDefined();

    // Security invariant: Service role keys must NEVER be exposed
    expect(config.serviceRoleKey).toBeUndefined();
    expect(config.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(config.DATABASE_URL).toBeUndefined();
  });

  test('TC-E2E-GATEWAY-005: Diagnostics troubleshooting drawer can be opened and closed from header controls', async ({ page }) => {
    await page.goto('/admin');
    await clearAllStorage(page);
    await injectAdminSession(page);

    const diagBtn = page.getByRole('button', { name: /Diagnostics/i });
    await expect(diagBtn).toBeVisible();
    await diagBtn.click();

    const drawer = page.locator('#drawer-admin-troubleshooting');
    await expect(drawer).toBeVisible();

    const closeBtn = page.locator('#btn-close-troubleshooting-drawer');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await expect(drawer).not.toBeVisible();
    }
  });
});
