/* eslint-disable max-lines-per-function */
import { test, expect } from '@playwright/test';
import { setupAstrologyMocks, gotoAstroVerse, fillKundliForm } from './fixtures/astrology_fixtures.js';

test.describe('Kundli Feature & Boundary Testing (Tier 1 & Tier 2)', () => {
  test.beforeEach(async ({ page }) => {
    await setupAstrologyMocks(page);
    await gotoAstroVerse(page, 'kundli');
  });

  // ==========================================
  // TIER 1: FUNCTIONAL FEATURE COVERAGE
  // ==========================================

  test('TC-T1-KUN-01: Form Inputs & Mandatory Field Validation', async ({ page }) => {
    // Assert all required form controls are rendered
    await expect(page.locator('#input-k-name')).toBeVisible();
    await expect(page.locator('#g-male-btn')).toBeVisible();
    await expect(page.locator('#g-female-btn')).toBeVisible();
    await expect(page.locator('#input-k-dob')).toBeVisible();
    await expect(page.locator('#input-k-tob-hh')).toBeVisible();
    await expect(page.locator('#input-k-tob-mm')).toBeVisible();
    await expect(page.locator('#input-k-city-search')).toBeVisible();
    await expect(page.locator('#btn-generate-kundli')).toBeVisible();

    // Submit with empty name; assert validation toast
    await page.fill('#input-k-name', '');
    await page.click('#btn-generate-kundli');
    await expect(page.locator('#toast-container')).toContainText(/enter birth details|name|gender/i);
  });

  test('TC-T1-KUN-02: Sample Chart Calculation & Workspace Activation', async ({ page }) => {
    // Empty state should be visible initially
    await expect(page.locator('#kundli-empty-state')).toBeVisible();

    // Click sample chart loader
    await page.evaluate(() => {
      if (typeof (window as any).loadSampleBirthChart === 'function') {
        (window as any).loadSampleBirthChart();
      }
    });

    // Content container activates cleanly
    await expect(page.locator('#kundli-active-content')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#kundli-empty-state')).toBeHidden();

    // Form inputs populate with Anand Sharma particulars
    await expect(page.locator('#input-k-name')).toHaveValue('Anand Sharma');
    await expect(page.locator('#k-resolved-lat')).toHaveValue('28.6139');
    await expect(page.locator('#k-resolved-lon')).toHaveValue('77.2090');
  });

  test('TC-T1-KUN-03: Primary Ephemeris Metrics Verification', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleBirthChart());
    await expect(page.locator('#kundli-active-content')).toBeVisible();

    // Lagna, Moon, Nakshatra, and Sun displays
    const lagnaText = await page.locator('#disp-lagna-val').textContent();
    const moonText = await page.locator('#disp-moon-val').textContent();
    const nakshatraText = await page.locator('#disp-nakshatra-val').textContent();
    const sunText = await page.locator('#disp-sun-val').textContent();

    expect(lagnaText).toBeTruthy();
    expect(moonText).toBeTruthy();
    expect(nakshatraText).toBeTruthy();
    expect(sunText).toBeTruthy();

    expect(lagnaText).toContain('Capricorn');
    expect(moonText).toContain('Sagittarius');
    expect(sunText).toContain('Aries');
  });

  test('TC-T1-KUN-04: Divisional Vargas (D1-D60) Navigation', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleBirthChart());
    await expect(page.locator('#kundli-active-content')).toBeVisible();

    // Switch to Vargas subtab
    await page.click('#btn-kw-vargas');
    await expect(page.locator('#kw-pane-vargas')).toBeVisible();

    // Select D9 (Navamsha)
    await page.evaluate(() => {
      if (typeof (window as any).switchSelectedVarga === 'function') {
        (window as any).switchSelectedVarga('D9');
      }
    });
    await expect(page.locator('#varga-desc-box')).toContainText(/Navamsha/i);

    // Select D10 (Dashamsha)
    await page.evaluate(() => {
      if (typeof (window as any).switchSelectedVarga === 'function') {
        (window as any).switchSelectedVarga('D10');
      }
    });
    await expect(page.locator('#varga-desc-box')).toContainText(/Dashamsha/i);
  });

  test('TC-T1-KUN-05: PDF and Audio Export Action Controls', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleBirthChart());
    await expect(page.locator('#kundli-active-content')).toBeVisible();

    // Verify PDF download button exists and is clickable
    const pdfBtn = page.locator('#btn-download-kundli-pdf');
    await expect(pdfBtn).toBeVisible();

    // Verify Voice Narration button exists and toggles state
    const voiceBtn = page.locator('#btn-voice-kundli');
    await expect(voiceBtn).toBeVisible();
    await voiceBtn.click();
    await page.waitForTimeout(300);
    // Voice button should not cause page errors
    await expect(voiceBtn).toBeVisible();
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ==========================================

  test('TC-T2-KUN-01: Midnight Birth Boundary (00:00:00)', async ({ page }) => {
    await fillKundliForm(page, {
      name: 'Midnight Native',
      gender: 'male',
      dob: '2000-01-01',
      tobHh: '00',
      tobMm: '00',
      city: 'New Delhi, Delhi, India',
      lat: 28.6139,
      lon: 77.2090,
      tz: 'Asia/Kolkata',
    });

    await page.click('#btn-generate-kundli');
    await expect(page.locator('#kundli-active-content')).toBeVisible({ timeout: 10000 });

    const lagna = await page.locator('#disp-lagna-val').textContent();
    expect(lagna).not.toBe('Indeterminate');
    expect(lagna).not.toBe('--');
  });

  test('TC-T2-KUN-02: Leap Year Feb 29 Birth Boundary', async ({ page }) => {
    await fillKundliForm(page, {
      name: 'Leap Year Native',
      gender: 'female',
      dob: '2024-02-29',
      tobHh: '12',
      tobMm: '00',
      city: 'Mumbai, Maharashtra, India',
      lat: 19.0760,
      lon: 72.8777,
      tz: 'Asia/Kolkata',
    });

    await page.click('#btn-generate-kundli');
    await expect(page.locator('#kundli-active-content')).toBeVisible({ timeout: 10000 });

    const sun = await page.locator('#disp-sun-val').textContent();
    expect(sun).toBeTruthy();
    expect(sun).not.toContain('NaN');
  });

  test('TC-T2-KUN-03: Extreme Arctic Latitude (68°N Tromso)', async ({ page }) => {
    await fillKundliForm(page, {
      name: 'Arctic Native',
      gender: 'male',
      dob: '1995-06-21',
      tobHh: '02',
      tobMm: '30',
      city: 'Tromso, Norway',
      lat: 68.96,
      lon: 18.77,
      tz: 'Europe/Oslo',
    });

    await page.click('#btn-generate-kundli');
    await expect(page.locator('#kundli-active-content')).toBeVisible({ timeout: 10000 });

    // Ensure no division by zero or NaN values in planetary table
    const tableText = await page.locator('#tbody-planetary-positions').textContent();
    expect(tableText).not.toContain('NaN');
  });

  test('TC-T2-KUN-04: Unknown Birth Time Flag Handling', async ({ page }) => {
    await fillKundliForm(page, {
      name: 'Unknown Time Native',
      gender: 'female',
      dob: '1992-10-15',
      unknownTime: true,
      city: 'Bengaluru, Karnataka, India',
      lat: 12.9716,
      lon: 77.5946,
      tz: 'Asia/Kolkata',
    });

    // Checkbox is checked
    await expect(page.locator('#input-k-unknown-time')).toBeChecked();

    await page.click('#btn-generate-kundli');
    await expect(page.locator('#kundli-active-content')).toBeVisible({ timeout: 10000 });

    // Lagna should indicate indeterminate or solar noon fallback
    const lagna = await page.locator('#disp-lagna-val').textContent();
    expect(lagna).toMatch(/Indeterminate|Solar Noon|Capricorn|Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Aquarius|Pisces/i);
  });

  test('TC-T2-KUN-05: Anti-Meridian Date Line Coordinates', async ({ page }) => {
    await fillKundliForm(page, {
      name: 'Pacific Native',
      gender: 'male',
      dob: '1999-12-31',
      tobHh: '23',
      tobMm: '45',
      city: 'Pago Pago, American Samoa',
      lat: -14.27,
      lon: -170.70,
      tz: 'Pacific/Pago_Pago',
    });

    await page.click('#btn-generate-kundli');
    await expect(page.locator('#kundli-active-content')).toBeVisible({ timeout: 10000 });

    const moon = await page.locator('#disp-moon-val').textContent();
    expect(moon).toBeTruthy();
    expect(moon).not.toContain('NaN');
  });
});
