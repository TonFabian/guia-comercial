# Perfil do Usuário — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar edição de perfil ("Meus dados") e sincronização de favoritos entre aparelhos (Abordagem B).

**Architecture:** Backend espelho `User` ganha `favorites`, `ownedCompanyIds`, `preferences`. Novo `PUT /me`. Mobile `FavoritesProvider` sincroniza com `/me` quando logado. Tela de perfil permite editar nome/telefone/foto.

**Tech Stack:** Express + Mongoose (backend), Clerk (mobile), AsyncStorage, Expo Router.

**Spec:** `docs/superpowers/specs/2026-11-02-perfil-usuario-design.md`

## Global Constraints

- TypeScript strict; sem `any`; `import type` para tipos.
- Sem `console.log` em código entregue.
- Conventional Commits.
- Lint + typecheck verdes.
- Backend: `npm test` em `backend/`.
- Mobile: `npm run typecheck` e `npx expo lint` em `mobile/`.
- Tipos de domínio: editar `shared/domain.ts` E as cópias em `mobile/src/types/domain.ts` e `admin/src/types/domain.ts` no mesmo commit.

## Review Focus

1. **Favoritos não duplicam** — união local+remoto sem duplicatas; não deletar remoto.
2. **Convidado não chama /me** — só sincroniza quando `state === 'signedIn'`.
3. **Webhook Clerk não sobrescreve** `favorites`/`ownedCompanyIds`/`preferences`.
4. **PUT /me valida entrada** via zod; retorna 400 em inválido.
5. **E-mail read-only** no mobile (fonte: Clerk).

---

### Task 1: Atualizar modelo de domínio (shared + cópias)

**Files:**
- Modify: `shared/domain.ts`
- Modify: `mobile/src/types/domain.ts`
- Modify: `admin/src/types/domain.ts`

**Interfaces:**
- Produces: tipo `User` com `favorites?: string[]`, `ownedCompanyIds?: string[]`, `preferences?: { notifications: boolean }`.

- [ ] **Step 1: Edit** `shared/domain.ts` — adicionar campos ao tipo `User`.
- [ ] **Step 2: Replicate** nas cópias mobile e admin (mesmos campos).
- [ ] **Step 3: Verify** — `npm run typecheck` em backend, mobile, admin.
- [ ] **Step 4: Commit** — `git commit -m "feat(domain): adicionar favorites e preferences ao User"`

### Task 2: Backend — UserModel + service + dto

**Files:**
- Modify: `backend/src/models/user.model.ts`
- Modify: `backend/src/services/user.service.ts`
- Modify: `backend/src/types/dto.ts`
- Modify: `backend/src/controllers/user.controller.ts`

**Interfaces:**
- Produces: `updateUser(clerkId, mirror)` service; `UpdateUserDto` zod schema; controller `updateMe`.

- [ ] **Step 1: UserModel** — adicionar `favorites`, `ownedCompanyIds`, `preferences`.
- [ ] **Step 2: dto.ts** — adicionar `updateUserSchema` (zod, partial).
- [ ] **Step 3: user.service.ts** — adicionar `updateUserByClerkId(clerkId, mirror)`.
- [ ] **Step 4: user.controller.ts** — adicionar `updateMe` controller (valida, chama service, retorna user).
- [ ] **Step 5: Verify** — `npm run typecheck` + `npm test` em backend.
- [ ] **Step 6: Commit** — `git commit -m "feat(backend): PUT /me e campos de perfil no User"`

### Task 3: Backend — rota PUT /me

**Files:**
- Modify: `backend/src/routes/index.ts`

**Interfaces:**
- Produces: `PUT /api/me` montada atrás de `requireAuth` + `validateBody(updateUserSchema.partial())`.

- [ ] **Step 1: Edit** routes — adicionar `routes.put('/me', auth.requireAuth, validateBody(updateUserSchema.partial()), updateMe)`.
- [ ] **Step 2: Verify** — `npm test` em backend (adicionar teste de integração se houver padrão).
- [ ] **Step 3: Commit** — `git commit -m "feat(backend): rota PUT /me"`

### Task 4: Mobile — FavoritesProvider sincroniza com /me

**Files:**
- Modify: `mobile/src/providers/favorites-provider.tsx` (ou criar hook)
- Modify: `mobile/src/services/api.ts` (adicionar `getMe`, `updateMe`)

**Interfaces:**
- Produces: `getMe(): Promise<User | null>`, `updateMe(mirror): Promise<User>`.
- FavoritesProvider: quando `state === 'signedIn'`, ler `/me` e mesclar; persistir no toggle.

- [ ] **Step 1: api.ts** — adicionar `getMe` e `updateMe`.
- [ ] **Step 2: FavoritesProvider** — consumir `useAuthState`; se signedIn, fetch `/me` no mount, mesclar favoritos (união), persistir mudanças via `updateMe`.
- [ ] **Step 3: Verify** — typecheck + lint.
- [ ] **Step 4: Commit** — `git commit -m "feat(mobile): sincronizar favoritos com /me"`

### Task 5: Mobile — tela "Meus dados"

**Files:**
- Modify: `mobile/src/app/(tabs)/profile.tsx`

**Interfaces:**
- Produces: formulário de edição (nome, sobrenome, telefone, foto URL) com botão Salvar.

- [ ] **Step 1: Implement** — campos editáveis + botão Salvar → `PUT /me` + `user.update()` no Clerk. Alert de sucesso/erro.
- [ ] **Step 2: Verify** — typecheck + lint + export web.
- [ ] **Step 3: Commit** — `git commit -m "feat(profile): tela Meus dados com edição de perfil"`