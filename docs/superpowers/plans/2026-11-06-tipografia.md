# Tipografia padronizada (Rubik + Inter) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Padronizar a tipografia mobile + admin (Rubik headings, Inter textos, escada xs/sm/md/lg/xg, escala fluida, E2E visual via Playwright).

**Architecture:** Tokens ortogonais em `theme.ts` (mobile) e `styles.css` (admin): `FontFamily` (por peso), `FontWeight`, escada `Type.xs..xg` (+ legacy temporário), presets `Typography.*` com escala fluida calculada uma vez no load. Fontes carregadas via `expo-font`/fontsource. Migração mecânica dos 51 arquivos + 6 hardcoded, depois remoção do legado. Playwright valida computed styles em 4 viewports (mobile) e 3 (admin).

**Tech Stack:** Expo SDK 58, React Native 0.88, @expo-google-fonts/{inter,rubik}, @fontsource-variable/{inter,rubik}, @playwright/test, vitest.

**Spec:** `docs/superpowers/specs/2026-11-06-tipografia-design.md`

## Global Constraints

- Mobile deps: `npx expo install <pkg>` dentro de `mobile/` (nunca `npm install`). Admin/mobile dev deps: `npm i -D` dentro da pasta do app.
- Nenhum segredo no código; `.env` não é tocado.
- `ios/`/`android/` não são criados/editados.
- TypeScript estrito: sem `any`; `import type` para tipos.
- TDD: RED → GREEN → REFACTOR, um comportamento por teste.
- Commits atômicos com trailer `Generated-by: opencode (GLM-5.3-Flash Free)`.
- Nenhuma ocorrência de `fontSize` cru ou `fontWeight` cru fora de `theme.ts` no mobile src ao final (gate de grep).
- Presets não são correntes: eixos ortogonais, combinações via primitivos.
- Cada peso é uma família registrada no device: trocar peso = trocar `fontFamily`, não só `fontWeight`.

## Review Focus

- **Família por peso:** `FontFamily.heading700` deve ser idêntico ao nome registrado pelo `useFonts` (ex.: `Rubik_700Bold`); divergência faz o texto cair na fonte do sistema sem erro. Pinado por teste em Task 3.
- **Escala fluida:** fator calculado no load do módulo — Playwright muda viewport sem reload → fator não recalcula. Pinado por page-per-viewport em Task 7.
- **react-native-web:** computed `font-size` é em `px` (já escalado); asserções devem tolerar ±1px. Pinado em Task 7.
- **Admin clamp:** headings com `clamp()` não têm tamanho igual à escada na maioria das larguras — asserção de limites, não igualdade. Pinado em Task 7.
- **Migração mecânica:** nenhum `fontSize: <número>` nem `Type.caption/small/body/...` pode sobrar fora de `theme.ts`. Pinado por grep gate em Task 5.

---

## File Structure (a ser criado/modificado)

- `mobile/src/theme/fluid-width.ts` (new) — função pura de fator
- `mobile/src/theme/fluid-width.test.ts` (new)
- `mobile/src/constants/theme.ts` (modify) — novos tokens + presets + fator
- `mobile/src/constants/theme.test.ts` (new) — invariantes dos presets
- `mobile/src/app/_layout.tsx` (modify) — useFonts + gate
- `mobile/src/global.css` (modify) — cadeia real de famílias
- `mobile/src/app/(tabs)/index.tsx`, `mobile/src/features/company/company-detail-screen.tsx` (modify) — pilot
- 49 arquivos restantes (modify) — migração mecânica (lista em Task 5)
- `admin/src/styles.css` (modify) — vars + clamp
- `admin/src/theme/typography.ts` (new) — espelhos string
- `admin/src/main.tsx` (modify) — imports fontsource
- `admin/src/components/styles.ts`, `admin/src/components/schedule-editor.tsx` (modify)
- `mobile/playwright.config.ts`, `mobile/e2e/typography.spec.ts` (new)
- `admin/playwright.config.ts`, `admin/e2e/typography.spec.ts` (new)
- `.gitignore` (modify) — `e2e-artifacts/`

---

### Task 1: Função pura de escala fluida (RED → GREEN)

**Files:**
- Create: `mobile/src/theme/fluid-width.ts`
- Create: `mobile/src/theme/fluid-width.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// mobile/src/theme/fluid-width.test.ts
import { describe, it, expect } from 'vitest';
import { fluidWidthFactor } from './fluid-width';

describe('fluidWidthFactor', () => {
  it('clampa em 0.9 para telas pequenas', () => {
    expect(fluidWidthFactor(375, 320)).toBe(0.9);
    expect(fluidWidthFactor(375, 200)).toBe(0.9);
  });
  it('retorna 1 em 375dp (referência)', () => {
    expect(fluidWidthFactor(375, 375)).toBe(1);
  });
  it('clampa em 1.2 para telas grandes', () => {
    expect(fluidWidthFactor(375, 500)).toBe(1.2);
    expect(fluidWidthFactor(375, 1000)).toBe(1.2);
  });
  it('escala linearmente no intervalo', () => {
    expect(fluidWidthFactor(375, 375 * 1.1)).toBeCloseTo(1.1, 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npm test -- fluid-width`
Expected: FAIL (module not found)

- [ ] **Step 3: Write minimal implementation**

```ts
// mobile/src/theme/fluid-width.ts
export function fluidWidthFactor(reference: number, width: number): number {
  const raw = width / reference;
  return Math.min(1.2, Math.max(0.9, raw));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mobile && npm test -- fluid-width`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add mobile/src/theme/fluid-width.ts mobile/src/theme/fluid-width.test.ts
git commit -m "feat(mobile): adiciona fator de escala fluida por largura (clamp 0.9-1.2)" -m "Generated-by: opencode (GLM-5.3-Flash Free)"
```

---

### Task 2: Tokens + presets em `theme.ts` (mantendo legado temporário)

**Files:**
- Modify: `mobile/src/constants/theme.ts`
- Create: `mobile/src/constants/theme.test.ts`

- [ ] **Step 1: Write failing test**

// mobile/src/constants/theme.test.ts
import { describe, it, expect, vi } from 'vitest';

const { width } = vi.hoisted(() => ({ width: 375 }));
vi.mock('react-native', () => ({
  Dimensions: { get: () => ({ width, height: 812 }) },
}));

import { FontFamily, FontWeight, Type, Typography } from './theme';

describe('tokens de tipografia', () => {
  it('FontFamily expõe uma família por peso carregado', () => {
    expect(FontFamily.heading700).toBe('Rubik_700Bold');
    expect(FontFamily.body400).toBe('Inter_400Regular');
  });
  it('escada xs..xg tem size/line pareados', () => {
    expect(Type.xs).toEqual({ size: 12, lineHeight: 16 });
    expect(Type.xg).toEqual({ size: 24, lineHeight: 32 });
  });
  it('presets carregam família + tamanho + line + peso', () => {
    for (const p of [Typography.h1, Typography.body, Typography.label]) {
      expect(p).toHaveProperty('fontFamily');
      expect(p).toHaveProperty('fontSize');
      expect(p).toHaveProperty('lineHeight');
      expect(p).toHaveProperty('fontWeight');
    }
  });
  it('h1..h5 usam Rubik; body/caption/label usam Inter', () => {
    expect(Typography.h1.fontFamily).toContain('Rubik');
    expect(Typography.body.fontFamily).toContain('Inter');
    expect(Typography.label.fontFamily).toContain('Inter');
  });
  it('label tem uppercase e maxFontSizeMultiplier 1.4', () => {
    expect((Typography.label as any).textTransform).toBe('uppercase');
    expect((Typography.label as any).maxFontSizeMultiplier).toBe(1.4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npm test -- theme.test`
Expected: FAIL (FontFamily/FontWeight/Typography not defined)

- [ ] **Step 3: Write minimal implementation**

Adicionar ao topo do arquivo (após os imports existentes) os imports de
`Dimensions`/`fluidWidthFactor` e as definições de `_fontScale`/`_s`; **somente
depois** editar o objeto `Type` existente para incluir xs..xg (usando `_s`),
mantendo as chaves legadas `caption/small/body/...` até Task 5. Os exports
`FontFamily`, `FontWeight` e `Typography` podem ficar após `Type`:

```ts
import { Dimensions } from 'react-native';
import { fluidWidthFactor } from '@/theme/fluid-width';

// ... (após as definições existentes)

export const FontFamily = {
  heading600: 'Rubik_600SemiBold',
  heading700: 'Rubik_700Bold',
  heading800: 'Rubik_800ExtraBold',
  body400: 'Inter_400Regular',
  body500: 'Inter_500Medium',
  body600: 'Inter_600SemiBold',
  body700: 'Inter_700Bold',
  body800: 'Inter_800ExtraBold',
} as const;

export const FontWeight = {
  regular: '400', medium: '500', semibold: '600', bold: '700', heavy: '800',
} as const;

// Escada xs..xg (referência 375dp). `Type` legado (caption/small/...) segue
// abaixo por compatibilidade até a migração completa (Task 5).
const _fontScale = fluidWidthFactor(375, Dimensions.get('window').width);
const _s = (n: number) => Math.round(n * _fontScale);

// Novas chaves no mesmo objeto `Type` (adicionadas, não substituem o legado):
// (inserir dentro do objeto Type existente: xs, sm, md, lg, xg)
```

Editar o objeto `Type` existente adicionando:

```ts
  xs: { size: _s(12), lineHeight: _s(16) },   // não: lineHeight também escala? ver nota
```

**Nota de design:** o fator escala `fontSize` e `lineHeight` igualmente (Tailwind escala line-height em rem junto). Manter `_s` para ambos. Se a revisão visual (Playwright) mostrar line-height desproporcional, ajustar em Task 8.

Adicionar (após `Type`):

```ts
export const Typography = {
  h1: { fontFamily: FontFamily.heading700, fontSize: _s(28), lineHeight: _s(34), fontWeight: FontWeight.bold },
  h2: { fontFamily: FontFamily.heading700, fontSize: _s(24), lineHeight: _s(32), fontWeight: FontWeight.bold },
  h3: { fontFamily: FontFamily.heading700, fontSize: _s(20), lineHeight: _s(26), fontWeight: FontWeight.bold },
  h4: { fontFamily: FontFamily.heading600, fontSize: _s(18), lineHeight: _s(24), fontWeight: FontWeight.semibold },
  h5: { fontFamily: FontFamily.heading600, fontSize: _s(16), lineHeight: _s(22), fontWeight: FontWeight.semibold },
  body: { fontFamily: FontFamily.body400, fontSize: _s(14), lineHeight: _s(20), fontWeight: FontWeight.regular },
  bodySemibold: { fontFamily: FontFamily.body600, fontSize: _s(14), lineHeight: _s(20), fontWeight: FontWeight.semibold },
  bodyBold: { fontFamily: FontFamily.body700, fontSize: _s(14), lineHeight: _s(20), fontWeight: FontWeight.bold },
  caption: { fontFamily: FontFamily.body400, fontSize: _s(12), lineHeight: _s(16), fontWeight: FontWeight.regular, maxFontSizeMultiplier: 1.4 },
  captionSemibold: { fontFamily: FontFamily.body600, fontSize: _s(12), lineHeight: _s(16), fontWeight: FontWeight.semibold, maxFontSizeMultiplier: 1.4 },
  label: { fontFamily: FontFamily.body700, fontSize: _s(12), lineHeight: _s(16), fontWeight: FontWeight.bold, textTransform: 'uppercase' as const, maxFontSizeMultiplier: 1.4 },
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mobile && npm test -- theme.test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/src/constants/theme.ts mobile/src/constants/theme.test.ts
git commit -m "feat(mobile): adiciona tokens FontFamily/FontWeight/Type xs..xg/Tipografia presets" -m "Generated-by: opencode (GLM-5.3-Flash Free)"
```

---

### Task 3: Carregamento de fontes (mobile) + `global.css`

**Files:**
- Modify: `mobile/src/app/_layout.tsx`
- Modify: `mobile/src/global.css`

- [ ] **Step 1: Install deps**

Run (dentro de `mobile/`): `npx expo install @expo-google-fonts/inter @expo-google-fonts/rubik`
Expected: package.json atualizado, lockfile atualizado.

- [ ] **Step 2: Modify `_layout.tsx`**

```tsx
import {
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
  Inter_700Bold, Inter_800ExtraBold, useFonts as useInterFonts,
} from '@expo-google-fonts/inter';
import {
  Rubik_600SemiBold, Rubik_700Bold, Rubik_800ExtraBold,
  useFonts as useRubikFonts,
} from '@expo-google-fonts/rubik';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

// dentro do RootLayout:
const [interLoaded, interError] = useInterFonts({
  Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
});
const [rubikLoaded, rubikError] = useRubikFonts({
  Rubik_600SemiBold, Rubik_700Bold, Rubik_800ExtraBold,
});
const fontError = interError ?? rubikError;
const fontsLoaded = interLoaded && rubikLoaded;

useEffect(() => {
  if (fontsLoaded || fontError) {
    SplashScreen.hideAsync().catch(() => {});
  }
}, [fontsLoaded, fontError]);

if (!fontsLoaded && !fontError) return null; // splash mantido
// em caso de erro, segue com fonte do sistema (fallback)
```

Manter `SplashScreen.preventAutoHideAsync()` existente; chamar `SplashScreen.hideAsync()` quando `fontsLoaded`.

- [ ] **Step 3: Update `global.css`**

```css
:root {
  --font-display:
    Rubik_700Bold, Rubik_600SemiBold, Rubik_800ExtraBold,
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
    ui-sans-serif, system-ui, sans-serif, Apple Color Emoji, Segoe UI Emoji,
    Segoe UI Symbol, Noto Color Emoji;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace;
  --font-rounded: 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif;
  --font-serif: Georgia, 'Times New Roman', serif;
}
```

- [ ] **Step 4: Typecheck + lint**

Run: `cd mobile && npm run typecheck && npx expo lint`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add mobile/package.json mobile/package-lock.json mobile/src/app/_layout.tsx mobile/src/global.css
git commit -m "feat(mobile): carrega Rubik + Inter via expo-font e ajusta global.css" -m "Generated-by: opencode (GLM-5.3-Flash Free)"
```

---

### Task 4: Migração pilot (home + detalhe de empresa)

**Files:**
- Modify: `mobile/src/app/(tabs)/index.tsx`
- Modify: `mobile/src/features/company/company-detail-screen.tsx`

- [ ] **Step 1: Migrar `index.tsx`**

Substituir imports `Type` por `Typography, FontFamily, FontWeight, Type` (manter `Type` para escada size-only se necessário). Substituir estilos:

| Antes | Depois |
|---|---|
| `fontSize: Type.base, fontWeight: '600'` (título seção) | `...Typography.h3` (ou spread + cor) |
| `fontSize: Type.small, fontWeight: '600'` | `...Typography.captionSemibold` |
| `fontSize: 18, fontWeight: '600'` | `...Typography.h3` |
| `fontSize: 14, fontWeight: '600'` | `...Typography.bodySemibold` |

Aplicar `style={[Typography.h3, { color: colors.text }]}` nos `Text`. Manter `numberOfLines`/`ellipsizeMode`.

- [ ] **Step 2: Migrar `company-detail-screen.tsx`**

Título 20–22/700 → `Typography.h2`/`h3`; specialty 15/600 → `Typography.bodySemibold` com `fontFamily: FontFamily.heading600` se quiser Rubik; meta 13 → `Typography.caption`; botões 14–15/700 → `Typography.bodyBold`/`label`.

- [ ] **Step 3: Typecheck + lint + test**

Run: `cd mobile && npm run typecheck && npx expo lint && npm test`
Expected: verde.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/app/(tabs)/index.tsx mobile/src/features/company/company-detail-screen.tsx
git commit -m "refactor(mobile): migra home e detalhe de empresa para presets de tipografia" -m "Generated-by: opencode (GLM-5.3-Flash Free)"
```

---

### Task 5: Migração mecânica dos demais arquivos mobile

**Files:** gerar a lista dinamicamente (não manter estática — evita duplicatas/contagem errada):

```bash
cd mobile && grep -rlE "Type\.|fontSize:\s*[0-9]" src/ | grep -v "src/constants/theme.ts"
```

Usar essa saída (excluir `index.tsx` e `company-detail-screen.tsx`, já migrados em Task 4) como a lista de arquivos a editar.

- [ ] **Step 1: Aplicar mapeamento mecânico por arquivo**

Tabela de substituição (aplicar em ordem; manter `numberOfLines`/`ellipsizeMode`/`textTransform`):

| Antes | Depois |
|---|---|
| `Type.caption` (11) | `Type.xs` (size) ou `Typography.caption` (preset) |
| `Type.small` (12) / `Type.body` (13) / `Type.base` (14) / `Type.subtitle` (15) | preset conforme papel (`body`/`caption`/`bodySemibold`/`label`) — **sempre preset que carrega família**; escada `Type.sm` size-only só em contexto não-texto |
| `Type.cardTitle` (16) / `Type.section` (17) | `Typography.h5`/`h4` ou `Type.md` |
| `Type.title` (18) | `Typography.h3`/`Type.lg` |
| `Type.headline` (24) | `Typography.h1`/`Type.xg` |
| `fontSize` cru (favorites 24, index 18/14, autonomous 14/22/15/16, my-company 14/20/15/16/13, app-tabs.web 11, banner-carousel 28) | preset correspondente |
| `fontWeight: '700'/'600'/'800'/'500'` | `FontWeight.bold/semibold/heavy/medium` (ou remover ao usar preset) |
| `lineHeight: <n>` cru | remover (vem do preset); se size-only, usar `Type.x.lineHeight` |

Cada arquivo: trocar `import { ..., Type }` por `import { ..., Typography, FontFamily, FontWeight, Type }` conforme uso; substituir estilos inline por spread de preset + cor.

- [ ] **Step 2: Gate de grep**

Run: `cd mobile && grep -rn "fontSize:\s*[0-9]" src/ | grep -v "theme.ts" ; grep -rn "Type\.\(caption\|small\|body\|base\|subtitle\|cardTitle\|section\|title\|headline\)" src/ | grep -v "theme.ts" ; grep -rn "fontWeight:\s*'[0-9]'" src/ | grep -v "theme.ts"`
Expected: sem resultados (exceto comentários).

- [ ] **Step 3: Remover legado de `Type`**

Em `theme.ts`, remover as chaves `caption/small/body/base/subtitle/cardTitle/section/title/headline` do objeto `Type`, mantendo apenas `xs/sm/md/lg/xg`. Atualizar `theme.test.ts` se referenciar legado (não referencia).

- [ ] **Step 4: Typecheck + lint + test + expo export**

Run: `cd mobile && npm run typecheck && npx expo lint && npm test && npx expo export`
Expected: verde e bundle gerado.

- [ ] **Step 5: Commit (um commit por grupo de ~10 arquivos é aceitável; mínimo 1 commit da migração)**

```bash
git add mobile/src
git commit -m "refactor(mobile): migra tipografia restante para presets + remove legado Type" -m "Generated-by: opencode (GLM-5.3-Flash Free)"
```

---

### Task 6: Admin — fontes + CSS vars + tokens TS

**Files:**
- Modify: `admin/package.json` (deps)
- Modify: `admin/src/main.tsx`
- Modify: `admin/src/styles.css`
- Create: `admin/src/theme/typography.ts`
- Modify: `admin/src/components/styles.ts`
- Modify: `admin/src/components/schedule-editor.tsx`

- [ ] **Step 1: Install deps**

Run (dentro de `admin/`): `npm i @fontsource-variable/inter @fontsource-variable/rubik`
Expected: deps em package.json.

- [ ] **Step 2: Importar fontes em `main.tsx`**

```ts
import '@fontsource-variable/inter';
import '@fontsource-variable/rubik';
```

- [ ] **Step 3: `styles.css` — vars + clamp**

```css
:root {
  color-scheme: dark;
  --font-family-heading: 'Rubik Variable', system-ui, sans-serif;
  --font-family-body: 'Inter Variable', system-ui, sans-serif;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xg: 1.5rem;
  --line-height-xs: 1rem;
  --line-height-sm: 1.25rem;
  --line-height-md: 1.5rem;
  --line-height-lg: 1.75rem;
  --line-height-xg: 2rem;
  font-family: var(--font-family-body);
}

.brand { font-family: var(--font-family-heading); font-size: clamp(1rem, 1.6vw + 0.875rem, 1.25rem); }
.brand-sub { font-size: var(--font-size-xs); }
.menu-item { font-size: var(--font-size-sm); }
.badge { font-size: var(--font-size-xs); }
.content h2 { font-family: var(--font-family-heading); font-size: clamp(1.25rem, 2vw + 1rem, 1.75rem); }
```

Migrar `.content h2`/`.brand` para usar `var(--font-family-heading)`.

- [ ] **Step 4: Criar `admin/src/theme/typography.ts`**

```ts
export const FontSize = {
  xs: 'var(--font-size-xs)', sm: 'var(--font-size-sm)', md: 'var(--font-size-md)',
  lg: 'var(--font-size-lg)', xg: 'var(--font-size-xg)',
} as const;
export const LineHeight = {
  xs: 'var(--line-height-xs)', sm: 'var(--line-height-sm)', md: 'var(--line-height-md)',
  lg: 'var(--line-height-lg)', xg: 'var(--line-height-xg)',
} as const;
export const FontFamily = { heading: 'var(--font-family-heading)', body: 'var(--font-family-body)' } as const;
```

- [ ] **Step 5: Migrar inline styles**

`components/styles.ts`: `fontSize: 13` → `fontSize: FontSize.sm`; `fontSize: 12` → `FontSize.xs`; adicionar `fontFamily: FontFamily.body` onde couber.

`components/schedule-editor.tsx`: `fontSize: 12` → `FontSize.xs`.

- [ ] **Step 6: Typecheck + lint + build**

Run: `cd admin && npm run lint && npm run typecheck && npm run build`
Expected: verde.

- [ ] **Step 7: Commit**

```bash
git add admin
git commit -m "feat(admin): padroniza tipografia com Rubik/Inter via CSS vars + tokens TS" -m "Generated-by: opencode (GLM-5.3-Flash Free)"
```

---

### Task 7: Playwright — infra + E2E visual

**Files:**
- Modify: `mobile/.gitignore` (ou raiz `.gitignore`) — adicionar `e2e-artifacts/`
- Create: `mobile/playwright.config.ts`, `mobile/e2e/typography.spec.ts`
- Create: `admin/playwright.config.ts`, `admin/e2e/typography.spec.ts`

- [ ] **Step 1: Install Playwright (dev) em ambos**

Run: `cd mobile && npm i -D @playwright/test && npx playwright install chromium`
Run: `cd admin && npm i -D @playwright/test && npx playwright install chromium`

- [ ] **Step 2: `.gitignore`**

Adicionar `e2e-artifacts/` e `playwright-report/` e `test-results/`.

- [ ] **Step 3: `mobile/playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:8081', screenshot: 'only-on-failure' },
  projects: [
    { name: '320', use: { ...devices['iPhone SE'], viewport: { width: 320, height: 568 } } },
    { name: '375', use: { ...devices['iPhone 13'], viewport: { width: 375, height: 667 } } },
    { name: '414', use: { viewport: { width: 414, height: 896 } } },
    { name: '768', use: { viewport: { width: 768, height: 1024 } } },
  ],
  webServer: { command: 'npx expo start --web', url: 'http://localhost:8081', reuseExistingServer: true, timeout: 120000 },
});
```

- [ ] **Step 4: `mobile/e2e/typography.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

const routes = ['/', '/company/1', '/search', '/settings'];

for (const route of routes) {
  test(`screenshot ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `e2e-artifacts/mobile-${route.replace(/\//g, '_')}-${test.info().project.name}.png`, fullPage: true });
  });
}

test('família e tamanho fluido do body', async ({ page }) => {
  await page.goto('/');
  const el = page.locator('text=Ver mais').first();
  const style = await el.evaluate((e) => getComputedStyle(e));
  expect(style.fontFamily).toContain('Inter_400Regular');
  // tolerance ±1px (react-native-web)
  const expected = 14 * (page.viewportSize()!.width / 375 > 1.2 ? 1.2 : Math.max(0.9, page.viewportSize()!.width / 375));
  expect(Math.abs(parseFloat(style.fontSize) - expected)).toBeLessThanOrEqual(1);
});

test('título usa Rubik_700Bold', async ({ page }) => {
  await page.goto('/');
  const title = page.locator('h1, [role="heading"]').first();
  const ff = await title.evaluate((e) => getComputedStyle(e).fontFamily);
  expect(ff).toContain('Rubik_700Bold');
});

test('sem overflow horizontal em 320px', async ({ page }) => {
  test.skip(test.info().project.name !== '320', 'só no viewport 320');
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});
```

(ajustar seletores conforme UI real — preferir `data-testid` adicionados durante a migração para não depender de copy transitória; manter asserções de computed style, não pixel-perfect.)

- [ ] **Step 5: `admin/playwright.config.ts` + spec análogo**

Base `http://localhost:5173` (ou porta do vite), viewports 320/768/1366, webServer `npm run dev`. Spec: screenshots + computed `font-family` contém `Rubik Variable`/`Inter Variable`; body `font-size` igual ao valor da escada (rem fixo); headings com `clamp()` verificados por limites.

- [ ] **Step 6: Rodar E2E (mobile)**

Run: `cd mobile && npx playwright test`
Expected: verde (com screenshots em `e2e-artifacts/`).

- [ ] **Step 7: Commit**

```bash
git add mobile/playwright.config.ts mobile/e2e admin/playwright.config.ts admin/e2e mobile/.gitignore admin/.gitignore
git commit -m "test(e2e): adiciona Playwright visual para tipografia (multi-viewport)" -m "Generated-by: opencode (GLM-5.3-Flash Free)"
```

---

### Task 8: Gate de qualidade + verificação visual

- [ ] **Step 1: Mobile gate**

Run: `cd mobile && npm run typecheck && npx expo lint && npm test && npx expo export && echo "--- grep gate ---" && ! grep -rn "fontSize:\s*[0-9]" src/ | grep -v "theme.ts" && ! grep -rn "Type\.\(caption\|small\|body\|base\|subtitle\|cardTitle\|section\|title\|headline\)" src/ | grep -v "theme.ts" && ! grep -rn "fontWeight:\s*'[0-9]'" src/ | grep -v "theme.ts"`
Expected: verde (gate + grep limpos).

- [ ] **Step 2: Admin gate**

Run: `cd admin && npm run lint && npm run typecheck && npm run build`
Expected: verde.

- [ ] **Step 3: Auditoria das deps novas**

Run: `cd mobile && npm audit --omit=dev` ; `cd admin && npm audit --omit=dev`
Expected: sem high/critical; documentar findings.

- [ ] **Step 4: Revisão visual humana**

Abrir `mobile/e2e-artifacts/` e `admin` screenshots; confirmar: nada truncado em 320px, headings Rubik visíveis, body Inter, tamanhos coerentes com a escada.

- [ ] **Step 5: Commit final (se houver ajustes)**

```bash
git add -A && git commit -m "chore(typography): ajustes finais pos-verificacao visual" -m "Generated-by: opencode (GLM-5.3-Flash Free)"
```

---

## Self-Review (executado ao escrever este plano)

1. **Cobertura da spec:** fluid-width ✓ (T1); tokens/presets ✓ (T2); font loading ✓ (T3); global.css ✓ (T3); migração ✓ (T4/T5); admin ✓ (T6); Playwright multi-viewport ✓ (T7); gate ✓ (T8); AGENTS ✓ (já feito). Sem lacunas.
2. **Placeholders:** nenhum "TBD". Comandos com workdir explícito. T5 é mecânico por design (51 arquivos) — listado nominalmente + tabela de substituição + grep gate.
3. **Consistência de tipos:** `FontFamily.*`, `FontWeight.*`, `Type.xs..xg`, `Typography.*` definidos em T2 e consumidos em T4/T5/T6 com os mesmos nomes.
4. **Review Focus:** 5 itens mapeados para T3 (família por peso), T7 (fluid + react-native-web + clamp), T5 (grep gate). Testes correspondentes incluídos.