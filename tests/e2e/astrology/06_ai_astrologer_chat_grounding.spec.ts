import { test, expect } from '@playwright/test';
import { setupAstrologyMocks, gotoAstroVerse } from './fixtures/astrology_fixtures.js';

test.describe('AI Astrologer Chat & Chart Grounding (Tier 1 & Tier 2)', () => {
  test.beforeEach(async ({ page }) => {
    await setupAstrologyMocks(page);
    await gotoAstroVerse(page);
    // Pre-calculate sample chart to enable grounded chat testing
    await page.evaluate(() => {
      if (typeof (window as any).loadSampleBirthChart === 'function') {
        (window as any).loadSampleBirthChart();
      }
    });
  });

  // ==========================================
  // TIER 1: FUNCTIONAL FEATURE COVERAGE
  // ==========================================

  test('TC-T1-AIC-01: Consultation Modal Activation & Persona Greeting', async ({ page }) => {
    // Launch Devratan consultation session
    await page.evaluate(() => {
      if (typeof (window as any).startConsultationSession === 'function') {
        (window as any).startConsultationSession('Acharya Devratan', 0);
      }
    });

    const modal = page.locator('#modal-ai-consultation');
    await expect(modal).toBeVisible();

    // Verify persona name
    await expect(page.locator('#ai-chat-astrologer-name')).toContainText(/Acharya Devratan/i);

    // Verify greeting or initial message
    const msgContainer = page.locator('#ai-chat-messages-container');
    await expect(msgContainer).toBeVisible();
    const text = await msgContainer.textContent();
    expect(text).toMatch(/Pranam|Namaste|welcome|consultation/i);
  });

  test('TC-T1-AIC-02: User Message Dispatch & Response Generation', async ({ page }) => {
    await page.evaluate(() => (window as any).startConsultationSession('Acharya Devratan', 0));
    await expect(page.locator('#modal-ai-consultation')).toBeVisible();

    const input = page.locator('#ai-chat-user-input');
    await input.fill('What does my career look like in the next 2 years?');
    await input.press('Enter');

    // User message should appear
    await expect(page.locator('#ai-chat-messages-container')).toContainText('What does my career look like in the next 2 years?');

    // Wait for assistant response bubble to appear
    await expect(page.locator('#ai-chat-messages-container .chat-bubble-agent')).toHaveCount(2, { timeout: 10000 });
    const responseText = await page.locator('#ai-chat-messages-container .chat-bubble-agent').nth(1).textContent();
    expect(responseText).toBeTruthy();
    expect(responseText?.length).toBeGreaterThan(20);
  });

  test('TC-T1-AIC-03: Chart Grounding Context Bar & Linking', async ({ page }) => {
    await page.evaluate(() => (window as any).startConsultationSession('Acharya Devratan', 0));
    await expect(page.locator('#modal-ai-consultation')).toBeVisible();

    const contextBar = page.locator('#ai-chat-context-bar');
    await expect(contextBar).toBeVisible();

    // Toggle unlink chart
    const unlinkBtn = page.locator('#ai-chat-unlink-chart-btn');
    if (await unlinkBtn.isVisible()) {
      await unlinkBtn.click();
      await page.waitForTimeout(200);
      const linkBtn = page.locator('#ai-chat-link-chart-btn');
      await expect(linkBtn).toBeVisible();
      // Re-link
      await linkBtn.click();
      await page.waitForTimeout(200);
      await expect(unlinkBtn).toBeVisible();
    }
  });

  test('TC-T1-AIC-04: Bilingual Hindi Language Query & Devratan Response', async ({ page }) => {
    await page.evaluate(() => (window as any).startConsultationSession('Acharya Devratan', 0));
    await expect(page.locator('#modal-ai-consultation')).toBeVisible();

    const input = page.locator('#ai-chat-user-input');
    await input.fill('मेरी कुंडली में करियर और धन का क्या योग है?');
    await input.press('Enter');

    // Wait for response bubble with Hindi Devnagari characters
    await expect(page.locator('#ai-chat-messages-container .chat-bubble-agent')).toHaveCount(2, { timeout: 10000 });
    const responseText = await page.locator('#ai-chat-messages-container .chat-bubble-agent').nth(1).textContent();
    expect(responseText).toMatch(/[\u0900-\u097F]/);
  });

  test('TC-T1-AIC-05: Modal Close & Session Teardown', async ({ page }) => {
    await page.evaluate(() => (window as any).startConsultationSession('Acharya Devratan', 0));
    const modal = page.locator('#modal-ai-consultation');
    await expect(modal).toBeVisible();

    // Close consultation modal
    await page.evaluate(() => {
      if (typeof (window as any).closeConsultationModal === 'function') {
        (window as any).closeConsultationModal();
      }
    });

    await expect(modal).toBeHidden();
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ==========================================

  test('TC-T2-AIC-01: Out-of-Scope Query Deflection (Coding/Tech Task)', async ({ page }) => {
    await page.evaluate(() => (window as any).startConsultationSession('Acharya Devratan', 0));
    await expect(page.locator('#modal-ai-consultation')).toBeVisible();

    const input = page.locator('#ai-chat-user-input');
    await input.fill('Write me a python script to solve binary search trees');
    await input.press('Enter');

    await expect(page.locator('#ai-chat-messages-container .chat-bubble-agent')).toHaveCount(2, { timeout: 10000 });
    const responseText = await page.locator('#ai-chat-messages-container .chat-bubble-agent').nth(1).textContent();
    expect(responseText).toMatch(/astrology|vedic|jyotish|horoscope|birth chart|leadership|milestones/i);
  });

  test('TC-T2-AIC-02: Empty & Whitespace Message Submission Prevention', async ({ page }) => {
    await page.evaluate(() => (window as any).startConsultationSession('Acharya Devratan', 0));
    await expect(page.locator('#modal-ai-consultation')).toBeVisible();

    const initialCount = await page.locator('#ai-chat-messages-container .chat-bubble-user').count();
    const input = page.locator('#ai-chat-user-input');
    await input.fill('     ');
    await input.press('Enter');

    const newCount = await page.locator('#ai-chat-messages-container .chat-bubble-user').count();
    expect(newCount).toBe(initialCount);
  });

  test('TC-T2-AIC-03: Unlinked Chart Consultation Fallback Prompt', async ({ page }) => {
    // Start session without a linked chart
    await page.evaluate(() => {
      (window as any).currentCalculatedChart = null;
      (window as any).isChatKundliLinked = false;
      (window as any).startConsultationSession('Acharya Devratan', 0);
    });
    await expect(page.locator('#modal-ai-consultation')).toBeVisible();

    const input = page.locator('#ai-chat-user-input');
    await input.fill('What is my life purpose?');
    await input.press('Enter');

    await expect(page.locator('#ai-chat-messages-container .chat-bubble-agent')).toHaveCount(2, { timeout: 10000 });
    const responseText = await page.locator('#ai-chat-messages-container .chat-bubble-agent').nth(1).textContent();
    expect(responseText).toBeTruthy();
  });

  test('TC-T2-AIC-04: Multi-Turn Conversation History Retention', async ({ page }) => {
    await page.evaluate(() => (window as any).startConsultationSession('Acharya Devratan', 0));
    await expect(page.locator('#modal-ai-consultation')).toBeVisible();

    const input = page.locator('#ai-chat-user-input');

    // Turn 1
    await input.fill('What are my strengths?');
    await input.press('Enter');
    await expect(page.locator('#ai-chat-messages-container .chat-bubble-agent')).toHaveCount(2, { timeout: 10000 });

    // Turn 2
    await input.fill('And what about obstacles?');
    await input.press('Enter');
    await expect(page.locator('#ai-chat-messages-container .chat-bubble-agent')).toHaveCount(3, { timeout: 10000 });

    const userMsgs = page.locator('#ai-chat-messages-container .chat-bubble-user');
    expect(await userMsgs.count()).toBe(2);
  });

  test('TC-T2-AIC-05: Remedial Protocol Query Response Integrity', async ({ page }) => {
    await page.evaluate(() => (window as any).startConsultationSession('Acharya Devratan', 0));
    await expect(page.locator('#modal-ai-consultation')).toBeVisible();

    const input = page.locator('#ai-chat-user-input');
    await input.fill('What astrological remedies do you recommend for me?');
    await input.press('Enter');

    await expect(page.locator('#ai-chat-messages-container .chat-bubble-agent')).toHaveCount(2, { timeout: 10000 });
    const responseText = await page.locator('#ai-chat-messages-container .chat-bubble-agent').nth(1).textContent();
    expect(responseText).toMatch(/remed|mantra|gemstone|donation|daan|fasting|shanti|stotram|sapphire/i);
  });
});
