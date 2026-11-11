import { expect, test } from '@playwright/test';

async function abrirEventos(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'Eventos' }).click();
  await page.waitForTimeout(500);
}

test('eventos: formulário só aparece na tela dedicada', async ({ page }) => {
  test.skip(test.info().project.name === '320', 'navegação desktop (no mobile o menu é drawer)');
  await abrirEventos(page);

  // Listagem não mostra o formulário (era sempre visível antes).
  await expect(page.locator('form#evento-form')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /\+ novo evento/i })).toBeVisible();

  // Criar: vai para a tela de formulário com header próprio.
  await page.getByRole('button', { name: /\+ novo evento/i }).click();
  await expect(page.locator('form#evento-form')).toBeVisible();
  await expect(page.locator('h1.form-title', { hasText: 'Novo evento' })).toBeVisible();
  await expect(page.locator('h1.section-title')).toBeHidden();

  // Voltar para a listagem.
  await page.getByText('← Eventos').click();
  await expect(page.locator('form#evento-form')).toHaveCount(0);
});

test('tabela desktop permite scroll horizontal (Ações não cortam)', async ({ page }) => {
  test.skip(test.info().project.name === '320', 'tabela só existe em md+');
  await abrirEventos(page);

  const wrapper = page.locator('main div.overflow-x-auto').first();
  await expect(wrapper).toBeVisible();
  const overflowX = await wrapper.evaluate((e) => getComputedStyle(e).overflowX);
  expect(overflowX).toBe('auto');
});
