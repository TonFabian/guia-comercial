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

## Rate limiting e proteção contra DoS/DDoS

A aplicação tem **três camadas de limitação**, todas por IP (`req.ip`):

| Camada | Onde | Limite padrão | Env |
| --- | --- | --- | --- |
| **Global** (`express-rate-limit`) | `app.ts`, montado em `/api/*` (cobre todas as rotas de API) | **600 req / 15 min** por IP (≈ 40 req/min) — calibrado para navegação legítima: a home dispara ~12 GETs por carregamento, e um usuário passeando por várias telas nunca deve tomar 429. Default do código (sem env) é 1000/15min | `RATE_LIMIT_WINDOW_MS` (ms), `RATE_LIMIT_MAX` |
| **Webhook do Clerk** | `POST /api/webhooks/clerk` (única rota fora do global, por exigir corpo bruto para a assinatura svix) | 30 req/min por IP | `WEBHOOK_RATE_LIMIT_WINDOW_MS`, `WEBHOOK_RATE_LIMIT_MAX` |
- **Analytics anti-inflação** (dedup em memória) | `POST /api/companies/:id/view` e `POST /api/companies/:id/whatsapp-click` | `view`: **1 / empresa / IP / hora**; `whatsapp-click`: **5 / empresa / IP / hora** | `ANALYTICS_VIEW_MAX_PER_HOUR`, `ANALYTICS_CLICK_MAX_PER_HOUR` |

Detalhes e limitações:

- **Os limites de analytics NÃO limitam navegação**: os 5/hora são de *cliques de WhatsApp na mesma empresa* (e 1/hora é de *views da mesma empresa*) — métrica vendida ao lojista, onde clicar 5× na mesma empresa em 1h já é anomalia/inflação. GETs de navegação (home, busca, detalhes) passam pelo limite global, nunca por este.

- **Cobertura**: a aplicação inteira sob `/api/*` está coberta pelo limite global — inclusive
  `GET /health`. As respostas de estouro são `429` com headers padrão
  (`RateLimit-*`); não há `X-RateLimit-*` legado.
- **Store em memória**: os três limiters usam armazenamento em memória do processo.
  Funciona para um nó único; **não compartilha estado entre instâncias** (cada réplica
  tem seu próprio balde) e reseta a cada reinício. Para multi-instância, trocar o store
  por Redis (`rate-limit-redis`) — decisão pendente de necessidade real.
- **Trust proxy** (`TRUST_PROXY`): definir **apenas** com proxy reverso real na frente
  (nginx, Cloudflare, load balancer) — senão todos os clientes compartilham o IP do
  proxy e legítimos tomam 429 em massa. Nunca ativar sem proxy: o atacante forja
  `X-Forwarded-For` e ganha um balde por IP forjado.
- **DoS/DDoS**: rate limit na aplicação mitiga abuso de **clientes individuais** e
  bombamento de métricas, mas **não** substitui proteção de infraestrutura. Contra
  DDoS volumétrico, a defesa fica na borda: provedor de hospedagem (escala
  automática/WAF), CDN com mitigação (Cloudflare etc.) e proxy reverso com limites
  de conexão. Recomendação de produção: API atrás de proxy/CDN com `TRUST_PROXY`
  configurado, e o limiter da aplicação como segunda linha.
- **Sem PII**: nenhuma camada persiste IP — o `req.ip` é usado apenas como chave
  em memória, nunca gravado em banco nem em log.
