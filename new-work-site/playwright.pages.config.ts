import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../hosting/config.json', import.meta.url), 'utf8'));
const base = (process.env.PAGES_BASE_PATH ?? config.base).replace(/\/$/u, '');
const port = process.env.PAGES_PREVIEW_PORT || '4326';
const origin = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/pages',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'line',
  use: { baseURL: `${origin}${base}/`, trace: 'retain-on-failure' },
  webServer: {
    command: 'node ../hosting/serve.mjs',
    url: `${origin}${base}/v2/`,
    reuseExistingServer: !process.env.CI,
    env: { PAGES_PREVIEW_PORT: port },
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-chromium', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'desktop-webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } },
  ],
});
