# Autenticação Clerk — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Login social (Google/Apple) + e-mail/senha via Clerk no mobile, home protegida, modo convidado com dados limitados, e mirror de usuários do Clerk no Mongo com backend autenticado.

**Architecture:** `ClerkProvider` + `AuthProvider` (Context) no mobile com guard de rota e fallback dev; `@clerk/expo` SSO com `expo-web-browser`. Backend valida o session token JWT via `@clerk/backend` em middleware próprio (fábrica para teste), espelha usuários via webhook svix (`verifyWebhook` + `express.raw`) e bootstrap on-demand via Clerk Backend API.

**Tech Stack:** `@clerk/expo`, `expo-auth-session`, `expo-web-browser`, `expo-apple-authentication`, Express 5, `@clerk/backend`, Mongoose 9, zod 4, vitest, supertest.

**Spec:** `docs/superpowers/specs/2026-10-22-auth-clerk-design.md` (ler junto; decisões do dono e my-calls estão lá).

## Global Constraints

- npm apenas; mobile: `npx expo install <pkg>` (nunca `npm install <pkg>`); nunca bunx/pnpm (AGENTS §0.8).
- Nunca criar/editar `ios/`/`android/` — config só em `mobile/app.json` (CNG).
- Segredos só em `.env` (ignorado); `.env.example` sem segredos. Chaves: `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET` (backend); `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (mobile).
- `shared/domain.ts` editado ⇒ replicar em `mobile/src/types/domain.ts` e `admin/src/types/domain.ts` no mesmo commit.
- Backend: camadas `routes → controllers → services → models`; funções puras (`scrub`, `mapClerkUserToMirror`, `useAuthGuard` do app) testadas sem I/O (vitest); supertest contra `app.ts`, nunca `index.ts`.
- Mobile: tokens de UI só de `mobile/src/constants/theme.ts` (`GuiaColors`, `Spacing`, `Radius`, `Type`); `accessibilityLabel`/`role` em botões; zero `console.log`.
- Commits Conventional Commits imperativos + trailer `Generated-by: OpenCode (GLM-5.3-Flash Free)`.
- Gate por tarefa: lint + typecheck do(s) app(s) afetado(s) verdes antes do commit; gate final dos três apps + `npx expo export` no mobile.

## Review Focus

1. **Token expirado com header presente** → deve dar 401, JAMAIS degradar a Guest silenciosamente (User viu dados arranhados sem explicação). Teste: `optionalAuth mantém 401 para header expirado` (Task 5).
2. **Webhook com corpo reparseado** → assinatura svix falha se `express.json` rodar antes. Comportamento esperado: 200 no êxito, 400 em assinatura inválida mesmo com payload JSON válido. Teste: `webhook rejeita assinatura inválida` (Task 6).
3. **Usuário do provider é o do Clerk, não do `/me`** → se `/me` falhar (legado/404), a UI **não** pode ficar vazia ou travar. Teste de código: guard condition + `AuthProvider` tolera erro de `/me` (Task 9, verificação manual no export).
4. **Escrita pública** → POST/PUT/DELETE continuam funcionando sem token (decisão do dono): nenhum middleware em writes; testes existentes de CRUD não podem quebrar (Task 7).
5. **Dev sem env Clerk (backend)** → comportamento idêntico ao atual: `app.test.ts` existente deve continuar passando sem nenhuma env (Task 5).

---

### Task 1: Domínio — `AdminUser` + novo `User` (3 arquivos)

**Files:**
- Modify: `shared/domain.ts` (interface `User` → renomeada para `AdminUser`; adicionar nova `User`)
- Modify: `mobile/src/types/domain.ts` (idem)
- Modify: `admin/src/types/domain.ts` (idem)
- Modify: `admin/src/services/api.ts` (stub `getUsers` usa `AdminUser`)

**Interfaces:**
- Produces: `AdminUser` (a antiga, com `role: 'admin' | 'editor'`) e
  `User { _id: string; clerkId: string; firstName?: string; lastName?: string; email: string; phone?: string; imageUrl?: string; role: 'user'; lastSid?: string; lastSignInAt?: string; createdAt?: string; updatedAt?: string }` — idênticos nos três arquivos.

- [ ] **Step 1: Renomear e adicionar** — renomear `User` → `AdminUser` nos 3 arquivos; adicionar `User` (mirror) exatamente como acima nos 3; atualizar import/stub em `admin/src/services/api.ts` (`Paginated<AdminUser>`).
- [ ] **Step 2: Verificar** — `npm run typecheck` nos três apps (raiz de cada app). Expected: PASS.
- [ ] **Step 3: Commit**

```bash
git add shared/domain.ts mobile/src/types/domain.ts admin/src/types/domain.ts admin/src/services/api.ts
git commit -m "refactor(domain): renomeia User para AdminUser e adiciona User do Clerk"
```

### Task 2: Backend — modelo + service de usuário

**Files:**
- Create: `backend/src/models/user.model.ts`
- Create: `backend/src/services/user.service.ts`
- Create: `backend/src/utils/clerk-user.ts`
- Test: `backend/src/utils/clerk-user.test.ts`

**Interfaces:**
- Consumes: tipo `User` de `shared/domain.ts`.
- Produces:
  - `UserModel = model<User>('User', userSchema)` — `clerkId` unique+index, `email` unique lowercase/trim, `lastSid` string, `timestamps`.
  - `mapClerkUserToMirror(data: ClerkUserData): Partial<User>` — `clerkId`, `firstName`, `lastName`, `email` (lowercase), `phone`, `imageUrl`; 100% puro.
  - `findUserByClerkId(clerkId: string): Promise<User | null>`
  - `upsertUserFromMirror(clerkId: string, mirror: Partial<User>): Promise<User>` — `findOneAndUpdate({ clerkId }, { $set: mirror }, { upsert: true, new: true })`.
  - `touchSession(clerkId: string, sid: string): Promise<void>` — só grava `lastSid`/`lastSignInAt` se `sid !== lastSid`.
  - `removeUserByClerkId(clerkId: string): Promise<void>`.
- `ClerkUserData` = `{ id: string; first_name?: string; last_name?: string; email_addresses?: Array<{ id: string; email_address: string }>; primary_email_address_id?: string; phone_numbers?: Array<{ phone_number: string; id: string }>; primary_phone_number_id?: string; image_url?: string }` (decliado do webhook/Backend API).

- [ ] **Step 1: Write the failing test** (`backend/src/utils/clerk-user.test.ts`)

```ts
import { describe, expect, it } from 'vitest';

import { mapClerkUserToMirror } from './clerk-user.js';

const dados = {
  id: 'user_123',
  first_name: 'Maria',
  last_name: 'Silva',
  email_addresses: [{ id: 'em_1', email_address: 'Maria@Example.com' }],
  primary_email_address_id: 'em_1',
  phone_numbers: [{ id: 'ph_1', phone_number: '+5584999999999' }],
  primary_phone_number_id: 'ph_1',
  image_url: 'https://img.clerk.com/m.png',
};

describe('mapClerkUserToMirror', () => {
  it('mapeia id, nome, email em minúsculas, telefone e imagem', () => {
    const mirror = mapClerkUserToMirror(dados);
    expect(mirror).toEqual({
      clerkId: 'user_123',
      firstName: 'Maria',
      lastName: 'Silva',
      email: 'maria@example.com',
      phone: '+5584999999999',
      imageUrl: 'https://img.clerk.com/m.png',
    });
  });

  it('não define phone/email ausentes', () => {
    const mirror = mapClerkUserToMirror({ id: 'user_x' });
    expect(mirror.phone).toBeUndefined();
    expect(mirror.email).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `cd backend && npx vitest run src/utils/clerk-user.test.ts` → FAIL (`mapClerkUserToMirror` indefinida).
- [ ] **Step 3: Implementar** `clerk-user.ts` (pure mapping: usa `primary_email_address_id` para achar o e-mail principal; sem HTTP) + `user.model.ts` + `user.service.ts` (assinaturas acima; service é I/O fino, sem regra escondida).
- [ ] **Step 4: Run test to verify it passes** — mesmo comando → PASS (2 testes).
- [ ] **Step 5: Gate** — `npm run typecheck && npm run lint` (backend). PASS.
- [ ] **Step 6: Commit**

```bash
git add backend/src/models/user.model.ts backend/src/services/user.service.ts backend/src/utils/clerk-user.ts backend/src/utils/clerk-user.test.ts
git commit -m "feat(backend): adiciona modelo e serviço de mirror de usuário do Clerk"
```

### Task 3: Backend — DTO/placeholders de env e config

**Files:**
- Modify: `backend/.env.example` (sem segredos)
- Modify: `backend/src/app.ts` (aviso explícito em produção sem `CLERK_SECRET_KEY`)
- Test: `backend/src/app.test.ts` (novo caso)

**Interfaces:**
- Produces: `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`, `CLERK_PUBLISHABLE_KEY` listadas em `.env.example` com comentário "obrigatórias quando auth ligado"; nada mais muda quando ausentes (modo legado).

- [ ] **Step 1: Write the failing test** — adicionar em `app.test.ts`:

```ts
describe('boot sem CLERK_SECRET_KEY', () => {
  it('avisa em produção que a API ficou sem autenticação', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.NODE_ENV = 'production';
    await import('./app.js');
    process.env.NODE_ENV = 'test';
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/sem autenticação/i));
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx vitest run src/app.test.ts` → FAIL (nada logado).
- [ ] **Step 3: Implementar** — em `app.ts`, se `!process.env.CLERK_SECRET_KEY && NODE_ENV === 'production'`: `console.warn('ATENÇÃO: API rodando sem autenticação — defina CLERK_SECRET_KEY')`. `.env.example` com a 3 vars.
- [ ] **Step 4: Run to verify it passes** → PASS.
- [ ] **Step 5: Commit**

```bash
git add backend/.env.example backend/src/app.ts backend/src/app.test.ts
git commit -m "feat(backend): avisa explicitamente quando a API roda sem autenticação"
```

### Task 4: Backend — scrub de convidado (puro)

**Files:**
- Create: `backend/src/utils/guest.ts`
- Test: `backend/src/utils/guest.test.ts`

**Interfaces:**
- Consumes: `Company`, `Coupon` de `shared/domain.ts`.
- Produces:
  - `scrubCompany<T extends Company>(company: T): T` — `{ ...company, phone: null, whatsapp: null, address: null }` (tipagem: campos `string | null` via `Omit`+override).
  - `scrubCoupon<T extends Coupon>(coupon: T): T` — `{ ..., code: null }`.
  - `scrubGuestResponse<T>(payload: T | Paginated<T>, guest: boolean): T | Paginated<T>` — aplica os nomes por tipo quando `guest` (Company/Coupon; outros passam), preservando `Paginated<T>` (scrub nos itens, mantém `total/page/pageSize`).

- [ ] **Step 1: Write the failing test** — `guest.test.ts`: (a) `scrubCompany zera phone/whatsapp/address mantendo o resto` (com objeto completo); (b) `scrubCoupon zera code`; (c) `scrubGuestResponse com guest=true e Paginated<Company> redigir itens e mantém total/page/pageSize`; (d) `com guest=false retorna payload idêntico (mesma referência)`.
- [ ] **Step 2: Run to verify it fails** — `npx vitest run src/utils/guest.test.ts` → FAIL.
- [ ] **Step 3: Implementar** funções puras em `guest.ts`.
- [ ] **Step 4: Run to verify it passes** → PASS.
- [ ] **Step 5: Commit**

```bash
git add backend/src/utils/guest.ts backend/src/utils/guest.test.ts
git commit -m "feat(backend): redige dados de contato para usuários convidados"
```

### Task 5: Backend — middleware de autenticação

**Files:**
- Create: `backend/src/types/express.d.ts` (declaration merging: `Request.auth?: { guest: boolean; clerkId?: string }`)
- Create: `backend/src/middlewares/auth.middleware.ts`
- Modify: `backend/src/routes/index.ts` (montar `optionalAuth` antes dos routers GET existentes)
- Test: `backend/src/middlewares/auth.middleware.test.ts`

**Interfaces:**
- Consumes: `user.service` (Task 2), `ClerkUserData`.
- Produces:
  - `makeAuthMiddleware(deps: AuthDeps)` onde `AuthDeps = { getState: GetState; getUser: (clerkId: string) => Promise<ClerkUserData>; find: typeof findUserByClerkId; upsert: typeof upsertUserFromMirror; touch: typeof touchSession }`; `GetState = (requestState: RequestState) => Promise<{ sub: string; sid?: string } | null>`; tipo `RequestState = { requestHeaders: Headers }`. Implementação real: `deps.getState = authenticateRequest`, `getUser = clerkClient.users.getUser`, demais apontando para `user.service`; testes injetam stubs.
  - `requireAuth(state)`: null ou sem sub → 401 `{ error: 'Não autenticado' }`; sucesso → `req.auth = { guest: false, clerkId: sub }`; `touchSession(sub, sid)`; se mirror não existe (`deps.find` === null) → `upsertUserFromMirror(sub, mapClerkUserToMirror(await deps.getUser(sub)))`.
  - `optionalAuth(state)`: sem header / token inválido conforme Review Focus 1 — **sem header → `req.auth = { guest: true }`; header presente mas inválido → 401**; sucesso → igual `requireAuth`.
- Montagem: `routes.use(optionalAuth(getStateReal))` no topo de `routes/index.ts` (apenas quando `CLERK_SECRET_KEY` presente; sem env → nada montado, `req.auth` fica indefinido, scrub não roda).

- [ ] **Step 1: Write the failing tests** (`auth.middleware.test.ts`, sem rede): com `res` mockado manualmente:
  1. `requireAuth responde 401 sem header` — getState recebe header vazio (stub chama `onEmptySessionBehavior` → representa null).
  2. `requireAuth injeta clerkId e faz touchSession` — stub retorna `{ sub: 'user_123', sid: 'sess_1' }`; fakes em `deps.find` (null) e espiar chamadas: `touch('user_123','sess_1')` e `upsert('user_123', mapClerkUserToMirror(profileFake))`.
  3. `optionalAuth marca guest sem header`.
  4. `optionalAuth responde 401 com header expirado` (stub lança estado não-autorizado → middleware responde 401, não guest).
- [ ] **Step 2: Run to verify it fails** — `npx vitest run src/middlewares/auth.middleware.test.ts` → FAIL (arquivo inexistente).
- [ ] **Step 3: Implementar** `auth.middleware.ts` + `express.d.ts` com as assinaturas acima (corpo: extração de header, chamada ao `getState`, guarda de erro → statusCode 401; detalhe de estado do Clerk (`onEmptySessionBehavior`, `authorizedParty`) fica nos defaults do `@clerk/backend`).
- [ ] **Step 4: Run to verify it passes** → PASS (4 testes).
- [ ] **Step 5: Gate** — `npm run test && npm run lint && npm run typecheck` (backend) → todos verdes, os antigos incluídos (Review Focus 5).
- [ ] **Step 6: Commit**

```bash
git add backend/src/types/express.d.ts backend/src/middlewares/auth.middleware.ts backend/src/middlewares/auth.middleware.test.ts backend/src/routes/index.ts
git commit -m "feat(backend): exige/permite sessão Clerk nas rotas da API"
```

### Task 6: Backend — webhook do Clerk + `/me`

**Files:**
- Create: `backend/src/routes/webhooks/clerk.ts`
- Modify: `backend/src/app.ts` (montar webhook antes do `express.json`)
- Create: `backend/src/controllers/user.controller.ts`
- Modify: `backend/src/routes/index.ts` (`GET /me`)
- Test: `backend/src/routes/webhooks/clerk.test.ts`, `backend/src/controllers/user.controller.test.ts`

**Interfaces:**
- Consumes: `user.service` (Task 2), `@clerk/backend/webhooks`.
- Produces:
  - `POST /api/webhooks/clerk` — rota: `app.post('/api/webhooks/clerk', express.raw({ type: 'application/json' }), clerkWebhook)` montada **antes** do `app.use(express.json(...))`; handler usa `verifyWebhook(req)`; assinatura inválida → 400; eventos: `user.created|user.updated` → `upsertUserFromMirror(dados.id, mapClerkUserToMirror(dados))`; `user.deleted` → `removeUserByClerkId`; outros eventos → 200 sem ação. Resposta sempre `{ received: true }`.
  - `GET /api/me` — `requireAuth` aplicado no router: responde `res.json(mapped)` com `toUserJson(mirror)` (`_id` → string via `String(doc._id)`; shape `User`).
  - `user.controller.me`: lê `req.auth.clerkId`; `findUserByClerkId` null → 404 `{ error: 'perfil não sincronizado ainda' }` (auto-curável na próxima chamada autenticada).

- [ ] **Step 1: Write the failing tests** — webhook: supertest contra um `express()` mínimo composto no teste (APP do módulo: `new` app de teste com `express.raw` + handler real e `deps` de service injetados? Não mockar service nosso... handler chama reais — sem Mongo os upserts dariam erro. Decisão: handler `clerkWebhook` aceita `deps = { upsert, remove }` default do service; teste injeta fakes (padrão da Task 5):
  1. `assinatura inválida responde 400` (request sem headers svix).
  2. `user.created faz upsert do mirror` (header `svix-id/timestamp/signature` gerado com função `signPayload` da lib svix/ts? — alternativa simples: stub do `verifyWebhook` via `deps.verify` também injetado; teste faz `deps.verify = async () => ({ type: 'user.created', data })` e espiar `upsert` fake).
  3. `user.deleted remove o mirror` — `removeUserByClerkId('user_x')` fake chamado.
- `/me` no controller: teste com fake do service via factory `makeMeController({ find })`:
  4. `me responde perfil do mirror autenticado`.
  5. `me responde 404 quando mirror não existe`.
- [ ] **Step 2: Run to verify it fails** — `npx vitest run src/routes/webhooks/ src/controllers/` → FAIL.
- [ ] **Step 3: Implementar** `clerk.ts` (rota com `express.raw` + `verifyWebhook` real via dep default), `user.controller.ts` e `app.ts` (montagem na ordem correta), `routes/index.ts` (`me` route com `requireAuth`).
- [ ] **Step 4: Run to verify it passes** → PASS (5 testes).
- [ ] **Step 5: Gate** — `npm test` (todos, incluindo app.test antigo) + lint + typecheck → verdes.
- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/webhooks backend/src/controllers/user.controller.ts backend/src/routes/index.ts backend/src/app.ts backend/src/controllers/user.controller.test.ts backend/src/routes/webhooks/clerk.test.ts
git commit -m "feat(backend): sincroniza espelho de usuários via webhook e expõe /me"
```

### Task 7: Backend — scrub nas rotas GET

**Files:**
- Modify: `backend/src/routes/index.ts` (ativa `scrub` via middleware de resposta pós-handler)
- Create: `backend/src/middlewares/guest.middleware.ts`
- Test: `backend/src/middlewares/guest.middleware.test.ts` (apura o encadeamento)

**Interfaces:**
- Consumes: `Task 4` (`scrubGuestResponse`), `Task 5` (`req.auth.guest`).
- Produces: `guestScrub()` RequestHandler — intercepta `res.json`: substitui por wrapper que, se `req.auth?.guest`, chama `scrubGuestResponse(payload, true)` antes de responder. Montado `routes.use(guestScrub())` logo após `optionalAuth`. Efeito: controllers existentes não mudam (Review Focus 4 intacto).

- [ ] **Step 1: Write the failing test** — supertest contra express mínimo com middleware `guestScrub` + rota fake que dá `res.json({...})`:
  1. `scrub reescreve payload para guest` (`req.auth = { guest: true }` setado no handler de teste) → resposta contém `phone: null`.
  2. `scrub não altera payload sem req.auth` (modo legado).
- [ ] **Step 2: Run to verify it fails** → FAIL.
- [ ] **Step 3: Implementar** em `guest.middleware.ts` + montagem em `routes/index.ts`.
- [ ] **Step 4: Run to verify it passes** → PASS.
- [ ] **Step 5: Gate** — backend completo: `npm test && npm run lint && npm run typecheck` → verdes.
- [ ] **Step 6: Commit**

```bash
git add backend/src/middlewares/guest.middleware.ts backend/src/middlewares/guest.middleware.test.ts backend/src/routes/index.ts
git commit -m "feat(backend): altera respostas GET para convidados sem contato"
```

### Task 8: Mobile — dependências, env e fachada HTTP autenticada

**Files:**
- Modify: `mobile/package.json` (via `npx expo install @clerk/expo expo-auth-session`)
- Modify: `mobile/.env.example` (`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=`)
- Create: `mobile/src/services/http.ts`
- Modify: `mobile/src/services/api.ts` (usa `http.ts` via `request`)
- Test: nenhum (sem runner no mobile) — verificação por typecheck/lint/export.

**Interfaces:**
- Produces (`http.ts`):
  - `export async function request<T>(path: string, init?: { method?: string; body?: unknown; signal?: AbortSignal }): Promise<T | null> — igual ao atual, adicionando: header `Authorization: Bearer ${token}` quando Clerk configurado e há token disponível. Injeção: `registerTokenGetter(() => getToken().catch(() => null))`, função exportada de `http.ts`, chamada por `auth-provider.tsx` na montagem (o `getToken` real vem de `useAuth` do Clerk). Mantém fallback mock (retorno null → caller usa mock) e **nunca** cai no fallback em 401/403: em erro HTTP ≠ null-body lança `ApiError`.
  - `export class ApiError extends Error { status: number; body: unknown }`.
- `api.ts`: troca o `request` interno por `http.ts`, mantendo assinaturas públicas idênticas.

- [ ] **Step 1: Instalar deps + env** — `npx expo install @clerk/expo expo-auth-session` (dentro de `mobile/`); atualizar `.env.example`.
- [ ] **Step 2: Refactor** — criar `http.ts` (com `ApiError`, getter de token injetável, retry de 401 uma vez) e reescrever o `request` de `api.ts` para chamar `http.ts`; assinaturas públicas de `api.ts` inalteradas.
- [ ] **Step 3: Verificar** — `npm run typecheck && npm run lint && npx expo export` (mobile) → PASS. Verificação manual: consumir tela home com e sem `EXPO_PUBLIC_API_URL`.
- [ ] **Step 4: Commit**

```bash
git add mobile/package.json mobile/package-lock.json mobile/.env.example mobile/src/services/http.ts mobile/src/services/api.ts
git commit -m "feat(mobile): adiciona fachada HTTP com token de sessão do Clerk"
```

### Task 9: Mobile — AuthProvider, guard e reorganização de rotas

**Files:**
- Create: `mobile/src/providers/auth-provider.tsx`
- Create: `mobile/src/features/auth/use-auth-guard.ts`
- Modify: `mobile/src/app/_layout.tsx` (providers condicionais)
- Create: `mobile/src/app/(auth)/_layout.tsx`, `(auth)/sign-in.tsx` (stub v1), `(auth)/continue.tsx` (stub), `(tabs)/_layout.tsx`
- Move: `mobile/src/app/{index,search,favorites,profile}.tsx` → `(tabs)/`
- Modify: `mobile/src/components/app-tabs.tsx` (agora usado dentro de `(tabs)/_layout.tsx`)
- Test: nenhum (typecheck/export como prova).

**Interfaces:**
- Consumes: `useAuth`, `useUser` de `@clerk/expo`; `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- Produces:
  - `AuthProvider` (Context): `state: 'loading' | 'signedIn' | 'guest' | 'signedOut'`, `user: User | null`, `enterAsGuest(): void`, `signOut(): Promise<void>`. Modo dev (sem env): `state = 'signedIn'`, `user` fake, `registerTokenGetter` nunca setado.
  - `useAuthGuard()`: useEffect — `isLoaded && state === 'signedOut'` → `router.replace('/(auth)/sign-in')`.
- `(tabs)/_layout.tsx`: `AppTabs` + `useAuthGuard()`; `(auth)/_layout.tsx`: `Stack` com `screenOptions={{ headerShown: false }}`.

- [ ] **Step 1: Escrever AuthProvider Context** — arquivo com provider + hook `useAuthState()`; seção dev fallback.
- [ ] **Step 2: Mover telas** — `git mv` das 4 telas de app → `(tabs)/`; criar layouts `(tabs)`, `(auth)`, stubs de sign-in/continue.
- [ ] **Step 3: Guard** — `use-auth-guard.ts` com efeito de redireção; chamar no `(tabs)/_layout.tsx`.
- [ ] **Step 4: Revisar links** — `grep -rn "router\.\|Link" mobile/src`: route groups não mudam URLs (`/search`, `/favorites` etc. continuam), então revisar apenas paths absolutos que referenciam as telas movidas de forma quebrada (se houver).
- [ ] **Step 5: Verificar** — `npm run typecheck && npm run lint && npx expo export` → PASS.
- [ ] **Step 6: Commit**

```bash
git add -A mobile/src/app mobile/src/providers mobile/src/features/auth mobile/src/components/app-tabs.tsx
git commit -m "feat(mobile): protege área principal com Clerk e separa áreas de auth"
```

### Task 10: Mobile — tela de login (visual do mock) + erros

**Files:**
- Create: `mobile/src/features/auth/clerk-errors.ts`
- Create: `mobile/src/features/auth/sign-in/social-buttons.tsx`
- Create: `mobile/src/features/auth/sign-in/email-password-form.tsx`
- Create: `mobile/src/features/auth/sign-in/forgot-or-guest.tsx`
- Modify: `mobile/src/app/(auth)/sign-in.tsx` (monta a tela com os componentes de feature)
- Test: nenhum (sem runner no mobile nesta fase; `clerk-errors.ts` é módulo puro e verificável via typecheck + revisão durante o execution review).

**Interfaces:**
 Consumes: `@clerk/expo` (`useSSO`, `useSignUp`, `useSignIn`, `useSignInWithApple` de `@clerk/expo/apple` — com verificação de compat SDK 58 antes da Task; fallback `oauth_apple` via `useSSO` se hooks nativos indisponíveis); `expo-web-browser`; `expo-auth-session`; `theme.ts`.
- Produces:
  - `clerkErrorToMessage(code: string): string` — tabela de codes (`form_password_incorrect` → 'Senha incorreta', `form_identifier_exists` → 'E-mail já cadastrado', ...); fallback: 'Não foi possível concluir. Tente novamente.'.
  - `useWarmUpBrowser()` (Android: `warmUpAsync`/`coolDownAsync`).
  - `SocialButtons { onGoogle(): void; onApple(): void ; appleLoading: boolean }` — Google sempre visível; Apple só `Platform.OS === 'ios'`.
  - `EmailPasswordForm` — modo 'entrar' | 'criar': campos nome/sobrenome/e-mail/telefone opcional/senha (criar) ou e-mail/senha (entrar); PASSWORD_MIN = 8; criação usa `email_code` (verificação de 6 dígitos inline no form, com reenvio `prepare`); telefone aplicado pós-sessão com `user.update({ phone })`; erros via `clerkErrorToMessage`.

- [ ] **Step 1: `clerk-errors.ts`** — módulo puro com map + função.
- [ ] **Step 2: social-buttons.tsx** — tokens do theme; `accessibilityLabel`/`role='button'`.
- [ ] **Step 3: email-password-form.tsx** — form controlados, `TextInput` do RN com keyboardType/autoCapitalize corretos; estilos via `StyleSheet.create` (nada inline no render).
- [ ] **Step 4: sign-in.tsx** — monta logo (assets existentes `assets/images/icon.png`), título 'Acesse sua conta', SocialButtons (conecta `useSSO` → redirects na Task), divisor 'ou', botão dourado Entrar/Criar conta, `forgot-or-guest` (link convidado → `enterAsGuest()` + `router.replace('/(tabs)')`); `maybeCompleteAuthSession()` no topo do módulo.
- [ ] **Step 5: continue.tsx** — coleta o que `session.currentTask`/missing requirements indica; mínimo: mostra o `task` e botão continuar.
- [ ] **Step 6: Verificar** — `npm run typecheck && npm run lint && npx expo export` → PASS (bundleia).
- [ ] **Step 7: Commit**

```bash
git add mobile/src/features/auth mobile/src/app/'(auth)'
git commit -m "feat(mobile): tela de login com Google, Apple, e-mail/senha e guest"```

(prompt removido — título corrigido acima)
### Task 11: Mobile — convidado, contato oculto e banner

**Files:**
- Create: `mobile/src/features/auth/guest-banner.tsx`
- Modify: `mobile/src/features/home/*` (empresa em destaque, farmácia, job list) para campos `null` → hint "Entre para ver o contato"
- Modify: `mobile/src/types/domain.ts` — mudar campos contato de `Company`/`Coupon` para `string | null` (mudar em `shared/domain.ts` + `admin/src/types/domain.ts` no mesmo commit exceto se admin usar — propagação)
- Test: nenhum (typecheck/export).

**Interfaces:**
- Consumes: `AuthProvider` (`state === 'guest'`), tipos do domínio.
- Produces: `GuestBanner { onSignIn(): void }`; componentes de contato exibem texto quando valor é null.

- [ ] **Step 1: Atualizar tipos** — nos 3 arquivos de domínio (mesmo commit): campos de contato/comerciais `Company`: `phone?: string | null; whatsapp?: string | null; address?: string | null` e `Coupon`: `code?: string | null`. `backend/src/models/company.model.ts` não precisa mudar (mongoose serializa `null` normalmente).
- [ ] **Step 2: guest-banner.tsx** — banner na home quando `state === 'guest'`, com CTA que abre sign-in.
- [ ] **Step 3: componentes de contato** — nos componentes que renderizam telefone/whatsapp/cupom (`featured-company`, `pharmacy-on-duty`, `coupon-list`): valor null → “Entre para ver o contato”.
- [ ] **Step 4: Verificar** — `npm run typecheck && npm run lint && npx expo export` (mobile) + `npm run typecheck` (admin) → PASS; backend: `npm run typecheck && npm test` → PASS.
- [ ] **Step 5: Commit**

```bash
git add shared/domain.ts mobile/src/types/domain.ts admin/src/types/domain.ts admin/src mobile/src/features
git commit -m "feat(mobile): modo convidado com banner e contato oculto"
```

### Task 12: Gate final — verificação dos três apps

**Files:** nenhum (só comandos; ajustes mínimos se algo falhar)

- [ ] **Step 1: backend** — `cd backend && npm run lint && npm run typecheck && npm test` → verdes.
- [ ] **Step 2: admin** — `cd admin && npm run lint && npm run typecheck` → verdes.
- [ ] **Step 3: mobile** — `cd mobile && npm run lint && npm run typecheck && npx expo export` → sucesso no bundle.
- [ ] **Step 4: Verificação manual declarada** (não executável aqui): login Google no Expo Go (com env do dev), convidado com dados arranhados, e-mail/senha com verificação de código. Precisa de device/emulador; conferir se a API dev (com CLERK_SECRET_KEY) espelha o usuário no Mongo após o login.
- [ ] **Step 5: Commit final** (se houver ajustes) e relatório.

Configurações manuais necessárias (fora do código, documentadas no relatório): Clerk Dashboard (conexões Google/Apple, redirects `exp://` e `guiacomercial://`), envs reais nos `.env` de backend/mobile, Apple Developer Portal + `npx clerk@latest init` para o fluxo nativo Apple (dev build).
