import { expect, test } from '@playwright/test';

test.use({ javaScriptEnabled: false });

test('the About experience remains complete and navigable without JavaScript', async ({page}) => {
  const response = await page.goto('/about');
  expect(response?.status()).toBe(200);

  const reel = page.locator('[data-reel-experience]');
  await expect(reel.locator('.reel-motion-stage')).toBeHidden();
  await expect(reel.locator('.reel-static-fallback')).toBeVisible();
  await expect(reel.locator('.reel-fallback-card')).toHaveCount(6);
  await expect(page.getByRole('heading', {
    level: 1,
    name: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  }))
    .toBeVisible();
  await expect(page.getByRole('link', {name: 'Start a project'}).last()).toHaveAttribute('href', '/contact');
});

test('the work index and film fallback remain useful without JavaScript', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1_000 });
  const homeResponse = await page.goto('/');
  expect(homeResponse?.status()).toBe(200);
  await expect(page.locator('[data-logo-intro]')).toBeVisible();
  await expect(page.locator('[data-type-title]')).toBeVisible();
  expect(await page.locator('[data-type-title-line]').evaluateAll((lines) =>
    lines.map((line) => (line as HTMLElement).dataset.typeTitleLine),
  )).toEqual(['new', 'work']);
  await expect(page.locator('[data-svg-title]')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: 'Selected work' })).toBeAttached();
  await expect(page.locator('[data-project-card]')).toHaveCount(28);
  await expect(page.locator('[data-gallery-remove]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Arc/u })).toBeVisible();
  await expect(page.locator('[data-project-grid]')).not.toHaveAttribute('data-masonry-ready');
  await expect(page.locator('[data-gallery-entrance]')).toHaveCSS('transform', 'none');
  const staticLayout = await page.locator('[data-project-grid]').evaluate((grid) => {
    const gridBox = grid.getBoundingClientRect();
    const cards = [...grid.querySelectorAll<HTMLElement>('[data-project-card]')];
    const firstTopByColumn = new Map<string, number>();
    cards.forEach((card) => {
      const column = card.dataset.desktopColumn || '';
      const top = card.querySelector<HTMLElement>(':scope > a')?.getBoundingClientRect().top
        ?? card.getBoundingClientRect().top;
      firstTopByColumn.set(column, Math.min(firstTopByColumn.get(column) ?? Number.POSITIVE_INFINITY, top));
    });
    return {
      columns: getComputedStyle(grid).gridTemplateColumns.split(/\s+/u).filter(Boolean).length,
      grid: { left: gridBox.left, right: gridBox.right },
      firstTops: [...firstTopByColumn.values()],
      contained: cards.every((card) => {
        const box = card.getBoundingClientRect();
        return box.left >= gridBox.left - 1 && box.right <= gridBox.right + 1;
      }),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(staticLayout.columns).toBe(4);
  expect(staticLayout.firstTops).toHaveLength(4);
  expect(Math.max(...staticLayout.firstTops) - Math.min(...staticLayout.firstTops)).toBeGreaterThan(20);
  expect(staticLayout.contained).toBe(true);
  expect(staticLayout.overflow).toBeLessThanOrEqual(0);
  await expect(page.locator('.project-card__label--touch')).toHaveCount(0);
  await expect(page.locator('.project-card__label-action')).toHaveCount(0);
  await expect(page.locator('[data-project-link]').first()).toHaveAttribute('href', /\/work\//u);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('[data-project-grid]')).toHaveCSS('grid-template-columns', /.+/u);
  expect(await page.locator('[data-project-grid]').evaluate((grid) =>
    getComputedStyle(grid).gridTemplateColumns.split(/\s+/u).filter(Boolean).length)).toBe(2);
  await expect(page.locator('.project-card__label--touch')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const mobileContentGaps = await page.locator('[data-project-grid]').evaluate((grid) => {
    const links = [...grid.querySelectorAll<HTMLElement>('[data-project-card] > a')]
      .map((link) => link.getBoundingClientRect())
      .sort((left, right) => left.top - right.top);
    return links.slice(1).map((link, index) => link.top - links[index]!.bottom);
  });
  expect(Math.max(...mobileContentGaps)).toBeLessThanOrEqual(8);

  const projectResponse = await page.goto('/work/mercury-an-unexpected-life');
  expect(projectResponse?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'Mercury — An Unexpected Life' })).toBeVisible();
  await expect(page.locator(
    '[data-project-header] [data-project-hero-media][data-first-media="true"] img',
  )).toBeVisible();
  await expect(page.locator('[data-first-media="true"]')).toHaveCount(1);
  await expect(page.locator('.media-stream [data-first-media="true"]')).toHaveCount(0);
  await expect(page.locator('.lazy-embed__poster img')).toBeVisible();
  await expect(page.getByText('Film playback is unavailable. The poster remains visible.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open film reference in a new tab' })).toBeVisible();
  await expect(page.locator('[data-project-overlay-panel]')).toBeVisible();
  await expect(page.locator('[data-project-overlay-return]')).toBeVisible();
  await expect(page.locator('[data-project-overlay-return]')).toHaveAttribute('href', /\/$/u);
  await expect(page.locator('[data-project-overlay-fallback] img')).not.toHaveCount(0);
  await expect(page.locator('.lazy-embed iframe')).toHaveCount(0);
});
