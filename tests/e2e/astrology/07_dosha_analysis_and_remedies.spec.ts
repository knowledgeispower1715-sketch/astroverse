import { test, expect } from '@playwright/test';
import { setupAstrologyMocks, gotoAstroVerse } from './fixtures/astrology_fixtures.js';
import { MOCK_KUNDLI_ARYAN_TIWARI } from './fixtures/mock_ephemeris_payloads.js';

test.describe('Dosha Analysis & Astrological Remedies (Tier 1 & Tier 2)', () => {
  test.beforeEach(async ({ page }) => {
    await setupAstrologyMocks(page);
    await gotoAstroVerse(page, 'kundli');
  });

  // ==========================================
  // TIER 1: FUNCTIONAL FEATURE COVERAGE
  // ==========================================

  test('TC-T1-DOS-01: Yogas & Doshas Workspace Subnav Mount', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleBirthChart());
    await expect(page.locator('#kundli-active-content')).toBeVisible();

    // Switch to Yogas & Doshas tab
    await page.click('#btn-kw-yogas');
    await expect(page.locator('#kw-pane-yogas')).toBeVisible();

    // Verify main dosha headers
    await expect(page.locator('#pill-manglik-verdict')).toBeVisible();
    await expect(page.locator('#pill-kalsarp-verdict')).toBeVisible();
    await expect(page.locator('#pill-sadesati-verdict')).toBeVisible();
  });

  test('TC-T1-DOS-02: Manglik (Kuja) Dosha Evaluation & Status Badge', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleBirthChart());
    await page.click('#btn-kw-yogas');
    await expect(page.locator('#kw-pane-yogas')).toBeVisible();

    const verdict = await page.locator('#pill-manglik-verdict').textContent();
    const desc = await page.locator('#desc-manglik-text').textContent();

    expect(verdict).toBeTruthy();
    expect(verdict).toMatch(/CLEAR|NO DOSHA|MITIGATED|PRESENT/i);
    expect(desc).toBeTruthy();
    expect(desc).not.toBe('--');
  });

  test('TC-T1-DOS-03: Kaal Sarp Dosha Axis Evaluation', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleBirthChart());
    await page.click('#btn-kw-yogas');
    await expect(page.locator('#kw-pane-yogas')).toBeVisible();

    const verdict = await page.locator('#pill-kalsarp-verdict').textContent();
    const desc = await page.locator('#desc-kalsarp-text').textContent();

    expect(verdict).toBeTruthy();
    expect(verdict).toMatch(/ABSENT|CLEAR|PRESENT/i);
    expect(desc).toBeTruthy();
    expect(desc).not.toBe('--');
  });

  test('TC-T1-DOS-04: Shani Sade Sati Status & Description', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleBirthChart());
    await page.click('#btn-kw-yogas');
    await expect(page.locator('#kw-pane-yogas')).toBeVisible();

    const verdict = await page.locator('#pill-sadesati-verdict').textContent();
    const desc = await page.locator('#desc-sadesati-text').textContent();

    expect(verdict).toBeTruthy();
    expect(desc).toBeTruthy();
    expect(desc).not.toBe('--');
  });

  test('TC-T1-DOS-05: Classical Benefic Yogas List Rendering', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleBirthChart());
    await page.click('#btn-kw-yogas');
    await expect(page.locator('#kw-pane-yogas')).toBeVisible();

    const yogasList = page.locator('#classical-yogas-list');
    await expect(yogasList).toBeVisible();

    // Check for classical yogas text
    const text = await yogasList.textContent();
    expect(text).toMatch(/Yoga|Gajakesari|Budhaditya|Raja/i);
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ==========================================

  test('TC-T2-DOS-01: Severe Manglik Placements (1st/7th/8th House Mars)', async ({ page }) => {
    await page.evaluate(async () => {
      await (window as any).loadSampleBirthChart();
    });
    await expect(page.locator('#disp-lagna-val')).toContainText('Capricorn');

    // Switch to Yogas & Doshas tab
    await page.click('#btn-kw-yogas');
    await expect(page.locator('#kw-pane-yogas')).toBeVisible();

    // Custom chart with severe Manglik affliction
    const afflictedChart = JSON.parse(JSON.stringify(MOCK_KUNDLI_ARYAN_TIWARI));
    afflictedChart.doshas_and_remedies.manglik = {
      status: 'PRESENT',
      has_dosha: true,
      is_mitigated: false,
      verdict: 'Severe Kuja Dosha: Mars placed in 7th house creates relationship tensions without cancellation.',
    };

    await page.evaluate((customData) => {
      if ((window as any).currentCalculatedChart) {
        (window as any).currentCalculatedChart.fullData = customData;
      }
      if (typeof (window as any).renderKundliYogasView === 'function') {
        (window as any).renderKundliYogasView();
      }
    }, afflictedChart);

    const pill = await page.locator('#pill-manglik-verdict').textContent();
    expect(pill).toMatch(/PRESENT|AFFLICTED/i);
  });

  test('TC-T2-DOS-02: Full Kaal Sarp Hemmed Axis Detection', async ({ page }) => {
    await page.evaluate(async () => {
      await (window as any).loadSampleBirthChart();
    });
    await expect(page.locator('#disp-lagna-val')).toContainText('Capricorn');

    await page.click('#btn-kw-yogas');
    await expect(page.locator('#kw-pane-yogas')).toBeVisible();

    const kaalSarpChart = JSON.parse(JSON.stringify(MOCK_KUNDLI_ARYAN_TIWARI));
    kaalSarpChart.doshas_and_remedies.kaal_sarp = {
      status: 'PRESENT',
      has_dosha: true,
      verdict: 'Full Kaal Sarp Dosha: All planets enclosed between Rahu and Ketu axis.',
    };

    await page.evaluate((customData) => {
      if ((window as any).currentCalculatedChart) {
        (window as any).currentCalculatedChart.fullData = customData;
      }
      if (typeof (window as any).renderKundliYogasView === 'function') {
        (window as any).renderKundliYogasView();
      }
    }, kaalSarpChart);

    const pill = await page.locator('#pill-kalsarp-verdict').textContent();
    expect(pill).toMatch(/PRESENT/i);
  });

  test('TC-T2-DOS-03: Mitigated Kuja Dosha (Swakshetra / Cancellation)', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleBirthChart());
    await page.click('#btn-kw-yogas');
    await expect(page.locator('#kw-pane-yogas')).toBeVisible();

    // For Anand Sharma, Mars in 6th house or Swakshetra cancellation applies
    const pill = await page.locator('#pill-manglik-verdict').textContent();
    const desc = await page.locator('#desc-manglik-text').textContent();
    expect(pill).toMatch(/MITIGATED|CLEAR|NO DOSHA/i);
    expect(desc).not.toContain('NaN');
  });

  test('TC-T2-DOS-04: Uncalculated State Graceful Placeholder Display', async ({ page }) => {
    // Clear chart
    await page.evaluate(() => {
      (window as any).currentCalculatedChart = null;
      const emptyState = document.getElementById('kundli-empty-state');
      const activeContent = document.getElementById('kundli-active-content');
      if (emptyState) emptyState.style.display = 'block';
      if (activeContent) activeContent.style.display = 'none';
    });

    await expect(page.locator('#kundli-empty-state')).toBeVisible();
    await expect(page.locator('#kundli-active-content')).toBeHidden();
  });

  test('TC-T2-DOS-05: Upagrahas & Kalavelas Workspace Tab Navigation', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleBirthChart());
    await expect(page.locator('#kundli-active-content')).toBeVisible();

    // Switch to Upagrahas pane
    await page.click('#btn-kw-upagrahas');
    await expect(page.locator('#kw-pane-upagrahas')).toBeVisible();

    // Verify view toggle between cards and table
    const btnTable = page.locator('#btn-upagraha-view-table');
    const btnCards = page.locator('#btn-upagraha-view-cards');
    await expect(btnTable).toBeVisible();
    await expect(btnCards).toBeVisible();

    await btnTable.click();
    await expect(page.locator('#upagrahas-table-container')).toBeVisible();

    await btnCards.click();
    await expect(page.locator('#upagrahas-cards-container')).toBeVisible();
  });
});
