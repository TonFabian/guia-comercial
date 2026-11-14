import type { RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import type { RedisReply } from 'rate-limit-redis';

import { getRedis } from '../config/redis.js';

/**
 * Cria o store do Redis para o rate limit, quando o cliente está disponível
 * no boot. Retorna `null` quando não há Redis (ou falha ao instanciar) — o
 * caller cai para o store em memória do próprio express-rate-limit.
 *
 * O store é criado uma única vez por chamada de fábrica (binding à
 * disponibilidade do Redis no boot). Se o Redis cair em runtime, o wrapper
 * degrada para o limiter em memória (ver `wrapWithFallback`).
 */
function buildRedisStore(): RedisStore | null {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return new RedisStore({
      // ioredis expõe `call` para comandos arbitrários.
      sendCommand: (...args: string[]) =>
        (redis as { call: (...a: string[]) => Promise<unknown> }).call(...args) as Promise<RedisReply>,
      prefix: 'rl:',
    });
  } catch (error) {
    console.warn('[rate-limit] falha ao criar store Redis, usando in-memory:', error);
    return null;
  }
}

function readEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  const value = Number(raw);
  if (!raw || Number.isNaN(value)) return fallback;
  return value;
}

/**
 * Chave do balde de rate limit:
 * - mutações (method !== 'GET') de usuário autenticado → clerkId;
 * - demais (GET e requisições sem sessão) → IP.
 */
function keyGenerator(req: Parameters<RequestHandler>[0]): string {
  const auth = (req as { auth?: { clerkId?: string } }).auth;
  if (req.method !== 'GET' && auth?.clerkId) {
    return `user:${auth.clerkId}`;
  }
  return req.ip ?? req.socket.remoteAddress ?? 'desconhecido';
}

function skipHealth(req: Parameters<RequestHandler>[0]): boolean {
  try {
    return new URL(req.originalUrl, 'http://localhost').pathname === '/api/health';
  } catch {
    return false;
  }
}

function createLimiter(windowMs: number, max: number, store: RedisStore | null) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: store ?? undefined,
    keyGenerator,
    skip: skipHealth,
    // Em caso de erro do store em runtime, o wrapper abaixo assume o fallback
    // in-memory; aqui não silenciamos para que o wrapper perceba o erro.
    passOnStoreError: false,
  });
}

function wrapWithFallback(primary: ReturnType<typeof rateLimit>, fallback: ReturnType<typeof rateLimit> | null): RequestHandler {
  if (!fallback) return primary as RequestHandler;
  const wrapped: RequestHandler = (req, res, next) => {
    primary(req, res, (err?: unknown) => {
      if (err) {
        // Degradação para in-memory quando o Redis falha em runtime.
        // Limitação: contadores já consumidos no Redis não são migrados.
        fallback(req, res, next);
        return;
      }
      next();
    });
  };
  return wrapped;
}

export function createRateLimitMiddleware() {
  const windowMs = readEnvNumber('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000);
  const max = readEnvNumber('RATE_LIMIT_MAX', 1000);

  const store = buildRedisStore();
  const primary = createLimiter(windowMs, max, store);
  const fallback = store ? createLimiter(windowMs, max, null) : null;

  return wrapWithFallback(primary, fallback);
}

/**
 * Limite mais apertado para o webhook do Clerk: é a única rota fora do
 * limiter global (fica antes dele no app.ts, para preservar o corpo bruto
 * exigido pela assinatura svix). Flood aqui não cria dados, mas cada
 * requisição dispara verificação de assinatura — cobra CPU do processo.
 */
export function createWebhookRateLimitMiddleware() {
  const windowMs = readEnvNumber('WEBHOOK_RATE_LIMIT_WINDOW_MS', 60 * 1000);
  const max = readEnvNumber('WEBHOOK_RATE_LIMIT_MAX', 30);

  const store = buildRedisStore();
  const primary = createLimiter(windowMs, max, store);
  const fallback = store ? createLimiter(windowMs, max, null) : null;

  return wrapWithFallback(primary, fallback);
}