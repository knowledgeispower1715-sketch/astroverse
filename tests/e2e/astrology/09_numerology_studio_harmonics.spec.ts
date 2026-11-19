import { test, expect } from '@playwright/test';
import { setupAstrologyMocks, gotoAstroVerse } from './fixtures/astrology_fixtures.js';

test.describe('Numerology Studio & Harmonic Vibrations (Tier 1 & Tier 2)', () => {
  test.beforeEach(async ({ page }) => {
    await setupAstrologyMocks(page);
    await gotoAstroVerse(page);
  });

  // ==========================================
  // TIER 1: FUNCTIONAL FEATURE COVERAGE
  // ==========================================

  test('TC-T1-NUM-01: Numerology Studio Modal Launch & Tab Controls', async ({ page }) => {
    await page.evaluate(() => {
      if (typeof (window as any).openNumerologyStudio === 'function') {
        (window as any).openNumerologyStudio('personal');
      }
    });

    const modal = page.locator('#modal-numerology-studio');
    await expect(modal).toBeVisible();

    await expect(page.locator('#num-tab-btn-personal')).toBeVisible();
    await expect(page.locator('#num-tab-btn-business')).toBeVisible();
    await expect(page.locator('#num-tab-btn-mobile')).toBeVisible();
  });

  test('TC-T1-NUM-02: Personal Mulank & Bhagyank Calculation', async ({ page }) => {
    await page.evaluate(() => (window as any).openNumerologyStudio('personal'));
    await expect(page.locator('#modal-numerology-studio')).toBeVisible();

    await page.fill('#numerology-input-name', 'ANAND SHARMA');
    await page.fill('#numerology-input-dob', '1995-06-15');

    // Click calculate
    await page.evaluate(() => {
      if (typeof (window as any).executeNumerologyStudio === 'function') {
        (window as any).executeNumerologyStudio(false);
      }
    });

    const results = page.locator('#num-personal-results');
    await expect(results).toBeVisible();
    const text = await results.textContent();
    expect(text).toMatch(/Moolank|Bhagyank|Destiny|Root|Number/i);
  });

  test('TC-T1-NUM-03: Auspicious Name Correction Generator', async ({ page }) => {
    await page.evaluate(() => (window as any).openNumerologyStudio('personal'));
    await expect(page.locator('#modal-numerology-studio')).toBeVisible();

    await page.fill('#numerology-input-name', 'ROHIT KUMAR');
    await page.fill('#numerology-input-dob', '1992-04-18');

    // Click Generate Corrections
    await page.evaluate(() => {
      if (typeof (window as any).executeNumerologyStudio === 'function') {
        (window as any).executeNumerologyStudio(true);
      }
    });

    const results = page.locator('#num-personal-results');
    await expect(results).toBeVisible();
    const text = await results.textContent();
    expect(text).toBeTruthy();
  });

  test('TC-T1-NUM-04: Commercial & Brand Name Numerology Analysis', async ({ page }) => {
    await page.evaluate(() => (window as any).openNumerologyStudio('business'));
    await expect(page.locator('#modal-numerology-studio')).toBeVisible();

    await page.fill('#num-business-name', 'ASTROVERSE TECHNOLOGIES');
    await page.evaluate(() => {
      if (typeof (window as any).executeBusinessNumerology === 'function') {
        (window as any).executeBusinessNumerology();
      }
    });

    const results = page.locator('#num-business-results');
    await expect(results).toBeVisible();
    const text = await results.textContent();
    expect(text).toMatch(/Chaldean|Compound|Vibration|Score|Commercial/i);
  });

  test('TC-T1-NUM-05: Mobile Phone Number Vibration Analysis', async ({ page }) => {
    await page.evaluate(() => (window as any).openNumerologyStudio('mobile'));
    await expect(page.locator('#modal-numerology-studio')).toBeVisible();

    await page.fill('#num-mobile-input', '+91 98765 43210');
    await page.evaluate(() => {
      if (typeof (window as any).executeMobileNumerology === 'function') {
        (window as any).executeMobileNumerology();
      }
    });

    const results = page.locator('#num-mobile-results');
    await expect(results).toBeVisible();
    const text = await results.textContent();
    expect(text).toMatch(/Root Number|Vibration|Planet|Harmony/i);
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ==========================================

  test('TC-T2-NUM-01: Empty Name Input Validation Error Box', async ({ page }) => {
    await page.evaluate(() => (window as any).openNumerologyStudio('personal'));
    await expect(page.locator('#modal-numerology-studio')).toBeVisible();

    await page.fill('#numerology-input-name', '');
    await page.evaluate(() => {
      if (typeof (window as any).executeNumerologyStudio === 'function') {
        (window as any).executeNumerologyStudio(false);
      }
    });

    const errBox = page.locator('#num-personal-validation-error');
    await expect(errBox).toBeVisible();
    expect(await errBox.textContent()).toMatch(/enter|name|valid/i);
  });

  test('TC-T2-NUM-02: Missing Date of Birth Validation Error', async ({ page }) => {
    await page.evaluate(() => (window as any).openNumerologyStudio('personal'));
    await expect(page.locator('#modal-numerology-studio')).toBeVisible();

    await page.fill('#numerology-input-name', 'ALOK NATH');
    await page.fill('#numerology-input-dob', '');
    await page.evaluate(() => {
      if (typeof (window as any).executeNumerologyStudio === 'function') {
        (window as any).executeNumerologyStudio(false);
      }
    });

    const errBox = page.locator('#num-personal-validation-error');
    await expect(errBox).toBeVisible();
  });

  test('TC-T2-NUM-03: Single Letter Name Boundary Processing', async ({ page }) => {
    await page.evaluate(() => (window as any).openNumerologyStudio('personal'));
    await expect(page.locator('#modal-numerology-studio')).toBeVisible();

    await page.fill('#numerology-input-name', 'K');
    await page.fill('#numerology-input-dob', '2000-01-01');
    await page.evaluate(() => {
      if (typeof (window as any).executeNumerologyStudio === 'function') {
        (window as any).executeNumerologyStudio(false);
      }
    });

    const results = page.locator('#num-personal-results');
    await expect(results).toBeVisible();
    expect(await results.textContent()).not.toContain('NaN');
  });

  test('TC-T2-NUM-04: Non-Numeric Mobile Number Input Cleansing', async ({ page }) => {
    await page.evaluate(() => (window as any).openNumerologyStudio('mobile'));
    await expect(page.locator('#modal-numerology-studio')).toBeVisible();

    await page.fill('#num-mobile-input', '(001) 987-654-3210 ext 44');
    await page.evaluate(() => {
      if (typeof (window as any).executeMobileNumerology === 'function') {
        (window as any).executeMobileNumerology();
      }
    });

    const results = page.locator('#num-mobile-results');
    await expect(results).toBeVisible();
    expect(await results.textContent()).not.toContain('NaN');
  });

  test('TC-T2-NUM-05: Studio Modal Teardown & Reset', async ({ page }) => {
    await page.evaluate(() => (window as any).openNumerologyStudio('personal'));
    const modal = page.locator('#modal-numerology-studio');
    await expect(modal).toBeVisible();

    await page.evaluate(() => {
      if (typeof (window as any).closeNumerologyStudio === 'function') {
        (window as any).closeNumerologyStudio();
      }
    });

    await expect(modal).toBeHidden();
  });
});
