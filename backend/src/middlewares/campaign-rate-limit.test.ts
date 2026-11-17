import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { limitarCampanha, limparRateLimitCampanhas } from './campaign-rate-limit.middleware.js';

function fakeReq(
  auth?: { guest: boolean; clerkId?: string },
  ip = '127.0.0.1',
): Request {
  return { auth, ip, socket: { remoteAddress: ip } } as unknown as Request;
}

function fakeRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response & typeof res;
}

describe('limitarCampanha', () => {
  beforeEach(() => {
    vi.stubEnv('PUSH_CAMPAIGN_MAX_PER_HOUR', '10');
    limparRateLimitCampanhas();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    limparRateLimitCampanhas();
  });

  it('permite 10 requisições e bloqueia a 11ª com 429', async () => {
    const req = fakeReq({ guest: false, clerkId: 'admin_1' });
    const next = vi.fn();
    for (let i = 0; i < 10; i++) {
      const res = fakeRes();
      await limitarCampanha(req, res, next);
      expect(res.status).not.toHaveBeenCalledWith(429);
    }
    const res = fakeRes();
    await limitarCampanha(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).toHaveBeenCalledTimes(10);
  });

  it('não bloqueia entre clerkIds diferentes', async () => {
    const reqA = fakeReq({ guest: false, clerkId: 'admin_a' });
    const reqB = fakeReq({ guest: false, clerkId: 'admin_b' });
    const next = vi.fn();
    for (let i = 0; i < 10; i++) {
      await limitarCampanha(reqA, fakeRes(), next);
    }
    const res = fakeRes();
    await limitarCampanha(reqB, res, next);
    expect(res.status).not.toHaveBeenCalledWith(429);
  });

  it('usa IP quando não há clerkId', async () => {
    const req1 = fakeReq(undefined, '10.0.0.1');
    const req2 = fakeReq(undefined, '10.0.0.2');
    const next = vi.fn();
    for (let i = 0; i < 10; i++) {
      await limitarCampanha(req1, fakeRes(), next);
    }
    const resBloqueado = fakeRes();
    await limitarCampanha(req1, resBloqueado, next);
    expect(resBloqueado.status).toHaveBeenCalledWith(429);

    const resLiberado = fakeRes();
    await limitarCampanha(req2, resLiberado, next);
    expect(resLiberado.status).not.toHaveBeenCalledWith(429);
  });
});