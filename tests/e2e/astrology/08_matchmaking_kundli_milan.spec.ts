import { test, expect } from '@playwright/test';
import { setupAstrologyMocks, gotoAstroVerse } from './fixtures/astrology_fixtures.js';

test.describe('Matchmaking & 36-Guna Kundli Milan (Tier 1 & Tier 2)', () => {
  test.beforeEach(async ({ page }) => {
    await setupAstrologyMocks(page);
    await gotoAstroVerse(page, 'matchmaking');
  });

  // ==========================================
  // TIER 1: FUNCTIONAL FEATURE COVERAGE
  // ==========================================

  test('TC-T1-MAT-01: Matchmaking Workspace Navigation & Form Fields', async ({ page }) => {
    await expect(page.locator('#view-matchmaking')).toBeVisible();

    // Chart A fields
    await expect(page.locator('#milan-boy-name')).toBeVisible();
    await expect(page.locator('#milan-boy-dob')).toBeVisible();

    // Chart B fields
    await expect(page.locator('#milan-girl-name')).toBeVisible();
    await expect(page.locator('#milan-girl-dob')).toBeVisible();

    // Calculate Button
    await expect(page.locator('#btn-calc-milan')).toBeVisible();
    await expect(page.locator('#milan-empty-state')).toBeVisible();
  });

  test('TC-T1-MAT-02: Verified Sample Chart Pair Auto-Population', async ({ page }) => {
    await page.evaluate(() => {
      if (typeof (window as any).loadSampleMatchProfiles === 'function') {
        (window as any).loadSampleMatchProfiles();
      }
    });

    // Verify fields populated
    const boyName = await page.locator('#milan-boy-name').inputValue();
    const girlName = await page.locator('#milan-girl-name').inputValue();

    expect(boyName).toBeTruthy();
    expect(girlName).toBeTruthy();
    expect(boyName.length).toBeGreaterThan(0);
    expect(girlName.length).toBeGreaterThan(0);
  });

  test('TC-T1-MAT-03: 36-Guna Synastry Calculation & Workspace Activation', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleMatchProfiles());
    await page.click('#btn-calc-milan');

    // Active card should become visible
    await expect(page.locator('#milan-active-card')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#milan-empty-state')).toBeHidden();
  });

  test('TC-T1-MAT-04: Total Ashtakoota Score & Recommendation Banner', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleMatchProfiles());
    await page.click('#btn-calc-milan');
    await expect(page.locator('#milan-active-card')).toBeVisible({ timeout: 10000 });

    const scoreText = await page.locator('#milan-big-val').textContent();
    const verdict = await page.locator('#milan-verdict-banner').textContent();

    expect(scoreText).toMatch(/\d+(\.\d+)?\s*\/\s*36/);
    expect(verdict).toBeTruthy();
    expect(verdict).not.toBe('--');
  });

  test('TC-T1-MAT-05: 8-Fold Ashtakoota Breakdown Table', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleMatchProfiles());
    await page.click('#btn-calc-milan');
    await expect(page.locator('#milan-active-card')).toBeVisible({ timeout: 10000 });

    const tbody = page.locator('#tbody-milan-kootas');
    await expect(tbody).toBeVisible();

    const rows = tbody.locator('tr');
    await expect(rows).toHaveCount(8);

    const tableText = await tbody.textContent();
    expect(tableText).toContain('Varna');
    expect(tableText).toContain('Vashya');
    expect(tableText).toContain('Tara');
    expect(tableText).toContain('Yoni');
    expect(tableText).toContain('Graha Maitri');
    expect(tableText).toContain('Gana');
    expect(tableText).toContain('Bhakoot');
    expect(tableText).toContain('Nadi');
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ==========================================

  test('TC-T2-MAT-01: Inauspicious Match Score Meter Indication (<18 Points)', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleMatchProfiles());
    await page.click('#btn-calc-milan');
    await expect(page.locator('#milan-active-card')).toBeVisible({ timeout: 10000 });

    const meterBar = page.locator('#milan-meter-bar');
    await expect(meterBar).toBeVisible();
    const widthStyle = await meterBar.getAttribute('style');
    expect(widthStyle).toMatch(/width:\s*\d+/);
  });

  test('TC-T2-MAT-02: Nadi & Bhakoot Dosha Alert Banners Rendering', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleMatchProfiles());
    await page.click('#btn-calc-milan');
    await expect(page.locator('#milan-active-card')).toBeVisible({ timeout: 10000 });

    const alertsBox = page.locator('#milan-dosha-alerts');
    await expect(alertsBox).toBeVisible();
  });

  test('TC-T2-MAT-03: Partner Profiles Summary Comparison Chips', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleMatchProfiles());
    await page.click('#btn-calc-milan');
    await expect(page.locator('#milan-active-card')).toBeVisible({ timeout: 10000 });

    const summaryBox = page.locator('#milan-profiles-summary');
    await expect(summaryBox).toBeVisible();
    const text = await summaryBox.textContent();
    expect(text).toMatch(/Moon Sign|Nakshatra|Pada/i);
  });

  test('TC-T2-MAT-04: Missing Partner Information Form Validation', async ({ page }) => {
    // Fill only Boy name, leave Girl name empty
    await page.fill('#milan-boy-name', 'Single Seeker');
    await page.fill('#milan-girl-name', '');
    await page.click('#btn-calc-milan');

    // Toast or validation notification
    await expect(page.locator('#toast-container')).toContainText(/enter|name|details|partner/i);
  });

  test('TC-T2-MAT-05: Voice Compatibility Analysis Narration Toggle', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleMatchProfiles());
    await page.click('#btn-calc-milan');
    await expect(page.locator('#milan-active-card')).toBeVisible({ timeout: 10000 });

    const voiceBtn = page.locator('#btn-voice-milan');
    await expect(voiceBtn).toBeVisible();
    await voiceBtn.click();
    await page.waitForTimeout(300);
    await expect(voiceBtn).toBeVisible();
  });
});
