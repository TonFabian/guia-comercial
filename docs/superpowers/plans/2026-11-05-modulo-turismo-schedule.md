# Módulo Turismo — Programação interna de eventos (schedule) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar programação interna (`schedule`) a `TourEvent`, com visibilidade no app, edição no admin e validações cruzadas.

**Architecture:** Campo embutido `schedule?: TourEventScheduleItem[]` em `TourEvent` (sem coleção própria). Validação zod cruzada no DTO. Helper puro no mobile para agrupar/ordenar por dia. Guest scrub recursivo para `relatedSpot`.

**Tech Stack:** Express + Mongoose + zod (backend), Expo Router + React Native (mobile), Vite + React (admin).

**Spec:** `docs/superpowers/specs/2026-11-05-modulo-turismo-schedule-design.md`

## Global Constraints

- TypeScript strict; sem `any`; `import type`.
- TDD: teste falhando antes de código.
- Sem `console.log`.
- Código/comentários em português.
- Conventional Commits com trailer `Generated-by`.
- Tipos sincronizados no mesmo commit (shared + mobile + admin).
- Tokens de theme.ts no mobile.

## Review Focus

1. Validação cruzada `date` dentro de `[startDate, endDate]` — com teste de borda (date == startDate, date == endDate, date fora).
2. Guest scrub recursivo (`relatedSpot` → `relatedCompany`) — com teste.
3. `endTime >= startTime` por string (24h) — com teste.
4. Item sem `startTime` ordenado ao fim do dia — com teste do helper.
5. `relatedSpot` por slug/id resolvido no service — com teste.

---

### Task 1: Shared domain — TourEventScheduleItem

**Files:**
- Modify: `shared/domain.ts`
- Modify: `mobile/src/types/domain.ts`
- Modify: `admin/src/types/domain.ts`

- [ ] **Step 1:** Adicionar interface `TourEventScheduleItem` e `schedule?: TourEventScheduleItem[]` em `TourEvent` no shared.
- [ ] **Step 2:** Replicar nas cópias mobile e admin.
- [ ] **Step 3:** Typecheck nos três apps.
- [ ] **Step 4:** Commit — `feat(shared): TourEventScheduleItem e schedule em TourEvent`.

### Task 2: Backend DTO — validação de schedule (TDD)

**Files:**
- Modify: `backend/src/types/dto.ts`
- Modify: `backend/src/routes/events.test.ts`

- [ ] **Step 1: RED** — adicionar testes supertest: POST com schedule válido → 201; item com date fora do intervalo → 422; item com endTime < startTime → 422; item paid sem ticketPrice → 422; item com date inválida → 422.
- [ ] **Step 2: GREEN** — adicionar `tourEventScheduleItemSchema` (zod) e incluir `schedule` em `createTourEventSchema`/`updateTourEventSchema` (update partial). SuperRefine cruzado com guard.
- [ ] **Step 3:** Verify — `npm test`, typecheck, lint.
- [ ] **Step 4:** Commit — `feat(backend): validacao zod de schedule em TourEvent`.

### Task 3: Backend service — resolveSpot + guest scrub (TDD)

**Files:**
- Modify: `backend/src/services/event.service.ts`
- Modify: `backend/src/utils/guest.ts`
- Modify: `backend/src/utils/guest.test.ts`

- [ ] **Step 1: RED** — teste: evento com schedule item relatedSpot populado → guest não vê phone/whatsapp do spot nem da empresa aninhada.
- [ ] **Step 2: GREEN** — `resolveSpot` no service (por id ou slug), padrão `resolveCompany`; `scrubEvent` estendido para redigir `relatedSpot` populado e `relatedCompany` aninhado.
- [ ] **Step 3:** Verify — `npm test`, typecheck, lint.
- [ ] **Step 4:** Commit — `fix(backend): guest scrub recursivo para schedule.relatedSpot`.

### Task 4: Mobile — helper puro event-meta (TDD)

**Files:**
- Create: `mobile/src/features/tourism/event-meta.ts`
- Create: `mobile/src/features/tourism/event-meta.test.ts`

- [ ] **Step 1: RED** — testes: agrupar por dia; ordenar por startTime; itens sem startTime ao fim do dia ordenados por title; "Encerrado" quando endDate < hoje.
- [ ] **Step 2: GREEN** — implementar helper puro.
- [ ] **Step 3:** Verify — typecheck, lint, testes.
- [ ] **Step 4:** Commit — `feat(mobile): helper de programacao de evento`.

### Task 5: Mobile — tela de detalhe do evento exibe programação

**Files:**
- Modify: `mobile/src/app/event/[id].tsx`

- [ ] **Step 1:** Adicionar seção "Programação" agrupada por dia usando o helper; mostrar palco e ingresso quando presentes; link para `TouristSpot` quando `relatedSpot` populado.
- [ ] **Step 2:** Verify — typecheck, lint, `npx expo export`.
- [ ] **Step 3:** Commit — `feat(mobile): programacao na tela de detalhe do evento`.

### Task 6: Admin — editor de schedule no formulário de evento

**Files:**
- Modify: `admin/src/components/sections/eventos.tsx`
- Modify: `admin/src/services/api.ts` (tipos já ok via domain)

- [ ] **Step 1:** Adicionar editor de lista de itens (adicionar/remover) com campos date, startTime, endTime, title, description, stage, relatedSpot (select de atrações), ticket/ticketPrice/ticketUrl. Validação client espelhando zod.
- [ ] **Step 2:** Verify — typecheck, lint, build.
- [ ] **Step 3:** Commit — `feat(admin): editor de programacao em eventos`.

### Task 7: Seed — programação real do Canyon Fest Poti

**Files:**
- Modify: `backend/src/scripts/seed.ts`

- [ ] **Step 1:** Adicionar schedule ao evento Canyon Fest Poti (3 dias, ≥2 itens/dia, palcos distintos, referência a atrações).
- [ ] **Step 2:** Verify — typecheck, seed idempotente.
- [ ] **Step 3:** Commit — `chore(seed): programacao do Canyon Fest Poti`.

### Task 8: Docs + gates finais

**Files:**
- Modify: `README.md`, `ROADMAP.md`

- [ ] **Step 1:** Atualizar docs.
- [ ] **Step 2:** Gates completos nos três apps.
- [ ] **Step 3:** Commit — `docs: programacao interna de eventos no readme/roadmap`.

---

## Self-Review

- Spec coverage: todas as seções cobertas (modelagem, validações, backend, mobile, admin, seed, tipos, guest scrub).
- Type consistency: `TourEventScheduleItem` definido em Task 1, consumido em Task 2/3/5/6.
- Review Focus: cada item tem teste correspondente.
- Proportion: plano enxuto, sem corpos de função.