# Push Center no Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Push Center no admin: campanhas segmentadas (broadcast/usuário/lista/cidade/plano/favoritos) com envio imediato ou agendado, histórico com tickets/receipts da Expo, limpeza de tokens mortos e deep link com whitelist.

**Architecture:** Coleção `PushCampaign` (claim-first no envio, `receipts: {id, token}[]` para o cron de receipts); `push-campaign.service.ts` resolve segmento → tokens; `sendPushToTokens` estendida com `opcoes?: { data?, image? }` e processamento por ticket; crons de 5 min para agendadas e receipts em `index.ts`; guard novo `assertAdminEstrito` (fail-closed sem Clerk). Admin ganha seção "Notificações" (compositor + histórico); mobile ganha `notifications-provider` (handler foreground + deep link no tap/cold start).

**Tech Stack:** Express 5 + Mongoose 9 + zod 4 + node-cron (backend); Vite + React 19 + Tailwind v4 (admin); Expo 58 + expo-notifications (mobile); vitest + supertest.

**Spec:** `docs/superpowers/specs/2026-11-12-push-center-admin-design.md` (o plano argumenta a partir da spec; ler os dois).

## Global Constraints

- TDD: teste falhando antes de código de produção; teste de comportamento.
- TypeScript estrito, sem `any`; `import type` para tipos.
- Tipos de domínio: editar `shared/domain.ts` e replicar em `admin/src/types/domain.ts` no mesmo commit (mobile não consome `PushCampaign`).
- Fuso: `America/Sao_Paulo` (offset fixo `-03:00`); `scheduledFor` chega em ISO UTC; cron usa o timezone canônico.
- `sendingStartedAt` é a base da auto-recuperação (nunca `updatedAt`).
- Sem segredos no código; novas env vars em `backend/.env.example` (`PUSH_CENTER_DISABLED`, `PUSH_CAMPAIGN_MAX_PER_HOUR`).
- Sem `console.log` sobrando; erros com `statusCode`; 422 payload inválido, 404 válido inexistente, 401 sem sessão, 403 sem role.
- Rate limit de campanha in-memory com chave `campanha:${createdByClerkId}` + `TODO(redis)` (mesma limitação documentada do analytics).
- Lotes de 100 mensagens na Expo; processamento POR TICKET (HTTP 200 + tickets).
- npm dentro de cada app; não editar `ios/`/`android/`.

## Review Focus

- **Concorrência no envio** (cron + "enviar agora" juntos): 1 envio, não 2 — teste em `push-campaign.service.test.ts` (Task 7).
- **Opt-out no broadcast do Push Center** (join reverso token→user): usuário com `preferences.notifications = false` não recebe nem em broadcast; guest sem User recebe — teste na Task 6.
- **Token morto sem dupla contagem** (ticket E receipt podem detectar): `deadTokens` conta só quando `deleteOne` removeu de fato — testes nas Tasks 6 e 8.
- **Cron caído no dia do agendamento**: campanha atrasada é pega na próxima execução (`scheduledFor <= agora`) e enviada 1× — teste na Task 9.
- **Deep link malformado no payload recebido pelo mobile** (push pode vir de fora): cliente valida na mesma whitelist antes de navegar — teste na Task 12.

---

## File Structure (novos / modificados)

**Shared:** `shared/domain.ts` + `admin/src/types/domain.ts` — `PushCampaign`, `PushCampaignSegment`, `PushCampaignSummary` (cópia idêntica; mobile NÃO recebe).

**Backend:**
- `models/push-campaign.model.ts` (novo) — schema + índices.
- `types/dto.ts` — `createCampaignSchema`, `updateCampaignStatusSchema` (cancel).
- `services/user.service.ts` — `assertAdminEstrito`.
- `services/push.service.ts` — `sendPushToTokens` estendida (opcoes + tickets + DeviceNotRegistered).
- `services/push-campaign.service.ts` (novo) — `resolverSegmento`, `enviarCampanha`, `reivindicarEnvio`.
- `services/push-receipt.service.ts` (novo) — `processarReceiptsPendentes`.
- `middlewares/campaign-rate-limit.middleware.ts` (novo) — `limitarCampanha`, `limparRateLimitCampanhas`.
- `controllers/push-campaign.controller.ts` (novo).
- `routes/index.ts` — 6 rotas (FORA do bloco `if (authDeps)`).
- `services/user.service.ts` + `controllers/user.controller.ts` — `?search=` no `GET /users`.
- `index.ts` — 2 crons.

**Admin:**
- `services/api.ts` — tipos + `getPushCampaigns`, `getPushCampaign`, `createPushCampaign`, `sendPushCampaignNow`, `cancelPushCampaign`, `deletePushCampaign`.
- `components/sections/notificacoes.tsx` (novo) — compositor + histórico + detalhe.
- `App.tsx` — seção no menu.

**Mobile:**
- `utils/deep-link.ts` (novo) + `utils/deep-link.test.ts`.
- `providers/notifications-provider.tsx` (novo) — handler foreground + listener + cold start; montado em `app/_layout.tsx`.

---

### Task 1: Domínio — tipos `PushCampaign*`

**Files:**
- Modify: `shared/domain.ts` (fim do arquivo, seção de tipos de notificação)
- Modify: `admin/src/types/domain.ts` (cópia idêntica)

**Interfaces:**
- Produces (usado por backend e admin nas tasks seguintes):

```ts
export interface PushCampaignSegment {
  kind: 'broadcast' | 'user' | 'users' | 'city' | 'plan' | 'favorites';
  userIds?: string[];
  cityId?: string;
  plan?: 'basic' | 'premium';
  companyId?: string;
}

export interface PushCampaignStats {
  targeted: number;
  sent: number;
  failed: number;
  deadTokens: number;
}

export interface PushCampaign {
  _id: string;
  title: string;
  body: string;
  imageUrl?: string;
  deepLink?: string;
  segment: PushCampaignSegment;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduledFor?: string;       // ISO UTC
  sendingStartedAt?: string;
  sentAt?: string;
  receipts?: { id: string; token: string }[];
  stats: PushCampaignStats;
  error?: string;
  createdByClerkId: string;
  createdAt: string;
}

/** Item da listagem (sem receipts — payload grande e inútil na lista). */
export type PushCampaignSummary = Omit<PushCampaign, 'receipts'>;
```

- [ ] **Step 1:** Editar os dois arquivos com os tipos verbatim acima (doc comments curtos em português).
- [ ] **Step 2:** Typecheck: `cd backend && npm run typecheck` e `cd ../admin && npm run typecheck` — 0 erros.
- [ ] **Step 3:** Commit: `git add shared/domain.ts admin/src/types/domain.ts && git commit -m "feat(domain): tipos de campanha de push (PushCampaign*)"`

---

### Task 2: Backend — guard `assertAdminEstrito`

**Files:**
- Modify: `backend/src/services/user.service.ts` (junto de `assertAdmin`)
- Test: `backend/src/services/user.service.test.ts` (acrescentar describe; se não existir, criar — helper puro com `findUserByClerkId` mockado)

**Interfaces:**
- Produces: `assertAdminEstrito(clerkId: string | undefined, recurso: string): Promise<void>` — lança `401` sem `CLERK_SECRET_KEY` OU sem clerkId; `403` com sessão e role ≠ admin; não lança quando admin. DIFERENTE de `assertAdmin`: fail-closed no modo legado.

- [ ] **Step 1: Teste falhando** — três casos: sem `CLERK_SECRET_KEY` → rejeita 401; com Clerk e sem clerkId → 401; com Clerk, clerkId de usuário comum → 403; admin → resolve. Stub de env + mock de `findUserByClerkId` no padrão do repo (`vi.hoisted`).
- [ ] **Step 2:** `npx vitest run src/services/user.service.test.ts` — FAIL.
- [ ] **Step 3:** Implementar `assertAdminEstrito` (sem tocar em `assertAdmin`/`ehAdmin` — callers existentes não mudam).
- [ ] **Step 4:** PASS + gate backend (`npm run typecheck && npm run lint && npm test`).
- [ ] **Step 5:** Commit: `feat(backend): assertAdminEstrito - guard admin fail-closed para campanhas`

---

### Task 3: Backend — modelo `PushCampaign` + DTO com whitelist de deep link

**Files:**
- Create: `backend/src/models/push-campaign.model.ts`
- Modify: `backend/src/types/dto.ts` (após `broadcastSchema`)
- Test: `backend/src/models/push-campaign.model.test.ts` (novo), `backend/src/types/dto.test.ts` (acrescentar describe)

**Interfaces:**
- Produces: `PushCampaignModel` com paths do §3.1 da spec (`receipts` como `[Schema.Types.Mixed]` — subdoc `{ id, token }`; `stats` subdoc com defaults 0). Índices: `{ scheduledFor: 1, status: 1 }` (cron de agendadas), `{ status: 1, createdAt: -1 }` (listagem).
- Produces: `createCampaignSchema` (zod):

```ts
const DEEP_LINK_PADRAO = [
  { prefixo: '/', exato: true },
  { prefixo: '/(tabs)/search', exato: true },
  { prefixo: '/(tabs)/favorites', exato: true },
  { prefixo: '/(tabs)/profile', exato: true },
  { prefixo: '/company/', exato: false },
  { prefixo: '/event/', exato: false },
  { prefixo: '/tourist-spot/', exato: false },
  { prefixo: '/job/', exato: false },
  { prefixo: '/autonomous/', exato: false },
  { prefixo: '/map', exato: true },
  { prefixo: '/my-company', exato: true },
  { prefixo: '/announce', exato: true },
] as const;
```

  (constante EXPORTADA `DEEP_LINK_PADRAO` + helper puro `ehDeepLinkValido(url: string): boolean` em `backend/src/utils/deep-link.ts` NOVO — casamento por segmento: exatos só casam iguais; não-exatos exigem o prefixo + 1 segmento `[\w-]+`; teste de paridade com o admin na Task 11.)
- Schema:

```ts
export const createCampaignSchema = z.object({
  title: z.string().trim().min(3).max(64),
  body: z.string().trim().min(3).max(280),
  imageUrl: z.string().trim().url().regex(/^https:\/\//).optional(),
  deepLink: z.string().trim().refine(ehDeepLinkValido, { message: 'rota de deep link não permitida' }).optional(),
  segment: z.object({
    kind: z.enum(['broadcast', 'user', 'users', 'city', 'plan', 'favorites']),
    userIds: z.array(z.string().regex(/^[0-9a-f]{24}$/)).max(500).optional(),
    cityId: z.string().regex(/^[0-9a-f]{24}$/).optional(),
    plan: z.enum(['basic', 'premium']).optional(),
    companyId: z.string().regex(/^[0-9a-f]{24}$/).optional(),
  }),
  scheduledFor: z.string().datetime().optional(), // ISO UTC; validação de futuro no service
});
export type CreateCampaignDto = z.infer<typeof createCampaignSchema>;

export const updateCampaignStatusSchema = z.object({ action: z.literal('cancel') });
```

- [ ] **Step 1: Testes falhando** — DTO: title/body limites (3..64, 3..280), imageUrl rejeita `http://`, deepLink aceita `/company/abc123` e rejeita `/coupon/x`, `/company/x/y`, `//`, `javascript:`; `user` exige `userIds.length === 1` (422 via superRefine: `kind user` + length ≠ 1 → issue; `users` > 500 → issue); `city`/`plan`/`favorites` exigem seu campo — superRefine por kind. Modelo: paths existem, índices presentes.
- [ ] **Step 2:** Rodar — FAIL.
- [ ] **Step 3:** Implementar modelo + DTO + `deep-link.ts` (superRefine no `createCampaignSchema` para as regras cruzadas de segmento).
- [ ] **Step 4:** PASS + gate backend.
- [ ] **Step 5:** Commit: `feat(backend): modelo PushCampaign e DTO de campanha com whitelist de deep link`

---

### Task 4: Backend — `sendPushToTokens` estendida (tickets + data/image + token morto)

**Files:**
- Modify: `backend/src/services/push.service.ts`
- Test: `backend/src/services/push.service.test.ts` (acrescentar describes; testes posicionais existentes atualizados no mesmo commit)
- Callers a atualizar: `controllers/push-token.controller.ts` (broadcast — chamada posicional continua válida), `services/plan-lifecycle.service.ts` (via `sendPushToUser`/`sendPushToCity` internas, sem mudança de call-site)

**Interfaces:**
- Produces:

```ts
export interface PushTicketOk { status: 'ok'; id: string }
export interface PushTicketErro { status: 'error'; message: string; details?: { error?: string } }
export type PushTicket = PushTicketOk | PushTicketErro;

export async function sendPushToTokens(
  tokens: string[],
  title: string,
  body: string,
  opcoes?: { data?: Record<string, string>; image?: string },
): Promise<PushTicket[]>;
```

  - Lotes de 100 (`chunk`); body por mensagem: `{ to, title, body, ...(data ? { data } : {}), ...(image ? { image } : {}) }`.
  - `getReceipts` NÃO é chamado aqui. Ticket `DeviceNotRegistered` → remover o token AGORA (`PushTokenModel.deleteOne({ token })`) — a contagem de `deadTokens` é responsabilidade do caller (Task 7).
  - Sem fire-and-forget: o caller (`enviarCampanha`) precisa dos tickets; `sendPushToUser`/`sendPushToCity` continuam ignorando o retorno.

- [ ] **Step 1: Testes falhando** — mock de fetch devolvendo `{ data: [{ status: 'ok', id: 'r1' }, { status: 'error', message: 'x', details: { error: 'DeviceNotRegistered' } }] }`: retorna tickets; mensagem com `data`/`image` inclui os campos; 150 tokens → 2 chamadas de rede (lote 100 + 50); token em erro `DeviceNotRegistered` é removido do modelo (mock `deleteOne`); falha de rede continua warn-e-vazio (`[]`).
- [ ] **Step 2:** FAIL (assinatura atual não retorna).
- [ ] **Step 3:** Implementar. Atualizar os 2 testes posicionais antigos para consumir o retorno.
- [ ] **Step 4:** PASS + gate backend.
- [ ] **Step 5:** Commit: `feat(backend): sendPushToTokens retorna tickets da Expo e suporta data/image`

---

### Task 5: Backend — rate limit de campanhas

**Files:**
- Create: `backend/src/middlewares/campaign-rate-limit.middleware.ts`
- Test: `backend/src/middlewares/campaign-rate-limit.test.ts` (novo — middleware puro com `Request` fake, padrão dos testes de middleware do repo)

**Interfaces:**
- Produces: `limitarCampanha: RequestHandler` (janela 1h, limite de `PUSH_CAMPAIGN_MAX_PER_HOUR`, default 10, chave `campanha:${req.auth?.clerkId ?? req.ip}`); `limparRateLimitCampanhas(): void` (testes); `TODO(redis)` no header do arquivo.

- [ ] **Step 1: Teste falhando** — 10ª requisição passa, 11ª → 429 (env `PUSH_CAMPAIGN_MAX_PER_HOUR=10`); chave por clerkId (dois clerkIds não se bloqueiam); sem clerkId usa IP.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementar (mesma estrutura de `analytics-rate-limit.middleware.ts`).
- [ ] **Step 4:** PASS.
- [ ] **Step 5:** Commit: `feat(backend): rate limit de criacao de campanhas por admin`

---

### Task 6: Backend — resolver de segmento + filtros de opt-out

**Files:**
- Create: `backend/src/services/push-campaign.service.ts` (só `resolverSegmento` nesta task)
- Test: `backend/src/services/push-campaign.service.test.ts` (novo — modelos em memória via `test-support/memory-model.js`)

**Interfaces:**
- Consumes: `PushCampaignModel` (Task 3), `UserModel`, `PushTokenModel`, `CompanyModel`.
- Produces:

```ts
/** Resolve o segmento em tokens dedup, filtrando opt-out (spec §5).
 * broadcast: todos os tokens; tokens com clerkId de usuário com opt-out saem
 * (join reverso por clerkId); guest sem User permanece. Demais kinds: tokens
 * dos usuários resolvidos que TÊN opt-out ativo nunca entram. */
export async function resolverSegmento(segment: PushCampaignSegment): Promise<{ tokens: string[]; targeted: number }>;
```

  - `targeted` = tokens ANTES do filtro de opt-out (auditoria); `tokens` = depois.
  - `user`/`users`: `UserModel.find({ _id: { $in: userIds } }).select('clerkId preferences.notifications')` → `PushTokenModel.find({ clerkId: { $in } })`.
  - `city`: agregação `$lookup` de `sendPushToCity` (reusar a query — extrair para helper interno ou duplicar a pipeline; escolher UMA).
  - `plan`: `CompanyModel.find({ plan }).select('ownerClerkId')` (ownerClerkId nulo ignorado) → tokens por clerkId.
  - `favorites`: `UserModel.find({ favorites: companyId })` → tokens por clerkId.
  - Dedup final por `Set`.

- [ ] **Step 1: Testes falhando** — fixtures com `UserModel` (com/sem opt-out), `PushTokenModel` (guest + vinculado), `CompanyModel`; casos: broadcast filtra opt-out e mantém guest; users ignora opt-out e sem token; plan com owner nulo não quebra; favorites de empresa sem favoritadores → vazio; dedup de token repetido em dois usuários.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementar `resolverSegmento` (o arquivo nasce com esse escopo só).
- [ ] **Step 4:** PASS.
- [ ] **Step 5:** Commit: `feat(backend): resolucao de segmento de campanha com opt-out`

---

### Task 7: Backend — envio da campanha (claim-first, lotes, stats, receipts)

**Files:**
- Modify: `backend/src/services/push-campaign.service.ts` (acrescentar `enviarCampanha`, `reivindicarEnvio`, `agendarCampanhasPendentes`)
- Test: `backend/src/services/push-campaign.service.test.ts` (acrescentar describes)

**Interfaces:**
- Consumes: `resolverSegmento` (Task 6), `sendPushToTokens` (Task 4), `PushCampaignModel` (Task 3).
- Produces:

```ts
/** Claim-first (spec §3.2.2): só campanha em draft/scheduled entra em sending. */
export async function reivindicarEnvio(id: string): Promise<boolean>;

/** Fluxo completo do envio (spec §3.2). resolving tardio de segmento e opt-out. */
export async function enviarCampanha(id: string): Promise<void>;

/** Seleciona campanhas agendadas vencidas e envia (usada pelo cron, Task 9). */
export async function agendarCampanhasPendentes(agora: Date): Promise<void>;

/** Auto-recuperação (spec §6.10): campanhas em `sending` há >30min sem `sentAt`
 * viram `failed` com error 'envio interrompido' (não reenvia). */
export async function recuperarCampanhasTravadas(agora: Date): Promise<void>;
```

  - `enviarCampanha`: reivindica → se falhou, return; `resolverSegmento` → `stats.targeted`; se `tokens.length === 0` → `status: 'sent'` com stats zeradas (§6.14); `sendPushToTokens` → por ticket: ok soma `sent` e acumula `{ id, token }`; erro `DeviceNotRegistered` soma `deadTokens` (deleteOne já rodou na Task 4 — contar só o retorno dela: **ajustar `sendPushToTokens` para retornar também a lista de tokens removidos** `mortos: string[]` — estender a interface da Task 4: `Promise<{ tickets: PushTicket[]; mortos: string[] }>`); outro erro soma `failed`; HTTP inteiro falho soma o lote em `failed`. Ao fim: `findOneAndUpdate({ _id: id }, { $set: { status: 'sent', sentAt: now, receipts, stats, error } })` — `sendingStartedAt` preservado.
  - Falha não capturada → `status: 'failed'` + `error` (message, sem token) + catch no cron.
  - `agendarCampanhasPendentes`: `find({ status: 'scheduled', scheduledFor: { $lte: agora } })` e `enviarCampanha` para cada (sequencial; falha de uma não para as demais).
  - `recuperarCampanhasTravadas`: `updateMany({ status: 'sending', sendingStartedAt: { $lte: agora - 30min }, sentAt: { $exists: false } }, { $set: { status: 'failed', error: 'envio interrompido' } })` — `sendingStartedAt` é a base (nunca `updatedAt`).

- [ ] **Step 1: Testes falhando** — integração com modelo em memória + `sendPushToTokens` mockado: reivindicação dupla (segunda → false); tokens 0 → sent zerado; tickets ok/erro contam sent/failed/mortos; receipts persistidos; campanha agendada atrasada é enviada 1× pelo `agendarCampanhasPendentes` (cron caído); falha do fetch → failed + error sem token.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementar (inclui o ajuste de retorno da Task 4 — atualizar o teste dela).
- [ ] **Step 4:** PASS + gate backend.
- [ ] **Step 5:** Commit: `feat(backend): envio de campanha com claim-first, lotes e receipts`

---

### Task 8: Backend — receipts (cron de 5 min)

**Files:**
- Create: `backend/src/services/push-receipt.service.ts`
- Test: `backend/src/services/push-receipt.service.test.ts` (novo — fetch mockado + modelos em memória)

**Interfaces:**
- Consumes: `PushCampaignModel.receipts` (Tasks 3/7).
- Produces:

```ts
/** Consulta getReceipts das campanhas com receipts pendentes (spec §3.2.6).
 * Idempotente: receipt consumido sai da lista; DeviceNotRegistered remove o
 * token (conta em deadTokens só se deleteOne removeu); >24h descarta com warn. */
export async function processarReceiptsPendentes(agora: Date): Promise<void>;
```

  - Query de campanhas: `find({ receipts: { $exists: true, $ne: [] } })` — QUALQUER status (§3.2.6); POST `https://exp.host/--/api/v2/push/getReceipts` com `ids` (lotes de 100).
  - Receipt `{ status: 'ok' }` → par sai da lista. `{ status: 'error', details.error === 'DeviceNotRegistered' }` → remove token + `stats.deadTokens += 1` (se deleteOne matched) + par sai. Outro erro → warn, par sai (não repassa eternamente).
  - Par com mais de 24h (`sentAt` do documento como referência) → sai com warn.
  - Persistência: `findOneAndUpdate` por campanha com o array restante e stats.

- [ ] **Step 1: Testes falhando** — campanha com receipts: ok consome; DeviceNotRegistered remove token e soma deadTokens 1× (segunda execução: lista vazia, sem nova contagem); erro genérico consome com warn; par velho (>24h) descartado; campanha sem receipts não é tocada.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** PASS.
- [ ] **Step 5:** Commit: `feat(backend): cron de receipts da Expo com limpeza de tokens mortos`

---

### Task 9: Backend — controller, rotas e crons em `index.ts`

**Files:**
- Create: `backend/src/controllers/push-campaign.controller.ts`
- Modify: `backend/src/routes/index.ts` (FORA do bloco `if (authDeps)`), `backend/src/index.ts`, `backend/.env.example`
- Test: `backend/src/routes/push-campaigns.test.ts` (novo — padrão `companies.plan-lifecycle.test.ts`: Clerk fake + modelos em memória)

**Interfaces:**
- Consumes: `assertAdminEstrito` (Task 2), `createCampaignSchema` (Task 3), `limitarCampanha` (Task 5), `enviarCampanha`/`agendarCampanhasPendentes` (Task 7), `processarReceiptsPendentes` (Task 8).
- Produces (rotas, todas com `assertAdminEstrito` antes do handler):

```ts
routes.post('/notifications/campaigns', limitarCampanha, validateBody(createCampaignSchema), criarCampanha);
routes.post('/notifications/campaigns/:id/send-now', enviarAgora);
routes.post('/notifications/campaigns/:id/cancel', validateBody(updateCampaignStatusSchema), cancelarCampanha);
routes.get('/notifications/campaigns', listarCampanhas);   // ?page&pageSize → Paginated<PushCampaignSummary>
routes.get('/notifications/campaigns/:id', detalharCampanha); // PushCampaign completo (com receipts)
routes.delete('/notifications/campaigns/:id', excluirCampanha);
```

  - `criarCampanha`: `scheduledFor` no passado (com o campo presente) → 422; sem → `status: draft` (com scheduledFor e sem send-now explícito... não — scheduledFor presente = scheduled; ausente = draft). `createdByClerkId = req.auth?.clerkId ?? 'legado'` (legado nunca chega aqui: guard 401). Resposta 201 com o documento.
  - `enviarAgora`: reivindica + dispara `enviarCampanha` e responde APÓS o envio (admin vê o resultado real; campanha ≤ ~500 tokens ⇒ segundos). `status` não draft/scheduled → 409.
  - `cancelarCampanha`: só `scheduled` → draft (409 caso contrário).
  - `excluirCampanha`: só `draft`/`failed` (409 em scheduled/sending/sent — §6.11 revisado).
  - `index.ts` (após `connectDatabase()`): `if (PUSH_CENTER_DISABLED !== 'true' && NODE_ENV !== 'test') { cron.schedule('*/5 * * * *', () => { void agendarCampanhasPendentes(new Date()).catch(...); void processarReceiptsPendentes(new Date()).catch(...); }, { timezone: 'America/Sao_Paulo', name: 'push-center' }); }`
  - `.env.example`: `PUSH_CENTER_DISABLED=false` + `PUSH_CAMPAIGN_MAX_PER_HOUR=10`.

- [ ] **Step 1: Testes falhando** — com Clerk fake (padrão do repo): não-admin → 403; sem sessão → 401; admin cria draft/scheduled; `scheduledFor` passado → 422; `send-now` envia e devolve documento atualizado; segunda chamada de send-now → 409; cancel só scheduled; delete só draft/failed (sent → 409); listagem paginada sem receipts; detail com receipts; modo legado (sem CLERK_SECRET_KEY, env não stubado — arquivo separado com `describe` próprio) → 401.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementar controller + rotas + crons + env.
- [ ] **Step 4:** PASS + gate backend completo (`npm run typecheck && npm run lint && npm test`).
- [ ] **Step 5:** Commit: `feat(backend): rotas e crons do Push Center`

---

### Task 10: Backend — `?search=` no `GET /users`

**Files:**
- Modify: `backend/src/services/user.service.ts` (`listUsers`), `backend/src/controllers/user.controller.ts`
- Test: `backend/src/routes/users.test.ts` (acrescentar `it`s)

**Interfaces:**
- Produces: `listUsers(pagination, actorClerkId?, search?: string)` — `search` case-insensitive por `firstName`/`lastName`/`email` com regex escapado (`\w` seguro: escapar regex chars), aplicado ANTES de skip/limit; controller lê `req.query.search`.

- [ ] **Step 1: Testes falhando** — `?search=don` filtra por nome e email (case-insensitive), paginação respeita o total filtrado, sem search → igual a hoje.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementar (regex escapada; sem `any`).
- [ ] **Step 4:** PASS.
- [ ] **Step 5:** Commit: `feat(backend): busca por nome/email na listagem de usuarios (?search=)`

---

### Task 11: Admin — API client, tipos e seção "Notificações"

**Files:**
- Modify: `admin/src/services/api.ts`, `admin/src/components/sections/notificacoes.tsx` (novo), `admin/src/App.tsx` (seção no menu), `admin/src/components/sections/categorias.tsx` (referência de padrão, sem mudança)
- Test: `admin/src/utils/deep-link.test.ts` (novo — paridade com backend)

**Interfaces:**
- Consumes: tipos `PushCampaign*` da cópia admin (Task 1); endpoints da Task 9; `admin/src/components/ui/*` do redesign.
- Produces:

```ts
export async function getPushCampaigns(page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<Paginated<PushCampaignSummary>>;
export async function getPushCampaign(id: string): Promise<PushCampaign>;
export interface CreatePushCampaignInput { title: string; body: string; imageUrl?: string; deepLink?: string; segment: PushCampaignSegment; scheduledFor?: string }
export async function createPushCampaign(input: CreatePushCampaignInput): Promise<PushCampaign>;
export async function sendPushCampaignNow(id: string): Promise<PushCampaign>;
export async function cancelPushCampaign(id: string): Promise<PushCampaign>;
export async function deletePushCampaign(id: string): Promise<void>;
```

  - Seção `notificacoes.tsx` (padrão página dedicada por estado do redesign — `view: 'list' | 'form' | 'detail'`):
    - **List:** busca client-side por título, tabela com `mobileRows` (título + status + enviados/alvo + quem enviou), chips de status (draft/scheduled/sending/sent/failed), ações por status (enviar agora/cancelar/excluir/ver).
    - **Form:** título, corpo, imageUrl, deep link (select `DEEP_LINK_ROTAS` — constante local espelho do backend, teste de paridade em `admin/src/utils/deep-link.test.ts` comparando os arrays LITERALmente), segmento com seletor dependente (broadcast sem campo; user/users com busca `getUsers(page, pageSize, search)` → usar os ids; city com `getCities`; plan com select basic/premium; favorites com busca de empresas), datetime-local para agendar (convertido: `new Date(\`${valor}:00-03:00\`).toISOString()` — offset fixo SP), validação cliente fim > início (não se aplica) — apenas futura.
    - **Detail:** stats (targeted/sent/failed/deadTokens), error, receipts (contagem), quem enviou.
  - `App.tsx`: adicionar a seção ao menu (ícone "Notificações"), rota `notificacoes`.

- [ ] **Step 1: API client** + teste de paridade da whitelist (RED: arrays diferentes → FAIL; escrever constantes idênticas → PASS).
- [ ] **Step 2:** Seção notificacoes.tsx (compositor + list + detail) usando `useResource` para a listagem.
- [ ] **Step 3:** `App.tsx` no menu.
- [ ] **Step 4:** Gate admin (`npm run typecheck && npm run lint && npm run build`) + `npx vitest run` (testes atuais não podem quebrar).
- [ ] **Step 5:** Commit: `feat(admin): secao Notificacoes (compositor, historico e detalhe de campanhas)`

---

### Task 12: Mobile — deep link util + notifications provider

**Files:**
- Create: `mobile/src/utils/deep-link.ts`, `mobile/src/utils/deep-link.test.ts`, `mobile/src/providers/notifications-provider.tsx`
- Modify: `mobile/src/app/_layout.tsx` (montar `<NotificationsProvider>` dentro do `<Stack>`)
- Test: `mobile/src/utils/deep-link.test.ts`, `mobile/src/providers/notifications-provider.test.ts` (se puro — a navegação é glue; o handler é cobertura de export)

**Interfaces:**
- Consumes: `expo-notifications` (já dependência — token registrado em `auth-provider.tsx`), `expo-router` (`usePathname`/`router`).
- Produces:

```ts
/** Cópia consciente da whitelist do backend (padrão domain.ts) — paridade
 * garantida por teste em AMBOS os lados comparando os literais. */
export function ehDeepLinkValido(url: string): boolean;
```

  - `notifications-provider.tsx`:
    1. `Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }) })` no escopo do módulo (1×).
    2. `useLastNotificationResponse` + `addNotificationResponseReceivedListener`: extrair `response.notification.request.content.data.url` → `ehDeepLinkValido(url)` → `router.push(url)`; antes de navegar, conferir que o provider montou dentro do `<Stack>` (o provider é filho direto do `<Stack>` em `_layout.tsx`); fora da whitelist → warn e nada.
    3. Cold start: 1× no mount, `await Notifications.getLastNotificationResponseAsync()` e mesmo fluxo.

- [ ] **Step 1: Teste falhando** — `deep-link.test.ts`: `/` ok, `/company/abc123` ok, `/company/abc123/deep` rejeita, `/coupon/x` rejeita, `https://x.com` rejeita, `//company/x` rejeita.
- [ ] **Step 2:** FAIL → **Step 3:** implementar util → PASS.
- [ ] **Step 4:** Implementar provider + montar em `_layout.tsx` (glue; sem teste de navegação).
- [ ] **Step 5:** Gate mobile (`npm run typecheck`, `npx expo lint`, `npm test`, `npx expo export --platform web`).
- [ ] **Step 6:** Commit: `feat(mobile): deep link por push (whitelist + provider de notificacoes)`

---

### Task 13: Verificação final

- [ ] **Step 1: Gate completo nos três apps** (AGENTS §12.1 — todo o fluxo do CI):
  `backend: npm run typecheck && npm run lint && npm test` · `admin: npm run typecheck && npm run lint && npm run build` · `mobile: npx expo lint && npm run typecheck` + gate de tipografia (grep de tokens cru).
- [ ] **Step 2: Smoke manual** (exige admin + API + Mongo): criar campanha agendada no futuro → aparece no histórico como scheduled; enviar broadcast de teste → push chega no device com app aberto (foreground) e com app fechado (tap navega para o deep link); token inválido de teste → deadTokens 1 no detail; segunda execução do cron → sem duplicação (claim).
- [ ] **Step 3:** Sincronizar checkboxes deste plano + commit de fechamento (se houver ajustes).

---

## Notas

- O broadcast legado (`POST /notifications/broadcast`, `NOTIFY_SECRET`, dev-bypass) permanece INTACTO — Task 9 não toca nele.
- `PlanNotification`, ciclo de planos e `notifyPromotion` não são migrados (radar da spec de ciclo de vida §9.3).
- Métricas de abertura de push: fora de escopo (Expo não fornece).
- Push rica (imagem grande, ações): o campo `image` já vai no payload; exibição rica depende do device e fica observada para fase 2.
