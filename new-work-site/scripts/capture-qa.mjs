import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const baseUrl = (process.env.QA_BASE_URL || 'http://127.0.0.1:4321').replace(/\/$/u, '');
const outputRoot = new globalThis.URL('../artifacts/qa/', import.meta.url);
const desktop = { width: 1440, height: 1_000 };
const tablet = { width: 1024, height: 768 };
const mobile = { width: 390, height: 844 };
const narrowMobile = { width: 320, height: 700 };
const captured = [];

const outputPath = (name) => fileURLToPath(new globalThis.URL(`${name}.jpg`, outputRoot));

const settlePage = async (page, delay = 900) => {
  await page.evaluate(async () => {
    const visibleImages = [...globalThis.document.images].filter((image) => {
      const box = image.getBoundingClientRect();
      return box.top < globalThis.window.innerHeight && box.bottom > 0;
    });
    await Promise.all(visibleImages.map((image) => image.decode().catch(() => undefined)));
    await globalThis.document.fonts.ready;
    await new Promise((resolve) => globalThis.requestAnimationFrame(() =>
      globalThis.requestAnimationFrame(resolve)));
  });
  await page.waitForTimeout(delay);
};

const capture = async (page, name) => {
  await page.screenshot({
    path: outputPath(name),
    type: 'jpeg',
    quality: 86,
    fullPage: false,
  });
  captured.push(name);
};

const captureAnchored = async (page, selector, name) => {
  const target = page.locator(selector);
  await target.waitFor({ state: 'attached' });
  await target.evaluate((element) => {
    const top = globalThis.window.scrollY + element.getBoundingClientRect().top;
    const headerOffset = Math.min(120, globalThis.window.innerHeight * .12);
    globalThis.window.scrollTo(0, Math.max(0, top - headerOffset));
  });
  await settlePage(page, 450);
  await capture(page, name);
};

const createSettledContext = async (browser, viewport, options = {}) => {
  const context = await browser.newContext({ viewport, ...options });
  await context.addInitScript(() => {
    globalThis.window.sessionStorage.setItem('new-work:logo-intro:v2', 'seen');
  });
  return context;
};

await mkdir(outputRoot, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  // Opening composition: use a fresh session to capture the masked-media
  // entrance, independent cell flip, and settled black title.
  const openingContext = await browser.newContext({ viewport: desktop });
  const openingPage = await openingContext.newPage();
  await openingPage.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  const openingTitle = openingPage.locator('[data-logo-intro]');
  await openingTitle.waitFor({ state: 'attached' });
  await openingPage.locator('[data-logo-intro][data-state="ready"]').waitFor({ timeout: 5_000 });
  await openingPage.waitForTimeout(160);
  await capture(openingPage, 'opening-desktop-1440x1000');
  await openingPage.waitForTimeout(1_350);
  await capture(openingPage, 'opening-flip-desktop-1440x1000');
  await openingPage.locator('[data-logo-intro][data-state="settled"]').waitFor({ timeout: 4_500 });
  await capture(openingPage, 'opening-final-desktop-1440x1000');
  await openingContext.close();

  const desktopContext = await createSettledContext(browser, desktop);
  const desktopPage = await desktopContext.newPage();

  await desktopPage.goto(`${baseUrl}/`, { waitUntil: 'load' });
  await settlePage(desktopPage);
  await capture(desktopPage, 'home-after-intro-desktop-1440x1000');

  const hoverCard = desktopPage.locator('[data-project-link]').first();
  await hoverCard.hover({ position: { x: 100, y: 160 } });
  await desktopPage.locator('[data-card-cursor-label][data-cursor-visible="true"]').waitFor();
  await desktopPage.locator('.project-card__label--overlay').first().waitFor({ state: 'visible' });
  await settlePage(desktopPage, 300);
  await capture(desktopPage, 'home-card-hover-desktop-1440x1000');

  await desktopPage.goto(`${baseUrl}/`, { waitUntil: 'load' });
  const transitionCard = desktopPage.locator('[data-project-link][data-project-slug="arc"]');
  await transitionCard.scrollIntoViewIfNeeded();
  await settlePage(desktopPage, 180);
  await transitionCard.click();
  await desktopPage.waitForURL('**/work/arc');
  await desktopPage.locator('[data-first-media="true"]').waitFor();
  await settlePage(desktopPage, 900);
  await capture(desktopPage, 'gallery-transition-destination-desktop-1440x1000');

  const desktopRoutes = [
    { name: 'cinematic-project-desktop-1440x1000', path: '/work/mercury-an-unexpected-life' },
    { name: 'photo-project-desktop-1440x1000', path: '/work/arc' },
    { name: 'about-desktop-1440x1000', path: '/about' },
    { name: 'contact-desktop-1440x1000', path: '/contact' },
    { name: '404-desktop-1440x1000', path: '/qa-missing-route' },
  ];
  for (const route of desktopRoutes) {
    await desktopPage.goto(`${baseUrl}${route.path}`, { waitUntil: 'load' });
    await settlePage(desktopPage);
    await capture(desktopPage, route.name);
    if (route.path === '/about') {
      await captureAnchored(
        desktopPage,
        '[data-about-person="oliver"]',
        'about-oliver-desktop-1440x1000',
      );
      await captureAnchored(
        desktopPage,
        '[data-about-person="michael"]',
        'about-michael-desktop-1440x1000',
      );
      await captureAnchored(
        desktopPage,
        '[data-about-person="anjali"]',
        'about-anjali-desktop-1440x1000',
      );
    }
  }
  await desktopContext.close();

  const tabletContext = await createSettledContext(browser, tablet);
  const tabletPage = await tabletContext.newPage();
  await tabletPage.goto(`${baseUrl}/`, { waitUntil: 'load' });
  await settlePage(tabletPage);
  await capture(tabletPage, 'home-tablet-1024x768');
  await tabletPage.goto(`${baseUrl}/about`, { waitUntil: 'load' });
  await settlePage(tabletPage);
  await capture(tabletPage, 'about-tablet-1024x768');
  await tabletContext.close();

  for (const viewport of [mobile, narrowMobile]) {
    const suffix = `${viewport.width}x${viewport.height}`;
    const context = await createSettledContext(browser, viewport, { hasTouch: true, isMobile: true });
    const page = await context.newPage();
    const routes = [
      { name: `home-mobile-${suffix}`, path: '/' },
      { name: `cinematic-project-mobile-${suffix}`, path: '/work/mercury-an-unexpected-life' },
      { name: `photo-project-mobile-${suffix}`, path: '/work/arc' },
      { name: `about-mobile-${suffix}`, path: '/about' },
    ];
    for (const route of routes) {
      await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'load' });
      await settlePage(page);
      await capture(page, route.name);
      if (route.path === '/about') {
        await captureAnchored(
          page,
          '[data-about-person="oliver"]',
          `about-oliver-mobile-${suffix}`,
        );
        await captureAnchored(
          page,
          '[data-about-person="michael"]',
          `about-michael-mobile-${suffix}`,
        );
        await captureAnchored(
          page,
          '[data-about-person="anjali"]',
          `about-anjali-mobile-${suffix}`,
        );
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(`Captured ${captured.length} kinetic QA states in artifacts/qa/:\n${captured.join('\n')}`);
