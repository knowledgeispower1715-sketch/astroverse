import { test, expect } from '@playwright/test';
import { injectAdminSession, clearAllStorage, DEFAULT_OWNER_USER } from './fixtures/admin_auth_helpers';

test.describe('Tier 3 & Tier 4: Cross-Feature Workflows, Responsive Viewports & DOM Hygiene', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
    await clearAllStorage(page);
    await page.waitForLoadState('domcontentloaded');
  });

  test('TC-E2E-CROSS-001: Full End-to-End Administrator Lifecycle Workflow', async ({ page }) => {
    // 1. Initial State: Login Screen
    await expect(page.locator('#view-admin-login')).toBeVisible();
    await expect(page.locator('#view-admin')).not.toBeVisible();

    // 2. Perform Session Establishment (using authenticated bridge session)
    await injectAdminSession(page);
    await expect(page.locator('#view-admin')).toBeVisible();

    // 3. Verify Overview Dashboard KPIs
    await page.evaluate(() => {
      if (typeof (window as any).loadAdminOverview === 'function') {
        (window as any).loadAdminOverview();
      }
    });
    const totalUsers = page.locator('#metric-total-users');
    await expect(totalUsers).toBeVisible();
    await expect(totalUsers).not.toHaveText('--');

    // 4. Navigate to User Directory
    await page.evaluate(() => {
      if (typeof (window as any).switchAdminModule === 'function') {
        (window as any).switchAdminModule('users');
      }
      if (typeof (window as any).loadAdminUsersList === 'function') {
        (window as any).loadAdminUsersList(1);
      }
    });
    await expect(page.locator('#admin-panel-users')).toBeVisible();
    await expect(page.locator('#admin-users-tbody tr').first()).toBeVisible();

    // 5. Navigate to Roles & RBAC Matrix
    await page.evaluate(() => {
      if (typeof (window as any).switchAdminModule === 'function') {
        (window as any).switchAdminModule('roles');
      }
    });
    await expect(page.locator('#admin-panel-roles')).toBeVisible();

    // 6. Terminate Session via Sign Out
    const signOutBtn = page.locator('#btn-admin-close-signout');
    await signOutBtn.click();

    // 7. Verify Return to Login
    await expect(page.locator('#view-admin-login')).toBeVisible();
    await expect(page.locator('#view-admin')).not.toBeVisible();
  });

  test('TC-E2E-VIEW-001: Desktop Viewport (1920x1080) renders high-resolution layout without clipping', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await injectAdminSession(page);

    await expect(page.locator('#view-admin')).toBeVisible();

    // Verify global search bar is visible
    const searchBar = page.locator('#admin-global-search-input');
    await expect(searchBar).toBeVisible();

    // Verify pinned navigation bar is visible
    const pinnedBar = page.locator('#admin-quick-favorites-bar');
    await expect(pinnedBar).toBeVisible();

    // Verify action buttons in header are laid out cleanly
    const actionQueueBtn = page.getByRole('button', { name: /Action Queue/i });
    await expect(actionQueueBtn).toBeVisible();
  });

  test('TC-E2E-VIEW-002: Tablet Viewport (768x1024) adapts container without horizontal breakage', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await injectAdminSession(page);

    await expect(page.locator('#view-admin')).toBeVisible();

    // Check header adapts
    const header = page.locator('.admin-global-header');
    await expect(header).toBeVisible();

    // Check horizontal scroll bounding (allow minor subpixel/border variance)
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const windowWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(windowWidth + 10);
  });

  test('TC-E2E-VIEW-003: Mobile Viewport (375x812) exposes sidebar toggle and backdrop', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await injectAdminSession(page);

    await expect(page.locator('#view-admin')).toBeVisible();

    // Mobile sidebar toggle button should become visible on small viewports
    const toggleBtn = page.locator('#btn-admin-sidebar-toggle');
    await expect(toggleBtn).toBeVisible();

    // Toggle sidebar open
    await toggleBtn.click();

    const sidebar = page.locator('.admin-sidebar');
    await expect(sidebar).toHaveClass(/open/);

    const backdrop = page.locator('#admin-sidebar-backdrop');
    await expect(backdrop).toHaveClass(/open/);

    // Dismiss sidebar via keyboard Escape
    await page.keyboard.press('Escape');
    await expect(sidebar).not.toHaveClass(/open/);
    await expect(backdrop).not.toHaveClass(/open/);
  });

  test('TC-E2E-DOM-001: DOM Hygiene Audit - MFA Challenge & Enrollment views must not linger when Dashboard is active', async ({ page }) => {
    await injectAdminSession(page);

    // Inspect visible page-tab-views
    const lingeringViews = await page.evaluate(() => {
      const challenge = document.getElementById('view-admin-mfa-challenge');
      const enroll = document.getElementById('view-admin-mfa-enrollment');
      const admin = document.getElementById('view-admin');

      const isChallengeVisible = challenge ? (window.getComputedStyle(challenge).display !== 'none') : false;
      const isEnrollVisible = enroll ? (window.getComputedStyle(enroll).display !== 'none') : false;
      const isAdminVisible = admin ? (window.getComputedStyle(admin).display !== 'none') : false;

      return { isChallengeVisible, isEnrollVisible, isAdminVisible };
    });

    expect(lingeringViews.isAdminVisible).toBe(true);
    // When dashboard is active, neither challenge nor enrollment should be visibly rendered
    expect(lingeringViews.isChallengeVisible).toBe(false);
    expect(lingeringViews.isEnrollVisible).toBe(false);
  });
});
