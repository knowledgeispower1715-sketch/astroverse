import { test, expect } from '@playwright/test';
import { clearAllStorage } from './fixtures/admin_auth_helpers';

test.describe('Tier 1 & Tier 2: MFA Challenge View & Credential Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
    await clearAllStorage(page);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
  });

  test('TC-E2E-MFA-001: Dedicated MFA challenge view contains expected DOM elements and styling', async ({ page }) => {
    // Reveal MFA challenge view via page context
    await page.evaluate(() => {
      if (typeof (window as any).showAdminMfaChallenge === 'function') {
        (window as any).showAdminMfaChallenge({ email: 'tiwariji0028@gmail.com', role: 'OWNER' });
      } else {
        const challengeView = document.getElementById('view-admin-mfa-challenge');
        if (challengeView) {
          challengeView.style.display = 'flex';
          challengeView.classList.add('active');
        }
      }
    });

    const challengeView = page.locator('#view-admin-mfa-challenge');
    await expect(challengeView).toBeVisible();

    const heading = challengeView.locator('h2');
    await expect(heading).toHaveText(/ADMIN TWO-FACTOR AUTHENTICATION/i);

    const description = challengeView.locator('p').first();
    await expect(description).toContainText('6-digit security code from your authenticator app');
  });

  test('TC-E2E-MFA-002: MFA 6-digit input enforces pattern, length, and monospace formatting', async ({ page }) => {
    await page.evaluate(() => {
      const challengeView = document.getElementById('view-admin-mfa-challenge');
      const loginView = document.getElementById('view-admin-login');
      if (loginView) loginView.style.display = 'none';
      if (challengeView) {
        challengeView.style.display = 'flex';
        challengeView.classList.add('active');
      }
    });

    const codeInput = page.locator('#mfa-challenge-code');
    await expect(codeInput).toBeVisible();
    await expect(codeInput).toHaveAttribute('maxlength', '6');
    await expect(codeInput).toHaveAttribute('pattern', '[0-9]{6}');
    await expect(codeInput).toHaveAttribute('required', '');

    // Check submit button
    const submitBtn = page.locator('#btn-mfa-challenge-verify');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toHaveText(/Verify & Continue to Admin Console/i);
  });

  test('TC-E2E-MFA-003: Cancelling MFA challenge returns to admin login and hides challenge view', async ({ page }) => {
    await page.evaluate(() => {
      const challengeView = document.getElementById('view-admin-mfa-challenge');
      const loginView = document.getElementById('view-admin-login');
      if (loginView) loginView.style.display = 'none';
      if (challengeView) {
        challengeView.style.display = 'flex';
        challengeView.classList.add('active');
      }
    });

    const cancelBtn = page.locator('#view-admin-mfa-challenge').getByRole('button', { name: /Sign Out & Return to Login/i });
    await expect(cancelBtn).toBeVisible();

    await cancelBtn.click();

    // Verify view-admin-login is now visible
    const loginView = page.locator('#view-admin-login');
    await expect(loginView).toBeVisible();

    // Verify challenge view is hidden
    const challengeView = page.locator('#view-admin-mfa-challenge');
    await expect(challengeView).not.toBeVisible();
  });

  test('TC-E2E-MFA-004: MFA challenge error banner surfaces formatted authentication failure messages', async ({ page }) => {
    await page.evaluate(() => {
      const challengeView = document.getElementById('view-admin-mfa-challenge');
      const loginView = document.getElementById('view-admin-login');
      if (loginView) loginView.style.display = 'none';
      if (challengeView) {
        challengeView.style.display = 'flex';
        challengeView.classList.add('active');
      }
    });

    const errorBanner = page.locator('#mfa-challenge-error');
    await expect(errorBanner).not.toBeVisible();

    // Trigger error display via client error formatter
    await page.evaluate(() => {
      const banner = document.getElementById('mfa-challenge-error');
      if (banner && typeof (window as any).formatMfaErrorMessage === 'function') {
        banner.textContent = (window as any).formatMfaErrorMessage({ code: 'invalid_grant', message: 'verification code is invalid' });
        banner.style.display = 'block';
      }
    });

    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText(/Invalid two-factor authentication code/i);
  });

  test('TC-E2E-MFA-005: First-time MFA enrollment view renders QR container, instructions, and manual secret', async ({ page }) => {
    await page.evaluate(() => {
      const enrollView = document.getElementById('view-admin-mfa-enrollment');
      const loginView = document.getElementById('view-admin-login');
      if (loginView) loginView.style.display = 'none';
      if (enrollView) {
        enrollView.style.display = 'flex';
        enrollView.classList.add('active');
      }
    });

    const enrollView = page.locator('#view-admin-mfa-enrollment');
    await expect(enrollView).toBeVisible();

    // Verify title and instructions
    await expect(enrollView.locator('h2')).toHaveText(/ADMIN SECURITY SETUP/i);
    await expect(enrollView).toContainText('Scan this QR code using Google Authenticator');

    // Verify QR container
    const qrContainer = page.locator('#mfa-enroll-qr-container');
    await expect(qrContainer).toBeVisible();

    // Verify manual secret input and copy button
    const secretInput = page.locator('#mfa-enroll-secret');
    await expect(secretInput).toBeVisible();
    await expect(secretInput).toHaveAttribute('readonly', '');

    const copyBtn = page.locator('button[onclick="copyMfaEnrollSecret()"]');
    await expect(copyBtn).toBeVisible();

    // Verify enrollment verification input
    const codeInput = page.locator('#mfa-enroll-code');
    await expect(codeInput).toBeVisible();
    await expect(codeInput).toHaveAttribute('maxlength', '6');

    // Cancel enrollment
    const cancelBtn = page.locator('#view-admin-mfa-enrollment').getByRole('button', { name: /Cancel & Sign Out/i });
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();

    await expect(page.locator('#view-admin-login')).toBeVisible();
    await expect(enrollView).not.toBeVisible();
  });
});
