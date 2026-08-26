import { expect, test, type Page } from '@playwright/test';

const expectLogoPageReady = async (page: Page) => {
  await expect(page.locator('[data-logo-work-page]')).toHaveAttribute('data-logo-page-ready', 'true', { timeout: 15_000 });
};

const dispatchWheelGesture = async (page: Page, deltaY: number) => {
  await page.evaluate((delta) => {
    const allowed = window.dispatchEvent(new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: delta,
    }));
    if (allowed) window.scrollBy({ top: delta, behavior: 'auto' });
  }, deltaY);
};

const scrollGesture = async (page: Page, deltaY: number, mobile: boolean) => {
  if (!mobile) {
    await page.mouse.wheel(0, deltaY);
    return;
  }

  await page.evaluate((delta) => {
    const touchEvent = (type: string, clientY?: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'touches', {
        value: clientY === undefined ? [] : [{ clientY }],
      });
      return event;
    };
    const startY = window.innerHeight / 2;
    window.dispatchEvent(touchEvent('touchstart', startY));
    const allowed = window.dispatchEvent(touchEvent('touchmove', startY - delta));
    window.dispatchEvent(touchEvent('touchend'));
    if (allowed) window.scrollBy({ top: delta, behavior: 'auto' });
  }, deltaY);
};

test.describe('logo mask study', () => {
  test.describe.configure({ mode: 'serial' });
  test('is merged into Work with no standalone Logo navigation or route', async ({ page }) => {
    await page.goto('/');
    await expectLogoPageReady(page);

    await expect(page.locator('[data-site-header] a[href="/logo"]')).toHaveCount(0);
    await expect(page.locator('[data-logo-mask-experience]')).toBeAttached();
    const retiredRoute = await page.request.get('/logo');
    expect(retiredRoute.status()).toBe(404);
  });

  test('maps number keys 1–5 to the five non-blur reveal reloads', async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Keyboard shortcuts are covered once on desktop.');

    await page.goto('/');
    await expectLogoPageReady(page);

    const experience = page.locator('[data-logo-mask-experience]');
    const stage = page.locator('[data-logo-stage]');
    const reveals = [
      ['1', 'logo-reveal-aperture'],
      ['2', 'logo-reveal-diagonal'],
      ['3', 'logo-reveal-fold'],
      ['4', 'logo-reveal-blinds'],
      ['5', 'logo-reveal-seam'],
    ] as const;

    for (const [key, animationName] of reveals) {
      const previousLoad = await page.evaluate(() => performance.timeOrigin);
      await page.keyboard.press(key);
      await page.waitForFunction((load) => performance.timeOrigin !== load, previousLoad);
      await expectLogoPageReady(page);
      await expect(experience).toHaveAttribute('data-logo-reveal', key);
      await expect(experience).toHaveAttribute('data-logo-reveal-ready', 'true');
      await expect(stage).toHaveCSS('animation-name', animationName);
    }
  });

  test('randomizes ordinary loads and replays a new reveal on return', async ({ page }, testInfo) => {
    const mobile = testInfo.project.name.startsWith('mobile-');
    await page.addInitScript(() => {
      window.sessionStorage.removeItem('new-work-logo-reveal');
      Math.random = () => .01;
    });
    await page.goto('/');
    await expectLogoPageReady(page);

    const experience = page.locator('[data-logo-mask-experience]');
    const hero = page.locator('[data-logo-work-hero]');
    const stage = page.locator('[data-logo-stage]');
    await expect(experience).toHaveAttribute('data-logo-reveal', '1');
    await expect(stage).toHaveCSS('animation-name', 'logo-reveal-aperture');

    const viewportHeight = await page.evaluate(() => window.innerHeight);
    await scrollGesture(page, viewportHeight * .2, mobile);
    await expect(hero).toHaveAttribute('data-faded', 'true');
    await page.waitForTimeout(200);
    await page.evaluate(() => { Math.random = () => .99; });
    await scrollGesture(page, -viewportHeight * .2, mobile);

    await expect(hero).toHaveAttribute('data-faded', 'false');
    await expect(experience).toHaveAttribute('data-logo-reveal', '5');
    await expect(experience).toHaveAttribute('data-logo-reveal-ready', 'true');
    await expect(stage).toHaveCSS('animation-name', 'logo-reveal-seam');
  });

  test('absorbs transition momentum, then releases instantly for a secondary gesture', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.startsWith('mobile-'), 'Trackpad momentum is desktop-only.');
    await page.goto('/');
    await expectLogoPageReady(page);

    const hero = page.locator('[data-logo-work-hero]');
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    await page.evaluate(({ firstDelta, momentumDelta }) => {
      const dispatch = (delta: number) => {
        const allowed = window.dispatchEvent(new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          deltaY: delta,
        }));
        if (allowed) window.scrollBy({ top: delta, behavior: 'auto' });
      };

      dispatch(firstDelta);
      for (let index = 0; index < 5; index += 1) dispatch(momentumDelta);
    }, {
      firstDelta: viewportHeight * .1,
      momentumDelta: viewportHeight * .025,
    });
    await expect(hero).toHaveAttribute('data-faded', 'true');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.waitForTimeout(150);
    await dispatchWheelGesture(page, viewportHeight * .025);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });

  test('uses the side gutter as the visible top minimum in short viewports', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 500 });
    await page.goto('/');
    await expectLogoPageReady(page);

    const stage = page.locator('[data-logo-stage]');
    await stage.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
    const placement = await stage.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const root = element.closest<HTMLElement>('[data-logo-mask-experience]');
      const gutter = Number.parseFloat(getComputedStyle(root!).paddingLeft);
      return { top: rect.top, left: rect.left, right: window.innerWidth - rect.right, gutter };
    });

    expect(Math.abs(placement.top - placement.gutter)).toBeLessThan(1);
    expect(Math.abs(placement.left - placement.gutter)).toBeLessThan(1);
    expect(Math.abs(placement.right - placement.gutter)).toBeLessThan(1);
  });

  test('tightens and subtly compresses the title in wide, short viewports', async ({ page }) => {
    await page.setViewportSize({ width: 1_470, height: 777 });
    await page.goto('/');
    await expectLogoPageReady(page);

    const experience = page.locator('[data-logo-mask-experience]');
    const maskedTitle = page.locator('.logo-mask-stage__single');
    const layout = await experience.evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        paddingTop: Number.parseFloat(styles.paddingTop),
        paddingLeft: Number.parseFloat(styles.paddingLeft),
      };
    });

    expect(layout.paddingTop).toBeLessThan(layout.paddingLeft);
    await expect(maskedTitle).toHaveCSS('transform', /matrix\(1, 0, 0, 0\.94, 0, 0\)/u);
  });

  test('uses the first scroll gesture for the crossfade, then scrolls normally', async ({ page }, testInfo) => {
    const mobile = testInfo.project.name.startsWith('mobile-');
    await page.goto('/');
    await expectLogoPageReady(page);

    const experience = page.locator('[data-logo-mask-experience]');
    const stage = page.locator('[data-logo-stage]');
    const hero = page.locator('[data-logo-work-hero]');
    const workContent = page.locator('[data-logo-work-content]');
    const normalTitle = page.locator('[data-logo-work-title]');
    const siteHeader = page.locator('[data-site-header]');
    await expect(experience).toBeVisible();
    await expect(hero).toHaveCSS('transition-duration', '1.2s');
    await expect(page.locator('[data-logo-background-input]')).toHaveCount(0);
    await expect(hero).toHaveAttribute('data-background-mode', 'auto');
    const automaticChannels = await hero.evaluate((element) =>
      (getComputedStyle(element).backgroundColor.match(/\d+/g) || []).slice(0, 3).map(Number));
    expect(Math.min(...automaticChannels)).toBe(0);
    expect(Math.max(...automaticChannels)).toBe(71);
    const [automaticRed = 0, automaticGreen = 0, automaticBlue = 0] = automaticChannels;
    if (automaticBlue === 0 && automaticRed > 0 && automaticGreen > 0) {
      expect(automaticGreen).toBeLessThanOrEqual(35);
    }
    const automaticColor = await hero.evaluate((element) => getComputedStyle(element).backgroundColor);
    await expect.poll(() => hero.evaluate((element) => getComputedStyle(element).backgroundColor))
      .not.toBe(automaticColor);
    await stage.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
    const stagePlacement = await stage.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const root = element.closest<HTMLElement>('[data-logo-mask-experience]');
      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        right: window.innerWidth - rect.right,
        sidePadding: Number.parseFloat(getComputedStyle(root!).paddingLeft),
      };
    });
    const centeredTop = (stagePlacement.viewportHeight - stagePlacement.height) / 2;
    const expectedTop = Math.max(stagePlacement.sidePadding, centeredTop);
    expect(Math.abs(stagePlacement.top - expectedTop)).toBeLessThan(1);
    expect(Math.abs(stagePlacement.left - stagePlacement.sidePadding)).toBeLessThan(1);
    expect(Math.abs(stagePlacement.right - stagePlacement.sidePadding)).toBeLessThan(1);
    await expect(siteHeader).toHaveCSS('opacity', '0');
    await expect(siteHeader).toHaveAttribute('inert', '');
    await expect(workContent).toHaveCSS('opacity', '0');
    await expect(normalTitle).toHaveCSS('z-index', '5');
    const siteFooter = page.locator('[data-site-footer]');
    await expect(siteFooter).toBeAttached();
    await expect(siteFooter).toHaveAttribute('inert', '');
    await expect(page.locator('[data-logo-mode]')).toHaveCount(0);
    await expect(page.locator('[data-letter-layer]')).toHaveCount(0);
    await expect(page.locator('[data-letter-target]')).toHaveCount(0);
    await expect(workContent.locator('[data-logo-intro]')).toBeAttached();
    await expect(workContent.locator('[data-project-grid]')).toBeAttached();

    const galleryMedia = workContent.locator('.project-card__media');
    const initialGalleryTop = await galleryMedia.evaluateAll((elements) =>
      Math.min(...elements.map((element) => element.getBoundingClientRect().top)));
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    expect(initialGalleryTop).toBeGreaterThan(0);
    expect(initialGalleryTop).toBeLessThan(viewportHeight);
    const initialTitleTop = await normalTitle.evaluate((element) => element.getBoundingClientRect().top);
    expect(initialTitleTop).toBeLessThan(viewportHeight);
    await expect(normalTitle).toHaveCSS('transform', 'none');

    const firstSingleAsset = page.locator('[data-single-layer]').first();
    await expect(firstSingleAsset).toHaveCSS('opacity', '1');
    await expect.poll(() => firstSingleAsset.locator('video').evaluate((video) => {
      const media = video as HTMLVideoElement;
      return !media.paused && media.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
    })).toBe(true);

    const activeAsset = page.locator('[data-single-layer][data-active="true"]');
    await expect(activeAsset).toHaveAttribute('data-asset-index', '0');

    const initialHeroTop = await hero.evaluate((element) => element.getBoundingClientRect().top);
    await scrollGesture(page, viewportHeight * .2, mobile);
    await expect(hero).toHaveAttribute('data-faded', 'true');
    await expect(hero).toHaveCSS('opacity', '0');
    await expect(workContent).toHaveCSS('opacity', '1');
    await expect(siteHeader).toHaveCSS('opacity', '1');
    await expect(siteHeader).not.toHaveAttribute('inert', '');
    await expect(siteFooter).not.toHaveAttribute('inert', '');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect.poll(() => normalTitle.evaluate((element) => element.getBoundingClientRect().top))
      .toBeCloseTo(initialTitleTop, 0);
    await expect.poll(() => hero.evaluate((element) => element.getBoundingClientRect().top))
      .toBe(initialHeroTop);

    await scrollGesture(page, viewportHeight * .2, mobile);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect.poll(() => normalTitle.evaluate((element) => element.getBoundingClientRect().top))
      .toBeLessThan(initialTitleTop);

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(hero).toHaveAttribute('data-faded', 'true');
    await expect(hero).toHaveCSS('opacity', '0');
    await expect(workContent).toHaveCSS('opacity', '1');
    await expect(siteHeader).toHaveCSS('opacity', '1');

    await scrollGesture(page, -viewportHeight * .2, mobile);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(hero).toHaveAttribute('data-faded', 'false');
    await expect(hero).toHaveCSS('opacity', '1');
    await expect(workContent).toHaveCSS('opacity', '0');
    await expect(siteHeader).toHaveCSS('opacity', '0');

    await scrollGesture(page, viewportHeight * .2, mobile);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(hero).toHaveAttribute('data-faded', 'true');
    await expect(hero).toHaveCSS('opacity', '0');
    await expect(workContent).toHaveCSS('opacity', '1');
    await expect(siteHeader).toHaveCSS('opacity', '1');
  });

  test('page click, Space, and Enter release the initial title handoff', async ({ page }) => {
    const assertInitialState = async () => {
      await expect(page.locator('[data-logo-work-hero]')).toHaveAttribute('data-faded', 'false');
      await expect(page.locator('[data-logo-work-page]')).toHaveAttribute('data-handoff', 'false');
    };
    const assertReleasedState = async () => {
      await expect(page.locator('[data-logo-work-hero]')).toHaveAttribute('data-faded', 'true');
      await expect(page.locator('[data-logo-work-page]')).toHaveAttribute('data-handoff', 'true');
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    };

    await page.goto('/');
    await expectLogoPageReady(page);
    await assertInitialState();
    const viewport = page.viewportSize();
    await page.mouse.click((viewport?.width ?? 1_440) / 2, (viewport?.height ?? 900) / 2);
    await assertReleasedState();

    await page.goto('/');
    await expectLogoPageReady(page);
    await assertInitialState();
    await page.keyboard.press('Space');
    await assertReleasedState();

    await page.goto('/');
    await expectLogoPageReady(page);
    await assertInitialState();
    await page.keyboard.press('Enter');
    await assertReleasedState();
  });
});
