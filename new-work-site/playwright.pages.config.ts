import { defineConfig, devices } from '@playwright/test';
const review = process.env.PAGES_REVIEW === '1';
const port = process.env.PAGES_PREVIEW_PORT || (review ? '4331' : '4330');
const origin = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: './tests/pages', fullyParallel: true, forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0, reporter: 'line',
  use: { baseURL: origin, trace: 'retain-on-failure' },
  webServer: { command: `node ../hosting/serve.mjs --root-release${review ? ' --review' : ''}`, url: `${origin}${review ? "/newwork/" : "/"}`,
    reuseExistingServer: !process.env.CI, env: { PAGES_PREVIEW_PORT: port } },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-chromium', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'desktop-webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } } },
  ],
});
