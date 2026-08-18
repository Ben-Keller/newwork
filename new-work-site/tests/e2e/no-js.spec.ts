import { expect, test } from '@playwright/test';

test.use({ javaScriptEnabled: false });

test('the work index and film fallback remain useful without JavaScript', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1_000 });
  const homeResponse = await page.goto('/');
  expect(homeResponse?.status()).toBe(200);
  await expect(page.locator('[data-logo-intro]')).toBeVisible();
  await expect(page.locator('[data-intro-solid]')).toBeVisible();
  await expect(page.locator('[data-intro-media]')).toHaveCSS('display', 'none');
  await expect(page.getByRole('heading', { level: 1, name: 'Selected work' })).toBeAttached();
  await expect(page.locator('[data-project-card]')).toHaveCount(43);
  expect(await page.locator('[data-gallery-remove]').evaluateAll((buttons) =>
    buttons.every((button) => (button as HTMLButtonElement).hidden))).toBe(true);
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
  await expect(page.locator('.lazy-embed iframe')).toHaveCount(0);
});

test('the About profiles remain complete, readable, and ordered without JavaScript', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1_000 });
  const response = await page.goto('/about');
  expect(response?.status()).toBe(200);

  const about = page.locator('[data-about-page]');
  const people = about.locator('[data-about-people]');
  const profiles = people.locator('[data-about-person]');
  await expect(about).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'About', exact: true })).toBeVisible();
  await expect(people.getByRole('heading', { level: 2, name: 'The Creatives', exact: true })).toBeVisible();
  await expect(profiles).toHaveCount(3);
  await expect(profiles.nth(0)).toHaveAttribute('data-about-person', 'michael');
  await expect(profiles.nth(1)).toHaveAttribute('data-about-person', 'oliver');
  await expect(profiles.nth(2)).toHaveAttribute('data-about-person', 'anjali');
  await expect(profiles.nth(0).getByRole('heading', { level: 3, name: 'Michael', exact: true })).toBeVisible();
  await expect(profiles.nth(1).getByRole('heading', { level: 3, name: 'Oliver', exact: true })).toBeVisible();
  await expect(profiles.nth(2).getByRole('heading', { level: 3, name: 'Anjali Rao', exact: true })).toBeVisible();
  await expect(about.locator('[data-about-capabilities]')).toBeVisible();

  for (const profile of await profiles.all()) {
    const copy = profile.locator('[data-about-person-copy]');
    const media = profile.locator('[data-about-person-media]');
    const links = media.locator('[data-about-work-item]');
    const owner = await profile.getAttribute('data-about-person');
    const expectedItems = owner === 'anjali' ? 4 : 5;
    await expect(copy).toBeVisible();
    await expect(copy.locator('p')).not.toHaveCount(0);
    await expect(media).toBeVisible();
    await expect(links).toHaveCount(expectedItems);

    for (const link of await links.all()) {
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeVisible();
      await expect(link).toHaveAccessibleName(/\S/u);
      expect((await link.innerText()).trim()).not.toBe('');
      const image = link.locator('img');
      await expect(image).toHaveCount(1);
      await expect(image).toHaveAttribute('alt', '');
      await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0);
    }
  }

  const staticVisibility = await about.evaluate((element) => ({
    hidden: [...element.querySelectorAll<HTMLElement>('[data-motion-reveal], [data-motion-split]')].filter((item) => {
      const styles = getComputedStyle(item);
      return styles.opacity === '0' || styles.visibility === 'hidden' || styles.display === 'none';
    }).length,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(staticVisibility).toEqual({ hidden: 0, overflow: 0 });

  await page.setViewportSize({ width: 320, height: 700 });
  await page.locator('[data-about-person="anjali"]').scrollIntoViewIfNeeded();
  const mobileLayout = await profiles.evaluateAll((items) => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    profiles: items.map((profile) => {
      const copy = profile.querySelector<HTMLElement>('[data-about-person-copy]')?.getBoundingClientRect();
      const media = profile.querySelector<HTMLElement>('[data-about-person-media]')?.getBoundingClientRect();
      return {
        copy: copy ? { left: copy.left, right: copy.right, bottom: copy.bottom, width: copy.width } : null,
        media: media ? { top: media.top, left: media.left, right: media.right, width: media.width } : null,
      };
    }),
  }));
  expect(mobileLayout.overflow).toBeLessThanOrEqual(0);
  for (const profile of mobileLayout.profiles) {
    expect(profile.copy).not.toBeNull();
    expect(profile.media).not.toBeNull();
    if (!profile.copy || !profile.media) continue;
    expect(profile.copy.width).toBeGreaterThan(0);
    expect(profile.media.width).toBeGreaterThan(0);
    expect(profile.copy.left).toBeGreaterThanOrEqual(-1);
    expect(profile.copy.right).toBeLessThanOrEqual(321);
    expect(profile.media.left).toBeGreaterThanOrEqual(-1);
    expect(profile.media.right).toBeLessThanOrEqual(321);
    expect(profile.copy.bottom).toBeLessThanOrEqual(profile.media.top + 1);
  }
});
