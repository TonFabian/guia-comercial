import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();
const { devServerUrlMock } = vi.hoisted(() => ({ devServerUrlMock: vi.fn() }));

vi.mock('./dev-server-url', () => ({ devServerUrl: devServerUrlMock }));

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
    devServerUrlMock.mockReset();
    devServerUrlMock.mockReturnValue(undefined);
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

  it('usa a URL do bundle quando o hostUri não existe (dev build)', async () => {
    delete process.env.EXPO_CONSTANTS_HOST_URI;
    devServerUrlMock.mockReturnValue('http://192.168.1.77:8081/');

    const { request } = await import('./http');

    await request('/companies');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://192.168.1.77:4000/api/companies',
      expect.anything(),
    );
  });
});
