import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('track de analytics', () => {
  let trackView: (companyId: string) => void;
  let trackWhatsappClick: (companyId: string) => void;
  let trackFavorite: (companyId: string) => void;
  let trackUnfavorite: (companyId: string) => void;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'http://api.test');
    fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    vi.stubGlobal('fetch', fetchMock);

    ({ trackView, trackWhatsappClick, trackFavorite, trackUnfavorite } = await import('./track'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('registra clique no WhatsApp (POST /whatsapp-click)', async () => {
    trackWhatsappClick('abc123');
    await Promise.resolve();

    const chamadas = fetchMock.mock.calls as unknown as [string, RequestInit][];
    expect(chamadas.some(([url, init]) => url.includes('/companies/abc123/whatsapp-click') && init.method === 'POST')).toBe(true);
  });

  it('conta view uma única vez por sessão (remount não duplica)', () => {
    trackView('xyz');
    trackView('xyz');

    const chamadas = fetchMock.mock.calls as unknown as [string, RequestInit][];
    const views = chamadas.filter(([url]) => url.includes('/companies/xyz/view'));
    expect(views).toHaveLength(1);
  });

  it('favoritar dispara POST /favorite', async () => {
    trackFavorite('fav1');
    await Promise.resolve();

    const chamadas = fetchMock.mock.calls as unknown as [string, RequestInit][];
    expect(chamadas.some(([url, init]) => url.includes('/companies/fav1/favorite') && init.method === 'POST')).toBe(true);
  });

  it('desfavoritar dispara DELETE /favorite', async () => {
    trackUnfavorite('fav1');
    await Promise.resolve();

    const chamadas = fetchMock.mock.calls as unknown as [string, RequestInit][];
    expect(chamadas.some(([url, init]) => url.includes('/companies/fav1/favorite') && init.method === 'DELETE')).toBe(true);
  });

  it('sem API configurada: trackFavorite/trackUnfavorite não chamam rede', async () => {
    vi.resetModules();
    vi.stubEnv('EXPO_PUBLIC_API_URL', undefined);
    ({ trackFavorite, trackUnfavorite } = await import('./track'));
    fetchMock.mockClear();

    trackFavorite('x');
    trackUnfavorite('x');
    await Promise.resolve();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
