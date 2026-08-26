import AxeBuilder from '@axe-core/playwright';
import {expect, test} from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.addInitScript(() => {
    for (const key of [
      'new-work:logo-intro:v3',
      'new-work:logo-intro:sentence-clean:v1',
      'new-work:logo-intro:title:v1',
    ]) window.sessionStorage.setItem(key, 'test-skip');
  });
});

for (const route of ['/', '/about', '/contact', '/work/mercury-an-unexpected-life']) {
  test(`has no serious automated accessibility violations: ${route}`, async ({page}) => {
    // Scan About's complete non-WebGL presentation. The enhanced canvas is
    // decorative, while this is the semantic surface exposed to visitors who
    // request reduced motion and to no-script clients.
    if (route === '/about') await page.emulateMedia({reducedMotion: 'reduce'});
    await page.goto(route);
    await page.locator('[data-site-header]').waitFor();
    // Axe should evaluate the authored resting state, not a fractional opacity
    // sampled midway through the bounded entrance timeline.
    await page.waitForTimeout(900);
    const results = await new AxeBuilder({page})
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations.filter((violation) =>
      violation.impact === 'critical' || violation.impact === 'serious',
    )).toEqual([]);
  });
}
