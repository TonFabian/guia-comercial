# Spec: Migração de `openingHours` para `schedule` em Company

Data: 2026-11-07

## Intent

Substituir `openingHours: string[]` (strings livres) por `schedule: { day, opens, closes }[]`
como fonte da verdade para horário de funcionamento, permitindo cálculo robusto
de "aberto agora" no mobile.

## Goals

- `schedule` passa a ser a fonte única de horário de funcionamento.
- Remover `openingHours` de modelos, DTOs, domínio compartilhado, admin e mobile.
- Cálculo "aberto agora" usa `schedule` estruturado.

## Non-goals

- Turistas/atrativos (`TouristSpot`) mantêm `openingHours` nesta iteração.
- Rally para eventos (`TourEvent.schedule`) — sem alteração.

## Riscos

- Migração de dados (convert strings → schedule) para registros existentes.
- Admin precisa de UI para editar schedule (dia/hora) em Company.

## Correções (revisão de bugs/brechas)

- **Backcompat/contrato de API**: adicionar fase de deprecação — backend aceita
  ambos (`openingHours` deprecated + `schedule`) e responde com ambos durante o
  rollout; remoção só depois de o app atualizado em produção não depender mais.
  Nenhuma quebra silenciosa para clientes antigos.
- **Unidade de tempo**: definir `opens`/`closes` como minutos desde 00:00
  (0–1439). Cruzamento de meia-noite: se `closes < opens`, o estabelecimento
  fecha no dia seguinte (ex.: abre 18:00 fecha 02:00).
- **Migração idempotente**: script converte apenas registros com `openingHours`
  preenchido e `schedule` vazio. Regras de parse explícitas; string não
  parseável → mantém `openingHours`, registra em log e NÃO descarta dados.
  Formatos de seed cobertos: "Seg a Sex: 08h às 18h", "Todos os dias: 00h às 23h59".
- **Schedule vazio** (legado): "aberto agora" mantém fallback para
  `openingHours` enquanto deprecação durar; após remoção, vazio = fechado.
- **Ordem de rollout**: (1) backend passa a aceitar/emitir ambos;
  (2) mobile/admin migram para schedule; (3) remoção de openingHours no DTO/zod
  (strict mode) só na última fase, com gate de testes.
- **UI de edição**: admin e my-company.tsx ganham editor estruturado
  (dia 0–6, opens/closes em minutos) com validação zod cruzada.
- **TouristSpot**: mantém openingHours; parses do mobile para TouristSpot não
  reaproveitam/removem código da Company sem checagem.

## Abordagem

1. Adicionar migração Mongoose (script one-off) que converte `openingHours`
   strings em `schedule` estruturado (parse por dia/semana).
2. Backend: aceitar/emitir ambos (`openingHours` deprecated).
3. Mobile: parse "aberto agora" passa a usar `schedule` com fallback;
   `my-company.tsx` e admin recebem editor para `schedule` (dia, opens, closes).
4. shared/domain.ts atualizado (repliçado em mobile/admin).
5. Fase final: remover `openingHours` de model/DTO após rollout.
6. Testes de rota/unitário atualizados.

## Critério de sucesso

- Aberto agora calculado a partir de `schedule`.
- Sem quebra de API para clientes antigos durante o rollout.
- Sem referências a `openingHours` em Company ao final (exceto migração/deprecado).
