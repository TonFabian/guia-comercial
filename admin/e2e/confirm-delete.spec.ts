import { expect, test } from '@playwright/test';

const API = 'http://localhost:4000/api';

/** Remove resíduos de execuções anteriores do próprio teste. */
async function limparResiduos(page: import('@playwright/test').Page) {
  const list = await page.request.get(`${API}/companies?page=1&pageSize=100`);
  if (!list.ok()) return;
  const body = await list.json();
  for (const company of body.items ?? []) {
    if (company.slug === 'teste-confirmacao-e2e') {
      await page.request.delete(`${API}/companies/${company._id}`);
    }
  }
}

test('exclusão exige confirmação em modal (clique + confirmar)', async ({ page }) => {
  // Tabela desktop; no mobile os cards usam os mesmos RowActions/ConfirmDialog.
  test.skip(test.info().project.name === '320', 'comportamento testado na tabela desktop');

  await limparResiduos(page);
  // Empresa descartável criada só para este teste.
  const created = await page.request.post(`${API}/companies`, {
    data: {
      name: 'Teste Confirmacao E2E',
      slug: 'teste-confirmacao-e2e',
      description: 'Registro descartável do teste de confirmação.',
      category: '6aed38636eb1dd94bb2e4c69',
      city: 'castelo-do-piaui',
      plan: 'free',
      schedule: [],
    },
  });
  expect(created.status()).toBe(201);
  const company = await created.json();

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const row = page.locator('tr', { hasText: 'Teste Confirmacao E2E' }).first();
  await expect(row).toBeVisible();

  // 1º clique: NÃO pode excluir — deve abrir o modal de confirmação.
  await row.getByRole('button', { name: /excluir/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Cancelar mantém o registro.
  await dialog.getByRole('button', { name: /cancelar/i }).click();
  await expect(dialog).toHaveCount(0);
  await expect(row).toBeVisible();

  // Confirmar é que exclui de fato.
  await row.getByRole('button', { name: /excluir/i }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /confirmar/i }).click();
  await expect(page.locator('tr', { hasText: 'Teste Confirmacao E2E' })).toHaveCount(0);

  // Garantia: a empresa do hospital continua intacta.
  await expect(page.locator('tr', { hasText: 'Hospital Nilo Lima' })).toBeVisible();

  void company;
});
