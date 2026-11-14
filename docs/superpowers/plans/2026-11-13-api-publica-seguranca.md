# Segurança da API pública — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar lacunas OWASP (rate limit compartilhado via Redis em Docker, autorização por ownership em Company + PushCampaign, auditoria mínima em log) sem mudar o contrato HTTP existente.

**Architecture:** Infra Redis via docker-compose (abordagem A — incremental: Redis only, Mongo externo) com fallback gracioso in-memory; cliente `ioredis` em `config/redis.ts` com `getRedis()` null-safe. Três middlewares migrados para Redis (global via `rate-limit-redis`, analytics/campanhas via `INCR`+`EXPIRE` atômico com EXPIRE condicional). Autorização reusa `assertOwnerOrAdmin` já existente em `authorization.service.ts` (permissivo em modo legado) para Company; PushCampaign cancel/delete usam `assertAdminEstrito` em modo legado (fail-closed) e ownership apenas quando Clerk configurado. Auditoria via `utils/audit.ts` (stdout JSON) chamada pelos controllers (que têm o ator). Health endpoint estendido e exempt do limiter.

**Tech Stack:** Express 5 + Mongoose 9 + zod 4 (backend); ioredis + rate-limit-redis; Docker + docker-compose; vitest + supertest.

**Spec:** `docs/superpowers/specs/2026-11-13-api-publica-seguranca-design.md` (o plano argumenta a partir da spec; ler os dois).

## Global Constraints

- TDD: teste falhando antes de código de produção; teste de comportamento.
- TypeScript estrito, sem `any`; `import type` para tipos.
- Redis é **best-effort**: se `REDIS_URL` ausente ou conexão falhar, degradar para in-memory com `console.warn`; operação de rate limit nunca derruba a requisição nem propaga erro ao Express.
- `REDIS_PASSWORD` obrigatório em dev e prod (ACL); validação em `boot-check.ts` quando `REDIS_URL` definido.
- Mongo permanece externo (`MONGODB_URI`).
- `npm audit` antes de adicionar `ioredis`/`rate-limit-redis` (AGENTS §9).
- `limpar*()` permanecem **síncronos** para testes (limpeza Redis best-effort/fire-and-forget em background; em testes `REDIS_URL` não é setado → path in-memory, sem poluição).
- Auditoria: apenas log estruturado em stdout (sem persistência Mongo nesta fase); payload mínimo (nunca documento inteiro, nunca segredo); redação recursiva (arrays incluídos, primitivos preservados, chaves comparadas case-insensitive por igualdade exata).
- Ownership apenas `Company` + `PushCampaign` nesta fase; Event/Job/TouristSpot/AutonomousProfessional permanecem admin-only.
- Rate limit por clerkId apenas em mutações (métodos não-GET); leituras públicas (GET) usam apenas IP.
- Gate antes de commit: backend `npm run typecheck && npm run lint && npm test`.

## Review Focus

- **Redis down**: fallback in-memory, API não cai; health retorna 200 com `redis: 'down'`.
- **Chave clerkId em mutações**: `optionalAuth` antes do limiter quando Clerk configurado; guests em GET compartilham bucket por IP (decisão).
- **Token inválido bypassa limiter** (risco aceito, documentado — mitigação futura: limiter antes de auth).
- **Ownership cross-user**: usuário A editando empresa de B → 403; admin → 200.
- **Auditoria sem PII/segredo**: log apenas clerkId + action + ids; nunca body completo nem ownerClerkId/contato (redação recursiva).
- **Health não 429**: exempt do limiter (path `/api/health` via `req.originalUrl` pathname).
- **PushCampaign ownership**: criador OU admin pode cancelar/excluir a própria campanha, mas em modo legado (sem Clerk) apenas admin (fail-closed). `createdByClerkId` pode ser undefined em campanhas legadas → nesse caso apenas admin.

---

### Task 1: Infra Docker (Dockerfile + compose + .dockerignore + .env.example)

**Files:**
- Create: `backend/Dockerfile`, `.dockerignore` (raiz), `docker-compose.yml` (raiz), `backend/.env.example`, `backend/docker-entrypoint.sh`

**Interfaces:**
- Produces: serviço `redis` (imagem `redis:7-alpine`, `env_file: backend/.env`, `command: ["sh","-c","redis-server --requirepass \"$$REDIS_PASSWORD\""]`, volume `redis_data`, healthcheck `CMD-SHELL: redis-cli -a $$REDIS_PASSWORD ping`, restart `unless-stopped`) e serviço `backend` (build `context: .`, `dockerfile: backend/Dockerfile`, `env_file: backend/.env`, `environment: REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379`, depends_on redis `condition: service_healthy`, port 4000). Ambos os serviços leem `backend/.env` (única fonte); o override `REDIS_URL` no backend aponta para o host `redis` (não `localhost`). Nota: o override `REDIS_URL` via `environment` é interpolado em parse-time pelo Compose a partir de `backend/.env` (env_file é aplicado em runtime, não em parse-time). O entrypoint (Task 1) é o construtor autoritativo: se `REDIS_URL` estiver vazio ou com senha vazia/malformada, monta `redis://:${REDIS_PASSWORD}@redis:6379` a partir do runtime. Documentar `REDIS_URL` no `.env.example` como "local-dev only".
- Produces: `REDIS_URL`, `REDIS_PASSWORD` em `.env.example` + todas as vars existentes: `MONGODB_URI`, `PORT`, `CORS_ORIGINS`, `NODE_ENV`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `ADMIN_EMAILS`, `NOTIFY_SECRET`, `EMAIL_API_URL`, `EMAIL_API_SECRET`, `APP_PUBLIC_URL`, `EMAIL_TRANSPORT`, `TRUST_PROXY`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `WEBHOOK_RATE_LIMIT_WINDOW_MS`, `WEBHOOK_RATE_LIMIT_MAX`, `ANALYTICS_VIEW_MAX_PER_HOUR`, `ANALYTICS_CLICK_MAX_PER_HOUR`, `ANALYTICS_FAVORITE_MAX_PER_HOUR`, `PUSH_CAMPAIGN_MAX_PER_HOUR`, `PLAN_LIFECYCLE_DISABLED`, `PUSH_CENTER_DISABLED`, `SMTP_*`.

- [ ] **Step 1:** Criar `backend/Dockerfile`: stage build `FROM node:20 AS build`, `WORKDIR /app`, `COPY backend ./backend`, `COPY shared ./shared`, `WORKDIR /app/backend`, `RUN npm ci && npm run build`; stage runtime `FROM node:20-alpine`, `WORKDIR /app/backend`, `COPY --from=build /app/backend/dist ./dist`, `COPY --from=build /app/backend/node_modules ./node_modules`, `COPY backend/docker-entrypoint.sh /usr/local/bin/entrypoint.sh`, `RUN chmod +x /usr/local/bin/entrypoint.sh`, `ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]`, `CMD ["node","dist/backend/src/index.js"]`, `HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:4000/api/health || exit 1`. Entrypoint: se `REDIS_URL` vazio **ou** seu segmento de senha estiver vazio/malformado, monta `redis://:${REDIS_PASSWORD}@redis:6379`; `exec "$@"`. Stage runtime: após copiar `node_modules`, rodar `npm prune --omit=dev` (requer `package.json` copiado no stage) ou usar `npm ci --omit=dev` em stage separado, para remover devDependencies da imagem final. Stage runtime: após copiar `node_modules`, rodar `npm prune --omit=dev` (ou usar `npm ci --omit=dev` em stage separado) para remover devDependencies da imagem final.
- [ ] **Step 2:** Criar `.dockerignore` na **raiz** (`node_modules`, `dist`, `.env`, `*.log`, `.git`, `mobile/`, `admin/`) — context é a raiz. (Manter também `backend/.dockerignore` para runs locais.)
- [ ] **Step 3:** Criar `docker-compose.yml` na raiz com `redis` + `backend`, rede `guia`, volume `redis_data`, healthchecks (`CMD-SHELL` no redis), `depends_on: condition: service_healthy`, `env_file: backend/.env` em ambos, override `REDIS_URL` via `environment` no backend.
- [ ] **Step 4:** Criar `backend/.env.example` enumerando todas as vars (ver Interfaces).
- [ ] **Step 5:** Verificar `docker compose config` (se docker disponível) — sintaxe válida.
- [ ] **Step 6:** Commit: `chore(infra): adiciona Dockerfile, compose e env para Redis`

### Task 2: Cliente Redis null-safe

**Files:**
- Create: `backend/src/config/redis.ts`, `backend/src/config/redis.test.ts`
- Modify: `backend/src/config/boot-check.ts`

**Interfaces:**
- Produces: `getRedis(): Redis | null` (singleton, `lazyConnect: true`, `maxRetriesPerRequest: 1`, `enableOfflineQueue: false`, `commandTimeout: 1000`, `retryStrategy` com backoff limitado e teto de 3 tentativas; após falha, singleton fica null por 30s (cooldown) antes de tentar de novo); `isRedisAvailable(): boolean`; `fecharRedis(): Promise<void>` (testes, fecha singleton e reseta, limpando cooldown).
- Produces: `assertValidRedisConfiguration(env)` em `boot-check.ts` que lança se `REDIS_URL` definido e `REDIS_PASSWORD` ausente/vazio; chamada em `app.ts` junto de `assertValidClerkConfiguration`. Estender a interface `BootEnvironment` (em `boot-check.ts`) com `REDIS_URL?: string` e `REDIS_PASSWORD?: string`, e validar a chamada em `app.ts` (não em `index.ts`).

- [ ] **Step 1: Teste falhando** — sem `REDIS_URL`: `getRedis()` retorna null; com URL inválida: retorna null após falha de ping (warn logado); com URL válida (mock): retorna instância; `fecharRedis` fecha o singleton e permite recriar; `assertValidRedisConfiguration` lança quando `REDIS_URL` setado e `REDIS_PASSWORD` vazio.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Instalar `ioredis` (`npm i ioredis` em backend, rodar `npm audit`). Implementar `redis.ts` + validação em `boot-check.ts` (estender interface `BootEnvironment` com `REDIS_URL?: string` e `REDIS_PASSWORD?: string`; adicionar `assertValidRedisConfiguration(env)`) + chamada em `app.ts` junto de `assertValidClerkConfiguration`.
- [ ] **Step 4:** PASS + typecheck + lint.
- [ ] **Step 5:** Commit: `feat(backend): cliente Redis null-safe com fallback gracioso`

### Task 3: Migrar rate limit global para Redis

**Files:**
- Modify: `backend/src/middlewares/rate-limit.middleware.ts`, `backend/src/app.ts`, `backend/src/routes/index.ts`

**Interfaces:**
- Consumes: `getRedis()` (Task 2).
- Produces: `createRateLimitMiddleware()` e `createWebhookRateLimitMiddleware()` usam `rate-limit-redis` store quando Redis disponível; fallback in-memory. `keyGenerator` combina `req.auth?.clerkId` (mutações, `req.method !== 'GET'`) ou IP (GET). Health route exempt via `skip: (req) => new URL(req.originalUrl, 'http://localhost').pathname === '/api/health'`.

- [ ] **Step 1: Teste falhando** — com Redis mock/store, 1001ª requisição → 429; sem Redis, comportamento atual preservado; `GET /api/health` nunca 429 mesmo após 2000 requisições.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Instalar `rate-limit-redis` (`npm i rate-limit-redis`, `npm audit`). Implementar store condicional + keyGenerator + skip.
- [ ] **Step 4:** Mover `optionalAuth` (quando Clerk configurado) para antes do rate limit em `app.ts`. Wiring exato: (a) refatorar `routes/index.ts` para exportar factory `createRoutes(authDeps)` (hoje default-exporta um `Router` e chama `createAuthDeps()` internamente) — mover `createAuthDeps()` para `app.ts` e injetar via factory; (b) `if (authDeps) app.use('/api', makeAuthMiddleware(authDeps).optionalAuth)` antes de `app.use('/api', createRateLimitMiddleware(), routes)`; (c) remover de `routes/index.ts` a montagem de `optionalAuth`/`makeAuthMiddleware` (manter `guestScrub` e a rota `/auth/guest`). Atenção: `makeAuthMiddleware(authDeps)` ainda é necessário internamente em `routes/index.ts` para `/me`, `/push-tokens`, `/notifications/broadcast`. Documentar em comentário a troca: token inválido chama Clerk antes do limiter (risco aceito de brute-force; mitigação futura).
- [ ] **Step 4b:** Configurar `helmet({ noSniff: true })` em `app.ts` (em vez de `helmet()`) e adicionar teste em `app.test.ts` asserindo header `X-Content-Type-Options: nosniff` em todas as respostas.
- [ ] **Step 5:** PASS + gate backend.
- [ ] **Step 6:** Commit: `feat(backend): rate limit global com store Redis (fallback in-memory)`

### Task 4: Migrar analytics rate limit para Redis

**Files:**
- Modify: `backend/src/middlewares/analytics-rate-limit.middleware.ts`
- Create: `backend/src/config/rate-limit-redis.ts` (helper compartilhado `incrComTtl`)

**Interfaces:**
- Consumes: `getRedis()`.
- Produces: `incrComTtl(prefixo: 'analytics' | 'campaign', chaveBase: string, janelaMs: number): Promise<number>` em `config/rate-limit-redis.ts` (Redis: `INCR rl:${prefixo}:${chaveBase}` + `EXPIRE` condicional quando resultado === 1; fallback in-memory com Map keyed por `${prefixo}:${chaveBase}`, armazenando `{ contagem, inicio }` e podando expirados). `chaveBase` para analytics já inclui o tipo de evento (`view`/`click`/`favorite`) e o par `ip:companyId`. Requisição rejeitada incrementa o contador (semântica INCR-always). `limparRateLimitAnalytics()` permanece síncrono: limpa Map E, se Redis ativo, dispara `DEL` de todas as chaves com prefixo `rl:analytics:*` via SCAN em background (fire-and-forget; no-op em prod quando `NODE_ENV !== 'test'`).

- [ ] **Step 1: Teste falhando** — 2ª view do mesmo IP+empresa na mesma hora → 429; com Redis mock, contagem compartilhada; requisição rejeitada incrementa o contador; `incrComTtl` retorna o novo valor.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementar helper compartilhado + conversão do middleware para async com `try/catch` (nunca propagar erro; em falha, fallback in-memory). Remover `TODO(redis)`.
- [ ] **Step 4:** PASS + gate backend.
- [ ] **Step 5:** Commit: `feat(backend): analytics rate limit com Redis (INCR+EXPIRE)`

### Task 5: Migrar campaign rate limit para Redis

**Files:**
- Modify: `backend/src/middlewares/campaign-rate-limit.middleware.ts`

**Interfaces:**
- Consumes: `getRedis()`, `incrComTtl`.
- Produces: mesmo contrato (`limitarCampanha`, `limparRateLimitCampanhas`), com limpeza Redis equivalente (prefixo `rl:campaign:*`, no-op em prod, flush em teste).

- [ ] **Step 1: Teste falhando** — 11ª campanha do mesmo admin → 429; compartilhado entre instâncias (mock).
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementar; remover `TODO(redis)`.
- [ ] **Step 4:** PASS + gate backend.
- [ ] **Step 5:** Commit: `feat(backend): campaign rate limit com Redis`

### Task 6: Autorização por ownership em Company (+ PushCampaign cancel/delete)

**Files:**
- Modify: `backend/src/controllers/company.controller.ts`, `backend/src/services/company.service.ts`, `backend/src/controllers/push-campaign.controller.ts`

**Interfaces:**
- Consumes: `assertOwnerOrAdmin({ resourceId, clerkId, findResource })` de `authorization.service.ts`.
- Produces: `updateCompany`/`deleteCompany` já chamam `assertOwner` (existente, local não exportado — exportar ou testar via controller) — adicionar teste cross-user 403 + `getCompanyById(companyId, incluirOwner = false)` com select condicional (`incluirOwner ? q : q.select({ ownerClerkId: 0 })`, pois `Query.select(undefined)` pode não ser no-op no Mongoose 9); atualizar os callers reais (`getById` público e `getAnalytics`) — `updateCompany`/`deleteCompany`/`updatePlan` NÃO chamam `getCompanyById` hoje, então não precisam de alteração (se auditoria exigir snapshot, o controller busca o documento antes). PushCampaign `cancelarCampanha`/`excluirCampanha`: se `!process.env.CLERK_SECRET_KEY` → `assertAdminEstrito` (fail-closed); caso contrário → permite se `createdByClerkId === clerkId` OU admin. Nota: `createdByClerkId` é `required: true` no modelo e `string` no domínio (não opcional) — o ramo "undefined → apenas admin" é defensivo e só se aplica a documentos legados/seed; preservar validações de status (cancel só `scheduled`, delete só `draft`/`failed`).

- [ ] **Step 1: Teste falhando** — usuário A tentando editar/excluir empresa de B → 403; admin → 200; owner → 200; GET público não retorna `ownerClerkId`; `getAnalytics` continua funcionando; criador de campanha cancela/exclui a própria → 200; não-criador não-admin → 403; em modo legado (sem Clerk) cancel/delete → 401.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** PASS + gate backend.
- [ ] **Step 5:** Commit: `feat(backend): autorizacao por ownership em Company e PushCampaign`

### Task 7: Auditoria mínima (log)

**Files:**
- Create: `backend/src/utils/audit.ts`, `backend/src/utils/audit.test.ts`
- Modify: `backend/src/controllers/company.controller.ts`, `backend/src/controllers/push-campaign.controller.ts`

**Interfaces:**
- Produces: `auditLog({ actor: string, action: string, resource: string, resourceId: string, before?: Record<string, unknown>, after?: Record<string, unknown> }): void` — uma linha JSON em `process.stdout` (não `console.log`). `redigir(obj)` retorna **novo objeto** (sem mutar entrada), recursivo (incluindo arrays), preservando primitivos, `null`/`undefined` e objetos não-planos (`Date`, `ObjectId` etc., retornados como estão), e removendo chaves cujo nome, após `toLowerCase()`, pertence ao conjunto `{ ownerclerkid, email, phone, token, password, secret }` (igualdade exata, não substring; recursão elemento-a-elemento em arrays). Se `obj` não for objeto (primitivo/null), retorna como está.
- Produces: captura de estado anterior no **controller**, antes da mutação/exclusão:
  - `company.plan.update`: `before` = `{ plan, planStartedAt, planExpiresAt }` do documento carregado; `after` = mesmos campos pós-update.
  - `company.delete`: `before` = `{ _id, name, plan }`; `after` = undefined.
  - `campaign.create`: `before` = undefined; `after` = `{ _id, title, status, segment }`.
  - `campaign.send`: `before` = `{ status: 'scheduled' }` (ou status atual); `after` = `{ status: 'sent', targeted, sent }`.
  - `campaign.cancel`: `before` = `{ status: 'scheduled' }`; `after` = `{ status: 'draft' }`.
  - `campaign.delete`: `before` = `{ _id, title, status }`; `after` = undefined.

- [ ] **Step 1: Teste falhando** — `auditLog` emite JSON com os campos via `process.stdout.write(JSON.stringify(payload) + '\n')` (spy em `process.stdout.write`); `redigir` remove campos sensíveis recursivamente (incluindo arrays) sem mutar entrada; `updateCompanyPlan` audita com `before`/`after` contendo apenas `plan`, `planStartedAt`, `planExpiresAt`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementar helper + chamadas nos controllers (que têm `req.auth?.clerkId ?? 'legado'`). O **controller** captura o estado anterior (fetch do documento) **antes** da mutação/exclusão e passa como `before`; o service não precisa retornar snapshot. Para `updateCompanyPlan`, o controller busca o documento atual antes de chamar o service.
- [ ] **Step 4:** PASS + gate backend.
- [ ] **Step 5:** Commit: `feat(backend): auditoria minima via log estruturado`

### Task 8: Health endpoint estendido + exempt do limiter

**Files:**
- Modify: `backend/src/controllers/health.controller.ts`, `backend/src/middlewares/rate-limit.middleware.ts`

**Interfaces:**
- Produces: `GET /api/health` retorna `{ status, timestamp, redis: 'up'|'down' }` (aditivo). Ping do Redis com timeout 1s via `Promise.race` com `setTimeout` limpo no `finally`. Exempt do limiter global via `skip: (req) => new URL(req.originalUrl, 'http://localhost').pathname === '/api/health'`. Resposta 200 mesmo com Redis down.

- [ ] **Step 1: Teste falhando** — resposta inclui `redis`; 200 mesmo com Redis down; não 429 após 2000 requisições ao `/api/health`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementar. `health` vira async (ou envolvido em `asyncHandler`) para o Express 5 encaminhar erros do ping Redis; `Promise.race` com `setTimeout` limpo no `finally`.
- [ ] **Step 4:** PASS + gate backend.
- [ ] **Step 5:** Commit: `feat(backend): health endpoint com status do Redis e exempt do limiter`

### Task 9: Verificação final

- [ ] **Step 1:** Gate completo backend (typecheck + lint + test).
- [ ] **Step 2:** `docker compose config` válido; `docker compose up -d redis` + smoke (backend conecta, rate limit compartilhado).
- [ ] **Step 3:** Revisar diff (sem segredos, sem `console.log` sobrando, sem `any`, `npm audit` limpo).

---

## Review Focus

- Redis down → fallback in-memory, API não cai (testar).
- Chave clerkId em mutações: `optionalAuth` antes do limiter.
- Token inválido bypassa limiter (risco aceito, documentado).
- Ownership cross-user → 403 (teste novo).
- Auditoria sem PII/segredo (redação recursiva).
- Health não 429 (path `/api/health`).
- PushCampaign ownership: criador OU admin, fail-closed em modo legado.