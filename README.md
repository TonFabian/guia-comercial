# Guia Comercial

Diretório de negócios da cidade. O morador abre o app e encontra o que procura
por perto: um serviço, uma promoção, uma vaga de emprego, a farmácia de plantão
do dia ou um aviso da prefeitura. O lojista, por sua vez, mantém o próprio
anúncio, horários e promoções atualizados pelo painel administrativo (ou pelo
app "Minha Empresa"). Os dois conversam com a mesma API REST, que guarda tudo
no MongoDB.

```text
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
| `mobile/`  | App do guia (Android/iOS/web)    | Expo SDK 58, React Native 0.88, React 19, Expo Router |
| `backend/` | API REST                        | Node.js, Express 5, TypeScript, MongoDB (Mongoose 9)  |
| `admin/`   | Painel administrativo web       | Vite 7, React 19, TypeScript                          |
| `shared/`  | Tipos de domínio compartilhados | TypeScript (apenas tipos, sem runtime)                |

Cada aplicação tem `package.json`, `package-lock.json` e `node_modules` próprios.
**Não existem workspaces npm**: nada é instalado na raiz.

As regras de estrutura, boas práticas e processo de trabalho (inclusive para
agentes de código) estão em [`AGENTS.md`](./AGENTS.md).

---

## O que o app faz (mobile)

- **Home** — cabeçalho com cidade, busca, categorias rápidas, empresa em
  destaque, "Outras Empresas" (listagem gratuita), promoções/banners, telefones
  úteis (polícia, hospital, coleta de lixo), vagas, profissionais autônomos,
  mural de avisos e CTA "Anuncie no Guia".
- **Busca** — filtros combinados de categoria, "aberto agora", "perto de mim"
  (GPS), paginação com "Carregar mais", busca por voz (Web Speech API / dev
  build nativo).
- **Detalhe da empresa** — WhatsApp, ligar, rota, site, redes sociais,
  compartilhar, galeria, horários, avaliações.
- **Favoritos** — persistidos localmente e sincronizados com o backend por
  usuário autenticado.
- **Perfil** — "Meus dados" (nome, sobrenome, telefone, foto, bairro),
  "Minha empresa" (horários, promoção, contatos), "Configurações" (tema
  claro/escuro, preferências de notificação, suporte via WhatsApp, termos de
  uso, versão do app), "Sair" (com confirmação em modal, volta ao modo
  convidado).
- **Autenticação** — Clerk (Google/e-mail) + modo convidado persistido
  (AsyncStorage). Convidados não veem contatos comerciais nem códigos de cupom.
- **Mapa** — pins das empresas com "Como chegar".
- **Turismo & Eventos** — seção na Home (aparece só quando há atração ou
  evento ativo na cidade), telas de detalhe de atração ("o que fazer") e de
  evento (período, contato), e os chips "Atrações"/"Eventos" na busca: a
  busca mesclada passa a listar empresas, atrações e eventos em seções.
- **Anuncie no Guia** — tela de contato comercial.

## O que o painel faz (admin)

- CRUD de **empresas**, **categorias**, **banners**, **cupons**, **vagas**,
  **avisos** (mural), **cidades**, **utilidade pública** e do módulo
  **Turismo**: seções "Atrações" (pontos turísticos) e "Eventos" (rotina
  temporária; a listagem exibe também eventos já encerrados).
- Edição inline com busca e paginação server-side por seção.
- **Usuários** em leitura (nome, e-mail, role, cidade).
- Autenticação via Clerk com allowlist de admins (`ADMIN_EMAILS`).

## O que a API faz (backend)

- CRUD REST para todas as entidades acima, com paginação (`page`/`pageSize`),
  filtros (`category`, `q`, `featured`, `owner`, `city`, `active`) e validação
  zod na borda.
- Autenticação/autorização por recurso: dono ou admin para empresas e
  profissionais autônomos; admin para o restante.
- **Turismo** — entidades `TouristSpot` (atração permanente) e `TourEvent`
  (festival, feira, show...). O evento fica visível do cadastro até o fim de
  `endDate` (data pura `YYYY-MM-DD`); o painel usa `?includePast=true` na
  listagem para ver os eventos já encerrados. Os contatos (phone/whatsapp)
  de atração e evento entram na redação de convidado; o endereço é público.
- Redação de dados sensíveis para convidados (phone/whatsapp/address/code).
- Seed idempotente de dados de exemplo (`npm run seed`, `--reset`).
- Notificações push (Expo) disparadas ao publicar promoção e ao criar evento.

---

## Início rápido

Pré-requisitos: Node.js 20+, npm 10+, MongoDB 7+ (local ou Atlas) e o
**Expo Go** no celular (Android/iOS) para desenvolvimento rápido (ou dev build
para recursos nativos como voz).

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
está configurada. Em produção (`__DEV__` false) o mock **não** é usado — a
tela mostra estado vazio/erro.

---

## Variáveis de ambiente

| App        | Variável              | Padrão                                        | Descrição                                                 |
| ---------- | --------------------- | --------------------------------------------- | --------------------------------------------------------- |
| `backend/` | `PORT`                | `4000`                                        | porta HTTP                                                |
| `backend/` | `MONGODB_URI`         | `mongodb://localhost:27017/guia-comercial`    | conexão com o banco                                       |
| `backend/` | `CORS_ORIGINS`        | `http://localhost:8081,http://localhost:5173` | CSV de origins permitidas (vazio = permissivo, só dev)    |
| `backend/` | `NODE_ENV`            | `development`                                 | `production` oculta mensagens de erro                     |
| `backend/` | `CLERK_SECRET_KEY`    | —                                             | habilita autenticação (sem ela, modo legado sem auth)     |
| `backend/` | `CLERK_PUBLISHABLE_KEY` | —                                           | par da chave acima                                        |
| `backend/` | `ADMIN_EMAILS`        | —                                             | CSV de e-mails que viram `role: admin`                    |
| `backend/` | `NOTIFY_SECRET`       | —                                             | segredo para `POST /notifications/broadcast` (opcional)   |
| `mobile/`  | `EXPO_PUBLIC_API_URL` | `http://localhost:4000/api`                   | base da API (prefixo `EXPO_PUBLIC_` é injetado no bundle) |
| `mobile/`  | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | —                           | chave pública do Clerk                                    |
| `admin/`   | `VITE_API_URL`        | `http://localhost:4000/api`                   | base da API                                               |
| `admin/`   | `VITE_CLERK_PUBLISHABLE_KEY` | —                              | chave pública do Clerk                                    |

> `.env` nunca é versionado — só `.env.example`. Nenhuma credencial no código.

---

## API REST

Base: `http://localhost:4000/api`

| Método         | Rota                             | Descrição                                              |
| -------------- | -------------------------------- | ------------------------------------------------------ |
| GET            | `/health`                        | status do serviço                                      |
| GET            | `/categories`                    | lista paginada de categorias                           |
| POST/GET/PUT/DELETE | `/categories/:id`           | manipula categoria                                     |
| GET            | `/cities`                        | lista de cidades                                       |
| POST/DELETE    | `/cities/:id`                    | cria/remove cidade                                     |
| GET            | `/companies`                     | lista paginada de empresas                             |
| POST           | `/companies`                     | cria empresa                                           |
| GET            | `/companies/:id`                 | empresa por id                                         |
| PUT/DELETE     | `/companies/:id`                 | atualiza/remove empresa (dono ou admin)                |
| GET            | `/companies/:id/reviews`         | avaliações da empresa                                  |
| POST           | `/companies/:id/reviews`         | cria avaliação                                         |
| GET            | `/banners`                       | lista paginada de banners (ordenada por `order`)       |
| POST/GET/PUT/DELETE | `/banners/:id`              | manipula banner                                        |
| GET            | `/coupons`                       | cupons (com empresa populada)                          |
| POST/GET/PUT/DELETE | `/coupons/:id`              | manipula cupom                                         |
| GET            | `/jobs`                          | vagas (com empresa populada)                           |
| POST/GET/PUT/DELETE | `/jobs/:id`                 | manipula vaga                                          |
| GET            | `/autonomous-professionals`      | profissionais autônomos                                |
| POST/GET/PUT/DELETE | `/autonomous-professionals/:id` | manipula profissional (dono ou admin)               |
| GET            | `/notices`                       | mural de avisos (`?active=true` filtra vencidos)       |
| POST/GET/PUT/DELETE | `/notices/:id`              | manipula aviso (admin)                                 |
| GET            | `/public-utilities`              | telefones úteis (`?active=true`, `?category=`, `?city=`) |
| POST/GET/PUT/DELETE | `/public-utilities/:id`     | manipula utilidade pública (admin)                     |
| GET            | `/tourist-spots`                 | atrações turísticas (filtros: `city`, `category`, `active`) |
| POST/GET/PUT/DELETE | `/tourist-spots/:id`        | manipula atração (admin)                               |
| GET            | `/events`                        | eventos (filtros: `city`, `category`, `active`, `includePast`) |
| POST/GET/PUT/DELETE | `/events/:id`               | manipula evento (admin)                                |
| GET            | `/users`                         | usuários do app (admin, paginado)                      |
| GET            | `/me`                            | perfil do usuário autenticado                           |
| PUT            | `/me`                            | atualiza perfil (nome, sobrenome, telefone, foto, prefs) |
| POST           | `/push-tokens`                   | registra token de push                                 |
| POST           | `/notifications/broadcast`       | dispara notificação push (admin/segredo)               |
| POST           | `/auth/guest`                    | handshake de convidado                                 |

**Query de listagem** — `page` (≥1), `pageSize` (1–100, padrão 20). Em
`/companies` também: `category` (slug ou vários separados por vírgula), `q`
(busca em nome/descrição/endereço/serviços) e `featured` (`true`/`false`).
Em `/tourist-spots` e `/events`: `city`, `category` e `active`; em
`/events`, `includePast=true` inclui os eventos já encerrados (uso do painel).

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
| `401`  | não autenticado (quando Clerk configurado)                                  |
| `403`  | sem permissão (não-admin ou não-dono)                                       |
| `404`  | recurso inexistente ou id malformado                                        |
| `409`  | chave duplicada (slug já existe)                                            |
| `422`  | payload inválido (detalhes em `details`)                                    |
| `500`  | erro inesperado (mensagem detalhada só em dev)                              |

Erros sempre em JSON: `{ "error": "mensagem" }` (+ `message` em dev).

---

## Convenções de código

### Backend — camadas

```text
route → controller (HTTP) → service (regra de negócio) → model (Mongoose)
```

- **Controller** faz só HTTP: valida (zod), chama o service, responde. Sem
  acesso direto ao banco.
- **Service** concentra a regra de negócio e o acesso a dados; erros de
  domínio são lançados com `statusCode`.
- **Model** só declara o schema. `slug` é único e indexado; `timestamps`
  gerencia `createdAt`/`updatedAt`.
- **Validação** é sempre no servidor, com schema zod em `types/dto.ts`.
- `asyncHandler` encapsula handlers async; no Express 5 rejeições de promise já
  chegam ao `errorHandler` (que **precisa ter 4 parâmetros** para ser
  reconhecido pelo Express).
- **Autorização centralizada**: middleware `requireAuthIfConfigured` (mutações)
  + `assertOwner`/`assertAdmin` nos services (defesa em profundidade).

### Mobile — features e tokens

- `src/app/` = rotas apenas (Expo Router). **Cada arquivo é uma tela**; a
  rota compõe subcomponentes de `src/features/<feature>/`. **Proibido criar
  shims/wrappers de uma linha** (anti-padrão — ver `AGENTS.md` §6.2).
- `src/features/<feature>/` = componentes, hooks, helpers puros e testes.
- `src/services/api.ts` = **única** porta de entrada para dados HTTP.
- `src/constants/theme.ts` = tokens de design; cor hex fora do theme é erro.
- Componentes são funcionais, tipados, sem `any`, com `StyleSheet.create`.

### Admin — cliente tipado

- `src/services/api.ts` expõe `apiGet/apiPost/apiPut/apiDelete` com `ApiError`.
- Seções extraídas em `src/components/sections/`. `App.tsx` fica fino.
- Endpoint não implementado **lança erro explícito** — nunca finja que funciona.

### Tipos compartilhados

`shared/domain.ts` é a fonte da verdade (`Category`, `Company`, `Banner`,
`Coupon`, `Job`, `User`, `Notice`, `PublicUtility`, `City`,
`AutonomousProfessional`, `TouristSpot`, `TourEvent`, `Paginated<T>`, …). O
backend importa esse arquivo diretamente; mobile e admin mantêm uma cópia
local idêntica em `src/types/domain.ts`. **Ao alterar os tipos, reflita nas
cópias.**

---

## Qualidade

Cada app tem seus próprios gates:

```bash
cd backend && npm run lint && npm run typecheck && npm test && npm run build
cd mobile  && npm run lint && npm run typecheck && npx expo export
cd admin   && npm run lint && npm run typecheck && npm run build
```

| App     | Lint          | Typecheck      | Testes             | Build         |
| ------- | ------------- | -------------- | ------------------ | ------------- |
| backend | ESLint (flat) | `tsc --noEmit` | vitest + supertest  | `tsc`         |
| mobile  | `expo lint`   | `tsc --noEmit` | vitest (143 testes) | `expo export` |
| admin   | ESLint (flat) | `tsc --noEmit` | —                  | `vite build`  |

- **TDD** no backend: todo endpoint novo nasce com o teste do supertest
  falhando, depois o código, depois o refactor.
- Cobertura de teste hoje: **158 testes no backend** (21 arquivos) e
  **143 testes no mobile** (15 arquivos).
- Formatação: `.prettierrc` na raiz (printWidth 100, aspas simples, trailing
  comma, ponto e vírgula).

---

## Roadmap

- [x] Autenticação e autorização no backend (Clerk) e no admin
- [x] Telas de CRUD no admin (empresas, categorias, banners, cupons, vagas, avisos, cidades, utilidade pública, usuários)
- [x] Detalhe de empresa e favoritos no app (com estado persistente)
- [x] Testes unitários no backend e no mobile
- [x] CI local com lint + typecheck + testes nos três apps
- [x] Seed de dados de exemplo para desenvolvimento
- [x] App para lojistas (atualizar horário/promoções em tempo real)
- [x] Módulo Turismo (pontos turísticos e eventos: API, app, painel e seed)
- [ ] Multi-cidade (hoje hardcoded "Castelo do Piauí")
- [ ] Integração WhatsApp Business — descartada por enquanto (hoje apenas deep link `wa.me`)

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

## Seed de dados de desenvolvimento

O banco de dados fica vazio de primeira. Para popular todas as coleções
(`categories`, `companies`, `banners`, `coupons`, `jobs`, `notices`,
`public_utilities`, `cities`, `touristspots`, `events`), rode:

```bash
cd backend
npm run seed
```

O script é **idempotente**: pode ser executado mais de uma vez sem duplicar
dados (upsert por chave natural — `slug`, `code`, `title`). Para começar do
zero em vez disso:

```bash
npm run seed -- --reset
```

**O que ele insere:** 6 categorias, 5 empresas em destaque (inclusive a
farmácia de plantão "Drogaria Popular"), 3 banners, 3 cupons, 4 vagas, 3
avisos, 4 serviços de utilidade pública (polícia, hospital, coleta de lixo)
e o turismo de Castelo do Piauí: 4 atrações (Parque Natural Municipal Pedra
do Castelo, Cânion do Rio Poti, Cachoeiras do Rio Poti e Palácio dos
Viscondes de Parnaíba) e 2 eventos (Cânyon Fest Poti — futuro — e Feira do
Rio Poti). O seed é idempotente por upsert: a Feira do Rio Poti é criada
com as datas do **primeiro** seed do ano (`$setOnInsert`) — reseedar no
mesmo ano **não** renova as datas, então a feira "vence" e some da listagem.
Para renovar: `npm run seed -- --reset` (recria com as datas de hoje) ou
ajuste o documento do evento.

Depois do seed, a home do app mobile exibe os mesmos dados que a master
(mocks), porque os slugs e os títulos são os mesmos usados em
`mobile/src/data/mock.ts`.

## Licença

Ver [LICENSE](./LICENSE).