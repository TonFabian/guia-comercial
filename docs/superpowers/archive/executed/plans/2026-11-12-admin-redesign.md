# Redesign do Painel Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar o painel admin (direção "Dark console") com Tailwind v4, mobile-first, fontes Rubik/Inter, página dedicada de formulário para Empresas.

**Architecture:** Tailwind v4 via plugin `@tailwindcss/vite` (tokens em `@theme` no CSS); camada de componentes-base em `src/components/ui/` consumida pelas 11 seções; shell responsivo (sidebar desktop / drawer mobile) em `App.tsx`; Empresas ganha página dedicada de formulário por estado (sem router). Nenhuma mudança funcional ou de API.

**Tech Stack:** Vite 7 + React 19 + Tailwind v4 (`@tailwindcss/vite`), TypeScript estrito.

**Spec:** `docs/superpowers/specs/2026-11-12-admin-redesign-design.md`

## Global Constraints

- Fontes: Rubik (headings) e Inter (corpo), self-hosted via `styles.css` (manter os imports atuais). Títulos sempre `font-family: var(--font-family-heading)`; tamanhos em `rem` (escala `xs 0.75rem / sm 0.875rem / md 1rem / lg 1.25rem / xg 1.5rem` + line-heights pareados). `src/theme/typography.ts` permanece (§7).
- Paleta (fonte única: `@theme` em `src/styles.css`): fundo `#16181d`, superfícies `#1d2026`, bordas `#2a2e36`, hover `#262b33`, texto `#e8e8ea`, texto secundário `#9aa0a6`, acento `#ffc107` (primário), `#ff9800` (gradiente do chip Premium), destrutivo `#ef4444`.
- Raios: `8px` (inputs/botões), `12px` (cards), `999px` (chips). Sombra de card: `0 2px 8px rgba(0,0,0,.4)`.
- Breakpoints mobile-first do Tailwind default (`sm` 640, `md` 768, `lg` 1024). Regra: **nenhuma tabela com scroll horizontal no mobile** — visão lista (cards empilhados) abaixo de `md`.
- Sem dependências de UI (nada de shadcn/MUI/radix). Só `tailwindcss` + `@tailwindcss/vite` (devDeps do admin).
- Não tocar em `src/services/api.ts`, endpoints, lógica do gate (`components/auth-gate.tsx` mantém comportamento fail-closed).
- Commits Conventional Commits com trailer `Generated-by: opencode (glm-5.3-flash-free)`. Gate do admin antes de fechar qualquer task: `npm run typecheck && npm run lint && npm run build`.
- Comportamento existente que NÃO pode quebrar (verificado por execução manual/Playwright ao final): login/gate fail-closed, criação/edição com plano via `PUT /:id/plan`, exclusão com confirmação, schedule editor, paginação, busca.

## Review Focus

1. **Viewport mobile (390px)**: usuário espera navegar sem scroll horizontal e tabelas legíveis — teste: screenshot Playwright 390px de cada seção sem overflow-x (Task 7).
2. **Formulário Empresas em mobile**: usuário espera preencher tudo em coluna única sem campos cortados — teste: screenshot 390px da página de formulário (Task 7).
3. **Estado de erro de API**: usuário espera mensagem clara (hoje `<p>` solto) — teste: screenshot com API indisp...

(Nota: sem infra de render-test no admin — vitest existe, mas sem testing-library. As provas dos tasks são typecheck/lint/build + verificação visual via Playwright listadas; nenhum teste de renderização será inventado. Único teste unitário possível: helpers puros, citados nos tasks.)

---

### Task 1: Tailwind v4 instalado e tokens no `@theme`

**Files:**
- Modify: `admin/package.json` (devDeps: `tailwindcss`, `@tailwindcss/vite`)
- Modify: `admin/vite.config.ts` (plugin `@tailwindcss/vite`)
- Modify: `admin/src/styles.css` (`@import "tailwindcss";` + bloco `@theme` com a paleta/raios/sombras do Global Constraints; manter imports de fontes e as vars `--font-family-*`/`--font-size-*`/`--line-height-*` existentes)
- Modify: `admin/src/App.tsx` (nada muda de lógica; garantir que o CSS novo compila)

**Interfaces:**
- Produces: classes utilitárias Tailwind disponíveis em todo o app; nomes de token `--color-bg`, `--color-surface`, `--color-surface-hover`, `--color-border`, `--color-text`, `--color-text-muted`, `--color-primary`, `--color-premium-gradient-*`, `--radius-input`, `--radius-card`, `--shadow-card` (referenciados como `bg-surface`, `border-border`, `rounded-card` etc.).

- [ ] **Step 1:** `npm i -D tailwindcss @tailwindcss/vite` dentro de `admin/` (npm, não bunx/pnpm — regra §0).
- [ ] **Step 2:** Adicionar `@tailwindcss/vite` ao `vite.config.ts` (`plugins: [react(), tailwindcss()]`) e `@import "tailwindcss";` + bloco `@theme` no topo de `styles.css`, com os valores do Global Constraints verbatim.
- [ ] **Step 3:** Rodar gate: `npm run typecheck && npm run lint && npm run build` — build deve passar (Tailwind compilando).
- [ ] **Step 4:** Commit `feat(admin): tailwind v4 com tokens do dark console no @theme`.

### Task 2: Componentes-base `src/components/ui/`

**Files:**
- Create: `admin/src/components/ui/button.tsx`, `input.tsx` (Input/Select/Textarea/CheckboxField), `card.tsx`, `plan-chip.tsx`, `field-grid.tsx`
- Create: `admin/src/components/ui/plan-chip.test.ts` (helper puro de label/classe por plano)
- Modify: substituir ao longo dos tasks seguintes (nada de deletar os antigos aqui)

**Interfaces:**
- Produces:
  - `Button({variant: 'primary'|'secondary'|'destructive', ...button props})` — altura `h-10`, `primary` = `bg-primary text-[#111] font-semibold`.
  - `Input/Select/Textarea/CheckboxField` — `bg-surface border-border rounded-[--radius-input] h-10 px-3 text-sm` (input), label acima em `text-xs text-text-muted`.
  - `Card` — `bg-surface border border-border rounded-[--radius-card] shadow-[--shadow-card] p-4`.
  - `PlanChip({plan: 'free'|'basic'|'premium'})` — premium: gradiente `#ffc107→#ff9800`, texto `#111`, `★ Premium`; basic: fundo `#262b33` texto `#ffc107` "Básico"; free: fundo `#262b33` texto `#9aa0a6` "Gratuito".
- Consumes: tokens do Task 1.

- [ ] **Step 1: teste do helper do PlanChip (RED)** — `admin/src/components/ui/plan-chip.test.ts`: import `{ planChipLabel, planChipClass }`; assert: `planChipLabel('premium') === '★ Premium'`, `('basic') === 'Básico'`, `('free') === 'Gratuito'`; classes distintas (premium contém 'text-[#111]', basic/free não). Rodar `npx vitest run src/components/ui/plan-chip.test.ts` → FAIL (módulo não existe).
- [ ] **Step 2: implementar os 5 componentes (GREEN)** — assinaturas acima; classes Tailwind puras, zero CSS novo fora de `@theme`.
- [ ] **Step 3:** `npx vitest run src/components/ui/` → PASS. Gate completo → PASS.
- [ ] **Step 4:** Commit `feat(admin): componentes-base ui com tailwind`.

### Task 3: Shell responsivo (sidebar + drawer mobile) e auth-gate

**Files:**
- Modify: `admin/src/components/sidebar.tsx` (desktop: aside fixo `w-60` `bg-[#0d0f13]` com item ativo `border-l-2 border-primary text-primary`; mobile: botão hambúrguer que abre drawer temporário `fixed inset-y-0 left-0 z-40`)
- Create: `admin/src/components/mobile-topbar.tsx` (visível só `< md`: título da seção + botão menu)
- Modify: `admin/src/App.tsx` (estado `const [menuOpen, setMenuOpen] = useState(false)`; layout: `<div class="min-h-screen bg-bg text-text flex">` com sidebar `hidden md:block` + topbar `md:hidden`)
- Modify: `admin/src/components/auth-gate.tsx` (trocar classes por Tailwind com os mesmos tokens; comportamento idêntico)

**Interfaces:**
- Consumes: tokens (Task 1), `SECTIONS`/`Section` existentes.
- Produces: `MobileTopbar({section, onMenu})`; App compõe `<Sidebar>` e `<MobileTopbar>`.

- [ ] **Step 1:** Implementar os 3 arquivos + ajuste do auth-gate.
- [ ] **Step 2:** Gate completo PASS; build gera bundle.
- [ ] **Step 3:** Verificação visual rápida: `npm run dev` já rodando em 5173 → Playwright: snapshot em 1280px (sidebar visível) e 390px (topbar + drawer abre/fecha). NÃO commitar screenshots.
- [ ] **Step 4:** Commit `feat(admin): shell responsivo com drawer mobile`.

### Task 4: Tabela/lista, busca e paginação responsivas

**Files:**
- Modify: `admin/src/components/table.tsx` — nova prop `mobileRows: {id: string, primary: string, secondary?: string, actions: ReactNode}[]`; `hidden md:block` na tabela; abaixo de `md` renderiza lista de cards com `primary/secondary/actions` (regra do Review Focus 1). Manter `emptyMessage`.
- Modify: `admin/src/components/search-input.tsx`, `pagination.tsx`, `row-actions.tsx`, `badge.tsx`, `delete-button.tsx` — restyle para Tailwind com tokens; assinaturas inalteradas.
- Modify: todas as seções (`sections/*.tsx`) — trocar `<Table headers rows>` por `<Table headers rows mobileRows>` (colunas essenciais: nome + plano/ações; os dados já estão em mãos no map de cada seção).

**Interfaces:**
- Consumes: tokens; `Badge`/`PlanChip`.
- Produces: `TableProps { headers: string[]; rows: ReactNode[][]; mobileRows?: MobileRow[]; emptyMessage?: string }` com `MobileRow = { id: string; primary: string; secondary?: string; actions?: ReactNode }` — o mesmo objeto usado por todas as 11 seções.

- [ ] **Step 1:** Restyle dos 5 componentes pequenos (assinaturas iguais).
- [ ] **Step 2:** Estender `Table` com `mobileRows` (variante lista `<md`).
- [ ] **Step 3:** Atualizar as 11 seções para passar `mobileRows` (map já existente; escolher 2–3 colunas essenciais por entidade).
- [ ] **Step 4:** Gate completo + `npx vitest run` (21 testes atuais não podem quebrar) PASS.
- [ ] **Step 5:** Commit `feat(admin): tabela com variante lista mobile e restyle dos componentes de listagem`.

### Task 5: Seção Empresas — página dedicada de formulário

**Files:**
- Modify: `admin/src/components/sections/empresas.tsx` — separar em duas "telas" por estado interno: `view: 'list' | 'form'`. Listagem = card com busca, tabela (Task 4) e botão `+ Nova empresa` (altura `h-10`, `px-4`). Form dedicado = breadcrumb `← Empresas` (volta p/ list), título, `Salvar`/`Cancelar` no topo, e o formulário atual em seções `Card`: "Dados básicos" (nome, slug, descrição, categoria, cidade), "Contato" (telefone, mesmo-número, WhatsApp), "Assinatura" (PlanChip + select de plano), "Horário de funcionamento" (`ScheduleEditor` atual, restylado). Grid: coluna única `< md`, `sm:grid-cols-2` para pares de campos.
- Modify: `admin/src/components/schedule-editor.tsx` — restyle (assinaturas inalteradas).

**Interfaces:**
- Consumes: `Button`, `Input/Select/Textarea/CheckboxField`, `Card`, `PlanChip`, `Table`, `FieldGrid` (Tasks 2–4). Lógica/form state existentes de `empresas.tsx` permanecem (mesmos handlers, mesmo payload — incluindo o fluxo `updateCompany` + `updateCompanyPlan`).
- Produces: nada exportado novo — `EmpresasSection` mantém a mesma assinatura de props que `App.tsx` passa hoje.

- [ ] **Step 1:** Restyle do `schedule-editor.tsx` (independente; gate PASS).
- [ ] **Step 2:** Refactor de `empresas.tsx` para list/form por estado, com os handlers atuais intactos.
- [ ] **Step 3:** Gate completo + `npx vitest run` PASS.
- [ ] **Step 4:** Verificação Playwright (dev server): criar/editar uma empresa de teste em 1280px e 390px — fluxo cria → edita → muda plano → salva (não persistir lixo: excluir a empresa de teste).
- [ ] **Step 5:** Commit `feat(admin): empresas com página dedicada de formulário`.

### Task 6: Restyle das 10 seções restantes

**Files:**
- Modify: `admin/src/components/sections/{categorias,cidades,banners,cupons,vagas,avisos,utilidade-publica,atracoes,eventos,usuarios}.tsx` — trocar classes antigas por Tailwind + componentes `ui/`; formulário inline no topo mantido (decisão de escopo), com `Card` de seção e grid responsivo igual ao de Empresas (coluna única `< sm`, `sm:grid-cols-2` quando houver pares).

**Interfaces:**
- Consumes: componentes `ui/` (Task 2), `Table` com `mobileRows` (Task 4). Assinaturas de props das seções inalteradas (App.tsx não muda).
- Produces: nada.

- [ ] **Step 1:** Restyle das 4 seções pequenas (usuarios 56, cidades 117, avisos 198, categorias 156) — gate PASS, commit `style(admin): restyle das seções menores`.
- [ ] **Step 2:** Restyle das médias (cupons 201, vagas 197, banners 181, utilidade-publica 256) — gate PASS, commit `style(admin): restyle das seções médias`.
- [ ] **Step 3:** Restyle das grandes (atracoes 453, eventos 605) — gate PASS, commit `style(admin): restyle das seções de atrações e eventos`.

### Task 7: Verificação visual final (desktop + mobile) e limpeza

**Files:**
- Modify: `admin/src/styles.css` (remover classes mortas do CSS legado que não têm mais call sites — `grep` para garantir)
- Delete (se sem uso): `admin/src/components/styles.ts`

**Interfaces:** — nada novo.

- [ ] **Step 1:** Playwright contra dev server: screenshots de Empresas (lista e formulário) em 1280px e 390px; navegar por todas as 11 seções em 390px confirmando ausência de overflow horizontal (`document.documentElement.scrollWidth <= window.innerWidth`).
- [ ] **Step 2:** Fluxo E2E manual via Playwright: login → criar empresa de teste → editar plano → salvar → excluir. Gate de role: reabrir com usuário comum → "Acesso restrito".
- [ ] **Step 3:** Gate completo dos 3 apps (AGENTS §1): backend, mobile e admin — PASS.
- [ ] **Step 4:** Commit `chore(admin): limpeza de css legado e verificação final`.

## Self-Review

- Cobertura do spec: visual C (T1/T2), shell responsivo + mobile-first (T3/T4), página dedicada só Empresas (T5), 11 seções (T4/T6), fontes/tokens §7 (T1), gate intacto (T3/T7). ✔
- Tipos consistentes: `MobileRow` definido no T4 e consumido igualmente em T4/T6; `planChipLabel/Class` do T2 usados só no T2. ✔
- Sem corpos que a assinatura já determina; sem passos que decidem nada. ✔
- Review Focus (1) e (2) → Task 7 Step 1; (3) fluxo de erro → Task 7 Step 2. ✔
