# Módulo Turismo — Addendum: filtro de cidade e busca textual com paginação

> Complemento do plano `2026-11-05-modulo-turismo.md`. Fecha duas limitações
> conhecidas apontadas na revisão final da branch `feature/modulo-turismo`.

**Goal:** eliminar duas limitações registradas em código:

1. A seção "Turismo & Eventos" da Home **ignora o filtro de cidade** da Home
   (`mobile/src/features/home/tourism-section.tsx`).
2. Na busca mesclada, o termo **filtra só os 20 primeiros itens de turismo, no
   cliente**, porque o backend de turismo não expõe busca textual
   (`mobile/src/features/search/tourism-search.ts`).

**Estado do backend na branch:** `?city=` (slug) **já funciona** em
`/tourist-spots` e `/events`; o que falta é `?q=`.

## Global Constraints

- TDD (AGENTS.md §2): teste falhando antes, em cada task.
- Sem `any`; strict; português; sem `console.log`; Conventional Commits com
  trailer `Generated-by`.
- O filtro client-side por termo **permanece** no mobile (o fallback mock
  filtra no cliente); o `q` no servidor é a fonte da verdade para a API real.
- Fuso: `endDate`/`startDate` continuam strings `YYYY-MM-DD` (America/Fortaleza).
- Branch: `feature/modulo-turismo` (não mergeada).

## Task A — Backend: busca textual (`q`) em `/tourist-spots` e `/events`

- [ ] `escapeRegex` sai de `company.service.ts` (onde é privado) para
      `backend/src/utils/regex.ts` (exportado, reutilizado) — 3ª ocorrência da
      regra DRY do AGENTS.md.
- [ ] `listTouristSpots`: filtro `q` → regex case-insensitive em `name` e
      `description`.
- [ ] `listEvents`: filtro `q` → regex case-insensitive em `name`,
      `description` e `location`.
- [ ] Controllers repassam `req.query.q`.
- [ ] Testes (supertest, `backend/src/routes/tourist-spots.test.ts` e
      `backend/src/routes/events.test.ts`): `q` casa nome e descrição; `q` não
      casa → lista vazia; `q` vazio não filtra; `q` + paginação → `total`
      correto; `q` com caractere especial (`(`) não quebra a regex.
- [ ] Gate: `npm test`, typecheck, lint, build.

## Task B — Mobile: a seção da Home respeita o filtro de cidade

- [ ] `TourismSection` recebe `city?: string` e repassa para
      `getTouristSpots`/`getEvents` (o `api.ts` já aceita `city`); o efeito
      recarrega quando a cidade muda.
- [ ] `mobile/src/app/(tabs)/index.tsx`: `<TourismSection city={selectedCity} />`.
- [ ] Helper puro testável para montar a query do turismo (extrair
      `montarQueryTurismo` de `api.ts` para um módulo testável e exportar) +
      teste cobrindo `city`, `q` e `page`.
- [ ] Remove o comentário de limitação de cidade.

## Task C — Mobile: busca envia `q` ao servidor e pagina o turismo

- [ ] `TourismParams` ganha `q?: string` e `page?: number`; `api.ts` repassa
      na query.
- [ ] Tela de busca: envia o termo como `q` para as queries de turismo (só
      quando o chip de turismo está ativo).
- [ ] Paginação do turismo: `onEndReached`/`"Carregar mais"` carrega a próxima
      página de cada seção de turismo e **anexa** aos resultados (estado
      próprio por coleção: página, total, exhausted).
- [ ] Helper puro testável para a decisão de "há mais para carregar" por
      seção + testes.
- [ ] Remove o comentário de limitação dos 20 itens.

## Task D — Verificação final

- [ ] Gates dos três apps + revisão de branch do addendum.
