import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { assertValidRedisConfiguration } from './boot-check.js';
import { fecharRedis, getRedis, isRedisAvailable } from './redis.js';

vi.mock('ioredis', () => {
  class RedisMock {
    status: string;
    private listeners: Record<string, Array<(...args: unknown[]) => void>> = {};

    constructor(url: string) {
      if (url.includes('invalid')) {
        this.status = 'close';
        throw new Error('connect ECONNREFUSED 127.0.0.1:6379');
      }
      this.status = 'ready';
    }

    on(event: string, cb: (...args: unknown[]) => void): this {
      if (event === 'ready' && this.status === 'ready') {
        cb();
      }
      (this.listeners[event] ??= []).push(cb);
      return this;
    }

    async ping(): Promise<string> {
      return 'PONG';
    }

    async quit(): Promise<string> {
      this.status = 'end';
      return 'OK';
    }

    disconnect(): void {
      this.status = 'end';
    }
  }

  return { default: RedisMock, Redis: RedisMock };
});

describe('redis', () => {
  const originalRedisUrl = process.env.REDIS_URL;
  const originalRedisPassword = process.env.REDIS_PASSWORD;

  beforeEach(async () => {
    await fecharRedis();
    delete process.env.REDIS_URL;
    delete process.env.REDIS_PASSWORD;
  });

  afterEach(async () => {
    await fecharRedis();
    if (originalRedisUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalRedisUrl;
    if (originalRedisPassword === undefined) delete process.env.REDIS_PASSWORD;
    else process.env.REDIS_PASSWORD = originalRedisPassword;
    vi.restoreAllMocks();
  });

  it('retorna null quando REDIS_URL não está definida', () => {
    expect(getRedis()).toBeNull();
    expect(isRedisAvailable()).toBe(false);
  });

  it('retorna null e avisa quando a URL é inválida', () => {
    process.env.REDIS_URL = 'redis://invalid:6379';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getRedis()).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it('retorna instância quando a URL é válida', () => {
    process.env.REDIS_URL = 'redis://localhost:6379';

    const client = getRedis();
    expect(client).not.toBeNull();
    expect(isRedisAvailable()).toBe(true);
  });

  it('fecharRedis fecha o singleton e permite recriar', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';

    const primeiro = getRedis();
    expect(primeiro).not.toBeNull();

    await fecharRedis();
    expect(getRedis()).not.toBe(primeiro);
  });
});

describe('assertValidRedisConfiguration', () => {
  it('lança quando REDIS_URL está definida e REDIS_PASSWORD está vazia', () => {
    expect(() =>
      assertValidRedisConfiguration({ REDIS_URL: 'redis://localhost:6379', REDIS_PASSWORD: '' }),
    ).toThrow(/REDIS_PASSWORD/);
  });

  it('lança quando REDIS_URL está definida e REDIS_PASSWORD está ausente', () => {
    expect(() =>
      assertValidRedisConfiguration({ REDIS_URL: 'redis://localhost:6379' }),
    ).toThrow(/REDIS_PASSWORD/);
  });

  it('não lança quando ambos estão definidos', () => {
    expect(() =>
      assertValidRedisConfiguration({
        REDIS_URL: 'redis://localhost:6379',
        REDIS_PASSWORD: 'secret',
      }),
    ).not.toThrow();
  });

  it('não lança quando REDIS_URL está ausente', () => {
    expect(() => assertValidRedisConfiguration({})).not.toThrow();
  });
});