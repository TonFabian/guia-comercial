# Novas Funcionalidades da Home — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar "Outras Empresas" (listagem gratuita) e "Mural de Avisos" na Home, conforme spec refinada.

**Architecture:** "Outras Empresas" reutiliza `Company` com `isFeatured=false` (backend já suporta filtro `featured`). "Mural de Avisos" cria entidade `Notice` (backend CRUD + mobile carousel + modal).

**Tech Stack:** Express + Mongoose (backend), Expo Router + React Native (mobile), Clerk (auth admin).

**Spec:** `docs/superpowers/specs/2026-11-03-novas-funcionalidades-refinada.md`

## Global Constraints

- TypeScript strict; sem `any`; `import type` para tipos.
- Sem `console.log` em código entregue.
- Conventional Commits.
- Lint + typecheck verdes.
- Backend: `npm test` em `backend/`.
- Mobile: `npm run typecheck` e `npx expo lint` em `mobile/`.
- Tipos de domínio sincronizados (shared + mobile + admin).

## Review Focus

1. **"Outras Empresas" não duplica "Destaque"** — filtro `featured=false` exclui destacadas.
2. **Mural expira automaticamente** — avisos com `expiresAt < now` não aparecem.
3. **Autorização** — mutations de Notice exigem auth + admin.
4. **Estados de UI** — loading, vazio, erro em ambas as seções.
5. **A11y** — `accessibilityLabel`/`role` em cards e botões.

---

### Task 1: Backend — entidade Notice (model + service + controller + routes)

**Files:**
- Create: `backend/src/models/notice.model.ts`
- Create: `backend/src/services/notice.service.ts`
- Create: `backend/src/controllers/notice.controller.ts`
- Modify: `backend/src/routes/index.ts`
- Modify: `backend/src/types/dto.ts`

**Interfaces:**
- Produces: `NoticeModel`, `listNotices(active?)`, `createNotice`, `updateNotice`, `deleteNotice`, rotas `GET/POST/PUT/DELETE /notices`.

- [ ] **Step 1: Shared domain** — adicionar `Notice` interface.
- [ ] **Step 2: Model** — criar `notice.model.ts`.
- [ ] **Step 3: DTO** — adicionar `createNoticeSchema` (zod).
- [ ] **Step 4: Service** — CRUD.
- [ ] **Step 5: Controller** — list/get/create/update/delete.
- [ ] **Step 6: Routes** — montar `/notices`.
- [ ] **Step 7: Verify** — typecheck + tests.
- [ ] **Step 8: Commit** — `feat(backend): entidade Notice (mural de avisos)`.

### Task 2: Mobile — seção "Outras Empresas" na Home

**Files:**
- Create: `mobile/src/features/home/other-companies.tsx`
- Modify: `mobile/src/app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `getCompanies` (já existe) com filtro `featured=false`.
- Produces: componente `OtherCompanies`.

- [ ] **Step 1: Implement** — seção com lista vertical compacta, loading, vazio, erro.
- [ ] **Step 2: Integrate** — adicionar na Home abaixo de "Empresas em Destaque".
- [ ] **Step 3: Verify** — typecheck + lint + export web.
- [ ] **Step 4: Commit** — `feat(home): seção Outras Empresas`.

### Task 3: Mobile — Mural de Avisos (carousel + modal)

**Files:**
- Create: `mobile/src/features/home/notices-carousel.tsx`
- Modify: `mobile/src/app/(tabs)/index.tsx`
- Modify: `mobile/src/services/api.ts` (adicionar `getNotices`)

**Interfaces:**
- Consumes: `getNotices(): Promise<Notice[]>`.
- Produces: componente `NoticesCarousel`.

- [ ] **Step 1: api.ts** — adicionar `getNotices`.
- [ ] **Step 2: Implement** — carrossel horizontal + modal de texto completo.
- [ ] **Step 3: Integrate** — adicionar na Home entre "Telefones Úteis" e "Oportunidades".
- [ ] **Step 4: Verify** — typecheck + lint + export web.
- [ ] **Step 5: Commit** — `feat(home): mural de avisos`.

### Task 4: Admin — CRUD de Notices

**Files:**
- Modify: `admin/src/services/api.ts`
- Modify: `admin/src/App.tsx`

- [ ] **Step 1: api.ts** — implementar `getNotices`, `createNotice`, `deleteNotice`.
- [ ] **Step 2: App.tsx** — adicionar seção "Avisos" com form + tabela.
- [ ] **Step 3: Verify** — typecheck + build.
- [ ] **Step 4: Commit** — `feat(admin): CRUD de avisos`.

---

## Self-Review Checklist

- [ ] Lint/typecheck verdes em mobile, backend, admin.
- [ ] Backend tests passando.
- [ ] "Outras Empresas" não exibe destacadas.
- [ ] Mural expira avisos vencidos.
- [ ] Estados de loading/vazio/erro em ambas as seções.
- [ ] A11y em cards e botões.