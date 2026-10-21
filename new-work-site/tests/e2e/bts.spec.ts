import { expect, test } from '@playwright/test';
test('the pinboard stays static with reduced motion and remains navigable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#work-gallery');
  const first = page.locator('.bts__frame').first();
  await first.scrollIntoViewIfNeeded();
  const restingTransform = await first.evaluate(element => getComputedStyle(element).transform);
  await first.focus();
  await first.hover();
  // The site's global reduced-motion rule uses 0.01ms for transition events.
  expect(await first.evaluate(element => parseFloat(getComputedStyle(element).transitionDuration))).toBeLessThanOrEqual(.00001);
  await expect(first).toHaveCSS('transform', restingTransform);
  await first.press('Enter'); await expect(page).toHaveURL(/\/work\//);
});

test('the permanent pinboard replaces the grid and swatch even on old comparison URLs', async ({ page }) => {
  await page.goto('/?bts-layout=mosaic#work-gallery');
  const board = page.locator('[data-bts]');
  await expect(board).toHaveAttribute('data-bts-layout', 'pinboard');
  await expect(board.locator('.bts__frame')).toHaveCount(12);
  await expect(board.locator('.bts__storyboard img')).toHaveCount(1);
  await expect(page.locator('[data-bts-review], .bts__mosaic, img[src*="swatches"]')).toHaveCount(0);
  const sources = await board.locator('.bts__frame img').evaluateAll(images => images.map(image => image.getAttribute('src')));
  expect(new Set(sources).size).toBe(12);
  for (const image of await board.locator('img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
});
