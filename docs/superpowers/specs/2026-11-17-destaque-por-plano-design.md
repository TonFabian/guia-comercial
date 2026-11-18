# Destaque por plano (Premium) — Design

Data: 2026-11-17
Status: Aprovado para implementação (design revisado pelo usuário)

## Intent

Substituir a regra binária `isFeatured` pela regra de plano na home: toda
empresa com `plan === 'premium'` aparece na seção "Empresas em Destaque"; as
demais ficam em "Outras Empresas & Serviços Locais", com básico antes de free.
Ao remover o premium no admin, a empresa sai dos destaques e volta para a lista
abaixo. A tela completa passa a ser liberada para básico e premium; free (ou
plano ausente) continua na tela enxuta.

## Decisões

| Tema | Decisão |
| --- | --- |
| Destaque na home | Toda empresa com `plan === 'premium'` |
| Quantidade | Todas as premium, sem rotação (teto técnico de 50 por consulta) |
| Básico | Topo de "Outras Empresas", antes das free |
| Free | Lista abaixo, ordenada por nome dentro do grupo |
| `isFeatured` | Removido do domínio, modelo, DTOs, seed, mocks, tipos e testes |
| Tela completa | Básico e premium; free/ausente → tela enxuta |
| Filtro de API | `GET /companies?plan=premium` e `?plan=basic,free` |
| Layout da seção | Carrossel horizontal de cards |
| Admin | Sem UI nova; o formulário de plano existente já basta |

## Non-goals

- Não alterar preços, limites ou benefícios dos planos.
- Não implementar rotação semanal do destaque prevista no spec de monetização.
- Não criar "destaque manual" no admin.
- Não migrar documentos existentes no Mongo.
- Não refatorar `prioritize=plan`, busca ou ordenação existente.

## Contrato da API

```
GET /api/companies?plan=premium&city=castelo-do-piaui&page=1&pageSize=50
GET /api/companies?plan=basic,free&page=1&pageSize=50
```

Regras:

- `plan` aceita lista separada por vírgula com `free`, `basic` e `premium`;
  itens são aparados, normalizados e deduplicados.
- Valor presente e inválido (ex.: `gold`) → 400 no padrão
  `parametroInvalido`.
- Ausente ou vazio → sem filtro.
- Empresa sem `plan` no banco conta como `free` quando `free` está na lista.
- A resposta continua no shape `Paginated<Company>` (`items`, `total`, `page`,
  `pageSize`).

## Backend

### Modelo e DTOs

- `backend/src/models/company.model.ts`: remover `isFeatured`.
- `backend/src/types/dto.ts`: remover `isFeatured` de `createCompanySchema`.
- `shared/domain.ts`, `mobile/src/types/domain.ts` e
  `admin/src/types/domain.ts`: remover `isFeatured` da interface `Company`
  (os três arquivos devem continuar idênticos).
- `backend/src/scripts/seed.ts`, fixtures de teste e mocks: remover
  `isFeatured`; usar `plan` como única fonte.

### Listagem

- `backend/src/services/company.service.ts`:
  - `CompanyListFilters.featured` vira `plan?: unknown`.
  - `CompanyQuery` perde `isFeatured`.
  - O filtro `featured` e a leitura com `lerBooleano` saem do service.
  - O filtro `plan` usa `lerListaDeSlugs(filters.plan, { nome: 'plan' })` e
    valida cada item contra `free | basic | premium`; inválido → 400.
  - A condição vai em `$and` para não conflitar com o `$or` da busca textual.
    Quando `free` está na lista, inclui também documentos sem o campo:
    `{ $or: [{ plan: { $in: planos } }, { plan: { $exists: false } }] }`.
  - Nos dois ramos (com e sem `prioritize=plan`), remover `isFeatured` do
    sort; a ordenação passa a ser `{ name: 1 }`.
  - `prioritize=plan` permanece intacto.
- `backend/src/controllers/company.controller.ts`: repassar `plan` e remover
  `featured`.
- `backend/src/utils/guest.ts`: atualizar o comentário do discriminador de
  ponto turístico, que hoje cita `isFeatured`.

## Mobile

### Camada de dados

- `mobile/src/services/api.ts`:
  - `getCompanies(page, pageSize, city?, plans?: Plan[])` passa a enviar
    `plan=plans.join(',')`; no mock, filtra por `companyPlan`.
  - O fallback de mock também respeita `plans` (não devolve premium na lista
    de básico/free).
  - `getFeaturedCompanies(city?)` substitui `getFeaturedCompany`: busca
    `plan=premium` com `pageSize=50`, devolve `Company[]` e filtra
    defensivamente por `companyPlan`.
  - Fallback para mocks apenas quando a API não está configurada ou quando o
    transporte devolve `null` (rede/indisponível); resposta vazia bem-sucedida
    devolve lista vazia mesmo em desenvolvimento.
  - `ApiError` (401/403/4xx/5xx) é repropagado para o tratamento de sessão e
    erro da home; não vira mock.
  - Remover `MOCK_FEATURED_COMPANY` e todo uso de `isFeatured`.
- `mobile/src/data/mock.ts`: remover `isFeatured`; manter pelo menos uma
  empresa premium e adicionar uma básica para permitir a verificação manual da
  ordem básico > free.

### Home

- `mobile/src/features/home/use-home-data.ts`: `featuredCompany` vira
  `featuredCompanies: Company[]`.
- `mobile/src/app/(tabs)/index.tsx`:
  - consome `featuredCompanies`;
  - busca a lista secundária com
    `getCompanies(1, 50, undefined, ['basic', 'free'])`;
  - remove `excludeFeaturedCompany`, o `useMemo` de filtragem e a importação
    de `home-companies`;
  - renderiza `<FeaturedCompanies companies={featuredCompanies} />`.
- Novo `mobile/src/features/home/featured-companies.tsx`:
  - `FlatList` horizontal, seguindo o padrão do `CategoryList`;
  - card atual adaptado para largura fixa (aprox. 300), com `React.memo`,
    `keyExtractor` por `_id`, `renderItem` estável, `PlanBadge` e
    `accessibilityLabel`;
  - se não houver premium, não renderiza a seção.
- `mobile/src/features/home/other-companies.tsx`: sem mudança de lógica;
  continua usando `sortCompaniesByPlan` (básico antes de free). O premium não
  chega porque o backend filtra.
- Remover `featured-company.tsx`, `home-companies.ts` e
  `home-companies.test.ts` (sem uso após a mudança).

### Detalhe da empresa

- `mobile/src/features/company/company-free-view.ts`:
  `companyDetailVariant` retorna `'full'` quando
  `companyPlan(company) !== 'free'`; caso contrário, `'free'`.
- `mobile/src/features/company/company-details.ts`: o campo `isFeatured` de
  `CompanyDetails` vira `isPremium`, derivado de
  `companyPlan(company) === 'premium'`.
- `mobile/src/features/company/company-detail-screen.tsx`: o selo "Destaque"
  passa a usar `details.isPremium`; o `PlanBadge` continua exibindo o plano.
- Atualizar `company-free-view.test.ts` e `company-details.test.ts`.

## Admin

- Remover `isFeatured` de `admin/src/types/domain.ts`.
- Nenhuma tela nova: o formulário de empresa já edita
  `free | basic | premium` e chama `updateCompanyPlan`.

## Testes (TDD)

### Backend (primeiro)

Testes de integração em `backend/src/routes/`:

- `?plan=premium` devolve só premium.
- `?plan=basic,free` devolve básico + free.
- Empresa sem `plan` aparece no filtro `free`.
- `?plan=gold` → 400.
- `?plan=` vazio → sem filtro.
- `plan` repetido (`?plan=free&plan=premium`) → 400.
- Busca textual (`q`) combinada com `plan` continua filtrando os dois.

Ajustes:

- Remover/ajustar os testes de `featured` em
  `companies.category.test.ts` e `security.test.ts`.
- Remover `isFeatured` das fixtures de `guest.test.ts`.
- `companies.prioritize.test.ts` não muda.

### Mobile

- `company-free-view.test.ts`: `'full'` para básico e premium; `'free'` para
  free e plano ausente.
- `company-details.test.ts`: `isPremium` verdadeiro só para premium.
- Apagar `home-companies.test.ts` junto com o helper.
- O repo não usa RNTL; o carrossel é verificado por `npx expo export` e
  inspeção manual.

## Verificação

Como o trabalho toca `shared/` e os três apps, rodar o gate completo:

- backend: `npm run lint`, `npm run typecheck`, `npm test`.
- admin: `npm run lint`, `npm run typecheck`, `npm run build`.
- mobile: `npx expo lint`, `npm run typecheck`, `npm test`, grep de tipografia
  da §6.3 e `npx expo export`.

## Migração e riscos

- Documentos antigos com `isFeatured` deixam de ser lidos pelo Mongoose
  (strict); não é necessária migração de schema. Porém, empresa com
  `isFeatured=true` e `plan='free'` perde o destaque e a tela completa.
  Antes do deploy, revisar:
  `db.companies.countDocuments({ isFeatured: true, plan: { $ne: 'premium' } })`.
- O spec de monetização previa destaque premium "1x/semana"; este design
  deixa todas as premium sempre visíveis. Mudança intencional aprovada pelo
  usuário.
- O carrossel usa o mesmo teto de 50 itens da lista atual. Se o número de
  premium passar disso, será necessário paginar ou criar "Ver todas".
- A home continua com duas consultas de empresas (destaques + lista), sem
  requisição extra.
- `getCompanies` ganha um quarto parâmetro opcional; `map.tsx` e
  `my-company.tsx` não mudam.
- Clientes antigos que ainda enviarem `featured` terão o parâmetro ignorado
  (não é mais lido). O mobile é atualizado no mesmo release; não há outro
  consumidor conhecido.
- O admin não tem UI de `isFeatured` hoje; nenhum fluxo quebra.

## Critérios de sucesso

- Empresa premium aparece na seção "Empresas em Destaque" (carrossel) da home.
- Ao trocar premium → básico/free no admin, a empresa sai do carrossel e
  aparece em "Outras Empresas" (básico antes de free).
- Empresa básica e premium abrem a tela completa; free abre a tela enxuta.
- `isFeatured` não existe mais no contrato, no modelo, nos tipos nem nos
  mocks.
- Lint, typecheck, testes e build verdes nos três apps; `npx expo export`
  conclui sem erro.
