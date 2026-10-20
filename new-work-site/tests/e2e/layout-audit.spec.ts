import { expect, test } from '@playwright/test';

const titleRoutes = ['/work/michael-selected-photography', '/work/mercury-an-unexpected-life', '/work/olympics-toyota-in-due-time'];

for (const width of [320, 390, 768, 1024, 1440, 1920]) {
  test(`project titles and page content stay contained at ${width}px`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width, height: 1000 });
    for (const route of titleRoutes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready);
      const title = page.locator('[data-project-title]');
      const dimensions = await title.evaluate(element => ({
        overflow: document.documentElement.scrollWidth - innerWidth,
        chunks: [...element.querySelectorAll<HTMLElement>('[data-project-title-chunk]')].map(word => {
          const rect = word.getBoundingClientRect();
          const mask = word.parentElement!.getBoundingClientRect();
          return { text: word.textContent, excess: Math.max(mask.left - rect.left, rect.right - mask.right) };
        }),
      }));
      expect(dimensions.overflow, route).toBeLessThanOrEqual(1);
      for (const chunk of dimensions.chunks) expect(chunk.excess, `${route}: ${chunk.text}`).toBeLessThanOrEqual(1);
      // Removing a reveal mask must not reveal any additional resting glyph ink.
      await title.scrollIntoViewIfNeeded();
      const box = (await title.boundingBox())!;
      const clip = { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 12), width: Math.min(width - box.x + 8, box.width + 60), height: box.height + 24 };
      const before = await page.screenshot({ clip, animations: 'disabled' });
      const unmask = await page.addStyleTag({ content: '.project-title__mask { overflow: visible !important; clip-path: none !important; }' });
      const after = await page.screenshot({ clip, animations: 'disabled' });
      expect(after.equals(before), `complete glyph ink for ${route}`).toBe(true);
      await unmask.evaluate(element => element.parentNode?.removeChild(element));
    }
  });
}

test('project return buttons and CMS logos remain legible on light and dark pages', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const route of ['/work/mercury-an-unexpected-life', '/work/olympics-toyota-in-due-time']) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.locator('.all-work-link').scrollIntoViewIfNeeded();
    const presentation = await page.locator('.all-work-link').evaluate(element => {
      const css = getComputedStyle(element);
      const luminance = (color: string) => {
        const rgb = color.match(/[\d.]+/g)!.slice(0, 3).map(value => Number(value) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
        return rgb[0]! * .2126 + rgb[1]! * .7152 + rgb[2]! * .0722;
      };
      const values = [luminance(css.color), luminance(css.backgroundColor)].sort((a, b) => a - b);
      return { contrast: (values[1]! + .05) / (values[0]! + .05), dark: document.body.dataset.pageTheme === 'dark' };
    });
    expect(presentation.contrast).toBeGreaterThanOrEqual(4.5);
    for (const brand of await page.locator('.site-header .oliver-brand, .site-footer .oliver-brand').all()) {
      const asset = brand.locator('img');
      if (await asset.count()) {
        await expect.poll(() => asset.evaluate(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)).toBe(true);
        await expect(asset).toHaveCSS('filter', `brightness(0) invert(${presentation.dark ? 1 : 0})`);
      }
    }
    // Also reach this page through ClientRouter, where style insertion order differs.
    await page.locator('[data-site-header] a').first().click();
    await page.goto('/#work-gallery', { waitUntil: 'domcontentloaded' });
    const galleryLink = page.locator(`[data-project-card] a[href^="${route}"]`).first();
    await galleryLink.click();
    await expect(page.locator('.all-work-link')).toHaveCSS('color', 'rgb(255, 253, 247)');
  }
});

for (const width of [320, 390, 768]) {
  test(`moving gallery avoids the ticker and reel at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/#work-gallery', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-work-gallery]')).toHaveAttribute('data-column-motion', 'first-order');
    await expect(page.locator('[data-project-grid]')).toHaveAttribute('data-masonry-ready', 'true');
    const collisions = await page.evaluate(async () => {
      const gallery = document.querySelector<HTMLElement>('[data-work-gallery]')!;
      const board = document.querySelector<HTMLElement>('[data-home-departures]')!;
      const reel = document.querySelector<HTMLElement>('.reel__frame')!;
      const cards = [...gallery.querySelectorAll<HTMLElement>('[data-project-card]')];
      const settle = () => new Promise(resolve => setTimeout(resolve, 1800));
      const sample = async (other: HTMLElement) => {
        let overlaps = 0;
        const started = performance.now();
        await new Promise<void>(resolve => {
          const frame = () => {
            const bounds = other.getBoundingClientRect();
            for (const card of cards) {
              const box = card.getBoundingClientRect();
              if (box.left < bounds.right && box.right > bounds.left && box.top < bounds.bottom && box.bottom > bounds.top) overlaps++;
            }
            if (performance.now() - started < 700) requestAnimationFrame(frame); else resolve();
          };
          requestAnimationFrame(frame);
        });
        return overlaps;
      };
      await settle();
      const start = scrollY;
      scrollTo(0, start + 200); await settle();
      scrollTo(0, Math.max(0, start - 180));
      const ticker = await sample(board);
      const end = scrollY + gallery.getBoundingClientRect().bottom - innerHeight * .6;
      scrollTo(0, end - 300); await settle();
      scrollTo(0, end);
      return { ticker, reel: await sample(reel) };
    });
    expect(collisions).toEqual({ ticker: 0, reel: 0 });
  });
}

test('sideways pointer movement keeps both outer gallery edges visible', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Lateral movement only runs with a fine pointer.');
  for (const width of [1200, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#work-gallery', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-work-gallery]')).toHaveAttribute('data-gallery-pointer', 'true');
    for (const x of [1, width - 1]) {
      await page.mouse.move(x, 400);
      await page.waitForTimeout(1100);
      const bounds = await page.locator('[data-gallery-entrance]').boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(3);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width - 3);
    }
  }
});
