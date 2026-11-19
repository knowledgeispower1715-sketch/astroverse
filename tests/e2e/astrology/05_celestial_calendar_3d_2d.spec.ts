import { test, expect } from '@playwright/test';
import { setupAstrologyMocks, gotoAstroVerse } from './fixtures/astrology_fixtures.js';

test.describe('3D Celestial Calendar & 2D Cosmic View (Tier 1 & Tier 2)', () => {
  test.beforeEach(async ({ page }) => {
    await setupAstrologyMocks(page);
    await gotoAstroVerse(page, 'calendar');
  });

  // ==========================================
  // TIER 1: FUNCTIONAL FEATURE COVERAGE
  // ==========================================

  test('TC-T1-CAL-01: Calendar Month View & 3D Celestial Stage Mounting', async ({ page }) => {
    await expect(page.locator('#view-calendar')).toBeVisible();
    await expect(page.locator('#cal-celestial-hero-stage')).toBeVisible();
    await expect(page.locator('#cal-celestial-canvas')).toBeVisible();
    await expect(page.locator('#cal-month-grid')).toBeVisible();

    // Verify day cards are rendered in month grid
    const dateCards = page.locator('#cal-month-grid .cal-date-card');
    expect(await dateCards.count()).toBeGreaterThanOrEqual(28);
  });

  test('TC-T1-CAL-02: 3D Cosmic vs Classic 2D Viewing Mode Toggle', async ({ page }) => {
    const btn3d = page.locator('#cal-view-btn-3d');
    const btn2d = page.locator('#cal-view-btn-2d');
    const grid = page.locator('#cal-month-grid');

    await expect(btn3d).toBeVisible();
    await expect(btn2d).toBeVisible();

    // Switch to 2D
    await btn2d.click();
    await expect(btn2d).toHaveClass(/active/);
    await expect(grid).toHaveClass(/cal-grid-2d/);

    // Switch back to 3D
    await btn3d.click();
    await expect(btn3d).toHaveClass(/active/);
    await expect(grid).toHaveClass(/cal-grid-3d/);
  });

  test('TC-T1-CAL-03: Celestial Orbit Animation Motion Controls', async ({ page }) => {
    const orbitBtn = page.locator('#btn-toggle-orbit-motion');
    await expect(orbitBtn).toBeVisible();

    // Toggle orbit motion
    await orbitBtn.click();
    await page.waitForTimeout(300);
    await expect(orbitBtn).toBeVisible();

    // Toggle back
    await orbitBtn.click();
    await page.waitForTimeout(300);
    await expect(orbitBtn).toBeVisible();
  });

  test('TC-T1-CAL-04: Graha Labels Toggle & Focus Today', async ({ page }) => {
    const labelsBtn = page.locator('#btn-toggle-graha-labels');
    const todayBtn = page.locator('#btn-focus-today-orbit');

    await expect(labelsBtn).toBeVisible();
    await expect(todayBtn).toBeVisible();

    await labelsBtn.click();
    await page.waitForTimeout(200);
    await labelsBtn.click();

    await todayBtn.click();
    await page.waitForTimeout(200);
  });

  test('TC-T1-CAL-05: Date Card Inspection & Side Inspector Panel', async ({ page }) => {
    const inspector = page.locator('#cal-inspector-panel');
    await expect(inspector).toBeVisible();

    // Click on the first date card in the grid
    const firstDateCard = page.locator('#cal-month-grid .cal-date-card').first();
    await firstDateCard.click();

    // Inspector title should update
    const title = await page.locator('#cal-insp-date-title').textContent();
    expect(title).toBeTruthy();
    expect(title).not.toBe('--');
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ==========================================

  test('TC-T2-CAL-01: Rapid 3D/2D Mode Swapping Under Render Load', async ({ page }) => {
    const btn3d = page.locator('#cal-view-btn-3d');
    const btn2d = page.locator('#cal-view-btn-2d');

    for (let i = 0; i < 5; i++) {
      await btn2d.click();
      await btn3d.click();
    }

    const canvas = page.locator('#cal-celestial-canvas');
    await expect(canvas).toBeVisible();
  });

  test('TC-T2-CAL-02: Leap Year February (29 Days Grid Structure)', async ({ page }) => {
    await page.evaluate(() => {
      if (typeof (window as any).onCalendarDateInputChange === 'function') {
        (window as any).onCalendarDateInputChange('2024-02-15');
      }
    });
    await page.waitForTimeout(400);

    // Verify 29th day card exists
    const day29 = page.locator('#cal-month-grid .cal-date-card', { hasText: '29' });
    await expect(day29.first()).toBeVisible();
  });

  test('TC-T2-CAL-03: Responsive Canvas Dimensions on Container Mount', async ({ page }) => {
    const canvas = page.locator('#cal-celestial-canvas');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThan(100);
      expect(box.height).toBeGreaterThan(50);
    }
  });

  test('TC-T2-CAL-04: Far Century Navigation Boundary (Year 2100)', async ({ page }) => {
    await page.evaluate(() => {
      if (typeof (window as any).onCalendarDateInputChange === 'function') {
        (window as any).onCalendarDateInputChange('2100-01-01');
      }
    });
    await page.waitForTimeout(400);

    const monthTitle = await page.locator('#cal-month-title').textContent();
    expect(monthTitle).toContain('2100');
  });

  test('TC-T2-CAL-05: Amanta Tradition Month Name Alignment', async ({ page }) => {
    const amantaBtn = page.locator('#cal-trad-amanta');
    await amantaBtn.click();
    await page.waitForTimeout(300);

    const inspSub = await page.locator('#cal-insp-samvat-title').textContent();
    expect(inspSub).toBeTruthy();
  });
});
