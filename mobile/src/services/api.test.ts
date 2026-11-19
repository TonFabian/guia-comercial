import { beforeEach, describe, expect, it, vi } from 'vitest';

import { companyPlan } from '@/features/company/company-plan';
import { ApiError, request } from './http';
import {
  getCompanies,
  getEvents,
  getFeaturedCompanies,
  getTouristSpots,
  searchCompanies,
} from './api';

vi.mock('./http', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./http')>();
  return {
    ...actual,
    isApiConfigured: () => true,
    request: vi.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 20 })),
  };
});

/** Enquanto o cliente envia mais que o teto do backend, a busca responde 400. */
const TERMO_DE_130 = 'x'.repeat(130);

/** Valor de `q=` na última URL chamada pelo service. */
function termoDaUltimaChamada(): string | null {
  const url = String(vi.mocked(request).mock.calls.at(-1)?.[0] ?? '');
  return new URLSearchParams(url.split('?')[1] ?? '').get('q');
}

/** Valor de `plan=` na última URL chamada pelo service. */
function planoDaUltimaChamada(): string | null {
  const url = String(vi.mocked(request).mock.calls.at(-1)?.[0] ?? '');
  return new URLSearchParams(url.split('?')[1] ?? '').get('plan');
}

describe('termo de busca ancorado no teto do backend (120 caracteres)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('__DEV__', true);
  });

  it('searchCompanies trunca o termo acima de 120 (o backend responde 400 acima do teto)', async () => {
    await searchCompanies({ q: TERMO_DE_130 });

    expect(termoDaUltimaChamada()).toHaveLength(120);
  });

  it('getTouristSpots trunca o termo acima de 120', async () => {
    await getTouristSpots({ q: TERMO_DE_130 });

    expect(termoDaUltimaChamada()).toHaveLength(120);
  });

  it('getEvents trunca o termo acima de 120', async () => {
    await getEvents({ q: TERMO_DE_130 });

    expect(termoDaUltimaChamada()).toHaveLength(120);
  });

  it('termo dentro do teto segue inteiro (não corta o que cabe)', async () => {
    const termo = 'c'.repeat(120);

    await searchCompanies({ q: termo });

    expect(termoDaUltimaChamada()).toBe(termo);
  });
});

describe('getCompanies com filtro de planos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('__DEV__', true);
  });

  it('envia os planos pedidos para a API', async () => {
    vi.mocked(request).mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 20 });

    await getCompanies(1, 20, undefined, ['basic', 'free']);

    expect(planoDaUltimaChamada()).toBe('basic,free');
  });

  it('resposta vazia legítima da API não vira mock em desenvolvimento', async () => {
    vi.mocked(request).mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 20 });

    const pagina = await getCompanies(1, 20, undefined, ['basic', 'free']);

    expect(pagina.items).toEqual([]);
    expect(pagina.total).toBe(0);
  });

  it('usa mocks filtrados quando o transporte devolve null', async () => {
    vi.mocked(request).mockResolvedValueOnce(null);

    const pagina = await getCompanies(1, 20, undefined, ['premium']);

    expect(pagina.items.length).toBeGreaterThan(0);
    expect(pagina.items.every((company) => companyPlan(company) === 'premium')).toBe(true);
  });
});

describe('getFeaturedCompanies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('__DEV__', true);
  });

  it('resposta vazia legítima devolve lista vazia', async () => {
    vi.mocked(request).mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 50 });

    await expect(getFeaturedCompanies()).resolves.toEqual([]);
  });

  it('usa mocks premium quando o transporte devolve null', async () => {
    vi.mocked(request).mockResolvedValueOnce(null);

    const empresas = await getFeaturedCompanies();

    expect(empresas.length).toBeGreaterThan(0);
    expect(empresas.every((company) => companyPlan(company) === 'premium')).toBe(true);
  });

  it('repropaga ApiError em vez de cair no mock', async () => {
    vi.mocked(request).mockRejectedValueOnce(new ApiError(401, null));

    await expect(getFeaturedCompanies()).rejects.toBeInstanceOf(ApiError);
  });
});
