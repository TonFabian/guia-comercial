import { getRedis } from './redis.js';

interface Registro {
  contagem: number;
  inicio: number;
}

/**
 * Map de fallback in-memory compartilhado entre prefixos. A chave inclui o
 * prefixo (`${prefixo}:${chaveBase}`) para isolar analytics vs. campaign.
 */
const memoria = new Map<string, Registro>();

function podar(agora: number, janelaMs: number): void {
  for (const [chave, registro] of memoria) {
    if (agora - registro.inicio >= janelaMs) {
      memoria.delete(chave);
    }
  }
}

/**
 * Incrementa atomicamente o contador de rate limit para `prefixo`/`chaveBase`
 * dentro da janela `janelaMs`. Usa Redis (`INCR` + `EXPIRE` condicional quando
 * o resultado é 1) quando disponível; caso contrário cai para um Map em
 * memória com a mesma semântica (INCR-always: requisições rejeitadas também
 * incrementam).
 *
 * Retorna o novo valor do contador.
 */
export async function incrComTtl(
  prefixo: 'analytics' | 'campaign',
  chaveBase: string,
  janelaMs: number,
): Promise<number> {
  const redis = getRedis();
  const chaveRedis = `rl:${prefixo}:${chaveBase}`;

  if (redis && typeof redis.incr === 'function') {
    try {
      const resultado = await (redis as { incr: (key: string) => Promise<number | string> }).incr(chaveRedis);
      const valor = typeof resultado === 'string' ? Number(resultado) : Number(resultado);

      if (valor === 1 && typeof (redis as { expire?: unknown }).expire === 'function') {
        try {
          await (redis as { expire: (key: string, seconds: number) => Promise<unknown> }).expire(
            chaveRedis,
            Math.max(1, Math.ceil(janelaMs / 1000)),
          );
        } catch {
          // ignora falha de EXPIRE; o INCR já ocorreu
        }
      }

      return valor;
    } catch (erro) {
      console.warn('[rate-limit-redis] falha no Redis, usando fallback in-memory:', erro);
      // cai para o fallback abaixo
    }
  }

  const agora = Date.now();
  podar(agora, janelaMs);

  const chaveMemoria = `${prefixo}:${chaveBase}`;
  const registro = memoria.get(chaveMemoria);
  if (registro && agora - registro.inicio < janelaMs) {
    registro.contagem += 1;
    return registro.contagem;
  }

  memoria.set(chaveMemoria, { contagem: 1, inicio: agora });
  return 1;
}

/**
 * Limpa o estado em memória para o prefixo informado. Usado por
 * `limparRateLimit*` dos middlewares.
 */
export function limparRateLimitRedis(prefixo: 'analytics' | 'campaign'): void {
  for (const chave of Array.from(memoria.keys())) {
    if (chave.startsWith(`${prefixo}:`)) {
      memoria.delete(chave);
    }
  }
}
