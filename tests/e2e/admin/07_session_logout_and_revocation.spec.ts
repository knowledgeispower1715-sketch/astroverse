import { test, expect } from '@playwright/test';
import { injectAdminSession, clearAllStorage } from './fixtures/admin_auth_helpers';

test.describe('Tier 1 & Tier 2: Session Logout and Storage Invalidation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
    await clearAllStorage(page);
    await injectAdminSession(page);
  });

  test('TC-E2E-LOGOUT-001: Clicking Sign Out purges sessionStorage and returns to admin login', async ({ page }) => {
    await expect(page.locator('#view-admin')).toBeVisible();

    const signOutBtn = page.locator('#btn-admin-close-signout');
    await expect(signOutBtn).toBeVisible();

    // Click Sign Out
    await signOutBtn.click();

    // Verify view transition
    await expect(page.locator('#view-admin-login')).toBeVisible();
    await expect(page.locator('#view-admin')).not.toBeVisible();

    // Verify storage invalidation
    const storageState = await page.evaluate(() => ({
      token: sessionStorage.getItem('astro_admin_session_token'),
      user: sessionStorage.getItem('astro_admin_user'),
      assurance: sessionStorage.getItem('astro_admin_assurance')
    }));

    expect(storageState.token).toBeNull();
    expect(storageState.user).toBeNull();
    expect(storageState.assurance).toBeNull();
  });

  test('TC-E2E-LOGOUT-002: Form credentials and inputs are reset to blank upon logout', async ({ page }) => {
    const signOutBtn = page.locator('#btn-admin-close-signout');
    await signOutBtn.click();

    await expect(page.locator('#view-admin-login')).toBeVisible();

    const emailVal = await page.locator('#admin-login-email').inputValue();
    const passwordVal = await page.locator('#admin-login-password').inputValue();

    expect(emailVal).toBe('');
    expect(passwordVal).toBe('');
  });

  test('TC-E2E-LOGOUT-003: Direct URL navigation to protected routes after logout strictly redirects to login', async ({ page }) => {
    const signOutBtn = page.locator('#btn-admin-close-signout');
    await signOutBtn.click();

    await expect(page.locator('#view-admin-login')).toBeVisible();

    // Attempt direct navigation to protected module
    await page.goto('/admin#admin/modules/overview');
    await page.waitForLoadState('domcontentloaded');

    // Protected dashboard must NOT be displayed
    await expect(page.locator('#view-admin')).not.toBeVisible();
    await expect(page.locator('#view-admin-login')).toBeVisible();
  });

  test('TC-E2E-LOGOUT-004: Terminating session from Session Centre modal triggers complete signout', async ({ page }) => {
    // Open Session Centre modal
    await page.evaluate(() => {
      if (typeof (window as any).openAdminSessionCentreModal === 'function') {
        (window as any).openAdminSessionCentreModal();
      }
    });

    const modal = page.locator('#modal-admin-session-centre');
    await expect(modal).toBeVisible();

    // Click sign out button in modal
    const modalSignOut = modal.getByRole('button', { name: /Sign Out/i });
    await expect(modalSignOut).toBeVisible();
    await modalSignOut.click();

    // Verify returned to login and dashboard is hidden
    await expect(page.locator('#view-admin-login')).toBeVisible();
    await expect(page.locator('#view-admin')).not.toBeVisible();

    // Verify storage cleared
    const token = await page.evaluate(() => sessionStorage.getItem('astro_admin_session_token'));
    expect(token).toBeNull();
  });
});
