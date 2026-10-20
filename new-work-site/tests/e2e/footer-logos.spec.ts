import {expect, test} from '@playwright/test';

const slugs = ['michael-selected-photography', 'dune-tansy', 'chanel-test', 'fellow', 'miss-jones-pancake', 'molekule-in-office'];

test.beforeEach(async ({page}) => {
  await page.goto('/contact');
  await page.locator('[data-site-footer]').scrollIntoViewIfNeeded();
});

test('all footer logos link to their corresponding project', async ({page, isMobile}) => {
  const links = page.locator('a[data-footer-project]');
  await expect(links).toHaveCount(6);
  for (const [index, slug] of slugs.entries()) {
    await expect(links.nth(index)).toHaveAttribute('href', `/work/${slug}`);
  }
  await expect(page.locator('[data-footer-preview] img[src]')).toHaveCount(0);
  if (isMobile) await links.nth(2).tap();
  else await links.nth(2).click();
  await expect(page).toHaveURL(/\/work\/chanel-test\/?$/u);
  await expect(page.locator('[data-footer-preview][data-active]')).toHaveCount(0);
});

test('hover shows one full-color key image, contained in the viewport', async ({page, isMobile}) => {
  test.skip(isMobile, 'Touch opens the project without a hover step.');
  for (const link of await page.locator('a[data-footer-project]').all()) {
    await link.hover();
    const preview = link.locator('[data-footer-preview]');
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute('data-ready', '');
    await expect(page.locator('[data-footer-preview][data-active]')).toHaveCount(1);
    const image = preview.locator('img');
    expect(await image.evaluate(img => getComputedStyle(img).filter)).toBe('none');
    const bounds = await preview.boundingBox();
    expect(bounds).toBeTruthy();
    const viewport = page.viewportSize()!;
    expect(bounds!.x).toBeGreaterThanOrEqual(15);
    expect(bounds!.y).toBeGreaterThanOrEqual(15);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width - 15);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height - 15);
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-footer-preview][data-active]')).toHaveCount(0);
  await page.mouse.move(1, 1);
  await page.locator('a[data-footer-project]').first().hover();
  await expect(page.locator('[data-footer-preview][data-active]')).toHaveCount(1);
  await page.mouse.move(1, 1);
  await expect(page.locator('[data-footer-preview][data-active]')).toHaveCount(0);
});

test('keyboard previews support Escape, reduced motion and navigation', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  // Switch to keyboard modality before focusing a link programmatically.
  await page.keyboard.press('Tab');
  const link = page.locator('a[data-footer-project]').last();
  await link.focus();
  const preview = link.locator('[data-footer-preview]');
  await expect(preview).toBeVisible();
  // The site's global reduced-motion rule uses a negligible duration so
  // existing transitionend listeners can still settle.
  expect(await preview.evaluate(el => parseFloat(getComputedStyle(el).transitionDuration))).toBeLessThanOrEqual(.00001);
  await page.keyboard.press('Escape');
  await expect(preview).toBeHidden();
  await expect(link).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/work\/molekule-in-office\/?$/u);
});

test('project links work without JavaScript', async ({browser, baseURL}) => {
  const context = await browser.newContext({javaScriptEnabled: false, baseURL});
  const page = await context.newPage();
  try {
    await page.goto('/contact');
    await page.locator('a[data-footer-project]').nth(3).click();
    await expect(page).toHaveURL(/\/work\/fellow\/?$/u);
  } finally {
    await context.close();
  }
});
