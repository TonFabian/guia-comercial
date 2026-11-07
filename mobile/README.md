# Mobile — Guia Comercial (Expo)

App mobile em React Native / Expo SDK 58. Navegação via Expo Router, dados via `src/services/api.ts` (com fallback mock).

## Estrutura

- `src/app/` — rotas (Expo Router). Cada arquivo é uma tela; `_layout.tsx` define navegadores.
- `src/features/` — pedaços reutilizáveis (componentes, hooks, helpers puros) por feature.
- `src/components/` — componentes compartilhados.
- `src/constants/` — tokens (theme, support).
- `src/services/` — fachada HTTP (`api.ts`) e helpers (`http.ts`).
- `src/types/` — tipos de domínio (cópia de `shared/domain.ts`).
- `src/utils/` — utilitários (links, phone, city).
- `src/data/` — mocks e dados estáticos.
- `src/hooks/` — hooks compartilhados.
- `src/providers/` — context providers.
- `src/theme/` — escala fluida (`fluid-width`).
- `scripts/` — scripts de manutenção (reset-project).

## Comandos

```bash
npx expo start
npx expo lint
npm run typecheck
```

## Convenções

- Tokens centralizados em `src/constants/theme.ts`.
- Tipografia segue a spec em `docs/superpowers/specs/2026-11-06-tipografia-design.md`.
- Imports via alias `@/`.
- Sem shims de rota (§6.2 do AGENTS.md).
