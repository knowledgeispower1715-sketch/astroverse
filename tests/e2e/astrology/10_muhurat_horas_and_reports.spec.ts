import { test, expect } from '@playwright/test';
import { setupAstrologyMocks, gotoAstroVerse, navigateSection } from './fixtures/astrology_fixtures.js';

test.describe('Muhurat, Horas & Comprehensive Reports (Tier 1 & Tier 2)', () => {
  test.beforeEach(async ({ page }) => {
    await setupAstrologyMocks(page);
    await gotoAstroVerse(page);
  });

  // ==========================================
  // TIER 1: FUNCTIONAL FEATURE COVERAGE
  // ==========================================

  test('TC-T1-MUH-01: Planetary Horas Workspace Mount & Live Hora Banner', async ({ page }) => {
    await navigateSection(page, 'horas');
    await expect(page.locator('#view-horas')).toBeVisible();

    await expect(page.locator('#hora-banner-box')).toBeVisible();
    await expect(page.locator('#disp-active-hora-planet')).toBeVisible();
    await expect(page.locator('#disp-active-hora-badge')).toBeVisible();
    await expect(page.locator('#disp-hora-sun-metrics')).toBeVisible();

    const planetText = await page.locator('#disp-active-hora-planet').textContent();
    expect(planetText).toBeTruthy();
    expect(planetText).not.toBe('--');
  });

  test('TC-T1-MUH-02: 24-Hour Planetary Horas Lordship & Recommendation', async ({ page }) => {
    await navigateSection(page, 'horas');
    await expect(page.locator('#view-horas')).toBeVisible();

    const recText = await page.locator('#disp-active-hora-rec').textContent();
    expect(recText).toBeTruthy();
    expect(recText).not.toBe('--');

    const planet = await page.locator('#disp-active-hora-planet').textContent();
    expect(planet).toMatch(/Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn|Surya|Chandra|Mangal|Budha|Guru|Shukra|Shani/i);
  });

  test('TC-T1-MUH-03: Calendar Auspicious Muhurats Sub-tab (Abhijit, Brahma)', async ({ page }) => {
    await navigateSection(page, 'calendar');
    await page.evaluate(() => {
      if (typeof (window as any).switchCalendarSubTab === 'function') {
        (window as any).switchCalendarSubTab('muhurat');
      }
    });

    await expect(page.locator('#cal-tab-panel-muhurat')).toBeVisible();
    await expect(page.locator('#cal-auspicious-muhurat-rows')).toBeVisible();

    const ausText = await page.locator('#cal-auspicious-muhurat-rows').textContent();
    expect(ausText).toMatch(/Abhijit|Brahma|Amrit|Shubh|Vijay|Godhuli/i);
  });

  test('TC-T1-MUH-04: Inauspicious Windows (Rahu Kalam, Yamaganda, Gulika)', async ({ page }) => {
    await navigateSection(page, 'calendar');
    await page.evaluate(() => {
      if (typeof (window as any).switchCalendarSubTab === 'function') {
        (window as any).switchCalendarSubTab('muhurat');
      }
    });

    await expect(page.locator('#cal-tab-panel-muhurat')).toBeVisible();
    await expect(page.locator('#cal-inauspicious-muhurat-rows')).toBeVisible();

    const inausText = await page.locator('#cal-inauspicious-muhurat-rows').textContent();
    expect(inausText).toMatch(/Rahu Kalam|Yamaganda|Gulika|Dur Muhurat/i);
  });

  test('TC-T1-MUH-05: Report Builder Modal Activation & Scope Inspection', async ({ page }) => {
    await page.evaluate(() => {
      if (typeof (window as any).openReportBuilderModal === 'function') {
        (window as any).openReportBuilderModal('report_basic_chart_summary');
      }
    });

    const modal = page.locator('#modal-report-builder');
    await expect(modal).toBeVisible();

    await expect(page.locator('#builder-product-title')).toBeVisible();
    await expect(page.locator('#builder-chapters-container')).toBeVisible();
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ==========================================

  test('TC-T2-MUH-01: Hora Date Picker Navigation', async ({ page }) => {
    await navigateSection(page, 'horas');
    await expect(page.locator('#view-horas')).toBeVisible();

    // Change date
    await page.fill('#input-hora-date', '2026-12-25');
    await page.evaluate(() => {
      if (typeof (window as any).loadHourlyHorasUI === 'function') {
        (window as any).loadHourlyHorasUI();
      }
    });

    await page.waitForTimeout(400);
    const planetText = await page.locator('#disp-active-hora-planet').textContent();
    expect(planetText).toBeTruthy();
    expect(planetText).not.toContain('NaN');
  });

  test('TC-T2-MUH-02: Polar Latitude Horas Fallback Gracefulness', async ({ page }) => {
    await navigateSection(page, 'horas');
    await page.evaluate(() => {
      const latInp = document.getElementById('k-resolved-lat') as HTMLInputElement;
      const lonInp = document.getElementById('k-resolved-lon') as HTMLInputElement;
      if (latInp) latInp.value = '68.96';
      if (lonInp) lonInp.value = '18.77';
      if (typeof (window as any).loadHourlyHorasUI === 'function') {
        (window as any).loadHourlyHorasUI();
      }
    });

    await page.waitForTimeout(400);
    const metrics = await page.locator('#disp-hora-sun-metrics').textContent();
    expect(metrics).toBeTruthy();
  });

  test('TC-T2-MUH-03: Report Builder Product Catalog Switching', async ({ page }) => {
    await page.evaluate(() => {
      if (typeof (window as any).openReportBuilderModal === 'function') {
        (window as any).openReportBuilderModal('report_vedic_name_numerology');
      }
    });

    const modal = page.locator('#modal-report-builder');
    await expect(modal).toBeVisible();

    const title = await page.locator('#builder-product-title').textContent();
    expect(title).toMatch(/Numerology|Publication|Order|Review/i);
  });

  test('TC-T2-MUH-04: Report Builder Language Option Switch', async ({ page }) => {
    await page.evaluate(() => {
      if (typeof (window as any).openReportBuilderModal === 'function') {
        (window as any).openReportBuilderModal('report_basic_chart_summary');
      }
    });

    const langSelect = page.locator('#builder-lang-select');
    await expect(langSelect).toBeVisible();

    // Select Hindi
    await langSelect.selectOption('hi');
    await expect(langSelect).toHaveValue('hi');

    // Select English
    await langSelect.selectOption('en');
    await expect(langSelect).toHaveValue('en');
  });

  test('TC-T2-MUH-05: Report Builder Modal Dismissal & Cleanup', async ({ page }) => {
    await page.evaluate(() => {
      if (typeof (window as any).openReportBuilderModal === 'function') {
        (window as any).openReportBuilderModal('report_basic_chart_summary');
      }
    });

    const modal = page.locator('#modal-report-builder');
    await expect(modal).toBeVisible();

    // Close modal
    await page.evaluate(() => {
      if (typeof (window as any).closeReportBuilderModal === 'function') {
        (window as any).closeReportBuilderModal();
      }
    });

    await expect(modal).toBeHidden();
  });
});
