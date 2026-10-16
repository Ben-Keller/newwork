import { expect, test } from '@playwright/test';

// Archived with the About page (review round 2); not part of the site suite.
// It used the site's settleVisualPage helper from tests/e2e/visual.spec.ts;
// bring an equivalent along when running it elsewhere.
declare const settleVisualPage: (page: import('@playwright/test').Page) => Promise<void>;

test('About visual baseline', async ({page}) => {
  await page.goto('/about');
  await page.locator('[data-about-experience]').waitFor();
  await expect(page.locator('.reel-fallback-card')).toHaveCount(6);
  await settleVisualPage(page);
  await expect(page).toHaveScreenshot('about.png', {
    fullPage: true,
    animations: 'disabled',
    maxDiffPixelRatio: 0.02,
    timeout: 15_000,
  });
});
