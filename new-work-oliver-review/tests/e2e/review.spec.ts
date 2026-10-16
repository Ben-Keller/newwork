import { expect, test, type Page } from '@playwright/test';
const galleryTop = (page: Page) => page.locator('[data-project-card]').first().evaluate(el => el.getBoundingClientRect().top);
async function openHome(page: Page) {
  await page.goto('/#work-gallery', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-logo-work-page]')).toHaveAttribute('data-handoff', 'true');
}

test('four desktop rows retain exactly sixteen unique tiles and two mobile columns', async ({ page }) => {
  await openHome(page);
  await expect(page.locator('[data-project-card]')).toHaveCount(16);
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const result = await page.locator('[data-project-grid]').evaluate(grid => {
      const cards = [...grid.querySelectorAll<HTMLElement>('[data-project-card]')];
      return { columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length, ids: cards.map(card => card.dataset.galleryItemId), lanes: cards.map(card => card.dataset.desktopColumn), overflow: document.documentElement.scrollWidth > innerWidth };
    });
    expect(result.columns).toBe(width >= 1200 ? 4 : 2);
    expect(new Set(result.ids).size).toBe(16);
    for (const lane of ['1','2','3','4']) expect(result.lanes.filter(value => value === lane)).toHaveLength(4);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});

test('Work links select the first gallery row from Contact and the footer', async ({ page, isMobile }) => {
  await page.goto('/contact');
  if (isMobile) await page.locator('[data-menu-trigger]').click();
  const link = isMobile ? page.locator('[data-menu-link]').filter({ hasText: 'Work' }) : page.locator('[data-desktop-nav]').getByRole('link', { name: 'Work' });
  await expect(link).toHaveAttribute('href', '/#work-gallery'); await link.click();
  await expect(page).toHaveURL(/#work-gallery$/);
  await expect.poll(() => galleryTop(page)).toBeLessThan(150);
  await expect.poll(() => galleryTop(page)).toBeGreaterThan(40);
  await page.locator('[data-site-footer]').scrollIntoViewIfNeeded();
  if (isMobile) await page.locator('[data-menu-trigger]').click();
  await link.click();
  await expect.poll(() => galleryTop(page)).toBeLessThan(150);
});

test('first gallery row stays fully painted during upward column momentum', async ({ page }) => {
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await openHome(page);
    const gallery = page.locator('[data-work-gallery]');
    await expect(gallery).toHaveAttribute('data-column-motion', 'first-order');
    await expect(page.locator('[data-project-grid]')).toHaveAttribute('data-masonry-ready', 'true');
    // Let initial anchor positioning and its momentum finish before reversing.
    await expect.poll(() => gallery.evaluate(element => {
      const first = element.querySelector('[data-project-card]')!;
      return Math.abs(first.getBoundingClientRect().top - element.getBoundingClientRect().top);
    })).toBeLessThan(1);

    const result = await gallery.evaluate(async element => {
      const cards = [...element.querySelectorAll<HTMLElement>(
        innerWidth >= 1200 ? '[data-desktop-column-start]' : '[data-tablet-column-start]',
      )];
      const header = document.querySelector('[data-site-header]')!;
      const anchor = document.querySelector('#work-gallery')!;
      const start = scrollY + anchor.getBoundingClientRect().top - header.getBoundingClientRect().height;
      scrollTo(0, start + 180);
      await new Promise(resolve => setTimeout(resolve, 1800));
      let movingFrames = 0;
      let clippedEdges = 0;
      let horizontalOverflow = 0;
      const begun = performance.now();
      scrollTo(0, Math.max(0, start - 180));
      await new Promise<void>(resolve => {
        const sample = () => {
          const boundary = element.getBoundingClientRect();
          const headerBottom = header.getBoundingClientRect().bottom;
          for (const card of cards) {
            const media = card.querySelector('.project-card__media')!;
            const rect = media.getBoundingClientRect();
            if (rect.top < boundary.top - 2 && rect.top > headerBottom + 2) {
              movingFrames++;
              // A real paint/hit test catches clipping even when DOM geometry
              // still reports a complete card outside its parent's bounds.
              const painted = document.elementFromPoint(rect.left + rect.width / 2, rect.top + 1);
              if (!card.contains(painted)) clippedEdges++;
            }
          }
          horizontalOverflow = Math.max(horizontalOverflow, document.documentElement.scrollWidth - innerWidth);
          if (performance.now() - begun < 650) requestAnimationFrame(sample);
          else resolve();
        };
        requestAnimationFrame(sample);
      });
      return { movingFrames, clippedEdges, horizontalOverflow };
    });
    expect(result.movingFrames, `column motion sampled at ${width}px`).toBeGreaterThan(0);
    expect(result.clippedEdges, `complete top edges at ${width}px`).toBe(0);
    expect(result.horizontalOverflow, `no sideways overflow at ${width}px`).toBeLessThanOrEqual(1);
  }
});

test('ticker floats, follows rapid hover and keyboard focus, clears and hides past the gallery', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Touch uses visible labels instead of a floating overlay.');
  await openHome(page);
  const board = page.locator('[data-home-departures]'); const ticker = board.locator('[data-flap-ticker]');
  await expect(board).toHaveAttribute('data-placement', 'floating');
  const idle = await ticker.getAttribute('data-ticker-text');
  const cards = page.locator('[data-project-card]');
  for (const i of [0,1,2,3,0]) { await cards.nth(i).hover(); await expect(ticker).toHaveAttribute('data-ticker-text', new RegExp((await cards.nth(i).getAttribute('data-ticker-title'))!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))); }
  await cards.nth(1).locator('a').focus();
  await cards.nth(2).hover();
  expect(await ticker.getAttribute('data-ticker-text')).toContain(await cards.nth(1).getAttribute('data-ticker-title'));
  await page.locator('[data-site-header] a').first().focus(); await page.mouse.move(5,5);
  await expect(ticker).toHaveAttribute('data-ticker-text', idle!);
  await page.locator('[data-bts]').scrollIntoViewIfNeeded(); await expect(board).toBeHidden();
  await page.evaluate(() => scrollTo(0,0)); await expect(board).toHaveAttribute('data-placement', 'docked'); await expect(board).toBeVisible();
});

test('ticker cycles standalone city clocks and agency messages with independent footer words', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-15T20:59:00Z') });
  await openHome(page);
  const home = page.locator('[data-home-departures] [data-flap-ticker]');
  await page.evaluate(() => scrollTo(0,0));
  await expect(home).toBeInViewport();
  await expect(home).toHaveAttribute('data-ticker-text', 'Film + photo');
  for (const value of ['San Francisco 12:59', 'In production', 'Los Angeles 12:59', 'New work', 'New York 15:59', 'Film + photo']) {
    await page.clock.fastForward(5100);
    await expect(home).toHaveAttribute('data-ticker-text', value);
    await expect.poll(() => home.locator('[data-flap-glyph]').allTextContents().then(glyphs => glyphs.join('').trim())).toBe(value.toUpperCase());
  }
  const footer = page.locator('[data-site-footer] [data-flap-ticker]');
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toBeInViewport();
  // Let the intersection callback resume this board before advancing its timer.
  await page.clock.runFor(100);
  await expect(footer).toHaveAttribute('data-ticker-words', /In transit/);
  await expect(footer).toHaveAttribute('data-ticker-text', 'Arriving');
  await page.clock.fastForward(5100);
  await expect(footer).toHaveAttribute('data-ticker-text', 'In transit');
  for (let i=0;i<3;i++) { await page.goto('/contact'); await openHome(page); }
  await expect(page.locator('[data-flap-ticker]')).toHaveCount(2);
  await expect(page.locator('[data-home-departures]')).toHaveCount(1);
});

test('ticker has one line in a dark casing without captions or controls', async ({ page, isMobile }) => {
  await openHome(page);
  const home = page.locator('[data-home-departures]');
  await expect(home.locator('[data-ticker-caption], .home-departures__caption')).toHaveCount(0);
  await expect(page.locator('[data-flap-ticker] button')).toHaveCount(0);
  await expect(page.locator('[data-ticker-review]')).toHaveCount(0);
  const expectCasing = async () => {
    expect(await home.evaluate(el => [el, el.querySelector('[data-flap-ticker]')!].map(node => {
      const css = getComputedStyle(node);
      return { background: css.backgroundColor, border: css.borderWidth, padding: css.padding, shadow: css.boxShadow };
    }))).toEqual(Array(2).fill({ background: 'rgba(0, 0, 0, 0)', border: '0px', padding: '0px', shadow: 'none' }));
    expect(await home.locator('.flap-ticker__board').evaluate(el => {
      const css = getComputedStyle(el);
      const cells = [...el.querySelectorAll('[data-flap]')];
      return { background: css.backgroundColor, padded: parseFloat(css.padding) > 0, cells: cells.length, lines: new Set(cells.map(cell => cell.getBoundingClientRect().top)).size };
    })).toEqual({ background: 'rgb(11, 11, 11)', padded: true, cells: 20, lines: 1 });
  };
  if (!isMobile) {
    await expect(home).toHaveAttribute('data-placement', 'floating');
    await expectCasing();
  }
  await page.evaluate(() => scrollTo(0,0));
  await expect(home).toHaveAttribute('data-placement', 'docked');
  await expectCasing();
  await page.setViewportSize({ width: 320, height: 800 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('live clock updates minutes while reduced motion holds the rotation still', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-15T20:59:30Z') });
  await openHome(page);
  await page.evaluate(() => scrollTo(0,0));
  const home = page.locator('[data-home-departures] [data-flap-ticker]');
  await expect(home).toBeInViewport();
  await page.clock.fastForward(5100);
  await expect(home).toHaveAttribute('data-ticker-text', 'San Francisco 12:59');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Let the browser deliver the media-query change before jumping the clock.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  await page.clock.fastForward(61000);
  await expect(home).toHaveAttribute('data-ticker-text', 'San Francisco 13:00');
  expect(await home.locator('[data-flap-glyph]').evaluateAll(cells => cells.flatMap(cell => cell.getAnimations()).length)).toBe(0);
});

test('mosaic uses lazy rectangular photographs and ordinary keyboard-accessible links', async ({ page }) => {
  await openHome(page);
  const bts = page.locator('[data-bts]');
  await expect(bts).toHaveAttribute('data-bts-layout', 'mosaic');
  await expect(bts.locator('[data-carousel-stage], button, canvas')).toHaveCount(0);
  const frames=bts.locator('.bts__frame'); expect(await frames.count()).toBeGreaterThan(3);
  for (const image of await bts.locator('img').all()) await expect(image).toHaveAttribute('loading', 'lazy');
  await frames.first().focus(); await expect(frames.first()).toBeFocused();
  await expect(frames.first()).toHaveAttribute('href', /\/work\//);
  const sizes=await frames.first().evaluate(el=>({frame:el.getBoundingClientRect().height,image:el.querySelector('img')!.getBoundingClientRect().height}));
  expect(Math.abs(sizes.frame-sizes.image)).toBeLessThan(2);
});

test('compact Contact, footer and header stay contained at narrow widths and 200 percent zoom equivalent', async ({ page }) => {
  for (const width of [1440,720,390,320]) {
    await page.setViewportSize({width,height:900}); await page.goto('/contact');
    await expect(page.locator('.contact-content h1')).toHaveText('Contact');
    await expect(page.locator('.contact-email')).toHaveAttribute('href', /^mailto:/);
    await expect.poll(() => page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    expect(await page.locator('.contact-content h1').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(128);
    await expect(page.locator('.site-footer__wordmark svg')).toBeAttached();
  }
});

test('prototype remains noindex and has no console errors or missing first-party assets', async ({ page }) => {
  const failures:string[]=[];
  page.on('pageerror',error=>failures.push(error.message));
  page.on('response',response=>{if(response.url().startsWith('http://127.0.0.1:') && response.status()>=400)failures.push(`${response.status()} ${response.url()}`);});
  await openHome(page); await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/noindex/);
  await page.locator('[data-project-card] a').first().click(); await expect(page).toHaveURL(/\/work\//);
  await expect(page.locator('[data-home-departures]')).toHaveCount(0);
  await page.goBack(); await expect(page.locator('[data-project-card]')).toHaveCount(16);
  await expect(page.locator('[data-home-departures]')).toHaveCount(1);
  expect(failures).toEqual([]);
});


test('browser Back restores the selected gallery position even when the URL has the Work anchor', async ({ page }) => {
  await openHome(page);
  const card = page.locator('[data-project-link]').nth(12);
  await card.scrollIntoViewIfNeeded();
  await card.click();
  await expect(page).toHaveURL(/\/work\//);
  const origin = await page.evaluate(() => JSON.parse(sessionStorage.getItem('oliver-review-2026-10::new-work-origin') || '{}').scrollY as number);
  expect(origin).toBeGreaterThan(600);
  await page.goBack();
  await expect(page).toHaveURL(/#work-gallery$/);
  await expect.poll(async () => Math.abs(await page.evaluate(() => scrollY) - origin)).toBeLessThan(1);
});

test('exact vector marks, header descriptor and footer travel board replace the previous identity', async ({ page }) => {
  await openHome(page);
  await expect(page.locator('[data-site-header] .site-header__brand .oliver-brand--compact svg path')).toHaveCount(4);
  await expect(page.locator('[data-home-identity] [data-wordmark-art] path')).toHaveCount(8);
  await expect(page.locator('.site-header__descriptor')).toHaveText('film + photo production agency');
  await expect(page.locator('[data-logo-descriptor]')).toHaveCount(0);
  const footer = page.locator('[data-site-footer]');
  await footer.scrollIntoViewIfNeeded();
  await expect(footer.locator('.oliver-brand--stacked svg path')).toHaveCount(8);
  await expect(footer.locator('[data-flap-ticker]')).toHaveAttribute('data-ticker-words', '["Arriving","In transit","Departing","Early"]');
  await expect(footer.locator('.site-footer__discipline')).not.toContainText('IS');
  await expect(page.getByText('Looking to create something impactful?')).toBeAttached();
  await expect(footer.locator('.site-footer__featured-link')).toHaveCount(8);
});


test('Contact contains long email and multiline location content without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 }); await page.goto('/contact');
  await page.locator('.contact-email > span').first().evaluate(el => { el.textContent = 'production-and-partnerships@averylongagencydomain.example'; });
  await page.locator('.contact-location').evaluate(el => { el.textContent = 'New Work Agency\n123 Example Street, Suite 456\nSan Francisco, California 94103'; });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('clock catches up after a hidden tab resumes without advancing decorative words', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-15T20:59:30Z') });
  await openHome(page);
  const home = page.locator('[data-home-departures] [data-flap-ticker]');
  await page.evaluate(() => scrollTo(0,0));
  await expect(home).toBeInViewport();
  await page.clock.fastForward(5100);
  await expect(home).toHaveAttribute('data-ticker-text', 'San Francisco 12:59');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.fastForward(120000);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(home).toHaveAttribute('data-ticker-text', 'San Francisco 13:01');
  await expect(home.locator('[data-ticker-accessible]')).toContainText('NYC 16:01');
});
