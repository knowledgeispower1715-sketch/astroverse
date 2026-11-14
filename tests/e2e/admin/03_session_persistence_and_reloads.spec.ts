import { test, expect } from '@playwright/test';
import { injectAdminSession, clearAllStorage, DEFAULT_OWNER_USER, DEFAULT_SESSION_TOKEN } from './fixtures/admin_auth_helpers';

test.describe('Tier 1 & Tier 2: Session Persistence Across Navigation and Page Reloads', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
    await clearAllStorage(page);
    await page.waitForLoadState('domcontentloaded');
  });

  test('TC-E2E-SESS-001: Storage isolation strictly keeps admin credentials in sessionStorage and out of localStorage', async ({ page }) => {
    await injectAdminSession(page);

    const storageFacts = await page.evaluate(() => {
      const sToken = sessionStorage.getItem('astro_admin_session_token');
      const sUser = sessionStorage.getItem('astro_admin_user');
      const sAssurance = sessionStorage.getItem('astro_admin_assurance');

      const lToken = localStorage.getItem('astro_session_token');
      const lAdminToken = localStorage.getItem('astro_admin_session_token');
      const lUser = localStorage.getItem('astro_user_session');
      const lAdminUser = localStorage.getItem('astro_admin_user');

      return { sToken, sUser, sAssurance, lToken, lAdminToken, lUser, lAdminUser };
    });

    expect(storageFacts.sToken).toBeTruthy();
    expect(storageFacts.sUser).toBeTruthy();
    expect(storageFacts.sAssurance).toBeTruthy();

    // Verify ZERO administrative credentials leaked to localStorage
    expect(storageFacts.lToken).toBeNull();
    expect(storageFacts.lAdminToken).toBeNull();
    expect(storageFacts.lUser).toBeNull();
    expect(storageFacts.lAdminUser).toBeNull();
  });

  test('TC-E2E-SESS-002: Authenticated administrator session persists across full browser page reloads', async ({ page }) => {
    await injectAdminSession(page);

    // Verify dashboard is mounted
    await expect(page.locator('#view-admin')).toBeVisible();
    await expect(page.locator('#view-admin-login')).not.toBeVisible();

    // Perform full page reload
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Verify dashboard remains mounted and login view remains hidden
    await expect(page.locator('#view-admin')).toBeVisible();
    await expect(page.locator('#view-admin-login')).not.toBeVisible();

    // Verify identity persists in header
    const headerEmail = page.locator('#admin-header-email');
    await expect(headerEmail).toHaveText(DEFAULT_OWNER_USER.email);
  });

  test('TC-E2E-SESS-003: Session auto-lock countdown timer renders and initializes from session policy', async ({ page }) => {
    await injectAdminSession(page);

    const countdownEl = page.locator('#admin-session-countdown');
    await expect(countdownEl).toBeVisible();

    const countdownText = await countdownEl.textContent();
    expect(countdownText).toMatch(/\d{1,2}:\d{2}/);

    // Verify policy badge
    const policyBadge = page.locator('#admin-session-policy-badge');
    await expect(policyBadge).toBeVisible();
  });

  test('TC-E2E-SESS-004: Navigating between module views preserves authenticated session state', async ({ page }) => {
    await injectAdminSession(page);

    // Switch to Users module
    await page.evaluate(() => {
      if (typeof (window as any).switchAdminModule === 'function') {
        (window as any).switchAdminModule('users');
      }
    });

    await expect(page.locator('#admin-panel-users')).toBeVisible();
    await expect(page.locator('#admin-panel-overview')).not.toBeVisible();

    // Switch back to Overview module
    await page.evaluate(() => {
      if (typeof (window as any).switchAdminModule === 'function') {
        (window as any).switchAdminModule('overview');
      }
    });

    await expect(page.locator('#admin-panel-overview')).toBeVisible();
    await expect(page.locator('#admin-panel-users')).not.toBeVisible();

    // Verify dashboard container remains continuously active
    await expect(page.locator('#view-admin')).toBeVisible();
  });

  test('TC-E2E-SESS-005: Purging sessionStorage immediately reverts application to login screen on reload', async ({ page }) => {
    await injectAdminSession(page);
    await expect(page.locator('#view-admin')).toBeVisible();

    // Clear sessionStorage
    await page.evaluate(() => {
      sessionStorage.clear();
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Dashboard should not be visible; login should mount
    await expect(page.locator('#view-admin-login')).toBeVisible();
    await expect(page.locator('#view-admin')).not.toBeVisible();
  });
});
