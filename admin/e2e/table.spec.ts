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

test('células de texto da tabela usam ellipsis (desktop)', async ({ page }) => {  test.skip(test.info().project.name === '320', 'tabela só existe em md+');
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

test('roda do mouse rola a tabela na horizontal sem scrollbar visível', async ({ page }) => {
  test.skip(test.info().project.name !== '768', 'só onde a tabela tem overflow horizontal');
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const wrapper = page.locator('main div.scroll-x').first();
  await expect(wrapper).toBeVisible();
  expect(await wrapper.evaluate((e) => e.scrollWidth - e.clientWidth)).toBeGreaterThan(0);

  // Barra de scroll invisível em repouso: thumb transparente.
  const thumbCor = await wrapper.evaluate((e) => {
    const estilo = getComputedStyle(e, '::-webkit-scrollbar-thumb');
    return estilo.backgroundColor;
  });
  console.log('THUMB', thumbCor);

  // Rolar para a direita com a roda do mouse sobre a tabela.
  const caixa = await wrapper.boundingBox();
  await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(100);
  const depoisDireita = await wrapper.evaluate((e) => e.scrollLeft);
  expect(depoisDireita).toBeGreaterThan(0);

  // Rolar de volta para a esquerda.
  await page.mouse.wheel(0, -600);
  await page.waitForTimeout(100);
  const depoisEsquerda = await wrapper.evaluate((e) => e.scrollLeft);
  expect(depoisEsquerda).toBeLessThan(depoisDireita);
});
