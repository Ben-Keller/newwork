import { expect, test } from '@playwright/test';

test('the board fades into place once per splash exit without replaying on ordinary scroll', async ({ page, isMobile }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.locator('[data-logo-work-page]')).toHaveAttribute('data-logo-page-ready', 'true');
  await page.evaluate(() => {
    const board = document.querySelector<HTMLElement>('[data-home-departures]')!;
    const ticker = board.querySelector<HTMLElement>('[data-flap-ticker]')!;
    const samples: {opacity: number; transform: string; clip: string}[] = [];
    Object.assign(window, { boardEntranceSamples: samples });
    const until = performance.now() + 2200;
    const capture = () => {
      if (!board.hidden && getComputedStyle(board).display !== 'none') {
        const style = getComputedStyle(ticker);
        samples.push({opacity: Number(style.opacity), transform: style.transform, clip: style.clipPath});
      }
    };
    // Capture the actual reveal before the first painted frame. WebKit may
    // deliver its first RAF several animation ticks after a visibility change.
    const observer = new MutationObserver(capture);
    observer.observe(board, {attributes: true, attributeFilter: ['hidden']});
    const sample = () => {
      capture();
      if (performance.now() < until) requestAnimationFrame(sample);
      else observer.disconnect();
    };
    requestAnimationFrame(sample);
  });
  if (isMobile) {
    await page.evaluate(() => {
      for (const [type, y] of [['touchstart', 650], ['touchmove', 350], ['touchend', 350]] as const) {
        const event = new Event(type, {cancelable: true});
        Object.defineProperty(event, 'touches', {value: type === 'touchend' ? [] : [{clientY: y}]});
        window.dispatchEvent(event);
      }
    });
  } else await page.mouse.wheel(0, 300);
  const board = page.locator('[data-home-departures]');
  const ticker = board.locator('[data-flap-ticker]');
  await expect(page.locator('[data-logo-work-page]')).toHaveAttribute('data-handoff', 'true');
  await expect(page.locator('[data-logo-intro]')).toHaveAttribute('data-title-motion', 'settled');
  await expect(board).toBeVisible();
  await expect(ticker).toHaveCSS('opacity', '1');
  const samples = await page.evaluate(() => Reflect.get(window, 'boardEntranceSamples') as {opacity: number; transform: string; clip: string}[]);
  expect(samples.length).toBeGreaterThan(5);
  expect(samples[0]!.opacity).toBeLessThan(.2);
  expect(samples.some(sample => sample.opacity > .1 && sample.opacity < .9)).toBe(true);
  expect(samples.every(sample => sample.transform === 'none')).toBe(true);
  expect(samples.some(sample => sample.clip.startsWith('inset'))).toBe(true);
  await page.locator('[data-bts]').scrollIntoViewIfNeeded();
  await expect(board).toBeHidden();
  await page.evaluate(() => scrollTo(0, 0));
  await expect(board).toBeVisible();
  await expect(ticker).toHaveCSS('opacity', '1');
  expect(await ticker.evaluate(element => element.getAnimations().length)).toBe(0);
});

test('reduced motion shows the board immediately with no entrance animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('[data-logo-work-page]')).toHaveAttribute('data-logo-page-ready', 'true');
  await page.keyboard.press('Enter');
  const ticker = page.locator('[data-home-departures] [data-flap-ticker]');
  await expect(ticker).toBeVisible();
  await expect(ticker).toHaveCSS('opacity', '1');
  expect(await ticker.evaluate(element => element.getAnimations().length)).toBe(0);
});

test('train boards stay hidden while first-load scripts are delayed', async ({ page }) => {
  let releaseScripts = () => {};
  const scriptsReady = new Promise<void>(resolve => { releaseScripts = resolve; });
  await page.route('**/*', async route => {
    if (route.request().resourceType() === 'script') await scriptsReady;
    await route.continue();
  });
  try {
    await page.goto('/', { waitUntil: 'commit' });
    const board = page.locator('[data-home-departures]');
    await expect(board).toBeAttached();
    await expect(board).toBeHidden();
    await expect(page.locator('[data-site-footer] [data-flap-ticker]')).toBeHidden();
    await page.waitForTimeout(500);
    await expect(board).toBeHidden();
  } finally {
    releaseScripts();
  }
  await expect(page.locator('[data-logo-work-page]')).toHaveAttribute('data-logo-page-ready', 'true');
  await expect(page.locator('[data-home-departures]')).toBeHidden();
});

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`train boards never paint over splash across reload and return (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.addInitScript(() => {
      const samples = { frames: 0, flashes: [] as string[] };
      Object.assign(window, { tickerSplashSamples: samples });
      const sample = () => {
        const home = document.querySelector('[data-logo-work-page]');
        const title = home?.querySelector<HTMLElement>('[data-logo-intro]');
        if (home && (home.getAttribute('data-handoff') !== 'true'
          || title?.dataset.titleState !== 'home' || title?.dataset.titleMotion !== 'settled')) {
          samples.frames++;
          document.querySelectorAll<HTMLElement>('[data-flap-ticker]').forEach(board => {
            if (board.getClientRects().length && getComputedStyle(board).visibility === 'visible') {
              samples.flashes.push(JSON.stringify({
                handoff: home.getAttribute('data-handoff'), motion: title?.dataset.titleMotion,
                board: board.closest('[data-home-departures]') ? 'home' : 'footer',
                body: document.body.className, ready: document.readyState,
                pageReady: home.getAttribute('data-logo-page-ready'), time: performance.now(),
              }));
            }
          });
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    const home = page.locator('[data-logo-work-page]');
    const board = page.locator('[data-home-departures]');
    const footer = page.locator('[data-site-footer] [data-flap-ticker]');
    const title = page.locator('[data-logo-intro]');
    for (let load = 0; load < 2; load++) {
      if (load === 0) await page.goto('/');
      else await page.reload();
      await expect(home).toHaveAttribute('data-logo-page-ready', 'true');
      await expect(home).toHaveAttribute('data-handoff', 'false');
      await expect(board).toBeHidden();
      await expect(footer).toBeHidden();
      await page.keyboard.press('Enter');
      await expect(home).toHaveAttribute('data-handoff', 'true');
      await expect(title).toHaveAttribute('data-title-motion', 'settled');
      await expect(board).toBeVisible();
      await expect(footer).toBeVisible();
      await page.keyboard.press('Home');
      await page.waitForTimeout(500);
      await page.keyboard.press('Home');
      await expect(home).toHaveAttribute('data-handoff', 'false');
      await expect(board).toBeHidden();
      await expect(footer).toBeHidden();
      await expect(title).toHaveAttribute('data-title-motion', 'settled');
      const samples = await page.evaluate(() => Reflect.get(window, 'tickerSplashSamples') as { frames: number; flashes: string[] });
      expect(samples.frames).toBeGreaterThan(0);
      expect(samples.flashes).toEqual([]);
    }
  });
}
