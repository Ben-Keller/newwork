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

// Review round 1 made returning to the splash deliberate: the page has to
// have been resting at its own top past the dwell, and the gesture then has to
// carry more distance than the thresholds in index.astro. These values sit
// comfortably above both so the tests exercise intent, not the exact numbers.
const SPLASH_RETURN_DWELL = 500;
const SPLASH_RETURN_DISTANCE = 600;

const returnToSplash = async (page: Page, mobile: boolean) => {
  await page.waitForTimeout(SPLASH_RETURN_DWELL);
  await scrollGesture(page, -SPLASH_RETURN_DISTANCE, mobile);
};

test.describe('logo mask study', () => {
  test.describe.configure({ mode: 'serial' });

  test('paints the color field first while requesting the title video immediately', async ({page}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'The first-paint sequence is browser-independent and covered once.');
    await page.addInitScript(() => {
      Math.random = () => .125;
      type BootFrame = {
        background: string;
        opacity: string;
        phase?: string;
        videoRequested: boolean;
      };
      const routeWindow = window as Window & {__logoBootFrames?: BootFrame[]};
      routeWindow.__logoBootFrames = [];
      const sample = (): void => {
        const root = document.querySelector<HTMLElement>('[data-logo-mask-experience]');
        const stage = root?.querySelector<HTMLElement>('[data-logo-stage]');
        const hero = document.querySelector<HTMLElement>('[data-logo-work-hero]');
        if (root && stage && hero) {
          routeWindow.__logoBootFrames?.push({
            background: getComputedStyle(hero).backgroundColor,
            opacity: getComputedStyle(stage).opacity,
            phase: root.dataset.logoRevealPhase,
            videoRequested: Boolean(root.querySelector('source[data-src][src]')),
          });
          if (root.dataset.logoRevealReady === 'true') return;
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });

    await page.goto('/', {waitUntil: 'domcontentloaded'});
    const experience = page.locator('[data-logo-mask-experience]');
    await expect(experience).toHaveAttribute('data-logo-reveal-ready', 'true');
    const frames = await page.evaluate(() => (
      (window as Window & {
        __logoBootFrames?: Array<{
          background: string;
          opacity: string;
          phase?: string;
          videoRequested: boolean;
        }>;
      }).__logoBootFrames ?? []
    ));
    const backgroundFrames = frames.filter((frame) => frame.phase === 'background');
    const backgroundFrame = backgroundFrames[0];
    const contentFrameIndex = frames.findIndex((frame) => frame.phase === 'content');
    const backgroundFrameIndex = frames.findIndex((frame) => frame === backgroundFrame);

    expect(backgroundFrame).toBeDefined();
    expect(backgroundFrame?.background).toBe('rgb(71, 0, 71)');
    expect(backgroundFrame?.opacity).toBe('0');
    expect(backgroundFrames.some((frame) => frame.videoRequested)).toBe(true);
    const backgroundChannels = backgroundFrames.map((frame) =>
      (frame.background.match(/\d+/gu) ?? []).slice(0, 3).map(Number));
    const largestFrameJump = backgroundChannels.slice(1).reduce((largest, channels, index) => {
      const previous = backgroundChannels[index] ?? [];
      const jump = channels.reduce((sum, channel, channelIndex) =>
        sum + Math.abs(channel - (previous[channelIndex] ?? channel)), 0);
      return Math.max(largest, jump);
    }, 0);
    expect(largestFrameJump).toBeLessThanOrEqual(2);
    expect(contentFrameIndex).toBeGreaterThan(backgroundFrameIndex);
    await expect(experience.locator('source[data-src]').first()).toHaveAttribute('src', /.+/u);
  });

  test('chooses a new automatic color seed for each page load', async ({page}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'The load seed is browser-independent and covered once.');
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.addInitScript(() => {
      Math.random = () => window.sessionStorage.getItem('new-work-color-probe') === 'second'
        ? .625
        : .125;
    });

    await page.goto('/');
    await expectLogoPageReady(page);
    const hero = page.locator('[data-logo-work-hero]');
    const firstColor = await hero.evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(firstColor).toBe('rgb(71, 0, 71)');

    await page.evaluate(() => window.sessionStorage.setItem('new-work-color-probe', 'second'));
    await page.reload();
    await expectLogoPageReady(page);
    const secondColor = await hero.evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(secondColor).toBe('rgb(0, 71, 71)');
    expect(secondColor).not.toBe(firstColor);
  });

  test('is merged into Work with no standalone Logo navigation or route', async ({ page }) => {
    await page.goto('/');
    await expectLogoPageReady(page);

    await expect(page.locator('[data-site-header] a[href="/logo"]')).toHaveCount(0);
    await expect(page.locator('[data-logo-mask-experience]')).toBeAttached();
    const retiredRoute = await page.request.get('/logo');
    expect(retiredRoute.status()).toBe(404);
  });

  test('number keys no longer switch or reload the splash reveal', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Keyboard shortcuts are covered once on desktop.');

    await page.goto('/');
    await expectLogoPageReady(page);

    const experience = page.locator('[data-logo-mask-experience]');
    const stage = page.locator('[data-logo-stage]');
    const previousLoad = await page.evaluate(() => performance.timeOrigin);
    for (const key of ['1', '2', '3', '4', '5']) {
      await page.keyboard.press(key);
    }
    await expect(experience).toHaveAttribute('data-logo-reveal-phase', 'done');
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(previousLoad);
    await expect(experience).toHaveAttribute('data-logo-reveal', '2');
    await expect(stage).toHaveCSS('animation-name', 'logo-reveal-diagonal');
  });

  test('keeps animation 2 on load, reload, and return to the splash', async ({ page }, testInfo) => {
    const mobile = testInfo.project.name.startsWith('mobile-');
    await page.addInitScript(() => {
      window.sessionStorage.setItem('new-work-logo-reveal', '5');
      Math.random = () => .01;
    });
    await page.goto('/');
    await expectLogoPageReady(page);

    const experience = page.locator('[data-logo-mask-experience]');
    const hero = page.locator('[data-logo-work-hero]');
    const stage = page.locator('[data-logo-stage]');
    await expect(experience).toHaveAttribute('data-logo-reveal', '2');
    await expect(stage).toHaveCSS('animation-name', 'logo-reveal-diagonal');

    await page.reload();
    await expectLogoPageReady(page);
    await expect(experience).toHaveAttribute('data-logo-reveal', '2');
    await expect(stage).toHaveCSS('animation-name', 'logo-reveal-diagonal');

    const viewportHeight = await page.evaluate(() => window.innerHeight);
    await scrollGesture(page, viewportHeight * .2, mobile);
    await expect(hero).toHaveAttribute('data-faded', 'true');
    await expect(experience).toHaveAttribute('data-title-motion', 'settled');
    await scrollGesture(page, viewportHeight * .2, mobile);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.evaluate(() => { Math.random = () => .99; });
    await returnToSplash(page, mobile);

    await expect(hero).toHaveAttribute('data-faded', 'false');
    await expect(experience).toHaveAttribute('data-logo-reveal', '2');
    await expect(experience).toHaveAttribute('data-logo-reveal-ready', 'true');
    await expect(stage).toHaveCSS('animation-name', 'logo-reveal-diagonal');
  });

  test('restarts the persisted title video after leaving Work and returning', async ({page}, testInfo) => {
    test.setTimeout(60_000);
    test.skip(testInfo.project.name !== 'desktop-chromium', 'Persisted route playback is covered once on desktop.');
    await page.goto('/');
    await expectLogoPageReady(page);

    const titleVideo = page.locator(
      '[data-logo-mask-experience] [data-single-layer][data-active="true"] [data-logo-video]',
    );
    await expect(titleVideo).toBeAttached();
    await expect.poll(() => titleVideo.evaluate((element) => (
      (element as HTMLVideoElement).readyState
    ))).toBeGreaterThanOrEqual(1);
    await expect.poll(() => titleVideo.evaluate((element) => (
      (element as HTMLVideoElement).paused
    ))).toBe(false);
    await titleVideo.evaluate((element) => {
      const video = element as HTMLVideoElement;
      video.dataset.restartProbe = 'ready';
      video.currentTime = Math.min(1, Math.max(0, video.duration / 2));
    });

    await page.mouse.wheel(0, 700);
    const projectLink = page.locator('[data-project-link]').first();
    await projectLink.scrollIntoViewIfNeeded();
    await projectLink.click({noWaitAfter: true});
    await page.waitForURL(/\/work\//u);
    const retainedVideo = page.locator('[data-logo-video][data-restart-probe="ready"]');
    await expect(retainedVideo).toBeAttached();
    await expect.poll(() => retainedVideo.evaluate((element) => (
      (element as HTMLVideoElement).paused
    ))).toBe(true);

    await page.locator('[data-desktop-nav]').getByRole('link', {name: 'Work'}).click();
    await page.waitForURL(/\/$/u);
    const returnedVideo = page.locator('[data-logo-video][data-restart-probe="ready"]');
    await expect(returnedVideo).toBeAttached();
    await expect.poll(() => returnedVideo.evaluate((element) => (
      (element as HTMLVideoElement).paused
    ))).toBe(false);
    expect(await returnedVideo.evaluate((element) => (
      (element as HTMLVideoElement).currentTime
    ))).toBeLessThan(1);
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

  test('keeps both wordmark rows together through narrow resizes in splash and gallery modes', async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 320, height: 812 });
    await page.goto('/');
    await expectLogoPageReady(page);
    await page.evaluate(() => document.fonts.ready);

    const title = page.locator('[data-type-title]');
    for (const state of ['splash', 'home']) {
      if (state === 'home') {
        await scrollGesture(page, 240, testInfo.project.name.startsWith('mobile-'));
        await expect(page.locator('[data-logo-intro]')).toHaveAttribute('data-title-state', 'home');
      }
      for (const width of [320, 375, 600, 767, 768, 1024]) {
        await page.setViewportSize({ width, height: 812 });
        await expect.poll(() => title.evaluate((element) => {
          const rows = [...element.querySelectorAll<HTMLElement>('[data-type-title-line]')];
          const lineHeight = Number.parseFloat(getComputedStyle(rows[0]!).lineHeight);
          // Each word must occupy exactly one line, including the touch-only
          // whole-word outline and its inline canvas baseline marker.
          return Math.max(
            ...rows.map((row) => Math.abs(Number.parseFloat(getComputedStyle(row).height) - lineHeight)),
            Math.abs(Number.parseFloat(getComputedStyle(element).height) - lineHeight * 2),
          );
        }), { message: `Compact wordmark at ${width}px in ${state}` }).toBeLessThan(.1);

        await expect.poll(() => title.evaluate((element) => {
          const box = element.getBoundingClientRect();
          return Math.max(-box.left, box.right - innerWidth, document.documentElement.scrollWidth - innerWidth);
        }), { message: `Wordmark fits at ${width}px in ${state}` }).toBeLessThanOrEqual(1);

        if (state === 'splash') {
          await expect.poll(() => title.evaluate((element) => {
            const box = element.getBoundingClientRect();
            return Math.max(
              Math.abs(box.left + box.width / 2 - innerWidth / 2),
              Math.abs(box.top + box.height / 2 - innerHeight / 2),
            );
          }), { message: `Splash stays centered after resizing to ${width}px` }).toBeLessThan(1);
        }
      }
    }
  });

  test('centers the title stage instead of pinning overflow to the top in short viewports', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 500 });
    await page.goto('/');
    await expectLogoPageReady(page);
    await expect(page.locator('[data-logo-intro]')).toHaveAttribute('data-logo-reveal-phase', 'done');

    const stage = page.locator('[data-logo-stage]');
    await stage.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
    const placement = await stage.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const frame = document.querySelector('.logo-work-page__splash-frame')!.getBoundingClientRect();
      return {
        centerY: rect.top + rect.height / 2,
        viewportCenterY: window.innerHeight / 2,
        left: rect.left,
        right: window.innerWidth - rect.right,
        width: rect.width,
        height: rect.height,
        frameWidth: frame.width,
        frameHeight: frame.height,
      };
    });

    expect(Math.abs(placement.centerY - placement.viewportCenterY)).toBeLessThan(1);
    // Leave 30% breathing room on both axes, even when height is the limit.
    expect(Math.abs(placement.left - placement.right)).toBeLessThan(1);
    const widthRatio = placement.width / placement.frameWidth;
    const heightRatio = placement.height / placement.frameHeight;
    expect(widthRatio).toBeLessThanOrEqual(.705);
    expect(heightRatio).toBeLessThanOrEqual(.705);
    expect(Math.max(widthRatio, heightRatio)).toBeCloseTo(.7, 2);
  });

  test('balances the visible title without clipping through its top edge', async ({ page }) => {
    await page.setViewportSize({ width: 1_642, height: 902 });
    await page.goto('/');
    await expectLogoPageReady(page);
    await expect(page.locator('[data-logo-intro]')).toHaveAttribute('data-logo-reveal-phase', 'done');

    const stage = page.locator('[data-logo-stage]');
    await stage.evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
    const placement = await stage.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        top: rect.top,
        centerY: rect.top + rect.height / 2,
        viewportCenterY: window.innerHeight / 2,
      };
    });

    expect(Math.abs(placement.centerY - placement.viewportCenterY)).toBeLessThan(1);
    // The title is one element scaled onto the splash box, so nothing may crop
    // it: it has to sit inside the viewport rather than run off the top.
    expect(placement.top).toBeGreaterThanOrEqual(-1);
  });

  test('tightens the splash frame in wide, short viewports', async ({ page }) => {
    await page.setViewportSize({ width: 1_470, height: 777 });
    await page.goto('/');
    await expectLogoPageReady(page);

    // The splash box is where the title is placed, so the vertical tightening
    // belongs to that frame rather than to a correction on the artwork.
    const frame = page.locator('.logo-work-page__splash-frame');
    const inset = await frame.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, left: rect.left };
    });

    expect(inset.top).toBeLessThan(inset.left);
    expect(inset.top).toBeLessThanOrEqual(1);
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
    await expect(page.locator('[data-logo-work-body]')).toHaveCSS('opacity', '0');
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

    // The splash media is no longer a painted layer behind a mask: it is the
    // source the title's own letters are filled from, so what has to be true is
    // that the fill has a frame and the source is running.
    const firstSingleAsset = page.locator('[data-single-layer]').first();
    await expect(page.locator('[data-splash-canvas]'))
      .toHaveAttribute('data-media-ready', 'true');
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
    await expect(page.locator('[data-logo-work-body]')).toHaveCSS('opacity', '1');
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
    await expect(page.locator('[data-logo-work-body]')).toHaveCSS('opacity', '1');
    await expect(siteHeader).toHaveCSS('opacity', '1');

    await returnToSplash(page, mobile);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(hero).toHaveAttribute('data-faded', 'false');
    await expect(hero).toHaveCSS('opacity', '1');
    await expect(page.locator('[data-logo-work-body]')).toHaveCSS('opacity', '0');
    await expect(siteHeader).toHaveCSS('opacity', '0');

    await scrollGesture(page, viewportHeight * .2, mobile);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(hero).toHaveAttribute('data-faded', 'true');
    await expect(hero).toHaveCSS('opacity', '0');
    await expect(page.locator('[data-logo-work-body]')).toHaveCSS('opacity', '1');
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
