import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

describe('request em desenvolvimento', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('__DEV__', true);
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    process.env.EXPO_CONSTANTS_HOST_URI = '192.168.1.50:8081';
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  afterEach(() => {
    delete process.env.EXPO_CONSTANTS_HOST_URI;
    delete process.env.EXPO_PUBLIC_API_URL;
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('usa o host do Expo (IP da rede atual) na URL da API', async () => {
    const { request } = await import('./http');

    await request('/companies');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://192.168.1.50:4000/api/companies',
      expect.anything(),
    );
  });
});
