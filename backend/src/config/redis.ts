import type { Redis as RedisType } from 'ioredis';
import * as IORedisNamespace from 'ioredis';

type RedisConstructor = new (...args: unknown[]) => RedisType;

function obterConstrutorRedis(): RedisConstructor | null {
  const modulo = IORedisNamespace as unknown as {
    Redis?: RedisConstructor;
    default?: RedisConstructor;
  };
  return modulo.Redis ?? modulo.default ?? null;
}

const COOLDOWN_MS = 30_000;
const RETRY_LIMIT = 3;

let singleton: RedisType | null = null;
let pronto = false;
let cooldownUntil = 0;

function isCooldownActive(): boolean {
  return cooldownUntil > Date.now();
}

export function getRedis(): RedisType | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (isCooldownActive()) return null;
  if (singleton) return singleton;

  const Construtor = obterConstrutorRedis();
  if (!Construtor) {
    console.warn('[redis] construtor do ioredis indisponível');
    cooldownUntil = Date.now() + COOLDOWN_MS;
    return null;
  }
  let client: RedisType;
  try {
    client = new Construtor(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      commandTimeout: 1000,
      retryStrategy: (times: number) => {
        if (times > RETRY_LIMIT) return null;
        return Math.min(times * 200, 1000);
      },
    });
  } catch (erro) {
    console.warn('[redis] falha ao criar cliente:', erro);
    cooldownUntil = Date.now() + COOLDOWN_MS;
    return null;
  }

  const marcarPronto = (): void => {
    if (singleton === client) {
      pronto = true;
    }
  };

  const marcarFalhaInicial = (erro: unknown): void => {
    console.warn('[redis] conexão falhou:', erro);
    if (singleton === client && !pronto) {
      pronto = false;
      singleton = null;
      cooldownUntil = Date.now() + COOLDOWN_MS;
      try {
        client.disconnect();
      } catch {
        // ignora erros de desconexão
      }
    }
  };

  client.on('ready', marcarPronto);
  client.on('error', (erro: Error) => {
    if (!pronto) {
      marcarFalhaInicial(erro);
    } else {
      console.warn('[redis] erro em runtime:', erro);
    }
  });
  client.on('end', () => {
    if (singleton === client) {
      pronto = false;
      singleton = null;
      cooldownUntil = Date.now() + COOLDOWN_MS;
    }
  });

  singleton = client;
  if (client.status === 'ready') {
    pronto = true;
  }
  return client;
}

export function isRedisAvailable(): boolean {
  return pronto && singleton !== null && singleton.status === 'ready';
}

export async function fecharRedis(): Promise<void> {
  const client = singleton;
  singleton = null;
  pronto = false;
  cooldownUntil = 0;
  if (!client) return;
  try {
    if (typeof client.quit === 'function') {
      await client.quit();
    } else if (typeof client.disconnect === 'function') {
      client.disconnect();
    }
  } catch {
    try {
      client.disconnect();
    } catch {
      // ignora
    }
  }
}