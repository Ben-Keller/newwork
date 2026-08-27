import {expect, test} from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('new-work:logo-intro:v3', 'test-skip');
  });
});

test('holds an aligned opening reel in place while WebGL content loads', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'The enhanced reel runs on desktop Chromium.');
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
  await expect(placeholder).toBeVisible();

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

  await about.evaluate((element) => {
    (element as HTMLElement).dataset.mode = 'enhanced';
  });
  await expect(placeholder).toBeHidden();
  releaseAtlas?.();
});

test('initializes one reel renderer and preloads its critical imagery', async ({page}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'The enhanced reel runs on desktop Chromium.');
  await page.addInitScript(() => {
    const routeWindow = window as Window & {__aboutCanvasAdds?: number};
    routeWindow.__aboutCanvasAdds = 0;
    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches('canvas.reel-media-canvas')) routeWindow.__aboutCanvasAdds! += 1;
          routeWindow.__aboutCanvasAdds! += node.querySelectorAll('canvas.reel-media-canvas').length;
        }
      }
    }).observe(document, {childList: true, subtree: true});
  });
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.goto('/about');

  const about = page.locator('[data-about-experience]');
  await expect.poll(() => about.getAttribute('data-mode'), {timeout: 30_000}).toBe('enhanced');
  await expect(about.locator('canvas.reel-media-canvas')).toHaveCount(1);
  await expect.poll(() => page.evaluate(() =>
    (window as Window & {__aboutCanvasAdds?: number}).__aboutCanvasAdds ?? 0))
    .toBe(1);
  await expect(page.locator('link[data-reel-preload="atlas"]')).toHaveCount(1);
  await expect(page.locator('link[data-reel-preload="feature"]')).toHaveCount(1);
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
  await expect(about.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('heading', {
    level: 1,
    name: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  }))
    .toBeVisible();
  await expect(page.getByRole('link', {name: 'Start a project'}).last()).toHaveAttribute('href', '/contact');
});
