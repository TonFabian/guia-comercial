# Módulo Turismo — Implementation Plan (v2, pós code review)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o Módulo Turismo com pontos turísticos e eventos (multi-cidade, foco em turistas/visitantes), conforme spec v2 (revisada).

**Architecture:** Duas entidades separadas (`TouristSpot` e `TourEvent` — interface; model Mongoose `Event`), cada uma com CRUD completo no backend (model + service + controller + DTO), consumo no mobile (seção na Home + telas de detalhe + busca mesclada) e seções no admin. Guest scrub explícito para as duas novas entidades. Push apenas ao criar evento.

**Tech Stack:** Express + Mongoose (backend), Expo Router + React Native (mobile), Clerk (auth admin).

**Spec:** `docs/superpowers/specs/2026-11-05-modulo-turismo-design.md`

## Global Constraints

- TypeScript strict; sem `any`; `import type` para tipos.
- **TDD (AGENTS.md §2)**: nenhum código de produção sem um teste falhando antes. Cada task de backend declara RED → GREEN → REFACTOR.
- Sem `console.log` em código entregue.
- Código e comentários em português.
- Conventional Commits com trailer `Generated-by`.
- Gates por task (verificado antes de passar à próxima).
- Tipos de domínio sincronizados no MESMO commit (shared + mobile + admin — AGENTS.md §1).
- Cor/espaçamento/tamanho de fonte só de `mobile/src/constants/theme.ts`.
- Fotos: `expo-image` com `placeholder`/`transition`.
- `accessibilityLabel`/`role` em elementos clicáveis.
- **Execução**: Tasks 2→3→5 são **sequenciais** (compartilham `dto.ts`); Tasks 6 e 7 dependem de 2/3/5; Tasks 4 e 8 podem ser paralelas com o mobile.

## Review Focus

1. **"Turismo não duplica empresas"** — atrações/eventos são entidades próprias, não reusam `Company`.
2. **Guest scrub correto** — `isTouristSpot`/`isTourEvent` EXPLÍCITOS (o shape atual `slug+category+name` casa por acidente com as novas entidades!); redigir `phone`/`whatsapp` E `relatedCompany`/`organizerCompany` **populadas** (o scrub atual só inspeciona o campo literal `company` → vazaria contato da empresa aninhada).
3. **Expiração por DATA** — comparar `YYYY-MM-DD` com "hoje" em America/Fortaleza; NUNCA comparar data pura lexicograficamente com datetime ISO (`'2026-11-05' < '2026-11-05T…'` — o evento sumiria no próprio dia de encerramento).
4. **Busca mesclada** — chips "Atrações"/"Eventos" NÃO vêm de `/categories`; fetch paralelo das 3 coleções, seções separadas, navegação para o detalhe certo.
5. **Autorização** — service com `assertAdmin`; mutations já cobertas pelo middleware global `requireAuthForMutations`.
6. **Interface `TourEvent`** — nunca exportar/shadowing de `Event` global DOM.
7. **Visibilidade da seção** — Home: vazio → não renderiza; erro → mensagem de seção.
8. **Multi-cidade** — todas as entidades referenciam `City` (slug, `nullish`).

---

### Task 1: Shared domain — interfaces TouristSpot e TourEvent

**Files:**
- Modify: `shared/domain.ts`
- Modify: `mobile/src/types/domain.ts`
- Modify: `admin/src/types/domain.ts`

- [ ] **Step 1: Shared domain** — adicionar `TouristSpotCategory`, `TourEventCategory`, `TouristSpot`, `TourEvent`. **NÃO adicionar** `Lodging`, `rating`/`ratingCount` (YAGNI — apenas nota de design na spec §10).
- [ ] **Step 2: Replicar** nas cópias mobile e admin no mesmo commit.
- [ ] **Step 3: Verify** — typecheck nos três apps.
- [ ] **Step 4: Commit** — `feat(shared): tipos TouristSpot e TourEvent`.

### Task 2: Backend — entidade TouristSpot (TDD)

**Files:**
- Create: `backend/src/models/tourist-spot.model.ts`
- Create: `backend/src/services/tourist-spot.service.ts`
- Create: `backend/src/controllers/tourist-spot.controller.ts`
- Create: `backend/src/routes/tourist-spots.test.ts`
- Modify: `backend/src/types/dto.ts` (adicionar `createTouristSpotSchema`/`updateTouristSpotSchema` — task SEQUENCIAL depois da 1)
- Modify: `backend/src/routes/index.ts` (montar `/tourist-spots`)

**Testes (escrever PRIMEIRO, ver falhar — RED):** supertest contra `app.ts`, padrão `public-utilities.test.ts`:
- Listagem paginada shape `Paginated<T>`.
- POST 201 (admin autenticado, modo legado).
- POST 422 de payload inválido (zod).
- GET 404 de id malformado (`isValidObjectId`).
- POST 409 de slug duplicado.
- POST 401 sem auth (com Clerk mock)/403 não-admin.
- Filtros `?city=`, `?category=`, `?active=`.
- Convidado: `phone`/`whatsapp` `null` na resposta e `relatedCompany` populada redigida (usar caso de teste do scrub — ver Task 4).

- [ ] **Step 1: RED** — escrever `tourist-spots.test.ts` com os casos acima; rodar e ver falhar.
- [ ] **Step 2: Model** — `slug` único, `timestamps`, índice `{ active: 1, city: 1, category: 1 }`.
- [ ] **Step 3: DTO** — zod: `name`/`slug`/`description`/`category`/`active` required; `entryPrice` obrigatório se `entryFee === 'paid'` (`.superRefine`); PUT `.partial()`.
- [ ] **Step 4: GREEN** — service (CRUD, `assertAdmin`, `populate('city')`, `resolveCompany` para `relatedCompany` por id **ou** slug, padrão `notice`/`public-utility.service.ts`), controller, routes.
- [ ] **Step 5: Verify** — `npm test` verde + typecheck + lint.
- [ ] **Step 6: Commit** — `feat(backend): entidade TouristSpot (atrações turísticas)`.

### Task 3: Backend — entidade TourEvent (TDD) — SEQUENCIAL após Task 2 (compartilham dto.ts e routes/index.ts)

**Files:**
- Create: `backend/src/models/event.model.ts`
- Create: `backend/src/services/event.service.ts`
- Create: `backend/src/controllers/event.controller.ts`
- Create: `backend/src/routes/events.test.ts`
- Modify: `backend/src/types/dto.ts`
- Modify: `backend/src/routes/index.ts` (montar `/events`)
- Modify: `backend/src/services/push-notification.ts` ou equivalente (helper `notifyNewEvent`, padrão `notifyPromotion` em `company.service.ts`)

**Testes (escrever PRIMEIRO — RED):** mesmos casos da Task 2, MAIS:
- **Expiração por data**: evento com `endDate = today` (America/Fortaleza) aparece em `?active=true`; `endDate = ontem` NÃO aparece; `?includePast=true` traz o vencido.
- `GET /events/:id` de evento vencido → **200** (tela mostra "Encerrado"), não 404.
- DTO: 422 quando `endDate < startDate`; 422 quando `ticket === 'paid'` sem `ticketPrice`; 422 de `startTime` fora de `HH:mm`.
- **Push ao criar**: 1 notificação disparada no POST; PUT/DELETE nenhuma (assert/count do mock do Expo push).

- [ ] **Step 1: RED** — escrever `events.test.ts`; rodar e ver falhar.
- [ ] **Step 2: Model** — `slug` único, `timestamps`, índice `{ active: 1, endDate: 1 }`.
- [ ] **Step 3: DTO** — zod com regras cruzadas (superRefine): `endDate >= startDate`, `ticketPrice` exigido se `paid`, `startTime`/`endTime` regex `HH:mm`, `city` slug `nullish()`.
- [ ] **Step 4: GREEN** — service com filtro de visibilidade **por data** (helper puro `isEventVisibleOn(endDate, referenceDate)` em `utils/event-date.ts` testável com fuso America/Fortaleza), `?includePast=true`, push `notifyNewEvent` **somente no create**.
- [ ] **Step 5: Verify** — `npm test` verde + typecheck + lint.
- [ ] **Step 6: Commit** — `feat(backend): entidade TourEvent (eventos turísticos)`.

### Task 4: Backend — guest scrub explícito para Turismo (TDD)

**Files:**
- Modify: `backend/src/utils/guest.ts`
- Modify: `backend/src/utils/guest.test.ts`
- Modify: `backend/src/middlewares/guest.middleware.test.ts` (se aplicável)

**O que fazer (CRÍTICO):**
- [ ] **Step 1: RED** — teste provando que `TouristSpot`/`TourEvent` HOJE são misclassificados como `Company` pelo detector por shape (`slug+category+name`) e que contato da empresa **populada** em `relatedCompany`/`organizerCompany` VAZA para convidado.
- [ ] **Step 2: GREEN** — adicionar `isTouristSpot`/`isTourEvent` (detectar ANTES de `isCompany`) + `scrubTouristSpot`/`scrubEvent` (redigir `phone`/`whatsapp`; PRESERVAR `website`/`instagram`/`ticketUrl`/`entryPrice` — públicos; redigir `address` se seguir padrão Company? **NÃO** — endereço público; redigir apenas contatos) + estender `readPopulatedCompany` para `relatedCompany`/`organizerCompany` populadas.
- [ ] **Step 3: Estados do convidado** — `Scrubbed<T>`/tipos de resposta não quebrados nos services.
- [ ] **Step 4: Verify** — `npm test` verde (testes da Task 2/3 de scrub passam junto).
- [ ] **Step 5: Commit** — `fix(backend): guest scrub explicito para Turismo`.

### Task 5: Backend — seed de turismo

**Files:**
- Modify: `backend/src/scripts/seed.ts`

- [ ] **Step 1: Seed** — 4 atrações e 2 eventos para Castelo do Piauí:
  - Atrações: Parque Natural Municipal Pedra do Castelo, Cânion do Rio Poti, Cachoeiras do rio, e um espaço cultural (variando o enum de categoria) — **coordenadas reais** de Castelo do Piauí (não as de Fortaleza usadas hoje).
  - Eventos: **Cânyon Fest Poti** (festival, 3 dias, `active=true`, `startDate` fixa no ciclo do ano corrente — chave natural por `slug` com ano: `canyon-fest-poti-2026`) e um evento menor.
- [ ] **Step 2: Idempotência** — upsert por chave natural; **registrar as novas coleções** no `deleteMany` do `--reset`; usar `findCityBySlug('castelo-do-piaui')` (não pular se cidade ausente — verificar padrão atual que pula coleção quando `casteloId` é undefined).
- [ ] **Step 3: Verify** — typecheck; seed idempotente (doc no header do script).
- [ ] **Step 4: Commit** — `chore(seed): atracoes e eventos turisticos de Castelo do Piaui`.

### Task 6: Mobile — api.ts + seção "Turismo & Eventos" na Home

**Files:**
- Modify: `mobile/src/services/api.ts` (adicionar `getTouristSpots`, `getEvents` — fallback mock em dev **`__DEV__` only**, padrão `getNotices`)
- Modify: `mobile/src/data/mock.ts` (MOCK_TOURIST_SPOTS, MOCK_EVENTS — reusar os mesmos dados do seed, slugs iguais)
- Create: `mobile/src/features/home/tourism-section.tsx`
- Modify: `mobile/src/app/(tabs)/index.tsx` (integrar a seção)
- Create: `mobile/src/features/home/tourism-section.test.tsx` (ou `.test.ts` para helper de mesclagem)

- [ ] **Step 1: api.ts + mock.ts** — `getTouristSpots({ active: true, pageSize: 6 })`, `getEvents({ active: true, pageSize: 6 })` com `mockFallback(__DEV__ ...)`.
- [ ] **Step 2: Seção** — cards horizontais (atrações + eventos mesclados), imagem `expo-image`, título, cidade, "em breve" para eventos futuros; **vazio → não renderiza**; **erro → mensagem de seção** (padrão PublicUtilities); a11y nos cards; tokens de theme.ts (ZERO hex literal).
- [ ] **Step 3: Integrate** — Home compõe `<TourismSection ... />` (a rota é a tela; componente em `features/home/`, AGENTS.md §6.1).
- [ ] **Step 4: Verify** — typecheck + lint + testes + `npx expo export` (prova de bundle).
- [ ] **Step 5: Commit** — `feat(home): secao Turismo & Eventos`.

### Task 7: Mobile — telas de detalhe (route-as-screen)

**Files:**
- Modify: `mobile/src/services/api.ts` (adicionar `getTouristSpotById`, `getEventById` — padrão `getCompanyById`)
- Create: `mobile/src/app/tourist-spot/[id].tsx`
- Create: `mobile/src/app/event/[id].tsx`
- Create: `mobile/src/features/tourism/event-meta.ts` (puro: formatação de datas/horários, "em breve"/"Encerrado", entrada/ingresso — TESTÁVEL)
- Create: `mobile/src/features/tourism/event-meta.test.ts`

- [ ] **Step 1: Helper puro** — RED: testes de `event-meta.ts` (data "12–14 de nov", "em breve", "Encerrado" quando `endDate < hoje`, formatação HH:mm); depois GREEN.
- [ ] **Step 2: Tela de atração** (rota é a tela, sem shim) — foto hero, descrição, horários, entrada (`entryFee`+`entryPrice`), contatos (gated para convidado, padrão Company), "Como chegar" via `openMapLink`, a11y, tokens.
- [ ] **Step 3: Tela de evento** — datas/horários (helper acima), local, endereço, organizador/organizerCompany, ingresso (`ticket`, preço, `ticketUrl` via `Linking`), contatos gated, "Como chegar", selo "**Encerrado**" quando vencido (GET continua 200), tokens.
- [ ] **Step 4: Verify** — typecheck + lint + testes + `npx expo export`.
- [ ] **Step 5: Commit** — `feat(tourism): telas de detalhe de atracao e evento`.

### Task 8: Mobile — busca mesclada (chips fixos + seções)

**Files:**
- Modify: `mobile/src/app/(tabs)/search.tsx`
- Modify: `mobile/src/features/search/search-pagination.ts` (ou novo `tourism-search.ts` puro)
- Create: `mobile/src/features/search/tourism-search.test.ts`

**Design (spec D6):**
- Chips fixos "Atrações" e "Eventos" (não vêm de `/categories`).
- Quando um dos chips está ativo, a tela faz fetch paralelo: `searchCompanies` + `getTouristSpots` + `getEvents`; a lista tem **seções separadas** ("Empresas" — como hoje, FlatList; "Atrações"; "Eventos"), cada item navegando para `/tourist-spot/[id]` / `/event/[id]` / `/company/[id]`.
- Quando NENHUM chip de turismo está ativo: comportamento atual inalterado.
- Paginação: companies mantém o "Carregar mais"; turismo usa `pageSize` da seção (6/20) — sem paginação infinita no MVP (cabe em tela).
- Estados: loading/vazio/erro por seção; `cancelled` flag; `renderItem` por tipo com discriminated union `{ kind: 'company' | 'spot' | 'event' }`.

- [ ] **Step 1: Helper puro RED** — teste de `buildTourismSearchSections(spots, events, companies, chips)` (ordem, tipos, navegação correta por item).
- [ ] **Step 2: GREEN** — integrar em `search.tsx`.
- [ ] **Step 3: Verify** — typecheck + lint + testes + `npx expo export`.
- [ ] **Step 4: Commit** — `feat(search): busca mesclada de empresas, atracoes e eventos`.

### Task 9: Admin — CRUD de Turismo (seções definidas)

**Files:**
- Modify: `admin/src/services/api.ts` (getTouristSpots/Events + create/update/delete das duas entidades; DELETE usa `apiDelete` que já trata 204 sem corpo)
- Create: `admin/src/components/sections/atracoes.tsx`
- Create: `admin/src/components/sections/eventos.tsx`
- Modify: sidebar `Section` (estender união com "atracoes" e "eventos") + registry
- Modify: `admin/src/App.tsx` (registrar as seções — App.tsx continua fino)

**Formulário "Atrações":** nome, slug, descrição, categoria (select do enum TouristSpotCategory com labels pt-BR), fotos (URLs), endereço, cidade (select — o `Catalog` já carrega cities), lat/lng, horários (lista de linhas), entryFee (select) + entryPrice (texto, required se paid — validação client espelhando o zod), phone/whatsapp, website, instagram, featured, active, order, relatedCompany (select de empresas — `companyOptions` já existente, por id **ou** slug).

**Formulário "Eventos":** nome, slug, descrição, categoria (select), startDate/endDate (**inputs de texto com validação `YYYY-MM-DD` e regra endDate >= startDate** — sem datepicker, padrão atual), startTime/endTime (texto `HH:mm`), local, cidade (select), lat/lng, organizador, organizerCompany (select de empresas), ticket (select free/paid) + ticketPrice (required se paid) + ticketUrl, fotos, contatos (gated admin), featured, active.

- [ ] **Step 1: api.ts** — funções CRUD com tipos `TouristSpot`/`TourEvent`.
- [ ] **Step 2: Sections** — tabela + busca/paginação server-side + form modal, padrão `sections/avisos.tsx`/`utilidade-publica.tsx`. Admin lista eventos vencidos com `?includePast=true` (toggle no filtro).
- [ ] **Step 3: Verify** — typecheck + lint + build.
- [ ] **Step 4: Commit** — `feat(admin): CRUD de atracoes e eventos turisticos`.

### Task 10: Documentação e verificação final

**Files:**
- Modify: `README.md` (adicionar 10 rotas à tabela de endpoints; mencionar turismo nas seções "O que o app faz"/"O que o painel faz"; seed: novas coleções)
- Modify: `ROADMAP.md` (item 16 → feito, com resumo)

- [ ] **Step 1: Docs** — README + ROADMAP; commit `docs: modulo turismo nos endpoints e roadmap`.
- [ ] **Step 2: Gates completos** (todos os apps):
  - backend: `npm run lint && npm run typecheck && npm test && npm run build`
  - mobile: `npm run lint && npm run typecheck && npm test && npx expo export`
  - admin: `npm run lint && npm run typecheck && npm run build`
- [ ] **Step 3: Report final** — mudanças, resultados de gates, riscos remanescentes (ex.: teste manual de device, seed contra Mongo real), próximos passos.

---

## Self-Review Checklist (atualizado pós-review)

- [ ] Lint/typecheck verdes em mobile, backend, admin.
- [ ] Backend tests passando — **INCLUSIVE** os novos de turismo (supertest, não mocks).
- [ ] Guest scrub: `isTouristSpot`/`isTourEvent` explícitos, redação de contatos E de empresas populadas (`relatedCompany`/`organizerCompany`), com teste.
- [ ] Expiração de evento por DATA (fim do dia de endDate, fuso America/Fortaleza) — com teste.
- [ ] `GET /events/:id` vencido → 200 ("Encerrado"); `?includePast=true` no admin.
- [ ] Push só no create de evento — com teste.
- [ ] Busca mesclada com fetch paralelo e navegação correta por item.
- [ ] Seção da Home some quando vazio / mostra erro quando falha.
- [ ] Interface `TourEvent` (sem shadowing de `Event` DOM).
- [ ] Sem `Lodging`/`rating` no código (YAGNI).
- [ ] Tipos sincronizados no mesmo commit (shared + mobile + admin).
- [ ] Índices no model (`slug` único; `{active, city, category}`; `{active, endDate}`).
- [ ] Seed idempotente com coleções no `--reset`, cidade por slug, coordenadas reais de Castelo.
- [ ] A11y em cards e botões; `expo-image` com placeholder/transition; tokens de theme.ts.
- [ ] Route-as-screen: telas em `src/app/` IMPLEMENTAM a tela (sem shim — AGENTS.md §6.2).
