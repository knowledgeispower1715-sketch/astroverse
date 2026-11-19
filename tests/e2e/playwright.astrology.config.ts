import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

const PORT = 3000;
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './astrology',
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  reporter: [
    ['list'],
    ['json', { outputFile: path.join(rootDir, 'test-artifacts/playwright-astrology-results.json') }],
    ['html', { outputFolder: path.join(rootDir, 'test-artifacts/playwright-astrology-report'), open: 'never' }],
  ],
  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 10000,
    navigationTimeout: 15000,
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
    {
      name: 'tablet',
      testMatch: /.*12_tier4_user_journeys_and_viewports\.spec\.ts$/,
      use: {
        ...devices['iPad (gen 7)'],
        browserName: 'chromium',
        defaultBrowserType: 'chromium',
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'mobile',
      testMatch: /.*12_tier4_user_journeys_and_viewports\.spec\.ts$/,
      use: {
        ...devices['iPhone SE'],
        browserName: 'chromium',
        defaultBrowserType: 'chromium',
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: process.env.BASE_URL ? undefined : {
    command: 'npx serve . --listen 3000',
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: true,
    timeout: 15000,
    cwd: rootDir,
  },
});
