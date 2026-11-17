# Guia Comercial

Diretório de negócios da cidade. O morador abre o app e encontra o que procura
por perto: um serviço, uma promoção, uma vaga de emprego, a farmácia de plantão
do dia ou um aviso da prefeitura. O lojista mantém o próprio anúncio, horários
e promoções atualizados pelo painel administrativo (ou pelo app "Minha
Empresa"). Os dois conversam com a mesma API REST, que guarda tudo no MongoDB.

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

## Como rodar localmente

Pré-requisitos: Node.js 20+, npm 10+, MongoDB 7+ (local ou Atlas), **Redis 7+**
(opcional — o backend cai para in-memory sem `REDIS_URL`) e o **Expo Go** no
celular (Android/iOS) para desenvolvimento rápido.

```bash
# 0) Infra (opcional, recomendado para rate limit compartilhado)
cd backend && docker compose up -d redis

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

Para subir a API + Redis juntos via Docker:

```bash
cd backend && docker compose up -d --build
```

O app mobile **funciona sem o backend**: `src/services/api.ts` cai para os
dados mockados de `src/data/mock.ts` quando a API não responde. Em produção
(`__DEV__` false) o mock **não** é usado.

---

## Variáveis de ambiente

Cada app tem seu próprio `.env.example` (copie para `.env` e ajuste). As
variáveis principais:

- `backend/`: `PORT`, `MONGODB_URI`, `CORS_ORIGINS`, `NODE_ENV`,
  `CLERK_SECRET_KEY`/`CLERK_PUBLISHABLE_KEY`, `ADMIN_EMAILS`,
  `REDIS_URL`/`REDIS_PASSWORD` (opcionais, para rate limit compartilhado),
  `PUSH_CENTER_DISABLED`, `PUSH_CAMPAIGN_MAX_PER_HOUR`,
  `ANALYTICS_*_MAX_PER_HOUR`, `RATE_LIMIT_*`, `NOTIFY_SECRET`.
- `mobile/`: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- `admin/`: `VITE_API_URL`, `VITE_CLERK_PUBLISHABLE_KEY`.

> `.env` nunca é versionado. Nenhuma credencial no código.
>
> ⚠️ **Modo legado:** sem `CLERK_SECRET_KEY` o backend roda **sem
> verificação de identidade/role**. É modo de desenvolvimento apenas.

---

## Qualidade

```bash
cd backend && npm run lint && npm run typecheck && npm test
cd mobile  && npm run lint && npm run typecheck && npm test
cd admin   && npm run lint && npm run typecheck && npm test && npm run build
```

- **TDD** no backend: todo endpoint novo nasce com o teste do supertest
  falhando, depois o código, depois o refactor.
- Detalhes de processo para agentes de código: [`AGENTS.md`](./AGENTS.md).

---

## Seed de dados de desenvolvimento

```bash
cd backend && npm run seed          # idempotente
cd backend && npm run seed -- --reset  # recria do zero
```

Popula categorias, empresas, banners, cupons, vagas, avisos, utilidade
pública, cidades e turismo (atrações + eventos) de Castelo do Piauí.

---

## Licença

Ver [LICENSE](./LICENSE).