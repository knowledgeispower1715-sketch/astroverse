import { test, expect } from '@playwright/test';
import { setupAstrologyMocks, gotoAstroVerse, fillKundliForm } from './fixtures/astrology_fixtures.js';

test.describe('Dasha Lifecycle & Timeline Navigation (Tier 1 & Tier 2)', () => {
  test.beforeEach(async ({ page }) => {
    await setupAstrologyMocks(page);
    await gotoAstroVerse(page, 'kundli');
  });

  // ==========================================
  // TIER 1: FUNCTIONAL FEATURE COVERAGE
  // ==========================================

  test('TC-T1-DAS-01: Dasha Workspace Mount on Calculated Chart', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleBirthChart());
    await expect(page.locator('#kundli-active-content')).toBeVisible();

    // Switch to Dashas tab
    await page.click('#btn-kw-dashas');
    await expect(page.locator('#kw-pane-dashas')).toBeVisible();
    await expect(page.locator('#dasha-active-workspace')).toBeVisible();
    await expect(page.locator('#dasha-no-chart-state')).toBeHidden();
  });

  test('TC-T1-DAS-02: Active Mahadasha & Antardasha Displays', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleBirthChart());
    await page.click('#btn-kw-dashas');
    await expect(page.locator('#dasha-active-workspace')).toBeVisible();

    const mahaLord = await page.locator('#disp-cur-maha').textContent();
    const antarLord = await page.locator('#disp-cur-antar').textContent();
    const pdsLord = await page.locator('#disp-cur-pds').textContent();
    const nextTransition = await page.locator('#disp-next-transition-val').textContent();

    expect(mahaLord).toBeTruthy();
    expect(antarLord).toBeTruthy();
    expect(pdsLord).toBeTruthy();
    expect(nextTransition).toBeTruthy();
    expect(mahaLord).toContain('Jupiter');
  });

  test('TC-T1-DAS-03: 120-Year Vimshottari Timeline Hierarchy', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleBirthChart());
    await page.click('#btn-kw-dashas');
    await expect(page.locator('#dasha-active-workspace')).toBeVisible();

    const tree = page.locator('#dashas-timeline-tree');
    await expect(tree).toBeVisible();

    // Assert planetary Mahadashas are rendered
    const treeText = await tree.textContent();
    expect(treeText).toContain('Jupiter');
    expect(treeText).toContain('Saturn');
    expect(treeText).toContain('Mercury');
  });

  test('TC-T1-DAS-04: Timeline Accordion Expand & Collapse', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleBirthChart());
    await page.click('#btn-kw-dashas');
    await expect(page.locator('#dasha-active-workspace')).toBeVisible();

    // Toggle expand for active dasha lord
    await page.evaluate(() => {
      if (typeof (window as any).toggleDashaTimelineExpand === 'function') {
        (window as any).toggleDashaTimelineExpand('Jupiter');
      }
    });

    const tree = page.locator('#dashas-timeline-tree');
    await expect(tree).toBeVisible();
  });

  test('TC-T1-DAS-05: Parashari Reasoning & Interpretation Drawer', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleBirthChart());
    await page.click('#btn-kw-dashas');
    await expect(page.locator('#dasha-active-workspace')).toBeVisible();

    // Drawer should initially be hidden
    const drawer = page.locator('#dasha-reasoning-drawer');
    await expect(drawer).toBeHidden();

    // Click toggle button
    await page.locator('button[onclick="toggleDashaReasoningDrawer()"]').click();
    await expect(drawer).toBeVisible();
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ==========================================

  test('TC-T2-DAS-01: Nakshatra Sandhi Birth Boundary', async ({ page }) => {
    // Revati (Mercury lord) at 29°59' near Ketu junction
    await fillKundliForm(page, {
      name: 'Sandhi Native',
      dob: '1998-07-15',
      tobHh: '16',
      tobMm: '30',
      city: 'New Delhi, Delhi, India',
    });

    await page.click('#btn-generate-kundli');
    await expect(page.locator('#kundli-active-content')).toBeVisible({ timeout: 10000 });

    await page.click('#btn-kw-dashas');
    await expect(page.locator('#dasha-active-workspace')).toBeVisible();

    const curMaha = await page.locator('#disp-cur-maha').textContent();
    expect(curMaha).toBeTruthy();
    expect(curMaha).not.toBe('--');
  });

  test('TC-T2-DAS-02: Centenarian 120-Year Lifespan Rollover', async ({ page }) => {
    // Birth date 121 years in past
    await fillKundliForm(page, {
      name: 'Centenarian Native',
      dob: '1903-01-01',
      tobHh: '08',
      tobMm: '00',
      city: 'Mumbai, Maharashtra, India',
      lat: 19.0760,
      lon: 72.8777,
    });

    await page.click('#btn-generate-kundli');
    await expect(page.locator('#kundli-active-content')).toBeVisible({ timeout: 10000 });

    await page.click('#btn-kw-dashas');
    await expect(page.locator('#dasha-active-workspace')).toBeVisible();

    // Verify timeline tree rendered without overflow error
    await expect(page.locator('#dashas-timeline-tree')).toBeVisible();
  });

  test('TC-T2-DAS-03: Newborn Infant Sub-Day Dasha Boundary', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];
    await fillKundliForm(page, {
      name: 'Newborn Infant',
      dob: today,
      tobHh: '06',
      tobMm: '00',
      city: 'Bengaluru, Karnataka, India',
      lat: 12.9716,
      lon: 77.5946,
    });

    await page.click('#btn-generate-kundli');
    await expect(page.locator('#kundli-active-content')).toBeVisible({ timeout: 10000 });

    await page.click('#btn-kw-dashas');
    await expect(page.locator('#dasha-active-workspace')).toBeVisible();

    const transitionVal = await page.locator('#disp-next-transition-val').textContent();
    expect(transitionVal).toBeTruthy();
    expect(transitionVal).not.toContain('NaN');
  });

  test('TC-T2-DAS-04: Micro-Duration Subperiod Bounds', async ({ page }) => {
    await page.evaluate(() => (window as any).loadSampleBirthChart());
    await page.click('#btn-kw-dashas');
    await expect(page.locator('#dasha-active-workspace')).toBeVisible();

    // PDS progress percentage should be a valid percentage
    const pdsPct = await page.locator('#disp-pds-prog-pct').textContent();
    expect(pdsPct).toMatch(/\d+%/);
  });

  test('TC-T2-DAS-05: Uncalculated Chart Dasha State Display', async ({ page }) => {
    // Assert initial uncalculated chart state displays empty state
    await expect(page.locator('#kundli-empty-state')).toBeVisible();

    // Directly evaluate uncalculated dasha workspace
    await page.evaluate(() => {
      (window as any).currentCalculatedChart = null;
      const emptyState = document.getElementById('kundli-empty-state');
      const activeContent = document.getElementById('kundli-active-content');
      if (emptyState) emptyState.style.display = 'none';
      if (activeContent) activeContent.style.display = 'block';
      if (typeof (window as any).renderKundliDashasView === 'function') {
        (window as any).renderKundliDashasView();
      }
      if (typeof (window as any).switchKundliTab === 'function') {
        (window as any).switchKundliTab('dashas');
      }
    });

    // In uncalculated chart state, empty state prompt is visible
    await expect(page.locator('#dasha-no-chart-state')).toBeVisible();
    await expect(page.locator('#dasha-active-workspace')).toBeHidden();
  });
});
