import { expect, test } from '@playwright/test';
test('the photo mosaic stays static with reduced motion and remains navigable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#work-gallery');
  const first = page.locator('.bts__frame').first();
  await first.scrollIntoViewIfNeeded(); await first.focus();
  await expect(first).toHaveCSS('transform','none');
  await first.press('Enter'); await expect(page).toHaveURL(/\/work\//);
});
