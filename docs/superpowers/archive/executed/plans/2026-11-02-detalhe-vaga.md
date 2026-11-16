# Detalhe de Vaga — Implementation Plan

**Goal:** Implementar tela de detalhe de vaga (substituir alert "em breve").

**Architecture:** Nova rota `app/job/[id].tsx` que busca vaga por id (backend `/jobs/:id` + mock fallback). Botão "Ver Vaga" navega para a rota.

**Tech Stack:** Expo Router, React Native, Clerk (guest), Express/Mongoose.

**Spec:** (nenhum spec separado; segue padrão de `company/[id].tsx`)

## Global Constraints

- TypeScript strict; sem `any`.
- Sem `console.log`.
- Lint + typecheck verdes.
- Mobile: `npm run typecheck` e `npx expo lint`.

## Tasks

### Task 1: Adicionar `getJobById` em api.ts

**Files:** Modify `mobile/src/services/api.ts`

- [ ] Implementar `getJobById(id)` com fallback mock (padrão de `getCompanyById`).
- [ ] Typecheck + lint.

### Task 2: Criar rota `app/job/[id].tsx`

**Files:** Create `mobile/src/app/job/[id].tsx`

- [ ] Tela com título, empresa, tipo, localização, descrição, botão "Ver empresa" (se company tem id) e "Voltar".
- [ ] Typecheck + lint + export web.

### Task 3: Atualizar job-list "Ver Vaga"

**Files:** Modify `mobile/src/features/home/job-list.tsx`

- [ ] Botão "Ver Vaga" navega para `/job/${job._id}` em vez de alert.

### Task 4: Registrar rota no Expo Router (se necessário)

**Files:** Nenhum — Expo Router auto-descobre arquivos em `app/`.