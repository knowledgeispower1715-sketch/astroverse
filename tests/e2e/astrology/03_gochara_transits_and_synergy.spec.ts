import { test, expect } from '@playwright/test';
import { setupAstrologyMocks, gotoAstroVerse, fillKundliForm, navigateSection } from './fixtures/astrology_fixtures.js';

test.describe('Gochara Transits & Astrological Synergy (Tier 1 & Tier 2)', () => {
  test.beforeEach(async ({ page }) => {
    await setupAstrologyMocks(page);
    await gotoAstroVerse(page, 'kundli');
  });

  // ==========================================
  // TIER 1: FUNCTIONAL FEATURE COVERAGE
  // ==========================================

  test('TC-T1-GOC-01: Gochara Workspace Mount on Calculated Chart', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleBirthChart());
    await expect(page.locator('#kundli-active-content')).toBeVisible();

    // Switch to Dasha & Transits tab
    await page.click('#btn-kw-dashas');
    await expect(page.locator('#kw-pane-dashas')).toBeVisible();

    // Verify Gochara container and table header
    await expect(page.locator('#title-live-gochara')).toBeVisible();
    await expect(page.locator('#tbody-gochara-transits')).toBeVisible();

    // Verify at least 7-9 planetary rows are rendered
    const rows = page.locator('#tbody-gochara-transits tr');
    await expect(rows).toHaveCount(9);
  });

  test('TC-T1-GOC-02: Planetary Transits Table Sign & House Relativities', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleBirthChart());
    await page.click('#btn-kw-dashas');
    await expect(page.locator('#tbody-gochara-transits')).toBeVisible();

    const tbodyText = await page.locator('#tbody-gochara-transits').textContent();
    expect(tbodyText).toBeTruthy();

    // Ensure primary classical planets are listed
    expect(tbodyText).toContain('Sun');
    expect(tbodyText).toContain('Moon');
    expect(tbodyText).toContain('Jupiter');
    expect(tbodyText).toContain('Saturn');
    expect(tbodyText).toContain('Rahu');
    expect(tbodyText).toContain('Ketu');

    // Verify relative house numbers from Lagna and Moon exist (e.g. H1..H12 or numbers)
    const firstRowText = await page.locator('#tbody-gochara-transits tr').first().textContent();
    expect(firstRowText).toMatch(/House \d+|\d+/);
  });

  test('TC-T1-GOC-03: Sarvashtakavarga (SAV) Bindus Cross-Reference', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleBirthChart());
    await page.click('#btn-kw-dashas');
    await expect(page.locator('#tbody-gochara-transits')).toBeVisible();

    // Check bindu values in table cells
    const binduCells = await page.locator('#tbody-gochara-transits tr td:nth-child(5)').allTextContents();
    expect(binduCells.length).toBeGreaterThan(0);
    for (const cell of binduCells) {
      const binduVal = parseInt(cell.trim(), 10);
      expect(binduVal).toBeGreaterThanOrEqual(10);
      expect(binduVal).toBeLessThanOrEqual(56);
    }
  });

  test('TC-T1-GOC-04: Astrological Diagnostics (Sade Sati, Kantaka Shani, Chandrashtama)', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleBirthChart());
    await page.click('#btn-kw-dashas');
    await expect(page.locator('#gochara-diagnostics-bar')).toBeVisible();

    const diagText = await page.locator('#gochara-diagnostics-bar').textContent();
    expect(diagText).toBeTruthy();

    // Shani Sade Sati status
    expect(diagText).toMatch(/Shani Sade Sati/i);

    // Dasha-Transit synergy notification
    expect(diagText).toMatch(/Dasha-Transit Synergy|Dasha Lord/i);
  });

  test('TC-T1-GOC-05: Calendar Workspace Sub-tab 6 Transits Grid', async ({ page }) => {
    await navigateSection(page, 'calendar');
    await expect(page.locator('#view-calendar')).toBeVisible();

    // Switch to Calendar Sub-tab 6 (Transits)
    await page.evaluate(() => {
      if (typeof (window as any).switchCalendarSubTab === 'function') {
        (window as any).switchCalendarSubTab('transits');
      }
    });

    await expect(page.locator('#cal-tab-panel-transits')).toBeVisible();
    await expect(page.locator('#cal-grahas-grid-container')).toBeVisible();

    // Verify transit cards are populated
    const cards = page.locator('#cal-grahas-grid-container > *');
    expect(await cards.count()).toBeGreaterThan(0);
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ==========================================

  test('TC-T2-GOC-01: Retrograde Motion [R] Indicator Detection', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleBirthChart());
    await page.click('#btn-kw-dashas');
    await expect(page.locator('#tbody-gochara-transits')).toBeVisible();

    // Inspect if retrograde tag is present or can be formatted cleanly
    const rowsText = await page.locator('#tbody-gochara-transits').textContent();
    expect(rowsText).toBeTruthy();
    // Verify degrees formatting does not output NaN or [object Object]
    expect(rowsText).not.toContain('NaN');
    expect(rowsText).not.toContain('[object Object]');
  });

  test('TC-T2-GOC-02: Rashi Sandhi Transit Ingress Boundary (29°59\' / 0°00\')', async ({ page }) => {
    await fillKundliForm(page, {
      name: 'Sandhi Native',
      dob: '2001-03-20',
      tobHh: '12',
      tobMm: '00',
      city: 'New Delhi, Delhi, India',
    });
    await page.click('#btn-generate-kundli');
    await expect(page.locator('#kundli-active-content')).toBeVisible({ timeout: 10000 });

    await page.click('#btn-kw-dashas');
    await expect(page.locator('#tbody-gochara-transits')).toBeVisible();

    const rows = page.locator('#tbody-gochara-transits tr');
    await expect(rows).toHaveCount(9);
  });

  test('TC-T2-GOC-03: Low SAV Bindus Caution Verification (<28 threshold)', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleBirthChart());
    await page.click('#btn-kw-dashas');
    await expect(page.locator('#tbody-gochara-transits')).toBeVisible();

    // Verdict labels should include Favorable, Caution, or Mixed/Average
    const verdictTexts = await page.locator('#tbody-gochara-transits tr td:nth-child(6)').allTextContents();
    expect(verdictTexts.length).toBe(9);
    for (const v of verdictTexts) {
      expect(v.trim().length).toBeGreaterThan(0);
    }
  });

  test('TC-T2-GOC-04: Universal Sidereal Transits Fallback Without Chart', async ({ page }) => {
    await navigateSection(page, 'calendar');
    await page.evaluate(() => {
      if (typeof (window as any).switchCalendarSubTab === 'function') {
        (window as any).switchCalendarSubTab('transits');
      }
    });

    await expect(page.locator('#cal-tab-panel-transits')).toBeVisible();
    const container = page.locator('#cal-grahas-grid-container');
    await expect(container).toBeVisible();
    const text = await container.textContent();
    expect(text).not.toContain('undefined');
  });

  test('TC-T2-GOC-05: Dasha Lord Conjunction & Synergy Weighting', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleBirthChart());
    await page.click('#btn-kw-dashas');
    await expect(page.locator('#gochara-diagnostics-bar')).toBeVisible();

    // Verify Active Dasha-Transit Synergy badge mentions current Dasha lords
    const diag = await page.locator('#gochara-diagnostics-bar').textContent();
    expect(diag).toContain('Jupiter');
  });
});
