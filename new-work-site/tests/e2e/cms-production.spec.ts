import {expect, test} from '@playwright/test'

test.describe('CMS production build', () => {
  test.skip(
    process.env.PLAYWRIGHT_CONTENT_MODE !== 'production',
    'These assertions require a static build made from published Sanity content.',
  )

  test('renders the curated project graph and dedicated page singletons', async ({page}) => {
    await page.goto('/')

    const projectLinks = page.locator('[data-project-card] [data-project-link]')
    await expect(projectLinks).toHaveCount(16)
    const hrefs = await projectLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute('href')).filter((href): href is string => Boolean(href)),
    )
    expect(new Set(hrefs).size).toBe(16)
    expect(hrefs.every((href) => href.startsWith('/work/'))).toBe(true)

    for (const href of hrefs) {
      expect((await page.request.get(href)).status(), `${href} should be built`).toBe(200)
    }

    await expect(page.locator('[data-manifesto]')).toBeVisible()
    await expect(page.locator('.site-footer')).toBeVisible()
    await expect(page.locator('.draft-badge, .media-review-note, .prototype-media-note'))
      .toHaveCount(0)

    await page.goto('/about')
    await expect(page.getByRole('heading', {level: 1})).toBeVisible()
    await page.goto('/contact')
    await expect(page.getByRole('heading', {level: 1})).toBeVisible()

    expect((await page.request.get('/notes')).status()).toBe(404)
  })
})
