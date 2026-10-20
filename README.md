# Guia Comercial

Repositório monorepo com três aplicações independentes:

| Pasta     | Aplicação                       | Stack                                              |
| --------- | ------------------------------- | -------------------------------------------------- |
| `mobile/` | App do guia (Expo Go)           | Expo SDK 58, React Native, TypeScript, Expo Router |
| `backend/`| API REST                        | Node.js, Express, TypeScript, MongoDB (Mongoose)   |
| `admin/`  | Painel administrativo web       | Vite, React, TypeScript                            |

Cada aplicação tem seu próprio `package.json` e dependências próprias.

## 1. Mobile (Expo Go)

```bash
cd mobile
npm install
npx expo start
```

Escaneie o QR code com o app **Expo Go** (Android/iOS).

- Telas: `mobile/src/app/` (Expo Router — cada arquivo é uma rota)
- Abas: Início, Buscar, Favoritos, Perfil (`mobile/src/components/app-tabs.tsx`)
- Paleta de cores: `mobile/src/constants/theme.ts` (`GuiaColors`)

## 2. Backend (API REST)

```bash
cd backend
npm install
cp .env.example .env   # configure MONGODB_URI
npm run dev            # http://localhost:4000/api/health
```

- Rotas: `backend/src/routes/` — controllers em `backend/src/controllers/`
- Models Mongoose: `backend/src/models/` (a criar por recurso)
- Produção: `npm run build && npm start`

## 3. Admin (painel web)

```bash
cd admin
npm install
npm run dev            # http://localhost:5173
```

Estrutura inicial — as telas de gerenciamento (empresas, categorias, anúncios,
banners, usuários) ainda não foram implementadas.

- API esperada: variável `VITE_API_URL` (ver `admin/.env.example`)

## Regras do repositório

- **Nunca** versionar arquivos `.env` (apenas `.env.example`).
- Dependências não são compartilhadas entre as aplicações.
- `.gitignore` da raiz cobre `node_modules`, `.env`, builds e gerados.
- Comandos do Expo sempre executados de dentro de `mobile/`.
