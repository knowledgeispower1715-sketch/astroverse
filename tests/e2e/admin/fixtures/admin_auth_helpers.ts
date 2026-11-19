import { Page, expect } from '@playwright/test';

export interface AdminUserFixture {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  mfaEnabled: boolean;
}

export const DEFAULT_OWNER_USER: AdminUserFixture = {
  id: 'b204eff9-1a9b-4805-8c07-c35d3a9de3ee',
  name: 'Platform Owner',
  email: 'tiwariji0028@gmail.com',
  role: 'OWNER',
  status: 'ACTIVE',
  mfaEnabled: true
};

export const DEFAULT_SESSION_TOKEN = 'mock_verified_admin_session_token_256_hash';
export const DEFAULT_ASSURANCE_TOKEN = 'mock_verified_admin_assurance_token_hmac_sha256';

/**
 * Injects an authenticated admin session directly into sessionStorage,
 * reloads the page so that DOMContentLoaded initializes currentUserSession from storage,
 * and waits for #view-admin to mount.
 */
export async function injectAdminSession(
  page: Page,
  user: AdminUserFixture = DEFAULT_OWNER_USER,
  sessionToken: string = DEFAULT_SESSION_TOKEN,
  assuranceToken: string = DEFAULT_ASSURANCE_TOKEN
) {
  await page.goto('/admin');
  await page.waitForLoadState('domcontentloaded');

  await page.evaluate(
    ({ u, sTok, aTok }) => {
      sessionStorage.setItem('astro_admin_session_token', sTok);
      sessionStorage.setItem('astro_admin_user', JSON.stringify(u));
      sessionStorage.setItem('astro_admin_assurance', aTok);

      // Clean legacy localStorage keys
      localStorage.removeItem('astro_session_token');
      localStorage.removeItem('astro_user_session');
    },
    { u: user, sTok: sessionToken, aTok: assuranceToken }
  );

  await page.reload();
  await page.waitForLoadState('domcontentloaded');

  await page.waitForSelector('#view-admin', { state: 'visible', timeout: 5000 });
}

/**
 * Clears both sessionStorage and localStorage on the target page.
 */
export async function clearAllStorage(page: Page) {
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
}
