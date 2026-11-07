# admin — Painel administrativo (Vite + React)

Painel web do Guia Comercial: gerencia empresas, categorias, cidades, banners, cupons, vagas, avisos, atrações, eventos, utilidade pública e usuários. Consome a API do backend; autenticação via Clerk.

## Estrutura

```
admin/
├── src/
│   ├── App.tsx            # root: Clerk auth gate + roteamento de seções + catálogo
│   ├── main.tsx           # bootstrap React + ClerkProvider + fontes
│   ├── styles.css         # tokens CSS (cores, tipografia, line-heights) dark theme
│   ├── theme/typography.ts# tokens TS de font-size/line-height/font-family
│   ├── types/             # domain.ts (cópia de shared/domain.ts), catalog.ts
│   ├── services/api.ts    # única porta HTTP (ApiError, fetchers, useApi)
│   ├── hooks/use-resource.ts # paginação/reload para seções
│   ├── utils/             # labels, filter, spot-option
│   └── components/        # componentes reutilizáveis + sections/
│       └── sections/      # uma seção por recurso (11 seções)
├── e2e/                   # playwright specs
└── package.json
```

## Contratos públicos

### `services/api.ts`
- `setAuthToken(token)` — armazena token global para Bearer em requisições.
- `ApiError { status, message }`.
- Fetchers `get*`/`create*`/`update*`/`delete*` para todos os recursos.
- `useApi<T>(fetcher, deps)` — hook com fetcher em ref (evita loops).
- Invariantes: `BASE_URL = import.meta.env.VITE_API_URL ?? ''`; `DEFAULT_PAGE_SIZE = 50`; trata 204/corpo vazio retornando `undefined`; `getNotices` envia `active='all'`; `getEvents` envia `includePast='true'`; `getCities` aceita `City[]` ou `Paginated<City>`.

### `hooks/use-resource.ts`
- `useResource<T>(loader, pageSize=50): ResourceResult<T>` com `items,total,page,pageSize,loading,error,setPage,reload`.
- Invariantes: loader em ref; `setPage` clampa mínimo 1; reset de página quando página vazia com total>0; defaults `[]`/`0`.

### Componentes (`components/`)
- `Table`, `Badge`, `RowActions`, `DeleteButton`, `Pagination`, `SearchInput`, `Sidebar` (SECTIONS/Section), `ScheduleEditor` (validação de programação de evento).
- `styles.ts`: `formStyle`, `toolbarStyle`, `paginationStyle`, `errorStyle`, `hintStyle`, `checkLabelStyle`, `searchInputStyle`.

### Seções (`components/sections/`)
11 seções: banners, categorias, cidades, empresas, eventos, atrações, cupons, vagas, utilidade pública, usuários (read-only), avisos.
- Cidades: backend só expõe create/delete (sem update).
- Usuários: read-only (sem write endpoints; perfil mantido no Clerk via webhook).
- Eventos: datas `YYYY-MM-DD` puras; `validarDatas` exige `endDate >= startDate`; programação validada contra intervalo de datas.
- Vagas/cupons/atracoes: lista de empresas limitada a 100; `companiesTotal` pode exceder `companies.length`.

## Tipografia
Headings em Rubik Variable, body em Inter Variable via CSS vars de `styles.css` (`--font-size-*`, `--line-height-*`, `--font-family-heading/body`). Tokens TS em `theme/typography.ts`. Fonte única dos valores = `styles.css`.

## Testes
- Unit: `npm run test` (vitest) — `components/schedule-editor.test.ts`, `utils/spot-option.test.ts`.
- E2E: playwright em `e2e/` (typography spec).
- Lint/typecheck: `npm run lint`, `npm run typecheck`.

## Comandos
```bash
npm run dev        # vite dev server
npm run build      # tsc + vite build
npm run lint
npm run typecheck
npm test
```

## Variáveis de ambiente
- `VITE_API_URL` — URL base da API (default `''`).
- `VITE_CLERK_PUBLISHABLE_KEY` — chave pública do Clerk.

## Notas
- `src/types/domain.ts` é cópia idêntica de `shared/domain.ts`; manter em sincronia (Metro/Vite não resolvem import cross-project).
- Erros de recurso não implementado lançam erro explícito (não finja funcionar).
- `useApi` guarda fetcher em ref para evitar loop de refetch com arrow inline.
