# Design: Permissão de donos de empresa para gerenciar Jobs e Cupons

Data: 2026-11-07

## Intent e por quê

Hoje `Job` e `Coupon` são gerenciados apenas por admins (`assertAdmin`).
Como ambos referenciam uma `Company`, o dono da empresa vinculada deveria
poder criar/editar/excluir seus próprios jobs e cupons, sem depender de um
admin. Isso destrava self-service para empresas.

## Goals

- Dono da empresa vinculada a um `Job`/`Coupon` pode criar/editar/excluir.
- Admin continua podendo tudo.
- Sem mudança de schema (reusa `company` existente).
- Reusa o helper `assertOwnerOrAdmin` já extraído.

## Non-goals

- Outros recursos (banner, notice, event, tourist-spot, public-utility,
  category, city) permanecem admin-only nesta iteração.
- Não introduz vínculo empresa↔recurso novo; reusa o existente.
- Não muda listagem/filtros.

## Constraints

- Modo legado (`CLERK_SECRET_KEY` ausente) desabilita autorização (padrão do repo).
- Recurso inexistente → 404; sem sessão → 401; sem permissão → 403.
- `ownerClerkId` do payload é descartado (mass assignment) — já validado em tests.

## Abordagens consideradas

1. **Autorização por empresa no service (escolhida)**: resolver a empresa do
   recurso e checar `ownerClerkId === clerkId || role === admin`. Sem
   migração. Custo: query extra para resolver empresa em update/delete.
2. Denormalizar `ownerClerkId` em Job/Coupon: checagem direta, mas risco de
   inconsistência se a empresa trocar de dono.
3. Manter admin-only: status quo.

Escolha: (1).

## Como funciona

- `createJob(dto, clerkId)`: resolver `Company` por `dto.company`; chamar
  `assertOwnerOrAdmin` com `findResource` retornando `{ exists, ownerClerkId }`
  da empresa. Sem empresa → 404 (já coberto por validação? validar existência).
- `updateJob`/`deleteJob`: buscar o Job, obter `company`, resolver empresa,
  checar owner/admin. Job inexistente → 404.
  **O campo `company` não pode ser alterado no update** (mass assignment /
  mudança de titularidade) — se presente no payload, é descartado (já
  coberto pelo zod `.partial()`? garantir que o controller/service ignore).
- Mesmo para Coupon.

## O que fica para o builder

- Implementar `findResource` adequado em cada service.
- Ajustar testes de segurança existentes que assumem admin-only para
  jobs/cupons (ou adicionar cenários owner).
- Manter `assertAdmin` para os demais recursos.

## Critério de sucesso

- Owner da empresa consegue CRUD de seus jobs/cupons.
- Usuário comum (não owner) recebe 403.
- Admin continua funcionando.
- Testes verdes.
