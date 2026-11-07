# Backend — API REST

Servidor Express 5 + TypeScript com conexão ao MongoDB (Mongoose 9).

## Estrutura

```
backend/
├── src/
│   ├── index.ts            # bootstrap do servidor
│   ├── app.ts              # instância do Express (middlewares + rotas)
│   ├── config/             # db, boot-check
│   ├── controllers/        # handlers das rotas
│   ├── middlewares/        # auth, guest, error, not-found
│   ├── models/             # models Mongoose
│   ├── routes/             # definição das rotas (/api/*)
│   ├── services/           # regras de negócio
│   ├── types/              # DTOs zod + tipos
│   ├── utils/              # helpers puros
│   └── scripts/            # seed, grant-test-role
├── .env.example
└── package.json
```

## Como executar

```bash
cd backend
npm install
cp .env.example .env   # configure MONGODB_URI
npm run dev            # desenvolvimento (tsx watch)
npm run build          # gera dist/
npm start              # produção (requer build)
```

## Scripts

- `npm run lint` — ESLint
- `npm run typecheck` — tsc --noEmit
- `npm test` — Vitest

## Endpoints

Rotas sob `/api/*` (health, auth, companies, categories, banners, coupons, events, jobs, notices, reviews, users, cities, tourist-spots, public-utilities, autonomous-professionals, push-tokens). Veja `src/routes/index.ts`.

## Convenções

- Camadas: `routes → controllers → services → models`.
- Validação de entrada com zod em `src/types/dto.ts`.
- Paginação via `parsePagination` → `Paginated<T>`.
- Erros: `statusCode` em services; `errorHandler` com 4 parâmetros.
