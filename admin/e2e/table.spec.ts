import { expect, test } from '@playwright/test';

test('sem overflow horizontal em nenhum viewport', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test('células de texto da tabela usam ellipsis (desktop)', async ({ page }) => {
  test.skip(test.info().project.name === '320', 'tabela só existe em md+');
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  const check = await page.evaluate(() => {
    const spans = document.querySelectorAll<HTMLSpanElement>('td span.block');
    if (spans.length === 0) return { count: 0, ellipsis: false };
    const first = spans[0];
    return {
      count: spans.length,
      ellipsis: getComputedStyle(first).textOverflow === 'ellipsis',
    };
  });
  expect(check.count).toBeGreaterThanOrEqual(1);
  expect(check.ellipsis).toBe(true);
});

test('cards mobile truncam nome e limitam detalhe em 2 linhas', async ({ page }) => {
  test.skip(test.info().project.name !== '320', 'cards só existem em < md');
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  const check = await page.evaluate(() => {
    const primary = document.querySelector('ul li div.truncate');
    const secondary = document.querySelector('ul li div.line-clamp-2');
    return { primary: !!primary, secondary: !!secondary };
  });
  expect(check.primary).toBe(true);
  expect(check.secondary).toBe(true);
});
