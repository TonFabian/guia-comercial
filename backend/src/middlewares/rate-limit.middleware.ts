import rateLimit from 'express-rate-limit';

export function createRateLimitMiddleware() {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000);
  const max = Number(process.env.RATE_LIMIT_MAX ?? 1000);
  return rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false });
}
