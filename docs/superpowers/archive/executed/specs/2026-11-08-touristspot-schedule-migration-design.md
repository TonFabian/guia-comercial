# Spec: Migração `openingHours` → `schedule` em TouristSpot

Data: 2026-11-08

## Intent

Padronizar `TouristSpot` (atrativo turístico) com a mesma migração feita em
`Company`: substituir `openingHours: string[]` por `schedule: { day, opens, closes }[]`
como fonte da verdade para horário de funcionamento, mantendo exibição e
"aberto agora" robustos e sem inferência.

## Goals

- `TouristSpot` usa apenas `schedule` (estruturado).
- Remover `openingHours` de model, DTO, domain compartilhado, admin, mobile, seed.
- Exibição e "aberto agora" derivados de `schedule` (sem inferência de dias).
- Seed de turismo migrado para `schedule`.

## Non-goals

- Eventos (`TourEvent`) não são afetados (já tem `schedule` próprio, programação).

## Abordagem

1. Backend deprecação: aceitar/emitir ambos; `resolverSchedule` reutilizado.
2. Migração idempotente (script) para TouristSpot.
3. Mobile: `tourist-spot/[id].tsx` usa `schedule` (com fallback durante deprecação).
4. Admin: `atracoes.tsx` editor estruturado (reuso do schedule-editor) em vez de textarea.
5. shared/domain.ts TouristSpot: remover `openingHours`, manter `schedule`.
6. Fase final: remover `openingHours` definitivamente (como feito em Company).

## Riscos

- Migração de dados para atrativos existentes.
- UI de edição no admin (schedule por dia).

## Critério de sucesso

- Sem referências a `openingHours` em TouristSpot.
- Exibição e "aberto agora" a partir de `schedule`.
