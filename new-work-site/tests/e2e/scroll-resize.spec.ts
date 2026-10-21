import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.locator('[data-logo-work-page]')).toHaveAttribute('data-logo-page-ready', 'true');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-logo-intro]')).toHaveAttribute('data-title-motion', 'settled');
  await expect(page.locator('[data-work-gallery]')).toHaveAttribute('data-column-motion', 'first-order');
});

test('resize notifications do not snap the gallery momentum to rest', async ({ page }) => {
  const samples = await page.evaluate(async () => {
    const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const card = document.querySelector<HTMLElement>('[data-motion-column][data-tablet-column="2"]')!;
    const offset = () => new DOMMatrixReadOnly(getComputedStyle(card).transform).m42;
    const gallery = document.querySelector('[data-work-gallery]')!;
    scrollTo(0, gallery.getBoundingClientRect().top + scrollY + 200);
    await nextFrame(); await nextFrame();
    const before = offset();
    // Mobile browsers emit resize as their toolbar settles after a swipe.
    // Dispatch synchronously to distinguish a reset from normal easing.
    dispatchEvent(new Event('resize'));
    const after = offset();
    const tail: number[] = [];
    for (let frame = 0; frame < 12; frame++) {
      await nextFrame();
      tail.push(offset());
    }
    return { before, after, tail };
  });
  expect(samples.before).toBeGreaterThan(20);
  expect(samples.after).toBeCloseTo(samples.before, 2);
  expect(samples.tail[0]).toBeGreaterThan(10);
  expect(samples.tail.at(-1)).toBeLessThan(samples.before);
  expect(samples.tail.every((offset, index, tail) => index === 0 || offset <= tail[index - 1]! + .1)).toBe(true);
});

test('mobile toolbar height changes keep the ticker steady, while rotation updates its position', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile browser chrome changes the viewport height during scrolling.');
  await page.evaluate(() => {
    const gallery = document.querySelector('[data-work-gallery]')!;
    scrollTo(0, gallery.getBoundingClientRect().top + scrollY + 250);
  });
  const board = page.locator('[data-home-departures]');
  await expect(board).toHaveAttribute('data-placement', 'floating');
  const initial = await board.boundingBox();
  expect(initial).not.toBeNull();
  const viewport = page.viewportSize()!;
  for (const height of [viewport.height + 44, viewport.height + 80, viewport.height + 24, viewport.height]) {
    await page.setViewportSize({ width: viewport.width, height });
    // Wait beyond ScrollTrigger's deferred resize refresh as well as RAF.
    await page.waitForTimeout(300);
    const bounds = await board.boundingBox();
    expect(Math.abs(bounds!.y - initial!.y)).toBeLessThan(1);
  }
  await page.setViewportSize({ width: viewport.height, height: viewport.width });
  await expect.poll(() => board.evaluate(el => {
    const bounds = el.getBoundingClientRect();
    return Math.abs(bounds.top + bounds.height / 2 - innerHeight / 2);
  })).toBeLessThan(1);
});
