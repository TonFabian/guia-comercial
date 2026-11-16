# UX de Cadastro de Horários em 24h — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Substituir a entrada em minutos por entrada em formato 24h (HH:MM) com conversão para minutos, em mobile e admin, com opção de aplicar a semana toda.

**Architecture:** Helpers puros de conversão 24h↔minutos + componentes de grade (7 dias) reutilizáveis. Mobile usa DateTimePicker; admin usa input type="time".

**Tech Stack:** Expo/RN (DateTimePicker), React/Vite, Vitest.

**Spec:** docs/superpowers/specs/2026-11-08-schedule-ux-24h-design.md

## Global Constraints

- Formato 24h (00:00–23:59); minutos internos 0–1439.
- Meia-noite: closes < opens permitido.
- Sem segredos; npm/expo install; lint/typecheck/tests verdes.

## Review Focus

- Conversão incorreta de 24h → minutos.
- Validação de meia-noite.
- Exibição não perde informação.

---

### Task 1: Helpers de conversão 24h (TDD)

**Files:** mobile/src/features/company/schedule-time.ts (novo) + teste.

- [ ] `toMinutes("HH:MM"): number | null` (valida 00–23, 00–59).
- [ ] `toTime(minutes): string` ("HH:MM").
- [ ] `isValidRange(opens, closes): boolean` (opens !== closes; meia-noite ok).
- [ ] TDD RED→GREEN; typecheck.

### Task 2: Mobile grade de 7 dias com picker 24h

**Files:** mobile/src/features/company/schedule-editor.tsx (refactor) + my-company.tsx.

- [ ] Grade de 7 dias com toggle + DateTimePicker (mode time, is24Hour).
- [ ] Botão "Aplicar a todos os dias abertos".
- [ ] Estado em minutos; envio de schedule.
- [ ] Testes de conversão.

### Task 3: Admin grade com input type="time"

**Files:** admin/src/components/sections/empresas.tsx, atracoes.tsx.

- [ ] Substituir entrada em minutos por `<input type="time">`.
- [ ] Botão "Preencher semana".
- [ ] Validação 24h.

### Task 4: TouristSpot mobile/admin (mesma UX)

**Files:** mobile/src/app/tourist-spot/[id].tsx (se aplicável), admin atracoes.

- [ ] Mesma grade 24h.

### Task 5: Verificação final

- [ ] typecheck+lint+tests mobile/admin.
- [ ] Exemplo de exibição validado.
