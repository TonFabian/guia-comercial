import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { assertValidClerkConfiguration, warnIfWithoutAuthentication } from './config/boot-check.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { notFoundHandler } from './middlewares/not-found.middleware.js';
import { createRateLimitMiddleware, createWebhookRateLimitMiddleware } from './middlewares/rate-limit.middleware.js';
import routes from './routes/index.js';
import { clerkWebhook } from './routes/webhooks/clerk.js';

// Aviso de boot: em produção, ausência de CLERK_SECRET_KEY deixa a API aberta.
assertValidClerkConfiguration(process.env);
warnIfWithoutAuthentication(process.env);

const app = express();

/**
 * Trust proxy: ATIVAR apenas quando a API rodar atrás de proxy reverso
 * (nginx, Caddy, Cloudflare, load balancer). Sem isso, `req.ip` é o IP do
 * proxy — todos os clientes compartilhariam um único balde de rate limit
 * (429 em massa para usuários legítimos).
 *
 * Nunca ative sem proxy real: com `trust proxy` ligado a toa, o atacante
 * forja o header `X-Forwarded-For` e ganha um balde de rate limit por IP
 * forjado (bypass). Valor: nº de saltos confiáveis (1 para um proxy único).
 */
const trustProxy = process.env.TRUST_PROXY;
if (trustProxy) {
  app.set('trust proxy', trustProxy === 'true' ? 1 : Number(trustProxy));
}

// CORS restrito: origins permitidas vêm de CORS_ORIGINS (CSV no .env).
// Sem CORS_ORIGINS definida = ambiente de desenvolvimento permissivo
// (qualquer origin é aceita). Em produção, sempre defina CORS_ORIGINS.
const corsOrigins = process.env.CORS_ORIGINS;
app.use(
  cors(
    corsOrigins
      ? {
          origin: corsOrigins.split(',').map((origin) => origin.trim()).filter(Boolean),
        }
      : { origin: true },
  ),
);

app.use(helmet());

// O webhook do Clerk exige o corpo bruto byte-a-byte: express.json reparsaria
// o payload e a assinatura svix falharia. Por isso a rota fica antes do json.
// Limite próprio: é a única rota fora do limiter global (ver rate-limit.middleware.ts).
app.post('/api/webhooks/clerk', createWebhookRateLimitMiddleware(), express.raw({ type: 'application/json' }), clerkWebhook);

app.use(express.json({ limit: '1mb' }));

app.use('/api', createRateLimitMiddleware(), routes);

// 404 para rotas não tratadas; deve vir depois de todas as rotas.
app.use(notFoundHandler);

app.use(errorHandler);

export default app;
