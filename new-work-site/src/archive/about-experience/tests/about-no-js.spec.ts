import { expect, test } from '@playwright/test';

// Archived with the About page (review round 2); not part of the site suite.
test.use({ javaScriptEnabled: false });

test('the About experience remains complete and navigable without JavaScript', async ({page}) => {
  const response = await page.goto('/about');
  expect(response?.status()).toBe(200);

  const about = page.locator('[data-about-experience]');
  await expect(about.locator('.reel-motion-stage')).toBeHidden();
  await expect(about.locator('.reel-static-fallback')).toBeVisible();
  await expect(about.locator('.reel-fallback-card')).toHaveCount(6);
  await expect(page.getByRole('heading', {
    level: 1,
    name: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  }))
    .toBeVisible();
  await expect(page.getByRole('link', {name: 'Start a project'}).last()).toHaveAttribute('href', '/contact');
});
