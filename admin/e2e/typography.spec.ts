import { test, expect } from '@playwright/test';

const routes = ['/'];

for (const route of routes) {
  test(`screenshot ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `e2e-artifacts/admin-${route.replace(/\//g, '_')}-${test.info().project.name}.png`,
      fullPage: true,
    });
  });
}

test('body usa Inter Variable e tamanho da escada', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const bodyFf = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(bodyFf).toContain('Inter Variable');
  const bodyFs = await page.evaluate(() => getComputedStyle(document.body).fontSize);
  expect(Math.abs(parseFloat(bodyFs) - 16)).toBeLessThanOrEqual(0.5);
});

test('heading usa Rubik Variable e respeita clamp', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const h2 = page.locator('h2').first();
  const ff = await h2.evaluate((e) => getComputedStyle(e).fontFamily);
  expect(ff).toContain('Rubik Variable');
  const fs = await h2.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  // clamp(1.25rem, 2vw + 1rem, 1.75rem) -> 20px..28px
  expect(fs).toBeGreaterThanOrEqual(20);
  expect(fs).toBeLessThanOrEqual(28);
});

test('sem overflow horizontal em 320px', async ({ page }) => {
  test.skip(test.info().project.name !== '320', 'só no viewport 320');
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});