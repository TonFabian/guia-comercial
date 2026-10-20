# Backend — API REST

Servidor Express + TypeScript com conexão ao MongoDB (Mongoose).

## Estrutura

```
backend/
├── src/
│   ├── index.ts            # bootstrap do servidor
│   ├── app.ts              # instância do Express (middlewares + rotas)
│   ├── config/db.ts        # conexão com MongoDB
│   ├── controllers/        # handlers das rotas
│   ├── middlewares/        # middlewares globais (ex.: errorHandler)
│   ├── models/             # models Mongoose (a criar por recurso)
│   └── routes/             # definição das rotas (/api/*)
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

## Endpoints

| Método | Rota          | Descrição                |
| ------ | ------------- | ------------------------ |
| GET    | `/api/health` | Health check da API      |

Rotas de negócios (empresas, categorias, anúncios, banners, usuários) ainda
não foram implementadas — adicionar em `src/routes/` + `src/controllers/` +
`src/models/`.
