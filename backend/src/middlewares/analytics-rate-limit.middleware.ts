import type { Request, RequestHandler, Response } from 'express';
import { ipKeyGenerator } from 'express-rate-limit';

import { getRedis } from '../config/redis.js';
import { incrComTtl, limparRateLimitRedis } from '../config/rate-limit-redis.js';

/**
 * Rate limit anti-inflação das métricas de analytics (Security do plano de
 * monetização). Diferente do limite global de `rate-limit.middleware.ts`: aqui
 * a janela é por (IP, empresa), porque a métrica vendida ao lojista é por
 * empresa — 1 IP bombeando `POST /view` não pode contabilizar milhares de
 * visitas.
 *
 * Implementado via `incrComTtl` (Redis quando disponível, fallback in-memory).
 * Sem PII: a chave de IP é usada só como chave em memória/Redis e nunca é
 * persistida nem logada.
 */

const JANELA_MS = 60 * 60 * 1000; // 1 hora

function limite(tipo: 'view' | 'click' | 'favorite'): number {
  const env = tipo === 'view'
    ? process.env.ANALYTICS_VIEW_MAX_PER_HOUR
    : tipo === 'click'
      ? process.env.ANALYTICS_CLICK_MAX_PER_HOUR
      : process.env.ANALYTICS_FAVORITE_MAX_PER_HOUR;
  const valor = Number(env);
  if (!env || Number.isNaN(valor) || valor < 1) {
    return tipo === 'view' ? 1 : tipo === 'click' ? 5 : 30;
  }
  return Math.floor(valor);
}

/** Limpa o estado em memória e (em teste, com Redis ativo) as chaves Redis. */
export function limparRateLimitAnalytics(): void {
  limparRateLimitRedis('analytics');

  if (process.env.NODE_ENV !== 'test') return;

  const redis = getRedis();
  if (!redis || typeof redis.scan !== 'function') return;

  void (async () => {
    try {
      let cursor: string | number = '0';
      do {
        const resultado = await (redis as {
          scan: (cursor: string | number, ...args: unknown[]) => Promise<[string | number, string[]]>;
        }).scan(cursor, 'MATCH', 'rl:analytics:*', 'COUNT', 100);
        cursor = resultado[0];
        const chaves = resultado[1] ?? [];
        if (chaves.length && typeof redis.del === 'function') {
          await (redis as { del: (...keys: string[]) => Promise<unknown> }).del(...chaves);
        }
      } while (String(cursor) !== '0');
    } catch (erro) {
      console.warn('[analytics-rate-limit] falha ao limpar Redis:', erro);
    }
  })();
}

function chaveIp(req: Request): string {
  return ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? 'unknown');
}

function criarLimitador(tipo: 'view' | 'click' | 'favorite'): RequestHandler {
  return async (req: Request, res: Response, next): Promise<void> => {
    try {
      const maximo = limite(tipo);
      const companyId = String(req.params.id);
      const chaveBase = `${chaveIp(req)}:${companyId}:${tipo}`;

      const contagem = await incrComTtl('analytics', chaveBase, JANELA_MS);

      if (contagem > maximo) {
        res.status(429).json({ error: 'limite de eventos atingido para esta empresa, tente mais tarde' });
        return;
      }

      next();
    } catch (erro) {
      // incrComTtl ja trata falhas de Redis internamente (fallback in-memory);
      // este catch so dispara em erro de programacao — degradar permitindo.
      console.warn('[analytics-rate-limit] erro inesperado, degradando:', erro);
      next();
    }
  };
}

/** `view`: 1 incremento por empresa por IP por hora. */
export const limitarView = criarLimitador('view');

/** `whatsapp-click`: 5 incrementos por empresa por IP por hora. */
export const limitarWhatsappClick = criarLimitador('click');

/** `favorite`: 30 toggle(s) por empresa por IP por hora (tolerante ao
 * vai-e-vem natural de favoritar/desfavoritar). */
export const limitarFavorite = criarLimitador('favorite');