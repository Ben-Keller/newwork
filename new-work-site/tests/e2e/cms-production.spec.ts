import {expect, test} from '@playwright/test'

test.describe('CMS production build', () => {
  test.skip(
    process.env.PLAYWRIGHT_CONTENT_MODE !== 'production',
    'These assertions require a static build made from published Sanity content.',
  )

  test('renders the curated project graph and dedicated page singletons', async ({page}) => {
    test.setTimeout(60_000)
    await page.goto('/')

    const projectLinks = page.locator('[data-project-card] [data-project-link]')
    await expect(projectLinks.first()).toBeVisible()
    const hrefs = await projectLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute('href')).filter((href): href is string => Boolean(href)),
    )
    expect(hrefs.length).toBeGreaterThan(0)
    expect(new Set(hrefs).size).toBe(hrefs.length)
    expect(hrefs.every((href) => href.startsWith('/work/'))).toBe(true)

    const sampledHrefs = [hrefs[0], hrefs[Math.floor(hrefs.length / 2)], hrefs.at(-1)]
      .filter((href): href is string => Boolean(href))
    const routeResponses = await Promise.all(sampledHrefs.map(async (href) => ({
      href,
      status: (await page.request.get(href)).status(),
    })))
    for (const response of routeResponses) {
      expect(response.status, `${response.href} should be built`).toBe(200)
    }

    await expect(page.locator('[data-manifesto]')).toBeVisible()
    await expect(page.locator('.site-footer')).toBeVisible()
    await expect(page.locator('.draft-badge, .media-review-note, .prototype-media-note'))
      .toHaveCount(0)

    await expect(page.locator('[data-site-header] a[href="/about"]')).toHaveCount(2)
    const [aboutResponse, contactResponse, notesResponse] = await Promise.all([
      page.request.get('/about'),
      page.request.get('/contact'),
      page.request.get('/notes'),
    ])
    expect(aboutResponse.status()).toBe(200)
    expect(await aboutResponse.text()).toContain('data-about-experience')
    expect(contactResponse.status()).toBe(200)
    expect(await contactResponse.text()).toMatch(/<h1\b/iu)
    expect(notesResponse.status()).toBe(404)
  })
})
