import { expect, test } from '@playwright/test';

test('columns land without a second scale or position adjustment', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-logo-work-page]')).toHaveAttribute('data-logo-page-ready', 'true');
  await page.evaluate(() => document.fonts.ready);
  const cards = page.locator('[data-motion-column]');
  const geometry = () => cards.evaluateAll((elements) => elements.slice(0, 4).map((element) => {
    const { x, y, width } = element.getBoundingClientRect();
    return { x, y, width };
  }));
  const before = await geometry();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-logo-work-page]')).toHaveAttribute('data-handoff', 'true');
  await page.waitForTimeout(350);
  const rising = await geometry();
  rising.forEach((card, index) => expect(Math.abs(card.width - before[index].width)).toBeLessThan(.5));
  await expect(page.locator('[data-logo-intro]')).toHaveAttribute('data-title-motion', 'settled');
  const landed = await geometry();
  await page.waitForTimeout(1100);
  const final = await geometry();
  final.forEach((card, index) => {
    expect(Math.abs(card.y - landed[index].y)).toBeLessThan(.5);
    expect(Math.abs(card.x - landed[index].x)).toBeLessThan(.5);
    expect(Math.abs(card.width - landed[index].width)).toBeLessThan(.5);
  });
});
