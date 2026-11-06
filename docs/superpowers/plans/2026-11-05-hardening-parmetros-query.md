# Hardening de parâmetros de entrada (query string e body) — Plano

> Origem: auditoria de segurança de todas as queries do backend que recebem
> parâmetros do frontend. Objetivo declarado: **"não executar exatamente o que o
> usuário manda, sem nenhum filtro e/ou verificação"**.

**Branch:** `feature/modulo-turismo` (continuidade) · base: `7c2ff3f`

## 1. Diagnóstico da auditoria (resumo)

O parser de query do Express 5 é `simple` (`node_modules/express/lib/application.js:97`),
então `?category[$ne]=x` vira a chave literal `"category[$ne]"` e `?q=a&q=b` vira
**array**. O Mongoose 9 **não** sanitiza filtro (`backend/src/config/db.ts:10`).

- **0 vulnerabilidades de escrita/leitura indevida confirmadas** nos endpoints
  com filtro de query: os services narrow com `typeof === 'string'` e os
  bodies passam por `validateBody` (zod = allowlist).
- **1 ponto estruturalmente vulnerável (Alto, latente)**:
  `POST /api/push-tokens` — `body.token` cru num filtro Mongo
  (`backend/src/services/push-token.service.ts:4-8`), **sem `validateBody`** e
  com rota isenta de auth (`routes/index.ts:86-89`). Hoje o ataque falha só
  por `CastError` do Mongoose (defesa por acidente), e o `$set: { clerkId }`
  permite **sequestrar o token push de outra conta**.
- **1 bypass de filtro (Médio)**: parâmetro repetido vira array → o narrowing
  `typeof === 'string'` falha → **o filtro é descartado silenciosamente** e a
  API devolve **mais dados do que o pedido** (8 services).
- **Hardening (Médio)**: `page` sem teto (`skip` gigante), `q` sem teto de
  tamanho (regex cara), `owner` sem verificação de posse, `ownerClerkId`
  mass-assignável no DTO de autônomos, reviews sem paginação/`isValidObjectId`,
  `findById` sem `isValidObjectId` em avisos/cidades/autônomos.

## 2. Decisões (rulings)

| # | Decisão | Justificativa |
|---|---------|---------------|
| R1 | **Parâmetro malformado = 400 explícito** (array, objeto, tipo errado, acima do limite). Ausente = sem filtro | Fail-closed: o servidor deixa de executar o que não entende. O app atual nunca envia param repetido (envia `category=a,b`), então o contrato não quebra. |
| R2 | **Sanitização no service** (choke point da construção da query), não no controller | Protege qualquer chamador; o service já recebe filtros como `unknown`. Evita 12 controllers duplicando validação. |
| R3 | **`mongoose.set('sanitizeFilter', true)` NÃO será ativado** | O sanitizeFilter do mongoose transforma **qualquer** valor com chave `$` em `{ $eq: ... }` (`node_modules/mongoose/lib/helpers/query/sanitizeFilter.js`), o que quebraria os filtros legítimos `$gte` (vigência de eventos) e `$in: []` (categoria inválida → lista vazia). A proteção virá dos sanitizadores explícitos. |
| R4 | **`owner` só é aplicado quando coincide com `req.auth.clerkId`**; caso contrário 403 | Filtro "minhas empresas" não pode listar empresas de outro usuário. O app envia o próprio clerkId. |
| R5 | **Push token**: body validado por zod; token já registrado em outra conta → **409** (não sequestra) | `POST /api/push-tokens` é a única rota raw→filtro do repo. |
| R6 | Limites: `q` ≤ 120 chars, `page` ≤ 10 000, `pageSize` ≤ 100 (já existe), slugs ≤ 20 itens × 64 chars | Corta `skip` gigante e regex cara; `page` limitado ⇒ `skip` ≤ ~1M. |
| R7 | `ownerClerkId` sai do DTO público de autônomos | Mass assignment: o cliente escrevia o dono. O service já injeta o dono da sessão. |
| R8 | `/cities` mantém o array (contrato do cliente) mas com **limite duro** (500) | Paginar mudaria o shape quebrando mobile/admin. |

## 3. Tasks

### Task 1 — `backend/src/utils/query.ts` (sanitizadores centrais) + testes
- `lerTexto(v, { maxLength, minLength })` → `string | undefined`; só string; aparado; `\0` e controles removidos; vazio → undefined; acima do limite → **400**.
- `lerBooleano(v)` → `true | false | undefined`; só `'true'`/`'false'`; valor explícito inválido → **400**.
- `lerInteiro(v, { min, max })` → `number | undefined`; só string numérica; clamp; inválido → **400**.
- `lerListaDeSlugs(v, { maxItens, maxLength })` → `string[] | undefined`; aceita `a,b`; normaliza (minúsculo, sem acento, hífen); array → **400**.
- `lerEnum(v, valores)` → valor do enum; fora do enum → **400**.
- Erros: `Error` com `statusCode: 400` (convenção do repo).
- `parsePagination`: teto de `page` (10 000) e de `skip`; rejeita valores não numéricos explícitos.
- Testes unitários em `backend/src/utils/query.test.ts`.

### Task 2 — sanitizar TODOS os filtros dos services + regras extras
- `company.service.ts`: `category` (lista de slugs), `q` (texto ≤ 120), `featured` (booleano), `owner` (só o clerk da sessão → 403), `city` (slug).
- `coupon.service.ts`: `company` (ObjectId).
- `notice.service.ts`/`notice.controller.ts`: `active` (booleano).
- `public-utility.service.ts`: `category` (enum), `active`, `city`.
- `tourist-spot.service.ts` e `event.service.ts`: `category` (enum), `q`, `active`, `city`, `includePast`.
- `category.service.ts`, `job.service.ts`, `banner.service.ts`, `autonomous-professional.service.ts`, `user.service.ts`: sem filtros de texto hoje — verificar e manter.
- Extras: `ownerClerkId` fora do DTO; `GET /companies/:id/reviews` com `isValidObjectId` + limite; `isValidObjectId` nos `findById` de avisos/cidades/autônomos; `/cities` com limite 500.

### Task 3 — bodies: push-tokens e broadcast
- zod `pushTokenSchema` (string 1..500, sem espaços/controles) e `broadcastSchema` (title ≤ 120, body ≤ 500).
- `POST /api/push-tokens`: token de outra conta → **409**; token novo → upsert; `clerkId` do contexto (nunca do body).
- `POST /api/notifications/broadcast`: validação + limites.

### Task 4 — suíte de regressão de segurança (supertest)
- Para **todos** os endpoints com filtro: params maliciosos (`?category[$ne]=x`, `?category[a]=1`, `?q[$gt]=`, `?city[$in][]=x`, param repetido, `?page=1e15`, `?q=<1000 chars>`, `?active=xyz`) → **400** (ou, onde o contrato permitir, lista vazia) e **nunca** match-all, nunca 500.
- `POST /push-tokens` com `{"token":{"$ne":null}}` → 400; token de outra conta → 409.
- `POST /notifications/broadcast` com título gigante → 400.
- `GET /companies?owner=<outro clerkId>` → 403.
- `POST /autonomous-professionals` com `ownerClerkId` no body → campo ignorado.
- `GET /companies/:id/reviews` com id malformado → 404.

### Task 5 — docs + gates + revisão final
- README: seção "Parâmetros de entrada" (limites, erros 400, o que é ignorado).
- Gates dos três apps (backend muda; mobile/admin apenas smoke de contrato).
- Revisão de branch do hardening.

## 4. Global Constraints

- TDD em todas as tasks; sem `any`; strict; português; sem `console.log`.
- Conventional Commits + trailer `Generated-by`.
- Não quebrar os clientes (mobile/admin) — o contrato de query só *restringe* o que é aceito.
