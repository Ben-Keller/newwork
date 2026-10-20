import { expect, test, type Page } from '@playwright/test';

test.skip(process.env.VISUAL_REGRESSION !== '1', 'Run explicitly with npm run test:e2e:visual.');
test.setTimeout(60_000);
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(new Date('2026-10-13T12:00:00Z'));
  await page.addInitScript(() => { Math.random = () => .25; });
});
async function settle(page: Page) {
  await page.evaluate(async () => {
    const images = [...document.images];
    images.forEach(image => { image.loading = 'eager'; });
    await Promise.all(images.map(image => image.decode().catch(() => undefined)));
    await document.fonts.ready;
  });
  await page.waitForTimeout(200);
}
const options = { animations: 'disabled' as const, maxDiffPixelRatio: .01, timeout: 15_000 };

test('approved splash visual baseline', async ({ page }) => {
  await page.goto('/'); await settle(page);
  await expect(page).toHaveScreenshot('oliver-splash.png', options);
});
test('new hero visual baseline', async ({ page }) => {
  await page.goto('/'); await settle(page); await page.keyboard.press('Enter');
  await expect(page.locator('[data-logo-work-page]')).toHaveAttribute('data-handoff', 'true');
  await expect(page).toHaveScreenshot('oliver-hero.png', options);
});
test('four-row gallery visual baseline', async ({ page }) => {
  await page.goto('/#work-gallery'); await settle(page);
  await expect(page).toHaveScreenshot('oliver-gallery.png', options);
});
test('BTS mosaic visual baseline', async ({ page }) => {
  await page.goto('/#work-gallery'); await settle(page);
  await page.addStyleTag({ content: '[data-site-header] { opacity: 0 !important; }' });
  await expect(page.locator('[data-bts]')).toHaveScreenshot('oliver-mosaic.png', options);
});
test('Contact and footer visual baseline', async ({ page }) => {
  await page.goto('/contact'); await settle(page);
  await expect(page).toHaveScreenshot('oliver-contact-footer.png', { ...options, fullPage: true });
});
test('film detail visual baseline', async ({ page }) => {
  await page.goto('/work/mercury-an-unexpected-life'); await settle(page);
  await expect(page).toHaveScreenshot('oliver-film-detail.png', { ...options, fullPage: true });
});
