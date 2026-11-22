# Clean Code Refactor Plan (mobile)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Melhorar a manutenibilidade do código mobile adicionado na branch, aplicando padrões de Clean Code (Strategy, Factory/Adapter, DRY, memoização) sem alterar funcionalidades.

**Architecture:** Refactors incrementais e verificáveis: extrair hooks reutilizáveis, memoizar estilos, introduzir Strategy para planos e Adapter para fontes de dados, adicionar cancelamento de requisições em hooks. Cada task é reversível e coberta por testes existentes + novos.

**Tech Stack:** React Native (Expo SDK 58), TypeScript strict, Vitest (mobile), npm.

**Spec:** docs/superpowers/specs/2026-11-17-destaque-por-plano-design.md

## Global Constraints

- TypeScript strict, sem `any`.
- Sem instalar dependências novas.
- Lint + typecheck + testes verdes antes de cada commit.
- Não alterar comportamento observável (status HTTP, JSON, UI).
- Conventional Commits + trailer `Generated-by`.

## Review Focus

- Cancelamento de requisição em `useHomeData` (evitar setState após unmount).
- Sincronização dos 3 `domain.ts` (shared/mobile/admin).
- Gate de tipografia (grep de `fontSize` cru).
- Memoização de `makeStyles` em listas.
- Índices Mongo para novas queries por plano.

---

### Task 1: Memoizar `makeStyles` em componentes de lista

**Files:**
- Modify: `mobile/src/features/home/other-companies.tsx`
- Modify: `mobile/src/features/home/featured-companies.tsx`
- Modify: `mobile/src/features/company/company-detail-screen.tsx`
- Modify: `mobile/src/features/company/company-free-detail-screen.tsx`

**Interfaces:**
- Produces: `const styles = useMemo(() => makeStyles(colors), [colors])`.

- [ ] **Step 1:** Substituir `const styles = makeStyles(colors)` por versão memoizada em cada arquivo (incluindo as duas chamadas em `company-detail-screen.tsx`).
- [ ] **Step 2:** Rodar `npm run typecheck` + suite de testes → PASS.
- [ ] **Step 3:** Commit `refactor(mobile): memoiza makeStyles em componentes de lista`.

### Task 2: Extrair `useCarouselPagination` hook

**Files:**
- Create: `mobile/src/hooks/use-carousel-pagination.ts`
- Create: `mobile/src/hooks/use-carousel-pagination.test.ts`
- Modify: `mobile/src/features/home/featured-companies.tsx`
- Modify: `mobile/src/features/home/other-companies.tsx`

**Interfaces:**
- Produces: `useCarouselPagination(length, itemWidth, spacing): { activeIndex, handleScroll, snapToInterval }` onde `snapToInterval = itemWidth + spacing`.

- [ ] **Step 1: Write failing test** para o hook (activeIndex inicial 0, handleScroll atualiza).
- [ ] **Step 2: Run test → FAIL.**
- [ ] **Step 3: Implement hook** reutilizando `pageIndexFromOffset`.
- [ ] **Step 4: Run test → PASS.**
- [ ] **Step 5:** Refatorar os dois componentes para usar o hook.
- [ ] **Step 6:** Rodar testes + typecheck → PASS.
- [ ] **Step 7:** Commit.

### Task 3: Cancelamento de requisição em `useHomeData` (revisado)

**Files:**
- Modify: `mobile/src/services/api.ts`
- Verify: `mobile/src/features/home/use-home-data.ts`

**Interfaces:**
- Produces: `AbortController` propagado às chamadas de fetch em `api.ts`; verificação via grep de setState não guardado.

- [ ] **Step 1:** Confirmar (grep) que `use-home-data.ts` já possui `cancelled` guard em todos os setState — se sim, marcar como satisfeito.
- [ ] **Step 2:** Adicionar `AbortController` nas funções de fetch de `api.ts` (getCategories, getBanners, getCoupons, getJobs, getFeaturedCompanies, getPharmacyOnDuty) e propagar o signal.
- [ ] **Step 3:** Rodar `api.test.ts` → PASS.
- [ ] **Step 4:** Commit.

### Task 4: Strategy para planos de empresa

**Files:**
- Create: `mobile/src/features/company/plan-strategy.ts`
- Create: `mobile/src/features/company/plan-strategy.test.ts`
- Modify: `mobile/src/features/company/company-plan.ts`
- Modify: `mobile/src/features/company/plan-badge.tsx`

**Interfaces:**
- Produces: `type Feature = 'catalog' | 'analytics' | 'priority' | 'coupons'`, `interface PlanStrategy { label: string; hasFeature(f: Feature): boolean }`, `getPlanStrategy(plan)`.

- [ ] **Step 1: Write failing test** para todos os planos e features.
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement** estratégias Free/Basic/Premium com mapa de features.
- [ ] **Step 4: Run → PASS.**
- [ ] **Step 5:** Refatorar `company-plan.ts` e `plan-badge.tsx`.
- [ ] **Step 6:** Rodar testes → PASS.
- [ ] **Step 7:** Commit.

### Task 5: Adapter para fontes de dados (mobile)

**Files:**
- Create: `mobile/src/services/company-data-source.ts`
- Modify: `mobile/src/services/api.ts`

**Interfaces:**
- Produces: `interface CompanyDataSource { getFeatured, getCategories, getBanners, getCoupons, getJobs, getPharmacyOnDuty }` + `createDataSource(env)`.

- [ ] **Step 1:** Definir interface completa espelhando `api.ts` + factory.
- [ ] **Step 2:** Refatorar `api.ts` para delegar à fonte selecionada (migração total, sem endpoints pendentes).
- [ ] **Step 3:** Rodar `api.test.ts` → PASS.
- [ ] **Step 4:** Commit.

### Task 6: Verificar sincronização de `domain.ts`

**Files:**
- Verify: `shared/domain.ts`, `mobile/src/types/domain.ts`, `admin/src/types/domain.ts`.

- [ ] **Step 1:** `diff` entre os três; esperado zero divergência. Corrigir se houver.
- [ ] **Step 2:** Commit se houver mudança.

### Task 7: Backend — índices para queries por plano

**Files:**
- Modify: `backend/src/models/company.model.ts`

- [ ] **Step 1:** Adicionar índice em `plan` (e composto com `slug` se aplicável).
- [ ] **Step 2:** Rodar testes backend → PASS.
- [ ] **Step 3:** Commit.

### Task 8: Validação do gate de tipografia (CI)

**Files:**
- Verify: `.github/workflows/ci.yml`.

- [ ] **Step 1:** Confirmar o passo do CI com `grep -rn "fontSize:\\s*\\d" mobile/src --include=*.tsx --include=*.ts | grep -v theme.ts` retornando vazio (excluindo testes).
- [ ] **Step 2:** Rodar localmente e corrigir ocorrências fora de `theme.ts`.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-11-21-clean-code-refactor-plan.md`. Please review the plan. Does it capture what you want? Which execution approach do you prefer?

- **Subagent-driven** (recomendado): subagente por task + reviewer independente.
- **Native**: implementação sequencial nesta sessão.