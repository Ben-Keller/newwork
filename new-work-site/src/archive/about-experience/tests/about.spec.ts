import {expect, test} from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('new-work:logo-intro:v3', 'test-skip');
  });
});

test('holds an aligned opening reel in place while WebGL content loads', async ({page}, testInfo) => {
  test.setTimeout(90_000);
  test.skip(testInfo.project.name !== 'desktop-chromium', 'The enhanced reel runs on desktop Chromium.');
  await page.addInitScript(() => {
    const routeWindow = window as Window & {__aboutPlaceholderOpacities?: number[]};
    routeWindow.__aboutPlaceholderOpacities = [];
    const startedAt = performance.now();
    const sample = (): void => {
      const placeholder = document.querySelector<HTMLElement>('[data-reel-opening-placeholder]');
      if (placeholder) {
        routeWindow.__aboutPlaceholderOpacities!.push(
          Number.parseFloat(getComputedStyle(placeholder).opacity),
        );
      }
      if (performance.now() - startedAt < 5_000) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.emulateMedia({reducedMotion: 'no-preference'});

  let releaseAtlas: (() => void) | undefined;
  const atlasGate = new Promise<void>((resolve) => {
    releaseAtlas = resolve;
  });
  await page.route('**/media/atlas-grid.webp', async (route) => {
    await atlasGate;
    await route.continue();
  });
  await page.goto('/about', {waitUntil: 'domcontentloaded'});

  const about = page.locator('[data-about-experience]');
  const placeholder = about.locator('[data-reel-opening-placeholder]');
  await expect(about).toHaveAttribute('data-mode', 'loading');
  await expect(about).toHaveAttribute('data-reel-scroll-ready', 'false');
  await expect(page.locator('html')).toHaveAttribute('data-about-reel-scroll-locked', 'true');
  await expect(placeholder).toBeVisible();
  await expect(placeholder).toHaveAttribute('data-placeholder-visible', 'true');
  await expect(placeholder).toHaveCSS('transition-duration', '1.8s, 0s');
  await expect.poll(() => placeholder.evaluate((element) => getComputedStyle(element).opacity))
    .toBe('1');
  const layerOrder = await about.evaluate((element) => ({
    canvas: Number.parseInt(getComputedStyle(
      element.querySelector<HTMLElement>('[data-reel-canvas]')!,
    ).zIndex, 10),
    placeholder: Number.parseInt(getComputedStyle(
      element.querySelector<HTMLElement>('[data-reel-opening-placeholder]')!,
    ).zIndex, 10),
    wash: Number.parseInt(getComputedStyle(
      element.querySelector<HTMLElement>('.reel-paper-wash')!,
    ).zIndex, 10),
  }));
  expect(layerOrder.canvas).toBeGreaterThan(layerOrder.placeholder);
  expect(layerOrder.wash).toBeGreaterThan(layerOrder.canvas);
  const placeholderOpacities = await page.evaluate(() => (
    window as Window & {__aboutPlaceholderOpacities?: number[]}
  ).__aboutPlaceholderOpacities ?? []);
  expect(placeholderOpacities.some((opacity) => opacity > 0 && opacity < 1)).toBe(true);

  const placement = await placeholder.evaluate((element) => {
    const upper = element.querySelector<HTMLElement>('.reel-opening-placeholder__track--upper')!;
    const feed = element.querySelector<HTMLElement>('.reel-opening-placeholder__track--feed')!;
    const lower = element.querySelector<HTMLElement>('.reel-opening-placeholder__track--lower')!;
    const frame = upper.querySelector<HTMLElement>('i')!;
    const feedFrame = feed.querySelector<HTMLElement>('i')!;
    const upperBounds = upper.getBoundingClientRect();
    const feedBounds = feed.getBoundingClientRect();
    const lowerBounds = lower.getBoundingClientRect();
    const frameBounds = frame.getBoundingClientRect();
    const feedFrameBounds = feedFrame.getBoundingClientRect();
    const frameStyles = getComputedStyle(frame);
    const frameWindowStyles = getComputedStyle(frame, '::before');
    const perforationStyles = getComputedStyle(frame, '::after');
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      upperLeft: upperBounds.left,
      upperCenter: upperBounds.top + upperBounds.height / 2,
      feedLeft: feedBounds.left,
      feedCenter: feedBounds.top + feedBounds.height / 2,
      lowerLeft: lowerBounds.left,
      lowerCenter: lowerBounds.top + lowerBounds.height / 2,
      frameWidth: frameBounds.width,
      frameHeight: frameBounds.height,
      feedFrameWidth: feedFrameBounds.width,
      feedFrameHeight: feedFrameBounds.height,
      frameBackground: frameStyles.backgroundColor,
      frameWindowBackground: frameWindowStyles.backgroundImage,
      perforationBackground: perforationStyles.backgroundImage,
    };
  });
  expect(placement.upperLeft).toBeCloseTo(placement.viewportWidth * 0.00334, 0);
  expect(placement.upperCenter).toBeCloseTo(placement.viewportHeight * 0.25167, 0);
  expect(placement.feedLeft).toBeCloseTo(placement.viewportWidth * 0.7, 0);
  expect(placement.feedCenter).toBeCloseTo(placement.viewportHeight * 0.5, 0);
  expect(placement.lowerLeft).toBeCloseTo(placement.viewportWidth * 0.51987, 0);
  expect(placement.lowerCenter).toBeCloseTo(placement.viewportHeight * 0.72847, 0);
  expect(placement.frameWidth).toBeCloseTo(
    placement.viewportWidth * 0.07847 + placement.viewportHeight * 0.03745,
    0,
  );
  expect(placement.frameHeight).toBeCloseTo(
    placement.viewportWidth * 0.04414 + placement.viewportHeight * 0.02106,
    0,
  );
  const viewHeight = 2 * 7.5 * Math.tan(19 * Math.PI / 180);
  const minView = viewHeight * Math.min(1, placement.viewportWidth / placement.viewportHeight);
  const openingDepthScale = (7.5 - 0.27 * minView) / 7.5;
  const expectedFeedWidth = 0.1696460033
    * Math.min(placement.viewportWidth, placement.viewportHeight)
    / openingDepthScale;
  expect(placement.feedFrameWidth).toBeCloseTo(expectedFeedWidth, 0);
  expect(placement.feedFrameHeight).toBeCloseTo(expectedFeedWidth / (16 / 9), 0);
  expect(placement.frameBackground).toBe('rgb(8, 8, 7)');
  expect(placement.frameWindowBackground).toContain('linear-gradient');
  expect(placement.perforationBackground).toContain('repeating-linear-gradient');

  await about.evaluate((element) => {
    (element as HTMLElement).dataset.mode = 'enhanced';
  });
  await expect(placeholder).toBeVisible();
  await page.mouse.wheel(0, 1_800);
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(about).toHaveCSS('height', `${await page.evaluate(() => window.innerHeight)}px`);
  releaseAtlas?.();
  await expect(placeholder).toHaveCount(0, {timeout: 60_000});
  await expect(about).toHaveAttribute('data-reel-scroll-ready', 'true');
  await expect(page.locator('html')).not.toHaveAttribute('data-about-reel-scroll-locked');
  await page.mouse.wheel(0, 1_800);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

test('initializes one reel renderer and preloads its critical imagery', async ({page}, testInfo) => {
  test.setTimeout(60_000);
  test.skip(testInfo.project.name !== 'desktop-chromium', 'The enhanced reel runs on desktop Chromium.');
  await page.addInitScript(() => {
    const routeWindow = window as Window & {
      __aboutCanvasAdds?: number;
      __aboutCanvasInitialOpacities?: string[];
      __aboutCanvasOpacities?: number[];
      __aboutPlaceholderPresentAtFadeStart?: boolean;
      __aboutPlaceholderExitOpacities?: number[];
      __aboutAssetsCompletedWithPlaceholderRemoved?: boolean;
    };
    routeWindow.__aboutCanvasAdds = 0;
    routeWindow.__aboutCanvasInitialOpacities = [];
    routeWindow.__aboutCanvasOpacities = [];
    routeWindow.__aboutPlaceholderExitOpacities = [];
    const recordCanvas = (canvas: Element): void => {
      routeWindow.__aboutCanvasAdds! += 1;
      routeWindow.__aboutCanvasInitialOpacities!.push(getComputedStyle(canvas).opacity);
      const sample = (): void => {
        const opacity = Number.parseFloat(getComputedStyle(canvas).opacity);
        routeWindow.__aboutCanvasOpacities!.push(opacity);
        if (canvas.isConnected && opacity < 1) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
      new MutationObserver(() => {
        if ((canvas as HTMLElement).dataset.assetFade === 'active') {
          const placeholder = document.querySelector<HTMLElement>(
            '[data-reel-opening-placeholder]',
          );
          routeWindow.__aboutPlaceholderPresentAtFadeStart = Boolean(placeholder);
          const samplePlaceholderExit = (): void => {
            if (!placeholder?.isConnected) return;
            routeWindow.__aboutPlaceholderExitOpacities!.push(
              Number.parseFloat(getComputedStyle(placeholder).opacity),
            );
            requestAnimationFrame(samplePlaceholderExit);
          };
          requestAnimationFrame(samplePlaceholderExit);
        }
        if ((canvas as HTMLElement).dataset.assetFade === 'complete') {
          const about = document.querySelector<HTMLElement>('[data-about-experience]');
          routeWindow.__aboutAssetsCompletedWithPlaceholderRemoved = Boolean(
            !document.querySelector('[data-reel-opening-placeholder]')
            && Number.parseFloat(getComputedStyle(canvas).opacity) === 1
            && document.documentElement.dataset.aboutReelScrollLocked !== 'true'
            && about?.dataset.reelScrollReady === 'true',
          );
        }
      }).observe(canvas, {attributes: true, attributeFilter: ['data-asset-fade']});
    };
    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches('canvas.reel-media-canvas')) recordCanvas(node);
          node.querySelectorAll('canvas.reel-media-canvas').forEach(recordCanvas);
        }
      }
    }).observe(document, {childList: true, subtree: true});
  });
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.goto('/about');

  const about = page.locator('[data-about-experience]');
  await expect.poll(() => about.getAttribute('data-mode'), {timeout: 30_000}).toBe('enhanced');
  await expect(about).toHaveAttribute('data-reel-assets-ready', 'true');
  const canvas = about.locator('canvas.reel-media-canvas');
  await expect(canvas).toHaveCount(1);
  await expect.poll(() => page.evaluate(() =>
    (window as Window & {__aboutCanvasAdds?: number}).__aboutCanvasAdds ?? 0))
    .toBe(1);
  expect(await page.evaluate(() => (
    window as Window & {__aboutCanvasInitialOpacities?: string[]}
  ).__aboutCanvasInitialOpacities)).toEqual(['0']);
  await expect(canvas).toHaveAttribute('data-asset-fade', 'complete', {timeout: 10_000});
  await expect(canvas).toHaveCSS('opacity', '1');
  expect(await page.evaluate(() => (
    window as Window & {__aboutPlaceholderPresentAtFadeStart?: boolean}
  ).__aboutPlaceholderPresentAtFadeStart)).toBe(true);
  expect(await page.evaluate(() => (
    window as Window & {__aboutAssetsCompletedWithPlaceholderRemoved?: boolean}
  ).__aboutAssetsCompletedWithPlaceholderRemoved)).toBe(true);
  await expect(about.locator('[data-reel-opening-placeholder]')).toHaveCount(0, {timeout: 10_000});
  await expect(about).toHaveAttribute('aria-busy', 'false');
  await expect(about).toHaveAttribute('data-reel-scroll-ready', 'true');
  await expect(page.locator('html')).not.toHaveAttribute('data-about-reel-scroll-locked');
  const canvasOpacities = await page.evaluate(() => (
    window as Window & {__aboutCanvasOpacities?: number[]}
  ).__aboutCanvasOpacities ?? []);
  expect(canvasOpacities.some((opacity) => opacity > 0 && opacity < 1)).toBe(true);
  const placeholderExitOpacities = await page.evaluate(() => (
    window as Window & {__aboutPlaceholderExitOpacities?: number[]}
  ).__aboutPlaceholderExitOpacities ?? []);
  expect(placeholderExitOpacities.length).toBeGreaterThan(0);
  expect(placeholderExitOpacities.every((opacity) => opacity >= 0 && opacity <= 1)).toBe(true);
  expect(placeholderExitOpacities.every((opacity, index, opacities) => (
    index === 0 || opacity >= (opacities[index - 1] ?? opacity) - .0001
  ))).toBe(true);
  await expect(page.locator('link[data-reel-preload="atlas"]')).toHaveCount(1);
  await expect(page.locator('link[data-reel-preload="feature"]')).toHaveCount(1);
});

test('loads reel videos progressively as their scenes approach', async ({page}, testInfo) => {
  test.setTimeout(60_000);
  test.skip(testInfo.project.name !== 'desktop-chromium', 'The enhanced reel runs on desktop Chromium.');
  await page.emulateMedia({reducedMotion: 'no-preference'});
  const requestedVideos = new Set<string>();
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.includes('/media/video-previews/')) requestedVideos.add(url.pathname);
  });

  await page.goto('/about');
  const about = page.locator('[data-about-experience]');
  await expect.poll(() => about.getAttribute('data-mode'), {timeout: 30_000}).toBe('enhanced');
  await expect(about).toHaveAttribute('data-reel-scroll-ready', 'true', {timeout: 10_000});
  await expect.poll(() => requestedVideos.size).toBe(1);
  expect([...requestedVideos][0]).toContain('adobe-what-whack-wears');

  await about.evaluate((element) => {
    const scrollRange = (element as HTMLElement).offsetHeight - window.innerHeight;
    window.scrollTo({top: scrollRange * 0.45, behavior: 'instant'});
  });
  await expect.poll(() => requestedVideos.size).toBe(4);
  expect([...requestedVideos].some((path) => path.includes('olympics-toyota'))).toBe(true);
  expect([...requestedVideos].some((path) => path.includes('tour-de-france'))).toBe(false);
  expect([...requestedVideos].some((path) => path.includes('michael_brava'))).toBe(false);

  await about.evaluate((element) => {
    window.scrollTo({
      top: (element as HTMLElement).offsetHeight - window.innerHeight,
      behavior: 'instant',
    });
  });
  await expect.poll(() => requestedVideos.size).toBe(6);
});

test('fallback About assets fade in when each image finishes loading', async ({page}) => {
  let releaseImage: (() => void) | undefined;
  const imageGate = new Promise<void>((resolve) => {
    releaseImage = resolve;
  });
  await page.route('**/media/images/anjali/anjali-adobe-portrait*', async (route) => {
    await imageGate;
    await route.continue();
  });
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/about', {waitUntil: 'domcontentloaded'});

  const about = page.locator('[data-about-experience]');
  await expect(about).toHaveAttribute('data-mode', 'fallback');
  await page.emulateMedia({reducedMotion: 'no-preference'});
  const firstAsset = about.locator('[data-reel-fallback-asset]').first();
  await firstAsset.scrollIntoViewIfNeeded();
  await expect(firstAsset).toHaveCSS('opacity', '0');
  await expect(firstAsset).toHaveCSS('transition-duration', '0.65s, 0.9s');
  releaseImage?.();
  await expect(firstAsset).toHaveAttribute('data-asset-loaded', 'true');
  await expect.poll(() => firstAsset.evaluate((element) => getComputedStyle(element).opacity))
    .toBe('1');
});

test('the About tab opens a progressive WebGL experience without layout overflow', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'no-preference'});
  const response = await page.goto('/about');
  expect(response?.status()).toBe(200);

  const about = page.locator('[data-about-experience]');
  await expect(about).toBeVisible();
  await expect(page.locator('[data-desktop-nav] a[href="/about"]'))
    .toHaveAttribute('aria-current', 'page');
  await expect.poll(() => about.getAttribute('data-mode'), {timeout: 30_000})
    .toMatch(/^(enhanced|fallback)$/u);
  await expect(about).toHaveAttribute('aria-busy', 'false');
  await expect(about.locator('.reel-render-note')).toHaveCount(0);

  const openingGeometry = await page.evaluate(() => ({
    scrollY: window.scrollY,
    aboutTop: document.querySelector<HTMLElement>('[data-about-experience]')
      ?.getBoundingClientRect().top,
    stageTop: document.querySelector<HTMLElement>('.reel-motion-stage')
      ?.getBoundingClientRect().top,
  }));
  expect(openingGeometry.scrollY).toBe(0);
  expect(Math.abs(openingGeometry.aboutTop ?? Number.POSITIVE_INFINITY)).toBeLessThanOrEqual(1);

  const mode = await about.getAttribute('data-mode');
  if (mode === 'enhanced') {
    expect(Math.abs(openingGeometry.stageTop ?? Number.POSITIVE_INFINITY)).toBeLessThanOrEqual(1);
    await expect(about.locator('canvas.reel-media-canvas')).toHaveCount(1);
    await expect(about.locator('.reel-static-fallback')).toHaveCSS('visibility', 'hidden');

    const slideBounds = async (selector: string) =>
      about.locator(selector).evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return {top: bounds.top, bottom: bounds.bottom, viewportHeight: window.innerHeight};
      });

    const firstSlide = await slideBounds('.reel-stage-copy--rushes');
    expect(firstSlide.top).toBeGreaterThanOrEqual(firstSlide.viewportHeight * 0.38);
    expect(firstSlide.bottom).toBeLessThan(firstSlide.viewportHeight);

    const thirdSlide = await slideBounds('.reel-stage-copy--orbit');
    expect(thirdSlide.top).toBeGreaterThanOrEqual(0);
    expect(thirdSlide.bottom).toBeLessThan(thirdSlide.viewportHeight);

    await page.evaluate(() => window.scrollTo({top: window.innerHeight * 3, behavior: 'instant'}));
    await expect.poll(() => about.evaluate((element) =>
      Number.parseFloat((element as HTMLElement).style.getPropertyValue('--reel-progress') || '0')))
      .toBeGreaterThan(0.2);
  } else {
    await expect(about.locator('.reel-motion-stage')).toBeHidden();
    await expect(about.locator('.reel-static-fallback')).toBeVisible();
  }

  expect(await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  expect(await page.locator('img[src*="/media/"]').count()).toBeGreaterThanOrEqual(6);
});

test('reduced motion receives the complete still-image About page', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/about');

  const about = page.locator('[data-about-experience]');
  await expect(about).toHaveAttribute('data-mode', 'fallback');
  await expect(about).toHaveAttribute('aria-busy', 'false');
  await expect(about.locator('.reel-motion-stage')).toBeHidden();
  await expect(about.locator('.reel-static-fallback')).toBeVisible();
  await expect(about.locator('.reel-fallback-card')).toHaveCount(6);
  const firstImage = about.locator('[data-reel-fallback-asset]').first();
  await expect(firstImage).toHaveAttribute('srcset', /anjali-adobe-portrait\.w320\.webp 320w/u);
  await expect(firstImage).toHaveAttribute('sizes', /58vw/u);
  await expect(firstImage).toHaveAttribute('width', '750');
  await expect(firstImage).toHaveAttribute('height', '626');
  await expect(about.locator('.reel-fallback-image source[type="image/avif"]').first())
    .toHaveAttribute('srcset', /anjali-adobe-portrait\.w320\.avif 320w/u);
  await expect(about.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('heading', {
    level: 1,
    name: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  }))
    .toBeVisible();
  await expect(page.getByRole('link', {name: 'Start a project'}).last()).toHaveAttribute('href', '/contact');
});
