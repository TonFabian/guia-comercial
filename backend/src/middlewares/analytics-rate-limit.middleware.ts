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
 */

const JANELA_MS = 60 * 60 * 1000; // 1 hora

function limite(tipo: 'view' | 'click'): number {
  const env = tipo === 'view'
    ? process.env.ANALYTICS_VIEW_MAX_PER_HOUR
    : process.env.ANALYTICS_CLICK_MAX_PER_HOUR;
  const valor = Number(env);
  if (!env || Number.isNaN(valor) || valor < 1) {
    return tipo === 'view' ? 1 : 5;
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

function criarLimitador(tipo: 'view' | 'click'): RequestHandler {
  const maximo = limite(tipo);
  return (req: Request, res: Response, next): void => {
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
