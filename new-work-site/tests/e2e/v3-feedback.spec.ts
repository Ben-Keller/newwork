import {expect, test} from '@playwright/test';

test('V3 reel, eleven-photo mosaic and client marks fit desktop and mobile', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({width, height: 1000});
    await page.goto('/#work-gallery');
    await expect(page.locator('[data-project-card]')).toHaveCount(16);
    await expect(page.locator('.bts__frame')).toHaveCount(11);
    await expect(page.locator('.bts__outline')).toHaveText('Behind');
    await expect(page.locator('.reel__texture')).toHaveAttribute('aria-hidden', 'true');
    await page.locator('[data-site-footer]').scrollIntoViewIfNeeded();
    await expect(page.locator('.client-logos__mark')).toHaveCount(6);
    await expect(page.locator('.site-footer__featured-link')).toHaveCount(0);
    for (const image of await page.locator('.client-logos img').all()) {
      await expect.poll(() => image.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    }
    const layout = await page.evaluate(() => {
      const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      const brand = rect('.site-footer__brand');
      const ticker = rect('.site-footer__discipline');
      const logos = rect('.site-footer__directory');
      const legal = rect('.site-footer__bottom');
      const reel = rect('.reel__frame');
      const heading = rect('.bts__header');
      return {
        overflow: document.documentElement.scrollWidth - innerWidth,
        footerGap: ticker.left - brand.right, footerAlignment: Math.abs(ticker.bottom - brand.bottom),
        copyrightAlignment: Math.abs(logos.top - legal.top),
        reelGap: heading.top - reel.bottom,
        photos: [...document.querySelectorAll('.bts__frame')].map(el => {
          const b = el.getBoundingClientRect();
          return {left: b.left, right: b.right, width: b.width, height: b.height};
        }),
      };
    });
    expect(layout.overflow, `${width}px`).toBeLessThanOrEqual(1);
    expect(layout.footerGap).toBeGreaterThan(0);
    expect(layout.footerAlignment).toBeLessThanOrEqual(1);
    expect(layout.copyrightAlignment).toBeLessThanOrEqual(1);
    expect(layout.reelGap).toBeGreaterThan(0);
    expect(layout.reelGap).toBeLessThan(150);
    for (const photo of layout.photos) {
      expect(photo.left).toBeGreaterThanOrEqual(0);
      expect(photo.right).toBeLessThanOrEqual(width);
      expect(photo.width).toBeGreaterThan(0);
      expect(photo.height).toBeGreaterThan(0);
    }
  }
});

test('split flaps settle on the latest client after interrupted hover', async ({page, isMobile}) => {
  test.skip(isMobile, 'Desktop hover interaction');
  await page.goto('/#work-gallery');
  const ticker = page.locator('[data-home-departures] [data-flap-ticker]');
  const cards = page.locator('[data-project-card]');
  for (const index of [0, 1, 3, 0, 1]) {
    await cards.nth(index).hover();
    await page.waitForTimeout(70);
  }
  const client = (await cards.nth(1).getAttribute('data-ticker-client')) || 'Client pending';
  await expect(ticker).toHaveAttribute('data-ticker-text', client);
  await expect.poll(() => ticker.locator('[data-flipping]').count()).toBe(0);
  expect((await ticker.locator('[data-flap-glyph]').allTextContents()).join('').trim()).toBe(client.toUpperCase());
  await page.emulateMedia({reducedMotion: 'reduce'});
  await cards.nth(0).locator('a').focus();
  await expect(ticker.locator('[data-flipping]')).toHaveCount(0);
  await expect(ticker.locator('[data-ticker-accessible]')).toHaveText((await cards.nth(0).getAttribute('data-ticker-client')) || 'Client pending');
});

test('board travels continuously through its docking threshold in both directions', async ({page, isMobile}) => {
  test.skip(isMobile, 'Touch keeps the board inline');
  await page.goto('/');
  await expect(page.locator('[data-logo-work-page]')).toHaveAttribute('data-logo-page-ready', 'true');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-logo-intro]')).toHaveAttribute('data-title-state', 'home');
  await expect(page.locator('[data-logo-intro]')).toHaveAttribute('data-title-motion', 'settled');
  await page.evaluate(() => document.fonts.ready);
  const result = await page.evaluate(async () => {
    const gallery = document.querySelector('[data-work-gallery]')!;
    const board = document.querySelector<HTMLElement>('[data-home-departures]')!;
    const top = gallery.getBoundingClientRect().top + scrollY;
    const start = Math.max(0, top - innerHeight * .82);
    const end = Math.max(start + 120, top - innerHeight * .4);
    const positions = Array.from({length: 31}, (_, i) => start + (end - start) * i / 30);
    let maxStep = 0;
    for (const samples of [positions, positions.toReversed()]) {
      let previous: DOMRect | undefined;
      for (const y of samples) {
        scrollTo(0, y);
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const box = board.getBoundingClientRect();
        if (previous) maxStep = Math.max(maxStep, Math.hypot(box.x - previous.x, box.y - previous.y));
        previous = box;
      }
    }
    return {maxStep, width: board.offsetWidth};
  });
  expect(result.width).toBeGreaterThan(0);
  expect(result.maxStep).toBeLessThan(40);
});
