import type { Request, RequestHandler, Response } from 'express';

import { getRedis } from '../config/redis.js';
import { incrComTtl, limparRateLimitRedis } from '../config/rate-limit-redis.js';

/**
 * Rate limit de criação de campanhas de push por admin (Push Center).
 * Janela de 1 hora, limite configurável via `PUSH_CAMPAIGN_MAX_PER_HOUR`
 * (default 10). A chave é por admin (`campanha:${clerkId}`), com fallback
 * para IP quando não há sessão Clerk (modo legado).
 *
 * Implementado via `incrComTtl` (Redis quando disponível, fallback in-memory),
 * compartilhado entre instâncias. Sem PII: a chave de IP é usada só como
 * chave em memória/Redis e nunca é persistida nem logada.
 */

const JANELA_MS = 60 * 60 * 1000; // 1 hora

function limite(): number {
  const env = process.env.PUSH_CAMPAIGN_MAX_PER_HOUR;
  const valor = Number(env);
  if (!env || Number.isNaN(valor) || valor < 1) {
    return 10;
  }
  return Math.floor(valor);
}

/** Limpa o estado em memória e (em teste, com Redis ativo) as chaves Redis. */
export function limparRateLimitCampanhas(): void {
  limparRateLimitRedis('campaign');

  if (process.env.NODE_ENV !== 'test') return;

  const redis = getRedis();
  if (!redis || typeof redis.scan !== 'function') return;

  void (async () => {
    try {
      let cursor: string | number = '0';
      do {
        const resultado = await (redis as {
          scan: (cursor: string | number, ...args: unknown[]) => Promise<[string | number, string[]]>;
        }).scan(cursor, 'MATCH', 'rl:campaign:*', 'COUNT', 100);
        cursor = resultado[0];
        const chaves = resultado[1] ?? [];
        if (chaves.length && typeof redis.del === 'function') {
          await (redis as { del: (...keys: string[]) => Promise<unknown> }).del(...chaves);
        }
      } while (String(cursor) !== '0');
    } catch (erro) {
      console.warn('[campaign-rate-limit] falha ao limpar Redis:', erro);
    }
  })();
}

function chave(req: Request): string {
  const id = req.auth?.clerkId ?? req.ip;
  return `campanha:${id}`;
}

export const limitarCampanha: RequestHandler = async (req: Request, res: Response, next): Promise<void> => {
  try {
    const maximo = limite();
    const key = chave(req);

    const contagem = await incrComTtl('campaign', key, JANELA_MS);

    if (contagem > maximo) {
      res.status(429).json({ error: 'limite de campanhas atingido, tente mais tarde' });
      return;
    }

    next();
  } catch (erro) {
    console.warn('[campaign-rate-limit] erro inesperado, degradando:', erro);
    next();
  }
};