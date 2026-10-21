import {expect, test} from '@playwright/test';

test('V3 reel, twelve-photo pinboard and client marks fit desktop and mobile', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({width, height: 1000});
    await page.goto('/#work-gallery');
    await expect(page.locator('[data-project-card]')).toHaveCount(16);
    await expect(page.locator('.bts__frame')).toHaveCount(12);
    await expect(page.locator('.bts__outline')).toHaveText('Behind');
    await expect(page.locator('.reel__projection')).toHaveAttribute('aria-hidden', 'true');
    await page.locator('[data-site-footer]').scrollIntoViewIfNeeded();
    await expect(page.locator('.client-logos__mark')).toHaveCount(6);
    await expect(page.locator('.site-footer__featured-link')).toHaveCount(0);
    for (const image of await page.locator('.client-logos__artwork').all()) {
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
  // Measure the rendered glyphs, not just the immediately updated accessible label.
  const latency = await cards.nth(0).evaluate(async card => {
    const board = document.querySelector('[data-home-departures] [data-flap-ticker]')!;
    const target = card.getAttribute('data-ticker-client')!.toUpperCase();
    const started = performance.now();
    card.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
    return await new Promise<number>(resolve => {
      const sample = () => {
        const text = [...board.querySelectorAll('[data-flap-glyph]')].map(el => el.textContent).join('').trim();
        if ((!board.querySelector('[data-flipping]') && text === target) || performance.now() - started > 1000) {
          resolve(performance.now() - started);
        } else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
  });
  expect(latency).toBeLessThan(180);
  await expect.poll(() => ticker.locator('[data-flipping]').count()).toBe(0);
  expect((await ticker.locator('[data-flap-glyph]').allTextContents()).join('').trim()).toBe((await cards.nth(0).getAttribute('data-ticker-client'))!.toUpperCase());
  await page.emulateMedia({reducedMotion: 'reduce'});
  await cards.nth(0).locator('a').focus();
  await expect(ticker.locator('[data-flipping]')).toHaveCount(0);
  await expect(ticker.locator('[data-ticker-accessible]')).toHaveText((await cards.nth(0).getAttribute('data-ticker-client')) || 'Client pending');
});

test('narrow ticker stays on one line at the vertical midpoint, then returns to its hero position', async ({page}) => {
  for (const width of [320, 768, 999]) {
    await page.setViewportSize({width, height: 812});
    await page.goto('/#work-gallery');
    const board = page.locator('[data-home-departures]');
    const gallery = page.locator('[data-work-gallery]');
    await gallery.evaluate(el => scrollTo(0, el.getBoundingClientRect().top + scrollY + 120));
    await expect(board).toHaveAttribute('data-placement', 'floating');
    await expect(board).toBeVisible();
    const layout = await board.evaluate(el => {
      const box = el.getBoundingClientRect();
      const tiles = [...el.querySelectorAll('[data-flap]')].map(tile => tile.getBoundingClientRect());
      return {
        left: box.left, right: box.right, centerError: Math.abs(box.top + box.height / 2 - innerHeight / 2), height: box.height,
        rows: new Set(tiles.map(tile => tile.top)).size,
        tilesFit: tiles.every(tile => tile.width > 0 && tile.left >= box.left && tile.right <= box.right + .1),
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    expect(layout.left).toBeGreaterThanOrEqual(14);
    expect(layout.right).toBeLessThanOrEqual(width - 14);
    expect(layout.centerError).toBeLessThan(1);
    expect(layout.height).toBeLessThan(40);
    expect(layout.rows).toBe(1);
    expect(layout.tilesFit).toBe(true);
    expect(layout.overflow).toBe(0);
    await gallery.evaluate(el => scrollTo(0, el.getBoundingClientRect().bottom + scrollY));
    await expect(board).toBeHidden();
    await page.evaluate(() => scrollTo(0, 0));
    await expect(board).toHaveAttribute('data-placement', 'docked');
    await expect(board).toBeVisible();
    const dockError = await board.evaluate(el => {
      const box = el.getBoundingClientRect();
      const dock = document.querySelector('[data-ticker-dock]')!.getBoundingClientRect();
      return Math.abs(box.top + box.height / 2 - Math.max(dock.top + dock.height / 2, innerHeight / 2));
    });
    expect(dockError).toBeLessThan(1);
  }
});

for (const width of [320, 768, 1440]) {
test(`board never pushes downward and smoothly locks at ${width}px`, async ({page}) => {
  await page.setViewportSize({width, height: 900});
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
    const start = 0;
    const end = Math.max(120, top - innerHeight * .4);
    const positions = Array.from({length: 31}, (_, i) => start + (end - start) * i / 30);
    let maxStep = 0;
    let maxDownwardStep = 0;
    let lockedError = 0;
    let maxRightInsetError = 0;
    const inset = Number.parseFloat(getComputedStyle(board).right);
    for (const samples of [positions, positions.toReversed()]) {
      let previous: DOMRect | undefined;
      for (const y of samples) {
        scrollTo(0, y);
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const box = board.getBoundingClientRect();
        maxRightInsetError = Math.max(maxRightInsetError, Math.abs(innerWidth - box.right - inset));
        if (previous) {
          maxStep = Math.max(maxStep, Math.hypot(box.x - previous.x, box.y - previous.y));
          if (samples === positions) maxDownwardStep = Math.max(maxDownwardStep, box.y - previous.y);
        }
        if (y === end) lockedError = Math.abs(box.top + box.height / 2 - innerHeight / 2);
        previous = box;
      }
    }
    return {maxStep, maxDownwardStep, lockedError, maxRightInsetError, width: board.offsetWidth};
  });
  expect(result.width).toBeGreaterThan(0);
  expect(result.maxStep).toBeLessThan(40);
  expect(result.maxDownwardStep).toBeLessThan(.5);
  expect(result.lockedError).toBeLessThan(1);
  expect(result.maxRightInsetError).toBeLessThan(1);
});
}
