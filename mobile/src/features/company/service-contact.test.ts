import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/links', () => ({
  openWhatsApp: vi.fn(),
}));

describe('falarSobreServicoNoWhatsApp', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let falarSobreServicoNoWhatsApp: typeof import('./service-contact').falarSobreServicoNoWhatsApp;
  let openWhatsApp: ReturnType<typeof vi.fn>;  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'http://api.test');
    fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    vi.stubGlobal('fetch', fetchMock);

    ({ falarSobreServicoNoWhatsApp } = await import('./service-contact'));
    ({ openWhatsApp } = (await import('@/utils/links')) as unknown as { openWhatsApp: ReturnType<typeof vi.fn> });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('abre o WhatsApp com o serviço na mensagem', () => {
    falarSobreServicoNoWhatsApp({ companyId: 'c1', whatsapp: '86999999999', serviceName: 'Reformas' });

    expect(openWhatsApp).toHaveBeenCalledWith('86999999999', expect.stringContaining('Reformas'));
  });

  it('registra o clique de WhatsApp da empresa (analytics)', async () => {
    falarSobreServicoNoWhatsApp({ companyId: 'c1', whatsapp: '86999999999', serviceName: 'Reformas' });
    await Promise.resolve();

    const chamadas = fetchMock.mock.calls as unknown as [string, RequestInit][];
    expect(chamadas.some(([url, init]) => url.includes('/companies/c1/whatsapp-click') && init.method === 'POST')).toBe(true);
  });
});
