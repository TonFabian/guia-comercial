# shared/

Fonte da verdade dos **tipos de domínio** do monorepo Guia Comercial.

## Propósito

Este diretório contém apenas tipos TypeScript puros (sem runtime, sem imports),
usados por `backend/`, `mobile/` e `admin/`. É a fonte da verdade dos
contratos de domínio do projeto.

## Arquivo

- `domain.ts` — interfaces e tipos de todos os agregados (Company, Category,
  User, etc.).

## Convenções

- IDs e datas são `string` (JSON não tem ObjectId/Date). Serializers convertem
  `_id`, referências e datas.
- Referências Mongoose usam união `string | Entidade` (populate).
- Ao editar este arquivo, **replicar** em `mobile/src/types/domain.ts` e
  `admin/src/types/domain.ts` no mesmo commit (Metro/Vite não resolvem
  import cross-project).

## Uso

- `backend/` importa `shared/domain.ts` diretamente.
- `mobile/` e `admin/` usam cópias locais em `src/types/domain.ts`.