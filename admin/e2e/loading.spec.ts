import { expect, test } from '@playwright/test';

test('listagem mostra skeleton/dots durante o carregamento', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(300);
  // Tabela em skeleton (role=status) e/ou dots do catálogo durante o load.
  const statusElements = await page.locator('[role="status"]').count();
  expect(statusElements).toBeGreaterThanOrEqual(1);
});

test('espaçamento entre busca e tabela é de 24px no desktop', async ({ page }) => {
  test.skip(test.info().project.name !== '1366', 'Tabela só existe em md+');
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  const gap = await page.evaluate(() => {
    const search = document.querySelector('.mb-6');
    const table = document.querySelector('table');
    if (!search || !table) return null;
    return Math.round(table.closest('div').getBoundingClientRect().top - search.getBoundingClientRect().bottom);
  });
  expect(gap).toBe(24);
});
