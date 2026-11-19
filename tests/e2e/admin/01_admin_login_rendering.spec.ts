import { test, expect } from '@playwright/test';
import { clearAllStorage } from './fixtures/admin_auth_helpers';

test.describe('Tier 1 & Tier 2: Admin Login Page Rendering & Form Inputs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
    await clearAllStorage(page);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
  });

  test('TC-E2E-LOGIN-001: Admin portal unconditionally mounts #view-admin-login unauthenticated', async ({ page }) => {
    const loginView = page.locator('#view-admin-login');
    await expect(loginView).toBeVisible();

    const adminDashboard = page.locator('#view-admin');
    await expect(adminDashboard).not.toBeVisible();
  });

  test('TC-E2E-LOGIN-002: Header branding and security notices render correctly', async ({ page }) => {
    // Check portal title
    const heading = page.locator('#view-admin-login h2');
    await expect(heading).toHaveText(/AstroVerse Admin Portal/i);

    // Check restricted notice
    const subtext = page.locator('#view-admin-login p').first();
    await expect(subtext).toContainText('Restricted Administrative Control Centre');

    // Check security warning notice regarding staff only & google sign-in disabled
    const securityNotice = page.locator('#view-admin-login').getByText(/Authorized staff only/i);
    await expect(securityNotice).toBeVisible();
    await expect(securityNotice).toContainText('Consumer Google sign-in is disabled');
  });

  test('TC-E2E-LOGIN-003: Login form input fields and submit button are present', async ({ page }) => {
    const form = page.locator('#form-admin-login');
    await expect(form).toBeVisible();

    const emailInput = page.locator('#admin-login-email');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('required', '');

    const passwordInput = page.locator('#admin-login-password');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(passwordInput).toHaveAttribute('required', '');

    const submitBtn = page.locator('#btn-admin-login-submit');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toHaveText(/Sign In to Admin Console/i);
  });

  test('TC-E2E-LOGIN-004: Password visibility toggling switches between masked and plaintext', async ({ page }) => {
    const passwordInput = page.locator('#admin-login-password');
    const toggleBtn = page.locator('button[aria-label="Toggle password visibility"]');
    const toggleIcon = page.locator('#admin-pwd-toggle-icon');

    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(toggleIcon).toHaveClass(/fa-eye/);

    // Fill password and click toggle
    await passwordInput.fill('AdminPassword!2026');
    await toggleBtn.click();

    // Verify switched to text
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await expect(toggleIcon).toHaveClass(/fa-eye-slash/);

    // Toggle back
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(toggleIcon).toHaveClass(/fa-eye/);
  });

  test('TC-E2E-LOGIN-005: Recovery and return links are functional and well-formed', async ({ page }) => {
    const recoveryLink = page.locator('#view-admin-login').getByText(/Recovery Procedures/i);
    await expect(recoveryLink).toBeVisible();

    const returnLink = page.locator('#view-admin-login').getByRole('link', { name: /Return to AstroVerse Public App/i });
    await expect(returnLink).toBeVisible();
    await expect(returnLink).toHaveAttribute('href', '/');
  });

  test('TC-E2E-LOGIN-006: Form validation handles empty inputs and malformed credentials', async ({ page }) => {
    const emailInput = page.locator('#admin-login-email');
    const passwordInput = page.locator('#admin-login-password');
    const submitBtn = page.locator('#btn-admin-login-submit');

    // Check HTML5 validity
    const isEmailValid = await emailInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(isEmailValid).toBe(false);

    // Type invalid email format
    await emailInput.fill('not-an-email');
    const isFormatValid = await emailInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(isFormatValid).toBe(false);

    // Fill valid format email and empty password
    await emailInput.fill('admin@astroverse.ai');
    const isPasswordValid = await passwordInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(isPasswordValid).toBe(false);
  });

  test('TC-E2E-LOGIN-007: Error message banner is hidden by default', async ({ page }) => {
    const errorBanner = page.locator('#admin-login-error');
    await expect(errorBanner).not.toBeVisible();
  });
});
