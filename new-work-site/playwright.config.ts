import { defineConfig, devices } from '@playwright/test';

const useExternalServer = process.env.PLAYWRIGHT_EXTERNAL_SERVER === '1';
const usePreviewServer = process.env.PLAYWRIGHT_PREVIEW_SERVER === '1';
const playwrightPort = process.env.PLAYWRIGHT_PORT || '4321';
const playwrightBaseUrl = `http://127.0.0.1:${playwrightPort}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'line',
  use: {
    baseURL: playwrightBaseUrl,
    trace: 'retain-on-failure',
  },
  webServer: useExternalServer
    ? undefined
    : {
        command: usePreviewServer
          ? `ASTRO_PREVIEW_BACKGROUND=0 ./node_modules/.bin/astro preview --host 127.0.0.1 --port ${playwrightPort}`
          : `ASTRO_DEV_BACKGROUND=0 ./node_modules/.bin/astro dev --host 127.0.0.1 --port ${playwrightPort}`,
        url: playwrightBaseUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    {
      name: 'mobile-chromium',
      use: { ...devices['iPhone 13'], browserName: 'chromium', viewport: { width: 375, height: 812 } },
    },
    { name: 'desktop-firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } } },
    { name: 'desktop-webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'], viewport: { width: 375, height: 812 } } },
  ],
});
