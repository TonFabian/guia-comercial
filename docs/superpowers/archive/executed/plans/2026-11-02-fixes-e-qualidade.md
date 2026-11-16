# Correções e Qualidade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir bugs e brechas identificados na análise do app, sem adicionar funcionalidades novas.

**Architecture:** Mudanças pontuais em camadas existentes (mobile services, providers, telas; backend seed). Sem novas abstrações. Cada correção é independente e testável.

**Tech Stack:** Expo Router (mobile web), React Native, Clerk, Express/Mongoose (backend), Jest (backend).

**Spec:** `docs/superpowers/specs/2026-11-02-guia-cidade-design.md`

## Global Constraints

- TypeScript strict; sem `any`; `import type` para tipos.
- Sem `console.log` em código entregue.
- Conventional Commits: `fix(scope): descrição`.
- Lint + typecheck verdes antes de declarar pronto.
- Backend: rodar `npm test` em `backend/`.
- Mobile: rodar `npm run typecheck` e `npx expo lint` em `mobile/`.

## Review Focus

1. **Token expirado em sessão longa** — o retry em `http.ts` só tenta uma vez; se o Clerk devolver o mesmo token expirado, a requisição falha com 401 e o usuário vê "Sessão expirada" mesmo estando logado. Esperado: renovar forçando `getToken({ skipCache: true })`.
2. **Guest state perdido no reload** — `enterAsGuest` só atualiza `useState`; após F5 o usuário perde o modo convidado e é redirecionado para login. Esperado: persistir e restaurar.
3. **Dados mockados em produção** — a busca anexa 40 "Empresa Mock" mesmo com API configurada. Esperado: apenas quando `!isApiConfigured()`.
4. **Busca não filtra enquanto digita** — `setLoading` não é resetado ao mudar o termo; a lista antiga persiste até o debounce. Esperado: feedback imediato.
5. **Content-Type ausente** em POST/PUT — backend não parseia o body. Esperado: header `application/json` em todas as requisições com body.

---

### Task 1: Remover mock data da busca em produção

**Files:**
- Modify: `mobile/src/app/(tabs)/search.tsx:46-55, 81`

**Interfaces:**
- Consumes: `isApiConfigured()` de `@/services/http`
- Produces: lista de empresas sem mocks quando API configurada

- [ ] **Step 1: Write failing test** — não há testes de tela no mobile; verificar manualmente via `npx expo export --platform web` após a mudança (sem "Empresa Mock" no bundle quando `EXPO_PUBLIC_API_URL` definido).
- [ ] **Step 2: Implement** — remover o bloco `MOCK_COMPANIES` e a concatenação `[...results, ...MOCK_COMPANIES]`, mantendo apenas `results`. Manter `MOCK_COMPANIES` apenas se `!isApiConfigured()` (importar `isApiConfigured`).
- [ ] **Step 3: Verify** — `npx expo lint` e `npm run typecheck` em `mobile/`.
- [ ] **Step 4: Commit** — `git commit -m "fix(search): remover mock data da busca em produção"`

### Task 2: Persistir modo convidado

**Files:**
- Modify: `mobile/src/providers/auth-provider.tsx`
- Modify: `mobile/src/features/auth/use-auth-guard.ts` (se necessário)

**Interfaces:**
- Produces: `enterAsGuest()` persiste flag; leitura inicial restaura guest se flag presente.

- [ ] **Step 1: Implement** — usar `AsyncStorage` (ou `expo-secure-store`) para salvar `guest=true` em `enterAsGuest`, limpar em `exitGuest`/`signOut`. Inicializar `guest` state lendo o storage no mount (useEffect).
- [ ] **Step 2: Verify** — reload da página mantém modo convidado; sair limpa.
- [ ] **Step 3: Commit** — `git commit -m "fix(auth): persistir modo convidado entre reloads"`

### Task 3: Corrigir Content-Type em http.ts

**Files:**
- Modify: `mobile/src/services/http.ts:85-112`

**Interfaces:**
- Produces: header `Content-Type: application/json` quando `init.body` definido.

- [ ] **Step 1: Implement** — adicionar `...(init?.body !== undefined ? { 'Content-Type': 'application/json' } : {})` nos headers do fetch inicial e do retry.
- [ ] **Step 2: Verify** — `npm run typecheck` em `mobile/`.
- [ ] **Step 3: Commit** — `git commit -m "fix(http): adicionar Content-Type em requisições com body"`

### Task 4: Renovar token com skipCache no retry 401

**Files:**
- Modify: `mobile/src/providers/auth-provider.tsx` (tokenGetter)
- Modify: `mobile/src/services/http.ts:98-101`

**Interfaces:**
- Consumes: `getToken({ skipCache: true })` do Clerk

- [ ] **Step 1: Implement** — no `tokenGetter`, chamar `getToken()` normalmente; em `http.ts`, no retry, chamar `tokenGetter` com flag de skip cache. Como o getter é opaco, alterar a assinatura para `TokenGetter = (options?: { skipCache?: boolean }) => Promise<string | null>` e propagar para `getToken`.
- [ ] **Step 2: Verify** — typecheck.
- [ ] **Step 3: Commit** — `git commit -m "fix(auth): renovar token com skipCache no retry 401"`

### Task 5: Feedback imediato na busca

**Files:**
- Modify: `mobile/src/app/(tabs)/search.tsx:57-92`

**Interfaces:**
- Produces: `setLoading(true)` no início do efeito, antes do debounce.

- [ ] **Step 1: Implement** — adicionar `setLoading(true)` antes do `setTimeout` no useEffect.
- [ ] **Step 2: Verify** — typecheck + lint.
- [ ] **Step 3: Commit** — `git commit -m "fix(search): feedback imediato de loading ao digitar"`

### Task 6: Seedar backend com empresa de id válido

**Files:**
- Create: `backend/src/scripts/seed.ts` (ou usar existente se houver)
- Modify: `backend/package.json` scripts

**Interfaces:**
- Produces: empresas com `_id` compatíveis com os mocks usados no mobile (ou ajustar mobile para usar `_id` real do backend).

- [ ] **Step 1: Verificar** se existe script de seed: `ls backend/src/scripts 2>/dev/null; grep -rn "seed" backend/package.json`.
- [ ] **Step 2: Implement** — criar seed com as empresas mockadas (Construtora Alicerce etc.) e categorias, rodável via `npm run seed`.
- [ ] **Step 3: Verify** — `npm run seed` + `GET /api/companies/1` retorna 200.
- [ ] **Step 4: Commit** — `git commit -m "chore(backend): seed de dados para desenvolvimento"`

### Task 7: Remover duplicação "Entre para ver o contato"

**Files:**
- Modify: componente de destaque em home (localizar via grep).

- [ ] **Step 1: Localizar** — `grep -rn "Entre para ver o contato" mobile/src`.
- [ ] **Step 2: Implement** — remover a segunda ocorrência.
- [ ] **Step 3: Commit** — `git commit -m "fix(home): remover texto duplicado no card de destaque"`

### Task 8: Formulário de senha (web)

**Files:**
- Modify: `mobile/src/features/auth/sign-in/email-password-form.tsx`

- [ ] **Step 1: Implement** — envolver inputs em `<form>` quando `Platform.OS === 'web'` para habilitar autofill e submit por Enter.
- [ ] **Step 2: Verify** — typecheck + lint + export web.
- [ ] **Step 3: Commit** — `git commit -m "fix(auth): envolver campos de senha em form no web"`

---

## Self-Review Checklist

- [ ] Cada correção tem commit atômico.
- [ ] Lint/typecheck verdes em mobile e backend.
- [ ] Busca não exibe "Empresa Mock" com API configurada.
- [ ] Reload preserva modo convidado.
- [ ] POST/PUT com body funcionam (Content-Type).
- [ ] Token renovado em sessão longa.
