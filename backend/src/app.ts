import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { assertValidClerkConfiguration, warnIfWithoutAuthentication } from './config/boot-check.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { notFoundHandler } from './middlewares/not-found.middleware.js';
import routes from './routes/index.js';

// Aviso de boot: em produção, ausência de CLERK_SECRET_KEY deixa a API aberta.
assertValidClerkConfiguration(process.env);
warnIfWithoutAuthentication(process.env);

const app = express();

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
app.use(express.json({ limit: '1mb' }));

app.use('/api', routes);

// 404 para rotas não tratadas; deve vir depois de todas as rotas.
app.use(notFoundHandler);

app.use(errorHandler);

export default app;
