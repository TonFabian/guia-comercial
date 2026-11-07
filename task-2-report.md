# Task 2 — Rate limiting

- Instalado `express-rate-limit`.
- Middleware `src/middlewares/rate-limit.middleware.ts` lê `RATE_LIMIT_WINDOW_MS` (default 15min) e `RATE_LIMIT_MAX` (default 1000).
- Aplicado em `/api` em `app.ts`.
- Typecheck e 449 testes passando.
- Commit 0181981.
