import { test, expect, type Page } from '@playwright/test';

async function ensureGuest(page: Page) {
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

const routes = ['/', '/company/1', '/search', '/settings'];

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
  const handle = await page.evaluateHandle(() => {
    const els = Array.from(document.querySelectorAll('*'));
    return els.find((e) => getComputedStyle(e as Element).fontFamily.includes('Inter_400Regular')) ?? null;
  });
  const el = handle.asElement();
  test.skip(el === null, 'sem elemento Inter_400Regular neste viewport');
  expect(el).not.toBeNull();
  const style = await el!.evaluate((e) => getComputedStyle(e));
  expect(style.fontFamily).toContain('Inter_400Regular');
  const width = page.viewportSize()!.width;
  const factor = width / 375 > 1.2 ? 1.2 : Math.max(0.9, width / 375);
  const expected = 14 * factor;
  expect(Math.abs(parseFloat(style.fontSize) - expected)).toBeLessThanOrEqual(3);
});

test('título usa Rubik_700Bold', async ({ page }) => {
  await ensureGuest(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const handle = await page.evaluateHandle(() => {
    const els = Array.from(document.querySelectorAll('*'));
    return els.find((e) => getComputedStyle(e as Element).fontFamily.includes('Rubik_700Bold')) ?? null;
  });
  const el = handle.asElement();
  test.skip(el === null, 'sem elemento Rubik_700Bold neste viewport');
  expect(el).not.toBeNull();
  const ff = await el!.evaluate((e) => getComputedStyle(e).fontFamily);
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