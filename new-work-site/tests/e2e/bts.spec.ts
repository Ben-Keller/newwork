import { expect, test, type Page } from '@playwright/test';

const openCarousel = async (page: Page) => {
  await page.addInitScript(() => sessionStorage.setItem('new-work-restore-requested', 'true'));
  await page.goto('/');
  const stage = page.locator('[data-carousel-stage]');
  await stage.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await expect(stage.locator('[data-carousel-card]').first()).toHaveAttribute('style', /transform/u);
  return stage;
};

const delayScriptFrames = async (page: Page) => {
  await page.addInitScript(() => {
    const requestFrame = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      const deliver: FrameRequestCallback = (now) => {
        // Input and native animation continue while script frames are delayed.
        if (document.documentElement.hasAttribute('data-test-delay-frames')) requestFrame(deliver);
        else callback(now);
      };
      return requestFrame(deliver);
    };
  });
};

test('BTS has no navigation arrows and resumes three seconds after photo or keyboard selection', async ({ page }) => {
  const stage = await openCarousel(page);
  const root = page.locator('[data-bts]');
  const photo = stage.locator('[data-carousel-card]').first();
  await expect(root.locator('.bts__controls, [data-carousel-prev], [data-carousel-next]')).toHaveCount(0);
  await expect(root.locator('a, dialog, [data-carousel-toggle], .bts__caption, [data-carousel-count]')).toHaveCount(0);
  await expect(root.getByRole('heading', { name: 'Behind the scenes', exact: true })).toBeVisible();
  await expect(root).toHaveText(/^\s*Behind\s+the\s+scenes\s*$/u);

  const x = () => photo.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m41);
  const initial = await x();
  await expect.poll(x).not.toBe(initial);
  const assertTimedResume = async (direction: number) => {
    // The selected photo first eases into position; the automatic orbit must
    // then stay still until three seconds after the most recent selection.
    // Sample inside the browser so slow protocol round trips cannot push the
    // pause assertion past the deliberately scheduled three-second restart.
    const result = await photo.evaluate(async (element) => {
      const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      const x = () => new DOMMatrixReadOnly(getComputedStyle(element).transform).m41;
      await wait(2_100);
      const paused = x();
      await wait(400);
      const held = x();
      const deadline = performance.now() + 1_200;
      while (Math.abs(x() - held) <= .2 && performance.now() < deadline) await wait(50);
      return { pausedTravel: Math.abs(held - paused), resumedTravel: x() - held };
    });
    expect(result.pausedTravel).toBeLessThan(.05);
    expect(result.resumedTravel * direction).toBeGreaterThan(.2);
  };

  const front = stage.locator('[data-carousel-card][data-front="true"]');
  const bounds = await front.boundingBox();
  if (!bounds) throw new Error('The front photograph is missing.');
  // A real pointer click also verifies a photo selects in place without a dialog.
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await assertTimedResume(-1);

  await front.locator('button').press('ArrowRight');
  await page.waitForTimeout(1_500);
  await front.locator('button').press('ArrowLeft');
  await assertTimedResume(1);
});

test('BTS respects reduced motion while keyboard selection still works', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const stage = await openCarousel(page);
  const photo = stage.locator('[data-carousel-card]').first();
  const before = await photo.getAttribute('style');
  await stage.locator('[data-carousel-card][data-front="true"] button').press('ArrowRight');
  await expect(photo).not.toHaveAttribute('style', before!);
  const selected = await photo.getAttribute('style');
  await page.waitForTimeout(3_200);
  await expect(photo).toHaveAttribute('style', selected!);
});

test('BTS keeps rotating and renders parallax during continuous scrolling, including busy frames', async ({ page }) => {
  const stage = await openCarousel(page);
  await page.waitForTimeout(500);
  const result = await stage.evaluate(async (element) => {
    const card = element.querySelector('[data-carousel-card][data-front="true"]')!;
    const matrix = () => {
      const bounds = card.getBoundingClientRect();
      return {
        m41: new DOMMatrixReadOnly(getComputedStyle(card).transform).m41,
        m42: bounds.top + bounds.height / 2 - element.getBoundingClientRect().top,
      };
    };
    const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));
    const origin = scrollY;
    const idleStart = await nextFrame();
    const idleX = matrix().m41;
    let now = idleStart;
    while (now - idleStart < 1_000) now = await nextFrame();
    const idleRate = Math.abs(matrix().m41 - idleX) / (now - idleStart);

    const scrollStart = now;
    const scrollX = matrix().m41;
    const scrollYStart = matrix().m42;
    // A busy main thread must drop frames, not discard elapsed orbit time or
    // defer depth movement until the scroll gesture has finished.
    while (now - scrollStart < 1_600) {
      scrollTo(0, origin + Math.min(240, (now - scrollStart) * .15));
      const busyUntil = performance.now() + 80;
      while (performance.now() < busyUntil) { /* simulate a busy scroll frame */ }
      now = await nextFrame();
    }
    const final = matrix();
    const scrollRate = Math.abs(final.m41 - scrollX) / (now - scrollStart);
    await new Promise((resolve) => setTimeout(resolve, 350));
    return {
      rateRatio: scrollRate / idleRate,
      liveDepthTravel: scrollYStart - final.m42,
      delayedDepthTravel: Math.abs(matrix().m42 - final.m42),
    };
  });
  expect(result.rateRatio).toBeGreaterThan(.7);
  expect(result.liveDepthTravel).toBeGreaterThan(25);
  expect(result.delayedDepthTravel).toBeLessThan(4);
});

test('BTS keeps orbiting through a vertical touch gesture without selecting a photo', async ({ page, isMobile, browserName }) => {
  test.skip(!isMobile || browserName !== 'chromium', 'Native touch movement uses Chromium input dispatch.');
  const stage = await openCarousel(page);
  const photo = stage.locator('[data-carousel-card]').first();
  const x = () => photo.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m41);
  const bounds = await photo.boundingBox();
  if (!bounds) throw new Error('The front photograph is missing.');
  const start = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const scrollStart = await page.evaluate(() => scrollY);
  const lift = () => photo.evaluate((element) => Number.parseFloat(getComputedStyle(element).translate.split(' ').at(-1) ?? '0'));
  const initialLift = await lift();
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
  const pressedX = await x();
  // An undecided touch is not yet a horizontal carousel drag.
  await page.waitForTimeout(400);
  expect(await x()).toBeLessThan(pressedX - 3);
  for (let step = 1; step <= 10; step += 1) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: [{ x: start.x + 2, y: start.y - step * 18 }],
    });
    await page.waitForTimeout(35);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(scrollStart + 100);
  expect(await lift()).toBeLessThan(initialLift - 10);
  await expect(stage).not.toHaveAttribute('data-dragging');
  const releasedX = await x();
  await expect.poll(x, { timeout: 800 }).toBeLessThan(releasedX - 3);
});

test('BTS automatic rotation continues through native scrolling when script frames are delayed', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Native wheel scrolling is a desktop input.');
  await delayScriptFrames(page);
  const stage = await openCarousel(page);
  await page.waitForTimeout(1_000);
  const photo = stage.locator('[data-carousel-card]').first();
  await page.mouse.move(720, 400);
  await page.mouse.wheel(0, 12);
  const before = await photo.evaluate((element) => ({
    x: new DOMMatrixReadOnly(getComputedStyle(element).transform).m41,
    lift: Number.parseFloat(getComputedStyle(element).translate.split(' ').at(-1) ?? '0'),
    scroll: scrollY,
  }));
  await page.evaluate(() => document.documentElement.setAttribute('data-test-delay-frames', ''));
  try {
    for (let step = 0; step < 12; step += 1) {
      // A vertical trackpad gesture can include sideways drift as its
      // vertical speed drops. That must not grab the carousel mid-scroll.
      const drift = step % 3 === 0;
      await page.mouse.wheel(drift ? 4 : 0, drift ? 1 : 18);
      await page.waitForTimeout(40);
    }
    const during = await photo.evaluate((element) => ({
      x: new DOMMatrixReadOnly(getComputedStyle(element).transform).m41,
      lift: Number.parseFloat(getComputedStyle(element).translate.split(' ').at(-1) ?? '0'),
      scroll: scrollY,
    }));
    expect(during.scroll).toBeGreaterThan(before.scroll + 100);
    expect(during.x).toBeLessThan(before.x - 15);
    expect(during.lift).toBeLessThan(before.lift - 10);
  } finally {
    await page.evaluate(() => document.documentElement.removeAttribute('data-test-delay-frames'));
  }
  // A new, deliberate horizontal gesture must still turn the photographs.
  await page.waitForTimeout(300);
  // Track the current foreground photo: after a slow test run, the original
  // photo can be around the back, where its screen-space direction reverses.
  const horizontalPhoto = stage.locator('[data-carousel-card]').nth(await stage.evaluate((element) =>
    [...element.querySelectorAll('[data-carousel-card]')].findIndex((card) => card.getAttribute('data-front') === 'true')));
  const beforeHorizontal = await horizontalPhoto.evaluate((element) => ({
    x: new DOMMatrixReadOnly(getComputedStyle(element).transform).m41,
    scroll: scrollY,
  }));
  await page.mouse.wheel(-120, 0);
  await expect.poll(() => horizontalPhoto.evaluate((element) =>
    new DOMMatrixReadOnly(getComputedStyle(element).transform).m41)).toBeGreaterThan(beforeHorizontal.x + 20);
  const afterHorizontal = await horizontalPhoto.evaluate((element) => ({
    x: new DOMMatrixReadOnly(getComputedStyle(element).transform).m41,
    scroll: scrollY,
  }));
  expect(afterHorizontal.x).toBeGreaterThan(beforeHorizontal.x + 20);
  expect(Math.abs(afterHorizontal.scroll - beforeHorizontal.scroll)).toBeLessThan(2);
});

for (const fallback of [false, true]) {
  test(`BTS depth follows every scroll reversal without waiting for script frames${fallback ? ' (fallback)' : ''}`, async ({ page }) => {
    await delayScriptFrames(page);
    if (fallback) {
      await page.addInitScript(() => {
        const supports = CSS.supports.bind(CSS);
        CSS.supports = (property: string, value?: string) => property === 'animation-timeline'
          ? false : value === undefined ? supports(property) : supports(property, value);
      });
    }
    const stage = await openCarousel(page);
    await expect(page.locator('[data-bts]').getByRole('heading', { name: 'Behind the scenes' })).toBeVisible();
    await page.waitForTimeout(500);
    await page.evaluate(() => document.documentElement.setAttribute('data-test-delay-frames', ''));
    const read = () => stage.evaluate((element) => {
      const cards = [...element.querySelectorAll<HTMLElement>('[data-carousel-card]')];
      const sorted = cards.sort((a, b) => Number(b.style.zIndex) - Number(a.style.zIndex));
      const title = element.closest('[data-bts]')!.querySelector<HTMLElement>('.bts__header')!;
      const titleBox = title.getBoundingClientRect();
      const photoTops = cards.map((card) => card.querySelector('button')!.getBoundingClientRect().top);
      const lift = (card: Element) => Number.parseFloat(getComputedStyle(card).translate.split(' ').at(-1) ?? '0');
      return {
        scroll: scrollY,
        front: lift(sorted[0]!),
        back: lift(sorted.at(-1)!),
        titleDocumentTop: titleBox.top + scrollY,
        titleClearance: Math.min(...photoTops) - titleBox.bottom,
      };
    });
    try {
      const start = await read();
      expect(start.titleClearance).toBeGreaterThan(4);
      expect(start.titleClearance).toBeLessThan(64);
      // Scroll position drives height, even when the rotation's JS paint is
      // unavailable. Returning to a position must give exactly the same lift.
      let previous = start;
      for (const distance of [60, 120, 60, 0, -60, 0]) {
        await page.evaluate((y) => scrollTo(0, y), start.scroll + distance);
        await expect.poll(async () => (await read()).scroll).toBeCloseTo(start.scroll + distance, 0);
        const direction = Math.sign(start.scroll + distance - previous.scroll);
        // Wait for the browser's paint, not a fixed headless-rendering delay.
        // Application RAF callbacks remain suspended throughout this check.
        await expect.poll(async () => (previous.front - (await read()).front) * direction).toBeGreaterThan(5);
        const current = await read();
        expect((previous.front - current.front) * direction).toBeGreaterThan(5);
        expect(Math.abs(current.back - previous.back)).toBeLessThan(Math.abs(current.front - previous.front) * .2);
        // The heading sits above the entire carousel in normal page flow.
        expect(current.titleDocumentTop).toBeCloseTo(start.titleDocumentTop, 0);
        expect(current.titleClearance).toBeGreaterThan(4);
        previous = current;
      }
      expect(Math.abs(previous.front - start.front)).toBeLessThan(1);
    } finally {
      await page.evaluate(() => document.documentElement.removeAttribute('data-test-delay-frames'));
    }
  });
}

test('BTS preserves a trackpad flick through lift-off drift and continues auto-rotation in either direction', async ({ page }) => {
  const stage = await openCarousel(page);
  // Starting a real drag also supersedes an earlier photo-selection pause.
  await stage.locator('[data-carousel-card][data-front="true"] button').dispatchEvent('keydown', { key: 'Enter' });
  for (const [pass, direction] of [-1, 1, -1].entries()) {
    const photo = stage.locator('[data-carousel-card][data-front="true"]');
    const index = await photo.evaluate((element) =>
      [...element.parentElement!.querySelectorAll('[data-carousel-card]')].indexOf(element));
    const tracked = stage.locator('[data-carousel-card]').nth(index);
    const bounds = await photo.boundingBox();
    if (!bounds) throw new Error('The front photograph is missing.');
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    await stage.evaluate((element) => element.addEventListener('pointerdown', (event) => {
      (element as HTMLElement).dataset.testPointerId = String((event as PointerEvent).pointerId);
    }, { once: true }));
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.waitForTimeout(150);
    const releasedX = await stage.evaluate(async (element, input) => {
      // Preserve a known physical flick speed even when headless rendering
      // delays pointer-event delivery. The real press makes capture available.
      const endAt = performance.now();
      const send = (type: string, distance: number, at: number) => {
        const event = new PointerEvent(type, {
          bubbles: true,
          pointerId: Number((element as HTMLElement).dataset.testPointerId),
          pointerType: 'mouse',
          isPrimary: true,
          button: 0,
          buttons: type === 'pointermove' ? 1 : 0,
          clientX: input.x + input.direction * distance,
          clientY: input.y,
        });
        Object.defineProperty(event, 'timeStamp', { value: at });
        element.dispatchEvent(event);
      };
      for (let step = 1; step <= 6; step += 1) send('pointermove', step * 15, endAt - (6 - step) * 16);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const card = element.querySelectorAll('[data-carousel-card]')[input.index]!;
      const releaseX = new DOMMatrixReadOnly(getComputedStyle(card).transform).m41;
      // A trackpad can stop reporting movement before the physical release,
      // then deliver tiny drift. Neither should erase the last real throw.
      send('pointermove', 90, endAt + 20);
      send('pointermove', 91.5, endAt + 100);
      // Some input paths drop capture just before delivering pointerup.
      if (input.pass === 2) send('lostpointercapture', 91.5, endAt + 130);
      send('pointerup', 91.5, endAt + 130);
      return releaseX;
    }, { x, y, direction, index, pass });
    await page.mouse.up();
    await expect(stage).not.toHaveAttribute('data-dragging');
    await expect.poll(async () => {
      const coastX = await tracked.evaluate((element) =>
        new DOMMatrixReadOnly(getComputedStyle(element).transform).m41);
      return (coastX - releasedX) * direction;
    }, { timeout: 1_000 }).toBeGreaterThan(20);
    if (pass === 0) {
      // Reverse a throw while it is still coasting, before automatic motion
      // takes over. The re-grab must establish a new release direction.
      await page.waitForTimeout(350);
      continue;
    }
    await expect.poll(() => tracked.evaluate((element) => element.getAnimations()
      .find((animation) => animation.timeline === document.timeline)?.effect?.getTiming().direction),
    { timeout: 6_000 }).toBe(direction === 1 ? 'reverse' : 'normal');
    // Check the visible motion after inertia has handed off to the native
    // automatic orbit. It must never turn back against the user's throw.
    const autoTravel = await stage.evaluate(async (element) => {
      const card = element.querySelector('[data-carousel-card][data-front="true"]')!;
      const x = () => new DOMMatrixReadOnly(getComputedStyle(card).transform).m41;
      const before = x();
      await new Promise((resolve) => setTimeout(resolve, 450));
      return x() - before;
    });
    expect(autoTravel * direction).toBeGreaterThan(5);
  }
});

test('BTS follows horizontal trackpad direction through the momentum tail and back into automatic rotation', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Native wheel scrolling is a desktop input.');
  const stage = await openCarousel(page);
  await page.mouse.move(720, 400);
  const initialScroll = await page.evaluate(() => scrollY);
  for (const direction of [-1, 1]) {
    // The OS supplies a decaying wheel tail, sometimes ending with a tiny
    // opposite delta. That noise must not reverse the automatic motion.
    for (const delta of [48, 32, 20, 8, 2, 1, .25, -.25]) {
      await page.mouse.wheel(delta * direction, 0);
      await page.waitForTimeout(35);
    }
    await expect.poll(() => stage.locator('[data-carousel-card]').first().evaluate((element) => element.getAnimations()
      .find((animation) => animation.timeline === document.timeline)?.effect?.getTiming().direction),
    { timeout: 6_000 }).toBe(direction === 1 ? 'normal' : 'reverse');
    const travel = await stage.evaluate(async (element) => {
      const card = element.querySelector('[data-carousel-card][data-front="true"]')!;
      const x = () => new DOMMatrixReadOnly(getComputedStyle(card).transform).m41;
      const before = x();
      await new Promise((resolve) => setTimeout(resolve, 450));
      return x() - before;
    });
    expect(travel * -direction).toBeGreaterThan(5);
  }
  expect(Math.abs(await page.evaluate(() => scrollY) - initialScroll)).toBeLessThan(2);
});

test('BTS releases a held drag without a fling and resumes its gentle orbit', async ({ page }) => {
  const stage = await openCarousel(page);
  const front = stage.locator('[data-carousel-card][data-front="true"]');
  const index = await front.evaluate((element) =>
    [...element.parentElement!.querySelectorAll('[data-carousel-card]')].indexOf(element));
  const photo = stage.locator('[data-carousel-card]').nth(index);
  const bounds = await front.boundingBox();
  if (!bounds) throw new Error('The front photograph is missing.');
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 70, y, { steps: 5 });
  await page.waitForTimeout(400);
  const before = await photo.evaluate((element) => ({
    x: new DOMMatrixReadOnly(getComputedStyle(element).transform).m41,
    at: performance.now(),
    width: (element as HTMLElement).offsetWidth,
  }));
  await page.mouse.up();
  await page.waitForTimeout(250);
  const after = await photo.evaluate((element) => ({
    x: new DOMMatrixReadOnly(getComputedStyle(element).transform).m41,
    at: performance.now(),
  }));
  // Bound the motion to the gentle automatic pace using browser elapsed time;
  // protocol/render delays can make a nominal 250 ms wait take much longer.
  const gentleTravel = (after.at - before.at) / 1000 * before.width * .25 + 2;
  expect(Math.abs(after.x - before.x)).toBeLessThan(gentleTravel);
  await expect.poll(() => photo.evaluate((element) =>
    new DOMMatrixReadOnly(getComputedStyle(element).transform).m41)).toBeLessThan(after.x - 2);
});
