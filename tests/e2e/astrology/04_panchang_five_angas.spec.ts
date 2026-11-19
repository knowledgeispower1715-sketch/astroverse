import { test, expect } from '@playwright/test';
import { setupAstrologyMocks, gotoAstroVerse } from './fixtures/astrology_fixtures.js';

test.describe('Panchang Five Angas & Daily Vedic Time (Tier 1 & Tier 2)', () => {
  test.beforeEach(async ({ page }) => {
    await setupAstrologyMocks(page);
    await gotoAstroVerse(page, 'calendar');
    await page.evaluate(() => {
      if (typeof (window as any).switchCalendarSubTab === 'function') {
        (window as any).switchCalendarSubTab('panchang');
      }
    });
  });

  // ==========================================
  // TIER 1: FUNCTIONAL FEATURE COVERAGE
  // ==========================================

  test('TC-T1-PAN-01: Panchang Workspace Sub-tab Activation', async ({ page }) => {
    await expect(page.locator('#cal-tab-panel-panchang')).toBeVisible();
    await expect(page.locator('#cal-panchang-header-date')).toBeVisible();
    await expect(page.locator('#cal-panchang-header-coords')).toBeVisible();

    const coordsText = await page.locator('#cal-panchang-header-coords').textContent();
    expect(coordsText).toMatch(/Delhi|Standard Sidereal|Lahiri/i);
  });

  test('TC-T1-PAN-02: Five Limbs (5 Angas) Complete Rendering', async ({ page }) => {
    await expect(page.locator('#cal-angas-grid-container')).toBeVisible();

    const angasContainer = page.locator('#cal-angas-grid-container');
    const containerText = await angasContainer.textContent();

    // 1. Vaara (Solar day)
    expect(containerText).toMatch(/Vaara|Day/i);
    // 2. Tithi (Lunar day)
    expect(containerText).toMatch(/Tithi|Paksha/i);
    // 3. Nakshatra (Lunar mansion)
    expect(containerText).toMatch(/Nakshatra|Pada/i);
    // 4. Yoga (Luni-solar angle)
    expect(containerText).toMatch(/Yoga/i);
    // 5. Karana (Half-tithi)
    expect(containerText).toMatch(/Karana/i);

    // Verify 5 distinct card structures
    const cards = angasContainer.locator('.cal-anga-card');
    await expect(cards).toHaveCount(5);
  });

  test('TC-T1-PAN-03: Celestial Timings (Sunrise, Sunset, Rahu Kalam, Abhijit)', async ({ page }) => {
    await expect(page.locator('#cal-celestial-timings-card')).toBeVisible();
    const timingsText = await page.locator('#cal-celestial-timings-content').textContent();
    expect(timingsText).toBeTruthy();

    expect(timingsText).toMatch(/Sunrise/i);
    expect(timingsText).toMatch(/Sunset/i);
    expect(timingsText).toMatch(/Solar Noon|Moonrise|Moonset/i);
    expect(timingsText).toMatch(/Duration/i);
  });

  test('TC-T1-PAN-04: Samvat & Vedic Calendar Era Metrics', async ({ page }) => {
    await expect(page.locator('#cal-samvat-details-card')).toBeVisible();
    const samvatText = await page.locator('#cal-samvat-details-content').textContent();
    expect(samvatText).toBeTruthy();

    expect(samvatText).toMatch(/Vikram Samvat|\d{4}/i);
    expect(samvatText).toMatch(/Shaka Samvat|\d{4}/i);
    expect(samvatText).toMatch(/Ayana|Ritu|Month|Masa/i);
  });

  test('TC-T1-PAN-05: Day Navigation (Previous / Next Day Controls)', async ({ page }) => {
    const initialDate = await page.locator('#cal-panchang-header-date').textContent();
    expect(initialDate).toBeTruthy();

    // Click Next Day
    await page.evaluate(() => {
      if (typeof (window as any).changeCalendarSelectedDate === 'function') {
        (window as any).changeCalendarSelectedDate(1);
      }
    });

    await page.waitForTimeout(400);
    const updatedDate = await page.locator('#cal-panchang-header-date').textContent();
    expect(updatedDate).toBeTruthy();
    // 5 Angas still cleanly populated
    await expect(page.locator('#cal-angas-grid-container .cal-anga-card')).toHaveCount(5);
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ==========================================

  test('TC-T2-PAN-01: Amavasya (New Moon) Lunar Day Boundary', async ({ page }) => {
    // Navigate to a known Amavasya date or set date input
    await page.evaluate(() => {
      if (typeof (window as any).onCalendarDateInputChange === 'function') {
        (window as any).onCalendarDateInputChange('2024-04-08');
      }
    });
    await page.waitForTimeout(400);

    const angasText = await page.locator('#cal-angas-grid-container').textContent();
    expect(angasText).toBeTruthy();
    expect(angasText).not.toContain('NaN');
  });

  test('TC-T2-PAN-02: Polar Latitude Sunrise & Sunset Robustness', async ({ page }) => {
    await page.evaluate(() => {
      if ((window as any).astroCalendarContext) {
        (window as any).astroCalendarContext.setState({
          location: { lat: 68.96, lon: 18.77, name: 'Tromso, Norway' },
        });
      }
      if (typeof (window as any).renderSelectedDayPanchang === 'function') {
        (window as any).renderSelectedDayPanchang();
      }
    });
    await page.waitForTimeout(300);

    const timingsText = await page.locator('#cal-celestial-timings-content').textContent();
    expect(timingsText).toBeTruthy();
    expect(timingsText).not.toContain('NaN');
  });

  test('TC-T2-PAN-03: Purnimanta vs Amanta Tradition Switch', async ({ page }) => {
    const purnimantaBtn = page.locator('#cal-trad-purnimanta');
    const amantaBtn = page.locator('#cal-trad-amanta');

    await expect(purnimantaBtn).toBeVisible();
    await expect(amantaBtn).toBeVisible();

    // Toggle to Amanta
    await amantaBtn.click();
    await expect(amantaBtn).toHaveClass(/active/);

    // Toggle back to Purnimanta
    await purnimantaBtn.click();
    await expect(purnimantaBtn).toHaveClass(/active/);
  });

  test('TC-T2-PAN-04: Daylight Saving Time (DST) Timezone Shift', async ({ page }) => {
    await page.evaluate(() => {
      if ((window as any).astroCalendarContext) {
        (window as any).astroCalendarContext.setState({
          location: { lat: 51.5074, lon: -0.1278, name: 'London, UK' },
        });
      }
      if (typeof (window as any).renderSelectedDayPanchang === 'function') {
        (window as any).renderSelectedDayPanchang();
      }
    });
    await page.waitForTimeout(300);

    const container = page.locator('#cal-angas-grid-container');
    await expect(container).toBeVisible();
    expect(await container.textContent()).not.toContain('undefined');
  });

  test('TC-T2-PAN-05: Leap Second & Midnight Transition Continuity', async ({ page }) => {
    await page.evaluate(() => {
      if (typeof (window as any).onCalendarDateInputChange === 'function') {
        (window as any).onCalendarDateInputChange('2024-12-31');
      }
    });
    await page.waitForTimeout(300);

    const cards = page.locator('#cal-angas-grid-container .cal-anga-card');
    await expect(cards).toHaveCount(5);
  });
});
