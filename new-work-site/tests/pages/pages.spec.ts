import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../../../hosting/config.json', import.meta.url), 'utf8'));
const base = (process.env.PAGES_BASE_PATH ?? config.base).replace(/\/$/u, '');

test('the root opens V2 and unknown pages offer a working way home', async ({ page }) => {
  await page.goto(`${base}/?review=pages#work-gallery`);
  await expect(page).toHaveURL(new RegExp(`${base}/v2/\\?review=pages#work-gallery$`));
  const missing = await page.goto(`${base}/does-not-exist`);
  expect(missing?.status()).toBe(404);
  await page.getByRole('link', { name: 'Visit New Work', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${base}/v2/$`));
});

for (const version of config.includeV1 ? ['v1', 'v2'] : ['v2']) {
  test(`${version} serves independent assets and navigates projects and contact`, async ({ page }) => {
    const mount = `${base}/${version}`;
    const missingAssets: string[] = [];
    const escapedAssets: string[] = [];
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('response', (response) => {
      const url = new URL(response.url());
      if (url.hostname !== '127.0.0.1' || !/\/(?:_astro|media)\//u.test(url.pathname)) return;
      if (response.status() >= 400) missingAssets.push(url.pathname);
      if (!url.pathname.startsWith(mount + '/')) escapedAssets.push(url.pathname);
    });
    await page.addInitScript((prefix) => {
      sessionStorage.setItem('new-work-restore-requested', 'true');
      sessionStorage.setItem(`${prefix}:new-work-restore-requested`, 'true');
    }, mount);
    await page.goto(`${mount}/`);
    await expect(page.locator('[data-project-card]')).toHaveCount(version === 'v1' ? 28 : 20);
    await expect(page.locator('[data-manifesto]')).toHaveCount(version === 'v1' ? 1 : 0);
    await expect(page.locator('[data-bts]')).toHaveCount(version === 'v2' ? 1 : 0);
    const project = page.locator('[data-project-link]').first();
    const href = await project.getAttribute('href');
    expect(href).toMatch(new RegExp(`^${mount}/work/`));
    await project.click();
    await expect(page).toHaveURL(new RegExp(`^http://[^/]+${href}/?$`));
    await expect(page.getByRole('heading', { level: 1, name: 'Arc', exact: true })).toBeVisible();
    await page.locator('[data-project-overlay-return]').click();
    await expect(page).toHaveURL(new RegExp(`^http://[^/]+${mount}/?$`));
    await page.goto(`${mount}/contact`);
    await expect(page.getByRole('heading', { level: 1, name: 'Contact', exact: true })).toBeVisible();
    await page.locator('[data-site-footer]').scrollIntoViewIfNeeded();
    if (version === 'v2') {
      await expect(page.locator('.site-footer__featured-link')).toHaveCount(8);
      const preview = page.locator('.site-footer__featured-link').first();
      await preview.focus();
      await expect(preview.locator('.site-footer__preview')).toHaveCSS('opacity', '1');
      await expect.poll(() => preview.locator('img').evaluate((image) =>
        image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)).toBe(true);
    }
    expect(missingAssets).toEqual([]);
    expect(escapedAssets).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('existing V1 project bookmarks redirect into the archive', async ({ page }) => {
  test.skip(!config.includeV1, 'V1 has been retired.');
  await page.goto(`${base}/work/arc/arc-still-webp`);
  await expect(page).toHaveURL(new RegExp(`${base}/v1/work/arc/arc-still-webp/?$`));
  await expect(page.getByRole('heading', { level: 1, name: 'Arc', exact: true })).toBeVisible();
});
