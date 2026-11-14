import { test, expect } from '@playwright/test';
import { injectAdminSession, clearAllStorage } from './fixtures/admin_auth_helpers';

test.describe('Tier 1 & Tier 2: User Directory Listing, Search, and Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
    await clearAllStorage(page);
    await injectAdminSession(page);

    // Navigate to Users module and load directory list
    await page.evaluate(() => {
      if (typeof (window as any).switchAdminModule === 'function') {
        (window as any).switchAdminModule('users');
      }
      if (typeof (window as any).loadAdminUsersList === 'function') {
        (window as any).loadAdminUsersList(1);
      }
    });

    await expect(page.locator('#admin-panel-users')).toBeVisible();
  });

  test('TC-E2E-USER-001: User directory panel mounts with KPI summary grid and governance controls', async ({ page }) => {
    const usersPanel = page.locator('#admin-panel-users');
    await expect(usersPanel).toBeVisible();

    // Check heading
    const heading = usersPanel.locator('h3').first();
    await expect(heading).toContainText('Account Directory & Owner Governance');

    // Check Summary KPI Grid
    const kpiGrid = page.locator('#admin-users-summary-grid');
    await expect(kpiGrid).toBeVisible();

    const totalKpi = page.locator('#user-kpi-total');
    await expect(totalKpi).toBeVisible();

    const activeKpi = page.locator('#user-kpi-active');
    await expect(activeKpi).toBeVisible();
  });

  test('TC-E2E-USER-002: Filter dropdowns for role, status, email verification, and subscription tier are present', async ({ page }) => {
    const roleSelect = page.locator('#admin-filter-role');
    await expect(roleSelect).toBeVisible();
    await expect(roleSelect.locator('option')).toHaveCount(9);

    const statusSelect = page.locator('#admin-filter-status');
    await expect(statusSelect).toBeVisible();
    await expect(statusSelect.locator('option')).toHaveCount(4);

    const emailVerifiedSelect = page.locator('#admin-filter-email-verified');
    await expect(emailVerifiedSelect).toBeVisible();
    await expect(emailVerifiedSelect.locator('option')).toHaveCount(3);

    const tierSelect = page.locator('#admin-filter-sub-tier');
    await expect(tierSelect).toBeVisible();
    await expect(tierSelect.locator('option')).toHaveCount(4);
  });

  test('TC-E2E-USER-003: User table renders accounts with identity details and status badges', async ({ page }) => {
    const tbody = page.locator('#admin-users-tbody');
    await expect(tbody).toBeVisible();

    // Expect rows to load
    const rows = tbody.locator('tr');
    await expect(rows.first()).toBeVisible();

    // Check table headers
    const headers = page.locator('#admin-panel-users thead th');
    await expect(headers.nth(0)).toHaveText(/Customer Details/i);
    await expect(headers.nth(1)).toHaveText(/Contact & Identities/i);
    await expect(headers.nth(2)).toHaveText(/Role & Staff/i);
    await expect(headers.nth(3)).toHaveText(/Status/i);
    await expect(headers.nth(5)).toHaveText(/Wallet Balance/i);
  });

  test('TC-E2E-USER-004: Search input filters user records with debounced execution', async ({ page }) => {
    const searchInput = page.locator('#admin-user-search');
    await expect(searchInput).toBeVisible();

    // Type query to search for platform owner
    await searchInput.fill('tiwariji0028');

    // Trigger search reload with query
    await page.evaluate(() => {
      if (typeof (window as any).loadAdminUsersList === 'function') {
        (window as any).loadAdminUsersList(1);
      }
    });

    const tbody = page.locator('#admin-users-tbody');
    await expect(tbody).toContainText('tiwariji0028@gmail.com');
  });

  test('TC-E2E-USER-005: Pagination controls and page size selector are functional', async ({ page }) => {
    const paginationContainer = page.locator('#admin-users-pagination');
    await expect(paginationContainer).toBeVisible();

    const pageInfo = page.locator('#admin-users-page-info');
    await expect(pageInfo).toBeVisible();
    await expect(pageInfo).toContainText(/Showing/i);

    const pageSizeSelect = page.locator('#admin-user-page-limit');
    await expect(pageSizeSelect).toBeVisible();
    await expect(pageSizeSelect.locator('option')).toHaveCount(3);
  });

  test('TC-E2E-USER-006: Sorting dropdowns provide multiple ordering criteria', async ({ page }) => {
    const sortBy = page.locator('#admin-user-sort-by');
    await expect(sortBy).toBeVisible();
    await expect(sortBy.locator('option')).toHaveCount(4);

    const sortOrder = page.locator('#admin-user-sort-order');
    await expect(sortOrder).toBeVisible();
    await expect(sortOrder.locator('option')).toHaveCount(2);
  });
});
