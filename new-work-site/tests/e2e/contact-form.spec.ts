import { expect, test, type Page } from '@playwright/test';

const endpoint = 'https://formspree.io/f/abcdefgh';
const message = 'A short film about independent makers.\nLaunching in spring.';
const success = { next: 'https://formspree.io/thanks', ok: true };

// Simulate the CMS-provided endpoint without creating or messaging a real form.
async function configureForm(page: Page) {
  await page.route('**/contact', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace(/<form\b[^>]*data-contact-form[^>]*>/u, tag =>
      `${tag.slice(0, -1)} action="${endpoint}" data-contact-recipient="enquiries@newworkagency.com">`)
      .replace(/<fieldset disabled\b/u, '<fieldset')
      .replace(/>Copy enquiry</u, '>Send enquiry<');
    await route.fulfill({ response, body });
  });
}

async function fillEnquiry(page: Page) {
  await page.getByRole('textbox', { name: 'Your project', exact: true }).fill(message);
  await page.getByRole('textbox', { name: 'Your name', exact: true }).fill('Alex Client');
  await page.getByRole('textbox', { name: 'Your email', exact: true }).fill('alex@client.com');
}

test.beforeEach(async ({ page }) => {
  // Even a failing test must never send a real enquiry.
  await page.route('https://formspree.io/**', route => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('unconfigured form copies an enquiry and never sends personal data', async ({ page }) => {
  const posts: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
  await page.goto('/contact');
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async (text: string) => { document.documentElement.dataset.copiedEnquiry = text; },
    } });
  });
  await fillEnquiry(page);
  await page.getByRole('button', { name: 'Copy enquiry' }).click();
  await expect(page.locator('[data-enquiry-status]')).toHaveText('Enquiry copied. Nothing has been sent.');
  expect(await page.evaluate(() => document.documentElement.dataset.copiedEnquiry)).toContain('Email: alex@client.com');
  expect(posts).toEqual([]);
  expect(new URL(page.url()).search).toBe('');
});

test('validates the brief, name and email before posting', async ({ page }) => {
  await configureForm(page);
  const requests: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') requests.push(request.url()); });
  await page.goto('/contact');
  const submit = page.locator('[data-contact-form] [type="submit"]');
  await submit.click();
  await expect(page.getByRole('textbox', { name: 'Your project', exact: true })).toBeFocused();
  await fillEnquiry(page);
  await page.getByRole('textbox', { name: 'Your email', exact: true }).fill('not-an-email');
  await submit.click();
  await expect(page.getByRole('textbox', { name: 'Your email', exact: true })).toBeFocused();
  await fillEnquiry(page);
  await page.getByRole('textbox', { name: 'Your project', exact: true }).fill('   ');
  await submit.click();
  await expect(page.getByRole('textbox', { name: 'Your project', exact: true })).toBeFocused();
  expect(requests).toEqual([]);
});

test('sends once, waits for acceptance and clears only on success', async ({ page }) => {
  await configureForm(page);
  let release: () => void = () => undefined;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const bodies: string[] = [];
  await page.route(endpoint, async route => {
    bodies.push(route.request().postData() || '');
    await pending;
    await route.fulfill({ json: success });
  });
  await page.goto('/contact');
  await fillEnquiry(page);
  const submit = page.locator('[data-contact-form] [type="submit"]');
  await submit.click();
  await expect(submit).toBeDisabled();
  await expect(submit).toContainText('Sending');
  await expect(page.getByRole('textbox', { name: 'Your project', exact: true })).toHaveValue(message);
  await page.locator('[data-contact-form]').evaluate(form => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await expect.poll(() => bodies.length).toBe(1);
  release();
  await expect(page.locator('[data-enquiry-status]')).toContainText('your enquiry has been sent');
  await expect(page.getByRole('textbox', { name: 'Your project', exact: true })).toBeEmpty();
  await expect(submit).toContainText('Sent');
  await expect(submit).toBeDisabled();
  expect(bodies[0]).toContain('Alex Client');
  expect(bodies[0]).toContain('alex@client.com');
  expect(bodies[0]).toContain('_gotcha');
  expect(bodies[0]).toContain('_subject');
  expect(new URL(page.url()).search).toBe('');
  await fillEnquiry(page);
  await expect(submit).toBeEnabled();
});

test('keeps details on rejection, identifies the field and supports retry', async ({ page }) => {
  await configureForm(page);
  let attempt = 0;
  await page.route(endpoint, route => route.fulfill(++attempt === 1
    ? { status: 422, json: { errors: [{ field: 'email', code: 'TYPE_EMAIL', message: 'Please check this email address.' }] } }
    : { json: success }));
  await page.goto('/contact');
  await fillEnquiry(page);
  const submit = page.locator('[data-contact-form] [type="submit"]');
  await submit.click();
  const email = page.getByRole('textbox', { name: 'Your email', exact: true });
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(email).toBeFocused();
  await expect(page.getByRole('textbox', { name: 'Your project', exact: true })).toHaveValue(message);
  await expect(page.locator('[data-enquiry-email]')).toHaveAttribute('href', /^mailto:enquiries@newworkagency.com\?/);
  await email.fill('alex+film@client.com');
  await expect(email).not.toHaveAttribute('aria-invalid', 'true');
  await submit.click();
  await expect(page.locator('[data-enquiry-status]')).toContainText('your enquiry has been sent');
  expect(attempt).toBe(2);
});

for (const failure of ['network', 'rate-limit', 'unexpected-response'] as const) {
  test(`preserves an enquiry on ${failure}`, async ({ page }) => {
    await configureForm(page);
    await page.route(endpoint, route => failure === 'network' ? route.abort()
      : route.fulfill({ status: failure === 'rate-limit' ? 429 : 200, json: {} }));
    await page.goto('/contact');
    await fillEnquiry(page);
    const submit = page.locator('[data-contact-form] [type="submit"]');
    await submit.click();
    await expect(page.locator('[data-enquiry-fallback]')).toBeVisible();
    await expect(page.locator('[data-enquiry-status]')).not.toContainText('has been sent');
    await expect(page.getByRole('textbox', { name: 'Your project', exact: true })).toHaveValue(message);
    await expect(submit).toBeEnabled();
  });
}

test('a CAPTCHA response offers an explicit hosted verification step', async ({ page }) => {
  await configureForm(page);
  await page.route(endpoint, route => route.request().headers().accept === 'application/json'
    ? route.fulfill({ status: 400, json: { error: 'reCAPTCHA validation failed' } })
    : route.fulfill({ contentType: 'text/html', body: '<h1>Formspree verification</h1>' }));
  await page.goto('/contact');
  await fillEnquiry(page);
  await page.locator('[data-contact-form] [type="submit"]').click();
  await expect(page.locator('[data-enquiry-status]')).not.toContainText('has been sent');
  await page.getByRole('button', { name: 'Complete verification on Formspree' }).click();
  await expect(page).toHaveURL(endpoint);
  await expect(page.getByRole('heading')).toHaveText('Formspree verification');
});

test('times out a stalled request without discarding the enquiry', async ({ page }) => {
  await configureForm(page);
  await page.clock.install();
  await page.route(endpoint, () => new Promise<void>(() => undefined));
  await page.goto('/contact');
  await fillEnquiry(page);
  const submit = page.locator('[data-contact-form] [type="submit"]');
  await submit.click();
  await expect(submit).toBeDisabled();
  await page.clock.fastForward(20_100);
  await expect(page.locator('[data-enquiry-status]')).toContainText('couldn’t confirm delivery');
  await expect(submit).toBeEnabled();
  await expect(page.getByRole('textbox', { name: 'Your project', exact: true })).toHaveValue(message);
});

test('provides selectable text when copying is unavailable', async ({ page }) => {
  await page.goto('/contact');
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async () => { throw new Error('Clipboard unavailable'); },
    } });
  });
  await fillEnquiry(page);
  await page.getByRole('button', { name: 'Copy enquiry' }).click();
  await expect(page.locator('[data-enquiry-copy]')).toBeFocused();
  await expect(page.locator('[data-enquiry-copy]')).toHaveValue(/Name: Alex Client/u);
  await expect(page.locator('[data-enquiry-status]')).toContainText('Nothing has been sent');
});

test('works as a native POST when JavaScript is disabled', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await configureForm(page);
    let body = '';
    await page.route('https://formspree.io/**', route => {
      body = route.request().postData() || '';
      return route.fulfill({ contentType: 'text/html', body: '<h1>Enquiry received</h1>' });
    });
    await page.goto('/contact');
    await fillEnquiry(page);
    await page.locator('[data-contact-form] [type="submit"]').click();
    await expect(page.getByRole('heading')).toHaveText('Enquiry received');
    expect(body).toContain('email=alex%40client.com');
  } finally { await context.close(); }
});
