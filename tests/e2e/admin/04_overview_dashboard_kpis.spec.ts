import { test, expect } from '@playwright/test';
import { injectAdminSession, clearAllStorage, DEFAULT_OWNER_USER } from './fixtures/admin_auth_helpers';

test.describe('Tier 1 & Tier 2: Overview / Dashboard Metrics and KPI Cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
    await clearAllStorage(page);
    await injectAdminSession(page);
  });

  test('TC-E2E-OVER-001: Global administrator header displays identity, role badge, and session controls', async ({ page }) => {
    // Verify admin dashboard container is mounted
    await expect(page.locator('#view-admin')).toBeVisible();

    // Verify email and role in header
    const emailHeader = page.locator('#admin-header-email');
    await expect(emailHeader).toHaveText(DEFAULT_OWNER_USER.email);

    const roleBadge = page.locator('#admin-role-badge');
    await expect(roleBadge).toHaveText('OWNER');

    // Verify environment badge
    const envBadge = page.locator('#admin-env-badge');
    await expect(envBadge).toBeVisible();
    await expect(envBadge).toHaveText(/PRODUCTION/i);

    // Verify session countdown pill
    const sessionPill = page.locator('#admin-session-pill');
    await expect(sessionPill).toBeVisible();

    // Verify sign out button
    const signOutBtn = page.locator('#btn-admin-close-signout');
    await expect(signOutBtn).toBeVisible();
    await expect(signOutBtn).toContainText('Sign Out');
  });

  test('TC-E2E-OVER-002: Data provenance and ground truth banner renders PostgreSQL authoritative notice', async ({ page }) => {
    const overviewPanel = page.locator('#admin-panel-overview');
    await expect(overviewPanel).toBeVisible();

    const datasourceLabel = page.locator('#admin-datasource-label');
    await expect(datasourceLabel).toBeVisible();
    await expect(datasourceLabel).toContainText('PostgreSQL 16');

    const provenanceBadge = page.locator('#admin-overall-provenance-badge');
    await expect(provenanceBadge).toBeVisible();
    await expect(provenanceBadge).toHaveText(/LIVE DATA/i);
  });

  test('TC-E2E-OVER-003: Ground truth key KPI metrics cards render expected values', async ({ page }) => {
    // Trigger overview metric population if needed
    await page.evaluate(() => {
      if (typeof (window as any).loadAdminOverview === 'function') {
        (window as any).loadAdminOverview();
      }
    });

    // Check Total Registered KPI
    const totalUsers = page.locator('#metric-total-users');
    await expect(totalUsers).toBeVisible();
    await expect(totalUsers).not.toHaveText('--');

    // Check Active Accounts KPI
    const activeUsers = page.locator('#metric-active-users');
    await expect(activeUsers).toBeVisible();
    await expect(activeUsers).not.toHaveText('--');

    // Check Suspended Accounts KPI
    const suspendedUsers = page.locator('#metric-suspended-users');
    await expect(suspendedUsers).toBeVisible();
    await expect(suspendedUsers).not.toHaveText('--');

    // Check Financial Deposits KPI
    const totalDeposits = page.locator('#metric-total-deposits');
    await expect(totalDeposits).toBeVisible();

    // Check Consultation Debits KPI
    const consultationDebits = page.locator('#metric-consultation-debits');
    await expect(consultationDebits).toBeVisible();

    // Check Saved Profiles KPI
    const totalProfiles = page.locator('#metric-total-profiles');
    await expect(totalProfiles).toBeVisible();
    await expect(totalProfiles).not.toHaveText('--');

    // Check Active Subscriptions KPI
    const activeSubs = page.locator('#metric-active-subs');
    await expect(activeSubs).toBeVisible();
    await expect(activeSubs).not.toHaveText('--');

    // Check Active Sessions KPI
    const activeSessions = page.locator('#metric-active-sessions');
    await expect(activeSessions).toBeVisible();
    await expect(activeSessions).not.toHaveText('--');
  });

  test('TC-E2E-OVER-004: Operational Command Centre queues display actionable task counters', async ({ page }) => {
    const pendingRefunds = page.locator('#action-pending-refunds');
    await expect(pendingRefunds).toBeVisible();
    await expect(pendingRefunds).toHaveText(/\d+/);

    const failedReports = page.locator('#action-failed-reports');
    await expect(failedReports).toBeVisible();
    await expect(failedReports).toHaveText(/\d+/);
  });

  test('TC-E2E-OVER-005: Pinned navigation buttons switch panels with correct visibility states', async ({ page }) => {
    const pinnedBar = page.locator('#admin-quick-favorites-bar');
    await expect(pinnedBar).toBeVisible();

    // Click Users pinned button
    const usersBtn = pinnedBar.getByRole('button', { name: /Users/i });
    await usersBtn.click();

    await expect(page.locator('#admin-panel-users')).toBeVisible();
    await expect(page.locator('#admin-panel-overview')).not.toBeVisible();

    // Click Overview pinned button
    const overviewBtn = pinnedBar.getByRole('button', { name: /Overview/i });
    await overviewBtn.click();

    await expect(page.locator('#admin-panel-overview')).toBeVisible();
    await expect(page.locator('#admin-panel-users')).not.toBeVisible();
  });
});
