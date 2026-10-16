import { expect, test, type Page } from '@playwright/test';

test.use({ deviceScaleFactor: 2 });

// Use an actual painted point. Several letters have counters or diagonal gaps
// at the centre of their rectangle; those gaps intentionally aren't hit areas.
async function hoverLetter(page: Page, index: number) {
  const point = await page.locator(`[data-type-letter="${index}"]`).evaluate(element => {
    const path = element as SVGPathElement;
    const box = path.getBBox(); const matrix = path.getScreenCTM()!;
    for (let y = .35; y < .9; y += .1) for (let x = .15; x < .9; x += .1) {
      const local = new DOMPoint(box.x + box.width * x, box.y + box.height * y);
      if (!path.isPointInFill(local)) continue;
      const screen = local.matrixTransform(matrix);
      if (document.elementFromPoint(screen.x, screen.y) === path) return { x: screen.x, y: screen.y };
    }
    throw new Error('No visible hit point for glyph');
  });
  await page.mouse.move(point.x, point.y);
}

test('one native wordmark survives splash, home and return with identical letter spacing', async ({ page, request }) => {
  await page.goto('/');
  const intro = page.locator('[data-logo-intro]');
  await expect(intro).toHaveAttribute('data-logo-reveal-phase', 'done');
  await expect(page.locator('[data-logo-intro]')).toHaveCount(1);
  await expect(page.locator('[data-wordmark-art]')).toHaveCount(1);
  await expect(page.locator('[data-wordmark-art] path')).toHaveCount(8);
  const artwork = await (await request.get('/media/brand/oliver-horizontal.svg')).text();
  const nativePaths = [...artwork.matchAll(/<path\b[^>]*\sd="([^"]+)"/gu)].map(match => match[1]!).sort();
  expect(await page.locator('[data-wordmark-art] path').evaluateAll(paths => paths.map(path => path.getAttribute('d')!).sort())).toEqual(nativePaths);
  const original = await page.locator('[data-wordmark-art]').elementHandle();
  const spacing = () => page.locator('[data-wordmark-art]').evaluate(element => {
    const letters = [...element.querySelectorAll<SVGPathElement>('path')];
    // Same intraword pair distances, independent of the artwork's screen scale.
    return [0, 1, 3, 4, 5, 6].map(index => {
      const a = letters[index]!; const b = letters[index + 1]!;
      const box = a.getBoundingClientRect(); const next = b.getBoundingClientRect();
      return (next.left - box.left) / box.width;
    });
  });
  const before = await spacing();
  await page.keyboard.press('Enter');
  await expect(intro).toHaveAttribute('data-title-state', 'home');
  await expect(intro).toHaveAttribute('data-title-motion', 'settled');
  expect(await original!.evaluate(node => node === document.querySelector('[data-wordmark-art]'))).toBe(true);
  (await spacing()).forEach((advance, index) => expect(advance).toBeCloseTo(before[index]!, 4));
  // The horizontal state is the exact source viewbox, with no font or CSS kerning.
  await expect(page.locator('[data-wordmark-art]')).toHaveAttribute('viewBox', '0 0 842.76171875 188.29412841796875');
  await page.keyboard.press('Home'); await page.waitForTimeout(500); await page.keyboard.press('Home');
  await expect(intro).toHaveAttribute('data-title-state', 'splash');
  await expect(intro).toHaveAttribute('data-title-motion', 'settled');
  expect(await original!.evaluate(node => node === document.querySelector('[data-wordmark-art]'))).toBe(true);
  (await spacing()).forEach((advance, index) => expect(advance).toBeCloseTo(before[index]!, 4));
});

test('each glyph changes independently in splash and home and releases its video', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Touch does not expose letter hover.');
  await page.addInitScript(() => {
    const drawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (source, ...coordinates: number[]) {
      Reflect.apply(drawImage, this, [source, ...coordinates]);
      if (this.canvas instanceof HTMLCanvasElement && this.canvas.matches('[data-wordmark-canvas]')
        && (source instanceof HTMLVideoElement || source instanceof HTMLImageElement)) this.canvas.dataset.testPaintSource = source.currentSrc;
    };
  });
  await page.goto('/');
  const intro = page.locator('[data-logo-intro]'); const canvas = page.locator('[data-wordmark-canvas]');
  await expect(intro).toHaveAttribute('data-logo-reveal-phase', 'done');
  const defaultSource = await page.locator('[data-splash-video]').evaluate(video => (video as HTMLVideoElement).currentSrc);
  await expect(canvas).toHaveAttribute('data-shared-source', defaultSource);
  for (const state of ['splash', 'home']) {
    if (state === 'home') {
      await page.mouse.move(2, 2); await page.keyboard.press('Enter');
      await expect(intro).toHaveAttribute('data-title-motion', 'settled');
      await expect(canvas).not.toHaveAttribute('data-shared-source');
      expect(await page.locator('[data-splash-video]').evaluate(video => (video as HTMLVideoElement).paused)).toBe(true);
    }
    for (const index of [0, 1, 2, 3, 4, 5, 6, 1, 3]) {
      await hoverLetter(page, index);
      await expect(page.locator('[data-type-active="true"]')).toHaveCount(1);
      await expect(canvas).toHaveAttribute('data-active-letter', String(index));
      const media = page.locator(`[data-letter-media="${index}"]`);
      const video = media.locator('source');
      const mediaSource = await (await video.count() ? video : media.locator('img')).getAttribute('data-src');
      await expect(canvas).toHaveAttribute('data-test-paint-source', new URL(mediaSource!, page.url()).href);
      if (state === 'splash') await expect(canvas).toHaveAttribute('data-shared-source', defaultSource);
      expect(await page.locator(`[data-letter-media]:not([data-letter-media="${index}"]) video`)
        .evaluateAll(videos => videos.every(video => (video as HTMLVideoElement).paused))).toBe(true);
    }
    await page.mouse.move(2, 2);
    await expect(page.locator('[data-type-active]')).toHaveCount(0);
    await expect(canvas).not.toHaveAttribute('data-active-letter');
    expect(await page.locator('[data-letter-media] video').evaluateAll(videos => videos.every(video => (video as HTMLVideoElement).paused))).toBe(true);
  }
});

for (const preference of ['reduced motion', 'Save-Data'] as const) {
  test(`letter hover uses a static individual image with ${preference}`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'Touch does not expose letter hover.');
    if (preference === 'reduced motion') await page.emulateMedia({ reducedMotion: 'reduce' });
    else await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: true } }));
    await page.goto('/');
    await expect(page.locator('[data-logo-intro]')).toHaveAttribute('data-logo-reveal-phase', 'done');
    await hoverLetter(page, 1);
    await expect(page.locator('[data-type-active="true"]')).toHaveCount(1);
    await expect(page.locator('[data-wordmark-canvas]')).toHaveAttribute('data-active-kind', 'image');
    await expect(page.locator('[data-logo-intro] video source[src]')).toHaveCount(0);
    await page.mouse.move(2, 2);
    await expect(page.locator('[data-type-active]')).toHaveCount(0);
    await expect(page.locator('[data-wordmark-canvas]')).not.toHaveAttribute('data-active-letter');
  });
}
