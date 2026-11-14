import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { assertValidClerkConfiguration, assertValidRedisConfiguration, warnIfWithoutAuthentication } from './config/boot-check.js';
import { createAuthDeps, makeAuthMiddleware } from './middlewares/auth.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { notFoundHandler } from './middlewares/not-found.middleware.js';
import { createRateLimitMiddleware, createWebhookRateLimitMiddleware } from './middlewares/rate-limit.middleware.js';
import { createRoutes } from './routes/index.js';
import { clerkWebhook } from './routes/webhooks/clerk.js';

// Aviso de boot: em produção, ausência de CLERK_SECRET_KEY deixa a API aberta.
assertValidClerkConfiguration(process.env);
assertValidRedisConfiguration(process.env);
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

app.use(helmet({ noSniff: true }));

// O webhook do Clerk exige o corpo bruto byte-a-byte: express.json reparsaria
// o payload e a assinatura svix falharia. Por isso a rota fica antes do json.
// Limite próprio: é a única rota fora do limiter global (ver rate-limit.middleware.ts).
app.post('/api/webhooks/clerk', createWebhookRateLimitMiddleware(), express.raw({ type: 'application/json' }), clerkWebhook);

app.use(express.json({ limit: '1mb' }));

// Auth opcional (Clerk): montado ANTES do rate limit global para que o
// optionalAuth resolva a identidade (ou 401 para token inválido) antes de
// consumir o balde de rate limit. Risco aceito: um token inválido dispara a
// verificação do Clerk antes do limiter (brute-force mitigation futura).
// Em modo legado (sem CLERK_SECRET_KEY) nada é montado.
const authDeps = createAuthDeps();
if (authDeps) {
  app.use('/api', makeAuthMiddleware(authDeps).optionalAuth);
}

app.use('/api', createRateLimitMiddleware(), createRoutes(authDeps));

// 404 para rotas não tratadas; deve vir depois de todas as rotas.
app.use(notFoundHandler);

app.use(errorHandler);

export default app;
