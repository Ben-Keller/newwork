import {expect, test, type Page} from '@playwright/test';

test.skip(process.env.VISUAL_REGRESSION !== '1', 'Run explicitly with pnpm test:e2e:visual.');
test.setTimeout(60_000);
test.beforeEach(async ({page}) => page.emulateMedia({reducedMotion: 'reduce'}));

async function settleVisualPage(page: Page) {
  await page.evaluate(async () => {
    const images = Array.from(document.images);
    images.forEach((image) => { image.loading = 'eager'; });
    await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
    await document.fonts.ready;
  });
  await page.waitForTimeout(300);
}

test('home visual baseline', async ({page}) => {
  await page.goto('/');
  await page.locator('[data-project-card]').first().waitFor();
  await settleVisualPage(page);
  await expect(page).toHaveScreenshot('home.png', {
    fullPage: true,
    animations: 'disabled',
    maxDiffPixelRatio: 0.02,
    timeout: 15_000,
  });
});

test('film detail visual baseline', async ({page}) => {
  await page.goto('/work/mercury-an-unexpected-life');
  await page.locator('.project-header').waitFor();
  await settleVisualPage(page);
  await expect(page).toHaveScreenshot('film-detail.png', {
    fullPage: true,
    animations: 'disabled',
    maxDiffPixelRatio: 0.02,
    timeout: 15_000,
  });
});

test('About visual baseline', async ({page}) => {
  await page.goto('/about');
  await page.locator('[data-reel-experience]').waitFor();
  await expect(page.locator('.reel-fallback-card')).toHaveCount(6);
  await settleVisualPage(page);
  await expect(page).toHaveScreenshot('about.png', {
    fullPage: true,
    animations: 'disabled',
    maxDiffPixelRatio: 0.02,
    timeout: 15_000,
  });
});
