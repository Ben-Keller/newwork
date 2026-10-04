import { expect, test } from '@playwright/test';

test.use({ deviceScaleFactor: 2 });

test('gallery hover masks share the typeset glyph origin and baseline at fractional scales', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('new-work-restore-requested', 'true');
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      fillText.call(this, text, x, y, maxWidth);
      const canvas = this.canvas;
      if (!canvas.matches('[data-type-letter-canvas]')) return;
      const letter = canvas.closest<HTMLElement>('[data-type-letter]')!;
      const glyph = letter.querySelector<HTMLElement>('[data-type-letter-glyph]')!;
      const marker = letter.querySelector<HTMLElement>('[data-type-letter-baseline]')!;
      const box = canvas.getBoundingClientRect();
      const transform = this.getTransform();
      // Map the actual draw operation back to screen pixels, independently of
      // the production code's scale calculation and padded canvas dimensions.
      const drawnOrigin = box.left + x * transform.a * box.width / canvas.width;
      const drawnBaseline = box.top + y * transform.d * box.height / canvas.height;
      letter.dataset.testHoverOriginError = String(Math.abs(drawnOrigin - glyph.getBoundingClientRect().left));
      letter.dataset.testHoverBaselineError = String(Math.abs(drawnBaseline - marker.getBoundingClientRect().top));
    };
  });
  await page.goto('/');
  test.skip(!await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches),
    'Per-letter hover requires a fine pointer.');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[data-logo-intro]')).toHaveAttribute('data-logo-reveal-phase', 'done');

  for (const viewport of [
    { width: 375, height: 812 },
    { width: 767, height: 900 },
    { width: 1440, height: 900 },
    { width: 1642, height: 902 },
  ]) {
    await page.setViewportSize(viewport);
    for (const index of [0, 6]) {
      const letter = page.locator(`[data-type-letter="${index}"]`);
      const hit = await letter.locator('[data-type-letter-hit]').boundingBox();
      expect(hit).not.toBeNull();
      await page.mouse.move(hit!.x + hit!.width / 2, hit!.y + Math.min(16, hit!.height / 4));
      await expect(letter).toHaveAttribute('data-type-media-ready', 'true');
      await expect.poll(() => letter.evaluate((element) => Math.max(
        Number((element as HTMLElement).dataset.testHoverOriginError ?? Infinity),
        Number((element as HTMLElement).dataset.testHoverBaselineError ?? Infinity),
      )), { message: `Glyph ${index} must not drift at ${viewport.width}px` }).toBeLessThan(.15);
      expect(await letter.evaluate((element) => getComputedStyle(element, '::before').transform)).toBe('none');
    }
  }
});

test('splash keeps one continuous video across both words during hover and return from the gallery', async ({ page }) => {
  await page.addInitScript(() => {
    const drawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (source, ...coordinates: number[]) {
      Reflect.apply(drawImage, this, [source, ...coordinates]);
      const canvas = this.canvas;
      if (!(canvas instanceof HTMLCanvasElement) || !canvas.matches('[data-splash-canvas]')) return;
      if (source instanceof HTMLVideoElement) canvas.dataset.testPaintSource = source.currentSrc;
      if (source instanceof HTMLImageElement) canvas.dataset.testPaintSource = source.currentSrc;
    };
  });
  await page.goto('/');
  const intro = page.locator('[data-logo-intro]');
  const canvas = page.locator('[data-splash-canvas]');
  await expect(intro).toHaveAttribute('data-logo-reveal-phase', 'done');
  const defaultSource = await page.locator('[data-splash-video]').evaluate((video) =>
    (video as HTMLVideoElement).currentSrc);
  await expect(canvas).toHaveAttribute('data-test-paint-source', defaultSource);
  const expectNoSeparateLayers = async () => {
    expect(await page.locator('[data-type-letter]').evaluateAll((letters) => letters.every((letter) => (
      getComputedStyle(letter.querySelector('canvas')!).opacity === '0'
      && getComputedStyle(letter, '::before').opacity === '0'
      && getComputedStyle(letter, '::after').opacity === '0'
    )))).toBe(true);
  };
  await expectNoSeparateLayers();
  const finePointer = await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches);
  if (finePointer) {
    for (const index of [1, 3, 6]) {
      const letter = page.locator(`[data-type-letter="${index}"]`);
      await letter.locator('[data-type-letter-hit]').hover();
      await expect(letter).toHaveAttribute('data-type-active', 'true');
      const videoSource = await letter.locator('[data-type-letter-video-source]').getAttribute('data-src');
      expect(videoSource).toBeTruthy();
      await expect(canvas).toHaveAttribute('data-test-paint-source', new URL(videoSource!, page.url()).href);
      await expectNoSeparateLayers();
    }
    await page.mouse.move(2, 2);
    await expect(page.locator('[data-type-active]')).toHaveCount(0);
    await expect(canvas).toHaveAttribute('data-test-paint-source', defaultSource);
  }

  await page.keyboard.press('Enter');
  await expect(intro).toHaveAttribute('data-title-state', 'home');
  await expect(intro).toHaveAttribute('data-title-motion', 'settled');
  if (finePointer) {
    const letter = page.locator('[data-type-letter="3"]');
    const hit = await letter.locator('[data-type-letter-hit]').boundingBox();
    expect(hit).not.toBeNull();
    await page.mouse.move(hit!.x + hit!.width / 2, hit!.y + Math.min(16, hit!.height / 4));
    await expect(letter.locator('[data-type-letter-canvas]')).toHaveCSS('opacity', '1');
  }
  // Returning is deliberately a second upward action after resting at the
  // top; the first Home key starts that dwell even when scrollY is already 0.
  await page.keyboard.press('Home');
  await page.waitForTimeout(500);
  await page.keyboard.press('Home');
  await expect(intro).toHaveAttribute('data-title-state', 'splash');
  await expect(page.locator('[data-type-active]')).toHaveCount(0);
  await expect(canvas).toHaveAttribute('data-test-paint-source', defaultSource);
  await expectNoSeparateLayers();
});
