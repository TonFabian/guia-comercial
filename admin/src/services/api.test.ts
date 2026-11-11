import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.stubGlobal('fetch', vi.fn());

import { getCompanies, setTokenProvider } from './api';

describe('api client', () => {
  beforeEach(() => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  it('parses paginated response', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => JSON.stringify({ items: [], total: 0, page: 1, pageSize: 50 }),
      headers: new Headers(),
    });
    const res = await getCompanies(1, 50);
    expect(res.total).toBe(0);
  });
});

describe('api client — token de sessão', () => {
  beforeEach(() => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  it('pede o token a cada request (token Clerk de sessão expira em ~60s)', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => JSON.stringify({ items: [], total: 0, page: 1, pageSize: 50 }),
      headers: new Headers(),
    });

    const tokens = ['jwt-antigo', 'jwt-renovado'];
    setTokenProvider(() => Promise.resolve(tokens.shift() ?? null));

    await getCompanies(1, 50);
    await getCompanies(1, 50);

    const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls as unknown as Array<[RequestInfo, RequestInit]>;
    const headers = calls.map(([, init]) => (init.headers as Record<string, string>).Authorization);
    expect(headers).toEqual(['Bearer jwt-antigo', 'Bearer jwt-renovado']);
  });
});
