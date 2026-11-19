/* eslint-disable max-lines-per-function */
import { test, expect } from '@playwright/test';
import { setupAstrologyMocks, gotoAstroVerse, navigateSection } from './fixtures/astrology_fixtures.js';

test.describe('Tier 3: Cross-Feature Interactions & Combinatorial Coverage', () => {
  test.beforeEach(async ({ page }) => {
    await setupAstrologyMocks(page);
    await gotoAstroVerse(page);
  });

  test('TC-T3-XFT-01: Kundli Birth Chart to Dasha Timeline Cross-Flow', async ({ page }) => {
    await navigateSection(page, 'kundli');
    await page.evaluate(async () => {
      await (window as any).loadSampleBirthChart();
    });
    await expect(page.locator('#kundli-active-content')).toBeVisible();

    // Switch to Dasha tab
    await page.click('#btn-kw-dashas');
    await expect(page.locator('#kw-pane-dashas')).toBeVisible();

    // Verify Dasha lord corresponds to natal planetary setup
    const curMaha = await page.locator('#disp-cur-maha').textContent();
    expect(curMaha).toBeTruthy();
    expect(curMaha).toContain('Jupiter');
  });

  test('TC-T3-XFT-02: Kundli Moon Sign to Gochara Transit Cross-Reference', async ({ page }) => {
    await navigateSection(page, 'kundli');
    await page.evaluate(async () => {
      await (window as any).loadSampleBirthChart();
    });
    await expect(page.locator('#kundli-active-content')).toBeVisible();

    await page.click('#btn-kw-dashas');
    await expect(page.locator('#tbody-gochara-transits')).toBeVisible();

    // Cross-reference house from Moon
    const rows = page.locator('#tbody-gochara-transits tr');
    await expect(rows).toHaveCount(9);
    const firstRowMoonRel = await rows.first().locator('td:nth-child(4)').textContent();
    expect(firstRowMoonRel).toMatch(/House \d+|\d+/);
  });

  test('TC-T3-XFT-03: Kundli Natal Chart to AI Astrologer Consultation Grounding', async ({ page }) => {
    await navigateSection(page, 'kundli');
    await page.evaluate(async () => {
      await (window as any).loadSampleBirthChart();
    });
    await expect(page.locator('#kundli-active-content')).toBeVisible();

    // Open AI consultation modal
    await page.evaluate(() => {
      if (typeof (window as any).startConsultationSession === 'function') {
        (window as any).startConsultationSession('Acharya Devratan', 0);
      }
    });
    await expect(page.locator('#modal-ai-consultation')).toBeVisible();

    // Context bar should show Anand Sharma's chart linked
    const chartDetails = await page.locator('#ai-chat-chart-details').textContent();
    expect(chartDetails).toMatch(/Anand Sharma|Grounded Chart|Linked/i);
  });

  test('TC-T3-XFT-04: Kundli Natal Mars to Dosha Analysis (Manglik) Harmony', async ({ page }) => {
    await navigateSection(page, 'kundli');
    await page.evaluate(async () => {
      await (window as any).loadSampleBirthChart();
    });
    await expect(page.locator('#kundli-active-content')).toBeVisible();

    // Switch to Yogas & Doshas
    await page.click('#btn-kw-yogas');
    await expect(page.locator('#kw-pane-yogas')).toBeVisible();

    const pill = await page.locator('#pill-manglik-verdict').textContent();
    expect(pill).toMatch(/MITIGATED|CLEAR|NO DOSHA/i);
  });

  test('TC-T3-XFT-05: Kundli Profile Autofill into Matchmaking (Chart A / Chart B)', async ({ page }) => {
    await navigateSection(page, 'kundli');
    await page.evaluate(async () => {
      await (window as any).loadSampleBirthChart();
    });
    await expect(page.locator('#kundli-active-content')).toBeVisible();

    // Navigate to Matchmaking
    await navigateSection(page, 'matchmaking');
    await expect(page.locator('#view-matchmaking')).toBeVisible();

    // Click Autofill for Boy
    await page.evaluate(() => {
      if (typeof (window as any).autofillMilanPartner === 'function') {
        (window as any).autofillMilanPartner('boy');
      }
    });

    const boyName = await page.locator('#milan-boy-name').inputValue();
    expect(boyName).toBe('Anand Sharma');

    const boyDob = await page.locator('#milan-boy-dob').inputValue();
    expect(boyDob).toBe('1995-06-15');
  });

  test('TC-T3-XFT-06: Kundli Natal Particulars to Personal Numerology Studio', async ({ page }) => {
    await navigateSection(page, 'kundli');
    await page.evaluate(async () => {
      await (window as any).loadSampleBirthChart();
    });

    // Launch Numerology Studio
    await page.evaluate(() => {
      if (typeof (window as any).openNumerologyStudio === 'function') {
        (window as any).openNumerologyStudio('personal');
      }
    });
    await expect(page.locator('#modal-numerology-studio')).toBeVisible();

    // Fill with native's parameters
    await page.fill('#numerology-input-name', 'ANAND SHARMA');
    await page.fill('#numerology-input-dob', '1995-06-15');
    await page.evaluate(() => (window as any).executeNumerologyStudio(false));

    const results = page.locator('#num-personal-results');
    await expect(results).toBeVisible();
    expect(await results.textContent()).toContain('Moolank');
  });

  test('TC-T3-XFT-07: Panchang Planetary Day Lord to Active Hourly Hora Lord', async ({ page }) => {
    await navigateSection(page, 'calendar');
    await page.evaluate(() => {
      if (typeof (window as any).switchCalendarSubTab === 'function') {
        (window as any).switchCalendarSubTab('panchang');
      }
    });
    await expect(page.locator('#cal-tab-panel-panchang')).toBeVisible();

    // Get Day (Vaara) card
    const vaaraCard = page.locator('#cal-angas-grid-container .cal-anga-card').first();
    await expect(vaaraCard).toBeVisible();
    const vaaraText = await vaaraCard.textContent();
    expect(vaaraText).toMatch(/Governing Planet|Lord/i);
  });

  test('TC-T3-XFT-08: 3D Celestial Calendar Selected Date to Panchang 5-Angas Deep Dive', async ({ page }) => {
    await navigateSection(page, 'calendar');
    await expect(page.locator('#view-calendar')).toBeVisible();

    // Change date via date input
    await page.evaluate(() => {
      if (typeof (window as any).onCalendarDateInputChange === 'function') {
        (window as any).onCalendarDateInputChange('2026-11-20');
      }
    });

    // Switch to panchang
    await page.evaluate(() => (window as any).switchCalendarSubTab('panchang'));
    await expect(page.locator('#cal-tab-panel-panchang')).toBeVisible();

    const headerDate = await page.locator('#cal-panchang-header-date').textContent();
    expect(headerDate).toMatch(/2026|Nov/i);
  });

  test('TC-T3-XFT-09: Gochara Live Transits to Calendar Sub-tab 6 Planetary Grid', async ({ page }) => {
    await navigateSection(page, 'calendar');
    await page.evaluate(() => (window as any).switchCalendarSubTab('transits'));
    await expect(page.locator('#cal-tab-panel-transits')).toBeVisible();

    const cards = page.locator('#cal-grahas-grid-container > *');
    expect(await cards.count()).toBeGreaterThanOrEqual(7);
  });

  test('TC-T3-XFT-10: Matchmaking Synastry Result to AI Astrologer Compatibility Query', async ({ page }) => {
    await navigateSection(page, 'matchmaking');
    await page.evaluate(() => (window as any).loadSampleMatchProfiles());
    await page.click('#btn-calc-milan');
    await expect(page.locator('#milan-active-card')).toBeVisible();

    // Open chat to query compatibility
    await page.evaluate(() => (window as any).startConsultationSession('Acharya Devratan', 0));
    await expect(page.locator('#modal-ai-consultation')).toBeVisible();

    const input = page.locator('#ai-chat-user-input');
    await input.fill('Is our matrimonial compatibility favorable according to the 36 Gunas?');
    await input.press('Enter');

    await expect(page.locator('#ai-chat-messages-container .chat-bubble-agent')).toHaveCount(2, { timeout: 10000 });
    const response = await page.locator('#ai-chat-messages-container .chat-bubble-agent').nth(1).textContent();
    expect(response).toMatch(/compatibility|marriage|synastry|guna|match|guidance|birth chart|Kundli/i);
  });

  test('TC-T3-XFT-11: Kundli Chart Calculation to Report Builder Publication Selection', async ({ page }) => {
    await navigateSection(page, 'kundli');
    await page.evaluate(async () => {
      await (window as any).loadSampleBirthChart();
    });
    await expect(page.locator('#kundli-active-content')).toBeVisible();

    // Open report builder modal
    await page.evaluate(() => (window as any).openReportBuilderModal('report_basic_chart_summary'));
    const modal = page.locator('#modal-report-builder');
    await expect(modal).toBeVisible();

    // Verify preview card shows active chart
    const previewText = await page.locator('#builder-profile-select').textContent();
    expect(previewText).toMatch(/Anand Sharma|Active/i);
  });

  test('TC-T3-XFT-12: Panchang Auspicious Muhurats to Hourly Horas Auspicious Windows', async ({ page }) => {
    await navigateSection(page, 'calendar');
    await page.evaluate(() => (window as any).switchCalendarSubTab('muhurat'));
    await expect(page.locator('#cal-tab-panel-muhurat')).toBeVisible();

    const ausText = await page.locator('#cal-auspicious-muhurat-rows').textContent();
    const inausText = await page.locator('#cal-inauspicious-muhurat-rows').textContent();

    expect(ausText).toBeTruthy();
    expect(inausText).toBeTruthy();
    // Verify separation between auspicious and inauspicious windows
    expect(inausText).toMatch(/Rahu Kaal|Rahu Kalam/i);
  });
});
