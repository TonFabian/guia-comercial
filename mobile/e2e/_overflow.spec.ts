import { test } from '@playwright/test';

async function ensureGuest(page: any) {
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

test('overflow debug', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await ensureGuest(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  const cw = await page.evaluate(() => document.documentElement.clientWidth);
  console.log('scrollWidth:', sw, 'clientWidth:', cw);
  // find root overflowing element
  const bad = await page.evaluate(() => {
    const doc = document.documentElement;
    const res: any[] = [];
    document.querySelectorAll('*').forEach((el) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.right > doc.clientWidth + 1) res.push({ tag: el.tagName, text: (el.textContent||'').trim().slice(0,30), right: Math.round(r.right) });
    });
    const seen = new Set();
    return res.filter(b => { const k=b.tag+'|'+b.text; if(seen.has(k)) return false; seen.add(k); return true; }).slice(0,10);
  });
  console.log('BAD:', JSON.stringify(bad));
});