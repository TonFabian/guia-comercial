import { getRedis } from './redis.js';

interface Registro {
  contagem: number;
  inicio: number;
}

const memoria = new Map<string, Registro>();

function podar(agora: number, janelaMs: number): void {
  for (const [chave, registro] of memoria) {
    if (agora - registro.inicio >= janelaMs) {
      memoria.delete(chave);
    }
  }
}

const LUA_INCR_EXPIRE = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;

export async function incrComTtl(
  prefixo: 'analytics' | 'campaign',
  chaveBase: string,
  janelaMs: number,
): Promise<number> {
  const redis = getRedis();
  const chaveRedis = `rl:${prefixo}:${chaveBase}`;

  if (redis && typeof redis.eval === 'function') {
    try {
      const ttl = Math.max(1, Math.ceil(janelaMs / 1000));
      const resultado = await (redis as { eval: (s: string, n: number, ...a: (string | number)[]) => Promise<number | string> }).eval(
        LUA_INCR_EXPIRE,
        1,
        chaveRedis,
        ttl,
      );
      return typeof resultado === 'string' ? Number(resultado) : Number(resultado);
    } catch (erro) {
      console.warn('[rate-limit-redis] falha no Redis, usando fallback in-memory:', erro);
      // cai para o fallback abaixo
    }
  }

  // Fallback in-memory (também usado quando Redis indisponível ou falhou).
  try {
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
  } catch (erro) {
    // Último recurso: nunca propagar; permitir a requisição.
    console.warn('[rate-limit-redis] falha no fallback in-memory:', erro);
    return 1;
  }
}

export function limparRateLimitRedis(prefixo: 'analytics' | 'campaign'): void {
  for (const chave of Array.from(memoria.keys())) {
    if (chave.startsWith(`${prefixo}:`)) {
      memoria.delete(chave);
    }
  }
  const redis = getRedis();
  if (redis && typeof redis.scan === 'function' && process.env.NODE_ENV === 'test') {
    void (async () => {
      try {
        let cursor = '0';
        do {
          const [next, keys] = await (redis as { scan: (c: string, ...a: unknown[]) => Promise<[string, string[]]> }).scan(
            cursor,
            'MATCH',
            `rl:${prefixo}:*`,
            'COUNT',
            '100',
          );
          cursor = next;
          if (keys.length > 0) {
            await (redis as { del: (...k: string[]) => Promise<unknown> }).del(...keys);
          }
        } while (cursor !== '0');
      } catch (erro) {
        console.warn('[rate-limit-redis] falha ao limpar Redis:', erro);
      }
    })();
  }
}
