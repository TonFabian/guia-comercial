import { test, expect } from '@playwright/test';

const routes = ['/', '/company/1', '/search', '/settings'];

async function ensureGuest(page: import('@playwright/test').Page) {
  await page.goto('/', { timeout: 60000 });
  const guest = page.getByText('Entrar como convidado');
  const isGuestScreen = await guest.waitFor({ state: 'visible', timeout: 20000 }).then(() => true).catch(() => false);
  if (isGuestScreen) {
    await guest.scrollIntoViewIfNeeded().catch(() => {});
    await guest.click({ force: true });
    await page.waitForURL('http://localhost:8081/', { timeout: 30000 }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
  }
}

for (const route of routes) {
  test(`screenshot ${route}`, async ({ page }) => {
    await ensureGuest(page);
    if (route !== '/') {
      await page.goto(route, { timeout: 60000 });
      await page.waitForLoadState('networkidle').catch(() => {});
    }
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: `e2e-artifacts/mobile-${route.replace(/\//g, '_')}-${test.info().project.name}.png`,
      fullPage: true,
    });
  });
}

test('família e tamanho fluido do body', async ({ page }) => {
  await ensureGuest(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const el = page.getByText('Av. Brasil, 1520 — Centro').first();
  await el.waitFor({ state: 'visible', timeout: 60000 });
  const style = await el.evaluate((e) => getComputedStyle(e));
  expect(style.fontFamily).toContain('Inter_400Regular');
  // O fator fluido é calculado no carregamento do módulo com base na largura
  // da janela; cada projeto do Playwright roda o spec num contexto novo, por
  // isso o módulo é reavaliado e o fator reflete o viewport do projeto.
  const width = page.viewportSize()!.width;
  const factor = width / 375 > 1.2 ? 1.2 : Math.max(0.9, width / 375);
  const expected = 14 * factor;
  expect(Math.abs(parseFloat(style.fontSize) - expected)).toBeLessThanOrEqual(1);
});

test('título usa Rubik_700Bold', async ({ page }) => {
  await ensureGuest(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const title = page.getByText('Empresas em Destaque').first();
  await title.waitFor({ state: 'visible', timeout: 60000 });
  const ff = await title.evaluate((e) => getComputedStyle(e).fontFamily);
  expect(ff).toContain('Rubik_700Bold');
});

test('sem overflow horizontal em 320px', async ({ page }) => {
  test.skip(test.info().project.name !== '320', 'só no viewport 320');
  await ensureGuest(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
});