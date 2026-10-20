import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function sampleToggle(page: Page) {
  return page.evaluate(async () => {
    const selectors = ['[data-site-header]', '.site-header__mark', '.site-header__descriptor', '[data-menu-trigger]'];
    const elements = selectors.map(selector => document.querySelector<HTMLElement>(selector)!);
    const before = elements.map(element => element.getBoundingClientRect());
    let largestShift = 0; let hiddenFrames = 0;
    (document.querySelector('[data-menu-trigger]') as HTMLElement).click();
    const started = performance.now();
    await new Promise<void>(resolve => {
      const sample = () => {
        elements.forEach((element, index) => {
          const rect = element.getBoundingClientRect(); const previous = before[index]!;
          largestShift = Math.max(largestShift, ...(['x', 'y', 'width', 'height'] as const).map(key => Math.abs(rect[key] - previous[key])));
          const style = getComputedStyle(element);
          if (style.visibility !== 'visible' || style.display === 'none' || Number(style.opacity) < .99) hiddenFrames++;
        });
        if (performance.now() - started > 650) resolve(); else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    return { largestShift, hiddenFrames, sameElements: elements.every((element, index) => element === document.querySelector(selectors[index]!)) };
  });
}

for (const width of [320, 390, 600, 767]) {
  test(`header stays still throughout menu opening and closing at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/#work-gallery');
    await expect(page.locator('[data-site-header]')).toHaveCSS('opacity', '1');
    await page.evaluate(() => scrollTo(0, 700));
    const scroll = await page.evaluate(() => scrollY);
    await expect(page.locator('[data-site-header] .oliver-brand')).toHaveCount(1);
    const trigger = page.locator('[data-menu-trigger]');
    for (const expanded of ['true', 'false']) {
      const sample = await sampleToggle(page);
      expect(sample.sameElements).toBe(true);
      expect(sample.hiddenFrames).toBe(0);
      expect(sample.largestShift).toBeLessThan(.5);
      await expect(trigger).toHaveAttribute('aria-expanded', expanded);
    }
    await expect(page.locator('body')).not.toHaveClass(/has-open-mobile-menu/u);
    expect(await page.evaluate(() => scrollY)).toBeCloseTo(scroll, 0);
  });
}

test('menu owns keyboard and scroll gestures without returning the page to splash', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#work-gallery');
  await expect(page.locator('[data-site-header]')).toHaveCSS('opacity', '1');
  await page.locator('[data-menu-trigger]').click();
  await expect(page.locator('[data-mobile-menu-root]')).toHaveAttribute('aria-modal', 'true');
  await page.waitForTimeout(500);
  await page.keyboard.press('Home'); await page.keyboard.press('PageUp');
  await page.evaluate(() => {
    dispatchEvent(new WheelEvent('wheel', { deltaY: -700, cancelable: true }));
    const start = new Event('touchstart'); Object.defineProperty(start, 'touches', { value: [{ clientY: 100 }] }); dispatchEvent(start);
    const move = new Event('touchmove', { cancelable: true }); Object.defineProperty(move, 'touches', { value: [{ clientY: 500 }] }); dispatchEvent(move);
    dispatchEvent(new Event('touchend'));
  });
  await expect(page.locator('[data-logo-work-page]')).toHaveAttribute('data-handoff', 'true');
  await expect(page.locator('[data-site-header]')).toHaveCSS('opacity', '1');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-menu-trigger]')).toBeFocused();
  await expect(page.locator('[data-mobile-menu]')).not.toHaveAttribute('open');
});

test('rapid reversal, resizing to desktop, and menu navigation release the modal cleanly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/contact');
  const trigger = page.locator('[data-menu-trigger]');
  await trigger.click(); await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await trigger.click(); await page.waitForTimeout(40); await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-menu-panel]')).toHaveCSS('opacity', '1');
  await page.setViewportSize({ width: 1024, height: 844 });
  await expect(page.locator('body')).not.toHaveClass(/has-open-mobile-menu/u);
  await expect(page.locator('[data-mobile-menu]')).not.toHaveAttribute('open');
  await page.setViewportSize({ width: 390, height: 844 });
  await trigger.click();
  await page.locator('[data-menu-link]').getByText('Work', { exact: true }).click();
  await expect(page).toHaveURL(/\/#work-gallery$/u);
  await expect(page.locator('body')).not.toHaveClass(/has-open-mobile-menu/u);
  await expect(page.locator('[data-logo-work-page]')).toHaveAttribute('data-handoff', 'true');
});

test('reduced-motion menu remains accessible and uses the original toggle as its close control', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/contact');
  const trigger = page.locator('[data-menu-trigger]');
  await trigger.focus(); await page.keyboard.press('Enter');
  await expect(trigger).toHaveAccessibleName('Close menu');
  await expect(trigger).toBeFocused();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.filter(violation => ['critical', 'serious'].includes(violation.impact || ''))).toEqual([]);
  await page.keyboard.press('Shift+Tab'); await expect(page.locator('[data-menu-link]').last()).toBeFocused();
  await page.keyboard.press('Tab'); await expect(trigger).toBeFocused();
  await page.keyboard.press('Space');
  await expect(trigger).toHaveAccessibleName('Menu');
  await expect(page.locator('[data-mobile-menu]')).not.toHaveAttribute('open');
});
