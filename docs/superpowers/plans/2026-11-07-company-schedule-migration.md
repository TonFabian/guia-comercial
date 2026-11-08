# Migração Company openingHours → schedule — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Migrar horário de funcionamento de Company de `openingHours: string[]` para `schedule: { day, opens, closes }[]` como fonte da verdade, sem quebrar clientes antigos.

**Architecture:** Fases: (1) backend aceita/verifica ambos; (2) migração idempotente; (3) mobile/admin migram para schedule; (4) remoção de openingHours.

**Tech Stack:** Express/Mongoose, Vitest, Expo/RN, Vite/React.

**Spec:** docs/superpowers/specs/2026-11-07-company-schedule-migration-design.md

## Global Constraints

- opens/closes: minutos desde 00:00 (0–1439). closes < opens = fecha no dia seguinte.
- Migração idempotente; string não parseável mantém openingHours + log.
- Sem segredos no código; npm; lint/typecheck/tests verdes.

## Review Focus

- String não parseável → não perde dados (mantém openingHours, log).
- opens/closes fora de 0–1439 → 400 no DTO.
- schedule vazio → fallback openingHours no "aberto agora".
- POST/PUT com openingHours ainda aceito na fase 1.

---

### Task 1: Helpers de parse/unidade (TDD)

**Files:** backend/src/utils/opening-hours.ts (novo), teste idem.

- [ ] parseOpeningHoursString(line: string): ScheduleItem | null — cobre "Seg a Sex: 08h às 18h", "Todos os dias: 00h às 23h59", retorna null se não parseável.
- [ ] convertOpeningHoursToSchedule(openingHours: string[]): ScheduleItem[] — ignora inválidas.
- [ ] isCompanyOpen(schedule: ScheduleItem[], now: Date): boolean — cruzamento meia-noite.

### Task 2: Script de migração idempotente

**Files:** backend/src/scripts/migrate-opening-hours.ts

- [ ] Processa companies com openingHours preenchido e schedule vazio; log de não-parseáveis; roda com MONGODB_URI env (não usa dotenv no código? padrão do repo).

### Task 3: Backend deprecação (aceitar/emitir ambos)

**Files:** backend/src/models/company.model.ts, dto.ts, services/company.service.ts

- [ ] POST/PUT continuam aceitando openingHours (deprecated no zod).
- [ ] createCompany/updateCompany: se schedule vazio e openingHours presente, converte via convertOpeningHoursToSchedule.
- [ ] Respostas continuam emitindo ambos.
- [ ] Tests supertest: POST com openingHours gera schedule; schedule vazio mantém openingHours.

### Task 4: Mobile — "aberto agora" usa schedule

**Files:** mobile/src/features/search/search-pagination.ts, company/company-details.ts, company/company-hours.tsx, app/my-company.tsx, data/mock.ts

- [ ] isOpenNow usa schedule (com fallback openingHours enquanto deprecação durar).
- [ ] my-company.tsx: editor estruturado (dia 0–6, opens/closes minutos) + envia schedule.

### Task 5: Admin — editor estruturado

**Files:** admin/src/services/api.ts, novo componente schedule-editor (reuso do de eventos? adaptar) em companies.tsx.

- [ ] Formulário envia schedule; exibição/formato.

### Task 6: shared/domain.ts

**Files:** shared/domain.ts, admin/src/types/domain.ts, mobile/src/types/domain.ts

- [ ] Schedule item já existe (day/opens/closes); apenas remover openingHours na fase final (fora do escopo aqui — manter deprecated).
- [ ] Marcar openingHours como @deprecated no comentário.

### Task 7: Fase final — remover openingHours (fora do escopo deste branch)

- [ ] Só remova após rollout do app; ESLint/DTO com openingHours fechado. NÃO executar neste branch.
