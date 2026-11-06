import { beforeEach, describe, expect, it, vi } from 'vitest';

import { request } from './http';
import { getEvents, getTouristSpots, searchCompanies } from './api';

vi.mock('./http', () => ({
  isApiConfigured: () => true,
  request: vi.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 20 })),
}));

/** Enquanto o cliente envia mais que o teto do backend, a busca responde 400. */
const TERMO_DE_130 = 'x'.repeat(130);

/** Valor de `q=` na última URL chamada pelo service. */
function termoDaUltimaChamada(): string | null {
  const url = String(vi.mocked(request).mock.calls.at(-1)?.[0] ?? '');
  return new URLSearchParams(url.split('?')[1] ?? '').get('q');
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
