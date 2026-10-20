import { expect, test } from '@playwright/test';
const review = process.env.PAGES_REVIEW === '1';
const base = review ? '/newwork' : '';
const route = (path: string) => `${base}${path}`;
const canonical = review ? 'https://ben-keller.github.io/newwork/' : 'https://newworkagency.com/';

test('root release has sixteen cards and working project, Back and Contact navigation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.hostname === '127.0.0.1' && /\/(?:_astro|media)\//u.test(url.pathname) && response.status() >= 400) errors.push(url.pathname);
  });
  // Navigation readiness is independent of background CDN video requests.
  await page.goto(route('/#work-gallery'), {waitUntil: 'domcontentloaded'});
  await expect(page.locator('[data-project-card]')).toHaveCount(16);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', review ? 'noindex, nofollow' : 'index, follow');
  const first = page.locator('[data-project-link]').first();
  await expect(first).toHaveAttribute('href', new RegExp(`^${base}/work/`));
  await first.click();
  await expect(page.locator('.project-header')).toBeVisible();
  await page.locator('[data-project-overlay-return]').click();
  await expect(page.locator('[data-project-card]')).toHaveCount(16);
  await page.goto(route('/contact'), {waitUntil: 'domcontentloaded'});
  await expect(page.getByRole('heading', { level: 1, name: 'Contact', exact: true })).toBeVisible();
  await expect(page.locator('.client-logos__mark')).toHaveCount(6);
  await expect(page.locator('.site-footer__featured-link')).toHaveCount(0);
  expect(errors).toEqual([]);
});

for (const prefix of (review ? ['v1', 'v2'] : ['v1', 'v2', 'newwork', 'newwork/v1', 'newwork/v2'])) {
  test(`${prefix} bookmarks preserve query and fragment while returning to root routes`, async ({ page }) => {
    await page.goto(route(`/${prefix}/?review=legacy#work-gallery`), {waitUntil: 'domcontentloaded'});
    await expect(page).toHaveURL(/\/\?review=legacy#work-gallery$/);
    await expect(page.locator('[data-project-card]')).toHaveCount(16);
    await page.goto(route(`/${prefix}/contact/?review=legacy#contact`), {waitUntil: 'domcontentloaded'});
    await expect(page).toHaveURL(/\/contact\/\?review=legacy#contact$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Contact', exact: true })).toBeVisible();
  });
}

test('unknown routes return a real 404 and an ordinary working home link', async ({ page }) => {
  const missing = await page.goto(route('/does-not-exist'), {waitUntil: 'domcontentloaded'});
  expect(missing?.status()).toBe(404);
  await page.getByRole('link', { name: 'Return to all work', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('[data-project-card]')).toHaveCount(16);
});

test('published CMS artwork, ticker options and Contact details reach the root release', async ({ page, request }) => {
  test.setTimeout(60_000); // Real CDN assets can queue behind gallery video requests.
  const info = await (await request.get(route('/release-info.json'))).json();
  test.skip(info.mode !== 'production', 'This check verifies the published Sanity adapter.');
  const artworkErrors: string[] = [];
  page.on('console', message => { if (message.type() === 'error' && /CORS|Content Security Policy/u.test(message.text())) artworkErrors.push(message.text()); });
  await page.goto(route('/#work-gallery'), {waitUntil: 'domcontentloaded'});
  const marks = page.locator('.oliver-brand__asset');
  // An editor may replace or clear any logo; cleared fields use the approved local artwork.
  await expect(page.locator('[data-site-header] .oliver-brand')).toHaveCount(1);
  await expect(page.locator('[data-site-footer] .oliver-brand')).toHaveCount(1);
  await expect(page.locator('[data-home-identity] [data-logo-intro]')).toHaveCount(1);
  for (const mark of await marks.all()) {
    const url = await mark.getAttribute('src');
    expect(url).toMatch(/https:\/\/cdn\.sanity\.io\/(?:files|images)\/7un4plyu\/production\//);
    // A successful HTTP response alone does not prove the browser can render the logo.
    await expect.poll(() => mark.evaluate(element => element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0), {timeout: 15_000}).toBe(true);
    const response = await request.get(url!);
    expect(response.ok()).toBe(true);
    if (new URL(url!).pathname.endsWith('.svg')) expect(await response.text()).toContain('<svg');
  }
  await page.locator('[data-site-footer]').scrollIntoViewIfNeeded();
  for (const mark of await page.locator('.client-logos img').all()) {
    await mark.scrollIntoViewIfNeeded();
    await expect(mark).toHaveAttribute('src', /https:\/\/cdn\.sanity\.io\/(?:files|images)\/7un4plyu\/production\//);
    await expect.poll(() => mark.evaluate(image => (image as HTMLImageElement).naturalWidth > 0), {timeout: 15_000}).toBe(true);
  }
  await expect(page.locator('.bts__frame')).toHaveCount(11);
  expect(await page.locator('body').innerText()).not.toMatch(/\b(?:Oliver|Michael)\b/u);
  const homeTicker = page.locator('[data-home-departures] [data-flap-ticker]');
  const words = JSON.parse((await homeTicker.getAttribute('data-ticker-words'))!);
  expect(words.length).toBeGreaterThan(0);
  const cities: string[] = JSON.parse((await homeTicker.getAttribute('data-ticker-cities'))!);
  expect(cities.every(city => ['sf', 'la', 'nyc'].includes(city))).toBe(true);
  await expect(page.locator('.contact-callout')).not.toBeEmpty();
  const hrefs = await page.locator('[data-project-card] [data-project-link]').evaluateAll(links => links.map(link => link.getAttribute('href')!));
  expect(new Set(hrefs).size).toBe(16);
  for (const href of hrefs) expect((await request.get(href)).status(), href).toBe(200);
  await page.goto(route('/contact/'), {waitUntil: 'domcontentloaded'});
  // The text reveal can briefly hide/rebuild its spans on entry. Compare the
  // published text and destination together once the non-empty text is ready.
  await expect.poll(() => page.locator('.contact-email').evaluate(element => {
    const email = element.querySelector('span')?.textContent?.trim();
    return Boolean(email) && element.getAttribute('href') === `mailto:${email}`;
  })).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(artworkErrors).toEqual([]);
});
