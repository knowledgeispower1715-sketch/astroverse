import { test, expect } from '@playwright/test';
import { setupAstrologyMocks, gotoAstroVerse, navigateSection, assertZeroHorizontalOverflow } from './fixtures/astrology_fixtures.js';

test.describe('Tier 4: End-to-End User Journeys & Cross-Device Viewports', () => {
  test.beforeEach(async ({ page }) => {
    await setupAstrologyMocks(page);
    await gotoAstroVerse(page);
  });

  test('TC-T4-JOURNEY-01: Comprehensive Astrology Profile Lifecycle', async ({ page }) => {
    await navigateSection(page, 'kundli');
    await expect(page.locator('#view-kundli')).toBeVisible();

    // Step 1: Compute birth chart
    await page.evaluate(async () => {
      await (window as any).loadSampleBirthChart();
    });
    await expect(page.locator('#kundli-active-content')).toBeVisible();

    // Step 2: Explore Vargas (D9, D10)
    await page.click('#btn-kw-vargas');
    await expect(page.locator('#kw-pane-vargas')).toBeVisible();
    await page.evaluate(() => {
      if (typeof (window as any).switchSelectedVarga === 'function') {
        (window as any).switchSelectedVarga('D9');
      }
    });
    await expect(page.locator('#varga-desc-box')).toBeVisible();

    // Step 3: Vimshottari Dasha timeline
    await page.click('#btn-kw-dashas');
    await expect(page.locator('#kw-pane-dashas')).toBeVisible();
    await expect(page.locator('#disp-cur-maha')).toBeVisible();

    // Step 4: Yogas & Doshas verification
    await page.click('#btn-kw-yogas');
    await expect(page.locator('#kw-pane-yogas')).toBeVisible();
    await expect(page.locator('#pill-manglik-verdict')).toBeVisible();

    // Step 5: Export controls
    await expect(page.locator('#btn-download-kundli-pdf')).toBeVisible();

    await assertZeroHorizontalOverflow(page);
  });

  test('TC-T4-JOURNEY-02: Matrimonial Synastry & Auspicious Wedding Planning', async ({ page }) => {
    // Step 1: Navigate to Matchmaking
    await navigateSection(page, 'matchmaking');
    await expect(page.locator('#view-matchmaking')).toBeVisible();

    // Step 2: Populate partner pair and compute 36-Guna synastry
    await page.evaluate(() => (window as any).loadSampleMatchProfiles());
    await page.click('#btn-calc-milan');
    await expect(page.locator('#milan-active-card')).toBeVisible();

    // Step 3: Validate score and 8-koota breakdown
    const score = await page.locator('#milan-big-val').textContent();
    expect(score).toMatch(/36/);
    await expect(page.locator('#tbody-milan-kootas tr')).toHaveCount(8);

    // Step 4: Navigate to Calendar Muhurats for wedding timings
    await navigateSection(page, 'calendar');
    await page.evaluate(() => (window as any).switchCalendarSubTab('muhurat'));
    await expect(page.locator('#cal-tab-panel-muhurat')).toBeVisible();
    await expect(page.locator('#cal-auspicious-muhurat-rows')).toBeVisible();

    await assertZeroHorizontalOverflow(page);
  });

  test('TC-T4-JOURNEY-03: Daily Vedic Ritual & Panchang Planning', async ({ page }) => {
    // Step 1: Open Calendar Panchang
    await navigateSection(page, 'calendar');
    await page.evaluate(() => (window as any).switchCalendarSubTab('panchang'));
    await expect(page.locator('#cal-tab-panel-panchang')).toBeVisible();

    // Step 2: Validate 5 Angas
    await expect(page.locator('#cal-angas-grid-container .cal-anga-card')).toHaveCount(5);

    // Step 3: Verify sunrise, sunset, and celestial rhythms
    await expect(page.locator('#cal-celestial-timings-card')).toBeVisible();

    // Step 4: Inspect hourly horas
    await navigateSection(page, 'horas');
    await expect(page.locator('#view-horas')).toBeVisible();
    await expect(page.locator('#disp-active-hora-planet')).toBeVisible();

    await assertZeroHorizontalOverflow(page);
  });

  test('TC-T4-JOURNEY-04: Multi-Turn Grounded AI Astrologer Consultation', async ({ page }) => {
    // Step 1: Establish Kundli chart foundation
    await page.evaluate(async () => {
      await (window as any).loadSampleBirthChart();
    });

    // Step 2: Open AI consultation modal
    await page.evaluate(() => (window as any).startConsultationSession('Acharya Devratan', 0));
    await expect(page.locator('#modal-ai-consultation')).toBeVisible();

    // Step 3: Turn 1 (English career inquiry)
    const input = page.locator('#ai-chat-user-input');
    await input.fill('What guidance does my chart reveal for career growth?');
    await input.press('Enter');
    await expect(page.locator('#ai-chat-messages-container .chat-bubble-agent')).toHaveCount(2, { timeout: 10000 });

    // Step 4: Turn 2 (Bilingual Hindi inquiry)
    await input.fill('मुझे कौन से उपाय करने चाहिए?');
    await input.press('Enter');
    await expect(page.locator('#ai-chat-messages-container .chat-bubble-agent')).toHaveCount(3, { timeout: 10000 });

    // Step 5: Teardown
    await page.evaluate(() => (window as any).closeConsultationModal());
    await expect(page.locator('#modal-ai-consultation')).toBeHidden();

    await assertZeroHorizontalOverflow(page);
  });

  test('TC-T4-JOURNEY-05: Multi-Device Cross-Viewport Responsive Session Continuity', async ({ page }) => {
    // Step 1: Overview
    await navigateSection(page, 'overview');
    await expect(page.locator('#view-overview')).toBeVisible();
    await assertZeroHorizontalOverflow(page);

    // Step 2: 3D Calendar View
    await navigateSection(page, 'calendar');
    await expect(page.locator('#view-calendar')).toBeVisible();
    await assertZeroHorizontalOverflow(page);

    // Step 3: Kundli Calculator View
    await navigateSection(page, 'kundli');
    await expect(page.locator('#view-kundli')).toBeVisible();
    await assertZeroHorizontalOverflow(page);
  });

  test('TC-T4-JOURNEY-06: Comprehensive Name Harmonization & Numerology Consultation', async ({ page }) => {
    // Step 1: Launch Numerology Studio
    await page.evaluate(() => (window as any).openNumerologyStudio('personal'));
    await expect(page.locator('#modal-numerology-studio')).toBeVisible();

    // Step 2: Personal analysis
    await page.fill('#numerology-input-name', 'ANAND SHARMA');
    await page.fill('#numerology-input-dob', '1995-06-15');
    await page.evaluate(() => (window as any).executeNumerologyStudio(false));
    await expect(page.locator('#num-personal-results')).toBeVisible();

    // Step 3: Commercial brand analysis
    await page.evaluate(() => (window as any).switchNumerologyTab('business'));
    await page.fill('#num-business-name', 'VEDIC LIFE LABS');
    await page.evaluate(() => (window as any).executeBusinessNumerology());
    await expect(page.locator('#num-business-results')).toBeVisible();

    // Step 4: Mobile frequency
    await page.evaluate(() => (window as any).switchNumerologyTab('mobile'));
    await page.fill('#num-mobile-input', '9876543210');
    await page.evaluate(() => (window as any).executeMobileNumerology());
    await expect(page.locator('#num-mobile-results')).toBeVisible();

    // Step 5: Dismiss
    await page.evaluate(() => (window as any).closeNumerologyStudio());
    await expect(page.locator('#modal-numerology-studio')).toBeHidden();

    await assertZeroHorizontalOverflow(page);
  });
});
