# Segurança da API pública — Design

**Status:** aprovado (grupo 2 da ordem aprovada) — respostas do usuário
aplicadas: (1) auditoria só log; (2) Redis com senha em dev e prod;
(3) ownership apenas Company + PushCampaign; (4) rate limit por clerkId só em
mutações.
**Escopo:** rate limiting compartilhado (Redis via Docker), autorização por
recurso/ownership, auditoria mínima. Não inclui gateway de pagamento nem
analytics/prefeitura (grupos 3–5).

## 1. Intent e por quê

A API hoje é lançável com lacunas conhecidas (AGENTS.md §5/§9): rate limit
global por IP apenas, sem autorização por recurso (BOLA), sem auditoria. Antes
de expor a API publicamente é preciso fechar OWASP API1 (BOLA), API3
(exposição excessiva), API4 (rate limiting ausente) e API8 (injeção). Este
grupo entrega isso sem mudar o contrato HTTP existente (mesmos endpoints,
mesmos status codes), adicionando apenas camadas de proteção.

## 2. Goals / non-goals / anti-goals

**Goals**
- Rate limit por recurso sensível e por identidade (IP + clerkId quando
  autenticado em mutações), compartilhado entre instâncias via Redis.
- Autorização por ownership: um usuário só altera/exclui recursos que possui
  (ou é admin).
- Auditoria mínima: log estruturado de alterações de plano/status de empresa.
- Infra: `backend/docker-compose.yml` (Redis) + `backend/Dockerfile`, orquestrando
  Redis para dev e prod.
- Fallback gracioso: sem `REDIS_URL`, mantém in-memory (testes e dev local
  sem Docker continuam funcionando).

**Non-goals**
- Gateway de pagamento, cupons, MRR (grupos 3/4).
- RBAC territorial/prefeitura (grupo 5) — apenas admin vs. user vs. guest aqui.
- WAF/CDN, TLS termination (infra de deploy, fora do repo).
- Migração de todos os in-memory para Redis de uma vez — apenas os 3
  middlewares de rate limit (global, analytics, campanhas) + novos.
- Ownership em Event/Job/TouristSpot/AutonomousProfessional (adiado).

**Anti-goals**
- Quebrar os testes existentes (devem continuar passando com fallback).
- Introduzir Redis como dependência obrigatória do boot (Redis down não pode
  derrubar a API — degradar para in-memory com warn).

## 3. Abordagem (A — incremental)

- `docker-compose.yml` em `backend/`: serviço `redis` (imagem oficial, volume
  nomeado, healthcheck, restart `unless-stopped`) + serviço `backend`
  (build `backend/Dockerfile`). Mongo permanece externo (`MONGODB_URI`).
- Cliente Redis: `ioredis`. Env `REDIS_URL` (default no compose
  `redis://:${REDIS_PASSWORD}@redis:6379`, fora
  `redis://:${REDIS_PASSWORD}@localhost:6379`). `REDIS_PASSWORD` obrigatório em
  dev e prod (ACL).
- **Fallback gracioso**: se `REDIS_URL` ausente ou conexão falhar, os
  middlewares usam `Map` in-memory (comportamento atual) e logam warn.
  Redis é "best-effort": operação de rate limit nunca derruba a requisição.
- Migração dos 3 limiters:
  - Global (`rate-limit.middleware.ts`): usar `rate-limit-redis` store.
  - Analytics (`analytics-rate-limit.middleware.ts`): `INCR` + `EXPIRE` atômico
    por chave, com TTL da janela.
  - Campanhas (`campaign-rate-limit.middleware.ts`): idem.
  - Manter `limpar*()` para testes (no-op quando Redis ativo, ou `flushdb`
    em DB de teste dedicado).

## 4. Autorização por recurso (BOLA)

**Regra:** todo endpoint que muta recurso por id verifica ownership:

| Recurso | Owner field | Quem pode |
|---|---|---|
| `Company` | `ownerClerkId` | owner OU admin |
| `Company.plan` | — | admin only (já é) |
| `PushCampaign` | `createdByClerkId` | criador OU admin; em modo legado (sem Clerk) apenas admin (fail-closed via `assertAdminEstrito`) |

`Event`/`Job`/`TouristSpot`/`AutonomousProfessional` ficam admin-only (como
hoje, via `assertAdmin`); ownership para eles é adiado para grupo 5.

Implementação: helper `assertOwnerOrAdmin(recurso, clerkId)` em
`authorization.service.ts` (já existente — reusa `ehAdmin` de
`user.service.ts`), chamado no controller antes da mutação. Leitura pública
(GET por id) permanece aberta, mas com `select` para não vazar campos
sensíveis.

**Track endpoints** (`trackView` etc.): verificar `companyExists` (já feito)
e aplicar rate limit por (IP, companyId) — já existe.

## 5. Auditoria mínima

- Log estruturado (JSON) em `stdout` via helper `auditLog({ actor, action,
  resource, resourceId, before?, after? })` em `backend/src/utils/audit.ts`.
  **Sem persistência em Mongo nesta fase** (decisão do usuário).
- Ações auditadas: `company.plan.update`, `company.delete`,
  `campaign.create/send/cancel/delete`.
- Sem PII além do clerkId; sem segredos.

## 6. Infra (Docker)

- `backend/Dockerfile`: multi-stage (build TS → node:alpine runtime), `npm ci`,
  `CMD node dist/index.js`. Não copia `.env`.
- `backend/docker-compose.yml`: `redis` + `backend`. Volumes: redis data.
  Healthchecks: redis `redis-cli ping` (com `-a $REDIS_PASSWORD`), backend
  `/api/health`.
- `.dockerignore` em backend.
- `X-Content-Type-Options: nosniff` globalmente via `helmet({ noSniff: true })`
  (helmet já inclui por default; tornar explícito e testável).
- `REDIS_URL` e `REDIS_PASSWORD` adicionados a `.env.example`.

## 7. Endpoints novos/alterados

- `GET /api/health` (já existe) — estender corpo para
  `{ status, timestamp, redis }` (aditivo, para não quebrar
  `backend/src/app.test.ts`, que assera `timestamp`). Usado pelo healthcheck
  do compose.
- Sem mudança de contrato nos endpoints existentes.

## 8. Testes

- Unitários puros: `incrComTtl` (Redis mock via `ioredis-mock` ou fallback
  in-memory testável).
- Integração: rate limit retorna 429 após N requisições (com Redis de teste
  ou fallback).
- Autorização: teste cross-user (usuário A não edita empresa de B → 403).
- Auditoria: spy no logger.

## 9. Riscos e mitigações

- Redis down: fallback in-memory + warn; API não cai. Mitigação: healthcheck
  + restart policy.
- Testes em CI sem Redis: fallback in-memory (env não setado) → testes
  passam como hoje.
- `ioredis` adiciona dependência — `npm audit` antes de adicionar (AGENTS §9).
- Rate limit por clerkId exige `optionalAuth` nas rotas de mutação para
  extrair identidade sem bloquear guest. Rotas públicas (GET) usam apenas IP
  (decisão do usuário: rate limit por clerkId só em mutações).
- O global limiter hoje roda antes do auth (`app.ts`) — mover `optionalAuth`
  para antes do rate limit quando Clerk configurado (decisão do builder-check).

## 10. Decisões fechadas (respostas do usuário)

1. Auditoria: apenas log estruturado em stdout (sem persistência em Mongo).
2. Redis com senha (ACL) em dev e prod (`REDIS_PASSWORD` obrigatório).
3. Ownership: apenas `Company` + `PushCampaign` nesta fase; Event/Job/
   TouristSpot/AutonomousProfessional permanecem admin-only.
4. Rate limit por clerkId: apenas em mutações; leituras públicas (GET) usam
   apenas IP.

---

**Próximo passo:** aprovação → invocar `writing-plans` (e depois revisão
com Beam Free, como no Push Center).