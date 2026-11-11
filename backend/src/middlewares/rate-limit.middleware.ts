import rateLimit from 'express-rate-limit';

export function createRateLimitMiddleware() {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000);
  const max = Number(process.env.RATE_LIMIT_MAX ?? 1000);
  return rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false });
}

/**
 * Limite mais apertado para o webhook do Clerk: é a única rota fora do
 * limiter global (fica antes dele no app.ts, para preservar o corpo bruto
 * exigido pela assinatura svix). Flood aqui não cria dados, mas cada
 * requisição dispara verificação de assinatura — cobra CPU do processo.
 */
export function createWebhookRateLimitMiddleware() {
  const windowMs = Number(process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS ?? 60 * 1000);
  const max = Number(process.env.WEBHOOK_RATE_LIMIT_MAX ?? 30);
  return rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false });
}
