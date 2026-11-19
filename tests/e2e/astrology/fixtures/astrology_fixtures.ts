import { test as base, expect, Page } from '@playwright/test';
import {
  MOCK_KUNDLI_ANAND_SHARMA,
  MOCK_KUNDLI_ARYAN_TIWARI,
  MOCK_MATCHMAKING_PAYLOAD,
  MOCK_TRANSITS_LIVE,
  MOCK_PANCHANG_DAILY,
} from './mock_ephemeris_payloads.js';
import { MOCK_AI_RESPONSES } from './mock_ai_payloads.js';

export interface AstrologyMockOptions {
  customKundli?: any;
  customAi?: any;
  bypassMocks?: boolean;
}

/**
 * Route interception helper to support both fast hermetic CI and live server runs.
 */
export async function setupAstrologyMocks(page: Page, options: AstrologyMockOptions = {}) {
  // Ensure global state management is pre-initialized on every page context
  await page.addInitScript(() => {
    const demoUser = { id: 'test_user_e2e', name: 'Anand Sharma', email: 'anand@example.com', role: 'USER' };
    try {
      localStorage.setItem('astro_user_session', JSON.stringify(demoUser));
    } catch (_) {}
    (window as any).currentUserSession = demoUser;

    if (!(window as any).astroCalendarContext) {
      (window as any).astroCalendarContext = {
        state: {
          viewMode: '3d',
          date: new Date().toISOString(),
          location: { lat: 28.6139, lon: 77.209, name: 'New Delhi, Delhi, India' },
          convention: 'Purnimanta',
          selectedRashi: null,
          filters: { panchang: [], muhurat: [] },
          expandedDashaLord: null,
          expandedAntarKey: null,
        },
        getState() { return this.state; },
        setState(newState: any) { this.state = { ...this.state, ...newState }; },
        subscribe() { return () => {}; },
        notifyListeners() {},
      };
    }
  });

  if (options.bypassMocks || process.env.E2E_LIVE_BACKEND === 'true') {
    return;
  }

  // Intercept Complete Kundli endpoint
  await page.route('**/api/complete-kundli', async (route) => {
    const payload = options.customKundli || MOCK_KUNDLI_ANAND_SHARMA;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });

  // Intercept Matchmaking endpoint
  await page.route('**/api/matchmaking', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_MATCHMAKING_PAYLOAD),
    });
  });

  // Intercept AI Astrologer Ask endpoint
  await page.route('**/api/ai-astrologer/ask', async (route) => {
    const req = route.request();
    let postData: any = {};
    try {
      postData = JSON.parse(req.postData() || '{}');
    } catch (_) {}

    const qText = postData.question || postData.message || '';
    const qLang = postData.lang || postData.language || 'en';

    let selectedPayload = options.customAi || MOCK_AI_RESPONSES.career_english;
    if (qLang === 'hi' || /[\u0900-\u097F]/.test(qText)) {
      selectedPayload = MOCK_AI_RESPONSES.career_hindi;
    } else if (/remed/i.test(qText)) {
      selectedPayload = MOCK_AI_RESPONSES.remedies_response;
    } else if (postData.dob === null && (postData.lat === null || postData.unlinked)) {
      selectedPayload = MOCK_AI_RESPONSES.unlinked_chart_response;
    }

    const responseBody = {
      message: selectedPayload.text || selectedPayload.message || '',
      intent: selectedPayload.intent || 'general',
      grounded: selectedPayload.grounded ?? true,
      tokens_used: selectedPayload.tokens_used || 120,
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(responseBody),
    });
  });

  // Intercept AI Astrologer Quota
  await page.route('**/api/ai-astrologer/consume-quota', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, remaining: 10, guestMode: true }),
    });
  });

  // Intercept Live Transits
  await page.route('**/api/transits/live', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_TRANSITS_LIVE),
    });
  });

  // Intercept internal geocoding endpoint
  await page.route('**/api/geocode*', async (route) => {
    const url = new URL(route.request().url());
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const mockResults = [
      { name: "New Delhi, Delhi, India", lat: 28.6139, lon: 77.2090, tz: "Asia/Kolkata" },
      { name: "Bengaluru, Karnataka, India", lat: 12.9716, lon: 77.5946, tz: "Asia/Kolkata" },
      { name: "Mumbai, Maharashtra, India", lat: 19.0760, lon: 72.8777, tz: "Asia/Kolkata" },
      { name: "Jabalpur, Madhya Pradesh, India", lat: 23.1700, lon: 79.9500, tz: "Asia/Kolkata" },
      { name: "London, Greater London, United Kingdom", lat: 51.5074, lon: -0.1278, tz: "Europe/London" },
    ].filter(item => !q || item.name.toLowerCase().includes(q));

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ results: mockResults }),
    });
  });

  // Intercept external Open-Meteo geocoding to ensure hermetic offline testability
  await page.route('*geocoding-api.open-meteo.com*', async (route) => {
    const url = new URL(route.request().url());
    const name = (url.searchParams.get('name') || 'Delhi').toLowerCase();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: [
          {
            id: 1,
            name: name.includes('bengaluru') ? 'Bengaluru' : (name.includes('mumbai') ? 'Mumbai' : 'New Delhi'),
            latitude: name.includes('bengaluru') ? 12.9716 : (name.includes('mumbai') ? 19.0760 : 28.6139),
            longitude: name.includes('bengaluru') ? 77.5946 : (name.includes('mumbai') ? 72.8777 : 77.2090),
            timezone: 'Asia/Kolkata',
            country: 'India',
            admin1: name.includes('bengaluru') ? 'Karnataka' : (name.includes('mumbai') ? 'Maharashtra' : 'Delhi'),
          },
        ],
      }),
    });
  });

  // Intercept config endpoint
  await page.route('**/api/config', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        guestModeAvailable: true,
        authMode: 'demo',
        maintenance: false,
      }),
    });
  });
}

/**
 * Navigate to AstroVerse SPA and optionally switch to an astrological section.
 */
export async function gotoAstroVerse(page: Page, section?: string) {
  await page.addInitScript(() => {
    const demoUser = { id: 'test_user_e2e', name: 'Anand Sharma', email: 'anand@example.com', role: 'USER' };
    try {
      localStorage.setItem('astro_user_session', JSON.stringify(demoUser));
    } catch (_) {}
    (window as any).currentUserSession = demoUser;

    if (!(window as any).astroCalendarContext) {
      (window as any).astroCalendarContext = {
        state: {
          viewMode: '3d',
          date: new Date().toISOString(),
          location: { lat: 28.6139, lon: 77.209, name: 'New Delhi, Delhi, India' },
          convention: 'Purnimanta',
          selectedRashi: null,
          filters: { panchang: [], muhurat: [] },
          expandedDashaLord: null,
          expandedAntarKey: null,
        },
        getState() { return this.state; },
        setState(newState: any) { this.state = { ...this.state, ...newState }; },
        subscribe() { return () => {}; },
        notifyListeners() {},
      };
    }
  });

  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');

  if (section) {
    await navigateSection(page, section);
  }
}

/**
 * Switch navigation section using the active application view switcher.
 */
export async function navigateSection(page: Page, section: string) {
  await page.evaluate((sec) => {
    if (typeof (window as any).switchNavSection === 'function') {
      (window as any).switchNavSection(sec);
    }
  }, section);
  // Verify target section becomes active
  const viewSelector = `#view-${section}`;
  await expect(page.locator(viewSelector)).toHaveClass(/active/, { timeout: 7000 });
}

/**
 * Populate Kundli birth details form cleanly.
 */
export async function fillKundliForm(
  page: Page,
  details: {
    name: string;
    gender?: 'male' | 'female';
    dob: string;
    tobHh?: string;
    tobMm?: string;
    city?: string;
    lat?: number;
    lon?: number;
    tz?: string;
    unknownTime?: boolean;
  }
) {
  if (details.name !== undefined) {
    await page.fill('#input-k-name', details.name);
  }

  const gender = details.gender ?? 'male';
  const btnId = gender === 'male' ? '#g-male-btn' : '#g-female-btn';
  await page.click(btnId);

  if (details.dob) {
    await page.fill('#input-k-dob', details.dob);
  }

  if (details.unknownTime) {
    const checkbox = page.locator('#input-k-unknown-time');
    const isChecked = await checkbox.isChecked();
    if (!isChecked) {
      await checkbox.check();
    }
  } else {
    const hh = details.tobHh ?? '12';
    const mm = details.tobMm ?? '00';
    await page.selectOption('#input-k-tob-hh', hh);
    await page.selectOption('#input-k-tob-mm', mm);
    await page.evaluate(({ hh, mm }) => {
      const tobInp = document.getElementById('input-k-tob') as HTMLInputElement;
      if (tobInp) tobInp.value = `${hh}:${mm}`;
      if (typeof (window as any).sync24HTimePicker === 'function') {
        (window as any).sync24HTimePicker();
      }
    }, { hh, mm });
  }

  // Set coordinates directly or via resolve helper
  const lat = details.lat ?? 28.6139;
  const lon = details.lon ?? 77.2090;
  const tz = details.tz ?? 'Asia/Kolkata';
  const cityName = details.city ?? 'New Delhi, Delhi, India';

  await page.evaluate(
    ({ name, lat, lon, tz }) => {
      if (typeof (window as any).selectResolvedLocation === 'function') {
        (window as any).selectResolvedLocation(name, lat, lon, tz);
      } else {
        const inp = document.getElementById('input-k-city-search') as HTMLInputElement;
        const latInp = document.getElementById('k-resolved-lat') as HTMLInputElement;
        const lonInp = document.getElementById('k-resolved-lon') as HTMLInputElement;
        const tzInp = document.getElementById('k-resolved-tz') as HTMLInputElement;
        const badge = document.getElementById('k-location-resolved-badge');
        if (inp) inp.value = name;
        if (latInp) latInp.value = String(lat);
        if (lonInp) lonInp.value = String(lon);
        if (tzInp) tzInp.value = tz;
        if (badge) badge.style.display = 'flex';
      }
    },
    { name: cityName, lat, lon, tz }
  );
}

/**
 * Asserts zero horizontal overflow on current page across viewports.
 */
export async function assertZeroHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body.scrollWidth;
    const winWidth = window.innerWidth;
    return {
      docWidth,
      bodyWidth,
      winWidth,
      hasOverflow: docWidth > winWidth + 2 || bodyWidth > winWidth + 2,
    };
  });
  expect(overflow.hasOverflow).toBe(false);
}

export { test, expect } from '@playwright/test';
