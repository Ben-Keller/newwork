import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }, testInfo) => {
  if (!testInfo.title.includes('opening gallery')) {
    await page.addInitScript(() => {
      window.sessionStorage.setItem('new-work-restore-requested', 'true');
    });
  }

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
  expect(await intro.locator('[data-type-title-line]').evaluateAll((lines) =>
    lines.map((line) => (line as HTMLElement).dataset.typeTitleLine),
  )).toEqual(['new', 'work']);
  await expect(intro.locator('[data-svg-title]')).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem('new-work:logo-intro:title:v1'))).toBeNull();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(intro).toHaveAttribute('data-state', 'settled');
  await expect(intro.locator('[data-type-title]')).toBeVisible();
});

test('the Work tab always returns to the top of the landing page', async ({ page }) => {
  await page.setViewportSize({ width: 1_440, height: 900 });
  await page.goto('/about');
  const desktopWorkLink = page.locator('[data-desktop-nav]').getByRole('link', { name: 'Work' });
  await expect(desktopWorkLink).toHaveAttribute('href', '/');
  await expect(desktopWorkLink).toHaveAttribute('data-work-navigation', '');
  await expect(page.locator('[data-mobile-menu-root] [data-menu-link]', { hasText: 'Work' }))
    .toHaveAttribute('href', '/');

  await desktopWorkLink.click();
  await expect(page).toHaveURL(/\/$/u);
  await expect(page.locator('[data-logo-work-page]')).toHaveAttribute('data-handoff', 'false');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.locator('[data-work-gallery]')).not.toHaveAttribute('data-gallery-restore');

  await page.mouse.wheel(0, 700);
  await expect(page.locator('[data-logo-work-page]')).toHaveAttribute('data-handoff', 'true');
  await page.evaluate(() => window.scrollTo({ top: 1_600, behavior: 'auto' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1_000);
  await page.locator('[data-desktop-nav]').getByRole('link', { name: 'Work' }).click();
  await expect(page).toHaveURL(/\/$/u);
  await expect(page.locator('[data-logo-work-page]')).toHaveAttribute('data-handoff', 'false');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  await page.goto('/work/arc');
  await page.evaluate(() => {
    window.sessionStorage.setItem('new-work-restore-requested', 'true');
    window.scrollTo({ top: 1_200, behavior: 'auto' });
  });
  await page.locator('[data-desktop-nav]').getByRole('link', { name: 'Work' }).click();
  await expect(page).toHaveURL(/\/$/u);
  await expect(page.locator('[data-logo-work-page]')).toHaveAttribute('data-handoff', 'false');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  expect(await page.evaluate(() => sessionStorage.getItem('new-work-restore-requested'))).toBeNull();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/about');
  await page.locator('[data-mobile-menu-root]').getByRole('button', { name: 'Menu' }).click();
  const mobileWorkLink = page.locator('[data-mobile-menu-root] [data-menu-link]', { hasText: 'Work' });
  await expect(mobileWorkLink).toBeVisible();
  await mobileWorkLink.click();
  await expect(page).toHaveURL(/\/$/u);
  await expect(page.locator('[data-logo-work-page]')).toHaveAttribute('data-handoff', 'false');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
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
  await expect(page.locator('[data-project-card]')).toHaveCount(28);
  await expect(page.locator('[data-gallery-order-tools]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /shuffle gallery|save gallery|restore removed/iu }))
    .toHaveCount(0);
});

test('the footer closes every route with a studio statement, directory, and oversized identity', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1_000 });
  await page.goto('/');
  const footer = page.locator('[data-site-footer]');
  await expect(footer.locator('.site-footer__strapline p')).toHaveCount(4);
  await expect(footer.getByRole('heading', { level: 2, name: 'People' })).toHaveCount(0);
  await expect(footer.getByRole('heading', { level: 2, name: 'Explore' })).toBeVisible();
  await expect(footer.getByRole('heading', { level: 2, name: 'Connect' })).toBeVisible();
  await expect(footer.locator('.site-footer__group--people')).toHaveCount(0);
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
    const explore = rect(element.querySelector('.site-footer__group--explore'));
    const brand = rect(element.querySelector('.site-footer__brand'));
    const legal = rect(element.querySelector('.site-footer__legal'));
    return { box, strapline, explore, brand, legal, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  expect(desktop.box.height).toBeGreaterThanOrEqual(900);
  expect(desktop.strapline.right).toBeLessThanOrEqual(desktop.explore.left + 1);
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
    const explore = rect(element.querySelector('.site-footer__group--explore'));
    const connect = rect(element.querySelector('.site-footer__group--connect'));
    const brand = rect(element.querySelector('.site-footer__brand'));
    return { box, explore, connect, brand, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  expect(mobile.box.height).toBeGreaterThanOrEqual(844);
  expect(Math.abs(mobile.explore.left - mobile.connect.left)).toBeLessThanOrEqual(1);
  expect(mobile.brand.width).toBeGreaterThan(150);
  expect(mobile.overflow).toBeLessThanOrEqual(1);
});

test('the typographic title remains non-blocking while its entrance is hidden', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const intro = page.locator('[data-logo-intro]');
  await expect(intro).toHaveAttribute('data-state', 'settled');
  await expect(intro.locator('[data-type-title-line]')).toHaveCount(2);
  expect(await intro.locator('[data-type-title-line]').evaluateAll((lines) =>
    lines.map((line) => (line as HTMLElement).dataset.typeTitleLine))).toEqual(['new', 'work']);
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
    .toHaveAttribute('data-src', /mercury-helen-mayer/u);
  await expect(firstLetter).toHaveAttribute('data-type-media-ready', 'true');
  await expect(firstLetter.locator('[data-type-letter-canvas]')).toHaveCSS('opacity', '1');
  expect(await firstLetter.evaluate((element) => getComputedStyle(element, '::before').opacity)).toBe('0');
  expect(await firstLetter.evaluate((element) => getComputedStyle(element, '::after').opacity)).toBe('0');
  const maskGeometry = await firstLetter.evaluate((element) => {
    const canvas = element.querySelector<HTMLCanvasElement>('[data-type-letter-canvas]')!;
    const glyph = element.querySelector<HTMLElement>('[data-type-letter-glyph]')!;
    return {
      canvasWidth: canvas.getBoundingClientRect().width,
      letterWidth: element.getBoundingClientRect().width,
      negativeTracking: Math.max(0, -Number.parseFloat(getComputedStyle(glyph).letterSpacing)),
    };
  });
  expect(maskGeometry.canvasWidth).toBeGreaterThan(maskGeometry.letterWidth);
  expect(maskGeometry.canvasWidth - maskGeometry.letterWidth)
    .toBeCloseTo(maskGeometry.negativeTracking, 0);
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
      const compactOutline = element.querySelector<HTMLElement>('.logo-intro__mobile-outline-word');
      const solid = element.querySelector<HTMLElement>('[data-type-title-line="work"]');
      const outlineStyles = compactOutline && getComputedStyle(compactOutline).display !== 'none'
        ? getComputedStyle(compactOutline)
        : outline ? getComputedStyle(outline) : null;
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
    expect(mobileTransforms.every(({ ready, transform }) => ready === 'animated' && transform === 'none')).toBe(true);
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

test('the work index has exactly 4, 2, and 2 complete columns', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-project-card]')).toHaveCount(28);
  await expect(page.locator('[data-gallery-remove]')).toHaveCount(0);
  await expect(page.locator('[data-gallery-item-id="michael-native-stop-motion-still"]')).toHaveCount(0);
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

test('every photo doorway opens its shared Work page and never routes through About', async ({ page }) => {
  await page.goto('/');
  const photoLinks = page.locator('[data-gallery-photo-link]');
  await expect(photoLinks).toHaveCount(14);

  const destinations = await photoLinks.evaluateAll((links) => links.map((link) =>
    (link as HTMLAnchorElement).getAttribute('href') || ''));
  expect(destinations.every((href) => /^\/work\/michael-selected-photography\/[a-z\d-]+$/u.test(href))).toBe(true);
  expect(destinations.some((href) => href.includes('/about'))).toBe(false);

  const destination = destinations[0]!;
  await page.goto(destination);
  await expect(page.locator('[data-gallery-photo-page]')).toBeVisible();
  await expect(page.locator('[data-project-hero-media] img')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/\S/u);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');

});

test('photo Work hero frames end exactly with their photographs', async ({ page }) => {
  await page.goto('/work/michael-selected-photography/michael-wow-rainbow-pavement');

  const geometry = await page.locator('[data-project-hero-media]').evaluate((figure) => {
    const image = figure.querySelector('img');
    if (!image) throw new Error('The gallery hero photograph is missing.');
    const figureRect = figure.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    return {
      heightDifference: Math.abs(figureRect.height - imageRect.height),
      widthDifference: Math.abs(figureRect.width - imageRect.width),
      background: getComputedStyle(figure).backgroundColor,
      scrollbarGutter: window.innerWidth - document.documentElement.clientWidth,
      nativeScrollbar: {
        width: getComputedStyle(document.documentElement).scrollbarWidth,
        webkitSupported: CSS.supports('selector(::-webkit-scrollbar)'),
        webkitDisplay: getComputedStyle(document.documentElement, '::-webkit-scrollbar').display,
        webkitWidth: getComputedStyle(document.documentElement, '::-webkit-scrollbar').width,
      },
      overlayScrollbar: (() => {
        const track = document.querySelector<HTMLElement>('[data-site-scrollbar]');
        const thumb = track?.querySelector<HTMLElement>('[data-site-scrollbar-thumb]');
        return {
          exists: Boolean(track && thumb),
          background: track ? getComputedStyle(track).backgroundColor : null,
          backgroundImage: track ? getComputedStyle(track).backgroundImage : null,
          coarsePointer: matchMedia('(hover: none), (pointer: coarse)').matches,
          thumbWidth: thumb?.getBoundingClientRect().width ?? 0,
        };
      })(),
    };
  });

  expect(geometry.heightDifference).toBeLessThan(1);
  expect(geometry.widthDifference).toBeLessThan(1);
  expect(geometry.background).toBe('rgba(0, 0, 0, 0)');
  expect(geometry.scrollbarGutter).toBe(0);
  expect(geometry.nativeScrollbar.width).toBe('none');
  if (geometry.nativeScrollbar.webkitSupported) {
    expect(geometry.nativeScrollbar.webkitDisplay).toBe('none');
    expect(geometry.nativeScrollbar.webkitWidth).toBe('0px');
  }
  expect(geometry.overlayScrollbar.exists).toBe(true);
  expect(geometry.overlayScrollbar.background).toBe('rgba(0, 0, 0, 0)');
  expect(geometry.overlayScrollbar.backgroundImage).toBe('none');
  expect(geometry.overlayScrollbar.thumbWidth)
    .toBe(geometry.overlayScrollbar.coarsePointer ? 0 : 3);
});

test('cover-cropped gallery photographs request enough raster pixels for their visible crop', async ({ page }) => {
  await page.goto('/');

  const image = page.locator(
    'a[href="/work/michael-selected-photography/michael-wow-rainbow-pavement"] img[data-gallery-image]',
  );
  await expect(image).toHaveAttribute('data-gallery-image-ready', 'true');
  const quality = await image.evaluate((element) => {
    const media = element.closest<HTMLElement>('.project-card__media');
    if (!media) throw new Error('The rainbow photograph is missing its gallery frame.');
    const currentSrc = (element as HTMLImageElement).currentSrc;
    const candidateMatch = currentSrc.match(/\.w(\d+)\.(?:avif|webp)$/u);
    const sourceWidth = Number(element.getAttribute('width'));
    const sourceHeight = Number(element.getAttribute('height'));
    const candidateWidth = candidateMatch
      ? Number(candidateMatch[1])
      : sourceWidth;
    const requiredWidth = media.getBoundingClientRect().height
      * (sourceWidth / sourceHeight)
      * window.devicePixelRatio;
    return { candidateWidth, currentSrc, requiredWidth };
  });

  expect(quality.currentSrc).toMatch(/michael-wow-rainbow-pavement/u);
  expect(quality.candidateWidth).toBeGreaterThanOrEqual(quality.requiredWidth * .98);
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

test('compact gallery layouts receive the emphasized two-track inertia filter', async ({ page }) => {
  for (const viewport of [
    { width: 1_024, height: 900 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');

    const gallery = page.locator('[data-work-gallery]');
    await expect(gallery).toHaveAttribute('data-column-motion', 'first-order');

    const compactLanes = await page.locator('[data-motion-column]').evaluateAll((cards) => {
      const lanes = new Map<number, { response: number; ready: Set<string>; transitions: Set<string> }>();
      cards.forEach((card) => {
        const element = card as HTMLElement;
        const lane = Number(element.dataset.tabletColumn);
        if (!Number.isFinite(lane)) return;
        const state = lanes.get(lane) ?? {
          response: Number(element.dataset.motionColumnResponseTablet),
          ready: new Set<string>(),
          transitions: new Set<string>(),
        };
        state.ready.add(element.dataset.motionReady ?? '');
        state.transitions.add(getComputedStyle(element).transitionProperty);
        lanes.set(lane, state);
      });
      return [...lanes.entries()]
        .map(([lane, state]) => ({
          lane,
          response: state.response,
          ready: [...state.ready],
          hasTransformTransition: [...state.transitions].some((value) =>
            value.split(',').map((part) => part.trim()).includes('transform')),
        }))
        .sort((left, right) => left.lane - right.lane);
    });

    expect(compactLanes.map(({ lane }) => lane)).toEqual([1, 2]);
    expect(compactLanes.map(({ response }) => response)).toEqual([0.18, 0.05]);
    expect(compactLanes.every(({ ready }) => ready.length === 1 && ready[0] === 'animated')).toBe(true);
    expect(compactLanes.every(({ hasTransformTransition }) => !hasTransformTransition)).toBe(true);
    expect(compactLanes[0]!.response / compactLanes[1]!.response).toBeGreaterThan(3.5);
  }
});

test('gallery cards reveal when their first pixels cross the viewport edge', async ({ page }) => {
  for (const viewport of [
    { width: 1_024, height: 900 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('[data-gallery-entrance]'))
      .toHaveAttribute('data-gallery-entrance-state', 'settled', { timeout: 6_000 });

    const reveals = page.locator('[data-work-gallery] [data-motion-reveal]');
    const targetIndex = await reveals.evaluateAll((elements) => {
      const candidates = elements
        .map((element, index) => ({
          index,
          top: element.getBoundingClientRect().top,
          opacity: Number.parseFloat(getComputedStyle(element).opacity),
        }))
        .filter(({ top, opacity }) => top > window.innerHeight + 24 && opacity < .01)
        .sort((left, right) => left.top - right.top);
      return candidates[0]?.index ?? -1;
    });
    expect(targetIndex).toBeGreaterThanOrEqual(0);

    const target = reveals.nth(targetIndex);
    const before = await target.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        top: bounds.top,
        opacity: Number.parseFloat(getComputedStyle(element).opacity),
      };
    });
    expect(before.top).toBeGreaterThan(viewport.height);
    expect(before.opacity).toBeLessThan(.01);

    await page.evaluate(({ targetTop, viewportHeight }) => {
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollBy(0, targetTop - viewportHeight + 6);
    }, { targetTop: before.top, viewportHeight: viewport.height });

    await expect.poll(() => target.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).opacity)), { timeout: 4_000 }).toBeGreaterThan(.99);

    const partial = await target.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        top: bounds.top,
        bottom: bounds.bottom,
        viewportHeight: window.innerHeight,
        visibility: getComputedStyle(element).visibility,
      };
    });
    expect(partial.top).toBeLessThan(partial.viewportHeight + 18);
    expect(partial.top).toBeGreaterThanOrEqual(partial.viewportHeight - 18);
    expect(partial.bottom).toBeGreaterThan(partial.viewportHeight);
    expect(partial.visibility).toBe('visible');
  }
});

test('the desktop gallery keeps card hit targets fixed during pointer movement', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1_000 });
  await page.goto('/#work-gallery');

  await expect(page.locator('[data-gallery-entrance]'))
    .toHaveAttribute('data-gallery-entrance-state', 'settled', { timeout: 3_000 });

  const finePointer = await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches);
  test.skip(!finePointer, 'Stable mouse hit targets are a fine-pointer behavior.');

  const gallery = page.locator('[data-work-gallery]');
  const plane = page.locator('[data-gallery-plane]');
  await expect(gallery).toHaveAttribute('data-gallery-motion', 'true');
  const targetLink = gallery.locator('[data-project-link]').nth(10);
  await targetLink.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await expect.poll(() => targetLink.evaluate((element) => {
    const card = element.closest<HTMLElement>('[data-project-card]');
    return card ? Math.abs(new DOMMatrixReadOnly(getComputedStyle(card).transform).m42) : 0;
  })).toBeLessThan(.1);
  const openingScroll = await page.evaluate(() => window.scrollY);
  const horizontalTransform = () => plane.evaluate((element) =>
    new DOMMatrixReadOnly(getComputedStyle(element).transform).m41);
  const startingBox = await targetLink.boundingBox();
  if (!startingBox) throw new Error('The gallery card is not visible.');

  for (const x of [startingBox.x + 3, startingBox.x + startingBox.width - 3]) {
    const y = startingBox.y + Math.min(32, startingBox.height / 2);
    await page.mouse.move(x, y);
    await page.waitForTimeout(500);
    const hitState = await targetLink.evaluate((element, point) => {
      const hit = document.elementFromPoint(point.x, point.y);
      return {
        cursor: hit ? getComputedStyle(hit).cursor : '',
        left: element.getBoundingClientRect().left,
        ownsPoint: Boolean(hit && element.contains(hit)),
      };
    }, { x, y });
    expect(hitState.ownsPoint).toBe(true);
    expect(hitState.cursor).toBe('pointer');
    expect(hitState.left).toBeCloseTo(startingBox.x, 1);
    expect(Math.abs(await horizontalTransform())).toBeLessThan(.1);
  }

  const stableState = await page.evaluate(() => {
    const galleryElement = document.querySelector<HTMLElement>('[data-work-gallery]');
    if (!galleryElement) throw new Error('The gallery is missing.');
    return {
      scrollY: window.scrollY,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      pointerX: Number.parseFloat(getComputedStyle(galleryElement).getPropertyValue('--gallery-pointer-x')),
    };
  });
  expect(stableState.scrollY).toBe(openingScroll);
  expect(stableState.scrollWidth).toBeLessThanOrEqual(stableState.clientWidth);
  expect(Math.abs(stableState.pointerX)).toBeLessThan(.1);

  await page.evaluate(() => window.scrollTo(0, 160));
  await page.waitForTimeout(100);
  const topOverlapState = await page.evaluate(() => {
    const title = document.querySelector<HTMLElement>('.logo-work-page__title');
    const link = document.querySelector<HTMLElement>(
      '[data-gallery-item-id="michael-selected-photography--michael-wow-rainbow-pavement"] [data-project-link]',
    );
    const header = document.querySelector<HTMLElement>('[data-site-header]');
    if (!title || !link) throw new Error('The overlapping title and gallery card are missing.');
    const titleRect = title.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const headerBottom = header?.getBoundingClientRect().bottom || 0;
    const letters = [...document.querySelectorAll<HTMLElement>('[data-type-letter]')]
      .map((letter) => letter.getBoundingClientRect());
    for (let y = Math.max(headerBottom + 4, titleRect.top, linkRect.top) + 4;
      y < Math.min(titleRect.bottom, linkRect.bottom) - 4; y += 8) {
      for (let x = Math.max(titleRect.left, linkRect.left) + 4;
        x < Math.min(titleRect.right, linkRect.right) - 4; x += 8) {
        if (letters.some((rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)) {
          continue;
        }
        const hit = document.elementFromPoint(x, y);
        return {
          cursor: hit ? getComputedStyle(hit).cursor : '',
          ownsPoint: Boolean(hit && link.contains(hit)),
          titlePointerEvents: getComputedStyle(title).pointerEvents,
        };
      }
    }
    return null;
  });
  expect(topOverlapState).not.toBeNull();
  expect(topOverlapState?.titlePointerEvents).toBe('none');
  expect(topOverlapState?.ownsPoint).toBe(true);
  expect(topOverlapState?.cursor).toBe('pointer');
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

test('prototype filler copy completes the editorial review surfaces', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/about');
  await expect(page.locator('[data-about-experience]')).toHaveAttribute('data-mode', 'fallback');
  await expect(page.getByRole('heading', { level: 1, name: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' }))
    .toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'What should we make next?' }))
    .toBeVisible();

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
  await expect(page.locator('.reel')).toHaveCount(1);
  await expect(page.locator('[data-reel-shell]')).toBeVisible();
  await expect(page.locator('.notes-strip')).toHaveCount(0);
});

test('key routes render without editorial markers and remain noindex in prototype mode', async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const routes = [
    { path: '/', heading: 'Selected work', statuses: [200] },
    { path: '/about', heading: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.', statuses: [200] },
    { path: '/contact', heading: 'Contact', statuses: [200] },
    { path: '/work/arc', heading: 'Arc', statuses: [200] },
    { path: '/work/mercury-an-unexpected-life', heading: 'Mercury — An Unexpected Life', statuses: [200] },
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
  await expect(page.getByText('Do Not Publish Without Approval')).toHaveCount(0);
});

test('an unknown route uses the branded 404 recovery page', async ({ page }) => {
  const response = await page.goto('/this-route-does-not-exist');

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: 'This page isn’t here.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return to all work' })).toHaveAttribute('href', '/');
});

test('prototype SEO blocks crawling, omits its sitemap, and uses only the confirmed brand share image', async ({ page }) => {
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
  await expect(page.locator('meta[property="og:image"]'))
    .toHaveAttribute('content', /\/media\/brand\/social-share\.png$/u);

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

test('project media stays decoded across the non-layout desktop threshold', async ({ page }) => {
  await page.setViewportSize({ width: 1_210, height: 900 });
  await page.goto('/gallery/michael-poolside-product', { waitUntil: 'networkidle' });

  const projectImages = page.locator('.gallery-photo img');
  await expect(projectImages).toHaveCount(2);
  await projectImages.last().scrollIntoViewIfNeeded();
  await expect.poll(() => projectImages.evaluateAll((images) => images.every((image) => {
    const responsiveImage = image as HTMLImageElement;
    return responsiveImage.complete && responsiveImage.naturalWidth > 0;
  }))).toBe(true);
  await expect.poll(() => page.evaluate(() => (
    [...document.querySelectorAll<HTMLImageElement>('.gallery-photo img')]
      .every((image) => {
        const imageStyles = getComputedStyle(image);
        const reveal = image.closest<HTMLElement>('[data-motion-reveal]');
        const revealStyles = reveal ? getComputedStyle(reveal) : undefined;
        return imageStyles.visibility !== 'hidden'
          && Number.parseFloat(imageStyles.opacity) >= .99
          && revealStyles?.visibility !== 'hidden'
          && Number.parseFloat(revealStyles?.opacity || '1') >= .99;
      })
  ))).toBe(true);

  const breakpointRequests: string[] = [];
  page.on('request', (request) => {
    if (/\/michael-poolside-product\.w\d+\.(?:avif|webp)(?:\?|$)/u.test(request.url())) {
      breakpointRequests.push(request.url());
    }
  });
  await page.evaluate(() => {
    const root = document.documentElement;
    root.dataset.projectResizeMotionRestarts = '0';
    root.dataset.projectResizeVisualFlash = 'false';
    const sampleUntil = performance.now() + 1_200;
    const sampleVisibility = () => {
      const flashed = [...document.querySelectorAll<HTMLImageElement>('.gallery-photo img')]
        .some((image) => {
          const imageStyles = getComputedStyle(image);
          const reveal = image.closest<HTMLElement>('[data-motion-reveal]');
          const revealStyles = reveal ? getComputedStyle(reveal) : undefined;
          return imageStyles.visibility === 'hidden'
            || Number.parseFloat(imageStyles.opacity) < .99
            || revealStyles?.visibility === 'hidden'
            || Number.parseFloat(revealStyles?.opacity || '1') < .99;
        });
      if (flashed) root.dataset.projectResizeVisualFlash = 'true';
      if (performance.now() < sampleUntil) {
        requestAnimationFrame(sampleVisibility);
      }
    };
    requestAnimationFrame(sampleVisibility);
    document.addEventListener('new-work:motion-ready', () => {
      root.dataset.projectResizeMotionRestarts = String(
        Number(root.dataset.projectResizeMotionRestarts || '0') + 1,
      );
    });
  });

  await page.setViewportSize({ width: 1_190, height: 900 });
  await page.waitForTimeout(800);

  const result = await page.evaluate(() => ({
    motionRestarts: Number(document.documentElement.dataset.projectResizeMotionRestarts || '0'),
    visualFlash: document.documentElement.dataset.projectResizeVisualFlash === 'true',
    decoded: [...document.querySelectorAll<HTMLImageElement>('.gallery-photo img')]
      .every((image) => (
        image.complete
        && image.naturalWidth > 0
        && Boolean(image.currentSrc)
      )),
    visible: [...document.querySelectorAll<HTMLElement>('.gallery-photo [data-motion-reveal]')]
      .every((element) => getComputedStyle(element).visibility !== 'hidden'),
  }));

  expect(breakpointRequests).toEqual([]);
  expect(result.motionRestarts).toBe(0);
  expect(result.visualFlash).toBe(false);
  expect(result.decoded).toBe(true);
  expect(result.visible).toBe(true);
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
  const routes = [
    'arc',
    'mercury-an-unexpected-life',
    'native-cucumber-mint-stop-motion',
    'tour-de-france-x-toyota',
    'cradlewise',
    'humu-make-work-better-holly',
    'dune-tansy',
    'olympics-toyota-in-due-time',
    'fellow',
    'mercury-one-of-the-greats',
    'brava',
    'specialized-globe',
    'molekule-in-office',
    'miss-jones-pancake',
    'chanel-test',
    'untitled-portfolio-film',
  ].map((slug) => `/work/${slug}`);
  expect(routes).toHaveLength(16);

  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('.project-index, .project-template__accent-key'))
      .toHaveCount(0);
    const hero = page.locator(
      '[data-project-header] [data-project-hero-media][data-first-media="true"]',
    );
    await expect(hero, `${route} should have one composed hero`).toHaveCount(1);
    const heroType = await hero.getAttribute('data-project-block');
    if (heroType === 'shortLoop') {
      await expect(hero.locator('img'), `${route} should not layer a poster under its opening video`)
        .toHaveCount(0);
      await expect(hero.locator('video[data-short-loop]')).toHaveCount(1);
    } else {
      await expect(hero.locator('img'), `${route} should retain its still gallery hero`).toHaveCount(1);
    }
    await expect(page.locator('.media-stream [data-first-media="true"]')).toHaveCount(0);
    await expect(page.locator('[data-project-placeholder-content]')).toBeAttached();
    expect(await page.locator('.media-stream [data-project-block], [data-project-placeholder-content]').count())
      .toBeGreaterThan(0);
  }
});

test('the Olympics project keeps connector punctuation with its neighboring title words', async ({ page }) => {
  await page.goto('/work/olympics-toyota-in-due-time');
  const header = page.locator('[data-project-header]');
  await expect(header).toHaveClass(/project-title-treatment--standard/u);

  const chunks = page.locator('[data-project-title-chunk]');
  await expect(chunks).not.toHaveCount(0);
  expect((await chunks.allTextContents()).map((chunk) => chunk.trim())).toEqual([
    'Olympics &',
    'Toyota —',
    'In',
    'Due',
    'Time',
  ]);
  await expect(page.locator('[data-project-hero-media][data-project-block="shortLoop"] video'))
    .toBeAttached();
});

test('project navigation keeps the gallery in flow until the incoming page replaces it', async ({ page }) => {
  await page.setViewportSize({ width: 1_440, height: 1_000 });
  await page.goto('/');

  const projectLink = page.locator('[data-project-link]').first();
  await projectLink.scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => {
    const footer = document.querySelector<HTMLElement>('[data-site-footer]');
    if (!footer) throw new Error('The site footer is missing.');
    return {
      footerTop: footer.getBoundingClientRect().top,
      pageHeight: document.documentElement.scrollHeight,
      scrollY: window.scrollY,
    };
  });

  let releaseProjectRequest = (): void => undefined;
  const projectRequestGate = new Promise<void>((resolve) => {
    releaseProjectRequest = resolve;
  });
  await page.route('**/work/**', async (route) => {
    await projectRequestGate;
    await route.continue();
  }, { times: 1 });

  await projectLink.evaluate((element) => (element as HTMLAnchorElement).click());
  const flowHold = page.locator('[data-route-gallery-flow-hold]');
  await expect(flowHold).toBeAttached();
  const during = await page.evaluate(() => {
    const footer = document.querySelector<HTMLElement>('[data-site-footer]');
    if (!footer) throw new Error('The site footer is missing.');
    return {
      footerTop: footer.getBoundingClientRect().top,
      pageHeight: document.documentElement.scrollHeight,
      scrollY: window.scrollY,
    };
  });

  expect(Math.abs(during.footerTop - before.footerTop)).toBeLessThan(1);
  expect(Math.abs(during.pageHeight - before.pageHeight)).toBeLessThanOrEqual(1);
  expect(Math.abs(during.scrollY - before.scrollY)).toBeLessThan(1);

  releaseProjectRequest();
  await page.waitForURL(/\/work\//u);
  await expect(flowHold).toHaveCount(0);
});

test('project return keeps site chrome stable and the footer outside the transition', async ({ page }) => {
  await page.goto('/');

  const projectLink = page.locator('[data-project-slug="arc"]');
  await projectLink.scrollIntoViewIfNeeded();
  await projectLink.evaluate((element) => (element as HTMLAnchorElement).click());
  await page.waitForURL('**/work/arc');
  await page.waitForFunction(() => (
    !document.documentElement.hasAttribute('data-work-project-transition')
  ));
  await page.locator(
    '[data-project-hero-media][data-first-media="true"] .responsive-image',
  ).evaluate((element) => { element.dataset.continuityProbe = 'return-veil-origin'; });

  type ReturnChromeState = {
    flowHeldFrames: number;
    transitionFrames: number;
    visibleFooterFrames: number;
    veilOpacities: number[];
  };
  await page.evaluate(() => {
    const routeWindow = window as Window & {
      __returnChromeState?: Promise<ReturnChromeState>;
    };
    routeWindow.__returnChromeState = new Promise<ReturnChromeState>((resolve) => {
      let flowHeldFrames = 0;
      let transitionFrames = 0;
      let visibleFooterFrames = 0;
      const veilOpacities: number[] = [];
      let started = false;
      const startedAt = performance.now();
      const sample = () => {
        const routeActive = document.documentElement.dataset.workProjectTransition === 'to-gallery';
        if (routeActive) {
          started = true;
          transitionFrames += 1;
          if (document.querySelector('[data-route-gallery-flow-hold]')) flowHeldFrames += 1;
          const veil = document.querySelector<HTMLElement>('[data-route-project-veil]');
          if (veil) veilOpacities.push(Number.parseFloat(getComputedStyle(veil).opacity));
          const footer = document.querySelector<HTMLElement>('[data-site-footer]');
          if (footer) {
            const rect = footer.getBoundingClientRect();
            const styles = getComputedStyle(footer);
            if (
              styles.visibility !== 'hidden'
              && Number.parseFloat(styles.opacity) > 0
              && rect.top < window.innerHeight
              && rect.bottom > 0
            ) visibleFooterFrames += 1;
          }
        }
        if (
          (started && !routeActive && window.location.pathname === '/')
          || performance.now() - startedAt > 4_000
        ) {
          resolve({flowHeldFrames, transitionFrames, visibleFooterFrames, veilOpacities});
          return;
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
  });

  await page.locator('[data-project-overlay-return]').evaluate((element) => (
    (element as HTMLAnchorElement).click()
  ));
  await page.waitForURL((url) => url.pathname === '/');
  const returnState = await page.evaluate(() => (
    (window as Window & { __returnChromeState?: Promise<ReturnChromeState> })
      .__returnChromeState
  ));

  expect(returnState?.transitionFrames).toBeGreaterThan(2);
  expect(returnState?.flowHeldFrames).toBeGreaterThan(2);
  expect(returnState?.visibleFooterFrames).toBe(0);
  expect(returnState?.veilOpacities.length).toBeGreaterThan(2);
  expect((returnState?.veilOpacities.at(0) ?? 0)).toBeGreaterThan(
    returnState?.veilOpacities.at(-1) ?? 1,
  );
  await expect(page.locator('[data-continuity-probe="return-veil-origin"]')).toHaveCount(1);
  await expect(page.locator('[data-route-gallery-flow-hold]')).toHaveCount(0);
});

test('route media keeps the original node continuous through the centralized route transaction', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  test.skip(testInfo.project.name.startsWith('mobile-'), 'Desktop persistent-video timing is covered here; mobile still-media continuity and video fallbacks have dedicated tests.');
  await page.setViewportSize({ width: 1_440, height: 1_000 });

  const supportsPersistentMedia = await page.goto('/').then(() => page.evaluate(() => (
    Boolean(document.querySelector('meta[name="astro-view-transitions-enabled"]'))
  )));
  if (supportsPersistentMedia) {
    for (const { selector, index } of [
      { selector: '[data-project-slug="arc"]', index: 0 },
      { selector: '[data-gallery-photo-link]', index: 0 },
      { selector: '[data-gallery-photo-link]', index: 10 },
    ]) {
      await page.goto('/');
      const link = page.locator(selector).nth(index);
      const slug = await link.evaluate((element) =>
        element.closest<HTMLElement>('[data-project-card]')?.dataset.galleryItemId);
      if (!slug) throw new Error('The still gallery card is missing its item id.');
      await link.scrollIntoViewIfNeeded();
      const probe = `still-${slug}-${Date.now()}`;
      await link.locator('.responsive-image').evaluate((element, value) => {
        element.setAttribute('data-continuity-probe', value);
        (window as Window & { __routeStillNode?: Element }).__routeStillNode = element;
      }, probe);

      await link.evaluate((element) => (element as HTMLAnchorElement).click());
      await page.waitForURL((url) => url.pathname !== '/');
      const outboundHandoff = page.locator(`[data-continuity-probe="${probe}"]`);
      await expect(outboundHandoff).toHaveAttribute('data-continuity-probe', probe);
      await expect(outboundHandoff).toHaveAttribute(
        'data-route-media-handoff',
        /^(?:animating|settled)$/u,
      );
      expect(await outboundHandoff.evaluate((element) => (
        (window as Window & { __routeStillNode?: Element }).__routeStillNode === element
      ))).toBe(true);
      await expect(page.locator('[data-gallery-route-transition-style]')).toHaveCount(0);
      const heroImage = page.locator(
        '[data-project-hero-media][data-first-media="true"] .responsive-image',
      );
      await expect(heroImage).toHaveAttribute('data-continuity-probe', probe);
      await expect(heroImage).toHaveAttribute('data-route-media-continuity', slug);
      await expect(page.locator('[data-photo-route-handoff]')).toHaveCount(0);
      const storedOriginScroll = await page.evaluate(() => (
        JSON.parse(sessionStorage.getItem('new-work-origin') || '{}') as { scrollY?: number }
      ).scrollY);
      expect(storedOriginScroll).toEqual(expect.any(Number));

      await page.locator('[data-project-overlay-return]').click({ noWaitAfter: true });
      await page.waitForURL((url) => url.pathname === '/');
      const returnHandoff = page.locator(`[data-continuity-probe="${probe}"]`);
      await expect(returnHandoff).toHaveAttribute('data-continuity-probe', probe);
      await expect(returnHandoff).toHaveAttribute('data-route-media-handoff', 'settled');
      expect(await returnHandoff.evaluate((element) => (
        (window as Window & { __routeStillNode?: Element }).__routeStillNode === element
      ))).toBe(true);
      const returnedImage = page.locator(
        `[data-gallery-item-id="${slug}"] .responsive-image`,
      );
      await expect(returnedImage).toHaveAttribute('data-continuity-probe', probe);
      await expect(returnedImage).toHaveAttribute('data-route-media-continuity', slug);
      await expect(page.locator('[data-photo-return-handoff]')).toHaveCount(0);
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(storedOriginScroll);
    }

    await page.goto('/');
    const motionLink = page.locator('[data-project-link]:has([data-preview-video])').first();
    const motionSlug = await motionLink.getAttribute('data-project-slug');
    if (!motionSlug) throw new Error('The motion gallery card is missing its project slug.');
    await motionLink.scrollIntoViewIfNeeded();
    const motionPreview = motionLink.locator('[data-preview-video]');
    await expect.poll(() => motionPreview.evaluate((video) => (
      (video as HTMLVideoElement).readyState
    )), {timeout: 15_000}).toBeGreaterThanOrEqual(1);
    await motionPreview.evaluate(async (element) => {
      const video = element as HTMLVideoElement;
      video.dataset.continuityProbe = 'same-video-node';
      video.dataset.playing = 'true';
      (window as Window & { __routeVideoNode?: Element }).__routeVideoNode = video;
      video.currentTime = 1.25;
      await video.play();
    });

    type VideoPortalState = {
      destinationEmpty: boolean;
      destinationVideoCount: number;
      destinationBackground: string | null;
      panelOpacity: string | null;
      paused: boolean;
      portalBackground: string;
      posterVisibility: string | null;
    };
    await page.evaluate(() => {
      const routeWindow = window as Window & {
        __videoPortalState?: Promise<VideoPortalState | null>;
      };
      routeWindow.__videoPortalState = new Promise<VideoPortalState | null>((resolve) => {
        const inspect = () => {
          const portal = document.querySelector<HTMLElement>('[data-route-media-portal]');
          const video = portal?.querySelector('video');
          const destination = document.querySelector<HTMLElement>('[data-project-hero-media]');
          if (!portal || !(video instanceof HTMLVideoElement) || !destination) return false;
          const poster = destination.querySelector<HTMLElement>('.hosted-video > .responsive-image');
          const destinationFrame = destination.querySelector<HTMLElement>('.hosted-video');
          const panel = document.querySelector<HTMLElement>('[data-project-overlay-panel]');
          resolve({
            destinationEmpty: destination.hasAttribute('data-route-media-destination-empty'),
            destinationVideoCount: destination.querySelectorAll('video').length,
            destinationBackground: destinationFrame
              ? getComputedStyle(destinationFrame).backgroundColor
              : null,
            panelOpacity: panel ? getComputedStyle(panel).opacity : null,
            paused: video.paused,
            portalBackground: getComputedStyle(portal).backgroundColor,
            posterVisibility: poster ? getComputedStyle(poster).visibility : null,
          });
          return true;
        };
        const interval = window.setInterval(() => {
          if (inspect()) window.clearInterval(interval);
        }, 16);
        window.setTimeout(() => {
          window.clearInterval(interval);
          resolve(null);
        }, 3_000);
      });
    });

    await motionLink.click({ noWaitAfter: true });
    await page.waitForURL((url) => url.pathname !== '/');
    const videoPortalState = await page.evaluate(() => (
      (window as Window & {
        __videoPortalState?: Promise<VideoPortalState | null>;
      }).__videoPortalState ?? null
    ));
    expect(videoPortalState).toEqual({
      destinationEmpty: true,
      destinationVideoCount: 0,
      destinationBackground: 'rgba(0, 0, 0, 0)',
      panelOpacity: '1',
      paused: false,
      portalBackground: 'rgba(0, 0, 0, 0)',
      posterVisibility: null,
    });
    const outboundVideoHandoff = page.locator('[data-continuity-probe="same-video-node"]');
    await expect(outboundVideoHandoff).toBeAttached();
    await expect(outboundVideoHandoff).toHaveAttribute(
      'data-route-media-handoff',
      /^(?:animating|settled)$/u,
    );
    expect(await outboundVideoHandoff.evaluate((video) => (
      (window as Window & { __routeVideoNode?: Element }).__routeVideoNode === video
    ))).toBe(true);
    await expect.poll(() => outboundVideoHandoff.evaluate((video) => (
      (video as HTMLVideoElement).paused
    ))).toBe(false);
    await expect(page.locator('[data-gallery-route-transition-style]')).toHaveCount(0);
    const projectLoop = page.locator(
      '[data-project-hero-media][data-first-media="true"] video[data-short-loop]',
    );
    await expect(projectLoop).toHaveAttribute('data-continuity-probe', 'same-video-node');
    await expect(projectLoop).toHaveAttribute('data-route-video-persisted', 'true');
    await expect(projectLoop).toHaveCSS('object-fit', 'contain');
    await expect(projectLoop).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect.poll(() => projectLoop.evaluate((video) => (
      (video as HTMLVideoElement).currentTime
    ))).toBeGreaterThan(1.25);
    await projectLoop.evaluate(async (element) => {
      const video = element as HTMLVideoElement;
      video.currentTime = .5;
      await video.play();
    });

    type ReturnGalleryMotionState = {
      cardTops: number[];
      layerStates: Array<string | null>;
      flowHoldCounts: number[];
      visibleFooterFrames: number;
    };
    await page.evaluate((targetSlug) => {
      const routeWindow = window as Window & {
        __returnGalleryMotion?: Promise<ReturnGalleryMotionState>;
      };
      routeWindow.__returnGalleryMotion = new Promise<ReturnGalleryMotionState>((resolve) => {
        const cardTops: number[] = [];
        const layerStates: Array<string | null> = [];
        const flowHoldCounts: number[] = [];
        let visibleFooterFrames = 0;
        const startedAt = performance.now();
        let portalSeen = false;
        const sample = () => {
          const portal = document.querySelector('[data-route-media-portal]');
          const card = document.querySelector<HTMLElement>(
            `[data-gallery-item-id="${CSS.escape(targetSlug)}"] .project-card__media`,
          );
          const layer = document.querySelector<HTMLElement>('[data-route-gallery-layer]');
          if (portal) {
            portalSeen = true;
            if (card) cardTops.push(card.getBoundingClientRect().top);
            layerStates.push(layer?.dataset.galleryLayerState ?? null);
            flowHoldCounts.push(document.querySelectorAll('[data-route-gallery-flow-hold]').length);
            const footer = document.querySelector<HTMLElement>('[data-site-footer]');
            if (footer) {
              const footerRect = footer.getBoundingClientRect();
              const footerStyles = getComputedStyle(footer);
              if (
                footerStyles.visibility !== 'hidden'
                && Number.parseFloat(footerStyles.opacity) > 0
                && footerRect.top < window.innerHeight
                && footerRect.bottom > 0
              ) visibleFooterFrames += 1;
            }
          }
          if ((portalSeen && !portal) || performance.now() - startedAt > 3_000) {
            resolve({cardTops, layerStates, flowHoldCounts, visibleFooterFrames});
            return;
          }
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
    }, motionSlug);

    await page.locator('[data-project-overlay-return]').click({ noWaitAfter: true });
    const returnPortal = page.locator('[data-route-media-portal]');
    await expect(returnPortal).toBeAttached();
    await expect(returnPortal).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    const emptyReturnTarget = page.locator(
      `[data-gallery-item-id="${motionSlug}"] .project-card__media[data-route-media-destination-empty]`,
    );
    await expect(emptyReturnTarget).toBeAttached();
    await expect(emptyReturnTarget).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await page.waitForURL((url) => url.pathname === '/');
    const returnGalleryMotion = await page.evaluate(() => (
      (window as Window & {
        __returnGalleryMotion?: Promise<ReturnGalleryMotionState>;
      }).__returnGalleryMotion
    ));
    expect(returnGalleryMotion?.cardTops.length).toBeGreaterThan(2);
    expect(returnGalleryMotion?.layerStates.every((state) => state === 'background')).toBe(true);
    expect(returnGalleryMotion?.flowHoldCounts.every((count) => count === 1)).toBe(true);
    expect(returnGalleryMotion?.visibleFooterFrames).toBe(0);
    expect(
      Math.max(...(returnGalleryMotion?.cardTops ?? [0]))
      - Math.min(...(returnGalleryMotion?.cardTops ?? [0])),
    ).toBeLessThan(1);
    const returnVideoHandoff = page.locator('[data-continuity-probe="same-video-node"]');
    await expect(returnVideoHandoff).toBeAttached();
    await expect(returnVideoHandoff).toHaveAttribute('data-route-media-handoff', 'settled');
    expect(await returnVideoHandoff.evaluate((video) => (
      (window as Window & { __routeVideoNode?: Element }).__routeVideoNode === video
    ))).toBe(true);
    await expect.poll(() => returnVideoHandoff.evaluate((video) => (
      (video as HTMLVideoElement).paused
    ))).toBe(false);
    const returnedPreview = page.locator(
      `[data-gallery-item-id="${motionSlug}"] [data-preview-video]`,
    );
    await expect(returnedPreview).toHaveAttribute('data-continuity-probe', 'same-video-node');
    await expect(returnedPreview).toHaveAttribute('data-route-video-persisted', 'true');
    await expect.poll(() => returnedPreview.evaluate((video) => (
      (video as HTMLVideoElement).currentTime
    ))).toBeGreaterThan(.5);
    await expect(page.locator('[data-route-gallery-flow-hold]')).toHaveCount(0);
    return;
  }

  for (const { selector, index } of [
    { selector: '[data-project-slug="arc"]', index: 0 },
    { selector: '[data-gallery-photo-link]', index: 0 },
    { selector: '[data-gallery-photo-link]', index: 10 },
  ]) {
    await page.goto('/');
    const link = page.locator(selector).nth(index);
    const slug = await link.evaluate((element) =>
      element.closest<HTMLElement>('[data-project-card]')?.dataset.galleryItemId);
    if (!slug) throw new Error('The still gallery card is missing its item id.');

    await link.scrollIntoViewIfNeeded();
    const departureCapture = page.evaluate((targetSlug) => (
      new Promise<{
        handoffRect: { x: number; y: number; width: number; height: number };
        handoffSrc?: string;
        sourceRect: { x: number; y: number; width: number; height: number };
        sourceSrc?: string;
      }>((resolve) => {
        const capture = () => {
          const element = document.querySelector<HTMLElement>('[data-photo-route-handoff]');
          const source = document.querySelector<HTMLElement>(
            `[data-gallery-item-id="${CSS.escape(targetSlug)}"] .project-card__media`,
          );
          if (!element || !source) return;
          const handoffRect = element.getBoundingClientRect();
          const sourceRect = source.getBoundingClientRect();
          observer.disconnect();
          resolve({
            handoffRect: {
              x: handoffRect.x, y: handoffRect.y,
              width: handoffRect.width, height: handoffRect.height,
            },
            handoffSrc: element.querySelector<HTMLImageElement>('img')?.src,
            sourceRect: {
              x: sourceRect.x, y: sourceRect.y,
              width: sourceRect.width, height: sourceRect.height,
            },
            sourceSrc: (() => {
              const image = source.querySelector<HTMLImageElement>('img');
              return image?.currentSrc || image?.src;
            })(),
          });
        };
        const observer = new MutationObserver(capture);
        observer.observe(document.body, { childList: true });
        capture();
      })
    ), slug);
    await link.click({ noWaitAfter: true });

    const handoff = page.locator('[data-photo-route-handoff]');
    await expect(handoff).toBeAttached();
    await expect(handoff).toHaveCSS('view-transition-name', 'none');
    const departureHandoff = await departureCapture;
    const originMediaBox = departureHandoff.sourceRect;
    expect(Math.abs(departureHandoff.handoffRect.x - departureHandoff.sourceRect.x)).toBeLessThan(1);
    expect(Math.abs(departureHandoff.handoffRect.y - departureHandoff.sourceRect.y)).toBeLessThan(1);
    expect(Math.abs(departureHandoff.handoffRect.width - departureHandoff.sourceRect.width)).toBeLessThan(1);
    expect(Math.abs(departureHandoff.handoffRect.height - departureHandoff.sourceRect.height)).toBeLessThan(1);
    expect(departureHandoff.handoffSrc).toBe(departureHandoff.sourceSrc);
    await expect(page.locator('[data-gallery-route-transition-style]')).toHaveCount(0);
    await page.waitForURL((url) => url.pathname !== '/');
    await expect(handoff).toHaveAttribute('data-photo-route-handoff', 'animating');
    await expect(handoff).toHaveAttribute('data-photo-route-layout', 'ready');
    const projectTarget = page.locator(
      '[data-project-hero-media][data-first-media="true"]',
    );
    await expect(projectTarget).toBeAttached();
    const routeImages = handoff.locator('img');
    await expect(routeImages).toHaveCount(2);
    await expect(routeImages.first()).toHaveCSS('opacity', '1');
    const routeFraming = await routeImages.first().evaluate((element) => {
      const target = document.querySelector<HTMLElement>(
        '[data-project-hero-media][data-first-media="true"]',
      );
      const targetImage = target?.querySelector<HTMLImageElement>('img');
      const effect = element.getAnimations()[0]?.effect;
      const keyframes = effect instanceof KeyframeEffect ? effect.getKeyframes() : [];
      const finalFrame = keyframes.at(-1);
      return {
        destinationSrc: (element.parentElement?.querySelectorAll('img')[1] as HTMLImageElement | undefined)
          ?.src,
        handoffTransform: typeof finalFrame?.transform === 'string'
          ? finalFrame.transform
          : 'none',
        targetSrc: targetImage?.currentSrc || targetImage?.src,
        targetTransform: targetImage ? getComputedStyle(targetImage).transform : 'none',
        targetInlineTransition: targetImage?.style.transition,
      };
    });
    expect(routeFraming.destinationSrc).toBe(routeFraming.targetSrc);
    expect(routeFraming.handoffTransform).toBe(routeFraming.targetTransform);
    expect(routeFraming.targetInlineTransition).toBe('none');
    const routeSettledGeometry = await handoff.evaluate((element) => (
      new Promise<{ handoff: DOMRect; target: DOMRect }>((resolve) => {
        const capture = () => {
          if (element.getAttribute('data-photo-route-handoff') !== 'settled') return;
          const target = document.querySelector<HTMLElement>(
            '[data-project-hero-media][data-first-media="true"]',
          );
          const targetImage = target?.querySelector<HTMLImageElement>('img');
          // Route handoffs align with the painted image. Photography figures
          // include extra layout height below the picture and are intentionally
          // not the geometry target.
          const targetFrame = targetImage;
          if (!targetFrame) return;
          observer.disconnect();
          resolve({
            handoff: element.getBoundingClientRect(),
            target: targetFrame.getBoundingClientRect(),
          });
        };
        const observer = new MutationObserver(capture);
        observer.observe(element, { attributes: true, attributeFilter: ['data-photo-route-handoff'] });
        capture();
      })
    ));
    expect(Math.abs(routeSettledGeometry.handoff.x - routeSettledGeometry.target.x)).toBeLessThan(1);
    expect(Math.abs(routeSettledGeometry.handoff.y - routeSettledGeometry.target.y)).toBeLessThan(1);
    expect(Math.abs(routeSettledGeometry.handoff.width - routeSettledGeometry.target.width)).toBeLessThan(1);
    expect(Math.abs(routeSettledGeometry.handoff.height - routeSettledGeometry.target.height)).toBeLessThan(1);
    await expect(handoff).toHaveCount(0, { timeout: 2_000 });
    await expect(projectTarget).toBeVisible();
    await expect.poll(() => projectTarget.locator('img').evaluate((element) => ({
      opacity: (element as HTMLElement).style.opacity,
      transform: (element as HTMLElement).style.transform,
      transition: (element as HTMLElement).style.transition,
    }))).toEqual({ opacity: '', transform: '', transition: '' });

    const storedOrigin = await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem('new-work-origin') || '{}') as {
        slug?: string;
        scrollY?: number;
        historyIndex?: number;
      });
    expect(storedOrigin.slug).toBe(slug);
    expect(storedOrigin.historyIndex).toEqual(expect.any(Number));

    const returnLink = page.locator('[data-project-overlay-return]');
    await returnLink.focus();
    if (originMediaBox) {
      // Activate the return by keyboard while the pointer remains over the
      // destination card. This exercises the tile's hover scale/pan state and
      // catches a final-frame reframing jump that a pointer click cannot.
      await page.mouse.move(
        originMediaBox.x + originMediaBox.width / 2,
        originMediaBox.y + originMediaBox.height / 2,
      );
    }
    await page.keyboard.press('Enter');
    const returnHandoff = page.locator('[data-photo-return-handoff]');
    await expect(returnHandoff).toBeAttached();
    await expect(returnHandoff).toHaveCSS('view-transition-name', 'none');
    await expect(returnHandoff.locator('img').first()).toBeAttached();
    await expect(page.locator('[data-gallery-return-transition-style]')).toHaveCount(0);

    await page.waitForURL((url) => url.pathname === '/');
    await expect(returnHandoff).toHaveAttribute('data-photo-return-handoff', 'animating');
    await expect(returnHandoff).toHaveAttribute('data-photo-return-layout', 'ready');
    const targetMedia = page.locator(
      `[data-gallery-item-id="${slug}"] .project-card__media`,
    );
    await expect(targetMedia).toBeAttached();
    const returnImages = returnHandoff.locator('img');
    await expect(returnImages).toHaveCount(2);
    const returnImage = returnImages.first();
    await expect(returnImage).toHaveCSS('opacity', '1');
    await expect.poll(() => returnImage.evaluate((element) => element.getAnimations().length))
      .toBeGreaterThan(0);
    const framing = await returnImage.evaluate((element, targetSlug) => {
      const targetInner = document.querySelector<HTMLElement>(
        `[data-gallery-item-id="${CSS.escape(targetSlug)}"] [data-card-media]`,
      );
      const effect = element.getAnimations()[0]?.effect;
      const keyframes = effect instanceof KeyframeEffect ? effect.getKeyframes() : [];
      const finalFrame = keyframes.at(-1);
      return {
        handoffTransform: typeof finalFrame?.transform === 'string'
          ? finalFrame.transform
          : 'none',
        destinationSrc: (element.parentElement?.querySelectorAll('img')[1] as HTMLImageElement | undefined)
          ?.src,
        targetSrc: (() => {
          const targetImage = targetInner?.querySelector<HTMLImageElement>('img');
          return targetImage?.currentSrc || targetImage?.src;
        })(),
        targetTransform: targetInner ? getComputedStyle(targetInner).transform : 'none',
        targetInlineTransition: targetInner?.style.transition,
      };
    }, slug);
    expect(framing.handoffTransform).toBe(framing.targetTransform);
    expect(framing.targetTransform).not.toBe('none');
    expect(framing.destinationSrc).toBe(framing.targetSrc);
    expect(framing.targetInlineTransition).toBe('none');
    const settledGeometry = await returnHandoff.evaluate((element, targetSlug) => (
      new Promise<{ handoff: DOMRect; target: DOMRect }>((resolve) => {
        const capture = () => {
          if (element.getAttribute('data-photo-return-handoff') !== 'settled') return;
          const target = document.querySelector<HTMLElement>(
            `[data-gallery-item-id="${CSS.escape(targetSlug)}"] .project-card__media`,
          );
          if (!target) return;
          observer.disconnect();
          resolve({
            handoff: element.getBoundingClientRect(),
            target: target.getBoundingClientRect(),
          });
        };
        const observer = new MutationObserver(capture);
        observer.observe(element, { attributes: true, attributeFilter: ['data-photo-return-handoff'] });
        capture();
      })
    ), slug);
    expect(Math.abs(settledGeometry.handoff.x - settledGeometry.target.x)).toBeLessThan(1);
    expect(Math.abs(settledGeometry.handoff.y - settledGeometry.target.y)).toBeLessThan(1);
    expect(Math.abs(settledGeometry.handoff.width - settledGeometry.target.width)).toBeLessThan(1);
    expect(Math.abs(settledGeometry.handoff.height - settledGeometry.target.height)).toBeLessThan(1);
    await expect(returnHandoff).toHaveCount(0, { timeout: 2_000 });
    await expect(targetMedia).toBeVisible();
    await expect.poll(() => targetMedia.locator('[data-card-media]').evaluate((element) => ({
      transform: (element as HTMLElement).style.transform,
      transition: (element as HTMLElement).style.transition,
    }))).toEqual({ transform: '', transition: '' });
    await expect(page.locator('[data-gallery-entrance]'))
      .toHaveAttribute('data-gallery-entrance-state', 'settled');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(storedOrigin.scrollY);
    const firstBox = await targetMedia.boundingBox();
    await page.waitForTimeout(220);
    const settledBox = await targetMedia.boundingBox();
    expect(Math.abs((settledBox?.y ?? 0) - (firstBox?.y ?? 0))).toBeLessThan(2);
  }

  await page.goto('/');
  const motionLink = page.locator('[data-project-link]:has([data-preview-video])').first();
  const motionSlug = await motionLink.getAttribute('data-project-slug');
  if (!motionSlug) throw new Error('The motion gallery card is missing its project slug.');
  await motionLink.scrollIntoViewIfNeeded();
  const motionPreview = motionLink.locator('[data-preview-video]');
  await expect.poll(() => motionPreview.evaluate((video) => (
    (video as HTMLVideoElement).readyState
  ))).toBeGreaterThanOrEqual(1);
  await motionPreview.evaluate(async (element) => {
    const video = element as HTMLVideoElement;
    video.currentTime = 1.25;
    await video.play();
    video.dataset.playing = 'true';
  });
  await motionLink.click({ noWaitAfter: true });

  const motionStyle = page.locator('[data-gallery-route-transition-style]');
  await expect(motionStyle).toHaveAttribute('data-gallery-route-transition-kind', 'motion');
  const motionCss = await motionStyle.evaluate((element) => element.textContent || '');
  expect(motionCss).not.toContain('@keyframes new-work-still-transition-old');
  expect(motionCss).not.toContain('object-fit: cover');
  await page.waitForURL((url) => url.pathname !== '/');

  const projectLoop = page.locator(
    '[data-project-hero-media][data-first-media="true"] video[data-short-loop]',
  );
  await expect(projectLoop).toHaveAttribute('data-route-video-restored', 'true');
  await expect.poll(() => projectLoop.evaluate((video) => (
    (video as HTMLVideoElement).currentTime
  ))).toBeGreaterThan(1.25);
  await expect(projectLoop).not.toHaveAttribute('data-route-transition-active', 'true');

  await projectLoop.evaluate(async (element) => {
    const video = element as HTMLVideoElement;
    video.currentTime = 2.5;
    await video.play();
  });

  await page.locator('[data-project-overlay-return]').click({ noWaitAfter: true });
  const motionReturnStyle = page.locator('[data-gallery-return-transition-style]');
  await expect(motionReturnStyle).toHaveAttribute('data-gallery-return-transition-style', 'settled');
  const motionReturnCss = await motionReturnStyle.evaluate((element) => element.textContent || '');
  expect(motionReturnCss).toContain('::view-transition-group(root)');
  expect(motionReturnCss).not.toContain('::view-transition-group(project-');
  expect(motionReturnCss).not.toContain('object-fit: cover');
  expect(motionReturnCss).toContain('@keyframes new-work-gallery-return-in');
  await page.waitForURL((url) => url.pathname === '/');
  const restoredMotionCard = page.locator(`[data-gallery-item-id="${motionSlug}"]`);
  await expect(restoredMotionCard).toBeAttached();
  const restoredPreview = restoredMotionCard.locator('[data-preview-video]');
  await expect(restoredPreview).toHaveAttribute('data-route-video-restored', 'true');
  await expect.poll(() => restoredPreview.evaluate((video) => (
    (video as HTMLVideoElement).currentTime
  ))).toBeGreaterThan(2.5);
  await expect.poll(() => restoredPreview.evaluate((video) => (
    (video as HTMLVideoElement).paused
  ))).toBe(false);
  await expect(page.locator('[data-gallery-entrance]'))
    .toHaveAttribute('data-gallery-entrance-state', 'settled');
});

test('landscape photos use the same reversible live portal without distortion', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile-'), 'The desktop landscape-to-portrait morph exercises the largest aspect-ratio change.');
  await page.setViewportSize({ width: 1_440, height: 1_000 });
  await page.goto('/');

  type PortalCapture = {
    frameRatio: number;
    imageRatio: number;
    objectFit: string;
    position: string;
    topmost: boolean;
    viewTransitionName: string;
    zIndex: number;
    visualRatio: number;
  };
  const beginNextPortalCapture = () => page.evaluate(() => {
    const captureWindow = window as Window & {
      __routePortalCapture?: Promise<PortalCapture | null>;
    };
    captureWindow.__routePortalCapture = new Promise<PortalCapture | null>((resolve) => {
      let timeout = 0;
      let interval = 0;
      const inspect = (portal: HTMLElement) => {
        const image = portal.querySelector('img');
        if (!(image instanceof HTMLImageElement)) return false;
        const frame = portal.getBoundingClientRect();
        const centerX = frame.left + frame.width / 2;
        const centerY = frame.top + frame.height / 2;
        const previousPointerEvents = portal.style.pointerEvents;
        // The production portal deliberately ignores input. Temporarily make
        // it hit-testable so elementsFromPoint can verify its paint order.
        portal.style.pointerEvents = 'auto';
        const topElement = document.elementsFromPoint(centerX, centerY)[0];
        portal.style.pointerEvents = previousPointerEvents;
        const portalStyle = getComputedStyle(portal);
        const imageStyle = getComputedStyle(image);
        const visual = image.getBoundingClientRect();
        window.clearTimeout(timeout);
        window.clearInterval(interval);
        resolve({
          frameRatio: frame.width / frame.height,
          imageRatio: image.naturalWidth / image.naturalHeight,
          objectFit: imageStyle.objectFit,
          position: portalStyle.position,
          topmost: Boolean(topElement && (
            topElement === portal || portal.contains(topElement)
          )),
          viewTransitionName: portalStyle.viewTransitionName,
          zIndex: Number(portalStyle.zIndex),
          visualRatio: visual.width / visual.height,
        });
        return true;
      };
      const scan = () => {
        const portal = document.querySelector<HTMLElement>('[data-route-media-portal]');
        if (portal) inspect(portal);
      };
      scan();
      interval = window.setInterval(scan, 16);
      timeout = window.setTimeout(() => {
        window.clearInterval(interval);
        resolve(null);
      }, 3_000);
    });
  });
  const readNextPortalCapture = () => page.evaluate(() => (
    (window as Window & {
      __routePortalCapture?: Promise<PortalCapture | null>;
    }).__routePortalCapture ?? null
  ));

  const link = page.locator(
    '[data-gallery-item-id="michael-selected-photography--michael-wow-rainbow-pavement"] a',
  );
  await link.scrollIntoViewIfNeeded();
  await beginNextPortalCapture();
  await link.click({ noWaitAfter: true });
  await page.waitForURL('**/work/michael-selected-photography/michael-wow-rainbow-pavement');
  const outboundPortal = await readNextPortalCapture();
  expect(outboundPortal).not.toBeNull();
  expect(outboundPortal?.position).toBe('fixed');
  expect(outboundPortal?.viewTransitionName).toBe('none');
  expect(outboundPortal?.zIndex).toBeGreaterThan(2_147_483_000);
  // The portal gives the exact image explicit intrinsic-ratio geometry while
  // its clipping frame morphs from cover to contain. `fill` therefore cannot
  // distort it, and avoids the discrete object-fit jump between those states.
  expect(outboundPortal?.objectFit).toBe('fill');
  expect(outboundPortal?.topmost).toBe(true);
  expect(outboundPortal?.imageRatio).toBeGreaterThan(1.45);
  expect(Math.abs(
    (outboundPortal?.visualRatio ?? 0) - (outboundPortal?.imageRatio ?? 0),
  )).toBeLessThan(.01);
  expect(outboundPortal?.frameRatio).toBeGreaterThan(0);
  await expect(page.locator('[data-gallery-photo-primary]')).toHaveCount(0);
  await expect(page.locator('[data-route-media-portal]')).toHaveCount(0, { timeout: 2_000 });

  await page.evaluate(() => {
    const routeWindow = window as Window & {
      __returnPortalSeen?: boolean;
      __returnPortalObserver?: MutationObserver;
    };
    routeWindow.__returnPortalSeen = false;
    routeWindow.__returnPortalObserver?.disconnect();
    routeWindow.__returnPortalObserver = new MutationObserver(() => {
      if (document.querySelector('[data-route-media-portal], [data-photo-return-handoff]')) {
        routeWindow.__returnPortalSeen = true;
      }
    });
    routeWindow.__returnPortalObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  });
  await page.locator('[data-project-overlay-return]').click({ noWaitAfter: true });
  await expect(page.locator('[data-gallery-return-transition-style]')).toHaveCount(0);
  await page.waitForURL((url) => url.pathname === '/');
  await page.waitForTimeout(450);
  expect(await page.evaluate(() => {
    const routeWindow = window as Window & {
      __returnPortalSeen?: boolean;
      __returnPortalObserver?: MutationObserver;
    };
    routeWindow.__returnPortalObserver?.disconnect();
    return routeWindow.__returnPortalSeen;
  })).toBe(true);
  await expect(page.locator('[data-route-media-portal]')).toHaveCount(0, { timeout: 2_000 });
  await expect(page.locator('[data-photo-return-handoff]')).toHaveCount(0);
  const returnedMedia = page.locator(
    '[data-gallery-item-id="michael-selected-photography--michael-wow-rainbow-pavement"] .project-card__media',
  );
  await expect(returnedMedia).toBeVisible();
  await expect(returnedMedia.locator('.responsive-image'))
    .toHaveAttribute('data-route-media-handoff', 'settled');
  const firstReturnedBox = await returnedMedia.boundingBox();
  await page.waitForTimeout(220);
  const settledReturnedBox = await returnedMedia.boundingBox();
  expect(Math.abs((settledReturnedBox?.x ?? 0) - (firstReturnedBox?.x ?? 0))).toBeLessThan(1);
  expect(Math.abs((settledReturnedBox?.y ?? 0) - (firstReturnedBox?.y ?? 0))).toBeLessThan(1);
});

test('ClientRouter fallback preserves the exact media nodes without native snapshots', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Document.prototype, 'startViewTransition', {
      configurable: true,
      value: undefined,
    });
  });
  await page.setViewportSize({ width: 1_440, height: 1_000 });
  await page.goto('/');
  expect(await page.evaluate(() => typeof document.startViewTransition)).toBe('undefined');

  const stillLink = page.locator('[data-project-slug="arc"]');
  await stillLink.scrollIntoViewIfNeeded();
  await stillLink.locator('.responsive-image').evaluate((element) => {
    element.dataset.continuityProbe = 'fallback-still-node';
    (window as Window & { __fallbackStillNode?: Element }).__fallbackStillNode = element;
  });
  await stillLink.click({ noWaitAfter: true });
  await page.waitForURL('**/work/arc');
  const projectStill = page.locator('[data-continuity-probe="fallback-still-node"]');
  await expect(projectStill).toHaveAttribute(
    'data-route-media-handoff',
    /^(?:animating|settled)$/u,
  );
  expect(await projectStill.evaluate((element) => (
    (window as Window & { __fallbackStillNode?: Element }).__fallbackStillNode === element
  ))).toBe(true);
  await page.locator('[data-project-overlay-return]').click({ noWaitAfter: true });
  await page.waitForURL((url) => url.pathname === '/');
  const returnedStill = page.locator('[data-continuity-probe="fallback-still-node"]');
  expect(await returnedStill.evaluate((element) => (
    (window as Window & { __fallbackStillNode?: Element }).__fallbackStillNode === element
  ))).toBe(true);

  await page.goto('/');
  const motionLink = page.locator('[data-project-link]:has([data-preview-video])').first();
  await motionLink.scrollIntoViewIfNeeded();
  const preview = motionLink.locator('[data-preview-video]');
  await expect.poll(() => preview.evaluate((video) => (
    (video as HTMLVideoElement).readyState
  )), { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
  await preview.evaluate(async (element) => {
    const video = element as HTMLVideoElement;
    video.dataset.continuityProbe = 'fallback-video-node';
    video.dataset.playing = 'true';
    (window as Window & { __fallbackVideoNode?: Element }).__fallbackVideoNode = video;
    video.currentTime = .25;
    await video.play();
  });
  await motionLink.click({ noWaitAfter: true });
  await page.waitForURL((url) => url.pathname !== '/');
  const projectVideo = page.locator('[data-continuity-probe="fallback-video-node"]');
  await expect(projectVideo).toHaveAttribute('data-route-video-persisted', 'true');
  expect(await projectVideo.evaluate((video) => (
    (window as Window & { __fallbackVideoNode?: Element }).__fallbackVideoNode === video
  ))).toBe(true);
  expect(await projectVideo.evaluate((video) => (video as HTMLVideoElement).paused)).toBe(false);

  const projectLoop = page.locator(
    '[data-project-hero-media][data-first-media="true"] video[data-short-loop]',
  );
  await expect(projectLoop).toBeAttached();
  await page.locator('[data-project-overlay-return]').click({ noWaitAfter: true });
  await page.waitForURL((url) => url.pathname === '/');
  const returnedVideo = page.locator('[data-continuity-probe="fallback-video-node"]');
  expect(await returnedVideo.evaluate((video) => (
    (window as Window & { __fallbackVideoNode?: Element }).__fallbackVideoNode === video
  ))).toBe(true);
  await expect.poll(() => returnedVideo.evaluate((video) => (
    (video as HTMLVideoElement).paused
  ))).toBe(false);
});

test('the work-project coordinator remains stable through repeated clicks and browser Back', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile-'), 'The desktop stress cycle complements the dedicated mobile continuity check.');
  await page.setViewportSize({ width: 1_440, height: 1_000 });
  await page.goto('/');

  const link = page.locator('[data-project-slug="arc"]');
  await link.scrollIntoViewIfNeeded();
  await link.locator('.responsive-image').evaluate((element) => {
    element.dataset.continuityProbe = 'coordinator-stress-node';
    (window as Window & { __coordinatorStressNode?: Element }).__coordinatorStressNode = element;
  });

  for (let cycle = 0; cycle < 2; cycle += 1) {
    await page.locator('[data-project-slug="arc"]').click({ noWaitAfter: true });
    await page.waitForURL('**/work/arc');
    const hero = page.locator('[data-continuity-probe="coordinator-stress-node"]');
    await expect(hero).toHaveAttribute('data-route-media-continuity', 'arc');
    expect(await hero.evaluate((element) => (
      (window as Window & { __coordinatorStressNode?: Element }).__coordinatorStressNode === element
    ))).toBe(true);
    const storedOriginScroll = await page.evaluate(() => (
      JSON.parse(sessionStorage.getItem('new-work-origin') || '{}') as { scrollY?: number }
    ).scrollY);
    expect(storedOriginScroll).toEqual(expect.any(Number));
    await expect(page.locator('[data-route-media-portal]')).toHaveCount(0, { timeout: 2_000 });

    if (cycle === 0) await page.goBack();
    else await page.locator('[data-project-overlay-return]').click({ noWaitAfter: true });
    await page.waitForURL((url) => url.pathname === '/');

    const returned = page.locator(
      '[data-gallery-item-id="arc"] [data-continuity-probe="coordinator-stress-node"]',
    );
    await expect(returned).toHaveAttribute('data-route-media-handoff', 'settled');
    expect(await returned.evaluate((element) => (
      (window as Window & { __coordinatorStressNode?: Element }).__coordinatorStressNode === element
    ))).toBe(true);
    await expect(page.locator('[data-route-media-portal], [data-photo-route-handoff], [data-photo-return-handoff]'))
      .toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(storedOriginScroll);

    const firstBox = await page.locator('[data-gallery-item-id="arc"] .project-card__media').boundingBox();
    await page.waitForTimeout(260);
    const settledBox = await page.locator('[data-gallery-item-id="arc"] .project-card__media').boundingBox();
    expect(Math.abs((settledBox?.x ?? 0) - (firstBox?.x ?? 0))).toBeLessThan(1);
    expect(Math.abs((settledBox?.y ?? 0) - (firstBox?.y ?? 0))).toBeLessThan(1);
  }
});

test('mobile still-photo navigation keeps the persisted image visible through the route swap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  if (await page.evaluate(() => Boolean(
    document.querySelector('meta[name="astro-view-transitions-enabled"]'),
  ))) {
    const link = page.locator('[data-project-slug="arc"]');
    await link.scrollIntoViewIfNeeded();
    const originScroll = await page.evaluate(() => window.scrollY);
    await link.locator('.responsive-image').evaluate((element) => {
      element.setAttribute('data-continuity-probe', 'mobile-still-node');
    });
    await link.click({ noWaitAfter: true });
    await page.waitForURL('**/work/arc');
    const heroImage = page.locator(
      '[data-project-hero-media][data-first-media="true"] .responsive-image',
    );
    await expect(heroImage).toHaveAttribute('data-continuity-probe', 'mobile-still-node');
    await expect(page.locator('[data-photo-route-handoff]')).toHaveCount(0);

    await page.locator('[data-project-overlay-return]').click({ noWaitAfter: true });
    await page.waitForURL((url) => url.pathname === '/');
    await expect(page.locator('[data-gallery-item-id="arc"] .responsive-image'))
      .toHaveAttribute('data-continuity-probe', 'mobile-still-node');
    await expect(page.locator('[data-photo-return-handoff]')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(originScroll);
    return;
  }

  const link = page.locator('[data-project-slug="arc"]');
  await link.scrollIntoViewIfNeeded();
  await link.click({ noWaitAfter: true });

  const handoff = page.locator('[data-photo-route-handoff]');
  await expect(handoff).toBeAttached();
  await page.waitForURL('**/work/arc');
  await expect(handoff).toHaveAttribute('data-photo-route-handoff', 'animating');
  await expect(handoff.locator('img').first()).toBeAttached();
  await expect(handoff).toHaveCount(0, { timeout: 2_000 });
  await expect(page.locator('[data-project-hero-media][data-first-media="true"]')).toBeVisible();

  const originScroll = await page.evaluate(() =>
    (JSON.parse(sessionStorage.getItem('new-work-origin') || '{}') as { scrollY?: number }).scrollY);
  await page.locator('[data-project-overlay-return]').click({ noWaitAfter: true });
  const returnHandoff = page.locator('[data-photo-return-handoff]');
  await expect(returnHandoff).toBeAttached();
  await page.waitForURL((url) => url.pathname === '/');
  await expect(returnHandoff).toHaveAttribute('data-photo-return-handoff', 'animating');
  await expect(returnHandoff.locator('img').first()).toBeAttached();
  await expect(returnHandoff).toHaveCount(0, { timeout: 2_000 });
  await expect(page.locator('[data-gallery-item-id="arc"] .project-card__media')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(originScroll);
});

test('ClientRouter navigation persists project media and restores the originating work position', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  test.skip(testInfo.project.name.startsWith('mobile-'), 'Desktop transition CSS is covered at a desktop viewport; mobile continuity has dedicated tests.');
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

  await projectLink.click({ noWaitAfter: true });
  await expect(page.locator('[data-gallery-route-transition-style]')).toHaveCount(0);
  await page.waitForURL(`**/work/${projectSlug}`);
  await expect(page.locator('[data-project-template]')).toBeVisible();
  const persistedHeroImage = page.locator(
    '[data-project-hero-media][data-first-media="true"] .responsive-image',
  );
  await expect(persistedHeroImage).toHaveAttribute('data-route-media-continuity', projectSlug);
  await expect(persistedHeroImage).toHaveAttribute(
    'data-route-media-handoff',
    /^(?:animating|settled)$/u,
  );
  const storedClickOrigin = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem('new-work-origin') || '{}') as { slug?: string; scrollY?: number });
  expect(storedClickOrigin.slug).toBe(projectSlug);
  expect(storedClickOrigin.scrollY).toBeGreaterThan(400);
  const readyHeroPoster = await page.locator(
    '[data-project-hero-media][data-first-media="true"] img[data-project-poster]',
  ).evaluate((image) => ({
    complete: (image as HTMLImageElement).complete,
    currentSrc: (image as HTMLImageElement).currentSrc,
  }));
  expect(readyHeroPoster.complete && Boolean(readyHeroPoster.currentSrc)).toBe(true);
  await expect(page.locator('[data-project-overlay]')).toHaveAttribute('data-overlay-backdrop', 'retained');
  await expect(page.locator('[data-route-gallery-layer] [data-work-gallery]')).toBeAttached();
  await expect(page.locator('[data-route-gallery-layer]'))
    .toHaveAttribute('data-gallery-layer-state', 'background');
  await expect(page.locator('[data-project-overlay-snapshot] img')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-motion-route', `/work/${projectSlug}`);
  const projectTransitionName = await page.locator(
    '[data-project-hero-media][data-first-media="true"]',
  ).evaluate((element) =>
    getComputedStyle(element).viewTransitionName);
  expect(projectTransitionName).toBe(`project-${projectSlug}-media`);
  await expect(page.locator('[data-project-hero-media][data-first-media="true"]'))
    .not.toHaveAttribute('data-route-media-snapshot-disabled');
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
  const storedScrollY = storedClickOrigin.scrollY ?? originScroll;
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(storedScrollY - 40);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(storedScrollY + 40);
  await expect(projectLink).toBeInViewport();

  await expect(page.locator('[data-card-cursor-label]')).toHaveCount(0);

  await projectLink.click();
  await page.waitForURL(`**/work/${projectSlug}`);
  const returnLink = page.locator('[data-project-overlay-return][data-restore-work-scroll]');
  await returnLink.scrollIntoViewIfNeeded();
  await returnLink.click();
  await page.waitForURL(/\/$/u);
  await expect(projectLink).toBeInViewport();
  const restoredOrigin = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem('new-work-origin') || '{}') as { slug?: string; scrollY?: number });
  expect(restoredOrigin.slug).toBe(projectSlug);
  expect(restoredOrigin.scrollY).toBeGreaterThan(400);
});

test('project routes are dismissible inset panels over a blurred gallery surround', async ({ page }) => {
  for (const viewport of [
    { width: 1_440, height: 1_000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/work/arc');

    const overlay = page.locator('[data-project-overlay]');
    const panel = page.locator('[data-project-overlay-panel]');
    const backdrop = page.locator('[data-project-overlay-fallback]');
    const edgeClose = page.locator('[data-project-overlay-edge-close]');
    const returnLink = page.locator('[data-project-overlay-return]');
    await expect(overlay).toBeVisible();
    await expect(panel).toBeVisible();
    await expect(backdrop).toBeVisible();
    await expect(returnLink).toBeVisible();
    await expect(returnLink).toHaveAccessibleName('Return to gallery');
    await expect(returnLink).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(edgeClose).toHaveAttribute('tabindex', '-1');
    await expect(edgeClose).toHaveAccessibleName('Close Arc and return to the gallery');
    await expect(edgeClose).toHaveCSS('cursor', 'pointer');

    const geometry = await panel.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const fallback = document.querySelector<HTMLElement>('[data-project-overlay-fallback]');
      return {
        left: box.left,
        right: window.innerWidth - box.right,
        width: box.width,
        viewportWidth: window.innerWidth,
        filter: fallback ? getComputedStyle(fallback).filter : 'none',
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(geometry.left).toBeGreaterThanOrEqual(viewport.width < 768 ? 9 : 24);
    expect(geometry.right).toBeGreaterThanOrEqual(viewport.width < 768 ? 9 : 24);
    expect(geometry.width).toBeLessThan(geometry.viewportWidth);
    expect(geometry.filter).toContain('blur');
    expect(geometry.overflow).toBeLessThanOrEqual(0);

    await page.mouse.click(Math.max(2, geometry.left / 2), Math.min(viewport.height - 20, 300));
    await page.waitForURL(/\/$/u);
    await expect(page.locator('[data-project-grid]')).toBeVisible();
  }
});

test('project footer is full-width and separated from the overlay panel', async ({ page }) => {
  for (const viewport of [
    { width: 1_440, height: 1_000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/work/arc');

    const geometry = await page.locator('[data-site-footer]').evaluate((element) => {
      const footerBox = element.getBoundingClientRect();
      const panel = document.querySelector<HTMLElement>('[data-project-overlay-panel]');
      if (!panel) throw new Error('Project overlay panel is missing.');
      const styles = getComputedStyle(element);
      return {
        left: footerBox.left,
        right: window.innerWidth - footerBox.right,
        width: footerBox.width,
        viewportWidth: window.innerWidth,
        margin: styles.margin,
        boxShadow: styles.boxShadow,
        sideBorders: Number.parseFloat(styles.borderLeftWidth) + Number.parseFloat(styles.borderRightWidth),
        gap: footerBox.top - panel.getBoundingClientRect().bottom,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(Math.abs(geometry.left)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(geometry.right)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(geometry.width - geometry.viewportWidth)).toBeLessThanOrEqual(1);
    expect(geometry.margin).toBe('0px');
    expect(geometry.boxShadow).toBe('none');
    expect(geometry.sideBorders).toBe(0);
    expect(geometry.gap).toBeGreaterThanOrEqual(viewport.width < 768 ? 18 : 28);
    expect(geometry.gap).toBeLessThanOrEqual(viewport.width < 768 ? 19 : 73);
    expect(geometry.overflow).toBeLessThanOrEqual(0);
  }
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

test('the placeholder About film closes Work above the footer while disabled Notes stay absent', async ({ page }) => {
  await page.goto('/');

  const reel = page.locator('.reel');
  await expect(reel).toBeVisible();
  await expect(reel.locator('[data-deferred-source]')).toHaveAttribute(
    'data-desktop-src',
    /mercury-helen-mayer\/gallery-cut-08s\.mp4/u,
  );
  expect(await reel.evaluate((element) => {
    const footer = document.querySelector('[data-site-footer]');
    return Boolean(footer
      && (element.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING));
  })).toBe(true);
  await expect(page.locator('[data-notes-strip]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Notes' })).toHaveCount(0);
  await expect(page.locator('[data-site-header] a', { hasText: 'Notes' })).toHaveCount(0);

  const muteButton = reel.locator('[data-video-mute]');
  const fullscreenButton = reel.locator('[data-video-fullscreen]');
  await expect(muteButton).toHaveAccessibleName('Unmute video');
  await expect(fullscreenButton).toHaveAccessibleName('Enter full screen');
  await expect(muteButton.locator('[data-media-control-icon="volume-off"]')).toBeVisible();
  await expect(fullscreenButton.locator('[data-media-control-icon="fullscreen"]')).toBeVisible();
  expect(await muteButton.evaluate((button) => button.textContent?.trim())).toBe('');
  expect(await fullscreenButton.evaluate((button) => button.textContent?.trim())).toBe('');
  await muteButton.click();
  await expect(muteButton).toHaveAccessibleName('Mute video');
  await expect(muteButton.locator('[data-media-control-icon="volume-on"]')).toBeVisible();

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
  const introMedia = page.locator('[data-intro-media]');
  if (await introMedia.count()) await expect(introMedia).toHaveCSS('display', 'none');
  const introVideoSource = page.locator('[data-intro-video-source]');
  if (await introVideoSource.count()) await expect(introVideoSource).not.toHaveAttribute('src');
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
  await expect.poll(activeIndexes).not.toHaveLength(0);
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
  const previewMutations = await page.evaluate(() =>
    (window as typeof window & { __previewMutations?: string[] }).__previewMutations ?? [],
  );
  expect(previewMutations.filter((mutation) =>
    before.some((index) => mutation.startsWith(`${index}:`)),
  )).toEqual([]);
  expect(await previews.evaluateAll((videos) => videos
    .filter((video) => video.hasAttribute('src'))
    .every((video) => video.dataset.previewPreloaded === 'true'))).toBe(true);
  expect(await previews.nth(before[0]!).evaluate((video) => {
    const image = video.closest<HTMLElement>('[data-card-media]')
      ?.querySelector<HTMLImageElement>('.responsive-image img');
    return Boolean(image?.currentSrc) && (video as HTMLVideoElement).poster === image?.currentSrc;
  })).toBe(true);
});

test('every predominantly visible gallery preview starts without hover or focus', async ({ page }) => {
  await page.goto('/');
  const olympicsPreview = page.locator(
    '[data-gallery-item-id="olympics-toyota-in-due-time"] [data-preview-video]',
  );
  await olympicsPreview.scrollIntoViewIfNeeded();
  await expect(olympicsPreview).toHaveAttribute('data-playing', 'true');
  await expect(olympicsPreview).toHaveAttribute('src', /\/media\/video-previews\/oliver\/olympics-toyota/u);
  expect(await olympicsPreview.evaluate((video) => (video as HTMLVideoElement).muted)).toBe(true);

  await expect.poll(() => page.locator('[data-project-grid] [data-preview-video]').evaluateAll((videos) => {
    const predominantlyVisible = videos.filter((video) => {
      const bounds = video.getBoundingClientRect();
      const visibleHeight = Math.max(
        0,
        Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0),
      );
      return visibleHeight / Math.max(bounds.height, 1) >= 0.7;
    });
    return predominantlyVisible.filter((video) => video.dataset.playing !== 'true').length;
  })).toBe(0);
});

test('gallery images prepare early while background video requests remain bounded', async ({ page }) => {
  await page.goto('/');
  const imageApproachDistance = await page.evaluate(() => Math.max(720, window.innerHeight * 1.5));

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

  await expect.poll(() => page.locator('[data-preview-video]').evaluateAll((videos) => ({
    prepared: videos.filter((video) => video.hasAttribute('src')).length,
    invalid: videos.filter((video) =>
      video.hasAttribute('src')
      && ((video as HTMLVideoElement).preload !== 'auto'
        || video.dataset.previewPreloaded !== 'true')).length,
  }))).toEqual({
    prepared: expect.any(Number),
    invalid: 0,
  });
  const preparedCount = await page.locator('[data-preview-video][src]').count();
  expect(preparedCount).toBeGreaterThan(0);
  expect(preparedCount).toBeLessThanOrEqual(4);
});

test('touch scrolling plays every predominantly visible preview', async ({ page }) => {
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
  const missingVisiblePreviews = () => previews.evaluateAll((videos) => videos.filter((video) => {
    const bounds = video.getBoundingClientRect();
    const visibleHeight = Math.max(
      0,
      Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0),
    );
    return visibleHeight / Math.max(bounds.height, 1) >= 0.7
      && video.dataset.playing !== 'true';
  }).length);

  await previews.nth(0).evaluate((video) => video.scrollIntoView({ block: 'center' }));
  await expect.poll(missingVisiblePreviews).toBe(0);
  await expect(previews.nth(0)).toHaveAttribute('data-playing', 'true');

  await previews.nth(1).evaluate((video) => video.scrollIntoView({ block: 'center' }));
  await expect.poll(missingVisiblePreviews).toBe(0);
  const playingPreview = page.locator('[data-preview-video][data-playing="true"]');
  expect(await playingPreview.count()).toBeGreaterThan(0);
  await expect(playingPreview.first()).toHaveAttribute('src', /\/media\/video(?:-previews)?\//u);
  expect(await previews.evaluateAll((videos) => videos.filter((video) =>
    !(video as HTMLVideoElement).muted).length)).toBe(0);
});
