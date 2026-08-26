import {expect, test} from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('new-work:logo-intro:v3', 'test-skip');
  });
});

test('the About tab opens a progressive WebGL experience without layout overflow', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'no-preference'});
  const response = await page.goto('/about');
  expect(response?.status()).toBe(200);

  const reel = page.locator('[data-reel-experience]');
  await expect(reel).toBeVisible();
  await expect(page.locator('[data-desktop-nav] a[href="/about"]'))
    .toHaveAttribute('aria-current', 'page');
  await expect.poll(() => reel.getAttribute('data-mode'), {timeout: 30_000})
    .toMatch(/^(enhanced|fallback)$/u);
  await expect(reel).toHaveAttribute('aria-busy', 'false');
  await expect(reel.locator('.reel-render-note')).toHaveCount(0);

  const openingGeometry = await page.evaluate(() => ({
    scrollY: window.scrollY,
    reelTop: document.querySelector<HTMLElement>('[data-reel-experience]')
      ?.getBoundingClientRect().top,
    stageTop: document.querySelector<HTMLElement>('.reel-motion-stage')
      ?.getBoundingClientRect().top,
  }));
  expect(openingGeometry.scrollY).toBe(0);
  expect(Math.abs(openingGeometry.reelTop ?? Number.POSITIVE_INFINITY)).toBeLessThanOrEqual(1);

  const mode = await reel.getAttribute('data-mode');
  if (mode === 'enhanced') {
    expect(Math.abs(openingGeometry.stageTop ?? Number.POSITIVE_INFINITY)).toBeLessThanOrEqual(1);
    await expect(reel.locator('canvas.reel-media-canvas')).toHaveCount(1);
    await expect(reel.locator('.reel-static-fallback')).toHaveCSS('visibility', 'hidden');

    const slideBounds = async (selector: string) =>
      reel.locator(selector).evaluate((element) => {
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
    await expect.poll(() => reel.evaluate((element) =>
      Number.parseFloat((element as HTMLElement).style.getPropertyValue('--reel-progress') || '0')))
      .toBeGreaterThan(0.2);
  } else {
    await expect(reel.locator('.reel-motion-stage')).toBeHidden();
    await expect(reel.locator('.reel-static-fallback')).toBeVisible();
  }

  expect(await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  expect(await page.locator('img[src*="/media/"]').count()).toBeGreaterThanOrEqual(6);
});

test('reduced motion receives the complete still-image About page', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/about');

  const reel = page.locator('[data-reel-experience]');
  await expect(reel).toHaveAttribute('data-mode', 'fallback');
  await expect(reel).toHaveAttribute('aria-busy', 'false');
  await expect(reel.locator('.reel-motion-stage')).toBeHidden();
  await expect(reel.locator('.reel-static-fallback')).toBeVisible();
  await expect(reel.locator('.reel-fallback-card')).toHaveCount(6);
  await expect(reel.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('heading', {
    level: 1,
    name: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  }))
    .toBeVisible();
  await expect(page.getByRole('link', {name: 'Start a project'}).last()).toHaveAttribute('href', '/contact');
});

test('the former Reel URL redirects to About', async ({page}) => {
  await page.goto('/reel');
  await expect(page).toHaveURL(/\/about\/?$/u);
});
