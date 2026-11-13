import type { Request, RequestHandler, Response } from 'express';

/**
 * Rate limit anti-inflação das métricas de analytics (Security do plano de
 * monetização). Diferente do limite global de `rate-limit.middleware.ts`: aqui
 * a janela é por (IP, empresa), porque a métrica vendida ao lojista é por
 * empresa — 1 IP bombeando `POST /view` não pode contabilizar milhares de
 * visitas.
 *
 * Implementado como dedup em memória (fallback previsto no plano) para não
 * adicionar dependência: os volumes de um guia local cabem folgado em um Map.
 * Sem PII: a chave de IP é usada só como chave em memória e nunca é
 * persistida nem logada.
 *
 * TODO(redis): o Map é por processo — com mais de uma instância do backend
 * (ou deploy serverless/multi-região) a deduplicação NÃO cruza instâncias e a
 * inflação de métricas volta por instância. Resolver com armazenamento
 * compartilhado (Redis p. ex. upsert atômico com TTL de 1h) quando o backend
 * escalar para mais de uma instância. Até lá, limitação documentada e aceita.
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

interface Registro {
  contagem: number;
  inicio: number;
}

const registros = new Map<string, Registro>();

/** Limpa o estado em memória (usado pelos testes para janelas limpas). */
export function limparRateLimitAnalytics(): void {
  registros.clear();
}

function chave(req: Request, companyId: string): string {
  const ip = req.ip ?? req.socket.remoteAddress ?? 'desconhecido';
  return `${ip}:${companyId}`;
}

function podar(agora: number): void {
  for (const [chave, registro] of registros) {
    if (agora - registro.inicio >= JANELA_MS) {
      registros.delete(chave);
    }
  }
}

function criarLimitador(tipo: 'view' | 'click' | 'favorite'): RequestHandler {
  return (req: Request, res: Response, next): void => {
    // Limite lido por requisição: env-configurável sem reiniciar o processo.
    const maximo = limite(tipo);
    const agora = Date.now();
    const key = `${chave(req, String(req.params.id))}:${tipo}`;
    podar(agora);

    const registro = registros.get(key);
    if (registro && agora - registro.inicio < JANELA_MS && registro.contagem >= maximo) {
      res.status(429).json({ error: 'limite de eventos atingido para esta empresa, tente mais tarde' });
      return;
    }

    if (registro && agora - registro.inicio < JANELA_MS) {
      registro.contagem += 1;
    } else {
      registros.set(key, { contagem: 1, inicio: agora });
    }
    next();
  };
}

/** `view`: 1 incremento por empresa por IP por hora. */
export const limitarView = criarLimitador('view');

/** `whatsapp-click`: 5 incrementos por empresa por IP por hora. */
export const limitarWhatsappClick = criarLimitador('click');

/** `favorite`: 30 toggle(s) por empresa por IP por hora (tolerante ao
 * vai-e-vem natural de favoritar/desfavoritar). */
export const limitarFavorite = criarLimitador('favorite');
