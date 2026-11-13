import type { Request, RequestHandler, Response } from 'express';

/**
 * Rate limit de criação de campanhas de push por admin (Push Center).
 * Janela de 1 hora, limite configurável via `PUSH_CAMPAIGN_MAX_PER_HOUR`
 * (default 10). A chave é por admin (`campanha:${clerkId}`), com fallback
 * para IP quando não há sessão Clerk (modo legado).
 *
 * Implementado como dedup em memória (fallback previsto no plano) para não
 * adicionar dependência: os volumes de um guia local cabem folgado em um Map.
 * Sem PII: a chave de IP é usada só como chave em memória e nunca é
 * persistida nem logada.
 *
 * TODO(redis): o Map é por processo — com mais de uma instância do backend
 * (ou deploy serverless/multi-região) a deduplicação NÃO cruza instâncias e o
 * limite de campanhas volta por instância. Resolver com armazenamento
 * compartilhado (Redis p. ex. upsert atômico com TTL de 1h) quando o backend
 * escalar para mais de uma instância. Até lá, limitação documentada e aceita.
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

interface Registro {
  contagem: number;
  inicio: number;
}

const registros = new Map<string, Registro>();

/** Limpa o estado em memória (usado pelos testes para janelas limpas). */
export function limparRateLimitCampanhas(): void {
  registros.clear();
}

function chave(req: Request): string {
  const id = req.auth?.clerkId ?? req.ip ?? req.socket?.remoteAddress ?? 'desconhecido';
  return `campanha:${id}`;
}

function podar(agora: number): void {
  for (const [chaveAtual, registro] of registros) {
    if (agora - registro.inicio >= JANELA_MS) {
      registros.delete(chaveAtual);
    }
  }
}

export const limitarCampanha: RequestHandler = (req: Request, res: Response, next): void => {
  const maximo = limite();
  const agora = Date.now();
  const key = chave(req);
  podar(agora);

  const registro = registros.get(key);
  if (registro && agora - registro.inicio < JANELA_MS && registro.contagem >= maximo) {
    res.status(429).json({ error: 'limite de campanhas atingido, tente mais tarde' });
    return;
  }

  if (registro && agora - registro.inicio < JANELA_MS) {
    registro.contagem += 1;
  } else {
    registros.set(key, { contagem: 1, inicio: agora });
  }
  next();
};
