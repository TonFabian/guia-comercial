# Design — Autenticação com Clerk (mobile + backend)

Data: 2026-10-22 · Status: aguardando aprovação

## Intenção e porquê

O app mobile precisa de autenticação real: a área principal (abas home, search,
favorites, profile) fica visível apenas para quem entra com a própria conta.
Login social via **Clerk** (Google e Apple) + e-mail/senha como alternativa.
O backend passa a exigir (ou tolerar, no modo convidado) uma sessão válida e
passa a **espelhar os usuários do Clerk** em uma collection própria no Mongo,
para futuras features de perfil, favoritos e personalização.

## Goals

- Login social Google (todos os devices) e Apple (iOS, nativo).
- Cadastro/login por e-mail e senha (cadastrado e sessão 100% no Clerk).
- Modo convidado: navegação com dados **limitados** (sem contato comercial).
- Área autenticada protegida por guard de rota (Expo Router).
- Backend valida JWT de sessão do Clerk em todas as rotas de dados.
- Entidade `User` no Mongo (mirror do Clerk): `firstName`, `lastName`,
  `email`, `phone`, aberta para extensão futura.
- Fallback dev: sem `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, o app libera as telas
  e usa dados mock (mesmo espírito do fallback atual do `api.ts`).

## Non-goals

- Papéis/permissões (admin, editor) nesta fase.
- Recuperação de senha por SMS/WhatsApp, MFA, passkeys.
- Perfil editável pelo usuário (a tela profile exibe os dados, sem editar).
- facebook login (descartado pelo dono do produto).

## Anti-goals (o que seria falha mesmo funcionando)

- Armazenar senha, hash de senha ou token de sessão no nosso Mongo — isso é
  responsabilidade do Clerk. Duplicar seria dívida de segurança.
- "Pattern for the sake of pattern": sem Repository genérico, sem abstrações
  de provedor de identidade (Clerk é decisão fechada).

## Constraints

- Expo SDK ~58 / RN 0.88, npm (nunca bunx/pnpm), sem `ios/`/`android/` (CNG).
- Login social nativo Apple exige dev build (não funciona no Expo Go).
- Monorepo: `shared/domain.ts` é a fonte; cópias idênticas em
  `mobile/src/types/domain.ts` e `admin/src/types/domain.ts` (mesmo commit).
- AGENTS.md: TDD, camadas `routes → controllers → services → models`,
  zod na borda, erros com `statusCode`, código e comentários em português.

## Abordagens consideradas

1. **Webhook svix + bootstrap on-demand (escolhida).** O webhook
   `user.created/updated/deleted` mantém o mirror; o middleware de auth
   também faz upsert do usuário caso o registro não exista (webhook atrasado
   ou fora do ar). Auto-curável. Trade-off: um pouco mais de código.
2. Só webhook — mirror pode ficar buraco; descartada.
3. Só on-demand — deletions nunca propagam; descartada.

Verificação de sessão: **`@clerk/backend`** (jwks) em middleware Express
próprio, e não verificação manual com `jose`.

Estrutura de rotas mobile: **grupo `(auth)` + grupo `(tabs)`** com guard no
layout das abas, em vez de guard por tela.

### Decisões do dono do produto

- incluir e-mail/senha; sem Facebook; convidado entra com dados limitados.
- Tela de login segue o mock do admin (cartão "Acesse sua conta"), só o
  cartão do formulário, adaptado a mobile.

## Modelo de dados

### Renomeação + novo tipo (os 3 arquivos de domínio, mesmo commit)

1. `User` (admin/editor, sem login) → **`AdminUser`**. Uso atual: stub
   `getUsers` não implementado em `admin/src/services/api.ts` (atualizar o
   tipo no stub).
2. Adicionar a nova interface `User` (abaixo) nos **três** arquivos:
   `shared/domain.ts`, `mobile/src/types/domain.ts` e
   `admin/src/types/domain.ts` (o `AuthProvider` do mobile consome `User`).

### `User` (novo — mirror do Clerk)

```ts
export interface User {
  _id: string;
  clerkId: string;          // user_xxx do Clerk, único + indexado
  firstName?: string;       // do SignUp, obrigatório no cadastro
  lastName?: string;
  email: string;            // único (Clerk garante)
  phone?: string;           // opcional, do cadastro
  imageUrl?: string;        // avatar social (usado no header/profile)
  role: 'user';             // aberto para admins futuramente
  lastSid?: string;         // sid da última sessão ativa (base de lastSignInAt)
  lastSignInAt?: string;    // ISO — atualizado quando sid !== lastSid
  createdAt?: string;
  updatedAt?: string;
}
```

Sessão: **não persistimos tokens**. O device guarda os tokens de sessão no
`tokenCache` do `@clerk/expo`; o backend valida o JWT a cada request via
jwks do Clerk. A informação de sessão persistida é só `lastSignInAt`.

### Modelo de dados / Schema Mongoose (`backend/src/models/user.model.ts`)

`clerkId` unique+index, `email` unique (lowercase/trim), `lastSid` (string),
`timestamps`, `select`/`lean` nas queries. Nada de dado sensível (nunca
senha/token — responsabilidade exclusiva do Clerk).

### DTOs (zod, `backend/src/types/dto.ts`)

O mirror não cria/upserta via request pública — só webhook (validado por
svix) e upsert interno. Nenhum `createUser` público nesta fase.

## Backend

### Novas variáveis de env (`.env` + `.env.example` sem segredos)

- `CLERK_SECRET_KEY` (obrigatória quando auth ligado)
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET` (svix)

### Middleware `auth.middleware.ts`

- Fábrica `makeAuthMiddleware(deps)` com `verifyToken`/`authenticateRequest`
  injetados — os testes mockam o que não é nosso (AGENTS §2) sem
  transtorno de ESM: módulo de teste instancia o middleware com stub.
- `requireAuth`: valida `Authorization: Bearer <jwt>` com
  `@clerk/backend` (jwks); 401 para header ausente ou inválido; em caso
  de sucesso, injeta o `clerkId` (claim `sub`) no request.
- `optionalAuth`: tenta autenticar; **sem header → Guest; header presente
  e inválido/expirado → 401** (nunca rebaixar silenciosamente um usuário
  logado a convidado — o `http.ts` do app já refresca token e retenta).
- **Importante**: o session token do Clerk só carrega `sub`, `sid`, `iat`,
  `exp` — não há nome/email/telefone no payload. Dados de perfil para o
  mirror vêm do **webhook** (mecanismo primário) ou da **Clerk Backend
  API** (`clerkClient.users.getUser(clerkId)`) no bootstrap.
- Faz **upsert** do mirror `User` quando `clerkId` não existe: uma única
  `findOne({ clerkId }).lean()` indexada por request; no miss, busca o
  perfil na Backend API e insere. Atualiza `lastSignInAt` (ISO) quando
  `sid !== lastSid` (novo campo `lastSid` no documento — não comparar
  `iat` com datas, unidades incompatíveis).
- Sem `CLERK_SECRET_KEY`: **auth desligado de vez** (decisão do dono) —
  nenhum middleware de auth, nenhuma redação de convidado, comportamento
  100% atual inclusive nos testes (o "modo legado"). Se a env falta em
  `NODE_ENV=production`, loga aviso explícito de API sem autenticação no
  boot (lacuna conhecida, como rate limiting hoje).

### Rotas

Decisão do dono (fase atual):
- **GET** públicos (companies, categories, banners, coupons, jobs) com
  `optionalAuth` + scrub de contato quando autenticado como Guest.
- **Writes** (POST/PUT/DELETE) **permanecem públicos por ora** — risco
  registrado como lacuna conhecida (ao lado de rate limiting); será
  resolvido quando o admin passar a enviar token Clerk.
- Nova rota de conta `/me` (GET perfil do mirror + clerkId) → `requireAuth`.
- `routes/webhooks/clerk.ts`: verificação com `verifyWebhook(req)` de
  `@clerk/backend/webhooks` — exige o corpo bruto byte-a-byte, então a
  rota é montada em `app.ts` **antes** do `express.json` com
  `express.raw({ type: 'application/json' })` na própria rota (padrão
  oficial do Express nos docs do Clerk) — montá-la dentro de `/api`
  depois do json quebraria a assinatura. Assinatura inválida → 400. O
  handler apenas traduz evento → `user.service.ts` (SRP); o upsert por
  `clerkId` torna a reentrega do webhook idempotente por natureza.

### Camada de convidado (Guest) — decisão minha (ajustável)

Guest vê navegação completa, mas a resposta redige ("scrubs") dados
comerciais: `phone`, `whatsapp`, `address` de `Company` e `code` de `Coupon`
viram `null`. Implementação: funções puras `scrubCompany/scrubCoupon` em
`backend/src/utils/guest.ts` (testáveis sem HTTP), aplicadas **no
controller sobre a resposta final** (não no service — evita mudar a
assinatura de toda a pilha list/get). Objetivo: convidado se informa,
autenticado consegue e usa os contatos/cupons — incentivo claro para logar.

## Mobile

### Estrutura de pastas (adições)

```
mobile/src/
  app/
    _layout.tsx              # ClerkProvider condicional + AuthProvider + Slot
    (auth)/_layout.tsx       # Stack simples da área de login
    (auth)/sign-in.tsx       # tela de login (fora das tabs)
    (auth)/continue.tsx      # coleta de pendências do fluxo SSO (transfer)
    (tabs)/_layout.tsx       # AppTabs + guard de rota
    (tabs)/index.tsx         # home (movida)
    (tabs)/search.tsx, (tabs)/favorites.tsx, (tabs)/profile.tsx
  features/auth/
    sign-in/                 # componentes da tela de login
      social-buttons.tsx     # Botões sociais Google / Apple (iOS)
      email-password-form.tsx  # alternância entrar/criar conta (Clerk)
      forgot-or-guest.tsx    # link convidado / recuperação futura
    guest-banner.tsx         # aviso "modo convidado" na home
    use-auth-guard.ts        # redireciona p/ sign-in quando signedOut
    clerk-errors.ts          # tradução de error.code -> mensagem PT-BR (puro)
  services/
    http.ts                  # fachada fetch: Bearer, ApiError, 401
    api.ts                   # domínio (inalterado no consumo)
  providers/
    auth-provider.tsx        # Context: state, user, guest, fallback dev
```

### Providers e composição

- `ClerkAndAuthProvider` no `_layout.tsx`: se `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
  existe → `<ClerkProvider tokenCache>` + `AuthProvider` real;
  senão → `AuthProvider` em modo dev (`state = 'signedIn'`, `user` fake) —
  o app inteiro funciona, mock dos dados como hoje.
- `AuthProvider` (Context) expõe: `state: 'loading' | 'signedIn' |
  'guest' | 'signedOut'`, `user: User | null`, `enterAsGuest()`,
  `signOut()`. Os dados de **exibição** vêm de `useUser`/`useAuth` do
  Clerk (sempre disponíveis no cliente); chamar `/me` é opcional e serve
  apenas para garantir o mirror no backend — 404 do `/me` em modo legado
  ou corrida de webhook **não bloqueia** a UI (tolerado).

### Guard de rota

`useAuthGuard` no layout `(tabs)`: `isLoaded && !isSignedIn && !isGuest`
→ `router.replace('/(auth)/sign-in')`. Splash segura o primeiro paint
(atualizar o uso de SplashScreen no `_layout` para não piscar tela).

### Fluxo Google (Expo Go e dev build)

`useSSO` + `expo-web-browser`:
`warmUpAsync/coolDownAsync` (Android), `maybeCompleteAuthSession()` no
**topo do módulo** (fora do componente) da tela de sign-in, `redirectUrl = AuthSession.makeRedirectUri({ scheme:
'guiacomercial' })`, `startSSOFlow({ strategy: 'oauth_google',
redirectUrl })` → `setActive` → `router.replace('/(tabs)')`.
**Caso sem sessão** (`createdSessionId` ausente — transfer flow ou
requisitos pendentes): `router.push('/(auth)/continue')` para tela que
coleta o que falta, conforme guia oficial; `session.currentTask`
verificado dentro do `setActive` antes de navegar para as tabs.
**Dashboard do Clerk**: registrar tanto o redirect do Expo Go (`exp://`)
quanto o scheme custom (`guiacomercial://`) nas conexões sociais — sem
isso o fluxo falha silenciosamente.

### Fluxo Apple (dev build, iOS)

`useSignInWithApple` (`@clerk/expo/apple`), só iOS (botão oculto fora
dele). Entitlement de Sign in with Apple via config plugin/app.json
capabilities (CNG — jamais editar `ios/` à mão); depende de
`expo-apple-authentication` como plugin no `app.json`. **Verificação de
compatibilidade antes do passo 8**: ler a doc versionada do SDK 58 e a
versão do `@clerk/expo` a ser instalada (AGENTS §11); se
`useSignInWithApple` não suportar o SDK 58, degradar para o fluxo web
`useSSO` com `strategy: 'oauth_apple'` (funciona em qualquer build).

### Formulário e-mail/senha (Clerk faz o hash; nós nunca guardamos senha)

Mesma tela `sign-in`, alternância "Entrar" / "Criar conta":

- **Criar conta** (`useSignUp`, strategy `email_code`): campos nome,
  sobrenome, e-mail, telefone (opcional), senha → envio de código por
  e-mail → tela de verificação de 6 dígitos → `setActive` do método
  `email_address`. O **telefone não entra no SignUp**: na estratégia
  `email_code` o Clerk exigiria verificação por SMS também, duplicando o
  fluxo — se informado, é aplicado com `user.update({ phone })` após a
  sessão ativa (número não verificado; verificação por SMS fica para a
  fase de perfil).
- **Entrar** (`useSignIn`, strategy `password`): e-mail + senha.
- Código de verificação expirado → botão "reenviar código" (`prepare`
  novamente) na tela de verificação.
- Erros do Clerk (`error.code`/`message`) mapeados para mensagens
  amigáveis em português (ex.: `form_password_incorrect`,
  `form_identifier_exists`), em um módulo puro `clerk-errors.ts`
  de mensagens traduzidas (testável).
- Validação/senha mínima coerentes com a configuração do Clerk Dashboard
  (mín. 8 chars aqui no form + validação do lado Clerk).

### Tela de login (visual do mock, adaptado ao mobile)

Fundo `GuiaColors.background`, logo no topo, título "Acesse sua conta",
botões sociais empilhados (Google → Apple[ios]), divisor "ou", botão dourado
principal ("Entrar" / alternância para "Criar conta"), link "Entrar como
convidado" discreto no rodapé. Tokens de cor/espaçamento SEMPRE do
`theme.ts` — nada literal. `accessibilityLabel`/`role` nos botões.

### Camada de requests

`http.ts`: mesma assinatura do fetch atual + injeta
`Bearer await getToken()`, trata 401 (1 retry com token novo), lança
`ApiError(status, body)`, mantém fallback mock como hoje (env ausente ou
network fail) — o fallback **não** existe quando a API responde 401/403 real.
`api.ts` continua sendo a única fachada de domínio consumida pelas features.

### Guest no mobile

- `enterAsGuest()` no AuthProvider seta `state='guest'` e também em memória
  enquanto o app viva (não persiste: cada cold start pergunta de novo —
  decisão minha; evita "convidado eterno acidental").
- Banner na home (`guest-banner.tsx`) "Você está navegando como convidado —
  entre para ver contatos e cupons" com CTA que abre sign-in.
- Dados de contato null vindos do backend → componentes exibem "Entre para
  ver o contato" (e o mock de dev continua com dados, pois dev sem env é
  "signedIn" fake).

## Env do mobile

`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (`.env` do app, nunca commitado).

## Testes (TDD, do mais independente ao mais integrado)

Backend:
1. `guest.scrub` — funções puras: redação de campos de Company/Coupon.
2. `auth` unitário via `makeAuthMiddleware(deps)` (stub de
   `authenticateRequest`): header ausente/malformado → 401; token válido
   → `clerkId` no request + mirror via Backend API mockada.
3. Webhook svix: assinatura inválida → 400; `user.created` → upsert no
   mirror (mock do service); `user.deleted` → remove.
4. Integração supertest: rota GET sem token → 200 com campos de contato
   `null` (Guest); `/me` sem token → 401; `/me` autenticado, mirror
   inexistente → 404 (auto-curável na próxima chamada).
   (mocke o que não é nosso — AGENTS §2).

Mobile (expo export + typecheck/lint como gate):
- componentes puros testáveis quando houver runner; foco em não quebrar
  o bundle (`npx expo export` prova).

## Ordens de implementação (primeiro os comportamentos, um por vez)

1. Renomeação `AdminUser` + adicionar novo `User` nos 3 domínios
   (refactor puro, testes verdes).
2. Backend: modelo `User` + service (upsert/find/remove) + testes.
3. Backend: `auth.middleware` (`requireAuth`/`optionalAuth`, fábrica com
   deps injetadas) + testes com token/jwks mockados.
4. Backend: rotas GET com `optionalAuth` + scrub de Guest no controller +
   `/me`.
5. Backend: webhook Clerk (svix, raw body antes do `express.json`) +
   testes de assinatura/eventos.
6. Mobile: deps (`npx expo install @clerk/expo expo-auth-session`),
   env, `http.ts` (Bearer/ApiError), manter fallback.
7. Mobile: providers + guard + reorganização `(auth)`/`(tabs)` (revisar
   todos os `Link`/`router.push` existentes para os novos caminhos) +
   sign-in Google (incluindo tela `continue` para o caso sem sessão).
8. Mobile: Apple (dev build, com fallback web `oauth_apple`) +
   e-mail/senha (signup/verify/reenvio/signin).
9. Mobile: convidado (banner, scrub render, CTA).
10. Gate final: lint/typecheck/testes nos três apps + `expo export`.

## Riscos e lacunas conhecidas (registradas)

- Writes públicos no backend (decisão: fase atual) — proteger quando o
  admin integrar o Clerk.
- Mirror: `user.deleted` faz remoção física; se favoritos (futuro)
  referenciarem o `_id` do mirror, migrar para soft delete ou
  agendamento.
- Apple nativo depende de compat `@clerk/expo` × SDK 58 (verificar na
  implementação; fallback web definido).

## O que fica como meu julgamento (revisar se discordar)

- Limites exatos do scrub Guest (campos acima) — fácil de ajustar.
- Guest em memória, sem persistência.
- `/me` não-existente → 404 (o middleware de auth cria na hora do upsert,
  então 404 só indica corrida do webhook; auto-curável na próxima chamada).
- Nome `AdminUser` para o antigo tipo.
