import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }, testInfo) => {
  if (
    testInfo.title.includes('reduced motion')
    || testInfo.title.includes('first-session')
    || testInfo.title.includes('landing intro')
    || testInfo.title.includes('landing loads')
    || testInfo.title.includes('disabled entrance')
    || testInfo.title.includes('disabled title entrance')
    || testInfo.title.includes('each settled title')
  ) return;
  await page.addInitScript(() => {
    for (const key of [
      'new-work:logo-intro:v3',
      'new-work:logo-intro:sentence-clean:v1',
      'new-work:logo-intro:title:v1',
    ]) window.sessionStorage.setItem(key, 'test-skip');
  });
});

test('the landing loads directly into the stacked typographic title while its entrance is disabled', async ({ page }) => {
  const intro = page.locator('[data-logo-intro]');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(intro).toHaveAttribute('data-entrance-enabled', 'false');
  await expect(intro).toHaveAttribute('data-state', 'settled');
  await expect(intro).not.toHaveAttribute('data-intro-started-at');
  await expect(intro).toHaveAttribute('data-title-treatment', 'type');
  await expect(intro.locator('[data-type-title-line]')).toHaveText(['new', 'work']);
  await expect(intro.locator('[data-svg-title]')).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem('new-work:logo-intro:title:v1'))).toBeNull();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(intro).toHaveAttribute('data-state', 'settled');
  await expect(intro.locator('[data-type-title]')).toBeVisible();
});

test('refreshing a scrolled route returns it to the top', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-project-grid]')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 2_000));
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(1_000);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test('the supplied NW artwork is the persistent header, footer, and browser icon', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('New Work Agency');

  const headerLogo = page.locator('[data-site-header] .site-header__full-mark img');
  const footerLogo = page.locator('[data-site-footer] .site-footer__brand img');
  await expect(headerLogo).toHaveAttribute('src', '/media/brand/new-black.svg');
  await expect(headerLogo).toHaveAttribute('width', '1641');
  await expect(headerLogo).toHaveAttribute('height', '824');
  await expect(footerLogo).toHaveAttribute('src', '/media/brand/new-black.svg');
  const headerLockup = page.locator(
    '[data-site-header] .site-header__full-mark:visible, [data-site-header] .site-header__compact-mark:visible',
  );
  const footerLockup = page.locator('[data-site-footer] [data-brand-lockup]');
  await expect(headerLockup.locator('[data-brand-lockup-qualifier]')).toHaveCount(0);
  await expect(footerLockup.locator('[data-brand-lockup-qualifier]')).toHaveCount(0);
  await expect(page.locator('[data-site-header] .site-header__brand')).toHaveAttribute('href', '/');
  await expect(page.locator('[data-site-footer] .site-footer__brand')).toHaveAttribute('href', '/');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/apple-touch-icon.png');
  const favicon = await page.evaluate(() => fetch('/favicon.svg').then((response) => response.text()));
  expect(favicon).toContain('viewBox="0 0 1640.52 1640.52"');
  expect(favicon).toContain('<rect width="1640.52" height="1640.52" rx="220" fill="#fff"/>');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('[data-site-header] .site-header__compact-mark img'))
    .toHaveAttribute('src', '/media/brand/new-black.svg');

  await page.locator('[data-project-link][href="/work/tour-de-france-x-toyota"]').dispatchEvent('click');
  await page.waitForURL('**/work/tour-de-france-x-toyota');
  await expect(page.locator('body')).toHaveAttribute('data-page-theme', 'dark');
  await expect(page.locator('[data-site-header] .site-header__full-mark img')).not.toHaveCSS('filter', 'none');
  await expect(page.locator('[data-site-footer] .site-footer__brand img')).not.toHaveCSS('filter', 'none');
});

test('the header keeps the full title and default logo without preview sliders', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('[data-site-header]');
  await expect(page.locator('[data-header-design-controls], [data-header-logo-control], .identity-slider'))
    .toHaveCount(0);

  await expect(page.locator('html')).not.toHaveAttribute('data-title-mask');
  await expect(page.locator('[data-type-title-line="new"]')).toHaveCSS('clip-path', 'none');
  await expect(page.locator('[data-type-title]')).toHaveCSS('align-items', 'flex-start');
  await expect(page.locator('[data-logo-descriptor]')).toHaveCSS('text-align', 'start');
  expect(await page.evaluate(() => localStorage.getItem('new-work:title-mask'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('new-work:title-alignment'))).toBeNull();

  await expect(header).not.toHaveAttribute('data-header-logo');
  await expect(header.locator('.site-header__full-mark img')).toHaveAttribute('src', '/media/brand/new-black.svg');
  expect(await page.evaluate(() => localStorage.getItem('new-work:header-logo'))).toBeNull();

  await page.goto('/about');
  await expect(page.locator('html')).not.toHaveAttribute('data-title-mask');
  await expect(page.locator('[data-site-header]')).not.toHaveAttribute('data-header-logo');
  await expect(page.locator('[data-site-header] .site-header__full-mark img'))
    .toHaveAttribute('src', '/media/brand/new-black.svg');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('[data-header-design-controls], input[type="range"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
    .toBeLessThanOrEqual(1);
});

test('the gallery order toolbar stays hidden from the review UI', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-project-card]')).toHaveCount(32);
  await expect(page.locator('[data-gallery-order-tools]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /shuffle gallery|save gallery|restore removed/iu }))
    .toHaveCount(0);
});

test('the footer closes every route with a studio statement, directory, and oversized identity', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1_000 });
  await page.goto('/');
  const footer = page.locator('[data-site-footer]');
  await expect(footer.locator('.site-footer__strapline p')).toHaveCount(4);
  await expect(footer.getByRole('heading', { level: 2, name: 'People' })).toBeVisible();
  await expect(footer.getByRole('heading', { level: 2, name: 'Explore' })).toBeVisible();
  await expect(footer.getByRole('heading', { level: 2, name: 'Connect' })).toBeVisible();
  await expect(footer.locator('.site-footer__group--people a')).toHaveCount(3);
  await expect(footer.locator('.site-footer__group--people a')).toHaveText([
    'Michael',
    'Oliver',
    'Anjali Rao',
  ]);
  await expect(footer.getByRole('link', { name: 'hello@lorem.ipsum' })).toHaveCount(1);
  await expect(footer.locator('.site-footer__legal')).toContainText('New Work Agency');

  const desktop = await footer.evaluate((element) => {
    const rect = (target: Element | null) => {
      if (!target) throw new Error('The footer layout is incomplete.');
      const box = target.getBoundingClientRect();
      return { top: box.top, right: box.right, bottom: box.bottom, left: box.left, width: box.width, height: box.height };
    };
    const box = rect(element);
    const strapline = rect(element.querySelector('.site-footer__strapline'));
    const people = rect(element.querySelector('.site-footer__group--people'));
    const brand = rect(element.querySelector('.site-footer__brand'));
    const legal = rect(element.querySelector('.site-footer__legal'));
    return { box, strapline, people, brand, legal, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  expect(desktop.box.height).toBeGreaterThanOrEqual(900);
  expect(desktop.strapline.right).toBeLessThanOrEqual(desktop.people.left + 1);
  expect(desktop.brand.width).toBeGreaterThan(500);
  expect(Math.abs(desktop.brand.bottom - desktop.legal.bottom)).toBeLessThanOrEqual(4);
  expect(desktop.overflow).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await footer.evaluate((element) => {
    const rect = (target: Element | null) => {
      if (!target) throw new Error('The footer layout is incomplete.');
      const box = target.getBoundingClientRect();
      return { top: box.top, right: box.right, bottom: box.bottom, left: box.left, width: box.width, height: box.height };
    };
    const box = rect(element);
    const people = rect(element.querySelector('.site-footer__group--people'));
    const explore = rect(element.querySelector('.site-footer__group--explore'));
    const connect = rect(element.querySelector('.site-footer__group--connect'));
    const brand = rect(element.querySelector('.site-footer__brand'));
    return { box, people, explore, connect, brand, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  expect(mobile.box.height).toBeGreaterThanOrEqual(844);
  expect(mobile.people.left).toBeLessThan(mobile.explore.left);
  expect(Math.abs(mobile.explore.left - mobile.connect.left)).toBeLessThanOrEqual(1);
  expect(mobile.brand.width).toBeGreaterThan(150);
  expect(mobile.overflow).toBeLessThanOrEqual(1);
});

test('the typographic title remains non-blocking while its entrance is hidden', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const intro = page.locator('[data-logo-intro]');
  await expect(intro).toHaveAttribute('data-state', 'settled');
  await expect(intro.locator('[data-type-title-line]')).toHaveText(['new', 'work']);
  await expect(intro.locator('[data-intro-cell]')).toHaveCount(0);
  const layout = await intro.evaluate((element) => {
    const header = document.querySelector<HTMLElement>('[data-site-header]');
    return {
      position: getComputedStyle(element).position,
      pointerEvents: getComputedStyle(element).pointerEvents,
      top: element.getBoundingClientRect().top,
      headerBottom: header?.getBoundingClientRect().bottom ?? 0,
    };
  });
  expect(layout.position).toBe('relative');
  expect(layout.pointerEvents).toBe('none');
  expect(layout.top).toBeGreaterThanOrEqual(layout.headerBottom - 1);
  await expect(page.locator('[data-site-header]').getByRole('link', { name: 'New Work Agency' }))
    .toBeVisible();
  const descriptor = page.locator('[data-logo-descriptor]');
  await expect(descriptor).toHaveText('film + photo production agency');
  await expect(descriptor).toBeVisible();
  await expect(descriptor).toHaveCSS('text-transform', 'none');
  await expect(page.locator('[data-project-grid]')).toBeAttached();
});

test('the earlier SVG title kits remain available behind the title treatment switch', async ({ page }) => {
  await page.goto('/');
  const intro = page.locator('[data-logo-intro]');
  await expect(intro).toHaveAttribute('data-state', 'settled', { timeout: 6_000 });
  await expect(intro).toHaveAttribute('data-title-source', 'pp-neue-montreal');
  await expect(intro).toHaveAttribute('data-title-treatment', 'type');
  await expect(intro.locator('[data-svg-title]')).toHaveCount(0);
  expect((await page.request.get('/media/brand/new-work-title-letter-kit/new-work-title-letters.svg')).ok())
    .toBe(true);
  expect((await page.request.get('/media/brand/new-work-sentence-clean-letter-kit/new-work-sentence-letters.svg')).ok())
    .toBe(true);
  expect((await page.request.get('/media/brand/new-work-letter-kit/new-work-letters.svg')).ok())
    .toBe(true);
});

test('the disabled title entrance remains disabled across navigation', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-logo-intro]')).toHaveAttribute('data-state', 'settled');
  await page.goto('/about');
  expect(await page.evaluate(() => sessionStorage.getItem('new-work:logo-intro:title:v1'))).toBeNull();

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const intro = page.locator('[data-logo-intro]');
  await expect(intro).toHaveAttribute('data-state', 'settled');
  await expect(intro.locator('[data-type-title]')).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('new-work:logo-intro:title:v1'))).toBeNull();
});

test('the type title reveals animated imagery one letter at a time on hover', async ({ page }) => {
  await page.goto('/');
  test.skip(
    !await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches),
    'Per-letter title hover is a fine-pointer enhancement.',
  );

  const firstLetter = page.locator('[data-type-letter="0"]');
  const nextLetter = page.locator('[data-type-letter="1"]');
  const initialWidth = await firstLetter.evaluate((element) => element.getBoundingClientRect().width);
  const firstLetterBox = await firstLetter.boundingBox();
  expect(firstLetterBox).not.toBeNull();
  await page.mouse.move(
    firstLetterBox!.x + firstLetterBox!.width / 2,
    firstLetterBox!.y + firstLetterBox!.height / 2,
  );

  await expect(firstLetter).toHaveAttribute('data-type-active', 'true');
  await expect(firstLetter.locator('.logo-intro__type-letter-rest')).toHaveCSS('opacity', '0');
  expect(await nextLetter.evaluate((element) => getComputedStyle(element, '::before').opacity)).toBe('0');
  await expect(firstLetter.locator('[data-type-letter-video-source]'))
    .toHaveAttribute('data-src', /stella-artois-daydream/u);
  await expect(firstLetter).toHaveAttribute('data-type-media-ready', 'true');
  await expect(firstLetter.locator('[data-type-letter-canvas]')).toHaveCSS('opacity', '1');
  expect(await firstLetter.evaluate((element) => getComputedStyle(element, '::before').opacity)).toBe('0');
  expect(await firstLetter.evaluate((element) => getComputedStyle(element, '::after').opacity)).toBe('0');
  expect(await firstLetter.evaluate((element) => element.getBoundingClientRect().width)).toBeCloseTo(initialWidth, 1);
});

test('the settled title uses two lowercase lines above the staggered gallery columns', async ({ page }) => {
  for (const viewport of [
    { width: 1_440, height: 1_000 },
    { width: 1_024, height: 768 },
    { width: 390, height: 844 },
    { width: 320, height: 700 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const intro = page.locator('[data-logo-intro]');
    await expect(intro).toHaveAttribute('data-state', 'settled', { timeout: 6_000 });
    await expect(intro).toHaveAttribute('data-title-layout', 'stacked');
    await expect(page.locator('.work-index__rail')).toHaveCount(0);
    await expect(page.getByText('Selected projects', { exact: true })).toHaveCount(0);
    const layout = await intro.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const titleElement = element.querySelector<HTMLElement>('[data-type-title]');
      const titleLockup = element.querySelector<HTMLElement>('[data-type-lockup]');
      const stage = titleElement?.getBoundingClientRect();
      const descriptor = element.querySelector<HTMLElement>('[data-logo-descriptor]')?.getBoundingClientRect();
      const outline = element.querySelector<HTMLElement>('[data-type-title-line="new"]');
      const solid = element.querySelector<HTMLElement>('[data-type-title-line="work"]');
      const outlineStyles = outline ? getComputedStyle(outline) : null;
      const solidStyles = solid ? getComputedStyle(solid) : null;
      const titleStyles = titleLockup ? getComputedStyle(titleLockup) : null;
      const grid = document.querySelector<HTMLElement>('[data-project-grid]')?.getBoundingClientRect();
      const gallery = document.querySelector<HTMLElement>('[data-work-gallery]');
      const firstColumnTops = [...document.querySelectorAll<HTMLElement>(
        '[data-project-card][data-desktop-column-start]',
      )].reduce<Record<string, number>>((tops, card) => {
        const column = card.dataset.desktopColumn;
        const content = card.querySelector<HTMLElement>(':scope > a');
        if (column && content) tops[column] = content.getBoundingClientRect().top;
        return tops;
      }, {});
      return {
        height: box.height,
        stageHeight: stage?.height || 0,
        stageWidth: stage?.width || 0,
        stageBottom: stage?.bottom || 0,
        descriptorTop: descriptor?.top || 0,
        gridTop: grid?.top || 0,
        galleryTop: gallery?.getBoundingClientRect().top || 0,
        introBottom: box.bottom,
        titleStack: Number(getComputedStyle(element).zIndex),
        galleryStack: Number(gallery ? getComputedStyle(gallery).zIndex : 0),
        galleryOverflow: gallery ? getComputedStyle(gallery).overflow : '',
        galleryClip: gallery ? getComputedStyle(gallery).clipPath : '',
        firstColumnTops,
        firstColumnLifts: [...document.querySelectorAll<HTMLElement>(
          '[data-project-card][data-desktop-column-start]',
        )].reduce<Record<string, number>>((lifts, card) => {
          const column = card.dataset.desktopColumn;
          const translateY = Number.parseFloat(getComputedStyle(card).translate.split(' ')[1] || '0');
          if (column) lifts[column] = Math.abs(translateY);
          return lifts;
        }, {}),
        titleTranslate: titleStyles?.translate || '',
        outlineColor: outlineStyles?.color,
        outlineStroke: outlineStyles?.getPropertyValue('-webkit-text-stroke-width'),
        solidColor: solidStyles?.color,
        fontFamily: solidStyles?.fontFamily,
        fontWeight: solidStyles?.fontWeight,
        lineCount: element.querySelectorAll('[data-type-title-line]').length,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(layout.height).toBeGreaterThanOrEqual(90);
    expect(layout.stageHeight).toBeGreaterThanOrEqual(42);
    expect(layout.stageHeight / layout.stageWidth).toBeGreaterThanOrEqual(0.28);
    expect(layout.titleTranslate).toMatch(/-10%$/u);
    expect(layout.lineCount).toBe(2);
    expect(layout.descriptorTop).toBeGreaterThanOrEqual(layout.stageBottom);
    expect(layout.gridTop).toBeLessThan(layout.introBottom);
    expect(layout.titleStack).toBeGreaterThan(layout.galleryStack);
    expect(layout.galleryOverflow).toBe('clip');
    expect(layout.galleryClip).toBe('none');
    if (viewport.width >= 1_200) {
      expect(Math.min(...Object.values(layout.firstColumnTops))).toBeGreaterThanOrEqual(layout.galleryTop);
      expect(layout.firstColumnTops['1']! - layout.firstColumnTops['2']!).toBeGreaterThanOrEqual(48);
      expect(layout.firstColumnTops['3']!).toBeLessThan(layout.firstColumnTops['2']!);
      expect(Math.min(...Object.values(layout.firstColumnTops))).toBeLessThan(layout.introBottom);
      expect(layout.firstColumnLifts['2']! / layout.firstColumnLifts['1']!).toBeCloseTo(.8, 1);
      expect(layout.firstColumnLifts['3']! / layout.firstColumnLifts['1']!).toBeCloseTo(10 / 3, 1);
      expect(layout.firstColumnLifts['4']! / layout.firstColumnLifts['1']!).toBeCloseTo(5 / 3, 1);
    }
    expect(layout.outlineColor).toBe('rgba(0, 0, 0, 0)');
    expect(Number.parseFloat(layout.outlineStroke || '0')).toBeGreaterThanOrEqual(1);
    expect(layout.solidColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(layout.fontFamily).toContain('New Work Sans');
    expect(Number(layout.fontWeight)).toBeGreaterThanOrEqual(700);
    expect(layout.overflow).toBeLessThanOrEqual(1);
  }
});

async function expectGridColumns(page: Page, width: number, expectedColumns: number) {
  await page.setViewportSize({ width, height: width >= 1200 ? 1_000 : width >= 768 ? 768 : 844 });
  const grid = page.locator('[data-project-grid]');
  await expect(grid).toHaveAttribute('data-masonry-ready', 'true');
  await expect(page.locator('[data-gallery-entrance]'))
    .toHaveAttribute('data-gallery-entrance-state', 'settled', { timeout: 3_000 });
  await page.mouse.move(1, 1);
  await expect.poll(() => grid.evaluate((element) =>
    new DOMMatrixReadOnly(getComputedStyle(element).transform).m41)).toBeGreaterThan(-0.1);
  await expect.poll(() => grid.evaluate((element) =>
    new DOMMatrixReadOnly(getComputedStyle(element).transform).m41)).toBeLessThan(0.1);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => {
    requestAnimationFrame(() => resolve());
  })));

  const layout = await grid.evaluate((element, columnCount) => {
    const cards = [...element.querySelectorAll<HTMLElement>('[data-project-card]')];
    const wideCards = cards.filter((card) => card.classList.contains('project-card--wide'));
    const regularCards = cards.filter((card) => !card.classList.contains('project-card--wide'));
    const attributeName = window.innerWidth >= 1200 ? 'desktopColumn' : 'tabletColumn';
    const gridBox = element.getBoundingClientRect();
    const columns = getComputedStyle(element).gridTemplateColumns
      .split(/\s+/u)
      .filter(Boolean)
      .length;
    const lanes = new Map<number, Array<{
      top: number;
      bottom: number;
      contentTop: number;
      contentBottom: number;
    }>>();
    const cardBoxes = regularCards.map((card) => {
      const box = card.getBoundingClientRect();
      const contentBox = card.querySelector<HTMLElement>(':scope > a')?.getBoundingClientRect() ?? box;
      const lane = columnCount === 1 ? 1 : Number(card.dataset[attributeName]);
      const entries = lanes.get(lane) ?? [];
      entries.push({
        top: box.top,
        bottom: box.bottom,
        contentTop: contentBox.top,
        contentBottom: contentBox.bottom,
      });
      lanes.set(lane, entries);
      return {
        lane,
        top: box.top,
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        width: box.width,
        contentLeft: contentBox.left,
        contentRight: contentBox.right,
        contentWidth: contentBox.width,
      };
    });
    const overlaps = [...lanes.entries()].flatMap(([lane, entries]) => {
      const ordered = entries.sort((left, right) => left.top - right.top);
      return ordered.slice(1).flatMap((entry, index) =>
        entry.top < (ordered[index]?.bottom ?? entry.top) - 1 ? [lane] : []);
    });
    const firstTopByLane = [...lanes.values()].map((entries) => {
      const firstEntry = entries.reduce((first, entry) => entry.top < first.top ? entry : first);
      return firstEntry.contentTop;
    });
    const laneGaps = [...lanes.values()].flatMap((entries) => {
      const ordered = entries.sort((left, right) => left.top - right.top);
      return ordered.slice(1).map((entry, index) => ({
        card: entry.top - ordered[index]!.bottom,
        content: entry.contentTop - ordered[index]!.contentBottom,
      }));
    });

    return {
      columns,
      viewportWidth: window.innerWidth,
      grid: { left: gridBox.left, right: gridBox.right },
      cards: cardBoxes,
      laneNumbers: [...lanes.keys()].sort((left, right) => left - right),
      firstTopByLane,
      maxCardGap: Math.max(0, ...laneGaps.map((gap) => gap.card)),
      maxContentGap: Math.max(0, ...laneGaps.map((gap) => gap.content)),
      overlaps,
      wideCards: wideCards.map((card) => {
        const box = card.getBoundingClientRect();
        return { left: box.left, right: box.right, width: box.width };
      }),
    };
  }, expectedColumns);

  expect(layout.columns).toBe(expectedColumns);
  if (expectedColumns === 4) {
    expect(layout.grid.left).toBeLessThan(-4);
    expect(layout.grid.right).toBeGreaterThan(layout.viewportWidth + 4);
  } else {
    expect(layout.grid.left).toBeGreaterThanOrEqual(0);
    expect(layout.grid.right).toBeLessThanOrEqual(layout.viewportWidth + 1);
  }
  expect(layout.laneNumbers).toEqual(Array.from({ length: expectedColumns }, (_, index) => index + 1));
  expect(layout.overlaps).toEqual([]);
  expect(layout.maxCardGap).toBeLessThanOrEqual(expectedColumns === 1 ? 8 : 16);
  expect(layout.maxContentGap).toBeLessThanOrEqual(expectedColumns === 1 ? 8 : 32);
  if (layout.viewportWidth < 768) {
    const mobileTransforms = await grid.locator('[data-motion-column]').evaluateAll((cards) => cards.map((card) => ({
      ready: (card as HTMLElement).dataset.motionReady,
      transform: getComputedStyle(card).transform,
    })));
    expect(mobileTransforms.every(({ ready, transform }) => !ready && transform === 'none')).toBe(true);
  }
  for (const card of layout.cards) {
    expect(card.width).toBeGreaterThan(0);
    expect(card.left).toBeGreaterThanOrEqual(layout.grid.left - 1);
    expect(card.right).toBeLessThanOrEqual(layout.grid.right + 1);
    expect(Math.abs(card.contentLeft - card.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(card.contentRight - card.right)).toBeLessThanOrEqual(1);
    expect(Math.abs(card.contentWidth - card.width)).toBeLessThanOrEqual(1);
  }
  const regularWidths = layout.cards.map((card) => card.contentWidth);
  expect(Math.max(...regularWidths) - Math.min(...regularWidths)).toBeLessThanOrEqual(1);
  for (const card of layout.wideCards) {
    expect(card.left).toBeGreaterThanOrEqual(layout.grid.left - 1);
    expect(card.right).toBeLessThanOrEqual(layout.grid.right + 1);
    expect(card.width).toBeGreaterThan((layout.grid.right - layout.grid.left) * .8);
  }
  if (expectedColumns > 1 && layout.viewportWidth >= 768) {
    expect(Math.max(...layout.firstTopByLane) - Math.min(...layout.firstTopByLane))
      .toBeGreaterThanOrEqual(expectedColumns === 4 ? 48 : 8);
  }
}

async function expectAboutLayout(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto('/about');

  const about = page.locator('[data-about-page]');
  const people = about.locator('[data-about-people]');
  const profiles = people.locator('[data-about-person]');
  const capabilities = about.locator('[data-about-capabilities]');

  await expect(about).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'About', exact: true })).toHaveCount(1);
  await expect(people.getByRole('heading', { level: 2, name: 'The Creatives', exact: true })).toHaveCount(1);
  await expect(profiles).toHaveCount(3);
  await expect(profiles.nth(0)).toHaveAttribute('data-about-person', 'michael');
  await expect(profiles.nth(1)).toHaveAttribute('data-about-person', 'oliver');
  await expect(profiles.nth(2)).toHaveAttribute('data-about-person', 'anjali');
  await expect(profiles.nth(0).getByRole('heading', { level: 3, name: 'Michael', exact: true })).toHaveCount(1);
  await expect(profiles.nth(1).getByRole('heading', { level: 3, name: 'Oliver', exact: true })).toHaveCount(1);
  await expect(profiles.nth(2).getByRole('heading', { level: 3, name: 'Anjali Rao', exact: true })).toHaveCount(1);
  await expect(capabilities.getByRole('heading', { level: 2, name: 'Expertise', exact: true }))
    .toHaveCount(1);
  await expect(capabilities.locator('li')).toHaveCount(4);
  await expect(about.locator(
    '.about-intro__index, .about-person__number, .about-person__work-label, .about-work__index, .about-work__kicker',
  )).toHaveCount(0);
  await expect(about).not.toContainText(/selected work/iu);
  await expect(capabilities.locator('li > span')).toHaveCount(0);

  const headingOrder = await about.locator('h1, h2, h3').evaluateAll((headings) => headings.map((heading) => ({
    level: heading.tagName,
    text: heading.textContent?.trim() || '',
  })));
  const aboutIndex = headingOrder.findIndex(({ level, text }) => level === 'H1' && text === 'About');
  const peopleIndex = headingOrder.findIndex(({ level, text }) => level === 'H2' && text === 'The Creatives');
  const oliverIndex = headingOrder.findIndex(({ level, text }) => level === 'H3' && text === 'Oliver');
  const michaelIndex = headingOrder.findIndex(({ level, text }) => level === 'H3' && text === 'Michael');
  const anjaliIndex = headingOrder.findIndex(({ level, text }) => level === 'H3' && text === 'Anjali Rao');
  const capabilitiesIndex = headingOrder.findIndex(({ level, text }) => level === 'H2' && text === 'Expertise');
  expect([aboutIndex, peopleIndex, michaelIndex, oliverIndex, anjaliIndex, capabilitiesIndex])
    .toEqual([...([aboutIndex, peopleIndex, michaelIndex, oliverIndex, anjaliIndex, capabilitiesIndex])]
      .sort((left, right) => left - right));
  expect(aboutIndex).toBeGreaterThanOrEqual(0);

  for (const profile of await profiles.all()) {
    const copy = profile.locator('[data-about-person-copy]');
    const media = profile.locator('[data-about-person-media]');
    const links = media.locator('[data-about-work-item]');
    const images = links.locator('img');
    const owner = await profile.getAttribute('data-about-person');
    const expectedItems = owner === 'anjali' ? 4 : 5;

    await expect(copy).toHaveCount(1);
    expect((await copy.innerText()).trim().length).toBeGreaterThan(80);
    await expect(copy.locator('p')).not.toHaveCount(0);
    await expect(media).toHaveCount(1);
    await expect(links).toHaveCount(expectedItems);
    await expect(images).toHaveCount(expectedItems);
    const workKeys = await links.evaluateAll((items) => items.map((item) => (
      item as HTMLElement
    ).dataset.aboutWorkKey));
    if (owner === 'oliver') {
      expect(workKeys).toEqual([
        'tour-de-france-x-toyota',
        'humu-make-work-better-holly',
        'mercury-an-unexpected-life',
        'mercury-one-of-the-greats',
        'olympics-toyota-in-due-time',
      ]);
    } else if (owner === 'michael') {
      expect(workKeys).toEqual([
        'native-cucumber-mint-stop-motion',
        'arc',
        'cradlewise',
        'specialized-globe',
        'brava',
      ]);
    } else {
      expect(workKeys).toEqual([
        'adobe',
        'stella-artois-daydream',
        'rakuten',
        'about-work-anjali-rakuten-duet-frame',
      ]);
      await expect(media.locator('[data-preview-video]')).toHaveCount(2);
      expect(await media.locator('[data-preview-video]').evaluateAll((videos) =>
        new Set(videos.map((video) => (video as HTMLVideoElement).dataset.source)).size)).toBe(2);
    }
    expect(await links.evaluateAll((items) => items.every((item) =>
      getComputedStyle(item).clipPath === 'none'))).toBe(true);

    for (const link of await links.all()) {
      await expect(link).toHaveAccessibleName(/\S/u);
      const visibleLines = (await link.innerText()).split(/\n+/u).map((line) => line.trim()).filter(Boolean);
      expect(visibleLines.length).toBeGreaterThanOrEqual(2);
      expect(visibleLines.join(' ')).not.toMatch(/draft|placeholder|needs? review/iu);
      await expect(link.locator('img')).toHaveCount(1);
      await expect(link.locator('img')).toHaveAttribute('alt', '');
    }
  }

  await expect(page.locator('html')).toHaveAttribute('data-motion-runtime', 'static');
  const staticMotion = await about.evaluate((element) => ({
    hiddenReveals: [...element.querySelectorAll<HTMLElement>('[data-motion-reveal]')].filter((item) => {
      const styles = getComputedStyle(item);
      return item.dataset.motionReady !== 'static' || styles.opacity === '0' || styles.visibility === 'hidden';
    }).length,
    movingParallax: [...element.querySelectorAll<HTMLElement>('[data-motion-parallax]')].filter((item) =>
      getComputedStyle(item).transform !== 'none').length,
  }));
  expect(staticMotion).toEqual({ hiddenReveals: 0, movingParallax: 0 });

  const layout = await about.evaluate((element) => {
    const toBox = (item: Element | null) => {
      const box = item?.getBoundingClientRect();
      return box
        ? { top: box.top, right: box.right, bottom: box.bottom, left: box.left, width: box.width, height: box.height }
        : null;
    };
    const profileElements = [...element.querySelectorAll<HTMLElement>('[data-about-person]')];
    const peopleHeading = element.querySelector('[data-about-people] h2');
    const capabilitiesHeading = element.querySelector('[data-about-capabilities] h2');

    return {
      viewportWidth: document.documentElement.clientWidth,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      peopleHeading: toBox(peopleHeading),
      capabilitiesHeading: toBox(capabilitiesHeading),
      profiles: profileElements.map((profile) => ({
        owner: profile.dataset.aboutPerson,
        profile: toBox(profile),
        copy: toBox(profile.querySelector('[data-about-person-copy]')),
        media: toBox(profile.querySelector('[data-about-person-media]')),
        links: [...profile.querySelectorAll('[data-about-person-media] [data-about-work-item]')].map(toBox),
        clips: [...profile.querySelectorAll<HTMLElement>('[data-about-person-media] [data-about-work-item]')]
          .map((item) => getComputedStyle(item).clipPath),
      })),
    };
  });

  expect(layout.overflow).toBeLessThanOrEqual(1);
  expect(layout.profiles).toHaveLength(3);
  expect(layout.peopleHeading).not.toBeNull();
  expect(layout.capabilitiesHeading).not.toBeNull();

  for (const profile of layout.profiles) {
    expect(profile.profile).not.toBeNull();
    expect(profile.copy).not.toBeNull();
    expect(profile.media).not.toBeNull();
    if (!profile.profile || !profile.copy || !profile.media) continue;

    for (const box of [profile.profile, profile.copy, profile.media, ...profile.links]) {
      expect(box).not.toBeNull();
      if (!box) continue;
      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThan(0);
      expect(box.left).toBeGreaterThanOrEqual(-1);
      expect(box.right).toBeLessThanOrEqual(layout.viewportWidth + 1);
    }
    expect(profile.clips.every((clip) => clip === 'none')).toBe(true);

    if (width >= 768) {
      const copyBeforeMedia = profile.copy.right <= profile.media.left + 1;
      const mediaBeforeCopy = profile.media.right <= profile.copy.left + 1;
      expect(copyBeforeMedia || mediaBeforeCopy).toBe(true);
      const horizontalGap = copyBeforeMedia
        ? profile.media.left - profile.copy.right
        : profile.copy.left - profile.media.right;
      expect(horizontalGap).toBeGreaterThanOrEqual(width >= 1200 ? 32 : 24);
      expect(profile.copy.width).toBeGreaterThanOrEqual(width >= 1200 ? 340 : 280);
      expect(profile.media.width).toBeGreaterThanOrEqual(width >= 1200 ? 500 : 400);
      if (profile.owner === 'oliver') expect(profile.copy.left).toBeLessThan(profile.media.left);
      if (profile.owner === 'michael') expect(profile.media.left).toBeLessThan(profile.copy.left);
      if (profile.owner === 'anjali') expect(profile.copy.left).toBeLessThan(profile.media.left);
    } else {
      expect(profile.copy.bottom).toBeLessThanOrEqual(profile.media.top + 1);
      const internalGap = profile.media.top - profile.copy.bottom;
      expect(internalGap).toBeGreaterThanOrEqual(20);
      expect(internalGap).toBeLessThanOrEqual(64);
    }
  }

  const firstProfile = layout.profiles[0]?.profile;
  const secondProfile = layout.profiles[1]?.profile;
  const thirdProfile = layout.profiles[2]?.profile;
  if (layout.peopleHeading && firstProfile) {
    const peopleGap = firstProfile.top - layout.peopleHeading.bottom;
    expect(peopleGap).toBeGreaterThanOrEqual(width >= 768 ? 32 : 24);
    expect(peopleGap).toBeLessThanOrEqual(width >= 1200 ? 160 : width >= 768 ? 144 : 112);
  }
  if (firstProfile && secondProfile) {
    const profileGap = secondProfile.top - firstProfile.bottom;
    const minimumProfileGap = width >= 1200 ? 64 : width >= 768 ? 56 : 48;
    expect(profileGap).toBeGreaterThanOrEqual(minimumProfileGap - 1);
    expect(profileGap).toBeLessThanOrEqual(width >= 1200 ? 192 : width >= 768 ? 160 : 112);
  }
  if (secondProfile && thirdProfile) {
    const profileGap = thirdProfile.top - secondProfile.bottom;
    const minimumProfileGap = width >= 1200 ? 64 : width >= 768 ? 56 : 48;
    expect(profileGap).toBeGreaterThanOrEqual(minimumProfileGap - 1);
    expect(profileGap).toBeLessThanOrEqual(width >= 1200 ? 192 : width >= 768 ? 160 : 112);
  }
  if (thirdProfile && layout.capabilitiesHeading) {
    const capabilitiesGap = layout.capabilitiesHeading.top - thirdProfile.bottom;
    expect(capabilitiesGap).toBeGreaterThanOrEqual(width >= 768 ? 48 : 40);
    expect(capabilitiesGap).toBeLessThanOrEqual(width >= 1200 ? 192 : width >= 768 ? 160 : 112);
  }
}

test('the work index has exactly 4, 2, and 2 complete columns', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-project-card]')).toHaveCount(32);
  await expect(page.locator('[data-gallery-remove]')).toHaveCount(0);
  const addedMichaelStill = page.locator('[data-gallery-item-id="michael-native-stop-motion-still"]');
  await expect(addedMichaelStill).toHaveCount(1);
  await expect(addedMichaelStill).toHaveAttribute('data-desktop-column', '4');
  await expect(addedMichaelStill.locator('img')).toHaveAttribute(
    'src',
    /\/media\/images\/michael\/michael_native_stop_motion-poster\.webp$/u,
  );
  expect(await page.locator('.project-card__media').evaluateAll((items) => items.every((item) => {
    const styles = getComputedStyle(item);
    const inner = item.querySelector<HTMLElement>('.project-card__media-inner');
    const innerStyles = inner ? getComputedStyle(inner) : null;
    const afterStyles = getComputedStyle(item, '::after');
    return styles.paddingTop === '0px'
      && styles.borderTopWidth === '0px'
      && innerStyles?.inset === '0px'
      && afterStyles.borderTopWidth === '0px';
  }))).toBe(true);

  await expectGridColumns(page, 1440, 4);
  await expectGridColumns(page, 1024, 2);
  await expectGridColumns(page, 375, 2);
});

test('every standalone gallery photograph opens an image page and never routes through About', async ({ page }) => {
  await page.goto('/');
  const photoLinks = page.locator('[data-gallery-photo-link]');
  await expect(photoLinks).toHaveCount(15);

  const destinations = await photoLinks.evaluateAll((links) => links.map((link) =>
    (link as HTMLAnchorElement).getAttribute('href') || ''));
  expect(destinations.every((href) => /^\/gallery\/[a-z\d-]+$/u.test(href))).toBe(true);
  expect(destinations.some((href) => href.includes('/about'))).toBe(false);

  const destination = destinations[0]!;
  await page.goto(destination);
  await expect(page.locator('[data-gallery-photo-page]')).toBeVisible();
  await expect(page.locator('[data-gallery-photo-primary] img')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/\S/u);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');

  await page.goto('/about');
  await expect(page.locator('[data-about-page] img[src*="/portfolio-expansion/"]')).toHaveCount(0);
  await expect(page.locator('[data-about-work-item][href^="/gallery/"]')).toHaveCount(0);
});

test('static and reduced motion routes defer the full animation runtime', async ({ page }) => {
  const animationRequests: string[] = [];
  page.on('request', (request) => {
    if (/route-runtime|\/vendor(?:\.|\/)|\/gsap(?:\.|\/)/u.test(request.url())) {
      animationRequests.push(request.url());
    }
  });

  await page.goto('/404');
  await expect(page.locator('html')).toHaveAttribute('data-motion-runtime', 'idle');
  expect(animationRequests).toEqual([]);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-motion-runtime', 'static');
  await expect(page.locator('[data-motion-column]').first()).toHaveAttribute('data-motion-ready', 'static');
  expect(animationRequests).toEqual([]);
});

test('the opening gallery eases from an oversized crop to its resting scale', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1_000 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const entrance = page.locator('[data-gallery-entrance]');
  const readScale = () => entrance.evaluate((element) =>
    new DOMMatrixReadOnly(getComputedStyle(element).transform).a);

  await expect(entrance).toHaveAttribute('data-gallery-entrance-state', 'animating');
  await expect(entrance).toHaveAttribute('data-gallery-entrance-delay', '0.45');
  const openingScale = await readScale();
  expect(openingScale).toBeGreaterThan(1.015);
  expect(openingScale).toBeLessThanOrEqual(1.121);
  await expect(entrance).toHaveAttribute('data-gallery-entrance-state', 'settled', { timeout: 3_000 });
  await expect.poll(readScale).toBeGreaterThan(.999);
  await expect.poll(readScale).toBeLessThan(1.001);
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
});

test('the four gallery tracks share one scroll target with subtle first-order momentum', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1_000 });
  await page.goto('/');

  const gallery = page.locator('[data-work-gallery]');
  const plane = page.locator('[data-gallery-plane]');
  await expect(gallery).toHaveAttribute('data-gallery-motion', 'true');
  await expect(gallery).toHaveAttribute('data-column-motion', 'first-order');
  await expect(page.locator('html')).toHaveAttribute('data-motion-preference', 'full');
  await expect(page.locator('[data-motion-column]').first()).toHaveAttribute('data-motion-ready', 'animated');
  await expect(page.locator('[data-gallery-entrance]'))
    .toHaveAttribute('data-gallery-entrance-state', 'settled', { timeout: 3_000 });

  const sampleColumnState = () => page.locator('[data-motion-column]').evaluateAll((cards) => {
    const byLane = new Map<number, { positions: number[]; response: number }>();
    cards.forEach((card) => {
      const element = card as HTMLElement;
      const laneNumber = Number(element.dataset.desktopColumn);
      if (!Number.isFinite(laneNumber)) return;
      const lane = byLane.get(laneNumber) ?? {
        positions: [],
        response: Number(element.dataset.motionColumnResponse),
      };
      lane.positions.push(new DOMMatrixReadOnly(getComputedStyle(element).transform).m42);
      byLane.set(laneNumber, lane);
    });
    return [...byLane.entries()]
      .map(([lane, state]) => ({
        lane,
        response: state.response,
        spread: Math.max(...state.positions) - Math.min(...state.positions),
        y: state.positions[0] ?? 0,
      }))
      .sort((left, right) => left.lane - right.lane);
  });

  const openingColumns = await sampleColumnState();
  expect(openingColumns.map(({ lane }) => lane)).toEqual([1, 2, 3, 4]);
  expect(openingColumns.map(({ response }) => response)).toEqual([0.095, 0.075, 0.125, 0.11]);
  await expect(page.locator('[data-motion-column-weight], [data-motion-column-tablet]')).toHaveCount(0);
  for (const { spread, y } of openingColumns) {
    expect(spread).toBeLessThanOrEqual(0.1);
    expect(Math.abs(y)).toBeLessThanOrEqual(0.1);
  }

  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, 80);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(80);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => {
    requestAnimationFrame(() => resolve());
  })));
  const buildingMomentum = await sampleColumnState();
  const heavyStart = buildingMomentum.find(({ lane }) => lane === 2)?.y ?? 0;
  const quickStart = buildingMomentum.find(({ lane }) => lane === 3)?.y ?? 0;
  expect(heavyStart).toBeGreaterThan(quickStart);
  expect(heavyStart - quickStart).toBeGreaterThan(2);
  for (const { spread, y } of buildingMomentum) {
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThanOrEqual(100);
    expect(spread).toBeLessThanOrEqual(0.1);
  }

  const stoppedScrollTop = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(100);
  const coastingColumns = await sampleColumnState();
  expect(await page.evaluate(() => window.scrollY)).toBe(stoppedScrollTop);
  expect(coastingColumns.find(({ lane }) => lane === 2)?.y ?? 0)
    .toBeGreaterThan(coastingColumns.find(({ lane }) => lane === 3)?.y ?? 0);
  expect(coastingColumns.every(({ y }, index) => y < (buildingMomentum[index]?.y ?? 0))).toBe(true);

  await page.waitForTimeout(2_000);
  const settledColumns = await sampleColumnState();
  expect(settledColumns).toHaveLength(4);
  settledColumns.forEach(({ spread, y }) => {
    expect(spread).toBeLessThanOrEqual(0.1);
    expect(Math.abs(y)).toBeLessThanOrEqual(0.1);
  });

  await page.evaluate(() => window.scrollTo(0, 2_000));
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => {
    requestAnimationFrame(() => resolve());
  })));
  const fastGestureColumns = await sampleColumnState();
  expect(fastGestureColumns.every(({ y }) => y > 0 && y < 99)).toBe(true);
  expect(new Set(fastGestureColumns.map(({ y }) => Math.round(y * 10))).size).toBeGreaterThan(1);
  expect(fastGestureColumns.find(({ lane }) => lane === 2)?.y ?? 0)
    .toBeGreaterThan(fastGestureColumns.find(({ lane }) => lane === 3)?.y ?? 0);

  await page.waitForTimeout(2_000);
  expect((await sampleColumnState()).every(({ y }) => Math.abs(y) <= 0.1)).toBe(true);

  await page.evaluate(() => window.scrollTo(0, 20));
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => {
    requestAnimationFrame(() => resolve());
  })));
  const reversingColumns = await sampleColumnState();
  expect(reversingColumns.every(({ y }) => y < 0)).toBe(true);
  expect(Math.abs(reversingColumns.find(({ lane }) => lane === 2)?.y ?? 0))
    .toBeGreaterThan(Math.abs(reversingColumns.find(({ lane }) => lane === 3)?.y ?? 0));

  await page.waitForTimeout(2_000);
  const reversalSettled = await sampleColumnState();
  expect(reversalSettled.every(({ y }) => Math.abs(y) <= 0.1)).toBe(true);
  expect(await plane.evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m42))
    .toBe(0);

  await page.goto('/?motionDebug=1');
  const debugPanel = page.locator('[data-column-motion-debug]');
  await expect(debugPanel).toBeVisible();
  const debugText = await debugPanel.textContent();
  expect(debugText?.match(/^C\d/gmu)).toHaveLength(4);
  for (const response of ['0.095', '0.075', '0.125', '0.110']) {
    expect(debugText).toContain(`response ${response}`);
  }
  expect(debugText).toContain('target');
  expect(debugText).toContain('filtered');
  expect(debugText).toContain('lag');

  await page.goto('/');
  await expect(page.locator('[data-column-motion-debug]')).toHaveCount(0);
  const transformedScrollStyles = await page.locator('[data-motion-column]').evaluateAll((cards) => {
    const transitions = cards.map((card) => getComputedStyle(card).transitionProperty);
    return {
      hasTransformTransition: transitions.some((value) => value.split(',').map((part) => part.trim()).includes('transform')),
      scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    };
  });
  expect(transformedScrollStyles.hasTransformTransition).toBe(false);
  expect(transformedScrollStyles.scrollBehavior).not.toBe('smooth');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-motion-preference', 'reduced');
  await expect(gallery).not.toHaveAttribute('data-gallery-motion');
  await expect(page.locator('[data-gallery-entrance]'))
    .toHaveAttribute('data-gallery-entrance-state', 'static');
  await expect(page.locator('[data-gallery-entrance]')).toHaveCSS('transform', 'none');
  await expect.poll(() => plane.evaluate((element) => getComputedStyle(element).transform)).toBe('none');
  await expect(page.locator('[data-motion-column]').first()).toHaveAttribute('data-motion-ready', 'static');
  const reducedTransforms = await page.locator('[data-motion-column]').evaluateAll((cards) => cards.map((card) =>
    getComputedStyle(card).transform));
  expect(new Set(reducedTransforms)).toEqual(new Set(['none']));
  await expect(page.locator('[data-card-cursor-label]')).toHaveCount(0);
});

test('the desktop gallery follows left and right pointer movement without overflow or scroll hijacking', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1_000 });
  await page.goto('/');

  await expect(page.locator('[data-gallery-entrance]'))
    .toHaveAttribute('data-gallery-entrance-state', 'settled', { timeout: 3_000 });

  const finePointer = await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches);
  test.skip(!finePointer, 'Pointer-following motion is intentionally omitted on coarse pointers.');

  const gallery = page.locator('[data-work-gallery]');
  const plane = page.locator('[data-gallery-plane]');
  const firstCard = gallery.locator('[data-project-card]').first();
  await firstCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  const galleryBox = await gallery.boundingBox();
  const cardBox = await firstCard.boundingBox();
  if (!galleryBox || !cardBox) throw new Error('The work gallery is not visible.');

  const pointerY = cardBox.y + Math.min(cardBox.height * .5, 24);
  const openingScroll = await page.evaluate(() => window.scrollY);
  const horizontalTransform = () => plane.evaluate((element) =>
    new DOMMatrixReadOnly(getComputedStyle(element).transform).m41);

  await page.mouse.move(galleryBox.x + 2, pointerY);
  await expect.poll(horizontalTransform).toBeGreaterThan(24);
  const leftTransform = await horizontalTransform();
  expect(leftTransform).toBeLessThanOrEqual(36.5);

  await page.mouse.move(galleryBox.x + galleryBox.width - 2, pointerY);
  await expect.poll(horizontalTransform).toBeLessThan(-24);
  const rightTransform = await horizontalTransform();
  expect(rightTransform).toBeGreaterThanOrEqual(-36.5);
  expect(Math.sign(leftTransform)).toBe(1);
  expect(Math.sign(rightTransform)).toBe(-1);

  const rightEdgeState = await page.evaluate(() => {
    const galleryElement = document.querySelector<HTMLElement>('[data-work-gallery]');
    const planeElement = document.querySelector<HTMLElement>('[data-gallery-plane]');
    if (!galleryElement || !planeElement) throw new Error('Gallery motion elements are missing.');
    const galleryRect = galleryElement.getBoundingClientRect();
    const planeRect = planeElement.getBoundingClientRect();
    return {
      scrollY: window.scrollY,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      pointerX: Number.parseFloat(getComputedStyle(galleryElement).getPropertyValue('--gallery-pointer-x')),
      clippedOnBothSides:
        planeRect.left < galleryRect.left - 4 && planeRect.right > galleryRect.right + 4,
    };
  });
  expect(rightEdgeState.scrollY).toBe(openingScroll);
  expect(rightEdgeState.scrollWidth).toBeLessThanOrEqual(rightEdgeState.clientWidth);
  expect(rightEdgeState.clippedOnBothSides).toBe(true);
  expect(Math.abs(rightEdgeState.pointerX)).toBeLessThanOrEqual(36.5);

  await page.mouse.move(10, 10);
  await expect.poll(horizontalTransform).toBeGreaterThan(-0.5);
  await expect.poll(horizontalTransform).toBeLessThan(0.5);
});

test('card, navigation, and related-project hover treatments have keyboard-focus equivalents', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1_000 });
  await page.goto('/');

  const firstCard = page.locator('[data-project-link]').first();
  const overlay = firstCard.locator('.project-card__label--overlay');
  const media = firstCard.locator('[data-card-media]');
  const maskedTitle = overlay.locator('.project-card__label-mask > span');
  await firstCard.focus();
  await expect(media).toHaveCSS('transition-duration', '0.72s');
  await expect(media).toHaveCSS('transition-timing-function', 'cubic-bezier(0.4, 0, 0.2, 1)');
  await expect(overlay).toHaveCSS('opacity', '1');
  await expect(maskedTitle).toHaveCount(1);
  await expect(maskedTitle).toHaveText('Arc');
  await expect(firstCard.locator('.project-card__label-action')).toHaveCount(0);
  await expect(firstCard.locator('.project-card__label--touch')).toHaveCount(0);
  await expect.poll(() => maskedTitle.evaluateAll((labels) => labels.every((label) => {
    const styles = getComputedStyle(label);
    return Number(styles.opacity) > .99
      && Math.abs(new DOMMatrixReadOnly(styles.transform).m42) < .5;
  }))).toBe(true);
  await expect.poll(() => media.evaluate((element) =>
    new DOMMatrixReadOnly(getComputedStyle(element).transform).a)).toBeGreaterThan(1);
  const focusedScale = await media.evaluate((element) =>
    new DOMMatrixReadOnly(getComputedStyle(element).transform).a);
  expect(focusedScale).toBeGreaterThan(1);
  expect(focusedScale).toBeLessThanOrEqual(1.02);

  const finePointer = await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches);
  if (finePointer) {
    await expect(page.locator('[data-work-gallery]')).toHaveAttribute('data-gallery-motion', 'true');
    await firstCard.evaluate((element) => element.blur());
    await page.mouse.move(4, 4);
    // Use a later card for pointer checks so the deliberately overlapping title
    // stage does not sit above the sampled coordinates of the opening card.
    const pointerCard = page.locator('[data-project-link]').nth(10);
    const pointerOverlay = pointerCard.locator('.project-card__label--overlay');
    const pointerMedia = pointerCard.locator('[data-card-media]');
    await pointerCard.evaluate((element) => element.scrollIntoView({ block: 'center' }));
    await expect.poll(() => pointerCard.evaluate((element) => {
      const card = element.closest<HTMLElement>('[data-project-card]');
      return card
        ? Math.abs(new DOMMatrixReadOnly(getComputedStyle(card).transform).m42)
        : 0;
    })).toBeLessThan(0.1);
    const pointerMediaFrame = pointerCard.locator('.project-card__media');
    const mediaBox = await pointerMediaFrame.boundingBox();
    if (!mediaBox) throw new Error('The first card media is not visible.');
    const readPan = () => pointerMedia.evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        x: Number.parseFloat(styles.getPropertyValue('--card-pan-x')) || 0,
        y: Number.parseFloat(styles.getPropertyValue('--card-pan-y')) || 0,
      };
    });

    await pointerMediaFrame.hover({
      position: { x: mediaBox.width * .15, y: mediaBox.height * .15 },
    });
    await expect(pointerOverlay).toHaveCSS('opacity', '1');
    await expect.poll(() => pointerMedia.evaluate((element) =>
      new DOMMatrixReadOnly(getComputedStyle(element).transform).a)).toBeGreaterThan(1);
    await expect(page.locator('[data-card-cursor-label]')).toHaveCount(0);
    const upperLeftPan = await readPan();
    expect(upperLeftPan.x).toBeLessThan(0);
    expect(upperLeftPan.y).toBeLessThan(0);

    await pointerMediaFrame.hover({
      position: { x: mediaBox.width * .85, y: mediaBox.height * .85 },
    });
    await expect.poll(async () => (await readPan()).x).toBeGreaterThan(0);
    const lowerRightPan = await readPan();
    expect(lowerRightPan.y).toBeGreaterThan(0);
    expect(Math.abs(lowerRightPan.x)).toBeLessThanOrEqual(5.05);
    expect(Math.abs(lowerRightPan.y)).toBeLessThanOrEqual(5.05);

    await page.mouse.move(4, 4);
    await expect.poll(async () => Math.abs((await readPan()).x) + Math.abs((await readPan()).y)).toBeLessThan(.1);
  }

  const aboutLink = page.locator('.desktop-nav__link', { hasText: 'About' });
  await aboutLink.focus();
  await expect.poll(() => aboutLink.evaluate((element) =>
    new DOMMatrixReadOnly(getComputedStyle(element, '::after').transform).a)).toBeGreaterThan(0.95);

  await page.goto('/work/native-cucumber-mint-stop-motion');
  const related = page.locator('.related-projects__grid > a').first();
  await related.scrollIntoViewIfNeeded();
  await related.focus();
  const relatedImage = related.locator('img');
  const relatedCopy = related.locator('.related-projects__copy');
  await expect.poll(() => relatedImage.evaluate((element) =>
    new DOMMatrixReadOnly(getComputedStyle(element).transform).a)).toBeGreaterThan(1);
  await expect.poll(() => relatedCopy.evaluate((element) =>
    new DOMMatrixReadOnly(getComputedStyle(element).transform).m41)).toBeLessThan(0);
  const relatedScale = await relatedImage.evaluate((element) =>
    new DOMMatrixReadOnly(getComputedStyle(element).transform).a);
  const copyShift = await relatedCopy.evaluate((element) =>
    new DOMMatrixReadOnly(getComputedStyle(element).transform).m41);
  expect(relatedScale).toBeGreaterThan(1);
  expect(relatedScale).toBeLessThanOrEqual(1.02);
  expect(copyShift).toBeLessThan(0);
});

test('the manifesto reveals letters in direct proportion to reversible page scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1_000 });
  await page.goto('/');
  const manifesto = page.locator('[data-manifesto]');
  const statement = manifesto.locator('p:not(.sr-only)');

  await expect(manifesto.locator('.manifesto__meta')).toHaveCount(0);
  await expect(manifesto).not.toContainText('NW / 001');
  await expect(statement).toHaveAttribute('data-motion-split', 'scroll-letters');
  await expect(statement).toHaveAttribute('data-motion-split-ready', 'animated');
  const opening = await statement.evaluate((element) => {
    const lines = [...element.querySelectorAll<HTMLElement>('.motion-line')];
    const chars = [...element.querySelectorAll<HTMLElement>('.motion-char')];
    const style = getComputedStyle(element);
    return {
      text: element.textContent?.trim() || '',
      textTransform: style.textTransform,
      width: element.getBoundingClientRect().width,
      lineCount: lines.length,
      charCount: chars.length,
      visibleChars: chars.filter((char) => Number(getComputedStyle(char).opacity) >= .5).length,
    };
  });
  expect(opening.text).toMatch(/^Lorem ipsum/u);
  expect(opening.text).not.toMatch(/^LOREM IPSUM/u);
  expect(opening.textTransform).toBe('none');
  expect(opening.width).toBeGreaterThan(900);
  expect(opening.lineCount).toBeGreaterThan(1);
  expect(opening.charCount).toBeGreaterThan(40);
  expect(opening.visibleChars).toBe(0);

  const visibleCharacters = () => statement.evaluate((element) =>
    [...element.querySelectorAll<HTMLElement>('.motion-char')]
      .filter((char) => Number(getComputedStyle(char).opacity) >= .5).length);
  await manifesto.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await expect.poll(visibleCharacters).toBeGreaterThan(0);
  const midpointCount = await visibleCharacters();
  expect(midpointCount).toBeLessThan(opening.charCount);

  await page.evaluate(() => window.scrollBy(0, window.innerHeight * .55));
  await expect.poll(visibleCharacters).toBeGreaterThan(midpointCount);
  const forwardCount = await visibleCharacters();

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(visibleCharacters).toBeLessThan(forwardCount);
  await expect.poll(visibleCharacters).toBe(0);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(statement).toHaveAttribute('data-motion-split-ready', 'static');
  await expect(statement.locator('.motion-char')).toHaveCount(0);
  await expect(statement).toHaveCSS('opacity', '1');
});

test('prototype filler copy completes the editorial review surfaces without enabling gated modules', async ({ page }) => {
  await page.goto('/about');
  await expect(page.locator('.about-intro__lead')).toContainText('Lorem ipsum dolor sit amet');
  await expect(page.locator('.capabilities li')).toHaveCount(4);
  await expect(page.locator('.about-intro__meta')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('Information');

  await page.goto('/contact');
  await expect(page.getByRole('link', { name: 'hello@lorem.ipsum' })).toHaveCount(1);
  await expect(page.locator('.contact-content').getByRole('link', { name: 'hello@lorem.ipsum' }))
    .toHaveAttribute('href', 'mailto:hello@lorem.ipsum');
  await expect(page.locator('[data-site-footer]').getByRole('link', { name: 'hello@lorem.ipsum' })).toHaveCount(0);
  await expect(page.locator('.social-list a')).toHaveCount(2);
  await expect(page.locator('.utility-content__meta')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('Information');

  await page.goto('/work/arc');
  await expect(page.locator('.project-header__description')).toContainText('Lorem ipsum dolor sit amet');
  await expect(page.getByText('Role').locator('..')).toContainText('Lorem ipsum');
  await expect(page.locator('.project-disclosures details')).toHaveCount(2);

  await page.goto('/');
  await expect(page.locator('[data-manifesto]')).toContainText('Lorem ipsum dolor sit amet');
  await expect(page.locator('.reel')).toHaveCount(0);
  await expect(page.locator('.notes-strip')).toHaveCount(0);
});

test('the About page presents Michael, Oliver, and Anjali as a responsive editorial sequence with reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const viewport of [
    { width: 1440, height: 1_000 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
    { width: 320, height: 700 },
  ]) {
    await expectAboutLayout(page, viewport.width, viewport.height);
  }
});

test('About portfolio mosaics keep rectangular crops on hover and focus', async ({ page }) => {
  test.setTimeout(45_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1_000 });
  await page.goto('/about');
  test.skip(
    !await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches),
    'Tile emphasis is a fine-pointer enhancement.',
  );

  for (const owner of ['oliver', 'michael', 'anjali'] as const) {
    const profile = page.locator(`[data-about-person="${owner}"]`);
    const gallery = profile.locator('[data-about-mosaic]');
    const items = gallery.locator('[data-about-work-item]');
    const expectedItems = owner === 'anjali' ? 4 : 5;
    await expect(items).toHaveCount(expectedItems);
    await gallery.scrollIntoViewIfNeeded();

    const initial = await gallery.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const items = [...element.querySelectorAll<HTMLElement>('[data-about-work-item]')];
      return {
        box: { width: box.width, height: box.height },
        clips: items.map((item) => getComputedStyle(item).clipPath),
        bounds: items.map((item) => {
          const itemBox = item.getBoundingClientRect();
          return { width: itemBox.width, height: itemBox.height };
        }),
      };
    });
    expect(initial.box.width).toBeGreaterThan(500);
    expect(initial.box.height).toBeGreaterThan(400);
    expect(initial.clips.every((clip) => clip === 'none')).toBe(true);
    expect(initial.bounds.every((box) =>
      box.width < initial.box.width && box.height <= initial.box.height)).toBe(true);

    const pointerBox = await gallery.boundingBox();
    if (!pointerBox) throw new Error(`${owner} mosaic is missing its rendered bounds.`);
    await page.mouse.move(pointerBox.x + pointerBox.width * .12, pointerBox.y + pointerBox.height * .12);
    await expect(items.first().locator('.about-work__caption')).toHaveCSS('opacity', '1');
    expect(await items.evaluateAll((links) => links.every((link) =>
      getComputedStyle(link).clipPath === 'none'))).toBe(true);
    const hoveredVisual = await items.first().locator('.about-work__visual').evaluate((element) =>
      new DOMMatrixReadOnly(getComputedStyle(element).transform).a);
    expect(hoveredVisual).toBeGreaterThan(1.02);
    const after = await gallery.boundingBox();
    expect(after?.width).toBeCloseTo(initial.box.width, 0);
    expect(after?.height).toBeCloseTo(initial.box.height, 0);

    await items.last().focus();
    await expect(items.last().locator('.about-work__caption')).toHaveCSS('opacity', '1');
    await page.mouse.move(2, 2);
  }
});

test('key routes render without editorial markers and remain noindex in prototype mode', async ({ page }) => {
  const routes = [
    { path: '/', heading: 'Selected work', statuses: [200] },
    { path: '/about', heading: 'About', statuses: [200] },
    { path: '/contact', heading: 'Contact', statuses: [200] },
    { path: '/work/arc', heading: 'Arc', statuses: [200] },
    { path: '/work/mercury-an-unexpected-life', heading: 'Mercury — An Unexpected Life', statuses: [200] },
    { path: '/work/adobe', heading: 'Adobe', statuses: [200] },
    { path: '/404', heading: 'This page isn’t here.', statuses: [200, 404] },
  ];

  for (const route of routes) {
    const response = await page.goto(route.path);
    expect(route.statuses, `${route.path} should return an expected status`).toContain(response?.status());
    await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeAttached();
    await expect(page.locator('.prototype-banner')).toHaveCount(0);
    await expect(page.locator('.draft-badge, .media-review-note, .prototype-media-note')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
    await expect(page.locator('body')).toHaveClass(/prototype-mode/u);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
  }

  await page.goto('/');
  await expect(page.getByText('Chanel Test', { exact: true }).first()).toBeAttached();
  for (const slug of ['adobe', 'stella-artois-daydream', 'rakuten']) {
    await expect(page.locator(`[data-project-link][href="/work/${slug}"]`)).toHaveCount(1);
  }
  await expect(page.getByText('Do Not Publish Without Approval')).toHaveCount(0);
});

test('an unknown route uses the branded 404 recovery page', async ({ page }) => {
  const response = await page.goto('/this-route-does-not-exist');

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: 'This page isn’t here.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return to all work' })).toHaveAttribute('href', '/');
});

test('Anjali previews stay local while full project films use click-to-load Vimeo players', async ({ page }) => {
  const films = [
    {
      slug: 'adobe',
      preview: '/media/video-previews/anjali/adobe-what-whack-wears-gallery-cut-08s.mp4',
      vimeoId: '720040595',
    },
    {
      slug: 'stella-artois-daydream',
      preview: '/media/video-previews/anjali/stella-artois-daydream-gallery-cut-06s.mp4',
      vimeoId: '439413250',
    },
    {
      slug: 'rakuten',
      preview: '/media/video-previews/anjali/rakuten-duet-gallery-cut-08s.mp4',
      vimeoId: '479336941',
    },
  ];

  await page.goto('/');
  for (const film of films) {
    const preview = page.locator(`[data-project-slug="${film.slug}"] [data-preview-video]`);
    await expect(preview).toHaveAttribute('data-source', film.preview);
    expect(await preview.evaluate((video) => ({
      muted: (video as HTMLVideoElement).muted,
      loop: (video as HTMLVideoElement).loop,
      controls: (video as HTMLVideoElement).controls,
    }))).toEqual({ muted: true, loop: true, controls: false });

    await page.goto(`/work/${film.slug}`);
    const heroSource = page.locator('[data-project-hero-media] source[data-deferred-source]');
    const projectVideo = page.locator('.media-stream [data-lazy-embed]');
    await expect(heroSource).toHaveAttribute('data-src', film.preview);
    await expect(projectVideo).toHaveAttribute(
      'data-embed-url',
      new RegExp(`player\\.vimeo\\.com/video/${film.vimeoId}`, 'u'),
    );
    await expect(projectVideo.locator('iframe')).toHaveCount(0);
    await expect(projectVideo.locator(`a[href="https://vimeo.com/${film.vimeoId}"]`))
      .toHaveCount(1);

    await page.goto('/');
  }
});

test('prototype SEO blocks crawling, omits its sitemap, and never promotes a project cover to a share image', async ({ page }) => {
  const robots = await page.request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toBe('User-agent: *\nDisallow: /\n');

  const sitemap = await page.request.get('/sitemap-index.xml');
  expect(sitemap.status()).toBe(404);

  await page.goto('/work/arc');
  const canonicalHref = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canonicalHref).toBeTruthy();
  const canonicalUrl = new URL(canonicalHref || 'http://invalid.local');
  expect(canonicalUrl.pathname).toBe('/work/arc');
  expect(canonicalUrl.search).toBe('');
  expect(canonicalUrl.hash).toBe('');
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);

  await page.goto('/404');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
});

test('still-led and motion-led work share the project template without an empty film frame', async ({ page }) => {
  await page.goto('/work/arc');
  await expect(page.locator('body')).toHaveClass(/project-page/u);
  await expect(page.locator('.project-header')).toBeVisible();
  await expect(page.locator(
    '[data-project-header] [data-project-hero-media][data-first-media="true"] .media-block--hero',
  )).toHaveCount(1);
  await expect(page.locator('.media-stream [data-first-media="true"]')).toHaveCount(0);
  await expect(page.locator('.media-stream video, .media-stream iframe')).toHaveCount(0);
  await expect(page.locator('[data-project-placeholder-content]')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Project navigation' })).toBeVisible();

  await page.goto('/work/mercury-an-unexpected-life');
  await expect(page.locator('body')).toHaveClass(/project-page/u);
  await expect(page.locator('.project-header')).toBeVisible();
  await expect(page.locator(
    '[data-project-header] [data-project-hero-media][data-first-media="true"] .media-block--loop',
  )).toHaveCount(1);
  await expect(page.locator('.media-stream [data-first-media="true"]')).toHaveCount(0);
  const bodyFilm = page.locator('.media-stream .lazy-embed');
  await bodyFilm.scrollIntoViewIfNeeded();
  await expect(bodyFilm.locator('.lazy-embed__poster .responsive-image')).toBeVisible();
  await expect(bodyFilm.locator('.lazy-embed__poster .media-placeholder')).toHaveCount(0);
  await expect(bodyFilm.locator('iframe')).toHaveCount(0);
  await expect(page.getByText('Film playback is unavailable. The poster remains visible.')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Project navigation' })).toBeVisible();
});

test('project heroes pair left-hand copy with the gallery media and keep body content below', async ({ page }) => {
  const routes = [
    '/work/arc',
    '/work/mercury-an-unexpected-life',
  ];

  for (const route of routes) {
    await page.setViewportSize({ width: 1440, height: 1_000 });
    await page.goto(route);

    const hero = page.locator(
      '[data-project-header] [data-project-hero-media][data-first-media="true"]',
    );
    await expect(hero).toHaveCount(1);
    await expect(hero).toBeVisible();
    await expect(page.locator('[data-first-media="true"]')).toHaveCount(1);
    await expect(page.locator('.media-stream [data-project-hero-media], .media-stream [data-first-media="true"]'))
      .toHaveCount(0);

    const desktopGeometry = await page.locator('[data-project-header]').evaluate((header) => {
      const media = header.querySelector<HTMLElement>('[data-project-hero-media]');
      const copyNodes = Array.from(header.querySelectorAll<HTMLElement>(
        '.project-header__title, .project-header__context, .project-header__description',
      ));
      if (!media || copyNodes.length === 0) throw new Error('The composed project hero is incomplete.');
      const mediaBox = media.getBoundingClientRect();
      const copyBoxes = copyNodes.map((node) => node.getBoundingClientRect());
      return {
        media: {
          left: mediaBox.left,
          right: mediaBox.right,
          top: mediaBox.top,
          bottom: mediaBox.bottom,
          width: mediaBox.width,
          height: mediaBox.height,
        },
        copyRight: Math.max(...copyBoxes.map((box) => box.right)),
        copyTop: Math.min(...copyBoxes.map((box) => box.top)),
        copyBottom: Math.max(...copyBoxes.map((box) => box.bottom)),
        viewport: { width: window.innerWidth, height: window.innerHeight },
      };
    });

    expect(desktopGeometry.media.width).toBeGreaterThan(0);
    expect(desktopGeometry.media.height).toBeGreaterThan(0);
    expect(desktopGeometry.media.left).toBeGreaterThanOrEqual(desktopGeometry.copyRight - 1);
    expect(desktopGeometry.media.left).toBeGreaterThan(desktopGeometry.viewport.width * .4);
    expect(desktopGeometry.media.right).toBeLessThanOrEqual(desktopGeometry.viewport.width + 1);
    expect(desktopGeometry.media.top).toBeLessThan(desktopGeometry.copyBottom);
    expect(desktopGeometry.media.bottom).toBeGreaterThan(desktopGeometry.copyTop);
    expect(desktopGeometry.media.top).toBeLessThan(desktopGeometry.viewport.height);

    const heroSource = await hero.locator('img').first().getAttribute('src');
    expect(heroSource).toBeTruthy();
    const bodySources = await page.locator('.media-stream img').evaluateAll((images) => images.map((image) =>
      image.getAttribute('src')));
    if (route === '/work/arc') expect(bodySources).not.toContain(heroSource);
    await expect(page.locator('.media-stream [data-project-block], [data-project-placeholder-content]').first())
      .toBeAttached();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    })));
    const mobileGeometry = await page.locator('[data-project-header]').evaluate((header) => {
      const media = header.querySelector<HTMLElement>('[data-project-hero-media]');
      const copyNodes = Array.from(header.querySelectorAll<HTMLElement>(
        '.project-header__title, .project-header__context, .project-header__description',
      ));
      if (!media || copyNodes.length === 0) throw new Error('The composed project hero is incomplete.');
      const mediaBox = media.getBoundingClientRect();
      const copyBoxes = copyNodes.map((node) => node.getBoundingClientRect());
      return {
        media: { left: mediaBox.left, right: mediaBox.right, top: mediaBox.top },
        copyBottom: Math.max(...copyBoxes.map((box) => box.bottom)),
        viewportWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(mobileGeometry.media.top).toBeGreaterThanOrEqual(mobileGeometry.copyBottom - 1);
    expect(mobileGeometry.media.top - mobileGeometry.copyBottom).toBeLessThanOrEqual(56);
    expect(mobileGeometry.media.left).toBeGreaterThanOrEqual(-1);
    expect(mobileGeometry.media.right).toBeLessThanOrEqual(mobileGeometry.viewportWidth + 1);
    expect(mobileGeometry.scrollWidth).toBeLessThanOrEqual(mobileGeometry.viewportWidth);
  }
});

test('all four project presentation variants expose stable route markers', async ({ page }) => {
  const variants = [
    {
      path: '/work/mercury-an-unexpected-life',
      variant: 'cinematic',
      marker: '.project-template--cinematic',
    },
    {
      path: '/work/arc',
      variant: 'photoEssay',
      marker: '.project-template__essay-intro',
    },
    {
      path: '/work/tour-de-france-x-toyota',
      variant: 'campaign',
      marker: '.project-deliverables',
    },
    {
      path: '/work/native-cucumber-mint-stop-motion',
      variant: 'experimental',
      marker: '.project-template__experimental-intro',
    },
  ] as const;

  for (const { path, variant, marker } of variants) {
    await page.goto(path);
    await expect(page.locator(`[data-project-template="${variant}"]`)).toBeVisible();
    await expect(page.locator(marker)).toBeAttached();
    await expect(page.locator('.project-index, .project-template__accent-key'))
      .toHaveCount(0);
    await expect(page.locator(
      '[data-project-header] [data-project-hero-media][data-first-media="true"]',
    )).toHaveCount(1);
    await expect(page.locator('.media-stream [data-first-media="true"]')).toHaveCount(0);
  }
});

test('every fixture project has one gallery-derived hero and populated lower content', async ({ page }) => {
  await page.goto('/');
  const routes = await page.locator('[data-project-link]').evaluateAll((links) => [
    ...new Set(links.map((link) => link.getAttribute('href')).filter((href): href is string => Boolean(href))),
  ]);
  expect(routes).toHaveLength(19);

  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('.project-index, .project-template__accent-key'))
      .toHaveCount(0);
    const hero = page.locator(
      '[data-project-header] [data-project-hero-media][data-first-media="true"]',
    );
    await expect(hero, `${route} should have one composed hero`).toHaveCount(1);
    await expect(hero.locator('img'), `${route} should retain its gallery poster`).toHaveCount(1);
    await expect(page.locator('.media-stream [data-first-media="true"]')).toHaveCount(0);
    await expect(page.locator('[data-project-placeholder-content]')).toBeAttached();
    expect(await page.locator('.media-stream [data-project-block], [data-project-placeholder-content]').count())
      .toBeGreaterThan(0);
  }
});

test('ClientRouter navigation shares project media names and restores the originating work position', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1_000 });
  await page.addInitScript(() => {
    const routeWindow = window as typeof window & { __qaRouteEvents?: string[] };
    routeWindow.__qaRouteEvents = [];
    for (const eventName of ['astro:before-swap', 'astro:after-swap', 'astro:page-load']) {
      document.addEventListener(eventName, () => routeWindow.__qaRouteEvents?.push(eventName));
    }
  });
  await page.goto('/');

  const projectLink = page.locator('[data-project-link]').nth(10);
  const projectSlug = await projectLink.getAttribute('data-project-slug');
  if (!projectSlug) throw new Error('The final project card is missing its route slug.');
  await projectLink.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await expect.poll(() => projectLink.evaluate((element) => {
    const card = element.closest<HTMLElement>('[data-project-card]');
    return card ? Math.abs(new DOMMatrixReadOnly(getComputedStyle(card).transform).m42) : 0;
  })).toBeLessThan(.1);
  const originScroll = await page.evaluate(() => window.scrollY);
  expect(originScroll).toBeGreaterThan(400);

  const cardTransitionName = await projectLink.locator('.project-card__media').evaluate((element) =>
    getComputedStyle(element).viewTransitionName);
  expect(cardTransitionName).toBe(`project-${projectSlug}-media`);

  await projectLink.click();
  await page.waitForURL(`**/work/${projectSlug}`);
  await expect(page.locator('[data-project-template]')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-motion-route', `/work/${projectSlug}`);
  const projectTransitionName = await page.locator(
    '[data-project-hero-media][data-first-media="true"]',
  ).evaluate((element) =>
    getComputedStyle(element).viewTransitionName);
  expect(projectTransitionName).toBe(cardTransitionName);
  const routeEvents = await page.evaluate(() =>
    (window as typeof window & { __qaRouteEvents?: string[] }).__qaRouteEvents ?? []);
  expect(routeEvents).toContain('astro:before-swap');
  expect(routeEvents).toContain('astro:after-swap');
  expect(routeEvents).toContain('astro:page-load');
  await expect(page.locator('.astro-route-announcer')).toBeAttached();

  await page.goBack();
  await page.waitForURL(/\/$/u);
  await expect(page.locator('[data-project-grid]')).toBeVisible();
  await expect(page.locator('[data-work-gallery]')).toHaveAttribute('data-gallery-restore', 'true');
  await expect(page.locator('[data-gallery-entrance]'))
    .toHaveAttribute('data-gallery-entrance-state', 'settled');
  await expect(page.locator('[data-gallery-entrance]')).toHaveCSS('transform', 'none');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(originScroll - 160);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(originScroll + 160);
  await expect(projectLink).toBeInViewport();

  await expect(page.locator('[data-card-cursor-label]')).toHaveCount(0);

  await projectLink.click();
  await page.waitForURL(`**/work/${projectSlug}`);
  const returnLink = page.locator('[data-project-return][data-restore-work-scroll]');
  await returnLink.scrollIntoViewIfNeeded();
  await returnLink.click();
  await page.waitForURL(/\/$/u);
  await expect(projectLink).toBeInViewport();
  const restoredOrigin = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem('new-work-origin') || '{}') as { slug?: string; scrollY?: number });
  expect(restoredOrigin.slug).toBe(projectSlug);
  expect(restoredOrigin.scrollY).toBeGreaterThan(400);
});

test('related project cards preserve poster geometry and keep their labels together', async ({ page }) => {
  await page.goto('/work/native-cucumber-mint-stop-motion');

  const cards = page.locator('.related-projects__grid > a');
  await expect(cards).toHaveCount(2);
  await cards.first().scrollIntoViewIfNeeded();
  const relatedImages = page.locator('.related-projects img');
  await expect.poll(() => relatedImages.evaluateAll((images) => images
    .every((image) => (image as HTMLImageElement).complete))).toBe(true);
  await relatedImages.evaluateAll(async (images) => {
    await Promise.all(images.map((image) => (image as HTMLImageElement).decode().catch(() => undefined)));
  });

  for (const card of await cards.all()) {
    const geometry = await card.evaluate((element) => {
      const frame = element.querySelector<HTMLElement>('.responsive-image');
      const image = element.querySelector<HTMLImageElement>('img');
      const eyebrow = element.querySelector<HTMLElement>('.eyebrow');
      const title = element.querySelector<HTMLElement>('strong');
      if (!frame || !image || !eyebrow || !title) throw new Error('Related project card is incomplete.');

      const frameBox = frame.getBoundingClientRect();
      const imageBox = image.getBoundingClientRect();
      const eyebrowBox = eyebrow.getBoundingClientRect();
      const titleBox = title.getBoundingClientRect();
      return {
        frameHeight: frameBox.height,
        imageHeight: imageBox.height,
        renderedRatio: imageBox.width / imageBox.height,
        naturalRatio: image.naturalWidth / image.naturalHeight,
        copyGap: titleBox.top - eyebrowBox.bottom,
        bottomAlignment: Math.abs(titleBox.bottom - imageBox.bottom),
      };
    });

    expect(Math.abs(geometry.frameHeight - geometry.imageHeight)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.renderedRatio - geometry.naturalRatio)).toBeLessThanOrEqual(0.02);
    expect(geometry.copyGap).toBeGreaterThanOrEqual(0);
    expect(geometry.copyGap).toBeLessThanOrEqual(12);
    expect(geometry.bottomAlignment).toBeLessThanOrEqual(2);
  }
});

test('a failed first-party image leaves a titled fallback without collapsing the project', async ({ page }) => {
  await page.route('**/media/images/michael/michael_arc_product*', (route) => route.abort());
  await page.goto('/work/arc');

  const fallback = page.locator('[data-project-hero-media] [data-error-media]');
  await expect(fallback).toBeVisible();
  await expect(fallback).toContainText('Image unavailable');
  await expect(fallback).toContainText('project information remains available');
  expect((await fallback.boundingBox())?.height ?? 0).toBeGreaterThan(40);
  await expect(page.getByRole('heading', { level: 1, name: 'Arc' })).toBeVisible();
});

test('disabled Reel and Notes leave no module, heading, navigation item, or Notes route', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.reel, [data-reel-shell]')).toHaveCount(0);
  await expect(page.locator('[data-notes-strip]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Reel' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Notes' })).toHaveCount(0);
  await expect(page.locator('[data-site-header] a', { hasText: 'Notes' })).toHaveCount(0);

  const notesResponse = await page.request.get('/notes');
  expect(notesResponse.status()).toBe(404);
});

test('the mobile menu opens from the keyboard, traps focus, closes on Escape, and restores focus', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  const trigger = page.locator('[data-menu-trigger]');
  const disclosure = page.locator('[data-mobile-menu]');
  const panel = page.locator('[data-menu-panel]');
  const close = page.locator('[data-menu-close]');
  const lastLink = page.locator('[data-menu-link]').last();

  await trigger.focus();
  await expect(trigger).toBeFocused();
  await trigger.press('Enter');

  await expect(disclosure).toHaveAttribute('open', '');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(panel).toHaveAttribute('role', 'dialog');
  await expect(panel).toHaveAttribute('aria-modal', 'true');
  await expect(close).toBeFocused();
  await expect(page.locator('body')).toHaveClass(/has-open-mobile-menu/u);

  await page.keyboard.press('Shift+Tab');
  await expect(lastLink).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(disclosure).not.toHaveAttribute('open', '');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
  await expect(page.locator('body')).not.toHaveClass(/has-open-mobile-menu/u);
});

test('reduced motion keeps preview and project loops static', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('data-motion-preference', 'reduced');
  await expect(page.locator('[data-logo-intro]')).toHaveAttribute('data-state', 'settled');
  await expect(page.locator('[data-intro-media]')).toHaveCSS('display', 'none');
  await expect(page.locator('[data-intro-video-source]')).not.toHaveAttribute('src');
  await expect(page.locator('[data-work-gallery]')).not.toHaveAttribute('data-gallery-motion');
  await expect(page.locator('[data-gallery-entrance]'))
    .toHaveAttribute('data-gallery-entrance-state', 'static');
  await expect(page.locator('[data-gallery-entrance]')).toHaveCSS('transform', 'none');
  await expect(page.locator('[data-motion-column]').first()).toHaveAttribute('data-motion-ready', 'static');
  expect(await page.locator('[data-motion-column]').evaluateAll((cards) => cards.every((card) =>
    getComputedStyle(card).transform === 'none'))).toBe(true);
  await expect(page.locator('[data-card-cursor-label]')).toHaveCount(0);
  await expect(page.locator('[data-preview-video]').first()).toBeAttached();
  await expect(page.locator('[data-preview-shell]').first()).toHaveCSS('display', 'none');
  expect(await page.locator('[data-preview-video]').evaluateAll((videos) =>
    videos.filter((video) => video.hasAttribute('src') || (video as HTMLVideoElement).currentSrc).length,
  )).toBe(0);

  await page.goto('/work/native-cucumber-mint-stop-motion');
  const shortLoop = page.locator('[data-short-loop]');
  await expect(shortLoop).toBeAttached();
  await expect(shortLoop).not.toHaveAttribute('src', /.+/u);
});

test('Save-Data keeps preview and project loop sources unattached', async ({ page }) => {
  const animationRequests: string[] = [];
  page.on('request', (request) => {
    if (/route-runtime|\/vendor(?:\.|\/)|\/gsap(?:\.|\/)/u.test(request.url())) {
      animationRequests.push(request.url());
    }
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true },
    });
  });
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-motion-data-preference', 'reduced');
  await expect(page.locator('html')).toHaveAttribute('data-motion-runtime', 'static');
  await expect(page.locator('[data-work-gallery]')).not.toHaveAttribute('data-gallery-motion');
  await expect(page.locator('[data-gallery-entrance]'))
    .toHaveAttribute('data-gallery-entrance-state', 'static');
  await expect(page.locator('[data-gallery-entrance]')).toHaveCSS('transform', 'none');
  await expect(page.locator('[data-motion-column]').first()).toHaveAttribute('data-motion-ready', 'static');
  expect(await page.locator('[data-preview-video]').evaluateAll((videos) =>
    videos.filter((video) => video.hasAttribute('src') || (video as HTMLVideoElement).currentSrc).length,
  )).toBe(0);
  expect(animationRequests).toEqual([]);

  await page.goto('/work/native-cucumber-mint-stop-motion');
  await expect(page.locator('[data-short-loop]')).not.toHaveAttribute('src', /.+/u);
});

test('manual loop controls attach media when automatic playback is unavailable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true },
    });

    const playing = new WeakSet<HTMLMediaElement>();
    Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
      configurable: true,
      get() { return !playing.has(this); },
    });
    HTMLMediaElement.prototype.load = function load() { return undefined; };
    HTMLMediaElement.prototype.play = function play() {
      playing.add(this);
      this.dispatchEvent(new Event('play'));
      this.dispatchEvent(new Event('playing'));
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function pause() {
      const wasPlaying = playing.delete(this);
      if (wasPlaying) this.dispatchEvent(new Event('pause'));
    };
  });

  await page.goto('/work/specialized-globe');
  const shell = page.locator('.hosted-video--loop');
  const video = shell.locator('[data-short-loop]');
  const source = shell.locator('source[data-deferred-source]');
  const play = shell.getByRole('button', { name: 'Play video' });

  await expect(video).not.toHaveAttribute('src', /.+/u);
  await expect(source).not.toHaveAttribute('src', /.+/u);
  await expect(play).toBeVisible();
  await expect(play).toHaveText('');
  await expect(play.locator('[data-media-control-icon="play"]')).toBeVisible();
  await expect(play.locator('[data-media-control-icon="pause"]')).toBeHidden();

  await play.click();
  await expect(source).toHaveAttribute('src', /michael_specialized_globe_clip\.mp4$/u);
  const pause = shell.getByRole('button', { name: 'Pause video' });
  await expect(pause).toBeVisible();
  await expect(pause).toHaveText('');
  await expect(pause.locator('[data-media-control-icon="play"]')).toBeHidden();
  await expect(pause.locator('[data-media-control-icon="pause"]')).toBeVisible();
  await expect(video).toHaveAttribute('data-media-active', 'true');

  await pause.click();
  await expect(video).toHaveAttribute('data-user-paused', 'true');
  await expect(shell.getByRole('button', { name: 'Play video' })).toBeVisible();
});

test('the first project visual is eager while later media remains lazy', async ({ page }) => {
  await page.goto('/work/mercury-an-unexpected-life');
  const heroPoster = page.locator('[data-project-hero-media] img');
  await expect(heroPoster).toHaveAttribute('loading', 'eager');
  await expect(heroPoster).toHaveAttribute('fetchpriority', 'high');
  await expect(page.locator('.media-stream .lazy-embed__poster img')).toHaveAttribute('loading', 'lazy');
  await expect(page.locator('.media-stream .media-image-grid img').first()).toHaveAttribute('loading', 'lazy');

  await page.goto('/work/native-cucumber-mint-stop-motion');
  await expect(page.locator('[data-project-hero-media] img')).toHaveAttribute('loading', 'eager');
  await expect(page.locator('[data-project-placeholder-content]')).toBeVisible();
});

test('an embedded player always offers a reliable return to its retained poster', async ({ page }) => {
  await page.goto('/work/mercury-an-unexpected-life');
  const shell = page.locator('[data-lazy-embed]');
  await shell.scrollIntoViewIfNeeded();
  await expect(shell).toBeVisible();
  await shell.evaluate((element) => {
    delete element.dataset.ready;
    element.dataset.embedUrl = 'about:blank';
    const poster = element.querySelector('.lazy-embed__poster');
    const launch = document.createElement('button');
    launch.type = 'button';
    launch.dataset.loadEmbed = '';
    launch.textContent = 'Play film';
    poster?.append(launch);
    document.dispatchEvent(new Event('astro:page-load'));
  });

  const poster = shell.locator('.lazy-embed__poster');
  const player = shell.locator('[data-embed-player]');
  await shell.getByRole('button', { name: 'Play film' }).click();

  await expect(poster).toBeAttached();
  await expect(poster).toHaveAttribute('aria-hidden', 'true');
  await expect(player).toBeVisible();
  await expect(player.locator('iframe')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Open film reference in a new tab' })).toBeVisible();

  await shell.getByRole('button', { name: 'Return to poster' }).click();
  await expect(player).toBeHidden();
  await expect(player.locator('iframe')).toHaveCount(0);
  await expect(poster).not.toHaveAttribute('aria-hidden', 'true');
});

test('representative QA widths have no horizontal document overflow', async ({ page }) => {
  const viewports = [
    { width: 1440, height: 1_000 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
    { width: 320, height: 700 },
  ];
  for (const route of ['/', '/work/mercury-an-unexpected-life', '/work/arc']) {
    await page.goto(route);
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      if (route === '/') {
        await expect(page.locator('[data-gallery-entrance]'))
          .toHaveAttribute('data-gallery-entrance-state', 'settled', { timeout: 3_000 });
        await page.mouse.move(1, 1);
        await expect.poll(() => page.locator('[data-project-grid]').evaluate((element) =>
          Math.abs(new DOMMatrixReadOnly(getComputedStyle(element).transform).m41))).toBeLessThan(0.1);
      }
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      })));
      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        outOfBounds: [...document.querySelectorAll<HTMLElement>(
          '[data-site-header], main, [data-work-gallery], [data-project-grid], .project-template, [data-site-footer]',
        )]
          .map((element) => ({ element, box: element.getBoundingClientRect() }))
          .filter(({ element, box }) =>
            getComputedStyle(element).display !== 'none' &&
            !(window.innerWidth >= 1_200 && element.matches('[data-gallery-plane]')) &&
            (box.left < -1 || box.right > window.innerWidth + 1),
          )
          .map(({ element, box }) => ({
            selector: element.dataset.projectCard !== undefined
              ? '[data-project-card]'
              : element.tagName.toLowerCase(),
            left: box.left,
            right: box.right,
          })),
      }));
      const viewportLabel = `${viewport.width}x${viewport.height}`;
      expect(dimensions.scrollWidth, `${route} horizontal overflow at ${viewportLabel}`).toBeLessThanOrEqual(
        dimensions.clientWidth,
      );
      expect(dimensions.bodyScrollWidth, `${route} body overflow at ${viewportLabel}`).toBeLessThanOrEqual(
        dimensions.clientWidth,
      );
      expect(dimensions.outOfBounds, `${route} out-of-bounds layout element at ${viewportLabel}`).toEqual([]);
    }
  }
});

test('pointer motion never reshuffles the active desktop preview pool', async ({ page }) => {
  await page.goto('/');
  const previews = page.locator('[data-preview-video]');
  expect(await previews.count()).toBeGreaterThanOrEqual(3);
  const finePointer = await page.evaluate(() =>
    matchMedia('(hover: hover) and (pointer: fine)').matches,
  );
  test.skip(!finePointer, 'Pointer-following preview stability is desktop-only.');

  await expect(page.locator('[data-gallery-entrance]'))
    .toHaveAttribute('data-gallery-entrance-state', 'settled', { timeout: 3_000 });
  await previews.first().evaluate((video) => video.scrollIntoView({ block: 'center' }));
  const activeIndexes = () => previews.evaluateAll((videos) => videos
    .map((video, index) => ({ index, playing: video.dataset.playing === 'true' }))
    .filter(({ playing }) => playing)
    .map(({ index }) => index));
  await expect.poll(activeIndexes).toHaveLength(2);
  const before = await activeIndexes();

  await previews.evaluateAll((videos) => {
    const previewWindow = window as typeof window & { __previewMutations?: string[] };
    previewWindow.__previewMutations = [];
    videos.forEach((video, index) => {
      new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          previewWindow.__previewMutations?.push(`${index}:${mutation.attributeName}`);
        });
      }).observe(video, {
        attributes: true,
        attributeFilter: ['src', 'poster', 'data-playing', 'hidden'],
      });
    });
  });

  const galleryBox = await page.locator('[data-work-gallery]').boundingBox();
  if (!galleryBox) throw new Error('The work gallery is missing its pointer bounds.');
  const pointerY = Math.min(galleryBox.y + 360, page.viewportSize()!.height - 24);
  for (let pass = 0; pass < 4; pass += 1) {
    for (const progress of [.02, .2, .4, .6, .8, .98]) {
      await page.mouse.move(galleryBox.x + galleryBox.width * progress, pointerY, { steps: 3 });
    }
  }
  await page.waitForTimeout(500);

  expect(await activeIndexes()).toEqual(before);
  expect(await page.evaluate(() =>
    (window as typeof window & { __previewMutations?: string[] }).__previewMutations ?? [],
  )).toEqual([]);
  expect(await previews.evaluateAll((videos) =>
    videos.filter((video) => video.dataset.playing === 'true').length,
  )).toBeLessThanOrEqual(2);
  expect(await previews.evaluateAll((videos) => videos
    .filter((video) => video.hasAttribute('src'))
    .every((video) => video.dataset.previewPreloaded === 'true'))).toBe(true);
  expect(await previews.nth(before[0]!).evaluate((video) => {
    const image = video.closest<HTMLElement>('[data-card-media]')
      ?.querySelector<HTMLImageElement>('.responsive-image img');
    return Boolean(image?.currentSrc) && (video as HTMLVideoElement).poster === image?.currentSrc;
  })).toBe(true);
});

test('a visible gallery preview starts without hover or focus', async ({ page }) => {
  await page.goto('/');
  const previews = page.locator('[data-project-grid] [data-preview-video]');
  await previews.first().scrollIntoViewIfNeeded();

  await expect.poll(() => previews.evaluateAll((videos) =>
    videos.filter((video) => video.dataset.playing === 'true').length,
  )).toBeGreaterThan(0);
  const playingPreview = page.locator(
    '[data-project-grid] [data-preview-video][data-playing="true"]',
  ).first();
  await expect(playingPreview).toHaveAttribute('src', /\/media\/video(?:-previews)?\//u);
  expect(await playingPreview.evaluate((video) => (video as HTMLVideoElement).muted)).toBe(true);
});

test('gallery images and videos are prepared before their cards enter the viewport', async ({ page }) => {
  await page.goto('/');
  const imageApproachDistance = await page.evaluate(() => Math.max(720, window.innerHeight * 1.5));
  const videoApproachDistance = await page.evaluate(() => Math.max(640, window.innerHeight * 1.25));

  await expect.poll(() => page.locator('img[data-gallery-preload]').evaluateAll((images, distance) => {
    const approaching = images.filter((image) => {
      const bounds = image.getBoundingClientRect();
      return bounds.top > window.innerHeight && bounds.top <= window.innerHeight + Number(distance);
    });
    return {
      count: approaching.length,
      ready: approaching.length > 0
        && approaching.every((image) => image.dataset.galleryPreloaded === 'true'),
    };
  }, imageApproachDistance)).toEqual({ count: expect.any(Number), ready: true });

  const approachingMedia = await page.locator('[data-preview-video]').evaluateAll((videos, distance) =>
    videos.filter((video) => {
      const bounds = video.getBoundingClientRect();
      return bounds.top > window.innerHeight && bounds.top <= window.innerHeight + Number(distance);
    }).map((video) => ({
      hasSource: video.hasAttribute('src'),
      preload: (video as HTMLVideoElement).preload,
      prepared: video.dataset.previewPreloaded,
    })), videoApproachDistance);
  expect(approachingMedia.length).toBeGreaterThan(0);
  expect(approachingMedia.every((item) =>
    item.hasSource && item.preload === 'auto' && item.prepared === 'true')).toBe(true);
});

test('touch scrolling keeps only one predominantly visible preview active', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const playing = new WeakSet<HTMLMediaElement>();
    Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
      configurable: true,
      get() { return !playing.has(this); },
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
      configurable: true,
      get() { return HTMLMediaElement.HAVE_ENOUGH_DATA; },
    });
    Object.defineProperty(HTMLVideoElement.prototype, 'requestVideoFrameCallback', {
      configurable: true,
      value(callback: (now: number) => void) {
        requestAnimationFrame(callback);
        return 1;
      },
    });
    HTMLMediaElement.prototype.load = function load() { return undefined; };
    HTMLMediaElement.prototype.play = function play() {
      playing.add(this);
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function pause() {
      playing.delete(this);
    };
  });
  await page.goto('/');
  const coarsePointer = await page.evaluate(() =>
    matchMedia('(hover: none), (pointer: coarse)').matches);
  test.skip(!coarsePointer, 'The touch-preview policy is exercised by coarse-pointer projects.');

  const previews = page.locator('[data-preview-video]');
  expect(await previews.count()).toBeGreaterThanOrEqual(2);
  const playingCount = () => previews.evaluateAll((videos) =>
    videos.filter((video) => video.dataset.playing === 'true').length);

  await previews.nth(0).evaluate((video) => video.scrollIntoView({ block: 'center' }));
  await expect.poll(playingCount).toBe(1);
  await expect(previews.nth(0)).toHaveAttribute('data-playing', 'true');

  await previews.nth(1).evaluate((video) => video.scrollIntoView({ block: 'center' }));
  await expect.poll(playingCount).toBe(1);
  const playingPreview = page.locator('[data-preview-video][data-playing="true"]');
  await expect(playingPreview).toHaveCount(1);
  await expect(playingPreview).toHaveAttribute('src', /\/media\/video(?:-previews)?\//u);
  expect(await previews.evaluateAll((videos) => videos.filter((video) =>
    !(video as HTMLVideoElement).muted).length)).toBe(0);
});
