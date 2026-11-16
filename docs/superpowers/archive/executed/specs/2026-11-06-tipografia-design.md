# Tipografia padronizada (Rubik + Inter) — Design

## Intent

Padronizar a tipografia dos dois apps com UI (mobile e admin):

- **Famílias:** Rubik para headings (h1–h5) e Inter para textos (body/spans/parágrafos), definidas uma única vez e usadas por todo o código.
- **Tamanhos:** escada xs/sm/md/lg/xg com `line-height` pareado, baseada na tabela `font-size` do Tailwind CSS v3.
- **Responsividade:** mobile escala fluida por largura de tela (referência 375dp, clamp 0,9–1,2); admin usa `rem` + `clamp()` (unidade relativa do CSS).
- **Acessibilidade:** `allowFontScaling` nativo do RN continua ativo (fonte do SO) com teto `maxFontSizeMultiplier: 1.4` nos textos críticos.
- **Aprovação:** abordagem **B** (primitivos + presets `Typography.*`), confirmada pelo owner.

Out of scope: mudar cores/spacing (já tokenizados), backend, componentes de agenda/schedule do admin fora dos 2 estilos inline, e2e funcional completo (roteiro de 2026-11-04 separado).

## Decisões

| Tema | Decisão |
| --- | --- |
| Fonte de headings | Rubik (@expo-google-fonts/rubik / @fontsource-variable/rubik) |
| Fonte de textos | Inter (@expo-google-fonts/inter / @fontsource-variable/inter) |
| Escada de tamanho | 5 níveis xs/sm/md/lg/xg + rampa própria h1–h5 |
| Line-height | Pareado nos tokens (Tabela 1); os `lineHeight` crus espalhados hoje (23×) são eliminados |
| Escala mobile | `clamp(largura ÷ 375, 0,9, 1,2)` aplicada nos presets |
| Escala admin | `rem` fixo para body; `clamp()` fluido para h1–h4 |
| Peso | Pilha `FontWeight` regular/medium/semibold/bold/heavy; pesos crus migrados |
| Presets | Objetos parciais `TextStyle`/`CSSProperties`; call site adiciona cor/espaçamento |
| E2E | Playwright no mobile-web (porta 8081) **e** admin, com screenshots e múltiplos tamanhos de tela |

## Tokens mobile (`mobile/src/constants/theme.ts`)

```ts
export const FontFamily = {
  heading700: 'Rubik_700Bold',      // nomes exatos devolvidos pelo useFonts
  heading600: 'Rubik_600SemiBold',
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
```

Tabela 1 — escada (referência 375dp; `size`/`line` = fontSize/lineHeight):

| Nível | Ref. Tailwind | size/line | Uso típico |
| --- | --- | --- | --- |
| xs | text-xs (.75rem) | 12/16 | caption, badge, tags |
| sm | text-sm (.875rem) | 14/20 | body, inputs, botões pequenos |
| md | text-base (1rem) | 16/24 | card title, itens |
| lg | text-xl (1.25rem) | 20/28 | títulos de tela pequenos |
| xg | text-2xl (1.5rem) | 24/32 | hero/destaque |

Presets (`Pick<TextStyle, 'fontFamily' | 'fontSize' | 'lineHeight' | 'fontWeight'>`; valores já escalados com `Math.round(size × fator)`):

**Os eixos são ortogonais — presets não são correntes.** Qualquer combinação
família × tamanho é válida com os primitivos (ex.: Rubik com tamanho `sm`:

```ts
{ fontFamily: FontFamily.heading600, fontSize: Type.sm.size, lineHeight: Type.sm.line }
```

). Preset cobre apenas os padrões recorrentes do app; caso fora do padrão
usa os primitivos — os três eixos continuam saindo dos tokens (nada cru).
Como cada peso é uma família registrada separadamente no device (ver §
Carregamento), **para mudar o peso de um preset, troque o `fontFamily` pelo
token do peso desejado** — sobrescrever só `fontWeight` no call site não
troca a face no device.

| Preset | fontFamily | size/line | weight |
| --- | --- | --- | --- |
| `Typography.h1` | Rubik_700Bold | 28/34 | 700 |
| `Typography.h2` | Rubik_700Bold | 24/32 | 700 |
| `Typography.h3` | Rubik_700Bold | 20/26 | 700 |
| `Typography.h4` | Rubik_600SemiBold | 18/24 | 600 |
| `Typography.h5` | Rubik_600SemiBold | 16/22 | 600 |
| `Typography.body` | Inter_400Regular | 14/20 | 400 |
| `Typography.bodySemibold` | Inter_600SemiBold | 14/20 | 600 |
| `Typography.bodyBold` | Inter_700Bold | 14/20 | 700 |
| `Typography.caption` | Inter_400Regular | 12/16 | 400 |
| `Typography.captionSemibold` | Inter_600SemiBold | 12/16 | 600 |
| `Typography.label` | Inter_700Bold | 12/16 | 700 + `textTransform: 'uppercase'` |

Textos críticos (tabs, labels de botões de fluxo) adicionam `maxFontSizeMultiplier: 1.4` explicitamente. O fator fluido vem de função pura:

```
mobile/src/theme/fluid-width.ts:  fluidWidthFactor(reference, width) → clamp(width/reference, 0.9, 1.2)
mobile/src/theme/fluid-width.test.ts:  320 → 0.9 · 375 → 1 · 500 → 1.2
```

`theme.ts` calcula o fator uma vez com `Dimensions.get('window').width` (app portrait-lock — fator estável por device).

### Carregamento de fontes (mobile)

- `npx expo install @expo-google-fonts/rubik @expo-google-fonts/inter` (SDK 58; `expo-font` já presente).
- Pesos: Inter 400/500/600/700/800 · Rubik 600/700/800 (todos os pesos hoje em uso).
- `useFonts(Inter_400Regular, …, Rubik_700Bold, …)` em `_layout.tsx`, com gate no `SplashScreen` (padrão atual).
- `global.css`: `--font-display` passa a usar a **cadeia de nomes reais** carregados por peso (`Rubik_700Bold, Rubik_600SemiBold, Rubik_800ExtraBold, Inter_400Regular, …, sans-serif`) — `@expo-google-fonts` registra uma família por peso (ex.: `Rubik_700Bold`), então a família pura `'Rubik'` não resolve na web; a var cobre só DOM fora do `<Text>` do RN.

### Migração mobile (51 arquivos com `Type.*` + 6 com px hardcoded)

| Valor atual | Novo |
| --- | --- |
| `Type.caption` (11) | `Type.xs` |
| `Type.small` (12) · `Type.body` (13) · `Type.base` (14) · `Type.subtitle` (15) | preset que **carrega família** (`body`/`bodySemibold`/`bodyBold`/`caption`/`captionSemibold`/`label`), conforme papel do texto; a escada size-only `Type.xs..xg` fica reservada a contextos não-texto |
| `Type.cardTitle` (16) · `Type.section` (17) | `Type.md` |
| `Type.title` (18) | `Type.lg` |
| `Type.headline` (24) | `Type.xg` |
| `fontSize` cru (favorites, index, autonomous/[id], my-company, app-tabs.web, banner-carousel) | preset/primitivo |
| títulos 20–22/700 | `h3` · 28/800 → `h1` |
| `fontWeight` cru (163×) | `FontWeight.*` |
| `lineHeight` cru (23×) | line do preset |

Fases atômicas: (a) tokens + loader + teste RED→GREEN do fator; (b) pilot home + detalhe de empresa; (c) demais arquivos; (d) remoção do `Type` legado + gate de grep (`fontSize:\s*\d` só permitido em `theme.ts`); admin em commit separado.

## Admin (web)

- `npm i @fontsource-variable/inter @fontsource-variable/rubik` (dentro de `admin/`; dev via import no `main.tsx` — self-host, sem CDN).
- `styles.css` `:root`:
  - `--font-family-heading: 'Rubik Variable', system-ui, sans-serif;`
  - `--font-family-body: 'Inter Variable', system-ui, sans-serif;`
  - `--font-size-xs: 0.75rem … --font-size-xg: 1.5rem` (mesmas âncoras da Tabela 1, agora em rem);
  - `--line-height-*` correspondentes aos pares da Tabela 1 (xs 1rem · sm 1.25rem · md 1.5rem · lg 1.75rem · xg 2rem);
  - headings `.brand`, `.content h2` etc. usam `clamp(rem_mínimo, 1.6vw + rem_base, rem_máximo)`.
- `admin/src/theme/typography.ts`: espelha como strings `var(--font-size-sm)` (React `CSSProperties` aceita CSS var), para os 2 estilos inline atuais (`components/styles.ts`, `schedule-editor.tsx`). Fonte única dos valores = `styles.css`.

## Testes e verificação

### Unitários (vitest mobile)
- `fluid-width.test.ts` (clamp nas 3 bordas).
- `theme.test.ts`: presets referenciam famílias/pesos carregados e não vazam número fora da escada.

### E2E visual — Playwright (novo em ambos os apps)

Instalação: `npm i -D @playwright/test` em `mobile/` e `admin/` (ferramenta de dev, não módulo nativo do Expo — por isso fora do `expo install`; versão pinada no lockfile).

**Mobile-web** (`npx expo start --web`, base `http://localhost:8081`; app cai no modo mock sem backend — das regras de `services/api.ts`):

- `mobile/e2e/typography.spec.ts`:
  1. **screenshots**: Home, Detalhe de empresa, Busca, Configurações em 4 viewports — 320×568, 375×667, 414×896, 768×1024 — salvas em `mobile/e2e-artifacts/` (gitignored), sem asserção de pixel-perfect (não travar CI por 1px) — verificação humana de “não quebrou / não ficou grande demais”.
  2. **tamanho fluido**: `getComputedStyle` do body de um Texto conhecido = valor preset × fator do viewport (ex. 14 × 0.9 no 320). Cada viewport roda em **página própria (`page.goto` novo/per-project)** — o fator fluido é computado no load do módulo (`Dimensions.get('window').width`), sem reload não recalcula no resize.
  3. **família**: elemento de título computa `font-family` contendo `Rubik_700Bold`; body contém `Inter_400Regular`.
  4. **overflow**: `scrollWidth <= clientWidth` (ou sem truncado inesperado) nos cards de título/caption em 320px.
  5. **regressão**: as checagens rodando em cada commit da migração.

**Admin** (`npm run dev`, base conforme `vite.config` — normalmente 5173):
- `admin/e2e/typography.spec.ts`: viewports 320×568, 768×1024, 1366×900; screenshots + `getComputedStyle` conferindo `Rubik Variable` nos headings e `Inter Variable` no body; `font-size` **igual ao valor da escada** nos elementos de body (rem fixo) e **relação limitada (mín ≤ valor ≤ máx)** nos headings, que usam `clamp()` e por isso divergem da escada na maioria das larguras.

### Gate de qualidade (roda nos apps afetados; se o escopo cruzar backend, nos 3)
- mobile: `npm run typecheck`, `npm run lint`, `npm test`, `npx expo export` (prova que o bundle builda).
- admin: `npm run lint`, `npm run typecheck`, `npm run build`.
- `npm audit` nas 4 dependências novas.
- AGENTS.md §3 ganha regra de tipografia (tamanho via `Type.xs..xg`/presets; família via `FontFamily`).

## Critérios de aceite

1. Nenhuma ocorreência de `fontSize` cru fora de `theme.ts` no mobile src; nenhum `fontWeight` cru fora de `FontWeight`.
2. Presets cobrem h1–h5 (Rubik) e body/caption/label (Inter) como padrões
   recorrentes; **todo `<Text>` migrado define a família via tokens**
   (preset OU primitivos `FontFamily`/`Type`) — nenhum texto na fonte do
   sistema nem tamanho cru.
3. Mobile: tamanho computado do texto varia conforme a largura (verificado por Playwright em 4 viewports + screenshots).
4. Admin: tamanhos em rem/vars CSS, Rubik/Inter visíveis nos computed styles, build verde.
5. Testes E2E estáveis: asserções de estilo computado (não imagem exata), evitando flakiness por renderização.
