# Guia Comercial

Diretório de negócios da cidade. O morador abre o app e encontra o que procura
por perto: um serviço, uma promoção, uma vaga de emprego ou a farmácia de
plantão do dia. O lojista, por sua vez, mantém o próprio anúncio e os destaques
atualizados pelo painel administrativo. Os dois conversam com a mesma API REST,
que guarda tudo no MongoDB.

```
┌──────────────┐        ┌──────────────┐
│   mobile/    │───────▶│              │
│  (Expo/RN)   │  HTTP  │   backend/   │──────▶ MongoDB
└──────────────┘        │  (Express)   │
                        │              │
┌──────────────┐        │              │
│   admin/     │───────▶│              │
│  (Vite/React)│  HTTP  └──────────────┘
└──────────────┘
```

| Pasta      | Aplicação                       | Stack                                                 |
| ---------- | ------------------------------- | ----------------------------------------------------- |
| `mobile/`  | App do guia (Expo Go)           | Expo SDK 58, React Native 0.88, React 19, Expo Router |
| `backend/` | API REST                        | Node.js, Express 5, TypeScript, MongoDB (Mongoose 9)  |
| `admin/`   | Painel administrativo web       | Vite 7, React 19, TypeScript                          |
| `shared/`  | Tipos de domínio compartilhados | TypeScript (apenas tipos, sem runtime)                |

Cada aplicação tem `package.json`, `package-lock.json` e `node_modules` próprios.
**Não existem workspaces npm**: nada é instalado na raiz.

As regras de estrutura, boas práticas e processo de trabalho (inclusive para
agentes de código) estão em [`AGENTS.md`](./AGENTS.md).

---

## Início rápido

Pré-requisitos: Node.js 20+, npm 10+, MongoDB 7+ (local ou Atlas) e o
**Expo Go** no celular (Android/iOS).

```bash
# 1) API
cd backend && npm install && cp .env.example .env && npm run dev
#    http://localhost:4000/api/health

# 2) App (em outro terminal)
cd mobile && npm install && cp .env.example .env && npx expo start
#    leia o QR code com o Expo Go

# 3) Painel (opcional)
cd admin && npm install && cp .env.example .env && npm run dev
#    http://localhost:5173
```

O app mobile **funciona sem o backend**: `src/services/api.ts` cai para os
dados mockados de `src/data/mock.ts` quando a API não responde ou a URL não
está configurada. Isso mantém o UX completo durante o desenvolvimento e
permite demonstrating o app sem infraestrutura.

---

## Variáveis de ambiente

| App        | Variável              | Padrão                                        | Descrição                                                 |
| ---------- | --------------------- | --------------------------------------------- | --------------------------------------------------------- |
| `backend/` | `PORT`                | `4000`                                        | porta HTTP                                                |
| `backend/` | `MONGODB_URI`         | `mongodb://localhost:27017/guia-comercial`    | conexão com o banco                                       |
| `backend/` | `CORS_ORIGINS`        | `http://localhost:8081,http://localhost:5173` | CSV de origins permitidas (vazio = permissivo, só dev)    |
| `backend/` | `NODE_ENV`            | `development`                                 | `production` oculta mensagens de erro                     |
| `mobile/`  | `EXPO_PUBLIC_API_URL` | `http://localhost:4000/api`                   | base da API (prefixo `EXPO_PUBLIC_` é injetado no bundle) |
| `admin/`   | `VITE_API_URL`        | `http://localhost:4000/api`                   | base da API                                               |

> `.env` nunca é versionado — só `.env.example`. Nenhuma credencial no código.

---

## API REST

Base: `http://localhost:4000/api`

| Método         | Rota              | Descrição                                        |
| -------------- | ----------------- | ------------------------------------------------ |
| GET            | `/health`         | status do serviço                                |
| GET            | `/categories`     | lista paginada de categorias                     |
| POST           | `/categories`     | cria categoria (`name`, `slug`, `icon?`)         |
| GET            | `/categories/:id` | categoria por id                                 |
| PUT            | `/categories/:id` | atualiza categoria                               |
| DELETE         | `/categories/:id` | remove categoria                                 |
| GET            | `/companies`      | lista paginada de empresas                       |
| POST           | `/companies`      | cria empresa                                     |
| GET            | `/companies/:id`  | empresa por id                                   |
| PUT            | `/companies/:id`  | atualiza empresa                                 |
| DELETE         | `/companies/:id`  | remove empresa                                   |
| GET            | `/banners`        | lista paginada de banners (ordenada por `order`) |
| POST           | `/banners`        | cria banner                                      |
| GET/PUT/DELETE | `/banners/:id`    | manipula banner                                  |
| GET            | `/coupons`        | cupons (com empresa populada)                    |
| POST           | `/coupons`        | cria cupom                                       |
| GET/PUT/DELETE | `/coupons/:id`    | manipula cupom                                   |
| GET            | `/jobs`           | vagas (com empresa populada)                     |
| POST           | `/jobs`           | cria vaga                                        |
| GET/PUT/DELETE | `/jobs/:id`       | manipula vaga                                    |

**Query de listagem** — `page` (≥1), `pageSize` (1–100, padrão 20). Em
`/companies` também: `category` (slug), `q` (busca em nome/descrição) e
`featured` (`true`/`false`).

**Formato de resposta**

```jsonc
// listagem
{ "items": [ /* ... */ ], "total": 42, "page": 1, "pageSize": 20 }

// item único
{ "_id": "66f...", "name": "Restaurante Sabor & Arte", "slug": "restaurante-sabor-arte", /* ... */ }
```

**Códigos de erro**

| Código | Quando                                                                      |
| ------ | --------------------------------------------------------------------------- |
| `400`  | dados inválidos (Mongoose ValidationError ou ZodError não tratado na borda) |
| `404`  | recurso inexistente ou id malformado                                        |
| `409`  | chave duplicada (slug já existe)                                            |
| `422`  | payload inválido (detalhes em `details`)                                    |
| `500`  | erro inesperado (mensagem detalhada só em dev)                              |

Erros sempre em JSON: `{ "error": "mensagem" }` (+ `message` em dev).

---

## Convenções de código

### Backend — camadas

```
route → controller (HTTP) → service (regra de negócio) → model (Mongoose)
```

- **Controller** faz só HTTP: valida (zod), chama o service, responde. Sem
  acesso direto ao banco.
- **Service** concentra a regra de negócio e o acesso a dados; erros de
  domínio são lançados com `statusCode` (`throw Object.assign(new Error(...), { statusCode: 404 })`).
- **Model** só declara o schema. `slug` é único e indexado; `timestamps`
  gerencia `createdAt`/`updatedAt`.
- **Validação** é sempre no servidor, com schema zod em `types/dto.ts`.
- `asyncHandler` encapsula handlers async; no Express 5 rejeições de promise já
  chegam ao `errorHandler` (que **precisa ter 4 parâmetros** para ser
  reconhecido pelo Express).

### Mobile — features e tokens

- `src/app/` = rotas apenas (Expo Router). Tela = composição fina.
- `src/features/<feature>/` = componentes e hooks de uma feature.
- `src/services/api.ts` = **única** porta de entrada para dados HTTP.
- `src/constants/theme.ts` = tokens de design; cor hex fora do theme é erro.
- Componentes são-functionais, tipados, sem `any`, com `StyleSheet.create`
  no próprio arquivo.

### Admin — cliente tipado

- `src/services/api.ts` expõe `apiGet/apiPost/apiPut/apiDelete` com `ApiError`.
- Endpoints de recurso ainda são scaffold: lançam "não implementado" em vez de
  fingir que funcionam.

### Tipos compartilhados

`shared/domain.ts` é a fonte da verdade (`Category`, `Company`, `Banner`,
`Coupon`, `Job`, `User`, `Paginated<T>`). O backend importa esse arquivo
diretamente; mobile e admin mantêm uma cópia local idêntica em
`src/types/domain.ts` (marcada com "fonte da verdade"), porque o Metro e o
bundle do Vite não resolvem imports fora da raiz do projeto com segurança.
**Ao alterar os tipos, reflita nas cópias.**

---

## Qualidade

Cada app tem seus próprios gates:

```bash
cd backend && npm run lint && npm run typecheck && npm test && npm run build
cd mobile  && npm run lint && npm run typecheck
cd admin   && npm run lint && npm run typecheck && npm run build
```

| App     | Lint          | Typecheck      | Testes             | Build         |
| ------- | ------------- | -------------- | ------------------ | ------------- |
| backend | ESLint (flat) | `tsc --noEmit` | vitest + supertest | `tsc`         |
| mobile  | `expo lint`   | `tsc --noEmit` | — (a adicionar)    | `expo export` |
| admin   | ESLint (flat) | `tsc --noEmit` | — (a adicionar)    | `vite build`  |

- Formatação: `.prettierrc` na raiz (printWidth 100, aspas simples, trailing
  comma, ponto e vírgula).
- **TDD** no backend: todo endpoint novo nasce com o teste do supertest
  falhando, depois o código, depois o refactor.
- Cobertura de teste hoje: health, 404, mapeamento de erros e o middleware de
  erro (10 testes em 2 arquivos).

---

## Roadmap

- [ ] Autenticação e autorização no backend (JWT) e no admin
- [ ] Telas de CRUD no admin (empresas, categorias, banners, cupons, usuários)
- [ ] Detalhe de empresa e favoritos no app (com estado persistente)
- [ ] Testes unitários e de componente no mobile e no admin
- [ ] CI com lint + typecheck + testes nos três apps
- [ ] Seed de dados de exemplo para desenvolvimento

---

## Regras do repositório

- **Nunca** versionar `.env` (só `.env.example`) e nunca escrever segredo no
  código.
- Dependências são instaladas **na pasta do app que as usa**; nunca na raiz.
- Comandos do Expo rodam de dentro de `mobile/`.
- `ios/` e `android/` não existem (Continuous Native Generation): nunca criar
  ou editar manualmente — configure em `app.json` e config plugins.
- Commits seguem [Conventional Commits](https://www.conventionalcommits.org/).
- Commits de agente devem incluir o trailer `Generated-by: <agente> (<modelo>)`.
- `.gitignore` da raiz cobre `node_modules`, `.env`, builds e gerados.
- Detalhes de processo para agentes de código: [`AGENTS.md`](./AGENTS.md).

## Licença

Ver [LICENSE](./LICENSE).
